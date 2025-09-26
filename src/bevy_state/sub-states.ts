/**
 * sub-states.ts - 子状态系统
 * 对应 Rust bevy_state/src/state/sub_states.rs
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../bevy_ecs/resource";
import { States } from "./states";
import { State, NextState, StateConstructor, getStateResource, getNextStateResource } from "./resources";

/**
 * 子状态配置接口
 */
export interface SubStateConfig<TParent extends States> {
	/**
	 * 父状态类型
	 */
	readonly parentType: StateConstructor<TParent>;

	/**
	 * 允许子状态存在的父状态值
	 */
	readonly allowedParentStates: Set<string | number>;
}

/**
 * 子状态接口
 * 对应 Rust SubStates trait
 *
 * 子状态依赖于父状态，只在特定父状态下存在
 */
export interface SubStates<TParent extends States> extends States {
	/**
	 * 获取子状态配置
	 * @returns 子状态配置
	 */
	getSubStateConfig(): SubStateConfig<TParent>;

	/**
	 * 检查在给定父状态下是否应该存在
	 * @param parentState - 父状态
	 * @returns 是否应该存在
	 */
	shouldExist(parentState: TParent | undefined): boolean;
}

/**
 * 抽象子状态基类
 */
export abstract class BaseSubStates<TParent extends States> implements SubStates<TParent> {
	/**
	 * 状态依赖深度（比父状态深度大1）
	 */
	public static readonly DEPENDENCY_DEPTH = 2;

	protected config: SubStateConfig<TParent>;

	/**
	 * 构造函数
	 * @param config - 子状态配置
	 */
	public constructor(config: SubStateConfig<TParent>) {
		this.config = config;
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
	 * 获取子状态配置
	 * @returns 子状态配置
	 */
	public getSubStateConfig(): SubStateConfig<TParent> {
		return this.config;
	}

	/**
	 * 检查在给定父状态下是否应该存在
	 * @param parentState - 父状态
	 * @returns 是否应该存在
	 */
	public shouldExist(parentState: TParent | undefined): boolean {
		if (parentState === undefined) {
			return false;
		}
		return this.config.allowedParentStates.has(parentState.getStateId());
	}
}

/**
 * 子状态管理器
 */
export class SubStateManager<TParent extends States, TSub extends SubStates<TParent>> {
	private parentType: StateConstructor<TParent>;
	private subType: StateConstructor<TSub>;
	private defaultSubState: () => TSub;

	/**
	 * 构造函数
	 * @param parentType - 父状态类型
	 * @param subType - 子状态类型
	 * @param defaultSubState - 默认子状态函数
	 */
	public constructor(
		parentType: StateConstructor<TParent>,
		subType: StateConstructor<TSub>,
		defaultSubState: () => TSub,
	) {
		this.parentType = parentType;
		this.subType = subType;
		this.defaultSubState = defaultSubState;
	}

	/**
	 * 更新子状态
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 */
	public updateSubState(world: World, resourceManager: ResourceManager): void {
		error("not impl")

		// // 获取类型化的资源类
		// const ParentStateResource = getStateResource(this.parentType);
		// const SubStateResource = getStateResource(this.subType);
		// const NextSubStateResource = getNextStateResource(this.subType);

		// // 获取父状态
		// const parentState = resourceManager.getResource<ParentStateResource as any>() as State<TParent> | undefined;
		// const parentValue = parentState?.get();

		// // 获取当前子状态
		// const subStateResource = resourceManager.getResource<SubStateResource as any>() as State<TSub> | undefined;

		// // 创建临时子状态实例来检查配置
		// const tempSub = this.defaultSubState();
		// const shouldExist = tempSub.shouldExist(parentValue);

		// if (!shouldExist) {
		// 	// 如果不应该存在，移除子状态
		// 	if (subStateResource) {
		// 		resourceManager.removeResource(SubStateResource as any);
		// 		// 同时清除 NextState
		// 		const nextSubState = resourceManager.getResource<NextSubStateResource as any>() as NextState<TSub> | undefined;
		// 		if (nextSubState) {
		// 			nextSubState.reset();
		// 		}
		// 	}
		// } else {
		// 	// 如果应该存在但还不存在，创建默认子状态
		// 	if (!subStateResource) {
		// 		const defaultState = this.defaultSubState();
		// 		const SubStateClass = SubStateResource as unknown as new (state: TSub) => State<TSub>;
		// 		resourceManager.insertResource(new SubStateClass(defaultState));
		// 	}
		// }
	}

	/**
	 * 处理子状态转换
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 * @returns 是否发生了转换
	 */
	public processSubStateTransition(world: World, resourceManager: ResourceManager): boolean {
		error("not impl")

		// // 首先确保子状态在正确的父状态下
		// this.updateSubState(world, resourceManager);

		// // 获取类型化的资源类
		// const SubStateResource = getStateResource(this.subType);
		// const NextSubStateResource = getNextStateResource(this.subType);

		// // 获取子状态资源
		// const subStateResource = resourceManager.getResource<SubStateResource as any>() as State<TSub> | undefined;
		// if (!subStateResource) {
		// 	return false;
		// }

		// // 获取 NextState 资源
		// const nextSubStateResource = resourceManager.getResource<NextSubStateResource as any>() as NextState<TSub> | undefined;
		// if (!nextSubStateResource || !nextSubStateResource.isPending()) {
		// 	return false;
		// }

		// // 取出待处理状态
		// const newSubState = nextSubStateResource.take();
		// if (!newSubState) {
		// 	return false;
		// }

		// // 更新子状态
		// subStateResource._set(newSubState);

		// return true;
	}
}

/**
 * 创建简单的枚举子状态
 * @param config - 子状态配置
 * @param values - 子状态值
 * @returns 子状态类
 */
export function createEnumSubState<TParent extends States>(
	config: SubStateConfig<TParent>,
	values: Record<string, string | number>,
): {
	states: Record<string, SubStates<TParent>>;
	type: new (value: string | number) => SubStates<TParent>;
} {
	class EnumSubState extends BaseSubStates<TParent> {
		public constructor(
			private value: string | number,
			config: SubStateConfig<TParent>,
		) {
			super(config);
		}

		public getStateId(): string | number {
			return this.value;
		}

		public clone(): States {
			return new EnumSubState(this.value, this.config);
		}
	}

	const states: Record<string, SubStates<TParent>> = {};
	for (const [key, value] of pairs(values)) {
		states[key] = new EnumSubState(value, config);
	}

	return {
		states,
		type: EnumSubState as any,
	};
}
