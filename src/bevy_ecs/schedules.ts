/**
 * Bevy ECS 调度资源管理
 * 对应 Rust bevy_ecs::schedule::Schedules
 *
 * 管理所有调度实例，作为 ECS 资源存在
 */

import { World } from "@rbxts/matter";
import { Resource } from "./resource";
import { CommandBuffer } from "./command-buffer";
import { SingletonManager } from "./resource";
import { EnhancedSchedule } from "./enhanced-schedule";
import { BevyEcsAdapter } from "./bevy-ecs-adapter";

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
 * 调度集合资源
 * 对应 Rust bevy_ecs::schedule::Schedules
 *
 * 使用 EnhancedSchedule 管理调度配置，通过 BevyEcsAdapter 执行
 */
export class Schedules implements Resource {
	readonly __brand = "Resource" as const;
	private schedules = new Map<string, EnhancedSchedule>();
	private ignoredAmbiguities = new Set<string>();
	private adapter?: BevyEcsAdapter;

	/**
	 * 设置 Loop.luau 执行适配器
	 */
	setAdapter(adapter: BevyEcsAdapter): void {
		this.adapter = adapter;
	}

	/**
	 * 添加新调度
	 */
	addSchedule(label: string): EnhancedSchedule {
		if (this.schedules.has(label)) {
			return this.schedules.get(label)!;
		}

		const schedule = new EnhancedSchedule(label, {
			suppressAmbiguityWarnings: this.ignoredAmbiguities.size() > 0
		});
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
	getSchedule(label: string): EnhancedSchedule | undefined {
		return this.schedules.get(label);
	}

	/**
	 * 获取或创建调度
	 */
	getOrCreateSchedule(label: string): EnhancedSchedule {
		let schedule = this.schedules.get(label);
		if (!schedule) {
			schedule = new EnhancedSchedule(label, {
				suppressAmbiguityWarnings: this.ignoredAmbiguities.size() > 0
			});
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
	 * 使用 EnhancedSchedule 的依赖图和 BevyEcsAdapter 的 Loop 执行
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

		// 直接通过 EnhancedSchedule 执行
		// 注意：如果需要使用 BevyEcsAdapter，系统应该在初始化时添加，而不是每次运行时添加
		schedule.run(world, deltaTime, resources, commands);
	}

	/**
	 * 添加忽略的歧义组件
	 */
	addIgnoredAmbiguity(componentId: string): void {
		this.ignoredAmbiguities.add(componentId);
		// 更新现有调度的歧义设置
		for (const [, schedule] of this.schedules) {
			schedule.setSuppressAmbiguityWarnings(true);
		}
	}

	/**
	 * 移除忽略的歧义组件
	 */
	removeIgnoredAmbiguity(componentId: string): boolean {
		const removed = this.ignoredAmbiguities.delete(componentId);
		if (removed && this.ignoredAmbiguities.size() === 0) {
			for (const [, schedule] of this.schedules) {
				schedule.setSuppressAmbiguityWarnings(false);
			}
		}
		return removed;
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