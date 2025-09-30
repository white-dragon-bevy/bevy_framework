/**
 * @fileoverview 服务器端客户端事件接收系统
 *
 * 实现服务器接收和处理来自客户端的事件
 * 包括接收队列管理和反序列化
 */

import type { BevyWorld } from "../../../bevy_ecs";
import type { FromClient } from "./types";
import { RemoteEventRegistry } from "./registry";
import { ServerMessages } from "../backend/server-messages";
import type { ClientId } from "../../types";

/**
 * 服务器端客户端事件接收队列
 * 存储从客户端接收到的事件，供游戏逻辑读取
 * @template E - 事件类型
 */
export class FromClientEventQueue<E extends defined = defined> {
	/** 接收到的事件队列 */
	private queue: FromClient<E>[] = [];

	/**
	 * 添加接收到的事件
	 * @param event - 来自客户端的事件
	 */
	public push(event: FromClient<E>): void {
		this.queue.push(event);
	}

	/**
	 * 读取所有接收到的事件
	 * @returns 接收到的事件数组（只读）
	 */
	public read(): ReadonlyArray<FromClient<E>> {
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
 * 为指定事件类型添加接收队列资源
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 */
export function addFromClientEventQueue<E extends defined = defined>(world: BevyWorld, typeName: string): void {
	const queue = new FromClientEventQueue<E>();
	const queueKey = `FromClientEventQueue_${typeName}`;
	world.resources.insertResourceByTypeDescriptor(queue, { id: queueKey, text: queueKey });
}

/**
 * 获取服务器端客户端事件队列
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 * @returns 接收队列，如果未找到则返回 undefined
 */
export function getFromClientEventQueue<E extends defined = defined>(world: BevyWorld, typeName: string): FromClientEventQueue<E> | undefined {
	const queueKey = `FromClientEventQueue_${typeName}`;
	return world.resources.getResourceByTypeDescriptor<FromClientEventQueue<E>>({ id: queueKey, text: queueKey });
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
 * 接收客户端事件系统
 * 从网络接收客户端事件并反序列化到队列
 *
 * 应该在服务器的 PreUpdate 阶段运行
 *
 * @param world - Bevy world
 * @param _deltaTime - 帧时间（未使用）
 */
export function receiveClientEvents(world: BevyWorld, _deltaTime: number): void {
	const registry = world.resources.getResource<RemoteEventRegistry>();
	const messages = world.resources.getResource<ServerMessages>();

	if (!registry || !messages) {
		return;
	}

	// 遍历所有已注册的客户端事件
	for (const eventInfo of registry.iterClientEvents()) {
		const queueKey = `FromClientEventQueue_${eventInfo.typeName}`;
		const queue = world.resources.getResourceByTypeDescriptor<FromClientEventQueue>({ id: queueKey, text: queueKey });

		if (!queue) {
			continue;
		}

		// 接收来自该通道的所有消息
		const received = messages.receiveRaw(eventInfo.channelId);

		for (const [clientEntity, data] of received) {
			try {
				// 解析消息格式: "EventType|SerializedData"
				const [typeName, serialized] = parseEventMessage(data);

				if (typeName === undefined) {
					warn(`Invalid client event message format from client ${clientEntity}`);
					continue;
				}

				// 验证事件类型
				if (typeName !== eventInfo.typeName) {
					warn(`Client event type mismatch: expected ${eventInfo.typeName}, got ${typeName}`);
					continue;
				}

				// 反序列化事件
				const event = eventInfo.deserialize(serialized) as defined;

				// 添加到队列 (clientEntity 作为 ClientId)
				queue.push({
					clientId: clientEntity as unknown as ClientId,
					event,
				});
			} catch (err) {
				warn(`Failed to deserialize client event ${eventInfo.typeName} from client ${clientEntity}: ${err}`);
			}
		}
	}
}

/**
 * 清空客户端事件队列系统
 * 在每帧末尾清空已读取的事件
 *
 * 应该在服务器的 Last 阶段运行
 *
 * @param world - Bevy world
 * @param _deltaTime - 帧时间（未使用）
 */
export function clearClientEventQueues(world: BevyWorld, _deltaTime: number): void {
	const registry = world.resources.getResource<RemoteEventRegistry>();
	if (!registry) {
		return;
	}

	for (const eventInfo of registry.iterClientEvents()) {
		const queueKey = `FromClientEventQueue_${eventInfo.typeName}`;
		const queue = world.resources.getResourceByTypeDescriptor<FromClientEventQueue>({ id: queueKey, text: queueKey });
		queue?.clear();
	}
}