/**
 * bevy_camera 模块导出
 *
 * 提供 Roblox Camera 的 ECS 封装
 *
 * 对应 Rust bevy_camera crate
 */

// 组件
export { PrimaryCamera, CameraConfig } from "./components";
export type { PrimaryCameraData, CameraConfigData } from "./components";
export { createPrimaryCameraData, createCameraConfigData, applyCameraConfig } from "./components";

// 插件
export { CameraPlugin } from "./plugin";
export type { CameraPluginExtensionFactories } from "./plugin";

// 系统（占位）
export { initializeCameraSystem, syncCameraConfigSystem, updateCameraSubjectSystem } from "./systems";