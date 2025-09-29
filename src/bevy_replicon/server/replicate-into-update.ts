/**
 * @fileoverview 服务器端复制系统
 *
 * 收集实体和组件的变更，生成复制消息发送给客户端
 *
 * 参考 Rust 实现:
 * bevy-origin-packages/bevy_replicon/src/server/replicate_into_update.rs
 */

import type { AnyComponent, Entity } from "@rbxts/matter";
import type { World } from "../../bevy_ecs";
import { Mutations } from "../shared/replication/mutations";
import { Replicated, needsReplication, updateReplicated } from "../shared/replication/replicated";
import { ReplicationRegistry } from "../shared/replication/registry";
import { SerializedData, createRange } from "../shared/replication/serialized-data";
import { Updates } from "../shared/replication/updates";
import type { Uint8Array } from "../shared/replication/types";
import { ClientVisibility } from "./client-visibility";
import { ServerTick } from "./server-tick";
import type { ClientId } from "../shared/backend/backend-state";

/**
 * 客户端复制状态
 * 跟踪每个客户端的复制状态
 */
interface ClientReplicationState {
	/** 客户端 ID */
	readonly clientId: ClientId;
	/** 最后发送的 tick */
	lastSentTick: number;
	/** 更新消息 */
	updates: Updates;
	/** 变更消息 */
	mutations: Mutations;
	/** 序列化数据缓冲区 */
	serializedData: SerializedData;
}

/**
 * 网络适配器接口
 * 用于发送复制消息
 */
export interface NetworkAdapter {
	/**
	 * 发送更新消息给客户端
	 * @param clientId - 客户端 ID
	 * @param updateTick - 更新 tick
	 * @param serverTick - 服务器 tick
	 * @param messageData - 消息数据
	 */
	sendUpdates(clientId: ClientId, updateTick: number, serverTick: number, messageData: Uint8Array): void;

	/**
	 * 发送变更消息给客户端
	 * @param clientId - 客户端 ID
	 * @param updateTick - 更新 tick
	 * @param serverTick - 服务器 tick
	 * @param messageData - Uint8Array
	 */
	sendMutations(clientId: ClientId, updateTick: number, serverTick: number, messageData: Uint8Array): void;

	/**
	 * 获取所有连接的客户端
	 * @returns 客户端 ID 数组
	 */
	getConnectedClients(): ClientId[];
}

/**
 * 服务器端复制系统
 */
export class ReplicationSystem {
	/** 客户端复制状态映射 */
	private clientStates: Map<ClientId, ClientReplicationState> = new Map();

	/** 网络适配器 */
	private networkAdapter: NetworkAdapter;

	constructor(networkAdapter: NetworkAdapter) {
		this.networkAdapter = networkAdapter;
	}

	/**
	 * 执行复制更新
	 * 主要的系统函数，在每个 tick 调用
	 * @param world - 游戏世界
	 */
	public replicateIntoUpdate(world: World): void {
		const serverTick = world.resources.getResource<ServerTick>();
		const registry = world.resources.getResource<ReplicationRegistry>();
		const visibility = world.resources.getResource<ClientVisibility>();

		if (!serverTick || !registry || !visibility) {
			warn("Missing required resources for replication");
			return;
		}

		const currentTick = serverTick.get();
		const connectedClients = this.networkAdapter.getConnectedClients();

		// 更新客户端状态
		this.updateClientStates(connectedClients, currentTick);

		// 为每个客户端收集和发送消息
		for (const [clientId, state] of this.clientStates) {
			if (!connectedClients.includes(clientId)) {
				continue;
			}

			// 收集更新消息
			this.collectUpdates(world, state, registry, visibility, currentTick);

			// 收集变更消息
			this.collectMutations(world, state, registry, visibility, currentTick);

			// 发送消息
			this.sendReplicationMessages(state, currentTick);

			// 更新最后发送的 tick
			state.lastSentTick = currentTick;
		}

		// 清理断开连接的客户端
		this.cleanupDisconnectedClients(connectedClients);
	}

	/**
	 * 更新客户端状态
	 * @param connectedClients - 连接的客户端列表
	 * @param currentTick - 当前 tick
	 */
	private updateClientStates(connectedClients: ClientId[], currentTick: number): void {
		for (const clientId of connectedClients) {
			if (!this.clientStates.has(clientId)) {
				// 新客户端
				this.clientStates.set(clientId, {
					clientId,
					lastSentTick: currentTick - 1, // 确保第一次会发送数据
					updates: new Updates(),
					mutations: new Mutations(),
					serializedData: new SerializedData(),
				});
			}
		}
	}

	/**
	 * 收集更新消息
	 * @param world - 游戏世界
	 * @param state - 客户端状态
	 * @param registry - 复制注册表
	 * @param visibility - 可见性管理器
	 * @param currentTick - 当前 tick
	 */
	private collectUpdates(
		world: World,
		state: ClientReplicationState,
		registry: ReplicationRegistry,
		visibility: ClientVisibility,
		currentTick: number,
	): void {
		// 清空之前的数据
		state.updates.clear();
		state.serializedData.clear();

		// 遍历所有带 Replicated 组件的实体
		for (const [entity, replicated] of world.query(Replicated)) {
			// 检查实体是否对客户端可见
			if (!visibility.isEntityVisibleToClient(entity, state.clientId)) {
				continue;
			}

			// 检查是否需要复制
			if (!needsReplication(replicated, state.lastSentTick)) {
				continue;
			}

			// 开始处理实体变更
			state.updates.startEntityChanges();

			// 序列化实体
			const entityRange = this.serializeEntity(state.serializedData, entity);

			// 检查实体是否有组件变更
			let hasChanges = false;

			// 遍历所有已注册的组件
			for (const componentInfo of registry.getAllComponents()) {
				const component = world.get(entity, componentInfo.name as any);
				if (component === undefined) {
					continue;
				}

				// 序列化组件
				try {
					const serializeContext = {
						world,
						isServer: true,
						tick: currentTick,
					};
					const componentData = componentInfo.serialize(serializeContext, component as any);
					const componentRange = this.serializeComponentData(
						state.serializedData,
						componentInfo.id,
						componentData,
					);

					// 如果还没有添加实体，现在添加
					if (!state.updates.changedEntityWasAdded()) {
						state.updates.addChangedEntity(entityRange);
					}

					// 添加组件变更
					state.updates.addInsertedComponent(componentRange);
					hasChanges = true;
				} catch (error) {
					warn(`Failed to serialize component ${componentInfo.name} for entity ${entity}:`, error);
				}
			}

			// 如果有变更，更新 Replicated 组件
			if (hasChanges) {
				const updatedReplicated = updateReplicated(replicated, currentTick);
				world.insert(entity, updatedReplicated);
			}
		}
	}

	/**
	 * 收集变更消息（新实体）
	 * @param world - 游戏世界
	 * @param state - 客户端状态
	 * @param registry - 复制注册表
	 * @param visibility - 可见性管理器
	 * @param currentTick - 当前 tick
	 */
	private collectMutations(
		world: World,
		state: ClientReplicationState,
		registry: ReplicationRegistry,
		visibility: ClientVisibility,
		currentTick: number,
	): void {
		// 清空之前的数据
		state.mutations.clear();

		// 查找新创建的实体（createdTick === currentTick）
		for (const [entity, replicated] of world.query(Replicated)) {
			// 只处理当前 tick 创建的实体
			if (replicated.createdTick !== currentTick) {
				continue;
			}

			// 检查实体是否对客户端可见
			if (!visibility.isEntityVisibleToClient(entity, state.clientId)) {
				continue;
			}

			// 开始处理实体变更
			state.mutations.startEntity();

			// 序列化实体
			const entityRange = this.serializeEntity(state.serializedData, entity);

			// 遍历所有已注册的组件
			for (const componentInfo of registry.getAllComponents()) {
				const component = world.get(entity, componentInfo.name as any);
				if (component === undefined) {
					continue;
				}

				// 序列化组件
				try {
					const serializeContext = {
						world,
						isServer: true,
						tick: currentTick,
					};
					const componentData = componentInfo.serialize(serializeContext, component as any);
					const componentRange = this.serializeComponentData(
						state.serializedData,
						componentInfo.id,
						componentData,
					);

					// 如果还没有添加实体，现在添加
					if (!state.mutations.entityWasAdded()) {
						state.mutations.addEntity(entity, entityRange);
					}

					// 添加组件
					state.mutations.addComponent(componentRange);
				} catch (error) {
					warn(`Failed to serialize component ${componentInfo.name} for entity ${entity}:`, error);
				}
			}
		}
	}

	/**
	 * 发送复制消息
	 * @param state - 客户端状态
	 * @param currentTick - 当前 tick
	 */
	private sendReplicationMessages(state: ClientReplicationState, currentTick: number): void {
		// 发送更新消息
		if (!state.updates.isEmpty()) {
			try {
				const serverTickRange = this.serializeTick(state.serializedData, currentTick);
				const messageData = state.updates.serialize(state.serializedData, serverTickRange);

				this.networkAdapter.sendUpdates(state.clientId, currentTick, currentTick, messageData);
			} catch (error) {
				warn(`Failed to send updates to client ${state.clientId}:`, error);
			}
		}

		// 发送变更消息
		if (!state.mutations.isEmpty()) {
			try {
				const updateTickRange = this.serializeTick(state.serializedData, currentTick);
				const serverTickRange = this.serializeTick(state.serializedData, currentTick);
				const messageData = state.mutations.serialize(state.serializedData, updateTickRange, serverTickRange);

				this.networkAdapter.sendMutations(state.clientId, currentTick, currentTick, messageData);
			} catch (error) {
				warn(`Failed to send mutations to client ${state.clientId}:`, error);
			}
		}
	}

	/**
	 * 序列化实体
	 * @param data - 序列化数据缓冲区
	 * @param entity - 实体
	 * @returns 实体在缓冲区中的范围
	 */
	private serializeEntity(data: SerializedData, entity: Entity): any {
		return data.writeEntity(entity);
	}

	/**
	 * 序列化组件数据
	 * @param data - 序列化数据缓冲区
	 * @param componentId - 组件 ID
	 * @param componentData - 组件数据
	 * @returns 组件在缓冲区中的范围
	 */
	private serializeComponentData(data: SerializedData, componentId: number, componentData: Uint8Array): any {
		// 组合数据: FnsId + Size + Data
		const combinedData: Array<number> = [];

		// 写入 FnsId
		let remaining = componentId;
		while (remaining >= 0x80) {
			combinedData.push((remaining & 0x7f) | 0x80);
			remaining = remaining >>> 7;
		}
		combinedData.push(remaining & 0x7f);

		// 写入 Size
		remaining = componentData.size();
		while (remaining >= 0x80) {
			combinedData.push((remaining & 0x7f) | 0x80);
			remaining = remaining >>> 7;
		}
		combinedData.push(remaining & 0x7f);

		// 写入 Data
		for (let index = 0; index < componentData.size(); index++) {
			combinedData.push(componentData[index]);
		}

		return data.writeBytes(combinedData);
	}

	/**
	 * 序列化 tick
	 * @param data - 序列化数据缓冲区
	 * @param tick - tick 值
	 * @returns tick 在缓冲区中的范围
	 */
	private serializeTick(data: SerializedData, tick: number): any {
		return data.writeTick(tick);
	}

	/**
	 * 清理断开连接的客户端
	 * @param connectedClients - 当前连接的客户端
	 */
	private cleanupDisconnectedClients(connectedClients: ClientId[]): void {
		const disconnectedClients: ClientId[] = [];

		for (const [clientId] of this.clientStates) {
			if (!connectedClients.includes(clientId)) {
				disconnectedClients.push(clientId);
			}
		}

		for (const clientId of disconnectedClients) {
			this.clientStates.delete(clientId);
		}
	}

	/**
	 * 添加新客户端
	 * @param clientId - 客户端 ID
	 * @param currentTick - 当前 tick
	 */
	public addClient(clientId: ClientId, currentTick: number): void {
		if (!this.clientStates.has(clientId)) {
			this.clientStates.set(clientId, {
				clientId,
				lastSentTick: currentTick - 1,
				updates: new Updates(),
				mutations: new Mutations(),
				serializedData: new SerializedData(),
			});
		}
	}

	/**
	 * 移除客户端
	 * @param clientId - 客户端 ID
	 */
	public removeClient(clientId: ClientId): void {
		this.clientStates.delete(clientId);
	}

	/**
	 * 获取客户端状态统计
	 * @returns 统计信息
	 */
	public getStats(): {
		totalClients: number;
		clientStates: Array<{
			clientId: ClientId;
			lastSentTick: number;
			hasUpdates: boolean;
			hasMutations: boolean;
		}>;
	} {
		const clientStates: Array<{
			clientId: ClientId;
			lastSentTick: number;
			hasUpdates: boolean;
			hasMutations: boolean;
		}> = [];

		for (const [clientId, state] of this.clientStates) {
			clientStates.push({
				clientId,
				lastSentTick: state.lastSentTick,
				hasUpdates: !state.updates.isEmpty(),
				hasMutations: !state.mutations.isEmpty(),
			});
		}

		return {
			totalClients: this.clientStates.size(),
			clientStates,
		};
	}
}

/**
 * 创建复制系统
 * @param networkAdapter - 网络适配器
 * @returns 复制系统实例
 */
export function createReplicationSystem(networkAdapter: NetworkAdapter): ReplicationSystem {
	return new ReplicationSystem(networkAdapter);
}

/**
 * 复制系统函数
 * 用于添加到 Bevy 调度器中
 * @param world - 游戏世界
 */
export function replicateIntoUpdateSystem(world: World): void {
	const replicationSystem = world.resources.getResourceByTypeDescriptor({ id: "ReplicationSystem", text: "" }) as ReplicationSystem | undefined;
	if (!replicationSystem) {
		warn("ReplicationSystem resource not found");
		return;
	}

	replicationSystem.replicateIntoUpdate(world);
}
