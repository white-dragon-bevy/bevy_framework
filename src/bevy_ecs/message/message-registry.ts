/**
 * MessageRegistry 实现 - 消息注册表
 * 对应 Rust bevy_ecs/src/message/message_registry.rs
 */

import { World } from "@rbxts/matter";
import { Message, MessageConstructor } from "./types";
import { Messages } from "./messages";
import { MessageWriter } from "./message-writer";
import { MessageReader } from "./message-reader";

/**
 * 消息注册表 - 管理所有消息类型
 * 对应 Rust 的 MessageRegistry
 *
 * MessageRegistry 负责：
 * - 注册和管理不同类型的消息
 * - 创建消息读写器
 * - 协调消息更新
 */
export class MessageRegistry {
	private registry = new Map<MessageConstructor, Messages<Message>>();
	private world: World;

	/**
	 * 构造函数
	 * @param world - ECS 世界实例
	 */
	constructor(world: World) {
		this.world = world;
	}

	/**
	 * 注册消息类型
	 * 如果消息类型已经注册，则不会重复注册
	 * 对应 Rust 的 register_message
	 */
	public register<M extends Message>(messageType: MessageConstructor<M>): void {
		if (!this.registry.has(messageType as MessageConstructor)) {
			this.registry.set(messageType as MessageConstructor, new Messages<M>());
		}
	}

	/**
	 * 注销消息类型
	 * 对应 Rust 的 deregister_messages
	 */
	public deregister<M extends Message>(messageType: MessageConstructor<M>): void {
		this.registry.delete(messageType as MessageConstructor);
	}

	/**
	 * 获取消息存储实例
	 * 如果消息类型未注册，返回 undefined
	 */
	public getMessages<M extends Message>(messageType: MessageConstructor<M>): Messages<M> | undefined {
		return this.registry.get(messageType as MessageConstructor) as Messages<M> | undefined;
	}

	/**
	 * 获取或创建消息存储实例
	 * 如果消息类型未注册，会自动注册
	 */
	public getOrCreateMessages<M extends Message>(messageType: MessageConstructor<M>): Messages<M> {
		if (!this.registry.has(messageType as MessageConstructor)) {
			this.register(messageType);
		}
		return this.registry.get(messageType as MessageConstructor) as Messages<M>;
	}

	/**
	 * 创建消息写入器
	 * 如果消息类型未注册，会自动注册
	 * 对应 Rust 的系统参数创建
	 */
	public createWriter<M extends Message>(messageType: MessageConstructor<M>): MessageWriter<M> {
		const messages = this.getOrCreateMessages(messageType);
		return new MessageWriter(messages);
	}

	/**
	 * 创建消息读取器
	 * 如果消息类型未注册，会自动注册
	 * 对应 Rust 的系统参数创建
	 */
	public createReader<M extends Message>(messageType: MessageConstructor<M>): MessageReader<M> {
		const messages = this.getOrCreateMessages(messageType);
		return new MessageReader(messages);
	}

	/**
	 * 直接发送消息（便捷方法）
	 * @param messageType - 消息类型构造函数
	 * @param message - 要发送的消息实例
	 */
	public send<M extends Message>(messageType: MessageConstructor<M>, message: M): void {
		const writer = this.createWriter(messageType);
		writer.write(message);
	}

	/**
	 * 更新所有消息缓冲区
	 * 应该每帧调用一次
	 * 对应 Rust 的 message_update_system
	 */
	public updateAll(): void {
		for (const [_, messages] of this.registry) {
			messages.update();
		}
	}

	/**
	 * 清理所有消息存储器
	 * 移除过旧的消息以避免内存泄漏
	 * 对应原 EventManager 的 cleanup 方法
	 */
	public cleanup(): void {
		// 在新的设计中，cleanup 由 update 自动处理
		// 这里保留方法是为了兼容性
		this.updateAll();
	}

	/**
	 * 清空所有消息
	 * 移除所有未处理的消息
	 */
	public clearAll(): void {
		for (const [_, messages] of this.registry) {
			messages.clear();
		}
	}

	/**
	 * 获取统计信息
	 * 返回每个消息类型的统计数据
	 */
	public getStats(): Record<string, unknown> {
		const stats: Record<string, unknown> = {};
		for (const [messageType, messages] of this.registry) {
			const typeName = tostring(messageType);
			stats[typeName] = {
				messageCount: messages.size(),
				oldestMessageCount: messages.getOldestMessageCount(),
				isEmpty: messages.isEmpty(),
			};
		}
		return stats;
	}

	/**
	 * 检查消息类型是否已注册
	 */
	public isRegistered<M extends Message>(messageType: MessageConstructor<M>): boolean {
		return this.registry.has(messageType as MessageConstructor);
	}

	/**
	 * 获取所有已注册的消息类型
	 */
	public getRegisteredTypes(): MessageConstructor[] {
		const types: MessageConstructor[] = [];
		for (const [type] of this.registry) {
			types.push(type);
		}
		return types;
	}

	/**
	 * 获取世界实例
	 */
	public getWorld(): World {
		return this.world;
	}
}