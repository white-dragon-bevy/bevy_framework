/**
 * Debugger 插件
 * 从 bull-ecs start.ts 迁移的 debugger 逻辑
 */

import { BasePlugin, Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { World, Loop, AnySystem } from "@rbxts/matter";
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
export class DebuggerPlugin implements BasePlugin {
	private debugger?: IDebugger;
	private options: DebuggerOptions;
	private getRenderableComponent?: (entityId: number) => { model: Model } | undefined;
	private loop?: Loop<unknown[]>;
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

		// 服务端需要预先初始化 RemoteEvent 和调试器
		// 这样客户端的 WaitForChild 才不会无限等待
		if (RunService.IsServer()) {
			this.ensureRemoteEventExists();
			// 服务端在 Studio 环境下也初始化调试器
			if (RunService.IsStudio()) {
				task.defer(() => {
					// 延迟一帧，确保 App 完全初始化
					this.ensureDebuggerInitialized();
				});
			}
		}

		// 设置输入处理（仅客户端）
		// 对应 start.ts:296-306
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
				// 延迟初始化调试器
				this.ensureDebuggerInitialized();
				if (this.debugger) {
					this.debugger.toggle();
					// 更新状态（如果有状态对象）
					if (this.state) {
						this.state.debugEnabled = !!(RunService.IsStudio() && this.debugger.enabled);
					}
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
				// 延迟初始化调试器
				this.ensureDebuggerInitialized();
				if (this.debugger) {
					this.debugger.toggle();
				}
			});
			matterOpenCmd.Parent = TextChatService.FindFirstChild("TextChatCommands");
		}
	}

	/**
	 * 设置 Loop（供外部调用）
	 * 对应 start.ts:280 autoInitialize 调用
	 */
	public setLoop(loop: Loop<unknown[]>): void {
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
	 * 确保调试器已初始化
	 * 延迟初始化，仅在需要时创建
	 */
	private ensureDebuggerInitialized(): void {
		if (this.isInitialized || !this.app) return;

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
				this.debugger.autoInitialize(loop);
				this.loop = loop;
			} else {
				warn("DebuggerPlugin: Loop not found in Schedules");
			}
		}

		// 设置 Widgets
		const widgets = this.debugger.getWidgets();
		if (widgets) {
			this.app.insertResource({ debuggerWidgets: widgets });
		}

		this.isInitialized = true;
	}

	/**
	 * 确保 RemoteEvent 存在（服务端）
	 * 预先创建 RemoteEvent，避免客户端无限等待
	 */
	private ensureRemoteEventExists(): void {
		const ReplicatedStorage = game.GetService("ReplicatedStorage");
		let remoteEvent = ReplicatedStorage.FindFirstChild("MatterDebuggerRemote") as RemoteEvent | undefined;

		if (!remoteEvent) {
			remoteEvent = new Instance("RemoteEvent");
			remoteEvent.Name = "MatterDebuggerRemote";
			remoteEvent.Parent = ReplicatedStorage;
		}
	}
}
