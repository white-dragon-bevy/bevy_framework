/**
 * plugin.ts - 状态系统插件
 * 提供状态管理功能的集成
 */

import { World } from "@rbxts/matter";
import { App } from "../bevy_app/app";
import { Plugin } from "../bevy_app/plugin";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { ResourceManager, ResourceConstructor } from "../bevy_ecs/resource";
import { EventManager } from "../bevy_ecs/events";
import { EnumStates, States } from "./states";
import { NextState, StateConstructor, DefaultStateFn } from "./resources";
import { StateTransition, StateTransitionManager } from "./transitions";
import { ComputedStates, ComputedStateManager } from "./computed-states";
import { SubStates, SubStateManager } from "./sub-states";

/**
 * 状态转换系统集合
 * 对应 Rust bevy_state::state::StateTransitionSystems
 */
export enum StateTransitionSystems {
	/** 依赖状态转换 */
	DependentTransitions = "DependentTransitions",

	/** 退出调度 */
	ExitSchedules = "ExitSchedules",

	/** 转换调度 */
	TransitionSchedules = "TransitionSchedules",

	/** 进入调度 */
	EnterSchedules = "EnterSchedules",
}

/**
 * 生成统一的资源键名
 * @param prefix - 资源前缀
 * @param stateType - 状态类型
 * @returns 资源键名
 */
function generateResourceKey<T extends States>(prefix: string, stateType: StateConstructor<T>): string {
	const stateTypeName = (stateType as unknown as { name?: string }).name ?? tostring(stateType);
	return `${prefix}<${stateTypeName}>`;
}

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
	private eventManager?: EventManager;

	/**
	 * 构造函数
	 * @param config - 插件配置
	 */
	public constructor(config: StatePluginConfig<S>) {
		this.config = config;
		// 初始化时暂不传入事件管理器，在 build 方法中设置
		this.transitionManager = new StateTransitionManager(config.stateType);
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const world = app.getWorld();
		const worldWithRM = world as unknown as Record<string, unknown>;

		// Get or create the shared resource manager
		let existingResourceManager = worldWithRM["stateResourceManager"] as ResourceManager | undefined;
		if (!existingResourceManager) {
			// First StatePlugin creates the ResourceManager
			existingResourceManager = new ResourceManager();
			worldWithRM["stateResourceManager"] = existingResourceManager;
		}
		this.resourceManager = existingResourceManager;

		// Get or create the shared event manager
		let existingEventManager = worldWithRM["stateEventManager"] as EventManager | undefined;
		if (!existingEventManager) {
			// First StatePlugin creates the EventManager
			existingEventManager = new EventManager(world);
			worldWithRM["stateEventManager"] = existingEventManager;
		}
		this.eventManager = existingEventManager;

		// 设置转换管理器的事件管理器
		this.transitionManager.setEventManager(this.eventManager);

		// 存储转换管理器到世界中以便 lastTransition 函数访问
		const managerKey = `stateTransitionManager_${tostring(this.config.stateType)}`;
		worldWithRM[managerKey] = this.transitionManager;

		// 存储 App 引用以便执行调度
		worldWithRM["appReference"] = app;

		// 注册 StateTransition 调度到主调度顺序（在 PRE_UPDATE 之后，UPDATE 之前）
		const mainSubApp = app.main();
		mainSubApp.configureScheduleOrder(BuiltinSchedules.UPDATE, StateTransition);

		// 初始化状态资源
		if (this.config.initOnStartup !== false) {
			// Debug: Check if defaultState is a function
			if (!typeIs(this.config.defaultState, "function")) {
				error(`defaultState is not a function, got ${typeOf(this.config.defaultState)}`);
			}
			const defaultState = this.config.defaultState();
			// Use unified resource key generation
			const nextStateResourceKey = generateResourceKey("NextState", this.config.stateType) as ResourceConstructor<
				NextState<S>
			>;
			// 初始状态设置为 pending，让转换管理器处理
			this.resourceManager.insertResource(NextState.withPending(defaultState));
		}

		// 只在 StateTransition 调度中添加状态转换系统
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.processStateTransitions(worldParam, this.resourceManager, app);
			}
		});

		// 在 STARTUP 中处理初始状态（只执行一次）
		app.addSystems(BuiltinSchedules.STARTUP, (worldParam: World) => {
			// 处理初始状态的 OnEnter
			if (this.resourceManager) {
				this.processStateTransitions(worldParam, this.resourceManager, app);
			}
		});

		// 在 POST_UPDATE 中清理事件系统
		app.addSystems(BuiltinSchedules.POST_UPDATE, (worldParam: World) => {
			if (this.eventManager) {
				this.eventManager.cleanup();
			}
		});
	}

	/**
	 * 处理状态转换
	 * @param world - 游戏世界
	 * @param resourceManager - 资源管理器
	 * @param app - App 实例
	 */
	private processStateTransitions(world: World, resourceManager: ResourceManager, app: App): void {
		this.transitionManager.processTransition(world, resourceManager, app);
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		const stateType = this.config.stateType as unknown as { name?: string };
		return `StatesPlugin<${stateType.name ?? "State"}>`;
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
export class ComputedStatesPlugin<TSource extends States, TComputed extends ComputedStates<TSource>> implements Plugin {
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
		this.manager = new ComputedStateManager(computedType);
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const world = app.getWorld();
		// 尝试获取已存在的资源管理器，或创建新的
		const worldWithRM = world as unknown as Record<string, unknown>;
		this.resourceManager = (worldWithRM["stateResourceManager"] as ResourceManager) ?? new ResourceManager();
		if (worldWithRM["stateResourceManager"] === undefined) {
			worldWithRM["stateResourceManager"] = this.resourceManager;
		}

		// 添加计算状态更新系统 - 在 StateTransition 调度中运行，紧跟在状态转换之后
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
		return `ComputedStatesPlugin<${sourceType.name ?? "Source"}, ${computedType.name ?? "Computed"}>`;
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
export class SubStatesPlugin<TParent extends States, TSub extends SubStates<TParent>> implements Plugin {
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
		this.resourceManager = (worldWithRM["stateResourceManager"] as ResourceManager) ?? new ResourceManager();
		if (worldWithRM["stateResourceManager"] === undefined) {
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
			// Use unified resource key generation
			const nextStateResourceKey = generateResourceKey("NextState", this.subType) as ResourceConstructor<
				NextState<TSub>
			>;
			this.resourceManager.insertResource(NextState.unchanged<TSub>());
		}
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		const parentType = this.parentType as unknown as { name?: string };
		const subType = this.subType as unknown as { name?: string };
		return `SubStatesPlugin<${parentType.name ?? "Parent"}, ${subType.name ?? "Sub"}>`;
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	public isUnique(): boolean {
		return true;
	}
}
