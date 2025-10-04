/**
 * TimePlugin 扩展接口
 * 定义时间插件暴露给 App 的扩展方法
 */

import type { Time, Empty } from "./time";

/**
 * 时间插件扩展接口
 * 提供时间管理和查询的所有方法
 */
export interface TimePluginExtension {
	/**
	 * 获取当前时间
	 * @returns 当前时间对象
	 */
	getCurrent: () => Time<Empty>;

	/**
	 * 获取时间对象
	 * @returns 时间对象
	 */
	getTime: () => Time<Empty>;

	/**
	 * 获取已流逝的秒数
	 * @returns 已流逝的秒数
	 */
	getElapsedSeconds: () => number;

	/**
	 * 获取帧时间增量（秒）
	 * @returns 帧时间增量（秒）
	 */
	getDeltaSeconds: () => number;

	/**
	 * 获取已流逝的毫秒数
	 * @returns 已流逝的毫秒数
	 */
	getElapsedMillis: () => number;

	/**
	 * 获取帧时间增量（毫秒）
	 * @returns 帧时间增量（毫秒）
	 */
	getDeltaMillis: () => number;

	/**
	 * 暂停时间
	 */
	pause: () => void;

	/**
	 * 恢复时间
	 */
	resume: () => void;

	/**
	 * 检查时间是否暂停
	 * @returns 时间是否暂停
	 */
	isPaused: () => boolean;

	/**
	 * 设置时间缩放比例
	 * @param scale - 时间缩放比例
	 */
	setTimeScale: (scale: number) => void;

	/**
	 * 获取时间缩放比例
	 * @returns 时间缩放比例
	 */
	getTimeScale: () => number;

	/**
	 * 手动推进时间（用于测试）
	 * @param seconds - 要推进的秒数
	 */
	advanceTime: (seconds: number) => void;

	/**
	 * 重置时间
	 */
	reset: () => void;

	/**
	 * 获取平均帧率
	 * @returns 平均帧率
	 */
	getAverageFPS: () => number;

	/**
	 * 获取瞬时帧率
	 * @returns 瞬时帧率
	 */
	getInstantFPS: () => number;

	/**
	 * 获取最小帧时间
	 * @returns 最小帧时间（毫秒）
	 */
	getMinFrameTime: () => number;

	/**
	 * 获取最大帧时间
	 * @returns 最大帧时间（毫秒）
	 */
	getMaxFrameTime: () => number;

	/**
	 * 获取平均帧时间
	 * @returns 平均帧时间（毫秒）
	 */
	getAverageFrameTime: () => number;

	/**
	 * 重置统计数据
	 */
	resetStats: () => void;

	/**
	 * 获取帧计数
	 * @returns 帧计数
	 */
	getFrameCount: () => number;
}
