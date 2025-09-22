/**
 * Bevy ECS Debugger Prelude
 *
 * 包含最常用的公共 API，方便用户快速导入。
 *
 * @example
 * ```typescript
 * import { DebuggerPlugin, type DebuggerOptions } from "bevy_ecs_debugger/prelude";
 *
 * // 或使用通配符导入
 * import * as debugger from "bevy_ecs_debugger/prelude";
 * ```
 */

// 核心插件
export { DebuggerPlugin } from "./debugger-plugin";

// 工厂函数
export { createDebugger } from "./debugger";

// 类型定义
export type {
    DebuggerOptions,
    IDebugger,
    DebuggerState
} from "./types";

// 默认配置
export { DefaultDebuggerOptions } from "./types";