/**
 * GlobalTransform 组件 - 描述实体的全局变换
 * 使用 Roblox 的 CFrame 类型
 */

import { component } from "@rbxts/matter";

/**
 * GlobalTransform 组件
 * 存储实体在世界坐标系中的变换
 * 由系统自动计算和更新，不应手动修改
 */
export const GlobalTransform = component<{
	/** 全局变换，包含位置、旋转和缩放 */
	cframe: CFrame;
	/** 全局缩放 */
	scale: Vector3;
}>("GlobalTransform");

/**
 * 创建 GlobalTransform 的辅助函数
 * @param cframe - 全局位置和旋转
 * @param scale - 全局缩放，默认为 (1, 1, 1)
 * @returns GlobalTransform 组件数据
 */
export function createGlobalTransform(cframe: CFrame = CFrame.identity, scale: Vector3 = Vector3.one): {
	cframe: CFrame;
	scale: Vector3;
} {
	return {
		cframe,
		scale,
	};
}

/**
 * 从 Transform 计算 GlobalTransform
 * @param localTransform - 局部变换
 * @param parentGlobalTransform - 父级的全局变换（可选）
 * @returns 计算后的全局变换
 */
export function computeGlobalTransform(
	localTransform: { cframe: CFrame; scale: Vector3 },
	parentGlobalTransform?: { cframe: CFrame; scale: Vector3 },
): { cframe: CFrame; scale: Vector3 } {
	if (!parentGlobalTransform) {
		// 没有父级，局部变换就是全局变换
		return {
			cframe: localTransform.cframe,
			scale: localTransform.scale,
		};
	}

	// 计算全局变换
	// 全局位置 = 父级位置 + 父级旋转 * (局部位置 * 父级缩放)
	// 全局旋转 = 父级旋转 * 局部旋转
	// 全局缩放 = 父级缩放 * 局部缩放
	const globalCFrame = parentGlobalTransform.cframe.mul(localTransform.cframe);
	const globalScale = parentGlobalTransform.scale.mul(localTransform.scale);

	return {
		cframe: globalCFrame,
		scale: globalScale,
	};
}

/**
 * 从 GlobalTransform 提取位置
 * @param globalTransform - 全局变换
 * @returns 世界坐标位置
 */
export function getGlobalPosition(globalTransform: { cframe: CFrame; scale: Vector3 }): Vector3 {
	return globalTransform.cframe.Position;
}

/**
 * 从 GlobalTransform 提取旋转
 * @param globalTransform - 全局变换
 * @returns 世界坐标旋转（作为 CFrame）
 */
export function getGlobalRotation(globalTransform: { cframe: CFrame; scale: Vector3 }): CFrame {
	return globalTransform.cframe.sub(globalTransform.cframe.Position);
}

/**
 * 从 GlobalTransform 提取前向向量
 * @param globalTransform - 全局变换
 * @returns 前向向量（-Z 轴）
 */
export function getForward(globalTransform: { cframe: CFrame; scale: Vector3 }): Vector3 {
	return globalTransform.cframe.LookVector.mul(-1);
}

/**
 * 从 GlobalTransform 提取右向向量
 * @param globalTransform - 全局变换
 * @returns 右向向量（X 轴）
 */
export function getRight(globalTransform: { cframe: CFrame; scale: Vector3 }): Vector3 {
	return globalTransform.cframe.RightVector;
}

/**
 * 从 GlobalTransform 提取上向向量
 * @param globalTransform - 全局变换
 * @returns 上向向量（Y 轴）
 */
export function getUp(globalTransform: { cframe: CFrame; scale: Vector3 }): Vector3 {
	return globalTransform.cframe.UpVector;
}

/**
 * 变换一个点从局部空间到世界空间
 * @param globalTransform - 全局变换
 * @param point - 局部空间中的点
 * @returns 世界空间中的点
 */
export function transformPoint(globalTransform: { cframe: CFrame; scale: Vector3 }, point: Vector3): Vector3 {
	// 先应用缩放，然后应用旋转和位置
	const scaledPoint = point.mul(globalTransform.scale);
	return globalTransform.cframe.PointToWorldSpace(scaledPoint);
}

/**
 * 变换一个方向从局部空间到世界空间
 * @param globalTransform - 全局变换
 * @param direction - 局部空间中的方向
 * @returns 世界空间中的方向
 */
export function transformDirection(
	globalTransform: { cframe: CFrame; scale: Vector3 },
	direction: Vector3,
): Vector3 {
	return globalTransform.cframe.VectorToWorldSpace(direction);
}