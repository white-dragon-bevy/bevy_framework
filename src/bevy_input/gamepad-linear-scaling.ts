/**
 * Gamepad 线性缩放算法实现
 * 根据 Rust Bevy 实现的死区和活动区线性重映射
 */

/**
 * 应用死区和线性重映射
 * @param value - 原始轴值 [-1, 1]
 * @param settings - 轴配置
 * @returns 处理后的值 [-1, 1]
 */
export function applyDeadzoneAndScaling(value: number, settings: {
	deadzoneLowerbound: number;
	deadzoneUpperbound: number;
	livezoneLowerbound: number;
	livezoneUpperbound: number;
}): number {
	// 限制到 [-1, 1]
	value = math.min(math.max(value, -1.0), 1.0);

	const deadzoneL = settings.deadzoneLowerbound;
	const deadzoneU = settings.deadzoneUpperbound;
	const livezoneL = settings.livezoneLowerbound;
	const livezoneU = settings.livezoneUpperbound;

	// 死区内，返回 0
	if (value >= deadzoneL && value <= deadzoneU) {
		return 0.0;
	}

	// 正向值 (右/上)
	if (value > deadzoneU) {
		// 如果值在活动区上限或之外，钳制到 1.0
		if (value >= livezoneU) {
			return 1.0;
		}

		// 在死区和活动区之间，线性重映射到 [0, 1]
		const range = livezoneU - deadzoneU;

		if (range === 0) {
			return 0.0; // 防止除零
		}

		const normalized = (value - deadzoneU) / range;

		return normalized;
	}

	// 负向值 (左/下)
	// 如果值在活动区下限或之外，钳制到 -1.0
	if (value <= livezoneL) {
		return -1.0;
	}

	// 在死区和活动区之间，线性重映射到 [-1, 0]
	const range = deadzoneL - livezoneL;

	if (range === 0) {
		return 0.0; // 防止除零
	}

	const normalized = (value - deadzoneL) / range;

	return normalized;
}

/**
 * 线性重映射函数
 * 将值从一个范围线性映射到另一个范围
 * @param value - 要映射的值
 * @param oldRange - 原始范围 [min, max]
 * @param newRange - 目标范围 [min, max]
 * @returns 映射后的值
 */
export function linearRemapping(
	value: number,
	oldRange: readonly [number, number],
	newRange: readonly [number, number],
): number {
	const [oldMin, oldMax] = oldRange;
	const [newMin, newMax] = newRange;
	const oldRangeSize = oldMax - oldMin;

	if (oldRangeSize === 0) {
		return newMin;
	}

	return ((value - oldMin) / oldRangeSize) * (newMax - newMin) + newMin;
}