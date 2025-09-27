/**
 * MessageReader 实现 - 消息读取器
 * 对应 Rust bevy_ecs/src/message/message_reader.rs
 */

import { Message } from "./types";
import { Messages } from "./messages";
import { MessageCursor } from "./message-cursor";

/**
 * 消息读取器 - 用于从世界读取消息
 * 对应 Rust 的 MessageReader<'w, 's, E>
 *
 * MessageReader 是一个系统参数，提供了从 Messages<M> 资源读取消息的便捷方式
 * 每个 MessageReader 维护自己的游标，跟踪它已经读取了哪些消息
 *
 * 使用示例：
 * ```typescript
 * function readMessages(reader: MessageReader<Greeting>) {
 *     for (const greeting of reader.read()) {
 *         print(greeting.text);
 *     }
 * }
 * ```
 */
export class MessageReader<M extends Message> {
	private messages: Messages<M>;
	private cursor: MessageCursor<M>;
	private isCleanedUp: boolean;

	/**
	 * 构造函数
	 * @param messages - 消息存储实例
	 */
	constructor(messages: Messages<M>) {
		this.messages = messages;
		this.cursor = messages.getCursor();
		this.isCleanedUp = false;
	}

	/**
	 * 读取新消息
	 * 返回自上次读取以来的所有新消息
	 * 对应 Rust 的 read
	 */
	public read(): M[] {
		if (this.isCleanedUp) {
			return [];
		}
		return this.cursor.read(this.messages);
	}

	/**
	 * 读取新消息（可变引用）
	 * 允许修改消息内容
	 * 对应 Rust 的 read_mut
	 *
	 * 注意：在 TypeScript 中，所有引用都是可变的
	 */
	public readMut(): M[] {
		if (this.isCleanedUp) {
			return [];
		}
		return this.cursor.readMut(this.messages);
	}

	/**
	 * 清除读取器，将游标重置到当前消息计数
	 * 这会导致下次读取时跳过所有现有消息
	 * 对应 Rust 的 clear
	 */
	public clear(): void {
		if (!this.isCleanedUp) {
			this.cursor.clear(this.messages);
		}
	}

	/**
	 * 获取未读消息的数量
	 * 对应 Rust 的 len
	 */
	public len(): number {
		if (this.isCleanedUp) {
			return 0;
		}
		return this.cursor.len(this.messages);
	}

	/**
	 * 检查是否有未读消息
	 * 对应 Rust 的 is_empty
	 */
	public isEmpty(): boolean {
		if (this.isCleanedUp) {
			return true;
		}
		return this.cursor.isEmpty(this.messages);
	}

	/**
	 * 并行读取（模拟 Rust 的 par_read）
	 * 在 TypeScript 中返回相同的结果
	 */
	public parRead(): M[] {
		if (this.isCleanedUp) {
			return [];
		}
		return this.cursor.parRead(this.messages);
	}

	/**
	 * 并行读取可变（模拟 Rust 的 par_read_mut）
	 * 在 TypeScript 中返回相同的结果
	 */
	public parReadMut(): M[] {
		if (this.isCleanedUp) {
			return [];
		}
		return this.cursor.parReadMut(this.messages);
	}

	/**
	 * 清理读取器
	 * 标记为已清理，后续读取将返回空数组
	 */
	public cleanup(): void {
		this.isCleanedUp = true;
	}

	/**
	 * 获取游标的克隆
	 * 用于创建独立的读取位置
	 */
	public cloneCursor(): MessageCursor<M> {
		return this.cursor.clone();
	}

	/**
	 * 获取底层的 Messages 实例（内部使用）
	 */
	public getMessages(): Messages<M> {
		return this.messages;
	}

	/**
	 * 获取游标（内部使用）
	 */
	public getCursor(): MessageCursor<M> {
		return this.cursor;
	}

	/**
	 * 检查是否已清理
	 */
	public getIsCleanedUp(): boolean {
		return this.isCleanedUp;
	}
}