/**
 * 状态管理器实现
 * 负责状态转换和调度管理
 */

import type { World } from "@rbxts/matter";
import { State, NextState } from "./state";
import { StateTransition, StateTransitionEvent } from "./transitions";
import { StateEnterEvent, StateExitEvent } from "./events";
import type {
	StateDefinition,
	TransitionCondition,
	StateObserver,
	StateStatistics,
	AsyncTransitionResult,
} from "./types";

/**
 * 状态管理器
 * 管理状态定义、转换和调度
 */
export class StateManager<T extends string> {
	/** 状态定义映射 */
	private states: Map<T, StateDefinition<T>> = new Map();

	/** 状态观察者列表 */
	private observers: StateObserver<T>[] = [];

	/** 调试模式 */
	private debug = false;

	/** 统计信息 */
	private statistics: StateStatistics<T> = {
		totalTransitions: 0,
		stateDurations: new Map(),
		transitionFrequency: new Map(),
		lastUpdate: os.clock(),
	};

	/** 转换队列 */
	private transitionQueue: T[] = [];

	/** 是否正在处理转换 */
	private processingTransition = false;

	constructor(debug = false) {
		this.debug = debug;
	}

	/**
	 * 添加状态定义
	 */
	addState(state: T, definition: StateDefinition<T>): void {
		this.states.set(state, definition);
		this.statistics.stateDurations.set(state, 0);

		if (this.debug) {
			print(`[StateManager] Added state: ${state}`);
		}
	}

	/**
	 * 移除状态定义
	 */
	removeState(state: T): void {
		this.states.delete(state);
		if (this.debug) {
			print(`[StateManager] Removed state: ${state}`);
		}
	}

	/**
	 * 设置状态
	 */
	setState(world: World, nextState: NextState<T>, targetState: T): void {
		nextState.set(targetState);
		if (this.debug) {
			print(`[StateManager] Queued transition to: ${targetState}`);
		}
	}

	/**
	 * 处理状态更新
	 */
	update(world: World, deltaTime: number): void {
		const stateResource = world.get("State") as State<T> | undefined;
		const nextStateResource = world.get("NextState") as NextState<T> | undefined;

		if (!stateResource || !nextStateResource) {
			return;
		}

		// 处理排队的状态转换
		const pendingState = nextStateResource.consume();
		if (pendingState !== undefined) {
			this.processTransition(world, stateResource, pendingState);
		}

		// 执行当前状态的更新逻辑
		const currentState = stateResource.current;
		const definition = this.states.get(currentState);
		if (definition?.onUpdate) {
			definition.onUpdate(world);
		}

		// 检查自动转换条件
		this.checkAutoTransitions(world, stateResource, nextStateResource);

		// 更新统计信息
		this.updateStatistics(stateResource, deltaTime);
	}

	/**
	 * 处理状态转换
	 */
	private processTransition(world: World, state: State<T>, targetState: T): void {
		if (this.processingTransition) {
			// 将转换加入队列
			this.transitionQueue.push(targetState);
			return;
		}

		this.processingTransition = true;
		const currentState = state.current;

		// 检查是否为同一状态
		if (currentState === targetState && !this.shouldAllowIdentityTransition(currentState)) {
			this.processingTransition = false;
			return;
		}

		// 退出当前状态
		this.exitState(world, currentState);

		// 触发转换事件
		this.fireTransitionEvent(world, currentState, targetState);

		// 执行状态转换
		state._transition(targetState, world);

		// 进入新状态
		this.enterState(world, targetState);

		// 更新统计
		this.statistics.totalTransitions++;
		const transitionKey = `${currentState}->${targetState}`;
		const frequency = this.statistics.transitionFrequency.get(transitionKey) || 0;
		this.statistics.transitionFrequency.set(transitionKey, frequency + 1);

		// 通知观察者
		this.notifyObservers(currentState, targetState);

		this.processingTransition = false;

		// 处理队列中的转换
		if (this.transitionQueue.size() > 0) {
			const nextTransition = this.transitionQueue.shift();
			if (nextTransition) {
				this.processTransition(world, state, nextTransition);
			}
		}
	}

	/**
	 * 退出状态
	 */
	private exitState(world: World, state: T): void {
		const definition = this.states.get(state);
		if (definition?.onExit) {
			if (this.debug) {
				print(`[StateManager] Exiting state: ${state}`);
			}
			definition.onExit(world);
		}

		// 触发退出事件
		const event = new StateExitEvent(state);
		world.spawn(event);
	}

	/**
	 * 进入状态
	 */
	private enterState(world: World, state: T): void {
		const definition = this.states.get(state);
		if (definition?.onEnter) {
			if (this.debug) {
				print(`[StateManager] Entering state: ${state}`);
			}
			definition.onEnter(world);
		}

		// 触发进入事件
		const event = new StateEnterEvent(state);
		world.spawn(event);
	}

	/**
	 * 触发转换事件
	 */
	private fireTransitionEvent(world: World, from: T, to: T): void {
		const event = new StateTransitionEvent(from, to);
		world.spawn(event);

		if (this.debug) {
			print(`[StateManager] Transition: ${from} -> ${to}`);
		}
	}

	/**
	 * 检查自动转换条件
	 */
	private checkAutoTransitions(world: World, state: State<T>, nextState: NextState<T>): void {
		const currentState = state.current;
		const definition = this.states.get(currentState);

		if (!definition?.transitions) {
			return;
		}

		for (const [targetState, condition] of definition.transitions) {
			if (condition(world, currentState)) {
				nextState.set(targetState);
				if (this.debug) {
					print(`[StateManager] Auto-transition triggered: ${currentState} -> ${targetState}`);
				}
				break;
			}
		}
	}

	/**
	 * 是否允许同状态转换
	 */
	private shouldAllowIdentityTransition(state: T): boolean {
		const definition = this.states.get(state);
		// 如果状态有onEnter或onExit处理器，允许同状态转换
		return !!(definition?.onEnter || definition?.onExit);
	}

	/**
	 * 更新统计信息
	 */
	private updateStatistics(state: State<T>, deltaTime: number): void {
		const currentState = state.current;
		const duration = this.statistics.stateDurations.get(currentState) || 0;
		this.statistics.stateDurations.set(currentState, duration + deltaTime);
		this.statistics.lastUpdate = os.clock();
	}

	/**
	 * 添加观察者
	 */
	addObserver(observer: StateObserver<T>): void {
		this.observers.push(observer);
	}

	/**
	 * 移除观察者
	 */
	removeObserver(observerId: string): void {
		this.observers = this.observers.filter((obs) => obs.id !== observerId);
	}

	/**
	 * 通知观察者
	 */
	private notifyObservers(from: T, to: T): void {
		for (const observer of this.observers) {
			if (observer.onTransition) {
				observer.onTransition(from, to);
			}
			if (observer.onExit && from !== to) {
				observer.onExit(from);
			}
			if (observer.onEnter && from !== to) {
				observer.onEnter(to);
			}
		}
	}

	/**
	 * 获取统计信息
	 */
	getStatistics(): Readonly<StateStatistics<T>> {
		return this.statistics;
	}

	/**
	 * 重置统计信息
	 */
	resetStatistics(): void {
		this.statistics = {
			totalTransitions: 0,
			stateDurations: new Map(),
			transitionFrequency: new Map(),
			lastUpdate: os.clock(),
		};

		// 重新初始化状态持续时间
		for (const [state] of this.states) {
			this.statistics.stateDurations.set(state, 0);
		}
	}

	/**
	 * 异步状态转换
	 */
	async transitionAsync(
		world: World,
		state: State<T>,
		targetState: T,
	): Promise<AsyncTransitionResult<T>> {
		return new Promise((resolve) => {
			try {
				// 验证目标状态是否存在
				if (!this.states.has(targetState)) {
					resolve({
						success: false,
						error: `State ${targetState} not found`,
					});
					return;
				}

				// 执行转换
				this.processTransition(world, state, targetState);

				resolve({
					success: true,
					newState: targetState,
				});
			} catch (error) {
				resolve({
					success: false,
					error: tostring(error),
				});
			}
		});
	}

	/**
	 * 获取所有已注册的状态
	 */
	getRegisteredStates(): T[] {
		const result: T[] = [];
		for (const [state] of this.states) {
			result.push(state);
		}
		return result;
	}

	/**
	 * 检查状态是否已注册
	 */
	hasState(state: T): boolean {
		return this.states.has(state);
	}

	/**
	 * 批量添加状态
	 */
	addStates(states: Map<T, StateDefinition<T>>): void {
		for (const [state, definition] of states) {
			this.addState(state, definition);
		}
	}
}