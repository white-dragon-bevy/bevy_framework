/**
 * prelude.ts - 常用导出的便捷模块
 * 包含 bevy_state 最常用的类型和函数
 */

// 核心状态类型
export { States, EnumStates, createStates } from "./states";

// 资源
export { State, NextState, NextStateVariant } from "./resources";

// 命令扩展
export { insertState, removeState, setState } from "./commands";

// 转换
export {
	StateTransition,
	StateTransitionMessage as StateTransitionEvent,
	OnEnter,
	OnExit,
	OnTransition,
	DependentTransitions,
	lastTransition,
	getStateTransitionReader,
} from "./transitions";

// 计算和子状态
export {
	ComputedStates,
	createComputedState,
	sortByDependencyDepth,
} from "./computed-states";
export { SubStates, createEnumSubState } from "./sub-states";

// 条件
export {
	RunCondition,
	inState,
	stateExists,
	stateChanged,
} from "./condition";

// 插件
export {
	StatesPlugin,
	ComputedStatesPlugin,
	SubStatesPlugin,
	StateTransitionSystems,
} from "./plugin";

// 状态作用域
export {
	StateScoped,
	DespawnStrategy,
	markForDespawnOnExit,
	markForDespawnOnEnter,
	despawnAllInState,
} from "./state-scoped";

// App 扩展
export { appInitState, appInsertState, appAddComputedState, appAddSubState } from "./app";
