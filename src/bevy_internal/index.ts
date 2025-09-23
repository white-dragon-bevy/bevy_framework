/**
 * bevy_internal 模块 - Roblox TypeScript 移植版
 * 对应 Rust bevy_internal crate
 *
 * 这个模块重新导出 Bevy 引擎的所有核心模块，提供统一的导入入口
 */

// 导出所有已迁移的 bevy 模块
export * as app from "../bevy_app";
export * as diagnostic from "../bevy_diagnostic";
export * as ecs from "../bevy_ecs";
export * as input from "../bevy_input";
export * as log from "../bevy_log";
export * as time from "../bevy_time";
export * as transform from "../bevy_transform/src";

// 导出插件组
export { DefaultPlugins, MinimalPlugins } from "./default-plugins";

// 导出预设模块
export * as prelude from "./prelude";
