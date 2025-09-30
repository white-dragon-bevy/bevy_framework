/**
 * Transform 组件 - 描述实体的局部变换
 * 使用 Roblox 的 CFrame 和 Vector3 类型
 */

import { component } from "@rbxts/matter";

/**
 * Transform 组件
 * 存储实体相对于其父级的位置、旋转和缩放
 * 如果没有父级，则相对于世界坐标系
 */
export const Transform = component<{
	/** 位置和旋转，使用 CFrame 存储 */
	cframe: CFrame;
	/** 缩放，使用 Vector3 存储 */
	scale: Vector3;
}>("Transform");

/**
 * 创建 Transform 的辅助函数
 * @param cframe - 位置和旋转
 * @param scale - 缩放，默认为 (1, 1, 1)
 * @returns Transform 组件数据
 */
export function createTransform(cframe: CFrame = CFrame.identity, scale: Vector3 = Vector3.one): {
	cframe: CFrame;
	scale: Vector3;
} {
	return {
		cframe,
		scale,
	};
}

/**
 * 从位置创建 Transform
 * @param position - 位置向量
 * @returns Transform 组件数据
 */
export function transformFromPosition(position: Vector3): {
	cframe: CFrame;
	scale: Vector3;
} {
	return {
		cframe: new CFrame(position),
		scale: Vector3.one,
	};
}

/**
 * 从位置和旋转创建 Transform
 * @param position - 位置向量
 * @param lookAt - 朝向的目标位置
 * @returns Transform 组件数据
 */
export function transformFromLookAt(position: Vector3, lookAt: Vector3): {
	cframe: CFrame;
	scale: Vector3;
} {
	return {
		cframe: CFrame.lookAt(position, lookAt),
		scale: Vector3.one,
	};
}

/**
 * 应用缩放到 Transform
 * @param transform - Transform 数据
 * @param scale - 新的缩放值
 * @returns 更新后的 Transform 数据
 */
export function withScale(
	transform: { cframe: CFrame; scale: Vector3 },
	scale: Vector3,
): { cframe: CFrame; scale: Vector3 } {
	return {
		...transform,
		scale,
	};
}

/**
 * 应用位置到 Transform
 * @param transform - Transform 数据
 * @param position - 新的位置向量
 * @returns 更新后的 Transform 数据
 */
export function withPosition(
	transform: { cframe: CFrame; scale: Vector3 },
	position: Vector3,
): { cframe: CFrame; scale: Vector3 } {
	return {
		...transform,
		cframe: new CFrame(position, transform.cframe.Position.add(transform.cframe.LookVector)),
	};
}

/**
 * TransformTreeChanged 标记组件
 * 用于优化变换传播，标记需要更新的子树
 */
export const TransformTreeChanged = component<{}>("TransformTreeChanged");