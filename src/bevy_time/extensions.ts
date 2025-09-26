/**
 * 时间插件扩展定义
 * 为 TimePlugin 提供类型安全的扩展接口
 */

import type { Time } from "./time";

/**
 * 核心时间扩展接口
 * 提供时间查询和基本控制功能
 */
export interface TimeExtension {
	/**
	 * 获取时间资源
	 * @returns Time 资源实例
	 */
	getTime(): Time;

	/**
	 * 获取自启动以来的总时间（秒）
	 * @returns 总时间
	 */
	getElapsedSeconds(): number;

	/**
	 * 获取上一帧的增量时间（秒）
	 * @returns 增量时间
	 */
	getDeltaSeconds(): number;

	/**
	 * 获取自启动以来的总时间（毫秒）
	 * @returns 总时间（毫秒）
	 */
	getElapsedMillis(): number;

	/**
	 * 获取上一帧的增量时间（毫秒）
	 * @returns 增量时间（毫秒）
	 */
	getDeltaMillis(): number;
}

/**
 * 时间控制扩展接口
 * 提供高级时间控制功能
 */
export interface TimeControlExtension {
	/**
	 * 暂停时间流逝
	 */
	pause(): void;

	/**
	 * 恢复时间流逝
	 */
	resume(): void;

	/**
	 * 检查时间是否暂停
	 * @returns 是否暂停
	 */
	isPaused(): boolean;

	/**
	 * 设置时间缩放比例
	 * @param scale - 时间缩放比例（1.0 = 正常速度）
	 */
	setTimeScale(scale: number): void;

	/**
	 * 获取当前时间缩放比例
	 * @returns 时间缩放比例
	 */
	getTimeScale(): number;

	/**
	 * 手动推进时间
	 * @param seconds - 要推进的秒数
	 */
	advanceTime(seconds: number): void;

	/**
	 * 重置时间到初始状态
	 */
	reset(): void;
}

/**
 * 时间统计扩展接口
 * 提供时间相关的统计信息
 */
export interface TimeStatsExtension {
	/**
	 * 获取平均 FPS
	 * @returns 平均帧率
	 */
	getAverageFPS(): number;

	/**
	 * 获取瞬时 FPS
	 * @returns 当前帧率
	 */
	getInstantFPS(): number;

	/**
	 * 获取最小帧时间
	 * @returns 最小帧时间（毫秒）
	 */
	getMinFrameTime(): number;

	/**
	 * 获取最大帧时间
	 * @returns 最大帧时间（毫秒）
	 */
	getMaxFrameTime(): number;

	/**
	 * 获取平均帧时间
	 * @returns 平均帧时间（毫秒）
	 */
	getAverageFrameTime(): number;

	/**
	 * 重置统计信息
	 */
	resetStats(): void;
}

/**
 * 声明扩展到全局插件扩展注册表
 */
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		time: TimeExtension;
		time_control: TimeControlExtension;
		time_stats: TimeStatsExtension;
	}
}