/**
 * Bevy应用层调度管理器
 * 提供高层的调度组织和管理 API
 */

import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { ScheduleLabel, SystemFunction } from "./types";
import { BevyEcsAdapter } from "../bevy_ecs/bevy-ecs-adapter";
import { BevySchedule, getDefaultScheduleEventMap } from "./main-schedule";
import { Schedules } from "../bevy_ecs/schedules";
import {
	EnhancedSchedule,
	system,
	SystemSet as EcsSystemSet
} from "../bevy_ecs/enhanced-schedule";
import { SystemConfigBuilder } from "../bevy_ecs/schedule-config";
import { SingletonManager, CommandBuffer } from "../bevy_ecs";
import { LogConfig } from "./log-config";

// 重新导出 LogConfig 以便向后兼容
export { LogConfig } from "./log-config";

// 重新导出 bevy_ecs 的系统集和配置构建器
export { SystemSet as EcsSystemSet, system, configureSet, chain } from "../bevy_ecs/enhanced-schedule";
export type { SystemConfigBuilder, SystemSetConfigBuilder, RunCondition } from "../bevy_ecs/enhanced-schedule";

// 为向后兼容定义 SystemSet 类型
export type SystemSet = EcsSystemSet;

/**
 * Schedule 包装类 - 为向后兼容提供
 * 内部使用 EnhancedSchedule
 */
export class Schedule {
	private enhancedSchedule: EnhancedSchedule;
	private label: ScheduleLabel;

	constructor(label: ScheduleLabel, options?: { suppressAmbiguityWarnings?: boolean }) {
		this.label = label;
		this.enhancedSchedule = new EnhancedSchedule(label.name, options);
	}

	getLabel(): ScheduleLabel {
		return this.label;
	}

	addSystem(config: SystemFunction | SystemConfig | SystemConfigBuilder): this {
		// 兼容旧的 API
		if (typeIs(config, "function")) {
			// 包装 App 层的系统函数以匹配 ECS 层的签名
			const wrappedSystem = (world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer) => {
				config(world, deltaTime);
			};
			this.enhancedSchedule.addSystem(system(wrappedSystem));
		} else if ("getConfig" in config) {
			// SystemConfigBuilder
			this.enhancedSchedule.addSystem(config as SystemConfigBuilder);
		} else if ("system" in config) {
			// SystemConfig (旧格式)
			const oldConfig = config as SystemConfig;
			// 包装系统函数
			const wrappedSystem = (world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer) => {
				oldConfig.system(world, deltaTime);
			};
			this.enhancedSchedule.addSystem(system(wrappedSystem));
		}
		return this;
	}

	addSystems(configs: (SystemFunction | SystemConfig | SystemConfigBuilder)[]): this {
		for (const config of configs) {
			this.addSystem(config);
		}
		return this;
	}

	clear(): void {
		this.enhancedSchedule.clear();
	}

	getSystems(): readonly SystemConfig[] {
		// 将 EnhancedSchedule 的系统转换为兼容格式
		const systems = this.enhancedSchedule.getSortedSystems();
		return systems.map(s => ({
			system: ((world: World, deltaTime?: number) => {
				// 包装 ECS 系统函数以匹配 App 层的签名
				const res = {} as SingletonManager;
				const cmd = new CommandBuffer();
				s.system(world, deltaTime ?? 0, res, cmd);
			}) as SystemFunction,
			runIf: undefined,
			before: [],
			after: [],
			inSet: undefined,
		}));
	}

	run(world: World, deltaTime: number, resources?: SingletonManager, commands?: CommandBuffer): void {
		const res = resources || ({} as SingletonManager);
		const cmd = commands || new CommandBuffer();
		this.enhancedSchedule.run(world, deltaTime, res, cmd);
	}

	/**
	 * 设置是否抑制模糊性警告
	 */
	setSuppressAmbiguityWarnings(suppress: boolean): void {
		this.enhancedSchedule.setSuppressAmbiguityWarnings(suppress);
	}
}

// 为向后兼容导出 createSystemSet
export function createSystemSet(name: string): SystemSet {
	return { __brand: "SystemSet" as const, name };
}

// 为向后兼容导出 SystemConfig 类型
export interface SystemConfig {
	system: SystemFunction;
	runIf?: (world: World) => boolean;
	before?: SystemSet[];
	after?: SystemSet[];
	inSet?: SystemSet;
}

/**
 * 调度器类 - 应用层调度管理
 * 管理多个调度并协调它们的执行
 * 使用 EnhancedSchedule 配置，BevyEcsAdapter + Loop.luau 执行
 */
export class Scheduler {
	private schedules: Schedules;
	private adapter?: BevyEcsAdapter;
	private world?: World;

	constructor(world?: World) {
		this.world = world;
		this.schedules = new Schedules();

		// 如果提供了 world，创建适配器
		if (world) {
			this.adapter = new BevyEcsAdapter(world);
			// 设置 Schedules 使用 Loop.luau 作为执行引擎
			this.schedules.setAdapter(this.adapter);

			// 配置调度映射
			const scheduleMap = getDefaultScheduleEventMap();
			const eventMap: { [key: string]: RBXScriptSignal } = {};
			for (const [schedule, event] of scheduleMap) {
				eventMap[schedule] = event;
			}
			this.adapter.configureSchedules(eventMap);
		}
	}

	/**
	 * 设置底层适配器（用于延迟初始化）
	 */
	setAdapter(adapter: BevyEcsAdapter): void {
		this.adapter = adapter;
		this.schedules.setAdapter(adapter);

		// 配置调度映射
		const scheduleMap = getDefaultScheduleEventMap();
		const eventMap: { [key: string]: RBXScriptSignal } = {};
		for (const [schedule, event] of scheduleMap) {
			eventMap[schedule] = event;
		}
		adapter.configureSchedules(eventMap);
	}

	/**
	 * 获取底层适配器
	 */
	getAdapter(): BevyEcsAdapter | undefined {
		return this.adapter;
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
	addSystem(label: ScheduleLabel, systemFn: SystemFunction): void {
		const schedule = this.schedules.getOrCreateSchedule(label.name);
		// 使用 EnhancedSchedule 的链式 API
		schedule.addSystem(system((world, deltaTime, resources, commands) => {
			systemFn(world, deltaTime);
		}));
	}

	/**
	 * 批量添加系统
	 */
	addSystems(label: ScheduleLabel, ...systems: SystemFunction[]): void {
		const schedule = this.schedules.getOrCreateSchedule(label.name);
		for (const systemFn of systems) {
			schedule.addSystem(system((world, deltaTime, resources, commands) => {
				systemFn(world, deltaTime);
			}));
		}
	}

	/**
	 * 添加调度
	 */
	addSchedule(label: ScheduleLabel): void {
		this.schedules.addSchedule(label.name);
	}

	/**
	 * 获取调度
	 */
	getSchedule(label: ScheduleLabel): EnhancedSchedule | undefined {
		return this.schedules.getSchedule(label.name);
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
			const resources = {} as SingletonManager;
			const commands = new CommandBuffer();
			this.schedules.runSchedule(label.name, world, deltaTime, resources, commands);
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
	editSchedule(label: ScheduleLabel, editor: (schedule: EnhancedSchedule) => void): void {
		const schedule = this.schedules.getOrCreateSchedule(label.name);
		editor(schedule);
	}

	/**
	 * 启动调度器（开始监听事件）
	 */
	start(events?: { [key: string]: RBXScriptSignal }): void {
		if (!this.adapter) {
			warn("[Scheduler] No adapter set, cannot start");
			return;
		}
		if (!events) {
			events = {};
			const scheduleMap = getDefaultScheduleEventMap();
			for (const [schedule, event] of scheduleMap) {
				events[schedule] = event;
			}
		}
		this.adapter.start(events);
	}

	/**
	 * 停止调度器
	 */
	stop(): void {
		if (this.adapter) {
			this.adapter.stop();
		}
	}

	/**
	 * 运行一次所有调度（用于测试或手动控制）
	 */
	runOnce(deltaTime: number = 0.016): void {
		if (this.adapter) {
			this.adapter.runOnce(deltaTime);
		}
	}
}