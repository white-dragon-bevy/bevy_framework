/**
 * MessageWriter 实现 - 消息写入器
 * 对应 Rust bevy_ecs/src/message/message_writer.rs
 */

import { Message, MessageId, WriteBatchIds } from "./types";
import { Messages } from "./messages";

/**
 * 消息写入器 - 用于向世界发送消息
 * 对应 Rust 的 MessageWriter<'w, E>
 *
 * MessageWriter 是一个系统参数，提供了向 Messages<M> 资源写入消息的便捷方式
 *
 * 使用示例：
 * ```typescript
 * function writeGreeting(writer: MessageWriter<Greeting>) {
 *     writer.write(new Greeting("Hello!"));
 * }
 * ```
 */
export class MessageWriter<M extends Message> {
	private messages: Messages<M>;

	/**
	 * 构造函数
	 * @param messages - 消息存储实例
	 */
	constructor(messages: Messages<M>) {
		this.messages = messages;
	}

	/**
	 * 写入消息到消息缓冲区
	 * MessageReader 可以读取该消息
	 * 返回写入消息的 ID
	 * 对应 Rust 的 write
	 */
	public write(message: M): MessageId<M> {
		return this.messages.write(message);
	}

	/**
	 * 批量写入消息，比单独写入每个消息更高效
	 * 返回写入消息的 ID 集合
	 * 对应 Rust 的 write_batch
	 */
	public writeBatch(messages: M[]): WriteBatchIds<M> {
		return this.messages.writeBatch(messages);
	}

	/**
	 * 写入消息的默认值（当消息是空结构时很有用）
	 * 对应 Rust 的 write_default
	 *
	 * 注意：TypeScript 没有默认值概念，需要传入一个默认消息
	 */
	public writeDefault(defaultMessage: M): MessageId<M> {
		return this.messages.writeDefault(defaultMessage);
	}

	/**
	 * 发送消息的便捷方法（send 是 write 的别名）
	 * 保留用于向后兼容
	 */
	public send(message: M): boolean {
		this.write(message);
		return true;
	}

	/**
	 * 批量发送消息的便捷方法
	 * 保留用于向后兼容
	 */
	public sendBatch(messages: M[]): WriteBatchIds<M> {
		return this.writeBatch(messages);
	}

	/**
	 * 获取底层的 Messages 实例（内部使用）
	 */
	public getMessages(): Messages<M> {
		return this.messages;
	}

	/**
	 * 检查是否有消息
	 */
	public isEmpty(): boolean {
		return this.messages.isEmpty();
	}

	/**
	 * 获取消息数量
	 */
	public len(): number {
		return this.messages.size();
	}
}