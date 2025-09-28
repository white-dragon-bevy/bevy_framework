/**
 * Component wrappers for InputManager
 * These components are used to store input-related data on entities
 */

import { component } from "@rbxts/matter";
import { InputMap, InputMapComponent } from "../input-map/input-map";
import { ActionState, ActionStateComponent } from "../action-state/action-state";
import { Actionlike } from "../actionlike";

// Re-export existing components
export { InputMapComponent } from "../input-map/input-map";
export { ActionStateComponent } from "../action-state/action-state";

/**
 * Component that marks an entity as input-enabled
 * Entities without this component will not process inputs
 */
export const InputEnabled = component<{
	enabled: boolean;
}>("InputEnabled");

/**
 * Component that marks an entity as the local player
 * Used to distinguish local input from networked input
 */
export const LocalPlayer = component<{
	playerId: number;
}>("LocalPlayer");

/**
 * Bundle type for creating entities with input management
 * Provides a convenient way to spawn entities with all necessary input components
 */
export interface InputManagerBundle<A extends Actionlike> {
	inputMap: InputMap<A>;
	actionState: ActionState<A>;
	inputEnabled?: boolean;
	localPlayer?: boolean;
	playerId?: number;
}

/**
 * Helper function to create input components for an entity
 * @param bundle - The input manager bundle configuration
 * @returns Tuple of components to spawn with the entity
 */
export function createInputComponents<A extends Actionlike>(
	bundle: InputManagerBundle<A>,
): LuaTuple<unknown[]> {
	if (bundle.localPlayer) {
		return [
			InputMapComponent(bundle.inputMap as InputMap<Actionlike>),
			ActionStateComponent(bundle.actionState as ActionState<Actionlike>),
			InputEnabled({ enabled: bundle.inputEnabled ?? true }),
			LocalPlayer({ playerId: bundle.playerId ?? 1 }),
		] as LuaTuple<unknown[]>;
	} else {
		return [
			InputMapComponent(bundle.inputMap as InputMap<Actionlike>),
			ActionStateComponent(bundle.actionState as ActionState<Actionlike>),
			InputEnabled({ enabled: bundle.inputEnabled ?? true }),
		] as LuaTuple<unknown[]>;
	}
}