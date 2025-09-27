/**
 * Message 系统基础类型定义
 * 对应 Rust bevy_ecs/src/message/mod.rs
 */

import { AnyEntity } from "@rbxts/matter";

/**
 * 消息基础接口
 * 对应 Rust 的 Message trait
 *
 * Rust: pub trait Message: Send + Sync + 'static {}
 */
export interface Message {
	// TypeScript 中所有类型都是 'static
	// Send + Sync 在 TypeScript 中默认满足
}

/**
 * 消息ID - 唯一标识特定 World 中存储的消息
 * 对应 Rust 的 MessageId<M>
 *
 * MessageId 可用于跟踪消息从发送到处理的流程
 * ID 按写入顺序单调递增
 */
export interface MessageId<M extends Message> {
	/**
	 * 唯一标识与此 ID 关联的消息
	 * 此值对应于每个消息写入世界的顺序
	 */
	readonly id: number;

	/**
	 * 触发此消息的时间戳
	 */
	readonly timestamp: number;

	/**
	 * 类型标记（用于类型推断）
	 */
	readonly _marker?: M;
}

/**
 * 消息实例 - 内部使用
 * 对应 Rust 的 MessageInstance<M>
 */
export interface MessageInstance<M extends Message> {
	readonly messageId: MessageId<M>;
	readonly message: M;
}

/**
 * 消息序列 - 内部使用
 * 对应 Rust 的 MessageSequence<E>
 */
export class MessageSequence<M extends Message> {
	public messages: MessageInstance<M>[] = [];
	public startMessageCount = 0;

	/**
	 * 清空消息
	 */
	public clear(): void {
		this.messages = [];
	}

	/**
	 * 获取消息数量
	 */
	public size(): number {
		return this.messages.size();
	}

	/**
	 * 推送消息实例
	 */
	public push(instance: MessageInstance<M>): void {
		this.messages.push(instance);
	}

	/**
	 * 获取指定索引的消息
	 */
	public get(index: number): MessageInstance<M> | undefined {
		return this.messages[index];
	}

	/**
	 * 扩展消息序列
	 */
	public extend(instances: MessageInstance<M>[]): void {
		for (const instance of instances) {
			this.messages.push(instance);
		}
	}

	/**
	 * 排空所有消息并返回
	 */
	public drain(): MessageInstance<M>[] {
		const drained = this.messages;
		this.messages = [];
		return drained;
	}

	/**
	 * 迭代器
	 */
	public iter(): readonly MessageInstance<M>[] {
		return this.messages;
	}
}

/**
 * 消息构造器类型
 */
export type MessageConstructor<M extends Message = Message> = new (...args: never[]) => M;

/**
 * 批量写入ID迭代器
 * 对应 Rust 的 WriteBatchIds<E>
 */
export class WriteBatchIds<M extends Message> {
	private currentIndex: number;
	private readonly endIndex: number;
	private readonly _marker?: M;

	constructor(lastCount: number, messageCount: number) {
		this.currentIndex = lastCount;
		this.endIndex = messageCount;
	}

	/**
	 * 获取下一个消息ID
	 */
	public next(): MessageId<M> | undefined {
		if (this.currentIndex >= this.endIndex) {
			return undefined;
		}

		const id: MessageId<M> = {
			id: this.currentIndex,
			timestamp: os.clock(),
			_marker: this._marker,
		};

		this.currentIndex++;
		return id;
	}

	/**
	 * 转换为数组
	 */
	public toArray(): MessageId<M>[] {
		const ids: MessageId<M>[] = [];
		let id = this.next();
		while (id !== undefined) {
			ids.push(id);
			id = this.next();
		}
		return ids;
	}
}

/**
 * 常用消息类型定义
 */

/**
 * 实体生成消息
 * 对应 Rust 的常见模式
 */
export class EntitySpawnedMessage implements Message {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly componentCount: number,
	) {}
}

/**
 * 实体销毁消息
 */
export class EntityDespawnedMessage implements Message {
	constructor(
		public readonly entityId: AnyEntity,
	) {}
}

/**
 * 组件添加消息
 */
export class ComponentAddedMessage implements Message {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly componentType: string,
	) {}
}

/**
 * 组件移除消息
 */
export class ComponentRemovedMessage implements Message {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly componentType: string,
	) {}
}