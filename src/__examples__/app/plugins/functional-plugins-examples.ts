/**
 * Functional Plugin 示例
 * 展示如何使用函数式 API 创建所有现有插件的 functional 版本
 *
 * 注意：这是一个示例文件，展示 functional API 的使用方式
 * 由于某些插件的复杂性和依赖，实际使用时可能需要调整
 */

import { App } from "../../../bevy_app/app";
import {
	plugin,
	simplePlugin,
	composeBuild,
	when,
	pipe,
	addSystems,
	insertResource,
	addPlugin,
} from "../../../bevy_app/plugin";
import { BuiltinSchedules } from "../../../bevy_app/main-schedule";
import { RunService } from "@rbxts/services";
import { World } from "../../../bevy_ecs/bevy-world";
import { Context } from "../../../bevy_ecs";

// 导入 Transform 系统
import {
	ensureGlobalTransforms,
	markDirtyTrees,
	propagateParentTransforms,
	syncSimpleTransforms,
} from "../../../bevy_transform/systems";

// 导入 Render 系统
import { visibilitySystem, robloxSyncSystem, cleanupRemovedEntities } from "../../../bevy_render/systems";

// 导入 Diagnostic 相关
import { installDiagnosticSystem, DiagnosticsStore, Diagnostic } from "../../../bevy_diagnostic/diagnostic";

// ============================================================================
// TransformPlugin - Functional 版本
// ============================================================================

/**
 * TransformPlugin 的函数式实现
 * 处理 Transform 和 GlobalTransform 组件的自动更新
 */
export const transformPluginFunctional = plugin({
	name: "TransformPlugin",
	build: (app: App) => {
		// 定义 Startup 系统
		const transformStartupSystem = (world: World, context: Context) => {
			ensureGlobalTransforms(world);
			markDirtyTrees(world);
			propagateParentTransforms(world);
			syncSimpleTransforms(world);
		};

		// 定义 Update 系统
		const transformUpdateSystem = (world: World, context: Context) => {
			markDirtyTrees(world);
			propagateParentTransforms(world);
			syncSimpleTransforms(world);
		};

		// 添加系统到调度
		app.editSchedule(BuiltinSchedules.POST_STARTUP, (schedule) => {
			schedule.addSystem({
				system: transformStartupSystem,
				name: "TransformStartupSystem",
			});
		});

		app.editSchedule(BuiltinSchedules.POST_UPDATE, (schedule) => {
			schedule.addSystem({
				system: transformUpdateSystem,
				name: "TransformUpdateSystem",
			});
		});
	},
	unique: true,
});

// ============================================================================
// RenderPlugin - Functional 版本
// ============================================================================

/**
 * RenderPlugin 的函数式实现
 * 提供基础的渲染功能，包括可见性管理和 Transform 同步
 */
export const renderPluginFunctional = plugin({
	name: "RenderPlugin",
	build: (app: App) => {
		// 定义渲染更新系统
		const renderUpdateSystem = (world: World, context: Context) => {
			visibilitySystem(world);
			robloxSyncSystem(world);
			cleanupRemovedEntities(world);
		};

		// 定义渲染启动系统
		const renderStartupSystem = (world: World, context: Context) => {
			visibilitySystem(world);
			robloxSyncSystem(world);
		};

		// 添加系统到调度
		app.editSchedule(BuiltinSchedules.POST_UPDATE, (schedule) => {
			schedule.addSystem({
				system: renderUpdateSystem,
				name: "RenderUpdateSystem",
			});
		});

		app.editSchedule(BuiltinSchedules.STARTUP, (schedule) => {
			schedule.addSystem({
				system: renderStartupSystem,
				name: "RenderStartupSystem",
			});
		});
	},
	unique: true,
});

// ============================================================================
// CameraPlugin - Functional 版本
// ============================================================================

/**
 * CameraPlugin 的函数式实现
 * 提供 Roblox Camera 的 ECS 封装和扩展接口（仅客户端）
 */
export const cameraPluginFunctional = plugin({
	name: "CameraPlugin",
	build: when(!RunService.IsServer(), (app: App) => {
		// 占位实现
		print("[CameraPlugin] 已加载（占位实现 - Functional）");
	}),
	unique: true,
});

// ============================================================================
// DiagnosticsPlugin - Functional 版本
// ============================================================================

/**
 * DiagnosticsPlugin 的函数式实现
 * 向应用添加核心诊断资源
 */
export const diagnosticsPluginFunctional = plugin({
	name: "DiagnosticsPlugin",
	build: (app: App) => {
		// 安装诊断系统
		installDiagnosticSystem(app);

		// 创建诊断存储
		const store = new DiagnosticsStore();
		app.insertResource(store);
	},
	unique: true,
});

// ============================================================================
// 类型累积示例
// ============================================================================

/**
 * 展示类型累积：App 类型应该随着插件添加而扩展
 *
 * 注意：函数式插件现在支持完整的类型累积功能
 * 参见 functional-plugins-with-extensions.ts 获取带扩展的插件示例
 *
 * 类型累积工作原理：
 * 1. 使用 plugin<ExtensionType>({ extension: {...} }) 创建带扩展的插件
 * 2. App.addPlugin() 会提取插件的扩展类型并合并到 App<T> 的类型参数中
 * 3. 每次 addPlugin() 都会累积新的扩展类型：App<T & NewExtension>
 * 4. 最终 app.context 拥有所有插件扩展的类型安全方法
 */
export function typeAccumulationExample(): void {
	const app = new App()
		.addPlugin(transformPluginFunctional) // App<Context>
		.addPlugin(renderPluginFunctional) // App<Context>
		.addPlugin(diagnosticsPluginFunctional); // App<Context>

	// 这些插件没有扩展，因此类型不变
	// 要查看类型累积的实际效果，请参见：
	// src/__examples__/app/plugins/functional-plugins-with-extensions.ts
}

// ============================================================================
// 使用 pipe() 和柯里化函数的完整应用配置示例
// ============================================================================

/**
 * 展示如何使用 pipe() 和柯里化函数构建完整应用
 */
export function completeAppExample() {
	// 定义一个简单的系统
	const mySystem = (world: World, context: Context) => {
		// 系统逻辑
		print("My system is running!");
	};

	// 使用 pipe() 构建应用
	const app = pipe(
		new App(),
		// 添加核心插件
		addPlugin(transformPluginFunctional),
		addPlugin(renderPluginFunctional),
		// 添加诊断插件
		addPlugin(diagnosticsPluginFunctional),
		// 添加系统
		addSystems(BuiltinSchedules.UPDATE, mySystem),
	);

	return app;
}

// ============================================================================
// 使用 composeBuild 组合多个构建函数
// ============================================================================

/**
 * 展示如何使用 composeBuild 创建复杂插件
 */
export const complexPluginExample = plugin({
	name: "ComplexPlugin",
	build: composeBuild(
		// 第一步：初始化资源
		(app: App) => {
			print("Step 1: Initializing resources");
			// 插入资源
			const myResource = { value: 42 };
			app.insertResource(myResource);
		},
		// 第二步：添加系统
		(app: App) => {
			print("Step 2: Adding systems");
			const mySystem = (world: World, context: Context) => {
				// 系统逻辑
			};
			app.addSystems(BuiltinSchedules.UPDATE, mySystem);
		},
		// 第三步：配置调度
		(app: App) => {
			print("Step 3: Configuring schedules");
			// 配置调度
		},
	),
});

// ============================================================================
// 使用 when() 进行条件构建
// ============================================================================

/**
 * 展示如何使用 when() 进行条件构建
 */
export const conditionalPluginExample = plugin({
	name: "ConditionalPlugin",
	build: composeBuild(
		// 总是执行
		(app: App) => {
			print("This always runs");
		},
		// 仅在服务器端执行
		when(RunService.IsServer(), (app: App) => {
			print("This runs only on server");
		}),
		// 仅在客户端执行
		when(RunService.IsClient(), (app: App) => {
			print("This runs only on client");
		}),
		// 动态条件
		when(
			(app: App) => {
				// 检查某个资源是否存在
				const resource = app.getResource<DiagnosticsStore>();
				return resource !== undefined;
			},
			(app: App) => {
				print("DiagnosticsStore exists!");
			},
		),
	),
});

// ============================================================================
// 使用 simplePlugin 快速创建插件
// ============================================================================

/**
 * 展示如何使用 simplePlugin 快速创建简单插件
 */
export const simplePluginExample = simplePlugin("SimpleExamplePlugin", (app: App) => {
	print("Simple plugin loaded!");

	// 添加一个简单的系统
	const simpleSystem = (world: World, context: Context) => {
		// 简单的逻辑
	};

	app.addSystems(BuiltinSchedules.UPDATE, simpleSystem);
});

// ============================================================================
// 柯里化函数链式调用示例
// ============================================================================

/**
 * 展示柯里化函数的链式调用
 */
export function curriedFunctionsExample() {
	const mySystem1 = (world: World, context: Context) => {
		print("System 1");
	};

	const mySystem2 = (world: World, context: Context) => {
		print("System 2");
	};

	const myResource = { name: "MyResource", value: 100 };

	// 使用柯里化函数构建应用
	const app = pipe(
		new App(),
		// 添加多个系统
		addSystems(BuiltinSchedules.STARTUP, mySystem1),
		addSystems(BuiltinSchedules.UPDATE, mySystem2),
		// 插入资源
		insertResource(myResource),
		// 添加插件
		addPlugin(transformPluginFunctional),
	);

	return app;
}

// ============================================================================
// 嵌套 when 条件示例
// ============================================================================

/**
 * 展示嵌套条件构建
 */
export const nestedConditionalPlugin = plugin({
	name: "NestedConditionalPlugin",
	build: composeBuild(
		when(RunService.IsServer(), (app: App) => {
			print("Server-side logic");

			// 服务器端的条件逻辑
			const hasPlayers = () => {
				// 检查是否有玩家
				return true; // 示例
			};

			if (hasPlayers()) {
				print("Server has players");
			}
		}),
		when(RunService.IsClient(), (app: App) => {
			print("Client-side logic");

			// 客户端的条件逻辑
			const isInGame = () => {
				// 检查是否在游戏中
				return true; // 示例
			};

			if (isInGame()) {
				print("Client is in game");
			}
		}),
	),
});

// ============================================================================
// 导出所有示例
// ============================================================================

/**
 * 所有 functional 插件和示例的集合
 */
export const functionalPlugins = {
	// 核心插件
	transform: transformPluginFunctional,
	render: renderPluginFunctional,
	camera: cameraPluginFunctional,

	// 诊断插件
	diagnostics: diagnosticsPluginFunctional,

	// 示例插件
	complex: complexPluginExample,
	conditional: conditionalPluginExample,
	simple: simplePluginExample,
	nestedConditional: nestedConditionalPlugin,
};

/**
 * 所有示例函数的集合
 */
export const examples = {
	typeAccumulation: typeAccumulationExample,
	completeApp: completeAppExample,
	curriedFunctions: curriedFunctionsExample,
};

// ============================================================================
// 完整的应用示例
// ============================================================================

/**
 * 完整的应用示例，展示如何组合使用所有功能
 */
export function fullApplicationExample(): App {
	// 创建自定义系统
	const initSystem = (world: World, context: Context) => {
		print("Application initialized");
	};

	const updateSystem = (world: World, context: Context) => {
		// 更新逻辑
	};

	// 使用 pipe 构建完整应用
	const app = pipe(
		new App(),
		// 添加核心插件
		addPlugin(transformPluginFunctional),
		addPlugin(renderPluginFunctional),
		addPlugin(diagnosticsPluginFunctional),
		// 添加自定义插件
		addPlugin(complexPluginExample),
		addPlugin(conditionalPluginExample),
		// 添加系统
		addSystems(BuiltinSchedules.STARTUP, initSystem),
		addSystems(BuiltinSchedules.UPDATE, updateSystem),
	);

	return app;
}

// ============================================================================
// 类型累积扩展示例引用
// ============================================================================

/**
 * 更多类型累积示例
 *
 * 要查看带扩展的函数式插件和完整的类型累积示例，请参见：
 * src/__examples__/app/plugins/functional-plugins-with-extensions.ts
 *
 * 该文件展示了：
 * - 如何创建带扩展的函数式插件
 * - 扩展工厂的使用方法
 * - 类型累积的实际效果
 * - 多个插件扩展的组合使用
 */
