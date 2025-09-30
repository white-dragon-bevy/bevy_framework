/**
 * condition.ts - 状态运行条件
 * 对应 Rust bevy_state/src/condition.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../src/bevy_ecs/resource";
import { States } from "./states";
import { State, StateConstructor } from "./resources";
import { TypeDescriptor } from "../bevy_core";


/**
 * 运行条件函数类型
 *
 * **用途**: 定义系统运行条件的函数签名
 */
export type RunCondition = (world: World, resourceManager: ResourceManager) => boolean;

/**
 * 检查是否处于特定状态
 *
 * **用途**: 创建一个运行条件，仅在当前状态匹配目标状态时返回 true
 *
 * @param stateType - 状态类型描述符
 * @param targetState - 目标状态实例
 * @returns 运行条件函数
 */
export function inState<S extends States>(
	stateType: TypeDescriptor,
	targetState: S,
): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);
		if (!stateResource) {
			return false;
		}
		return stateResource.is(targetState);
	};
}

/**
 * 检查状态资源是否存在
 *
 * **用途**: 创建一个运行条件，仅在状态资源存在时返回 true
 *
 * @param stateType - 状态类型描述符
 * @returns 运行条件函数
 */
export function stateExists<S extends States>(stateType: TypeDescriptor): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		return resourceManager.hasResourceByDescriptor(stateType);
	};
}

/**
 * 检查状态是否发生了变化
 *
 * **注意**: 此函数使用闭包来保持状态历史，应该在应用初始化时创建一次并复用，
 * 而不是每帧重新创建。重复创建会导致内存增长和状态检测失效。
 *
 * @param stateType - 状态类型
 * @returns 运行条件函数
 */
export function stateChanged<S extends States>(stateType: TypeDescriptor): RunCondition {
	let lastState: S | undefined;
	let hasInitialized = false;

	return (world: World, resourceManager: ResourceManager): boolean => {
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);

		if (!stateResource) {
			// 状态不存在时，如果之前存在过则认为发生了变化
			const changed = lastState !== undefined;
			lastState = undefined;
			return changed;
		}

		const currentState = stateResource.get();

		// 初次初始化时认为发生了变化
		if (!hasInitialized) {
			hasInitialized = true;
			lastState = currentState.clone() as S;
			return true;
		}

		// 检查状态是否改变
		const changed = lastState === undefined || !lastState.equals(currentState);
		lastState = currentState.clone() as S;
		return changed;
	};
}

/**
 * 检查是否正在从特定状态退出
 *
 * **注意**: 此函数使用闭包来跟踪状态，应该在应用初始化时创建一次并复用。
 *
 * @param stateType - 状态类型
 * @param exitingState - 正在退出的状态
 * @returns 运行条件函数
 */
export function exitingState<S extends States>(
	stateType: TypeDescriptor,
	exitingState: S,
): RunCondition {
	let wasInState = false;

	return (world: World, resourceManager: ResourceManager): boolean => {
		// 使用统一的资源键生成方式
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);
		const isInState = stateResource ? stateResource.is(exitingState) : false;

		const exiting = wasInState && !isInState;
		wasInState = isInState;
		return exiting;
	};
}

/**
 * 检查是否正在进入特定状态
 *
 * **注意**: 此函数使用闭包来跟踪状态，应该在应用初始化时创建一次并复用。
 *
 * @param stateType - 状态类型
 * @param enteringState - 正在进入的状态
 * @returns 运行条件函数
 */
export function enteringState<S extends States>(
	stateType: TypeDescriptor,
	enteringState: S,
): RunCondition {
	let wasInState = false;

	return (world: World, resourceManager: ResourceManager): boolean => {
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);
		const isInState = stateResource ? stateResource.is(enteringState) : false;

		const entering = !wasInState && isInState;
		wasInState = isInState;
		return entering;
	};
}

/**
 * 组合多个运行条件（AND 逻辑）
 *
 * **用途**: 创建一个运行条件，仅在所有子条件都为 true 时返回 true
 *
 * @param conditions - 运行条件数组
 * @returns 组合后的运行条件函数
 */
export function andCondition(...conditions: RunCondition[]): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		for (const condition of conditions) {
			if (!condition(world, resourceManager)) {
				return false;
			}
		}
		return true;
	};
}

/**
 * 组合多个运行条件（OR 逻辑）
 *
 * **用途**: 创建一个运行条件，只要有一个子条件为 true 就返回 true
 *
 * @param conditions - 运行条件数组
 * @returns 组合后的运行条件函数
 */
export function orCondition(...conditions: RunCondition[]): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		for (const condition of conditions) {
			if (condition(world, resourceManager)) {
				return true;
			}
		}
		return false;
	};
}

/**
 * 反转运行条件
 *
 * **用途**: 创建一个运行条件，返回输入条件的相反值
 *
 * @param condition - 原始运行条件函数
 * @returns 反转后的运行条件函数
 */
export function notCondition(condition: RunCondition): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		return !condition(world, resourceManager);
	};
}

/**
 * 创建自定义运行条件
 *
 * **便利函数**: 将自定义函数包装为运行条件
 *
 * @param fn - 自定义条件判断函数
 * @returns 运行条件函数
 */
export function customCondition(
	fn: (world: World, resourceManager: ResourceManager) => boolean,
): RunCondition {
	return fn;
}

/**
 * 始终返回 true 的运行条件
 *
 * **用途**: 用于始终执行的系统
 */
export const alwaysRun: RunCondition = () => true;

/**
 * 始终返回 false 的运行条件
 *
 * **用途**: 用于禁用系统执行
 */
export const neverRun: RunCondition = () => false;
