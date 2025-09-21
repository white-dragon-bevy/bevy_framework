/**
 * @packageDocumentation
 * Bevy Log - 高性能分级日志系统
 *
 * 提供完整的日志记录、过滤、格式化和输出功能，
 * 适用于 Roblox 游戏开发的各种场景。
 *
 * @example
 * ```typescript
 * import { getLogger, LogLevel, ConsoleLogger } from "@/crates/bevy_log";
 *
 * // 获取日志器
 * const logger = getLogger("MyGame.Player");
 *
 * // 记录各级别日志
 * logger.trace("Detailed trace information");
 * logger.debug("Debug information");
 * logger.info("Player joined the game");
 * logger.warn("Low health warning");
 * logger.error("Failed to save game");
 *
 * // 带元数据的日志
 * logger.info("Player action", {
 *     playerId: 12345,
 *     action: "jump",
 *     position: Vector3.new(10, 5, 0)
 * });
 * ```
 */

// 核心导出
export { LogLevel, LogLevelName, LogLevelColor, parseLogLevel, isLevelEnabled, getLevelName, getLevelColor } from "./level";
export { LogRecord, LogLocation, LogRecordBuilder, createLogRecord, formatMetadata, formatLocation } from "./record";
export { Logger, BaseLogger, LogFilter, CompositeLogger, NullLogger, BufferedLogger } from "./logger";
export { LogManager, LoggerWrapper, getLogManager, getLogger } from "./manager";

// 过滤器导出
export { TargetFilter, RegexFilter, CompositeFilter, RateLimitFilter } from "./filter";

// 格式化器导出
export {
	LogFormatter,
	SimpleFormatter,
	ColorFormatter,
	JsonFormatter,
	CustomFormatter,
	CompactFormatter,
	DevelopmentFormatter,
	ProductionFormatter,
} from "./formatter";

// 输出目标导出
export { ConsoleLogger, StudioLogger, InGameConsoleLogger, DeveloperConsoleLogger } from "./targets/console";
export { RemoteLogger, RemoteLoggerConfig, WebhookLogger, AnalyticsLogger } from "./targets/remote";

// 宏和工具导出
export {
	trace,
	debug,
	info,
	warn,
	error,
	traceOnce,
	debugOnce,
	infoOnce,
	warnOnce,
	errorOnce,
	logIf,
	logPerformance,
	logPerformanceAsync,
	logAssert,
	createContextLogger,
	createPrefixedLogger,
} from "./macros";

// 插件导出
export { LogPlugin } from "./plugin";

// 预设配置导出
export { LogPresets } from "./presets";

// 类型导出
export type { LogFilter } from "./logger";
export type { LogFormatter } from "./formatter";