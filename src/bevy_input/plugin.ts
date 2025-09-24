/**
 * InputPlugin - 轻量级输入管理插件
 * 集成 Roblox UserInputService 与 ButtonInput 状态管理
 * 支持事件系统和状态管理
 */

import { UserInputService } from "@rbxts/services";
import { World } from "@rbxts/matter";
import { App } from "../bevy_app/app";
import { Plugin } from "../bevy_app/plugin";
import { MainScheduleLabel } from "../bevy_app/main-schedule";
import { ButtonInput } from "./button-input";
import { AccumulatedMouseMotion, AccumulatedMouseWheel, MouseButton, MousePosition } from "./mouse";
import * as ResourceStorage from "./resource-storage";
import { RobloxContext, isMatchRobloxContext } from "../utils/roblox-utils";
import { RunService } from "@rbxts/services";
import { EventWriter } from "../bevy_ecs/events";
import { ButtonState, CursorMoved, MouseButtonInput, MouseMotion, MouseWheel } from "./mouse-events";

/**
 * 输入资源键名常量
 */
export const InputResources = {
	Keyboard: "ButtonInput<KeyCode>",
	Mouse: "ButtonInput<MouseButton>",
	MouseMotion: "AccumulatedMouseMotion",
	MouseWheel: "AccumulatedMouseWheel",
	MousePosition: "MousePosition",
} as const;

/**
 * 输入管理插件
 * 提供键盘、鼠标输入的状态管理和事件系统
 */
export class InputPlugin implements Plugin {
	private connections: Array<RBXScriptConnection> = [];

	robloxContext?: RobloxContext.Client;

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		// 只在客户端运行
		if (RunService.IsServer()) {
			return;
		}

		const world = app.getWorld();

		// 初始化输入资源
		const keyboard = new ButtonInput<Enum.KeyCode>();
		const mouse = new ButtonInput<Enum.UserInputType>();
		const mouseMotion = new AccumulatedMouseMotion();
		const mouseWheel = new AccumulatedMouseWheel();
		const mousePosition = new MousePosition();

		// 存储资源到 World
		ResourceStorage.setKeyboardInput(world, keyboard);
		ResourceStorage.setMouseInput(world, mouse);
		ResourceStorage.setMouseMotion(world, mouseMotion);
		ResourceStorage.setMouseWheel(world, mouseWheel);
		ResourceStorage.setMousePosition(world, mousePosition);

		// 获取事件管理器并创建事件写入器
		const eventManager = app.main().getEventManager();
		const mouseButtonWriter = eventManager.createWriter(MouseButtonInput);
		const mouseMotionWriter = eventManager.createWriter(MouseMotion);
		const mouseWheelWriter = eventManager.createWriter(MouseWheel);
		const cursorMovedWriter = eventManager.createWriter(CursorMoved);

		// 添加调试日志
		print("[InputPlugin] Initializing input handlers on", RunService.IsClient() ? "CLIENT" : "SERVER");

		// 连接 Roblox 输入事件
		this.setupInputHandlers(
			keyboard,
			mouse,
			mouseMotion,
			mouseWheel,
			mousePosition,
			mouseButtonWriter,
			mouseMotionWriter,
			mouseWheelWriter,
			cursorMovedWriter,
		);

		// 添加帧清理系统
		app.addSystems(MainScheduleLabel.LAST, (worldParam: World) => {
			const keyboardResource = ResourceStorage.getKeyboardInput(worldParam);
			const mouseResource = ResourceStorage.getMouseInput(worldParam);

			if (keyboardResource) {
				// 清理 just_pressed 和 just_released 状态
				keyboardResource.clear();
			}
			if (mouseResource) {
				mouseResource.clear();
			}
		});
	}

	/**
	 * 设置输入事件处理器
	 */
	private setupInputHandlers(
		keyboard: ButtonInput<Enum.KeyCode>,
		mouse: ButtonInput<Enum.UserInputType>,
		mouseMotion: AccumulatedMouseMotion,
		mouseWheel: AccumulatedMouseWheel,
		mousePosition: MousePosition,
		mouseButtonWriter: EventWriter<MouseButtonInput>,
		mouseMotionWriter: EventWriter<MouseMotion>,
		mouseWheelWriter: EventWriter<MouseWheel>,
		cursorMovedWriter: EventWriter<CursorMoved>,
	): void {
		// 处理输入开始事件
		const inputBegan = UserInputService.InputBegan.Connect((input, gameProcessed) => {
			// 忽略被游戏 UI 处理的输入
			if (gameProcessed) {
				return;
			}

			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				print(`[InputPlugin] Key pressed: ${input.KeyCode}`);
				keyboard.press(input.KeyCode);
			} else if (
				input.UserInputType === Enum.UserInputType.MouseButton1 ||
				input.UserInputType === Enum.UserInputType.MouseButton2 ||
				input.UserInputType === Enum.UserInputType.MouseButton3
			) {
				print(`[InputPlugin] Mouse button pressed: ${input.UserInputType}`);
				mouse.press(input.UserInputType);
				// 发送鼠标按钮按下事件
				mouseButtonWriter.send(new MouseButtonInput(input.UserInputType, ButtonState.Pressed));
			}
		});

		// 处理输入结束事件
		const inputEnded = UserInputService.InputEnded.Connect((input, gameProcessed) => {
			// 即使被游戏 UI 处理，也要记录释放事件
			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				keyboard.release(input.KeyCode);
			} else if (
				input.UserInputType === Enum.UserInputType.MouseButton1 ||
				input.UserInputType === Enum.UserInputType.MouseButton2 ||
				input.UserInputType === Enum.UserInputType.MouseButton3
			) {
				mouse.release(input.UserInputType);
				// 发送鼠标按钮释放事件
				mouseButtonWriter.send(new MouseButtonInput(input.UserInputType, ButtonState.Released));
			}
		});

		// 处理输入变化事件（鼠标移动、滚轮等）
		const inputChanged = UserInputService.InputChanged.Connect((input, gameProcessed) => {
			if (gameProcessed) {
				return;
			}

			if (input.UserInputType === Enum.UserInputType.MouseMovement) {
				const delta = input.Delta;
				// 只有当有实际移动时才累积
				if (delta.X !== 0 || delta.Y !== 0) {
					mouseMotion.accumulate(delta.X, delta.Y);
					// 发送鼠标移动事件
					mouseMotionWriter.send(new MouseMotion(delta.X, delta.Y));
				}

				// 更新鼠标位置
				const position = input.Position;
				const newPos = new Vector2(position.X, position.Y);
				const oldPos = mousePosition.getPosition();
				mousePosition.update(newPos);

				// 发送光标移动事件
				cursorMovedWriter.send(new CursorMoved(newPos, newPos.sub(oldPos)));
			} else if (input.UserInputType === Enum.UserInputType.MouseWheel) {
				// 鼠标滚轮使用 Position.Z 作为滚动增量
				// 正值表示向前滚动，负值表示向后滚动
				const scrollDelta = input.Position.Z;
				if (scrollDelta !== 0) {
					mouseWheel.accumulate(scrollDelta);
					// 发送鼠标滚轮事件
					mouseWheelWriter.send(new MouseWheel(0, scrollDelta));
				}
			}
		});

		// 处理窗口焦点丢失
		const windowFocusReleased = UserInputService.WindowFocusReleased.Connect(() => {
			// 释放所有按键
			keyboard.releaseAll();
			mouse.releaseAll();
		});

		// 保存连接以便清理
		this.connections.push(inputBegan, inputEnded, inputChanged, windowFocusReleased);
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		return "InputPlugin";
	}

	/**
	 * 检查插件是否唯一
	 * @returns 总是返回 true
	 */
	public isUnique(): boolean {
		return true;
	}

	/**
	 * 清理插件资源
	 */
	public cleanup(): void {
		// 断开所有事件连接
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections.clear();
	}
}

// 重新导出 ResourceStorage 中的辅助函数
export { getKeyboardInput, getMouseInput, getMouseMotion, getMousePosition, getMouseWheel } from "./resource-storage";
