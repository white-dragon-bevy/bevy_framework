/**
 * computed-states.ts - 计算状态系统
 * 对应 Rust bevy_state/src/state/computed_states.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "bevy_ecs/resource";
import { States, BaseStates } from "./states";
import { State, StateConstructor } from "./resources";
import { TypeDescriptor } from "../bevy_core";

/**
 * 生成状态资源键名
 *
 * **内部函数**: 此函数用于统一生成 State<T> 和 NextState<T> 的资源键名。
 *
 * @param prefix - 资源前缀（如 "State" 或 "NextState"）
 * @param stateType - 状态类型构造函数
 * @returns 格式化的资源键名，如 "State<AppState>"
 */
function generateResourceKey<T extends States>(prefix: string, stateType: StateConstructor<T>): string {
	const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
	return `${prefix}<${stateTypeName}>`;
}

/**
 * 状态集接口，支持单个状态或状态元组
 *
 * **用途**: 为计算状态提供统一的源状态访问接口
 *
 * @template T - 状态类型或状态元组类型
 */
export interface StateSet<T = unknown> {
	/**
	 * 获取状态集的依赖深度
	 *
	 * @returns 依赖深度值
	 */
	getDependencyDepth(): number;

	/**
	 * 从资源管理器获取状态集的当前值
	 *
	 * @param resourceManager - 资源管理器实例
	 * @returns 状态或状态元组，如果不存在则返回 undefined
	 */
	getStates(resourceManager: ResourceManager): T | undefined;
}

/**
 * 单个状态的 StateSet 实现
 *
 * **用途**: 为单一源状态的计算状态提供状态访问
 *
 * @template S - 状态类型
 */
export class SingleStateSet<S extends States> implements StateSet<S> {
	private typeDescriptor?: TypeDescriptor;

	/**
	 * 构造函数
	 *
	 * **TypeDescriptor 的重要性**:
	 * - TypeDescriptor 用于在 ResourceManager 中唯一标识状态资源
	 * - 如果不提供，调用 getStates() 时将抛出错误
	 * - 推荐使用 Modding 宏系统自动生成 TypeDescriptor
	 *
	 * @param stateType - 状态类型构造函数
	 * @param typeDescriptor - 可选的类型描述符（用于资源查询）
	 */
	constructor(
		private stateType: StateConstructor<S>,
		typeDescriptor?: TypeDescriptor,
	) {
		this.typeDescriptor = typeDescriptor;
	}

	/**
	 * 获取依赖深度
	 *
	 * @returns 状态的依赖深度值
	 */
	public getDependencyDepth(): number {
		const stateClass = this.stateType as unknown as { DEPENDENCY_DEPTH?: number };
		return stateClass.DEPENDENCY_DEPTH ?? 1;
	}

	/**
	 * 获取当前状态
	 *
	 * **注意**: 此方法需要在构造时提供 TypeDescriptor，否则会抛出错误。
	 * TypeDescriptor 用于从 ResourceManager 查询对应的 State<S> 资源。
	 *
	 * @param resourceManager - 资源管理器
	 * @returns 当前状态或 undefined
	 */
	public getStates(resourceManager: ResourceManager): S | undefined {
		if (!this.typeDescriptor) {
			error(
				"SingleStateSet.getStates requires TypeDescriptor. " +
				"Please provide TypeDescriptor in constructor or use Modding macro system."
			);
		}

		// 使用 TypeDescriptor 获取 State<S> 资源
		const stateResource = resourceManager.getResourceByTypeDescriptor<State<S>>(this.typeDescriptor);

		if (!stateResource) {
			return undefined;
		}

		return stateResource.get();
	}
}

/**
 * 状态元组的 StateSet 实现
 *
 * **用途**: 为多源状态的计算状态提供状态访问
 *
 * @template T - 状态元组类型，如 [AppState, MenuState]
 */
export class TupleStateSet<T extends ReadonlyArray<States>> implements StateSet<T> {
	private stateTypes: ReadonlyArray<StateConstructor<States>>;
	private typeDescriptors?: ReadonlyArray<TypeDescriptor>;

	/**
	 * 构造函数
	 *
	 * **用法示例**:
	 * ```typescript
	 * const tupleSet = new TupleStateSet(AppState, MenuState, LoadingState);
	 * tupleSet.setTypeDescriptors([appTypeDesc, menuTypeDesc, loadingTypeDesc]);
	 * ```
	 *
	 * @param stateTypes - 状态类型构造函数数组（变长参数）
	 */
	constructor(...stateTypes: { [K in keyof T]: StateConstructor<T[K]> }) {
		this.stateTypes = stateTypes as ReadonlyArray<StateConstructor<States>>;
	}

	/**
	 * 设置类型描述符（用于资源查询）
	 *
	 * **注意**: 类型描述符数组的长度和顺序必须与构造函数中的状态类型数组一致。
	 *
	 * @param typeDescriptors - 类型描述符数组，顺序必须与 stateTypes 一致
	 */
	public setTypeDescriptors(typeDescriptors: ReadonlyArray<TypeDescriptor>): void {
		this.typeDescriptors = typeDescriptors;
	}

	/**
	 * 获取依赖深度
	 *
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
	 *
	 * **注意**: 此方法需要在构造时提供 TypeDescriptor 数组，否则会抛出错误。
	 * TypeDescriptor 用于从 ResourceManager 查询对应的 State<S> 资源。
	 *
	 * @param resourceManager - 资源管理器
	 * @returns 状态元组或 undefined（如果任一状态不存在）
	 */
	public getStates(resourceManager: ResourceManager): T | undefined {
		if (!this.typeDescriptors) {
			error(
				"TupleStateSet.getStates requires TypeDescriptor array. " +
				"Please provide TypeDescriptor array in constructor or use Modding macro system."
			);
		}

		if (this.typeDescriptors.size() !== this.stateTypes.size()) {
			error(
				"TupleStateSet: TypeDescriptor array size must match stateTypes array size"
			);
		}

		const states: Array<States> = [];

		// 遍历所有 TypeDescriptor 并获取对应的状态
		for (let descriptorIndex = 0; descriptorIndex < this.typeDescriptors.size(); descriptorIndex++) {
			const typeDescriptor = this.typeDescriptors[descriptorIndex];
			const stateResource = resourceManager.getResourceByTypeDescriptor<State<States>>(typeDescriptor);

			if (!stateResource) {
				// 如果任一状态不存在，返回 undefined
				return undefined;
			}

			states.push(stateResource.get());
		}

		return states as unknown as T;
	}
}

/**
 * 计算状态接口
 * 对应 Rust ComputedStates trait
 *
 * **说明**: 计算状态是从其他状态派生的状态，不能直接修改
 *
 * @template TSource - 源状态类型或状态元组类型
 */
export interface ComputedStates<TSource = unknown> extends States {
	/**
	 * 从源状态集计算派生状态
	 *
	 * @param sources - 源状态或状态元组
	 * @returns 计算后的状态或 undefined
	 */
	compute(sources: TSource | undefined): ComputedStates<TSource> | undefined;

	/**
	 * 获取源状态集配置
	 *
	 * @returns 源状态集实例
	 */
	getSourceStateSet(): StateSet<TSource>;
}

/**
 * 抽象计算状态基类
 *
 * **用途**: 为计算状态提供通用实现，简化自定义计算状态的开发
 *
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
	 *
	 * **依赖深度自动计算**:
	 * - 如果提供 sourceStateSet，依赖深度将自动设置为源状态深度 + 1
	 * - 如果不提供（向后兼容模式），依赖深度默认为 2
	 * - 子类应在构造函数中设置 sourceStateSet
	 *
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

	/**
	 * 获取源状态集配置
	 *
	 * @returns 源状态集实例
	 */
	public getSourceStateSet(): StateSet<TSource> {
		if (!this.sourceStateSet) {
			error("StateSet not configured. This computed state may be using the old API.");
		}
		return this.sourceStateSet;
	}

	/**
	 * 计算状态
	 *
	 * @param sources - 源状态或状态元组
	 * @returns 计算后的状态或 undefined
	 */
	public abstract compute(sources: TSource | undefined): ComputedStates<TSource> | undefined;
}

/**
 * 计算状态管理器
 *
 * **职责**: 负责在每帧更新计算状态，将源状态的变化反映到计算状态中。
 *
 * **使用场景**:
 * - 从单个或多个源状态派生新的状态
 * - 实现状态的联合、映射、过滤等逻辑
 * - 保持计算状态与源状态同步
 *
 * @template TSource - 源状态类型或状态元组类型
 * @template TComputed - 计算状态类型
 */
export class ComputedStateManager<TSource = unknown, TComputed extends ComputedStates<TSource> = ComputedStates<TSource>> {
	private computedType: new () => TComputed;

	/**
	 * 构造函数
	 *
	 * @param computedType - 计算状态类型构造函数
	 */
	public constructor(
		computedType: new () => TComputed,
	) {
		this.computedType = computedType;
	}

	/**
	 * 更新计算状态
	 *
	 * **执行流程**:
	 * 1. 从源状态集获取当前源状态值
	 * 2. 调用 compute() 方法计算新的计算状态
	 * 3. 更新或创建 State<TComputed> 资源
	 * 4. 如果计算结果为 undefined，移除计算状态资源
	 *
	 * **调用时机**: 通常在 StateTransition 调度中自动调用
	 *
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
		// const computedStateKey = `State<${computedTypeName}>` as ResourceConstructor<State<TComputed>>;

		// 获取或创建计算状态资源
		const computedStateResource = resourceManager.getResource<State<TComputed>>();

		if (newComputedState === undefined) {
			// 如果计算结果为 undefined，移除计算状态资源
			if (computedStateResource) {
				resourceManager.removeResource<State<TComputed>>();
			}
		} else {
			// 更新或创建计算状态资源
			if (computedStateResource) {
				computedStateResource.setInternal(newComputedState as TComputed);
			} else {
				resourceManager.insertResource(
					State.create(newComputedState as TComputed),
				);
			}
		}
	}
}

/**
 * 创建简单的计算状态类
 *
 * **便利函数**: 用于快速创建计算状态类，无需手动实现完整的 ComputedStates 接口。
 *
 * **使用示例**:
 * ```typescript
 * const PausedState = createComputedState(
 *     new SingleStateSet(AppState),
 *     (source) => source?.isPaused() ? PausedStates.Paused : PausedStates.Active
 * );
 * ```
 *
 * @param sourceStateSet - 源状态集
 * @param computeFn - 计算函数，接收源状态返回计算后的状态
 * @returns 计算状态类构造函数
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
 *
 * **用途**: 将一个状态通过映射表转换为另一个状态。
 *
 * **使用场景**:
 * - 从游戏状态映射到 UI 显示状态
 * - 从详细状态映射到简化状态
 * - 状态分组和归类
 *
 * **示例**:
 * ```typescript
 * const mapping = new Map([
 *     ["loading", UIStates.Busy],
 *     ["saving", UIStates.Busy],
 *     ["idle", UIStates.Ready]
 * ]);
 * const uiState = new MappedComputedState(gameStateSet, mapping);
 * ```
 *
 * @template TSource - 源状态类型
 */
export class MappedComputedState<TSource extends States> extends BaseComputedStates<TSource> {
	private mapping: Map<string | number, States>;
	private currentValue?: States;

	/**
	 * 构造函数
	 *
	 * @param sourceStateSet - 源状态集实例
	 * @param mapping - 状态映射表，键为源状态ID，值为目标状态
	 */
	public constructor(sourceStateSet: StateSet<TSource>, mapping: Map<string | number, States>) {
		super(sourceStateSet);
		this.mapping = mapping;
	}

	/**
	 * 获取状态标识符
	 *
	 * @returns 当前映射状态的标识符
	 */
	public getStateId(): string | number {
		return this.currentValue?.getStateId() ?? "";
	}

	/**
	 * 克隆状态
	 *
	 * @returns 状态的深拷贝副本
	 */
	public clone(): States {
		if (!this.sourceStateSet) {
			error("StateSet not configured");
		}
		const cloned = new MappedComputedState<TSource>(this.sourceStateSet, this.mapping);
		cloned.currentValue = this.currentValue?.clone();
		return cloned;
	}

	/**
	 * 计算映射后的状态
	 *
	 * @param sources - 源状态或 undefined
	 * @returns 映射后的计算状态或 undefined
	 */
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
 * 根据依赖深度排序计算状态类型
 *
 * **用途**: 确保父状态在子状态之前更新，避免多层派生状态的更新顺序错误。
 *
 * **实现原理**:
 * - 读取每个计算状态类的 DEPENDENCY_DEPTH 静态属性
 * - 按深度从小到大排序（浅层依赖先更新）
 *
 * **使用场景**:
 * - 当有多个 ComputedStatesPlugin 时，应按依赖深度顺序注册
 * - App 在初始化时可以自动对所有计算状态进行排序
 *
 * @param stateTypes - 计算状态类型构造函数数组
 * @returns 按依赖深度排序后的数组
 */
export function sortByDependencyDepth<T extends ComputedStates>(
	stateTypes: ReadonlyArray<new () => T>,
): Array<new () => T> {
	const sorted = [...stateTypes];

	// 使用手动排序算法，因为 roblox-ts 的 sort 需要返回 boolean
	// 实现冒泡排序以保证稳定性
	for (let outerIndex = 0; outerIndex < sorted.size(); outerIndex++) {
		for (let innerIndex = 0; innerIndex < sorted.size() - 1 - outerIndex; innerIndex++) {
			const typeA = sorted[innerIndex];
			const typeB = sorted[innerIndex + 1];

			const depthA = (typeA as unknown as { DEPENDENCY_DEPTH?: number }).DEPENDENCY_DEPTH ?? 1;
			const depthB = (typeB as unknown as { DEPENDENCY_DEPTH?: number }).DEPENDENCY_DEPTH ?? 1;

			// 如果 A 的深度大于 B，交换它们（升序排序）
			if (depthA > depthB) {
				sorted[innerIndex] = typeB;
				sorted[innerIndex + 1] = typeA;
			}
		}
	}

	return sorted;
}

/**
 * 便利函数：创建支持多状态源的计算状态
 *
 * **用途**: 从多个源状态计算派生状态，支持复杂的状态组合逻辑。
 *
 * **使用示例**:
 * ```typescript
 * const CombinedState = createMultiSourceComputedState(
 *     [AppState, NetworkState, AuthState],
 *     ([appState, netState, authState]) => {
 *         if (appState.isLoading() || netState.isConnecting()) return LoadingStates.Loading;
 *         if (!authState.isAuthenticated()) return LoadingStates.Unauthorized;
 *         return LoadingStates.Ready;
 *     },
 *     [appTypeDesc, netTypeDesc, authTypeDesc]
 * );
 * ```
 *
 * @param sourceTypes - 源状态类型构造函数数组
 * @param computeFn - 计算函数，接收源状态元组返回计算后的状态
 * @param typeDescriptors - 可选的类型描述符数组，顺序必须与 sourceTypes 一致
 * @returns 计算状态类构造函数
 */
export function createMultiSourceComputedState<T extends ReadonlyArray<States>, R extends States>(
	sourceTypes: { [K in keyof T]: StateConstructor<T[K]> },
	computeFn: (sources: T) => R | undefined,
	typeDescriptors?: ReadonlyArray<TypeDescriptor>,
): StateConstructor<ComputedStates<T>> {
	// 创建 stateSet
	const stateSet = new TupleStateSet<T>(...sourceTypes);
	if (typeDescriptors) {
		stateSet.setTypeDescriptors(typeDescriptors);
	}

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

