/**
 * @fileoverview 服务器消息资源
 *
 * 管理服务器的发送和接收消息缓冲
 * 不包含具体的网络传输实现
 */

import { Entity } from "@rbxts/matter";
import { Resource } from "../../../bevy_ecs";
import { ClientChannel, ServerChannel } from "./channels";

/**
 * 服务器消息数据类型
 */
export type ServerMessageData = buffer;

/**
 * 服务器消息资源
 * 管理服务器与多个客户端之间的消息交换
 *
 * 网络后端应该：
 * - 调用 `send` 将要发送的消息加入缓冲
 * - 调用 `drainSent` 获取并发送所有缓冲的消息
 * - 调用 `insertReceived` 将接收到的消息加入缓冲
 * - 系统调用 `receive` 处理接收到的消息
 */
export class ServerMessages implements Resource {
	readonly __brand = "Resource" as const;

	/** 发送缓冲 - 按客户端和通道组织 */
	private sendBuffer: Map<Entity, Map<number, ServerMessageData[]>> = new Map();
	/** 接收缓冲 - 按通道组织，包含发送者信息 */
	private receiveBuffer: Map<number, Array<[Entity, ServerMessageData]>> = new Map();
	/** 服务器通道数量 */
	private serverChannelCount = 0;
	/** 客户端通道数量 */
	private clientChannelCount = 0;

	/**
	 * 设置服务器通道数量
	 * @param count - 通道数量
	 */
	public setupServerChannels(count: number): void {
		this.serverChannelCount = count;
	}

	/**
	 * 设置客户端通道数量
	 * @param count - 通道数量
	 */
	public setupClientChannels(count: number): void {
		this.clientChannelCount = count;
		// 初始化接收缓冲
		for (let index = 0; index < count; index++) {
			if (!this.receiveBuffer.has(index)) {
				this.receiveBuffer.set(index, []);
			}
		}
	}

	/**
	 * 发送消息到客户端
	 * @param client - 客户端实体
	 * @param channel - 服务器通道
	 * @param message - 消息数据
	 */
	public send(client: Entity, channel: ServerChannel, message: ServerMessageData): void {
		const channelId = channel as number;
		if (channelId >= this.serverChannelCount) {
			error(`Invalid server channel: ${channelId}`);
		}

		let clientBuffer = this.sendBuffer.get(client);
		if (!clientBuffer) {
			clientBuffer = new Map();
			this.sendBuffer.set(client, clientBuffer);
		}

		let channelBuffer = clientBuffer.get(channelId);
		if (!channelBuffer) {
			channelBuffer = [];
			clientBuffer.set(channelId, channelBuffer);
		}

		channelBuffer.push(message);
	}

	/**
	 * 发送原始消息（用于远程事件等）
	 * @param client - 客户端实体
	 * @param channelId - 通道 ID
	 * @param message - 消息数据
	 */
	public sendRaw(client: Entity, channelId: number, message: ServerMessageData): void {
		if (channelId >= this.serverChannelCount) {
			error(`Invalid channel ID: ${channelId}`);
		}

		let clientBuffer = this.sendBuffer.get(client);
		if (!clientBuffer) {
			clientBuffer = new Map();
			this.sendBuffer.set(client, clientBuffer);
		}

		let channelBuffer = clientBuffer.get(channelId);
		if (!channelBuffer) {
			channelBuffer = [];
			clientBuffer.set(channelId, channelBuffer);
		}

		channelBuffer.push(message);
	}

	/**
	 * 广播消息到所有客户端
	 * @param clients - 客户端实体数组
	 * @param channel - 服务器通道
	 * @param message - 消息数据
	 */
	public broadcast(clients: Entity[], channel: ServerChannel, message: ServerMessageData): void {
		for (const client of clients) {
			this.send(client, channel, message);
		}
	}

	/**
	 * 获取并清空所有待发送的消息
	 * @returns 客户端、通道ID和消息数据的数组
	 */
	public drainSent(): Array<[client: Entity, channelId: number, message: ServerMessageData]> {
		const messages: Array<[Entity, number, ServerMessageData]> = [];

		for (const [client, clientBuffer] of this.sendBuffer) {
			for (const [channelId, channelMessages] of clientBuffer) {
				for (const message of channelMessages) {
					messages.push([client, channelId, message]);
				}
			}
		}

		// 清空发送缓冲
		this.sendBuffer.clear();

		return messages;
	}

	/**
	 * 插入从客户端接收到的消息
	 * @param client - 客户端实体
	 * @param channel - 客户端通道
	 * @param message - 消息数据
	 */
	public insertReceived(client: Entity, channel: ClientChannel, message: ServerMessageData): void {
		const channelId = channel as number;
		if (channelId >= this.clientChannelCount) {
			error(`Invalid client channel: ${channelId}`);
		}

		let buffer = this.receiveBuffer.get(channelId);
		if (!buffer) {
			buffer = [];
			this.receiveBuffer.set(channelId, buffer);
		}
		buffer.push([client, message]);
	}

	/**
	 * 插入原始接收消息（用于远程事件等）
	 * @param client - 客户端实体
	 * @param channelId - 通道 ID
	 * @param message - 消息数据
	 */
	public insertReceivedRaw(client: Entity, channelId: number, message: ServerMessageData): void {
		if (channelId >= this.clientChannelCount) {
			error(`Invalid channel ID: ${channelId}`);
		}

		let buffer = this.receiveBuffer.get(channelId);
		if (!buffer) {
			buffer = [];
			this.receiveBuffer.set(channelId, buffer);
		}
		buffer.push([client, message]);
	}

	/**
	 * 接收特定通道的消息
	 * @param channel - 客户端通道
	 * @returns 客户端和消息数据的数组
	 */
	public receive(channel: ClientChannel): Array<[Entity, ServerMessageData]> {
		const channelId = channel as number;
		const buffer = this.receiveBuffer.get(channelId);
		if (!buffer || buffer.size() === 0) {
			return [];
		}

		// 返回消息并清空缓冲
		const messages = [...buffer];
		buffer.clear();
		return messages;
	}

	/**
	 * 接收原始消息（用于远程事件等）
	 * @param channelId - 通道 ID
	 * @returns 客户端和消息数据的数组
	 */
	public receiveRaw(channelId: number): Array<[Entity, ServerMessageData]> {
		const buffer = this.receiveBuffer.get(channelId);
		if (!buffer || buffer.size() === 0) {
			return [];
		}

		// 返回消息并清空缓冲
		const messages = [...buffer];
		buffer.clear();
		return messages;
	}

	/**
	 * 检查是否有待发送的消息
	 * @param client - 可选，特定客户端
	 * @returns 是否有消息
	 */
	public hasPendingSend(client?: Entity): boolean {
		if (client !== undefined) {
			const clientBuffer = this.sendBuffer.get(client);
			if (!clientBuffer) return false;

			for (const [_, messages] of clientBuffer) {
				if (messages.size() > 0) {
					return true;
				}
			}
			return false;
		}

		for (const [_, clientBuffer] of this.sendBuffer) {
			for (const [_, messages] of clientBuffer) {
				if (messages.size() > 0) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * 检查是否有待接收的消息
	 * @returns 是否有消息
	 */
	public hasPendingReceive(): boolean {
		for (const [_, buffer] of this.receiveBuffer) {
			if (buffer.size() > 0) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 清空所有缓冲
	 */
	public clear(): void {
		this.sendBuffer.clear();
		for (const [_, buffer] of this.receiveBuffer) {
			buffer.clear();
		}
	}

	/**
	 * 清空特定客户端的发送缓冲
	 * @param client - 客户端实体
	 */
	public clearClient(client: Entity): void {
		this.sendBuffer.delete(client);
	}

	/**
	 * 获取发送缓冲中的消息数量
	 * @param client - 可选，特定客户端
	 * @param channel - 可选，特定通道
	 * @returns 消息数量
	 */
	public getSendCount(client?: Entity, channel?: ServerChannel): number {
		if (client !== undefined) {
			const clientBuffer = this.sendBuffer.get(client);
			if (!clientBuffer) return 0;

			if (channel !== undefined) {
				const channelBuffer = clientBuffer.get(channel as number);
				return channelBuffer ? channelBuffer.size() : 0;
			}

			let totalCount = 0;
			for (const [_, messages] of clientBuffer) {
				totalCount += messages.size();
			}
			return totalCount;
		}

		let totalCount = 0;
		for (const [_, clientBuffer] of this.sendBuffer) {
			for (const [_, messages] of clientBuffer) {
				totalCount += messages.size();
			}
		}
		return totalCount;
	}

	/**
	 * 获取接收缓冲中的消息数量
	 * @param channel - 可选，特定通道
	 * @returns 消息数量
	 */
	public getReceiveCount(channel?: ClientChannel): number {
		if (channel !== undefined) {
			const buffer = this.receiveBuffer.get(channel as number);
			return buffer ? buffer.size() : 0;
		}

		let totalCount = 0;
		for (const [_, buffer] of this.receiveBuffer) {
			totalCount += buffer.size();
		}
		return totalCount;
	}

	/**
	 * 获取已连接的客户端列表（有发送缓冲的客户端）
	 * @returns 客户端实体数组
	 */
	public getConnectedClients(): Entity[] {
		const clients: Entity[] = [];
		for (const [client] of this.sendBuffer) {
			clients.push(client);
		}
		return clients;
	}
}