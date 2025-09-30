/**
 * resources.ts - 状态资源管理
 * 对应 Rust bevy_state/src/state/resources.rs
 */

import { Modding } from "@flamework/core";
import { getGenericTypeDescriptor, getTypeDescriptor, TypeDescriptor } from "../bevy_core";
import { Resource } from "../../src/bevy_ecs/resource";
import { States } from "./states";

/**
 * 标记可以自由变更的状态接口
 *
 * **用途**: 对应 Rust 的 FreelyMutableState trait，标记可以直接修改的状态类型
 */
export interface FreelyMutableState extends States {}

/**
 * State 资源 - 存储当前状态
 *
 * **用途**: 对应 Rust State<S>，在 ECS 世界中存储和管理当前状态
 *
 * @template S - 状态类型
 */

export class State<S extends States> {
	// 添加类型名称属性以支持唯一资源ID
	public static readonly typeName?: string;

	/**
	 * 私有构造函数 (外部调用使用 create())
	 *
	 * @param current - 当前状态实例
	 */
	private constructor(private current: S) {}


	/**
	 * 类型描述, 在 create() 时候添加.
	 */
	public typeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor


	/**
	 * 创建新的状态资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 	 * @metadata macro 
	 * 
	 * @param state - 初始状态
	 * @returns State 资源实例
	 */
	public static create<S extends States>(state: S,id?:Modding.Generic<S, "id">, text?: Modding.Generic<S,"text">): State<S> {
		const typeDescriptor = getTypeDescriptor(id,text)
		assert(typeDescriptor, "Failed to get TypeDescriptor for State: type descriptor is required for state creation")
		const result = new State(state);
		result.typeDescriptor = typeDescriptor
		return result;
	}

	/**
	 * 获取当前状态
	 *
	 * @returns 当前状态实例
	 */
	public get(): S {
		return this.current;
	}

	/**
	 * 内部方法：设置状态（不应直接使用）
	 *
	 * **警告**: 此方法仅供内部状态转换系统使用，外部代码应使用 NextState 来改变状态
	 *
	 * @internal
	 * @param state - 新状态实例
	 */
	public setInternal(state: S): void {
		this.current = state;
	}

	/**
	 * 比较当前状态与给定状态
	 *
	 * @param other - 要比较的状态实例
	 * @returns 是否相等
	 */
	public is(other: S): boolean {
		return this.current.equals(other);
	}

	/**
	 * 克隆状态资源
	 *
	 * @returns 状态资源的深拷贝副本
	 */
	public clone(): State<S> {
		const cloned = new State(this.current.clone() as S);
		cloned.typeDescriptor = this.typeDescriptor;
		return cloned;
	}
}



/**
 * NextState 枚举变体标识
 *
 * **用途**: 对应 Rust NextState 枚举的变体，表示状态转换的不同阶段
 */
export enum NextStateVariant {
	/** 状态未改变 */
	Unchanged = "Unchanged",
	/** 状态转换待处理 */
	Pending = "Pending",
}




/**
 * NextState 资源 - 待处理的下一个状态
 *
 * **用途**: 对应 Rust NextState<S> 枚举，用于请求状态转换
 *
 * @template S - 状态类型
 */

export class NextState<S extends States> {
	private variant: NextStateVariant = NextStateVariant.Unchanged;
	private pendingState?: S;

	
	/**
	 * 私有构造函数 (外部调用使用 Create())
	 */
	private constructor() {}


	/**
	 * 类型描述, 在 create() 时候添加.
	 */
	public typeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor




	/**
	 * 创建新的状态资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 	 * @metadata macro 
	 * 
	 */
	public static create<S extends States>(id?:Modding.Generic<S, "id">, text?: Modding.Generic<S,"text">): NextState<S> {
		let typeDescriptor = getTypeDescriptor(id,text)
		assert(typeDescriptor, "Failed to get TypeDescriptor for NextState: type descriptor is required for next state creation")
		const result = new NextState<S>();
		result.typeDescriptor = getGenericTypeDescriptor<NextState<S>>(typeDescriptor)
		return result;
	}


	/**
	 * 创建 Unchanged 变体的 NextState
	 * @returns NextState 实例
	 */
	public static unchanged<S extends States>(): NextState<S> {
		return new NextState<S>();
	}

	/**
	 * 创建 Pending 变体的 NextState
	 * @param state - 待处理状态
	 * @returns NextState 实例
	 */
	public static withPending<S extends States>(state: S): NextState<S> {
		const nextState = new NextState<S>();
		nextState.set(state);
		return nextState;
	}

	/**
	 * 设置待处理状态（转换为 Pending 变体）
	 *
	 * @param state - 要设置的目标状态实例
	 */
	public set(state: S): void {
		this.variant = NextStateVariant.Pending;
		this.pendingState = state;
	}

	/**
	 * 重置为 Unchanged 变体
	 */
	public reset(): void {
		this.variant = NextStateVariant.Unchanged;
		this.pendingState = undefined;
	}

	/**
	 * 检查是否为 Unchanged 变体
	 *
	 * @returns 是否为 Unchanged 状态
	 */
	public isUnchanged(): boolean {
		return this.variant === NextStateVariant.Unchanged;
	}

	/**
	 * 检查是否为 Pending 变体
	 *
	 * @returns 是否有待处理的状态转换
	 */
	public isPending(): boolean {
		return this.variant === NextStateVariant.Pending;
	}

	/**
	 * 取出并重置待处理状态（对应 Rust take_next_state）
	 *
	 * **说明**: 此操作会消费待处理状态，并将 NextState 重置为 Unchanged
	 *
	 * @returns 待处理状态或 undefined
	 */
	public take(): S | undefined {
		if (this.variant === NextStateVariant.Pending) {
			const state = this.pendingState;
			this.reset();
			return state;
		}
		return undefined;
	}

	/**
	 * 获取待处理状态（不清除）
	 *
	 * @returns 待处理状态或 undefined
	 */
	public pending(): S | undefined {
		return this.pendingState;
	}

}





/**
 * 状态类型的构造函数类型
 */
export type StateConstructor<S extends States> = new (...args: any[]) => S;

/**
 * 获取默认状态的函数类型
 */
export type DefaultStateFn<S extends States> = () => S;

/**
 * 状态配置接口
 *
 * **用途**: 定义状态插件的配置选项
 */
export interface StateConfig<S extends States> {
	/**
	 * 状态类型构造函数
	 */
	readonly stateType: StateConstructor<S>;

	/**
	 * 获取默认状态的工厂函数
	 */
	readonly defaultState: DefaultStateFn<S>;
}
