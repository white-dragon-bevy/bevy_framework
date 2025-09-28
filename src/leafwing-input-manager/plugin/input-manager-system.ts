import { World } from "@rbxts/matter";
import { CentralInputStore } from "../user-input/central-input-store";
import { InputMap, InputMapComponent, ProcessedActionState } from "../input-map/input-map";
import { ActionState, ActionStateComponent, UpdatedActions } from "../action-state/action-state";
import { Actionlike } from "../actionlike";

import { InputManagerPluginConfig } from "./input-manager-plugin";
import { ClashDetector } from "../clashing-inputs/clash-detection";
import { ClashStrategy } from "../clashing-inputs/clash-strategy";
import { ActionDiff, serializeActionDiff, deserializeActionDiff } from "../action-diff";

/**
 * Summarized state for network transmission
 */
class SummarizedActionState<A extends Actionlike> {
	private readonly actionStates: Map<string, boolean> = new Map();

	static fromActionState<A extends Actionlike>(state: ActionState<A>): SummarizedActionState<A> {
		const summarized = new SummarizedActionState<A>();
		// Store pressed states for all actions
		// Note: actionData is private, we need a different approach
		return summarized;
		return summarized;
	}

	isPressed(actionHash: string): boolean {
		return this.actionStates.get(actionHash) ?? false;
	}

	generateDiffs(previousState: SummarizedActionState<A> | undefined): ActionDiff<A>[] {
		// Generate diffs between this state and previous state
		const diffs: ActionDiff<A>[] = [];
		// This is a simplified implementation
		return diffs;
	}
}
import { InputEnabled } from "./input-enabled";
import { LocalPlayer } from "./local-player";
import { InputInstanceManager } from "./input-instance-manager";
import { InputInstanceManagerResource } from "./input-instance-manager-resource";

/**
 * System that processes input for all entities with InputMap and ActionState components
 */
export class InputManagerSystem<A extends Actionlike> {
	private world: World;
	private centralStore: CentralInputStore;
	private config: InputManagerPluginConfig<A>;
	private clashDetector: ClashDetector<A>;
	private previousStates: Map<number, SummarizedActionState<A>> = new Map();
	private previousProcessedStates: Map<number, Map<string, ProcessedActionState>> = new Map();
	private instanceManager: InputInstanceManagerResource<A>;

	constructor(
		world: World,
		centralStore: CentralInputStore,
		config: InputManagerPluginConfig<A>,
		instanceManager: InputInstanceManagerResource<A>,
	) {
		this.world = world;
		this.centralStore = centralStore;
		this.config = config;
		this.clashDetector = new ClashDetector<A>();
		this.instanceManager = instanceManager;
	}

	/**
	 * Updates all input-enabled entities
	 * @param deltaTime - Time since last update
	 */
	update(deltaTime: number): void {
		// Query for entities with input components
		// Match the same query as updateActionState for consistency
		let processedEntities = 0;
		for (const [entityId, inputMapData, actionStateData] of this.world.query(
			InputMapComponent,
			ActionStateComponent,
		)) {
			processedEntities++;
			
			// Get the actual instances from the manager
			const actionStateInstance = this.instanceManager.getActionState(entityId);
			const inputMapInstance = this.instanceManager.getInputMap(entityId);
			
			// Debug: Log processing
			if (processedEntities === 1) { // Only log for first entity to avoid spam
				print(`[InputManagerSystem] Processing entity ${entityId}, hasActionState: ${actionStateInstance !== undefined}, hasInputMap: ${inputMapInstance !== undefined}`);
			}

			if (!actionStateInstance || !inputMapInstance) {
				// Skip if instances not found
				continue;
			}

			// Get previous processed states for this entity
			const previousProcessed = this.previousProcessedStates.get(entityId);

			// Process input map to get updated action states
			const updatedActions = inputMapInstance.processActions(this.centralStore, previousProcessed);

			// Store current processed states for next frame
			this.previousProcessedStates.set(entityId, updatedActions.actionData);

			// Apply actions directly without clashes (simplified)
			updatedActions.actionData.forEach((processedState, actionHash) => {
				const action = actionStateInstance.getActionByHash(actionHash);
				if (action) {
					if (processedState.justPressed) {
						actionStateInstance.press(action, processedState.value);
					} else if (processedState.justReleased) {
						actionStateInstance.release(action);
					} else if (processedState.pressed) {
						actionStateInstance.setAxisValue(action, processedState.value);
					}

					if (processedState.axisPair) {
						actionStateInstance.setAxisPair(action, processedState.axisPair);
					}
				}
			});
		}
	}


	/**
	 * Ticks all action states to advance to the next frame
	 * This should be called after all systems have queried the action states
	 * @param deltaTime - Time since last update
	 */
	tickAll(deltaTime: number): void {
		// Query for entities with input components
		for (const [entityId] of this.world.query(InputEnabled)) {
			// Get the actual instance from the manager
			const actionStateInstance = this.instanceManager.getActionState(entityId);
			if (actionStateInstance) {
				actionStateInstance.tick(deltaTime);
			}
		}
	}

	/**
	 * Ticks all action states with fixed timestep for consistent physics simulation
	 * @param fixedDeltaTime - Fixed delta time in seconds
	 */
	tickAllFixed(fixedDeltaTime: number): void {
		// Query for entities with input components
		for (const [entityId] of this.world.query(InputEnabled)) {
			// Get the actual instance from the manager
			const actionStateInstance = this.instanceManager.getActionState(entityId);
			if (actionStateInstance) {
				actionStateInstance.tickFixed(fixedDeltaTime);
			}
		}
	}

	/**
	 * Updates all input-enabled entities during fixed update schedule
	 * @param fixedDeltaTime - Fixed delta time in seconds
	 */
	updateFixed(fixedDeltaTime: number): void {
		// Process input for all entities similar to regular update but with fixed timing
		for (const [entityId, inputMapData, actionStateData, inputEnabled] of this.world.query(
			InputMapComponent,
			ActionStateComponent,
			InputEnabled,
		)) {
			// Get the actual instances from the manager
			const inputMapInstance = this.instanceManager.getInputMap(entityId);
			const actionStateInstance = this.instanceManager.getActionState(entityId);

			if (inputMapInstance && actionStateInstance) {
				// Process input with the central store
				const processedActions = inputMapInstance.processActions(this.centralStore);

				// Convert ProcessedActionState to ActionData
				// Apply processed actions directly to action state
				processedActions.actionData.forEach((processedState, actionHash) => {
					const action = actionStateInstance.getActionByHash(actionHash);
					if (action) {
						if (processedState.justPressed) {
							actionStateInstance.press(action, processedState.value);
						} else if (processedState.justReleased) {
							actionStateInstance.release(action);
						} else if (processedState.pressed) {
							actionStateInstance.setAxisValue(action, processedState.value);
						}

						if (processedState.axisPair) {
							actionStateInstance.setAxisPair(action, processedState.axisPair);
						}
					}
				});

				// Store processed state for network sync
				if (this.config.networkSync?.enabled) {
					this.previousProcessedStates.set(entityId, processedActions.actionData);
				}
			}
		}
	}

	/**
	 * Synchronizes input state over network
	 */
	syncNetwork(): void {
		if (!this.config.networkSync?.enabled) {
			return;
		}

		const isClient = this.config.networkSync.authority === "client";
		const isServer = this.config.networkSync.authority === "server";

		// Query for local player entities
		for (const [entityId, actionStateData, localPlayer] of this.world.query(ActionStateComponent, LocalPlayer)) {
			if (!localPlayer) {
				continue;
			}

			// Get the actual instance from the manager
			const actionState = this.instanceManager.getActionState(entityId);
			if (!actionState) {
				continue;
			}

			// Create summarized state
			const currentState = SummarizedActionState.fromActionState(actionState);
			const previousState = this.previousStates.get(entityId);

			if (previousState) {
				// Generate diffs
				const diffs = currentState.generateDiffs(previousState);

				if (diffs.size() > 0) {
					// Send diffs to server/clients
					this.sendDiffs(entityId, diffs as ActionDiff<A>[]);
				}
			}

			// Store current state for next comparison
			this.previousStates.set(entityId, currentState as SummarizedActionState<A>);
		}
	}

	/**
	 * Sends action diffs over network
	 * @param entityId - The entity ID
	 * @param diffs - The diffs to send
	 */
	private sendDiffs(entityId: number, diffs: ActionDiff<A>[]): void {
		// Serialize diffs
		const serializedDiffs = diffs.map((diff) => serializeActionDiff(diff));

		// This would be implemented based on your networking solution
		// For example, using RemoteEvents or ReplicatedStorage
		// Example:
		// NetworkService.sendActionDiffs(entityId, serializedDiffs);
	}

	/**
	 * Receives action diffs from network
	 * @param entityId - The entity ID
	 * @param serializedDiffs - The serialized diffs
	 */
	receiveDiffs(entityId: number, serializedDiffs: object[]): void {
		// Get the entity's action state from the manager
		const actionState = this.instanceManager.getActionState(entityId);
		if (!actionState) {
			return;
		}

		// Deserialize and apply diffs
		for (const serializedDiff of serializedDiffs) {
			const diff = deserializeActionDiff(serializedDiff, (hash: string) => actionState.getActionByHash(hash));

			if (diff) {
				this.applyDiff(actionState, diff);
			}
		}
	}

	/**
	 * Applies a diff to an action state
	 * @param actionState - The action state to update
	 * @param diff - The diff to apply
	 */
	private applyDiff(actionState: ActionState<A>, diff: ActionDiff<A>): void {
		switch (diff.type) {
			case "Pressed":
				actionState.press(diff.action, diff.value);
				break;
			case "Released":
				actionState.release(diff.action);
				break;
			case "AxisChanged":
				actionState.setAxisValue(diff.action, diff.value);
				break;
			case "DualAxisChanged":
				actionState.setAxisPair(diff.action, diff.axisPair);
				break;
			case "TripleAxisChanged":
				actionState.setAxisTriple(diff.action, diff.axisTriple);
				break;
		}
	}

	/**
	 * Clears cached state for an entity
	 * @param entityId - The entity ID
	 */
	clearEntityCache(entityId: number): void {
		this.previousStates.delete(entityId);
	}
}
