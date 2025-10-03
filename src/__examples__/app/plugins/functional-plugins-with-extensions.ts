/**
 * Functional Plugin 扩展示例
 * 展示如何使用函数式 API 创建带扩展的插件，实现类型安全的类型累积
 */

import { App, ExtensionFactory, getContextWithExtensions } from "../../../bevy_app/app";
import { plugin, simplePlugin } from "../../../bevy_app/plugin";
import { BuiltinSchedules } from "../../../bevy_app/main-schedule";
import { World } from "../../../bevy_ecs/bevy-world";
import { Context } from "../../../bevy_ecs";

// ============================================================================
// 示例 1: LogPlugin - 日志插件扩展
// ============================================================================

/**
 * 日志配置资源
 */
class LogConfig {
	public level: string = "info";
	public enabled: boolean = true;
}

/**
 * 日志插件的扩展接口
 * 提供获取和设置日志级别的方法
 */
interface LogPluginExtension {
	getLogLevel: ExtensionFactory<() => string>;
	setLogLevel: ExtensionFactory<(level: string) => void>;
}

/**
 * 日志系统
 */
function logSystem(world: World, context: Context): void {
	// 日志系统逻辑
	const config = world.resources.getResource<LogConfig>();

	if (config && config.enabled) {
		// 执行日志逻辑
	}
}

/**
 * 带扩展的函数式日志插件
 */
export const logPluginFunctional = plugin<LogPluginExtension>({
	name: "LogPlugin",
	build: (app) => {
		// 插入日志配置资源
		app.insertResource(new LogConfig());

		// 添加日志系统
		app.addSystems(BuiltinSchedules.UPDATE, logSystem);
	},
	extension: {
		// 获取日志级别
		getLogLevel: (world, context, plugin) => {
			return () => {
				const config = world.resources.getResource<LogConfig>();
				return config?.level ?? "info";
			};
		},
		// 设置日志级别
		setLogLevel: (world, context, plugin) => {
			return (level: string) => {
				const config = world.resources.getResource<LogConfig>();

				if (config) {
					config.level = level;
					print(`[LogPlugin] Log level set to: ${level}`);
				} else {
					warn("[LogPlugin] LogConfig resource not found");
				}
			};
		},
	},
});

// ============================================================================
// 示例 2: MetricsPlugin - 性能指标插件
// ============================================================================

/**
 * 性能指标资源
 */
class MetricsData {
	public fps: number = 0;
	public frameTime: number = 0;
	public entityCount: number = 0;
}

/**
 * 性能指标插件的扩展接口
 */
interface MetricsPluginExtension {
	getFps: ExtensionFactory<() => number>;
	getFrameTime: ExtensionFactory<() => number>;
	getEntityCount: ExtensionFactory<() => number>;
}

/**
 * 性能指标系统
 */
function metricsSystem(world: World, context: Context): void {
	const metrics = world.resources.getResource<MetricsData>();

	if (metrics) {
		// 更新性能指标
		metrics.fps = 60; // 示例值
		metrics.frameTime = 16.67; // 示例值
		metrics.entityCount = world.size();
	}
}

/**
 * 带扩展的函数式性能指标插件
 */
export const metricsPluginFunctional = plugin<MetricsPluginExtension>({
	name: "MetricsPlugin",
	build: (app) => {
		app.insertResource(new MetricsData());
		app.addSystems(BuiltinSchedules.UPDATE, metricsSystem);
	},
	extension: {
		getFps: (world, context, plugin) => {
			return () => {
				const metrics = world.resources.getResource<MetricsData>();
				return metrics?.fps ?? 0;
			};
		},
		getFrameTime: (world, context, plugin) => {
			return () => {
				const metrics = world.resources.getResource<MetricsData>();
				return metrics?.frameTime ?? 0;
			};
		},
		getEntityCount: (world, context, plugin) => {
			return () => {
				const metrics = world.resources.getResource<MetricsData>();
				return metrics?.entityCount ?? 0;
			};
		},
	},
});

// ============================================================================
// 示例 3: StatePlugin - 游戏状态管理插件
// ============================================================================

/**
 * 游戏状态枚举
 */
enum GameState {
	Menu = "Menu",
	Playing = "Playing",
	Paused = "Paused",
	GameOver = "GameOver",
}

/**
 * 游戏状态资源
 */
class GameStateResource {
	public current: GameState = GameState.Menu;
	public previous?: GameState;
}

/**
 * 状态插件的扩展接口
 */
interface StatePluginExtension {
	getCurrentState: ExtensionFactory<() => GameState>;
	setState: ExtensionFactory<(state: GameState) => void>;
	getPreviousState: ExtensionFactory<() => GameState | undefined>;
}

/**
 * 带扩展的游戏状态插件
 */
export const statePluginFunctional = plugin<StatePluginExtension>({
	name: "StatePlugin",
	build: (app) => {
		app.insertResource(new GameStateResource());
	},
	extension: {
		getCurrentState: (world, context, plugin) => {
			return () => {
				const stateResource = world.resources.getResource<GameStateResource>();
				return stateResource?.current ?? GameState.Menu;
			};
		},
		setState: (world, context, plugin) => {
			return (state: GameState) => {
				const stateResource = world.resources.getResource<GameStateResource>();

				if (stateResource) {
					stateResource.previous = stateResource.current;
					stateResource.current = state;
					print(`[StatePlugin] State changed: ${stateResource.previous} -> ${state}`);
				}
			};
		},
		getPreviousState: (world, context, plugin) => {
			return () => {
				const stateResource = world.resources.getResource<GameStateResource>();
				return stateResource?.previous;
			};
		},
	},
});

// ============================================================================
// 类型别名（用于示例中的类型断言）
// ============================================================================

/**
 * 带日志扩展的 Context 类型
 */
type ContextWithLog = Context & {
	getLogLevel: () => string;
	setLogLevel: (level: string) => void;
};

/**
 * 带性能指标扩展的 Context 类型
 */
type ContextWithMetrics = Context & {
	getFps: () => number;
	getFrameTime: () => number;
	getEntityCount: () => number;
};

/**
 * 带状态扩展的 Context 类型
 */
type ContextWithState = Context & {
	getCurrentState: () => GameState;
	setState: (state: GameState) => void;
	getPreviousState: () => GameState | undefined;
};

// ============================================================================
// 示例 4: 类型累积 - 单个插件
// ============================================================================

/**
 * 展示单个插件的类型累积
 *
 * 注意：由于 roblox-ts 和 TypeScript 的类型推导限制，
 * 在示例中我们使用类型断言来访问扩展方法。
 * 在实际使用中，建议使用类插件（继承 BasePlugin）而非函数式插件，
 * 以获得更好的类型推导支持。
 */
export function singlePluginTypeAccumulation(): void {
	// 创建带扩展的应用
	const app = new App().addPlugin(logPluginFunctional);

	// 使用类型断言访问扩展方法（仅用于演示）
	const context = app.context as ContextWithLog;

	// 现在可以访问扩展方法
	const currentLevel = context.getLogLevel();
	print(`Current log level: ${currentLevel}`);

	// 设置新的日志级别
	context.setLogLevel("debug");

	// 再次获取验证
	const newLevel = context.getLogLevel();
	print(`New log level: ${newLevel}`);
}

// ============================================================================
// 示例 5: 类型累积 - 多个插件
// ============================================================================

/**
 * 展示多个插件的类型累积
 */
export function multiplePluginsTypeAccumulation(): void {
	// 依次添加多个带扩展的插件
	const app = new App()
		.addPlugin(logPluginFunctional) // App<Context & LogPluginExtension>
		.addPlugin(metricsPluginFunctional); // App<Context & LogPluginExtension & MetricsPluginExtension>

	// 使用类型断言访问多个插件的扩展方法
	const context = app.context as ContextWithLog & ContextWithMetrics;

	// 使用 LogPlugin 的扩展
	const logLevel = context.getLogLevel();
	print(`Log level: ${logLevel}`);

	// 使用 MetricsPlugin 的扩展
	const fps = context.getFps();
	const frameTime = context.getFrameTime();
	const entityCount = context.getEntityCount();

	print(`FPS: ${fps}, Frame Time: ${frameTime}ms, Entities: ${entityCount}`);

	// 所有扩展方法都可用且类型安全
	context.setLogLevel("trace");
}

// ============================================================================
// 示例 6: 类型累积 - 三个插件
// ============================================================================

/**
 * 展示三个插件的完整类型累积
 */
export function threePluginsTypeAccumulation(): void {
	const app = new App()
		.addPlugin(logPluginFunctional) // +LogPluginExtension
		.addPlugin(metricsPluginFunctional) // +MetricsPluginExtension
		.addPlugin(statePluginFunctional); // +StatePluginExtension

	// 使用类型断言访问所有三个插件的扩展方法
	const context = app.context as ContextWithLog & ContextWithMetrics & ContextWithState;

	// LogPlugin 扩展
	context.setLogLevel("info");
	print(`Log Level: ${context.getLogLevel()}`);

	// MetricsPlugin 扩展
	print(`FPS: ${context.getFps()}`);
	print(`Frame Time: ${context.getFrameTime()}`);
	print(`Entity Count: ${context.getEntityCount()}`);

	// StatePlugin 扩展
	context.setState(GameState.Playing);
	print(`Current State: ${context.getCurrentState()}`);
	print(`Previous State: ${context.getPreviousState()}`);

	// 完整的类型安全链式调用
	context.setState(GameState.Paused);

	if (context.getCurrentState() === GameState.Paused) {
		context.setLogLevel("debug");
		print(`Game paused, debug logging enabled`);
	}
}

// ============================================================================
// 示例 7: 混合使用带扩展和不带扩展的插件
// ============================================================================

/**
 * 简单插件（无扩展）
 */
const simpleNoExtensionPlugin = simplePlugin("SimplePlugin", (app) => {
	print("Simple plugin loaded (no extension)");
});

/**
 * 展示混合使用
 */
export function mixedPluginsExample(): void {
	const app = new App()
		.addPlugin(simpleNoExtensionPlugin) // 无扩展，类型不变
		.addPlugin(logPluginFunctional) // +LogPluginExtension
		.addPlugin(simpleNoExtensionPlugin) // 无扩展，类型不变
		.addPlugin(metricsPluginFunctional); // +MetricsPluginExtension

	// 只有带扩展的插件会添加方法到 context
	const context = app.context as ContextWithLog & ContextWithMetrics;
	context.setLogLevel("warn");
	const fps = context.getFps();
	print(`FPS: ${fps}`);
}

// ============================================================================
// 示例 8: 扩展方法访问其他扩展
// ============================================================================

/**
 * 高级插件扩展，其方法可以访问其他插件的扩展
 */
interface AdvancedPluginExtension {
	getStatus: ExtensionFactory<() => string>;
}

const advancedPluginFunctional = plugin<AdvancedPluginExtension>({
	name: "AdvancedPlugin",
	build: (app) => {
		print("Advanced plugin built");
	},
	extension: {
		getStatus: (world, context, plugin) => {
			return () => {
				// 可以访问 context 上的其他扩展方法
				const appContext = context as Context & {
					getLogLevel?: () => string;
					getFps?: () => number;
				};

				const logLevel = appContext.getLogLevel ? appContext.getLogLevel() : "unknown";
				const fps = appContext.getFps ? appContext.getFps() : 0;

				return `Status: LogLevel=${logLevel}, FPS=${fps}`;
			};
		},
	},
});

/**
 * 展示扩展方法之间的交互
 */
export function extensionInteractionExample(): void {
	const app = new App()
		.addPlugin(logPluginFunctional)
		.addPlugin(metricsPluginFunctional)
		.addPlugin(advancedPluginFunctional);

	// AdvancedPlugin 的扩展可以访问其他插件的扩展
	const context = app.context as ContextWithLog & ContextWithMetrics & { getStatus: () => string };
	const status = context.getStatus();
	print(status);
}

// ============================================================================
// 示例 9: 完整的游戏应用示例
// ============================================================================

/**
 * 完整的游戏应用，展示类型累积的实际应用
 */
export function completeGameExample(): void {
	// 创建游戏系统
	const gameInitSystem = (world: World, context: Context): void => {
		print("Game initialized");
	};

	const gameUpdateSystem = (world: World, context: Context): void => {
		// 游戏更新逻辑
	};

	// 构建应用
	const app = new App()
		// 添加核心插件（带扩展）
		.addPlugin(logPluginFunctional)
		.addPlugin(metricsPluginFunctional)
		.addPlugin(statePluginFunctional)
		// 添加游戏系统
		.addSystems(BuiltinSchedules.STARTUP, gameInitSystem)
		.addSystems(BuiltinSchedules.UPDATE, gameUpdateSystem);

	// 获取带扩展的 context
	const context = app.context as ContextWithLog & ContextWithMetrics & ContextWithState;

	// 初始化游戏状态
	context.setState(GameState.Menu);
	context.setLogLevel("info");

	// 游戏主循环前的配置
	print(`Initial State: ${context.getCurrentState()}`);
	print(`Initial Log Level: ${context.getLogLevel()}`);

	// 模拟游戏开始
	context.setState(GameState.Playing);
	print("Game started!");

	// 运行应用
	// app.run();
}

// ============================================================================
// 导出所有示例
// ============================================================================

export const extensionExamples = {
	singlePlugin: singlePluginTypeAccumulation,
	multiplePlugins: multiplePluginsTypeAccumulation,
	threePlugins: threePluginsTypeAccumulation,
	mixedPlugins: mixedPluginsExample,
	extensionInteraction: extensionInteractionExample,
	completeGame: completeGameExample,
};

export const extensionPlugins = {
	log: logPluginFunctional,
	metrics: metricsPluginFunctional,
	state: statePluginFunctional,
};
