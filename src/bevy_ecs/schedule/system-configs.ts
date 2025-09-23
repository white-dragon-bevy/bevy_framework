/**
 * @fileoverview Bevy ECS 系统配置 API
 * 提供链式配置方法，类似 Rust Bevy 的 IntoSystemConfigs
 */

import type { SystemFunction, RunCondition, SystemSet, SystemConfig } from "./types";
import type { World } from "@rbxts/matter";
import type { Context } from "../types";

/**
 * 系统配置元数据
 */
interface SystemMetadata {
	/** 运行条件 */
	runConditions: RunCondition[];
	/** 所属系统集 */
	inSets: SystemSet[];
	/** 在这些系统之前运行 */
	before: Array<SystemFunction | SystemSet>;
	/** 在这些系统之后运行 */
	after: Array<SystemFunction | SystemSet>;
	/** 是否为链式执行 */
	chained: boolean;
	/** 可以与这些系统集并行执行（忽略冲突） */
	ambiguousWith: SystemSet[];
}

/**
 * 系统配置项 - 单个系统或系统组
 */
export type SystemConfigItem = SystemFunction | SystemConfigs | SystemConfigs[];

/**
 * 系统配置类 - 提供链式配置 API
 */
export class SystemConfigs {
	private configs: SystemConfigItem[];
	private metadata: SystemMetadata;

	constructor(configs: SystemConfigItem | SystemConfigItem[]) {
		this.configs = typeIs(configs, "table") ? configs as SystemConfigItem[] : [configs];
		this.metadata = {
			runConditions: [],
			inSets: [],
			before: [],
			after: [],
			chained: false,
			ambiguousWith: [],
		};
	}

	/**
	 * 在指定系统或系统集之前运行
	 */
	before(target: SystemFunction | SystemSet): SystemConfigs {
		this.metadata.before.push(target);
		return this;
	}

	/**
	 * 在指定系统或系统集之后运行
	 */
	after(target: SystemFunction | SystemSet): SystemConfigs {
		this.metadata.after.push(target);
		return this;
	}

	/**
	 * 添加运行条件
	 */
	runIf(condition: RunCondition): SystemConfigs {
		this.metadata.runConditions.push(condition);
		return this;
	}

	/**
	 * 将系统添加到指定系统集
	 */
	inSet(set: SystemSet): SystemConfigs {
		this.metadata.inSets.push(set);
		return this;
	}

	/**
	 * 链式执行 - 系统按顺序依次执行
	 */
	chain(): SystemConfigs {
		this.metadata.chained = true;
		return this;
	}

	/**
	 * 允许与指定系统集并行执行（忽略冲突）
	 */
	ambiguousWith(set: SystemSet): SystemConfigs {
		this.metadata.ambiguousWith.push(set);
		return this;
	}

	/**
	 * 允许与所有系统并行执行（忽略所有冲突）
	 */
	ambiguousWithAll(): SystemConfigs {
		// 使用特殊标记表示忽略所有冲突
		this.metadata.ambiguousWith.push("*");
		return this;
	}

	/**
	 * 转换为内部系统配置数组
	 */
	toSystemConfigs(): SystemConfig[] {
		const result: SystemConfig[] = [];
		const configs = this.flattenConfigs();

		// 如果是链式执行，添加顺序依赖
		if (this.metadata.chained && configs.size() > 1) {
			for (let i = 0; i < configs.size(); i++) {
				let config = configs[i];

				// 除了第一个系统，都依赖于前一个系统
				if (i > 0) {
					const newAfter = [...(config.after || []), configs[i - 1].system];
					config = { ...config, after: newAfter };
				}

				// 除了最后一个系统，都在下一个系统之前
				if (i < configs.size() - 1) {
					const newBefore = [...(config.before || []), configs[i + 1].system];
					config = { ...config, before: newBefore };
				}

				// 对于链式系统，将外部依赖应用到第一个系统
				// 这确保整个链条都满足外部约束
				if (i === 0) {
					// 对第一个系统应用所有 after 约束
					if (this.metadata.after.size() > 0) {
						config = { ...config, after: [...(config.after || []), ...this.metadata.after] };
					}
				}

				// 对最后一个系统应用 before 约束
				if (i === configs.size() - 1 && this.metadata.before.size() > 0) {
					config = { ...config, before: [...(config.before || []), ...this.metadata.before] };
				}

				// 应用其他元数据（运行条件、系统集等）到所有系统，但跳过顺序依赖因为已经手动处理
				config = this.applyMetadata(config, true);

				result.push(config);
			}
		} else {
			// 非链式执行，直接应用元数据
			for (const config of configs) {
				result.push(this.applyMetadata(config));
			}
		}

		return result;
	}

	/**
	 * 展平嵌套的配置
	 */
	private flattenConfigs(): SystemConfig[] {
		const result: SystemConfig[] = [];

		for (const item of this.configs) {
			if (typeIs(item, "function")) {
				// 简单系统函数
				result.push({ system: item as SystemFunction });
			} else if (item instanceof SystemConfigs) {
				// 嵌套的 SystemConfigs
				for (const config of item.toSystemConfigs()) {
					result.push(config);
				}
			} else if (typeIs(item, "table")) {
				// SystemConfigs 数组
				for (const subItem of item) {
					for (const config of subItem.toSystemConfigs()) {
						result.push(config);
					}
				}
			}
		}

		return result;
	}

	/**
	 * 应用元数据到系统配置
	 */
	private applyMetadata(config: SystemConfig, skipOrdering = false): SystemConfig {
		const result = { ...config };

		// 应用运行条件
		if (this.metadata.runConditions.size() > 0) {
			// 组合多个运行条件（AND 逻辑）
			result.runCondition = (world) => {
				for (const condition of this.metadata.runConditions) {
					if (!condition(world)) {
						return false;
					}
				}
				return config.runCondition ? config.runCondition(world) : true;
			};
		}

		// 应用系统集
		if (this.metadata.inSets.size() > 0) {
			// 系统可以属于多个系统集
			result.inSet = this.metadata.inSets[0]; // 暂时只支持一个
		}

		// 应用顺序依赖（如果不跳过）
		if (!skipOrdering && this.metadata.before.size() > 0) {
			result.before = [...(result.before || []), ...this.metadata.before];
		}

		if (!skipOrdering && this.metadata.after.size() > 0) {
			result.after = [...(result.after || []), ...this.metadata.after];
		}

		return result;
	}

	/**
	 * 创建 SystemConfigs 实例的静态方法
	 */
	static from(item: SystemConfigItem | SystemConfigItem[]): SystemConfigs {
		return new SystemConfigs(item);
	}
}

/**
 * 将系统函数扩展为支持链式配置
 * 简化实现，直接返回 SystemConfigs 包装
 */
export function extendSystemFunction(fn: SystemFunction): SystemConfigs {
	return new SystemConfigs(fn);
}

/**
 * 将数组扩展为支持链式配置
 * 由于不能直接扩展数组，返回一个包装对象
 */
export function extendSystemArray(systems: SystemFunction[]): SystemConfigs {
	return new SystemConfigs(systems.map(s => new SystemConfigs(s)));
}

/**
 * IntoSystemConfigs 类型 - 可转换为系统配置的类型
 */
export type IntoSystemConfigs =
	| SystemFunction
	| SystemConfigs
	| SystemFunction[];

/**
 * 将输入转换为 SystemConfigs
 */
export function intoSystemConfigs(input: IntoSystemConfigs): SystemConfigs {
	if (input instanceof SystemConfigs) {
		return input;
	} else if (typeIs(input, "function")) {
		// 直接创建新的 SystemConfigs
		return new SystemConfigs(input as SystemFunction);
	} else if (typeIs(input, "table")) {
		// 数组类型，转换为 SystemConfigs
		return new SystemConfigs((input as SystemFunction[]).map(s => new SystemConfigs(s)));
	}

	error("Invalid system configuration input");
}