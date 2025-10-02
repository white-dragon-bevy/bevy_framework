import { Actionlike } from "./actionlike";
import { ActionState } from "./action-state/action-state";
import { ActionDiff } from "./action-diff";

/**
 * Snapshot of button value for diff generation
 */
interface ButtonValueSnapshot {
	readonly pressed: boolean;
	readonly value: number;
}

/**
 * Stores the state of all actions in the current frame for diff generation
 * Used for network synchronization to track state changes between frames
 */
export class SummarizedActionState<A extends Actionlike> {
	private buttonStateMap: Map<string, Map<string, ButtonValueSnapshot>> = new Map();
	private axisStateMap: Map<string, Map<string, number>> = new Map();
	private dualAxisStateMap: Map<string, Map<string, Vector2>> = new Map();
	private tripleAxisStateMap: Map<string, Map<string, Vector3>> = new Map();

	/**
	 * Creates a new empty summarized action state
	 */
	constructor() {}

	/**
	 * Returns a set of all entity identifiers contained in this state
	 * @returns Set of entity identifiers (use "resource" for global state)
	 */
	public allEntities(): Set<string> {
		const entities = new Set<string>();

		this.buttonStateMap.forEach((_, entityId) => entities.add(entityId));
		this.axisStateMap.forEach((_, entityId) => entities.add(entityId));
		this.dualAxisStateMap.forEach((_, entityId) => entities.add(entityId));
		this.tripleAxisStateMap.forEach((_, entityId) => entities.add(entityId));

		return entities;
	}

	/**
	 * Captures the current state of all actions for all entities
	 * @param resourceActionState - Optional global action state resource
	 * @param entityStates - Array of entity action states with their IDs
	 * @returns A summarized snapshot of current action states
	 */
	public static summarize<A extends Actionlike>(
		resourceActionState: ActionState<A> | undefined,
		entityStates: Array<{ entityId: string; actionState: ActionState<A> }>,
	): SummarizedActionState<A> {
		const summary = new SummarizedActionState<A>();

		// Capture resource-level state
		if (resourceActionState) {
			summary.captureActionState("resource", resourceActionState);
		}

		// Capture entity-level states
		for (const { entityId, actionState } of entityStates) {
			summary.captureActionState(entityId, actionState);
		}

		return summary;
	}

	/**
	 * Captures the state of a single ActionState
	 * @param entityId - The entity identifier
	 * @param actionState - The action state to capture
	 */
	private captureActionState(entityId: string, actionState: ActionState<A>): void {
		const buttonStates = new Map<string, ButtonValueSnapshot>();
		const axisStates = new Map<string, number>();
		const dualAxisStates = new Map<string, Vector2>();
		const tripleAxisStates = new Map<string, Vector3>();

		const actionDataMap = actionState.getActionDataMap();
		const buttonDataMap = actionState.getButtonDataMap();

		// Capture all action states
		actionDataMap.forEach((actionData, actionHash) => {
			const hasAxisPair = actionData.axisPairX !== 0 || actionData.axisPairY !== 0;
			const hasValue = actionData.value !== 0;

			// Button state (only if this is actually a button, not an axis)
			const buttonData = buttonDataMap.get(actionHash);
			if (buttonData) {
				buttonStates.set(actionHash, {
					pressed: actionData.pressed,
					value: actionData.value,
				});
				return;
			}

			// Triple axis state (3D)
			if (hasAxisPair && hasValue) {
				tripleAxisStates.set(
					actionHash,
					new Vector3(actionData.axisPairX, actionData.axisPairY, actionData.value),
				);
				return;
			}

			// Dual axis state (2D)
			if (hasAxisPair) {
				dualAxisStates.set(actionHash, new Vector2(actionData.axisPairX, actionData.axisPairY));
				return;
			}

			// Axis state (single axis)
			if (hasValue) {
				axisStates.set(actionHash, actionData.value);
			}
		});

		if (buttonStates.size() > 0) {
			this.buttonStateMap.set(entityId, buttonStates);
		}
		if (axisStates.size() > 0) {
			this.axisStateMap.set(entityId, axisStates);
		}
		if (dualAxisStates.size() > 0) {
			this.dualAxisStateMap.set(entityId, dualAxisStates);
		}
		if (tripleAxisStates.size() > 0) {
			this.tripleAxisStateMap.set(entityId, tripleAxisStates);
		}
	}

	/**
	 * Generates an ActionDiff for button data if changed
	 * @param action - The action
	 * @param previousButton - Previous button value
	 * @param currentButton - Current button value
	 * @returns ActionDiff if changed, undefined otherwise
	 */
	private static buttonDiff<A extends Actionlike>(
		action: A,
		previousButton: ButtonValueSnapshot | undefined,
		currentButton: ButtonValueSnapshot | undefined,
	): ActionDiff<A> | undefined {
		const prev = previousButton || { pressed: false, value: 0 };
		if (!currentButton) {
			return undefined;
		}

		const changed = prev.pressed !== currentButton.pressed || prev.value !== currentButton.value;
		if (!changed) {
			return undefined;
		}

		if (currentButton.pressed) {
			return {
				type: "Pressed",
				action,
				value: currentButton.value,
			};
		} else {
			return {
				type: "Released",
				action,
			};
		}
	}

	/**
	 * Generates an ActionDiff for axis data if changed
	 * @param action - The action
	 * @param previousAxis - Previous axis value
	 * @param currentAxis - Current axis value
	 * @returns ActionDiff if changed, undefined otherwise
	 */
	private static axisDiff<A extends Actionlike>(
		action: A,
		previousAxis: number | undefined,
		currentAxis: number | undefined,
	): ActionDiff<A> | undefined {
		const prev = previousAxis || 0;
		if (currentAxis === undefined) {
			return undefined;
		}

		if (prev === currentAxis) {
			return undefined;
		}

		return {
			type: "AxisChanged",
			action,
			value: currentAxis,
		};
	}

	/**
	 * Generates an ActionDiff for dual axis data if changed
	 * @param action - The action
	 * @param previousDualAxis - Previous dual axis value
	 * @param currentDualAxis - Current dual axis value
	 * @returns ActionDiff if changed, undefined otherwise
	 */
	private static dualAxisDiff<A extends Actionlike>(
		action: A,
		previousDualAxis: Vector2 | undefined,
		currentDualAxis: Vector2 | undefined,
	): ActionDiff<A> | undefined {
		const prev = previousDualAxis || Vector2.zero;
		if (!currentDualAxis) {
			return undefined;
		}

		if (prev.X === currentDualAxis.X && prev.Y === currentDualAxis.Y) {
			return undefined;
		}

		return {
			type: "DualAxisChanged",
			action,
			axisPair: currentDualAxis,
		};
	}

	/**
	 * Generates an ActionDiff for triple axis data if changed
	 * @param action - The action
	 * @param previousTripleAxis - Previous triple axis value
	 * @param currentTripleAxis - Current triple axis value
	 * @returns ActionDiff if changed, undefined otherwise
	 */
	private static tripleAxisDiff<A extends Actionlike>(
		action: A,
		previousTripleAxis: Vector3 | undefined,
		currentTripleAxis: Vector3 | undefined,
	): ActionDiff<A> | undefined {
		const prev = previousTripleAxis || Vector3.zero;
		if (!currentTripleAxis) {
			return undefined;
		}

		if (prev.X === currentTripleAxis.X && prev.Y === currentTripleAxis.Y && prev.Z === currentTripleAxis.Z) {
			return undefined;
		}

		return {
			type: "TripleAxisChanged",
			action,
			axisTriple: currentTripleAxis,
		};
	}

	/**
	 * Generates all ActionDiffs for a single entity by comparing with previous state
	 * @param entityId - The entity identifier
	 * @param previous - The previous summarized state
	 * @param hashToAction - Map from action hash to action instance
	 * @returns Array of action diffs
	 */
	public entityDiffs(
		entityId: string,
		previous: SummarizedActionState<A>,
		hashToAction: Map<string, A>,
	): Array<ActionDiff<A>> {
		const diffs: Array<ActionDiff<A>> = [];

		// Button diffs
		const currentButtons = this.buttonStateMap.get(entityId);
		if (currentButtons) {
			const previousButtons = previous.buttonStateMap.get(entityId);
			currentButtons.forEach((currentButton, actionHash) => {
				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				const previousButton = previousButtons?.get(actionHash);
				const diff = SummarizedActionState.buttonDiff(action, previousButton, currentButton);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		// Axis diffs
		const currentAxes = this.axisStateMap.get(entityId);
		const previousAxes = previous.axisStateMap.get(entityId);
		const processedAxisHashes = new Set<string>();

		// Process current axes
		if (currentAxes) {
			currentAxes.forEach((currentAxis, actionHash) => {
				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				processedAxisHashes.add(actionHash);
				const previousAxis = previousAxes?.get(actionHash);
				const diff = SummarizedActionState.axisDiff(action, previousAxis, currentAxis);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		// Process previous axes that are now zero (not in current)
		if (previousAxes) {
			previousAxes.forEach((previousAxis, actionHash) => {
				if (processedAxisHashes.has(actionHash)) {
					return; // Already processed
				}

				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				// Generate diff for reset to zero
				const diff = SummarizedActionState.axisDiff(action, previousAxis, 0);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		// Dual axis diffs
		const currentDualAxes = this.dualAxisStateMap.get(entityId);
		const previousDualAxes = previous.dualAxisStateMap.get(entityId);
		const processedDualAxisHashes = new Set<string>();

		// Process current dual axes
		if (currentDualAxes) {
			currentDualAxes.forEach((currentDualAxis, actionHash) => {
				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				processedDualAxisHashes.add(actionHash);
				const previousDualAxis = previousDualAxes?.get(actionHash);
				const diff = SummarizedActionState.dualAxisDiff(action, previousDualAxis, currentDualAxis);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		// Process previous dual axes that are now zero (not in current)
		if (previousDualAxes) {
			previousDualAxes.forEach((previousDualAxis, actionHash) => {
				if (processedDualAxisHashes.has(actionHash)) {
					return; // Already processed
				}

				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				// Generate diff for reset to zero
				const diff = SummarizedActionState.dualAxisDiff(action, previousDualAxis, Vector2.zero);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		// Triple axis diffs
		const currentTripleAxes = this.tripleAxisStateMap.get(entityId);
		const previousTripleAxes = previous.tripleAxisStateMap.get(entityId);
		const processedTripleAxisHashes = new Set<string>();

		// Process current triple axes
		if (currentTripleAxes) {
			currentTripleAxes.forEach((currentTripleAxis, actionHash) => {
				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				processedTripleAxisHashes.add(actionHash);
				const previousTripleAxis = previousTripleAxes?.get(actionHash);
				const diff = SummarizedActionState.tripleAxisDiff(action, previousTripleAxis, currentTripleAxis);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		// Process previous triple axes that are now zero (not in current)
		if (previousTripleAxes) {
			previousTripleAxes.forEach((previousTripleAxis, actionHash) => {
				if (processedTripleAxisHashes.has(actionHash)) {
					return; // Already processed
				}

				const action = hashToAction.get(actionHash);
				if (!action) {
					return;
				}

				// Generate diff for reset to zero
				const diff = SummarizedActionState.tripleAxisDiff(action, previousTripleAxis, Vector3.zero);
				if (diff) {
					diffs.push(diff);
				}
			});
		}

		return diffs;
	}
}
