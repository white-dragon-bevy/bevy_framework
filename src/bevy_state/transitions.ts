/**
 * transitions.ts - 状态转换系统
 * 对应 Rust bevy_state/src/state/transitions.rs
 */

import { World } from "@rbxts/matter";
import type { ScheduleLabel } from "../bevy_ecs/schedule/types";
import { Message , MessageWriter , MessageReader,  MessageConstructor , MessageRegistry } from "../bevy_ecs/message";
import { ResourceManager } from "../bevy_ecs/resource";
import { States } from "./states";
import { State, NextState, StateConstructor } from "./resources";
import { getGenericTypeDescriptor, getTypeDescriptor, TypeDescriptor } from "../bevy_core";
import { cleanupOnStateExit, cleanupOnStateEnter } from "./state-scoped";
import { Modding } from "@flamework/core";

/**
 * 状态转换调度标签
 */
export const StateTransition: ScheduleLabel = "StateTransition";

/**
 * 状态转换事件
 * 对应 Rust StateTransitionEvent<S>
 */
export class StateTransitionMessage<S extends States> implements Message {
	public readonly timestamp?: number;

	/**
	 * 构造函数
	 * @param exited - 退出的状态（可选）
	 * @param entered - 进入的状态（可选）
	 */
	private constructor(
		public readonly exited?: S,
		public readonly entered?: S,
	) {}

	/**
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @param exited - 退出的状态（可选）
	 * @param entered - 进入的状态（可选）
	 * @returns - 状态转换事件
	 */
	public static create<S extends States>(
		exited?: S, entered?: S,
		id?: Modding.Generic<S, "id">,
		text?: Modding.Generic<S, "text">,
	): StateTransitionMessage<S> {
		const typeDescriptor = getTypeDescriptor(id,text)
		assert(typeDescriptor, "Failed to get TypeDescriptor for StateTransitionMessage: type descriptor is required for state transition message creation")
		return new StateTransitionMessage(exited, entered);
	}

	/**
	 * 克隆事件
	 * @returns 克隆的事件实例
	 */
	public clone(): StateTransitionMessage<S> {
		return new StateTransitionMessage(
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
	private typeDescriptor: TypeDescriptor;
	private eventWriter?: MessageWriter<StateTransitionMessage<S>>;
	private lastTransitionEvent?: StateTransitionMessage<S>;
	private messageRegistry: MessageRegistry;

	/**
	 * 构造函数
	 * @param stateType - 状态类型构造函数
	 * @param messageRegistry - 事件管理器（可选）
	 */
	private constructor(typeDescriptor:TypeDescriptor, messageRegistry: MessageRegistry) {
		this.typeDescriptor = typeDescriptor;
		this.messageRegistry = messageRegistry;
		this.eventWriter = this.messageRegistry.createWriter<StateTransitionMessage<S>>();
	}

	/**
	 * 创建状态转换管理器
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @param typeDescriptor - 类型描述
	 * @param messageRegistry - 事件管理器
	 * @returns - 状态转换管理器
	 */
	public static create<S extends States>(typeDescriptor:TypeDescriptor, messageRegistry: MessageRegistry): StateTransitionManager<S> {
		return new StateTransitionManager(typeDescriptor, messageRegistry);
	}

	/**
	 * 处理状态转换
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 * @param app - App 实例（可选）
	 * @returns 是否发生了转换
	 */
	public processTransition(world: World, resourceManager: ResourceManager, app?: unknown): boolean {
		// 获取 NextState 资源
		const genericTypeDescriptor = getGenericTypeDescriptor<NextState<S>>(this.typeDescriptor)
		const nextStateResource = resourceManager.getResourceByTypeDescriptor<NextState<S>>(genericTypeDescriptor);
		if (!nextStateResource || !nextStateResource.isPending()) {
			return false;
		}

		// 取出待处理状态
		const newState = nextStateResource.take();
		if (!newState) {
			return false;
		}

		// 获取当前状态资源
		let currentStateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(this.typeDescriptor);
		const exitedState = currentStateResource && typeIs(currentStateResource.get, "function") ? currentStateResource.get() : undefined;

		// 检查是否为身份转换（相同状态转换）
		if (exitedState && exitedState.equals(newState)) {
			// 身份转换：跳过 OnEnter/OnExit，但仍要发送事件
			const event = StateTransitionMessage.create(exitedState, newState);
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

		// 正确的执行顺序：OnExit → OnTransition → 更新状态 → OnEnter → 事件

		// 1. 执行 OnExit 调度（如果有上一个状态）
		if (exitedState && app) {
			this.runOnExitSchedule(world, exitedState, app);
		}

		// 1.5. 清理标记为在状态退出时清理的实体
		if (exitedState) {
			cleanupOnStateExit(world, exitedState);
		}

		// 2. 执行 OnTransition 调度（如果有上一个状态且有 app）
		if (exitedState && app) {
			this.runOnTransitionSchedule(world, exitedState, newState, app);
		}

		// 3. 更新状态资源
		let currentStateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(this.typeDescriptor);
		if (!currentStateResource) {
			currentStateResource = State.create(newState);
			resourceManager.insertResourceByTypeDescriptor(currentStateResource, this.typeDescriptor);
		} else if (typeIs(currentStateResource.setInternal, "function")) {
			currentStateResource.setInternal(newState);
		} else {
			// 如果资源不是 State 实例，创建新的
			currentStateResource = State.create(newState);
			resourceManager.insertResourceByTypeDescriptor(currentStateResource, this.typeDescriptor);
		}

		// 4. 执行 OnEnter 调度
		if (app) {
			this.runOnEnterSchedule(world, newState, app);
		}

		// 4.5. 清理标记为在状态进入时清理的实体
		cleanupOnStateEnter(world, newState);

		// 5. 最后发送转换事件
		const event = StateTransitionMessage.create(exitedState, newState);
		this.sendTransitionEvent(event);
	}

	/**
	 * 发送状态转换事件
	 * @param event - 转换事件
	 */
	private sendTransitionEvent(event: StateTransitionMessage<S>): void {
		if (this.eventWriter) {
			this.eventWriter.write(event);
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
	public getLastTransition(): StateTransitionMessage<S> | undefined {
		return this.lastTransitionEvent?.clone();
	}

	/**
	 * 设置事件管理器
	 * @param MessageRegistry - 事件管理器
	 */
	public setMessageRegistry(MessageRegistry: MessageRegistry): void {
		this.messageRegistry = MessageRegistry;
		this.eventWriter = MessageRegistry.createWriter<StateTransitionMessage<S>>();
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
			// 不要静默吞噬错误，应该重新抛出以便调试
			error(`Failed to run schedule ${scheduleLabel}: ${err}`);
		}
	}
}

/**
 * 获取状态转换事件读取器
 * @param MessageRegistry - 事件管理器
 * @returns 事件读取器
 */
export function getStateTransitionReader<S extends States>(
	MessageRegistry: MessageRegistry,
): MessageReader<StateTransitionMessage<S>> {
	return MessageRegistry.createReader<StateTransitionMessage<S>>();
}


/**
 * 获取上一次的状态转换
 * 
 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro
 * 
 * 
 * @param world - 游戏世界
 * @param stateType - 状态类型
 * @returns 最后一次转换或 undefined
 */
export function lastTransition<S extends States>(
	resources:ResourceManager,
	id?: Modding.Generic<S, "id">,
	text?: Modding.Generic<S, "text">,
): StateTransitionMessage<S> | undefined {
	// 尝试从世界中获取状态转换管理器
	try {
		// 检查 resources 是否有 getResourceByTypeDescriptor 方法
		if (!resources || !typeIs(resources.getResourceByTypeDescriptor, "function")) {
			return undefined;
		}

		// from resources
		const stateTransitionManagerTypeDescriptor = getGenericTypeDescriptor<StateTransitionManager<S>>(undefined,id,text)
		const manager = resources.getResourceByTypeDescriptor(stateTransitionManagerTypeDescriptor) as StateTransitionManager<S> | undefined
		if (!manager || !typeIs(manager.getLastTransition, "function")) {
			return undefined;
		}
		return manager.getLastTransition();
	} catch (err) {
		// 记录错误但返回 undefined，因为这不是致命错误
		warn(`Failed to get last transition for state type: ${err}`);
		return undefined;
	}
}
