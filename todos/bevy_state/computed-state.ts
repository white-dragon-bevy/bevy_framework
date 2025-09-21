/**
 * 计算状态实现
 * 基于其他状态自动派生的状态
 */

import type { World } from "@rbxts/matter";
import { State } from "./state";
import type { StateChangeHandler } from "./types";

/**
 * 计算状态配置
 */
export interface ComputedStateConfig<T extends string, S extends string> {
	/** 计算函数 */
	compute: (sourceState: S, world: World) => T | undefined;
	/** 源状态类型 */
	sourceStateType: string;
	/** 调试模式 */
	debug?: boolean;
}

/**
 * 计算状态
 * 根据源状态自动计算的派生状态
 */
export class ComputedState<T extends string, S extends string> {
	/** 当前计算值 */
	private _current?: T;

	/** 计算函数 */
	private readonly computeFn: (sourceState: S, world: World) => T | undefined;

	/** 源状态类型标识 */
	private readonly sourceStateType: string;

	/** 上次源状态值 */
	private lastSourceState?: S;

	/** 状态变化处理器 */
	private changeHandlers: Map<T, StateChangeHandler> = new Map();

	/** 调试模式 */
	private debug: boolean;

	/** 缓存的计算结果 */
	private cache: Map<S, T | undefined> = new Map();

	/** 是否启用缓存 */
	private cacheEnabled = true;

	constructor(config: ComputedStateConfig<T, S>) {
		this.computeFn = config.compute;
		this.sourceStateType = config.sourceStateType;
		this.debug = config.debug || false;
	}

	/**
	 * 获取当前计算状态
	 */
	get current(): T | undefined {
		return this._current;
	}

	/**
	 * 更新计算状态
	 */
	update(world: World): void {
		// 获取源状态
		const sourceState = this.getSourceState(world);
		if (sourceState === undefined) {
			if (this.debug) {
				print(`[ComputedState] Source state ${this.sourceStateType} not found`);
			}
			return;
		}

		// 检查源状态是否改变
		if (sourceState === this.lastSourceState) {
			return;
		}

		// 尝试从缓存获取
		let newValue: T | undefined;
		if (this.cacheEnabled && this.cache.has(sourceState)) {
			newValue = this.cache.get(sourceState);
			if (this.debug) {
				print(`[ComputedState] Using cached value for source state: ${sourceState}`);
			}
		} else {
			// 计算新值
			newValue = this.computeFn(sourceState, world);

			// 更新缓存
			if (this.cacheEnabled) {
				this.cache.set(sourceState, newValue);
			}

			if (this.debug) {
				print(`[ComputedState] Computed new value: ${newValue} for source state: ${sourceState}`);
			}
		}

		// 触发状态变化处理器
		if (newValue !== this._current) {
			const oldValue = this._current;

			// 退出旧状态
			if (oldValue !== undefined) {
				const exitHandler = this.changeHandlers.get(oldValue);
				if (exitHandler) {
					exitHandler(world);
				}
			}

			// 进入新状态
			this._current = newValue;
			if (newValue !== undefined) {
				const enterHandler = this.changeHandlers.get(newValue);
				if (enterHandler) {
					enterHandler(world);
				}
			}
		}

		this.lastSourceState = sourceState;
	}

	/**
	 * 获取源状态
	 */
	private getSourceState(world: World): S | undefined {
		const state = world.get(this.sourceStateType) as State<S> | undefined;
		return state?.current;
	}

	/**
	 * 添加状态变化处理器
	 */
	addChangeHandler(state: T, handler: StateChangeHandler): void {
		this.changeHandlers.set(state, handler);
	}

	/**
	 * 移除状态变化处理器
	 */
	removeChangeHandler(state: T): void {
		this.changeHandlers.delete(state);
	}

	/**
	 * 清除缓存
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * 启用/禁用缓存
	 */
	setCacheEnabled(enabled: boolean): void {
		this.cacheEnabled = enabled;
		if (!enabled) {
			this.clearCache();
		}
	}

	/**
	 * 强制重新计算
	 */
	forceRecompute(world: World): void {
		this.lastSourceState = undefined;
		this.update(world);
	}
}

/**
 * 多源计算状态
 * 基于多个源状态计算的派生状态
 */
export class MultiSourceComputedState<T extends string, S extends Record<string, string>> {
	/** 当前计算值 */
	private _current?: T;

	/** 计算函数 */
	private readonly computeFn: (sources: S, world: World) => T | undefined;

	/** 源状态类型映射 */
	private readonly sourceTypes: Record<keyof S, string>;

	/** 上次源状态值 */
	private lastSourceStates?: S;

	/** 调试模式 */
	private debug: boolean;

	constructor(
		sourceTypes: Record<keyof S, string>,
		compute: (sources: S, world: World) => T | undefined,
		debug = false,
	) {
		this.sourceTypes = sourceTypes;
		this.computeFn = compute;
		this.debug = debug;
	}

	/**
	 * 获取当前计算状态
	 */
	get current(): T | undefined {
		return this._current;
	}

	/**
	 * 更新计算状态
	 */
	update(world: World): void {
		// 获取所有源状态
		const sourceStates = this.getSourceStates(world);
		if (!sourceStates) {
			return;
		}

		// 检查源状态是否改变
		if (this.areStatesEqual(sourceStates, this.lastSourceStates)) {
			return;
		}

		// 计算新值
		const newValue = this.computeFn(sourceStates, world);

		if (this.debug && newValue !== this._current) {
			print(`[MultiSourceComputedState] Computed new value: ${newValue}`);
		}

		this._current = newValue;
		this.lastSourceStates = sourceStates;
	}

	/**
	 * 获取所有源状态
	 */
	private getSourceStates(world: World): S | undefined {
		const states: Record<string, string> = {};

		for (const [key, type] of pairs(this.sourceTypes)) {
			const state = world.get(type as string) as State<string> | undefined;
			if (!state) {
				if (this.debug) {
					print(`[MultiSourceComputedState] Source state ${type} not found`);
				}
				return undefined;
			}
			states[key as string] = state.current;
		}

		return states as S;
	}

	/**
	 * 比较两个状态对象是否相等
	 */
	private areStatesEqual(a?: S, b?: S): boolean {
		if (!a || !b) {
			return a === b;
		}

		for (const [key] of pairs(this.sourceTypes)) {
			if (a[key] !== b[key]) {
				return false;
			}
		}

		return true;
	}
}

/**
 * 条件计算状态
 * 基于条件函数计算的派生状态
 */
export class ConditionalComputedState<T extends string> {
	/** 当前计算值 */
	private _current?: T;

	/** 条件映射 */
	private conditions: Array<{
		condition: (world: World) => boolean;
		state: T;
		priority: number;
	}> = [];

	/** 默认状态 */
	private defaultState?: T;

	/** 调试模式 */
	private debug: boolean;

	constructor(defaultState?: T, debug = false) {
		this.defaultState = defaultState;
		this._current = defaultState;
		this.debug = debug;
	}

	/**
	 * 获取当前计算状态
	 */
	get current(): T | undefined {
		return this._current;
	}

	/**
	 * 添加条件
	 */
	addCondition(condition: (world: World) => boolean, state: T, priority = 0): void {
		this.conditions.push({ condition, state, priority });
		// 按优先级排序（高优先级在前）
		this.conditions.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * 移除条件
	 */
	removeCondition(state: T): void {
		this.conditions = this.conditions.filter((c) => c.state !== state);
	}

	/**
	 * 更新计算状态
	 */
	update(world: World): void {
		let newValue: T | undefined = this.defaultState;

		// 检查所有条件（按优先级顺序）
		for (const { condition, state } of this.conditions) {
			if (condition(world)) {
				newValue = state;
				break;
			}
		}

		if (newValue !== this._current) {
			if (this.debug) {
				print(`[ConditionalComputedState] State changed: ${this._current} -> ${newValue}`);
			}
			this._current = newValue;
		}
	}

	/**
	 * 清除所有条件
	 */
	clearConditions(): void {
		this.conditions = [];
		this._current = this.defaultState;
	}
}

/**
 * 创建简单的计算状态
 */
export function createComputedState<T extends string, S extends string>(
	sourceType: string,
	compute: (source: S, world: World) => T | undefined,
): ComputedState<T, S> {
	return new ComputedState({
		sourceStateType: sourceType,
		compute,
	});
}

/**
 * 创建映射计算状态
 */
export function createMappedState<T extends string, S extends string>(
	sourceType: string,
	mapping: Map<S, T>,
	defaultValue?: T,
): ComputedState<T, S> {
	return new ComputedState({
		sourceStateType: sourceType,
		compute: (source) => mapping.get(source) || defaultValue,
	});
}

/**
 * 创建过滤计算状态
 */
export function createFilteredState<T extends string>(
	sourceType: string,
	filter: (source: T, world: World) => boolean,
): ComputedState<T, T> {
	return new ComputedState({
		sourceStateType: sourceType,
		compute: (source, world) => (filter(source, world) ? source : undefined),
	});
}