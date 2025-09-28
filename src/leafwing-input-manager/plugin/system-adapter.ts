/**
 * System adapters to bridge Rust-style system functions with Matter ECS
 *
 * This module provides adapters that convert Rust-style system functions
 * (which expect pre-computed queries as parameters) into Matter-compatible
 * system functions (which query the world internally).
 */

import { BevyWorld, Context } from "../../bevy_ecs/types";
import { Actionlike } from "../actionlike";
import { ActionState } from "../action-state/action-state";
import { InputMap } from "../input-map/input-map";
import { CentralInputStore } from "../user-input/central-input-store";
import { ClashStrategy, ClashStrategyResource } from "../clashing-inputs/clash-strategy";
import { InputMapComponent, ActionStateComponent } from "./components";
import * as Systems from "../systems";
import { Instant } from "../instant";

/**
 * Creates an adapter for the tickActionState system
 * @param actionType - The action type class
 * @returns A Matter-compatible system function
 */
export function createTickActionStateAdapter<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
) {
	return (world: BevyWorld, context: Context): void => {
		// Get resource-level ActionState if it exists
		const resourceActionState = world.resources.getResource<ActionState<A>>(
			ActionState as any,
		);

		// Query for all entities with ActionState components
		const query: Array<{ actionState: ActionState<A> }> = [];
		for (const [entity, actionStateData] of world.query(ActionStateComponent)) {
			const actionState = actionStateData as unknown as ActionState<A>;
			query.push({ actionState });
		}

		// Get current and previous time
		const currentTime = os.clock();
		// Use a closure variable to store previous time across calls
		const contextData = context as unknown as { __previousTickTime?: number };
		const previousTime = contextData.__previousTickTime ?? currentTime;
		contextData.__previousTickTime = currentTime;

		// Call the Rust-style system function
		Systems.tickActionState(world, query, resourceActionState, currentTime, previousTime);
	};
}

/**
 * Creates an adapter for the updateActionState system
 * @param actionType - The action type class
 * @returns A Matter-compatible system function
 */
export function createUpdateActionStateAdapter<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
) {
	return (world: BevyWorld, context: Context): void => {
		// Get required resources
		const inputStore = world.resources.getResource<CentralInputStore>(CentralInputStore as any);
		if (!inputStore) {
			return;
		}

		const clashStrategyResource = world.resources.getResource<ClashStrategyResource>();
		const clashStrategy = clashStrategyResource?.strategy ?? ClashStrategy.PrioritizeLargest;

		const resourceActionState = world.resources.getResource<ActionState<A>>(
			ActionState as any,
		);
		const resourceInputMap = world.resources.getResource<InputMap<A>>(InputMap as any);

		// Query for all entities with both ActionState and InputMap components
		const query: Array<{ actionState: ActionState<A>; inputMap: InputMap<A> }> = [];
		for (const [entity, actionStateData, inputMapData] of world.query(
			ActionStateComponent,
			InputMapComponent,
		)) {
			const actionState = actionStateData as unknown as ActionState<A>;
			const inputMap = inputMapData as unknown as InputMap<A>;
			query.push({ actionState, inputMap });
		}

		// Call the Rust-style system function
		Systems.updateActionState(inputStore, clashStrategy, query, resourceActionState, resourceInputMap);
	};
}

/**
 * Creates an adapter for the swapToUpdate system
 * @param actionType - The action type class
 * @returns A Matter-compatible system function
 */
export function createSwapToUpdateAdapter<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
) {
	return (world: BevyWorld, context: Context): void => {
		const resourceActionState = world.resources.getResource<ActionState<A>>(
			ActionState as any,
		);

		const query: Array<{ actionState: ActionState<A> }> = [];
		for (const [entity, actionStateData] of world.query(ActionStateComponent)) {
			const actionState = actionStateData as unknown as ActionState<A>;
			query.push({ actionState });
		}

		Systems.swapToUpdate(world, query, resourceActionState);
	};
}

/**
 * Creates an adapter for the swapToFixedUpdate system
 * @param actionType - The action type class
 * @returns A Matter-compatible system function
 */
export function createSwapToFixedUpdateAdapter<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
) {
	return (world: BevyWorld, context: Context): void => {
		const resourceActionState = world.resources.getResource<ActionState<A>>(
			ActionState as any,
		);

		const query: Array<{ actionState: ActionState<A> }> = [];
		for (const [entity, actionStateData] of world.query(ActionStateComponent)) {
			const actionState = actionStateData as unknown as ActionState<A>;
			query.push({ actionState });
		}

		Systems.swapToFixedUpdate(world, query, resourceActionState);
	};
}

/**
 * Creates an adapter for the clearCentralInputStore system
 * @returns A Matter-compatible system function
 */
export function createClearCentralInputStoreAdapter() {
	return (world: BevyWorld, context: Context): void => {
		const inputStore = world.resources.getResource<CentralInputStore>(CentralInputStore as any);
		if (inputStore) {
			Systems.clearCentralInputStore(inputStore);
		}
	};
}

/**
 * Creates an adapter for the releaseOnWindowFocusLost system
 * @param actionType - The action type class
 * @returns A Matter-compatible system function
 */
export function createReleaseOnWindowFocusLostAdapter<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
) {
	return (world: BevyWorld, context: Context): void => {
		const resourceActionState = world.resources.getResource<ActionState<A>>(
			ActionState as any,
		);

		const query: Array<{ actionState: ActionState<A> }> = [];
		for (const [entity, actionStateData] of world.query(ActionStateComponent)) {
			const actionState = actionStateData as unknown as ActionState<A>;
			query.push({ actionState });
		}

		// In Roblox, we consider the window always focused
		// This could be extended to check UserInputService.WindowFocused if needed
		const windowFocused = true;

		Systems.releaseOnWindowFocusLost(query, resourceActionState, windowFocused);
	};
}

/**
 * Creates all system adapters for a given action type
 * @param actionType - The action type class
 * @returns An object containing all adapted system functions
 */
export function createSystemAdapters<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
) {
	return {
		tickActionState: createTickActionStateAdapter(actionType),
		updateActionState: createUpdateActionStateAdapter(actionType),
		swapToUpdate: createSwapToUpdateAdapter(actionType),
		swapToFixedUpdate: createSwapToFixedUpdateAdapter(actionType),
		clearCentralInputStore: createClearCentralInputStoreAdapter(),
		releaseOnWindowFocusLost: createReleaseOnWindowFocusLostAdapter(actionType),
	};
}