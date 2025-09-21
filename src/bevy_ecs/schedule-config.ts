/**
 * Bevy ECS 调度配置系统
 * 提供链式调用 API 来配置系统和系统集
 */

import { World } from "@rbxts/matter";
import { SingletonManager } from "./resource";
import { CommandBuffer } from "./command-buffer";
import { SystemFunction } from "./schedules";

/**
 * 依赖类型
 */
export enum DependencyKind {
	/** 在指定节点之前运行 */
	Before = "before",
	/** 在指定节点之后运行 */
	After = "after",
}

/**
 * 系统集标识符
 */
export interface SystemSet {
	readonly __brand: "SystemSet";
	readonly name: string;
}

/**
 * 创建系统集
 */
export function systemSet(name: string): SystemSet {
	return { __brand: "SystemSet", name };
}

/**
 * 依赖关系
 */
export interface Dependency {
	kind: DependencyKind;
	target: SystemSet | string; // 可以是 SystemSet 或系统名称
}

/**
 * 模糊性处理
 */
export type Ambiguity =
	| { type: "check" }
	| { type: "ignoreWithSet"; sets: SystemSet[] }
	| { type: "ignoreAll" };

/**
 * 图信息 - 存储节点在调度图中的元数据
 */
export interface GraphInfo {
	/** 节点所属的系统集（层级结构） */
	hierarchy: SystemSet[];
	/** 节点的依赖关系 */
	dependencies: Dependency[];
	/** 模糊性处理配置 */
	ambiguousWidth: Ambiguity;
}

/**
 * 运行条件函数
 */
export type RunCondition = (world: World, resources: SingletonManager) => boolean;

/**
 * 系统配置
 */
export interface SystemConfig {
	/** 系统函数 */
	system: SystemFunction;
	/** 系统名称 */
	name?: string;
	/** 图信息 */
	graphInfo: GraphInfo;
	/** 运行条件 */
	conditions: RunCondition[];
}

/**
 * 系统集配置
 */
export interface SystemSetConfig {
	/** 系统集 */
	set: SystemSet;
	/** 图信息 */
	graphInfo: GraphInfo;
	/** 运行条件 */
	conditions: RunCondition[];
}

/**
 * 可调度节点配置
 */
export type NodeConfig = SystemConfig | SystemSetConfig;

/**
 * 判断是否为系统配置
 */
export function isSystemConfig(config: NodeConfig): config is SystemConfig {
	return "system" in config;
}

/**
 * 判断是否为系统集配置
 */
export function isSystemSetConfig(config: NodeConfig): config is SystemSetConfig {
	return "set" in config;
}

/**
 * 链式配置构建器基类
 */
export abstract class ConfigBuilder<T extends ConfigBuilder<T>> {
	protected config: NodeConfig;

	constructor(config: NodeConfig) {
		this.config = config;
	}

	/**
	 * 添加到系统集
	 */
	inSet(set: SystemSet): T {
		this.config.graphInfo.hierarchy.push(set);
		return this as unknown as T;
	}

	/**
	 * 在指定目标之前运行
	 */
	before(target: SystemSet | string): T {
		this.config.graphInfo.dependencies.push({
			kind: DependencyKind.Before,
			target,
		});
		return this as unknown as T;
	}

	/**
	 * 在指定目标之后运行
	 */
	after(target: SystemSet | string): T {
		this.config.graphInfo.dependencies.push({
			kind: DependencyKind.After,
			target,
		});
		return this as unknown as T;
	}

	/**
	 * 添加运行条件
	 */
	runIf(condition: RunCondition): T {
		this.config.conditions.push(condition);
		return this as unknown as T;
	}

	/**
	 * 忽略与指定系统集的模糊性冲突
	 */
	ambiguousWith(set: SystemSet): T {
		const ambiguity = this.config.graphInfo.ambiguousWidth;
		if (ambiguity.type === "check") {
			this.config.graphInfo.ambiguousWidth = {
				type: "ignoreWithSet",
				sets: [set],
			};
		} else if (ambiguity.type === "ignoreWithSet") {
			ambiguity.sets.push(set);
		}
		return this as unknown as T;
	}

	/**
	 * 忽略所有模糊性冲突
	 */
	ambiguousWithAll(): T {
		this.config.graphInfo.ambiguousWidth = { type: "ignoreAll" };
		return this as unknown as T;
	}

	/**
	 * 获取配置
	 */
	getConfig(): NodeConfig {
		return this.config;
	}
}

/**
 * 系统配置构建器
 */
export class SystemConfigBuilder extends ConfigBuilder<SystemConfigBuilder> {
	constructor(system: SystemFunction, name?: string) {
		super({
			system,
			name,
			graphInfo: {
				hierarchy: [],
				dependencies: [],
				ambiguousWidth: { type: "check" },
			},
			conditions: [],
		});
	}

	/**
	 * 设置系统名称
	 */
	withName(name: string): SystemConfigBuilder {
		(this.config as SystemConfig).name = name;
		return this;
	}
}

/**
 * 系统集配置构建器
 */
export class SystemSetConfigBuilder extends ConfigBuilder<SystemSetConfigBuilder> {
	constructor(set: SystemSet) {
		super({
			set,
			graphInfo: {
				hierarchy: [],
				dependencies: [],
				ambiguousWidth: { type: "check" },
			},
			conditions: [],
		});
	}
}

/**
 * 创建系统配置构建器
 */
export function system(fn: SystemFunction, name?: string): SystemConfigBuilder {
	return new SystemConfigBuilder(fn, name);
}

/**
 * 创建系统集配置构建器
 */
export function configureSet(set: SystemSet): SystemSetConfigBuilder {
	return new SystemSetConfigBuilder(set);
}

/**
 * 链式调用辅助类 - 用于批量配置多个系统
 */
export class SystemChain {
	private configs: SystemConfigBuilder[] = [];

	constructor(systems: SystemFunction[]) {
		this.configs = systems.map((sys, i) => new SystemConfigBuilder(sys, `chain_${i}`));
	}

	/**
	 * 将所有系统添加到指定系统集
	 */
	inSet(set: SystemSet): SystemChain {
		for (const config of this.configs) {
			config.inSet(set);
		}
		return this;
	}

	/**
	 * 按顺序链接系统（每个系统依赖前一个）
	 */
	chain(): SystemChain {
		for (let i = 1; i < this.configs.size(); i++) {
			const prev = this.configs[i - 1];
			const curr = this.configs[i];
			const prevConfig = prev.getConfig() as SystemConfig;
			curr.after(prevConfig.name || `chain_${i - 1}`);
		}
		return this;
	}

	/**
	 * 所有系统在指定目标之前运行
	 */
	before(target: SystemSet | string): SystemChain {
		for (const config of this.configs) {
			config.before(target);
		}
		return this;
	}

	/**
	 * 所有系统在指定目标之后运行
	 */
	after(target: SystemSet | string): SystemChain {
		for (const config of this.configs) {
			config.after(target);
		}
		return this;
	}

	/**
	 * 为所有系统添加运行条件
	 */
	runIf(condition: RunCondition): SystemChain {
		for (const config of this.configs) {
			config.runIf(condition);
		}
		return this;
	}

	/**
	 * 获取所有配置
	 */
	getConfigs(): SystemConfig[] {
		return this.configs.map(c => c.getConfig() as SystemConfig);
	}
}

/**
 * 创建系统链
 */
export function chain(...systems: SystemFunction[]): SystemChain {
	return new SystemChain(systems);
}