/**
 * Bevy ECS 增强调度系统
 * 集成链式配置、依赖图和高级调度功能
 */

import { World } from "@rbxts/matter";
import { SingletonManager } from "./resource";
import { CommandBuffer } from "./command-buffer";
import { SystemFunction } from "./schedules";
import {
	SystemSet,
	systemSet,
	SystemConfig,
	SystemSetConfig,
	SystemConfigBuilder,
	SystemSetConfigBuilder,
	system,
	configureSet,
	chain,
	RunCondition,
} from "./schedule-config";
import { ScheduleGraph } from "./schedule-graph";

/**
 * 增强的单个调度实例
 * 支持系统集、before/after依赖、链式配置等高级功能
 */
export class EnhancedSchedule {
	private label: string;
	private graph: ScheduleGraph;
	private systemConfigs: SystemConfig[] = [];
	private setConfigs: SystemSetConfig[] = [];
	private isDirty = true;
	private sortedSystems: SystemConfig[] = [];
	private suppressAmbiguityWarnings = false;

	constructor(label: string, options?: { suppressAmbiguityWarnings?: boolean }) {
		this.label = label;
		this.graph = new ScheduleGraph();
		this.suppressAmbiguityWarnings = options?.suppressAmbiguityWarnings ?? false;
	}

	/**
	 * 获取调度标签
	 */
	getLabel(): string {
		return this.label;
	}

	/**
	 * 添加系统（支持链式配置）
	 */
	addSystem(builder: SystemConfigBuilder | SystemFunction): EnhancedSchedule {
		let config: SystemConfig;

		if (typeIs(builder, "function")) {
			// 直接传入函数，创建默认配置
			config = system(builder).getConfig() as SystemConfig;
		} else {
			// 使用构建器
			config = builder.getConfig() as SystemConfig;
		}

		// 设置默认名称
		if (!config.name) {
			config.name = `${this.label}_system_${this.systemConfigs.size()}`;
		}

		this.systemConfigs.push(config);
		this.graph.addNode(config);
		this.isDirty = true;

		return this;
	}

	/**
	 * 批量添加系统
	 */
	addSystems(...builders: Array<SystemConfigBuilder | SystemFunction>): EnhancedSchedule {
		for (const builder of builders) {
			this.addSystem(builder);
		}
		return this;
	}

	/**
	 * 配置系统集
	 */
	configureSet(builder: SystemSetConfigBuilder | SystemSet): EnhancedSchedule {
		let config: SystemSetConfig;

		if ("__brand" in builder) {
			// 直接传入 SystemSet
			config = configureSet(builder).getConfig() as SystemSetConfig;
		} else {
			// 使用构建器
			config = builder.getConfig() as SystemSetConfig;
		}

		this.setConfigs.push(config);
		this.graph.addNode(config);
		this.isDirty = true;

		return this;
	}

	/**
	 * 批量配置系统集
	 */
	configureSets(...builders: Array<SystemSetConfigBuilder | SystemSet>): EnhancedSchedule {
		for (const builder of builders) {
			this.configureSet(builder);
		}
		return this;
	}

	/**
	 * 添加系统集层级关系
	 */
	addSetHierarchy(child: SystemSet, parent: SystemSet): EnhancedSchedule {
		this.graph.addSetHierarchy(child, parent);
		this.isDirty = true;
		return this;
	}

	/**
	 * 构建并验证调度图
	 */
	private rebuild(): void {
		if (!this.isDirty) return;

		// 构建依赖边
		this.graph.buildEdges();

		// 执行拓扑排序
		this.sortedSystems = this.graph.getSystemExecutionOrder();

		// 检测模糊性冲突（仅在未禁用时警告）
		if (!this.suppressAmbiguityWarnings) {
			const ambiguities = this.graph.detectAmbiguities();
			if (ambiguities.size() > 0) {
				warn(`[EnhancedSchedule] Found ${ambiguities.size()} ambiguous system pairs in schedule "${this.label}"`);
				for (const [id1, id2] of ambiguities) {
					const node1 = this.graph.getNodeInfo(id1);
					const node2 = this.graph.getNodeInfo(id2);
					if (node1 && node2) {
						const name1 = (node1.config as SystemConfig).name || `system_${id1}`;
						const name2 = (node2.config as SystemConfig).name || `system_${id2}`;
						warn(`  - "${name1}" and "${name2}" have ambiguous execution order`);
					}
				}
			}
		}

		this.isDirty = false;
	}

	/**
	 * 运行调度中的所有系统
	 */
	run(world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer): void {
		this.rebuild();

		// 执行系统集的运行条件
		const setConditions = new Map<string, boolean>();
		for (const setConfig of this.setConfigs) {
			const shouldRun = this.checkConditions(setConfig.conditions, world, resources);
			setConditions.set(setConfig.set.name, shouldRun);
		}

		// 按拓扑排序顺序执行系统
		for (const config of this.sortedSystems) {
			// 检查系统自身的运行条件
			if (!this.checkConditions(config.conditions, world, resources)) {
				continue;
			}

			// 检查系统所属系统集的运行条件
			let shouldRun = true;
			for (const set of config.graphInfo.hierarchy) {
				const setResult = setConditions.get(set.name);
				if (setResult === false) {
					shouldRun = false;
					break;
				}
			}

			if (!shouldRun) continue;

			try {
				config.system(world, deltaTime, resources, commands);
			} catch (error) {
				warn(`[EnhancedSchedule] System "${config.name}" error: ${error}`);
			}
		}

		// 刷新命令缓冲
		commands.flush(world);
	}

	/**
	 * 检查运行条件
	 */
	private checkConditions(conditions: RunCondition[], world: World, resources: SingletonManager): boolean {
		for (const condition of conditions) {
			if (!condition(world, resources)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 获取系统数量
	 */
	getSystemCount(): number {
		return this.systemConfigs.size();
	}

	/**
	 * 设置是否抑制模糊性警告
	 */
	setSuppressAmbiguityWarnings(suppress: boolean): void {
		this.suppressAmbiguityWarnings = suppress;
	}

	/**
	 * 获取系统集数量
	 */
	getSetCount(): number {
		return this.setConfigs.size();
	}

	/**
	 * 清空所有系统和配置
	 */
	clear(): void {
		this.systemConfigs = [];
		this.setConfigs = [];
		this.sortedSystems = [];
		this.graph = new ScheduleGraph();
		this.isDirty = true;
	}

	/**
	 * 获取排序后的系统列表（用于调试）
	 */
	getSortedSystems(): readonly SystemConfig[] {
		this.rebuild();
		return this.sortedSystems;
	}
}

/**
 * 常用的系统集定义
 */
export const CoreSet = {
	/** 第一个执行的系统集 */
	First: systemSet("First"),
	/** 启动前系统集 */
	PreStartup: systemSet("PreStartup"),
	/** 启动系统集 */
	Startup: systemSet("Startup"),
	/** 启动后系统集 */
	PostStartup: systemSet("PostStartup"),
	/** 更新前系统集 */
	PreUpdate: systemSet("PreUpdate"),
	/** 更新系统集 */
	Update: systemSet("Update"),
	/** 更新后系统集 */
	PostUpdate: systemSet("PostUpdate"),
	/** 最后执行的系统集 */
	Last: systemSet("Last"),
	/** 固定更新系统集 */
	FixedUpdate: systemSet("FixedUpdate"),
} as const;

/**
 * 状态相关的系统集
 */
export const StateTransitionSet = {
	/** 进入状态前 */
	EnterPre: systemSet("EnterPre"),
	/** 进入状态 */
	Enter: systemSet("Enter"),
	/** 进入状态后 */
	EnterPost: systemSet("EnterPost"),
	/** 退出状态前 */
	ExitPre: systemSet("ExitPre"),
	/** 退出状态 */
	Exit: systemSet("Exit"),
	/** 退出状态后 */
	ExitPost: systemSet("ExitPost"),
} as const;

/**
 * 创建一个状态条件
 */
export function inState<T>(stateName: string): RunCondition {
	return (world: World, resources: SingletonManager) => {
		// TODO: 实现状态检查逻辑
		return true;
	};
}

/**
 * 创建一个资源存在条件
 */
export function resourceExists<T>(resourceType: string): RunCondition {
	return (world: World, resources: SingletonManager) => {
		// TODO: 实现资源检查逻辑
		// 暂时返回 true，需要根据实际资源类型实现
		return true;
	};
}

/**
 * 创建一个资源变更条件
 */
export function resourceChanged<T>(resourceType: string): RunCondition {
	let lastValue: any;
	return (world: World, resources: SingletonManager) => {
		// TODO: 实现资源变更检查逻辑
		// 暂时返回 false，需要根据实际资源类型实现
		return false;
	};
}

// 导出配置工具
export { system, configureSet, chain, systemSet, SystemSet } from "./schedule-config";
export type { SystemConfigBuilder, SystemSetConfigBuilder, RunCondition } from "./schedule-config";