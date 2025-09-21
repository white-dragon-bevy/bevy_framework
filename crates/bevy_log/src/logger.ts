import { LogLevel, isLevelEnabled } from "./level";
import { LogRecord } from "./record";

/**
 * 日志器接口
 */
export interface Logger {
	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	log(record: LogRecord): void;

	/**
	 * 检查日志级别是否启用
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	isEnabled(level: LogLevel, target: string): boolean;

	/**
	 * 刷新日志缓冲区
	 */
	flush(): void;

	/**
	 * 获取日志器名称
	 * @returns 日志器名称
	 */
	getName(): string;
}

/**
 * 基础日志器实现
 */
export abstract class BaseLogger implements Logger {
	protected name: string;
	protected minLevel: LogLevel = LogLevel.Info;
	protected filters: LogFilter[] = [];

	/**
	 * 创建基础日志器
	 * @param name 日志器名称
	 */
	constructor(name: string) {
		this.name = name;
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public abstract log(record: LogRecord): void;

	/**
	 * 检查日志级别是否启用
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		// 首先检查级别
		if (!isLevelEnabled(level, this.minLevel)) {
			return false;
		}

		// 然后检查过滤器
		for (const filter of this.filters) {
			if (!filter.isEnabled(level, target)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 刷新日志缓冲区
	 */
	public flush(): void {
		// 默认实现为空
	}

	/**
	 * 获取日志器名称
	 * @returns 日志器名称
	 */
	public getName(): string {
		return this.name;
	}

	/**
	 * 设置最小日志级别
	 * @param level 最小日志级别
	 * @returns 日志器自身
	 */
	public setMinLevel(level: LogLevel): this {
		this.minLevel = level;
		return this;
	}

	/**
	 * 添加过滤器
	 * @param filter 日志过滤器
	 * @returns 日志器自身
	 */
	public addFilter(filter: LogFilter): this {
		this.filters.push(filter);
		return this;
	}

	/**
	 * 清除所有过滤器
	 * @returns 日志器自身
	 */
	public clearFilters(): this {
		this.filters.clear();
		return this;
	}
}

/**
 * 日志过滤器接口
 */
export interface LogFilter {
	/**
	 * 检查日志是否应该被记录
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	isEnabled(level: LogLevel, target: string): boolean;
}

/**
 * 多日志器组合
 */
export class CompositeLogger implements Logger {
	private loggers: Logger[] = [];
	private name: string;

	/**
	 * 创建组合日志器
	 * @param name 日志器名称
	 */
	constructor(name = "CompositeLogger") {
		this.name = name;
	}

	/**
	 * 添加日志器
	 * @param logger 日志器
	 * @returns 组合日志器自身
	 */
	public addLogger(logger: Logger): this {
		this.loggers.push(logger);
		return this;
	}

	/**
	 * 移除日志器
	 * @param logger 日志器
	 * @returns 组合日志器自身
	 */
	public removeLogger(logger: Logger): this {
		const index = this.loggers.indexOf(logger);
		if (index !== -1) {
			this.loggers.remove(index);
		}
		return this;
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		for (const logger of this.loggers) {
			if (logger.isEnabled(record.level, record.target)) {
				logger.log(record);
			}
		}
	}

	/**
	 * 检查日志级别是否启用
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果至少有一个日志器启用该级别返回 true
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		for (const logger of this.loggers) {
			if (logger.isEnabled(level, target)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 刷新所有日志器的缓冲区
	 */
	public flush(): void {
		for (const logger of this.loggers) {
			logger.flush();
		}
	}

	/**
	 * 获取日志器名称
	 * @returns 日志器名称
	 */
	public getName(): string {
		return this.name;
	}

	/**
	 * 获取所有子日志器
	 * @returns 日志器数组
	 */
	public getLoggers(): readonly Logger[] {
		return this.loggers;
	}
}

/**
 * 空日志器（用于禁用日志）
 */
export class NullLogger implements Logger {
	private name: string;

	/**
	 * 创建空日志器
	 * @param name 日志器名称
	 */
	constructor(name = "NullLogger") {
		this.name = name;
	}

	/**
	 * 记录日志（不执行任何操作）
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		// 不执行任何操作
	}

	/**
	 * 检查日志级别是否启用（始终返回 false）
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 始终返回 false
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		return false;
	}

	/**
	 * 刷新日志缓冲区（不执行任何操作）
	 */
	public flush(): void {
		// 不执行任何操作
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
 * 缓冲日志器（批量输出日志）
 */
export abstract class BufferedLogger extends BaseLogger {
	private buffer: LogRecord[] = [];
	private bufferSize: number;
	private flushInterval?: thread;

	/**
	 * 创建缓冲日志器
	 * @param name 日志器名称
	 * @param bufferSize 缓冲区大小
	 * @param autoFlushInterval 自动刷新间隔（秒）
	 */
	constructor(name: string, bufferSize = 100, autoFlushInterval?: number) {
		super(name);
		this.bufferSize = bufferSize;

		if (autoFlushInterval !== undefined && autoFlushInterval > 0) {
			this.startAutoFlush(autoFlushInterval);
		}
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		this.buffer.push(record);

		if (this.buffer.size() >= this.bufferSize) {
			this.flush();
		}
	}

	/**
	 * 刷新日志缓冲区
	 */
	public flush(): void {
		if (this.buffer.size() === 0) {
			return;
		}

		const records = [...this.buffer];
		this.buffer.clear();
		this.flushRecords(records);
	}

	/**
	 * 刷新日志记录
	 * @param records 日志记录数组
	 */
	protected abstract flushRecords(records: LogRecord[]): void;

	/**
	 * 启动自动刷新
	 * @param interval 刷新间隔（秒）
	 */
	private startAutoFlush(interval: number): void {
		this.flushInterval = task.spawn(() => {
			while (true) {
				task.wait(interval);
				this.flush();
			}
		});
	}

	/**
	 * 停止自动刷新
	 */
	public stopAutoFlush(): void {
		if (this.flushInterval) {
			task.cancel(this.flushInterval);
			this.flushInterval = undefined;
		}
	}

	/**
	 * 销毁日志器
	 */
	public destroy(): void {
		this.stopAutoFlush();
		this.flush();
	}
}