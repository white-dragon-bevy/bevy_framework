/**
 * @fileoverview Bevy Input 系统的 Roblox-TS 移植版本
 *
 * 提供了完整的输入处理功能，包括：
 * - 键盘输入
 * - 鼠标输入
 * - 游戏手柄输入
 * - 触摸输入
 *
 * @example
 * ```typescript
 * import { App } from "@rbxts/bevy-app";
 * import { InputPlugin, KeyCode, MouseButton } from "@rbxts/bevy-input";
 *
 * const app = new App()
 *   .addPlugin(new InputPlugin())
 *   .addSystem((world) => {
 *     const keyboard = world.getResource(ButtonInput<KeyCode>);
 *     if (keyboard?.justPressed(KeyCode.Space)) {
 *       print("Space key pressed!");
 *     }
 *   })
 *   .run();
 * ```
 */

// 导出核心类型和类
export { ButtonInput, ButtonState } from "./button-input";
export { Axis } from "./axis";

// 导出键盘相关
export {
	KeyCode,
	Key,
	KeyModifier,
	KeyboardInput,
	KeyboardFocusLost,
	keyboardInputSystem,
	setupRobloxKeyboardInput,
} from "./keyboard";

// 导出鼠标相关
export {
	MouseButton,
	MouseButtonInput,
	MouseMotion,
	MouseWheel,
	MouseScrollUnit,
	AccumulatedMouseMotion,
	AccumulatedMouseScroll,
	mouseButtonInputSystem,
	accumulateMouseMotionSystem,
	accumulateMouseScrollSystem,
	setupRobloxMouseInput,
} from "./mouse";

// 导出游戏手柄相关
export {
	Gamepad,
	GamepadButton,
	GamepadAxis,
	GamepadEvent,
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

// 导出触摸相关
export {
	TouchPhase,
	TouchInput,
	Touch,
	Touches,
	ForceTouch,
	touchScreenInputSystem,
	setupRobloxTouchInput,
} from "./touch";

// 导出通用条件
export * from "./common-conditions";

// 导出插件
export { InputPlugin, InputSystems, createInputPlugin } from "./plugin";

// 导出 prelude 模块，包含最常用的类型
export const prelude = {
	ButtonInput,
	ButtonState,
	Axis,
	KeyCode,
	MouseButton,
	GamepadButton,
	GamepadAxis,
	TouchPhase,
	Touches,
	InputPlugin,
} as const;