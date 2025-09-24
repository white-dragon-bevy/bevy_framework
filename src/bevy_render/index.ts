/**
 * Bevy Render 模块
 * 提供 Roblox 平台的渲染功能
 */

// 导出组件
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

// 导出系统
export {
	visibilitySystem,
	robloxSyncSystem,
	cleanupRemovedEntities,
	renderSystemSet,
} from "./systems";

// 导出插件
export { RenderPlugin, RenderSystems, createRenderPlugin } from "./plugin";