/**
 * Roblox 平台日志适配层
 * 对应 Rust 的 android_tracing.rs / tracing-wasm / tracing-oslog
 */

import { RunService } from "@rbxts/services";
import { Level, levelToString } from "./level";
import { EnvFilter } from "./filter";

/**
 * 日志记录
 * 表示单条日志事件的完整信息
 * 对应 Rust tracing::Event
 */
export interface LogRecord {
	/** 日志级别 */
	level: Level;
	/** 日志消息内容 */
	message: string;
	/** 模块名称（可选），用于标识日志来源 */
	module?: string;
	/** Unix 时间戳，使用 os.time() 生成 */
	timestamp: number;
	/** 额外的结构化字段，用于附加上下文信息 */
	fields?: Map<string, unknown>;
}

/**
 * 日志层接口
 * 对应 Rust 的 Layer trait
 * 定义日志处理器的标准接口，允许自定义日志输出行为
 *
 * @example
 * ```typescript
 * class CustomLayer implements Layer {
 *     onEvent(record: LogRecord): void {
 *         // 自定义日志处理逻辑
 *         print(`[${record.level}] ${record.message}`);
 *     }
 *
 *     name(): string {
 *         return "CustomLayer";
 *     }
 * }
 * ```
 */
export interface Layer {
	/**
	 * 处理日志记录
	 * 当日志事件发生时被调用
	 * @param record - 日志记录对象，包含日志的所有信息
	 */
	onEvent(record: LogRecord): void;

	/**
	 * 获取层名称
	 * 用于识别和调试日志层
	 * @returns 层的标识名称
	 */
	name(): string;
}

/**
 * Roblox 日志层
 * 将日志输出到 Roblox 控制台（print/warn）
 * 对应 Rust 的 tracing-oslog 或 android_tracing
 * 提供格式化的日志输出，支持时间戳和模块名称
 *
 * @example
 * ```typescript
 * const filter = new EnvFilter("info");
 * const layer = new RobloxLayer(filter, true, true);
 * const subscriber = new LogSubscriber();
 * subscriber.addLayer(layer);
 * ```
 */
export class RobloxLayer implements Layer {
	private filter: EnvFilter;
	private showTimestamp: boolean;
	private showModule: boolean;

	/**
	 * 创建 Roblox 日志层实例
	 * @param filter - 环境过滤器，控制日志输出级别
	 * @param showTimestamp - 是否在日志中显示时间戳，默认为 true
	 * @param showModule - 是否在日志中显示模块名称，默认为 true
	 * @example
	 * ```typescript
	 * const filter = new EnvFilter("debug");
	 * const layer = new RobloxLayer(filter, false, true);
	 * ```
	 */
	constructor(filter: EnvFilter, showTimestamp = true, showModule = true) {
		this.filter = filter;
		this.showTimestamp = showTimestamp;
		this.showModule = showModule;
	}

	/**
	 * 处理日志事件并输出到 Roblox 控制台
	 * 根据级别使用不同的输出函数（print 或 warn）
	 * @param record - 日志记录对象
	 */
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

	/**
	 * 根据日志级别输出到 Roblox 控制台
	 * ERROR 和 WARN 使用 warn()，其他使用 print()
	 * 在 Studio 中会添加 [Server]/[Client] 前缀
	 * @param level - 日志级别
	 * @param message - 格式化后的日志消息
	 */
	private outputToConsole(level: Level, message: string): void {
		// 在 Studio 中添加前缀以便区分
		if (RunService.IsStudio()) {
			const side = RunService.IsServer() ? "[Server]" : "[Client]";
			message = `${side} ${message}`;
		}

		// 根据级别使用不同的输出函数
		switch (level) {
			case Level.ERROR:
				warn(message);
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

	/**
	 * 获取层名称
	 * @returns 层标识名称 "RobloxLayer"
	 */
	name(): string {
		return "RobloxLayer";
	}
}

/**
 * 全局日志订阅器
 * 对应 Rust 的 tracing::subscriber
 * 管理所有日志层并分发日志事件到各个层
 * 采用单例模式，确保全局只有一个订阅器
 *
 * @example
 * ```typescript
 * const subscriber = new LogSubscriber();
 * subscriber.addLayer(new RobloxLayer(filter));
 * LogSubscriber.setGlobalDefault(subscriber);
 * ```
 */
export class LogSubscriber {
	private layers: Array<Layer> = [];
	private static instance?: LogSubscriber;

	/**
	 * 添加日志层
	 * 支持链式调用
	 * @param layer - 要添加的层
	 * @returns 返回自身以支持链式调用
	 * @example
	 * ```typescript
	 * subscriber
	 *     .addLayer(layer1)
	 *     .addLayer(layer2);
	 * ```
	 */
	addLayer(layer: Layer): this {
		this.layers.push(layer);
		return this;
	}

	/**
	 * 记录日志事件
	 * 将事件分发到所有已注册的层
	 * @param record - 日志记录对象
	 */
	logEvent(record: LogRecord): void {
		for (const layer of this.layers) {
			layer.onEvent(record);
		}
	}

	/**
	 * 设置全局默认订阅器
	 * 对应 Rust tracing::subscriber::set_global_default
	 * 只能设置一次，第二次调用会失败
	 * @param subscriber - 订阅器实例
	 * @returns 如果成功设置返回 true，如果已存在返回 false
	 * @example
	 * ```typescript
	 * const subscriber = new LogSubscriber();
	 * if (!LogSubscriber.setGlobalDefault(subscriber)) {
	 *     warn("Logger already initialized");
	 * }
	 * ```
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
	 * @returns 全局订阅器实例，如果未设置返回 undefined
	 */
	static getGlobal(): LogSubscriber | undefined {
		return LogSubscriber.instance;
	}

	/**
	 * 清除全局订阅器
	 * 主要用于单元测试中重置状态
	 * @example
	 * ```typescript
	 * // 在测试的 beforeEach 中调用
	 * LogSubscriber.clearGlobal();
	 * ```
	 */
	static clearGlobal(): void {
		LogSubscriber.instance = undefined;
	}
}

/**
 * 获取调用栈信息（用于 once 功能）
 * 通过 debug.traceback 获取调用位置的文件名和行号
 * @returns 调用位置的唯一标识，格式为 "文件名:行号"
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