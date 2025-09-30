/**
 * Transform 传播系统 - 精简版
 * 只使用单向 Parent 关系，不维护 Children 列表
 * 利用 Roblox 的层次系统，按需计算
 */

import { World, AnyEntity } from "@rbxts/matter";
import { Transform, GlobalTransform, computeGlobalTransform } from "../components";
import { component } from "@rbxts/matter";

/**
 * 父实体引用组件
 * 单向关系，不维护反向的 Children 列表
 */
export const Parent = component<{
	/** 父实体的 ID */
	entity: number;
}>("Parent");

/**
 * 获取实体的所有子实体
 * 动态查询，不缓存结果
 * @param world - Matter World 实例
 * @param parentEntity - 父实体 ID
 * @returns 子实体 ID 数组
 */
export function getChildren(world: World, parentEntity: number): number[] {
	const children: number[] = [];
	for (const [entity, parent] of world.query(Parent)) {
		if (parent.entity === parentEntity) {
			children.push(entity);
		}
	}
	return children;
}

/**
 * 获取实体的根实体
 * 沿着 Parent 链向上查找直到根
 * @param world - Matter World 实例
 * @param entity - 起始实体 ID
 * @returns 根实体 ID
 */
export function getRootEntity(world: World, entity: number): number {
	let current = entity;
	let parent = world.get(current as AnyEntity, Parent);

	while (parent) {
		current = parent.entity;
		parent = world.get(current as AnyEntity, Parent);
	}

	return current;
}

/**
 * 计算实体的全局变换
 * 递归向上计算，不依赖缓存的 GlobalTransform
 * @param world - Matter World 实例
 * @param entity - 实体 ID
 * @returns 全局变换数据，如果实体没有 Transform 返回 undefined
 */
export function calculateGlobalTransform(
	world: World,
	entity: number,
): { cframe: CFrame; scale: Vector3 } | undefined {
	const transform = world.get(entity as AnyEntity, Transform);
	if (!transform) {
		return undefined;
	}

	const parent = world.get(entity as AnyEntity, Parent);
	if (!parent) {
		// 根实体，直接返回局部变换
		return computeGlobalTransform(transform);
	}

	// 递归计算父级的全局变换
	const parentGlobal = calculateGlobalTransform(world, parent.entity);
	if (!parentGlobal) {
		// 父级没有 Transform，当作根实体处理
		return computeGlobalTransform(transform);
	}

	// 组合父级和自身的变换
	return computeGlobalTransform(transform, parentGlobal);
}

/**
 * 更新所有实体的 GlobalTransform
 * 简化版：直接计算，不使用脏标记
 * @param world - Matter World 实例
 */
export function updateGlobalTransforms(world: World): void {
	// 方案1：简单粗暴，更新所有实体
	// 适合实体数量不多的情况
	for (const [entity, transform] of world.query(Transform)) {
		const globalTransform = calculateGlobalTransform(world, entity);
		if (globalTransform) {
			world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
		}
	}
}

/**
 * 优化版：只更新变化的实体及其子孙
 * @param world - Matter World 实例
 * @param changedEntities - 变化的实体 ID 集合
 */
export function updateChangedTransforms(world: World, changedEntities: Set<number>): void {
	const toUpdate = new Set<number>();

	// 收集需要更新的实体（变化的实体及其所有子孙）
	for (const entity of changedEntities) {
		toUpdate.add(entity);
		collectDescendants(world, entity, toUpdate);
	}

	// 更新这些实体的 GlobalTransform
	for (const entity of toUpdate) {
		const globalTransform = calculateGlobalTransform(world, entity);
		if (globalTransform) {
			world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
		}
	}
}

/**
 * 收集实体的所有子孙
 * 递归遍历实体的所有后代并添加到集合中
 * @param world - Matter World 实例
 * @param entity - 父实体 ID
 * @param collection - 用于收集结果的集合
 */
function collectDescendants(world: World, entity: number, collection: Set<number>): void {
	const children = getChildren(world, entity);
	for (const child of children) {
		collection.add(child);
		collectDescendants(world, child, collection);
	}
}

/**
 * 设置实体的父级
 * 只更新 Parent 组件，不维护 Children
 * @param world - Matter World 实例
 * @param child - 子实体 ID
 * @param parent - 新的父实体 ID（undefined 表示移除父级）
 */
export function setParent(world: World, child: number, parent?: number): void {
	if (parent !== undefined) {
		// 检查是否会造成循环
		let currentEntity: number | undefined = parent;
		while (currentEntity !== undefined) {
			if (currentEntity === child) {
				error("Cannot set parent: would create a cycle");
			}
			const parentComp: { entity: number } | undefined = world.get(currentEntity as AnyEntity, Parent);
			currentEntity = parentComp?.entity;
		}

		world.insert(child as AnyEntity, Parent({ entity: parent }));
	} else {
		world.remove(child as AnyEntity, Parent);
	}
}

/**
 * 移除实体及其所有子孙
 * @param world - Matter World 实例
 * @param entity - 要移除的实体 ID
 */
export function removeWithDescendants(world: World, entity: number): void {
	// 先递归移除所有子实体
	const children = getChildren(world, entity);
	for (const child of children) {
		removeWithDescendants(world, child);
	}

	// 最后移除自己
	world.despawn(entity as AnyEntity);
}