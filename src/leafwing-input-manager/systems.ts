/**
 * The systems that power each InputManagerPlugin.
 */

import { ActionState } from "./action-state/action-state";
import { ClashStrategy } from "./clashing-inputs/clash-strategy";
import { InputMap } from "./input-map/input-map";
import { Actionlike } from "./actionlike";
import { CentralInputStore } from "./user-input/central-input-store";
import { ActionDiff } from "./action-diff";
import { World } from "@rbxts/matter";

/**
 * We are about to enter the Main schedule, so we:
 * - save all the changes applied to state into the fixed_update_state
 * - switch to loading the update_state
 */
export function swapToUpdate<A extends Actionlike>(
	world: World,
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	if (resourceActionState) {
		resourceActionState.swapToUpdateState();
	}

	for (const entity of query) {
		entity.actionState.swapToUpdateState();
	}
}

/**
 * We are about to enter the FixedMain schedule, so we:
 * - save all the changes applied to state into the update_state
 * - switch to loading the fixed_update_state
 */
export function swapToFixedUpdate<A extends Actionlike>(
	world: World,
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	if (resourceActionState) {
		resourceActionState.swapToFixedUpdateState();
	}

	for (const entity of query) {
		entity.actionState.swapToFixedUpdateState();
	}
}

/**
 * Advances actions timer.
 *
 * Clears the just-pressed and just-released values of all ActionStates.
 * Also resets the internal pressed_this_tick field, used to track whether to release an action.
 */
export function tickActionState<A extends Actionlike>(
	world: World,
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState: ActionState<A> | undefined,
	currentTime: number,
	previousTime: number,
): void {
	// Only tick the ActionState resource if it exists
	if (resourceActionState) {
		// Calculate fixed delta time from the provided timestamps
		const fixedDeltaTime = currentTime - previousTime;
		resourceActionState.tick(fixedDeltaTime);
	}

	// Only tick the ActionState components if they exist
	for (const entity of query) {
		const fixedDeltaTime = currentTime - previousTime;
		entity.actionState.tick(fixedDeltaTime);
	}
}

/**
 * Fetches the CentralInputStore to update ActionState according to the InputMap.
 *
 * Clashes will be resolved according to the ClashStrategy resource.
 */
export function updateActionState<A extends Actionlike>(
	inputStore: CentralInputStore,
	clashStrategy: ClashStrategy,
	query: Array<{ actionState: ActionState<A>; inputMap: InputMap<A> }>,
	resourceActionState?: ActionState<A>,
	resourceInputMap?: InputMap<A>,
): void {
	// Handle resource-level action state and input map
	if (resourceActionState && resourceInputMap) {
		const processedActions = resourceInputMap.processActions(
			inputStore,
		);
		// TODO: Implement update method in ActionState
		// resourceActionState.update(processedActions);
	}

	// Handle entity-level action states and input maps
	for (const entity of query) {
		const processedActions = entity.inputMap.processActions(
			inputStore,
		);
		// TODO: Implement update method in ActionState
		// entity.actionState.update(processedActions);
	}
}

/**
 * Release all inputs if the window loses focus
 *
 * This prevents inputs from being "stuck" when the user alt-tabs away from the game.
 */
export function releaseOnWindowFocusLost<A extends Actionlike>(
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
	windowFocused: boolean = true,
): void {
	if (!windowFocused) {
		if (resourceActionState) {
			// TODO: Implement releaseAll method in ActionState
			// resourceActionState.releaseAll();
		}

		for (const entity of query) {
			// TODO: Implement releaseAll method in ActionState
			// entity.actionState.releaseAll();
		}
	}
}

/**
 * Generates ActionDiff messages for network synchronization
 *
 * This system captures the differences in action states and prepares them
 * for transmission over the network.
 */
export function generateActionDiffs<A extends Actionlike>(
	query: Array<{ entity: unknown; actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): Array<ActionDiff<A>> {
	const diffs: Array<ActionDiff<A>> = [];

	// TODO: Implement generateDiffs method in ActionState
	// Generate diffs for resource-level action state
	// if (resourceActionState) {
	//     const resourceDiffs = resourceActionState.generateDiffs();
	//     diffs.push(...resourceDiffs);
	// }

	// Generate diffs for entity-level action states
	// for (const entity of query) {
	//     const entityDiffs = entity.actionState.generateDiffs();
	//     diffs.push(...entityDiffs);
	// }

	return diffs;
}

/**
 * Applies received ActionDiff messages to update ActionStates
 *
 * This system processes incoming network messages to synchronize action states
 * across clients.
 */
export function applyActionDiffs<A extends Actionlike>(
	diffs: Array<ActionDiff<A>>,
	query: Array<{ entity: unknown; actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	for (const diff of diffs) {
		// Apply to resource-level action state if no owner specified
		// TODO: Implement applyDiff method in ActionState
		// if (!diff.owner && resourceActionState) {
		//     resourceActionState.applyDiff(diff);
		// }

		// Apply to entity-level action states
		// TODO: Implement applyDiff method in ActionState
		// for (const entity of query) {
		//     if (entity.entity === diff.owner) {
		//         entity.actionState.applyDiff(diff);
		//     }
		// }
	}
}

/**
 * Clears all action states
 *
 * This can be useful when transitioning between game states.
 */
export function clearActionStates<A extends Actionlike>(
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	// TODO: Implement clear method in ActionState
	// if (resourceActionState) {
	//     resourceActionState.clear();
	// }
	//
	// for (const entity of query) {
	//     entity.actionState.clear();
	// }
}

/**
 * Consume all inputs that have been captured by action states
 *
 * This prevents input events from propagating to other systems after being handled.
 */
export function consumeCapturedInputs<A extends Actionlike>(
	inputStore: CentralInputStore,
	query: Array<{ actionState: ActionState<A>; inputMap: InputMap<A> }>,
	resourceActionState?: ActionState<A>,
	resourceInputMap?: InputMap<A>,
): void {
	const consumedInputs = new Set<string>();

	// TODO: Implement getConsumedInputs method in InputMap
	// Collect consumed inputs from resource-level
	// if (resourceActionState && resourceInputMap) {
	//     const inputs = resourceInputMap.getConsumedInputs(resourceActionState);
	//     for (const input of inputs) {
	//         consumedInputs.add(input);
	//     }
	// }
	//
	// // Collect consumed inputs from entities
	// for (const entity of query) {
	//     const inputs = entity.inputMap.getConsumedInputs(entity.actionState);
	//     for (const input of inputs) {
	//         consumedInputs.add(input);
	//     }
	// }

	// Mark inputs as consumed in the central store
	// TODO: Implement markConsumed in CentralInputStore if needed
	// for (const input of consumedInputs) {
	//     inputStore.markConsumed(input);
	// }
}