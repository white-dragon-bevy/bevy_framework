/**
 * resources.ts - 状态资源管理
 * 对应 Rust bevy_state/src/state/resources.rs
 */

import { Resource } from "../bevy_ecs/resource";
import { States } from "./states";

/**
 * 标记可以自由变更的状态
 * 对应 Rust 的 FreelyMutableState trait
 */
export interface FreelyMutableState extends States {}

/**
 * State 资源 - 存储当前状态
 * 对应 Rust State<S>
 */
@Resource
export class State<S extends States> implements Resource {
	public readonly __brand = "Resource" as const;
	// 添加类型名称属性以支持唯一资源ID
	public static readonly typeName?: string;

	/**
	 * 构造函数
	 * @param current - 当前状态
	 */
	public constructor(private current: S) {}

	/**
	 * 创建新的状态资源
	 * @param state - 初始状态
	 * @returns State 资源实例
	 */
	public static create<S extends States>(state: S): State<S> {
		return new State(state);
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
		return new State(this.current.clone() as S);
	}
}

// 状态资源类缓存
const stateResourceCache = new Map<string, unknown>();

/**
 * 为特定状态类型创建唯一的资源类包装器
 * 这确保了不同的状态类型会有不同的资源ID
 */
class StateResourceWrapper<S extends States> {
	private static readonly wrapperCache = new Map<string, unknown>();

	public static getForType<S extends States>(stateType: StateConstructor<S> | string): new (state: S) => State<S> {
		const typeName = typeIs(stateType, "string") ? stateType : tostring(stateType);
		const cacheKey = `StateWrapper_${typeName}`;

		let wrapper = StateResourceWrapper.wrapperCache.get(cacheKey);
		if (wrapper === undefined) {
			// 创建一个唯一的包装类
			@Resource
			class TypedStateResource extends State<S> {
				public static readonly __stateTypeName = cacheKey;
			}

			// 覆盖toString以返回唯一标识
			const mt = getmetatable(TypedStateResource) as { __tostring?: () => string } | undefined;
			if (mt) {
				mt.__tostring = () => cacheKey;
			}

			wrapper = TypedStateResource;
			StateResourceWrapper.wrapperCache.set(cacheKey, wrapper);
		}

		return wrapper as new (state: S) => State<S>;
	}
}

/**
 * 获取或创建特定类型的State资源类
 * @param stateType - 状态类型
 * @returns 特定类型的State资源类
 */
export function getStateResource<S extends States>(stateType: StateConstructor<S> | string): new (state: S) => State<S> {
	return StateResourceWrapper.getForType(stateType);
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
 * NextState 资源 - 待处理的下一个状态
 * 对应 Rust NextState<S> 枚举
 */
@Resource
export class NextState<S extends States> implements Resource {
	public readonly __brand = "Resource" as const;
	// 添加类型名称属性以支持唯一资源ID
	public static readonly typeName?: string;
	private variant: NextStateVariant = NextStateVariant.Unchanged;
	private pendingState?: S;

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

	/**
	 * 兼容性方法：获取待处理状态（已弃用）
	 * @deprecated 使用 pending() 方法替代
	 * @returns 待处理状态或 undefined
	 */
	public getPending(): S | undefined {
		return this.pendingState;
	}

	/**
	 * 兼容性方法：检查是否有待处理状态（已弃用）
	 * @deprecated 使用 isPending() 方法替代
	 * @returns 是否有待处理状态
	 */
	public hasPending(): boolean {
		return this.variant === NextStateVariant.Pending;
	}

}

// NextState资源类缓存
const nextStateResourceCache = new Map<string, unknown>();

/**
 * 为特定状态类型创建唯一的NextState资源类包装器
 */
class NextStateResourceWrapper<S extends States> {
	private static readonly wrapperCache = new Map<string, unknown>();

	public static getForType<S extends States>(stateType: StateConstructor<S> | string): typeof NextState {
		const typeName = typeIs(stateType, "string") ? stateType : tostring(stateType);
		const cacheKey = `NextStateWrapper_${typeName}`;

		let wrapper = NextStateResourceWrapper.wrapperCache.get(cacheKey);
		if (wrapper === undefined) {
			// 创建一个唯一的包装类
			@Resource
			class TypedNextStateResource extends NextState<S> {
				public static readonly __stateTypeName = cacheKey;
			}

			// 覆盖toString以返回唯一标识
			const mt = getmetatable(TypedNextStateResource) as { __tostring?: () => string } | undefined;
			if (mt) {
				mt.__tostring = () => cacheKey;
			}

			wrapper = TypedNextStateResource;
			NextStateResourceWrapper.wrapperCache.set(cacheKey, wrapper);
		}

		return wrapper as typeof NextState;
	}
}

/**
 * 获取或创建特定类型的NextState资源类
 * @param stateType - 状态类型
 * @returns 特定类型的NextState资源类
 */
export function getNextStateResource<S extends States>(stateType: StateConstructor<S> | string): typeof NextState {
	return NextStateResourceWrapper.getForType(stateType);
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
