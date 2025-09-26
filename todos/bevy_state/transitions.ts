/**
 * transitions.ts - 状态转换系统
 * 对应 Rust bevy_state/src/state/transitions.rs
 */

import { World } from "@rbxts/matter";
import type { ScheduleLabel } from "../bevy_ecs/schedule/types";
import { Event, EventWriter, EventReader, EventManager, EventConstructor } from "../bevy_ecs/events";
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
	 * 克隆事件
	 * @returns 克隆的事件实例
	 */
	public clone(): StateTransitionEvent<S> {
		return new StateTransitionEvent(
			this.exited?.clone() as S,
			this.entered?.clone() as S,
		);
	}

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
	private eventWriter?: EventWriter<StateTransitionEvent<S>>;
	private lastTransitionEvent?: StateTransitionEvent<S>;
	private eventManager?: EventManager;

	/**
	 * 构造函数
	 * @param stateType - 状态类型构造函数
	 * @param eventManager - 事件管理器（可选）
	 */
	public constructor(stateType: StateConstructor<S>, eventManager?: EventManager) {
		this.stateType = stateType;
		this.eventManager = eventManager;
		if (eventManager) {
			this.eventWriter = eventManager.createWriter(StateTransitionEvent as EventConstructor<StateTransitionEvent<S>>);
		}
	}

	/**
	 * 生成统一的资源键名
	 * @param prefix - 资源前缀
	 * @param stateType - 状态类型
	 * @returns 资源键名
	 */
	private generateResourceKey(prefix: string, stateType: StateConstructor<S>): string {
		const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
		return `${prefix}<${stateTypeName}>`;
	}

	/**
	 * 处理状态转换
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 * @param app - App 实例（可选）
	 * @returns 是否发生了转换
	 */
	public processTransition(world: World, resourceManager: ResourceManager, app?: unknown): boolean {
		// Use unified resource key generation
		const nextStateResourceKey = this.generateResourceKey("NextState", this.stateType) as ResourceConstructor<
			NextState<S>
		>;
		const stateResourceKey = this.generateResourceKey("State", this.stateType) as ResourceConstructor<State<S>>;

		// 获取 NextState 资源
		const nextStateResource = resourceManager.getResource<nextStateResourceKey>();
		if (!nextStateResource || !nextStateResource.hasPending()) {
			return false;
		}

		// 取出待处理状态
		const newState = nextStateResource.take();
		if (!newState) {
			return false;
		}

		// 获取当前状态资源
		let currentStateResource = resourceManager.getResource<stateResourceKey>();
		const exitedState = currentStateResource?.get();

		// 检查是否为身份转换（相同状态转换）
		if (exitedState && exitedState.equals(newState)) {
			// 身份转换：跳过 OnEnter/OnExit，但仍要发送事件
			const event = new StateTransitionEvent(exitedState, newState);
			this.sendTransitionEvent(event);
			return true;
		}

		// 非身份转换：执行完整的转换流程
		this.processRegularTransition(world, resourceManager, exitedState, newState, app);

		return true;
	}

	/**
	 * 处理常规状态转换（非身份转换）
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 * @param exitedState - 退出的状态（可选）
	 * @param newState - 进入的新状态
	 * @param app - App 实例（可选）
	 */
	private processRegularTransition(
		world: World,
		resourceManager: ResourceManager,
		exitedState: S | undefined,
		newState: S,
		app?: unknown,
	): void {
		const stateResourceKey = this.generateResourceKey("State", this.stateType) as ResourceConstructor<State<S>>;

		// 正确的执行顺序：OnExit → OnTransition → 更新状态 → OnEnter → 事件

		// 1. 执行 OnExit 调度（如果有上一个状态）
		if (exitedState && app) {
			this.runOnExitSchedule(world, exitedState, app);
		}

		// 2. 执行 OnTransition 调度（如果有上一个状态且有 app）
		if (exitedState && app) {
			this.runOnTransitionSchedule(world, exitedState, newState, app);
		}

		// 3. 更新状态资源
		let currentStateResource = resourceManager.getResource<stateResourceKey>();
		if (!currentStateResource) {
			currentStateResource = State.create(newState);
			resourceManager.insertResource(stateResourceKey, currentStateResource);
		} else {
			currentStateResource._set(newState);
		}

		// 4. 执行 OnEnter 调度
		if (app) {
			this.runOnEnterSchedule(world, newState, app);
		}

		// 5. 最后发送转换事件
		const event = new StateTransitionEvent(exitedState, newState);
		this.sendTransitionEvent(event);
	}

	/**
	 * 发送状态转换事件
	 * @param event - 转换事件
	 */
	private sendTransitionEvent(event: StateTransitionEvent<S>): void {
		if (this.eventWriter) {
			this.eventWriter.send(event);
			this.lastTransitionEvent = event;
		} else {
			// 如果没有事件写入器，仍然记录最后的转换
			this.lastTransitionEvent = event;
		}
	}

	/**
	 * 获取最后一次转换事件
	 * @returns 最后一次转换事件或 undefined
	 */
	public getLastTransition(): StateTransitionEvent<S> | undefined {
		return this.lastTransitionEvent?.clone();
	}

	/**
	 * 设置事件管理器
	 * @param eventManager - 事件管理器
	 */
	public setEventManager(eventManager: EventManager): void {
		this.eventManager = eventManager;
		this.eventWriter = eventManager.createWriter(StateTransitionEvent as EventConstructor<StateTransitionEvent<S>>);
	}

	/**
	 * 执行 OnTransition 调度
	 * @param world - 游戏世界
	 * @param from - 起始状态
	 * @param to - 目标状态
	 * @param app - App 实例
	 */
	private runOnTransitionSchedule(world: World, from: S, to: S, app: unknown): void {
		const scheduleLabel = OnTransition(from, to);
		this.runSystemsInSchedule(world, scheduleLabel, app);
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
	 * @param world - 游戏世界
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
 * 获取状态转换事件读取器
 * @param eventManager - 事件管理器
 * @returns 事件读取器
 */
export function getStateTransitionReader<S extends States>(
	eventManager: EventManager,
): EventReader<StateTransitionEvent<S>> {
	return eventManager.createReader(StateTransitionEvent as EventConstructor<StateTransitionEvent<S>>);
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
	// 尝试从世界中获取状态转换管理器
	try {
		const worldWithManagers = world as unknown as Record<string, unknown>;
		const managerKey = `stateTransitionManager_${tostring(stateType)}`;
		const manager = worldWithManagers[managerKey] as StateTransitionManager<S> | undefined;
		return manager?.getLastTransition();
	} catch {
		return undefined;
	}
}
