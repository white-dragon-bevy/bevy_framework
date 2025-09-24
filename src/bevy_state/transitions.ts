/**
 * transitions.ts - 状态转换系统
 * 对应 Rust bevy_state/src/state/transitions.rs
 */

import { World } from "@rbxts/matter";
import type { ScheduleLabel } from "../bevy_ecs/schedule/types";
import { Event, EventWriter } from "../bevy_ecs/events";
import { ResourceManager } from "../bevy_ecs/resource";
import { States } from "./states";
import { State, NextState, StateConstructor } from "./resources";

/**
 * 状态转换调度标签
 */
export const StateTransition: ScheduleLabel = "StateTransition";

/**
 * 状态转换事件
 * 对应 Rust StateTransitionEvent<S>
 */
export class StateTransitionEvent<S extends States> implements Event {
	public readonly timestamp?: number;

	/**
	 * 构造函数
	 * @param exited - 退出的状态（可选）
	 * @param entered - 进入的状态（可选）
	 */
	public constructor(
		public readonly exited?: S,
		public readonly entered?: S,
	) {}

	/**
	 * 检查是否从某状态退出
	 * @param state - 要检查的状态
	 * @returns 是否退出该状态
	 */
	public isExitingFrom(state: S): boolean {
		return this.exited !== undefined && this.exited.equals(state);
	}

	/**
	 * 检查是否进入某状态
	 * @param state - 要检查的状态
	 * @returns 是否进入该状态
	 */
	public isEnteringTo(state: S): boolean {
		return this.entered !== undefined && this.entered.equals(state);
	}

	/**
	 * 检查是否为特定的转换
	 * @param from - 起始状态
	 * @param to - 目标状态
	 * @returns 是否为指定转换
	 */
	public isTransition(from: S, to: S): boolean {
		return this.isExitingFrom(from) && this.isEnteringTo(to);
	}
}

/**
 * 进入状态时的调度标签
 * @param state - 状态值
 * @returns 调度标签
 */
export function OnEnter<S extends States>(state: S): ScheduleLabel {
	return `OnEnter_${state.getStateId()}` as ScheduleLabel;
}

/**
 * 退出状态时的调度标签
 * @param state - 状态值
 * @returns 调度标签
 */
export function OnExit<S extends States>(state: S): ScheduleLabel {
	return `OnExit_${state.getStateId()}` as ScheduleLabel;
}

/**
 * 状态转换时的调度标签
 * @param from - 起始状态
 * @param to - 目标状态
 * @returns 调度标签
 */
export function OnTransition<S extends States>(from: S, to: S): ScheduleLabel {
	return `OnTransition_${from.getStateId()}_to_${to.getStateId()}` as ScheduleLabel;
}

/**
 * 进入调度集合
 */
export const EnterSchedules = "EnterSchedules";

/**
 * 退出调度集合
 */
export const ExitSchedules = "ExitSchedules";

/**
 * 转换调度集合
 */
export const TransitionSchedules = "TransitionSchedules";

/**
 * 状态转换管理器
 */
export class StateTransitionManager<S extends States> {
	private stateType: StateConstructor<S>;
	private eventWriters: Map<string, any> = new Map();

	/**
	 * 构造函数
	 * @param stateType - 状态类型构造函数
	 */
	public constructor(stateType: StateConstructor<S>) {
		this.stateType = stateType;
	}

	/**
	 * 处理状态转换
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 * @returns 是否发生了转换
	 */
	public processTransition(world: World, resourceManager: ResourceManager): boolean {
		// 获取 NextState 资源
		const nextStateResource = resourceManager.getResource(NextState<S>);
		if (!nextStateResource || !nextStateResource.hasPending()) {
			return false;
		}

		// 取出待处理状态
		const newState = nextStateResource.take();
		if (!newState) {
			return false;
		}

		// 获取当前状态资源
		let currentStateResource = resourceManager.getResource(State<S>);

		// 准备转换事件
		const exitedState = currentStateResource?.get();
		const event = new StateTransitionEvent(exitedState, newState);

		// 如果没有当前状态资源，创建它
		if (!currentStateResource) {
			currentStateResource = State.create(newState);
			resourceManager.insertResource(State<S>, currentStateResource);
		} else {
			// 更新当前状态
			currentStateResource._set(newState);
		}

		// 发送转换事件
		this.sendTransitionEvent(event);

		return true;
	}

	/**
	 * 发送状态转换事件
	 * @param event - 转换事件
	 */
	private sendTransitionEvent(event: StateTransitionEvent<S>): void {
		// 这里需要与事件系统集成
		// 暂时使用简化实现
		// Iterate through the map manually
		this.eventWriters.forEach((writer) => {
			// writer.send(event);
		});
	}

	/**
	 * 创建事件写入器
	 * @param id - 写入器标识
	 * @returns 事件写入器
	 */
	public createEventWriter(id: string): any {
		// Simplified event writer creation for now
		const writer = { send: (event: StateTransitionEvent<S>) => {} };
		this.eventWriters.set(id, writer);
		return writer;
	}

	/**
	 * 移除事件写入器
	 * @param id - 写入器标识
	 */
	public removeEventWriter(id: string): void {
		this.eventWriters.delete(id);
	}
}

/**
 * 获取上一次的状态转换
 * @param world - 游戏世界
 * @param stateType - 状态类型
 * @returns 最后一次转换或 undefined
 */
export function lastTransition<S extends States>(
	world: World,
	stateType: StateConstructor<S>,
): StateTransitionEvent<S> | undefined {
	// 这需要与事件系统集成来实现
	// 暂时返回 undefined
	return undefined;
}