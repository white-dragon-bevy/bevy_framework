/**
 * Bevy调度系统兼容层
 * 提供与原 scheduler.ts 的兼容接口，实际功能由 bevy_ecs 的 BevyEcsAdapter 提供
 */

import { World } from "@rbxts/matter";
import { ScheduleLabel, SystemFunction } from "./types";
import { BevyEcsAdapter, BevySchedule } from "../bevy_ecs/bevy-ecs-adapter";

/**
 * 系统集合接口
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
 * 这是一个兼容层，实际调度由 Loop.luau 处理
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
	 * 添加系统到调度
	 */
	addSystem(config: SystemConfig): this {
		this.systems.push(config);
		return this;
	}

	/**
	 * 添加多个系统
	 */
	addSystems(configs: SystemConfig[]): this {
		for (const config of configs) {
			this.systems.push(config);
		}
		return this;
	}

	/**
	 * 运行调度中的所有系统
	 */
	run(world: World): void {
		for (const config of this.systems) {
			// 检查运行条件
			if (config.runIf && !config.runIf(world)) {
				continue;
			}

			// 执行系统
			try {
				config.system(world);
			} catch (error) {
				warn(`[Schedule] System error: ${error}`);
			}
		}
	}

	/**
	 * 获取系统列表
	 */
	getSystems(): readonly SystemConfig[] {
		return this.systems;
	}

	/**
	 * 清空系统
	 */
	clear(): void {
		this.systems = [];
	}
}

/**
 * 调度器类 - 管理多个调度
 * 这是一个兼容层，实际功能由 BevyEcsAdapter 提供
 */
export class Scheduler {
	private schedules = new Map<ScheduleLabel, Schedule>();
	private adapter?: BevyEcsAdapter;

	/**
	 * 设置底层适配器
	 */
	setAdapter(adapter: BevyEcsAdapter): void {
		this.adapter = adapter;
	}

	/**
	 * 添加系统到调度
	 */
	addSystem(label: ScheduleLabel, system: SystemFunction): void {
		let schedule = this.schedules.get(label);
		if (!schedule) {
			schedule = new Schedule(label);
			this.schedules.set(label, schedule);
		}
		schedule.addSystem({ system });
	}

	/**
	 * 添加调度
	 */
	addSchedule(label: ScheduleLabel, schedule?: Schedule): void {
		if (!schedule) {
			schedule = new Schedule(label);
		}
		this.schedules.set(label, schedule);

		// 如果有适配器，将系统添加到适配器
		if (this.adapter) {
			const systems = schedule.getSystems();
			for (const config of systems) {
				this.adapter.addSystem({
					name: `${label}_system`,
					system: (world) => config.system(world),
					schedule: this.mapLabelToSchedule(label),
					runCondition: config.runIf,
				});
			}
		}
	}

	/**
	 * 获取调度
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		return this.schedules.get(label);
	}

	/**
	 * 运行特定调度
	 */
	runSchedule(label: ScheduleLabel, world: World): void {
		const schedule = this.schedules.get(label);
		if (schedule) {
			schedule.run(world);
		}
	}

	/**
	 * 初始化调度
	 */
	initSchedule(label: ScheduleLabel): void {
		if (!this.schedules.has(label)) {
			this.addSchedule(label);
		}
	}

	/**
	 * 编辑调度
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): void {
		let schedule = this.schedules.get(label);
		if (!schedule) {
			schedule = new Schedule(label);
			this.schedules.set(label, schedule);
		}
		editor(schedule);
	}

	/**
	 * 映射标签到 Bevy 调度阶段
	 */
	private mapLabelToSchedule(label: ScheduleLabel): BevySchedule {
		const mapping: { [key: string]: BevySchedule } = {
			First: BevySchedule.First,
			PreStartup: BevySchedule.PreStartup,
			Startup: BevySchedule.Startup,
			PostStartup: BevySchedule.PostStartup,
			PreUpdate: BevySchedule.PreUpdate,
			Update: BevySchedule.Update,
			PostUpdate: BevySchedule.PostUpdate,
			Last: BevySchedule.Last,
			Main: BevySchedule.Update,
		};

		return mapping[label.name] || BevySchedule.Update;
	}
}