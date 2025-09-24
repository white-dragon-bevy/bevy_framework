/**
 * despawn-on-exit.ts - DespawnOnExit component and cleanup system
 * Automatically removes entities when exiting a specific state
 */

import { component } from "@rbxts/matter";
import type { World, Entity } from "@rbxts/matter";
import { States } from "../../../bevy_state/states";
import type { ComputedStates } from "../../../bevy_state/computed-states";

/**
 * Component to mark entities for cleanup when exiting a state
 * @param stateId - The state identifier to watch for exit
 */
export const DespawnOnExit = component<{
	readonly stateId: string | number;
}>("DespawnOnExit");

/**
 * Component to mark entities for cleanup when a computed state doesn't exist
 * @param stateType - The computed state type name
 */
export const DespawnOnComputedExit = component<{
	readonly stateType: string;
}>("DespawnOnComputedExit");

/**
 * System that handles entity cleanup when states exit
 * @param world - The game world
 * @param previousState - The previous state (if any)
 * @param currentState - The current state (if any)
 */
export function despawnOnExitSystem(
	world: World,
	previousState: States | undefined,
	currentState: States | undefined,
): void {
	// If we're exiting a state
	if (previousState && (!currentState || !previousState.equals(currentState))) {
		const previousStateId = previousState.getStateId();

		// Find all entities marked for cleanup on this state exit
		for (const [entity, despawnData] of world.query(DespawnOnExit)) {
			if (despawnData.stateId === previousStateId) {
				// Remove the entity
				world.despawn(entity);
			}
		}
	}
}

/**
 * System that handles entity cleanup for computed states
 * @param world - The game world
 * @param stateType - The computed state type name
 * @param exists - Whether the computed state currently exists
 */
export function despawnOnComputedExitSystem(
	world: World,
	stateType: string,
	exists: boolean,
): void {
	// If the computed state doesn't exist
	if (!exists) {
		// Find all entities marked for cleanup when this computed state doesn't exist
		for (const [entity, despawnData] of world.query(DespawnOnComputedExit)) {
			if (despawnData.stateType === stateType) {
				// Remove the entity
				world.despawn(entity);
			}
		}
	}
}

/**
 * Helper function to mark an entity for cleanup on state exit
 * @param world - The game world
 * @param entity - The entity to mark
 * @param state - The state to watch for exit
 */
export function markForDespawnOnExit(world: World, entity: Entity, state: States): void {
	world.insert(entity, DespawnOnExit({ stateId: state.getStateId() }));
}

/**
 * Helper function to mark an entity for cleanup when computed state doesn't exist
 * @param world - The game world
 * @param entity - The entity to mark
 * @param stateType - The computed state type name
 */
export function markForDespawnOnComputedExit(
	world: World,
	entity: Entity,
	stateType: string,
): void {
	world.insert(entity, DespawnOnComputedExit({ stateType }));
}