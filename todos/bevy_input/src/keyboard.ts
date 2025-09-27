/**
 * @fileoverview 键盘输入功能
 *
 * 提供键盘输入事件、键码枚举和键盘输入处理系统
 */

import { World } from "@rbxts/matter";
import { UserInputService } from "@rbxts/services";
import { ButtonInput, ButtonState } from "./button-input";
import { Event, EventManager, EventReader } from "../../../src/bevy_ecs/events";
import { WorldExtensions } from "../../bevy_ecs/world-extensions";

/**
 * 键盘按键代码
 *
 * 基于 W3C UI Events KeyboardEvent code 规范
 * 映射到 Roblox 的 Enum.KeyCode
 */
export enum KeyCode {
	// 字母键
	KeyA = "KeyA",
	KeyB = "KeyB",
	KeyC = "KeyC",
	KeyD = "KeyD",
	KeyE = "KeyE",
	KeyF = "KeyF",
	KeyG = "KeyG",
	KeyH = "KeyH",
	KeyI = "KeyI",
	KeyJ = "KeyJ",
	KeyK = "KeyK",
	KeyL = "KeyL",
	KeyM = "KeyM",
	KeyN = "KeyN",
	KeyO = "KeyO",
	KeyP = "KeyP",
	KeyQ = "KeyQ",
	KeyR = "KeyR",
	KeyS = "KeyS",
	KeyT = "KeyT",
	KeyU = "KeyU",
	KeyV = "KeyV",
	KeyW = "KeyW",
	KeyX = "KeyX",
	KeyY = "KeyY",
	KeyZ = "KeyZ",

	// 数字键
	Digit0 = "Digit0",
	Digit1 = "Digit1",
	Digit2 = "Digit2",
	Digit3 = "Digit3",
	Digit4 = "Digit4",
	Digit5 = "Digit5",
	Digit6 = "Digit6",
	Digit7 = "Digit7",
	Digit8 = "Digit8",
	Digit9 = "Digit9",

	// 功能键
	F1 = "F1",
	F2 = "F2",
	F3 = "F3",
	F4 = "F4",
	F5 = "F5",
	F6 = "F6",
	F7 = "F7",
	F8 = "F8",
	F9 = "F9",
	F10 = "F10",
	F11 = "F11",
	F12 = "F12",

	// 控制键
	Escape = "Escape",
	Space = "Space",
	Enter = "Enter",
	Tab = "Tab",
	Backspace = "Backspace",
	Delete = "Delete",
	Insert = "Insert",
	Home = "Home",
	End = "End",
	PageUp = "PageUp",
	PageDown = "PageDown",

	// 箭头键
	ArrowUp = "ArrowUp",
	ArrowDown = "ArrowDown",
	ArrowLeft = "ArrowLeft",
	ArrowRight = "ArrowRight",

	// 修饰键
	ShiftLeft = "ShiftLeft",
	ShiftRight = "ShiftRight",
	ControlLeft = "ControlLeft",
	ControlRight = "ControlRight",
	AltLeft = "AltLeft",
	AltRight = "AltRight",
	MetaLeft = "MetaLeft",
	MetaRight = "MetaRight",

	// 锁定键
	CapsLock = "CapsLock",
	NumLock = "NumLock",
	ScrollLock = "ScrollLock",

	// 符号键
	Minus = "Minus",
	Equal = "Equal",
	BracketLeft = "BracketLeft",
	BracketRight = "BracketRight",
	Backslash = "Backslash",
	Semicolon = "Semicolon",
	Quote = "Quote",
	Backquote = "Backquote",
	Comma = "Comma",
	Period = "Period",
	Slash = "Slash",

	// 小键盘
	Numpad0 = "Numpad0",
	Numpad1 = "Numpad1",
	Numpad2 = "Numpad2",
	Numpad3 = "Numpad3",
	Numpad4 = "Numpad4",
	Numpad5 = "Numpad5",
	Numpad6 = "Numpad6",
	Numpad7 = "Numpad7",
	Numpad8 = "Numpad8",
	Numpad9 = "Numpad9",
	NumpadAdd = "NumpadAdd",
	NumpadSubtract = "NumpadSubtract",
	NumpadMultiply = "NumpadMultiply",
	NumpadDivide = "NumpadDivide",
	NumpadDecimal = "NumpadDecimal",
	NumpadEnter = "NumpadEnter",
}

/**
 * 逻辑键 - 表示键的语义含义
 */
export type Key = string | KeyModifier;

/**
 * 键修饰符
 */
export enum KeyModifier {
	Alt = "Alt",
	AltGraph = "AltGraph",
	CapsLock = "CapsLock",
	Control = "Control",
	Fn = "Fn",
	FnLock = "FnLock",
	NumLock = "NumLock",
	ScrollLock = "ScrollLock",
	Shift = "Shift",
	Meta = "Meta",
	Super = "Super",
}

/**
 * 键盘输入事件
 *
 * 这是从 Roblox UserInputService 转换而来的事件。
 * 它被 keyboard_input_system 消费以更新 ButtonInput<KeyCode> 和 ButtonInput<Key> 资源。
 */
export class KeyboardInput implements Event {
	constructor(
		/** 物理按键代码 */
		public readonly keyCode: KeyCode,
		/** 逻辑键（考虑输入法和修饰键） */
		public readonly logicalKey: Key,
		/** 按键状态 */
		public readonly state: ButtonState,
		/** 接收输入的窗口实体（Roblox 中始终为 0） */
		public readonly window: number = 0,
		/** 事件时间戳 */
		public readonly timestamp?: number,
	) {}
}

/**
 * 键盘焦点丢失事件
 *
 * 当窗口失去焦点时触发，用于释放所有按键状态
 */
export class KeyboardFocusLost implements Event {
	constructor(
		/** 失去焦点的窗口实体 */
		public readonly window: number = 0,
		/** 事件时间戳 */
		public readonly timestamp?: number,
	) {}
}

/**
 * 将 Roblox KeyCode 映射到我们的 KeyCode 枚举
 */
function robloxKeyCodeToKeyCode(robloxKey: Enum.KeyCode): KeyCode | undefined {
	const mapping: Record<string, KeyCode> = {
		// 字母键
		A: KeyCode.KeyA,
		B: KeyCode.KeyB,
		C: KeyCode.KeyC,
		D: KeyCode.KeyD,
		E: KeyCode.KeyE,
		F: KeyCode.KeyF,
		G: KeyCode.KeyG,
		H: KeyCode.KeyH,
		I: KeyCode.KeyI,
		J: KeyCode.KeyJ,
		K: KeyCode.KeyK,
		L: KeyCode.KeyL,
		M: KeyCode.KeyM,
		N: KeyCode.KeyN,
		O: KeyCode.KeyO,
		P: KeyCode.KeyP,
		Q: KeyCode.KeyQ,
		R: KeyCode.KeyR,
		S: KeyCode.KeyS,
		T: KeyCode.KeyT,
		U: KeyCode.KeyU,
		V: KeyCode.KeyV,
		W: KeyCode.KeyW,
		X: KeyCode.KeyX,
		Y: KeyCode.KeyY,
		Z: KeyCode.KeyZ,

		// 数字键
		Zero: KeyCode.Digit0,
		One: KeyCode.Digit1,
		Two: KeyCode.Digit2,
		Three: KeyCode.Digit3,
		Four: KeyCode.Digit4,
		Five: KeyCode.Digit5,
		Six: KeyCode.Digit6,
		Seven: KeyCode.Digit7,
		Eight: KeyCode.Digit8,
		Nine: KeyCode.Digit9,

		// 功能键
		F1: KeyCode.F1,
		F2: KeyCode.F2,
		F3: KeyCode.F3,
		F4: KeyCode.F4,
		F5: KeyCode.F5,
		F6: KeyCode.F6,
		F7: KeyCode.F7,
		F8: KeyCode.F8,
		F9: KeyCode.F9,
		F10: KeyCode.F10,
		F11: KeyCode.F11,
		F12: KeyCode.F12,

		// 控制键
		Escape: KeyCode.Escape,
		Space: KeyCode.Space,
		Return: KeyCode.Enter,
		Tab: KeyCode.Tab,
		Backspace: KeyCode.Backspace,
		Delete: KeyCode.Delete,
		Insert: KeyCode.Insert,
		Home: KeyCode.Home,
		End: KeyCode.End,
		PageUp: KeyCode.PageUp,
		PageDown: KeyCode.PageDown,

		// 箭头键
		Up: KeyCode.ArrowUp,
		Down: KeyCode.ArrowDown,
		Left: KeyCode.ArrowLeft,
		Right: KeyCode.ArrowRight,

		// 修饰键
		LeftShift: KeyCode.ShiftLeft,
		RightShift: KeyCode.ShiftRight,
		LeftControl: KeyCode.ControlLeft,
		RightControl: KeyCode.ControlRight,
		LeftAlt: KeyCode.AltLeft,
		RightAlt: KeyCode.AltRight,
		LeftMeta: KeyCode.MetaLeft,
		RightMeta: KeyCode.MetaRight,

		// 锁定键
		CapsLock: KeyCode.CapsLock,
		NumLock: KeyCode.NumLock,
		ScrollLock: KeyCode.ScrollLock,

		// 符号键
		Minus: KeyCode.Minus,
		Equals: KeyCode.Equal,
		LeftBracket: KeyCode.BracketLeft,
		RightBracket: KeyCode.BracketRight,
		BackSlash: KeyCode.Backslash,
		Semicolon: KeyCode.Semicolon,
		Quote: KeyCode.Quote,
		Backquote: KeyCode.Backquote,
		Comma: KeyCode.Comma,
		Period: KeyCode.Period,
		Slash: KeyCode.Slash,

		// 小键盘
		KeypadZero: KeyCode.Numpad0,
		KeypadOne: KeyCode.Numpad1,
		KeypadTwo: KeyCode.Numpad2,
		KeypadThree: KeyCode.Numpad3,
		KeypadFour: KeyCode.Numpad4,
		KeypadFive: KeyCode.Numpad5,
		KeypadSix: KeyCode.Numpad6,
		KeypadSeven: KeyCode.Numpad7,
		KeypadEight: KeyCode.Numpad8,
		KeypadNine: KeyCode.Numpad9,
		KeypadPlus: KeyCode.NumpadAdd,
		KeypadMinus: KeyCode.NumpadSubtract,
		KeypadMultiply: KeyCode.NumpadMultiply,
		KeypadDivide: KeyCode.NumpadDivide,
		KeypadPeriod: KeyCode.NumpadDecimal,
		KeypadEnter: KeyCode.NumpadEnter,
	};

	return mapping[robloxKey.Name];
}

/**
 * 获取按键的逻辑键值
 */
function getLogicalKey(keyCode: KeyCode): Key {
	// 对于修饰键，返回对应的 KeyModifier
	if (keyCode === KeyCode.ShiftLeft || keyCode === KeyCode.ShiftRight) {
		return KeyModifier.Shift;
	}
	if (keyCode === KeyCode.ControlLeft || keyCode === KeyCode.ControlRight) {
		return KeyModifier.Control;
	}
	if (keyCode === KeyCode.AltLeft || keyCode === KeyCode.AltRight) {
		return KeyModifier.Alt;
	}
	if (keyCode === KeyCode.MetaLeft || keyCode === KeyCode.MetaRight) {
		return KeyModifier.Meta;
	}

	// 对于其他键，返回其字符表示
	// 这里简化处理，实际应该考虑键盘布局和输入法
	const charMapping: Partial<Record<KeyCode, string>> = {
		[KeyCode.KeyA]: "a",
		[KeyCode.KeyB]: "b",
		[KeyCode.KeyC]: "c",
		[KeyCode.KeyD]: "d",
		[KeyCode.KeyE]: "e",
		[KeyCode.KeyF]: "f",
		[KeyCode.KeyG]: "g",
		[KeyCode.KeyH]: "h",
		[KeyCode.KeyI]: "i",
		[KeyCode.KeyJ]: "j",
		[KeyCode.KeyK]: "k",
		[KeyCode.KeyL]: "l",
		[KeyCode.KeyM]: "m",
		[KeyCode.KeyN]: "n",
		[KeyCode.KeyO]: "o",
		[KeyCode.KeyP]: "p",
		[KeyCode.KeyQ]: "q",
		[KeyCode.KeyR]: "r",
		[KeyCode.KeyS]: "s",
		[KeyCode.KeyT]: "t",
		[KeyCode.KeyU]: "u",
		[KeyCode.KeyV]: "v",
		[KeyCode.KeyW]: "w",
		[KeyCode.KeyX]: "x",
		[KeyCode.KeyY]: "y",
		[KeyCode.KeyZ]: "z",
		[KeyCode.Digit0]: "0",
		[KeyCode.Digit1]: "1",
		[KeyCode.Digit2]: "2",
		[KeyCode.Digit3]: "3",
		[KeyCode.Digit4]: "4",
		[KeyCode.Digit5]: "5",
		[KeyCode.Digit6]: "6",
		[KeyCode.Digit7]: "7",
		[KeyCode.Digit8]: "8",
		[KeyCode.Digit9]: "9",
		[KeyCode.Space]: " ",
		[KeyCode.Enter]: "Enter",
		[KeyCode.Tab]: "Tab",
		[KeyCode.Escape]: "Escape",
	};

	return charMapping[keyCode] ?? keyCode;
}

/**
 * 键盘输入处理系统
 *
 * 读取 KeyboardInput 和 KeyboardFocusLost 事件，
 * 更新 ButtonInput<KeyCode> 和 ButtonInput<Key> 资源
 *
 * @param world - ECS 世界
 */
export function keyboardInputSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 获取或创建键盘输入资源
	let keycodeInput = extensions.getResource<ButtonInput<KeyCode>>();
	if (!keycodeInput) {
		keycodeInput = new ButtonInput<KeyCode>();
		extensions.insertResource(ButtonInput<KeyCode>, keycodeInput);
	}

	let keyInput = extensions.getResource<ButtonInput<Key>>();
	if (!keyInput) {
		keyInput = new ButtonInput<Key>();
		extensions.insertResource(ButtonInput<Key>, keyInput);
	}

	// 清除帧相关状态（对应 Bevy 的 bypass_change_detection().clear()）
	keycodeInput.clear();
	keyInput.clear();

	// 处理键盘输入事件
	const keyboardReader = eventManager.createReader<KeyboardInput>();
	const keyboardEvents = keyboardReader.read();

	for (const event of keyboardEvents) {
		if (event.state === ButtonState.Pressed) {
			keycodeInput.press(event.keyCode);
			keyInput.press(event.logicalKey);
		} else {
			keycodeInput.release(event.keyCode);
			keyInput.release(event.logicalKey);
		}
	}

	// 处理键盘焦点丢失事件
	const focusLostReader = eventManager.createReader<KeyboardFocusLost>();
	const focusLostEvents = focusLostReader.read();

	if (focusLostEvents.size() > 0) {
		keycodeInput.releaseAll();
		keyInput.releaseAll();
	}

	// 清理读取器
	keyboardReader.cleanup();
	focusLostReader.cleanup();
}

/**
 * 设置 Roblox 键盘输入监听
 *
 * 将 Roblox UserInputService 事件转换为 Bevy 事件
 *
 * @param world - ECS 世界
 */
export function setupRobloxKeyboardInput(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		warn("EventManager not found, cannot setup keyboard input");
		return;
	}

	// 监听键盘输入
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return; // 忽略已被 GUI 处理的输入

		if (input.UserInputType === Enum.UserInputType.Keyboard) {
			const keyCode = robloxKeyCodeToKeyCode(input.KeyCode);
			if (keyCode) {
				const logicalKey = getLogicalKey(keyCode);
				eventManager.send(KeyboardInput, new KeyboardInput(keyCode, logicalKey, ButtonState.Pressed));
			}
		}
	});

	UserInputService.InputEnded.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		if (input.UserInputType === Enum.UserInputType.Keyboard) {
			const keyCode = robloxKeyCodeToKeyCode(input.KeyCode);
			if (keyCode) {
				const logicalKey = getLogicalKey(keyCode);
				eventManager.send(KeyboardInput, new KeyboardInput(keyCode, logicalKey, ButtonState.Released));
			}
		}
	});

	// 监听窗口焦点
	UserInputService.WindowFocusReleased.Connect(() => {
		eventManager.send(KeyboardFocusLost, new KeyboardFocusLost());
	});
}