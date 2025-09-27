/**
 * @fileoverview Bevy ECS系统迁移到roblox-ts - 基于@rbxts/matter的ECS适配层
 * @version 0.2.0
 * @author White Dragon Bull
 */

// 核心组件导出
export * from "./command-buffer";
export * from "./resource";
export * from "./schedule/index";
export * from "./bevy-world";
export * from "./message";  // 使用新的 message 系统
export * from "./name";
export * from "./types";

// 默认导出
export { BevyWorld } from "./bevy-world";
