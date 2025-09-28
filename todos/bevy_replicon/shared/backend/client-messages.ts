/**
 * @fileoverview 客户端消息资源
 *
 * 管理客户端的发送和接收消息缓冲
 * 不包含具体的网络传输实现
 */

import { Resource } from "../../../bevy_ecs";
import { ClientChannel, ServerChannel } from "./channels";

/**
 * 消息数据
 */
export type MessageData = Buffer;

/**
 * 客户端消息资源
 * 管理客户端与服务器之间的消息交换
 *
 * 网络后端应该：
 * - 调用 `send` 将要发送的消息加入缓冲
 * - 调用 `drainSent` 获取并发送所有缓冲的消息
 * - 调用 `insertReceived` 将接收到的消息加入缓冲
 * - 系统调用 `receive` 处理接收到的消息
 */
export class ClientMessages implements Resource {
	readonly __brand = "Resource" as const;

	/** 发送缓冲 - 按通道组织 */
	private sendBuffer: Map<number, MessageData[]> = new Map();
	/** 接收缓冲 - 按通道组织 */
	private receiveBuffer: Map<number, MessageData[]> = new Map();
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
		// 初始化接收缓冲
		for (let index = 0; index < count; index++) {
			if (!this.receiveBuffer.has(index)) {
				this.receiveBuffer.set(index, []);
			}
		}
	}

	/**
	 * 设置客户端通道数量
	 * @param count - 通道数量
	 */
	public setupClientChannels(count: number): void {
		this.clientChannelCount = count;
		// 初始化发送缓冲
		for (let index = 0; index < count; index++) {
			if (!this.sendBuffer.has(index)) {
				this.sendBuffer.set(index, []);
			}
		}
	}

	/**
	 * 发送消息到服务器
	 * @param channel - 客户端通道
	 * @param message - 消息数据
	 */
	public send(channel: ClientChannel, message: MessageData): void {
		const channelId = channel as number;
		if (channelId >= this.clientChannelCount) {
			error(`Invalid client channel: ${channelId}`);
		}

		let buffer = this.sendBuffer.get(channelId);
		if (!buffer) {
			buffer = [];
			this.sendBuffer.set(channelId, buffer);
		}
		buffer.push(message);
	}

	/**
	 * 发送原始消息（用于远程事件等）
	 * @param channelId - 通道 ID
	 * @param message - 消息数据
	 */
	public sendRaw(channelId: number, message: MessageData): void {
		if (channelId >= this.clientChannelCount) {
			error(`Invalid channel ID: ${channelId}`);
		}

		let buffer = this.sendBuffer.get(channelId);
		if (!buffer) {
			buffer = [];
			this.sendBuffer.set(channelId, buffer);
		}
		buffer.push(message);
	}

	/**
	 * 获取并清空所有待发送的消息
	 * @returns 通道ID和消息数据的数组
	 */
	public drainSent(): Array<[channelId: number, message: MessageData]> {
		const messages: Array<[channelId: number, message: MessageData]> = [];

		for (const [channelId, buffer] of this.sendBuffer) {
			for (const message of buffer) {
				messages.push([channelId, message]);
			}
		}

		// 清空发送缓冲
		this.sendBuffer.clear();
		// 重新初始化
		for (let index = 0; index < this.clientChannelCount; index++) {
			this.sendBuffer.set(index, []);
		}

		return messages;
	}

	/**
	 * 插入从服务器接收到的消息
	 * @param channel - 服务器通道
	 * @param message - 消息数据
	 */
	public insertReceived(channel: ServerChannel, message: MessageData): void {
		const channelId = channel as number;
		if (channelId >= this.serverChannelCount) {
			error(`Invalid server channel: ${channelId}`);
		}

		let buffer = this.receiveBuffer.get(channelId);
		if (!buffer) {
			buffer = [];
			this.receiveBuffer.set(channelId, buffer);
		}
		buffer.push(message);
	}

	/**
	 * 插入原始接收消息（用于远程事件等）
	 * @param channelId - 通道 ID
	 * @param message - 消息数据
	 */
	public insertReceivedRaw(channelId: number, message: MessageData): void {
		if (channelId >= this.serverChannelCount) {
			error(`Invalid channel ID: ${channelId}`);
		}

		let buffer = this.receiveBuffer.get(channelId);
		if (!buffer) {
			buffer = [];
			this.receiveBuffer.set(channelId, buffer);
		}
		buffer.push(message);
	}

	/**
	 * 接收特定通道的消息
	 * @param channel - 服务器通道
	 * @returns 消息数据数组
	 */
	public receive(channel: ServerChannel): MessageData[] {
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
	 * @returns 消息数据数组
	 */
	public receiveRaw(channelId: number): MessageData[] {
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
	 * @returns 是否有消息
	 */
	public hasPendingSend(): boolean {
		for (const [_, buffer] of this.sendBuffer) {
			if (buffer.size() > 0) {
				return true;
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
		for (const [_, buffer] of this.sendBuffer) {
			buffer.clear();
		}
		for (const [_, buffer] of this.receiveBuffer) {
			buffer.clear();
		}
	}

	/**
	 * 获取发送缓冲中的消息数量
	 * @param channel - 客户端通道
	 * @returns 消息数量
	 */
	public getSendCount(channel?: ClientChannel): number {
		if (channel !== undefined) {
			const buffer = this.sendBuffer.get(channel as number);
			return buffer ? buffer.size() : 0;
		}

		let totalCount = 0;
		for (const [_, buffer] of this.sendBuffer) {
			totalCount += buffer.size();
		}
		return totalCount;
	}

	/**
	 * 获取接收缓冲中的消息数量
	 * @param channel - 服务器通道
	 * @returns 消息数量
	 */
	public getReceiveCount(channel?: ServerChannel): number {
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
}