import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { Actionlike } from "../core/actionlike";

/**
 * Manages the actual instances of InputMap and ActionState
 * Since Matter components can't store class methods, we need a separate manager
 */
export class InputInstanceManager<A extends Actionlike> {
	private inputMaps: Map<number, InputMap<A>> = new Map();
	private actionStates: Map<number, ActionState<A>> = new Map();

	/**
	 * Registers an InputMap for an entity
	 * @param entityId - The entity ID
	 * @param inputMap - The InputMap instance
	 */
	registerInputMap(entityId: number, inputMap: InputMap<A>): void {
		this.inputMaps.set(entityId, inputMap);
	}

	/**
	 * Registers an ActionState for an entity
	 * @param entityId - The entity ID
	 * @param actionState - The ActionState instance
	 */
	registerActionState(entityId: number, actionState: ActionState<A>): void {
		this.actionStates.set(entityId, actionState);
	}

	/**
	 * Gets the InputMap for an entity
	 * @param entityId - The entity ID
	 * @returns The InputMap instance or undefined
	 */
	getInputMap(entityId: number): InputMap<A> | undefined {
		return this.inputMaps.get(entityId);
	}

	/**
	 * Gets the ActionState for an entity
	 * @param entityId - The entity ID
	 * @returns The ActionState instance or undefined
	 */
	getActionState(entityId: number): ActionState<A> | undefined {
		return this.actionStates.get(entityId);
	}

	/**
	 * Removes instances for an entity
	 * @param entityId - The entity ID
	 */
	removeEntity(entityId: number): void {
		this.inputMaps.delete(entityId);
		this.actionStates.delete(entityId);
	}

	/**
	 * Clears all instances
	 */
	clear(): void {
		this.inputMaps.clear();
		this.actionStates.clear();
	}
}