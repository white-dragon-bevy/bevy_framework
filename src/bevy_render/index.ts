/**
 * Bevy Render 模块
 *
 * 提供 Roblox 平台的渲染功能，包括：
 * - 可见性管理系统（Visibility/ViewVisibility）
 * - ECS 实体与 Roblox 实例的同步
 * - Transform 数据到 Roblox CFrame 的转换
 * - 渲染层级管理
 * - 实体清理系统
 *
 * @module bevy_render
 */

/**
 * 导出渲染组件
 *
 * - Visibility: 可见性组件，控制实体是否显示
 * - ViewVisibility: 计算后的视图可见性
 * - RobloxInstance: 关联 ECS 实体与 Roblox 实例
 * - RenderLayers: 渲染层级管理
 */
export {
	// 组件
	Visibility,
	ViewVisibility,
	RobloxInstance,
	RenderLayers,

	// 类型和枚举
	VisibilityState,
	DefaultRenderLayers,

	// 辅助函数
	isInRenderLayer,
	createDefaultVisibility,
	createDefaultViewVisibility,
} from "./components";

/**
 * 导出渲染系统
 *
 * - visibilitySystem: 可见性计算系统
 * - robloxSyncSystem: Roblox 实例同步系统
 * - cleanupRemovedEntities: 实体清理系统
 * - renderSystemSet: 完整的渲染系统集合
 */
export {
	visibilitySystem,
	robloxSyncSystem,
	cleanupRemovedEntities,
	renderSystemSet,
} from "./systems";

/**
 * 导出渲染插件
 *
 * - RenderPlugin: 主渲染插件类
 * - RenderSystems: 渲染系统标识符枚举
 * - createRenderPlugin: 渲染插件工厂函数
 */
export { RenderPlugin, RenderSystems, createRenderPlugin } from "./plugin";
