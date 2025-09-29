/**
 * InputPlugin - ECS 输入管理插件
 * 使用 Matter ECS 的 useEvent hook 处理输入事件
 * 支持键盘、鼠标、游戏手柄和手势输入
 */

/** 全局调试开关 - 生产环境设为 false */
const DEBUG_ENABLED = false;

import { UserInputService } from "@rbxts/services";
import { useEvent } from "@rbxts/matter";
import { Context, World } from "../bevy_ecs";
import { App } from "../bevy_app/app";
import { Plugin } from "../bevy_app/plugin";
import { MainScheduleLabel } from "../bevy_app/main-schedule";
import { ButtonInput } from "./button-input";
import { AccumulatedMouseMotion, AccumulatedMouseWheel, MouseButton, MousePosition } from "./mouse";
import { RobloxContext, isMatchRobloxContext } from "../utils/roblox-utils";
import { RunService } from "@rbxts/services";
import { MessageWriter , MessageReader  } from "../bevy_ecs/message";
import { ButtonState, CursorMoved, MouseButtonInput, MouseMotion, MouseWheel } from "./mouse-events";
import { Key, KeyboardFocusLost, KeyboardInput, getLogicalKey, characterKey } from "./keyboard";
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
import { TouchInput, Touches, touchScreenInputSystem } from "./touch";



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
	Touch: "Touches",
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
 * 最近按下的按键映射（用于关联文本输入）
 * 当用户按下某个键时，记录该键，以便后续 TextInputted 事件可以关联
 */
const recentKeyPresses = new Map<Enum.KeyCode, number>();
const KEY_PRESS_TIMEOUT = 100; // 100ms 内的 TextInputted 事件会被关联到按键

/**
 * 查找最近按下的键（用于文本关联）
 * @returns 最近按下的键码，如果没有找到返回 undefined
 */
function findRecentKeyPress(): Enum.KeyCode | undefined {
	const currentTime = os.clock() * 1000; // 转换为毫秒
	let mostRecentKey: Enum.KeyCode | undefined;
	let mostRecentTime = 0;

	// 清理过期的按键记录
	for (const [keyCode, timestamp] of recentKeyPresses) {
		if (currentTime - timestamp > KEY_PRESS_TIMEOUT) {
			recentKeyPresses.delete(keyCode);
		} else if (timestamp > mostRecentTime) {
			mostRecentTime = timestamp;
			mostRecentKey = keyCode;
		}
	}

	return mostRecentKey;
}

	/**
	 * 处理所有输入事件
	 */
	function processInputEvents(
		gamepadManager: GamepadManager | undefined,
		keyInputValue: ButtonInput<Key> | undefined,
		keyboard: ButtonInput<Enum.KeyCode>,
		mouse: ButtonInput<Enum.UserInputType>,
		mouseMotion: AccumulatedMouseMotion | undefined,
		mouseWheel: AccumulatedMouseWheel | undefined,
		mousePosition: MousePosition | undefined,
		cursorMovedWriter: MessageWriter<CursorMoved>,
		gamepadAxisChangedWriter: MessageWriter<GamepadAxisChangedEvent>,
		gamepadButtonChangedWriter: MessageWriter<GamepadButtonChangedEvent>,
		gamepadButtonStateChangedWriter: MessageWriter<GamepadButtonStateChangedEvent>,
		keyboardInputWriter: MessageWriter<KeyboardInput>,
		keyboardFocusLostWriter: MessageWriter<KeyboardFocusLost>,
		mouseButtonWriter: MessageWriter<MouseButtonInput>,
		mouseMotionWriter: MessageWriter<MouseMotion>,
		mouseWheelWriter: MessageWriter<MouseWheel>,
		rawGamepadAxisChangedWriter: MessageWriter<RawGamepadAxisChangedEvent>,
		rawGamepadButtonChangedWriter: MessageWriter<RawGamepadButtonChangedEvent>,
	): void {
		// 调试: 记录每次函数调用
		let inputBeganCount = 0;
		let inputEndedCount = 0;

		// 使用 useEvent 处理输入开始事件
		for (const [_, input, gameProcessed] of useEvent(UserInputService, "InputBegan")) {
			inputBeganCount++;
			if (DEBUG_ENABLED) {
				print(`[InputPlugin] 🎯 InputBegan event #${inputBeganCount}: Type=${input.UserInputType.Name}, KeyCode=${input.KeyCode.Name}, GameProcessed=${gameProcessed}`);
			}
			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				// 即使 gameProcessed 为 true，也处理键盘输入（用于调试和测试）
				keyboard.press(input.KeyCode);

				// 记录按键按下时间（用于文本关联）
				recentKeyPresses.set(input.KeyCode, os.clock() * 1000);

				// 获取逻辑键（使用新的 getLogicalKey 函数）
				const logicalKey = getLogicalKey(input.KeyCode);
				if (keyInputValue) {
					keyInputValue.press(logicalKey);
				}

				// 发送键盘输入事件
				keyboardInputWriter.write(
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
				mouseButtonWriter.write(new MouseButtonInput(input.UserInputType, ButtonState.Pressed));
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
						rawGamepadButtonChangedWriter.write(
							new RawGamepadButtonChangedEvent(input.UserInputType, button, value),
						);

						// 应用阈值过滤
						if (settings.isPressed(value)) {
							gamepadState.buttons.press(button);
							gamepadState.setButtonValue(button, value);

							// 发送状态变化事件
							gamepadButtonStateChangedWriter.write(
								new GamepadButtonStateChangedEvent(input.UserInputType, button, ButtonState.Pressed),
							);

							// 发送按钮变化事件
							gamepadButtonChangedWriter.write(
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
			if (DEBUG_ENABLED) {
				print(`[InputPlugin] 🎯 InputEnded event #${inputEndedCount}: Type=${input.UserInputType.Name}, KeyCode=${input.KeyCode.Name}, GameProcessed=${gameProcessed}`);
			}
			// 即使被游戏 UI 处理，也要记录释放事件
			if (input.UserInputType === Enum.UserInputType.Keyboard) {
				keyboard.release(input.KeyCode);

				// 释放逻辑键（使用新的 getLogicalKey 函数）
				const logicalKey = getLogicalKey(input.KeyCode);
				if (keyInputValue) {
					keyInputValue.release(logicalKey);
				}

				// 发送键盘输入事件
				keyboardInputWriter.write(
					new KeyboardInput(input.KeyCode, logicalKey, ButtonState.Released, undefined, false),
				);
			} else if (
				input.UserInputType === Enum.UserInputType.MouseButton1 ||
				input.UserInputType === Enum.UserInputType.MouseButton2 ||
				input.UserInputType === Enum.UserInputType.MouseButton3
			) {
				mouse.release(input.UserInputType);
				// 发送鼠标按钮释放事件
				mouseButtonWriter.write(new MouseButtonInput(input.UserInputType, ButtonState.Released));
			} else if (isGamepadInput(input.UserInputType) && gamepadManager) {
				// 处理游戏手柄按钮释放
				const button = mapKeyCodeToGamepadButton(input.KeyCode);

				if (button) {
					const gamepadState = gamepadManager.get(input.UserInputType);

					if (gamepadState) {
						const value = 0.0; // 按钮释放时值为 0.0
						const settings = gamepadManager.settings.getButtonSettings(button);

						// 发送原始事件
						rawGamepadButtonChangedWriter.write(
							new RawGamepadButtonChangedEvent(input.UserInputType, button, value),
						);

						// 应用阈值过滤
						if (settings.isReleased(value)) {
							gamepadState.buttons.release(button);
							gamepadState.setButtonValue(button, value);

							// 发送状态变化事件
							gamepadButtonStateChangedWriter.write(
								new GamepadButtonStateChangedEvent(input.UserInputType, button, ButtonState.Released),
							);

							// 发送按钮变化事件
							gamepadButtonChangedWriter.write(
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
					mouseMotionWriter.write(new MouseMotion(delta.X, delta.Y));
				}

				// 更新鼠标位置
				if (mousePosition) {
					const position = input.Position;
					const newPos = new Vector2(position.X, position.Y);
					const oldPos = mousePosition.getPosition();
					mousePosition.update(newPos);

					// 发送光标移动事件
					cursorMovedWriter.write(new CursorMoved(newPos, newPos.sub(oldPos)));
				}
			} else if (input.UserInputType === Enum.UserInputType.MouseWheel && mouseWheel) {
				// 鼠标滚轮使用 Position.Z 作为滚动增量
				// 正值表示向前滚动，负值表示向后滚动
				const scrollDelta = input.Position.Z;
				if (scrollDelta !== 0) {
					mouseWheel.accumulate(scrollDelta);
					// 发送鼠标滚轮事件
					mouseWheelWriter.write(new MouseWheel(0, scrollDelta));
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
							rawGamepadAxisChangedWriter.write(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickX, xValue),
							);
							gamepadAxisChangedWriter.write(
								new GamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickX, filteredX),
							);
						}

						// Y 轴
						const filteredY = settings.filter(yValue, gamepadState.getAxis(GamepadAxis.LeftStickY));

						if (filteredY !== undefined) {
							gamepadState.setAxis(GamepadAxis.LeftStickY, filteredY);
							rawGamepadAxisChangedWriter.write(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.LeftStickY, yValue),
							);
							gamepadAxisChangedWriter.write(
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
							rawGamepadAxisChangedWriter.write(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickX, xValue),
							);
							gamepadAxisChangedWriter.write(
								new GamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickX, filteredX),
							);
						}

						// Y 轴
						const filteredY = settings.filter(yValue, gamepadState.getAxis(GamepadAxis.RightStickY));

						if (filteredY !== undefined) {
							gamepadState.setAxis(GamepadAxis.RightStickY, filteredY);
							rawGamepadAxisChangedWriter.write(
								new RawGamepadAxisChangedEvent(input.UserInputType, GamepadAxis.RightStickY, yValue),
							);
							gamepadAxisChangedWriter.write(
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
			keyboardFocusLostWriter.write(new KeyboardFocusLost());
		}

		// 使用 useEvent 处理文本输入事件
		// 这是 Roblox 专用的文本输入事件，提供实际产生的字符
		// TODO: TextInputted 事件暂时不兼容当前 roblox-ts 版本，需要后续修复
		/*
		for (const [_, textObject, gameProcessed] of useEvent(UserInputService.TextInputted as any)) {
			if (gameProcessed) {
				continue;
			}

			const textValue = (textObject as any).Text as string;

			// 只处理非空文本输入
			if (textValue.size() > 0) {
				if (DEBUG_ENABLED) {
					print(`[InputPlugin] 📝 TextInputted: "${textValue}"`);
				}

				// 尝试找到最近按下的键，将文本与该键关联
				const associatedKey = findRecentKeyPress();
				const keyCode = associatedKey !== undefined ? associatedKey : Enum.KeyCode.Unknown;

				// 创建逻辑键，优先使用文本内容
				const logicalKey = textValue.size() === 1 ? characterKey(textValue) : getLogicalKey(keyCode, textValue);

				if (keyInputValue) {
					// 为文本输入注册逻辑键
					keyInputValue.press(logicalKey);
					// 立即释放，因为文本输入是瞬时事件
					keyInputValue.release(logicalKey);
				}

				// 如果找到了关联的键，从记录中移除它（避免重复关联）
				if (associatedKey !== undefined) {
					recentKeyPresses.delete(associatedKey);
				}

				if (DEBUG_ENABLED) {
					print(`[InputPlugin] 🔗 Text "${textValue}" ${associatedKey !== undefined ? `associated with key ${associatedKey.Name}` : "not associated with any key"}`);
				}

				// 发送带有 textValue 的键盘输入事件
				keyboardInputWriter.write(
					new KeyboardInput(
						keyCode, // 关联的物理键码或 Unknown
						logicalKey,
						ButtonState.Pressed,
						textValue, // ✅ 提供文本内容
						false, // 文本输入不是重复事件
					),
				);
			}
		}
		*/

		// 调试: 在处理完所有事件后输出总计
		if (DEBUG_ENABLED && (inputBeganCount > 0 || inputEndedCount > 0)) {
			print(`[InputPlugin] 📊 Events processed this frame: InputBegan=${inputBeganCount}, InputEnded=${inputEndedCount}`);
		}
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

	// ✅ gestureSystem 已移除 - 手势处理器现在在 Plugin.build() 中直接初始化
	// 这解决了内存泄漏问题(每帧重复创建事件连接)

	/**
	 * 创建触摸处理系统
	 * @returns 触摸处理系统函数
	 */
	function touchSystem(world: World,context:Context) {
		return (world: World) => {
			const touches = world.resources.getResource<Touches>() ;
			if (!touches) return;

			const context = (world as unknown as { context?: { messages?: unknown } }).context;
			if (!context?.messages) return;
			const messageRegistry = context.messages as { createReader: (type: unknown) => unknown };

			const touchReader = messageRegistry.createReader(TouchInput) as MessageReader<TouchInput>;

			// 调用触摸屏输入系统处理触摸事件
			touchScreenInputSystem(world, touchReader);
	}



}
	/**
	 * 创建主输入处理系统
	 * @returns 输入处理系统函数
	 */
	function inputProcessingSystem(world: World,context:Context) {
		let callCount = 0;
			callCount++;
			if (DEBUG_ENABLED && callCount % 60 === 1) { // 每60帧输出一次，避免日志过多
				print(`[InputPlugin.processInputSystem] 📍 System called (frame ${callCount})`);
			}

			// 获取资源
			const gamepadManager = world.resources.getResource<GamepadManager>() ;
			const keyInputValue = world.resources.getResource<ButtonInput<Key>>() ;
			const keyboard = world.resources.getResource<ButtonInput<Enum.KeyCode>>() ;
			const mouse = world.resources.getResource<ButtonInput<Enum.UserInputType>>() ;
			const mouseMotion = world.resources.getResource<AccumulatedMouseMotion>() ;
			const mouseWheel = world.resources.getResource<AccumulatedMouseWheel>() ;
			const mousePosition = world.resources.getResource<MousePosition>() ;

			if (!keyboard || !mouse) return;

			// 获取消息注册表
			const messageRegistry = world.messages;

			// 创建事件写入器
			const cursorMovedWriter = messageRegistry.createWriter<CursorMoved>() as MessageWriter<CursorMoved>;
			const gamepadAxisChangedWriter = messageRegistry.createWriter<GamepadAxisChangedEvent>() as MessageWriter<GamepadAxisChangedEvent>;
			const gamepadButtonChangedWriter = messageRegistry.createWriter<GamepadButtonChangedEvent>() as MessageWriter<GamepadButtonChangedEvent>;
			const gamepadButtonStateChangedWriter = messageRegistry.createWriter<GamepadButtonStateChangedEvent>() as	 MessageWriter<GamepadButtonStateChangedEvent>;
			const keyboardInputWriter = messageRegistry.createWriter<KeyboardInput>() as MessageWriter<KeyboardInput>;
			const keyboardFocusLostWriter = messageRegistry.createWriter<KeyboardFocusLost>() as MessageWriter<KeyboardFocusLost>;
			const mouseButtonWriter = messageRegistry.createWriter<MouseButtonInput>() as MessageWriter<MouseButtonInput>;
			const mouseMotionWriter = messageRegistry.createWriter<MouseMotion>() as MessageWriter<MouseMotion>;
			const mouseWheelWriter = messageRegistry.createWriter<MouseWheel>() as MessageWriter<MouseWheel>;
			const rawGamepadAxisChangedWriter = messageRegistry.createWriter<RawGamepadAxisChangedEvent>() as MessageWriter<RawGamepadAxisChangedEvent>;
			const rawGamepadButtonChangedWriter = messageRegistry.createWriter<RawGamepadButtonChangedEvent>() as MessageWriter<RawGamepadButtonChangedEvent>;

			processInputEvents(
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
	}

	/**
	 * 创建游戏手柄连接系统
	 * @returns 游戏手柄连接处理系统函数
	 */
	function gamepadConnectionSystem(world: World,context:Context) {
		let initialized = false;

			const gamepadManager = world.resources.getResource<GamepadManager>() ;
			if (!gamepadManager) return;

			const messageRegistry = world.messages;

			const connectionWriter = messageRegistry.createWriter<GamepadConnectionEvent>();

			// 初次运行时检查已连接的游戏手柄
			if (!initialized) {
				const connectedGamepads = UserInputService.GetConnectedGamepads();
				for (const gamepadId of connectedGamepads) {
					if (DEBUG_ENABLED) {
						print(`[InputPlugin] Detected connected gamepad: ${gamepadId.Name}`);
					}
					gamepadManager.add(gamepadId, gamepadId.Name);
					connectionWriter.write(new GamepadConnectionEvent(gamepadId, GamepadConnection.Connected));
				}
				initialized = true;
			}

			// 使用 useEvent 监听游戏手柄连接事件
			for (const [_, gamepadId] of useEvent(UserInputService, "GamepadConnected")) {
				if (DEBUG_ENABLED) {
					print(`[InputPlugin] Gamepad connected: ${gamepadId.Name}`);
				}
				gamepadManager.add(gamepadId, gamepadId.Name);
				connectionWriter.write(new GamepadConnectionEvent(gamepadId, GamepadConnection.Connected));
			}

			// 使用 useEvent 监听游戏手柄断开事件
			for (const [_, gamepadId] of useEvent(UserInputService, "GamepadDisconnected")) {
				if (DEBUG_ENABLED) {
					print(`[InputPlugin] Gamepad disconnected: ${gamepadId.Name}`);
				}
				gamepadManager.remove(gamepadId);
				connectionWriter.write(new GamepadConnectionEvent(gamepadId, GamepadConnection.Disconnected));
			}
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
			if (DEBUG_ENABLED) {
				print("[InputPlugin] ⚠️ Running on SERVER, skipping input setup");
			}
			return;
		}

		if (DEBUG_ENABLED) {
			print("[InputPlugin] ✅ Starting build on CLIENT");
		}
		const world = app.getWorld();

		// 初始化输入资源
		if (DEBUG_ENABLED) {
			print("[InputPlugin] 📦 Creating input resources...");
		}
		const gamepadManager = new GamepadManager();
		const gestureManager = new GestureManager();
		this.gestureManager = gestureManager;
		const keyInputValue = new ButtonInput<Key>("Key");
		const keyboard = new ButtonInput<Enum.KeyCode>("KeyCode");
		const mouse = new ButtonInput<Enum.UserInputType>("Mouse");
		const mouseMotion = new AccumulatedMouseMotion();
		const mouseWheel = new AccumulatedMouseWheel();
		const mousePosition = new MousePosition();
		const touches = new Touches();
		if (DEBUG_ENABLED) {
			print("[InputPlugin] ✅ Input resources created");
		}

		// 存储资源到 world.resources
		if (DEBUG_ENABLED) {
			print("[InputPlugin] 💾 Storing resources to world.resources...");
		}
		world.resources.insertResource<GamepadManager>(gamepadManager);
		world.resources.insertResource<GestureManager>(gestureManager);
		world.resources.insertResource<ButtonInput<Key>>(keyInputValue);
		world.resources.insertResource<ButtonInput<Enum.KeyCode>>(keyboard);
		world.resources.insertResource<ButtonInput<Enum.UserInputType>>(mouse);
		world.resources.insertResource<AccumulatedMouseMotion>(mouseMotion);
		world.resources.insertResource<MousePosition>(mousePosition);
		world.resources.insertResource<AccumulatedMouseWheel>(mouseWheel);
		world.resources.insertResource<Touches>(touches);
		if (DEBUG_ENABLED) {
			print("[InputPlugin] ✅ Resources stored");
		}

		// ✅ 在插件初始化时一次性设置手势管理器
		if (DEBUG_ENABLED) {
			print("[InputPlugin] 🎯 Setting up gesture handlers...");
		}
		const messageRegistry = world.messages;
		gestureManager.setupHandlers(
			messageRegistry.createWriter<PinchGesture>(),
			messageRegistry.createWriter<RotationGesture>(),
			messageRegistry.createWriter<DoubleTapGesture>(),
			messageRegistry.createWriter<PanGesture>(),
			messageRegistry.createWriter<LongPressGesture>(),
		);
		if (DEBUG_ENABLED) {
			print("[InputPlugin] ✅ Gesture handlers setup complete");
		}

		// 添加输入处理系统
		if (DEBUG_ENABLED) {
			print("[InputPlugin] 🎮 Adding input processing systems...");
		}

		// 添加主输入处理系统
		app.addSystems(MainScheduleLabel.PRE_UPDATE, inputProcessingSystem);

		// 添加游戏手柄连接系统
		app.addSystems(MainScheduleLabel.PRE_UPDATE, gamepadConnectionSystem);

		// ✅ 手势处理器已在上面初始化,不再需要 gestureSystem
		// 手势事件将通过 UserInputService 自动触发并发送到消息系统

		// 添加触摸输入处理系统
		app.addSystems(MainScheduleLabel.PRE_UPDATE, touchSystem);

		if (DEBUG_ENABLED) {
			print("[InputPlugin] ✅ Input systems added");
		}

		// 添加帧清理系统 - 在 PostUpdate 阶段清理当前帧的状态
		if (DEBUG_ENABLED) {
			print("[InputPlugin] 🔄 Adding frame cleanup system...");
		}
		app.addSystems(MainScheduleLabel.POST_UPDATE, (worldParam: World) => {
			const gamepadResource = worldParam.resources.getResource<GamepadManager>();
			const keyInputResource = worldParam.resources.getResource<ButtonInput<Key>>() ;
			const keyboardResource = worldParam.resources.getResource<ButtonInput<Enum.KeyCode>>() ;
			const mouseResource = worldParam.resources.getResource<ButtonInput<Enum.UserInputType>>() ;
			const touchesResource = worldParam.resources.getResource<Touches>() ;

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

			if (touchesResource) {
				touchesResource.clear();
			}
		});
		if (DEBUG_ENABLED) {
			print("[InputPlugin] ✅ Frame cleanup system added");
			print("[InputPlugin] 🎉 InputPlugin build complete!");
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
		// 手势事件处理器通过 gestureManager.cleanup() 清理
	}
}

// 辅助函数：从 world.resources 获取输入资源
export function getGamepadManager(world: World): GamepadManager | undefined {
	return world.resources.getResource<GamepadManager>() ;
}

export function getGestureManager(world: World): GestureManager | undefined {
	return world.resources.getResource<GestureManager>() ;
}

export function getKeyInput(world: World): ButtonInput<Key> | undefined {
	return world.resources.getResource<ButtonInput<Key>>() ;
}

export function getKeyboardInput(world: World): ButtonInput<Enum.KeyCode> | undefined {
	return world.resources.getResource<ButtonInput<Enum.KeyCode>>() ;
}

export function getMouseInput(world: World): ButtonInput<Enum.UserInputType> | undefined {
	return world.resources.getResource<ButtonInput<Enum.UserInputType>>() ;
}

export function getMouseMotion(world: World): AccumulatedMouseMotion | undefined {
	return world.resources.getResource<AccumulatedMouseMotion>() ;
}

export function getMousePosition(world: World): MousePosition | undefined {
	return world.resources.getResource<MousePosition>() ;
}

export function getMouseWheel(world: World): AccumulatedMouseWheel | undefined {
	return world.resources.getResource<AccumulatedMouseWheel>() ;
}

export function getTouches(world: World): Touches | undefined {
	return world.resources.getResource<Touches>() ;
}		
