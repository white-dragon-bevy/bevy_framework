import { Actionlike } from "./actionlike";

/**
 * Represents a change in action state for network synchronization
 */
export type ActionDiff<A extends Actionlike> =
	| { type: "Pressed"; action: A; value: number }
	| { type: "Released"; action: A }
	| { type: "AxisChanged"; action: A; value: number }
	| { type: "DualAxisChanged"; action: A; axisPair: Vector2 }
	| { type: "TripleAxisChanged"; action: A; axisTriple: Vector3 };

/**
 * A message containing action diffs for network transmission
 */
export interface ActionDiffMessage<A extends Actionlike> {
	/**
	 * The owner of the action state (player ID)
	 */
	owner: Player | undefined;

	/**
	 * The timestamp when the diffs were generated
	 */
	timestamp: number;

	/**
	 * The action diffs to apply
	 */
	diffs: ActionDiff<A>[];
}

/**
 * Serializes an ActionDiff for network transmission
 * @param diff - The diff to serialize
 * @returns A serialized object
 */
export function serializeActionDiff<A extends Actionlike>(diff: ActionDiff<A>): object {
	switch (diff.type) {
		case "Pressed":
			return {
				t: "P",
				a: diff.action.hash(),
				v: diff.value,
			};
		case "Released":
			return {
				t: "R",
				a: diff.action.hash(),
			};
		case "AxisChanged":
			return {
				t: "A",
				a: diff.action.hash(),
				v: diff.value,
			};
		case "DualAxisChanged":
			return {
				t: "D",
				a: diff.action.hash(),
				x: diff.axisPair.X,
				y: diff.axisPair.Y,
			};
		case "TripleAxisChanged":
			return {
				t: "T",
				a: diff.action.hash(),
				x: diff.axisTriple.X,
				y: diff.axisTriple.Y,
				z: diff.axisTriple.Z,
			};
	}
}

/**
 * Deserializes an ActionDiff from network data
 * @param data - The serialized data
 * @param actionLookup - Function to lookup action by hash
 * @returns The deserialized ActionDiff
 */
export function deserializeActionDiff<A extends Actionlike>(
	data: unknown,
	actionLookup: (hash: string) => A | undefined,
): ActionDiff<A> | undefined {
	const dataObj = data as Record<string, unknown>;
	const action = actionLookup(dataObj.a as string);
	if (!action) return undefined;

	switch (dataObj.t) {
		case "P":
			return { type: "Pressed", action, value: dataObj.v as number };
		case "R":
			return { type: "Released", action };
		case "A":
			return { type: "AxisChanged", action, value: dataObj.v as number };
		case "D":
			return {
				type: "DualAxisChanged",
				action,
				axisPair: new Vector2(dataObj.x as number, dataObj.y as number)
			};
		case "T":
			return {
				type: "TripleAxisChanged",
				action,
				axisTriple: new Vector3(dataObj.x as number, dataObj.y as number, dataObj.z as number)
			};
		default:
			return undefined;
	}
}