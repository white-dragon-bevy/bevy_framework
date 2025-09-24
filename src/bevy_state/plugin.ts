/**
 * plugin.ts - 状态系统插件
 * 提供状态管理功能的集成
 */

import { World } from "@rbxts/matter";
import { App } from "../bevy_app/app";
import { Plugin } from "../bevy_app/plugin";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { ResourceManager } from "../bevy_ecs/resource";
import { States } from "./states";
import { State, NextState, StateConstructor, DefaultStateFn } from "./resources";
import { StateTransition, StateTransitionManager } from "./transitions";
import { ComputedStates, ComputedStateManager } from "./computed-states";
import { SubStates, SubStateManager } from "./sub-states";

/**
 * 状态插件配置
 */
export interface StatePluginConfig<S extends States> {
	/**
	 * 状态类型
	 */
	readonly stateType: StateConstructor<S>;

	/**
	 * 默认状态
	 */
	readonly defaultState: DefaultStateFn<S>;

	/**
	 * 是否在启动时初始化
	 */
	readonly initOnStartup?: boolean;
}

/**
 * 状态管理插件
 */
export class StatesPlugin<S extends States> implements Plugin {
	private config: StatePluginConfig<S>;
	private transitionManager: StateTransitionManager<S>;
	private resourceManager?: ResourceManager;

	/**
	 * 构造函数
	 * @param config - 插件配置
	 */
	public constructor(config: StatePluginConfig<S>) {
		this.config = config;
		this.transitionManager = new StateTransitionManager(config.stateType);
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const world = app.getWorld();
		// 创建资源管理器
		this.resourceManager = new ResourceManager();

		// 将资源管理器存储到world的一个自定义属性中
		const worldWithRM = world as unknown as Record<string, unknown>;
		worldWithRM["stateResourceManager"] = this.resourceManager;

		// 初始化状态资源
		if (this.config.initOnStartup !== false) {
			// Debug: Check if defaultState is a function
			if (!typeIs(this.config.defaultState, "function")) {
				error(`defaultState is not a function, got ${typeOf(this.config.defaultState)}`);
			}
			const defaultState = this.config.defaultState();
			this.resourceManager.insertResource(State<S>, State.create(defaultState));
			this.resourceManager.insertResource(NextState<S>, NextState.unchanged<S>());
		}

		// 添加状态转换系统
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.processStateTransitions(worldParam, this.resourceManager);
			}
		});

		// 在 PreUpdate 之前运行状态转换
		app.addSystems(BuiltinSchedules.PRE_UPDATE, (worldParam: World) => {
			// 触发状态转换调度 - 这里需要手动调用转换系统
			if (this.resourceManager) {
				this.processStateTransitions(worldParam, this.resourceManager);
			}
		});
	}

	/**
	 * 处理状态转换
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 */
	private processStateTransitions(world: World, resourceManager: ResourceManager): void {
		this.transitionManager.processTransition(world, resourceManager);
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		const stateType = this.config.stateType as unknown as { name?: string };
		return `StatesPlugin<${stateType.name || "State"}>`;
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	public isUnique(): boolean {
		return true;
	}
}

/**
 * 计算状态插件
 */
export class ComputedStatesPlugin<
	TSource extends States,
	TComputed extends ComputedStates<TSource>,
> implements Plugin
{
	private sourceType: StateConstructor<TSource>;
	private computedType: new () => TComputed;
	private manager: ComputedStateManager<TSource, TComputed>;
	private resourceManager?: ResourceManager;

	/**
	 * 构造函数
	 * @param sourceType - 源状态类型
	 * @param computedType - 计算状态类型
	 */
	public constructor(sourceType: StateConstructor<TSource>, computedType: new () => TComputed) {
		this.sourceType = sourceType;
		this.computedType = computedType;
		this.manager = new ComputedStateManager(sourceType, computedType);
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const world = app.getWorld();
		// 尝试获取已存在的资源管理器，或创建新的
		const worldWithRM = world as unknown as Record<string, unknown>;
		this.resourceManager = (worldWithRM["stateResourceManager"] as ResourceManager) || new ResourceManager();
		if (!worldWithRM["stateResourceManager"]) {
			worldWithRM["stateResourceManager"] = this.resourceManager;
		}

		// 添加计算状态更新系统
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.manager.updateComputedState(worldParam, this.resourceManager);
			}
		});
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		const sourceType = this.sourceType as unknown as { name?: string };
		const computedType = this.computedType as unknown as { name?: string };
		return `ComputedStatesPlugin<${sourceType.name || "Source"}, ${computedType.name || "Computed"}>`;
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	public isUnique(): boolean {
		return true;
	}
}

/**
 * 子状态插件
 */
export class SubStatesPlugin<TParent extends States, TSub extends SubStates<TParent>>
	implements Plugin
{
	private parentType: StateConstructor<TParent>;
	private subType: StateConstructor<TSub>;
	private defaultSubState: () => TSub;
	private manager: SubStateManager<TParent, TSub>;
	private resourceManager?: ResourceManager;

	/**
	 * 构造函数
	 * @param parentType - 父状态类型
	 * @param subType - 子状态类型
	 * @param defaultSubState - 默认子状态
	 */
	public constructor(
		parentType: StateConstructor<TParent>,
		subType: StateConstructor<TSub>,
		defaultSubState: () => TSub,
	) {
		this.parentType = parentType;
		this.subType = subType;
		this.defaultSubState = defaultSubState;
		this.manager = new SubStateManager(parentType, subType, defaultSubState);
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const world = app.getWorld();
		// 尝试获取已存在的资源管理器，或创建新的
		const worldWithRM = world as unknown as Record<string, unknown>;
		this.resourceManager = (worldWithRM["stateResourceManager"] as ResourceManager) || new ResourceManager();
		if (!worldWithRM["stateResourceManager"]) {
			worldWithRM["stateResourceManager"] = this.resourceManager;
		}

		// 添加子状态管理系统
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.manager.updateSubState(worldParam, this.resourceManager);
				this.manager.processSubStateTransition(worldParam, this.resourceManager);
			}
		});

		// 初始化 NextState 资源
		if (this.resourceManager) {
			this.resourceManager.insertResource(NextState<TSub>, NextState.unchanged<TSub>());
		}
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		const parentType = this.parentType as unknown as { name?: string };
		const subType = this.subType as unknown as { name?: string };
		return `SubStatesPlugin<${parentType.name || "Parent"}, ${subType.name || "Sub"}>`;
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	public isUnique(): boolean {
		return true;
	}
}