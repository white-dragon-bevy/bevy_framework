/**
 * @fileoverview Bevy Replicon 网络复制框架的类型定义
 *
 * 提供网络复制系统所需的核心类型和接口定义
 */

import { AnyComponent, Entity, World } from "@rbxts/matter";
import { Resource } from "../../src/bevy_ecs";

/**
 * 客户端标识符
 */
export type ClientId = number & { readonly __brand: "ClientId" };

/**
 * 创建客户端ID
 * @param id - 客户端ID数值
 * @returns ClientId 类型的ID
 */
export function createClientId(id: number): ClientId {
	return id as ClientId;
}

/**
 * 网络事件ID类型
 */
export type NetworkEventId = number & { readonly __brand: "NetworkEventId" };

/**
 * 复制策略枚举
 */
export enum ReplicationStrategy {
	/** 完全复制 - 复制所有标记的组件 */
	Full = "Full",
	/** 差异复制 - 仅复制变化的组件 */
	Delta = "Delta",
	/** 按需复制 - 根据客户端请求复制 */
	OnDemand = "OnDemand",
}

/**
 * 网络角色枚举
 */
export enum NetworkRole {
	/** 服务端 */
	Server = "Server",
	/** 客户端 */
	Client = "Client",
	/** 监听服务器（只观察不参与） */
	ListenServer = "ListenServer",
}

/**
 * 复制配置接口
 */
export interface ReplicationConfig {
	/** 复制策略 */
	readonly strategy: ReplicationStrategy;
	/** 更新频率（每秒次数） */
	readonly updateRate: number;
	/** 是否启用压缩 */
	readonly compression: boolean;
	/** 最大包大小（字节） */
	readonly maxPacketSize: number;
	/** 是否启用可靠传输 */
	readonly reliable: boolean;
}

/**
 * 网络统计信息
 */
export interface NetworkStats extends Resource {
	readonly __brand: "Resource";
	/** 已发送字节数 */
	bytesSent: number;
	/** 已接收字节数 */
	bytesReceived: number;
	/** 已发送包数量 */
	packetsSent: number;
	/** 已接收包数量 */
	packetsReceived: number;
	/** 平均延迟（毫秒） */
	averageLatency: number;
	/** 丢包率 */
	packetLoss: number;
	/** 连接的客户端数量 */
	connectedClients: number;
}

/**
 * 复制组件标记接口
 * 所有需要网络复制的组件都应该实现此接口
 */
export interface Replicated extends AnyComponent {
	/** 复制优先级（越高越优先） */
	readonly priority?: number;
	/** 是否需要可靠传输 */
	readonly reliable?: boolean;
}

/**
 * 客户端连接信息
 */
export interface ClientInfo extends Resource {
	readonly __brand: "Resource";
	/** 客户端ID */
	readonly id: ClientId;
	/** 玩家实例 */
	readonly player: Player;
	/** 连接时间戳 */
	readonly connectedAt: number;
	/** 最后活动时间戳 */
	lastActivity: number;
	/** 是否已认证 */
	authenticated: boolean;
}

/**
 * 服务端配置资源
 */
export interface ServerConfig extends Resource {
	readonly __brand: "Resource";
	/** 服务器端口 */
	readonly port: number;
	/** 最大客户端数量 */
	readonly maxClients: number;
	/** 心跳间隔（秒） */
	readonly heartbeatInterval: number;
	/** 超时时间（秒） */
	readonly timeout: number;
}

/**
 * 客户端配置资源
 */
export interface ClientConfig extends Resource {
	readonly __brand: "Resource";
	/** 服务器地址 */
	readonly serverAddress: string;
	/** 自动重连 */
	readonly autoReconnect: boolean;
	/** 重连延迟（秒） */
	readonly reconnectDelay: number;
	/** 最大重连次数 */
	readonly maxReconnectAttempts: number;
}

/**
 * 复制事件基类
 */
export interface ReplicationEvent {
	/** 事件时间戳 */
	readonly timestamp: number;
	/** 相关实体 */
	readonly entity?: Entity;
}

/**
 * 实体生成事件
 */
export interface EntitySpawnedEvent extends ReplicationEvent {
	/** 生成的实体 */
	readonly entity: Entity;
	/** 拥有者客户端ID */
	readonly owner?: ClientId;
}

/**
 * 实体销毁事件
 */
export interface EntityDespawnedEvent extends ReplicationEvent {
	/** 销毁的实体 */
	readonly entity: Entity;
	/** 销毁原因 */
	readonly reason?: string;
}

/**
 * 客户端连接事件
 */
export interface ClientConnectedEvent extends ReplicationEvent {
	/** 客户端ID */
	readonly clientId: ClientId;
	/** 客户端信息 */
	readonly info: ClientInfo;
}

/**
 * 客户端断开事件
 */
export interface ClientDisconnectedEvent extends ReplicationEvent {
	/** 客户端ID */
	readonly clientId: ClientId;
	/** 断开原因 */
	readonly reason?: string;
}

/**
 * 组件更新事件
 */
export interface ComponentUpdatedEvent extends ReplicationEvent {
	/** 实体 */
	readonly entity: Entity;
	/** 组件类型 */
	readonly componentType: string;
	/** 旧值 */
	readonly oldValue?: unknown;
	/** 新值 */
	readonly newValue: unknown;
}

/**
 * 权限级别枚举
 */
export enum AuthorityLevel {
	/** 无权限 */
	None = 0,
	/** 观察者权限 */
	Observer = 1,
	/** 玩家权限 */
	Player = 2,
	/** 管理员权限 */
	Admin = 3,
	/** 服务器权限 */
	Server = 4,
}

/**
 * 实体权限信息
 */
export interface EntityAuthority extends AnyComponent {
	/** 拥有者客户端ID */
	readonly owner: ClientId | undefined;
	/** 权限级别 */
	readonly level: AuthorityLevel;
	/** 是否允许客户端预测 */
	readonly allowPrediction: boolean;
}

/**
 * 网络消息接口
 */
export interface NetworkMessage {
	/** 消息ID */
	readonly id: NetworkEventId;
	/** 发送者 */
	readonly sender: ClientId;
	/** 接收者（undefined 表示广播） */
	readonly receiver?: ClientId;
	/** 消息数据 */
	readonly data: unknown;
	/** 是否可靠传输 */
	readonly reliable: boolean;
}

/**
 * 复制组注册表
 */
export interface ReplicationRegistry extends Resource {
	readonly __brand: "Resource";
	/** 已注册的复制组件类型 */
	readonly registeredComponents: Set<string>;
	/** 组件序列化器映射 */
	readonly serializers: Map<string, ComponentSerializer>;
}

/**
 * 组件序列化器接口
 */
export interface ComponentSerializer {
	/**
	 * 序列化组件
	 * @param component - 要序列化的组件
	 * @returns 序列化后的数据
	 */
	serialize(component: AnyComponent): unknown;

	/**
	 * 反序列化组件
	 * @param data - 序列化的数据
	 * @returns 反序列化后的组件
	 */
	deserialize(data: unknown): AnyComponent;
}

/**
 * 网络通道定义
 */
export interface NetworkChannel {
	/** 通道名称 */
	readonly name: string;
	/** 是否可靠 */
	readonly reliable: boolean;
	/** 是否有序 */
	readonly ordered: boolean;
	/** 优先级 */
	readonly priority: number;
}

/**
 * 预测回滚信息
 */
export interface PredictionRollback {
	/** 回滚的实体 */
	readonly entity: Entity;
	/** 回滚到的状态 */
	readonly state: Map<string, AnyComponent>;
	/** 回滚的帧号 */
	readonly frame: number;
}

/**
 * 网络时间同步信息
 */
export interface NetworkTime extends Resource {
	readonly __brand: "Resource";
	/** 服务器时间 */
	serverTime: number;
	/** 客户端时间 */
	clientTime: number;
	/** 时间偏移 */
	offset: number;
	/** 往返时间 */
	roundTripTime: number;
}