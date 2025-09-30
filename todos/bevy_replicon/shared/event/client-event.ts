/**
 * @fileoverview 客户端事件系统
 *
 * 实现客户端到服务器的事件发送功能
 * 包括事件队列管理和发送系统
 */

import type { BevyWorld } from "../../../bevy_ecs";
import { RemoteEventRegistry } from "./registry";
import { ClientMessages } from "../backend/client-messages";

/**
 * 客户端事件发送队列
 * 在客户端收集事件并在系统运行时发送到服务器
 * @template E - 事件类型
 */
export class ClientEventQueue<E extends defined = defined> {
	/** 待发送的事件队列 */
	private queue: E[] = [];

	/**
	 * 添加事件到发送队列
	 * @param event - 要发送的事件
	 */
	public send(event: E): void {
		this.queue.push(event);
	}

	/**
	 * 清空并返回所有待发送事件
	 * @returns 待发送事件数组（只读）
	 */
	public drain(): ReadonlyArray<E> {
		const events = this.queue;
		this.queue = [];
		return events;
	}

	/**
	 * 获取队列中的事件数量
	 * @returns 事件数量
	 */
	public size(): number {
		return this.queue.size();
	}

	/**
	 * 清空队列
	 */
	public clear(): void {
		this.queue = [];
	}
}

/**
 * 为指定事件类型添加发送队列资源
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 */
export function addClientEventQueue<E extends defined = defined>(world: BevyWorld, typeName: string): void {
	const queue = new ClientEventQueue<E>();
	const queueKey = `ClientEventQueue_${typeName}`;
	world.resources.insertResourceByTypeDescriptor(queue, { id: queueKey, text: queueKey });
}

/**
 * 获取客户端事件队列
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 * @returns 客户端事件队列，如果未找到则返回 undefined
 */
export function getClientEventQueue<E extends defined = defined>(world: BevyWorld, typeName: string): ClientEventQueue<E> | undefined {
	const queueKey = `ClientEventQueue_${typeName}`;
	return world.resources.getResourceByTypeDescriptor<ClientEventQueue<E>>({ id: queueKey, text: queueKey });
}

/**
 * 发送客户端事件系统
 * 将所有排队的客户端事件序列化并发送到服务器
 *
 * 应该在客户端的 PostUpdate 阶段运行
 *
 * @param world - Bevy world
 * @param _deltaTime - 帧时间（未使用）
 */
export function sendClientEvents(world: BevyWorld, _deltaTime: number): void {
	const registry = world.resources.getResource<RemoteEventRegistry>();
	const messages = world.resources.getResource<ClientMessages>();

	if (!registry || !messages) {
		return;
	}

	// 遍历所有已注册的客户端事件
	for (const eventInfo of registry.iterClientEvents()) {
		const queueKey = `ClientEventQueue_${eventInfo.typeName}`;
		const queue = world.resources.getResourceByTypeDescriptor<ClientEventQueue>({ id: queueKey, text: queueKey });

		if (!queue) {
			continue;
		}

		// 取出所有待发送事件
		const events = queue.drain();
		if (events.size() === 0) {
			continue;
		}

		// 序列化并发送每个事件
		for (const event of events) {
			try {
				const serialized = eventInfo.serialize(event);
				// 消息格式: "EventType|SerializedData"
				const data = buffer.fromstring(`${eventInfo.typeName}|${serialized}`);
				messages.sendRaw(eventInfo.channelId, data);
			} catch (err) {
				warn(`Failed to serialize client event ${eventInfo.typeName}: ${err}`);
			}
		}
	}
}