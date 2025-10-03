/**
 * bevy_log 主模块
 * 对应 Rust bevy_log/src/lib.rs
 */

import { App } from "../bevy_app/app";
import { Plugin, plugin } from "../bevy_app/plugin";
import { Level } from "./level";
import { EnvFilter, DEFAULT_FILTER } from "./filter";
import { Layer, LogRecord, LogSubscriber, RobloxLayer } from "./roblox-tracing";
import { RunService } from "@rbxts/services";

/**
 * BoxedLayer 类型
 * 表示动态分配的日志层对象
 */
export type BoxedLayer = Layer;

/**
 * BoxedFmtLayer 类型
 * 对应格式化层
 * 表示负责格式化输出的日志层
 */
export type BoxedFmtLayer = Layer;

import type { World } from "../bevy_ecs";
import type { Context } from "../bevy_ecs";
import { LogPluginExtension } from "./extension";



/**
 * LogPlugin 配置接口
 * 用于函数式和 class 插件的配置
 */
export interface LogPluginConfig {
	/** 使用 EnvFilter 格式的过滤器 */
	filter?: string;
	/** 过滤"小于"给定级别的日志 */
	level?: Level;
	/** 可选添加额外的 Layer 到 tracing 订阅器 */
	customLayer?: (app: App) => BoxedLayer | undefined;
	/** 覆盖默认的格式化层 */
	fmtLayer?: (app: App) => BoxedFmtLayer | undefined;
}


// 全局日志函数实现

/**
 * 内部日志函数
 * 统一处理所有级别的日志输出
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
 * 用于记录需要立即关注的错误情况
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * error("Failed to load configuration");
 * error("Database connection failed", "MyModule");
 * ```
 */
export { logError as error };
function logError(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.ERROR, message, module, fields);
}

/**
 * 记录警告级别日志
 * 对应 Rust warn! 宏
 * 用于记录潜在问题或不推荐的使用方式
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * logWarn("Deprecated function called");
 * logWarn("Low memory warning", "MemoryManager");
 * ```
 */
export function logWarn(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.WARN, message, module, fields);
}

// 为了兼容性导出别名
export { logWarn as warn };

/**
 * 记录信息级别日志
 * 对应 Rust info! 宏
 * 用于记录常规运行信息和重要事件
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * info("Server started successfully");
 * info("Player connected", "NetworkManager");
 * ```
 */
export function info(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.INFO, message, module, fields);
}

/**
 * 记录调试级别日志
 * 对应 Rust debug! 宏
 * 用于开发调试时输出详细信息
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * debug("Variable value: 42");
 * debug("State transition detected", "StateMachine");
 * ```
 */
export function debug(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.DEBUG, message, module, fields);
}

/**
 * 记录追踪级别日志
 * 对应 Rust trace! 宏
 * 用于输出最详细的跟踪信息，通常只在深度调试时启用
 * @param message - 日志消息
 * @param module - 模块名称（可选）
 * @param fields - 额外字段（可选）
 * @example
 * ```typescript
 * trace("Function entry");
 * trace("Loop iteration", "Algorithm");
 * ```
 */
export function trace(message: string, module?: string, fields?: Map<string, unknown>): void {
	log(Level.TRACE, message, module, fields);
}

// Span 函数（在 TypeScript 中简化实现）

/**
 * 创建错误级别的 span
 * 对应 Rust error_span! 宏，用于追踪代码执行区域
 * @param name - Span 名称，用于标识代码区域
 * @returns Span 处理函数，接收要执行的函数并在进入/退出时记录日志
 * @example
 * ```typescript
 * const span = errorSpan("critical_operation");
 * span(() => {
 *     // 执行关键操作
 * });
 * ```
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
 * 对应 Rust warn_span! 宏，用于追踪可能有问题的代码区域
 * @param name - Span 名称，用于标识代码区域
 * @returns Span 处理函数，接收要执行的函数并在进入/退出时记录日志
 * @example
 * ```typescript
 * const span = warnSpan("deprecated_function");
 * span(() => {
 *     // 执行已废弃的功能
 * });
 * ```
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
 * 对应 Rust info_span! 宏，用于追踪一般操作区域
 * @param name - Span 名称，用于标识代码区域
 * @returns Span 处理函数，接收要执行的函数并在进入/退出时记录日志
 * @example
 * ```typescript
 * const span = infoSpan("data_processing");
 * span(() => {
 *     // 执行数据处理
 * });
 * ```
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
 * 对应 Rust debug_span! 宏，用于追踪调试代码区域
 * @param name - Span 名称，用于标识代码区域
 * @returns Span 处理函数，接收要执行的函数并在进入/退出时记录日志
 * @example
 * ```typescript
 * const span = debugSpan("calculation");
 * span(() => {
 *     // 执行计算逻辑
 * });
 * ```
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
 * 对应 Rust trace_span! 宏，用于追踪最详细的代码执行区域
 * @param name - Span 名称，用于标识代码区域
 * @returns Span 处理函数，接收要执行的函数并在进入/退出时记录日志
 * @example
 * ```typescript
 * const span = traceSpan("inner_loop");
 * span(() => {
 *     // 执行内部循环
 * });
 * ```
 */
export function traceSpan(name: string): (fn: () => void) => void {
	return (fn: () => void) => {
		trace(`[SPAN:${name}] Enter`);
		fn();
		trace(`[SPAN:${name}] Exit`);
	};
}

// ============================================================================
// 函数式 LogPlugin API
// ============================================================================

/**
 * 创建函数式 LogPlugin
 * 提供与 class LogPlugin 完全相同的功能，但使用函数式 API
 * @param config - 日志插件配置（可选）
 * @returns 函数式日志插件实例
 * @example
 * ```typescript
 * // 默认配置
 * const app = new App().addPlugin(createLogPlugin());
 *
 * // 自定义配置
 * const app = new App().addPlugin(
 *   createLogPlugin({
 *     level: Level.DEBUG,
 *     filter: "wgpu=error,bevy_render=info",
 *   })
 * );
 *
 * // 使用扩展方法
 * const logLevel = app.context.getLogLevel();
 * const logManager = app.context.getLogManager();
 * ```
 */
export function createLogPlugin(
	config?: LogPluginConfig,
): Plugin & { extension: LogPluginExtension } {
	const filter = config?.filter ?? DEFAULT_FILTER;
	const level = config?.level ?? Level.INFO;
	const customLayer = config?.customLayer;
	const fmtLayer = config?.fmtLayer;


	const pluginInstance = plugin<LogPluginExtension>({
		name: "LogPlugin",
		build: (app: App) => {
			// 创建订阅器
			const subscriber = new LogSubscriber();

			// 添加用户自定义层
			if (customLayer) {
				const layer = customLayer(app);

				if (layer) {
					subscriber.addLayer(layer);
				}
			}

			// 构建默认过滤器
			const levelString = Level[level] as keyof typeof Level;
			const defaultFilter = `${levelString.lower()},${filter}`;

			// 尝试从环境创建过滤器（在 Roblox 中直接使用默认值）
			const envFilter = EnvFilter.tryFromDefaultEnv(defaultFilter);

			// 添加格式化层或默认的 Roblox 层
			if (fmtLayer) {
				const layer = fmtLayer(app);

				if (layer) {
					subscriber.addLayer(layer);
				}
			} else {
				// 使用默认的 Roblox 层
				const robloxLayer = new RobloxLayer(envFilter);
				subscriber.addLayer(robloxLayer);
			}

			// 设置全局默认订阅器
			const subscriberAlreadySet = !LogSubscriber.setGlobalDefault(subscriber);

			if (subscriberAlreadySet && RunService.IsStudio()) {
				// 只在 Studio 模式下输出警告，避免在生产环境中产生噪音
			}
		},
		extension: {
			getLogManager: (world: World, context: Context, pluginInstance: Plugin) => {
				return () => LogSubscriber.getGlobal();
			},
			getLogLevel: (world: World, context: Context, pluginInstance: Plugin) => {
				return () => level;
			},
		},
		unique: true,
	});

	// 确保扩展属性存在
	return pluginInstance as Plugin & { extension: LogPluginExtension };
}

// 导出所有公共类型
export { Level } from "./level";
export { EnvFilter, DEFAULT_FILTER } from "./filter";
export { Layer, LogRecord, LogSubscriber } from "./roblox-tracing";
