/**
 * @fileoverview 核心复制系统实现
 *
 * 处理实体和组件的网络复制逻辑
 */

import { AnyComponent, Entity, World } from "@rbxts/matter";
import { Resource } from "../../src/bevy_ecs";
import { ClientId, EntityAuthority, NetworkMessage, NetworkRole, Replicated, ReplicationConfig, ReplicationRegistry, ReplicationStrategy } from "./types";

/**
 * 复制管理器资源
 * 管理所有复制相关的状态和操作
 */
export class ReplicationManager implements Resource {
	readonly __brand = "Resource" as const;

	/** 当前网络角色 */
	private networkRole: NetworkRole;

	/** 复制配置 */
	private config: ReplicationConfig;

	/** 已连接的客户端 */
	private connectedClients: Set<ClientId>;

	/** 实体到客户端的可见性映射 */
	private entityVisibility: Map<Entity, Set<ClientId>>;

	/** 待发送的更新队列 */
	private updateQueue: Array<NetworkMessage>;

	/** 上次更新时间戳 */
	private lastUpdateTime: number;

	/** 复制组注册表 */
	private registry: ReplicationRegistry;

	constructor(role: NetworkRole, config: ReplicationConfig) {
		this.networkRole = role;
		this.config = config;
		this.connectedClients = new Set();
		this.entityVisibility = new Map();
		this.updateQueue = [];
		this.lastUpdateTime = os.clock();
		this.registry = {
			__brand: "Resource",
			registeredComponents: new Set(),
			serializers: new Map(),
		};
	}

	/**
	 * 获取网络角色
	 * @returns 当前网络角色
	 */
	getRole(): NetworkRole {
		return this.networkRole;
	}

	/**
	 * 是否为服务器
	 * @returns 如果是服务器返回true
	 */
	isServer(): boolean {
		return this.networkRole === NetworkRole.Server || this.networkRole === NetworkRole.ListenServer;
	}

	/**
	 * 是否为客户端
	 * @returns 如果是客户端返回true
	 */
	isClient(): boolean {
		return this.networkRole === NetworkRole.Client;
	}

	/**
	 * 添加客户端连接
	 * @param clientId - 客户端ID
	 */
	addClient(clientId: ClientId): void {
		if (!this.isServer()) {
			error("Only server can add clients");
		}
		this.connectedClients.add(clientId);
	}

	/**
	 * 移除客户端连接
	 * @param clientId - 客户端ID
	 */
	removeClient(clientId: ClientId): void {
		if (!this.isServer()) {
			error("Only server can remove clients");
		}
		this.connectedClients.delete(clientId);

		// 清理该客户端的可见性数据
		this.entityVisibility.forEach((clients) => {
			clients.delete(clientId);
		});
	}

	/**
	 * 获取所有连接的客户端
	 * @returns 客户端ID集合
	 */
	getConnectedClients(): ReadonlySet<ClientId> {
		return this.connectedClients;
	}

	/**
	 * 设置实体对客户端的可见性
	 * @param entity - 实体
	 * @param clientId - 客户端ID
	 * @param visible - 是否可见
	 */
	setEntityVisibility(entity: Entity, clientId: ClientId, visible: boolean): void {
		if (!this.entityVisibility.has(entity)) {
			this.entityVisibility.set(entity, new Set());
		}

		const clients = this.entityVisibility.get(entity)!;
		if (visible) {
			clients.add(clientId);
		} else {
			clients.delete(clientId);
		}
	}

	/**
	 * 检查实体对客户端是否可见
	 * @param entity - 实体
	 * @param clientId - 客户端ID
	 * @returns 是否可见
	 */
	isEntityVisibleToClient(entity: Entity, clientId: ClientId): boolean {
		const clients = this.entityVisibility.get(entity);
		return clients !== undefined && clients.has(clientId);
	}

	/**
	 * 获取实体的所有可见客户端
	 * @param entity - 实体
	 * @returns 客户端ID集合
	 */
	getEntityVisibleClients(entity: Entity): ReadonlySet<ClientId> {
		return this.entityVisibility.get(entity) || new Set();
	}

	/**
	 * 注册可复制组件类型
	 * @param componentType - 组件类型名称
	 * @param serializer - 组件序列化器
	 */
	registerComponent(componentType: string, serializer: {
		serialize: (component: AnyComponent) => unknown;
		deserialize: (data: unknown) => AnyComponent;
	}): void {
		this.registry.registeredComponents.add(componentType);
		this.registry.serializers.set(componentType, serializer);
	}

	/**
	 * 检查组件类型是否已注册
	 * @param componentType - 组件类型名称
	 * @returns 是否已注册
	 */
	isComponentRegistered(componentType: string): boolean {
		return this.registry.registeredComponents.has(componentType);
	}

	/**
	 * 获取复制配置
	 * @returns 复制配置
	 */
	getConfig(): Readonly<ReplicationConfig> {
		return this.config;
	}

	/**
	 * 更新复制配置
	 * @param config - 新的配置
	 */
	updateConfig(config: Partial<ReplicationConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * 检查是否需要更新
	 * @returns 是否需要更新
	 */
	shouldUpdate(): boolean {
		const currentTime = os.clock();
		const updateInterval = 1 / this.config.updateRate;
		return currentTime - this.lastUpdateTime >= updateInterval;
	}

	/**
	 * 标记已更新
	 */
	markUpdated(): void {
		this.lastUpdateTime = os.clock();
	}

	/**
	 * 添加网络消息到队列
	 * @param message - 网络消息
	 */
	queueMessage(message: NetworkMessage): void {
		this.updateQueue.push(message);
	}

	/**
	 * 获取并清空消息队列
	 * @returns 消息队列
	 */
	flushMessageQueue(): Array<NetworkMessage> {
		const messages = [...this.updateQueue];
		this.updateQueue = [];
		return messages;
	}

	/**
	 * 获取复制注册表
	 * @returns 复制注册表
	 */
	getRegistry(): Readonly<ReplicationRegistry> {
		return this.registry;
	}
}

/**
 * 复制系统
 * 处理实体和组件的网络同步
 * @param world - Matter世界实例
 * @param context - 应用上下文
 */
export function replicationSystem(world: World, appContext: import("../../src/bevy_app").AppContext): void {
	// TODO: 待完善资源管理系统后实现
	// 需要:
	// 1. 从 AppContext 获取 ReplicationManager 资源
	// 2. 根据网络角色调用对应的处理逻辑
	// 3. 处理实体和组件的网络同步
}

/**
 * 处理服务端复制逻辑
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function processServerReplication(world: World, manager: ReplicationManager): void {
	const config = manager.getConfig();

	// 根据复制策略处理
	switch (config.strategy) {
		case ReplicationStrategy.Full:
			processFullReplication(world, manager);
			break;
		case ReplicationStrategy.Delta:
			processDeltaReplication(world, manager);
			break;
		case ReplicationStrategy.OnDemand:
			processOnDemandReplication(world, manager);
			break;
	}

	// 发送队列中的消息
	const messages = manager.flushMessageQueue();
	sendMessages(messages, manager);
}

/**
 * 处理客户端复制逻辑
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function processClientReplication(world: World, manager: ReplicationManager): void {
	// 处理接收到的更新
	processReceivedUpdates(world, manager);

	// 发送客户端输入和预测
	sendClientPredictions(world, manager);
}

/**
 * 处理完全复制策略
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function processFullReplication(world: World, manager: ReplicationManager): void {
	// 遍历所有带有Replicated标记的实体
	for (const [entity, components] of world) {
		// 检查实体是否需要复制
		let hasReplicated = false;
		const componentArray: Array<AnyComponent> = [];
		for (const [_, component] of components) {
			componentArray.push(component);
			if ((component as unknown as Replicated).priority !== undefined) {
				hasReplicated = true;
			}
		}

		if (!hasReplicated) {
			continue;
		}

		// 为每个可见的客户端创建更新
		const visibleClients = manager.getEntityVisibleClients(entity);
		for (const clientId of visibleClients) {
			createEntityUpdate(entity, componentArray, clientId, manager);
		}
	}
}

/**
 * 处理差异复制策略
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function processDeltaReplication(world: World, manager: ReplicationManager): void {
	// TODO: 实现差异检测和发送逻辑
	// 这里需要跟踪组件的变化并只发送变化的部分
	warn("Delta replication not yet implemented, falling back to full replication");
	processFullReplication(world, manager);
}

/**
 * 处理按需复制策略
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function processOnDemandReplication(world: World, manager: ReplicationManager): void {
	// TODO: 实现按需复制逻辑
	// 根据客户端请求发送特定实体的更新
	warn("On-demand replication not yet implemented, falling back to full replication");
	processFullReplication(world, manager);
}

/**
 * 创建实体更新消息
 * @param entity - 实体
 * @param components - 组件列表
 * @param clientId - 目标客户端ID
 * @param manager - 复制管理器
 */
function createEntityUpdate(
	entity: Entity,
	components: Array<AnyComponent>,
	clientId: ClientId,
	manager: ReplicationManager,
): void {
	const registry = manager.getRegistry();
	const updateData: Record<string, unknown> = {};

	// 序列化所有可复制的组件
	for (const component of components) {
		const componentName = tostring(getmetatable(component));
		if (registry.registeredComponents.has(componentName)) {
			const serializer = registry.serializers.get(componentName);
			if (serializer) {
				updateData[componentName] = serializer.serialize(component);
			}
		}
	}

	// 创建更新消息
	if (Object.keys(updateData).size() > 0) {
		manager.queueMessage({
			id: math.random() as unknown as import("./types").NetworkEventId,
			sender: 0 as ClientId, // Server ID
			receiver: clientId,
			data: {
				entity: entity,
				components: updateData,
			},
			reliable: manager.getConfig().reliable,
		});
	}
}

/**
 * 处理接收到的更新
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function processReceivedUpdates(world: World, manager: ReplicationManager): void {
	// TODO: 实现接收和应用更新的逻辑
	// 这里需要从网络接收数据并应用到世界中
}

/**
 * 发送客户端预测
 * @param world - Matter世界实例
 * @param manager - 复制管理器
 */
function sendClientPredictions(world: World, manager: ReplicationManager): void {
	// TODO: 实现客户端预测发送逻辑
	// 发送客户端的输入和预测状态给服务器
}

/**
 * 发送消息
 * @param messages - 消息列表
 * @param manager - 复制管理器
 */
function sendMessages(messages: Array<NetworkMessage>, manager: ReplicationManager): void {
	// TODO: 实现实际的网络发送逻辑
	// 这里需要使用Roblox的RemoteEvent或UnreliableRemoteEvent
	for (const message of messages) {
		// 发送消息到指定客户端或广播
		if (message.receiver !== undefined) {
			// 发送到特定客户端
		} else {
			// 广播到所有客户端
		}
	}
}