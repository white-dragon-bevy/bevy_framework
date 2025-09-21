/**
 * Bevy App预设模块
 * 对应 Rust bevy_app::prelude
 *
 * 重新导出最常用的类型和函数，方便用户导入
 */

// 核心App类型
export { App } from "./app";
export { SubApp, SubApps } from "./sub-app";

// 类型定义
export {
	AppLabel,
	createAppLabel,
	AppExit,
	AppExitCode,
	SystemFunction,
	ScheduleLabel,
	createScheduleLabel,
	BuiltinSchedules,
	Resource,
	Component,
	Message,
	ErrorHandler,
} from "./types";

// 插件系统
export {
	Plugin,
	PluginGroup,
	PluginState,
	BasePlugin,
	FunctionPlugin,
	createPlugin,
	PluginGroupBuilder,
	BasePluginGroup,
	PluginError,
	DuplicatePluginError,
} from "./plugin";

// 调度系统
export {
	Schedule,
	Scheduler,
	SystemSet,
	createSystemSet,
	SystemConfig,
} from "./scheduler";

// Roblox适配器
export {
	RobloxRunnerPlugin,
	RobloxNetworkPlugin,
	RobloxPlayerPlugin,
	RobloxAssetPlugin,
	RobloxInputPlugin,
	RobloxDefaultPlugins,
	RobloxDefaultPluginsBuilder,
	RobloxEnvironment,
} from "./roblox-adapters";