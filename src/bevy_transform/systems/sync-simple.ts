/**
 * Transform 同步系统 - 精简版
 * 配合精简的 propagation 系统使用
 */

import { World, AnyEntity } from "@rbxts/matter";
import { Transform, GlobalTransform, computeGlobalTransform } from "../components";
import { Parent, calculateGlobalTransform } from "./propagation-simple";

/**
 * 同步简单变换
 * 更新没有父级的实体的 GlobalTransform
 * @param world - Matter World 实例
 */
export function syncSimpleTransforms(world: World): void {
	// 只处理根实体（没有父级的实体）
	for (const [entity, transform] of world.query(Transform)) {
		const hasParent = world.get(entity, Parent) !== undefined;

		if (!hasParent) {
			// 直接从 Transform 计算 GlobalTransform
			const globalTransform = computeGlobalTransform(transform);
			world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
		}
	}
}

/**
 * 确保所有有 Transform 的实体都有 GlobalTransform
 * @param world - Matter World 实例
 */
export function ensureGlobalTransforms(world: World): void {
	for (const [entity, transform] of world.query(Transform)) {
		const hasGlobalTransform = world.get(entity, GlobalTransform) !== undefined;

		if (!hasGlobalTransform) {
			// 计算并创建 GlobalTransform
			const globalTransform = calculateGlobalTransform(world, entity);
			if (globalTransform) {
				world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
			}
		}
	}
}

/**
 * 传播所有变换更新
 * 精简版：直接重算所有 GlobalTransform，先更新根实体，再迭代更新子实体
 * @param world - Matter World 实例
 */
export function propagateAllTransforms(world: World): void {
	// 第一遍：更新所有根实体
	for (const [entity, transform] of world.query(Transform)) {
		const parent = world.get(entity, Parent);
		if (!parent) {
			const globalTransform = computeGlobalTransform(transform);
			world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
		}
	}

	// 第二遍：更新所有有父级的实体
	// 由于 Parent 是单向的，我们需要多次遍历来确保正确的顺序
	let hasChanges = true;
	let maxIterations = 10; // 防止无限循环

	while (hasChanges && maxIterations > 0) {
		hasChanges = false;
		maxIterations--;

		for (const [entity, transform] of world.query(Transform)) {
			const parent = world.get(entity, Parent);
			if (parent) {
				const parentGlobal = world.get(parent.entity as AnyEntity, GlobalTransform);
				if (parentGlobal) {
					const newGlobal = computeGlobalTransform(transform, parentGlobal);
					const currentGlobal = world.get(entity, GlobalTransform);

					// 检查是否需要更新
					if (
						!currentGlobal ||
						!currentGlobal.cframe.Position.FuzzyEq(newGlobal.cframe.Position, 0.001) ||
						!currentGlobal.scale.FuzzyEq(newGlobal.scale, 0.001)
					) {
						world.insert(entity as AnyEntity, GlobalTransform(newGlobal));
						hasChanges = true;
					}
				}
			}
		}
	}
}