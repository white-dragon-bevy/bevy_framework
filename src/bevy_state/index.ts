/**
 * bevy_state 模块 - Roblox TypeScript 移植版
 * 对应 Rust bevy_state crate
 *
 * 提供应用程序状态管理功能，包括：
 * - 标准状态 (States)
 * - 计算状态 (ComputedStates)
 * - 子状态 (SubStates)
 * - 状态转换和调度
 * - 运行条件
 */

// 核心导出
export {
	States,
	BaseStates,
	EnumStates,
	createStates,
	StateType,
	StateSet,
} from "./states";

export {
	FreelyMutableState,
	NextStateVariant,
	State,
	NextState,
	StateConstructor,
	DefaultStateFn,
	StateConfig,
} from "./resources";

export {
	StateTransition,
	StateTransitionMessage as StateTransitionEvent,
	OnEnter,
	OnExit,
	OnTransition,
	EnterSchedules,
	ExitSchedules,
	TransitionSchedules,
	StateTransitionManager,
	lastTransition,
	getStateTransitionReader,
} from "./transitions";

export {
	ComputedStates,
	BaseComputedStates,
	ComputedStateManager,
	createComputedState,
	MappedComputedState,
} from "./computed-states";

export {
	SubStates,
	BaseSubStates,
	SubStateConfig,
	SubStateManager,
	createEnumSubState,
} from "./sub-states";

export {
	RunCondition,
	inState,
	stateExists,
	stateChanged,
	exitingState,
	enteringState,
	andCondition,
	orCondition,
	notCondition,
	customCondition,
	alwaysRun,
	neverRun,
} from "./condition";

export {
	StatesPlugin,
	StatePluginConfig,
	ComputedStatesPlugin,
	SubStatesPlugin,
} from "./plugin";

export {
	StateScoped,
	StateScopedComponent,
	DespawnStrategy,
	despawnOnExitStateSystem,
	despawnOnEnterStateSystem,
	cleanupOnStateExit,
	cleanupOnStateEnter,
	markForDespawnOnExit,
	markForDespawnOnEnter,
	getStateScopedData,
	removeStateScopedMarker,
	getEntitiesInState,
	despawnAllInState,
	registerStateScopedSystems,
	StateScopedPluginConfig,
	DEFAULT_STATE_SCOPED_CONFIG,
} from "./state-scoped";

// Prelude 导出
export * as prelude from "./prelude";
