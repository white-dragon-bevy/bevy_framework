/**
 * MessageCursor 实现 - 消息读取游标
 * 对应 Rust bevy_ecs/src/message/message_cursor.rs
 */

import { Message } from "./types";
import { Messages } from "./messages";

/**
 * 消息游标 - 跟踪消息读取位置
 * 对应 Rust 的 MessageCursor<E>
 *
 * 游标跟踪它上次读取的消息位置，
 * 允许多个系统独立地读取消息流
 */
export class MessageCursor<M extends Message = Message> {
	/**
	 * 上次读取的消息计数
	 */
	private lastMessageCount: number;

	constructor() {
		this.lastMessageCount = 0;
	}

	/**
	 * 读取新消息
	 * 返回自上次读取以来的所有新消息
	 * 对应 Rust 的 read
	 */
	public read(messages: Messages<M>): M[] {
		const result: M[] = [];

		// 读取来自两个缓冲区的消息
		const messagesA = messages.getMessagesA();
		const messagesB = messages.getMessagesB();

		// 从缓冲区 A 读取
		if (this.lastMessageCount < messagesB.startMessageCount) {
			const startIndex = math.max(0, this.lastMessageCount - messagesA.startMessageCount);
			const endIndex = messagesA.size();

			for (let i = startIndex; i < endIndex; i++) {
				const instance = messagesA.messages[i];
				if (instance) {
					result.push(instance.message);
				}
			}
		}

		// 从缓冲区 B 读取
		if (this.lastMessageCount < messages.getMessageCount()) {
			const startIndex = math.max(0, this.lastMessageCount - messagesB.startMessageCount);
			const endIndex = messagesB.size();

			for (let i = startIndex; i < endIndex; i++) {
				const instance = messagesB.messages[i];
				if (instance) {
					result.push(instance.message);
				}
			}
		}

		// 更新游标位置
		this.lastMessageCount = messages.getMessageCount();

		return result;
	}

	/**
	 * 读取新消息（可变引用）
	 * 允许修改消息内容
	 * 对应 Rust 的 read_mut
	 *
	 * 注意：在 TypeScript 中，所有引用都是可变的，
	 * 所以这个方法与 read 相同，但保留以保持 API 兼容
	 */
	public readMut(messages: Messages<M>): M[] {
		return this.read(messages);
	}

	/**
	 * 清除游标，将其重置到当前消息计数
	 * 这会导致下次读取时跳过所有现有消息
	 * 对应 Rust 的 clear
	 */
	public clear(messages: Messages<M>): void {
		this.lastMessageCount = messages.getMessageCount();
	}

	/**
	 * 获取未读消息的数量
	 * 对应 Rust 的 len
	 */
	public len(messages: Messages<M>): number {
		const currentCount = messages.getMessageCount();
		const oldestCount = messages.getOldestMessageCount();

		if (this.lastMessageCount >= currentCount) {
			return 0;
		}

		if (this.lastMessageCount < oldestCount) {
			// 游标太旧，一些消息已被丢弃
			return currentCount - oldestCount;
		}

		return currentCount - this.lastMessageCount;
	}

	/**
	 * 检查是否有未读消息
	 * 对应 Rust 的 is_empty
	 */
	public isEmpty(messages: Messages<M>): boolean {
		return this.len(messages) === 0;
	}

	/**
	 * 设置最后的消息计数（内部使用）
	 */
	public setLastMessageCount(count: number): void {
		this.lastMessageCount = count;
	}

	/**
	 * 获取最后的消息计数（内部使用）
	 */
	public getLastMessageCount(): number {
		return this.lastMessageCount;
	}

	/**
	 * 克隆游标
	 * 创建一个具有相同读取位置的新游标
	 */
	public clone(): MessageCursor<M> {
		const cursor = new MessageCursor<M>();
		cursor.lastMessageCount = this.lastMessageCount;
		return cursor;
	}

	/**
	 * 并行读取（模拟 Rust 的 par_read）
	 * 在 TypeScript 中，我们返回相同的结果，因为没有真正的并行
	 */
	public parRead(messages: Messages<M>): M[] {
		return this.read(messages);
	}

	/**
	 * 并行读取可变（模拟 Rust 的 par_read_mut）
	 * 在 TypeScript 中，我们返回相同的结果
	 */
	public parReadMut(messages: Messages<M>): M[] {
		return this.readMut(messages);
	}
}