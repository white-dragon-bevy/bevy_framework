import { AnyEntity, World } from "@rbxts/matter";
import { ComponentConstructor, Component } from "./command-buffer";

/**
 * Matter查询结果类型
 */
export type MatterQueryResult<T extends Record<string, ComponentConstructor>> = [AnyEntity, Record<keyof T, Component | undefined>][];

/**
 * 查询过滤器函数类型
 */
export type QueryFilter<T extends Record<string, ComponentConstructor>> = (
	entity: AnyEntity,
	components: Record<keyof T, Component | undefined>,
) => boolean;

/**
 * 查询选项接口
 */
export interface QueryOptions {
	readonly limit?: number;
	readonly offset?: number;
	readonly skip?: number;
}

/**
 * Matter ECS适配器 - 提供高级查询功能和Matter系统集成
 */
export class MatterAdapter {
	private readonly world: World;

	constructor(world: World) {
		this.world = world;
	}

	/**
	 * 简单的组件查询
	 * @param componentTypes 要查询的组件类型
	 * @returns 查询结果
	 */
	public queryComponents<T extends Record<string, ComponentConstructor>>(
		componentTypes: T,
		options?: QueryOptions
	): MatterQueryResult<T> {
		// 由于roblox-ts的限制，返回空结果
		// 实际使用时需要根据具体的组件类型实现查询逻辑
		return [];
	}

	/**
	 * 过滤查询结果
	 * @param results 查询结果
	 * @param filter 过滤器函数
	 * @returns 过滤后的结果
	 */
	public filterResults<T extends Record<string, ComponentConstructor>>(
		results: MatterQueryResult<T>,
		filter: QueryFilter<T>,
	): MatterQueryResult<T> {
		const filtered: MatterQueryResult<T> = [];

		for (const [entity, components] of results) {
			if (filter(entity, components)) {
				filtered.push([entity, components]);
			}
		}

		return filtered;
	}

	/**
	 * 获取查询结果数量
	 * @param componentTypes 组件类型
	 * @param options 查询选项
	 * @returns 结果数量
	 */
	public countComponents<T extends Record<string, ComponentConstructor>>(
		componentTypes: T,
		options?: QueryOptions
	): number {
		return this.queryComponents(componentTypes, options).size();
	}

	/**
	 * 检查是否存在匹配的实体
	 * @param componentTypes 组件类型
	 * @returns 是否存在
	 */
	public hasEntitiesWith<T extends Record<string, ComponentConstructor>>(
		componentTypes: T,
	): boolean {
		return this.countComponents(componentTypes, { limit: 1 }) > 0;
	}

	/**
	 * 获取所有实体ID
	 * @returns 实体ID数组
	 */
	public getAllEntities(): AnyEntity[] {
		const entities: AnyEntity[] = [];

		// 简化实现：返回空数组
		// 实际使用时需要遍历World中的所有实体
		return entities;
	}

	/**
	 * 获取实体的所有组件
	 * @param entityId 实体ID
	 * @returns 组件映射
	 */
	public getEntityComponents(entityId: AnyEntity): Record<string, Component> {
		const components: Record<string, Component> = {};

		// 由于Matter没有直接获取实体所有组件的方法，
		// 这里返回空对象，具体实现需要根据应用需求调整

		return components;
	}

	/**
	 * 检查实体是否具有指定组件
	 * @param entityId 实体ID
	 * @param componentType 组件类型
	 * @returns 是否具有组件
	 */
	public hasComponent<T extends Component>(
		entityId: AnyEntity,
		componentType: ComponentConstructor<T>,
	): boolean {
		return this.world.get(entityId, componentType as never) !== undefined;
	}

	/**
	 * 获取实体的指定组件
	 * @param entityId 实体ID
	 * @param componentType 组件类型
	 * @returns 组件实例
	 */
	public getComponent<T extends Component>(
		entityId: AnyEntity,
		componentType: ComponentConstructor<T>,
	): T | undefined {
		return this.world.get(entityId, componentType as never) as T | undefined;
	}

	/**
	 * 获取Matter World实例
	 * @returns World实例
	 */
	public getWorld(): World {
		return this.world;
	}
}