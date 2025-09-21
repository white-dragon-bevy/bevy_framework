/**
 * 子状态实现
 * 依赖于父状态的嵌套状态
 */

import type { World } from "@rbxts/matter";
import { State } from "./state";
import type { StateChangeHandler } from "./types";

/**
 * 子状态配置
 */
export interface SubStateConfig<T extends string, P extends string> {
	/** 父状态类型 */
	parentStateType: string;
	/** 有效的父状态值 */
	validParentStates: P[];
	/** 默认子状态 */
	defaultState?: T;
	/** 调试模式 */
	debug?: boolean;
}

/**
 * 子状态
 * 依赖于父状态存在的嵌套状态
 */
export class SubState<T extends string, P extends string> {
	/** 当前子状态 */
	private _current?: T;

	/** 父状态类型 */
	private readonly parentStateType: string;

	/** 有效的父状态值 */
	private readonly validParentStates: Set<P>;

	/** 默认子状态 */
	private readonly defaultState?: T;

	/** 是否激活 */
	private _isActive = false;

	/** 状态处理器 */
	private stateHandlers: Map<T, {
		onEnter?: StateChangeHandler;
		onExit?: StateChangeHandler;
		onUpdate?: StateChangeHandler;
	}> = new Map();

	/** 调试模式 */
	private debug: boolean;

	/** 状态历史 */
	private history: T[] = [];

	/** 最大历史记录数 */
	private readonly maxHistorySize = 20;

	constructor(config: SubStateConfig<T, P>) {
		this.parentStateType = config.parentStateType;
		this.validParentStates = new Set(config.validParentStates);
		this.defaultState = config.defaultState;
		this.debug = config.debug || false;
	}

	/**
	 * 获取当前子状态
	 */
	get current(): T | undefined {
		return this._current;
	}

	/**
	 * 是否激活
	 */
	get isActive(): boolean {
		return this._isActive;
	}

	/**
	 * 更新子状态
	 */
	update(world: World): void {
		const parentState = this.getParentState(world);

		// 检查父状态是否有效
		const shouldBeActive = parentState !== undefined && this.validParentStates.has(parentState);

		if (shouldBeActive && !this._isActive) {
			// 激活子状态
			this.activate(world);
		} else if (!shouldBeActive && this._isActive) {
			// 停用子状态
			this.deactivate(world);
		} else if (this._isActive && this._current !== undefined) {
			// 更新当前子状态
			const handler = this.stateHandlers.get(this._current);
			if (handler?.onUpdate) {
				handler.onUpdate(world);
			}
		}
	}

	/**
	 * 激活子状态
	 */
	private activate(world: World): void {
		this._isActive = true;
		const initialState = this.defaultState;

		if (initialState !== undefined) {
			this.enterState(world, initialState);
		}

		if (this.debug) {
			print(`[SubState] Activated with state: ${initialState}`);
		}
	}

	/**
	 * 停用子状态
	 */
	private deactivate(world: World): void {
		if (this._current !== undefined) {
			this.exitState(world, this._current);
		}

		this._isActive = false;
		this._current = undefined;

		if (this.debug) {
			print("[SubState] Deactivated");
		}
	}

	/**
	 * 转换到新状态
	 */
	transition(world: World, newState: T): boolean {
		if (!this._isActive) {
			if (this.debug) {
				warn("[SubState] Cannot transition - sub state is not active");
			}
			return false;
		}

		if (this._current === newState) {
			return true;
		}

		// 退出当前状态
		if (this._current !== undefined) {
			this.exitState(world, this._current);
		}

		// 进入新状态
		this.enterState(world, newState);

		return true;
	}

	/**
	 * 进入状态
	 */
	private enterState(world: World, state: T): void {
		this._current = state;
		this.history.push(state);

		if (this.history.size() > this.maxHistorySize) {
			this.history.shift();
		}

		const handler = this.stateHandlers.get(state);
		if (handler?.onEnter) {
			handler.onEnter(world);
		}

		if (this.debug) {
			print(`[SubState] Entered state: ${state}`);
		}
	}

	/**
	 * 退出状态
	 */
	private exitState(world: World, state: T): void {
		const handler = this.stateHandlers.get(state);
		if (handler?.onExit) {
			handler.onExit(world);
		}

		if (this.debug) {
			print(`[SubState] Exited state: ${state}`);
		}
	}

	/**
	 * 获取父状态
	 */
	private getParentState(world: World): P | undefined {
		const parentState = world.get(this.parentStateType) as State<P> | undefined;
		return parentState?.current;
	}

	/**
	 * 添加状态处理器
	 */
	addStateHandler(
		state: T,
		handlers: {
			onEnter?: StateChangeHandler;
			onExit?: StateChangeHandler;
			onUpdate?: StateChangeHandler;
		},
	): void {
		this.stateHandlers.set(state, handlers);
	}

	/**
	 * 移除状态处理器
	 */
	removeStateHandler(state: T): void {
		this.stateHandlers.delete(state);
	}

	/**
	 * 获取状态历史
	 */
	getHistory(): ReadonlyArray<T> {
		return this.history;
	}

	/**
	 * 清除历史
	 */
	clearHistory(): void {
		this.history = this._current !== undefined ? [this._current] : [];
	}

	/**
	 * 检查是否可以转换到指定状态
	 */
	canTransition(state: T): boolean {
		return this._isActive && this.stateHandlers.has(state);
	}
}

/**
 * 嵌套状态机
 * 管理多层嵌套的状态层次结构
 */
export class NestedStateMachine<T extends Record<string, string>> {
	/** 状态层级 */
	private layers: Map<keyof T, {
		state: State<T[keyof T]>;
		parent?: keyof T;
		children: Set<keyof T>;
	}> = new Map();

	/** 根状态键 */
	private rootKey?: keyof T;

	/** 调试模式 */
	private debug: boolean;

	constructor(debug = false) {
		this.debug = debug;
	}

	/**
	 * 添加状态层
	 */
	addLayer(
		key: keyof T,
		initialState: T[keyof T],
		parent?: keyof T,
	): void {
		const state = new State(initialState);
		const layer = {
			state,
			parent,
			children: new Set<keyof T>(),
		};

		this.layers.set(key, layer);

		if (parent) {
			const parentLayer = this.layers.get(parent);
			if (parentLayer) {
				parentLayer.children.add(key);
			}
		} else {
			this.rootKey = key;
		}

		if (this.debug) {
			print(`[NestedStateMachine] Added layer: ${key as string}`);
		}
	}

	/**
	 * 转换状态
	 */
	transition(
		world: World,
		layerKey: keyof T,
		newState: T[keyof T],
		cascadeToChildren = true,
	): boolean {
		const layer = this.layers.get(layerKey);
		if (!layer) {
			if (this.debug) {
				warn(`[NestedStateMachine] Layer not found: ${layerKey as string}`);
			}
			return false;
		}

		// 执行状态转换
		layer.state._transition(newState, world);

		if (this.debug) {
			print(`[NestedStateMachine] Transitioned ${layerKey as string} to ${newState}`);
		}

		// 级联到子层
		if (cascadeToChildren) {
			for (const childKey of layer.children) {
				this.resetChildLayer(world, childKey);
			}
		}

		return true;
	}

	/**
	 * 重置子层到默认状态
	 */
	private resetChildLayer(world: World, layerKey: keyof T): void {
		const layer = this.layers.get(layerKey);
		if (!layer) {
			return;
		}

		// 这里可以实现重置逻辑
		// 例如：将子层重置到其初始状态

		// 递归重置子层的子层
		for (const childKey of layer.children) {
			this.resetChildLayer(world, childKey);
		}
	}

	/**
	 * 获取层状态
	 */
	getLayerState(layerKey: keyof T): T[keyof T] | undefined {
		const layer = this.layers.get(layerKey);
		return layer?.state.current;
	}

	/**
	 * 获取完整状态路径
	 */
	getStatePath(layerKey: keyof T): Array<T[keyof T]> {
		const path: Array<T[keyof T]> = [];
		let currentKey: keyof T | undefined = layerKey;

		while (currentKey) {
			const layer = this.layers.get(currentKey);
			if (!layer) break;

			path.unshift(layer.state.current);
			currentKey = layer.parent;
		}

		return path;
	}

	/**
	 * 检查是否处于特定状态路径
	 */
	isInStatePath(path: Partial<T>): boolean {
		for (const [layerKey, expectedState] of pairs(path)) {
			const actualState = this.getLayerState(layerKey);
			if (actualState !== expectedState) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 获取所有层的当前状态
	 */
	getCurrentStates(): Partial<T> {
		const states: Partial<T> = {};
		for (const [key, layer] of this.layers) {
			states[key] = layer.state.current;
		}
		return states;
	}
}

/**
 * 创建简单的子状态
 */
export function createSubState<T extends string, P extends string>(
	parentType: string,
	validParents: P[],
	defaultState?: T,
): SubState<T, P> {
	return new SubState({
		parentStateType: parentType,
		validParentStates: validParents,
		defaultState,
	});
}

/**
 * 创建自动子状态
 * 根据父状态自动选择子状态
 */
export function createAutoSubState<T extends string, P extends string>(
	parentType: string,
	stateMapping: Map<P, T>,
): SubState<T, P> {
	const validParents = [...stateMapping.keys()];
	const subState = new SubState<T, P>({
		parentStateType: parentType,
		validParentStates: validParents,
	});

	// 添加自动选择逻辑
	for (const [parent, child] of stateMapping) {
		// 可以在这里添加进入父状态时自动设置子状态的逻辑
	}

	return subState;
}