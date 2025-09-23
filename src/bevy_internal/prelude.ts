/**
 * bevy_internal 预设模块
 * 对应 Rust bevy_internal::prelude
 *
 * 重新导出最常用的类型和函数，方便用户导入
 */

// 从各模块导出 prelude 内容
export * from "../bevy_app/prelude";

// 导出日志相关
export { LogPlugin } from "../bevy_log/lib";

// 导出诊断相关
export {
	DiagnosticsPlugin,
	FrameCountPlugin,
	FrameTimeDiagnosticsPlugin,
	LogDiagnosticsPlugin,
	EntityCountDiagnosticsPlugin,
} from "../bevy_diagnostic";

// 导出插件组
export { DefaultPlugins, MinimalPlugins } from "./default-plugins";