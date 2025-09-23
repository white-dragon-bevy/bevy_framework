/**
 * @fileoverview Bevy ECS 调度器管理器
 * 管理多个调度阶段，提供系统注册和执行协调功能
 */

import { BevyWorld } from "../bevy-world";
import { Loop } from "./loop";
import { Schedule } from "./schedule";
import type {
	SystemConfig,
	SystemSetConfig,
	SystemFunction,
	ScheduleLabel,
	SchedulerState,
	ScheduleGraph,
} from "./types";
import type { ResourceManager } from "../resource";
import type { CommandBuffer } from "../command-buffer";
import { BevySystem, Context } from "../types";

/**
 * 调度器管理器 - 管理多个调度阶段的执行
 *
 * Schedules 负责：
 * - 管理多个 Schedule 实例
 * - 协调不同调度阶段的执行
 * - 提供统一的系统注册接口
 * - 与 Matter Loop 集成
 */
export class Schedules {
	private readonly schedules = new Map<ScheduleLabel, Schedule>();
	private readonly loop: Loop<[BevyWorld, Context]>;
	private readonly resourceManager: ResourceManager;
	private readonly commandBuffer: CommandBuffer;
	private compiled = false;
	private runningSchedules = new Set<ScheduleLabel>();

	/**
	 * 创建调度器管理器
	 * @param world - BevyWorld 实例
	 * @param resourceManager - 资源管理器实例
	 * @param commandBuffer - 命令缓冲器实例
	 * @param deltaTime - 初始帧时间
	 */
	public constructor(world: BevyWorld, options: Omit<Context, "deltaTime">) {
		// 创建包含 deltaTime 的完整上下文
		const context: Context = {
			...options,
			deltaTime: 0, // 初始值，会在循环中更新
		};
		this.loop = new Loop(world, context);
		this.resourceManager = options.resources;
		this.commandBuffer = options.commands;
	}

	/**
	 * 获取或创建指定的调度器
	 * @param label - 调度阶段标识符
	 * @returns Schedule 实例
	 */
	public getSchedule(label: ScheduleLabel): Schedule {
		let schedule = this.schedules.get(label);
		if (!schedule) {
			schedule = new Schedule(label);
			schedule.setDependencies(this.resourceManager, this.commandBuffer);
			this.schedules.set(label, schedule);
		}
		return schedule;
	}

	/**
	 * 检查是否存在指定的调度器
	 * @param label - 调度阶段标识符
	 * @returns 是否存在该调度器
	 */
	public hasSchedule(label: ScheduleLabel): boolean {
		return this.schedules.has(label);
	}

	/**
	 * 移除指定的调度器
	 * @param label - 调度阶段标识符
	 * @returns 是否成功移除
	 */
	public removeSchedule(label: ScheduleLabel): boolean {
		this.assertNotCompiled("Cannot remove schedule after compilation");
		return this.schedules.delete(label);
	}

	/**
	 * 向指定调度器添加系统
	 * @param scheduleLabel - 调度阶段标识符
	 * @param config - 系统配置
	 * @returns 系统标识符
	 */
	public addSystemToSchedule(scheduleLabel: ScheduleLabel, config: SystemConfig): string {
		this.assertNotCompiled("Cannot add system after compilation");
		const schedule = this.getSchedule(scheduleLabel);
		return schedule.addSystem(config);
	}

	/**
	 * 批量添加系统到指定调度器
	 * @param scheduleLabel - 调度阶段标识符
	 * @param configs - 系统配置数组
	 * @returns 系统标识符数组
	 */
	public addSystemsToSchedule(scheduleLabel: ScheduleLabel, configs: Array<SystemConfig>): Array<string> {
		this.assertNotCompiled("Cannot add systems after compilation");
		const schedule = this.getSchedule(scheduleLabel);
		return configs.map((config) => schedule.addSystem(config));
	}

	/**
	 * 配置系统集
	 * @param scheduleLabel - 调度阶段标识符
	 * @param config - 系统集配置
	 */
	public configureSetInSchedule(scheduleLabel: ScheduleLabel, config: SystemSetConfig): void {
		this.assertNotCompiled("Cannot configure system set after compilation");
		const schedule = this.getSchedule(scheduleLabel);
		schedule.configureSet(config);
	}

	/**
	 * 编译所有调度器
	 *
	 * 编译过程：
	 * 1. 编译每个调度器的系统
	 * 2. 将编译后的系统注册到 Matter Loop
	 * 3. 设置调度器状态为已编译
	 */
	public compile(): void {
		if (this.compiled) {
			return;
		}

		const allSystems: Array<BevySystem> = [];

		// 编译每个调度器
		for (const [label, schedule] of this.schedules) {
			try {
				const compiledSystems = schedule.compile();
				for (const system of compiledSystems) {
					allSystems.push(system);
				}
				// Debug: Compiled schedule '${label}' with ${compiledSystems.size()} systems
			} catch (err) {
				warn(`Failed to compile schedule '${label}': ${err}`);
				throw err;
			}
		}

		// 将所有系统注册到 Matter Loop
		if (allSystems.size() > 0) {
			this.loop.scheduleSystems(allSystems);
			// Debug: Scheduled ${allSystems.size()} systems across ${this.schedules.size()} schedules
		}

		this.compiled = true;
	}

	/**
	 * 开始执行调度器
	 * @param events - 事件映射，将调度阶段映射到 Roblox 事件
	 * @returns 连接对象映射
	 */
	public begin(events: { [scheduleLabel: string]: RBXScriptSignal }): {
		[scheduleLabel: string]: RBXScriptConnection;
	} {
		if (!this.compiled) {
			this.compile();
		}

		// 配置 Bevy 调度映射
		this.loop.configureBevySchedules(events);

		// 开始执行循环
		const connections = this.loop.begin(events);

		// 标记运行中的调度器
		for (const [scheduleLabel] of this.schedules) {
			if (events[scheduleLabel]) {
				this.runningSchedules.add(scheduleLabel);
			}
		}

		return connections;
	}

	/**
	 * 停止指定调度器的执行
	 * @param connections - 连接对象映射
	 */
	public stop(connections: { [scheduleLabel: string]: RBXScriptConnection }): void {
		for (const [scheduleLabel, connection] of pairs(connections)) {
			connection.Disconnect();
			this.runningSchedules.delete(scheduleLabel as string);
		}
		const connectionCount = Object.keys(connections).size();
	}

	/**
	 * 获取所有调度器的状态
	 * @returns 调度器状态映射
	 */
	public getStates(): Map<ScheduleLabel, SchedulerState> {
		const states = new Map<ScheduleLabel, SchedulerState>();
		for (const [label, schedule] of this.schedules) {
			states.set(label, schedule.getState());
		}
		return states;
	}

	/**
	 * 获取所有调度器的图结构
	 * @returns 调度器图映射
	 */
	public getGraphs(): Map<ScheduleLabel, ScheduleGraph> {
		const graphs = new Map<ScheduleLabel, ScheduleGraph>();
		for (const [label, schedule] of this.schedules) {
			graphs.set(label, schedule.getGraph());
		}
		return graphs;
	}

	/**
	 * 获取运行中的调度器列表
	 * @returns 运行中的调度器标识符数组
	 */
	public getRunningSchedules(): Array<ScheduleLabel> {
		return [...this.runningSchedules];
	}

	/**
	 * 检查指定调度器是否正在运行
	 * @param label - 调度阶段标识符
	 * @returns 是否正在运行
	 */
	public isScheduleRunning(label: ScheduleLabel): boolean {
		return this.runningSchedules.has(label);
	}

	/**
	 * 获取调度器总体统计信息
	 * @returns 统计信息对象
	 */
	public getOverallStats(): {
		readonly totalSchedules: number;
		readonly runningSchedules: number;
		readonly totalSystems: number;
		readonly compiled: boolean;
	} {
		let totalSystems = 0;
		for (const [, schedule] of this.schedules) {
			totalSystems += schedule.getState().systemCount;
		}

		return {
			totalSchedules: this.schedules.size(),
			runningSchedules: this.runningSchedules.size(),
			totalSystems,
			compiled: this.compiled,
		};
	}

	/**
	 * 重置所有调度器
	 *
	 * 注意：这将清除所有已注册的系统和编译状态
	 */
	public reset(): void {
		// 重置所有调度器
		for (const [, schedule] of this.schedules) {
			schedule.reset();
		}

		this.schedules.clear();
		this.runningSchedules.clear();
		this.compiled = false;
	}

	/**
	 * 获取底层的 Matter Loop 实例
	 * @returns Loop 实例
	 */
	public getLoop(): Loop<[BevyWorld, Context]> {
		return this.loop;
	}

	/**
	 * 添加中间件到 Matter Loop
	 * @param middleware - 中间件函数
	 */
	public addMiddleware(middleware: (nextFn: () => void, eventName: string) => () => void): void {
		this.loop.addMiddleware(middleware);
	}

	// ==================== 便捷方法 ====================

	/**
	 * 快速添加系统到多个调度器
	 * @param systemFunction - 系统函数
	 * @param scheduleLabels - 调度阶段标识符数组
	 * @param config - 额外的系统配置
	 * @returns 系统标识符映射
	 */
	public addSystemToSchedules(
		systemFunction: SystemFunction,
		scheduleLabels: Array<ScheduleLabel>,
		config: Partial<SystemConfig> = {},
	): Map<ScheduleLabel, string> {
		const systemIds = new Map<ScheduleLabel, string>();

		for (const label of scheduleLabels) {
			const systemConfig: SystemConfig = {
				system: systemFunction,
				...config,
			};
			const systemId = this.addSystemToSchedule(label, systemConfig);
			systemIds.set(label, systemId);
		}

		return systemIds;
	}

	/**
	 * 获取所有调度器的标识符
	 * @returns 调度器标识符数组
	 */
	public getScheduleLabels(): Array<ScheduleLabel> {
		const labels: Array<ScheduleLabel> = [];
		for (const [label] of this.schedules) {
			labels.push(label);
		}
		return labels;
	}

	/**
	 * 检查是否已编译
	 * @returns 是否已编译
	 */
	public isCompiled(): boolean {
		return this.compiled;
	}

	// ==================== 私有方法 ====================

	/**
	 * 断言调度器未编译
	 * @param message - 错误消息
	 */
	private assertNotCompiled(message: string): void {
		if (this.compiled) {
			error(message);
		}
	}
}
