import { LogLevel } from "./level";
import { getLogger } from "./manager";
import { LogRecordBuilder } from "./record";

/**
 * 日志宏工具集
 */
export class LogMacros {
	private static onceCache = new Set<string>();

	/**
	 * 生成调用位置的唯一键
	 * @returns 唯一键
	 */
	private static getLocationKey(): string {
		const info = debug.info(3, "sl");
		if (!info) return "unknown";
		return `${info.source}:${info.currentline}`;
	}

	/**
	 * 检查是否应该记录（用于 once 宏）
	 * @returns 是否应该记录
	 */
	private static shouldLogOnce(): boolean {
		const key = this.getLocationKey();
		if (this.onceCache.has(key)) {
			return false;
		}
		this.onceCache.add(key);
		return true;
	}

	/**
	 * 获取调用位置信息
	 * @returns 位置信息
	 */
	private static getLocation(): { file?: string; line?: number; functionName?: string } {
		const info = debug.info(3, "nSl");
		if (!info) return {};

		return {
			file: info.source as string | undefined,
			line: info.currentline as number | undefined,
			functionName: info.name as string | undefined,
		};
	}
}

/**
 * 追踪级别日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function trace(target: string, message: string, metadata?: Record<string, unknown>): void {
	const logger = getLogger(target);
	if (logger.isEnabled(LogLevel.Trace)) {
		logger.trace(message, metadata);
	}
}

/**
 * 调试级别日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function debug(target: string, message: string, metadata?: Record<string, unknown>): void {
	const logger = getLogger(target);
	if (logger.isEnabled(LogLevel.Debug)) {
		logger.debug(message, metadata);
	}
}

/**
 * 信息级别日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function info(target: string, message: string, metadata?: Record<string, unknown>): void {
	const logger = getLogger(target);
	if (logger.isEnabled(LogLevel.Info)) {
		logger.info(message, metadata);
	}
}

/**
 * 警告级别日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function warn(target: string, message: string, metadata?: Record<string, unknown>): void {
	const logger = getLogger(target);
	if (logger.isEnabled(LogLevel.Warn)) {
		logger.warn(message, metadata);
	}
}

/**
 * 错误级别日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function error(target: string, message: string, metadata?: Record<string, unknown>): void {
	const logger = getLogger(target);
	if (logger.isEnabled(LogLevel.Error)) {
		logger.error(message, metadata);
	}
}

/**
 * 仅记录一次的追踪日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function traceOnce(target: string, message: string, metadata?: Record<string, unknown>): void {
	if (LogMacros.shouldLogOnce()) {
		trace(target, message, metadata);
	}
}

/**
 * 仅记录一次的调试日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function debugOnce(target: string, message: string, metadata?: Record<string, unknown>): void {
	if (LogMacros.shouldLogOnce()) {
		debug(target, message, metadata);
	}
}

/**
 * 仅记录一次的信息日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function infoOnce(target: string, message: string, metadata?: Record<string, unknown>): void {
	if (LogMacros.shouldLogOnce()) {
		info(target, message, metadata);
	}
}

/**
 * 仅记录一次的警告日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function warnOnce(target: string, message: string, metadata?: Record<string, unknown>): void {
	if (LogMacros.shouldLogOnce()) {
		warn(target, message, metadata);
	}
}

/**
 * 仅记录一次的错误日志
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function errorOnce(target: string, message: string, metadata?: Record<string, unknown>): void {
	if (LogMacros.shouldLogOnce()) {
		error(target, message, metadata);
	}
}

/**
 * 条件日志
 * @param condition 条件
 * @param level 日志级别
 * @param target 日志目标
 * @param message 日志消息
 * @param metadata 附加元数据
 */
export function logIf(
	condition: boolean,
	level: LogLevel,
	target: string,
	message: string,
	metadata?: Record<string, unknown>,
): void {
	if (!condition) return;

	const logger = getLogger(target);
	if (!logger.isEnabled(level)) return;

	switch (level) {
		case LogLevel.Trace:
			logger.trace(message, metadata);
			break;
		case LogLevel.Debug:
			logger.debug(message, metadata);
			break;
		case LogLevel.Info:
			logger.info(message, metadata);
			break;
		case LogLevel.Warn:
			logger.warn(message, metadata);
			break;
		case LogLevel.Error:
			logger.error(message, metadata);
			break;
	}
}

/**
 * 性能日志（自动记录执行时间）
 * @param target 日志目标
 * @param name 操作名称
 * @param fn 要执行的函数
 * @returns 函数返回值
 */
export function logPerformance<T>(target: string, name: string, fn: () => T): T {
	const logger = getLogger(target);
	if (!logger.isEnabled(LogLevel.Debug)) {
		return fn();
	}

	const startTime = tick();
	try {
		const result = fn();
		const duration = tick() - startTime;
		logger.debug(`${name} completed`, { duration: duration / 30 });
		return result;
	} catch (err) {
		const duration = tick() - startTime;
		logger.error(`${name} failed`, { duration: duration / 30, error: tostring(err) });
		throw err;
	}
}

/**
 * 异步性能日志
 * @param target 日志目标
 * @param name 操作名称
 * @param fn 要执行的异步函数
 * @returns Promise
 */
export async function logPerformanceAsync<T>(
	target: string,
	name: string,
	fn: () => Promise<T>,
): Promise<T> {
	const logger = getLogger(target);
	if (!logger.isEnabled(LogLevel.Debug)) {
		return fn();
	}

	const startTime = tick();
	try {
		const result = await fn();
		const duration = tick() - startTime;
		logger.debug(`${name} completed`, { duration: duration / 30 });
		return result;
	} catch (err) {
		const duration = tick() - startTime;
		logger.error(`${name} failed`, { duration: duration / 30, error: tostring(err) });
		throw err;
	}
}

/**
 * 断言日志
 * @param condition 条件
 * @param target 日志目标
 * @param message 错误消息
 * @param metadata 附加元数据
 */
export function logAssert(
	condition: boolean,
	target: string,
	message: string,
	metadata?: Record<string, unknown>,
): void {
	if (!condition) {
		const logger = getLogger(target);
		logger.error(`Assertion failed: ${message}`, metadata);
		error(`Assertion failed: ${message}`);
	}
}

/**
 * 创建带上下文的日志器
 * @param target 日志目标
 * @param context 上下文数据
 * @returns 日志函数集合
 */
export function createContextLogger(target: string, context: Record<string, unknown>) {
	const logger = getLogger(target);

	return {
		trace: (message: string, metadata?: Record<string, unknown>) =>
			logger.trace(message, { ...context, ...metadata }),
		debug: (message: string, metadata?: Record<string, unknown>) =>
			logger.debug(message, { ...context, ...metadata }),
		info: (message: string, metadata?: Record<string, unknown>) =>
			logger.info(message, { ...context, ...metadata }),
		warn: (message: string, metadata?: Record<string, unknown>) =>
			logger.warn(message, { ...context, ...metadata }),
		error: (message: string, metadata?: Record<string, unknown>) =>
			logger.error(message, { ...context, ...metadata }),
	};
}

/**
 * 创建带前缀的日志器
 * @param target 日志目标
 * @param prefix 消息前缀
 * @returns 日志函数集合
 */
export function createPrefixedLogger(target: string, prefix: string) {
	const logger = getLogger(target);

	return {
		trace: (message: string, metadata?: Record<string, unknown>) =>
			logger.trace(`[${prefix}] ${message}`, metadata),
		debug: (message: string, metadata?: Record<string, unknown>) =>
			logger.debug(`[${prefix}] ${message}`, metadata),
		info: (message: string, metadata?: Record<string, unknown>) =>
			logger.info(`[${prefix}] ${message}`, metadata),
		warn: (message: string, metadata?: Record<string, unknown>) =>
			logger.warn(`[${prefix}] ${message}`, metadata),
		error: (message: string, metadata?: Record<string, unknown>) =>
			logger.error(`[${prefix}] ${message}`, metadata),
	};
}