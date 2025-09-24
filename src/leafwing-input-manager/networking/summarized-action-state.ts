import { Actionlike } from "../core/actionlike";
import { ActionState } from "../action-state/action-state";
import { ActionData } from "../action-state/action-data";
import { ActionDiff } from "./action-diff";

/**
 * A summarized version of ActionState for network transmission
 * Contains only the essential data needed to reconstruct state on remote clients
 */
export class SummarizedActionState<A extends Actionlike> {
	private pressedActions: Map<string, number> = new Map();
	private axisValues: Map<string, number> = new Map();
	private dualAxisValues: Map<string, Vector2> = new Map();
	private tripleAxisValues: Map<string, Vector3> = new Map();

	/**
	 * Creates a summarized state from a full ActionState
	 * @param actionState - The full action state to summarize
	 * @returns A new SummarizedActionState
	 */
	static fromActionState<A extends Actionlike>(
		actionState: ActionState<A>,
	): SummarizedActionState<A> {
		const summary = new SummarizedActionState<A>();

		// Extract pressed actions with their values
		const actionDataMap = actionState.getActionDataMap() as Map<string, ActionData>;
		for (const [actionHash, data] of actionDataMap) {
			if (data.pressed) {
				summary.pressedActions.set(actionHash, data.value);
			}

			// Store axis values if non-zero
			if (data.value !== 0) {
				summary.axisValues.set(actionHash, data.value);
			}

			// Store axis pair values if non-zero
			if (data.axisPairX !== 0 || data.axisPairY !== 0) {
				summary.dualAxisValues.set(actionHash, new Vector2(data.axisPairX, data.axisPairY));
			}
		}

		return summary;
	}

	/**
	 * Applies this summarized state to an ActionState
	 * @param actionState - The action state to update
	 */
	applyToActionState(actionState: ActionState<A>): void {
		// Reset all actions first
		actionState.resetAll();

		// Apply pressed actions
		for (const [actionHash, value] of this.pressedActions) {
			const action = actionState.getActionByHash(actionHash);
			if (action) {
				actionState.press(action, value);
			}
		}

		// Apply axis values
		for (const [actionHash, value] of this.axisValues) {
			const action = actionState.getActionByHash(actionHash);
			if (action) {
				actionState.setAxisValue(action, value);
			}
		}

		// Apply dual axis values
		for (const [actionHash, value] of this.dualAxisValues) {
			const action = actionState.getActionByHash(actionHash);
			if (action) {
				actionState.setAxisPair(action, value);
			}
		}

		// Apply triple axis values
		for (const [actionHash, value] of this.tripleAxisValues) {
			const action = actionState.getActionByHash(actionHash);
			if (action) {
				actionState.setAxisTriple(action, value);
			}
		}
	}

	/**
	 * Creates a mock action object for diff generation
	 * @param actionHash - The hash of the action
	 * @returns A mock action with only the hash method
	 */
	private createMockAction(actionHash: string): A {
		const mockAction = {
			hash(): string {
				return actionHash;
			},
		} as A;
		return mockAction;
	}

	/**
	 * Generates diffs between this state and another
	 * @param other - The other state to compare against
	 * @returns Array of action diffs
	 */
	generateDiffs(other: SummarizedActionState<A>): ActionDiff<A>[] {
		const diffs: ActionDiff<A>[] = [];
		const processedActions = new Set<string>();

		// Check for pressed/released changes
		for (const [actionHash, value] of this.pressedActions) {
			processedActions.add(actionHash);
			const otherValue = other.pressedActions.get(actionHash);

			if (otherValue === undefined) {
				// Action is pressed in this but not in other
				diffs.push({
					type: "Pressed",
					action: this.createMockAction(actionHash),
					value: value,
				});
			} else if (value !== otherValue) {
				// Value changed
				diffs.push({
					type: "Pressed",
					action: this.createMockAction(actionHash),
					value: value,
				});
			}
		}

		// Check for releases
		for (const [actionHash] of other.pressedActions) {
			if (!this.pressedActions.has(actionHash)) {
				diffs.push({
					type: "Released",
					action: this.createMockAction(actionHash),
				});
			}
		}

		// Check axis value changes
		for (const [actionHash, value] of this.axisValues) {
			const otherValue = other.axisValues.get(actionHash) ?? 0;
			if (math.abs(value - otherValue) > 0.001) {
				diffs.push({
					type: "AxisChanged",
					action: this.createMockAction(actionHash),
					value: value,
				});
			}
		}

		// Check dual axis changes
		for (const [actionHash, value] of this.dualAxisValues) {
			const otherValue = other.dualAxisValues.get(actionHash);
			if (!otherValue || (value.sub(otherValue)).Magnitude > 0.001) {
				diffs.push({
					type: "DualAxisChanged",
					action: this.createMockAction(actionHash),
					axisPair: value,
				});
			}
		}

		// Check triple axis changes
		for (const [actionHash, value] of this.tripleAxisValues) {
			const otherValue = other.tripleAxisValues.get(actionHash);
			if (!otherValue || (value.sub(otherValue)).Magnitude > 0.001) {
				diffs.push({
					type: "TripleAxisChanged",
					action: this.createMockAction(actionHash),
					axisTriple: value,
				});
			}
		}

		return diffs;
	}

	/**
	 * Serializes the summarized state for network transmission
	 * @returns A serializable object
	 */
	serialize(): object {
		const pressed: Record<string, number> = {};
		const axis: Record<string, number> = {};
		const dualAxis: Record<string, [number, number]> = {};
		const tripleAxis: Record<string, [number, number, number]> = {};

		for (const [hash, value] of this.pressedActions) {
			pressed[hash] = value;
		}

		for (const [hash, value] of this.axisValues) {
			axis[hash] = value;
		}

		for (const [hash, value] of this.dualAxisValues) {
			dualAxis[hash] = [value.X, value.Y];
		}

		for (const [hash, value] of this.tripleAxisValues) {
			tripleAxis[hash] = [value.X, value.Y, value.Z];
		}

		return {
			p: pressed,
			a: axis,
			d: dualAxis,
			t: tripleAxis,
		};
	}

	/**
	 * Deserializes a summarized state from network data
	 * @param data - The serialized data
	 * @returns A new SummarizedActionState
	 */
	static deserialize<A extends Actionlike>(data: unknown): SummarizedActionState<A> {
		const state = new SummarizedActionState<A>();
		const dataObj = data as Record<string, unknown>;

		if (dataObj.p && typeIs(dataObj.p, "table")) {
			const pressed = dataObj.p as Record<string, number>;
			for (const [hash, value] of Object.entries(pressed)) {
				state.pressedActions.set(hash, value);
			}
		}

		if (dataObj.a && typeIs(dataObj.a, "table")) {
			const axis = dataObj.a as Record<string, number>;
			for (const [hash, value] of Object.entries(axis)) {
				state.axisValues.set(hash, value);
			}
		}

		if (dataObj.d && typeIs(dataObj.d, "table")) {
			const dualAxis = dataObj.d as Record<string, [number, number]>;
			for (const [hash, value] of Object.entries(dualAxis)) {
				const [x, y] = value;
				state.dualAxisValues.set(hash, new Vector2(x, y));
			}
		}

		if (dataObj.t && typeIs(dataObj.t, "table")) {
			const tripleAxis = dataObj.t as Record<string, [number, number, number]>;
			for (const [hash, value] of Object.entries(tripleAxis)) {
				const [x, y, z] = value;
				state.tripleAxisValues.set(hash, new Vector3(x, y, z));
			}
		}

		return state;
	}

	/**
	 * Checks if the state is empty
	 * @returns True if no actions are active
	 */
	isEmpty(): boolean {
		return (
			this.pressedActions.size() === 0 &&
			this.axisValues.size() === 0 &&
			this.dualAxisValues.size() === 0 &&
			this.tripleAxisValues.size() === 0
		);
	}

	/**
	 * Clears all state data
	 */
	clear(): void {
		this.pressedActions.clear();
		this.axisValues.clear();
		this.dualAxisValues.clear();
		this.tripleAxisValues.clear();
	}
}
