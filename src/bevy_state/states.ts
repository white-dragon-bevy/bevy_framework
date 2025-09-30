/**
 * states.ts - 核心状态接口定义
 * 对应 Rust bevy_state/src/state/states.rs
 */

/**
 * 状态系统的核心接口
 * 对应 Rust States trait
 *
 * **用途**: 定义有限状态机中的状态类型
 */
export interface States {
	/**
	 * 获取状态的唯一标识符
	 *
	 * @returns 状态的唯一标识符（字符串或数字）
	 */
	getStateId(): string | number;

	/**
	 * 比较两个状态是否相等
	 *
	 * @param other - 另一个状态实例
	 * @returns 是否相等
	 */
	equals(other: States): boolean;

	/**
	 * 克隆当前状态
	 *
	 * @returns 状态的深拷贝副本
	 */
	clone(): States;
}

/**
 * 类型守卫：检查值是否为有效的 States 对象
 *
 * **用途**: 在运行时验证对象是否实现了 States 接口，避免类型转换错误
 *
 * @param value - 待检查的值
 * @returns 如果是 States 对象则返回 true
 */
export function isStates(value: unknown): value is States {
	return (
		typeIs(value, "table") &&
		typeIs((value as States).getStateId, "function") &&
		typeIs((value as States).equals, "function") &&
		typeIs((value as States).clone, "function")
	);
}

/**
 * 抽象状态基类
 *
 * **用途**: 提供 States 接口的基础实现，简化自定义状态的开发
 */
export abstract class BaseStates implements States {
	/**
	 * 状态依赖深度
	 *
	 * **设计目的**:
	 * - 用于状态转换时的拓扑排序
	 * - 防止状态之间的循环依赖
	 * - 确定状态转换的执行顺序
	 *
	 * **使用建议**:
	 * - 独立状态（无依赖）: 设置为 1
	 * - 依赖其他状态的子状态: 设置为父状态深度 + 1
	 * - 计算状态（ComputedStates）: 设置为源状态深度 + 1
	 *
	 * **示例**:
	 * ```typescript
	 * class GameState extends BaseStates {
	 *     public static readonly DEPENDENCY_DEPTH = 1; // 根状态
	 * }
	 *
	 * class MenuState extends SubStates<GameState> {
	 *     public static readonly DEPENDENCY_DEPTH = 2; // 依赖 GameState
	 * }
	 * ```
	 *
	 * **注意**: 子类应根据实际依赖关系覆盖此值
	 */
	public static readonly DEPENDENCY_DEPTH = 1;

	/**
	 * 获取状态标识符
	 *
	 * @returns 状态的唯一标识符
	 */
	public abstract getStateId(): string | number;

	/**
	 * 比较状态相等性
	 *
	 * @param other - 另一个状态实例
	 * @returns 是否相等
	 */
	public equals(other: States): boolean {
		return this.getStateId() === other.getStateId();
	}

	/**
	 * 克隆状态
	 *
	 * @returns 状态的深拷贝副本
	 */
	public abstract clone(): States;
}

/**
 * 枚举状态基类
 *
 * **用途**: 用于创建简单的枚举状态，无需手动实现 States 接口
 */
export class EnumStates extends BaseStates {
	/**
	 * 构造函数
	 *
	 * @param value - 枚举值（字符串或数字）
	 */
	public constructor(private readonly value: string | number) {
		super();
	}

	/**
	 * 获取状态标识符
	 *
	 * @returns 状态的唯一标识符
	 */
	public getStateId(): string | number {
		return this.value;
	}

	/**
	 * 克隆状态
	 *
	 * @returns 状态的深拷贝副本
	 */
	public clone(): States {
		return new EnumStates(this.value);
	}
}

/**
 * 创建枚举状态的辅助函数
 *
 * **便利函数**: 快速从枚举值对象创建状态映射
 *
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
