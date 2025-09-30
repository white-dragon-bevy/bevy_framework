/**
 * @fileoverview 客户端服务器事件接收系统
 *
 * 实现客户端接收和处理来自服务器的事件
 * 包括接收队列管理和反序列化
 */

import type { BevyWorld } from "../../../bevy_ecs";
import { RemoteEventRegistry } from "./registry";
import { ClientMessages } from "../backend/client-messages";

/**
 * 客户端事件接收队列
 * 存储从服务器接收到的事件，供游戏逻辑读取
 * 注意：这是客户端接收服务器发送的事件后的存储队列
 * @template E - 事件类型
 */
export class ReceivedServerEventQueue<E extends defined = defined> {
	/** 接收到的事件队列 */
	private queue: E[] = [];

	/**
	 * 添加接收到的事件
	 * @param event - 从服务器接收的事件
	 */
	public push(event: E): void {
		this.queue.push(event);
	}

	/**
	 * 读取所有接收到的事件
	 * @returns 接收到的事件数组（只读）
	 */
	public read(): ReadonlyArray<E> {
		return this.queue;
	}

	/**
	 * 清空队列
	 */
	public clear(): void {
		this.queue = [];
	}

	/**
	 * 获取队列大小
	 * @returns 队列中的事件数量
	 */
	public size(): number {
		return this.queue.size();
	}
}

/**
 * 为指定事件类型添加接收队列资源（客户端）
 * 用于客户端接收来自服务器的事件
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 */
export function addReceivedServerEventQueue<E extends defined = defined>(world: BevyWorld, typeName: string): void {
	const queue = new ReceivedServerEventQueue<E>();
	const queueKey = `ReceivedServerEventQueue_${typeName}`;
	world.resources.insertResourceByTypeDescriptor(queue, { id: queueKey, text: queueKey });
}

/**
 * 获取接收到的服务器事件队列（客户端）
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 * @returns 接收事件队列，如果未找到则返回 undefined
 */
export function getReceivedServerEventQueue<E extends defined = defined>(
	world: BevyWorld,
	typeName: string,
): ReceivedServerEventQueue<E> | undefined {
	const queueKey = `ReceivedServerEventQueue_${typeName}`;
	return world.resources.getResourceByTypeDescriptor<ReceivedServerEventQueue<E>>({ id: queueKey, text: queueKey });
}

/**
 * 解析事件消息
 * 从 "EventType|SerializedData" 格式中提取类型名和数据
 * @param data - 消息数据
 * @returns 元组 [typeName, serializedData]，解析失败返回 undefined
 */
function parseEventMessage(data: buffer): LuaTuple<[string, string] | [undefined]> {
	const dataString = buffer.tostring(data);
	// 查找分隔符位置
	let separatorIndex = -1;
	for (let index = 0; index < dataString.size(); index++) {
		if (dataString.sub(index + 1, index + 1) === "|") {
			separatorIndex = index;
			break;
		}
	}

	if (separatorIndex === -1) {
		return $tuple(undefined);
	}

	const typeName = dataString.sub(1, separatorIndex);
	const serialized = dataString.sub(separatorIndex + 2);
	return $tuple(typeName, serialized);
}

/**
 * 接收服务器事件系统
 * 从网络接收服务器事件并反序列化到队列
 *
 * 应该在客户端的 PreUpdate 阶段运行
 *
 * @param world - Bevy world
 * @param _deltaTime - 帧时间（未使用）
 */
export function receiveServerEvents(world: BevyWorld, _deltaTime: number): void {
	const registry = world.resources.getResource<RemoteEventRegistry>();
	const messages = world.resources.getResource<ClientMessages>();

	if (!registry || !messages) {
		return;
	}

	// 遍历所有已注册的服务器事件
	for (const eventInfo of registry.iterServerEvents()) {
		const queueKey = `ReceivedServerEventQueue_${eventInfo.typeName}`;
		const queue = world.resources.getResourceByTypeDescriptor<ReceivedServerEventQueue>({
			id: queueKey,
			text: queueKey,
		});

		if (!queue) {
			continue;
		}

		// 接收来自该通道的所有消息
		const received = messages.receiveRaw(eventInfo.channelId);

		for (const data of received) {
			try {
				// 解析消息格式: "EventType|SerializedData"
				const [typeName, serialized] = parseEventMessage(data);

				if (typeName === undefined) {
					warn(`Invalid server event message format`);
					continue;
				}

				// 验证事件类型
				if (typeName !== eventInfo.typeName) {
					warn(`Server event type mismatch: expected ${eventInfo.typeName}, got ${typeName}`);
					continue;
				}

				// 反序列化事件
				const event = eventInfo.deserialize(serialized) as defined;

				// 添加到队列
				queue.push(event);
			} catch (err) {
				warn(`Failed to deserialize server event ${eventInfo.typeName}: ${err}`);
			}
		}
	}
}

/**
 * 清空服务器事件队列系统
 * 在每帧末尾清空已读取的事件
 *
 * 应该在客户端的 Last 阶段运行
 *
 * @param world - Bevy world
 * @param _deltaTime - 帧时间（未使用）
 */
export function clearServerEventQueues(world: BevyWorld, _deltaTime: number): void {
	const registry = world.resources.getResource<RemoteEventRegistry>();
	if (!registry) {
		return;
	}

	for (const eventInfo of registry.iterServerEvents()) {
		const queueKey = `ReceivedServerEventQueue_${eventInfo.typeName}`;
		const queue = world.resources.getResourceByTypeDescriptor<ReceivedServerEventQueue>({
			id: queueKey,
			text: queueKey,
		});
		queue?.clear();
	}
}