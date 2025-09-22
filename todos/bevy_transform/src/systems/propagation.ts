/**
 * Transform 传播系统
 * 负责从父级到子级传播变换
 */

import { World, AnyEntity } from "@rbxts/matter";
import { Transform, GlobalTransform, TransformTreeChanged, computeGlobalTransform } from "../components";

/**
 * 父子关系组件（临时定义，应该从 hierarchy 模块导入）
 */
import { component } from "@rbxts/matter";

export const Parent = component<{
	entity: number;
}>("Parent");

export const Children = component<{
	entities: number[];
}>("Children");

/**
 * 标记需要更新的变换树
 * 当 Transform 改变或父子关系改变时，标记整个子树为需要更新
 * @param world - Matter World
 */
export function markDirtyTrees(world: World): void {
	// 查找所有变更的 Transform 或新添加的 GlobalTransform
	for (const [entity, transform] of world.query(Transform)) {
		const [globalTransform] = world.get(entity, GlobalTransform);
		if (!globalTransform) {
			continue;
		}

		// 检查是否需要标记为脏
		const needsUpdate = !world.contains(entity as AnyEntity);

		if (needsUpdate) {
			// 标记实体及其所有祖先为脏
			let current: number | undefined = entity;
			while (current !== undefined) {
				world.insert(current as AnyEntity, TransformTreeChanged({}));

				// 获取父级
				const [parentData] = world.get(current, Parent);
				current = parentData ? parentData.entity : undefined;
			}
		}
	}
}

/**
 * 递归传播变换到子级
 * @param world - Matter World
 * @param entity - 当前实体
 * @param parentGlobalTransform - 父级的全局变换
 * @param forceUpdate - 是否强制更新（父级已更新）
 */
function propagateRecursive(
	world: World,
	entity: number,
	parentGlobalTransform: { cframe: CFrame; scale: Vector3 },
	forceUpdate: boolean,
): void {
	const [transform] = world.get(entity, Transform);
	if (!transform) {
		return;
	}

	// 检查是否需要更新
	const [treeChanged] = world.get(entity, TransformTreeChanged);
	const hasChanged = treeChanged !== undefined;
	const shouldUpdate = forceUpdate || hasChanged;

	if (shouldUpdate && transform) {
		// 计算新的全局变换
		const newGlobalTransform = computeGlobalTransform(transform, parentGlobalTransform);

		// 更新 GlobalTransform
		world.insert(entity as AnyEntity, GlobalTransform(newGlobalTransform));

		// 清除脏标记
		if (hasChanged) {
			world.remove(entity as AnyEntity, TransformTreeChanged);
		}

		// 传播到子级
		const [childrenData] = world.get(entity, Children);
		if (childrenData) {
			for (const childEntity of childrenData.entities) {
				propagateRecursive(world, childEntity, newGlobalTransform, true);
			}
		}
	} else {
		// 即使自己没有变化，也要检查子级是否有变化
		const [globalTransform] = world.get(entity, GlobalTransform);
		if (globalTransform) {
			const [childrenData] = world.get(entity, Children);
			if (childrenData) {
				for (const childEntity of childrenData.entities) {
					propagateRecursive(world, childEntity, globalTransform, false);
				}
			}
		}
	}
}

/**
 * 传播父级变换到子级
 * 处理整个实体层级的变换更新
 * @param world - Matter World
 */
export function propagateParentTransforms(world: World): void {
	// 查找所有根实体（没有父级的实体）
	const rootEntities: number[] = [];

	for (const [entity, transform] of world.query(Transform)) {
		const parent = world.get(entity, Parent);
		if (!parent) {
			rootEntities.push(entity);
		}
	}

	// 从根实体开始传播
	for (const rootEntity of rootEntities) {
		const [transform] = world.get(rootEntity, Transform);
		const [globalTransform] = world.get(rootEntity, GlobalTransform);

		if (transform && globalTransform) {
			const [treeChanged] = world.get(rootEntity, TransformTreeChanged);
			const hasChanged = treeChanged !== undefined;

			if (hasChanged) {
				// 更新根实体的全局变换
				const newGlobalTransform = computeGlobalTransform(transform);
				world.insert(rootEntity as AnyEntity, GlobalTransform(newGlobalTransform));

				// 清除脏标记
				world.remove(rootEntity as AnyEntity, TransformTreeChanged);

				// 传播到子级
				const [childrenData] = world.get(rootEntity, Children);
				if (childrenData) {
					for (const childEntity of childrenData.entities) {
						propagateRecursive(world, childEntity, newGlobalTransform, true);
					}
				}
			} else {
				// 检查子级是否有变化
				const [childrenData] = world.get(rootEntity, Children);
				if (childrenData) {
					const [currentGlobalTransform] = world.get(rootEntity, GlobalTransform);
					if (!currentGlobalTransform) return;
					for (const childEntity of childrenData.entities) {
						propagateRecursive(world, childEntity, currentGlobalTransform, false);
					}
				}
			}
		}
	}
}