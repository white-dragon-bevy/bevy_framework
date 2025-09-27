/**
 * resources.ts - 状态资源管理
 * 对应 Rust bevy_state/src/state/resources.rs
 */

import { Modding } from "@flamework/core";
import { Resource } from "../../src/bevy_ecs/resource";
import { States } from "./states";
import { getTypeDescriptor, TypeDescriptor } from "../bevy_core";

/**
 * 标记可以自由变更的状态
 * 对应 Rust 的 FreelyMutableState trait
 */
export interface FreelyMutableState extends States {}

/**
 * State 资源 - 存储当前状态
 * 对应 Rust State<S>
 */

export class State<S extends States> {
	// 添加类型名称属性以支持唯一资源ID
	public static readonly typeName?: string;

	/**
	 * 私有构造函数 (外部调用使用 Create())
	 * @param current - 当前状态
	 */
	private constructor(private current: S) {}


	/**
	 * 类型描述, 在 create() 时候添加.
	 */
	private _typeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor

	/**
	 * 获取类型描述
	 * @returns TypeDescriptor
	 */
	public getTypeDescriptor():TypeDescriptor{
		return this._typeDescriptor
	}


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
		let typeDescriptor = getTypeDescriptor(id,text)
		assert(typeDescriptor, "Failed to get TypeDescriptor for State: type descriptor is required for state creation")
		const result = new State(state);
		result._typeDescriptor = typeDescriptor
		return result;
	}

	/**
	 * 获取当前状态
	 * @returns 当前状态
	 */
	public get(): S {
		return this.current;
	}

	/**
	 * 内部方法：设置状态（不应直接使用）
	 * @param state - 新状态
	 */
	public _set(state: S): void {
		this.current = state;
	}

	/**
	 * 比较当前状态与给定状态
	 * @param other - 要比较的状态
	 * @returns 是否相等
	 */
	public is(other: S): boolean {
		return this.current.equals(other);
	}

	/**
	 * 克隆状态资源
	 * @returns 状态资源副本
	 */
	public clone(): State<S> {
		const cloned = new State(this.current.clone() as S);
		cloned._typeDescriptor = this._typeDescriptor;
		return cloned;
	}
}



/**
 * @deprecated 此函数已弃用，请直接使用 State.create() 方法
 * @param stateType - 状态类型
 * @returns 特定类型的State资源类
 */
export function getStateResource<S extends States>(stateType: StateConstructor<S> ): new (state: S) => State<S> {
	// 此函数已弃用，保留仅为向后兼容
	// 直接使用 State.create() 替代
	warn("getStateResource is deprecated, use State.create() instead");
	return State as any;
}

/**
 * NextState 枚举变体标识
 * 对应 Rust NextState 枚举的变体
 */
export enum NextStateVariant {
	Unchanged = "Unchanged",
	Pending = "Pending",
}


/**
 * 创建 NextState 资源的类型描述符
 * @param typeDescriptor - 状态的类型描述符
 * @returns 新的 NextState 类型描述符
 */
export function getNextStateTypeDescriptor(typeDescriptor:TypeDescriptor){
	const clone = table.clone(typeDescriptor)
	clone.text += "+ SubState"
	return clone
}

/**
 * NextState 资源 - 待处理的下一个状态
 * 对应 Rust NextState<S> 枚举
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
	private _typeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor

	/**
	 * 获取类型描述
	 * @returns TypeDescriptor
	 */
	public getTypeDescriptor():TypeDescriptor{
		return this._typeDescriptor
	}


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
		result._typeDescriptor = getNextStateTypeDescriptor(typeDescriptor)
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
	 * @param state - 要设置的状态
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
	 * @returns 是否为 Unchanged 变体
	 */
	public isUnchanged(): boolean {
		return this.variant === NextStateVariant.Unchanged;
	}

	/**
	 * 检查是否为 Pending 变体
	 * @returns 是否为 Pending 变体
	 */
	public isPending(): boolean {
		return this.variant === NextStateVariant.Pending;
	}

	/**
	 * 取出并重置待处理状态（对应 Rust take_next_state）
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
	 * @returns 待处理状态或 undefined
	 */
	public pending(): S | undefined {
		return this.pendingState;
	}

}





/**
 * 状态类型的构造函数
 */
export type StateConstructor<S extends States> = new (...args: any[]) => S;

/**
 * 获取默认状态的函数类型
 */
export type DefaultStateFn<S extends States> = () => S;

/**
 * 状态配置
 */
export interface StateConfig<S extends States> {
	/**
	 * 状态类型构造函数
	 */
	readonly stateType: StateConstructor<S>;

	/**
	 * 获取默认状态的函数
	 */
	readonly defaultState: DefaultStateFn<S>;
}
