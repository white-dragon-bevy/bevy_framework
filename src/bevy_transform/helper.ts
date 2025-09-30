/**
 * TransformHelper - Transform 辅助工具类
 * 提供常用的变换计算和操作功能
 */

import { World, AnyEntity } from "@rbxts/matter";
import { Transform, GlobalTransform, computeGlobalTransform } from "./components";
import { Parent, Children } from "./systems";

/**
 * TransformHelper 工具类
 * 提供实体变换的辅助方法
 */
export class TransformHelper {
	private world: World;

	/**
	 * 构造函数
	 * @param world - Matter World 实例
	 */
	constructor(world: World) {
		this.world = world;
	}

	/**
	 * 获取实体的世界坐标位置
	 * @param entity - 实体 ID
	 * @returns 世界坐标位置，如果实体不存在返回 undefined
	 */
	getWorldPosition(entity: number): Vector3 | undefined {
		const [globalTransform] = this.world.get(entity, GlobalTransform);
		return globalTransform?.cframe.Position;
	}

	/**
	 * 设置实体的世界坐标位置
	 * @param entity - 实体 ID
	 * @param position - 新的世界坐标位置
	 */
	setWorldPosition(entity: number, position: Vector3): void {
		const [globalTransform] = this.world.get(entity, GlobalTransform);
		const [transform] = this.world.get(entity, Transform);

		if (!transform) {
			return;
		}

		const [parentData] = this.world.get(entity, Parent);
		if (parentData) {
			// 有父级，需要计算相对位置
			const [parentGlobal] = this.world.get(parentData.entity, GlobalTransform);
			if (parentGlobal) {
				// 将世界坐标转换为相对于父级的局部坐标
				const localPosition = parentGlobal.cframe.PointToObjectSpace(position);
				const newCFrame = new CFrame(localPosition, localPosition.add(transform.cframe.LookVector));
				this.world.insert(entity as AnyEntity, Transform({ cframe: newCFrame, scale: transform.scale }));
			}
		} else {
			// 没有父级，直接设置
			const newCFrame = new CFrame(position, position.add(transform.cframe.LookVector));
			this.world.insert(entity as AnyEntity, Transform({ cframe: newCFrame, scale: transform.scale }));
		}
	}

	/**
	 * 让实体朝向目标位置
	 * @param entity - 实体 ID
	 * @param target - 目标位置
	 * @param up - 上方向向量，默认为 Y 轴
	 */
	lookAt(entity: number, target: Vector3, up: Vector3 = Vector3.yAxis): void {
		const [transform] = this.world.get(entity, Transform);
		if (!transform) {
			return;
		}

		const position = transform.cframe.Position;
		const newCFrame = CFrame.lookAt(position, target, up);
		this.world.insert(entity as AnyEntity, Transform({ cframe: newCFrame, scale: transform.scale }));
	}

	/**
	 * 获取实体到目标的距离
	 * @param entity - 实体 ID
	 * @param target - 目标实体 ID 或位置
	 * @returns 距离，如果实体不存在返回 undefined
	 */
	getDistance(entity: number, target: number | Vector3): number | undefined {
		const entityPos = this.getWorldPosition(entity);
		if (!entityPos) {
			return undefined;
		}

		let targetPos: Vector3;
		if (typeIs(target, "number")) {
			const pos = this.getWorldPosition(target);
			if (!pos) {
				return undefined;
			}
			targetPos = pos;
		} else {
			targetPos = target;
		}

		return entityPos.sub(targetPos).Magnitude;
	}

	/**
	 * 移动实体
	 * @param entity - 实体 ID
	 * @param delta - 移动向量（世界坐标）
	 */
	translate(entity: number, delta: Vector3): void {
		const currentPos = this.getWorldPosition(entity);
		if (currentPos) {
			this.setWorldPosition(entity, currentPos.add(delta));
		}
	}

	/**
	 * 旋转实体
	 * @param entity - 实体 ID
	 * @param axis - 旋转轴
	 * @param angle - 旋转角度（弧度）
	 */
	rotate(entity: number, axis: Vector3, angle: number): void {
		const [transform] = this.world.get(entity, Transform);
		if (!transform) {
			return;
		}

		const rotation = CFrame.fromAxisAngle(axis, angle);
		const newCFrame = transform.cframe.mul(rotation);
		this.world.insert(entity as AnyEntity, Transform({ cframe: newCFrame, scale: transform.scale }));
	}

	/**
	 * 缩放实体
	 * @param entity - 实体 ID
	 * @param scale - 缩放因子（Vector3 或统一缩放的数字）
	 */
	scale(entity: number, scale: Vector3 | number): void {
		const [transform] = this.world.get(entity, Transform);
		if (!transform) {
			return;
		}

		const scaleVector = typeIs(scale, "number") ? new Vector3(scale, scale, scale) : scale;
		this.world.insert(entity as AnyEntity, Transform({ cframe: transform.cframe, scale: scaleVector }));
	}

	/**
	 * 获取实体的所有子实体
	 * @param entity - 实体 ID
	 * @returns 子实体 ID 数组
	 */
	getChildren(entity: number): number[] {
		const [childrenData] = this.world.get(entity, Children);
		return childrenData ? childrenData.entities : [];
	}

	/**
	 * 获取实体的父实体
	 * @param entity - 实体 ID
	 * @returns 父实体 ID，如果没有父实体返回 undefined
	 */
	getParent(entity: number): number | undefined {
		const [parentData] = this.world.get(entity, Parent);
		return parentData ? parentData.entity : undefined;
	}

	/**
	 * 设置实体的父级
	 * @param child - 子实体 ID
	 * @param parent - 父实体 ID，传入 undefined 移除父级
	 */
	setParent(child: number, parent: number | undefined): void {
		// 移除旧的父级关系
		const [oldParentData] = this.world.get(child, Parent);
		if (oldParentData) {
			this.world.remove(child as AnyEntity, Parent);

			// 更新旧父级的 Children 列表
			const [oldChildren] = this.world.get(oldParentData.entity, Children);
			if (oldChildren) {
				const filtered = oldChildren.entities.filter((e: number) => e !== child);
				if (filtered.size() > 0) {
					this.world.insert(oldParentData.entity as AnyEntity, Children({ entities: filtered }));
				} else {
					this.world.remove(oldParentData.entity as AnyEntity, Children);
				}
			}
		}

		// 设置新的父级关系
		if (parent !== undefined) {
			this.world.insert(child as AnyEntity, Parent({ entity: parent }));

			// 更新新父级的 Children 列表
			const [childrenData] = this.world.get(parent, Children);
			if (childrenData) {
				const newChildren = [...childrenData.entities, child];
				this.world.insert(parent as AnyEntity, Children({ entities: newChildren }));
			} else {
				this.world.insert(parent as AnyEntity, Children({ entities: [child] }));
			}
		}
	}
}

/**
 * 创建 TransformHelper 实例
 * @param world - Matter World 实例
 * @returns TransformHelper 实例
 */
export function createTransformHelper(world: World): TransformHelper {
	return new TransformHelper(world);
}