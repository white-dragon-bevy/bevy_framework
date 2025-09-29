/**
 * 键盘输入事件和处理系统
 * 对应 Rust Bevy 的 keyboard 模块
 *
 * 本文件基于 W3C UI Events Specification 实现
 * Copyright © 2017 W3C® (MIT, ERCIM, Keio, Beihang)
 */

import type { Message, MessageReader } from "../bevy_ecs/message";
import type { World } from "../bevy_ecs";
import { ButtonInput } from "./button-input";
import { ButtonState } from "./mouse-events";

/**
 * Key 类型 - 表示逻辑键（字符键）
 * 与 KeyCode 不同，Key 考虑键盘布局，表示实际输入的字符
 *
 * 基于 W3C UI Events Specification
 * 支持命名键、字符键、死键和未识别键
 */
export type Key =
	// 功能键
	| "Enter"
	| "Tab"
	| "Escape"
	| "Backspace"
	| "Delete"
	| "ArrowUp"
	| "ArrowDown"
	| "ArrowLeft"
	| "ArrowRight"
	| "Home"
	| "End"
	| "PageUp"
	| "PageDown"
	| "Insert"
	| "CapsLock"
	| "NumLock"
	| "ScrollLock"
	| "Pause"
	| "PrintScreen"

	// 修饰键
	| "Shift"
	| "Control"
	| "Alt"
	| "Meta"
	| "ShiftLeft"
	| "ShiftRight"
	| "ControlLeft"
	| "ControlRight"
	| "AltLeft"
	| "AltRight"
	| "AltGraph"
	| "Super"
	| "Hyper"
	| "Fn"
	| "FnLock"
	| "Symbol"
	| "SymbolLock"

	// F键
	| "F1"
	| "F2"
	| "F3"
	| "F4"
	| "F5"
	| "F6"
	| "F7"
	| "F8"
	| "F9"
	| "F10"
	| "F11"
	| "F12"
	| "F13"
	| "F14"
	| "F15"
	| "F16"
	| "F17"
	| "F18"
	| "F19"
	| "F20"
	| "F21"
	| "F22"
	| "F23"
	| "F24"
	| "F25"
	| "F26"
	| "F27"
	| "F28"
	| "F29"
	| "F30"
	| "F31"
	| "F32"
	| "F33"
	| "F34"
	| "F35"

	// 编辑键
	| "Copy"
	| "Cut"
	| "Paste"
	| "Undo"
	| "Redo"
	| "Clear"
	| "CrSel"
	| "EraseEof"
	| "ExSel"

	// UI键
	| "Accept"
	| "Again"
	| "Attn"
	| "Cancel"
	| "ContextMenu"
	| "Execute"
	| "Find"
	| "Help"
	| "Play"
	| "Props"
	| "Select"
	| "ZoomIn"
	| "ZoomOut"

	// 设备功能键
	| "BrightnessDown"
	| "BrightnessUp"
	| "Eject"
	| "LogOff"
	| "Power"
	| "PowerOff"
	| "Hibernate"
	| "Standby"
	| "WakeUp"

	// 媒体键
	| "AudioVolumeDown"
	| "AudioVolumeUp"
	| "AudioVolumeMute"
	| "MediaPlayPause"
	| "MediaStop"
	| "MediaTrackNext"
	| "MediaTrackPrevious"
	| "MediaPlay"
	| "MediaPause"
	| "MediaRecord"
	| "MediaRewind"
	| "MediaFastForward"

	// 浏览器键
	| "BrowserBack"
	| "BrowserForward"
	| "BrowserRefresh"
	| "BrowserStop"
	| "BrowserSearch"
	| "BrowserFavorites"
	| "BrowserHome"

	// 应用启动键
	| "LaunchApplication1"
	| "LaunchApplication2"
	| "LaunchMail"
	| "LaunchMediaPlayer"
	| "LaunchMusicPlayer"
	| "LaunchCalendar"
	| "LaunchContacts"
	| "LaunchPhone"
	| "LaunchScreenSaver"
	| "LaunchSpreadsheet"
	| "LaunchWebBrowser"
	| "LaunchWebCam"
	| "LaunchWordProcessor"

	// IME输入法键
	| "Convert"
	| "NonConvert"
	| "KanaMode"
	| "KanjiMode"
	| "Hiragana"
	| "Katakana"
	| "HiraganaKatakana"
	| "Zenkaku"
	| "Hankaku"
	| "ZenkakuHankaku"
	| "Romaji"
	| "Eisu"
	| "HangulMode"
	| "HanjaMode"
	| "JunjaMode"

	// 空格和其他
	| "Space"

	// 字符键 (支持任意Unicode字符)
	| { readonly Character: string }

	// 死键 (组合输入)
	| { readonly Dead: string | undefined }

	// 未识别键
	| "Unidentified";

/**
 * 创建字符键
 * @param character - 字符内容
 * @returns 字符键对象
 */
export function characterKey(character: string): Key {
	return { Character: character };
}

/**
 * 创建死键
 * @param character - 死键字符（可选）
 * @returns 死键对象
 */
export function deadKey(character?: string): Key {
	return { Dead: character };
}

/**
 * 判断是否为字符键
 * @param key - 待检查的键
 * @returns 是否为字符键
 */
export function isCharacterKey(key: Key): key is { Character: string } {
	return typeIs(key, "table") && "Character" in (key as object);
}

/**
 * 判断是否为死键
 * @param key - 待检查的键
 * @returns 是否为死键
 */
export function isDeadKey(key: Key): key is { Dead: string | undefined } {
	return typeIs(key, "table") && "Dead" in (key as object);
}

/**
 * 判断是否为命名键（字符串形式的键）
 * @param key - 待检查的键
 * @returns 是否为命名键
 */
export function isNamedKey(key: Key): key is Exclude<Key, { Character: string } | { Dead: string | undefined }> {
	return typeIs(key, "string");
}

/**
 * 获取键的显示字符串
 * @param key - 键对象
 * @returns 键的字符串表示
 */
export function getKeyDisplayString(key: Key): string {
	if (isCharacterKey(key)) {
		return key.Character;
	}

	if (isDeadKey(key)) {
		return key.Dead !== undefined ? `Dead(${key.Dead})` : "Dead";
	}

	if (isNamedKey(key)) {
		return key;
	}

	return "Unknown";
}

/**
 * 将物理键码转换为逻辑键
 * 根据 Roblox KeyCode 映射到相应的 Key 类型
 * @param keyCode - Roblox 键码
 * @param textInput - 文本输入内容（可选）
 * @returns 对应的逻辑键
 */
export function getLogicalKey(keyCode: Enum.KeyCode, textInput?: string): Key {
	// 如果有文本输入且为单个字符，创建字符键
	if (textInput !== undefined && textInput.size() === 1) {
		return characterKey(textInput);
	}

	// 映射常用功能键
	switch (keyCode) {
		// 基本导航键
		case Enum.KeyCode.Return:
			return "Enter";
		case Enum.KeyCode.Tab:
			return "Tab";
		case Enum.KeyCode.Escape:
			return "Escape";
		case Enum.KeyCode.Backspace:
			return "Backspace";
		case Enum.KeyCode.Delete:
			return "Delete";
		case Enum.KeyCode.Space:
			return "Space";

		// 箭头键
		case Enum.KeyCode.Up:
			return "ArrowUp";
		case Enum.KeyCode.Down:
			return "ArrowDown";
		case Enum.KeyCode.Left:
			return "ArrowLeft";
		case Enum.KeyCode.Right:
			return "ArrowRight";

		// 导航键
		case Enum.KeyCode.Home:
			return "Home";
		case Enum.KeyCode.End:
			return "End";
		case Enum.KeyCode.PageUp:
			return "PageUp";
		case Enum.KeyCode.PageDown:
			return "PageDown";
		case Enum.KeyCode.Insert:
			return "Insert";

		// 锁定键
		case Enum.KeyCode.CapsLock:
			return "CapsLock";
		case Enum.KeyCode.NumLock:
			return "NumLock";
		case Enum.KeyCode.ScrollLock:
			return "ScrollLock";

		// 修饰键
		case Enum.KeyCode.LeftShift:
			return "ShiftLeft";
		case Enum.KeyCode.RightShift:
			return "ShiftRight";
		case Enum.KeyCode.LeftControl:
			return "ControlLeft";
		case Enum.KeyCode.RightControl:
			return "ControlRight";
		case Enum.KeyCode.LeftAlt:
			return "AltLeft";
		case Enum.KeyCode.RightAlt:
			return "AltRight";
		case Enum.KeyCode.LeftMeta:
			return "Meta";
		case Enum.KeyCode.RightMeta:
			return "Meta";

		// 功能键 F1-F12
		case Enum.KeyCode.F1:
			return "F1";
		case Enum.KeyCode.F2:
			return "F2";
		case Enum.KeyCode.F3:
			return "F3";
		case Enum.KeyCode.F4:
			return "F4";
		case Enum.KeyCode.F5:
			return "F5";
		case Enum.KeyCode.F6:
			return "F6";
		case Enum.KeyCode.F7:
			return "F7";
		case Enum.KeyCode.F8:
			return "F8";
		case Enum.KeyCode.F9:
			return "F9";
		case Enum.KeyCode.F10:
			return "F10";
		case Enum.KeyCode.F11:
			return "F11";
		case Enum.KeyCode.F12:
			return "F12";

		// 特殊键
		case Enum.KeyCode.Pause:
			return "Pause";
		case Enum.KeyCode.Print:
			return "PrintScreen";

		// 字母键 - 使用字符键
		case Enum.KeyCode.A:
			return characterKey("a");
		case Enum.KeyCode.B:
			return characterKey("b");
		case Enum.KeyCode.C:
			return characterKey("c");
		case Enum.KeyCode.D:
			return characterKey("d");
		case Enum.KeyCode.E:
			return characterKey("e");
		case Enum.KeyCode.F:
			return characterKey("f");
		case Enum.KeyCode.G:
			return characterKey("g");
		case Enum.KeyCode.H:
			return characterKey("h");
		case Enum.KeyCode.I:
			return characterKey("i");
		case Enum.KeyCode.J:
			return characterKey("j");
		case Enum.KeyCode.K:
			return characterKey("k");
		case Enum.KeyCode.L:
			return characterKey("l");
		case Enum.KeyCode.M:
			return characterKey("m");
		case Enum.KeyCode.N:
			return characterKey("n");
		case Enum.KeyCode.O:
			return characterKey("o");
		case Enum.KeyCode.P:
			return characterKey("p");
		case Enum.KeyCode.Q:
			return characterKey("q");
		case Enum.KeyCode.R:
			return characterKey("r");
		case Enum.KeyCode.S:
			return characterKey("s");
		case Enum.KeyCode.T:
			return characterKey("t");
		case Enum.KeyCode.U:
			return characterKey("u");
		case Enum.KeyCode.V:
			return characterKey("v");
		case Enum.KeyCode.W:
			return characterKey("w");
		case Enum.KeyCode.X:
			return characterKey("x");
		case Enum.KeyCode.Y:
			return characterKey("y");
		case Enum.KeyCode.Z:
			return characterKey("z");

		// 数字键 - 使用字符键
		case Enum.KeyCode.Zero:
			return characterKey("0");
		case Enum.KeyCode.One:
			return characterKey("1");
		case Enum.KeyCode.Two:
			return characterKey("2");
		case Enum.KeyCode.Three:
			return characterKey("3");
		case Enum.KeyCode.Four:
			return characterKey("4");
		case Enum.KeyCode.Five:
			return characterKey("5");
		case Enum.KeyCode.Six:
			return characterKey("6");
		case Enum.KeyCode.Seven:
			return characterKey("7");
		case Enum.KeyCode.Eight:
			return characterKey("8");
		case Enum.KeyCode.Nine:
			return characterKey("9");

		// 符号键 - 使用字符键
		case Enum.KeyCode.Minus:
			return characterKey("-");
		case Enum.KeyCode.Equals:
			return characterKey("=");
		case Enum.KeyCode.LeftBracket:
			return characterKey("[");
		case Enum.KeyCode.RightBracket:
			return characterKey("]");
		case Enum.KeyCode.BackSlash:
			return characterKey("\\");
		case Enum.KeyCode.Semicolon:
			return characterKey(";");
		case Enum.KeyCode.Quote:
			return characterKey("'");
		case Enum.KeyCode.Comma:
			return characterKey(",");
		case Enum.KeyCode.Period:
			return characterKey(".");
		case Enum.KeyCode.Slash:
			return characterKey("/");
		case Enum.KeyCode.Backquote:
			return characterKey("`");

		// 数字小键盘
		case Enum.KeyCode.KeypadZero:
			return characterKey("0");
		case Enum.KeyCode.KeypadOne:
			return characterKey("1");
		case Enum.KeyCode.KeypadTwo:
			return characterKey("2");
		case Enum.KeyCode.KeypadThree:
			return characterKey("3");
		case Enum.KeyCode.KeypadFour:
			return characterKey("4");
		case Enum.KeyCode.KeypadFive:
			return characterKey("5");
		case Enum.KeyCode.KeypadSix:
			return characterKey("6");
		case Enum.KeyCode.KeypadSeven:
			return characterKey("7");
		case Enum.KeyCode.KeypadEight:
			return characterKey("8");
		case Enum.KeyCode.KeypadNine:
			return characterKey("9");
		case Enum.KeyCode.KeypadPeriod:
			return characterKey(".");
		case Enum.KeyCode.KeypadDivide:
			return characterKey("/");
		case Enum.KeyCode.KeypadMultiply:
			return characterKey("*");
		case Enum.KeyCode.KeypadMinus:
			return characterKey("-");
		case Enum.KeyCode.KeypadPlus:
			return characterKey("+");
		case Enum.KeyCode.KeypadEnter:
			return "Enter";

		// 默认情况 - 未识别键
		default:
			return "Unidentified";
	}
}

/**
 * 键盘输入事件
 * 对应 Rust Bevy 的 KeyboardInput
 *
 * 该事件在键盘按键被按下或释放时触发
 * 会在 keyboard_input_system 中被消费，用于更新 ButtonInput<KeyCode> 资源
 */
export class KeyboardInput implements Message {
	/** 事件时间戳 */
	readonly timestamp?: number;

	/**
	 * 创建键盘输入事件
	 * @param keyCode - 物理键码（不考虑键盘布局）
	 * @param key - 逻辑键（考虑键盘布局的实际字符）
	 * @param state - 按键状态（按下或释放）
	 * @param textValue - 产生的文本内容（如果有）
	 * @param isRepeat - 是否是重复按键事件
	 * @param window - 窗口实体（Roblox 中始终为 undefined）
	 */
	constructor(
		public readonly keyCode: Enum.KeyCode,
		public readonly key: Key,
		public readonly state: ButtonState,
		public readonly textValue?: string,
		public readonly isRepeat: boolean = false,
		public readonly window?: unknown,
	) {}
}

/**
 * 键盘焦点丢失事件
 * 对应 Rust Bevy 的 KeyboardFocusLost
 *
 * 当窗口失去焦点时触发，用于清理所有键盘状态
 * 防止切换窗口时出现"卡键"现象
 */
export class KeyboardFocusLost implements Message {
	/** 事件时间戳 */
	readonly timestamp?: number;
}

/**
 * 键盘输入系统
 * 对应 Rust Bevy 的 keyboard_input_system
 *
 * 处理 KeyboardInput 事件，更新 ButtonInput<KeyCode> 和 ButtonInput<Key> 资源
 * 提供方便的状态查询接口（pressed、just_pressed、just_released）
 *
 * @param world - World 实例
 * @param keyboardEvents - 键盘输入事件读取器
 * @param focusLostEvents - 焦点丢失事件读取器
 */
export function keyboardInputSystem(
	world: World,
	keyboardEvents: MessageReader<KeyboardInput>,
	focusLostEvents: MessageReader<KeyboardFocusLost>,
): void {
	const keyCodeInput = world.resources.getResource<ButtonInput<Enum.KeyCode>>();
	const keyInput = world.resources.getResource<ButtonInput<Key>>();

	if (!keyCodeInput || !keyInput) {
		return;
	}

	// 清理上一帧的 just_pressed 和 just_released 状态
	// 避免未修改时触发变更检测
	keyCodeInput.clear();
	keyInput.clear();

	// 处理所有键盘事件
	for (const event of keyboardEvents.read()) {
		const { keyCode, key, state } = event;

		if (state === ButtonState.Pressed) {
			keyCodeInput.press(keyCode);
			keyInput.press(key);
		} else if (state === ButtonState.Released) {
			keyCodeInput.release(keyCode);
			keyInput.release(key);
		}
	}

	// 处理焦点丢失事件 - 释放所有按键
	if (!focusLostEvents.isEmpty()) {
		keyCodeInput.releaseAll();
		keyInput.releaseAll();
		focusLostEvents.clear();
	}
}