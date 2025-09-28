/**
 * ECS 层次结构组件和工具
 * 精简版实现，只维护单向 Parent 关系
 * 充分利用 Roblox 的原生层次系统
 */

import { component, World, AnyEntity } from "@rbxts/matter";

/**
 * Parent 组件 - 指向父实体
 */
export const Parent = component<{
	/** 父实体 ID */
	entity: number;
}>("Parent");

/**
 * Children 组件 - 缓存子实体列表
 * 用于优化 getChildren 查询性能，从 O(n) 降为 O(1)
 */
export const Children = component<{
	/** 直接子实体 ID 列表 */
	entities: ReadonlyArray<number>;
}>("Children");

/**
 * 层次结构工具类
 * 提供常用的层次操作函数
 */
export class HierarchyUtils {
	/**
	 * 获取实体的所有直接子实体
	 * O(1) 查询，从 Children 组件读取缓存
	 */
	static getChildren(world: World, parentEntity: number): number[] {
		const children = world.get(parentEntity as AnyEntity, Children);
		return children ? [...children.entities] : [];
	}

	/**
	 * 获取实体的所有子孙实体
	 * 递归查询整个子树
	 */
	static getDescendants(world: World, parentEntity: number): number[] {
		const descendants: number[] = [];
		const stack = [parentEntity];

		while (stack.size() > 0) {
			const current = stack.pop()!;
			const children = this.getChildren(world, current);

			for (const child of children) {
				descendants.push(child);
				stack.push(child);
			}
		}

		return descendants;
	}

	/**
	 * 获取实体的父实体
	 */
	static getParent(world: World, entity: number): number | undefined {
		const parent = world.get(entity as AnyEntity, Parent);
		return parent?.entity;
	}

	/**
	 * 获取实体的所有祖先实体
	 * 从父级一直到根
	 */
	static getAncestors(world: World, entity: number): number[] {
		const ancestors: number[] = [];
		let current = this.getParent(world, entity);

		while (current !== undefined) {
			ancestors.push(current);
			current = this.getParent(world, current);
		}

		return ancestors;
	}

	/**
	 * 获取实体的根实体
	 * 沿着 Parent 链向上查找直到根
	 */
	static getRoot(world: World, entity: number): number {
		let current = entity;
		let parent = this.getParent(world, current);

		while (parent !== undefined) {
			current = parent;
			parent = this.getParent(world, current);
		}

		return current;
	}

	/**
	 * 检查一个实体是否是另一个实体的祖先
	 */
	static isAncestor(world: World, ancestor: number, descendant: number): boolean {
		let current = this.getParent(world, descendant);

		while (current !== undefined) {
			if (current === ancestor) {
				return true;
			}
			current = this.getParent(world, current);
		}

		return false;
	}

	/**
	 * 设置实体的父级
	 * 包含循环检测，同步更新 Children 缓存
	 */
	static setParent(world: World, child: number, parent?: number): void {
		// 获取旧父级，用于清理缓存
		const oldParent = this.getParent(world, child);

		if (parent !== undefined) {
			// 检查是否会造成循环
			if (parent === child) {
				error("Cannot set entity as its own parent");
			}

			if (this.isAncestor(world, child, parent)) {
				error("Cannot set parent: would create a cycle");
			}

			// 从旧父级的 Children 中移除
			if (oldParent !== undefined && oldParent !== parent) {
				this.removeChildFromParent(world, oldParent, child);
			}

			// 设置新的 Parent 组件
			world.insert(child as AnyEntity, Parent({ entity: parent }));

			// 添加到新父级的 Children 中
			this.addChildToParent(world, parent, child);
		} else {
			// 移除父级关系
			if (oldParent !== undefined) {
				this.removeChildFromParent(world, oldParent, child);
			}

			world.remove(child as AnyEntity, Parent);
		}
	}

	/**
	 * 内部方法：将子实体添加到父实体的 Children 组件
	 */
	private static addChildToParent(world: World, parent: number, child: number): void {
		const currentChildren = world.get(parent as AnyEntity, Children);

		if (currentChildren) {
			// 检查是否已存在，避免重复添加
			if (currentChildren.entities.indexOf(child) === -1) {
				const updatedEntities = [...currentChildren.entities, child];
				world.insert(parent as AnyEntity, Children({ entities: updatedEntities }));
			}
		} else {
			// 创建新的 Children 组件
			world.insert(parent as AnyEntity, Children({ entities: [child] }));
		}
	}

	/**
	 * 内部方法：从父实体的 Children 组件中移除子实体
	 */
	private static removeChildFromParent(world: World, parent: number, child: number): void {
		const currentChildren = world.get(parent as AnyEntity, Children);

		if (currentChildren) {
			const updatedEntities = currentChildren.entities.filter((entity) => entity !== child);

			if (updatedEntities.size() > 0) {
				world.insert(parent as AnyEntity, Children({ entities: updatedEntities }));
			} else {
				// 如果没有子实体了，移除 Children 组件
				world.remove(parent as AnyEntity, Children);
			}
		}
	}

	/**
	 * 移除实体及其所有子孙
	 * 递归删除整个子树，自动清理 Parent 和 Children 组件
	 */
	static despawnWithDescendants(world: World, entity: number): void {
		const children = this.getChildren(world, entity);

		// 先递归移除所有子实体
		for (const child of children) {
			this.despawnWithDescendants(world, child);
		}

		// 从父级的 Children 中移除自己
		const parent = this.getParent(world, entity);
		if (parent !== undefined) {
			this.removeChildFromParent(world, parent, entity);
		}

		// 最后移除自己（会自动删除 Parent 和 Children 组件）
		world.despawn(entity as AnyEntity);
	}

	/**
	 * 从一个父级移动到另一个父级
	 * 保持子树完整
	 */
	static reparent(world: World, entity: number, newParent?: number): void {
		this.setParent(world, entity, newParent);
	}

	/**
	 * 获取实体在兄弟中的索引
	 */
	static getSiblingIndex(world: World, entity: number): number {
		const parent = this.getParent(world, entity);
		if (parent === undefined) {
			return 0;
		}

		const siblings = this.getChildren(world, parent);
		return siblings.indexOf(entity);
	}

	/**
	 * 获取实体的深度（到根的距离）
	 */
	static getDepth(world: World, entity: number): number {
		let depth = 0;
		let current = this.getParent(world, entity);

		while (current !== undefined) {
			depth++;
			current = this.getParent(world, current);
		}

		return depth;
	}
}

/**
 * 用于 Roblox 集成的辅助函数
 */
export namespace RobloxHierarchy {
	/**
	 * 同步 ECS 层次到 Roblox Instance 层次
	 * @param world - ECS World
	 * @param entity - ECS 实体
	 * @param instance - Roblox Instance
	 * @param getInstanceForEntity - 获取实体对应的 Instance 的函数
	 */
	export function syncToRoblox(
		world: World,
		entity: number,
		instance: Instance,
		getInstanceForEntity: (entity: number) => Instance | undefined,
	): void {
		const parent = HierarchyUtils.getParent(world, entity);

		if (parent !== undefined) {
			const parentInstance = getInstanceForEntity(parent);
			if (parentInstance) {
				instance.Parent = parentInstance;
			}
		}
	}

	/**
	 * 从 Roblox Instance 层次同步到 ECS
	 * @param world - ECS World
	 * @param instance - Roblox Instance
	 * @param entity - 对应的 ECS 实体
	 * @param getEntityForInstance - 获取 Instance 对应的实体的函数
	 */
	export function syncFromRoblox(
		world: World,
		instance: Instance,
		entity: number,
		getEntityForInstance: (instance: Instance) => number | undefined,
	): void {
		const robloxParent = instance.Parent;

		if (robloxParent && robloxParent !== game) {
			const parentEntity = getEntityForInstance(robloxParent);
			if (parentEntity !== undefined) {
				HierarchyUtils.setParent(world, entity, parentEntity);
			} else {
				HierarchyUtils.setParent(world, entity, undefined);
			}
		} else {
			HierarchyUtils.setParent(world, entity, undefined);
		}
	}
}
