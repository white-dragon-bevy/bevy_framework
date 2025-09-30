/**
 * @fileoverview Change detection system for Bevy ECS
 * Tracks component changes and additions for reactive programming
 */

import { Component } from "@rbxts/matter";
import type { AnyEntity } from "@rbxts/matter";
import type { ComponentCtor } from "./query";
import { World } from "./bevy-world";
import { QueryFilter } from "./query";

/**
 * Tick 类型
 * 表示变更跟踪的时间戳计数器
 * 用于判断变更发生的时间顺序
 */
export type Tick = number;

/**
 * 变更跟踪器
 * 监控组件的修改和添加，支持基于时间的变更检测
 *
 * 功能：
 * - 跟踪组件的变更时间
 * - 跟踪组件的添加时间
 * - 跟踪实体的生成时间
 * - 提供基于 tick 的查询接口
 */
export class ChangeTracker {
	private currentTick: Tick = 0;
	private readonly componentChanges = new Map<number, Map<ComponentCtor, Tick>>();
	private readonly componentAdded = new Map<number, Map<ComponentCtor, Tick>>();
	private readonly entitySpawnTick = new Map<number, Tick>();

	/**
	 * 递增全局 tick 计数器
	 * 应该在每帧/更新周期开始时调用一次
	 * 用于标记新的时间点，使变更检测能够区分不同帧的变更
	 */
	incrementTick(): void {
		this.currentTick++;
	}

	/**
	 * 获取当前的 tick 值
	 * @returns 当前的 tick 计数
	 */
	getCurrentTick(): Tick {
		return this.currentTick;
	}

	/**
	 * 标记实体上的组件已变更
	 * @param entity - 组件发生变更的实体
	 * @param component - 发生变更的组件构造函数
	 */
	markChanged(entity: number, component: ComponentCtor): void {
		let entityChanges = this.componentChanges.get(entity);
		if (!entityChanges) {
			entityChanges = new Map();
			this.componentChanges.set(entity, entityChanges);
		}
		entityChanges.set(component, this.currentTick);
	}

	/**
	 * 标记组件已添加到实体
	 * 同时也会自动标记为已变更
	 * @param entity - 接收组件的实体
	 * @param component - 被添加的组件构造函数
	 */
	markAdded(entity: number, component: ComponentCtor): void {
		let entityAdded = this.componentAdded.get(entity);
		if (!entityAdded) {
			entityAdded = new Map();
			this.componentAdded.set(entity, entityAdded);
		}
		entityAdded.set(component, this.currentTick);

		// Also mark as changed
		this.markChanged(entity, component);
	}

	/**
	 * 标记实体已生成
	 * 记录实体的生成时间
	 * @param entity - 被生成的实体
	 */
	markSpawned(entity: number): void {
		this.entitySpawnTick.set(entity, this.currentTick);
	}

	/**
	 * 检查组件自指定 tick 以来是否发生变更
	 * @param entity - 要检查的实体
	 * @param component - 要检查的组件构造函数
	 * @param sinceTick - 起始 tick，检查是否在此之后发生变更
	 * @returns 如果组件在 sinceTick 之后发生变更则返回 true
	 */
	hasChanged(entity: number, component: ComponentCtor, sinceTick: Tick): boolean {
		const changeTick = this.componentChanges.get(entity)?.get(component);
		return changeTick !== undefined && changeTick > sinceTick;
	}

	/**
	 * 检查组件自指定 tick 以来是否被添加
	 * @param entity - 要检查的实体
	 * @param component - 要检查的组件构造函数
	 * @param sinceTick - 起始 tick，检查是否在此之后被添加
	 * @returns 如果组件在 sinceTick 之后被添加则返回 true
	 */
	wasAdded(entity: number, component: ComponentCtor, sinceTick: Tick): boolean {
		const addedTick = this.componentAdded.get(entity)?.get(component);
		return addedTick !== undefined && addedTick > sinceTick;
	}

	/**
	 * 检查实体自指定 tick 以来是否被生成
	 * @param entity - 要检查的实体
	 * @param sinceTick - 起始 tick，检查是否在此之后被生成
	 * @returns 如果实体在 sinceTick 之后被生成则返回 true
	 */
	wasSpawned(entity: number, sinceTick: Tick): boolean {
		const spawnTick = this.entitySpawnTick.get(entity);
		return spawnTick !== undefined && spawnTick > sinceTick;
	}

	/**
	 * 清理已销毁实体的跟踪数据
	 * 释放与该实体相关的所有变更检测数据
	 * @param entity - 已销毁的实体
	 */
	cleanupEntity(entity: number): void {
		this.componentChanges.delete(entity);
		this.componentAdded.delete(entity);
		this.entitySpawnTick.delete(entity);
	}

	/**
	 * 清除早于指定 tick 的所有跟踪数据
	 * 用于释放过期的变更检测数据，防止内存泄漏
	 * @param beforeTick - 清除早于此 tick 的数据
	 */
	clearOldData(beforeTick: Tick): void {
		// Clear old component changes
		for (const [entity, changes] of this.componentChanges) {
			for (const [component, tick] of changes) {
				if (tick < beforeTick) {
					changes.delete(component);
				}
			}
			if (changes.size() === 0) {
				this.componentChanges.delete(entity);
			}
		}

		// Clear old component additions
		for (const [entity, additions] of this.componentAdded) {
			for (const [component, tick] of additions) {
				if (tick < beforeTick) {
					additions.delete(component);
				}
			}
			if (additions.size() === 0) {
				this.componentAdded.delete(entity);
			}
		}

		// Clear old spawn data
		for (const [entity, tick] of this.entitySpawnTick) {
			if (tick < beforeTick) {
				this.entitySpawnTick.delete(entity);
			}
		}
	}
}

/**
 * Changed<T> 过滤器
 * 匹配组件最近发生变更的实体
 *
 * 用于查询系统，只处理组件数据发生变化的实体
 * 适用于需要响应组件变更的反应式系统
 *
 * @template T - 要检查变更的组件类型
 */
export class Changed<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;
	private readonly tracker: ChangeTracker;
	private lastCheckTick: Tick = -1;

	/**
	 * 创建新的 Changed 过滤器
	 * @param component - 要检查变更的组件构造函数
	 * @param tracker - 使用的变更跟踪器
	 */
	constructor(component: ComponentCtor, tracker: ChangeTracker) {
		this.component = component;
		this.tracker = tracker;
	}

	/**
	 * 检查实体是否匹配此过滤器（组件是否有变更）
	 * @param world - World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果组件在上次检查后发生变更则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean {
		// Check if entity exists first
		if (!world.contains(entity)) {
			return false;
		}

		// Entity must have the component
		if (!world.get(entity, this.component)) {
			return false;
		}

		// Check if changed since last check
		const changed = this.tracker.hasChanged(entity as number, this.component, this.lastCheckTick);

		return changed;
	}

	/**
	 * 更新最后检查的 tick
	 * 应在处理完查询结果后调用，以标记这些变更已被处理
	 */
	updateLastCheckTick(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}

	/**
	 * 重置最后检查的 tick 为当前 tick
	 * 用于重新开始检测变更
	 */
	reset(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}
}

/**
 * Added<T> 过滤器
 * 匹配组件最近被添加的实体
 *
 * 用于查询系统，只处理新获得指定组件的实体
 * 适用于需要响应组件添加的初始化系统
 *
 * @template T - 要检查添加的组件类型
 */
export class Added<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;
	private readonly tracker: ChangeTracker;
	private lastCheckTick: Tick = -1;

	/**
	 * 创建新的 Added 过滤器
	 * @param component - 要检查添加的组件构造函数
	 * @param tracker - 使用的变更跟踪器
	 */
	constructor(component: ComponentCtor, tracker: ChangeTracker) {
		this.component = component;
		this.tracker = tracker;
	}

	/**
	 * 检查实体是否匹配此过滤器（组件是否新添加）
	 * @param world - World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果组件在上次检查后被添加则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean {
		// Check if entity exists first
		if (!world.contains(entity)) {
			return false;
		}

		// Entity must have the component
		if (!world.get(entity, this.component)) {
			return false;
		}

		// Check if added since last check
		const added = this.tracker.wasAdded(entity as number, this.component, this.lastCheckTick);

		return added;
	}

	/**
	 * 更新最后检查的 tick
	 * 应在处理完查询结果后调用，以标记这些添加已被处理
	 */
	updateLastCheckTick(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}

	/**
	 * 重置最后检查的 tick 为当前 tick
	 * 用于重新开始检测添加
	 */
	reset(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}
}

/**
 * Spawned 过滤器
 * 匹配最近生成的实体
 *
 * 用于查询系统，只处理新创建的实体
 * 适用于需要响应实体生成的初始化系统
 */
export class Spawned implements QueryFilter {
	private lastCheckTick: Tick = 0;

	/**
	 * 创建新的 Spawned 过滤器
	 * @param tracker - 使用的变更跟踪器
	 */
	constructor(private readonly tracker: ChangeTracker) {}

	/**
	 * 检查实体是否匹配此过滤器（实体是否新生成）
	 * @param _world - World 实例（未使用）
	 * @param entity - 要检查的实体
	 * @returns 如果实体在上次检查后被生成则返回 true
	 */
	matches(_world: World, entity: number): boolean {
		return this.tracker.wasSpawned(entity, this.lastCheckTick);
	}

	/**
	 * 更新最后检查的 tick
	 * 应在处理完查询结果后调用，以标记这些生成已被处理
	 */
	updateLastCheckTick(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}

	/**
	 * 重置最后检查的 tick 为当前 tick
	 * 用于重新开始检测生成
	 */
	reset(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}
}