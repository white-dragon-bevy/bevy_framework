/**
 * computed-states.ts - 计算状态系统
 * 对应 Rust bevy_state/src/state/computed_states.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager, ResourceConstructor } from "../../src/bevy_ecs/resource";
import { States, BaseStates } from "./states";
import { State, StateConstructor } from "./resources";

/**
 * 生成状态资源键名
 * @param prefix - 资源前缀
 * @param stateType - 状态类型
 * @returns 资源键名
 */
function generateResourceKey<T extends States>(prefix: string, stateType: StateConstructor<T>): string {
	const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
	return `${prefix}<${stateTypeName}>`;
}

/**
 * 状态集接口，支持单个状态或状态元组
 * @template T - 状态类型或状态元组类型
 */
export interface StateSet<T = unknown> {
	/**
	 * 获取状态集的依赖深度
	 * @returns 依赖深度
	 */
	getDependencyDepth(): number;

	/**
	 * 从资源管理器获取状态集的当前值
	 * @param resourceManager - 资源管理器
	 * @returns 状态或状态元组，如果不存在则返回 undefined
	 */
	getStates(resourceManager: ResourceManager): T | undefined;
}

/**
 * 单个状态的 StateSet 实现
 * @template S - 状态类型
 */
export class SingleStateSet<S extends States> implements StateSet<S> {
	/**
	 * 构造函数
	 * @param stateType - 状态类型构造函数
	 */
	constructor(private stateType: StateConstructor<S>) {}

	/**
	 * 获取依赖深度
	 * @returns 状态的依赖深度
	 */
	public getDependencyDepth(): number {
		const stateClass = this.stateType as unknown as { DEPENDENCY_DEPTH?: number };
		return stateClass.DEPENDENCY_DEPTH ?? 1;
	}

	/**
	 * 获取当前状态
	 * @param resourceManager - 资源管理器
	 * @returns 当前状态或 undefined
	 */
	public getStates(resourceManager: ResourceManager): S | undefined {
		// 使用统一的资源键生成方式
		const stateTypeName = (this.stateType as unknown as { name?: string }).name ?? tostring(this.stateType);
		const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<S>>;
		const stateResource = resourceManager.getResource<stateKey>();
		return stateResource?.get();
	}
}

/**
 * 状态元组的 StateSet 实现
 * @template T - 状态元组类型，如 [AppState, MenuState]
 */
export class TupleStateSet<T extends ReadonlyArray<States>> implements StateSet<T> {
	private stateTypes: ReadonlyArray<StateConstructor<States>>;

	/**
	 * 构造函数
	 * @param stateTypes - 状态类型构造函数数组
	 */
	constructor(...stateTypes: { [K in keyof T]: StateConstructor<T[K]> }) {
		this.stateTypes = stateTypes as ReadonlyArray<StateConstructor<States>>;
	}

	/**
	 * 获取依赖深度
	 * @returns 所有状态中的最大依赖深度 + 1
	 */
	public getDependencyDepth(): number {
		let maxDepth = 0;
		for (const stateType of this.stateTypes) {
			const stateClass = stateType as unknown as { DEPENDENCY_DEPTH?: number };
			const depth = stateClass.DEPENDENCY_DEPTH ?? 1;
			if (depth > maxDepth) {
				maxDepth = depth;
			}
		}
		return maxDepth + 1;
	}

	/**
	 * 获取所有状态组成的元组
	 * @param resourceManager - 资源管理器
	 * @returns 状态元组或 undefined（如果任一状态不存在）
	 */
	public getStates(resourceManager: ResourceManager): T | undefined {
		const states: Array<States> = [];
		for (const stateType of this.stateTypes) {
			// 使用统一的资源键生成方式
			const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
			const stateKey = `State<${stateTypeName}>` as ResourceConstructor<State<States>>;
			const stateResource = resourceManager.getResource<stateKey>();
			const state = stateResource?.get();
			if (!state) {
				return undefined; // 如果任一状态不存在，返回 undefined
			}
			states.push(state);
		}
		return states as unknown as T;
	}
}

/**
 * 计算状态接口
 * 对应 Rust ComputedStates trait
 *
 * 计算状态是从其他状态派生的状态，不能直接修改
 * @template TSource - 源状态类型或状态元组类型
 */
export interface ComputedStates<TSource = unknown> extends States {
	/**
	 * 从源状态集计算派生状态
	 * @param sources - 源状态或状态元组
	 * @returns 计算后的状态或 undefined
	 */
	compute(sources: TSource | undefined): ComputedStates<TSource> | undefined;

	/**
	 * 获取源状态集配置
	 * @returns 源状态集
	 */
	getSourceStateSet(): StateSet<TSource>;
}

/**
 * 抽象计算状态基类
 * @template TSource - 源状态类型或状态元组类型
 */
export abstract class BaseComputedStates<TSource = unknown>
	implements ComputedStates<TSource>
{
	protected sourceStateSet?: StateSet<TSource>;

	/**
	 * 状态依赖深度（动态计算）
	 */
	public static DEPENDENCY_DEPTH: number;

	/**
	 * 构造函数
	 * @param sourceStateSet - 源状态集（可选，用于向后兼容）
	 */
	constructor(sourceStateSet?: StateSet<TSource>) {
		if (sourceStateSet) {
			this.sourceStateSet = sourceStateSet;
			// 动态计算依赖深度
			const constructor = getmetatable(this) as { DEPENDENCY_DEPTH?: number };
			if (constructor) {
				constructor.DEPENDENCY_DEPTH = sourceStateSet.getDependencyDepth() + 1;
			}
		} else {
			// 向后兼容：默认依赖深度
			const constructor = getmetatable(this) as { DEPENDENCY_DEPTH?: number };
			if (constructor) {
				constructor.DEPENDENCY_DEPTH = 2;
			}
			// 需要子类自己设置 sourceStateSet
		}
	}

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

	/**
	 * 获取源状态集配置
	 * @returns 源状态集
	 */
	public getSourceStateSet(): StateSet<TSource> {
		if (!this.sourceStateSet) {
			error("StateSet not configured. This computed state may be using the old API.");
		}
		return this.sourceStateSet;
	}

	/**
	 * 计算状态
	 * @param sources - 源状态或状态元组
	 * @returns 计算后的状态
	 */
	public abstract compute(sources: TSource | undefined): ComputedStates<TSource> | undefined;
}

/**
 * 计算状态管理器
 * @template TSource - 源状态类型或状态元组类型
 * @template TComputed - 计算状态类型
 */
export class ComputedStateManager<TSource = unknown, TComputed extends ComputedStates<TSource> = ComputedStates<TSource>> {
	private computedType: new () => TComputed;

	/**
	 * 构造函数
	 * @param computedType - 计算状态类型
	 */
	public constructor(
		computedType: new () => TComputed,
	) {
		this.computedType = computedType;
	}

	/**
	 * 更新计算状态
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 */
	public updateComputedState(world: World, resourceManager: ResourceManager): void {
		// 创建计算状态实例来获取源状态集配置
		const computedInstance = new this.computedType();
		const sourceStateSet = computedInstance.getSourceStateSet();

		// 从源状态集获取当前状态
		const sourceValues = sourceStateSet.getStates(resourceManager);

		// 执行计算
		const newComputedState = computedInstance.compute(sourceValues);

		// 使用统一的资源键生成方式
		const computedTypeName = (this.computedType as unknown as { name?: string }).name ?? tostring(this.computedType);
		const computedStateKey = `State<${computedTypeName}>` as ResourceConstructor<State<TComputed>>;

		// 获取或创建计算状态资源
		const computedStateResource = resourceManager.getResource<computedStateKey>();

		if (newComputedState === undefined) {
			// 如果计算结果为 undefined，移除计算状态资源
			if (computedStateResource) {
				resourceManager.removeResource(computedStateKey);
			}
		} else {
			// 更新或创建计算状态资源
			if (computedStateResource) {
				computedStateResource._set(newComputedState as TComputed);
			} else {
				resourceManager.insertResource(
					computedStateKey,
					State.create(newComputedState as TComputed),
				);
			}
		}
	}
}

/**
 * 创建简单的计算状态类
 * @param sourceStateSet - 源状态集
 * @param computeFn - 计算函数
 * @returns 计算状态类
 */
export function createComputedState<TSource>(
	sourceStateSet: StateSet<TSource>,
	computeFn: (source: TSource | undefined) => States | undefined,
): new () => ComputedStates<TSource> {
	class SimpleComputedState extends BaseComputedStates<TSource> {
		private value?: States;

		constructor() {
			super(sourceStateSet);
		}

		public getStateId(): string | number {
			return this.value?.getStateId() ?? "";
		}

		public clone(): States {
			const cloned = new SimpleComputedState();
			cloned.value = this.value?.clone();
			return cloned;
		}

		public compute(sources: TSource | undefined): ComputedStates<TSource> | undefined {
			const result = computeFn(sources);
			if (result === undefined) {
				return undefined;
			}
			const instance = new SimpleComputedState();
			instance.value = result;
			return instance;
		}
	}
	return SimpleComputedState;
}

/**
 * 映射计算状态
 * 简单地将一个状态映射到另一个状态
 * @template TSource - 源状态类型
 */
export class MappedComputedState<TSource extends States> extends BaseComputedStates<TSource> {
	private mapping: Map<string | number, States>;
	private currentValue?: States;

	/**
	 * 构造函数
	 * @param sourceStateSet - 源状态集
	 * @param mapping - 状态映射表
	 */
	public constructor(sourceStateSet: StateSet<TSource>, mapping: Map<string | number, States>) {
		super(sourceStateSet);
		this.mapping = mapping;
	}

	public getStateId(): string | number {
		return this.currentValue?.getStateId() ?? "";
	}

	public clone(): States {
		if (!this.sourceStateSet) {
			error("StateSet not configured");
		}
		const cloned = new MappedComputedState<TSource>(this.sourceStateSet, this.mapping);
		cloned.currentValue = this.currentValue?.clone();
		return cloned;
	}

	public compute(sources: TSource | undefined): ComputedStates<TSource> | undefined {
		if (sources === undefined) {
			return undefined;
		}

		if (!this.sourceStateSet) {
			error("StateSet not configured");
		}

		// 假设 TSource 是单个状态类型
		const sourceState = sources as States;
		const mappedState = this.mapping.get(sourceState.getStateId());
		if (mappedState === undefined) {
			return undefined;
		}

		const result = new MappedComputedState<TSource>(this.sourceStateSet, this.mapping);
		result.currentValue = mappedState.clone();
		return result;
	}
}

/**
 * 便利函数：创建支持多状态源的计算状态
 * @param sourceTypes - 源状态类型构造函数数组
 * @param computeFn - 计算函数
 * @returns 计算状态类构造函数
 */
export function createMultiSourceComputedState<T extends ReadonlyArray<States>, R extends States>(
	sourceTypes: { [K in keyof T]: StateConstructor<T[K]> },
	computeFn: (sources: T) => R | undefined
): StateConstructor<ComputedStates<T>> {
	const stateSet = new TupleStateSet<T>(...sourceTypes);

	return class extends BaseComputedStates<T> {
		private value?: R;

		constructor() {
			super(stateSet);
		}

		public getStateId(): string | number {
			return this.value?.getStateId() ?? "";
		}

		public clone(): States {
			const ClonedClass = getmetatable(this) as new () => typeof this;
			const cloned = new ClonedClass();
			cloned.value = this.value?.clone() as R;
			return cloned;
		}

		public compute(sources: T | undefined): ComputedStates<T> | undefined {
			if (!sources) {
				return undefined;
			}
			const result = computeFn(sources);
			if (!result) {
				return undefined;
			}
			const InstanceClass = getmetatable(this) as new () => typeof this;
			const instance = new InstanceClass();
			instance.value = result;
			return instance as ComputedStates<T>;
		}
	} as StateConstructor<ComputedStates<T>>;
}
