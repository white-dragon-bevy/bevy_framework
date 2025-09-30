/**
 * @fileoverview Bevy ECS Event System
 *
 * 基于 rbx-better-signal 实现的事件系统，提供推送式事件处理机制
 * 支持全局事件、实体事件、事件传播等功能
 *
 * 核心功能：
 * - EventManager：事件管理和分发
 * - Observer：事件观察者和回调
 * - EventPropagator：事件在层次结构中的传播
 * - 类型安全的事件注册和触发
 */

import Signal from "@rbxts/rbx-better-signal";
import { World, Entity, type AnyComponent } from "@rbxts/matter";
import { ComponentId } from "./component/component-id";

/**
 * 事件基础接口
 * 所有事件类型必须实现此接口
 */
export interface Event {
	/** 事件类型标识符 */
	readonly eventType?: string;
}

/**
 * 实体事件接口
 * 针对特定实体的事件
 */
export interface EntityEvent extends Event {
	/** 获取事件目标实体 */
	getEventTarget(): Entity;
	/** 设置事件目标实体 */
	setEventTarget(entity: Entity): void;
}

/**
 * 触发器上下文
 */
export interface TriggerContext {
	/** 事件键 */
	eventKey: EventKey;
	/** 调用位置信息 */
	caller?: string;
}

/**
 * 观察者回调函数类型
 */
export type ObserverCallback<E> = (event: E, world: World) => void;

/**
 * 观察者连接对象
 */
export class ObserverConnection {
	constructor(private connection: RBXScriptConnection) {}

	/** 断开连接 */
	public disconnect(): void {
		this.connection.Disconnect();
	}

	/** 连接是否激活 */
	public isConnected(): boolean {
		return this.connection.Connected;
	}
}

/**
 * 事件键，用于唯一标识事件类型
 */
export class EventKey {
	constructor(
		private readonly id: ComponentId,
	) {}

	/**
	 * 获取组件ID
	 */
	public getComponentId(): ComponentId {
		return this.id;
	}

	/**
	 * 判断是否相等
	 */
	public equals(other: EventKey): boolean {
		return this.id === other.id;
	}

	/**
	 * 转换为字符串
	 */
	public toString(): string {
		return `EventKey(${this.id})`;
	}
}

/**
 * 事件传播配置
 */
export interface PropagationConfig {
	/** 是否启用传播 */
	enabled: boolean;
	/** 是否自动传播 */
	autoProppagate: boolean;
	/** 传播路径获取函数 */
	getPath?: (entity: Entity, world: World) => Entity[];
}

/**
 * 观察者配置
 */
export interface ObserverConfig<E> {
	/** 观察的事件类型 */
	eventType: new (...args: never[]) => E;
	/** 回调函数 */
	callback: ObserverCallback<E>;
	/** 监听的实体（可选） */
	entities?: Entity[];
	/** 监听的组件（可选） */
	components?: ComponentId[];
}

/**
 * 事件管理器
 * 管理所有事件类型的注册、触发和观察者
 */
export class EventManager {
	private readonly eventSignals = new Map<string, Signal<(event: Event, world: World) => void>>();
	private readonly entitySignals = new Map<Entity, Map<string, Signal<(event: Event, world: World) => void>>>();
	private readonly eventKeys = new Map<string, EventKey>();
	private nextComponentId = 0;

	constructor(private readonly world: World) {}

	/**
	 * 注册事件类型
	 */
	public registerEventType<E>(eventType: new (...args: never[]) => E): EventKey {
		const typeName = tostring(eventType);

		let eventKey = this.eventKeys.get(typeName);
		if (!eventKey) {
			eventKey = new EventKey(this.nextComponentId++);
			this.eventKeys.set(typeName, eventKey);

			// 创建全局信号
			if (!this.eventSignals.has(typeName)) {
				this.eventSignals.set(typeName, new Signal());
			}
		}

		return eventKey;
	}

	/**
	 * 获取事件键
	 */
	public getEventKey<E>(eventType: new (...args: never[]) => E): EventKey | undefined {
		const typeName = tostring(eventType);
		return this.eventKeys.get(typeName);
	}

	/**
	 * 触发事件
	 */
	public trigger<E extends object>(event: E): void {
		const typeName = tostring(getmetatable(event) as object);

		// 触发全局观察者
		const globalSignal = this.eventSignals.get(typeName);
		if (globalSignal) {
			globalSignal.Fire(event as unknown as Event, this.world);
		}

		// 如果是实体事件，触发实体特定观察者
		if (this.isEntityEvent(event as unknown as Event)) {
			const entityEvent = event as unknown as EntityEvent;
			const targetEntity = entityEvent.getEventTarget();
			this.triggerEntityEvent(targetEntity, event as unknown as Event);
		}
	}

	/**
	 * 触发实体事件
	 */
	private triggerEntityEvent(entity: Entity, event: Event): void {
		const entitySignals = this.entitySignals.get(entity);
		if (!entitySignals) {
			return;
		}

		const typeName = tostring(getmetatable(event) as object);
		const signal = entitySignals.get(typeName);
		if (signal) {
			signal.Fire(event, this.world);
		}
	}

	/**
	 * 添加全局观察者
	 */
	public addObserver<E>(
		eventType: new (...args: never[]) => E,
		callback: ObserverCallback<E>,
	): ObserverConnection {
		const typeName = tostring(eventType);

		// 确保事件类型已注册
		this.registerEventType(eventType);

		// 获取或创建信号
		let signal = this.eventSignals.get(typeName);
		if (!signal) {
			signal = new Signal();
			this.eventSignals.set(typeName, signal);
		}

		// 连接观察者
		const connection = signal.Connect((event, world) => {
			callback(event as E, world);
		});

		return new ObserverConnection(connection);
	}

	/**
	 * 为特定实体添加观察者
	 */
	public addEntityObserver<E>(
		entity: Entity,
		eventType: new (...args: never[]) => E,
		callback: ObserverCallback<E>,
	): ObserverConnection {
		const typeName = tostring(eventType);

		// 确保事件类型已注册
		this.registerEventType(eventType);

		// 获取或创建实体信号映射
		let entitySignals = this.entitySignals.get(entity);
		if (!entitySignals) {
			entitySignals = new Map();
			this.entitySignals.set(entity, entitySignals);
		}

		// 获取或创建信号
		let signal = entitySignals.get(typeName);
		if (!signal) {
			signal = new Signal();
			entitySignals.set(typeName, signal);
		}

		// 连接观察者
		const connection = signal.Connect((event, world) => {
			callback(event as E, world);
		});

		return new ObserverConnection(connection);
	}

	/**
	 * 清理实体的所有观察者
	 */
	public cleanupEntity(entity: Entity): void {
		const entitySignals = this.entitySignals.get(entity);
		if (entitySignals) {
			for (const [_, signal] of entitySignals) {
				signal.DisconnectAll();
				signal.Destroy();
			}
			this.entitySignals.delete(entity);
		}
	}

	/**
	 * 清理所有观察者
	 */
	public cleanup(): void {
		// 清理全局信号
		for (const [_, signal] of this.eventSignals) {
			signal.DisconnectAll();
			signal.Destroy();
		}
		this.eventSignals.clear();

		// 清理实体信号
		for (const [_, entitySignals] of this.entitySignals) {
			for (const [_, signal] of entitySignals) {
				signal.DisconnectAll();
				signal.Destroy();
			}
		}
		this.entitySignals.clear();

		// 清理事件键
		this.eventKeys.clear();
	}

	/**
	 * 检查是否为实体事件
	 */
	private isEntityEvent(event: Event): boolean {
		return "getEventTarget" in event && "setEventTarget" in event;
	}
}

/**
 * 观察者构建器
 * 用于创建复杂的观察者配置
 */
export class ObserverBuilder<E> {
	private config: Partial<ObserverConfig<E>> = {};

	/**
	 * 设置事件类型
	 */
	public event(eventType: new (...args: never[]) => E): this {
		this.config.eventType = eventType;
		return this;
	}

	/**
	 * 设置回调函数
	 */
	public on(callback: ObserverCallback<E>): this {
		this.config.callback = callback;
		return this;
	}

	/**
	 * 设置监听的实体
	 */
	public watchEntities(...entities: Entity[]): this {
		this.config.entities = entities;
		return this;
	}

	/**
	 * 设置监听的组件
	 */
	public watchComponents(...components: ComponentId[]): this {
		this.config.components = components;
		return this;
	}

	/**
	 * 构建观察者配置
	 */
	public build(): ObserverConfig<E> {
		if (!this.config.eventType || !this.config.callback) {
			error("Observer must have an event type and callback");
		}
		return this.config as ObserverConfig<E>;
	}
}

/**
 * 事件传播管理器
 * 处理事件在实体层级结构中的传播
 */
export class EventPropagator {
	constructor(
		private readonly world: World,
		private readonly eventManager: EventManager,
	) {}

	/**
	 * 传播实体事件
	 */
	public propagate<E extends EntityEvent>(
		event: E,
		config: PropagationConfig,
	): void {
		if (!config.enabled) {
			return;
		}

		const entity = event.getEventTarget();
		const path = config.getPath?.(entity, this.world) ?? [];

		for (const pathEntity of path) {
			event.setEventTarget(pathEntity);
			this.eventManager.trigger(event);

			// 如果不是自动传播，检查是否应该停止
			if (!config.autoProppagate) {
				// TODO: 实现传播控制逻辑
				break;
			}
		}
	}
}

/**
 * 创建简单事件类
 */
export function createEvent<T extends Record<string, unknown>>(
	name: string,
	fields: T,
): new (data: T) => Event & T {
	return class implements Event {
		readonly eventType = name;

		constructor(data: T) {
			for (const [key, value] of pairs(data)) {
				(this as unknown as Record<string, unknown>)[key as string] = value;
			}
		}
	} as new (data: T) => Event & T;
}

/**
 * 创建实体事件类
 */
export function createEntityEvent<T extends Record<string, unknown>>(
	name: string,
	fields: T & { entity: Entity },
): new (data: T & { entity: Entity }) => EntityEvent & T {
	return class implements EntityEvent {
		readonly eventType = name;
		entity!: Entity;

		constructor(data: T & { entity: Entity }) {
			for (const [key, value] of pairs(data)) {
				(this as unknown as Record<string, unknown>)[key as string] = value;
			}
		}

		getEventTarget(): Entity {
			return this.entity;
		}

		setEventTarget(entity: Entity): void {
			this.entity = entity;
		}
	} as unknown as new (data: T & { entity: Entity }) => EntityEvent & T;
}