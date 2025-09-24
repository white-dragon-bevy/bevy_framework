/**
 * Wrapper functions for ActionState to ensure methods are properly bound
 * This is a workaround for potential prototype chain issues in Lua
 */

import { ActionState } from "./action-state";
import { Actionlike } from "../core/actionlike";

interface StateWithMethods<A extends Actionlike> {
	justPressed?: (action: A) => boolean;
	justReleased?: (action: A) => boolean;
	pressed?: (action: A) => boolean;
}

/**
 * Safely calls justPressed on an ActionState instance
 * @param state - The ActionState instance
 * @param action - The action to check
 * @returns True if the action was just pressed
 */
export function isJustPressed<A extends Actionlike>(state: ActionState<A>, action: A): boolean {
	try {
		const stateWithMethods = state as unknown as StateWithMethods<A>;
		if (stateWithMethods.justPressed && typeOf(stateWithMethods.justPressed) === "function") {
			return stateWithMethods.justPressed(action);
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Safely calls justReleased on an ActionState instance
 * @param state - The ActionState instance
 * @param action - The action to check
 * @returns True if the action was just released
 */
export function isJustReleased<A extends Actionlike>(state: ActionState<A>, action: A): boolean {
	try {
		const stateWithMethods = state as unknown as StateWithMethods<A>;
		if (stateWithMethods.justReleased && typeOf(stateWithMethods.justReleased) === "function") {
			return stateWithMethods.justReleased(action);
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Safely calls pressed on an ActionState instance
 * @param state - The ActionState instance
 * @param action - The action to check
 * @returns True if the action is currently pressed
 */
export function isPressed<A extends Actionlike>(state: ActionState<A>, action: A): boolean {
	try {
		const stateWithMethods = state as unknown as StateWithMethods<A>;
		if (stateWithMethods.pressed && typeOf(stateWithMethods.pressed) === "function") {
			return stateWithMethods.pressed(action);
		}
		return false;
	} catch {
		return false;
	}
}