/**
 * bevy_internal 预设模块
 * 对应 Rust bevy_internal::prelude
 *
 * 重新导出最常用的类型和函数，方便用户导入
 */

/**
 * 导出应用程序模块的所有预设内容
 * 包括 App、Plugin、Schedule 等核心类型
 */
export * from "../bevy_app/prelude";

/**
 * 日志插件 - 提供日志记录和过滤功能（函数式）
 */
export { createLogPlugin } from "../bevy_log";

/**
 * 诊断插件集合
 * - DiagnosticsPlugin: 诊断系统核心插件
 * - FrameCountPlugin: 帧计数统计插件
 * - FrameTimeDiagnosticsPlugin: 帧时间统计插件
 * - LogDiagnosticsPlugin: 诊断日志输出插件
 * - EntityCountDiagnosticsPlugin: 实体计数统计插件
 */
export {
	DiagnosticsPlugin,
	FrameCountPlugin,
	FrameTimeDiagnosticsPlugin,
	LogDiagnosticsPlugin,
	EntityCountDiagnosticsPlugin,
} from "../bevy_diagnostic";

/**
 * 默认插件组和最小插件组
 * - DefaultPlugins: 包含所有常用插件的完整插件组
 * - MinimalPlugins: 仅包含必需插件的最小插件组
 */
export { DefaultPlugins, MinimalPlugins } from "./default-plugins";
