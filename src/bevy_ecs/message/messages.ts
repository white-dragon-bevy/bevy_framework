/**
 * Messages 双缓冲消息系统实现
 * 对应 Rust bevy_ecs/src/message/messages.rs
 */

import { Message, MessageId, MessageInstance, MessageSequence, WriteBatchIds } from "./types";
import { MessageCursor } from "./message-cursor";

/**
 * 消息集合 - 表示最近两次 update 调用内发生的消息
 * 对应 Rust 的 Messages<E>
 *
 * 消息可以使用 MessageWriter 写入，通常使用 MessageReader 廉价地读取。
 * 每个消息可以被多个系统并行消费，消费跟踪由 MessageReader 按系统进行。
 *
 * 此集合旨在与调用 Messages::update 的系统配对，每次更新/帧精确调用一次。
 * MessageReader 应该每循环/帧至少读取一次消息。
 * 消息将在单帧边界内持久化，因此消息生产者和消费者的顺序不是关键的。
 * 如果消息在更新后的帧结束时未被处理，它们将被静默丢弃。
 *
 * 实现细节：
 * Messages 使用双缓冲策略的变体实现。
 * 每次调用 update() 都会交换缓冲区并清除最旧的缓冲区。
 * - MessageReader 将从两个缓冲区读取消息
 * - 每次更新至少读取一次的 MessageReader 永远不会丢失消息
 * - 在两次更新内读取一次的 MessageReader 可能仍会收到一些消息
 * - 在两次更新后读取的 MessageReader 保证会丢失这些更新之前发生的所有消息
 */
export class Messages<M extends Message> {
	/**
	 * 保存最旧的仍然活跃的消息
	 * 注意 a.startMessageCount + a.size() 应该总是等于 messagesB.startMessageCount
	 */
	private messagesA: MessageSequence<M>;

	/**
	 * 保存较新的消息
	 */
	private messagesB: MessageSequence<M>;

	/**
	 * 消息计数器
	 */
	private messageCount: number;

	constructor() {
		this.messagesA = new MessageSequence<M>();
		this.messagesB = new MessageSequence<M>();
		this.messageCount = 0;
	}

	/**
	 * 返回存储在消息缓冲区中最旧消息的索引
	 * 对应 Rust 的 oldest_message_count
	 */
	public getOldestMessageCount(): number {
		return this.messagesA.startMessageCount;
	}

	/**
	 * 写入消息到当前消息缓冲区
	 * MessageReader 可以读取该消息
	 * 返回写入消息的 ID
	 * 对应 Rust 的 write
	 */
	public write(message: M): MessageId<M> {
		const messageId: MessageId<M> = {
			id: this.messageCount,
			timestamp: os.clock(),
			_marker: message as M,
		};

		const messageInstance: MessageInstance<M> = {
			messageId,
			message,
		};

		this.messagesB.push(messageInstance);
		this.messageCount++;

		return messageId;
	}

	/**
	 * 批量写入消息
	 * 比单独写入每个消息更高效
	 * 返回写入消息的 ID 集合
	 * 对应 Rust 的 write_batch
	 */
	public writeBatch(messages: M[]): WriteBatchIds<M> {
		const lastCount = this.messageCount;

		for (const message of messages) {
			const messageId: MessageId<M> = {
				id: this.messageCount,
				timestamp: os.clock(),
				_marker: message as M,
			};

			const messageInstance: MessageInstance<M> = {
				messageId,
				message,
			};

			this.messagesB.push(messageInstance);
			this.messageCount++;
		}

		return new WriteBatchIds<M>(lastCount, this.messageCount);
	}

	/**
	 * 写入消息的默认值（当消息是空结构时很有用）
	 * 对应 Rust 的 write_default
	 */
	public writeDefault(defaultMessage: M): MessageId<M> {
		return this.write(defaultMessage);
	}

	/**
	 * 获取新的 MessageCursor
	 * 这将包括消息缓冲区中已有的所有消息
	 * 对应 Rust 的 get_cursor
	 */
	public getCursor(): MessageCursor<M> {
		// 直接导入，TypeScript 会处理循环依赖
		const cursor = new MessageCursor<M>();
		return cursor;
	}

	/**
	 * 获取新的 MessageCursor
	 * 这将忽略消息缓冲区中已有的所有消息
	 * 它将读取所有未来的消息
	 * 对应 Rust 的 get_cursor_current
	 */
	public getCursorCurrent(): MessageCursor<M> {
		const cursor = new MessageCursor<M>();
		cursor.setLastMessageCount(this.messageCount);
		return cursor;
	}

	/**
	 * 交换消息缓冲区并清除最旧的消息缓冲区
	 * 通常应该每帧/更新调用一次
	 * 对应 Rust 的 update
	 */
	public update(): void {
		// 交换缓冲区
		const temp = this.messagesA;
		this.messagesA = this.messagesB;
		this.messagesB = temp;

		// 清除新的 B 缓冲区（之前的 A）
		this.messagesB.clear();
		this.messagesB.startMessageCount = this.messageCount;

		// 验证不变量
		const expectedStart = this.messagesA.startMessageCount + this.messagesA.size();
		assert(
			expectedStart === this.messagesB.startMessageCount,
			`Messages invariant violated: ${expectedStart} !== ${this.messagesB.startMessageCount}`,
		);
	}

	/**
	 * 交换消息缓冲区并排空最旧的消息缓冲区，返回所有被移除消息的迭代器
	 * 通常应该每帧/更新调用一次
	 * 如果不需要获取被移除消息的所有权，使用 update() 代替
	 * 对应 Rust 的 update_drain
	 */
	public updateDrain(): M[] {
		// 交换缓冲区
		const temp = this.messagesA;
		this.messagesA = this.messagesB;
		this.messagesB = temp;

		// 排空新的 B 缓冲区（之前的 A）
		const drained = this.messagesB.drain();
		this.messagesB.startMessageCount = this.messageCount;

		// 验证不变量
		const expectedStart = this.messagesA.startMessageCount + this.messagesA.size();
		assert(
			expectedStart === this.messagesB.startMessageCount,
			`Messages invariant violated: ${expectedStart} !== ${this.messagesB.startMessageCount}`,
		);

		// 返回消息数组
		return drained.map((instance) => instance.message);
	}

	/**
	 * 重置起始消息计数
	 */
	private resetStartMessageCount(): void {
		this.messagesA.startMessageCount = this.messageCount;
		this.messagesB.startMessageCount = this.messageCount;
	}

	/**
	 * 移除所有消息
	 * 对应 Rust 的 clear
	 */
	public clear(): void {
		this.resetStartMessageCount();
		this.messagesA.clear();
		this.messagesB.clear();
	}

	/**
	 * 返回当前存储在消息缓冲区中的消息数量
	 * 对应 Rust 的 len
	 */
	public size(): number {
		return this.messagesA.size() + this.messagesB.size();
	}

	/**
	 * 如果消息缓冲区中没有存储消息，则返回 true
	 * 对应 Rust 的 is_empty
	 */
	public isEmpty(): boolean {
		return this.size() === 0;
	}

	/**
	 * 创建一个排空迭代器，移除所有消息
	 * 对应 Rust 的 drain
	 */
	public drain(): M[] {
		this.resetStartMessageCount();

		// 先排空最旧的消息，然后是最新的
		const messagesA = this.messagesA.drain();
		const messagesB = this.messagesB.drain();

		const result: M[] = [];
		for (const instance of messagesA) {
			result.push(instance.message);
		}
		for (const instance of messagesB) {
			result.push(instance.message);
		}

		return result;
	}

	/**
	 * 迭代自上次 "update" 调用以来发生的消息
	 * 警告：你可能不想使用此调用。在大多数情况下，你应该使用 MessageReader。
	 * 对应 Rust 的 iter_current_update_messages
	 */
	public iterCurrentUpdateMessages(): readonly M[] {
		return this.messagesB.iter().map((instance) => instance.message);
	}

	/**
	 * 如果特定消息仍存在于消息缓冲区中，则通过 id 获取它
	 * 对应 Rust 的 get_message
	 */
	public getMessage(id: number): [M, MessageId<M>] | undefined {
		if (id < this.getOldestMessageCount()) {
			return undefined;
		}

		const sequence = this.getSequence(id);
		const index = id - sequence.startMessageCount;

		const instance = sequence.get(index);
		if (instance) {
			return [instance.message, instance.messageId];
		}

		return undefined;
	}

	/**
	 * 此消息 id 是哪个消息缓冲区的一部分
	 */
	private getSequence(id: number): MessageSequence<M> {
		if (id < this.messagesB.startMessageCount) {
			return this.messagesA;
		} else {
			return this.messagesB;
		}
	}

	/**
	 * 扩展消息集合
	 * 对应 Rust 的 Extend trait 实现
	 */
	public extend(messages: M[]): void {
		const oldCount = this.messageCount;
		const instances: MessageInstance<M>[] = [];

		for (const message of messages) {
			const messageId: MessageId<M> = {
				id: this.messageCount,
				timestamp: os.clock(),
				_marker: message as M,
			};
			this.messageCount++;

			instances.push({
				messageId,
				message,
			});
		}

		this.messagesB.extend(instances);
	}

	/**
	 * 获取消息缓冲区 A（内部使用）
	 */
	public getMessagesA(): MessageSequence<M> {
		return this.messagesA;
	}

	/**
	 * 获取消息缓冲区 B（内部使用）
	 */
	public getMessagesB(): MessageSequence<M> {
		return this.messagesB;
	}

	/**
	 * 获取当前消息计数（内部使用）
	 */
	public getMessageCount(): number {
		return this.messageCount;
	}
}