/**
 * bevy_diagnostic 模块导出
 * 对应 Rust bevy_diagnostic 的 lib.rs 导出
 */

export {
	// 核心诊断系统
	Diagnostic,
	DiagnosticMeasurement,
	DiagnosticPath,
	Diagnostics,
	DiagnosticsStore,
	RegisterDiagnostic,
	DEFAULT_MAX_HISTORY_LENGTH,
	registerDiagnostic,
} from "./diagnostic";

// 主诊断插件
export { DiagnosticsPlugin } from "./diagnostics-plugin";
export type { DiagnosticsPluginExtension, DiagnosticConfig } from "./extension";

// 帧计数诊断
export { DiagnosticFrameCount, FrameCountPlugin, updateDiagnosticsFrameCount} from "./frame-count-diagnostics-plugin";

// 帧时间诊断
export { FrameTimeDiagnosticsPlugin } from "./frame-time-diagnostics-plugin";

// 日志诊断
export { LogDiagnosticsPlugin, LogDiagnosticsState } from "./log-diagnostics-plugin";

// 实体计数诊断
export { EntityCountDiagnosticsPlugin } from "./entity-count-diagnostics-plugin";