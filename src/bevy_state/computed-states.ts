/**
 * computed-states.ts - 计算状态系统
 * 对应 Rust bevy_state/src/state/computed_states.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager, ResourceConstructor } from "../bevy_ecs/resource";
import { States } from "./states";
import { State, StateConstructor } from "./resources";

/**
 * 计算状态接口
 * 对应 Rust ComputedStates trait
 *
 * 计算状态是从其他状态派生的状态，不能直接修改
 */
export interface ComputedStates<TSource extends States> extends States {
	/**
	 * 根据源状态计算当前状态
	 * @param sources - 源状态
	 * @returns 计算后的状态或 undefined
	 */
	compute(sources: TSource | undefined): ComputedStates<TSource> | undefined;
}

/**
 * 抽象计算状态基类
 */
export abstract class BaseComputedStates<TSource extends States>
	implements ComputedStates<TSource>
{
	/**
	 * 状态依赖深度（比源状态深度大1）
	 */
	public static readonly DEPENDENCY_DEPTH = 2;

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
	 * 计算状态
	 * @param sources - 源状态
	 * @returns 计算后的状态
	 */
	public abstract compute(sources: TSource | undefined): ComputedStates<TSource> | undefined;
}

/**
 * 计算状态管理器
 */
export class ComputedStateManager<TSource extends States, TComputed extends ComputedStates<TSource>> {
	private sourceType: StateConstructor<TSource>;
	private computedType: new () => TComputed;

	/**
	 * 构造函数
	 * @param sourceType - 源状态类型
	 * @param computedType - 计算状态类型
	 */
	public constructor(
		sourceType: StateConstructor<TSource>,
		computedType: new () => TComputed,
	) {
		this.sourceType = sourceType;
		this.computedType = computedType;
	}

	/**
	 * 更新计算状态
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 */
	public updateComputedState(world: World, resourceManager: ResourceManager): void {
		// 构建源状态资源键
		const sourceTypeWithName = this.sourceType as unknown as { name?: string };
		const sourceTypeName = sourceTypeWithName.name || "UnknownSource";
		const sourceStateKey = `State<${sourceTypeName}>` as ResourceConstructor<State<TSource>>;

		// 获取源状态
		const sourceState = resourceManager.getResource(sourceStateKey);
		const sourceValue = sourceState?.get();

		// 创建计算状态实例来执行计算
		const computedInstance = new this.computedType();
		const newComputedState = computedInstance.compute(sourceValue);

		// 构建计算状态资源键
		const computedTypeName = (this.computedType as unknown as { name?: string }).name || "UnknownComputed";
		const computedStateKey = `State<${computedTypeName}>` as ResourceConstructor<State<TComputed>>;

		// 获取或创建计算状态资源
		const computedStateResource = resourceManager.getResource(computedStateKey);

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
 * @param computeFn - 计算函数
 * @returns 计算状态类
 */
export function createComputedState<TSource extends States>(
	computeFn: (source: TSource | undefined) => States | undefined,
): new () => ComputedStates<TSource> {
	class SimpleComputedState extends BaseComputedStates<TSource> {
		private value?: States;

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
 */
export class MappedComputedState<TSource extends States> extends BaseComputedStates<TSource> {
	private mapping: Map<string | number, States>;
	private currentValue?: States;

	/**
	 * 构造函数
	 * @param mapping - 状态映射表
	 */
	public constructor(mapping: Map<string | number, States>) {
		super();
		this.mapping = mapping;
	}

	public getStateId(): string | number {
		return this.currentValue?.getStateId() ?? "";
	}

	public clone(): States {
		const cloned = new MappedComputedState<TSource>(this.mapping);
		cloned.currentValue = this.currentValue?.clone();
		return cloned;
	}

	public compute(sources: TSource | undefined): ComputedStates<TSource> | undefined {
		if (sources === undefined) {
			return undefined;
		}

		const mappedState = this.mapping.get(sources.getStateId());
		if (mappedState === undefined) {
			return undefined;
		}

		const result = new MappedComputedState<TSource>(this.mapping);
		result.currentValue = mappedState.clone();
		return result;
	}
}