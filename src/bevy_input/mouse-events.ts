/**
 * 鼠标事件类型定义
 * 对应 Rust Bevy 的鼠标事件
 */

import type { Message } from "../bevy_ecs/message";
import { MouseButton } from "./mouse";

/**
 * 按钮状态枚举
 * 对应 Rust Bevy 的 ButtonState
 */
export enum ButtonState {
	/** 按钮被按下 */
	Pressed = "Pressed",
	/** 按钮被释放 */
	Released = "Released",
}

/**
 * 鼠标按钮输入消息
 * 对应 Rust Bevy 的 MouseButtonInput
 * 当鼠标按钮被按下或释放时触发
 */
export class MouseButtonInput implements Message {
	/** 事件时间戳 */
	readonly timestamp?: number;

	/**
	 * 创建鼠标按钮输入事件
	 * @param button - 鼠标按钮
	 * @param state - 按钮状态（按下或释放）
	 */
	constructor(
		public readonly button: MouseButton | Enum.UserInputType,
		public readonly state: ButtonState,
	) {}
}

/**
 * 鼠标移动消息
 * 对应 Rust Bevy 的 MouseMotion
 * 报告鼠标的物理移动（原始、未过滤的移动）
 */
export class MouseMotion implements Message {
	/** 事件时间戳 */
	readonly timestamp?: number;

	/**
	 * 创建鼠标移动事件
	 * @param deltaX - X轴移动增量
	 * @param deltaY - Y轴移动增量
	 */
	constructor(
		public readonly deltaX: number,
		public readonly deltaY: number,
	) {}

}

/**
 * 滚轮单位枚举
 * 对应 Rust Bevy 的 MouseScrollUnit
 */
export enum MouseScrollUnit {
	/** 行滚动单位 - 增量对应要滚动的行数 */
	Line = "Line",
	/** 像素滚动单位 - 增量对应要滚动的像素数 */
	Pixel = "Pixel",
}

/**
 * 鼠标滚轮消息
 * 对应 Rust Bevy 的 MouseWheel
 * 当鼠标滚轮滚动时触发
 */
export class MouseWheel implements Message {
	/** 事件时间戳 */
	readonly timestamp?: number;

	/**
	 * 创建鼠标滚轮事件
	 * @param x - 水平滚动量（大多数鼠标不支持）
	 * @param y - 垂直滚动量（正值向前，负值向后）
	 * @param unit - 滚动单位（行或像素）
	 */
	constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly unit: MouseScrollUnit = MouseScrollUnit.Line,
	) {}

}

/**
 * 光标移动消息
 * 对应 Rust Bevy 的 CursorMoved（通常在 bevy_window 中）
 * 报告光标在窗口中的位置
 *
 * 注意：在 Roblox 中，这个消息与 MouseMotion 的区别是：
 * - CursorMoved 提供绝对位置
 * - MouseMotion 提供相对移动增量
 */
export class CursorMoved implements Message {
	/** 事件时间戳 */
	readonly timestamp?: number;

	/**
	 * 创建光标移动事件
	 * @param position - 光标在窗口中的位置
	 * @param delta - 相对于上一位置的移动增量（可选）
	 */
	constructor(
		public readonly position: Vector2,
		public readonly delta?: Vector2,
	) {}

}