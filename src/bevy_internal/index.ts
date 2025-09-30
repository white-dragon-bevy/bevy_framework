/**
 * bevy_internal 模块 - Roblox TypeScript 移植版
 * 对应 Rust bevy_internal crate
 *
 * 这个模块重新导出 Bevy 引擎的所有核心模块，提供统一的导入入口
 */

/**
 * 应用程序模块 - 应用生命周期、插件系统、调度器等
 */
export * as app from "../bevy_app";

/**
 * 诊断模块 - 性能监控、帧率统计、实体计数等
 */
export * as diagnostic from "../bevy_diagnostic";

/**
 * ECS模块 - 实体组件系统核心功能
 */
export * as ecs from "../bevy_ecs";

/**
 * 输入模块 - 键盘、鼠标、手柄输入处理
 */
export * as input from "../bevy_input";

/**
 * 日志模块 - 日志记录和过滤功能
 */
export * as log from "../bevy_log";

/**
 * 时间模块 - 时间管理、帧计数、固定时间步长
 */
export * as time from "../bevy_time";

/**
 * 变换模块 - 位置、旋转、缩放及层级变换
 */
export * as transform from "../bevy_transform";

/**
 * 默认插件组和最小插件组
 */
export { DefaultPlugins, MinimalPlugins } from "./default-plugins";

/**
 * 预设模块 - 常用类型和函数的便捷导入
 */
export * as prelude from "./prelude";
