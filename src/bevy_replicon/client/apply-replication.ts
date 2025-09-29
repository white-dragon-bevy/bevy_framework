/**
 * @fileoverview 客户端复制应用系统
 *
 * 接收服务器的复制消息并应用到本地 World
 *
 * 参考 Rust 实现:
 * bevy-origin-packages/bevy_replicon/src/client/replication.rs
 */

import type { AnyComponent, Entity } from "@rbxts/matter";
import type { World } from "../../bevy_ecs";
import { Mutations } from "../shared/replication/mutations";
import { Replicated, createReplicated } from "../shared/replication/replicated";
import { ReplicationRegistry } from "../shared/replication/registry";
import { SerializedData } from "../shared/replication/serialized-data";
import { ServerEntityMap } from "../shared/replication/server-entity-map";
import { Updates } from "../shared/replication/updates";
import { ServerUpdateTick } from "../server/server-tick";
import { UpdateMessageFlags, hasFlag } from "../shared/replication/update-message-flags";
import type { Uint8Array } from "../shared/replication/types";

/**
 * 临时接口定义，用于避免 any 类型
 */
interface UpdateDataSegments {
	readonly flags: number;
	readonly mappings?: Array<[Entity, Entity]>;
	readonly despawns?: Array<Entity>;
	readonly removals?: Array<{ entity: Entity; fnIds: Array<number> }>;
	readonly changes?: Array<{ entity: Entity; components: Array<Uint8Array> }>;
}

/**
 * 复制消息接收接口
 */
export interface ReplicationReceiver {
	/**
	 * 接收更新消息
	 * @returns 更新消息数据数组
	 */
	receiveUpdates(): Array<{
		updateTick: number;
		serverTick: number;
		messageData: Uint8Array;
	}>;

	/**
	 * 接收变更消息
	 * @returns 变更消息数据数组
	 */
	receiveMutations(): Array<{
		updateTick: number;
		serverTick: number;
		messageData: Uint8Array;
	}>;
}

/**
 * 客户端复制应用系统
 */
export class ReplicationApplicator {
	/** 复制消息接收器 */
	private receiver: ReplicationReceiver;

	constructor(receiver: ReplicationReceiver) {
		this.receiver = receiver;
	}

	/**
	 * 应用复制更新
	 * 主要的系统函数，在每个 tick 调用
	 * @param world - 游戏世界
	 */
	public applyReplication(world: World): void {
		const registry = world.resources.getResource<ReplicationRegistry>();
		const entityMap = world.resources.getResource<ServerEntityMap>();
		const serverUpdateTick = world.resources.getResource<ServerUpdateTick>();

		if (!registry || !entityMap || !serverUpdateTick) {
			warn("Missing required resources for replication application");
			return;
		}

		// 应用变更消息（新实体）
		this.applyMutations(world, registry, entityMap, serverUpdateTick);

		// 应用更新消息（实体变更）
		this.applyUpdates(world, registry, entityMap, serverUpdateTick);
	}

	/**
	 * 应用变更消息
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entityMap - 服务器实体映射
	 * @param serverUpdateTick - 服务器更新 tick
	 */
	private applyMutations(
		world: World,
		registry: ReplicationRegistry,
		entityMap: ServerEntityMap,
		serverUpdateTick: ServerUpdateTick,
	): void {
		const mutations = this.receiver.receiveMutations();

		for (const message of mutations) {
			try {
				// 反序列化消息
				const mutationData = Mutations.deserialize(message.messageData);

				// 更新服务器 tick
				serverUpdateTick.set(mutationData.serverTick);

				// 应用每个实体的变更
				for (const entityMutation of mutationData.entities) {
					this.applyEntityMutation(world, registry, entityMap, entityMutation, mutationData.serverTick);
				}
			} catch (error) {
				warn("Failed to apply mutations:", error);
			}
		}
	}

	/**
	 * 应用单个实体的变更
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entityMap - 服务器实体映射
	 * @param entityMutation - 实体变更数据
	 * @param serverTick - 服务器 tick
	 */
	private applyEntityMutation(
		world: World,
		registry: ReplicationRegistry,
		entityMap: ServerEntityMap,
		entityMutation: { readonly entity: Entity; readonly components: Array<Uint8Array> },
		serverTick: number,
	): void {
		const serverEntity = entityMutation.entity;

		// 检查实体是否已存在映射
		let clientEntity = entityMap.getClientEntity(serverEntity);

		if (clientEntity === undefined) {
			// 创建新的客户端实体
			clientEntity = world.spawn();
			entityMap.addMapping(serverEntity, clientEntity);
		}

		// 添加 Replicated 组件
		const replicationId = serverEntity; // 使用服务器实体 ID 作为复制 ID
		const replicated = createReplicated(replicationId, serverTick);
		world.insert(clientEntity, replicated);

		// 应用所有组件
		for (const componentData of entityMutation.components) {
			this.applyComponentData(world, registry, clientEntity, componentData, entityMap);
		}
	}

	/**
	 * 应用更新消息
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entityMap - 服务器实体映射
	 * @param serverUpdateTick - 服务器更新 tick
	 */
	private applyUpdates(
		world: World,
		registry: ReplicationRegistry,
		entityMap: ServerEntityMap,
		serverUpdateTick: ServerUpdateTick,
	): void {
		const updates = this.receiver.receiveUpdates();

		for (const message of updates) {
			try {
				// 反序列化消息
				const updateData = Updates.deserialize(message.messageData);

				// 更新服务器 tick (在Updates类中应该是tick属性)
				serverUpdateTick.set(updateData.tick);

				// 按照特定顺序处理各个段
				this.processUpdateSegments(world, registry, entityMap, updateData as UpdateDataSegments);
			} catch (error) {
				warn("Failed to apply updates:", error);
			}
		}
	}

	/**
	 * 处理更新消息的各个段
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entityMap - 服务器实体映射
	 * @param updateData - 更新数据
	 */
	private processUpdateSegments(
		world: World,
		registry: ReplicationRegistry,
		entityMap: ServerEntityMap,
		updateData: UpdateDataSegments,
	): void {
		const flags = updateData.flags;

		// 1. 处理映射段（MAPPINGS）
		if (hasFlag(flags, UpdateMessageFlags.MAPPINGS) && updateData.mappings) {
			this.processMappings(world, entityMap, updateData.mappings);
		}

		// 2. 处理销毁段（DESPAWNS）
		if (hasFlag(flags, UpdateMessageFlags.DESPAWNS) && updateData.despawns) {
			this.processDespawns(world, entityMap, updateData.despawns);
		}

		// 3. 处理移除段（REMOVALS）
		if (hasFlag(flags, UpdateMessageFlags.REMOVALS) && updateData.removals) {
			this.processRemovals(world, registry, entityMap, updateData.removals);
		}

		// 4. 处理变更段（CHANGES）
		if (hasFlag(flags, UpdateMessageFlags.CHANGES) && updateData.changes) {
			this.processChanges(world, registry, entityMap, updateData.changes);
		}
	}

	/**
	 * 处理映射段
	 * @param world - 游戏世界
	 * @param entityMap - 服务器实体映射
	 * @param mappings - 映射数据
	 */
	private processMappings(world: World, entityMap: ServerEntityMap, mappings: Array<[Entity, Entity]>): void {
		for (const [serverEntity, pregenEntity] of mappings) {
			// 创建实际的客户端实体
			const clientEntity = world.spawn();

			// 如果有预生成实体，需要进行特殊处理
			// 这里简化处理，直接使用新创建的实体
			entityMap.addMapping(serverEntity, clientEntity);
		}
	}

	/**
	 * 处理销毁段
	 * @param world - 游戏世界
	 * @param entityMap - 服务器实体映射
	 * @param despawns - 销毁的实体列表
	 */
	private processDespawns(world: World, entityMap: ServerEntityMap, despawns: Array<Entity>): void {
		for (const serverEntity of despawns) {
			const clientEntity = entityMap.getClientEntity(serverEntity);
			if (clientEntity !== undefined) {
				// 销毁客户端实体
				world.despawn(clientEntity);
				// 移除映射
				entityMap.removeMapping(serverEntity);
			}
		}
	}

	/**
	 * 处理移除段
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entityMap - 服务器实体映射
	 * @param removals - 移除数据
	 */
	private processRemovals(
		world: World,
		registry: ReplicationRegistry,
		entityMap: ServerEntityMap,
		removals: Array<{ entity: Entity; fnIds: Array<number> }>,
	): void {
		for (const removal of removals) {
			const clientEntity = entityMap.getClientEntity(removal.entity);
			if (clientEntity === undefined) {
				continue;
			}

			// 移除指定的组件
			for (const componentId of removal.fnIds) {
				const componentInfo = registry.getComponentById(componentId);
				if (componentInfo) {
					world.remove(clientEntity, componentInfo.name as any);
				}
			}
		}
	}

	/**
	 * 处理变更段
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entityMap - 服务器实体映射
	 * @param changes - 变更数据
	 */
	private processChanges(
		world: World,
		registry: ReplicationRegistry,
		entityMap: ServerEntityMap,
		changes: Array<{ entity: Entity; components: Array<Uint8Array> }>,
	): void {
		for (const change of changes) {
			const clientEntity = entityMap.getClientEntity(change.entity);
			if (clientEntity === undefined) {
				continue;
			}

			// 应用组件变更
			for (const componentData of change.components) {
				this.applyComponentData(world, registry, clientEntity, componentData, entityMap);
			}
		}
	}

	/**
	 * 应用组件数据
	 * @param world - 游戏世界
	 * @param registry - 复制注册表
	 * @param entity - 实体
	 * @param componentData - 组件数据
	 * @param entityMap - 实体映射
	 */
	private applyComponentData(
		world: World,
		registry: ReplicationRegistry,
		entity: Entity,
		componentData: Uint8Array,
		entityMap: ServerEntityMap,
	): void {
		try {
			// 解析组件数据格式: FnsId + Size + Data
			let offset = 0;

			// 读取组件 ID
			const [componentId, componentIdBytesRead] = SerializedData.readU32At(componentData, offset);
			offset += componentIdBytesRead;

			// 读取组件大小
			const [componentSize, componentSizeBytesRead] = SerializedData.readU32At(componentData, offset);
			offset += componentSizeBytesRead;

			// 读取组件原始数据
			const rawComponentData: Array<number> = [];
			for (let index = 0; index < componentSize; index++) {
				rawComponentData.push(componentData[offset + index]);
			}

			// 获取组件信息
			const componentInfo = registry.getComponentById(componentId);
			if (!componentInfo) {
				warn(`Unknown component ID: ${componentId}`);
				return;
			}

			// 反序列化组件
			const deserializeContext = {
				world,
				isServer: false,
				tick: 0, // 客户端会从更新消息中获取 tick
				entityMap: entityMap.getAllMappings(),
			};
			const component = componentInfo.deserialize(deserializeContext, rawComponentData);

			// 插入组件到实体
			world.insert(entity, component);
		} catch (error) {
			warn("Failed to apply component data:", error);
		}
	}

	/**
	 * 获取复制状态统计
	 * @returns 统计信息
	 */
	public getStats(): {
		pendingUpdates: number;
		pendingMutations: number;
	} {
		return {
			pendingUpdates: this.receiver.receiveUpdates().size(),
			pendingMutations: this.receiver.receiveMutations().size(),
		};
	}
}

/**
 * 创建复制应用器
 * @param receiver - 复制消息接收器
 * @returns 复制应用器实例
 */
export function createReplicationApplicator(receiver: ReplicationReceiver): ReplicationApplicator {
	return new ReplicationApplicator(receiver);
}

/**
 * 复制应用系统函数
 * 用于添加到 Bevy 调度器中
 * @param world - 游戏世界
 */
export function applyReplicationSystem(world: World): void {
	const replicationApplicator = world.resources.getResourceByTypeDescriptor({ id: "ReplicationApplicator", text: "" }) as ReplicationApplicator | undefined;
	if (!replicationApplicator) {
		warn("ReplicationApplicator resource not found");
		return;
	}

	replicationApplicator.applyReplication(world);
}

/**
 * 简单的内存消息接收器（用于测试）
 */
export class MemoryReplicationReceiver implements ReplicationReceiver {
	private updateQueue: Array<{
		updateTick: number;
		serverTick: number;
		messageData: Uint8Array;
	}> = [];

	private mutationQueue: Array<{
		updateTick: number;
		serverTick: number;
		messageData: Uint8Array;
	}> = [];

	/**
	 * 添加更新消息
	 * @param updateTick - 更新 tick
	 * @param serverTick - 服务器 tick
	 * @param messageData - 消息数据
	 */
	public addUpdate(updateTick: number, serverTick: number, messageData: Uint8Array): void {
		this.updateQueue.push({ updateTick, serverTick, messageData });
	}

	/**
	 * 添加变更消息
	 * @param updateTick - 更新 tick
	 * @param serverTick - 服务器 tick
	 * @param messageData - 消息数据
	 */
	public addMutation(updateTick: number, serverTick: number, messageData: Uint8Array): void {
		this.mutationQueue.push({ updateTick, serverTick, messageData });
	}

	/**
	 * 接收更新消息
	 * @returns 更新消息数组
	 */
	public receiveUpdates(): Array<{
		updateTick: number;
		serverTick: number;
		messageData: Uint8Array;
	}> {
		const messages = [...this.updateQueue];
		this.updateQueue.clear();
		return messages;
	}

	/**
	 * 接收变更消息
	 * @returns 变更消息数组
	 */
	public receiveMutations(): Array<{
		updateTick: number;
		serverTick: number;
		messageData: Uint8Array;
	}> {
		const messages = [...this.mutationQueue];
		this.mutationQueue.clear();
		return messages;
	}

	/**
	 * 清空所有消息
	 */
	public clear(): void {
		this.updateQueue.clear();
		this.mutationQueue.clear();
	}

	/**
	 * 获取队列状态
	 * @returns 队列统计
	 */
	public getQueueStats(): {
		updateCount: number;
		mutationCount: number;
	} {
		return {
			updateCount: this.updateQueue.size(),
			mutationCount: this.mutationQueue.size(),
		};
	}
}
