/**
 * @fileoverview Bevy ECS系统迁移到roblox-ts - 基于@rbxts/matter的ECS适配层
 * @version 0.1.0
 * @author White Dragon Bull
 */

// 核心组件导出
export * from "./command-buffer";
export * from "./resource";
export * from "./system-scheduler";
export * from "./matter-adapter";
export * from "./query";
export * from "./world-extensions";
export * from "./events";

// 重新导出Matter的核心类型，方便使用
export { World, AnyEntity } from "@rbxts/matter";

// 默认导出
export { createDefaultWorld, createWorldBuilder } from "./world-extensions";