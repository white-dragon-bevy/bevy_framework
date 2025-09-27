/**
 * 键盘输入事件和处理系统
 * 对应 Rust Bevy 的 keyboard 模块
 *
 * 本文件基于 W3C UI Events Specification 实现
 * Copyright © 2017 W3C® (MIT, ERCIM, Keio, Beihang)
 */

import type { Message, MessageReader } from "../bevy_ecs/message";
import type { World } from "@rbxts/matter";
import { ButtonInput } from "./button-input";
import { ButtonState } from "./mouse-events";
import * as ResourceStorage from "./resource-storage";

/**
 * Key 类型 - 表示逻辑键（字符键）
 * 与 KeyCode 不同，Key 考虑键盘布局，表示实际输入的字符
 * 在 Roblox 中，我们使用字符串表示
 */
export type Key = string;

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
	 * @param logicalKey - 逻辑键（考虑键盘布局的实际字符）
	 * @param state - 按键状态（按下或释放）
	 * @param textValue - 产生的文本内容（如果有）
	 * @param repeatFlag - 是否是重复按键事件
	 */
	constructor(
		public readonly keyCode: Enum.KeyCode,
		public readonly logicalKey: Key,
		public readonly state: ButtonState,
		public readonly textValue?: string,
		public readonly repeatFlag: boolean = false,
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
	const keyCodeInput = ResourceStorage.getKeyboardInput(world);
	const keyInput = ResourceStorage.getKeyInput(world);

	if (!keyCodeInput || !keyInput) {
		return;
	}

	// 清理上一帧的 just_pressed 和 just_released 状态
	// 避免未修改时触发变更检测
	keyCodeInput.clear();
	keyInput.clear();

	// 处理所有键盘事件
	for (const event of keyboardEvents.read()) {
		const { keyCode, logicalKey, state } = event;

		if (state === ButtonState.Pressed) {
			keyCodeInput.press(keyCode);
			keyInput.press(logicalKey);
		} else if (state === ButtonState.Released) {
			keyCodeInput.release(keyCode);
			keyInput.release(logicalKey);
		}
	}

	// 处理焦点丢失事件 - 释放所有按键
	if (!focusLostEvents.isEmpty()) {
		keyCodeInput.releaseAll();
		keyInput.releaseAll();
		focusLostEvents.clear();
	}
}