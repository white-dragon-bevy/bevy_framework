/**
 * 状态转换系统
 * 管理状态之间的转换逻辑
 */

import type { World } from "@rbxts/matter";
import type { State, NextState } from "./state";

/**
 * 状态转换类
 * 封装状态转换的逻辑
 */
export class StateTransition<T extends string = string> {
	/** 源状态 */
	readonly from: T;

	/** 目标状态 */
	readonly to: T;

	/** 转换时间戳 */
	readonly timestamp: number;

	/** 转换原因 */
	readonly reason?: string;

	constructor(from: T, to: T, reason?: string) {
		this.from = from;
		this.to = to;
		this.timestamp = os.clock();
		this.reason = reason;
	}

	/**
	 * 是否为同状态转换
	 */
	isIdentity(): boolean {
		return this.from === this.to;
	}

	/**
	 * 获取转换标识
	 */
	getKey(): string {
		return `${this.from}->${this.to}`;
	}

	/**
	 * 创建反向转换
	 */
	reverse(): StateTransition<T> {
		return new StateTransition(this.to, this.from, `Reverse of: ${this.reason || "unknown"}`);
	}
}

/**
 * 状态转换事件
 */
export class StateTransitionEvent<T extends string = string> {
	/** 源状态 */
	readonly from: T;

	/** 目标状态 */
	readonly to: T;

	/** 事件时间戳 */
	readonly timestamp: number;

	/** 是否被取消 */
	private _cancelled = false;

	constructor(from: T, to: T) {
		this.from = from;
		this.to = to;
		this.timestamp = os.clock();
	}

	/**
	 * 是否为同状态转换
	 */
	isIdentity(): boolean {
		return this.from === this.to;
	}

	/**
	 * 取消转换
	 */
	cancel(): void {
		this._cancelled = true;
	}

	/**
	 * 是否已取消
	 */
	get cancelled(): boolean {
		return this._cancelled;
	}

	/**
	 * 创建组件标记
	 */
	toComponent(): {
		StateTransitionEvent: true;
		from: T;
		to: T;
		timestamp: number;
		cancelled: boolean;
	} {
		return {
			StateTransitionEvent: true,
			from: this.from,
			to: this.to,
			timestamp: this.timestamp,
			cancelled: this._cancelled,
		};
	}
}

/**
 * 状态转换调度器
 * 管理状态转换的执行顺序
 */
export class TransitionScheduler<T extends string = string> {
	/** 转换队列 */
	private queue: StateTransition<T>[] = [];

	/** 转换历史 */
	private history: StateTransition<T>[] = [];

	/** 最大历史记录数 */
	private readonly maxHistorySize = 50;

	/** 转换拦截器 */
	private interceptors: Array<(transition: StateTransition<T>) => boolean> = [];

	/**
	 * 添加转换到队列
	 */
	enqueue(transition: StateTransition<T>): void {
		this.queue.push(transition);
	}

	/**
	 * 处理下一个转换
	 */
	processNext(world: World, state: State<T>): StateTransition<T> | undefined {
		const transition = this.queue.shift();
		if (!transition) {
			return undefined;
		}

		// 执行拦截器
		for (const interceptor of this.interceptors) {
			if (!interceptor(transition)) {
				// 转换被拦截
				return undefined;
			}
		}

		// 记录历史
		this.history.push(transition);
		if (this.history.size() > this.maxHistorySize) {
			this.history.shift();
		}

		return transition;
	}

	/**
	 * 清空队列
	 */
	clearQueue(): void {
		this.queue = [];
	}

	/**
	 * 获取队列大小
	 */
	get queueSize(): number {
		return this.queue.size();
	}

	/**
	 * 获取转换历史
	 */
	getHistory(): ReadonlyArray<StateTransition<T>> {
		return this.history;
	}

	/**
	 * 添加转换拦截器
	 */
	addInterceptor(interceptor: (transition: StateTransition<T>) => boolean): () => void {
		this.interceptors.push(interceptor);
		return () => {
			const index = this.interceptors.indexOf(interceptor);
			if (index !== -1) {
				this.interceptors.remove(index);
			}
		};
	}

	/**
	 * 是否有待处理的转换
	 */
	hasPendingTransitions(): boolean {
		return this.queue.size() > 0;
	}

	/**
	 * 获取下一个转换（不移除）
	 */
	peekNext(): StateTransition<T> | undefined {
		return this.queue[0];
	}
}

/**
 * 转换验证器
 * 验证状态转换是否有效
 */
export class TransitionValidator<T extends string = string> {
	/** 允许的转换映射 */
	private allowedTransitions: Map<T, Set<T>> = new Map();

	/** 禁止的转换映射 */
	private forbiddenTransitions: Map<T, Set<T>> = new Map();

	/**
	 * 添加允许的转换
	 */
	allow(from: T, to: T): void {
		if (!this.allowedTransitions.has(from)) {
			this.allowedTransitions.set(from, new Set());
		}
		this.allowedTransitions.get(from)!.add(to);
	}

	/**
	 * 添加禁止的转换
	 */
	forbid(from: T, to: T): void {
		if (!this.forbiddenTransitions.has(from)) {
			this.forbiddenTransitions.set(from, new Set());
		}
		this.forbiddenTransitions.get(from)!.add(to);
	}

	/**
	 * 验证转换是否有效
	 */
	isValid(from: T, to: T): boolean {
		// 检查是否在禁止列表中
		const forbidden = this.forbiddenTransitions.get(from);
		if (forbidden?.has(to)) {
			return false;
		}

		// 如果定义了允许列表，检查是否在允许列表中
		const allowed = this.allowedTransitions.get(from);
		if (allowed && !allowed.has(to)) {
			return false;
		}

		return true;
	}

	/**
	 * 批量添加允许的转换
	 */
	allowMany(transitions: Array<[T, T]>): void {
		for (const [from, to] of transitions) {
			this.allow(from, to);
		}
	}

	/**
	 * 批量添加禁止的转换
	 */
	forbidMany(transitions: Array<[T, T]>): void {
		for (const [from, to] of transitions) {
			this.forbid(from, to);
		}
	}

	/**
	 * 获取指定状态的所有允许转换
	 */
	getAllowedTransitions(from: T): T[] {
		const allowed = this.allowedTransitions.get(from);
		return allowed ? [...allowed] : [];
	}

	/**
	 * 清除所有规则
	 */
	clear(): void {
		this.allowedTransitions.clear();
		this.forbiddenTransitions.clear();
	}
}

/**
 * 转换动画配置
 */
export interface TransitionAnimation<T extends string> {
	/** 动画持续时间 */
	duration: number;
	/** 缓动函数 */
	easing?: (t: number) => number;
	/** 动画开始回调 */
	onStart?: (from: T, to: T) => void;
	/** 动画更新回调 */
	onUpdate?: (progress: number) => void;
	/** 动画完成回调 */
	onComplete?: () => void;
}

/**
 * 转换动画管理器
 */
export class TransitionAnimator<T extends string = string> {
	private animations: Map<string, TransitionAnimation<T>> = new Map();
	private activeAnimation?: {
		from: T;
		to: T;
		config: TransitionAnimation<T>;
		startTime: number;
		progress: number;
	};

	/**
	 * 注册转换动画
	 */
	register(from: T, to: T, config: TransitionAnimation<T>): void {
		const key = `${from}->${to}`;
		this.animations.set(key, config);
	}

	/**
	 * 开始转换动画
	 */
	startTransition(from: T, to: T): void {
		const key = `${from}->${to}`;
		const config = this.animations.get(key);

		if (!config) {
			return;
		}

		this.activeAnimation = {
			from,
			to,
			config,
			startTime: os.clock(),
			progress: 0,
		};

		if (config.onStart) {
			config.onStart(from, to);
		}
	}

	/**
	 * 更新动画
	 */
	update(deltaTime: number): void {
		if (!this.activeAnimation) {
			return;
		}

		const { config, startTime } = this.activeAnimation;
		const elapsed = os.clock() - startTime;
		const progress = math.min(elapsed / config.duration, 1);

		// 应用缓动函数
		const easedProgress = config.easing ? config.easing(progress) : progress;
		this.activeAnimation.progress = easedProgress;

		if (config.onUpdate) {
			config.onUpdate(easedProgress);
		}

		if (progress >= 1) {
			if (config.onComplete) {
				config.onComplete();
			}
			this.activeAnimation = undefined;
		}
	}

	/**
	 * 是否正在动画中
	 */
	isAnimating(): boolean {
		return this.activeAnimation !== undefined;
	}

	/**
	 * 获取当前动画进度
	 */
	getProgress(): number {
		return this.activeAnimation?.progress || 0;
	}

	/**
	 * 停止当前动画
	 */
	stopAnimation(): void {
		this.activeAnimation = undefined;
	}
}