/**
 * 状态系统类型定义
 */

import type { World } from "@rbxts/matter";

/**
 * 状态变化处理器
 */
export type StateChangeHandler = (world: World) => void;

/**
 * 状态转换处理器
 */
export type StateTransitionHandler<T extends string> = (world: World, from: T, to: T) => void;

/**
 * 转换条件函数
 */
export type TransitionCondition<T extends string> = (world: World, currentState: T) => boolean;

/**
 * 状态定义接口
 */
export interface StateDefinition<T extends string> {
	/** 进入状态时的处理器 */
	onEnter?: StateChangeHandler;
	/** 退出状态时的处理器 */
	onExit?: StateChangeHandler;
	/** 状态更新时的处理器 */
	onUpdate?: StateChangeHandler;
	/** 状态转换条件映射 */
	transitions?: Map<T, TransitionCondition<T>>;
}

/**
 * 状态配置接口
 */
export interface StateConfig<T extends string> {
	/** 初始状态 */
	initial: T;
	/** 状态定义映射 */
	states: Map<T, StateDefinition<T>>;
	/** 是否启用调试模式 */
	debug?: boolean;
}

/**
 * 状态历史记录项
 */
export interface StateHistoryEntry<T extends string> {
	/** 状态值 */
	state: T;
	/** 进入时间戳 */
	enteredAt: number;
	/** 退出时间戳 */
	exitedAt?: number;
}

/**
 * 状态序列化数据
 */
export interface SerializedState<T extends string> {
	/** 当前状态 */
	current: T;
	/** 上一个状态 */
	previous?: T;
	/** 状态历史 */
	history: StateHistoryEntry<T>[];
}

/**
 * 状态元数据
 */
export interface StateMetadata<T extends string> {
	/** 状态名称 */
	name: T;
	/** 状态标签 */
	tags?: string[];
	/** 自定义数据 */
	data?: Record<string, unknown>;
}

/**
 * 状态验证器
 */
export type StateValidator<T extends string> = (state: T, world: World) => boolean;

/**
 * 状态观察者
 */
export interface StateObserver<T extends string> {
	/** 观察者ID */
	id: string;
	/** 状态进入回调 */
	onEnter?: (state: T) => void;
	/** 状态退出回调 */
	onExit?: (state: T) => void;
	/** 状态转换回调 */
	onTransition?: (from: T, to: T) => void;
}

/**
 * 异步状态转换结果
 */
export interface AsyncTransitionResult<T extends string> {
	/** 是否成功 */
	success: boolean;
	/** 新状态 */
	newState?: T;
	/** 错误信息 */
	error?: string;
}

/**
 * 状态机统计信息
 */
export interface StateStatistics<T extends string> {
	/** 总转换次数 */
	totalTransitions: number;
	/** 各状态停留时间 */
	stateDurations: Map<T, number>;
	/** 转换频率 */
	transitionFrequency: Map<string, number>;
	/** 最后更新时间 */
	lastUpdate: number;
}