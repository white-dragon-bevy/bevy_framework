/**
 * Roblox 平台日志适配层
 * 对应 Rust 的 android_tracing.rs / tracing-wasm / tracing-oslog
 */

import { RunService } from "@rbxts/services";
import { Level, levelToString } from "./level";
import { EnvFilter } from "./filter";

/**
 * 日志记录
 */
export interface LogRecord {
	/** 日志级别 */
	level: Level;
	/** 日志消息 */
	message: string;
	/** 模块名称（可选） */
	module?: string;
	/** 时间戳 */
	timestamp: number;
	/** 额外的字段 */
	fields?: Map<string, unknown>;
}

/**
 * 日志层接口
 * 对应 Rust 的 Layer trait
 */
export interface Layer {
	/** 处理日志记录 */
	onEvent(record: LogRecord): void;
	/** 层名称 */
	name(): string;
}

/**
 * Roblox 日志层
 * 将日志输出到 Roblox 控制台
 */
export class RobloxLayer implements Layer {
	private filter: EnvFilter;
	private showTimestamp: boolean;
	private showModule: boolean;

	constructor(filter: EnvFilter, showTimestamp = true, showModule = true) {
		this.filter = filter;
		this.showTimestamp = showTimestamp;
		this.showModule = showModule;
	}

	onEvent(record: LogRecord): void {
		// 检查是否应该记录
		if (!this.filter.isEnabled(record.level, record.module)) {
			return;
		}

		// 格式化消息
		let formattedMessage = "";

		// 添加时间戳
		if (this.showTimestamp) {
			const time = os.date("%H:%M:%S", record.timestamp);
			formattedMessage += `[${time}] `;
		}

		// 添加级别
		formattedMessage += `[${levelToString(record.level)}]`;

		// 添加模块名
		if (this.showModule && record.module) {
			formattedMessage += ` ${record.module}:`;
		}

		// 添加消息
		formattedMessage += ` ${record.message}`;

		// 添加额外字段
		if (record.fields && record.fields.size() > 0) {
			const fields: string[] = [];
			record.fields.forEach((value, key) => {
				fields.push(`${key}=${tostring(value)}`);
			});
			formattedMessage += ` { ${fields.join(", ")} }`;
		}

		// 根据级别输出到不同的控制台
		this.outputToConsole(record.level, formattedMessage);
	}

	private outputToConsole(level: Level, message: string): void {
		// 在 Studio 中添加前缀以便区分
		if (RunService.IsStudio()) {
			const side = RunService.IsServer() ? "[Server]" : "[Client]";
			message = `${side} ${message}`;
		}

		// 根据级别使用不同的输出函数
		switch (level) {
			case Level.ERROR:
				error(message);
				break;
			case Level.WARN:
				warn(message);
				break;
			case Level.INFO:
				print(message);
				break;
			case Level.DEBUG:
			case Level.TRACE:
				// 只在调试模式下输出 DEBUG 和 TRACE 级别
				if (RunService.IsStudio()) {
					print(message);
				}
				break;
		}
	}

	name(): string {
		return "RobloxLayer";
	}
}

/**
 * 全局日志订阅器
 * 对应 Rust 的 tracing::subscriber
 */
export class LogSubscriber {
	private layers: Layer[] = [];
	private static instance?: LogSubscriber;

	/**
	 * 添加日志层
	 * @param layer - 要添加的层
	 */
	addLayer(layer: Layer): this {
		this.layers.push(layer);
		return this;
	}

	/**
	 * 记录日志事件
	 * @param record - 日志记录
	 */
	logEvent(record: LogRecord): void {
		for (const layer of this.layers) {
			layer.onEvent(record);
		}
	}

	/**
	 * 设置全局默认订阅器
	 * 对应 Rust tracing::subscriber::set_global_default
	 * @param subscriber - 订阅器实例
	 * @returns 是否设置成功
	 */
	static setGlobalDefault(subscriber: LogSubscriber): boolean {
		if (LogSubscriber.instance) {
			return false; // 已经设置过了
		}
		LogSubscriber.instance = subscriber;
		return true;
	}

	/**
	 * 获取全局订阅器
	 * @returns 全局订阅器实例
	 */
	static getGlobal(): LogSubscriber | undefined {
		return LogSubscriber.instance;
	}

	/**
	 * 清除全局订阅器（用于测试）
	 */
	static clearGlobal(): void {
		LogSubscriber.instance = undefined;
	}
}


/**
 * 获取调用栈信息（用于 once 功能）
 * @returns 调用位置的唯一标识
 */
export function getCallSite(): string {
	const traceback = debug.traceback("", 3);
	// 提取文件名和行号作为唯一标识
	const matches = traceback.match("([^:]+):(%d+)");
	if (matches && matches.size() >= 3) {
		return `${matches[1]}:${matches[2]}`;
	}
	return traceback;
}