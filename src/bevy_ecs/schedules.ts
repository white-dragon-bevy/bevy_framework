/**
 * Bevy ECS 调度资源管理
 * 对应 Rust bevy_ecs::schedule::Schedules
 *
 * 管理所有调度实例，作为 ECS 资源存在
 */

import { World } from "@rbxts/matter";
import { Resource } from "./resource";
import { Loop } from "./Loop";
import { CommandBuffer } from "./command-buffer";
import { SingletonManager } from "./resource";
import { LogConfig } from "../bevy_app/log-config";

/**
 * 系统函数类型
 */
export type SystemFunction = (
	world: World,
	deltaTime: number,
	resources: SingletonManager,
	commands: CommandBuffer,
) => void;

/**
 * 系统配置
 */
export interface SystemConfig {
	/** 系统名称 */
	name: string;
	/** 系统函数 */
	system: SystemFunction;
	/** 优先级（数值越小越先执行） */
	priority?: number;
	/** 依赖的其他系统 */
	dependencies?: string[];
	/** 运行条件 */
	runCondition?: (world: World, resources: SingletonManager) => boolean;
	/** 系统集名称 */
	systemSet?: string;
	/** 是否为排他性系统 */
	exclusive?: boolean;
	/** 关联的应用状态 */
	state?: string;
}

/**
 * 单个调度实例
 * 管理特定调度标签下的所有系统
 */
export class Schedule {
	private label: string;
	private systems: Map<string, SystemConfig> = new Map();
	private systemOrder: string[] = [];
	private isDirty = false;

	constructor(label: string) {
		this.label = label;
	}

	/**
	 * 获取调度标签
	 */
	getLabel(): string {
		return this.label;
	}

	/**
	 * 添加系统
	 */
	addSystem(config: SystemConfig): void {
		if (this.systems.has(config.name)) {
			warn(`[Schedule] System "${config.name}" already exists in schedule "${this.label}"`);
			return;
		}

		this.systems.set(config.name, config);
		this.systemOrder.push(config.name);
		this.isDirty = true;
	}

	/**
	 * 移除系统
	 */
	removeSystem(name: string): boolean {
		if (!this.systems.has(name)) {
			return false;
		}

		this.systems.delete(name);
		const index = this.systemOrder.indexOf(name);
		if (index !== -1) {
			this.systemOrder.remove(index);
		}
		this.isDirty = true;
		return true;
	}

	/**
	 * 获取系统
	 */
	getSystem(name: string): SystemConfig | undefined {
		return this.systems.get(name);
	}

	/**
	 * 获取所有系统
	 */
	getSystems(): readonly SystemConfig[] {
		return this.systemOrder.map((name) => this.systems.get(name)!);
	}

	/**
	 * 检查系统是否存在
	 */
	hasSystem(name: string): boolean {
		return this.systems.has(name);
	}

	/**
	 * 获取系统数量
	 */
	getSystemCount(): number {
		return this.systems.size();
	}

	/**
	 * 清空所有系统
	 */
	clear(): void {
		this.systems.clear();
		this.systemOrder = [];
		this.isDirty = false;
	}

	/**
	 * 运行调度中的所有系统（简单实现，实际执行委托给 Loop）
	 */
	run(world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer): void {
		for (const name of this.systemOrder) {
			const config = this.systems.get(name);
			if (!config) continue;

			// 检查运行条件
			if (config.runCondition && !config.runCondition(world, resources)) {
				continue;
			}

			try {
				config.system(world, deltaTime, resources, commands);
			} catch (error) {
				if (!LogConfig.silentErrors) {
					warn(`[Schedule] System "${name}" error: ${error}`);
				}
			}
		}

		// 刷新命令缓冲
		commands.flush(world);
	}

	/**
	 * 标记是否需要重新排序
	 */
	markDirty(): void {
		this.isDirty = true;
	}

	/**
	 * 检查是否需要重新排序
	 */
	needsRebuild(): boolean {
		return this.isDirty;
	}

	/**
	 * 清除脏标记
	 */
	clearDirty(): void {
		this.isDirty = false;
	}
}

/**
 * 调度集合资源
 * 对应 Rust bevy_ecs::schedule::Schedules
 */
export class Schedules implements Resource {
	readonly __brand = "Resource" as const;
	private schedules = new Map<string, Schedule>();
	private ignoredAmbiguities = new Set<string>();

	/**
	 * 添加新调度
	 */
	addSchedule(label: string): Schedule {
		if (this.schedules.has(label)) {
			return this.schedules.get(label)!;
		}

		const schedule = new Schedule(label);
		this.schedules.set(label, schedule);
		return schedule;
	}

	/**
	 * 移除调度
	 */
	removeSchedule(label: string): boolean {
		return this.schedules.delete(label);
	}

	/**
	 * 获取调度
	 */
	getSchedule(label: string): Schedule | undefined {
		return this.schedules.get(label);
	}

	/**
	 * 获取或创建调度
	 */
	getOrCreateSchedule(label: string): Schedule {
		let schedule = this.schedules.get(label);
		if (!schedule) {
			schedule = new Schedule(label);
			this.schedules.set(label, schedule);
		}
		return schedule;
	}

	/**
	 * 检查调度是否存在
	 */
	hasSchedule(label: string): boolean {
		return this.schedules.has(label);
	}

	/**
	 * 获取所有调度标签
	 */
	getScheduleLabels(): string[] {
		const labels: string[] = [];
		for (const [label] of this.schedules) {
			labels.push(label);
		}
		return labels;
	}

	/**
	 * 运行特定调度
	 */
	runSchedule(
		label: string,
		world: World,
		deltaTime: number,
		resources: SingletonManager,
		commands: CommandBuffer,
	): void {
		const schedule = this.schedules.get(label);
		if (!schedule) {
			warn(`[Schedules] Schedule "${label}" not found`);
			return;
		}

		schedule.run(world, deltaTime, resources, commands);
	}

	/**
	 * 添加忽略的歧义组件
	 */
	addIgnoredAmbiguity(componentId: string): void {
		this.ignoredAmbiguities.add(componentId);
	}

	/**
	 * 移除忽略的歧义组件
	 */
	removeIgnoredAmbiguity(componentId: string): boolean {
		return this.ignoredAmbiguities.delete(componentId);
	}

	/**
	 * 检查组件歧义是否被忽略
	 */
	isAmbiguityIgnored(componentId: string): boolean {
		return this.ignoredAmbiguities.has(componentId);
	}

	/**
	 * 清空所有调度
	 */
	clear(): void {
		this.schedules.clear();
		this.ignoredAmbiguities.clear();
	}

	/**
	 * 获取调度数量
	 */
	getScheduleCount(): number {
		return this.schedules.size();
	}
}