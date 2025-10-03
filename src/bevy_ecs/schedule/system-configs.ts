/**
 * @fileoverview Bevy ECS 系统配置 API
 * 提供链式配置方法，类似 Rust Bevy 的 IntoSystemConfigs
 */

import type { SystemFunction, RunCondition, SystemSet, SystemConfig } from "./types";
import type { World } from "@rbxts/matter";
import type { Context } from "../";

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
		return this.processConfigs().configs;
	}

	/**
	 * 处理配置并返回处理结果
	 * 对应 Rust process_configs 的逻辑
	 */
	private processConfigs(): { configs: SystemConfig[]; densely_chained: boolean } {
		// 处理单个系统函数
		if (this.configs.size() === 1 && typeIs(this.configs[0], "function")) {
			const systemFn = this.configs[0] as SystemFunction;
			const config = this.applyMetadata({ system: systemFn });
			return { configs: [config], densely_chained: true };
		}

		// 处理嵌套的 SystemConfigs
		const isChained = this.metadata.chained;
		let densely_chained = isChained || this.configs.size() === 1;
		const allConfigs: SystemConfig[] = [];

		let previousResult: { configs: SystemConfig[]; densely_chained: boolean } | undefined;

		for (let i = 0; i < this.configs.size(); i++) {
			const item = this.configs[i];
			let currentResult: { configs: SystemConfig[]; densely_chained: boolean };

			if (typeIs(item, "function")) {
				// 简单系统函数
				const config = { system: item as SystemFunction };
				currentResult = { configs: [config], densely_chained: true };
			} else if (item instanceof SystemConfigs) {
				// 嵌套的 SystemConfigs - 递归处理
				currentResult = item.processConfigs();
			} else {
				// SystemConfigs 数组
				const subConfigs: SystemConfig[] = [];
				for (const subItem of item as SystemConfigs[]) {
					const subResult = subItem.processConfigs();
					for (const config of subResult.configs) {
						subConfigs.push(config);
					}
				}
				currentResult = { configs: subConfigs, densely_chained: false };
			}

			densely_chained = densely_chained && currentResult.densely_chained;

			// 如果是链式的，需要在前后结果之间建立依赖关系
			if (isChained && previousResult) {
				// 获取要链接的节点
				// 如果前一个结果是密集链接的，只需要最后一个节点
				const previousNodes = previousResult.densely_chained
					? [previousResult.configs[previousResult.configs.size() - 1]]
					: previousResult.configs;

				// 如果当前结果是密集链接的，只需要第一个节点
				const currentNodes = currentResult.densely_chained
					? [currentResult.configs[0]]
					: currentResult.configs;

				// 在节点之间添加依赖
				for (let prevIdx = 0; prevIdx < previousNodes.size(); prevIdx++) {
					const prevNode = previousNodes[prevIdx];
					for (let currIdx = 0; currIdx < currentNodes.size(); currIdx++) {
						const currNode = currentNodes[currIdx];
						// 将当前节点设置为在前一个节点之后
						const updatedConfig = {
							...currNode,
							after: [...(currNode.after || []), prevNode.system],
						};
						// 更新配置
						if (currentResult.densely_chained && currIdx === 0) {
							currentResult.configs[0] = updatedConfig;
						} else {
							currentResult.configs[currIdx] = updatedConfig;
						}
					}
				}
			}

			// 对第一个配置应用外部的 after 依赖
			if (i === 0 && this.metadata.after.size() > 0) {
				if (currentResult.densely_chained) {
					// 只需要应用到第一个
					const firstConfig = currentResult.configs[0];
					currentResult.configs[0] = {
						...firstConfig,
						after: [...(firstConfig.after || []), ...this.metadata.after],
					};
				} else {
					// 应用到所有
					for (let idx = 0; idx < currentResult.configs.size(); idx++) {
						const config = currentResult.configs[idx];
						currentResult.configs[idx] = {
							...config,
							after: [...(config.after || []), ...this.metadata.after],
						};
					}
				}
			}

			// 对最后一个配置应用外部的 before 依赖
			if (i === this.configs.size() - 1 && this.metadata.before.size() > 0) {
				if (currentResult.densely_chained) {
					// 只需要应用到最后一个
					const lastIdx = currentResult.configs.size() - 1;
					const lastConfig = currentResult.configs[lastIdx];
					currentResult.configs[lastIdx] = {
						...lastConfig,
						before: [...(lastConfig.before || []), ...this.metadata.before],
					};
				} else {
					// 应用到所有
					for (let idx = 0; idx < currentResult.configs.size(); idx++) {
						const config = currentResult.configs[idx];
						currentResult.configs[idx] = {
							...config,
							before: [...(config.before || []), ...this.metadata.before],
						};
					}
				}
			}

			// 应用其他元数据到当前结果的所有配置
			for (let idx = 0; idx < currentResult.configs.size(); idx++) {
				const config = currentResult.configs[idx];
				// 应用运行条件、系统集等（但不再应用 before/after，因为已经处理过了）
				currentResult.configs[idx] = this.applyMetadataToConfig(config);
			}

			for (const config of currentResult.configs) {
				allConfigs.push(config);
			}
			previousResult = currentResult;
		}

		return { configs: allConfigs, densely_chained };
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
	 * 应用元数据到系统配置（用于非链式处理）
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
	 * 应用元数据到系统配置（仅应用非顺序相关的元数据）
	 * 用于链式处理中，因为顺序依赖已经在 processConfigs 中处理
	 */
	private applyMetadataToConfig(config: SystemConfig): SystemConfig {
		let result = { ...config };

		// 应用运行条件
		if (this.metadata.runConditions.size() > 0) {
			const existingCondition = config.runCondition;
			// 组合多个运行条件（AND 逻辑）
			result = {
				...result,
				runCondition: (world) => {
					for (const condition of this.metadata.runConditions) {
						if (!condition(world)) {
							return false;
						}
					}
					return existingCondition ? existingCondition(world) : true;
				},
			};
		}

		// 应用系统集
		if (this.metadata.inSets.size() > 0 && !result.inSet) {
			// 系统可以属于多个系统集
			result = {
				...result,
				inSet: this.metadata.inSets[0], // 暂时只支持一个
			};
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