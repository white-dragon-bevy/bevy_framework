/**
 * Bevy 主调度系统
 * 对应 Rust bevy_app::main_schedule
 *
 * 定义应用层的调度标签、执行顺序和协调逻辑
 */

import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { ScheduleLabel, createScheduleLabel } from "./types";

/**
 * Bevy 调度阶段枚举
 * 对应 Rust bevy_app 的标准调度阶段
 */
export enum BevySchedule {
	First = "First",
	PreStartup = "PreStartup",
	Startup = "Startup",
	PostStartup = "PostStartup",
	PreUpdate = "PreUpdate",
	Update = "Update",
	PostUpdate = "PostUpdate",
	Last = "Last",
	// 固定更新相关调度
	RunFixedMainLoop = "RunFixedMainLoop",
	FixedMain = "FixedMain",
	FixedFirst = "FixedFirst",
	FixedPreUpdate = "FixedPreUpdate",
	FixedUpdate = "FixedUpdate",
	FixedPostUpdate = "FixedPostUpdate",
	FixedLast = "FixedLast",
	// 渲染
	Render = "Render",
	Main = "Main",
}

/**
 * 内置调度标签
 * 对应 Rust bevy_app 的标准调度阶段
 */
export namespace BuiltinSchedules {
	export const First = createScheduleLabel(BevySchedule.First);
	export const PreStartup = createScheduleLabel(BevySchedule.PreStartup);
	export const Startup = createScheduleLabel(BevySchedule.Startup);
	export const PostStartup = createScheduleLabel(BevySchedule.PostStartup);
	export const PreUpdate = createScheduleLabel(BevySchedule.PreUpdate);
	export const Update = createScheduleLabel(BevySchedule.Update);
	export const PostUpdate = createScheduleLabel(BevySchedule.PostUpdate);
	export const Last = createScheduleLabel(BevySchedule.Last);
	// 固定更新相关调度
	export const RunFixedMainLoop = createScheduleLabel(BevySchedule.RunFixedMainLoop);
	export const FixedMain = createScheduleLabel(BevySchedule.FixedMain);
	export const FixedFirst = createScheduleLabel(BevySchedule.FixedFirst);
	export const FixedPreUpdate = createScheduleLabel(BevySchedule.FixedPreUpdate);
	export const FixedUpdate = createScheduleLabel(BevySchedule.FixedUpdate);
	export const FixedPostUpdate = createScheduleLabel(BevySchedule.FixedPostUpdate);
	export const FixedLast = createScheduleLabel(BevySchedule.FixedLast);
	// 渲染
	export const Render = createScheduleLabel(BevySchedule.Render);
	export const Main = createScheduleLabel(BevySchedule.Main);
}

// 导出单独的调度标签以便直接使用
export const First = BuiltinSchedules.First;
export const PreStartup = BuiltinSchedules.PreStartup;
export const Startup = BuiltinSchedules.Startup;
export const PostStartup = BuiltinSchedules.PostStartup;
export const PreUpdate = BuiltinSchedules.PreUpdate;
export const Update = BuiltinSchedules.Update;
export const PostUpdate = BuiltinSchedules.PostUpdate;
export const Last = BuiltinSchedules.Last;
export const FixedFirst = createScheduleLabel("FixedFirst");
export const FixedUpdate = BuiltinSchedules.FixedUpdate;
export const Render = BuiltinSchedules.Render;
export const Main = BuiltinSchedules.Main;

/**
 * 主调度执行顺序配置
 * 对应 Rust bevy_app::MainScheduleOrder
 */
export class MainScheduleOrder {
	/** 启动时执行的调度序列 */
	private startupSchedules: ScheduleLabel[] = [
		BuiltinSchedules.PreStartup,
		BuiltinSchedules.Startup,
		BuiltinSchedules.PostStartup,
	];

	/** 主循环执行的调度序列 */
	private mainSchedules: ScheduleLabel[] = [
		BuiltinSchedules.First,
		BuiltinSchedules.PreUpdate,
		BuiltinSchedules.RunFixedMainLoop,  // 在 PreUpdate 后运行固定更新
		BuiltinSchedules.Update,
		BuiltinSchedules.PostUpdate,
		BuiltinSchedules.Last,
	];

	/** 固定更新执行的调度序列 */
	private fixedSchedules: ScheduleLabel[] = [
		BuiltinSchedules.FixedFirst,
		BuiltinSchedules.FixedPreUpdate,
		BuiltinSchedules.FixedUpdate,
		BuiltinSchedules.FixedPostUpdate,
		BuiltinSchedules.FixedLast,
	];

	/** 是否已执行启动调度 */
	private startupCompleted = false;

	/**
	 * 获取启动调度序列
	 */
	getStartupSchedules(): readonly ScheduleLabel[] {
		return this.startupSchedules;
	}

	/**
	 * 获取主循环调度序列
	 */
	getMainSchedules(): readonly ScheduleLabel[] {
		return this.mainSchedules;
	}

	/**
	 * 获取固定更新调度序列
	 */
	getFixedSchedules(): readonly ScheduleLabel[] {
		return this.fixedSchedules;
	}

	/**
	 * 设置启动调度序列
	 */
	setStartupSchedules(schedules: ScheduleLabel[]): void {
		this.startupSchedules = schedules;
	}

	/**
	 * 设置主循环调度序列
	 */
	setMainSchedules(schedules: ScheduleLabel[]): void {
		this.mainSchedules = schedules;
	}

	/**
	 * 在启动序列中插入调度
	 */
	insertStartupSchedule(schedule: ScheduleLabel, index: number): void {
		this.startupSchedules.insert(index, schedule);
	}

	/**
	 * 在主循环序列中插入调度
	 */
	insertMainSchedule(schedule: ScheduleLabel, index: number): void {
		this.mainSchedules.insert(index, schedule);
	}

	/**
	 * 标记启动完成
	 */
	markStartupCompleted(): void {
		this.startupCompleted = true;
	}

	/**
	 * 检查是否已完成启动
	 */
	isStartupCompleted(): boolean {
		return this.startupCompleted;
	}

	/**
	 * 获取当前应该执行的调度序列
	 */
	getCurrentSchedules(): readonly ScheduleLabel[] {
		return this.startupCompleted ? this.mainSchedules : this.startupSchedules;
	}
}

/**
 * 获取调度到 Roblox 事件的默认映射
 */
export function getDefaultScheduleEventMap(): Map<string, RBXScriptSignal> {
	const map = new Map<string, RBXScriptSignal>();

	// 基础调度映射到 Heartbeat
	map.set(BevySchedule.First, RunService.Heartbeat);
	map.set(BevySchedule.PreStartup, RunService.Heartbeat);
	map.set(BevySchedule.Startup, RunService.Heartbeat);
	map.set(BevySchedule.PostStartup, RunService.Heartbeat);
	map.set(BevySchedule.PreUpdate, RunService.Heartbeat);
	map.set(BevySchedule.Update, RunService.Heartbeat);
	map.set(BevySchedule.PostUpdate, RunService.Heartbeat);
	map.set(BevySchedule.Last, RunService.Heartbeat);
	map.set(BevySchedule.Main, RunService.Heartbeat);

	// 固定更新映射到 Stepped
	map.set(BevySchedule.FixedUpdate, RunService.Stepped);

	// 客户端渲染映射到 RenderStepped
	if (RunService.IsClient()) {
		map.set(BevySchedule.Render, RunService.RenderStepped);
	}

	return map;
}

/**
 * 运行主调度系统
 * 这是一个特殊的系统，负责按顺序执行所有调度
 */
export function runMainSchedule(
	world: World,
	scheduleOrder: MainScheduleOrder,
	runScheduleFn: (label: ScheduleLabel) => void,
): void {
	const schedules = scheduleOrder.getCurrentSchedules();

	for (const schedule of schedules) {
		runScheduleFn(schedule);
	}

	// 如果刚完成启动序列，标记完成
	if (!scheduleOrder.isStartupCompleted() && schedules === scheduleOrder.getStartupSchedules()) {
		scheduleOrder.markStartupCompleted();
	}
}

/**
 * 获取调度的默认优先级
 * 用于 Loop 中的系统排序
 */
export function getSchedulePriority(schedule: string): number {
	const priorities: { [key: string]: number } = {
		[BevySchedule.First]: -1000,
		[BevySchedule.PreStartup]: -900,
		[BevySchedule.Startup]: -800,
		[BevySchedule.PostStartup]: -700,
		[BevySchedule.PreUpdate]: -600,
		[BevySchedule.Update]: 0,
		[BevySchedule.PostUpdate]: 600,
		[BevySchedule.Last]: 1000,
		[BevySchedule.FixedUpdate]: -500,
		[BevySchedule.Render]: 700,
		[BevySchedule.Main]: 0,
	};

	return priorities[schedule] || 0;
}