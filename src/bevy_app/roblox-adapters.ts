/**
 * Roblox环境适配器
 * 提供特定于Roblox的功能和优化
 */

import { RunService } from "@rbxts/services";
import { App } from "./app";
import { BasePlugin } from "./plugin";
import { AppExit } from "./types";
import { BuiltinSchedules } from "./main-schedule";

/**
 * Roblox运行器插件
 * 集成Roblox的RunService来驱动App更新
 */
export class RobloxRunnerPlugin extends BasePlugin {
	constructor(
		private useHeartbeat: boolean = true,
		private useStepped: boolean = false,
		private useRenderStepped: boolean = false,
	) {
		super();
	}

	build(app: App): void {
		// 启动 Loop 来执行系统
		// 这样调试器的中间件才能正常工作
		task.defer(() => {
			this.startLoopExecution(app);
		});

		// 设置空的 runner，因为系统现在通过 Loop 运行
		app.setRunner((app: App) => {
			// Loop 已经在运行，不需要做任何事
			return app.shouldExit() ?? AppExit.success();
		});
	}

	name(): string {
		return "RobloxRunnerPlugin";
	}

	/**
	 * 启动 Loop 执行
	 */
	private startLoopExecution(app: App): void {
		const mainApp = app.main();

		// 创建事件映射
		// 将 Bevy 调度阶段映射到 Roblox 事件
		const events: { [scheduleLabel: string]: RBXScriptSignal } = {};

		// 选择主事件
		let mainEvent: RBXScriptSignal;
		if (this.useRenderStepped && RunService.IsClient()) {
			mainEvent = RunService.RenderStepped;
		} else if (this.useStepped) {
			mainEvent = RunService.Stepped;
		} else {
			mainEvent = RunService.Heartbeat;
		}

		// 映射所有 Bevy 调度阶段到同一个事件
		// 这样它们会按顺序执行
		events["default"] = mainEvent;
		events[BuiltinSchedules.FIRST] = mainEvent;
		events[BuiltinSchedules.PRE_STARTUP] = mainEvent;
		events[BuiltinSchedules.STARTUP] = mainEvent;
		events[BuiltinSchedules.POST_STARTUP] = mainEvent;
		events[BuiltinSchedules.PRE_UPDATE] = mainEvent;
		events[BuiltinSchedules.UPDATE] = mainEvent;
		events[BuiltinSchedules.POST_UPDATE] = mainEvent;
		events[BuiltinSchedules.LAST] = mainEvent;
		events[BuiltinSchedules.MAIN] = mainEvent;

		// 启动 Loop
		mainApp.startLoop(events);
	}
}
