import { LogLevel } from "./level";
import { Logger, CompositeLogger, NullLogger } from "./logger";
import { LogRecord, LogRecordBuilder } from "./record";

/**
 * 日志管理器 - 全局日志系统的核心
 */
export class LogManager {
	private static instance?: LogManager;
	private rootLogger: CompositeLogger;
	private globalLevel: LogLevel = LogLevel.Info;
	private namedLoggers: Map<string, LoggerWrapper> = new Map();
	private enabled = true;

	/**
	 * 创建日志管理器
	 */
	constructor() {
		this.rootLogger = new CompositeLogger("RootLogger");
	}

	/**
	 * 获取全局日志管理器实例
	 * @returns 日志管理器实例
	 */
	public static getInstance(): LogManager {
		if (!LogManager.instance) {
			LogManager.instance = new LogManager();
		}
		return LogManager.instance;
	}

	/**
	 * 重置全局日志管理器实例
	 */
	public static resetInstance(): void {
		if (LogManager.instance) {
			LogManager.instance.shutdown();
		}
		LogManager.instance = undefined;
	}

	/**
	 * 添加日志器
	 * @param logger 日志器
	 * @returns 日志管理器自身
	 */
	public addLogger(logger: Logger): this {
		this.rootLogger.addLogger(logger);
		return this;
	}

	/**
	 * 移除日志器
	 * @param logger 日志器
	 * @returns 日志管理器自身
	 */
	public removeLogger(logger: Logger): this {
		this.rootLogger.removeLogger(logger);
		return this;
	}

	/**
	 * 设置全局日志级别
	 * @param level 日志级别
	 * @returns 日志管理器自身
	 */
	public setLevel(level: LogLevel): this {
		this.globalLevel = level;
		return this;
	}

	/**
	 * 获取全局日志级别
	 * @returns 日志级别
	 */
	public getLevel(): LogLevel {
		return this.globalLevel;
	}

	/**
	 * 启用或禁用日志系统
	 * @param enabled 是否启用
	 * @returns 日志管理器自身
	 */
	public setEnabled(enabled: boolean): this {
		this.enabled = enabled;
		return this;
	}

	/**
	 * 检查日志系统是否启用
	 * @returns 是否启用
	 */
	public isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		if (!this.enabled) {
			return;
		}

		if (record.level < this.globalLevel) {
			return;
		}

		this.rootLogger.log(record);
	}

	/**
	 * 检查日志级别是否启用
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	public isLevelEnabled(level: LogLevel, target: string): boolean {
		if (!this.enabled) {
			return false;
		}

		if (level < this.globalLevel) {
			return false;
		}

		return this.rootLogger.isEnabled(level, target);
	}

	/**
	 * 刷新所有日志器的缓冲区
	 */
	public flush(): void {
		this.rootLogger.flush();
	}

	/**
	 * 获取命名日志器
	 * @param name 日志器名称
	 * @returns 日志器包装器
	 */
	public getLogger(name: string): LoggerWrapper {
		let logger = this.namedLoggers.get(name);
		if (!logger) {
			logger = new LoggerWrapper(name, this);
			this.namedLoggers.set(name, logger);
		}
		return logger;
	}

	/**
	 * 关闭日志管理器
	 */
	public shutdown(): void {
		this.flush();
		this.namedLoggers.clear();
		this.enabled = false;
	}

	/**
	 * 获取所有已注册的日志器
	 * @returns 日志器数组
	 */
	public getLoggers(): readonly Logger[] {
		return this.rootLogger.getLoggers();
	}
}

/**
 * 日志器包装器 - 为特定模块提供日志功能
 */
export class LoggerWrapper {
	private name: string;
	private manager: LogManager;
	private localLevel?: LogLevel;

	/**
	 * 创建日志器包装器
	 * @param name 日志器名称
	 * @param manager 日志管理器
	 */
	constructor(name: string, manager: LogManager) {
		this.name = name;
		this.manager = manager;
	}

	/**
	 * 设置本地日志级别
	 * @param level 日志级别
	 * @returns 日志器包装器自身
	 */
	public setLevel(level: LogLevel): this {
		this.localLevel = level;
		return this;
	}

	/**
	 * 获取有效的日志级别
	 * @returns 日志级别
	 */
	public getEffectiveLevel(): LogLevel {
		return this.localLevel ?? this.manager.getLevel();
	}

	/**
	 * 检查日志级别是否启用
	 * @param level 日志级别
	 * @returns 如果日志应该被记录返回 true
	 */
	public isEnabled(level: LogLevel): boolean {
		const effectiveLevel = this.getEffectiveLevel();
		if (level < effectiveLevel) {
			return false;
		}
		return this.manager.isLevelEnabled(level, this.name);
	}

	/**
	 * 追踪级别日志
	 * @param message 日志消息
	 * @param metadata 附加元数据
	 */
	public trace(message: string, metadata?: Record<string, unknown>): void {
		this.logWithLevel(LogLevel.Trace, message, metadata);
	}

	/**
	 * 调试级别日志
	 * @param message 日志消息
	 * @param metadata 附加元数据
	 */
	public debug(message: string, metadata?: Record<string, unknown>): void {
		this.logWithLevel(LogLevel.Debug, message, metadata);
	}

	/**
	 * 信息级别日志
	 * @param message 日志消息
	 * @param metadata 附加元数据
	 */
	public info(message: string, metadata?: Record<string, unknown>): void {
		this.logWithLevel(LogLevel.Info, message, metadata);
	}

	/**
	 * 警告级别日志
	 * @param message 日志消息
	 * @param metadata 附加元数据
	 */
	public warn(message: string, metadata?: Record<string, unknown>): void {
		this.logWithLevel(LogLevel.Warn, message, metadata);
	}

	/**
	 * 错误级别日志
	 * @param message 日志消息
	 * @param metadata 附加元数据
	 */
	public error(message: string, metadata?: Record<string, unknown>): void {
		this.logWithLevel(LogLevel.Error, message, metadata);
	}

	/**
	 * 记录指定级别的日志
	 * @param level 日志级别
	 * @param message 日志消息
	 * @param metadata 附加元数据
	 */
	private logWithLevel(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
		if (!this.isEnabled(level)) {
			return;
		}

		const record = new LogRecordBuilder()
			.setLevel(level)
			.setMessage(message)
			.setTarget(this.name)
			.setMetadata(metadata ?? {})
			.build();

		this.manager.log(record);
	}

	/**
	 * 获取日志器名称
	 * @returns 日志器名称
	 */
	public getName(): string {
		return this.name;
	}
}

/**
 * 获取全局日志管理器
 * @returns 日志管理器实例
 */
export function getLogManager(): LogManager {
	return LogManager.getInstance();
}

/**
 * 获取命名日志器
 * @param name 日志器名称
 * @returns 日志器包装器
 */
export function getLogger(name: string): LoggerWrapper {
	return getLogManager().getLogger(name);
}