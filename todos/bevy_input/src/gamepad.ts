/**
 * @fileoverview 游戏手柄输入功能
 *
 * 提供游戏手柄输入事件、按钮/轴枚举和游戏手柄输入处理系统
 */

import { World } from "@rbxts/matter";
import { UserInputService, ContextActionService } from "@rbxts/services";
import { ButtonInput, ButtonState } from "./button-input";
import { Axis } from "./axis";
import { Event, EventManager } from "../../../src/bevy_ecs/events";
import { WorldExtensions } from "../../bevy_ecs/world-extensions";

/**
 * 游戏手柄实体标识
 */
export type Gamepad = number;

/**
 * 游戏手柄按钮
 */
export enum GamepadButton {
	// 动作按钮（右侧）
	South = "South", // A/Cross
	East = "East", // B/Circle
	North = "North", // Y/Triangle
	West = "West", // X/Square

	// 肩部按钮
	LeftTrigger = "LeftTrigger",
	LeftTrigger2 = "LeftTrigger2",
	RightTrigger = "RightTrigger",
	RightTrigger2 = "RightTrigger2",

	// 中间按钮
	Select = "Select",
	Start = "Start",
	Mode = "Mode",

	// 摇杆按钮
	LeftThumb = "LeftThumb",
	RightThumb = "RightThumb",

	// 方向键
	DPadUp = "DPadUp",
	DPadDown = "DPadDown",
	DPadLeft = "DPadLeft",
	DPadRight = "DPadRight",

	// 其他
	Other = "Other",
}

/**
 * 游戏手柄轴
 */
export enum GamepadAxis {
	/** 左摇杆 X 轴 */
	LeftStickX = "LeftStickX",
	/** 左摇杆 Y 轴 */
	LeftStickY = "LeftStickY",
	/** 右摇杆 X 轴 */
	RightStickX = "RightStickX",
	/** 右摇杆 Y 轴 */
	RightStickY = "RightStickY",
	/** 左扳机 */
	LeftZ = "LeftZ",
	/** 右扳机 */
	RightZ = "RightZ",
	/** 其他轴 */
	Other = "Other",
}

/**
 * 游戏手柄事件
 *
 * 用于保持事件的相对顺序
 */
export abstract class GamepadEvent implements Event {
	constructor(
		public readonly gamepad: Gamepad,
		public readonly timestamp?: number,
	) {}
}

/**
 * 游戏手柄连接事件
 */
export class GamepadConnectionEvent extends GamepadEvent {
	constructor(
		gamepad: Gamepad,
		public readonly connected: boolean,
		timestamp?: number,
	) {
		super(gamepad, timestamp);
	}
}

/**
 * 游戏手柄按钮变化事件
 */
export class GamepadButtonChangedEvent extends GamepadEvent {
	constructor(
		gamepad: Gamepad,
		public readonly button: GamepadButton,
		public readonly value: number,
		timestamp?: number,
	) {
		super(gamepad, timestamp);
	}
}

/**
 * 游戏手柄按钮状态变化事件
 */
export class GamepadButtonStateChangedEvent extends GamepadEvent {
	constructor(
		gamepad: Gamepad,
		public readonly button: GamepadButton,
		public readonly state: ButtonState,
		timestamp?: number,
	) {
		super(gamepad, timestamp);
	}
}

/**
 * 游戏手柄轴变化事件
 */
export class GamepadAxisChangedEvent extends GamepadEvent {
	constructor(
		gamepad: Gamepad,
		public readonly axis: GamepadAxis,
		public readonly value: number,
		timestamp?: number,
	) {
		super(gamepad, timestamp);
	}
}

/**
 * 原始游戏手柄按钮变化事件（未经过滤）
 */
export class RawGamepadButtonChangedEvent extends GamepadEvent {
	constructor(
		gamepad: Gamepad,
		public readonly button: GamepadButton,
		public readonly value: number,
		timestamp?: number,
	) {
		super(gamepad, timestamp);
	}
}

/**
 * 原始游戏手柄轴变化事件（未经过滤）
 */
export class RawGamepadAxisChangedEvent extends GamepadEvent {
	constructor(
		gamepad: Gamepad,
		public readonly axis: GamepadAxis,
		public readonly value: number,
		timestamp?: number,
	) {
		super(gamepad, timestamp);
	}
}

/**
 * 游戏手柄震动请求
 */
export class GamepadRumbleRequest implements Event {
	constructor(
		public readonly gamepad: Gamepad,
		public readonly duration: number,
		public readonly intensity: number,
		public readonly timestamp?: number,
	) {}
}

/**
 * 游戏手柄设置
 *
 * 用于配置死区和按钮阈值
 */
export class GamepadSettings {
	/** 按钮按下阈值 */
	public buttonPressThreshold = 0.75;
	/** 按钮释放阈值 */
	public buttonReleaseThreshold = 0.65;
	/** 轴死区下限 */
	public axisDeadzoneLowerBound = 0.12;
	/** 轴死区上限 */
	public axisDeadzoneUpperBound = 0.88;
	/** 轴活动区阈值 */
	public axisLivezoneLowerBound = 0.12;
	/** 轴活动区阈值 */
	public axisLivezoneUpperBound = 0.88;

	/**
	 * 过滤按钮值
	 */
	public filterButtonValue(value: number): number {
		return value;
	}

	/**
	 * 过滤轴值，应用死区
	 */
	public filterAxisValue(value: number): number {
		const absValue = math.abs(value);
		if (absValue < this.axisDeadzoneLowerBound) {
			return 0;
		}
		if (absValue > this.axisDeadzoneUpperBound) {
			return math.sign(value);
		}
		return value;
	}

	/**
	 * 检查按钮是否应该被按下
	 */
	public isButtonPressed(value: number): boolean {
		return value > this.buttonPressThreshold;
	}

	/**
	 * 检查按钮是否应该被释放
	 */
	public isButtonReleased(value: number): boolean {
		return value < this.buttonReleaseThreshold;
	}
}

/**
 * 将 Roblox KeyCode 映射到 GamepadButton
 */
function robloxKeyCodeToGamepadButton(keyCode: Enum.KeyCode): GamepadButton | undefined {
	const mapping: Record<string, GamepadButton> = {
		ButtonA: GamepadButton.South,
		ButtonB: GamepadButton.East,
		ButtonX: GamepadButton.West,
		ButtonY: GamepadButton.North,
		ButtonL1: GamepadButton.LeftTrigger,
		ButtonL2: GamepadButton.LeftTrigger2,
		ButtonR1: GamepadButton.RightTrigger,
		ButtonR2: GamepadButton.RightTrigger2,
		ButtonSelect: GamepadButton.Select,
		ButtonStart: GamepadButton.Start,
		ButtonL3: GamepadButton.LeftThumb,
		ButtonR3: GamepadButton.RightThumb,
		DPadUp: GamepadButton.DPadUp,
		DPadDown: GamepadButton.DPadDown,
		DPadLeft: GamepadButton.DPadLeft,
		DPadRight: GamepadButton.DPadRight,
	};

	return mapping[keyCode.Name];
}

/**
 * 游戏手柄连接系统
 *
 * 处理游戏手柄的连接和断开
 *
 * @param world - ECS 世界
 */
export function gamepadConnectionSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 处理连接事件
	const reader = eventManager.createReader<GamepadConnectionEvent>();
	const events = reader.read();

	for (const event of events) {
		if (event.connected) {
			print(`Gamepad ${event.gamepad} connected`);
		} else {
			print(`Gamepad ${event.gamepad} disconnected`);
		}
	}

	reader.cleanup();
}

/**
 * 游戏手柄事件处理系统
 *
 * 处理原始游戏手柄事件并转换为过滤后的事件
 *
 * @param world - ECS 世界
 */
export function gamepadEventProcessingSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 获取或创建游戏手柄设置
	let settings = extensions.getResource<GamepadSettings>();
	if (!settings) {
		settings = new GamepadSettings();
		extensions.insertResource(GamepadSettings, settings);
	}

	// 获取或创建游戏手柄按钮输入
	let buttonInputs = extensions.getResource<Map<Gamepad, ButtonInput<GamepadButton>>>();
	if (!buttonInputs) {
		buttonInputs = new Map<Gamepad, ButtonInput<GamepadButton>>();
		extensions.insertResource(Map<Gamepad, ButtonInput<GamepadButton>>, buttonInputs);
	}

	// 获取或创建游戏手柄轴
	let axes = extensions.getResource<Map<Gamepad, Axis<GamepadAxis>>>();
	if (!axes) {
		axes = new Map<Gamepad, Axis<GamepadAxis>>();
		extensions.insertResource(Map<Gamepad, Axis<GamepadAxis>>, axes);
	}

	// 处理原始按钮事件
	const buttonReader = eventManager.createReader<RawGamepadButtonChangedEvent>();
	const buttonEvents = buttonReader.read();

	for (const event of buttonEvents) {
		let buttonInput = buttonInputs.get(event.gamepad);
		if (!buttonInput) {
			buttonInput = new ButtonInput<GamepadButton>();
			buttonInputs.set(event.gamepad, buttonInput);
		}

		const filteredValue = settings.filterButtonValue(event.value);

		// 检查状态变化
		const wasPressed = buttonInput.isPressed(event.button);
		const isPressed = settings.isButtonPressed(filteredValue);

		if (!wasPressed && isPressed) {
			buttonInput.press(event.button);
			eventManager.send(
				GamepadButtonStateChangedEvent,
				new GamepadButtonStateChangedEvent(event.gamepad, event.button, ButtonState.Pressed),
			);
		} else if (wasPressed && settings.isButtonReleased(filteredValue)) {
			buttonInput.release(event.button);
			eventManager.send(
				GamepadButtonStateChangedEvent,
				new GamepadButtonStateChangedEvent(event.gamepad, event.button, ButtonState.Released),
			);
		}

		// 发送按钮变化事件
		eventManager.send(
			GamepadButtonChangedEvent,
			new GamepadButtonChangedEvent(event.gamepad, event.button, filteredValue),
		);
	}

	buttonReader.cleanup();

	// 处理原始轴事件
	const axisReader = eventManager.createReader<RawGamepadAxisChangedEvent>();
	const axisEvents = axisReader.read();

	for (const event of axisEvents) {
		let axis = axes.get(event.gamepad);
		if (!axis) {
			axis = new Axis<GamepadAxis>();
			axes.set(event.gamepad, axis);
		}

		const filteredValue = settings.filterAxisValue(event.value);
		axis.set(event.axis, filteredValue);

		// 发送轴变化事件
		eventManager.send(
			GamepadAxisChangedEvent,
			new GamepadAxisChangedEvent(event.gamepad, event.axis, filteredValue),
		);
	}

	axisReader.cleanup();

	// 清除所有游戏手柄的帧相关状态
	for (const [, buttonInput] of buttonInputs) {
		buttonInput.clear();
	}
}

/**
 * 设置 Roblox 游戏手柄输入监听
 *
 * 将 Roblox 游戏手柄事件转换为 Bevy 事件
 *
 * @param world - ECS 世界
 */
export function setupRobloxGamepadInput(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		warn("EventManager not found, cannot setup gamepad input");
		return;
	}

	// 跟踪已连接的游戏手柄
	const connectedGamepads = new Set<Gamepad>();

	// 监听游戏手柄输入
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		if (input.UserInputType === Enum.UserInputType.Gamepad1) {
			const gamepadId = 0; // Roblox 只支持一个游戏手柄

			// 检查是否是新连接
			if (!connectedGamepads.has(gamepadId)) {
				connectedGamepads.add(gamepadId);
				eventManager.send(GamepadConnectionEvent, new GamepadConnectionEvent(gamepadId, true));
			}

			// 处理按钮输入
			const button = robloxKeyCodeToGamepadButton(input.KeyCode);
			if (button) {
				eventManager.send(
					RawGamepadButtonChangedEvent,
					new RawGamepadButtonChangedEvent(gamepadId, button, 1.0),
				);
			}
		}
	});

	UserInputService.InputEnded.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		if (input.UserInputType === Enum.UserInputType.Gamepad1) {
			const gamepadId = 0;

			const button = robloxKeyCodeToGamepadButton(input.KeyCode);
			if (button) {
				eventManager.send(
					RawGamepadButtonChangedEvent,
					new RawGamepadButtonChangedEvent(gamepadId, button, 0.0),
				);
			}
		}
	});

	// 监听游戏手柄摇杆
	UserInputService.InputChanged.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		if (input.UserInputType === Enum.UserInputType.Gamepad1) {
			const gamepadId = 0;

			// 处理摇杆输入
			if (input.KeyCode === Enum.KeyCode.Thumbstick1) {
				const position = input.Position;
				eventManager.send(
					RawGamepadAxisChangedEvent,
					new RawGamepadAxisChangedEvent(gamepadId, GamepadAxis.LeftStickX, position.X),
				);
				eventManager.send(
					RawGamepadAxisChangedEvent,
					new RawGamepadAxisChangedEvent(gamepadId, GamepadAxis.LeftStickY, -position.Y),
				);
			} else if (input.KeyCode === Enum.KeyCode.Thumbstick2) {
				const position = input.Position;
				eventManager.send(
					RawGamepadAxisChangedEvent,
					new RawGamepadAxisChangedEvent(gamepadId, GamepadAxis.RightStickX, position.X),
				);
				eventManager.send(
					RawGamepadAxisChangedEvent,
					new RawGamepadAxisChangedEvent(gamepadId, GamepadAxis.RightStickY, -position.Y),
				);
			}
		}
	});

	// 监听游戏手柄断开
	UserInputService.GamepadDisconnected.Connect((gamepadNum) => {
		const gamepadId = gamepadNum.Value - 1; // Gamepad1 = 0
		if (connectedGamepads.has(gamepadId)) {
			connectedGamepads.delete(gamepadId);
			eventManager.send(GamepadConnectionEvent, new GamepadConnectionEvent(gamepadId, false));
		}
	});

	// 监听游戏手柄连接
	UserInputService.GamepadConnected.Connect((gamepadNum) => {
		const gamepadId = gamepadNum.Value - 1;
		if (!connectedGamepads.has(gamepadId)) {
			connectedGamepads.add(gamepadId);
			eventManager.send(GamepadConnectionEvent, new GamepadConnectionEvent(gamepadId, true));
		}
	});
}