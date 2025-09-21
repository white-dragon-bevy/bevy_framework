/**
 * State 资源实现
 * 管理当前状态和状态转换
 */

import type { World } from "@rbxts/matter";
import type { StateHistoryEntry, StateValidator } from "./types";

/**
 * 状态资源类
 * 管理应用程序的当前状态
 */
export class State<T extends string> {
	/** 当前状态 */
	private _current: T;

	/** 上一个状态 */
	private _previous?: T;

	/** 是否正在转换 */
	private _isTransitioning = false;

	/** 状态历史记录 */
	private _history: StateHistoryEntry<T>[] = [];

	/** 最大历史记录数 */
	private readonly maxHistorySize = 100;

	/** 状态验证器 */
	private validators: Map<T, StateValidator<T>> = new Map();

	/** 状态进入时间戳 */
	private enteredAt: number;

	constructor(initial: T) {
		this._current = initial;
		this.enteredAt = os.clock();
		this._history.push({
			state: initial,
			enteredAt: this.enteredAt,
		});
	}

	/**
	 * 获取当前状态
	 */
	get current(): T {
		return this._current;
	}

	/**
	 * 获取上一个状态
	 */
	get previous(): T | undefined {
		return this._previous;
	}

	/**
	 * 是否正在转换
	 */
	get isTransitioning(): boolean {
		return this._isTransitioning;
	}

	/**
	 * 获取状态历史
	 */
	get history(): ReadonlyArray<StateHistoryEntry<T>> {
		return this._history;
	}

	/**
	 * 检查是否处于指定状态
	 */
	isIn(state: T): boolean {
		return this._current === state;
	}

	/**
	 * 检查是否刚刚进入指定状态
	 */
	justEntered(state: T): boolean {
		return this._current === state && this._previous !== state;
	}

	/**
	 * 检查是否刚刚退出指定状态
	 */
	justExited(state: T): boolean {
		return this._previous === state && this._current !== state;
	}

	/**
	 * 内部转换方法
	 */
	_transition(nextState: T, world: World): void {
		if (this._isTransitioning) {
			warn(`[State] Already transitioning, ignoring transition to ${nextState}`);
			return;
		}

		// 验证新状态
		const validator = this.validators.get(nextState);
		if (validator && !validator(nextState, world)) {
			warn(`[State] Validation failed for state ${nextState}`);
			return;
		}

		this._isTransitioning = true;

		// 更新历史记录
		const now = os.clock();
		if (this._history.size() > 0) {
			const lastEntry = this._history[this._history.size() - 1];
			lastEntry.exitedAt = now;
		}

		// 记录状态变化
		this._previous = this._current;
		this._current = nextState;
		this.enteredAt = now;

		// 添加新的历史记录
		this._history.push({
			state: nextState,
			enteredAt: now,
		});

		// 限制历史记录大小
		if (this._history.size() > this.maxHistorySize) {
			this._history = this._history.slice(1) as StateHistoryEntry<T>[];
		}

		this._isTransitioning = false;
	}

	/**
	 * 添加状态验证器
	 */
	addValidator(state: T, validator: StateValidator<T>): void {
		this.validators.set(state, validator);
	}

	/**
	 * 移除状态验证器
	 */
	removeValidator(state: T): void {
		this.validators.delete(state);
	}

	/**
	 * 获取当前状态的持续时间
	 */
	getCurrentStateDuration(): number {
		return os.clock() - this.enteredAt;
	}

	/**
	 * 获取指定状态的总持续时间
	 */
	getStateDuration(state: T): number {
		let totalDuration = 0;
		for (const entry of this._history) {
			if (entry.state === state) {
				const duration = entry.exitedAt ? entry.exitedAt - entry.enteredAt : os.clock() - entry.enteredAt;
				totalDuration += duration;
			}
		}
		return totalDuration;
	}

	/**
	 * 清除历史记录
	 */
	clearHistory(): void {
		const current = this._history[this._history.size() - 1];
		this._history = [current];
	}

	/**
	 * 回滚到上一个状态
	 */
	rollback(world: World): boolean {
		if (this._previous === undefined) {
			return false;
		}
		this._transition(this._previous, world);
		return true;
	}
}

/**
 * NextState 资源
 * 用于排队状态转换
 */
export class NextState<T extends string> {
	private _pending?: T;
	private _force = false;

	/**
	 * 设置下一个状态
	 */
	set(state: T, force = false): void {
		this._pending = state;
		this._force = force;
	}

	/**
	 * 清除排队的状态
	 */
	clear(): void {
		this._pending = undefined;
		this._force = false;
	}

	/**
	 * 获取排队的状态
	 */
	get pending(): T | undefined {
		return this._pending;
	}

	/**
	 * 是否强制转换
	 */
	get force(): boolean {
		return this._force;
	}

	/**
	 * 消费并返回排队的状态
	 */
	consume(): T | undefined {
		const state = this._pending;
		this._pending = undefined;
		this._force = false;
		return state;
	}
}