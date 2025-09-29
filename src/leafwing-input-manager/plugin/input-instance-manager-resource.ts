import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { Actionlike } from "../actionlike";

/**
 * Resource wrapper for InputInstanceManager
 * Allows proper storage and retrieval from the ECS resource system
 */
export class InputInstanceManagerResource<A extends Actionlike>  {
	private readonly inputMaps: Map<number, InputMap<A>> = new Map();
	private readonly actionStates: Map<number, ActionState<A>> = new Map();
	private readonly actionType: string;

	/**
	 * Creates a new InputInstanceManagerResource
	 * @param actionTypeName - The name of the action type for identification
	 */
	constructor(actionTypeName: string) {
		this.actionType = actionTypeName;
	}

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

	/**
	 * Gets the action type name
	 * @returns The action type name
	 */
	getActionType(): string {
		return this.actionType;
	}

	/**
	 * Gets the number of registered entities
	 * @returns The count of entities with either input maps or action states
	 */
	getEntityCount(): number {
		const allEntities = new Set<number>();
		for (const [entityId] of this.inputMaps) {
			allEntities.add(entityId);
		}
		for (const [entityId] of this.actionStates) {
			allEntities.add(entityId);
		}
		return allEntities.size();
	}
}

