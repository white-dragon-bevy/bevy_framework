/**
 * Bevy State System for Roblox-TS
 * 状态管理系统，提供有限状态机功能
 */

export { State, NextState } from "./state";
export { StateManager } from "./state-manager";
export { StateTransition, StateTransitionEvent } from "./transitions";
export { StateEnterEvent, StateExitEvent } from "./events";
export { ComputedState } from "./computed-state";
export { SubState } from "./sub-state";
export { StatePlugin } from "./plugin";

export type {
	StateDefinition,
	TransitionCondition,
	StateChangeHandler,
	StateTransitionHandler,
} from "./types";