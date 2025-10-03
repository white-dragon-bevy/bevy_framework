/**
 * @fileoverview Bevy ECS 调度器类型定义
 * 定义调度系统的核心接口和类型
 */

import type { World } from "@rbxts/matter";
import { BevySystem, BevyWorld, Context } from "../";

/**
 * 系统函数签名 - 接收 World 和 deltaTime
 */
export type SystemFunction = (world: BevyWorld, context: Context) => void;

/**
 * 系统运行条件函数
 */
export type RunCondition = (world: BevyWorld) => boolean;

/**
 * 系统集标识符
 */
export type SystemSet = string;

/**
 * 调度阶段标识符
 */
export type ScheduleLabel = string;

/**
 * 系统配置 - Bevy 风格的系统描述符
 */
export interface SystemConfig {
	/** 系统函数 */
	readonly system: SystemFunction;
	/** 系统名称（用于调试） */
	readonly name?: string;
	/** 运行条件 */
	readonly runCondition?: RunCondition;
	/** 所属系统集 */
	readonly inSet?: SystemSet;
	/** 在指定系统之前运行 */
	readonly before?: Array<SystemFunction | SystemSet>;
	/** 在指定系统之后运行 */
	readonly after?: Array<SystemFunction | SystemSet>;
	/** 优先级 */
	readonly priority?: number;
	/** 是否为排他性系统 */
	readonly exclusive?: boolean;
}

/**
 * 系统集配置
 */
export interface SystemSetConfig {
	/** 系统集名称 */
	readonly name: SystemSet;
	/** 在指定系统集之前运行 */
	readonly before?: Array<SystemSet>;
	/** 在指定系统集之后运行 */
	readonly after?: Array<SystemSet>;
	/** 运行条件 */
	readonly runCondition?: RunCondition;
}

/**
 * 内部系统结构 - 用于调度器内部管理
 */
export interface InternalSystemStruct extends SystemConfig {
	/** 系统唯一标识 */
	readonly id: string;
	/** 所属调度阶段 */
	readonly schedule: ScheduleLabel;
	/** 已解析的依赖关系 */
	readonly dependencies: Array<string>;
	/** 编译后的 Matter Loop 系统结构 */
	readonly loopSystem: BevySystem;
}

/**
 * 调度器状态
 */
export interface SchedulerState {
	/** 是否已编译 */
	readonly compiled: boolean;
	/** 系统数量 */
	readonly systemCount: number;
	/** 系统集数量 */
	readonly setCount: number;
}

/**
 * 调度器图 - 表示系统间的依赖关系
 */
export interface ScheduleGraph {
	/** 所有系统 */
	readonly systems: ReadonlyMap<string, InternalSystemStruct>;
	/** 所有系统集 */
	readonly systemSets: ReadonlyMap<string, SystemSetConfig>;
	/** 依赖关系图 */
	readonly dependencies: ReadonlyMap<string, Array<string>>;
}

/**
 * 调度器执行统计
 */
export interface ScheduleStats {
	/** 系统执行次数 */
	readonly executionCount: number;
	/** 总执行时间（毫秒） */
	readonly totalTime: number;
	/** 最后执行时间 */
	readonly lastExecutionTime: number;
}
