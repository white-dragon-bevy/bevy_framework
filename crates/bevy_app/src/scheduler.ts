/**
 * Bevy调度系统实现
 * 对应 Rust bevy_ecs 的 Schedule 相关类型
 */

import { World } from "@rbxts/matter";
import { ScheduleLabel, SystemFunction } from "./types";

/**
 * 系统集合接口
 * 对应 Rust 的 SystemSet trait
 */
export interface SystemSet {
	readonly __brand: "SystemSet";
	readonly name: string;
}

/**
 * 创建系统集合
 */
export function createSystemSet(name: string): SystemSet {
	return { __brand: "SystemSet", name } as SystemSet;
}

/**
 * 系统配置接口
 */
export interface SystemConfig {
	system: SystemFunction;
	runIf?: (world: World) => boolean;
	before?: SystemSet[];
	after?: SystemSet[];
	inSet?: SystemSet;
}

/**
 * 调度类 - 管理系统的执行顺序和配置
 * 对应 Rust 的 Schedule struct
 */
export class Schedule {
	private systems: SystemConfig[] = [];
	private label: ScheduleLabel;

	constructor(label: ScheduleLabel) {
		this.label = label;
	}

	/**
	 * 获取调度标签
	 */
	getLabel(): ScheduleLabel {
		return this.label;
	}

	/**
	 * 添加系统
	 */
	addSystem(system: SystemFunction, config?: Partial<Omit<SystemConfig, "system">>): this {
		const systemConfig: SystemConfig = {
			system,
			...config,
		};
		this.systems.push(systemConfig);
		return this;
	}

	/**
	 * 添加多个系统
	 */
	addSystems(...systems: SystemFunction[]): this {
		for (const system of systems) {
			this.addSystem(system);
		}
		return this;
	}

	/**
	 * 运行调度中的所有系统
	 */
	run(world: World, deltaTime?: number): void {
		// 简化的系统执行逻辑
		// 实际的Bevy调度器会处理依赖关系和并行执行
		for (const config of this.systems) {
			// 检查运行条件
			if (config.runIf && !config.runIf(world)) {
				continue;
			}

			try {
				config.system(world, deltaTime);
			} catch (error) {
				warn(`System execution failed: ${error}`);
			}
		}
	}

	/**
	 * 获取所有系统配置
	 */
	getSystems(): readonly SystemConfig[] {
		return this.systems;
	}

	/**
	 * 清空所有系统
	 */
	clear(): this {
		this.systems = [];
		return this;
	}

	/**
	 * 配置系统集合
	 */
	configureSets(...sets: SystemSet[]): this {
		// TODO: 实现系统集合配置逻辑
		return this;
	}
}

/**
 * 调度器 - 管理多个调度的执行
 * 对应 Rust 的 Schedules resource
 */
export class Scheduler {
	private schedules = new Map<string, Schedule>();

	/**
	 * 添加调度
	 */
	addSchedule(schedule: Schedule): void {
		this.schedules.set(schedule.getLabel().name, schedule);
	}

	/**
	 * 初始化空调度
	 */
	initSchedule(label: ScheduleLabel): void {
		if (!this.schedules.has(label.name)) {
			this.schedules.set(label.name, new Schedule(label));
		}
	}

	/**
	 * 获取调度
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		return this.schedules.get(label.name);
	}

	/**
	 * 运行指定调度
	 */
	runSchedule(label: ScheduleLabel, world: World, deltaTime?: number): void {
		const schedule = this.getSchedule(label);
		if (schedule) {
			schedule.run(world, deltaTime);
		} else {
			warn(`Schedule "${label.name}" not found`);
		}
	}

	/**
	 * 添加系统到指定调度
	 */
	addSystem(scheduleLabel: ScheduleLabel, system: SystemFunction): void {
		let schedule = this.getSchedule(scheduleLabel);
		if (!schedule) {
			this.initSchedule(scheduleLabel);
			schedule = this.getSchedule(scheduleLabel)!;
		}
		schedule.addSystem(system);
	}

	/**
	 * 编辑调度
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): void {
		let schedule = this.getSchedule(label);
		if (!schedule) {
			this.initSchedule(label);
			schedule = this.getSchedule(label)!;
		}
		editor(schedule);
	}

	/**
	 * 获取所有调度标签
	 */
	getScheduleLabels(): ScheduleLabel[] {
		return [...this.schedules.keys()].map(name => ({ __brand: "ScheduleLabel", name } as ScheduleLabel));
	}

	/**
	 * 移除调度
	 */
	removeSchedule(label: ScheduleLabel): boolean {
		return this.schedules.delete(label.name);
	}

	/**
	 * 检查调度是否存在
	 */
	hasSchedule(label: ScheduleLabel): boolean {
		return this.schedules.has(label.name);
	}
}

/**
 * 系统构建器 - 用于配置系统的执行条件和依赖关系
 */
export class SystemBuilder {
	private config: Partial<SystemConfig> = {};

	constructor(private system: SystemFunction) {}

	/**
	 * 设置运行条件
	 */
	runIf(condition: (world: World) => boolean): this {
		this.config.runIf = condition;
		return this;
	}

	/**
	 * 设置在指定系统集合之前运行
	 */
	before(...sets: SystemSet[]): this {
		this.config.before = [...(this.config.before || []), ...sets];
		return this;
	}

	/**
	 * 设置在指定系统集合之后运行
	 */
	after(...sets: SystemSet[]): this {
		this.config.after = [...(this.config.after || []), ...sets];
		return this;
	}

	/**
	 * 添加到系统集合中
	 */
	inSet(set: SystemSet): this {
		this.config.inSet = set;
		return this;
	}

	/**
	 * 构建系统配置
	 */
	build(): SystemConfig {
		return {
			system: this.system,
			...this.config,
		};
	}
}

/**
 * 创建系统构建器的便捷函数
 */
export function system(systemFn: SystemFunction): SystemBuilder {
	return new SystemBuilder(systemFn);
}

/**
 * 运行条件构建器
 */
export namespace RunConditions {
	/**
	 * 始终运行
	 */
	export function always(): (world: World) => boolean {
		return () => true;
	}

	/**
	 * 从不运行
	 */
	export function never(): (world: World) => boolean {
		return () => false;
	}

	/**
	 * 资源存在时运行
	 */
	export function resourceExists<T extends object>(resourceType: new () => T): (world: World) => boolean {
		return (world: World) => {
			// 这里需要根据Matter的API来检查资源是否存在
			// 暂时返回true
			return true;
		};
	}

	/**
	 * 资源发生变化时运行
	 */
	export function resourceChanged<T extends object>(resourceType: new () => T): (world: World) => boolean {
		return (world: World) => {
			// 这里需要根据Matter的API来检查资源是否发生变化
			// 暂时返回true
			return true;
		};
	}
}