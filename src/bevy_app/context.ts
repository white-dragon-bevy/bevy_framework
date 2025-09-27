/**
 * App 上下文实现
 * 管理和提供插件扩展的访问接口
 */

import { World, Entity } from "@rbxts/matter";
import { ContextBase } from "./context-base";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { Resource, ResourceManager } from "../bevy_ecs/resource";
import { MessageRegistry } from "../bevy_ecs/message";
import {
	EventManager,
	EventPropagator,
	Event,
	EntityEvent,
	ObserverCallback,
	ObserverConnection,
	ObserverBuilder,
	PropagationConfig,
	EventKey
} from "../bevy_ecs/events";
import { Modding } from "@flamework/core";

/**
 * App 上下文类
 * 继承自 ContextBase，提供插件扩展的注册、访问和管理功能
 */
export class AppContext extends ContextBase {
	resources: ResourceManager;
	commands: CommandBuffer;
	messages: MessageRegistry;
	events: EventManager;
	eventPropagator: EventPropagator;
	private world: World;


	constructor(world: World) {
		super();
		this.world = world;
		this.resources = new ResourceManager();
		this.commands = new CommandBuffer();
		this.messages = new MessageRegistry(this.world);
		this.events = new EventManager(this.world);
		this.eventPropagator = new EventPropagator(this.world, this.events);
	}

	/**
	 * 插入资源
	 * 
	 * resources.insertResource 的快捷方式
	 * 
	 * @param resource - 资源实例
	 * @param id - 资源ID
	 * @param text - 资源描述
	 * @returns 返回自身以支持链式调用
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public insertResource<T extends object>(resource: T, id?: Modding.Generic<T, "id">, text?: Modding.Generic<T, "text">): this {
		this.resources.insertResource(resource, id, text);
		return this;
	}

	/**
	 * 获取资源
	 *
	 * resources.insertResource 的快捷方式
	 *
	 * @param id - 资源ID
	 * @param text - 资源描述
	 * @returns 资源实例或undefined
	 *
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public getResource<T extends defined>(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T, "text">): T | undefined {
		return this.resources.getResource<T>(id, text);
	}

	/**
	 * 触发事件
	 *
	 * @param event - 要触发的事件
	 */
	public trigger<E extends object>(event: E): void {
		this.events.trigger(event);
	}

	/**
	 * 触发实体事件并支持传播
	 *
	 * @param event - 要触发的实体事件
	 * @param propagationConfig - 传播配置
	 */
	public triggerWithPropagation<E extends EntityEvent>(
		event: E,
		propagationConfig?: PropagationConfig,
	): void {
		// 先触发事件
		this.events.trigger(event);

		// 如果配置了传播，执行传播逻辑
		if (propagationConfig) {
			this.eventPropagator.propagate(event, propagationConfig);
		}
	}

	/**
	 * 添加全局观察者
	 *
	 * @param eventType - 事件类型
	 * @param callback - 回调函数
	 * @returns 观察者连接对象
	 */
	public addObserver<E>(
		eventType: new (...args: never[]) => E,
		callback: ObserverCallback<E>,
	): ObserverConnection {
		return this.events.addObserver(eventType, callback);
	}

	/**
	 * 为实体添加观察者
	 *
	 * @param entity - 目标实体
	 * @param eventType - 事件类型
	 * @param callback - 回调函数
	 * @returns 观察者连接对象
	 */
	public addEntityObserver<E>(
		entity: Entity,
		eventType: new (...args: never[]) => E,
		callback: ObserverCallback<E>,
	): ObserverConnection {
		return this.events.addEntityObserver(entity, eventType, callback);
	}

	/**
	 * 创建观察者构建器
	 *
	 * @returns 新的观察者构建器
	 */
	public observerBuilder<E>(): ObserverBuilder<E> {
		return new ObserverBuilder<E>();
	}

	/**
	 * 注册事件类型
	 *
	 * @param eventType - 事件类型
	 * @returns 事件键
	 */
	public registerEvent<E>(eventType: new (...args: never[]) => E): EventKey {
		return this.events.registerEventType(eventType);
	}

	/**
	 * 获取事件键
	 *
	 * @param eventType - 事件类型
	 * @returns 事件键或undefined
	 */
	public getEventKey<E>(eventType: new (...args: never[]) => E): EventKey | undefined {
		return this.events.getEventKey(eventType);
	}

	/**
	 * 清理实体的所有观察者
	 *
	 * @param entity - 要清理的实体
	 */
	public cleanupEntityObservers(entity: Entity): void {
		this.events.cleanupEntity(entity);
	}

	/**
	 * 清理所有事件系统资源
	 */
	public cleanup(): void {
		this.events.cleanup();
		this.messages.cleanup();
		this.commands.flush(this.world);
	}
}