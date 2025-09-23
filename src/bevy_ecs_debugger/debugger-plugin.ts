/**
 * Debugger 插件
 * 从 bull-ecs start.ts 迁移的 debugger 逻辑
 */

import { Plugin } from "../bevy_app/plugin";
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
export class DebuggerPlugin implements Plugin {
	private debugger?: IDebugger;
	private options: DebuggerOptions;
	private getRenderableComponent?: (entityId: number) => { model: Model } | undefined;
	private loop?: Loop<unknown[]>;
	private state?: DebuggerState;

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
		// 获取 World
		// 使用 App.world() 方法获取 WorldContainer，然后获取 Matter World
		const world = app.getWorld();
		if (!world) {
			warn("DebuggerPlugin: World not found in App");
			return;
		}

		// 创建调试器实例
		// 对应 start.ts:200 getDebugger 调用
		this.debugger = createDebugger(world, this.options, this.getRenderableComponent);

		// 设置 Widgets（需要根据实际 context 结构调整）
		// 对应 start.ts:203
		const widgets = this.debugger.getWidgets();
		// 这里需要将 widgets 存储到合适的位置，比如 App 的资源系统
		app.insertResource({ debuggerWidgets: widgets });

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
		if (!this.debugger) return;

		UserInputService.InputBegan.Connect((input) => {
			if (input.KeyCode === this.options.toggleKey && RunService.IsStudio()) {
				this.debugger!.toggle();
				// 更新状态（如果有状态对象）
				if (this.state) {
					this.state.debugEnabled = !!(RunService.IsStudio() && this.debugger!.enabled);
				}
			}
		});
	}

	/**
	 * 设置聊天命令
	 * 对应 start.ts:307-319
	 */
	private setupChatCommands(): void {
		if (!this.debugger) return;

		let matterOpenCmd = TextChatService.FindFirstChild("TextChatCommands")?.FindFirstChild("MatterOpenCmd") as
			| TextChatCommand
			| undefined;

		if (matterOpenCmd === undefined) {
			matterOpenCmd = new Instance("TextChatCommand");
			matterOpenCmd.Name = "MatterOpenCmd";
			matterOpenCmd.PrimaryAlias = "/matter";
			matterOpenCmd.SecondaryAlias = "/matterdebug";
			matterOpenCmd.Triggered.Connect(() => {
				this.debugger!.toggle();
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
}
