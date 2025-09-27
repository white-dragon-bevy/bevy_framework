/**
 * 轴输入管理
 * 基于 Bevy 的 Axis 模块，用于管理模拟输入值（如摇杆、扳机等）
 */

/**
 * 轴输入存储器
 * 存储和管理输入设备的位置/压力数据
 * @template T - 输入设备类型（如 GamepadAxis、GamepadButton 等）
 */
export class Axis<T extends defined> {
	/** 最小轴值 */
	public static readonly MIN = -1.0;
	/** 最大轴值 */
	public static readonly MAX = 1.0;

	/** 轴数据存储 */
	private axisData: Map<T, number>;

	constructor() {
		this.axisData = new Map();
	}

	/**
	 * 设置输入设备的位置数据
	 * @param inputDevice - 输入设备标识
	 * @param positionData - 位置数据（通常范围为 -1.0 到 1.0）
	 * @returns 如果设备之前存在，返回旧值；否则返回 undefined
	 */
	public set(inputDevice: T, positionData: number): number | undefined {
		const oldValue = this.axisData.get(inputDevice);
		this.axisData.set(inputDevice, positionData);
		return oldValue;
	}

	/**
	 * 获取输入设备的位置数据（限制在 MIN 和 MAX 之间）
	 * @param inputDevice - 输入设备标识
	 * @returns 限制后的位置数据，如果设备未设置返回 undefined
	 */
	public get(inputDevice: T): number | undefined {
		const value = this.axisData.get(inputDevice);

		if (value === undefined) {
			return undefined;
		}

		return math.clamp(value, Axis.MIN, Axis.MAX);
	}

	/**
	 * 获取输入设备的未限制位置数据
	 * 该值可能超出 MIN 和 MAX 范围
	 * 适用于相机缩放等场景，允许鼠标滚轮等设备超出正常范围
	 * @param inputDevice - 输入设备标识
	 * @returns 未限制的位置数据，如果设备未设置返回 undefined
	 */
	public getUnclamped(inputDevice: T): number | undefined {
		return this.axisData.get(inputDevice);
	}

	/**
	 * 移除输入设备的位置数据
	 * @param inputDevice - 输入设备标识
	 * @returns 如果设备之前存在，返回其位置数据；否则返回 undefined
	 */
	public remove(inputDevice: T): number | undefined {
		const value = this.axisData.get(inputDevice);
		this.axisData.delete(inputDevice);
		return value;
	}

	/**
	 * 获取所有轴的迭代器
	 * @returns 轴标识的数组
	 */
	public allAxes(): Array<T> {
		const result: Array<T> = [];

		for (const [axis] of this.axisData) {
			result.push(axis);
		}

		return result;
	}

	/**
	 * 获取所有轴及其值的迭代器
	 * @returns 轴标识和值的元组数组
	 */
	public allAxesAndValues(): Array<[T, number]> {
		const result: Array<[T, number]> = [];

		for (const [axis, value] of this.axisData) {
			result.push([axis, value]);
		}

		return result;
	}

	/**
	 * 清除所有轴数据
	 */
	public clear(): void {
		this.axisData.clear();
	}
}
