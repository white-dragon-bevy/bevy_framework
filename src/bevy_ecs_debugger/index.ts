/**
 * ECS Debugger 模块
 * 提供 Matter ECS 的调试功能
 */

export { DebuggerPlugin } from "./debugger-plugin";
export { createDebugger } from "./debugger";
export type { DebuggerOptions, IDebugger, DebuggerState } from "./types";
export { DefaultDebuggerOptions } from "./types";

// 导出 prelude 模块
export * as prelude from "./prelude";