/**
 * bevy_input 模块
 * 轻量级输入管理系统，基于 Bevy 设计理念
 */

// 核心类型导出
export { ButtonInput } from "./button-input";
export { AccumulatedMouseMotion, AccumulatedMouseWheel, MouseButton, MousePosition } from "./mouse";

// 条件函数导出
export {
	RunCondition,
	allInputPressed,
	andConditions,
	anyInputPressed,
	inputJustPressed,
	inputJustReleased,
	inputPressed,
	inputToggleActive,
	notCondition,
	orConditions,
} from "./common-conditions";

// 插件和辅助函数导出
export {
	InputPlugin,
	InputResources,
	getKeyboardInput,
	getMouseInput,
	getMouseMotion,
	getMousePosition,
	getMouseWheel,
} from "./plugin";

import { InputResources as IR } from "./plugin";
import {
	allInputPressed as allIP,
	anyInputPressed as anyIP,
	inputJustPressed as ijp,
	inputJustReleased as ijr,
	inputPressed as ip,
	inputToggleActive as ita,
} from "./common-conditions";

/**
 * 快捷条件函数 - 键盘输入
 */
export namespace KeyboardConditions {
	/**
	 * 创建键盘按键刚按下的条件
	 * @param key - 按键
	 * @returns 条件函数
	 */
	export function justPressed(key: Enum.KeyCode) {
		return ijp(key, IR.Keyboard);
	}

	/**
	 * 创建键盘按键正在按下的条件
	 * @param key - 按键
	 * @returns 条件函数
	 */
	export function pressed(key: Enum.KeyCode) {
		return ip(key, IR.Keyboard);
	}

	/**
	 * 创建键盘按键刚释放的条件
	 * @param key - 按键
	 * @returns 条件函数
	 */
	export function justReleased(key: Enum.KeyCode) {
		return ijr(key, IR.Keyboard);
	}

	/**
	 * 创建键盘按键切换状态的条件
	 * @param defaultState - 默认状态
	 * @param key - 按键
	 * @returns 条件函数
	 */
	export function toggleActive(defaultState: boolean, key: Enum.KeyCode) {
		return ita(defaultState, key, IR.Keyboard);
	}

	/**
	 * 创建任意键盘按键正在按下的条件
	 * @param keys - 按键数组
	 * @returns 条件函数
	 */
	export function anyPressed(keys: Array<Enum.KeyCode>) {
		return anyIP(keys, IR.Keyboard);
	}

	/**
	 * 创建所有键盘按键都在按下的条件
	 * @param keys - 按键数组
	 * @returns 条件函数
	 */
	export function allPressed(keys: Array<Enum.KeyCode>) {
		return allIP(keys, IR.Keyboard);
	}
}

/**
 * 快捷条件函数 - 鼠标输入
 */
export namespace MouseConditions {
	/**
	 * 创建鼠标按钮刚按下的条件
	 * @param button - 鼠标按钮
	 * @returns 条件函数
	 */
	export function justPressed(button: Enum.UserInputType) {
		return ijp(button, IR.Mouse);
	}

	/**
	 * 创建鼠标按钮正在按下的条件
	 * @param button - 鼠标按钮
	 * @returns 条件函数
	 */
	export function pressed(button: Enum.UserInputType) {
		return ip(button, IR.Mouse);
	}

	/**
	 * 创建鼠标按钮刚释放的条件
	 * @param button - 鼠标按钮
	 * @returns 条件函数
	 */
	export function justReleased(button: Enum.UserInputType) {
		return ijr(button, IR.Mouse);
	}

	/**
	 * 创建鼠标按钮切换状态的条件
	 * @param defaultState - 默认状态
	 * @param button - 鼠标按钮
	 * @returns 条件函数
	 */
	export function toggleActive(defaultState: boolean, button: Enum.UserInputType) {
		return ita(defaultState, button, IR.Mouse);
	}
}