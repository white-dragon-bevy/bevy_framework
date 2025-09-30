/**
 * @fileoverview Query system for Bevy ECS - Provides Bevy-style query filters
 * Extends Matter's query system with With, Without, Changed, Added filters
 */

import { Component } from "@rbxts/matter";
import { World } from "./bevy-world";

import type { AnyEntity } from "@rbxts/matter";

/**
 * 组件构造函数类型
 * 匹配 Matter 的 ComponentCtor 定义
 * 用于在查询和过滤器中引用组件类型
 */
export type ComponentCtor = () => Component<object>;

/**
 * 查询过滤器接口
 * 所有过滤器都必须实现此接口
 * 用于在查询中应用复杂的实体筛选逻辑
 */
export interface QueryFilter {
	/**
	 * 检查实体是否匹配此过滤器
	 * @param world - 要查询的 World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果实体通过过滤器则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean;

	/** 组件构造函数（用于调试） */
	readonly component?: ComponentCtor;
}

/**
 * With<T> 过滤器
 * 匹配拥有指定组件的实体
 *
 * 用于查询时要求实体必须拥有某个组件
 *
 * @template T - 要检查的组件类型
 */
export class With<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;

	/**
	 * 创建新的 With 过滤器
	 * @param component - 要检查的组件构造函数
	 */
	constructor(component: ComponentCtor) {
		this.component = component;
	}

	/**
	 * 检查实体是否拥有指定组件
	 * @param world - World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果实体拥有该组件则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean {
		return world.get(entity, this.component) ? true : false;
	}
}

/**
 * Without<T> 过滤器
 * 匹配不拥有指定组件的实体
 *
 * 用于查询时排除拥有某个组件的实体
 *
 * @template T - 要检查缺失的组件类型
 */
export class Without<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;

	/**
	 * 创建新的 Without 过滤器
	 * @param component - 要检查缺失的组件构造函数
	 */
	constructor(component: ComponentCtor) {
		this.component = component;
	}

	/**
	 * 检查实体是否不拥有指定组件
	 * @param world - World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果实体不拥有该组件则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean {
		return world.get(entity, this.component) ? false : true;
	}
}

/**
 * Or 过滤器
 * 匹配至少通过一个子过滤器的实体
 *
 * 用于组合多个过滤器，实现逻辑或操作
 *
 * @template F - 过滤器数组类型
 */
export class Or<F extends QueryFilter[]> implements QueryFilter {
	/**
	 * 创建新的 Or 过滤器
	 * @param filters - 要用 OR 逻辑组合的过滤器数组
	 */
	constructor(private readonly filters: F) {}

	/**
	 * 检查实体是否至少通过一个过滤器
	 * @param world - World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果实体通过至少一个过滤器则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean {
		for (const filter of this.filters) {
			if (filter.matches(world, entity)) {
				return true;
			}
		}
		return false;
	}
}

/**
 * And 过滤器
 * 匹配通过所有子过滤器的实体
 *
 * 用于组合多个过滤器，实现逻辑与操作
 *
 * @template F - 过滤器数组类型
 */
export class And<F extends QueryFilter[]> implements QueryFilter {
	/**
	 * 创建新的 And 过滤器
	 * @param filters - 要用 AND 逻辑组合的过滤器数组
	 */
	constructor(private readonly filters: F) {}

	/**
	 * 检查实体是否通过所有过滤器
	 * @param world - World 实例
	 * @param entity - 要检查的实体
	 * @returns 如果实体通过所有过滤器则返回 true
	 */
	matches(world: World, entity: AnyEntity): boolean {
		for (const filter of this.filters) {
			if (!filter.matches(world, entity)) {
				return false;
			}
		}
		return true;
	}
}

/**
 * 查询构建器
 * 用于构建带有过滤器的复杂查询
 *
 * 支持链式调用，可以添加多个过滤器来精确控制查询结果
 *
 * @template T - 组件元组类型
 */
export class QueryBuilder<T extends ComponentCtor[]> {
	private readonly filters: QueryFilter[] = [];

	/**
	 * 创建新的查询构建器
	 * @param world - 要查询的 World 实例
	 * @param components - 要查询的组件构造函数数组
	 */
	constructor(
		private readonly world: World,
		private readonly components: T,
	) {}

	/**
	 * 添加 With 过滤器到查询
	 * @param component - 必须存在的组件构造函数
	 * @returns 此查询构建器，用于链式调用
	 */
	with<U extends object>(component: ComponentCtor): QueryBuilder<T> {
		this.filters.push(new With<U>(component));
		return this;
	}

	/**
	 * 添加 Without 过滤器到查询
	 * @param component - 必须不存在的组件构造函数
	 * @returns 此查询构建器，用于链式调用
	 */
	without<U extends object>(component: ComponentCtor): QueryBuilder<T> {
		this.filters.push(new Without<U>(component));
		return this;
	}

	/**
	 * 添加 Or 过滤器到查询
	 * @param filters - 要用 OR 逻辑组合的过滤器
	 * @returns 此查询构建器，用于链式调用
	 */
	or(...filters: QueryFilter[]): QueryBuilder<T> {
		this.filters.push(new Or(filters));
		return this;
	}

	/**
	 * 添加 And 过滤器到查询
	 * @param filters - 要用 AND 逻辑组合的过滤器
	 * @returns 此查询构建器，用于链式调用
	 */
	and(...filters: QueryFilter[]): QueryBuilder<T> {
		this.filters.push(new And(filters));
		return this;
	}

	/**
	 * 执行查询并返回迭代器
	 * @returns 匹配的实体和组件的迭代器
	 */
	*iter(): Generator<[number, ...InferComponentTypes<T>]> {
		// Collect all results first since we can't properly wrap Matter's iterator
		const results = this.collect();
		for (const result of results) {
			yield result;
		}
	}

	/**
	 * 获取所有结果为数组
	 * @returns 匹配的实体和组件的数组
	 */
	collect(): Array<[number, ...InferComponentTypes<T>]> {
		const results: Array<[number, ...InferComponentTypes<T>]> = [];

		// Use Matter's native query for base components
		const baseQuery = this.world.query(...this.components);

		// roblox-ts for-of only captures first 2 values from Lua multi-return
		// We have to work around this by using the query differently
		// Instead of wrapping, we'll iterate and manually pack values

		for (const result of baseQuery) {
			// result is a LuaTuple, but for-of only captured first value (entity)
			// and possibly second value (first component)
			// We can't access the rest through result indexing

			// Workaround: use the entity to query components directly
			const entity = result[0];

			// Apply additional filters BEFORE retrieving components
			let passesFilters = true;
			for (const filter of this.filters) {
				if (!filter.matches(this.world, entity)) {
					passesFilters = false;
					break;
				}
			}

			if (passesFilters) {
				// Build result by querying components again
				const componentData: defined[] = [entity];
				for (const component of this.components) {
					const componentValue = this.world.get(entity, component);
					componentData.push(componentValue as defined);
				}
				results.push(componentData as never);
			}
		}

		return results;
	}

	/**
	 * 统计匹配的实体数量
	 * @returns 匹配查询的实体数量
	 */
	count(): number {
		let totalCount = 0;
		for (const _ of this.iter()) {
			totalCount++;
		}
		return totalCount;
	}

	/**
	 * 检查是否有任何实体匹配查询
	 * @returns 如果至少有一个实体匹配则返回 true
	 */
	any(): boolean {
		for (const _ of this.iter()) {
			return true;
		}
		return false;
	}

	/**
	 * 获取第一个匹配的实体
	 * @returns 第一个匹配的实体和组件，如果没有匹配则返回 undefined
	 */
	first(): [number, ...InferComponentTypes<T>] | undefined {
		for (const result of this.iter()) {
			return result;
		}
		return undefined;
	}
}

/**
 * 辅助类型：从组件构造函数推断组件值类型
 * 用于 TypeScript 类型推导，将组件构造函数数组转换为组件实例类型数组
 */
type InferComponentTypes<T> = T extends [infer First, ...infer Rest]
	? First extends ComponentCtor
		? Rest extends ComponentCtor[]
			? [ReturnType<First>, ...InferComponentTypes<Rest>]
			: [ReturnType<First>]
		: []
	: [];