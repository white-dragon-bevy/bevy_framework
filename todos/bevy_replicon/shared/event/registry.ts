/**
 * @fileoverview Replicon 事件注册表
 *
 * 管理所有网络事件的注册、序列化和反序列化
 */

import type { Resource } from "../../../bevy_ecs";
import type { SerializeFn, DeserializeFn } from "./types";
import type { Channel } from "../backend/channels";

/**
 * 注册的客户端事件信息（客户端 → 服务器）
 * @template E - 事件类型
 */
export interface ClientEventInfo<E = unknown> {
	/** 事件类型名称（用于识别事件类型） */
	readonly typeName: string;
	/** 使用的通道ID */
	readonly channelId: number;
	/** 通道配置 */
	readonly channel: Channel;
	/** 序列化函数 */
	readonly serialize: SerializeFn<E>;
	/** 反序列化函数 */
	readonly deserialize: DeserializeFn<E>;
}

/**
 * 注册的服务器事件信息（服务器 → 客户端）
 * @template E - 事件类型
 */
export interface ServerEventInfo<E = unknown> {
	/** 事件类型名称（用于识别事件类型） */
	readonly typeName: string;
	/** 使用的通道ID */
	readonly channelId: number;
	/** 通道配置 */
	readonly channel: Channel;
	/** 序列化函数 */
	readonly serialize: SerializeFn<E>;
	/** 反序列化函数 */
	readonly deserialize: DeserializeFn<E>;
}

/**
 * 远程事件注册表
 * 管理所有网络事件的序列化和反序列化
 *
 * 职责:
 * - 注册客户端事件（客户端 → 服务器）
 * - 注册服务器事件（服务器 → 客户端）
 * - 提供事件信息查询
 * - 管理事件通道映射
 */
export class RemoteEventRegistry implements Resource {
	readonly __brand = "Resource" as const;

	/** 客户端事件映射（事件类型名 → 事件信息） */
	private clientEvents = new Map<string, ClientEventInfo>();

	/** 服务器事件映射（事件类型名 → 事件信息） */
	private serverEvents = new Map<string, ServerEventInfo>();

	/** 下一个可用的客户端通道ID */
	private nextClientChannelId = 0;

	/** 下一个可用的服务器通道ID */
	private nextServerChannelId = 0;

	/**
	 * 注册客户端事件（客户端 → 服务器）
	 * @template E - 事件类型
	 * @param typeName - 事件类型名称（必须唯一）
	 * @param channel - 使用的通道配置
	 * @param serialize - 序列化函数
	 * @param deserialize - 反序列化函数
	 * @returns 分配的通道ID
	 */
	public registerClientEvent<E>(
		typeName: string,
		channel: Channel,
		serialize: SerializeFn<E>,
		deserialize: DeserializeFn<E>,
	): number {
		if (this.clientEvents.has(typeName)) {
			error(`Client event '${typeName}' is already registered`);
		}

		const channelId = this.nextClientChannelId;
		this.nextClientChannelId += 1;

		this.clientEvents.set(typeName, {
			typeName,
			channelId,
			channel,
			serialize: serialize as SerializeFn<unknown>,
			deserialize: deserialize as DeserializeFn<unknown>,
		});

		return channelId;
	}

	/**
	 * 注册服务器事件（服务器 → 客户端）
	 * @template E - 事件类型
	 * @param typeName - 事件类型名称（必须唯一）
	 * @param channel - 使用的通道配置
	 * @param serialize - 序列化函数
	 * @param deserialize - 反序列化函数
	 * @returns 分配的通道ID
	 */
	public registerServerEvent<E>(
		typeName: string,
		channel: Channel,
		serialize: SerializeFn<E>,
		deserialize: DeserializeFn<E>,
	): number {
		if (this.serverEvents.has(typeName)) {
			error(`Server event '${typeName}' is already registered`);
		}

		const channelId = this.nextServerChannelId;
		this.nextServerChannelId += 1;

		this.serverEvents.set(typeName, {
			typeName,
			channelId,
			channel,
			serialize: serialize as SerializeFn<unknown>,
			deserialize: deserialize as DeserializeFn<unknown>,
		});

		return channelId;
	}

	/**
	 * 获取客户端事件信息
	 * @param typeName - 事件类型名称
	 * @returns 客户端事件信息，如果未注册则返回 undefined
	 */
	public getClientEvent(typeName: string): ClientEventInfo | undefined {
		return this.clientEvents.get(typeName);
	}

	/**
	 * 获取服务器事件信息
	 * @param typeName - 事件类型名称
	 * @returns 服务器事件信息，如果未注册则返回 undefined
	 */
	public getServerEvent(typeName: string): ServerEventInfo | undefined {
		return this.serverEvents.get(typeName);
	}

	/**
	 * 获取所有已注册的客户端事件类型名称
	 * @returns 事件类型名称数组
	 */
	public getClientEventNames(): ReadonlyArray<string> {
		const eventNames: string[] = [];

		for (const [typeName] of this.clientEvents) {
			eventNames.push(typeName);
		}
		return eventNames;
	}

	/**
	 * 获取所有已注册的服务器事件类型名称
	 * @returns 事件类型名称数组
	 */
	public getServerEventNames(): ReadonlyArray<string> {
		const eventNames: string[] = [];

		for (const [typeName] of this.serverEvents) {
			eventNames.push(typeName);
		}
		return eventNames;
	}

	/**
	 * 根据通道ID获取客户端事件信息
	 * @param channelId - 通道ID
	 * @returns 客户端事件信息，如果未找到则返回 undefined
	 */
	public getClientEventByChannelId(channelId: number): ClientEventInfo | undefined {
		for (const [, eventInfo] of this.clientEvents) {
			if (eventInfo.channelId === channelId) {
				return eventInfo;
			}
		}
		return undefined;
	}

	/**
	 * 根据通道ID获取服务器事件信息
	 * @param channelId - 通道ID
	 * @returns 服务器事件信息，如果未找到则返回 undefined
	 */
	public getServerEventByChannelId(channelId: number): ServerEventInfo | undefined {
		for (const [, eventInfo] of this.serverEvents) {
			if (eventInfo.channelId === channelId) {
				return eventInfo;
			}
		}
		return undefined;
	}

	/**
	 * 获取已注册的客户端事件数量
	 * @returns 客户端事件数量
	 */
	public getClientEventCount(): number {
		return this.clientEvents.size();
	}

	/**
	 * 获取已注册的服务器事件数量
	 * @returns 服务器事件数量
	 */
	public getServerEventCount(): number {
		return this.serverEvents.size();
	}

	/**
	 * 检查客户端事件是否已注册
	 * @param typeName - 事件类型名称
	 * @returns 如果已注册则返回 true
	 */
	public hasClientEvent(typeName: string): boolean {
		return this.clientEvents.has(typeName);
	}

	/**
	 * 检查服务器事件是否已注册
	 * @param typeName - 事件类型名称
	 * @returns 如果已注册则返回 true
	 */
	public hasServerEvent(typeName: string): boolean {
		return this.serverEvents.has(typeName);
	}

	/**
	 * 迭代所有客户端事件
	 * @returns 客户端事件信息数组
	 */
	public iterClientEvents(): ReadonlyArray<ClientEventInfo> {
		const eventInfos: ClientEventInfo[] = [];

		for (const [, eventInfo] of this.clientEvents) {
			eventInfos.push(eventInfo);
		}
		return eventInfos;
	}

	/**
	 * 迭代所有服务器事件
	 * @returns 服务器事件信息数组
	 */
	public iterServerEvents(): ReadonlyArray<ServerEventInfo> {
		const eventInfos: ServerEventInfo[] = [];

		for (const [, eventInfo] of this.serverEvents) {
			eventInfos.push(eventInfo);
		}
		return eventInfos;
	}
}

/**
 * 默认 JSON 序列化函数
 * @template E - 事件类型
 * @param event - 要序列化的事件
 * @returns JSON 字符串
 */
export function defaultSerialize<E>(event: E): string {
	return game.GetService("HttpService").JSONEncode(event);
}

/**
 * 默认 JSON 反序列化函数
 * @template E - 事件类型
 * @param data - JSON 字符串
 * @returns 反序列化后的事件对象
 */
export function defaultDeserialize<E>(data: string): E {
	return game.GetService("HttpService").JSONDecode(data) as E;
}