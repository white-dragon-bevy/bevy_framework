/**
 * states.ts - 核心状态接口定义
 * 对应 Rust bevy_state/src/state/states.rs
 */

/**
 * 状态系统的核心接口
 * 对应 Rust States trait
 *
 * 用于定义有限状态机中的状态类型
 */
export interface States {
	/**
	 * 获取状态的唯一标识符
	 * @returns 状态标识符
	 */
	getStateId(): string | number;

	/**
	 * 比较两个状态是否相等
	 * @param other - 另一个状态
	 * @returns 是否相等
	 */
	equals(other: States): boolean;

	/**
	 * 克隆当前状态
	 * @returns 状态的副本
	 */
	clone(): States;
}

/**
 * 抽象状态基类
 * 提供 States 接口的基础实现
 */
export abstract class BaseStates implements States {
	/**
	 * 状态依赖深度
	 * 用于排序和防止循环依赖
	 */
	public static readonly DEPENDENCY_DEPTH = 1;

	/**
	 * 获取状态标识符
	 * @returns 状态标识符
	 */
	public abstract getStateId(): string | number;

	/**
	 * 比较状态相等性
	 * @param other - 另一个状态
	 * @returns 是否相等
	 */
	public equals(other: States): boolean {
		return this.getStateId() === other.getStateId();
	}

	/**
	 * 克隆状态
	 * @returns 状态副本
	 */
	public abstract clone(): States;
}

/**
 * 枚举状态基类
 * 用于创建简单的枚举状态
 */
export class EnumStates extends BaseStates {
	/**
	 * 构造函数
	 * @param value - 枚举值
	 */
	public constructor(private readonly value: string | number) {
		super();
	}

	/**
	 * 获取状态标识符
	 * @returns 状态标识符
	 */
	public getStateId(): string | number {
		return this.value;
	}

	/**
	 * 克隆状态
	 * @returns 状态副本
	 */
	public clone(): States {
		return new EnumStates(this.value);
	}
}

/**
 * 创建枚举状态的辅助函数
 * @param values - 枚举值对象
 * @returns 状态映射对象
 */
export function createStates<T extends Record<string, string | number>>(
	values: T,
): { [K in keyof T]: EnumStates } {
	const states = {} as { [K in keyof T]: EnumStates };
	for (const [key, value] of pairs(values)) {
		states[key as keyof T] = new EnumStates(value as string | number);
	}
	return states;
}

/**
 * 状态类型定义
 * 用于类型安全的状态定义
 */
export type StateType<T extends States> = T;

/**
 * 状态集合类型
 * 用于表示多个状态的集合
 */
export type StateSet<T extends States> = Set<T>;
