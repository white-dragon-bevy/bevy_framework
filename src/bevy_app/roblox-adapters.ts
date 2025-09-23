/**
 * Roblox环境适配器
 * 提供特定于Roblox的功能和优化
 */

import { RunService, Players } from "@rbxts/services";
import { World } from "@rbxts/matter";
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

/**
 * Roblox网络插件
 * 提供客户端-服务端通信支持
 */
export class RobloxNetworkPlugin extends BasePlugin {
	build(app: App): void {
		// 根据运行环境添加不同的网络系统
		if (RunService.IsServer()) {
			app.addSystems(BuiltinSchedules.UPDATE, (world: World) => this.serverNetworkSystem(world));
		} else if (RunService.IsClient()) {
			app.addSystems(BuiltinSchedules.UPDATE, (world: World) => this.clientNetworkSystem(world));
		}
	}

	name(): string {
		return "RobloxNetworkPlugin";
	}

	/**
	 * 服务端网络系统
	 */
	private serverNetworkSystem(world: World): void {
		// 处理服务端网络逻辑
		// 例如：处理远程事件、复制数据等
	}

	/**
	 * 客户端网络系统
	 */
	private clientNetworkSystem(world: World): void {
		// 处理客户端网络逻辑
		// 例如：发送请求、接收数据等
	}
}

/**
 * Roblox玩家管理插件
 */
export class RobloxPlayerPlugin extends BasePlugin {
	build(app: App): void {
		// 添加玩家相关的系统
		app.addSystems(BuiltinSchedules.UPDATE, (world: World) => this.playerManagementSystem(world));

		// 监听玩家加入和离开事件
		if (RunService.IsServer()) {
			Players.PlayerAdded.Connect((player) => {
				this.onPlayerAdded(player, app);
			});

			Players.PlayerRemoving.Connect((player) => {
				this.onPlayerRemoving(player, app);
			});
		}
	}

	name(): string {
		return "RobloxPlayerPlugin";
	}

	/**
	 * 玩家管理系统
	 */
	private playerManagementSystem(world: World): void {
		// 更新玩家相关的ECS组件
	}

	/**
	 * 玩家加入时的处理
	 */
	private onPlayerAdded(player: Player, app: App): void {
		print(`Player ${player.Name} joined the game`);
		// 在ECS世界中为玩家创建实体
		const world = app.world();
		// 这里需要根据Matter的API来创建玩家实体
	}

	/**
	 * 玩家离开时的处理
	 */
	private onPlayerRemoving(player: Player, app: App): void {
		print(`Player ${player.Name} left the game`);
		// 清理玩家相关的ECS数据
		const world = app.world();
		// 这里需要根据Matter的API来清理玩家实体
	}
}

/**
 * Roblox资源管理插件
 */
export class RobloxAssetPlugin extends BasePlugin {
	build(app: App): void {
		// 添加资源加载系统
		app.addSystems(BuiltinSchedules.PRE_UPDATE, (world: World) => this.assetLoadingSystem(world));
	}

	name(): string {
		return "RobloxAssetPlugin";
	}

	/**
	 * 资源加载系统
	 */
	private assetLoadingSystem(world: World): void {
		// 处理异步资源加载
		// 管理模型、音频、贴图等资源
	}
}

/**
 * Roblox输入处理插件
 */
export class RobloxInputPlugin extends BasePlugin {
	build(app: App): void {
		if (RunService.IsClient()) {
			app.addSystems(BuiltinSchedules.PRE_UPDATE, (world: World) => this.inputSystem(world));
		}
	}

	name(): string {
		return "RobloxInputPlugin";
	}

	/**
	 * 输入处理系统
	 */
	private inputSystem(world: World): void {
		// 处理键盘、鼠标、触屏输入
		// 将输入事件转换为ECS事件
	}
}

/**
 * Roblox默认插件组
 * 包含常用的Roblox特定插件
 */
export class RobloxDefaultPlugins {
	static create(): RobloxDefaultPluginsBuilder {
		return new RobloxDefaultPluginsBuilder()
			.add(new RobloxRunnerPlugin())
			.add(new RobloxNetworkPlugin())
			.add(new RobloxPlayerPlugin())
			.add(new RobloxAssetPlugin())
			.add(new RobloxInputPlugin());
	}
}

/**
 * Roblox默认插件构建器
 */
export class RobloxDefaultPluginsBuilder {
	private plugins: BasePlugin[] = [];

	add(plugin: BasePlugin): this {
		this.plugins.push(plugin);
		return this;
	}

	remove<T extends BasePlugin>(pluginType: new (...args: unknown[]) => T): this {
		this.plugins = this.plugins.filter((plugin) => !(plugin instanceof pluginType));
		return this;
	}

	build(): BasePlugin[] {
		return [...this.plugins];
	}

	finish(app: App): void {
		for (const plugin of this.plugins) {
			app.addPlugin(plugin);
		}
	}
}

/**
 * Roblox环境检测工具
 */
export namespace RobloxEnvironment {
	/**
	 * 检查是否在Roblox Studio中运行
	 */
	export function isStudio(): boolean {
		return RunService.IsStudio();
	}

	/**
	 * 检查是否在服务端运行
	 */
	export function isServer(): boolean {
		return RunService.IsServer();
	}

	/**
	 * 检查是否在客户端运行
	 */
	export function isClient(): boolean {
		return RunService.IsClient();
	}

	/**
	 * 获取当前玩家（仅客户端）
	 */
	export function getLocalPlayer(): Player | undefined {
		if (!isClient()) return undefined;
		return Players.LocalPlayer;
	}

	/**
	 * 获取所有玩家（仅服务端）
	 */
	export function getAllPlayers(): Player[] {
		if (!isServer()) return [];
		return Players.GetPlayers();
	}
}
