/**
 * Roblox环境适配器
 * 提供特定于Roblox的功能和优化
 */

import { RunService } from "@rbxts/services";
import { App } from "./app";
import { BasePlugin } from "./plugin";
import { AppExit } from "./types";

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
		if (this.useHeartbeat) {
			app.setRunner((app: App) => this.heartbeatRunner(app));
		} else if (this.useStepped) {
			app.setRunner((app: App) => this.steppedRunner(app));
		} else if (this.useRenderStepped) {
			app.setRunner((app: App) => this.renderSteppedRunner(app));
		}
	}

	name(): string {
		return "RobloxRunnerPlugin";
	}

	/**
	 * 使用Heartbeat事件驱动的运行器
	 * 适用于游戏逻辑更新
	 */
	private heartbeatRunner(app: App) {
		let isRunning = true;

		const connection = RunService.Heartbeat.Connect((deltaTime: number) => {
			if (!isRunning) return;

			try {
				app.update();

				const exit = app.shouldExit();
				if (exit) {
					isRunning = false;
					connection.Disconnect();
					return exit;
				}
			} catch (e) {
				const errorHandler = app.getErrorHandler();
				if (errorHandler) {
					errorHandler(e);
				}
			}
		});

		// 返回成功退出状态
		return app.shouldExit() ?? AppExit.success();
	}

	/**
	 * 使用Stepped事件驱动的运行器
	 * 适用于物理模拟
	 */
	private steppedRunner(app: App) {
		let isRunning = true;

		const connection = RunService.Stepped.Connect((time: number, deltaTime: number) => {
			if (!isRunning) return;

			try {
				app.update();

				const exit = app.shouldExit();
				if (exit) {
					isRunning = false;
					connection.Disconnect();
					return exit;
				}
			} catch (error) {
				const errorHandler = app.getErrorHandler();
				if (errorHandler) {
					errorHandler(error);
				}
			}
		});

		return app.shouldExit() ?? AppExit.success();
	}

	/**
	 * 使用RenderStepped事件驱动的运行器
	 * 适用于渲染相关更新（仅客户端）
	 */
	private renderSteppedRunner(app: App) {
		if (!RunService.IsClient()) {
			error("RenderStepped runner can only be used on the client");
		}

		let isRunning = true;

		const connection = RunService.RenderStepped.Connect((deltaTime: number) => {
			if (!isRunning) return;

			try {
				app.update();

				const exit = app.shouldExit();
				if (exit) {
					isRunning = false;
					connection.Disconnect();
					return exit;
				}
			} catch (error) {
				const errorHandler = app.getErrorHandler();
				if (errorHandler) {
					errorHandler(error);
				}
			}
		});

		return app.shouldExit() ?? AppExit.success();
	}
}
