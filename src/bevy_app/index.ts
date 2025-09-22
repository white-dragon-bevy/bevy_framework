/**
 * @fileoverview Bevy App系统的Roblox-TS移植版本
 *
 * 这个包提供了Bevy应用程序框架的核心功能，包括：
 * - 应用程序生命周期管理
 * - 插件系统
 * - 调度系统（系统执行顺序管理）
 * - 子应用程序支持
 * - Roblox环境集成
 *
 * @example
 * ```typescript
 * import { App, BuiltinSchedules, RobloxDefaultPlugins } from "@white-dragon-bull/app";
 *
 * // 创建基础应用
 * const app = App.create()
 *   .addPlugins(...RobloxDefaultPlugins.create().build())
 *   .addSystems(BuiltinSchedules.UPDATE, gameSystem)
 *   .run();
 *
 * function gameSystem(world: World) {
 *   // 游戏逻辑
 * }
 * ```
 *
 * @author White Dragon Bull Team
 * @version 0.1.0
 */

// 导出所有公共API
export * from "./types";
export * from "./app";
export * from "./plugin";
export * from "./sub-app";
export * from "./roblox-adapters";
export * from "./main-schedule";

// 导出预设模块
export * as prelude from "./prelude";

// 提供便捷的默认导出
export { App } from "./app";
export { RobloxDefaultPlugins } from "./roblox-adapters";
