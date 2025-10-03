/**
 * bevy_log 模块导出
 * 对应 Rust bevy_log crate
 *
 * 这个模块为 Bevy 应用提供日志功能和配置，
 * 并自动配置平台特定的日志处理器（即 Roblox）。
 *
 * 提供的日志宏从 tracing 重新导出，行为与其相同。
 *
 * 默认情况下，这个模块的 LogPlugin 包含在 Bevy 的 DefaultPlugins 中，
 * 如果使用的话，日志宏可以开箱即用。
 *
 * 为了更精细地控制日志行为，在应用初始化期间设置 LogPlugin 或 DefaultPlugins。
 *
 * @example
 * ```typescript
 * import { LogPlugin, info, debug } from "@/bevy_log";
 *
 * // 使用默认配置
 * app.addPlugin(new LogPlugin());
 *
 * // 自定义配置
 * app.addPlugin(new LogPlugin({
 *     level: Level.DEBUG,
 *     filter: "wgpu=error,bevy_ecs=trace",
 * }));
 *
 * // 使用日志函数
 * info("Application started");
 * debug("Debug information");
 * ```
 *
 * @module bevy_log
 */

// 导出核心插件
export { LogPlugin, type LogPluginConfig } from "./lib";

// 导出日志级别
export { Level } from "./level";

// 导出过滤器
export { EnvFilter, DEFAULT_FILTER } from "./filter";

// 导出类型
export type { BoxedLayer, BoxedFmtLayer } from "./lib";
export type { Layer, LogRecord } from "./roblox-tracing";

// 导出日志函数
export { error, warn, info, debug, trace } from "./lib";

// 导出 span 函数
export { errorSpan, warnSpan, infoSpan, debugSpan, traceSpan } from "./lib";

// 导出 once 函数
export { errorOnce, warnOnce, infoOnce, debugOnce, traceOnce, once } from "./once";

// 导出订阅器（高级用法）
export { LogSubscriber } from "./roblox-tracing";

// 导出 prelude 模块
export * as prelude from "./prelude";