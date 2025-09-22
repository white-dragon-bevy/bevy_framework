/**
 * @fileoverview 轴输入管理器
 *
 * 提供了一个通用的轴输入值管理系统，用于处理游戏手柄摇杆、扳机等模拟输入设备。
 * 轴值通常在 -1.0 到 1.0 之间。
 */

/**
 * 存储输入设备类型 T 的位置数据
 *
 * 值以 number 形式存储，使用 set 方法设置。
 * 使用 get 方法获取钳制在 MIN 和 MAX 之间的值，
 * 或使用 getUnclamped 获取未钳制的原始值。
 *
 * @template T - 输入设备类型（如 GamepadAxis）
 *
 * @example
 * ```typescript
 * const axes = new Axis<GamepadAxis>();
 * axes.set(GamepadAxis.LeftStickX, 0.5);
 * const value = axes.get(GamepadAxis.LeftStickX); // 0.5
 * ```
 */
export class Axis<T> {
	/** 最小可能的轴值 */
	public static readonly MIN = -1.0;

	/** 最大可能的轴值 */
	public static readonly MAX = 1.0;

	/** 输入设备的位置数据 */
	private axisData = new Map<T, number>();

	/**
	 * 设置输入设备的位置数据
	 *
	 * @param inputDevice - 输入设备标识
	 * @param positionData - 位置数据
	 * @returns 如果设备之前存在，返回旧值；否则返回 undefined
	 */
	public set(inputDevice: T, positionData: number): number | undefined {
		const oldValue = this.axisData.get(inputDevice);
		this.axisData.set(inputDevice, positionData);
		return oldValue;
	}

	/**
	 * 获取输入设备的位置数据
	 *
	 * 返回值将被钳制在 MIN 和 MAX 之间（包含边界）
	 *
	 * @param inputDevice - 输入设备标识
	 * @returns 钳制后的位置数据，如果设备不存在返回 undefined
	 */
	public get(inputDevice: T): number | undefined {
		const value = this.axisData.get(inputDevice);
		if (value === undefined) {
			return undefined;
		}
		return math.clamp(value, Axis.MIN, Axis.MAX);
	}

	/**
	 * 获取输入设备的未钳制位置数据
	 *
	 * 该值可能超出 MIN 和 MAX 范围。
	 * 用于相机缩放等需要超出正常范围的场景，如鼠标滚轮。
	 * 如果不同输入设备的移动速度差异会造成不公平优势，应使用 get 方法。
	 *
	 * @param inputDevice - 输入设备标识
	 * @returns 未钳制的位置数据，如果设备不存在返回 undefined
	 */
	public getUnclamped(inputDevice: T): number | undefined {
		return this.axisData.get(inputDevice);
	}

	/**
	 * 移除输入设备的位置数据
	 *
	 * @param inputDevice - 输入设备标识
	 * @returns 如果设备之前存在，返回位置数据；否则返回 undefined
	 */
	public remove(inputDevice: T): number | undefined {
		const value = this.axisData.get(inputDevice);
		this.axisData.delete(inputDevice);
		return value;
	}

	/**
	 * 获取所有轴的迭代器
	 *
	 * @returns 所有轴标识的数组
	 */
	public allAxes(): T[] {
		const keys: T[] = [];
		for (const [key] of this.axisData) {
			keys.push(key);
		}
		return keys;
	}

	/**
	 * 获取所有轴及其值的迭代器
	 *
	 * @returns 所有轴标识和值的元组数组
	 */
	public allAxesAndValues(): Array<[T, number]> {
		return [...this.axisData.entries()];
	}

	/**
	 * 清除所有轴数据
	 */
	public clear(): void {
		this.axisData.clear();
	}

	/**
	 * 获取当前存储的轴数量
	 *
	 * @returns 轴的数量
	 */
	public size(): number {
		return this.axisData.size();
	}
}