/**
 * 日志级别定义
 * 对应 Rust tracing::Level
 */

/**
 * 日志级别枚举
 * 对应 Rust tracing::Level
 * 数值越小，级别越高（优先级越高）
 * 用于控制日志输出的详细程度
 *
 * @example
 * ```typescript
 * // 设置过滤器只显示 WARN 及以上级别
 * const filter = new EnvFilter("warn");
 *
 * // 根据级别记录日志
 * if (Level.ERROR <= Level.WARN) {
 *     // ERROR 会被记录
 * }
 * ```
 */
export enum Level {
	/** 错误级别 - 最高优先级，用于需要立即关注的错误情况 */
	ERROR = 1,
	/** 警告级别 - 用于潜在问题或不推荐的使用方式 */
	WARN = 2,
	/** 信息级别 - 默认级别，用于常规运行信息和重要事件 */
	INFO = 3,
	/** 调试级别 - 用于开发调试时输出详细信息 */
	DEBUG = 4,
	/** 追踪级别 - 最低优先级，用于输出最详细的跟踪信息 */
	TRACE = 5,
}

/**
 * 获取日志级别的字符串表示
 * 将枚举值转换为可读的字符串
 * @param level - 日志级别枚举值
 * @returns 级别的字符串表示（大写）
 * @example
 * ```typescript
 * levelToString(Level.ERROR); // "ERROR"
 * levelToString(Level.INFO); // "INFO"
 * ```
 */
export function levelToString(level: Level): string {
	switch (level) {
		case Level.ERROR:
			return "ERROR";
		case Level.WARN:
			return "WARN";
		case Level.INFO:
			return "INFO";
		case Level.DEBUG:
			return "DEBUG";
		case Level.TRACE:
			return "TRACE";
		default:
			return "UNKNOWN";
	}
}

/**
 * 从字符串解析日志级别
 * 不区分大小写，支持常见的级别名称
 * @param str - 级别字符串（不区分大小写）
 * @returns 日志级别枚举值，如果无法解析返回 undefined
 * @example
 * ```typescript
 * parseLevel("error"); // Level.ERROR
 * parseLevel("INFO"); // Level.INFO
 * parseLevel("Debug"); // Level.DEBUG
 * parseLevel("invalid"); // undefined
 * ```
 */
export function parseLevel(str: string): Level | undefined {
	const upperStr = str.upper();
	switch (upperStr) {
		case "ERROR":
			return Level.ERROR;
		case "WARN":
			return Level.WARN;
		case "INFO":
			return Level.INFO;
		case "DEBUG":
			return Level.DEBUG;
		case "TRACE":
			return Level.TRACE;
		default:
			return undefined;
	}
}

/**
 * 比较两个日志级别
 * 检查级别 a 是否应该被记录（当目标级别为 b 时）
 * @param a - 要检查的日志级别
 * @param b - 目标（最大）日志级别
 * @returns 如果 a 的优先级高于或等于 b 返回 true，否则返回 false
 * @example
 * ```typescript
 * // 当目标级别为 WARN 时
 * isLevelEnabled(Level.ERROR, Level.WARN); // true (ERROR 会被记录)
 * isLevelEnabled(Level.WARN, Level.WARN); // true (WARN 会被记录)
 * isLevelEnabled(Level.INFO, Level.WARN); // false (INFO 不会被记录)
 * ```
 */
export function isLevelEnabled(a: Level, b: Level): boolean {
	return a <= b;
}