/**
 * Transform 同步系统
 * 负责更新没有父级的实体的 GlobalTransform
 */

import { World, AnyEntity } from "@rbxts/matter";
import { Transform, GlobalTransform, computeGlobalTransform } from "../components";
import { Parent } from "../../bevy_ecs/hierarchy";

/**
 * 同步简单变换
 * 更新没有父子关系的实体的 GlobalTransform
 * @param world - Matter World
 */
export function syncSimpleTransforms(world: World): void {
	// 查询所有有 Transform 但没有父级和子级的实体
	for (const [entity, transform] of world.query(Transform)) {
		const hasParent = world.get(entity, Parent) !== undefined;

		// 只处理没有父级的实体（根实体）
		if (!hasParent) {
			// 直接从 Transform 计算 GlobalTransform
			const globalTransform = computeGlobalTransform(transform);
			world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
		}
	}

	// 处理刚刚失去父级的实体（孤儿实体）
	// 这需要跟踪 Parent 组件的移除，这里简化处理
	// 在实际应用中，应该使用 RemovedComponents 系统
	for (const [entity, transform] of world.query(Transform)) {
		const hasParent = world.get(entity, Parent) !== undefined;
		const globalTransform = world.get(entity, GlobalTransform);

		// 如果没有父级但有 GlobalTransform，确保它是最新的
		if (!hasParent && globalTransform) {
			const newGlobalTransform = computeGlobalTransform(transform);
			// 只在需要时更新
			// CFrame 没有 equals 方法，需要手动比较
			const needsUpdate = !globalTransform.cframe.Position.FuzzyEq(newGlobalTransform.cframe.Position, 0.001) ||
				!globalTransform.scale.FuzzyEq(newGlobalTransform.scale, 0.001);
			if (needsUpdate) {
				world.insert(entity as AnyEntity, GlobalTransform(newGlobalTransform));
			}
		}
	}
}

/**
 * 确保所有有 Transform 的实体都有 GlobalTransform
 * @param world - Matter World
 */
export function ensureGlobalTransforms(world: World): void {
	for (const [entity, transform] of world.query(Transform)) {
		const hasGlobalTransform = world.get(entity, GlobalTransform) !== undefined;

		if (!hasGlobalTransform) {
			// 如果没有 GlobalTransform，创建一个
			const globalTransform = computeGlobalTransform(transform);
			world.insert(entity as AnyEntity, GlobalTransform(globalTransform));
		}
	}
}