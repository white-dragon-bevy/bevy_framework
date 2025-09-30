/**
 * TransformBundle - Transform 组件包
 * 用于同时添加 Transform 和 GlobalTransform 组件
 */

import { World, AnyEntity } from "@rbxts/matter";
import { Transform, GlobalTransform, createTransform, createGlobalTransform } from "../components";

/**
 * TransformBundle 数据接口
 * 包含 Transform 和 GlobalTransform 的数据
 */
export interface TransformBundleData {
	transform?: {
		cframe: CFrame;
		scale: Vector3;
	};
	globalTransform?: {
		cframe: CFrame;
		scale: Vector3;
	};
}

/**
 * 创建默认的 TransformBundle
 * @returns 默认的 TransformBundle 数据
 */
export function createTransformBundle(): TransformBundleData {
	return {
		transform: createTransform(),
		globalTransform: createGlobalTransform(),
	};
}

/**
 * 从位置创建 TransformBundle
 * @param position - 位置向量
 * @returns TransformBundle 数据
 */
export function transformBundleFromPosition(position: Vector3): TransformBundleData {
	const cframe = new CFrame(position);
	return {
		transform: createTransform(cframe),
		globalTransform: createGlobalTransform(cframe),
	};
}

/**
 * 从 CFrame 创建 TransformBundle
 * @param cframe - CFrame 数据（位置和旋转）
 * @param scale - 缩放向量，默认为 (1, 1, 1)
 * @returns TransformBundle 数据
 */
export function transformBundleFromCFrame(cframe: CFrame, scale: Vector3 = Vector3.one): TransformBundleData {
	return {
		transform: createTransform(cframe, scale),
		globalTransform: createGlobalTransform(cframe, scale),
	};
}

/**
 * 将 TransformBundle 添加到实体
 * @param world - Matter World 实例
 * @param entity - 目标实体 ID
 * @param bundle - TransformBundle 数据
 */
export function insertTransformBundle(world: World, entity: number, bundle: TransformBundleData): void {
	const transform = bundle.transform ?? createTransform();
	const globalTransform = bundle.globalTransform ?? createGlobalTransform();

	world.insert(entity as AnyEntity, Transform(transform));
	world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
}

/**
 * 生成带有 TransformBundle 的新实体
 * @param world - Matter World 实例
 * @param bundle - TransformBundle 数据（可选，默认使用 createTransformBundle）
 * @returns 新创建的实体 ID
 */
export function spawnWithTransformBundle(world: World, bundle: TransformBundleData = createTransformBundle()): number {
	const entity = world.spawn();
	insertTransformBundle(world, entity, bundle);
	return entity;
}