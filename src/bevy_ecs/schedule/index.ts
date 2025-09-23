/**
 * @fileoverview Bevy ECS 调度模块导出
 * 提供调度器相关的所有类型和类的统一导出
 */

// 核心类导出
export { Loop } from "./loop";
export { Schedule } from "./schedule";
export { Schedules } from "./schedules";
export { SystemConfigs, extendSystemFunction, extendSystemArray, intoSystemConfigs } from "./system-configs";

// 系统构建器导出
export { system, systemArray, chain, when, after, before, inSet } from "./system-builder";

// 类型定义导出
export type {
	SystemFunction,
	RunCondition,
	SystemSet,
	ScheduleLabel,
	SystemConfig,
	SystemSetConfig,
	InternalSystemStruct,
	SchedulerState,
	ScheduleGraph,
	ScheduleStats,
} from "./types";

// Loop 类型导出
export type {
	SystemStruct,
	BevySystemStruct,
	System,
	AnySystem,
} from "./loop";

// SystemConfigs 类型导出
export type {
	SystemConfigItem,
	IntoSystemConfigs,
} from "./system-configs";