/**
 * @fileoverview Bevy 主调度器定义
 * 定义应用程序的内置调度阶段和系统集
 */

import type { ScheduleLabel, SystemSet } from "../bevy_ecs/schedule";
import Object from "@rbxts/object-utils";

/**
 * 内置调度阶段 - 对应 Rust Bevy 的调度阶段
 */
export const MainScheduleLabel = {
	/** 主调度器 - 包含所有标准更新循环 */
	MAIN: "Main" as ScheduleLabel,

	/** 启动调度器 - 应用程序启动时运行一次 */
	STARTUP: "Startup" as ScheduleLabel,

	/** 第一个调度器 - 在所有其他系统之前运行 */
	FIRST: "First" as ScheduleLabel,

	/** 预更新调度器 - 在主更新循环之前运行 */
	PRE_UPDATE: "PreUpdate" as ScheduleLabel,

	/** 更新调度器 - 主要的游戏逻辑更新 */
	UPDATE: "Update" as ScheduleLabel,

	/** 后更新调度器 - 在主更新循环之后运行 */
	POST_UPDATE: "PostUpdate" as ScheduleLabel,

	/** 最后调度器 - 在所有其他系统之后运行 */
	LAST: "Last" as ScheduleLabel,

	/** 预启动调度器 - 在启动系统之前运行 */
	PRE_STARTUP: "PreStartup" as ScheduleLabel,

	/** 后启动调度器 - 在启动系统之后运行 */
	POST_STARTUP: "PostStartup" as ScheduleLabel,

	/** 渲染调度器 - 渲染相关系统 */
	RENDER: "Render" as ScheduleLabel,

	/** 提取调度器 - 从主世界提取渲染数据 */
	EXTRACT: "Extract" as ScheduleLabel,

	/** 准备调度器 - 准备渲染资源 */
	PREPARE: "Prepare" as ScheduleLabel,

	/** 队列调度器 - 队列渲染命令 */
	QUEUE: "Queue" as ScheduleLabel,

	/** 清理调度器 - 清理渲染资源 */
	CLEANUP: "Cleanup" as ScheduleLabel,
} as const;

/**
 * 获取所有内置调度阶段
 * @returns 所有内置调度阶段的数组
 */
export function getAllMainScheduleLabels(): Array<ScheduleLabel> {
	return Object.values(MainScheduleLabel);
}

/**
 * 获取启动相关的调度阶段
 * @returns 启动调度阶段数组
 */
export function getStartupScheduleLabels(): Array<ScheduleLabel> {
	return [MainScheduleLabel.PRE_STARTUP, MainScheduleLabel.STARTUP, MainScheduleLabel.POST_STARTUP];
}

/**
 * 获取主循环相关的调度阶段
 * @returns 主循环调度阶段数组
 */
export function getMainLoopScheduleLabels(): Array<ScheduleLabel> {
	return [
		MainScheduleLabel.FIRST,
		MainScheduleLabel.PRE_UPDATE,
		MainScheduleLabel.UPDATE,
		MainScheduleLabel.POST_UPDATE,
		MainScheduleLabel.LAST,
	];
}

/**
 * 获取渲染相关的调度阶段
 * @returns 渲染调度阶段数组
 */
export function getRenderScheduleLabels(): Array<ScheduleLabel> {
	return [
		MainScheduleLabel.EXTRACT,
		MainScheduleLabel.PREPARE,
		MainScheduleLabel.QUEUE,
		MainScheduleLabel.RENDER,
		MainScheduleLabel.CLEANUP,
	];
}

/**
 * 内置系统集 - 对应 Rust Bevy 的系统集
 */
export const CoreSystemSet = {
	/** 核心系统集 - 包含所有核心功能 */
	CORE: "Core" as SystemSet,

	/** 输入系统集 - 处理输入事件 */
	INPUT: "Input" as SystemSet,

	/** 物理系统集 - 物理模拟 */
	PHYSICS: "Physics" as SystemSet,

	/** 变换系统集 - 变换层次结构更新 */
	TRANSFORM: "Transform" as SystemSet,

	/** 动画系统集 - 动画更新 */
	ANIMATION: "Animation" as SystemSet,

	/** 音频系统集 - 音频处理 */
	AUDIO: "Audio" as SystemSet,

	/** 网络系统集 - 网络通信 */
	NETWORKING: "Networking" as SystemSet,

	/** UI系统集 - 用户界面更新 */
	UI: "UI" as SystemSet,

	/** 渲染系统集 - 渲染管线 */
	RENDERING: "Rendering" as SystemSet,

	/** 诊断系统集 - 性能监控和调试 */
	DIAGNOSTICS: "Diagnostics" as SystemSet,

	/** 事件系统集 - 事件处理 */
	EVENTS: "Events" as SystemSet,

	/** 时间系统集 - 时间管理 */
	TIME: "Time" as SystemSet,

	/** 应用程序系统集 - 应用程序生命周期 */
	APP: "App" as SystemSet,
} as const;

/**
 * 获取所有内置系统集
 * @returns 所有内置系统集的数组
 */
export function getAllCoreSystemSets(): Array<SystemSet> {
	return Object.values(CoreSystemSet);
}

/**
 * 调度阶段执行顺序配置
 * 定义了各个调度阶段的依赖关系和执行顺序
 */
export const ScheduleExecutionOrder = {
	/** 启动阶段执行顺序 */
	startup: [MainScheduleLabel.PRE_STARTUP, MainScheduleLabel.STARTUP, MainScheduleLabel.POST_STARTUP],

	/** 主循环执行顺序 */
	mainLoop: [
		MainScheduleLabel.FIRST,
		MainScheduleLabel.PRE_UPDATE,
		MainScheduleLabel.UPDATE,
		MainScheduleLabel.POST_UPDATE,
		MainScheduleLabel.LAST,
	],

	/** 渲染循环执行顺序 */
	render: [
		MainScheduleLabel.EXTRACT,
		MainScheduleLabel.PREPARE,
		MainScheduleLabel.QUEUE,
		MainScheduleLabel.RENDER,
		MainScheduleLabel.CLEANUP,
	],
} as const;

/**
 * 系统集执行顺序配置
 * 定义了各个系统集在调度阶段内的执行顺序
 */
export const SystemSetExecutionOrder = {
	/** PreUpdate 阶段的系统集顺序 */
	preUpdate: [CoreSystemSet.INPUT, CoreSystemSet.EVENTS, CoreSystemSet.TIME],

	/** Update 阶段的系统集顺序 */
	update: [
		CoreSystemSet.PHYSICS,
		CoreSystemSet.TRANSFORM,
		CoreSystemSet.ANIMATION,
		CoreSystemSet.AUDIO,
		CoreSystemSet.NETWORKING,
	],

	/** PostUpdate 阶段的系统集顺序 */
	postUpdate: [CoreSystemSet.UI, CoreSystemSet.RENDERING, CoreSystemSet.DIAGNOSTICS],
} as const;

/**
 * 调度阶段描述信息
 * 用于文档生成和调试
 */
export const ScheduleDescriptions = {
	[MainScheduleLabel.MAIN]: "主调度器，包含所有标准更新循环",
	[MainScheduleLabel.STARTUP]: "启动调度器，应用程序启动时运行一次",
	[MainScheduleLabel.FIRST]: "第一个调度器，在所有其他系统之前运行",
	[MainScheduleLabel.PRE_UPDATE]: "预更新调度器，在主更新循环之前运行",
	[MainScheduleLabel.UPDATE]: "更新调度器，主要的游戏逻辑更新",
	[MainScheduleLabel.POST_UPDATE]: "后更新调度器，在主更新循环之后运行",
	[MainScheduleLabel.LAST]: "最后调度器，在所有其他系统之后运行",
	[MainScheduleLabel.PRE_STARTUP]: "预启动调度器，在启动系统之前运行",
	[MainScheduleLabel.POST_STARTUP]: "后启动调度器，在启动系统之后运行",
	[MainScheduleLabel.RENDER]: "渲染调度器，渲染相关系统",
	[MainScheduleLabel.EXTRACT]: "提取调度器，从主世界提取渲染数据",
	[MainScheduleLabel.PREPARE]: "准备调度器，准备渲染资源",
	[MainScheduleLabel.QUEUE]: "队列调度器，队列渲染命令",
	[MainScheduleLabel.CLEANUP]: "清理调度器，清理渲染资源",
} as const;

/**
 * 系统集描述信息
 * 用于文档生成和调试
 */
export const SystemSetDescriptions = {
	[CoreSystemSet.CORE]: "核心系统集，包含所有核心功能",
	[CoreSystemSet.INPUT]: "输入系统集，处理输入事件",
	[CoreSystemSet.PHYSICS]: "物理系统集，物理模拟",
	[CoreSystemSet.TRANSFORM]: "变换系统集，变换层次结构更新",
	[CoreSystemSet.ANIMATION]: "动画系统集，动画更新",
	[CoreSystemSet.AUDIO]: "音频系统集，音频处理",
	[CoreSystemSet.NETWORKING]: "网络系统集，网络通信",
	[CoreSystemSet.UI]: "UI系统集，用户界面更新",
	[CoreSystemSet.RENDERING]: "渲染系统集，渲染管线",
	[CoreSystemSet.DIAGNOSTICS]: "诊断系统集，性能监控和调试",
	[CoreSystemSet.EVENTS]: "事件系统集，事件处理",
	[CoreSystemSet.TIME]: "时间系统集，时间管理",
	[CoreSystemSet.APP]: "应用程序系统集，应用程序生命周期",
} as const;

/**
 * 默认的调度阶段到 Roblox 事件映射
 * 这是推荐的映射方式，应用程序可以根据需要覆盖
 */
export function getDefaultScheduleEventMapping(): { [scheduleLabel: string]: RBXScriptSignal } {
	const RunService = game.GetService("RunService");

	return {
		[MainScheduleLabel.FIRST]: RunService.Heartbeat,
		[MainScheduleLabel.PRE_UPDATE]: RunService.Heartbeat,
		[MainScheduleLabel.UPDATE]: RunService.Heartbeat,
		[MainScheduleLabel.POST_UPDATE]: RunService.Heartbeat,
		[MainScheduleLabel.LAST]: RunService.Heartbeat,
		[MainScheduleLabel.RENDER]: RunService.RenderStepped,
		[MainScheduleLabel.EXTRACT]: RunService.RenderStepped,
		[MainScheduleLabel.PREPARE]: RunService.RenderStepped,
		[MainScheduleLabel.QUEUE]: RunService.RenderStepped,
		[MainScheduleLabel.CLEANUP]: RunService.RenderStepped,
	};
}

/**
 * 获取启动调度的事件映射
 * 启动调度通常在应用初始化时手动触发
 * @returns 启动调度事件映射
 */
export function getStartupScheduleEventMapping(): { [scheduleLabel: string]: RBXScriptSignal } {
	const RunService = game.GetService("RunService");

	return {
		[MainScheduleLabel.PRE_STARTUP]: RunService.Heartbeat,
		[MainScheduleLabel.STARTUP]: RunService.Heartbeat,
		[MainScheduleLabel.POST_STARTUP]: RunService.Heartbeat,
	};
}

/**
 * BuiltinSchedules - 对应 Rust Bevy 的内置调度器
 * 提供与 Rust 版本兼容的常量
 */
export const BuiltinSchedules = {
	// 使用与 MainScheduleLabel 一致的 UPPERCASE_WITH_UNDERSCORES 命名
	FIRST: MainScheduleLabel.FIRST,
	PRE_STARTUP: MainScheduleLabel.PRE_STARTUP,
	STARTUP: MainScheduleLabel.STARTUP,
	POST_STARTUP: MainScheduleLabel.POST_STARTUP,
	PRE_UPDATE: MainScheduleLabel.PRE_UPDATE,
	UPDATE: MainScheduleLabel.UPDATE,
	POST_UPDATE: MainScheduleLabel.POST_UPDATE,
	LAST: MainScheduleLabel.LAST,
	MAIN: MainScheduleLabel.MAIN,

	// 固定更新相关调度（当前未完全实现）
	// TODO: 完整实现固定时间步调度系统
	RUN_FIXED_MAIN_LOOP: "RunFixedMainLoop" as ScheduleLabel,
	FIXED_MAIN: "FixedMain" as ScheduleLabel,
	FIXED_FIRST: "FixedFirst" as ScheduleLabel,
	FIXED_PRE_UPDATE: "FixedPreUpdate" as ScheduleLabel,
	FIXED_UPDATE: "FixedUpdate" as ScheduleLabel,
	FIXED_POST_UPDATE: "FixedPostUpdate" as ScheduleLabel,
	FIXED_LAST: "FixedLast" as ScheduleLabel,

	// 向后兼容的 PascalCase 别名（已弃用，请使用 UPPERCASE_WITH_UNDERSCORES）
	/** @deprecated 请使用 FIRST */
	First: MainScheduleLabel.FIRST,
	/** @deprecated 请使用 PRE_STARTUP */
	PreStartup: MainScheduleLabel.PRE_STARTUP,
	/** @deprecated 请使用 STARTUP */
	Startup: MainScheduleLabel.STARTUP,
	/** @deprecated 请使用 POST_STARTUP */
	PostStartup: MainScheduleLabel.POST_STARTUP,
	/** @deprecated 请使用 PRE_UPDATE */
	PreUpdate: MainScheduleLabel.PRE_UPDATE,
	/** @deprecated 请使用 UPDATE */
	Update: MainScheduleLabel.UPDATE,
	/** @deprecated 请使用 POST_UPDATE */
	PostUpdate: MainScheduleLabel.POST_UPDATE,
	/** @deprecated 请使用 LAST */
	Last: MainScheduleLabel.LAST,
	/** @deprecated 请使用 MAIN */
	Main: MainScheduleLabel.MAIN,

	// 向后兼容的固定更新别名（已弃用且未完全实现）
	/** @deprecated 请使用 RUN_FIXED_MAIN_LOOP */
	RunFixedMainLoop: "RunFixedMainLoop" as ScheduleLabel,
	/** @deprecated 请使用 FIXED_MAIN */
	FixedMain: "FixedMain" as ScheduleLabel,
	/** @deprecated 请使用 FIXED_FIRST */
	FixedFirst: "FixedFirst" as ScheduleLabel,
	/** @deprecated 请使用 FIXED_PRE_UPDATE */
	FixedPreUpdate: "FixedPreUpdate" as ScheduleLabel,
	/** @deprecated 请使用 FIXED_UPDATE */
	FixedUpdate: "FixedUpdate" as ScheduleLabel,
	/** @deprecated 请使用 FIXED_POST_UPDATE */
	FixedPostUpdate: "FixedPostUpdate" as ScheduleLabel,
	/** @deprecated 请使用 FIXED_LAST */
	FixedLast: "FixedLast" as ScheduleLabel,
} as const;

/**
 * 主调度序列管理类
 */
export class MainScheduleOrder {
	private order: Array<ScheduleLabel> = [
		BuiltinSchedules.FIRST,
		BuiltinSchedules.PRE_UPDATE,
		BuiltinSchedules.UPDATE,
		BuiltinSchedules.POST_UPDATE,
		BuiltinSchedules.LAST,
	];

	/**
	 * 获取调度执行顺序
	 */
	getOrder(): Array<ScheduleLabel> {
		return [...this.order];
	}

	/**
	 * 设置调度执行顺序
	 */
	setOrder(order: Array<ScheduleLabel>): void {
		this.order = [...order];
	}

	/**
	 * 在指定调度前插入新调度
	 */
	insertBefore(target: ScheduleLabel, newSchedule: ScheduleLabel): void {
		const index = this.order.indexOf(target);
		if (index !== -1) {
			// 在指定位置插入新调度
			const newOrder: Array<ScheduleLabel> = [];
			for (let i = 0; i < this.order.size(); i++) {
				if (i === index) {
					newOrder.push(newSchedule);
				}
				newOrder.push(this.order[i]);
			}
			this.order = newOrder;
		}
	}

	/**
	 * 在指定调度后插入新调度
	 */
	insertAfter(target: ScheduleLabel, newSchedule: ScheduleLabel): void {
		const index = this.order.indexOf(target);
		if (index !== -1) {
			// 在指定位置后插入新调度
			const newOrder: Array<ScheduleLabel> = [];
			for (let i = 0; i < this.order.size(); i++) {
				newOrder.push(this.order[i]);
				if (i === index) {
					newOrder.push(newSchedule);
				}
			}
			this.order = newOrder;
		}
	}
}

/**
 * 运行主调度序列
 * @param world - Matter World 实例
 * @param scheduleOrder - 调度顺序管理器
 * @param runner - 调度执行函数
 */
export function runMainSchedule(
	world: import("@rbxts/matter").World,
	scheduleOrder: MainScheduleOrder,
	runner: (label: ScheduleLabel) => void,
): void {
	for (const scheduleLabel of scheduleOrder.getOrder()) {
		runner(scheduleLabel);
	}
}
