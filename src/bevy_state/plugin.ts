/**
 * plugin.ts - 状态系统插件
 * 提供状态管理功能的集成
 */

import { App } from "../bevy_app/app";
import { BasePlugin, Plugin } from "../bevy_app/plugin";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { ResourceManager } from "../bevy_ecs/resource";
import { EnumStates, States } from "./states";
import { State, NextState, StateConstructor, DefaultStateFn } from "./resources";
import { StateTransition, StateTransitionManager } from "./transitions";
import { ComputedStates, ComputedStateManager } from "./computed-states";
import { SubStates, SubStateManager } from "./sub-states";
import { Modding } from "@flamework/core";
import { getGenericTypeDescriptor, getTypeDescriptor, TypeDescriptor } from "../bevy_core";
import { Context, MessageRegistry, World } from "../bevy_ecs";
import { RobloxContext } from "utils";

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
 *
 * **配置说明**:
 * - defaultState: 提供默认初始状态的工厂函数
 * - initOnStartup: 是否在应用启动时自动初始化状态（默认 true）
 */
export interface StatePluginConfig<S extends States> {

	/**
	 * 默认状态工厂函数
	 *
	 * **注意**: 必须是函数而非直接的状态值，以支持延迟初始化
	 */
	readonly defaultState: DefaultStateFn<S>;

	/**
	 * 是否在启动时初始化
	 *
	 * **默认值**: true
	 * **用途**: 设置为 false 可延迟状态初始化，需手动设置 NextState
	 */
	readonly initOnStartup?: boolean;
}


/**
 * 状态管理插件
 *
 * **职责**:
 * - 初始化状态资源（State<S> 和 NextState<S>）
 * - 注册状态转换调度（StateTransition）
 * - 管理状态生命周期和转换流程
 * - 协调 OnEnter、OnExit、OnTransition 调度的执行
 *
 * **插件注册顺序要求**:
 * 1. 首先注册 ComputedStatesPlugin 和 SubStatesPlugin（派生状态）
 * 2. 然后注册 StatesPlugin（父状态）
 * 3. 这样可以确保派生状态的更新系统在父状态转换系统之前执行
 * 4. 遵循 DependentTransitions → ExitSchedules → TransitionSchedules → EnterSchedules 的执行顺序
 *
 * **状态转换执行阶段**（按 Rust Bevy 规范）:
 * - DependentTransitions: 更新 ComputedStates 和 SubStates
 * - ExitSchedules: 执行 OnExit 调度
 * - TransitionSchedules: 执行 OnTransition 调度
 * - EnterSchedules: 执行 OnEnter 调度
 *
 * **使用示例**:
 * ```typescript
 * // 正确的注册顺序：派生状态插件在前，父状态插件在后
 * app.addPlugin(new ComputedStatesPlugin(GameState, PausedState));
 * app.addPlugin(SubStatesPlugin.create(MenuSubState));
 * app.addPlugin(StatesPlugin.create({
 *     defaultState: () => GameState.Menu
 * }));
 * ```
 *
 * @template S - 状态类型，必须实现 States 接口
 */
export class StatesPlugin<S extends States> extends BasePlugin {
	private config: StatePluginConfig<S>;
	private transitionManager: StateTransitionManager<S> = undefined as unknown as StateTransitionManager<S> ;
	private resourceManager?: ResourceManager;
	private messageRegistry?: MessageRegistry;

	/**
	 * 私有构造函数 (公开调用 create())
	 *
	 * @param config - 插件配置对象
	 */
	private constructor(config: StatePluginConfig<S>) {
		super()
		this.config = config;

	}

	/**
	 * 类型描述, 在 create() 时候添加.
	 */
	public statsTypeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor


	/**
	 * 创建新的状态插件实例
	 *
	 * **注意**: @claudecode , @cursor , 这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 *
	 * @param config - 插件配置对象
	 * @param id - 状态类型标识符 (由 Flamework 宏自动提供)
	 * @param text - 状态类型文本描述 (由 Flamework 宏自动提供)
	 * @returns StatesPlugin 实例
	 */
	public static create<S extends States>(config: StatePluginConfig<S>,id?:Modding.Generic<S, "id">, text?: Modding.Generic<S,"text">): StatesPlugin<S>  {
		let typeDescriptor = getTypeDescriptor(id,text)
		assert(typeDescriptor, "Failed to get TypeDescriptor for StatesPlugin: type descriptor is required for plugin initialization")
		const result = new StatesPlugin(config);
		result.statsTypeDescriptor = typeDescriptor
		return result;
	}

	/**
	 * 构建插件并注册到应用
	 *
	 * **执行流程**:
	 * 1. 初始化资源管理器和事件管理器
	 * 2. 创建状态转换管理器
	 * 3. 注册 StateTransition 调度
	 * 4. 初始化默认状态资源
	 * 5. 添加状态转换系统和清理系统
	 *
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const existingResourceManager = app.world().world.resources
		this.resourceManager = existingResourceManager;

		let existingEventManager = app.world().world.messages;
		this.messageRegistry = existingEventManager;

		// 设置转换管理器的事件管理器
		this.transitionManager = StateTransitionManager.create(this.statsTypeDescriptor,this.messageRegistry);

		// add to resources
		const stateTransitionManagerTypeDescriptor = getGenericTypeDescriptor<StateTransitionManager<S>>(this.statsTypeDescriptor)
		app.world().world.resources.insertResourceByTypeDescriptor(this.transitionManager,stateTransitionManagerTypeDescriptor)

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
	 * 处理状态转换逻辑
	 *
	 * **内部方法**: 由插件系统在 StateTransition 调度中自动调用
	 *
	 * @param world - 游戏世界实例
	 * @param resourceManager - 资源管理器实例
	 * @param app - 应用实例
	 */
	private processStateTransitions(world: World, resourceManager: ResourceManager, app: App): void {
		this.transitionManager.processTransition(world, resourceManager, app);
	}

	/**
	 * 获取插件名称
	 *
	 * @returns 插件的唯一标识名称
	 */
	public name(): string {
		return this.statsTypeDescriptor.text
	}

	/**
	 * 检查插件是否唯一
	 *
	 * **说明**: StatesPlugin 为唯一插件,每个状态类型只能注册一次
	 *
	 * @returns 始终返回 true
	 */
	public isUnique(): boolean {
		return true;
	}
}

/**
 * 计算状态插件
 *
 * **职责**:
 * - 注册计算状态的更新系统
 * - 在 StateTransition 调度中自动更新计算状态
 * - 保持计算状态与源状态同步
 *
 * **使用场景**:
 * - 从一个或多个源状态派生新状态
 * - 实现状态的映射、过滤、组合等逻辑
 *
 * **使用示例**:
 * ```typescript
 * app.addPlugin(new ComputedStatesPlugin(AppState, PausedState));
 * ```
 *
 * @template TSource - 源状态类型
 * @template TComputed - 计算状态类型
 */
export class ComputedStatesPlugin<TSource extends States, TComputed extends ComputedStates<TSource>> implements Plugin {
	private sourceType: StateConstructor<TSource>;
	private computedType: new () => TComputed;
	private manager: ComputedStateManager<TSource, TComputed>;
	private resourceManager?: ResourceManager;

	/**
	 * 构造函数
	 *
	 * **TODO**: 增加静态 create() 方法以支持 Modding 宏系统
	 *
	 * @param sourceType - 源状态类型构造函数
	 * @param computedType - 计算状态类型构造函数
	 */
	private constructor(sourceType: StateConstructor<TSource>, computedType: new () => TComputed) {
		this.sourceType = sourceType;
		this.computedType = computedType;
		this.manager = new ComputedStateManager(computedType);
	}

	/**
	 * 构建插件并注册到应用
	 *
	 * **执行流程**:
	 * 1. 获取应用的资源管理器
	 * 2. 注册计算状态更新系统到 StateTransition 调度
	 *
	 * **重要**: 计算状态更新系统必须在 DependentTransitions 阶段运行，
	 * 即在状态转换（ExitSchedules/TransitionSchedules/EnterSchedules）之前执行，
	 * 确保派生状态基于最新的父状态值更新。
	 *
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		// 使用 App 上下文中的资源管理器，确保所有插件共享同一实例
		this.resourceManager = app.world().world.resources;

		// 添加计算状态更新系统 - 在 StateTransition 调度中运行
		// 注意：这个系统应该在 DependentTransitions 阶段运行（在 ExitSchedules 之前）
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.manager.updateComputedState(worldParam, this.resourceManager);
			}
		});
	}

	/**
	 * 获取插件名称
	 *
	 * @returns 插件的唯一标识名称
	 */
	public name(): string {
		// 类型守卫：安全获取类型名称
		const getTypeName = (typeConstructor: unknown): string => {
			if (typeIs(typeConstructor, "table")) {
				const typeTable = typeConstructor as Record<string, unknown>;
				if (typeIs(typeTable.name, "string")) {
					return typeTable.name;
				}
			}
			return tostring(typeConstructor);
		};

		const sourceName = getTypeName(this.sourceType);
		const computedName = getTypeName(this.computedType);
		return `ComputedStatesPlugin<${sourceName}, ${computedName}>`;
	}

	/**
	 * 检查插件是否唯一
	 *
	 * **说明**: ComputedStatesPlugin 为唯一插件,每个计算状态类型只能注册一次
	 *
	 * @returns 始终返回 true
	 */
	public isUnique(): boolean {
		return true;
	}
}

/**
 * 子状态插件
 *
 * **职责**:
 * - 管理子状态的生命周期
 * - 在父状态改变时自动创建/销毁子状态
 * - 处理子状态的转换逻辑
 *
 * **使用场景**:
 * - 实现嵌套状态机
 * - 在特定父状态下激活子状态
 * - 状态层级管理
 *
 * **使用示例**:
 * ```typescript
 * app.addPlugin(SubStatesPlugin.create(MenuSubState));
 * ```
 *
 * @template TParent - 父状态类型
 * @template TSub - 子状态类型
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
	 * @param parentType - 父状态类型描述符
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
	ready?(app: App): boolean {
		error("Method not implemented.");
	}
	finish?(app: App): void {
		error("Method not implemented.");
	}
	cleanup?(app: App): void {
		error("Method not implemented.");
	}
	robloxContext?: RobloxContext | undefined;


	/**
	 * 类型描述, 在 create() 时候添加.
	 */
	private _typeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor

	/**
	 * 获取类型描述符
	 *
	 * @returns 子状态的类型描述符
	 */
	public getTypeDescriptor():TypeDescriptor{
		return this._typeDescriptor
	}

	/**
	 * 创建新的子状态插件实例
	 *
	 * **注意**: @claudecode , @cursor , 这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 *
	 * @param subStateClass - 子状态类构造函数
	 * @param pid - 父状态类型标识符 (由 Flamework 宏自动提供)
	 * @param ptext - 父状态类型文本描述 (由 Flamework 宏自动提供)
	 * @param sid - 子状态类型标识符 (由 Flamework 宏自动提供)
	 * @param stext - 子状态类型文本描述 (由 Flamework 宏自动提供)
	 * @returns SubStatesPlugin 实例
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
	 * 构建插件并注册到应用
	 *
	 * **执行流程**:
	 * 1. 获取应用的资源管理器
	 * 2. 在 Startup 阶段确保初始状态正确（避免竞态）
	 * 3. 注册子状态管理系统到 StateTransition 调度
	 * 4. 初始化 NextState<TSub> 资源
	 *
	 * **重要**: 子状态更新系统必须在 DependentTransitions 阶段运行，
	 * 即在状态转换（ExitSchedules/TransitionSchedules/EnterSchedules）之前执行，
	 * 确保子状态基于最新的父状态值更新。
	 *
	 * **竞态条件修复**: 在 Startup 阶段强制同步初始状态，确保无论插件注册顺序如何，
	 * 子状态都能正确初始化。
	 *
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		// 使用 App 上下文中的资源管理器，确保所有插件共享同一实例
		this.resourceManager = app.world().world.resources;

		// 初始化 NextState 资源（必须在所有系统之前）
		if (this.resourceManager) {
			const nextStateResource = NextState.unchanged<TSub>();
			nextStateResource.typeDescriptor = this.nextStateType;
			this.resourceManager.insertResourceByTypeDescriptor(nextStateResource, this.nextStateType);
		}

		// 在 Startup 阶段确保初始状态正确（避免竞态条件）
		app.addSystems(BuiltinSchedules.STARTUP, (worldParam: World) => {
			if (this.resourceManager) {
				this.ensureInitialSubState(worldParam, this.resourceManager);
			}
		});

		// 添加子状态管理系统 - 在 StateTransition 调度中运行
		// 注意：这个系统应该在 DependentTransitions 阶段运行（在 ExitSchedules 之前）
		app.addSystems(StateTransition as unknown as string, (worldParam: World) => {
			if (this.resourceManager) {
				this.manager.updateSubState(worldParam, this.resourceManager);
				this.manager.processSubStateTransition(worldParam, this.resourceManager);
			}
		});
	}

	/**
	 * 确保初始子状态正确
	 *
	 * **职责**: 在 Startup 阶段强制同步子状态，避免初始化竞态条件
	 *
	 * **执行逻辑**:
	 * 1. 检查父状态是否已初始化
	 * 2. 检查子状态是否应该存在
	 * 3. 如果应该存在但不存在，创建初始子状态
	 * 4. 如果不应该存在但存在，移除子状态
	 *
	 * @param world - 游戏世界实例
	 * @param resourceManager - 资源管理器实例
	 */
	private ensureInitialSubState(world: World, resourceManager: ResourceManager): void {
		// 检查父状态是否已初始化
		const parentState = resourceManager.getResourceByTypeDescriptor<State<TParent>>(this.parentType);

		if (parentState === undefined) {
			// 父状态尚未初始化，延迟到下一帧处理
			// 这是正常情况，因为父状态可能在后续的 Startup 系统中初始化
			return;
		}

		// 使用 manager 的 updateSubState 方法确保子状态正确
		this.manager.updateSubState(world, resourceManager);
	}

	/**
	 * 获取插件名称
	 *
	 * @returns 插件的唯一标识名称
	 */
	public name(): string {
		// 类型守卫：安全获取类型名称
		const getTypeName = (typeDescriptor: TypeDescriptor): string => {
			if (typeIs(typeDescriptor.text, "string")) {
				return typeDescriptor.text;
			}
			return tostring(typeDescriptor.id);
		};

		const parentName = getTypeName(this.parentType);
		const stateName = getTypeName(this.stateType);
		return `SubStatesPlugin<${parentName}, ${stateName}>`;
	}

	/**
	 * 检查插件是否唯一
	 *
	 * **说明**: SubStatesPlugin 为唯一插件,每个子状态类型只能注册一次
	 *
	 * @returns 始终返回 true
	 */
	public isUnique(): boolean {
		return true;
	}
}
