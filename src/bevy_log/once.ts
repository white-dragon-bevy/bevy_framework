/**
 * Once 日志函数实现
 * 对应 Rust bevy_log/src/once.rs
 *
 * 这些函数在每个调用位置只记录一次日志，
 * 对于在每帧都调用的系统中的日志记录很有用。
 */

import { error as logError, warn, info, debug, trace } from "./lib";
import { getCallSite } from "./roblox-tracing";

/**
 * 记录已经调用过的位置
 */
const calledSites = new Set<string>();

/**
 * once 辅助函数
 * 对应 Rust bevy_utils::once! 宏
 * 确保给定函数在每个调用位置只执行一次
 * 通过调用栈信息识别调用位置，即使在循环中调用也只执行一次
 * @param fn - 要执行的函数
 * @example
 * ```typescript
 * for (let i = 0; i < 100; i++) {
 *     once(() => {
 *         print("This will only print once");
 *     });
 * }
 * ```
 */
function once(fn: () => void): void {
	const callSite = getCallSite();
	if (!calledSites.has(callSite)) {
		calledSites.add(callSite);
		fn();
	}
}

/**
 * 每个调用位置只记录一次追踪级别日志
 * 对应 Rust trace_once! 宏
 * 适用于在每帧执行的系统中避免日志刷屏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * function updateSystem() {
 *     traceOnce("System started", "MySystem");
 * }
 * ```
 */
export function traceOnce(
	message: string,
	module?: string,
	fields?: Map<string, unknown>,
): void {
	once(() => trace(message, module, fields));
}

/**
 * 每个调用位置只记录一次调试级别日志
 * 对应 Rust debug_once! 宏
 * 适用于在每帧执行的系统中避免日志刷屏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * function renderSystem() {
 *     debugOnce("Rendering initialized", "RenderSystem");
 * }
 * ```
 */
export function debugOnce(
	message: string,
	module?: string,
	fields?: Map<string, unknown>,
): void {
	once(() => debug(message, module, fields));
}

/**
 * 每个调用位置只记录一次信息级别日志
 * 对应 Rust info_once! 宏
 * 适用于在每帧执行的系统中避免日志刷屏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * function physicsSystem() {
 *     infoOnce("Physics system initialized", "PhysicsSystem");
 * }
 * ```
 */
export function infoOnce(message: string, module?: string, fields?: Map<string, unknown>): void {
	once(() => info(message, module, fields));
}

/**
 * 每个调用位置只记录一次警告级别日志
 * 对应 Rust warn_once! 宏
 * 适用于在每帧执行的系统中避免日志刷屏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * function validateSystem() {
 *     warnOnce("Deprecated API usage detected", "ValidationSystem");
 * }
 * ```
 */
export function warnOnce(message: string, module?: string, fields?: Map<string, unknown>): void {
	once(() => warn(message, module, fields));
}

/**
 * 每个调用位置只记录一次错误级别日志
 * 对应 Rust error_once! 宏
 * 适用于在每帧执行的系统中避免日志刷屏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * function dataLoadSystem() {
 *     errorOnce("Failed to load critical data", "DataSystem");
 * }
 * ```
 */
export function errorOnce(
	message: string,
	module?: string,
	fields?: Map<string, unknown>,
): void {
	once(() => logError(message, module, fields));
}

/**
 * 清除所有已记录的调用位置
 * 主要用于单元测试中重置状态
 * 调用后，之前使用 once 系列函数的位置将再次执行
 * @example
 * ```typescript
 * // 在测试的 beforeEach 中调用
 * clearOnceCache();
 * ```
 */
export function clearOnceCache(): void {
	calledSites.clear();
}

// 导出 once 函数供外部使用
export { once };