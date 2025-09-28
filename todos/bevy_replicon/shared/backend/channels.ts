/**
 * @fileoverview Replicon 通道定义
 *
 * 定义客户端和服务器之间的通信通道
 * 不包含具体的网络传输实现
 */

import { Resource } from "../../../bevy_ecs";

/**
 * 通道传输保证级别
 */
export enum Channel {
	/** 不可靠且无序 */
	Unreliable = "Unreliable",
	/** 可靠但无序 */
	Unordered = "Unordered",
	/** 可靠且有序 */
	Ordered = "Ordered",
}

/**
 * 服务器到客户端的通道
 */
export enum ServerChannel {
	/**
	 * 用于发送实体映射、插入、移除和销毁消息
	 * 这是一个有序可靠通道
	 */
	Updates = 0,
	/**
	 * 用于发送组件变更消息
	 * 这是一个不可靠通道
	 */
	Mutations = 1,
}

/**
 * 客户端到服务器的通道
 */
export enum ClientChannel {
	/**
	 * 用于发送确认消息，确认收到了来自 ServerChannel.Mutations 的消息
	 * 这是一个有序可靠通道
	 */
	MutationAcks = 0,
}

/**
 * 通道配置
 */
export interface ChannelConfig {
	/** 通道 ID */
	readonly id: number;
	/** 传输保证级别 */
	readonly channel: Channel;
	/** 通道名称 */
	readonly name: string;
}

/**
 * Replicon 通道资源
 * 存储所有用于 Replicon 的通道
 *
 * 通道分为客户端和服务器通道：
 * - 在客户端：
 *   - clientChannels 用于发送
 *   - serverChannels 用于接收
 * - 在服务器：
 *   - serverChannels 用于发送
 *   - clientChannels 用于接收
 */
export class RepliconChannels implements Resource {
	readonly __brand = "Resource" as const;

	/** 服务器通道配置 */
	private serverChannels: ChannelConfig[] = [];
	/** 客户端通道配置 */
	private clientChannels: ChannelConfig[] = [];

	constructor() {
		// 初始化默认通道
		this.serverChannels = [
			{
				id: ServerChannel.Updates,
				channel: Channel.Ordered,
				name: "Updates",
			},
			{
				id: ServerChannel.Mutations,
				channel: Channel.Unreliable,
				name: "Mutations",
			},
		];

		this.clientChannels = [
			{
				id: ClientChannel.MutationAcks,
				channel: Channel.Ordered,
				name: "MutationAcks",
			},
		];
	}

	/**
	 * 创建新的服务器通道并返回其 ID
	 * @param channel - 通道配置
	 * @returns 通道 ID
	 */
	public createServerChannel(channel: Channel, name: string): number {
		const id = this.serverChannels.size();
		this.serverChannels.push({
			id,
			channel,
			name,
		});
		return id;
	}

	/**
	 * 创建新的客户端通道并返回其 ID
	 * @param channel - 通道配置
	 * @returns 通道 ID
	 */
	public createClientChannel(channel: Channel, name: string): number {
		const id = this.clientChannels.size();
		this.clientChannels.push({
			id,
			channel,
			name,
		});
		return id;
	}

	/**
	 * 获取服务器通道列表
	 * @returns 服务器通道配置数组
	 */
	public getServerChannels(): ReadonlyArray<ChannelConfig> {
		return this.serverChannels;
	}

	/**
	 * 获取客户端通道列表
	 * @returns 客户端通道配置数组
	 */
	public getClientChannels(): ReadonlyArray<ChannelConfig> {
		return this.clientChannels;
	}

	/**
	 * 获取服务器通道配置
	 * @param id - 通道 ID
	 * @returns 通道配置
	 */
	public getServerChannel(id: number): ChannelConfig | undefined {
		return this.serverChannels[id];
	}

	/**
	 * 获取客户端通道配置
	 * @param id - 通道 ID
	 * @returns 通道配置
	 */
	public getClientChannel(id: number): ChannelConfig | undefined {
		return this.clientChannels[id];
	}

	/**
	 * 获取服务器通道数量
	 * @returns 通道数量
	 */
	public getServerChannelCount(): number {
		return this.serverChannels.size();
	}

	/**
	 * 获取客户端通道数量
	 * @returns 通道数量
	 */
	public getClientChannelCount(): number {
		return this.clientChannels.size();
	}
}

/**
 * 获取服务器通道的传输保证级别
 * @param channel - 服务器通道
 * @returns 传输保证级别
 */
export function getServerChannelType(channel: ServerChannel): Channel {
	switch (channel) {
		case ServerChannel.Updates:
			return Channel.Ordered;
		case ServerChannel.Mutations:
			return Channel.Unreliable;
		default:
			return Channel.Ordered;
	}
}

/**
 * 获取客户端通道的传输保证级别
 * @param channel - 客户端通道
 * @returns 传输保证级别
 */
export function getClientChannelType(channel: ClientChannel): Channel {
	switch (channel) {
		case ClientChannel.MutationAcks:
			return Channel.Ordered;
		default:
			return Channel.Ordered;
	}
}