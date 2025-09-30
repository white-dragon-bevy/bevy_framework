/**
 * @fileoverview Replicon 事件系统核心类型定义
 *
 * 定义网络事件系统所需的基础类型和接口
 */

import type { Entity } from "@rbxts/matter";
import type { ClientId } from "../../types";
import type { Channel } from "../backend/channels";

/**
 * 服务器事件发送模式
 */
export enum SendMode {
	/** 广播给所有客户端 */
	Broadcast = "Broadcast",
	/** 发送给特定客户端 */
	Direct = "Direct",
	/** 广播给除指定客户端外的所有客户端 */
	BroadcastExcept = "BroadcastExcept",
}

/**
 * 服务器发送事件的包装器
 * 指定事件的发送目标和模式
 * @template E - 事件类型
 */
export interface ToClients<E> {
	/** 发送模式 */
	readonly mode: SendMode;
	/** 要发送的事件 */
	readonly event: E;
	/** Direct 或 BroadcastExcept 模式下指定的客户端ID数组 */
	readonly clientIds?: ReadonlyArray<ClientId>;
}

/**
 * 客户端发送事件的包装器
 * 服务器接收时会包含发送者的客户端ID
 * @template E - 事件类型
 */
export interface FromClient<E> {
	/** 发送者客户端ID */
	readonly clientId: ClientId;
	/** 接收到的事件 */
	readonly event: E;
}

/**
 * 事件序列化函数
 * 将事件转换为可传输的字符串格式
 * @template E - 事件类型
 * @param event - 要序列化的事件
 * @returns 序列化后的字符串
 */
export type SerializeFn<E> = (event: E) => string;

/**
 * 事件反序列化函数
 * 将传输的字符串转换回事件对象
 * @template E - 事件类型
 * @param data - 序列化的字符串
 * @returns 反序列化后的事件对象
 */
export type DeserializeFn<E> = (data: string) => E;

/**
 * 实体映射函数
 * 用于在事件中映射实体引用（客户端实体ID ↔ 服务器实体ID）
 * @param entity - 要映射的实体
 * @returns 映射后的实体
 */
export type EntityMapFn = (entity: Entity) => Entity;

/**
 * 创建 ToClients 包装器 - 广播模式
 * @template E - 事件类型
 * @param event - 要广播的事件
 * @returns ToClients 包装器
 */
export function broadcast<E>(event: E): ToClients<E> {
	return {
		mode: SendMode.Broadcast,
		event,
	};
}

/**
 * 创建 ToClients 包装器 - 直接发送模式
 * @template E - 事件类型
 * @param event - 要发送的事件
 * @param clientIds - 目标客户端ID数组
 * @returns ToClients 包装器
 */
export function direct<E>(event: E, clientIds: ReadonlyArray<ClientId>): ToClients<E> {
	return {
		mode: SendMode.Direct,
		event,
		clientIds,
	};
}

/**
 * 创建 ToClients 包装器 - 排除广播模式
 * @template E - 事件类型
 * @param event - 要广播的事件
 * @param clientIds - 要排除的客户端ID数组
 * @returns ToClients 包装器
 */
export function broadcastExcept<E>(event: E, clientIds: ReadonlyArray<ClientId>): ToClients<E> {
	return {
		mode: SendMode.BroadcastExcept,
		event,
		clientIds,
	};
}