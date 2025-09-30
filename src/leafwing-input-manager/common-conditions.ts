/**
 * Run conditions for actions.
 */

import { ActionState } from "./action-state/action-state";
import { Actionlike } from "./actionlike";

/**
 * Stateful run condition that can be toggled via an action press using ActionState.justPressed.
 * @param defaultState - Initial toggle state
 * @param action - The action to monitor for toggling
 * @returns A function that returns the current toggle state
 */
export function actionToggleActive<A extends Actionlike>(
	defaultState: boolean,
	action: A,
): (actionState: ActionState<A>) => boolean {
	let active = defaultState;

	return (actionState: ActionState<A>): boolean => {
		if (actionState.justPressed(action)) {
			active = !active;
		}
		return active;
	};
}

/**
 * Run condition that is active if ActionState.pressed is true for the given action.
 * @param action - The action to check
 * @returns A function that returns whether the action is pressed
 */
export function actionPressed<A extends Actionlike>(
	action: A,
): (actionState: ActionState<A>) => boolean {
	return (actionState: ActionState<A>): boolean => {
		return actionState.pressed(action);
	};
}

/**
 * Run condition that is active if ActionState.justPressed is true for the given action.
 * @param action - The action to check
 * @returns A function that returns whether the action was just pressed
 */
export function actionJustPressed<A extends Actionlike>(
	action: A,
): (actionState: ActionState<A>) => boolean {
	return (actionState: ActionState<A>): boolean => {
		return actionState.justPressed(action);
	};
}

/**
 * Run condition that is active if ActionState.justReleased is true for the given action.
 * @param action - The action to check
 * @returns A function that returns whether the action was just released
 */
export function actionJustReleased<A extends Actionlike>(
	action: A,
): (actionState: ActionState<A>) => boolean {
	return (actionState: ActionState<A>): boolean => {
		return actionState.justReleased(action);
	};
}
