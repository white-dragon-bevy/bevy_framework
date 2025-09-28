/**
 * BevyWorld - 扩展的 World 类
 * 继承 Matter World 并添加 Bevy 风格的查询方法
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
 * 扩展 Matter 的 World，提供额外的查询功能
 */
export class World extends MatterWorld {
	resources: ResourceManager;
	commands: CommandBuffer;
	messages: MessageRegistry;
	events: EventManager;
	eventPropagator: EventPropagator;
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

// WorldContainer 类型（用于兼容）
export interface WorldContainer {
	world: World;
	getWorld(): World;
}

// 创建 WorldContainer
export function createWorldContainer(): WorldContainer {
	const world = new World();
	return {
		world,
		getWorld() {
			return world;
		},
	};
}
