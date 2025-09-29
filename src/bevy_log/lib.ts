/**
 * bevy_log 主模块
 * 对应 Rust bevy_log/src/lib.rs
 */

import { App } from "../bevy_app/app";
import { BasePlugin, Plugin } from "../bevy_app/plugin";
import { Level } from "./level";
import { EnvFilter, DEFAULT_FILTER } from "./filter";
import { Layer, LogRecord, LogSubscriber, RobloxLayer } from "./roblox-tracing";
import { RunService } from "@rbxts/services";

/**
 * BoxedLayer 类型
 * 对应 Rust Box<dyn Layer<Registry> + Send + Sync + 'static>
 */
export type BoxedLayer = Layer;

/**
 * BoxedFmtLayer 类型
 * 对应格式化层
 */
export type BoxedFmtLayer = Layer;

import type { ExtensionFactory } from "../bevy_app/app";
import type { World } from "../bevy_ecs";
import type { AppContext } from "../bevy_app/context";

/**
 * LogPlugin 扩展工厂接口
 */
export interface LogPluginExtensionFactories {
	/**
	 * 获取日志管理器工厂
	 */
	getLogManager: ExtensionFactory<() => LogSubscriber | undefined>;
	
	/**
	 * 获取当前日志级别工厂
	 */
	getLogLevel: ExtensionFactory<() => Level>;
}

/**
 * LogPlugin - 日志插件
 * 对应 Rust LogPlugin struct
 *
 * 这个插件是 DefaultPlugins 的一部分。添加这个插件将设置适合目标平台的收集器。
 *
 * 可以通过配置这个插件来自定义日志行为：
 * ```typescript
 * app.addPlugin(new LogPlugin({
 *     level: Level.DEBUG,
 *     filter: "wgpu=error,bevy_render=info,bevy_ecs=trace",
 * }));
 * ```
 *
 * 过滤器格式支持：
 * - "level" - 设置默认级别
 * - "level,module=level,..." - 为特定模块设置不同级别
 *
 * 示例："warn,my_crate=trace" 表示默认 warn 级别，但 my_crate 模块使用 trace 级别
 */
export class LogPlugin extends BasePlugin {
	/** 使用 EnvFilter 格式的过滤器 */
	filter: string;

	/** 过滤"小于"给定级别的日志 */
	level: Level;

	/** 可选添加额外的 Layer 到 tracing 订阅器 */
	customLayer?: (app: App) => BoxedLayer | undefined;

	/** 覆盖默认的格式化层 */
	fmtLayer?: (app: App) => BoxedFmtLayer | undefined;
	
	/** 插件扩展工厂 */
	extension: LogPluginExtensionFactories;

	constructor(config?: Partial<LogPlugin>) {
		super();
		this.filter = config?.filter ?? DEFAULT_FILTER;
		this.level = config?.level ?? Level.INFO;
		this.customLayer = config?.customLayer;
		this.fmtLayer = config?.fmtLayer;
		
		// 初始化扩展工厂
		this.extension = {
			getLogManager: (world: World, context: AppContext, plugin: LogPlugin) => {
				// 返回获取日志管理器的函数，使用 plugin 参数而不是 this
				return () => LogSubscriber.getGlobal();
			},
			getLogLevel: (world: World, context: AppContext, plugin: LogPlugin) => {
				// 使用 plugin 参数获取 level 值，避免 this 指针问题
				const currentLevel = plugin.level;
				// 返回获取日志级别的函数
				return () => currentLevel;
			},
		};
	}

	build(app: App): void {
		// 创建订阅器
		const subscriber = new LogSubscriber();

		// 添加用户自定义层
		if (this.customLayer) {
			const layer = this.customLayer(app);
			if (layer) {
				subscriber.addLayer(layer);
			}
		}

		// 构建默认过滤器
		const levelString = Level[this.level] as keyof typeof Level;
		const defaultFilter = `${levelString.lower()},${this.filter}`;

		// 尝试从环境创建过滤器（在 Roblox 中直接使用默认值）
		const filter = EnvFilter.tryFromDefaultEnv(defaultFilter);

		// 添加格式化层或默认的 Roblox 层
		if (this.fmtLayer) {
			const layer = this.fmtLayer(app);
			if (layer) {
				subscriber.addLayer(layer);
			}
		} else {
			// 使用默认的 Roblox 层
			const robloxLayer = new RobloxLayer(filter);
			subscriber.addLayer(robloxLayer);
		}

		// 设置全局默认订阅器
		const subscriberAlreadySet = !LogSubscriber.setGlobalDefault(subscriber);

		if (subscriberAlreadySet && RunService.IsStudio()) {
			// 只在 Studio 模式下输出警告，避免在生产环境中产生噪音
			warn("Could not set global tracing subscriber as it is already set. Consider disabling LogPlugin.");
		}
	}

	name(): string {
		return "LogPlugin";
	}
}

// 全局日志函数实现

/**
 * 内部日志函数
 * @param level - 日志级别
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 */
function log(level: Level, message: string, module?: string, fields?: Map<string, unknown>): void {
	const subscriber = LogSubscriber.getGlobal();
	if (!subscriber) {
		// 如果没有订阅器，直接输出到控制台
		const levelStr = Level[level];
		const prefix = module ? `[${levelStr}] ${module}: ` : `[${levelStr}] `;
		// 直接使用 Roblox 的 warn 和 print 函数，避免递归调用
		if (level === Level.ERROR || level === Level.WARN) {
			warn(`${prefix}${message}`); // 使用 Roblox 内置的 warn 函数
		} else {
			print(`${prefix}${message}`);
		}
		return;
	}

	const record: LogRecord = {
		level,
		message,
		module,
		timestamp: os.time(),
		fields,
	};

	subscriber.logEvent(record);
}

/**
 * 记录错误级别日志
 * 对应 Rust error! 宏
 * 注意：由于 'error' 是 roblox-ts 保留字，使用 'error' 作为函数名但避免与全局冲突
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 */
export { logError as error };
function logError(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.ERROR, message, module, fields);
}

/**
 * 记录警告级别日志
 * 对应 Rust warn! 宏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 */
export function logWarn(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.WARN, message, module, fields);
}

// 为了兼容性导出别名
export { logWarn as warn };

/**
 * 记录信息级别日志
 * 对应 Rust info! 宏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 */
export function info(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.INFO, message, module, fields);
}

/**
 * 记录调试级别日志
 * 对应 Rust debug! 宏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 */
export function debug(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.DEBUG, message, module, fields);
}

/**
 * 记录追踪级别日志
 * 对应 Rust trace! 宏
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 */
export function trace(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.TRACE, message, module, fields);
}

// Span 函数（在 TypeScript 中简化实现）

/**
 * 创建错误级别的 span
 * 对应 Rust error_span! 宏
 * @param name - Span 名称
 * @returns Span 处理函数
 */
export function errorSpan(name: string): (fn: () => void) => void {
	return (fn: () => void) => {
		log(Level.ERROR, `[SPAN:${name}] Enter`);
		fn();
		log(Level.ERROR, `[SPAN:${name}] Exit`);
	};
}

/**
 * 创建警告级别的 span
 * 对应 Rust warn_span! 宏
 * @param name - Span 名称
 * @returns Span 处理函数
 */
export function warnSpan(name: string): (fn: () => void) => void {
	return (fn: () => void) => {
		logWarn(`[SPAN:${name}] Enter`);
		fn();
		logWarn(`[SPAN:${name}] Exit`);
	};
}

/**
 * 创建信息级别的 span
 * 对应 Rust info_span! 宏
 * @param name - Span 名称
 * @returns Span 处理函数
 */
export function infoSpan(name: string): (fn: () => void) => void {
	return (fn: () => void) => {
		info(`[SPAN:${name}] Enter`);
		fn();
		info(`[SPAN:${name}] Exit`);
	};
}

/**
 * 创建调试级别的 span
 * 对应 Rust debug_span! 宏
 * @param name - Span 名称
 * @returns Span 处理函数
 */
export function debugSpan(name: string): (fn: () => void) => void {
	return (fn: () => void) => {
		debug(`[SPAN:${name}] Enter`);
		fn();
		debug(`[SPAN:${name}] Exit`);
	};
}

/**
 * 创建追踪级别的 span
 * 对应 Rust trace_span! 宏
 * @param name - Span 名称
 * @returns Span 处理函数
 */
export function traceSpan(name: string): (fn: () => void) => void {
	return (fn: () => void) => {
		trace(`[SPAN:${name}] Enter`);
		fn();
		trace(`[SPAN:${name}] Exit`);
	};
}

// 导出所有公共类型
export { Level } from "./level";
export { EnvFilter, DEFAULT_FILTER } from "./filter";
export { Layer, LogRecord, LogSubscriber } from "./roblox-tracing";
