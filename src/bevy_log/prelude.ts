/**
 * 日志预导出模块
 * 对应 Rust bevy_log::prelude
 *
 * 这包含了这个模块中最常见的类型和函数，为了方便而重新导出。
 * 可以使用 `import * as log from "@/bevy_log/prelude"` 快速导入所有日志函数。
 *
 * @example
 * ```typescript
 * import * as log from "@/bevy_log/prelude";
 *
 * log.info("Application started");
 * log.debug("Debug information");
 * log.errorOnce("This error will only be logged once");
 * ```
 *
 * @module bevy_log/prelude
 */

// 导出所有日志函数
// 对应 Rust tracing::{debug, debug_span, error, error_span, info, info_span, trace, trace_span, warn, warn_span}
export {
	debug,
	debugSpan,
	error,
	errorSpan,
	info,
	infoSpan,
	trace,
	traceSpan,
	warn,
	warnSpan,
} from "./lib";

// 导出所有 once 函数
// 对应 Rust crate::{debug_once, error_once, info_once, trace_once, warn_once}
export { debugOnce, errorOnce, infoOnce, traceOnce, warnOnce } from "./once";

// 导出 once 函数本身
// 对应 Rust bevy_utils::once
export { once } from "./once";