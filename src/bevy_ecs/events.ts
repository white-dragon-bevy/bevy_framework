import { AnyEntity, World } from "@rbxts/matter";

/**
 * 事件基类接口
 */
export interface Event {
	readonly timestamp?: number;
}

/**
 * 事件构造器类型
 */
export type EventConstructor<T extends Event = Event> = new (...args: never[]) => T;

/**
 * 事件存储器 - 管理特定类型的事件
 */
class EventStorage<T extends Event> {
	private events: T[] = [];
	private readers = new Set<EventReader<T>>();
	private lastEventId = 0;

	/**
	 * 发送事件
	 */
	public send(event: T): void {
		const eventWithTimestamp = {
			timestamp: os.clock(),
			...event,
		} as T;

		this.events.push(eventWithTimestamp);
		this.lastEventId++;
	}

	/**
	 * 获取指定读取器的新事件
	 */
	public getEventsForReader(reader: EventReader<T>): T[] {
		const readerState = this.getReaderState(reader);
		const newEvents: T[] = [];
		for (let i = readerState.lastRead; i < this.events.size(); i++) {
			newEvents.push(this.events[i]);
		}
		readerState.lastRead = this.events.size();
		return newEvents;
	}

	/**
	 * 注册事件读取器
	 */
	public registerReader(reader: EventReader<T>): void {
		this.readers.add(reader);
	}

	/**
	 * 注销事件读取器
	 */
	public unregisterReader(reader: EventReader<T>): void {
		this.readers.delete(reader);
	}

	/**
	 * 清理旧事件（通常在帧结束时调用）
	 */
	public cleanup(): void {
		// 保留最近的事件，删除过旧的事件以避免内存泄漏
		if (this.events.size() > 1000) {
			const keepCount = 100;
			const oldEventCount = this.events.size();
			const newEvents: T[] = [];
			const startIndex = math.max(0, this.events.size() - keepCount);

			for (let i = startIndex; i < this.events.size(); i++) {
				newEvents.push(this.events[i]);
			}

			this.events = newEvents;

			// 更新所有读取器的位置
			const removedCount = oldEventCount - keepCount;
			for (const reader of this.readers) {
				const state = this.getReaderState(reader);
				state.lastRead = math.max(0, state.lastRead - removedCount);
			}
		}
	}

	private getReaderState(reader: EventReader<T>): { lastRead: number } {
		if (!reader.state) {
			reader.state = { lastRead: 0 };
		}
		return reader.state;
	}
}

/**
 * 事件写入器 - 用于发送事件，等同于 Bevy 的 EventWriter
 */
export class EventWriter<T extends Event> {
	private storage: EventStorage<T>;

	constructor(storage: EventStorage<T>) {
		this.storage = storage;
	}

	/**
	 * 发送事件 - 对应 Bevy 的 EventWriter::send()
	 */
	public send(event: T): void {
		this.storage.send(event);
	}
}

/**
 * 事件读取器 - 用于读取事件，等同于 Bevy 的 EventReader
 */
export class EventReader<T extends Event> {
	private storage: EventStorage<T>;
	public state?: { lastRead: number };
	private isCleanedUp = false;

	constructor(storage: EventStorage<T>) {
		this.storage = storage;
		this.storage.registerReader(this);
	}

	/**
	 * 读取新事件 - 对应 Bevy 的 EventReader::read()
	 */
	public read(): T[] {
		if (this.isCleanedUp) {
			return [];
		}
		return this.storage.getEventsForReader(this);
	}

	/**
	 * 检查是否有新事件 - 对应 Bevy 的 EventReader::is_empty()
	 */
	public isEmpty(): boolean {
		if (this.isCleanedUp) {
			return true;
		}
		return this.read().size() === 0;
	}

	/**
	 * 清理读取器
	 */
	public cleanup(): void {
		this.storage.unregisterReader(this);
		this.isCleanedUp = true;
	}
}

/**
 * 事件管理器 - 管理所有事件类型
 */
export class EventManager {
	private storages = new Map<EventConstructor, EventStorage<Event>>();
	private world: World;

	constructor(world: World) {
		this.world = world;
	}

	/**
	 * 获取事件存储器
	 */
	private getStorage<T extends Event>(eventType: EventConstructor<T>): EventStorage<T> {
		let storage = this.storages.get(eventType as EventConstructor);
		if (!storage) {
			storage = new EventStorage<Event>();
			this.storages.set(eventType as EventConstructor, storage);
		}
		return storage as EventStorage<T>;
	}

	/**
	 * 创建事件写入器
	 */
	public createWriter<T extends Event>(eventType: EventConstructor<T>): EventWriter<T> {
		const storage = this.getStorage(eventType);
		return new EventWriter(storage);
	}

	/**
	 * 创建事件读取器
	 */
	public createReader<T extends Event>(eventType: EventConstructor<T>): EventReader<T> {
		const storage = this.getStorage(eventType);
		return new EventReader(storage);
	}

	/**
	 * 直接发送事件（便捷方法）
	 */
	public send<T extends Event>(eventType: EventConstructor<T>, event: T): void {
		const writer = this.createWriter(eventType);
		writer.send(event);
	}

	/**
	 * 清理所有事件存储器
	 */
	public cleanup(): void {
		for (const [, storage] of this.storages) {
			storage.cleanup();
		}
	}

	/**
	 * 获取事件统计信息
	 */
	public getStats(): Record<string, unknown> {
		const stats: Record<string, unknown> = {};
		for (const [eventType, storage] of this.storages) {
			const typeName = tostring(eventType);
			stats[typeName] = {
				eventCount: (storage as unknown as { events?: unknown[] }).events?.size() || 0,
				readerCount: (storage as unknown as { readers?: Set<unknown> }).readers?.size() || 0,
			};
		}
		return stats;
	}
}

/**
 * 常用事件类型定义
 */

/**
 * 实体生成事件
 */
export class EntitySpawnedEvent implements Event {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly componentCount: number,
		public readonly timestamp?: number,
	) {}
}

/**
 * 实体销毁事件
 */
export class EntityDespawnedEvent implements Event {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly timestamp?: number,
	) {}
}

/**
 * 组件添加事件
 */
export class ComponentAddedEvent implements Event {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly componentType: string,
		public readonly timestamp?: number,
	) {}
}

/**
 * 组件移除事件
 */
export class ComponentRemovedEvent implements Event {
	constructor(
		public readonly entityId: AnyEntity,
		public readonly componentType: string,
		public readonly timestamp?: number,
	) {}
}