/**
 * condition.ts - 状态运行条件
 * 对应 Rust bevy_state/src/condition.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager, ResourceConstructor } from "../bevy_ecs/resource";
import { States } from "./states";
import { State, StateConstructor } from "./resources";


/**
 * 运行条件函数类型
 */
export type RunCondition = (world: World, resourceManager: ResourceManager) => boolean;

/**
 * 检查是否处于特定状态
 * @param stateType - 状态类型
 * @param targetState - 目标状态
 * @returns 运行条件函数
 */
export function inState<S extends States>(
	stateType: StateConstructor<S>,
	targetState: S,
): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		// 使用统一的资源键生成方式
		const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
		const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;
		const stateResource = resourceManager.getResource(stateKey);
		if (!stateResource) {
			return false;
		}
		return stateResource.is(targetState);
	};
}

/**
 * 检查状态是否存在
 * @param stateType - 状态类型
 * @returns 运行条件函数
 */
export function stateExists<S extends States>(stateType: StateConstructor<S>): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		// 使用统一的资源键生成方式
		const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
		const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;
		return resourceManager.hasResource(stateKey);
	};
}

/**
 * 检查状态是否发生了变化
 * @param stateType - 状态类型
 * @returns 运行条件函数
 */
export function stateChanged<S extends States>(stateType: StateConstructor<S>): RunCondition {
	let lastState: S | undefined;
	let hasInitialized = false;

	return (world: World, resourceManager: ResourceManager): boolean => {
		// 使用统一的资源键生成方式
		const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
		const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;
		const stateResource = resourceManager.getResource(stateKey);

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
 * @param stateType - 状态类型
 * @param exitingState - 正在退出的状态
 * @returns 运行条件函数
 */
export function exitingState<S extends States>(
	stateType: StateConstructor<S>,
	exitingState: S,
): RunCondition {
	let wasInState = false;

	return (world: World, resourceManager: ResourceManager): boolean => {
		// 使用统一的资源键生成方式
		const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
		const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;
		const stateResource = resourceManager.getResource(stateKey);
		const isInState = stateResource ? stateResource.is(exitingState) : false;

		const exiting = wasInState && !isInState;
		wasInState = isInState;
		return exiting;
	};
}

/**
 * 检查是否正在进入特定状态
 * @param stateType - 状态类型
 * @param enteringState - 正在进入的状态
 * @returns 运行条件函数
 */
export function enteringState<S extends States>(
	stateType: StateConstructor<S>,
	enteringState: S,
): RunCondition {
	let wasInState = false;

	return (world: World, resourceManager: ResourceManager): boolean => {
		// 使用统一的资源键生成方式
		const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
		const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;
		const stateResource = resourceManager.getResource(stateKey);
		const isInState = stateResource ? stateResource.is(enteringState) : false;

		const entering = !wasInState && isInState;
		wasInState = isInState;
		return entering;
	};
}

/**
 * 组合多个运行条件（AND 逻辑）
 * @param conditions - 运行条件数组
 * @returns 组合后的运行条件
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
 * @param conditions - 运行条件数组
 * @returns 组合后的运行条件
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
 * @param condition - 运行条件
 * @returns 反转后的运行条件
 */
export function notCondition(condition: RunCondition): RunCondition {
	return (world: World, resourceManager: ResourceManager): boolean => {
		return !condition(world, resourceManager);
	};
}

/**
 * 创建自定义运行条件
 * @param fn - 条件函数
 * @returns 运行条件
 */
export function customCondition(
	fn: (world: World, resourceManager: ResourceManager) => boolean,
): RunCondition {
	return fn;
}

/**
 * 始终返回 true 的运行条件
 */
export const alwaysRun: RunCondition = () => true;

/**
 * 始终返回 false 的运行条件
 */
export const neverRun: RunCondition = () => false;
