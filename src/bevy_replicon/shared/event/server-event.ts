/**
 * @fileoverview 服务器事件发送系统
 *
 * 实现服务器到客户端的事件发送功能
 * 包括广播、单播和排除广播三种发送模式
 */

import type { BevyWorld } from "../../../bevy_ecs";
import type { ToClients } from "./types";
import { SendMode } from "./types";
import { RemoteEventRegistry } from "./registry";
import { ServerMessages } from "../backend/server-messages";
import type { ClientId } from "../../types";
import type { Entity } from "@rbxts/matter";

/**
 * 服务器事件发送队列
 * 在服务器收集事件并在系统运行时发送到客户端
 * @template E - 事件类型
 */
export class ServerEventQueue<E extends defined = defined> {
	/** 待发送的事件队列 */
	private queue: ToClients<E>[] = [];

	/**
	 * 添加事件到发送队列（广播模式）
	 * 将事件发送给所有已连接的客户端
	 * @param event - 要广播的事件
	 */
	public broadcast(event: E): void {
		this.queue.push({
			mode: SendMode.Broadcast,
			event,
		});
	}

	/**
	 * 添加事件到发送队列（单播模式）
	 * 将事件发送给指定的单个客户端
	 * @param clientId - 目标客户端ID
	 * @param event - 要发送的事件
	 */
	public direct(clientId: ClientId, event: E): void {
		this.queue.push({
			mode: SendMode.Direct,
			event,
			clientIds: [clientId],
		});
	}

	/**
	 * 添加事件到发送队列（排除模式）
	 * 将事件广播给除指定客户端外的所有客户端
	 * @param excludeIds - 要排除的客户端ID数组
	 * @param event - 要广播的事件
	 */
	public broadcastExcept(excludeIds: ReadonlyArray<ClientId>, event: E): void {
		this.queue.push({
			mode: SendMode.BroadcastExcept,
			event,
			clientIds: excludeIds,
		});
	}

	/**
	 * 添加事件到发送队列（通用方法）
	 * 直接添加 ToClients 包装器
	 * @param toClients - ToClients 事件包装器
	 */
	public send(toClients: ToClients<E>): void {
		this.queue.push(toClients);
	}

	/**
	 * 清空并返回所有待发送事件
	 * @returns 待发送事件数组（只读）
	 */
	public drain(): ReadonlyArray<ToClients<E>> {
		const events = this.queue;
		this.queue = [];
		return events;
	}

	/**
	 * 获取队列大小
	 * @returns 队列中的事件数量
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
export function addServerEventQueue<E extends defined = defined>(world: BevyWorld, typeName: string): void {
	const queue = new ServerEventQueue<E>();
	const queueKey = `ServerEventQueue_${typeName}`;
	world.resources.insertResourceByTypeDescriptor(queue, { id: queueKey, text: queueKey });
}

/**
 * 获取服务器事件队列
 * @template E - 事件类型
 * @param world - Bevy world
 * @param typeName - 事件类型名称
 * @returns 服务器事件队列，如果未找到则返回 undefined
 */
export function getServerEventQueue<E extends defined = defined>(
	world: BevyWorld,
	typeName: string,
): ServerEventQueue<E> | undefined {
	const queueKey = `ServerEventQueue_${typeName}`;
	return world.resources.getResourceByTypeDescriptor<ServerEventQueue<E>>({ id: queueKey, text: queueKey });
}

/**
 * 获取所有已连接的客户端实体列表
 * 临时实现：从 ServerMessages 获取客户端列表
 * TODO: 未来应该从 ConnectedClient 组件查询获取
 * @param world - Bevy world
 * @returns 客户端实体数组
 */
function getConnectedClients(world: BevyWorld): Entity[] {
	const messages = world.resources.getResource<ServerMessages>();
	if (!messages) {
		return [];
	}

	return messages.getConnectedClients();
}

/**
 * 发送服务器事件系统
 * 将所有排队的服务器事件序列化并发送到客户端
 *
 * 应该在服务器的 PostUpdate 阶段运行
 *
 * @param world - Bevy world
 * @param _deltaTime - 帧时间（未使用）
 */
export function sendServerEvents(world: BevyWorld, _deltaTime: number): void {
	const registry = world.resources.getResource<RemoteEventRegistry>();
	const messages = world.resources.getResource<ServerMessages>();

	if (!registry || !messages) {
		return;
	}

	// 获取所有已连接客户端
	const allClients = getConnectedClients(world);
	if (allClients.size() === 0) {
		return;
	}

	// 遍历所有已注册的服务器事件
	for (const eventInfo of registry.iterServerEvents()) {
		const queueKey = `ServerEventQueue_${eventInfo.typeName}`;
		const queue = world.resources.getResourceByTypeDescriptor<ServerEventQueue>({ id: queueKey, text: queueKey });

		if (!queue) {
			continue;
		}

		// 取出所有待发送事件
		const events = queue.drain();
		if (events.size() === 0) {
			continue;
		}

		// 发送每个事件
		for (const toClients of events) {
			try {
				// 序列化事件
				const serialized = eventInfo.serialize(toClients.event);
				// 消息格式: "EventType|SerializedData"
				const data = buffer.fromstring(`${eventInfo.typeName}|${serialized}`);

				// 根据发送模式确定目标客户端
				let targetClients: Entity[];
				if (toClients.mode === SendMode.Broadcast) {
					targetClients = allClients;
				} else if (toClients.mode === SendMode.Direct) {
					// Direct 模式: 只发送给指定的客户端
					const directClientIds = toClients.clientIds || [];
					targetClients = allClients.filter((clientEntity) =>
						directClientIds.includes(clientEntity as unknown as ClientId),
					);
				} else if (toClients.mode === SendMode.BroadcastExcept) {
					// BroadcastExcept 模式: 发送给除指定客户端外的所有客户端
					const excludeClientIds = toClients.clientIds || [];
					const excludeSet = new Set<ClientId>(excludeClientIds);
					targetClients = allClients.filter(
						(clientEntity) => !excludeSet.has(clientEntity as unknown as ClientId),
					);
				} else {
					warn(`Unknown SendMode: ${toClients.mode}`);
					continue;
				}

				// 发送到每个目标客户端
				for (const clientEntity of targetClients) {
					messages.sendRaw(clientEntity, eventInfo.channelId, data);
				}
			} catch (err) {
				warn(`Failed to serialize server event ${eventInfo.typeName}: ${err}`);
			}
		}
	}
}