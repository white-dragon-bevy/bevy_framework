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
		// 设置自定义 runner
		app.setRunner((app: App) => {
			// 执行启动序列（只执行一次）
			this.runStartupOnce(app);

			// 启动主循环
			task.defer(() => {
				this.startMainLoop(app);
			});

			// 返回成功
			return app.shouldExit() ?? AppExit.success();
		});
	}

	name(): string {
		return "RobloxRunnerPlugin";
	}

	/**
	 * 执行启动序列（只执行一次）
	 */
	private runStartupOnce(app: App): void {
		// 等待所有插件准备完成
		while (app.getPluginState() === "Adding") {
			task.wait();
		}

		// 完成插件设置
		app.finish();
		app.cleanup();

		// 手动执行启动调度（只执行一次）
		const mainApp = app.main();
		const world = mainApp.world();
		const schedules = mainApp.getSchedules();

		// 执行启动序列
		const startupSchedules = [BuiltinSchedules.PRE_STARTUP, BuiltinSchedules.STARTUP, BuiltinSchedules.POST_STARTUP];
		for (const scheduleLabel of startupSchedules) {
			const schedule = schedules.getSchedule(scheduleLabel);
			if (schedule) {
				const compiledSystems = schedule.compile();
				for (const systemStruct of compiledSystems) {
					try {
						systemStruct.system(world.getWorld(), mainApp.getContext());
					} catch (err) {
						const errorHandler = mainApp.getErrorHandler();
						if (errorHandler) {
							errorHandler(err);
						} else {
							throw err;
						}
					}
				}
			}
		}

		// 执行命令缓冲和事件清理
		mainApp.getCommandBuffer().flush(world.getWorld());
		mainApp.getEventManager().cleanup();
	}

	/**
	 * 启动主循环
	 */
	private startMainLoop(app: App): void {
		const mainApp = app.main();

		// 创建事件映射（只包含主循环调度）
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

		// 只映射主循环调度（不包含 STARTUP）
		events["default"] = mainEvent;
		events[BuiltinSchedules.FIRST] = mainEvent;
		events[BuiltinSchedules.PRE_UPDATE] = mainEvent;
		events[BuiltinSchedules.UPDATE] = mainEvent;
		events[BuiltinSchedules.POST_UPDATE] = mainEvent;
		events[BuiltinSchedules.LAST] = mainEvent;
		events[BuiltinSchedules.MAIN] = mainEvent;

		// 先运行一次启动调度
		mainApp.runStartupSchedule();

		// 启动 Loop（只包含常规调度）
		mainApp.startLoop(events);
	}
}