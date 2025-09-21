/**
 * 状态事件系统
 * 处理状态进入、退出和转换事件
 */

import type { World } from "@rbxts/matter";

/**
 * 状态进入事件
 */
export class StateEnterEvent<T extends string = string> {
	/** 进入的状态 */
	readonly state: T;

	/** 事件时间戳 */
	readonly timestamp: number;

	constructor(state: T) {
		this.state = state;
		this.timestamp = os.clock();
	}

	/**
	 * 创建事件组件标记
	 */
	toComponent(): { StateEnterEvent: true; state: T; timestamp: number } {
		return {
			StateEnterEvent: true,
			state: this.state,
			timestamp: this.timestamp,
		};
	}
}

/**
 * 状态退出事件
 */
export class StateExitEvent<T extends string = string> {
	/** 退出的状态 */
	readonly state: T;

	/** 事件时间戳 */
	readonly timestamp: number;

	/** 状态持续时间 */
	readonly duration?: number;

	constructor(state: T, duration?: number) {
		this.state = state;
		this.timestamp = os.clock();
		this.duration = duration;
	}

	/**
	 * 创建事件组件标记
	 */
	toComponent(): { StateExitEvent: true; state: T; timestamp: number; duration?: number } {
		return {
			StateExitEvent: true,
			state: this.state,
			timestamp: this.timestamp,
			duration: this.duration,
		};
	}
}

/**
 * 状态事件读取器
 * 用于批量读取和处理状态事件
 */
export class StateEventReader<T extends string = string> {
	/** 已读取的进入事件索引 */
	private enterEventIndex = 0;

	/** 已读取的退出事件索引 */
	private exitEventIndex = 0;

	/** 已读取的转换事件索引 */
	private transitionEventIndex = 0;

	/**
	 * 读取所有未处理的进入事件
	 */
	readEnterEvents(world: World): StateEnterEvent<T>[] {
		const events: StateEnterEvent<T>[] = [];
		// 查询所有带有 StateEnterEvent 组件的实体
		for (const [entity, component] of world.query({ StateEnterEvent: true } as any)) {
			events.push(new StateEnterEvent(component.state as T));
			// 消费事件（移除组件）
			world.despawn(entity);
		}
		return events;
	}

	/**
	 * 读取所有未处理的退出事件
	 */
	readExitEvents(world: World): StateExitEvent<T>[] {
		const events: StateExitEvent<T>[] = [];
		// 查询所有带有 StateExitEvent 组件的实体
		for (const [entity, component] of world.query({ StateExitEvent: true } as any)) {
			events.push(new StateExitEvent(component.state as T, component.duration));
			// 消费事件（移除组件）
			world.despawn(entity);
		}
		return events;
	}

	/**
	 * 清除所有未读事件
	 */
	clear(): void {
		this.enterEventIndex = 0;
		this.exitEventIndex = 0;
		this.transitionEventIndex = 0;
	}
}

/**
 * 状态事件写入器
 * 用于发送状态事件
 */
export class StateEventWriter<T extends string = string> {
	/**
	 * 发送进入事件
	 */
	sendEnter(world: World, state: T): void {
		const event = new StateEnterEvent(state);
		world.spawn(event.toComponent());
	}

	/**
	 * 发送退出事件
	 */
	sendExit(world: World, state: T, duration?: number): void {
		const event = new StateExitEvent(state, duration);
		world.spawn(event.toComponent());
	}
}

/**
 * 状态事件管理器
 * 统一管理所有状态事件
 */
export class StateEventManager<T extends string = string> {
	private reader = new StateEventReader<T>();
	private writer = new StateEventWriter<T>();

	/** 事件监听器 */
	private enterListeners: Array<(state: T) => void> = [];
	private exitListeners: Array<(state: T, duration?: number) => void> = [];

	/**
	 * 处理所有未处理的事件
	 */
	processEvents(world: World): void {
		// 处理进入事件
		const enterEvents = this.reader.readEnterEvents(world);
		for (const event of enterEvents) {
			for (const listener of this.enterListeners) {
				listener(event.state);
			}
		}

		// 处理退出事件
		const exitEvents = this.reader.readExitEvents(world);
		for (const event of exitEvents) {
			for (const listener of this.exitListeners) {
				listener(event.state, event.duration);
			}
		}
	}

	/**
	 * 添加进入事件监听器
	 */
	onEnter(callback: (state: T) => void): () => void {
		this.enterListeners.push(callback);
		return () => {
			const index = this.enterListeners.indexOf(callback);
			if (index !== -1) {
				this.enterListeners.remove(index);
			}
		};
	}

	/**
	 * 添加退出事件监听器
	 */
	onExit(callback: (state: T, duration?: number) => void): () => void {
		this.exitListeners.push(callback);
		return () => {
			const index = this.exitListeners.indexOf(callback);
			if (index !== -1) {
				this.exitListeners.remove(index);
			}
		};
	}

	/**
	 * 发送进入事件
	 */
	fireEnter(world: World, state: T): void {
		this.writer.sendEnter(world, state);
	}

	/**
	 * 发送退出事件
	 */
	fireExit(world: World, state: T, duration?: number): void {
		this.writer.sendExit(world, state, duration);
	}

	/**
	 * 清除所有监听器
	 */
	clearListeners(): void {
		this.enterListeners = [];
		this.exitListeners = [];
	}
}

/**
 * 创建状态事件过滤器
 * 用于过滤特定状态的事件
 */
export function createStateEventFilter<T extends string>(
	targetState: T,
): (event: StateEnterEvent<T> | StateExitEvent<T>) => boolean {
	return (event) => event.state === targetState;
}

/**
 * 创建状态事件聚合器
 * 用于聚合多个状态的事件
 */
export class StateEventAggregator<T extends string = string> {
	private events: Array<{
		type: "enter" | "exit";
		state: T;
		timestamp: number;
		duration?: number;
	}> = [];

	/**
	 * 添加事件
	 */
	addEvent(type: "enter" | "exit", state: T, duration?: number): void {
		this.events.push({
			type,
			state,
			timestamp: os.clock(),
			duration,
		});
	}

	/**
	 * 获取所有事件
	 */
	getEvents(): ReadonlyArray<{
		type: "enter" | "exit";
		state: T;
		timestamp: number;
		duration?: number;
	}> {
		return this.events;
	}

	/**
	 * 获取特定状态的事件
	 */
	getStateEvents(state: T): Array<{
		type: "enter" | "exit";
		timestamp: number;
		duration?: number;
	}> {
		return this.events
			.filter((e) => e.state === state)
			.map(({ type, timestamp, duration }) => ({ type, timestamp, duration }));
	}

	/**
	 * 清除所有事件
	 */
	clear(): void {
		this.events = [];
	}

	/**
	 * 获取事件数量
	 */
	get size(): number {
		return this.events.size();
	}
}