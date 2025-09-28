/**
 * InputPlugin - ECS 输入管理插件
 * 使用 Matter ECS 的 useEvent hook 处理输入事件
 * 支持键盘、鼠标、游戏手柄和手势输入
 */

import { UserInputService } from "@rbxts/services";
import { useEvent } from "@rbxts/matter";
import { World } from "../bevy_ecs";
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
 * 使用 ECS 系统处理所有输入事件
 */
export class InputPlugin implements Plugin {
	private gestureManager?: GestureManager;

	robloxContext?: RobloxContext.Client;

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		// 只在客户端运行
		if (RunService.IsServer()) {
			print("[InputPlugin] ⚠️ Running on SERVER, skipping input setup");
			return;
		}

		print("[InputPlugin] ✅ Starting build on CLIENT");
		const world = app.getWorld();

		// 初始化输入资源
		print("[InputPlugin] 📦 Creating input resources...");
		const gamepadManager = new GamepadManager();
		const gestureManager = new GestureManager();
		this.gestureManager = gestureManager;
		const keyInputValue = new ButtonInput<Key>("Key");
		const keyboard = new ButtonInput<Enum.KeyCode>("KeyCode");
		const mouse = new ButtonInput<Enum.UserInputType>("Mouse");
		const mouseMotion = new AccumulatedMouseMotion();
		const mouseWheel = new AccumulatedMouseWheel();
		const mousePosition = new MousePosition();
		print("[InputPlugin] ✅ Input resources created");

		// 存储资源到 World
		print("[InputPlugin] 💾 Storing resources to World...");
		ResourceStorage.setGamepadManager(world, gamepadManager);
		ResourceStorage.setGestureManager(world, gestureManager);
		ResourceStorage.setKeyInput(world, keyInputValue);
		ResourceStorage.setKeyboardInput(world, keyboard);
		ResourceStorage.setMouseInput(world, mouse);
		ResourceStorage.setMouseMotion(world, mouseMotion);
		ResourceStorage.setMouseWheel(world, mouseWheel);
		ResourceStorage.setMousePosition(world, mousePosition);
		print("[InputPlugin] ✅ Resources stored");

		// 添加输入处理系统
		print("[InputPlugin] 🎮 Adding input processing systems...");

		// 添加主输入处理系统
		app.addSystems(MainScheduleLabel.PRE_UPDATE, this.createInputProcessingSystem());

		// 添加游戏手柄连接系统
		app.addSystems(MainScheduleLabel.PRE_UPDATE, this.createGamepadConnectionSystem());

		// 添加手势处理系统
		app.addSystems(MainScheduleLabel.PRE_UPDATE, this.createGestureSystem());

		print("[InputPlugin] ✅ Input systems added");

		// 添加帧清理系统 - 在 PostUpdate 阶段清理当前帧的状态
		print("[InputPlugin] 🔄 Adding frame cleanup system...");
		app.addSystems(MainScheduleLabel.POST_UPDATE, (worldParam: World) => {
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
		print("[InputPlugin] ✅ Frame cleanup system added");
		print("[InputPlugin] 🎉 InputPlugin build complete!");
	}

	/**
	 * 创建游戏手柄连接系统
	 * @returns 游戏手柄连接处理系统函数
	 */
	private createGamepadConnectionSystem(): (world: World) => void {
		let initialized = false;

		return (world: World) => {
			const gamepadManager = ResourceStorage.getGamepadManager(world);
			if (!gamepadManager) return;

			const context = (world as unknown as { context?: { messages?: unknown } }).context;
			if (!context?.messages) return;
			const messageRegistry = context.messages as { createWriter: (type: unknown) => unknown };

			const connectionWriter = messageRegistry.createWriter(GamepadConnectionEvent) as EventWriter<GamepadConnectionEvent>;

			// 初次运行时检查已连接的游戏手柄
			if (!initialized) {
				const connectedGamepads = UserInputService.GetConnectedGamepads();
				for (const gamepadId of connectedGamepads) {
					print(`[InputPlugin] Detected connected gamepad: ${gamepadId.Name}`);
					gamepadManager.add(gamepadId, gamepadId.Name);
					connectionWriter.send(new GamepadConnectionEvent(gamepadId, GamepadConnection.Connected));
				}
				initialized = true;
			}

			// 使用 useEvent 监听游戏手柄连接事件
			for (const [_, gamepadId] of useEvent(UserInputService, "GamepadConnected")) {
				print(`[InputPlugin] Gamepad connected: ${gamepadId.Name}`);
				gamepadManager.add(gamepadId, gamepadId.Name);
				connectionWriter.send(new GamepadConnectionEvent(gamepadId, GamepadConnection.Connected));
			}

			// 使用 useEvent 监听游戏手柄断开事件
			for (const [_, gamepadId] of useEvent(UserInputService, "GamepadDisconnected")) {
				print(`[InputPlugin] Gamepad disconnected: ${gamepadId.Name}`);
				gamepadManager.remove(gamepadId);
				connectionWriter.send(new GamepadConnectionEvent(gamepadId, GamepadConnection.Disconnected));
			}
		};
	}

	/**
	 * 创建手势处理系统
	 * @returns 手势处理系统函数
	 */
	private createGestureSystem(): (world: World) => void {
		return (world: World) => {
			const gestureManager = ResourceStorage.getGestureManager(world);
			if (!gestureManager) return;

			const context = (world as unknown as { context?: { messages?: unknown } }).context;
			if (!context?.messages) return;
			const messageRegistry = context.messages as { createWriter: (type: unknown) => unknown };

			const pinchWriter = messageRegistry.createWriter(PinchGesture) as EventWriter<PinchGesture>;
			const rotationWriter = messageRegistry.createWriter(RotationGesture) as EventWriter<RotationGesture>;
			const doubleTapWriter = messageRegistry.createWriter(DoubleTapGesture) as EventWriter<DoubleTapGesture>;
			const panWriter = messageRegistry.createWriter(PanGesture) as EventWriter<PanGesture>;
			const longPressWriter = messageRegistry.createWriter(LongPressGesture) as EventWriter<LongPressGesture>;

			gestureManager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);
		};
	}

	/**
	 * 创建主输入处理系统
	 * @returns 输入处理系统函数
	 */
	private createInputProcessingSystem(): (world: World) => void {
		let callCount = 0;
		return (world: World) => {
			callCount++;
			if (callCount % 60 === 1) { // 每60帧输出一次，避免日志过多
				print(`[InputPlugin.processInputSystem] 📍 System called (frame ${callCount})`);
			}

			// 获取资源
			const gamepadManager = ResourceStorage.getGamepadManager(world);
			const keyInputValue = ResourceStorage.getKeyInput(world);
			const keyboard = ResourceStorage.getKeyboardInput(world);
			const mouse = ResourceStorage.getMouseInput(world);
			const mouseMotion = ResourceStorage.getMouseMotion(world);
			const mouseWheel = ResourceStorage.getMouseWheel(world);
			const mousePosition = ResourceStorage.getMousePosition(world);

			if (!keyboard || !mouse) return;

			// 获取消息注册表
			const context = (world as unknown as { context?: { messages?: unknown } }).context;
			if (!context?.messages) return;
			const messageRegistry = context.messages as { createWriter: (type: unknown) => unknown };

			// 创建事件写入器
			const cursorMovedWriter = messageRegistry.createWriter(CursorMoved) as EventWriter<CursorMoved>;
			const gamepadAxisChangedWriter = messageRegistry.createWriter(GamepadAxisChangedEvent) as EventWriter<GamepadAxisChangedEvent>;
			const gamepadButtonChangedWriter = messageRegistry.createWriter(GamepadButtonChangedEvent) as EventWriter<GamepadButtonChangedEvent>;
			const gamepadButtonStateChangedWriter = messageRegistry.createWriter(GamepadButtonStateChangedEvent) as EventWriter<GamepadButtonStateChangedEvent>;
			const keyboardInputWriter = messageRegistry.createWriter(KeyboardInput) as EventWriter<KeyboardInput>;
			const keyboardFocusLostWriter = messageRegistry.createWriter(KeyboardFocusLost) as EventWriter<KeyboardFocusLost>;
			const mouseButtonWriter = messageRegistry.createWriter(MouseButtonInput) as EventWriter<MouseButtonInput>;
			const mouseMotionWriter = messageRegistry.createWriter(MouseMotion) as EventWriter<MouseMotion>;
			const mouseWheelWriter = messageRegistry.createWriter(MouseWheel) as EventWriter<MouseWheel>;
			const rawGamepadAxisChangedWriter = messageRegistry.createWriter(RawGamepadAxisChangedEvent) as EventWriter<RawGamepadAxisChangedEvent>;
			const rawGamepadButtonChangedWriter = messageRegistry.createWriter(RawGamepadButtonChangedEvent) as EventWriter<RawGamepadButtonChangedEvent>;

			this.processInputEvents(
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
				keyboardInputWriter,
				keyboardFocusLostWriter,
				mouseButtonWriter,
				mouseMotionWriter,
				mouseWheelWriter,
				rawGamepadAxisChangedWriter,
				rawGamepadButtonChangedWriter,
			);
		};
	}

	/**
	 * 处理所有输入事件
	 */
	private processInputEvents(
		gamepadManager: GamepadManager | undefined,
		keyInputValue: ButtonInput<Key> | undefined,
		keyboard: ButtonInput<Enum.KeyCode>,
		mouse: ButtonInput<Enum.UserInputType>,
		mouseMotion: AccumulatedMouseMotion | undefined,
		mouseWheel: AccumulatedMouseWheel | undefined,
		mousePosition: MousePosition | undefined,
		cursorMovedWriter: EventWriter<CursorMoved>,
		gamepadAxisChangedWriter: EventWriter<GamepadAxisChangedEvent>,
		gamepadButtonChangedWriter: EventWriter<GamepadButtonChangedEvent>,
		gamepadButtonStateChangedWriter: EventWriter<GamepadButtonStateChangedEvent>,
		keyboardInputWriter: EventWriter<KeyboardInput>,
		keyboardFocusLostWriter: EventWriter<KeyboardFocusLost>,
		mouseButtonWriter: EventWriter<MouseButtonInput>,
		mouseMotionWriter: EventWriter<MouseMotion>,
		mouseWheelWriter: EventWriter<MouseWheel>,
		rawGamepadAxisChangedWriter: EventWriter<RawGamepadAxisChangedEvent>,
		rawGamepadButtonChangedWriter: EventWriter<RawGamepadButtonChangedEvent>,
	): void {
		// 调试: 记录每次函数调用
		let inputBeganCount = 0;
		let inputEndedCount = 0;

		// 使用 useEvent 处理输入开始事件
		for (const [_, input, gameProcessed] of useEvent(UserInputService, "InputBegan")) {
			inputBeganCount++;
			print(`[InputPlugin] 🎯 InputBegan event #${inputBeganCount}: Type=${input.UserInputType.Name}, KeyCode=${input.KeyCode.Name}, GameProcessed=${gameProcessed}`);
			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				// 即使 gameProcessed 为 true，也处理键盘输入（用于调试和测试）
				keyboard.press(input.KeyCode);

				// 获取逻辑键（字符）- 在 Roblox 中使用 KeyCode 的名称作为逻辑键
				const logicalKey = input.KeyCode.Name;
				if (keyInputValue) {
					keyInputValue.press(logicalKey);
				}

				// 发送键盘输入事件
				keyboardInputWriter.send(
					new KeyboardInput(input.KeyCode, logicalKey, ButtonState.Pressed, undefined, false),
				);
			} else if (
				input.UserInputType === Enum.UserInputType.MouseButton1 ||
				input.UserInputType === Enum.UserInputType.MouseButton2 ||
				input.UserInputType === Enum.UserInputType.MouseButton3
			) {
				// 鼠标输入仍然检查 gameProcessed，避免与 UI 冲突
				if (gameProcessed) {
					continue;
				}
				mouse.press(input.UserInputType);
				// 发送鼠标按钮按下事件
				mouseButtonWriter.send(new MouseButtonInput(input.UserInputType, ButtonState.Pressed));
			} else if (isGamepadInput(input.UserInputType) && gamepadManager) {
				// 游戏手柄输入也检查 gameProcessed
				if (gameProcessed) {
					continue;
				}
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
		}

		// 使用 useEvent 处理输入结束事件
		for (const [_, input, gameProcessed] of useEvent(UserInputService, "InputEnded")) {
			inputEndedCount++;
			print(`[InputPlugin] 🎯 InputEnded event #${inputEndedCount}: Type=${input.UserInputType.Name}, KeyCode=${input.KeyCode.Name}, GameProcessed=${gameProcessed}`);
			// 即使被游戏 UI 处理，也要记录释放事件
			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				keyboard.release(input.KeyCode);

				// 释放逻辑键
				const logicalKey = input.KeyCode.Name;
				if (keyInputValue) {
					keyInputValue.release(logicalKey);
				}

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
			} else if (isGamepadInput(input.UserInputType) && gamepadManager) {
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
		}

		// 使用 useEvent 处理输入变化事件（鼠标移动、滚轮、游戏手柄轴等）
		for (const [_, input, gameProcessed] of useEvent(UserInputService, "InputChanged")) {
			if (gameProcessed) {
				continue;
			}

			if (input.UserInputType === Enum.UserInputType.MouseMovement) {
				const delta = input.Delta;
				// 只有当有实际移动时才累积
				if (mouseMotion && (delta.X !== 0 || delta.Y !== 0)) {
					mouseMotion.accumulate(delta.X, delta.Y);
					// 发送鼠标移动事件
					mouseMotionWriter.send(new MouseMotion(delta.X, delta.Y));
				}

				// 更新鼠标位置
				if (mousePosition) {
					const position = input.Position;
					const newPos = new Vector2(position.X, position.Y);
					const oldPos = mousePosition.getPosition();
					mousePosition.update(newPos);

					// 发送光标移动事件
					cursorMovedWriter.send(new CursorMoved(newPos, newPos.sub(oldPos)));
				}
			} else if (input.UserInputType === Enum.UserInputType.MouseWheel && mouseWheel) {
				// 鼠标滚轮使用 Position.Z 作为滚动增量
				// 正值表示向前滚动，负值表示向后滚动
				const scrollDelta = input.Position.Z;
				if (scrollDelta !== 0) {
					mouseWheel.accumulate(scrollDelta);
					// 发送鼠标滚轮事件
					mouseWheelWriter.send(new MouseWheel(0, scrollDelta));
				}
			} else if (isGamepadInput(input.UserInputType) && gamepadManager) {
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
					// Roblox 的扣机作为按钮处理，不需要在这里处理轴
				}
			}
		}

		// 使用 useEvent 处理窗口焦点丢失
		for (const [_] of useEvent(UserInputService, "WindowFocusReleased")) {
			// 释放所有按键
			if (keyInputValue) {
				keyInputValue.releaseAll();
			}
			keyboard.releaseAll();
			mouse.releaseAll();

			// 发送焦点丢失事件
			keyboardFocusLostWriter.send(new KeyboardFocusLost());
		}

		// 调试: 在处理完所有事件后输出总计
		if (inputBeganCount > 0 || inputEndedCount > 0) {
			print(`[InputPlugin] 📊 Events processed this frame: InputBegan=${inputBeganCount}, InputEnded=${inputEndedCount}`);
		}
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
		// 清理手势管理器
		if (this.gestureManager) {
			this.gestureManager.cleanup();
			this.gestureManager = undefined;
		}
		// 注意：使用 useEvent 后，事件会在系统停止时自动清理
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
