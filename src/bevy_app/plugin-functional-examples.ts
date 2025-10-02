/**
 * 函数式 Plugin API 使用示例
 * 展示如何使用函数式编程风格创建和组合插件
 */

import { App } from "./app";
import {
	plugin,
	simplePlugin,
	composeBuild,
	when,
	pipe,
	pluginGroup,
	addSystems,
	insertResource,
	editSchedule,
	addPlugin,
	type Plugin,
	type BuildFn,
} from "./plugin";
import { BuiltinSchedules } from "./main-schedule";
import { World } from "../bevy_ecs/bevy-world";
import { Context } from "../bevy_ecs/types";
import { RunService } from "@rbxts/services";

// ============================================================================
// 示例 1: 简单插件（对比面向对象 vs 函数式）
// ============================================================================

/**
 * 面向对象方式：需要创建类
 */
class TransformPluginOOP implements Plugin {
	build(app: App): void {
		app.addSystems(BuiltinSchedules.POST_UPDATE, transformSystem);
	}

	name(): string {
		return "TransformPlugin";
	}

	isUnique(): boolean {
		return true;
	}
}

/**
 * 函数式方式：纯函数，更简洁
 */
export const transformPlugin = simplePlugin("TransformPlugin", (app) =>
	app.addSystems(BuiltinSchedules.POST_UPDATE, transformSystem),
);

// 使用对比：
// app.addPlugin(new TransformPluginOOP());  // 面向对象
// app.addPlugin(transformPlugin);           // 函数式

// ============================================================================
// 示例 2: 复杂插件（使用 composeBuild 组合多个操作）
// ============================================================================

/**
 * 诊断资源
 */
class DiagnosticsStore {
	public diagnostics = new Map<string, number>();
}

/**
 * 诊断插件 - 使用函数组合
 */
export const diagnosticPlugin = plugin({
	name: "DiagnosticPlugin",
	build: composeBuild(
		// 1. 添加资源
		(app) => app.insertResource(new DiagnosticsStore()),

		// 2. 条件添加服务端系统
		when(RunService.IsServer(), (app) => app.addSystems(BuiltinSchedules.UPDATE, serverDiagnosticSystem)),

		// 3. 添加通用系统
		(app) =>
			app.addSystems(
				BuiltinSchedules.POST_UPDATE,
				collectDiagnostics,
				updateDiagnostics,
			),
	),
	unique: true,
});

// ============================================================================
// 示例 3: 使用管道模式配置 App
// ============================================================================

/**
 * 游戏配置资源
 */
class GameConfig {
	public maxPlayers = 10;
	public gameMode = "FFA";
}

/**
 * 使用管道式配置创建 App
 */
export function createGameApp(): App {
	return pipe(
		new App(),
		addPlugin(inputPlugin),
		addPlugin(transformPlugin),
		addPlugin(renderPlugin),
		addSystems(BuiltinSchedules.STARTUP, initializeGame),
		insertResource(new GameConfig()),
		// 可以继续添加更多配置...
	);
}

// ============================================================================
// 示例 4: 动态插件组合
// ============================================================================

/**
 * 创建可复用的构建块
 */
const addInputSystems: BuildFn = (app) => app.addSystems(BuiltinSchedules.PRE_UPDATE, processInput, updateInput);

const addPhysicsSystems: BuildFn = (app) =>
	app.addSystems(BuiltinSchedules.UPDATE, physicsStep, collisionDetection);

const addRenderSystems: BuildFn = (app) => app.addSystems(BuiltinSchedules.POST_UPDATE, updateTransforms, render);

/**
 * 组合成完整的游戏插件
 */
export const gamePlugin = plugin({
	name: "GamePlugin",
	build: composeBuild(
		addInputSystems,
		when(true, addPhysicsSystems), // 可以条件开启物理
		addRenderSystems,
	),
});

// ============================================================================
// 示例 5: 插件组（函数式）
// ============================================================================

/**
 * 默认插件组 - 包含所有基础功能
 */
export const defaultPlugins = pluginGroup("DefaultPlugins", (group) => {
	group.add(inputPlugin).add(transformPlugin).add(renderPlugin).add(diagnosticPlugin);
});

/**
 * 最小插件组 - 只包含必要功能
 */
export const minimalPlugins = pluginGroup("MinimalPlugins", (group) => {
	group.add(transformPlugin).add(renderPlugin);
});

// 使用：
// app.addPlugins(defaultPlugins);

// ============================================================================
// 示例 6: Transform Plugin 的完整函数式重构
// ============================================================================

/**
 * Transform 启动系统
 */
const transformStartupSystem = (world: World, context: Context) => {
	ensureGlobalTransforms(world);
	markDirtyTrees(world);
	propagateParentTransforms(world);
	syncSimpleTransforms(world);
};

/**
 * Transform 更新系统
 */
const transformUpdateSystem = (world: World, context: Context) => {
	markDirtyTrees(world);
	propagateParentTransforms(world);
	syncSimpleTransforms(world);
};

/**
 * 使用 editSchedule 的柯里化版本
 */
const addStartupTransformSystems = editSchedule(BuiltinSchedules.POST_STARTUP, (schedule) =>
	schedule.addSystem({
		system: transformStartupSystem,
		name: "TransformStartupSystem",
	}),
);

const addUpdateTransformSystems = editSchedule(BuiltinSchedules.POST_UPDATE, (schedule) =>
	schedule.addSystem({
		system: transformUpdateSystem,
		name: "TransformUpdateSystem",
	}),
);

/**
 * Transform 插件 - 完全函数式版本
 */
export const transformPluginFunctional = plugin({
	name: "TransformPluginFunctional",
	build: composeBuild(addStartupTransformSystems, addUpdateTransformSystems),
});

// ============================================================================
// 示例 7: 条件插件 - 根据环境动态配置
// ============================================================================

/**
 * 开发模式插件 - 只在开发环境运行
 */
export const devPlugin = plugin({
	name: "DevPlugin",
	build: when(
		// 检查是否为 Studio 环境
		RunService.IsStudio(),
		composeBuild(
			(app) => app.insertResource(new DebugMode()),
			(app) => app.addSystems(BuiltinSchedules.UPDATE, debugOverlay, logPerformance),
		),
	),
});

/**
 * 生产优化插件 - 只在生产环境运行
 */
export const productionPlugin = plugin({
	name: "ProductionPlugin",
	build: when(
		!RunService.IsStudio(),
		composeBuild(
			(app) => app.addSystems(BuiltinSchedules.UPDATE, optimizeMemory),
			(app) => app.addSystems(BuiltinSchedules.POST_UPDATE, sendTelemetry),
		),
	),
});

// ============================================================================
// 示例 8: 多阶段插件 - 完整的生命周期管理
// ============================================================================

/**
 * 网络管理器
 */
class NetworkManager {
	public isConnected = false;

	connect(): void {
		print("Connecting to server...");
		this.isConnected = true;
	}

	disconnect(): void {
		print("Disconnecting from server...");
		this.isConnected = false;
	}
}

/**
 * 网络插件 - 带完整生命周期
 */
export const networkPlugin = plugin({
	name: "NetworkPlugin",

	// 构建阶段：注册系统和资源
	build: (app) => {
		app.insertResource(new NetworkManager());
		app.addSystems(BuiltinSchedules.UPDATE, handleNetworkMessages);
	},

	// 准备检查：确保网络管理器已初始化
	ready: (app) => {
		const networkManager = app.getResource<NetworkManager>();
		return networkManager !== undefined;
	},

	// 完成阶段：连接到服务器
	finish: (app) => {
		const networkManager = app.getResource<NetworkManager>();
		networkManager?.connect();
	},

	// 清理阶段：断开连接
	cleanup: (app) => {
		const networkManager = app.getResource<NetworkManager>();
		networkManager?.disconnect();
	},

	unique: true,
});

// ============================================================================
// 辅助系统（示例用）
// ============================================================================

function transformSystem(world: World, context: Context): void {
	// Transform 逻辑
}

function serverDiagnosticSystem(world: World, context: Context): void {
	// 服务端诊断逻辑
}

function collectDiagnostics(world: World, context: Context): void {
	// 收集诊断信息
}

function updateDiagnostics(world: World, context: Context): void {
	// 更新诊断信息
}

function initializeGame(world: World, context: Context): void {
	// 初始化游戏
}

function processInput(world: World, context: Context): void {
	// 处理输入
}

function updateInput(world: World, context: Context): void {
	// 更新输入
}

function physicsStep(world: World, context: Context): void {
	// 物理步进
}

function collisionDetection(world: World, context: Context): void {
	// 碰撞检测
}

function updateTransforms(world: World, context: Context): void {
	// 更新变换
}

function render(world: World, context: Context): void {
	// 渲染
}

function ensureGlobalTransforms(world: World): void {
	// 确保全局变换
}

function markDirtyTrees(world: World): void {
	// 标记脏树
}

function propagateParentTransforms(world: World): void {
	// 传播父变换
}

function syncSimpleTransforms(world: World): void {
	// 同步简单变换
}

function debugOverlay(world: World, context: Context): void {
	// 调试覆盖层
}

function logPerformance(world: World, context: Context): void {
	// 记录性能
}

function optimizeMemory(world: World, context: Context): void {
	// 优化内存
}

function sendTelemetry(world: World, context: Context): void {
	// 发送遥测数据
}

function handleNetworkMessages(world: World, context: Context): void {
	// 处理网络消息
}

/**
 * 调试模式资源
 */
class DebugMode {
	public enabled = true;
}

// ============================================================================
// 占位插件（用于示例）
// ============================================================================

export const inputPlugin = simplePlugin("InputPlugin", (app) => {
	// 输入插件逻辑
});

export const renderPlugin = simplePlugin("RenderPlugin", (app) => {
	// 渲染插件逻辑
});

// ============================================================================
// 使用示例总结
// ============================================================================

/**
 * 完整的应用配置示例
 */
export function createCompleteApp(): App {
	const app = pipe(
		new App(),

		// 方式 1: 直接添加插件
		addPlugin(inputPlugin),
		addPlugin(transformPlugin),

		// 方式 3: 条件插件
		addPlugin(devPlugin),
		addPlugin(productionPlugin),

		// 方式 4: 带生命周期的插件
		addPlugin(networkPlugin),

		// 添加启动系统
		addSystems(BuiltinSchedules.STARTUP, initializeGame),

		// 添加资源
		insertResource(new GameConfig()),

		// 自定义调度配置
		editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
			// 自定义调度逻辑
		}),
	);

	// 方式 2: 添加插件组（需要单独调用）
	app.addPlugins(defaultPlugins);

	return app;
}
