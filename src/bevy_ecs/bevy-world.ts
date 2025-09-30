/**
 * @fileoverview BevyWorld - 扩展的 World 类
 * 继承 Matter World 并添加 Bevy 风格的查询方法、变更跟踪和资源管理
 */

import type { ComponentCtor } from "./query";
import type { AnyEntity, Component, Entity } from "@rbxts/matter";
import type { ComponentBundle } from "@rbxts/matter/lib/component";
import { ChangeTracker } from "./change-detection";
import { CommandBuffer } from "./command-buffer";
import { EventManager, EventPropagator } from "./events";
import { World as MatterWorld } from "./matter-world";
import { MessageRegistry } from "./message";
import { QueryBuilder } from "./query";
import { ResourceManager } from "./resource";

/**
 * BevyWorld 类
 * 扩展 Matter 的 World，提供额外的查询功能和 ECS 资源管理
 *
 * 主要功能：
 * - 资源管理：全局共享数据
 * - 命令缓冲：延迟执行实体操作
 * - 消息系统：实体间通信
 * - 事件系统：事件驱动编程
 * - 变更跟踪：检测组件的添加、修改和移除
 */
export class World extends MatterWorld {
	/** 资源管理器，用于存储和访问全局资源 */
	resources: ResourceManager;
	/** 命令缓冲区，用于延迟执行实体操作 */
	commands: CommandBuffer;
	/** 消息注册表，用于实体间通信 */
	messages: MessageRegistry;
	/** 事件管理器，用于处理游戏事件 */
	events: EventManager;
	/** 事件传播器，用于事件的传播和处理 */
	eventPropagator: EventPropagator;
	/** 变更跟踪器，用于检测组件的添加、修改和移除 */
	changeTracker: ChangeTracker;

	constructor() {
		super();
		this.resources = new ResourceManager();
		this.commands = new CommandBuffer();
		this.messages = new MessageRegistry(this);
		this.events = new EventManager(this);
		this.eventPropagator = new EventPropagator(this, this.events);
		this.changeTracker = new ChangeTracker();
	}

	/**
	 * 覆盖 spawn 方法以自动标记变更
	 * 创建新实体并自动跟踪组件添加
	 * @param componentBundle - 要添加到新实体的组件集合
	 * @returns 新创建的实体
	 */
	spawn<T extends ComponentBundle>(...componentBundle: T): Entity<T> {
		const entity = super.spawn(...componentBundle);

		// 标记实体为已生成
		this.changeTracker.markSpawned(entity as number);

		// 标记所有组件为已添加
		for (const component of componentBundle) {
			// 组件实例的 metatable 就是组件构造函数
			const componentCtor = getmetatable(component) as ComponentCtor;
			if (componentCtor) {
				this.changeTracker.markAdded(entity as number, componentCtor);
			}
		}

		return entity;
	}

	/**
	 * 覆盖 insert 方法以自动标记变更
	 * 向现有实体插入组件并自动跟踪变更
	 * @param entity - 目标实体
	 * @param componentBundle - 要插入的组件集合
	 */
	insert(entity: AnyEntity, ...componentBundle: ComponentBundle): void {
		super.insert(entity, ...componentBundle);

		// 标记所有组件为已添加
		for (const component of componentBundle) {
			// 组件实例的 metatable 就是组件构造函数
			const componentCtor = getmetatable(component) as ComponentCtor;
			if (componentCtor) {
				this.changeTracker.markAdded(entity as number, componentCtor);
			}
		}
	}

	/**
	 * 覆盖 despawn 方法以清理变更跟踪
	 * 销毁实体并清理相关的变更跟踪数据
	 * @param entity - 要销毁的实体
	 */
	despawn(entity: AnyEntity): void {
		super.despawn(entity);
		this.changeTracker.cleanupEntity(entity as number);
	}

	/**
	 * 手动标记组件为已添加（用于变更检测）
	 * @param entity - 实体ID
	 * @param component - 组件构造函数
	 */
	markComponentAdded(entity: number, component: ComponentCtor): void {
		this.changeTracker.markAdded(entity, component);
	}

	/**
	 * 手动标记实体为已生成（用于变更检测）
	 * @param entity - 实体ID
	 */
	markEntitySpawned(entity: number): void {
		this.changeTracker.markSpawned(entity);
	}

	/**
	 * 创建一个查询构建器，支持 Bevy 风格的过滤器
	 * @param components - 要查询的组件
	 * @returns 查询构建器实例
	 */
	queryWith<T extends ComponentCtor[]>(...components: T): QueryBuilder<T> {
		return new QueryBuilder(this, components);
	}

	/**
	 * 在每帧开始时调用，增加变更检测的 tick
	 * 用于跟踪哪些变更是在当前帧发生的
	 */
	incrementTick(): void {
		this.changeTracker.incrementTick();
	}

	/**
	 * 清除内部跟踪器
	 * 对应 Rust World::clear_trackers()
	 */
	clearTrackers(): void {
		// 清除超过一定时间的变更检测数据
		const currentTick = this.changeTracker.getCurrentTick();
		const clearBeforeTick = currentTick - 100; // 保留最近 100 帧的数据
		if (clearBeforeTick > 0) {
			this.changeTracker.clearOldData(clearBeforeTick);
		}
	}
}

/**
 * WorldContainer 接口
 * 用于兼容旧代码，提供 World 实例的容器
 *
 * 用于需要延迟访问 World 或需要统一访问接口的场景
 */
export interface WorldContainer {
	/** World 实例 */
	world: World;
	/**
	 * 获取 World 实例的方法
	 * @returns World 实例
	 */
	getWorld(): World;
}

/**
 * 创建 WorldContainer 实例
 * 便捷函数，用于创建包含新 World 实例的容器
 * @returns 包含 World 实例的容器对象
 */
export function createWorldContainer(): WorldContainer {
	const world = new World();
	return {
		world,
		getWorld() {
			return world;
		},
	};
}
