/**
 * Debugger 插件
 * 从 bull-ecs start.ts 迁移的 debugger 逻辑
 */

import { BasePlugin, Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { World, AnySystem } from "@rbxts/matter";
import type { Loop as BevyLoop } from "../bevy_ecs/schedule/loop";
import type Plasma from "@rbxts/plasma";
import { createDebugger } from "./debugger";
import type { DebuggerOptions, IDebugger, DebuggerState } from "./types";
import { DefaultDebuggerOptions } from "./types";

const RunService = game.GetService("RunService");
const UserInputService = game.GetService("UserInputService");
const TextChatService = game.GetService("TextChatService");

/**
 * ECS Debugger 插件
 * 提供 Matter ECS 的调试界面和功能
 */
export class DebuggerPlugin extends BasePlugin {
	private debugger?: IDebugger;
	private options: DebuggerOptions;
	private getRenderableComponent?: (entityId: number) => { model: Model } | undefined;
	private loop?: BevyLoop<any>;
	private state?: DebuggerState;
	private app?: App;
	private isInitialized = false;

	/**
	 * 构造函数
	 * @param options 调试器配置选项
	 * @param getRenderableComponent 获取 Renderable 组件的函数
	 */
	constructor(
		options?: DebuggerOptions,
		getRenderableComponent?: (entityId: number) => { model: Model } | undefined,
	) {
		super();
		this.options = { ...DefaultDebuggerOptions, ...options };
		this.getRenderableComponent = getRenderableComponent;
	}
	ready(_app: App): boolean {
		return true;
	}
	finish?(_app: App): void {}
	cleanup?(_app: App): void {}

	/**
	 * 插件名称
	 */
	name(): string {
		return "DebuggerPlugin";
	}

	/**
	 * 插件是否唯一
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * 构建插件
	 */
	build(app: App): void {
		// 保存 app 引用，稍后使用
		this.app = app;

		// Studio 环境下初始化调试器
		// 服务端和客户端都需要初始化，以支持server view切换
		// 必须在 Loop.begin 之前调用 autoInitialize
		// 但跳过测试环境，避免访问不存在的 PlayerGui
		if (RunService.IsStudio() && !this.isTestEnvironment()) {
			task.defer(() => {
				// 延迟一帧，确保 App 完全初始化
				this.initializeDebugger();

				// 服务端GUI验证
				if (RunService.IsServer()) {
					task.wait(0.1);
					const ReplicatedStorage = game.GetService("ReplicatedStorage");
					const debuggerGui = ReplicatedStorage.FindFirstChild("MatterDebugger");
					if (debuggerGui) {

						// 监控GUI的Parent变化
						debuggerGui.GetPropertyChangedSignal("Parent").Connect(() => {
							print(
								"[DebuggerPlugin] Server GUI Parent changed to:",
								debuggerGui.Parent?.GetFullName() || "nil",
							);
						});
					} else {
						warn("[DebuggerPlugin] Server GUI NOT found in ReplicatedStorage!");
					}
				}

				// 客户端检查
				if (RunService.IsClient()) {
					task.wait(0.2); // 等待服务端GUI创建
					const ReplicatedStorage = game.GetService("ReplicatedStorage");
					const serverGui = ReplicatedStorage.FindFirstChild("MatterDebugger");
					if (serverGui) {
					} else {
						warn("[DebuggerPlugin] Client: Server GUI NOT found in ReplicatedStorage!");
					}
				}
			});
		}

		// 设置输入处理（仅客户端）
		if (RunService.IsClient()) {
			this.setupInputHandling();
			this.setupChatCommands();
		}
	}

	/**
	 * 设置输入处理
	 * 对应 start.ts:296-306
	 */
	private setupInputHandling(): void {
		UserInputService.InputBegan.Connect((input) => {
			if (input.KeyCode === this.options.toggleKey && RunService.IsStudio()) {
				if (this.debugger) {
					this.debugger.toggle();
					// 启用/禁用 Loop 的 profiling
					if (this.loop) {
						this.loop.profiling = this.debugger.enabled ? {} : undefined;
					}
					// 更新状态（如果有状态对象）
					if (this.state) {
						this.state.debugEnabled = !!(RunService.IsStudio() && this.debugger.enabled);
					}
				} else {
					warn("[DebuggerPlugin] Debugger not initialized yet!");
				}
			}
		});
	}

	/**
	 * 设置聊天命令
	 * 对应 start.ts:307-319
	 */
	private setupChatCommands(): void {
		let matterOpenCmd = TextChatService.FindFirstChild("TextChatCommands")?.FindFirstChild("MatterOpenCmd") as
			| TextChatCommand
			| undefined;

		if (matterOpenCmd === undefined) {
			matterOpenCmd = new Instance("TextChatCommand");
			matterOpenCmd.Name = "MatterOpenCmd";
			matterOpenCmd.PrimaryAlias = "/matter";
			matterOpenCmd.SecondaryAlias = "/matterdebug";
			matterOpenCmd.Triggered.Connect(() => {
				if (this.debugger) {
					this.debugger.toggle();
				} else {
					warn("[DebuggerPlugin] Debugger not initialized yet!");
				}
			});
			matterOpenCmd.Parent = TextChatService.FindFirstChild("TextChatCommands");
		}
	}

	/**
	 * 设置 Loop（供外部调用）
	 * 对应 start.ts:280 autoInitialize 调用
	 */
	public setLoop(loop: BevyLoop<any>): void {
		this.loop = loop;
		if (this.debugger) {
			this.debugger.autoInitialize(loop);
		}
	}

	/**
	 * 设置状态对象（供外部调用）
	 */
	public setState(state: DebuggerState): void {
		this.state = state;
		if (this.debugger) {
			state.debugEnabled = !!(RunService.IsStudio() && this.debugger.enabled);
		}
	}

	/**
	 * 替换系统（用于热重载）
	 * 对应 start.ts:240-243 replaceSystem 调用
	 */
	public replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void {
		if (this.debugger) {
			this.debugger.replaceSystem(oldSystem, newSystem);
		}
	}

	/**
	 * 获取调试器实例
	 */
	public getDebugger(): IDebugger | undefined {
		return this.debugger;
	}

	/**
	 * 获取 Widgets
	 */
	public getWidgets(): Plasma.Widgets | undefined {
		return this.debugger?.getWidgets();
	}

	/**
	 * 初始化调试器
	 * 必须在 Loop.begin() 之前调用
	 */
	private initializeDebugger(): void {
		if (this.isInitialized || !this.app) {
			return;
		}

		const world = this.app.getWorld();
		if (!world) {
			warn("DebuggerPlugin: World not found in App");
			return;
		}
		// 创建调试器实例
		this.debugger = createDebugger(world, this.options, this.getRenderableComponent);

		// 获取主 SubApp 的调度器并从中获取 Loop
		const mainApp = this.app.main();
		const schedules = mainApp.getSchedules();

		// 从 Schedules 获取 Loop
		if (schedules) {
			const loop = schedules.getLoop();
			if (loop) {
				// 调用 autoInitialize 设置 loop
				// 这个必须在 loop.begin() 之前调用
				this.debugger.autoInitialize(loop);
				this.loop = loop;
				// 启用 profiling
				if (this.debugger.enabled) {
					loop.profiling = {};
				}
			} else {
				warn("DebuggerPlugin: Loop not found in Schedules");
			}
		} else {
			warn("[DebuggerPlugin] Schedules not found!");
		}

		// 设置 Widgets
		const widgets = this.debugger.getWidgets();
		if (widgets) {
			this.app.insertResource({ debuggerWidgets: widgets });
		}

		this.isInitialized = true;
	}

	/**
	 * 检查是否在测试环境中运行
	 */
	private isTestEnvironment(): boolean {
		// 在测试环境中，通常没有 Players.LocalPlayer
		if (RunService.IsClient()) {
			const Players = game.GetService("Players");
			return Players.LocalPlayer === undefined || Players.LocalPlayer.FindFirstChild("PlayerGui") === undefined;
		}
		// 服务端测试环境检查
		return game.GetService("TestService").FindFirstChild("TestEz") !== undefined;
	}
}
