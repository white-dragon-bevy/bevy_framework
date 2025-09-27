/**
 * 时间插件扩展定义
 * 为 TimePlugin 提供类型安全的扩展接口
 */

import type { Time, Empty } from "./time";

/**
 * 统一的时间扩展接口
 * 整合所有时间相关功能
 */
export interface TimeExtension {
	/**
	 * 获取当前时间对象
	 * @returns 当前 Time 对象
	 */
	getCurrent(): Time<Empty>;

	// 基本时间查询功能
	/**
	 * 获取时间资源
	 * @returns Time 资源实例
	 */
	getTime(): Time<Empty>;

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

	// 时间控制功能
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

	// 统计功能
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

	// 帧计数功能
	/**
	 * 获取当前帧数
	 * @returns 自应用启动以来的帧数
	 */
	getFrameCount(): number;
}

/**
 * 声明扩展到全局插件扩展注册表
 */
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		time: TimeExtension;
	}
}