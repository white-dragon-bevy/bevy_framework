/**
 * Bevy App使用示例
 * 展示不同使用场景和最佳实践
 */

import { World } from "@rbxts/matter";
import {
	App,
	BasePlugin,
	BuiltinSchedules,
	RobloxDefaultPlugins,
	RobloxEnvironment,
	RobloxInputPlugin,
	createPlugin,
	createScheduleLabel,
} from "./index";

/**
 * 示例1：基础Hello World应用
 */
export function basicExample() {
	function helloWorldSystem(world: World) {
		print("Hello from Bevy App!");
	}

	App.new()
		.addSystems(BuiltinSchedules.Update, helloWorldSystem)
		.run();
}

/**
 * 示例2：自定义插件
 */
export function customPluginExample() {
	class LoggingPlugin extends BasePlugin {
		constructor(private logPrefix: string = "[Game]") {
			super();
		}

		build(app: App): void {
			// 添加初始化系统
			app.addSystems(BuiltinSchedules.Startup, this.initLoggingSystem.bind(this));

			// 添加更新系统
			app.addSystems(BuiltinSchedules.Update, this.loggingSystem.bind(this));
		}

		name(): string {
			return "LoggingPlugin";
		}

		private initLoggingSystem(world: World): void {
			print(`${this.logPrefix} Logging system initialized`);
		}

		private loggingSystem(world: World, deltaTime?: number): void {
			// 每隔一段时间输出日志
			if (tick() % 5 < 0.1) {
				print(`${this.logPrefix} Running... DeltaTime: ${deltaTime}`);
			}
		}
	}

	App.new()
		.addPlugin(new LoggingPlugin("[MyGame]"))
		.run();
}

/**
 * 示例3：函数式插件
 */
export function functionPluginExample() {
	const timerPlugin = createPlugin((app: App) => {
		let startTime = tick();

		function timerSystem(world: World) {
			const elapsed = tick() - startTime;
			if (elapsed > 10) {
				print("10 seconds have passed!");
				startTime = tick();
			}
		}

		app.addSystems(BuiltinSchedules.Update, timerSystem);
	}, "TimerPlugin");

	App.new()
		.addPlugin(timerPlugin)
		.run();
}

/**
 * 示例4：自定义调度
 */
export function customScheduleExample() {
	const PhysicsSchedule = createScheduleLabel("Physics");
	const RenderSchedule = createScheduleLabel("Render");

	function physicsSystem(world: World) {
		// 物理计算
	}

	function renderSystem(world: World) {
		// 渲染逻辑
	}

	function mainLoopSystem(world: World) {
		// 在主循环中手动运行自定义调度
		// 注意：这需要访问调度器API
	}

	App.new()
		.addSystems(PhysicsSchedule, physicsSystem)
		.addSystems(RenderSchedule, renderSystem)
		.addSystems(BuiltinSchedules.Update, mainLoopSystem)
		.run();
}

/**
 * 示例5：客户端-服务端应用
 */
export function clientServerExample() {
	if (RobloxEnvironment.isServer()) {
		// 服务端应用
		class ServerPlugin extends BasePlugin {
			build(app: App): void {
				app.addSystems(BuiltinSchedules.Update, this.serverLogic);
			}

			name(): string {
				return "ServerPlugin";
			}

			private serverLogic(world: World): void {
				// 服务端游戏逻辑
				// 处理玩家输入、游戏状态同步等
			}
		}

		App.new()
			.addPlugins(...RobloxDefaultPlugins.create().build())
			.addPlugin(new ServerPlugin())
			.run();
	} else if (RobloxEnvironment.isClient()) {
		// 客户端应用
		class ClientPlugin extends BasePlugin {
			build(app: App): void {
				app.addSystems(BuiltinSchedules.Update, this.clientLogic);
			}

			name(): string {
				return "ClientPlugin";
			}

			private clientLogic(world: World): void {
				// 客户端游戏逻辑
				// 处理输入、渲染、UI等
			}
		}

		App.new()
			.addPlugins(...RobloxDefaultPlugins.create().build())
			.addPlugin(new ClientPlugin())
			.run();
	}
}

/**
 * 示例6：资源管理
 */
export function resourceExample() {
	// 定义游戏配置资源
	interface GameConfig {
		readonly __brand: "Resource";
		playerSpeed: number;
		enemyCount: number;
		difficulty: "Easy" | "Medium" | "Hard";
	}

	const gameConfig: GameConfig = {
		__brand: "Resource",
		playerSpeed: 10,
		enemyCount: 5,
		difficulty: "Medium",
	};

	function gameSystem(world: World) {
		// 访问游戏配置资源
		// 注意：这需要Matter的资源API
	}

	App.new()
		.insertResource(gameConfig)
		.addSystems(BuiltinSchedules.Update, gameSystem)
		.run();
}

/**
 * 示例7：错误处理
 */
export function errorHandlingExample() {
	function errorHandler(error: unknown) {
		warn(`App Error: ${error}`);
		// 可以在这里添加错误报告、崩溃恢复等逻辑
	}

	function faultySystem(world: World) {
		// 故意抛出错误来测试错误处理
		if (math.random() < 0.01) {
			throw new Error("Random error occurred!");
		}
	}

	App.new()
		.setErrorHandler(errorHandler)
		.addSystems(BuiltinSchedules.Update, faultySystem)
		.run();
}

/**
 * 示例8：插件组合和配置
 */
export function pluginGroupExample() {
	// 创建自定义插件组
	const gamePlugins = RobloxDefaultPlugins.create()
		.remove(RobloxInputPlugin) // 移除默认输入插件
		.add(new CustomInputPlugin()) // 添加自定义输入插件
		.build();

	class CustomInputPlugin extends BasePlugin {
		build(app: App): void {
			if (RobloxEnvironment.isClient()) {
				app.addSystems(BuiltinSchedules.PreUpdate, this.customInputSystem);
			}
		}

		name(): string {
			return "CustomInputPlugin";
		}

		private customInputSystem(world: World): void {
			// 自定义输入处理逻辑
		}
	}

	App.new()
		.addPlugins(...gamePlugins)
		.run();
}

/**
 * 示例9：SubApp使用
 */
export function subAppExample() {
	const RenderLabel = { __brand: "AppLabel", name: "Render" } as const;

	// 创建渲染子应用
	const renderSubApp = new (class {
		// 这里需要SubApp的具体实现
		// 暂时使用注释占位
	})();

	function mainLogic(world: World) {
		// 主应用逻辑
	}

	function renderLogic(world: World) {
		// 渲染逻辑
	}

	App.new()
		.addSystems(BuiltinSchedules.Update, mainLogic)
		// .insertSubApp(RenderLabel, renderSubApp) // 需要SubApp实现
		.run();
}

/**
 * 示例10：性能监控
 */
export function performanceExample() {
	class PerformancePlugin extends BasePlugin {
		private frameCount = 0;
		private lastReportTime = tick();

		build(app: App): void {
			app.addSystems(BuiltinSchedules.Last, this.performanceMonitor.bind(this));
		}

		name(): string {
			return "PerformancePlugin";
		}

		private performanceMonitor(world: World): void {
			this.frameCount++;
			const currentTime = tick();

			// 每秒报告一次性能数据
			if (currentTime - this.lastReportTime >= 1) {
				const fps = this.frameCount / (currentTime - this.lastReportTime);
				print(`FPS: ${math.floor(fps * 100) / 100}`);

				this.frameCount = 0;
				this.lastReportTime = currentTime;
			}
		}
	}

	App.new()
		.addPlugin(new PerformancePlugin())
		.addSystems(BuiltinSchedules.Update, () => {
			// 模拟一些工作负载
			for (let i = 0; i < 1000; i++) {
				math.sqrt(i);
			}
		})
		.run();
}