import { World } from "@rbxts/matter";
import { CentralInputStore } from "../user-input/central-input-store";
import { InputMap, InputMapComponent, UpdatedActions, ProcessedActionState } from "../input-map/input-map";
import { ActionState, ActionStateComponent } from "../action-state/action-state";
import { Actionlike } from "../core/actionlike";
import { HashMap } from "../core";
import { InputManagerPluginConfig } from "./input-manager-plugin";
import { ClashDetector } from "../clashing-inputs/clash-detection";
import { ClashStrategy } from "../clashing-inputs/clash-strategy";
import { SummarizedActionState } from "../networking/summarized-action-state";
import { ActionDiff, serializeActionDiff, deserializeActionDiff } from "../networking/action-diff";
import { InputEnabled } from "./input-enabled";
import { LocalPlayer } from "./local-player";

/**
 * System that processes input for all entities with InputMap and ActionState components
 */
export class InputManagerSystem<A extends Actionlike> {
	private world: World;
	private centralStore: CentralInputStore;
	private config: InputManagerPluginConfig<A>;
	private clashDetector: ClashDetector<A>;
	private previousStates: Map<number, SummarizedActionState<A>> = new Map();

	constructor(world: World, centralStore: CentralInputStore, config: InputManagerPluginConfig<A>) {
		this.world = world;
		this.centralStore = centralStore;
		this.config = config;
		this.clashDetector = new ClashDetector<A>();
	}

	/**
	 * Updates all input-enabled entities
	 * @param deltaTime - Time since last update
	 */
	update(deltaTime: number): void {
		// Query for entities with input components
		for (const [entityId, inputMap, actionState, inputEnabled] of this.world.query(
			InputMapComponent,
			ActionStateComponent,
			InputEnabled,
		)) {
			if (!inputEnabled || !inputEnabled.enabled) {
				continue;
			}

			// Tick the action state
			actionState.tick(deltaTime);

			// Process input map to get updated action states
			const updatedActions = (inputMap as unknown as InputMap<A>).processActions(this.centralStore);

			// Resolve input clashes and apply the results
			this.resolveClashes(
				updatedActions,
				actionState as unknown as ActionState<A>,
				inputMap as unknown as InputMap<A>
			);
		}
	}

	/**
	 * Resolves input clashes for an entity
	 * @param updatedActions - The updated actions with potential clashes
	 * @param actionState - The action state to update
	 * @param inputMap - The input map to get action information
	 */
	private resolveClashes(
		updatedActions: UpdatedActions<A>,
		actionState: ActionState<A>,
		inputMap: InputMap<A>
	): void {
		// Register all actions with the clash detector
		this.clashDetector.clear();

		// Iterate over the action data using proper Map iteration
		for (const [actionHash, processedState] of updatedActions.actionData) {
			// Get the action from the action state using the hash
			const action = actionState.getActionByHash(actionHash);
			if (action) {
				// Get inputs for this action from the input map
				const inputs = inputMap.getInputs(action);
				this.clashDetector.registerAction(action, inputs);
			}
		}

		// Detect and resolve clashes
		const clashes = this.clashDetector.detectClashes();
		const strategy = ClashStrategy.PrioritizeLargest; // Use default strategy
		const triggeredActions = this.clashDetector.resolveClashes(clashes, strategy);

		// Apply only the triggered actions
		for (const [actionHash, processedState] of updatedActions.actionData) {
			const action = actionState.getActionByHash(actionHash);
			if (action) {
				if (triggeredActions.has(actionHash)) {
					// Update the action state with the processed data
					if (processedState.justPressed) {
						actionState.press(action, processedState.value);
					} else if (processedState.justReleased) {
						actionState.release(action);
					} else if (processedState.pressed) {
						// Continue holding the action
						actionState.press(action, processedState.value);
					}

					// Set axis values if present
					if (processedState.axisPair !== undefined) {
						actionState.setAxisPair(action, processedState.axisPair);
					}
				} else {
					// Release the action if it was not triggered
					actionState.release(action);
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
		for (const [entityId, actionStateComponent, localPlayer] of this.world.query(
			ActionStateComponent,
			LocalPlayer,
		)) {
			if (!localPlayer || !actionStateComponent) {
				continue;
			}

			const actionState = actionStateComponent as unknown as ActionState<A>;

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

		print(`[InputManager] Would send ${diffs.size()} diffs for entity ${entityId}`);
	}

	/**
	 * Receives action diffs from network
	 * @param entityId - The entity ID
	 * @param serializedDiffs - The serialized diffs
	 */
	receiveDiffs(entityId: number, serializedDiffs: object[]): void {
		// Get the entity's action state
		const [actionStateComponent] = this.world.get(entityId, ActionStateComponent);
		if (!actionStateComponent) {
			return;
		}

		const actionState = actionStateComponent as unknown as ActionState<A>;

		// Deserialize and apply diffs
		for (const serializedDiff of serializedDiffs) {
			const diff = deserializeActionDiff(
				serializedDiff,
				(hash) => actionState.getActionByHash(hash),
			);

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
