/**
 * Bevy应用层调度管理器
 * 提供高层的调度组织和管理 API
 */

import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { ScheduleLabel, SystemFunction } from "./types";
import { BevyEcsAdapter } from "../bevy_ecs/bevy-ecs-adapter";
import { BevySchedule, getDefaultScheduleEventMap } from "./main-schedule";
import { Schedules, SystemConfig as EcsSystemConfig } from "../bevy_ecs/schedules";
import { SingletonManager, CommandBuffer } from "../bevy_ecs";
import { LogConfig } from "./log-config";

// 重新导出 LogConfig 以便向后兼容
export { LogConfig } from "./log-config";

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
 * 调度配置包装器
 * 提供链式调用 API 来配置调度
 */
export class Schedule {
	private systems: SystemConfig[] = [];
	private label: ScheduleLabel;
	private schedules?: Schedules;

	constructor(label: ScheduleLabel, schedules?: Schedules) {
		this.label = label;
		this.schedules = schedules;
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

		// 如果有 Schedules 实例，直接添加到实际调度
		if (this.schedules) {
			const schedule = this.schedules.getOrCreateSchedule(this.label.name);
			const ecsConfig: EcsSystemConfig = {
				name: `${this.label.name}_${this.systems.size()}_system`,
				system: (world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer) => {
					config.system(world, deltaTime);
				},
				runCondition: config.runIf
					? (world: World, resources: SingletonManager) => config.runIf!(world)
					: undefined,
				systemSet: config.inSet?.name,
			};
			schedule.addSystem(ecsConfig);
		}

		return this;
	}

	/**
	 * 添加多个系统
	 */
	addSystems(configs: SystemConfig[]): this {
		for (const config of configs) {
			this.addSystem(config);
		}
		return this;
	}

	/**
	 * 运行调度中的所有系统
	 */
	run(world: World, deltaTime: number = 0, resources?: SingletonManager, commands?: CommandBuffer): void {
		if (this.schedules) {
			// 使用 Schedules 运行
			const res = resources || ({} as SingletonManager);
			const cmd = commands || new CommandBuffer();
			this.schedules.runSchedule(this.label.name, world, deltaTime, res, cmd);
		} else {
			// 直接运行系统（兼容模式）
			for (const config of this.systems) {
				if (config.runIf && !config.runIf(world)) {
					continue;
				}
				try {
					config.system(world, deltaTime);
				} catch (error) {
					if (!LogConfig.silentErrors) {
						warn(`[Schedule] System error: ${error}`);
					}
				}
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
		if (this.schedules) {
			const schedule = this.schedules.getSchedule(this.label.name);
			if (schedule) {
				schedule.clear();
			}
		}
	}
}

/**
 * 调度器类 - 应用层调度管理
 * 管理多个调度并协调它们的执行
 */
export class Scheduler {
	private schedules: Schedules;
	private adapter?: BevyEcsAdapter;
	private scheduleWrappers = new Map<ScheduleLabel, Schedule>();

	constructor() {
		this.schedules = new Schedules();
	}

	/**
	 * 设置底层适配器
	 */
	setAdapter(adapter: BevyEcsAdapter): void {
		this.adapter = adapter;

		// 配置调度映射
		const scheduleMap = getDefaultScheduleEventMap();
		const eventMap: { [key: string]: RBXScriptSignal } = {};
		for (const [schedule, event] of scheduleMap) {
			eventMap[schedule] = event;
		}
		adapter.configureSchedules(eventMap);
	}

	/**
	 * 获取 Schedules 资源
	 */
	getSchedules(): Schedules {
		return this.schedules;
	}

	/**
	 * 添加系统到调度
	 */
	addSystem(label: ScheduleLabel, system: SystemFunction): void {
		const schedule = this.schedules.getOrCreateSchedule(label.name);
		schedule.addSystem({
			name: `${label.name}_${schedule.getSystemCount()}_system`,
			system: (world, deltaTime, resources, commands) => {
				system(world, deltaTime);
			},
		});

		// 如果有适配器，同步到 Loop
		if (this.adapter) {
			this.syncToAdapter(label);
		}
	}

	/**
	 * 添加调度
	 */
	addSchedule(label: ScheduleLabel, schedule?: Schedule): void {
		if (!schedule) {
			schedule = new Schedule(label, this.schedules);
		}
		this.scheduleWrappers.set(label, schedule);
		this.schedules.addSchedule(label.name);

		// 同步到适配器
		if (this.adapter && schedule.getSystems().size() > 0) {
			this.syncToAdapter(label);
		}
	}

	/**
	 * 获取调度包装器
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		let wrapper = this.scheduleWrappers.get(label);
		if (!wrapper && this.schedules.hasSchedule(label.name)) {
			wrapper = new Schedule(label, this.schedules);
			this.scheduleWrappers.set(label, wrapper);
		}
		return wrapper;
	}

	/**
	 * 运行特定调度
	 */
	runSchedule(label: ScheduleLabel, world: World, deltaTime: number = 0): void {
		if (this.adapter) {
			const resources = this.adapter.getResources();
			const commands = this.adapter.getCommands();
			this.schedules.runSchedule(label.name, world, deltaTime, resources, commands);
		} else {
			// 无适配器时的简单运行
			const schedule = this.scheduleWrappers.get(label);
			if (schedule) {
				schedule.run(world, deltaTime);
			}
		}
	}

	/**
	 * 初始化调度
	 */
	initSchedule(label: ScheduleLabel): void {
		if (!this.schedules.hasSchedule(label.name)) {
			this.addSchedule(label);
		}
	}

	/**
	 * 编辑调度
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): void {
		let wrapper = this.getSchedule(label);
		if (!wrapper) {
			wrapper = new Schedule(label, this.schedules);
			this.scheduleWrappers.set(label, wrapper);
			this.schedules.addSchedule(label.name);
		}
		editor(wrapper);

		// 同步更改到适配器
		if (this.adapter) {
			this.syncToAdapter(label);
		}
	}

	/**
	 * 将调度同步到适配器
	 */
	private syncToAdapter(label: ScheduleLabel): void {
		if (!this.adapter) return;

		const schedule = this.schedules.getSchedule(label.name);
		if (!schedule) return;

		for (const system of schedule.getSystems()) {
			this.adapter.addSystem({
				name: system.name,
				system: system.system,
				schedule: label.name,
				runCondition: system.runCondition,
				systemSet: system.systemSet,
				exclusive: system.exclusive,
				state: system.state,
			});
		}
	}
}