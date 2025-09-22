/**
 * 日志级别定义
 * 对应 Rust tracing::Level
 */

/**
 * 日志级别枚举
 * 数值越小，级别越高
 */
export enum Level {
	/** 错误级别 - 最高优先级 */
	ERROR = 1,
	/** 警告级别 */
	WARN = 2,
	/** 信息级别 */
	INFO = 3,
	/** 调试级别 */
	DEBUG = 4,
	/** 追踪级别 - 最低优先级 */
	TRACE = 5,
}

/**
 * 获取日志级别的字符串表示
 * @param level - 日志级别
 * @returns 级别的字符串表示
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
 * @param str - 级别字符串（不区分大小写）
 * @returns 日志级别，如果无法解析返回 undefined
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
 * @param a - 第一个级别
 * @param b - 第二个级别
 * @returns a 是否高于或等于 b
 */
export function isLevelEnabled(a: Level, b: Level): boolean {
	return a <= b;
}