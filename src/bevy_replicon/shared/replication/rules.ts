/**
 * @fileoverview 复制规则定义
 *
 * 定义组件的复制策略和过滤器
 */

import { Entity, World, AnyComponent } from "@rbxts/matter";

/**
 * 复制优先级
 */
export enum ReplicationPriority {
	/** 最低优先级 */
	Lowest = 0,
	/** 低优先级 */
	Low = 1,
	/** 正常优先级 */
	Normal = 2,
	/** 高优先级 */
	High = 3,
	/** 最高优先级 */
	Highest = 4,
}

/**
 * 复制模式
 */
export enum ReplicationMode {
	/** 完全复制 - 每次发送完整数据 */
	Full = "Full",
	/** 增量复制 - 只发送变化的数据 */
	Delta = "Delta",
	/** 按需复制 - 客户端请求时才发送 */
	OnDemand = "OnDemand",
}

/**
 * 复制过滤器函数
 * @param entity - 实体
 * @param world - World 实例
 * @returns 是否应该复制
 */
export type ReplicationFilter = (entity: Entity, world: World) => boolean;

/**
 * 复制规则
 */
export interface ReplicationRule {
	/** 规则名称 */
	readonly name?: string;
	/** 复制优先级 */
	readonly priority?: ReplicationPriority;
	/** 复制模式 */
	readonly mode?: ReplicationMode;
	/** 是否使用可靠传输 */
	readonly reliable?: boolean;
	/** 复制过滤器 */
	readonly filter?: ReplicationFilter;
	/** 最小更新间隔（毫秒） */
	readonly minUpdateInterval?: number;
	/** 是否需要确认 */
	readonly requiresAck?: boolean;
}

/**
 * 组件规则
 * 特定于组件的复制配置
 */
export interface ComponentRule extends ReplicationRule {
	/** 组件名称 */
	readonly componentName: string;
	/** 组件 ID */
	readonly componentId?: number;
}

/**
 * 默认复制规则
 */
export const DEFAULT_REPLICATION_RULE: ReplicationRule = {
	priority: ReplicationPriority.Normal,
	mode: ReplicationMode.Delta,
	reliable: false,
	minUpdateInterval: 0,
	requiresAck: false,
};

/**
 * 创建复制规则
 * @param overrides - 覆盖默认值的配置
 * @returns 复制规则
 */
export function createReplicationRule(overrides?: Partial<ReplicationRule>): ReplicationRule {
	return {
		...DEFAULT_REPLICATION_RULE,
		...overrides,
	};
}

/**
 * 创建组件规则
 * @param componentName - 组件名称
 * @param overrides - 覆盖默认值的配置
 * @returns 组件规则
 */
export function createComponentRule(
	componentName: string,
	overrides?: Partial<ReplicationRule>,
): ComponentRule {
	return {
		...DEFAULT_REPLICATION_RULE,
		...overrides,
		componentName,
	};
}

/**
 * 复制规则集合
 * 管理多个组件的复制规则
 */
export class ReplicationRules {
	private rules: Map<string, ComponentRule> = new Map();
	private globalRules: ReplicationRule[] = [];

	/**
	 * 添加组件规则
	 * @param rule - 组件规则
	 */
	public addComponentRule(rule: ComponentRule): void {
		this.rules.set(rule.componentName, rule);
	}

	/**
	 * 添加全局规则
	 * @param rule - 复制规则
	 */
	public addGlobalRule(rule: ReplicationRule): void {
		this.globalRules.push(rule);
	}

	/**
	 * 获取组件规则
	 * @param componentName - 组件名称
	 * @returns 组件规则
	 */
	public getComponentRule(componentName: string): ComponentRule | undefined {
		return this.rules.get(componentName);
	}

	/**
	 * 获取所有组件规则
	 * @returns 组件规则数组
	 */
	public getAllComponentRules(): ComponentRule[] {
		const rulesArray: ComponentRule[] = [];
		for (const [_, rule] of this.rules) {
			rulesArray.push(rule);
		}
		return rulesArray;
	}

	/**
	 * 获取全局规则
	 * @returns 全局规则数组
	 */
	public getGlobalRules(): ReplicationRule[] {
		return [...this.globalRules];
	}

	/**
	 * 检查实体是否应该复制
	 * @param entity - 实体
	 * @param world - World 实例
	 * @param componentName - 组件名称（可选）
	 * @returns 是否应该复制
	 */
	public shouldReplicate(entity: Entity, world: World, componentName?: string): boolean {
		// 先检查组件规则
		if (componentName !== undefined) {
			const componentRule = this.rules.get(componentName);
			if (componentRule?.filter) {
				if (!componentRule.filter(entity, world)) {
					return false;
				}
			}
		}

		// 检查全局规则
		for (const rule of this.globalRules) {
			if (rule.filter && !rule.filter(entity, world)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 获取组件的复制优先级
	 * @param componentName - 组件名称
	 * @returns 复制优先级
	 */
	public getComponentPriority(componentName: string): ReplicationPriority {
		const rule = this.rules.get(componentName);
		return rule?.priority ?? ReplicationPriority.Normal;
	}

	/**
	 * 获取组件的复制模式
	 * @param componentName - 组件名称
	 * @returns 复制模式
	 */
	public getComponentMode(componentName: string): ReplicationMode {
		const rule = this.rules.get(componentName);
		return rule?.mode ?? ReplicationMode.Delta;
	}

	/**
	 * 清空所有规则
	 */
	public clear(): void {
		this.rules.clear();
		this.globalRules = [];
	}
}

/**
 * 常用的复制过滤器
 */
export namespace ReplicationFilters {
	/**
	 * 只复制带有特定组件的实体
	 * @param componentName - 组件名称
	 * @returns 过滤器函数
	 */
	export function withComponent(componentName: string): ReplicationFilter {
		return (entity: Entity, world: World): boolean => {
			// TODO: 实现组件检查
			return true;
		};
	}

	/**
	 * 只复制在特定距离内的实体
	 * @param maxDistance - 最大距离
	 * @param getPosition - 获取位置的函数
	 * @returns 过滤器函数
	 */
	export function withinDistance(
		maxDistance: number,
		getPosition: (entity: Entity, world: World) => Vector3 | undefined,
	): ReplicationFilter {
		return (entity: Entity, world: World): boolean => {
			const position = getPosition(entity, world);
			if (!position) {
				return false;
			}
			// TODO: 实现距离检查
			return true;
		};
	}

	/**
	 * 组合多个过滤器（AND 逻辑）
	 * @param filters - 过滤器数组
	 * @returns 组合的过滤器
	 */
	export function andFilter(...filters: ReplicationFilter[]): ReplicationFilter {
		return (entity: Entity, world: World): boolean => {
			for (const filter of filters) {
				if (!filter(entity, world)) {
					return false;
				}
			}
			return true;
		};
	}

	/**
	 * 组合多个过滤器（OR 逻辑）
	 * @param filters - 过滤器数组
	 * @returns 组合的过滤器
	 */
	export function orFilter(...filters: ReplicationFilter[]): ReplicationFilter {
		return (entity: Entity, world: World): boolean => {
			for (const filter of filters) {
				if (filter(entity, world)) {
					return true;
				}
			}
			return false;
		};
	}
}