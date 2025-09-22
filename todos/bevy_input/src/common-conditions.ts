/**
 * @fileoverview 通用运行条件
 *
 * 提供常用的输入条件检查函数，可用于系统的运行条件
 */

import { World } from "@rbxts/matter";
import { WorldExtensions } from "../../bevy_ecs/world-extensions";
import { ButtonInput } from "./button-input";
import { KeyCode, Key } from "./keyboard";
import { MouseButton } from "./mouse";
import { GamepadButton } from "./gamepad";
import { Touches } from "./touch";

/**
 * 检查指定按键是否刚刚被按下
 *
 * @param keyCode - 要检查的按键代码
 * @returns 返回一个条件函数
 */
export function inputJustPressed(keyCode: KeyCode): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<KeyCode>);
		return input ? input.justPressed(keyCode) : false;
	};
}

/**
 * 检查指定按键是否被按下
 *
 * @param keyCode - 要检查的按键代码
 * @returns 返回一个条件函数
 */
export function inputPressed(keyCode: KeyCode): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<KeyCode>);
		return input ? input.isPressed(keyCode) : false;
	};
}

/**
 * 检查指定按键是否刚刚被释放
 *
 * @param keyCode - 要检查的按键代码
 * @returns 返回一个条件函数
 */
export function inputJustReleased(keyCode: KeyCode): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<KeyCode>);
		return input ? input.justReleased(keyCode) : false;
	};
}

/**
 * 检查指定逻辑键是否刚刚被按下
 *
 * @param key - 要检查的逻辑键
 * @returns 返回一个条件函数
 */
export function keyJustPressed(key: Key): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<Key>);
		return input ? input.justPressed(key) : false;
	};
}

/**
 * 检查指定鼠标按钮是否刚刚被按下
 *
 * @param button - 要检查的鼠标按钮
 * @returns 返回一个条件函数
 */
export function mouseButtonJustPressed(button: MouseButton): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<MouseButton>);
		return input ? input.justPressed(button) : false;
	};
}

/**
 * 检查指定鼠标按钮是否被按下
 *
 * @param button - 要检查的鼠标按钮
 * @returns 返回一个条件函数
 */
export function mouseButtonPressed(button: MouseButton): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<MouseButton>);
		return input ? input.isPressed(button) : false;
	};
}

/**
 * 检查指定鼠标按钮是否刚刚被释放
 *
 * @param button - 要检查的鼠标按钮
 * @returns 返回一个条件函数
 */
export function mouseButtonJustReleased(button: MouseButton): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<MouseButton>);
		return input ? input.justReleased(button) : false;
	};
}

/**
 * 检查任意按键是否刚刚被按下
 *
 * @param keyCodes - 要检查的按键代码数组
 * @returns 返回一个条件函数
 */
export function anyInputJustPressed(keyCodes: readonly KeyCode[]): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<KeyCode>);
		return input ? input.anyJustPressed(keyCodes) : false;
	};
}

/**
 * 检查任意按键是否被按下
 *
 * @param keyCodes - 要检查的按键代码数组
 * @returns 返回一个条件函数
 */
export function anyInputPressed(keyCodes: readonly KeyCode[]): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<KeyCode>);
		return input ? input.anyPressed(keyCodes) : false;
	};
}

/**
 * 检查所有按键是否都被按下
 *
 * @param keyCodes - 要检查的按键代码数组
 * @returns 返回一个条件函数
 */
export function allInputPressed(keyCodes: readonly KeyCode[]): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const input = extensions.getResource(ButtonInput<KeyCode>);
		return input ? input.allPressed(keyCodes) : false;
	};
}

/**
 * 检查是否有任何触摸输入刚刚开始
 *
 * @returns 返回一个条件函数
 */
export function anyTouchJustStarted(): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const touches = extensions.getResource(Touches);
		return touches ? touches.anyJustPressed() : false;
	};
}

/**
 * 检查游戏手柄按钮是否刚刚被按下
 *
 * @param gamepadId - 游戏手柄 ID
 * @param button - 要检查的按钮
 * @returns 返回一个条件函数
 */
export function gamepadButtonJustPressed(
	gamepadId: number,
	button: GamepadButton,
): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const gamepads = extensions.getResource(Map<number, ButtonInput<GamepadButton>>);
		if (!gamepads) return false;
		const input = gamepads.get(gamepadId);
		return input ? input.justPressed(button) : false;
	};
}

/**
 * 检查游戏手柄按钮是否被按下
 *
 * @param gamepadId - 游戏手柄 ID
 * @param button - 要检查的按钮
 * @returns 返回一个条件函数
 */
export function gamepadButtonPressed(
	gamepadId: number,
	button: GamepadButton,
): (world: World) => boolean {
	return (world: World) => {
		const extensions = WorldExtensions.get(world);
		const gamepads = extensions.getResource(Map<number, ButtonInput<GamepadButton>>);
		if (!gamepads) return false;
		const input = gamepads.get(gamepadId);
		return input ? input.isPressed(button) : false;
	};
}

/**
 * 组合多个条件函数 - AND 逻辑
 *
 * @param conditions - 条件函数数组
 * @returns 返回一个组合条件函数
 */
export function andConditions(
	...conditions: Array<(world: World) => boolean>
): (world: World) => boolean {
	return (world: World) => {
		return conditions.every((condition) => condition(world));
	};
}

/**
 * 组合多个条件函数 - OR 逻辑
 *
 * @param conditions - 条件函数数组
 * @returns 返回一个组合条件函数
 */
export function orConditions(
	...conditions: Array<(world: World) => boolean>
): (world: World) => boolean {
	return (world: World) => {
		return conditions.some((condition) => condition(world));
	};
}

/**
 * 反转条件函数
 *
 * @param condition - 要反转的条件函数
 * @returns 返回一个反转的条件函数
 */
export function notCondition(
	condition: (world: World) => boolean,
): (world: World) => boolean {
	return (world: World) => {
		return !condition(world);
	};
}