import { LogLevel } from "./level";

/**
 * 日志记录结构
 */
export interface LogRecord {
	/** 日志级别 */
	readonly level: LogLevel;
	/** 日志消息 */
	readonly message: string;
	/** 日志目标（通常是模块名称） */
	readonly target: string;
	/** 时间戳（tick） */
	readonly timestamp: number;
	/** 附加元数据 */
	readonly metadata?: Record<string, unknown>;
	/** 调用位置信息 */
	readonly location?: LogLocation;
}

/**
 * 日志调用位置信息
 */
export interface LogLocation {
	/** 文件路径 */
	readonly file?: string;
	/** 行号 */
	readonly line?: number;
	/** 列号 */
	readonly column?: number;
	/** 函数名 */
	readonly functionName?: string;
}

/**
 * 日志记录构建器
 */
export class LogRecordBuilder {
	private level: LogLevel = LogLevel.Info;
	private message = "";
	private target = "";
	private timestamp: number = tick();
	private metadata?: Record<string, unknown>;
	private location?: LogLocation;

	/**
	 * 设置日志级别
	 * @param level 日志级别
	 * @returns 构建器自身
	 */
	public setLevel(level: LogLevel): this {
		this.level = level;
		return this;
	}

	/**
	 * 设置日志消息
	 * @param message 日志消息
	 * @returns 构建器自身
	 */
	public setMessage(message: string): this {
		this.message = message;
		return this;
	}

	/**
	 * 设置日志目标
	 * @param target 日志目标
	 * @returns 构建器自身
	 */
	public setTarget(target: string): this {
		this.target = target;
		return this;
	}

	/**
	 * 设置时间戳
	 * @param timestamp 时间戳
	 * @returns 构建器自身
	 */
	public setTimestamp(timestamp: number): this {
		this.timestamp = timestamp;
		return this;
	}

	/**
	 * 设置元数据
	 * @param metadata 元数据
	 * @returns 构建器自身
	 */
	public setMetadata(metadata: Record<string, unknown>): this {
		this.metadata = metadata;
		return this;
	}

	/**
	 * 添加元数据字段
	 * @param key 字段名
	 * @param value 字段值
	 * @returns 构建器自身
	 */
	public addMetadata(key: string, value: unknown): this {
		if (!this.metadata) {
			this.metadata = {};
		}
		this.metadata[key] = value;
		return this;
	}

	/**
	 * 设置调用位置
	 * @param location 调用位置信息
	 * @returns 构建器自身
	 */
	public setLocation(location: LogLocation): this {
		this.location = location;
		return this;
	}

	/**
	 * 构建日志记录
	 * @returns 日志记录
	 */
	public build(): LogRecord {
		return {
			level: this.level,
			message: this.message,
			target: this.target,
			timestamp: this.timestamp,
			metadata: this.metadata,
			location: this.location,
		};
	}
}

/**
 * 创建日志记录
 * @param level 日志级别
 * @param message 日志消息
 * @param target 日志目标
 * @param metadata 附加元数据
 * @returns 日志记录
 */
export function createLogRecord(
	level: LogLevel,
	message: string,
	target: string,
	metadata?: Record<string, unknown>,
): LogRecord {
	return new LogRecordBuilder()
		.setLevel(level)
		.setMessage(message)
		.setTarget(target)
		.setMetadata(metadata ?? {})
		.build();
}

/**
 * 格式化日志记录的元数据
 * @param metadata 元数据
 * @returns 格式化后的字符串
 */
export function formatMetadata(metadata?: Record<string, unknown>): string {
	if (!metadata || typeIs(metadata, "table") === false) {
		return "";
	}

	const pairs: string[] = [];
	for (const [key, value] of pairs(metadata)) {
		let valueStr: string;
		if (typeIs(value, "string")) {
			valueStr = value;
		} else if (typeIs(value, "number") || typeIs(value, "boolean")) {
			valueStr = tostring(value);
		} else {
			valueStr = tostring(value);
		}
		pairs.push(`${key}=${valueStr}`);
	}

	return pairs.size() > 0 ? ` {${pairs.join(", ")}}` : "";
}

/**
 * 格式化日志记录的位置信息
 * @param location 位置信息
 * @returns 格式化后的字符串
 */
export function formatLocation(location?: LogLocation): string {
	if (!location) {
		return "";
	}

	const parts: string[] = [];

	if (location.file) {
		parts.push(location.file);
	}

	if (location.line !== undefined) {
		if (location.column !== undefined) {
			parts.push(`${location.line}:${location.column}`);
		} else {
			parts.push(`${location.line}`);
		}
	}

	if (location.functionName) {
		parts.push(`in ${location.functionName}`);
	}

	return parts.size() > 0 ? ` [${parts.join(" ")}]` : "";
}