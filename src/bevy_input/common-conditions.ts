/**
 * 输入条件函数系统
 * 提供声明式的输入检测条件，用于系统运行控制
 */

import { World } from "../bevy_ecs";

import { ButtonInput } from "./button-input";
import { getKeyboardInput, getMouseInput } from "./plugin";

/**
 * 条件函数类型定义
 */
export type RunCondition = (world: World) => boolean;

/**
 * 创建一个切换状态的输入条件
 * 每次按下指定输入时切换激活状态
 * @param defaultState - 默认激活状态
 * @param input - 触发切换的输入
 * @param resourceKey - ButtonInput 资源在 World 中的键名
 * @returns 返回条件函数
 */
export function inputToggleActive<T extends defined>(
	defaultState: boolean,
	input: T,
	resourceKey: string,
): RunCondition {
	let active = defaultState;

	return (world: World): boolean => {
		let buttonInput: ButtonInput<T> | undefined;

		if (resourceKey === "ButtonInput<KeyCode>") {
			buttonInput = getKeyboardInput(world) as unknown as ButtonInput<T> | undefined;
		} else if (resourceKey === "ButtonInput<MouseButton>") {
			buttonInput = getMouseInput(world) as unknown as ButtonInput<T> | undefined;
		}

		if (!buttonInput) {
			return active;
		}

		if (buttonInput.justPressed(input)) {
			active = !active;
		}

		return active;
	};
}

/**
 * 创建一个检测输入是否正在按下的条件
 * @param input - 要检测的输入
 * @param resourceKey - ButtonInput 资源在 World 中的键名
 * @returns 返回条件函数
 */
export function inputPressed<T extends defined>(
	input: T,
	resourceKey: string,
): RunCondition {
	return (world: World): boolean => {
		let buttonInput: ButtonInput<T> | undefined;

		if (resourceKey === "ButtonInput<KeyCode>") {
			buttonInput = getKeyboardInput(world) as unknown as ButtonInput<T> | undefined;
		} else if (resourceKey === "ButtonInput<MouseButton>") {
			buttonInput = getMouseInput(world) as unknown as ButtonInput<T> | undefined;
		}

		if (!buttonInput) {
			return false;
		}

		return buttonInput.isPressed(input);
	};
}

/**
 * 创建一个检测输入是否刚按下的条件
 * @param input - 要检测的输入
 * @param resourceKey - ButtonInput 资源在 World 中的键名
 * @returns 返回条件函数
 */
export function inputJustPressed<T extends defined>(
	input: T,
	resourceKey: string,
): RunCondition {
	return (world: World): boolean => {
		let buttonInput: ButtonInput<T> | undefined;

		if (resourceKey === "ButtonInput<KeyCode>") {
			buttonInput = getKeyboardInput(world) as unknown as ButtonInput<T> | undefined;
		} else if (resourceKey === "ButtonInput<MouseButton>") {
			buttonInput = getMouseInput(world) as unknown as ButtonInput<T> | undefined;
		}

		if (!buttonInput) {
			return false;
		}

		return buttonInput.justPressed(input);
	};
}

/**
 * 创建一个检测输入是否刚释放的条件
 * @param input - 要检测的输入
 * @param resourceKey - ButtonInput 资源在 World 中的键名
 * @returns 返回条件函数
 */
export function inputJustReleased<T extends defined>(
	input: T,
	resourceKey: string,
): RunCondition {
	return (world: World): boolean => {
		let buttonInput: ButtonInput<T> | undefined;

		if (resourceKey === "ButtonInput<KeyCode>") {
			buttonInput = getKeyboardInput(world) as unknown as ButtonInput<T> | undefined;
		} else if (resourceKey === "ButtonInput<MouseButton>") {
			buttonInput = getMouseInput(world) as unknown as ButtonInput<T> | undefined;
		}

		if (!buttonInput) {
			return false;
		}

		return buttonInput.justReleased(input);
	};
}

/**
 * 创建一个检测任意输入是否正在按下的条件
 * @param inputs - 要检测的输入数组
 * @param resourceKey - ButtonInput 资源在 World 中的键名
 * @returns 返回条件函数
 */
export function anyInputPressed<T extends defined>(
	inputs: Array<T>,
	resourceKey: string,
): RunCondition {
	return (world: World): boolean => {
		let buttonInput: ButtonInput<T> | undefined;

		if (resourceKey === "ButtonInput<KeyCode>") {
			buttonInput = getKeyboardInput(world) as unknown as ButtonInput<T> | undefined;
		} else if (resourceKey === "ButtonInput<MouseButton>") {
			buttonInput = getMouseInput(world) as unknown as ButtonInput<T> | undefined;
		}

		if (!buttonInput) {
			return false;
		}

		return buttonInput.anyPressed(inputs);
	};
}

/**
 * 创建一个检测所有输入是否都在按下的条件
 * @param inputs - 要检测的输入数组
 * @param resourceKey - ButtonInput 资源在 World 中的键名
 * @returns 返回条件函数
 */
export function allInputPressed<T extends defined>(
	inputs: Array<T>,
	resourceKey: string,
): RunCondition {
	return (world: World): boolean => {
		let buttonInput: ButtonInput<T> | undefined;

		if (resourceKey === "ButtonInput<KeyCode>") {
			buttonInput = getKeyboardInput(world) as unknown as ButtonInput<T> | undefined;
		} else if (resourceKey === "ButtonInput<MouseButton>") {
			buttonInput = getMouseInput(world) as unknown as ButtonInput<T> | undefined;
		}

		if (!buttonInput) {
			return false;
		}

		return buttonInput.allPressed(inputs);
	};
}

/**
 * 组合多个条件函数，所有条件都满足时返回 true
 * @param conditions - 条件函数数组
 * @returns 返回组合后的条件函数
 */
export function andConditions(...conditions: Array<RunCondition>): RunCondition {
	return (world: World): boolean => {
		for (const condition of conditions) {
			if (!condition(world)) {
				return false;
			}
		}
		return true;
	};
}

/**
 * 组合多个条件函数，任意条件满足时返回 true
 * @param conditions - 条件函数数组
 * @returns 返回组合后的条件函数
 */
export function orConditions(...conditions: Array<RunCondition>): RunCondition {
	return (world: World): boolean => {
		for (const condition of conditions) {
			if (condition(world)) {
				return true;
			}
		}
		return false;
	};
}

/**
 * 反转条件函数的结果
 * @param condition - 要反转的条件函数
 * @returns 返回反转后的条件函数
 */
export function notCondition(condition: RunCondition): RunCondition {
	return (world: World): boolean => {
		return !condition(world);
	};
}