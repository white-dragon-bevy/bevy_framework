/**
 * @fileoverview 后端状态定义
 *
 * 定义客户端和服务器的连接状态
 */

import { Component, Resource } from "../../../../src/bevy_ecs";
import { Entity } from "@rbxts/matter";

/**
 * 客户端连接状态
 * 应该由网络后端在 ClientSet.ReceivePackets 中更新
 */
export enum ClientState {
	/** 未连接或未尝试连接 */
	Disconnected = "Disconnected",
	/** 正在尝试连接到服务器 */
	Connecting = "Connecting",
	/** 已连接到服务器 */
	Connected = "Connected",
}

/**
 * 服务器运行状态
 * 应该由网络后端在 ServerSet.ReceivePackets 中更新
 */
export enum ServerState {
	/** 未激活 */
	Stopped = "Stopped",
	/** 正在接受和处理客户端连接 */
	Running = "Running",
}

/**
 * 客户端状态资源
 */
export class ClientStateResource implements Resource {
	readonly __brand = "Resource" as const;

	constructor(
		public state: ClientState = ClientState.Disconnected,
	) {}

	/**
	 * 设置状态
	 * @param state - 新状态
	 */
	public setState(state: ClientState): void {
		this.state = state;
	}

	/**
	 * 获取状态
	 * @returns 当前状态
	 */
	public getState(): ClientState {
		return this.state;
	}

	/**
	 * 是否已连接
	 * @returns 是否已连接
	 */
	public isConnected(): boolean {
		return this.state === ClientState.Connected;
	}

	/**
	 * 是否正在连接
	 * @returns 是否正在连接
	 */
	public isConnecting(): boolean {
		return this.state === ClientState.Connecting;
	}

	/**
	 * 是否已断开
	 * @returns 是否已断开
	 */
	public isDisconnected(): boolean {
		return this.state === ClientState.Disconnected;
	}
}

/**
 * 服务器状态资源
 */
export class ServerStateResource implements Resource {
	readonly __brand = "Resource" as const;

	constructor(
		public state: ServerState = ServerState.Stopped,
	) {}

	/**
	 * 设置状态
	 * @param state - 新状态
	 */
	public setState(state: ServerState): void {
		this.state = state;
	}

	/**
	 * 获取状态
	 * @returns 当前状态
	 */
	public getState(): ServerState {
		return this.state;
	}

	/**
	 * 是否正在运行
	 * @returns 是否正在运行
	 */
	public isRunning(): boolean {
		return this.state === ServerState.Running;
	}

	/**
	 * 是否已停止
	 * @returns 是否已停止
	 */
	public isStopped(): boolean {
		return this.state === ServerState.Stopped;
	}
}

/**
 * 已连接的客户端组件
 * 附加到代表已连接客户端的实体上
 * 由网络后端创建和销毁
 */
export interface ConnectedClient extends Component {
	/** 客户端 ID */
	readonly id: ClientId;
	/** 连接时间 */
	readonly connectedAt: number;
}

/**
 * 客户端 ID 类型
 */
export type ClientId = number & { readonly __clientId: unique symbol };

/**
 * 特殊客户端 ID - 服务器
 */
export const SERVER_CLIENT_ID = -1 as ClientId;

/**
 * 创建客户端 ID
 * @param id - 数字 ID
 * @returns 客户端 ID
 */
export function createClientId(id: number): ClientId {
	return id as ClientId;
}

/**
 * 断开连接请求事件
 * 网络后端应该响应此事件来断开特定客户端
 * 断开应该在所有待发送消息发送后进行
 */
export interface DisconnectRequest {
	/** 要断开的客户端实体 */
	readonly client: Entity;
	/** 断开原因（可选） */
	readonly reason?: string;
}

/**
 * 客户端统计信息
 * 可以作为资源（当前客户端）或组件（服务器上的已连接客户端）使用
 */
export interface ClientStats extends Resource {
	readonly __brand: "Resource";
	/** 往返时间（秒） */
	rtt: number;
	/** 丢包率（百分比） */
	packetLoss: number;
	/** 发送速率（字节/秒） */
	sentBps: number;
	/** 接收速率（字节/秒） */
	receivedBps: number;
}

/**
 * 创建客户端统计信息
 * @returns 客户端统计信息
 */
export function createClientStats(): ClientStats {
	return {
		__brand: "Resource",
		rtt: 0,
		packetLoss: 0,
		sentBps: 0,
		receivedBps: 0,
	};
}

/**
 * 客户端统计组件
 * 用于附加到客户端实体上
 */
export interface ClientStatsComponent extends Component {
	/** 往返时间（秒） */
	rtt: number;
	/** 丢包率（百分比） */
	packetLoss: number;
	/** 发送速率（字节/秒） */
	sentBps: number;
	/** 接收速率（字节/秒） */
	receivedBps: number;
}