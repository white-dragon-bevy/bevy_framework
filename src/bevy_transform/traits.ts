/**
 * TransformPoint trait 实现
 * 提供点变换的接口
 */

/**
 * TransformPoint 接口
 * 用于变换点从局部空间到世界空间
 * 提供统一的点变换接口，可由不同的变换类型实现
 */
export interface TransformPoint {
	/**
	 * 变换一个点
	 * @param point - 要变换的局部空间点
	 * @returns 变换后的世界空间点
	 */
	transformPoint(point: Vector3): Vector3;
}

/**
 * 为 CFrame 实现 TransformPoint
 * 提供基于 CFrame 的点变换功能
 */
export class CFrameTransformPoint implements TransformPoint {
	private cframe: CFrame;

	/**
	 * 构造函数
	 * @param cframe - 用于变换的 CFrame
	 */
	constructor(cframe: CFrame) {
		this.cframe = cframe;
	}

	/**
	 * 变换一个点从局部空间到世界空间
	 * @param point - 局部空间中的点
	 * @returns 世界空间中的点
	 */
	transformPoint(point: Vector3): Vector3 {
		return this.cframe.PointToWorldSpace(point);
	}
}

/**
 * 创建 TransformPoint 实例
 * @param cframe - CFrame 数据
 * @returns TransformPoint 实例
 */
export function createTransformPoint(cframe: CFrame): TransformPoint {
	return new CFrameTransformPoint(cframe);
}