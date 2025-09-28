/**
 * MessageRegistry 实现 - 消息注册表
 * 对应 Rust bevy_ecs/src/message/message_registry.rs
 */

import { World } from "@rbxts/matter";
import { Message, MessageConstructor } from "./types";
import { Messages } from "./messages";
import { MessageWriter } from "./message-writer";
import { MessageReader } from "./message-reader";
import { Modding } from "@flamework/core";
import { TypeMap } from "../../bevy_core/type-map";

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
	private registry = new TypeMap<Messages<Message>>();
	private readerCounts = new TypeMap<number>();
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
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public register<M extends Message>(
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">
	): void {
		if (!this.registry.has(id,text)) {
			this.registry.set( new Messages<M>(),id,text);
		}
	}

	/**
	 * 注销消息类型
	 * 对应 Rust 的 deregister_messages
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public deregister<M extends Message>(
		messageType: MessageConstructor<M>,
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">
	): void {
		this.registry.delete(id,text);
	}

	/**
	 * 获取消息存储实例
	 * 如果消息类型未注册，返回 undefined
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public getMessages<M extends Message>(
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">
	): Messages<M> | undefined {
		return this.registry.get(id,text) as Messages<M> | undefined;
	}

	/**
	 * 获取或创建消息存储实例
	 * 如果消息类型未注册，会自动注册
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 */
	public getOrCreateMessages<M extends Message>(
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">): Messages<M> {
		if (!this.registry.has(id,text)) {
			this.register<M>(id,text);
		}
		return this.registry.get(id,text) as Messages<M>;
	}

	/**
	 * 创建消息写入器
	 * 如果消息类型未注册，会自动注册
	 * 对应 Rust 的系统参数创建
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 */
	public createWriter<M extends Message>(
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">
	): MessageWriter<M> {
		const messages = this.getOrCreateMessages<M>(id,text);
		return new MessageWriter<M>(messages);
	}


	/**
	 * 创建消息读取器
	 * 如果消息类型未注册，会自动注册
	 * 对应 Rust 的系统参数创建
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 */
	public createReader<M extends Message>(
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">,

	): MessageReader<M> {
		const messages = this.getOrCreateMessages<M>(id,text);
		// 更新读取器计数
		const currentCount = this.readerCounts.get(id,text) ?? 0;
		this.readerCounts.set(currentCount + 1,id,text);
		return new MessageReader<M>(messages);
	}

	/**
	 * 直接发送消息（便捷方法）
	 * @param messageType - 消息类型构造函数
	 * @param message - 要发送的消息实例
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 */
	public send<M extends Message>(
		message: M,
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">,
	): void {
		const writer = this.createWriter<M>(id,text);
		writer.write(message);
	}

	/**
	 * 更新所有消息缓冲区
	 * 应该每帧调用一次
	 * 对应 Rust 的 message_update_system
	 */
	public updateAll(): void {
		for (const [_, messages] of this.registry.entries()) {
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
		for (const [_, messages] of this.registry.entries()) {
			messages.clear();
		}
	}

	/**
	 * 获取统计信息
	 * 返回每个消息类型的统计数据
	 */
	public getStats(): Record<string, { messageCount: number; readerCount: number; oldestMessageCount: number; isEmpty: boolean }> {
		const stats: Record<string, { messageCount: number; readerCount: number; oldestMessageCount: number; isEmpty: boolean }> = {};
		for (const [messageType, messages] of this.registry.entries()) {
			const typeName = tostring(messageType);
			stats[typeName] = {
				messageCount: messages.size(),
				readerCount: this.readerCounts.get(messageType) ?? 0,
				oldestMessageCount: messages.getOldestMessageCount(),
				isEmpty: messages.isEmpty(),
			};
		}
		return stats;
	}

	/**
	 * 检查消息类型是否已注册
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 */
	public isRegistered<M extends Message>(
		id?: Modding.Generic<M, "id">,
		text?: Modding.Generic<M, "text">
	): boolean {
		return this.registry.has(id,text);
	}

	/**
	 * 获取所有已注册的消息类型
	 */
	public getRegisteredMessages(): Messages<Message>[] {
		const types: Messages<Message>[] = [];
		for (const [_, message] of this.registry.entries()) {
			types.push(message);
		}
		return types;
	}

}