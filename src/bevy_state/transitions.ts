/**
 * transitions.ts - 状态转换系统
 * 对应 Rust bevy_state/src/state/transitions.rs
 */

import { World } from "@rbxts/matter";
import type { ScheduleLabel } from "../bevy_ecs/schedule/types";
import { Event, EventWriter } from "../bevy_ecs/events";
import { ResourceManager, ResourceConstructor } from "../bevy_ecs/resource";
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
	 * @param app - App 实例（可选）
	 * @returns 是否发生了转换
	 */
	public processTransition(world: World, resourceManager: ResourceManager, app?: unknown): boolean {
		// Use unique resource keys based on state type
		const stateTypeName = (this.stateType as unknown as { name?: string }).name || tostring(this.stateType);
		const nextStateResourceKey = `NextState<${stateTypeName}>` as ResourceConstructor<NextState<S>>;
		const stateResourceKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;

		// 获取 NextState 资源
		const nextStateResource = resourceManager.getResource(nextStateResourceKey);
		if (!nextStateResource || !nextStateResource.hasPending()) {
			return false;
		}

		// 取出待处理状态
		const newState = nextStateResource.take();
		if (!newState) {
			return false;
		}

		// 获取当前状态资源
		let currentStateResource = resourceManager.getResource(stateResourceKey);

		// 准备转换事件
		const exitedState = currentStateResource?.get();
		const event = new StateTransitionEvent(exitedState, newState);

		// 执行 OnExit 调度（如果有上一个状态）
		if (exitedState && app) {
			this.runOnExitSchedule(world, exitedState, app);
		}

		// 如果没有当前状态资源，创建它
		if (!currentStateResource) {
			currentStateResource = State.create(newState);
			resourceManager.insertResource(stateResourceKey, currentStateResource);
		} else {
			// 更新当前状态
			currentStateResource._set(newState);
		}

		// 执行 OnEnter 调度
		if (app) {
			this.runOnEnterSchedule(world, newState, app);
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

	/**
	 * 执行 OnEnter 调度
	 * @param world - 游戏世界
	 * @param state - 进入的状态
	 * @param app - App 实例
	 */
	private runOnEnterSchedule(world: World, state: S, app: unknown): void {
		const scheduleLabel = OnEnter(state);
		this.runSystemsInSchedule(world, scheduleLabel, app);
	}

	/**
	 * 执行 OnExit 调度
	 * @param world - 渨戏世界
	 * @param state - 退出的状态
	 * @param app - App 实例
	 */
	private runOnExitSchedule(world: World, state: S, app: unknown): void {
		const scheduleLabel = OnExit(state);
		this.runSystemsInSchedule(world, scheduleLabel, app);
	}

	/**
	 * 运行指定调度中的系统
	 * @param world - 游戏世界
	 * @param scheduleLabel - 调度标签
	 * @param app - App 实例
	 */
	private runSystemsInSchedule(world: World, scheduleLabel: ScheduleLabel, app: unknown): void {
		// 更简单的方法：直接从 world 获取调度系统
		try {
			// 从 world 获取存储的 OnEnter/OnExit 系统
			const worldWithSystems = world as unknown as Record<string, unknown>;
			const systemsKey = `systems_${scheduleLabel}`;
			const systems = worldWithSystems[systemsKey] as unknown[] | undefined;

			if (systems && typeIs(systems, "table")) {
				for (const system of systems) {
					if (typeIs(system, "function")) {
						// 执行系统函数
						(system as (world: World) => void)(world);
					}
				}
			}
		} catch (err) {
			warn(`Failed to run schedule ${scheduleLabel}: ${err}`);
		}
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