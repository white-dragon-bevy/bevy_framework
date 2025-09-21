/**
 * 日志级别枚举，数字越小级别越低
 */
export enum LogLevel {
	/** 追踪级别 - 最详细的日志输出 */
	Trace = 0,
	/** 调试级别 - 调试信息 */
	Debug = 1,
	/** 信息级别 - 常规信息 */
	Info = 2,
	/** 警告级别 - 警告信息 */
	Warn = 3,
	/** 错误级别 - 错误信息 */
	Error = 4,
}

/**
 * 日志级别名称映射
 */
export const LogLevelName: Record<LogLevel, string> = {
	[LogLevel.Trace]: "TRACE",
	[LogLevel.Debug]: "DEBUG",
	[LogLevel.Info]: "INFO",
	[LogLevel.Warn]: "WARN",
	[LogLevel.Error]: "ERROR",
};

/**
 * 日志级别颜色映射（用于控制台输出）
 */
export const LogLevelColor: Record<LogLevel, string> = {
	[LogLevel.Trace]: "240,240,240", // 浅灰色
	[LogLevel.Debug]: "150,150,255", // 浅蓝色
	[LogLevel.Info]: "100,200,100", // 绿色
	[LogLevel.Warn]: "255,200,50", // 黄色
	[LogLevel.Error]: "255,100,100", // 红色
};

/**
 * 解析日志级别字符串
 * @param level 日志级别字符串
 * @returns 日志级别枚举值，如果无法解析返回 undefined
 */
export function parseLogLevel(level: string): LogLevel | undefined {
	const upperLevel = level.upper();
	switch (upperLevel) {
		case "TRACE":
			return LogLevel.Trace;
		case "DEBUG":
			return LogLevel.Debug;
		case "INFO":
			return LogLevel.Info;
		case "WARN":
		case "WARNING":
			return LogLevel.Warn;
		case "ERROR":
			return LogLevel.Error;
		default:
			return undefined;
	}
}

/**
 * 判断日志级别是否启用
 * @param level 要检查的日志级别
 * @param minLevel 最小日志级别
 * @returns 如果日志级别大于等于最小级别返回 true
 */
export function isLevelEnabled(level: LogLevel, minLevel: LogLevel): boolean {
	return level >= minLevel;
}

/**
 * 获取日志级别的显示名称
 * @param level 日志级别
 * @returns 日志级别名称
 */
export function getLevelName(level: LogLevel): string {
	return LogLevelName[level] ?? "UNKNOWN";
}

/**
 * 获取日志级别的颜色值
 * @param level 日志级别
 * @returns RGB颜色字符串
 */
export function getLevelColor(level: LogLevel): string {
	return LogLevelColor[level] ?? "255,255,255";
}