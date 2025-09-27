/**
 * InputPlugin - 轻量级输入管理插件
 * 集成 Roblox UserInputService 与 ButtonInput 状态管理
 * 支持事件系统和状态管理
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
import { MessageWriter as EventWriter } from "../bevy_ecs/message";
import { ButtonState, CursorMoved, MouseButtonInput, MouseMotion, MouseWheel } from "./mouse-events";
import { Key, KeyboardFocusLost, KeyboardInput } from "./keyboard";
import {
	GamepadAxis,
	GamepadAxisChangedEvent,
	GamepadButton,
	GamepadButtonChangedEvent,
	GamepadButtonStateChangedEvent,
	GamepadConnection,
	GamepadConnectionEvent,
	GamepadManager,
	RawGamepadAxisChangedEvent,
	RawGamepadButtonChangedEvent,
} from "./gamepad";
import {
	DoubleTapGesture,
	GestureManager,
	LongPressGesture,
	PanGesture,
	PinchGesture,
	RotationGesture,
} from "./gestures";

/**
 * 输入资源键名常量
 */
export const InputResources = {
	Gamepad: "GamepadManager",
	Gestures: "GestureManager",
	Key: "ButtonInput<Key>",
	Keyboard: "ButtonInput<KeyCode>",
	Mouse: "ButtonInput<MouseButton>",
	MouseMotion: "AccumulatedMouseMotion",
	MousePosition: "MousePosition",
	MouseWheel: "AccumulatedMouseWheel",
} as const;

/**
 * 将 Roblox KeyCode 映射到 GamepadButton
 * @param keyCode - Roblox KeyCode
 * @returns GamepadButton 或 undefined
 */
function mapKeyCodeToGamepadButton(keyCode: Enum.KeyCode): GamepadButton | undefined {
	const mapping: Record<string, GamepadButton> = {
		ButtonA: GamepadButton.South,
		ButtonB: GamepadButton.East,
		ButtonX: GamepadButton.West,
		ButtonY: GamepadButton.North,
		ButtonL1: GamepadButton.LeftShoulder,
		ButtonL2: GamepadButton.LeftTrigger,
		ButtonL3: GamepadButton.LeftThumb,
		ButtonR1: GamepadButton.RightShoulder,
		ButtonR2: GamepadButton.RightTrigger,
		ButtonR3: GamepadButton.RightThumb,
		ButtonSelect: GamepadButton.Select,
		ButtonStart: GamepadButton.Start,
		ButtonMode: GamepadButton.Mode,
		DPadUp: GamepadButton.DPadUp,
		DPadDown: GamepadButton.DPadDown,
		DPadLeft: GamepadButton.DPadLeft,
		DPadRight: GamepadButton.DPadRight,
	};

	return mapping[keyCode.Name];
}

/**
 * 将 Roblox KeyCode 映射到 GamepadAxis
 * @param keyCode - Roblox KeyCode
 * @returns GamepadAxis 或 undefined
 */
function mapKeyCodeToGamepadAxis(keyCode: Enum.KeyCode): GamepadAxis | undefined {
	const mapping: Record<string, GamepadAxis> = {
		Thumbstick1: GamepadAxis.LeftStickX, // 实际使用 Position.X
		Thumbstick2: GamepadAxis.RightStickX, // 实际使用 Position.X
	};

	return mapping[keyCode.Name];
}

/**
 * 检查 UserInputType 是否为游戏手柄
 * @param inputType - UserInputType
 * @returns 如果是游戏手柄返回 true
 */
function isGamepadInput(inputType: Enum.UserInputType): boolean {
	return (
		inputType === Enum.UserInputType.Gamepad1 ||
		inputType === Enum.UserInputType.Gamepad2 ||
		inputType === Enum.UserInputType.Gamepad3 ||
		inputType === Enum.UserInputType.Gamepad4 ||
		inputType === Enum.UserInputType.Gamepad5 ||
		inputType === Enum.UserInputType.Gamepad6 ||
		inputType === Enum.UserInputType.Gamepad7 ||
		inputType === Enum.UserInputType.Gamepad8
	);
}

/**
 * 输入管理插件
 * 提供键盘、鼠标、游戏手柄输入的状态管理和事件系统
 */
export class InputPlugin implements Plugin {
	private connections: Array<RBXScriptConnection> = [];
	private gestureManager?: GestureManager;

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
		const gamepadManager = new GamepadManager();
		const gestureManager = new GestureManager();
		const keyInputValue = new ButtonInput<Key>();
		const keyboard = new ButtonInput<Enum.KeyCode>();
		const mouse = new ButtonInput<Enum.UserInputType>();
		const mouseMotion = new AccumulatedMouseMotion();
		const mouseWheel = new AccumulatedMouseWheel();
		const mousePosition = new MousePosition();

		// 存储资源到 World
		ResourceStorage.setGamepadManager(world, gamepadManager);
		ResourceStorage.setGestureManager(world, gestureManager);
		ResourceStorage.setKeyInput(world, keyInputValue);
		ResourceStorage.setKeyboardInput(world, keyboard);
		ResourceStorage.setMouseInput(world, mouse);
		ResourceStorage.setMouseMotion(world, mouseMotion);
		ResourceStorage.setMouseWheel(world, mouseWheel);
		ResourceStorage.setMousePosition(world, mousePosition);

		// 获取事件管理器并创建事件写入器
		const eventManager = app.main().getEventManager();
		const cursorMovedWriter = eventManager.createWriter<CursorMoved>();
		const doubleTapWriter = eventManager.createWriter<DoubleTapGesture>();
		const gamepadAxisChangedWriter = eventManager.createWriter<GamepadAxisChangedEvent>();
		const gamepadButtonChangedWriter = eventManager.createWriter<GamepadButtonChangedEvent>();
		const gamepadButtonStateChangedWriter = eventManager.createWriter<GamepadButtonStateChangedEvent>();
		const gamepadConnectionWriter = eventManager.createWriter<GamepadConnectionEvent>();
		const keyboardInputWriter = eventManager.createWriter<KeyboardInput>();
		const keyboardFocusLostWriter = eventManager.createWriter<KeyboardFocusLost>();
		const longPressWriter = eventManager.createWriter<LongPressGesture>();
		const mouseButtonWriter = eventManager.createWriter<MouseButtonInput>();
		const mouseMotionWriter = eventManager.createWriter<MouseMotion>();
		const mouseWheelWriter = eventManager.createWriter<MouseWheel>();
		const panWriter = eventManager.createWriter<PanGesture>();
		const pinchWriter = eventManager.createWriter<PinchGesture>();
		const rawGamepadAxisChangedWriter = eventManager.createWriter<RawGamepadAxisChangedEvent>();
		const rawGamepadButtonChangedWriter = eventManager.createWriter<RawGamepadButtonChangedEvent>();
		const rotationWriter = eventManager.createWriter<RotationGesture>();

		// 添加调试日志
		print("[InputPlugin] Initializing input handlers on", RunService.IsClient() ? "CLIENT" : "SERVER");

		// 设置游戏手柄连接事件
		this.setupGamepadConnections(gamepadManager, gamepadConnectionWriter);

		// 设置手势事件处理器
		this.gestureManager = gestureManager;
		gestureManager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);

		this.setupInputHandlers(
			gamepadManager,
			keyInputValue,
			keyboard,
			mouse,
			mouseMotion,
			mouseWheel,
			mousePosition,
			cursorMovedWriter,
			gamepadAxisChangedWriter,
			gamepadButtonChangedWriter,
			gamepadButtonStateChangedWriter,
			gamepadConnectionWriter,
			keyboardInputWriter,
			keyboardFocusLostWriter,
			mouseButtonWriter,
			mouseMotionWriter,
			mouseWheelWriter,
			rawGamepadAxisChangedWriter,
			rawGamepadButtonChangedWriter,
		);

		// 添加帧清理系统 - 在 PreUpdate 阶段清理上一帧的状态
		app.addSystems(MainScheduleLabel.PRE_UPDATE, (worldParam: World) => {
			const gamepadResource = ResourceStorage.getGamepadManager(worldParam);
			const keyInputResource = ResourceStorage.getKeyInput(worldParam);
			const keyboardResource = ResourceStorage.getKeyboardInput(worldParam);
			const mouseResource = ResourceStorage.getMouseInput(worldParam);

			if (gamepadResource) {
				gamepadResource.clearAll();
			}

			if (keyInputResource) {
				keyInputResource.clear();
			}

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
	 * 设置游戏手柄连接事件
	 * @param gamepadManager - 游戏手柄管理器
	 * @param connectionWriter - 连接事件写入器
	 */
	private setupGamepadConnections(
		gamepadManager: GamepadManager,
		connectionWriter: EventWriter<GamepadConnectionEvent>,
	): void {
		// 监听游戏手柄连接
		const gamepadConnected = UserInputService.GamepadConnected.Connect((gamepadId) => {
			print(`[InputPlugin] Gamepad connected: ${gamepadId.Name}`);
			gamepadManager.add(gamepadId, gamepadId.Name);
			connectionWriter.send(new GamepadConnectionEvent(gamepadId, GamepadConnection.Connected));
		});

		// 监听游戏手柄断开
		const gamepadDisconnected = UserInputService.GamepadDisconnected.Connect((gamepadId) => {
			print(`[InputPlugin] Gamepad disconnected: ${gamepadId.Name}`);
			gamepadManager.remove(gamepadId);
			connectionWriter.send(new GamepadConnectionEvent(gamepadId, GamepadConnection.Disconnected));
		});

		// 检查已连接的游戏手柄
		const connectedGamepads = UserInputService.GetConnectedGamepads();

		for (const gamepadId of connectedGamepads) {
			print(`[InputPlugin] Detected connected gamepad: ${gamepadId.Name}`);
			gamepadManager.add(gamepadId, gamepadId.Name);
			connectionWriter.send(new GamepadConnectionEvent(gamepadId, GamepadConnection.Connected));
		}

		this.connections.push(gamepadConnected, gamepadDisconnected);
	}

	/**
	 * 设置输入事件处理器
	 */
	private setupInputHandlers(
		gamepadManager: GamepadManager,
		keyInputValue: ButtonInput<Key>,
		keyboard: ButtonInput<Enum.KeyCode>,
		mouse: ButtonInput<Enum.UserInputType>,
		mouseMotion: AccumulatedMouseMotion,
		mouseWheel: AccumulatedMouseWheel,
		mousePosition: MousePosition,
		cursorMovedWriter: EventWriter<CursorMoved>,
		gamepadAxisChangedWriter: EventWriter<GamepadAxisChangedEvent>,
		gamepadButtonChangedWriter: EventWriter<GamepadButtonChangedEvent>,
		gamepadButtonStateChangedWriter: EventWriter<GamepadButtonStateChangedEvent>,
		gamepadConnectionWriter: EventWriter<GamepadConnectionEvent>,
		keyboardInputWriter: EventWriter<KeyboardInput>,
		keyboardFocusLostWriter: EventWriter<KeyboardFocusLost>,
		mouseButtonWriter: EventWriter<MouseButtonInput>,
		mouseMotionWriter: EventWriter<MouseMotion>,
		mouseWheelWriter: EventWriter<MouseWheel>,
		rawGamepadAxisChangedWriter: EventWriter<RawGamepadAxisChangedEvent>,
		rawGamepadButtonChangedWriter: EventWriter<RawGamepadButtonChangedEvent>,
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

				// 获取逻辑键（字符）- 在 Roblox 中使用 KeyCode 的名称作为逻辑键
				const logicalKey = input.KeyCode.Name;
				keyInputValue.press(logicalKey);

				// 发送键盘输入事件
				keyboardInputWriter.send(
					new KeyboardInput(input.KeyCode, logicalKey, ButtonState.Pressed, undefined, false),
				);
			} else if (
				input.UserInputType === Enum.UserInputType.MouseButton1 ||
				input.UserInputType === Enum.UserInputType.MouseButton2 ||
				input.UserInputType === Enum.UserInputType.MouseButton3
			) {
				print(`[InputPlugin] Mouse button pressed: ${input.UserInputType}`);
				mouse.press(input.UserInputType);
				// 发送鼠标按钮按下事件
				mouseButtonWriter.send(new MouseButtonInput(input.UserInputType, ButtonState.Pressed));
			} else if (isGamepadInput(input.UserInputType)) {
				// 处理游戏手柄按钮输入
				const button = mapKeyCodeToGamepadButton(input.KeyCode);

				if (button) {
					const gamepadState = gamepadManager.get(input.UserInputType);

					if (gamepadState) {
						const value = 1.0; // 按钮按下时值为 1.0
						const settings = gamepadManager.settings.getButtonSettings(button);

						// 发送原始事件
						rawGamepadButtonChangedWriter.send(
							new RawGamepadButtonChangedEvent(input.UserInputType, button, value),
						);

						// 应用阈值过滤
						if (settings.isPressed(value)) {
							gamepadState.buttons.press(button);
							gamepadState.setButtonValue(button, value);

							// 发送状态变化事件
							gamepadButtonStateChangedWriter.send(
								new GamepadButtonStateChangedEvent(input.UserInputType, button, ButtonState.Pressed),
							);

							// 发送按钮变化事件
							gamepadButtonChangedWriter.send(
								new GamepadButtonChangedEvent(
									input.UserInputType,
									button,
									ButtonState.Pressed,
									value,
								),
							);
						}
					}
				}
			}
		});

		// 处理输入结束事件
		const inputEnded = UserInputService.InputEnded.Connect((input, gameProcessed) => {
			// 即使被游戏 UI 处理，也要记录释放事件
			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				keyboard.release(input.KeyCode);

				// 释放逻辑键
				const logicalKey = input.KeyCode.Name;
				keyInputValue.release(logicalKey);

				// 发送键盘输入事件
				keyboardInputWriter.send(
					new KeyboardInput(input.KeyCode, logicalKey, ButtonState.Released, undefined, false),
				);
			} else if (
				input.UserInputType === Enum.UserInputType.MouseButton1 ||
				input.UserInputType === Enum.UserInputType.MouseButton2 ||
				input.UserInputType === Enum.UserInputType.MouseButton3
			) {
				mouse.release(input.UserInputType);
				// 发送鼠标按钮释放事件
				mouseButtonWriter.send(new MouseButtonInput(input.UserInputType, ButtonState.Released));
			} else if (isGamepadInput(input.UserInputType)) {
				// 处理游戏手柄按钮释放
				const button = mapKeyCodeToGamepadButton(input.KeyCode);

				if (button) {
					const gamepadState = gamepadManager.get(input.UserInputType);

					if (gamepadState) {
						const value = 0.0; // 按钮释放时值为 0.0
						const settings = gamepadManager.settings.getButtonSettings(button);

						// 发送原始事件
						rawGamepadButtonChangedWriter.send(
							new RawGamepadButtonChangedEvent(input.UserInputType, button, value),
						);

						// 应用阈值过滤
						if (settings.isReleased(value)) {
							gamepadState.buttons.release(button);
							gamepadState.setButtonValue(button, value);

							// 发送状态变化事件
							gamepadButtonStateChangedWriter.send(
								new GamepadButtonStateChangedEvent(input.UserInputType, button, ButtonState.Released),
							);

							// 发送按钮变化事件
							gamepadButtonChangedWriter.send(
								new GamepadButtonChangedEvent(
									input.UserInputType,
									button,
									ButtonState.Released,
									value,
								),
							);
						}
					}
				}
			}
		});

		// 处理输入变化事件（鼠标移动、滚轮、游戏手柄轴等）
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
			} else if (isGamepadInput(input.UserInputType)) {
				// 处理游戏手柄轴输入
				const gamepadState = gamepadManager.get(input.UserInputType);

				if (gamepadState) {
					const keyCodeName = input.KeyCode.Name;

					// 处理摇杆输入
					if (keyCodeName === "Thumbstick1") {
						// 左摇杆
						const xValue = input.Position.X;
						const yValue = -input.Position.Y; // Roblox Y 轴是反的
						const settings = gamepadManager.settings.getAxisSettings(GamepadAxis.LeftStickX);

						// X 轴
						const filteredX = settings.filter(xValue, gamepadState.getAxis(GamepadAxis.LeftStickX));

						if (filteredX !== undefined) {
							gamepadState.setAxis(GamepadAxis.LeftStickX, filteredX);
							rawGamepadAxisChangedWriter.send(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickX, xValue),
							);
							gamepadAxisChangedWriter.send(
								new GamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickX, filteredX),
							);
						}

						// Y 轴
						const filteredY = settings.filter(yValue, gamepadState.getAxis(GamepadAxis.LeftStickY));

						if (filteredY !== undefined) {
							gamepadState.setAxis(GamepadAxis.LeftStickY, filteredY);
							rawGamepadAxisChangedWriter.send(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickY, yValue),
							);
							gamepadAxisChangedWriter.send(
								new GamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickY, filteredY),
							);
						}
					} else if (keyCodeName === "Thumbstick2") {
						// 右摇杆
						const xValue = input.Position.X;
						const yValue = -input.Position.Y; // Roblox Y 轴是反的
						const settings = gamepadManager.settings.getAxisSettings(GamepadAxis.RightStickX);

						// X 轴
						const filteredX = settings.filter(xValue, gamepadState.getAxis(GamepadAxis.RightStickX));

						if (filteredX !== undefined) {
							gamepadState.setAxis(GamepadAxis.RightStickX, filteredX);
							rawGamepadAxisChangedWriter.send(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickX, xValue),
							);
							gamepadAxisChangedWriter.send(
								new GamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickX, filteredX),
							);
						}

						// Y 轴
						const filteredY = settings.filter(yValue, gamepadState.getAxis(GamepadAxis.RightStickY));

						if (filteredY !== undefined) {
							gamepadState.setAxis(GamepadAxis.RightStickY, filteredY);
							rawGamepadAxisChangedWriter.send(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickY, yValue),
							);
							gamepadAxisChangedWriter.send(
								new GamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickY, filteredY),
							);
						}
					}
					// Roblox 的扳机作为按钮处理，不需要在这里处理轴
				}
			}
		});

		// 处理窗口焦点丢失
		const windowFocusReleased = UserInputService.WindowFocusReleased.Connect(() => {
			// 释放所有按键
			keyInputValue.releaseAll();
			keyboard.releaseAll();
			mouse.releaseAll();

			// 发送焦点丢失事件
			keyboardFocusLostWriter.send(new KeyboardFocusLost());
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

		// 清理手势管理器
		if (this.gestureManager) {
			this.gestureManager.cleanup();
			this.gestureManager = undefined;
		}
	}
}

// 重新导出 ResourceStorage 中的辅助函数
export {
	getGamepadManager,
	getGestureManager,
	getKeyInput,
	getKeyboardInput,
	getMouseInput,
	getMouseMotion,
	getMousePosition,
	getMouseWheel,
} from "./resource-storage";
