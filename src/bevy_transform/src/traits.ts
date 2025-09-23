/**
 * TransformPoint trait 实现
 * 提供点变换的接口
 */

/**
 * TransformPoint 接口
 * 用于变换点从局部空间到世界空间
 */
export interface TransformPoint {
	/**
	 * 变换一个点
	 * @param point - 要变换的点
	 * @returns 变换后的点
	 */
	transformPoint(point: Vector3): Vector3;
}

/**
 * 为 CFrame 实现 TransformPoint
 */
export class CFrameTransformPoint implements TransformPoint {
	private cframe: CFrame;

	constructor(cframe: CFrame) {
		this.cframe = cframe;
	}

	transformPoint(point: Vector3): Vector3 {
		return this.cframe.PointToWorldSpace(point);
	}
}

/**
 * 创建 TransformPoint 实例
 * @param cframe - CFrame
 * @returns TransformPoint 实例
 */
export function createTransformPoint(cframe: CFrame): TransformPoint {
	return new CFrameTransformPoint(cframe);
}