/**
 * @fileoverview 输入插件
 *
 * 添加键盘、鼠标、游戏手柄和触摸输入到应用程序
 */

import { World } from "@rbxts/matter";
import type { Plugin } from "../../../src/bevy_app/plugin";
import type { App } from "../../../src/bevy_app/app";
import { BuiltinSchedules } from "../../../src/bevy_app/main-schedule";
import { EventManager } from "../../../src/bevy_ecs/events";
import { WorldExtensions } from "../../bevy_ecs/world-extensions";

// 导入所有输入相关模块
import { ButtonInput, ButtonState } from "./button-input";
import { Axis } from "./axis";
import {
	KeyCode,
	Key,
	KeyboardInput,
	KeyboardFocusLost,
	keyboardInputSystem,
	setupRobloxKeyboardInput,
} from "./keyboard";
import {
	MouseButton,
	MouseButtonInput,
	MouseMotion,
	MouseWheel,
	AccumulatedMouseMotion,
	AccumulatedMouseScroll,
	mouseButtonInputSystem,
	accumulateMouseMotionSystem,
	accumulateMouseScrollSystem,
	setupRobloxMouseInput,
} from "./mouse";
import {
	GamepadButton,
	GamepadAxis,
	GamepadConnectionEvent,
	GamepadButtonChangedEvent,
	GamepadButtonStateChangedEvent,
	GamepadAxisChangedEvent,
	RawGamepadButtonChangedEvent,
	RawGamepadAxisChangedEvent,
	GamepadRumbleRequest,
	GamepadSettings,
	gamepadConnectionSystem,
	gamepadEventProcessingSystem,
	setupRobloxGamepadInput,
} from "./gamepad";
import {
	TouchInput,
	TouchPhase,
	Touches,
	touchScreenInputSystem,
	setupRobloxTouchInput,
} from "./touch";

/**
 * 输入系统集合标签
 */
export const InputSystems = Symbol("InputSystems");

/**
 * 输入插件
 *
 * 添加键盘、鼠标、游戏手柄和触摸输入支持
 */
export class InputPlugin implements Plugin {
	public readonly name = "InputPlugin";

	/**
	 * 构建插件
	 * @param app - 应用程序实例
	 */
	public build(app: App): void {
		const world = app.getWorld();
		const extensions = WorldExtensions.get(world);

		// 确保事件管理器存在
		let eventManager = extensions.getResource<EventManager>();
		if (!eventManager) {
			eventManager = new EventManager(world);
			extensions.insertResource(EventManager, eventManager);
		}

		// 初始化键盘资源
		extensions.insertResource(ButtonInput<KeyCode>, new ButtonInput<KeyCode>());
		extensions.insertResource(ButtonInput<Key>, new ButtonInput<Key>());

		// 初始化鼠标资源
		extensions.insertResource(ButtonInput<MouseButton>, new ButtonInput<MouseButton>());
		extensions.insertResource(AccumulatedMouseMotion, new AccumulatedMouseMotion());
		extensions.insertResource(AccumulatedMouseScroll, new AccumulatedMouseScroll());

		// 初始化游戏手柄资源
		extensions.insertResource(
			Map<number, ButtonInput<GamepadButton>>,
			new Map<number, ButtonInput<GamepadButton>>(),
		);
		extensions.insertResource(Map<number, Axis<GamepadAxis>>, new Map<number, Axis<GamepadAxis>>());
		extensions.insertResource(GamepadSettings, new GamepadSettings());

		// 初始化触摸资源
		extensions.insertResource(Touches, new Touches());

		// 添加输入系统到 PreUpdate 阶段
		app.addSystems(BuiltinSchedules.PreUpdate, [
			// 键盘系统
			keyboardInputSystem,

			// 鼠标系统
			mouseButtonInputSystem,
			accumulateMouseMotionSystem,
			accumulateMouseScrollSystem,

			// 游戏手柄系统（注意顺序）
			gamepadConnectionSystem,
			gamepadEventProcessingSystem,

			// 触摸系统
			touchScreenInputSystem,
		]);

		// 设置 Roblox 输入监听器
		this.setupRobloxInputs(world);
	}

	/**
	 * 设置 Roblox 输入监听器
	 * @param world - ECS 世界
	 */
	private setupRobloxInputs(world: World): void {
		setupRobloxKeyboardInput(world);
		setupRobloxMouseInput(world);
		setupRobloxGamepadInput(world);
		setupRobloxTouchInput(world);
	}
}

/**
 * 创建默认输入插件
 * @returns 输入插件实例
 */
export function createInputPlugin(): InputPlugin {
	return new InputPlugin();
}