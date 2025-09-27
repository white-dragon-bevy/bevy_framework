/**
 * plugin.ts - 状态系统插件
 * 提供状态管理功能的集成
 */

import { World } from "@rbxts/matter";
import { App } from "../bevy_app/app";
import { Plugin } from "../bevy_app/plugin";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { ResourceManager, } from "../bevy_ecs/resource";
import { EnumStates, States } from "./states";
import { NextState, StateConstructor, DefaultStateFn } from "./resources";
import { StateTransition, StateTransitionManager } from "./transitions";
import { ComputedStates, ComputedStateManager } from "./computed-states";
import { SubStates, SubStateManager } from "./sub-states";
import { Modding } from "@flamework/core";
import { getGenericTypeDescriptor, getTypeDescriptor, TypeDescriptor } from "../bevy_core";
import { MessageRegistry } from "../bevy_ecs";

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
 * 状态插件配置
 */
export interface StatePluginConfig<S extends States> {

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
	private transitionManager: StateTransitionManager<S> = undefined as unknown as StateTransitionManager<S> ;
	private resourceManager?: ResourceManager;
	private messageRegistry?: MessageRegistry;

	/**
	 * 私有构造函数 (公开调用 create())
	 * @param config - 插件配置
	 */
	private constructor(config: StatePluginConfig<S>) {
		this.config = config;

	}

	/**
	 * 类型描述, 在 create() 时候添加.
	 */
	public statsTypeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor


	/**
	 * 创建新的状态资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro 
	 * 
	 * @param state - 初始状态
	 * @returns State 资源实例
	 */
	public static create<S extends States>(config: StatePluginConfig<S>,id?:Modding.Generic<S, "id">, text?: Modding.Generic<S,"text">): StatesPlugin<S>  {
		let typeDescriptor = getTypeDescriptor(id,text)
		assert(typeDescriptor, "Failed to get TypeDescriptor for StatesPlugin: type descriptor is required for plugin initialization")
		const result = new StatesPlugin(config);
		result.statsTypeDescriptor = typeDescriptor
		return result;
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const existingResourceManager = app.context.resources
		this.resourceManager = existingResourceManager;

		let existingEventManager = app.context.messages;
		this.messageRegistry = existingEventManager;

		// 设置转换管理器的事件管理器
		this.transitionManager = StateTransitionManager.create(this.statsTypeDescriptor,this.messageRegistry);

		// add to resources
		const stateTransitionManagerTypeDescriptor = getGenericTypeDescriptor<StateTransitionManager<S>>(this.statsTypeDescriptor)
		app.context.resources.insertResourceByTypeDescriptor(this.transitionManager,stateTransitionManagerTypeDescriptor)

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
			// 初始状态设置为 pending，让转换管理器处理
			const nextState = NextState.withPending(defaultState)
			this.resourceManager.insertResourceByTypeDescriptor(nextState,nextState.typeDescriptor);
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
			if (this.messageRegistry) {
				this.messageRegistry.cleanup();
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
		return this.statsTypeDescriptor.text
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
	 * todo , 增加 create
	 * @param sourceType - 源状态类型
	 * @param computedType - 计算状态类型
	 */
	private constructor(sourceType: StateConstructor<TSource>, computedType: new () => TComputed) {
		this.sourceType = sourceType;
		this.computedType = computedType;
		this.manager = new ComputedStateManager(computedType);
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		// 使用 App 上下文中的资源管理器，确保所有插件共享同一实例
		this.resourceManager = app.context.resources;

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
	private parentType: TypeDescriptor;
	private stateType: TypeDescriptor;
	private nextStateType: TypeDescriptor;
	private manager: SubStateManager<TParent, TSub>;
	private resourceManager?: ResourceManager;

	/**
	 * 私有构造函数 (公开调用 create())
	 * 
	 * @param parentType - 父状态类型
	 * @param stateType - State<TSub> 类型描述符
	 * @param nextStateType - NextState<TSub> 类型描述符
	 * @param subStateClass - 子状态类构造函数
	 */
	private constructor(
		parentType: TypeDescriptor,
		stateType: TypeDescriptor,
		nextStateType: TypeDescriptor,
		subStateClass: new () => TSub,

	) {
		this.parentType = parentType;
		this.stateType = stateType;
		this.nextStateType = nextStateType;
		this.manager = new SubStateManager(parentType, stateType, nextStateType, subStateClass);
	}


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
	public static create<TParent extends States, TSub extends SubStates<TParent>>(
		subStateClass: new () => TSub,
		pid?:Modding.Generic<TParent, "id">,
		ptext?: Modding.Generic<TParent,"text">,
		sid?:Modding.Generic<TSub, "id">,
		stext?: Modding.Generic<TSub,"text">,

	): SubStatesPlugin<TParent , TSub>  {
			const parentType = getTypeDescriptor(pid,ptext)
			// 为 State<TSub> 和 NextState<TSub> 创建不同的类型描述符
			const stateType = getTypeDescriptor(sid ? `State_${sid}` : undefined, stext ? `State<${stext}>` : undefined)
			const nextStateType = getTypeDescriptor(sid ? `NextState_${sid}` : undefined, stext ? `NextState<${stext}>` : undefined)
			assert(parentType, "Failed to get TypeDescriptor for parent state: parent type descriptor is required for SubStatesPlugin")
			assert(stateType, "Failed to get TypeDescriptor for sub state: state type descriptor is required for SubStatesPlugin")
			assert(nextStateType, "Failed to get TypeDescriptor for next sub state: next state type descriptor is required for SubStatesPlugin")
			const result = new SubStatesPlugin(parentType,stateType,nextStateType,subStateClass)
			return result
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		// 使用 App 上下文中的资源管理器，确保所有插件共享同一实例
		this.resourceManager = app.context.resources;

		// 添加子状态管理系统
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.manager.updateSubState(worldParam, this.resourceManager);
				this.manager.processSubStateTransition(worldParam, this.resourceManager);
			}
		});

		// 初始化 NextState 资源
		if (this.resourceManager) {
			this.resourceManager.insertResourceByTypeDescriptor(NextState.unchanged<TSub>(),this.nextStateType);
		}
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		const parentType = this.parentType as unknown as { name?: string };
		const stateType = this.stateType as unknown as { name?: string };
		return `SubStatesPlugin<${parentType.name ?? "Parent"}, ${stateType.name ?? "Sub"}>`;
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	public isUnique(): boolean {
		return true;
	}
}
