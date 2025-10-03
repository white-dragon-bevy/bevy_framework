/**
 * condition.ts - 状态运行条件
 * 对应 Rust bevy_state/src/condition.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "bevy_ecs/resource";
import { States } from "./states";
import { State, StateConstructor } from "./resources";
import { TypeDescriptor } from "../bevy_core";

/**
 * 全局 WeakMap 存储每个 World 的状态变化追踪数据
 *
 * **用途**: 使用 WeakMap 实现自动内存管理，当 World 被垃圾回收时自动清理追踪数据
 */
const stateChangeTracking = new WeakMap<World, Map<string, unknown>>();

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
 * **用途**: 创建一个运行条件，仅在状态发生变化时返回 true
 *
 * **内存管理**: 使用 WeakMap 存储状态追踪数据，当 World 被垃圾回收时自动清理，避免内存泄漏
 *
 * @param stateType - 状态类型描述符
 * @returns 运行条件函数
 */
export function stateChanged<S extends States>(stateType: TypeDescriptor): RunCondition {
	const stateKey = `${stateType.id}_${stateType.text}`;

	return (world: World, resourceManager: ResourceManager): boolean => {
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);

		// 获取或创建当前 World 的追踪 Map
		let tracking = stateChangeTracking.get(world);

		if (tracking === undefined) {
			tracking = new Map<string, unknown>();
			stateChangeTracking.set(world, tracking);
		}

		// 获取追踪数据（包含 lastState 和 hasInitialized）
		interface TrackingData {
			hasInitialized: boolean;
			lastState: S | undefined;
		}

		let trackingData = tracking.get(stateKey) as TrackingData | undefined;

		if (trackingData === undefined) {
			trackingData = {
				hasInitialized: false,
				lastState: undefined,
			};
			tracking.set(stateKey, trackingData);
		}

		if (!stateResource) {
			// 状态不存在时，如果之前存在过则认为发生了变化
			const changed = trackingData.lastState !== undefined;
			trackingData.lastState = undefined;
			trackingData.hasInitialized = false;
			return changed;
		}

		const currentState = stateResource.get();

		// 初次初始化时认为发生了变化
		if (!trackingData.hasInitialized) {
			trackingData.hasInitialized = true;
			trackingData.lastState = currentState.clone() as S;
			return true;
		}

		// 检查状态是否改变
		const changed =
			trackingData.lastState === undefined || !trackingData.lastState.equals(currentState);
		trackingData.lastState = currentState.clone() as S;
		return changed;
	};
}

/**
 * 检查是否正在从特定状态退出
 *
 * **用途**: 创建一个运行条件，仅在正在退出特定状态时返回 true
 *
 * **内存管理**: 使用 WeakMap 存储状态追踪数据，当 World 被垃圾回收时自动清理，避免内存泄漏
 *
 * @param stateType - 状态类型描述符
 * @param exitingStateValue - 正在退出的状态
 * @returns 运行条件函数
 */
export function exitingState<S extends States>(
	stateType: TypeDescriptor,
	exitingStateValue: S,
): RunCondition {
	const stateKey = `${stateType.id}_${stateType.text}_exiting_${exitingStateValue.getStateId()}`;

	return (world: World, resourceManager: ResourceManager): boolean => {
		// 获取或创建当前 World 的追踪 Map
		let tracking = stateChangeTracking.get(world);

		if (tracking === undefined) {
			tracking = new Map<string, unknown>();
			stateChangeTracking.set(world, tracking);
		}

		// 获取上次状态
		const wasInState = (tracking.get(stateKey) as boolean | undefined) ?? false;

		// 检查当前状态
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);
		const isInState = stateResource ? stateResource.is(exitingStateValue) : false;

		// 更新追踪数据
		tracking.set(stateKey, isInState);

		// 检查是否正在退出
		const exiting = wasInState && !isInState;
		return exiting;
	};
}

/**
 * 检查是否正在进入特定状态
 *
 * **用途**: 创建一个运行条件，仅在正在进入特定状态时返回 true
 *
 * **内存管理**: 使用 WeakMap 存储状态追踪数据，当 World 被垃圾回收时自动清理，避免内存泄漏
 *
 * @param stateType - 状态类型描述符
 * @param enteringStateValue - 正在进入的状态
 * @returns 运行条件函数
 */
export function enteringState<S extends States>(
	stateType: TypeDescriptor,
	enteringStateValue: S,
): RunCondition {
	const stateKey = `${stateType.id}_${stateType.text}_entering_${enteringStateValue.getStateId()}`;

	return (world: World, resourceManager: ResourceManager): boolean => {
		// 获取或创建当前 World 的追踪 Map
		let tracking = stateChangeTracking.get(world);

		if (tracking === undefined) {
			tracking = new Map<string, unknown>();
			stateChangeTracking.set(world, tracking);
		}

		// 获取上次状态
		const wasInState = (tracking.get(stateKey) as boolean | undefined) ?? false;

		// 检查当前状态
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(stateType);
		const isInState = stateResource ? stateResource.is(enteringStateValue) : false;

		// 更新追踪数据
		tracking.set(stateKey, isInState);

		// 检查是否正在进入
		const entering = !wasInState && isInState;
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
