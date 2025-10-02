import { ActionState } from "../action-state/action-state";
import { ActionDiff, ActionDiffMessage } from "../action-diff";
import { Actionlike } from "../actionlike";
import { World } from "@rbxts/matter";
import { generateActionDiffs, applyActionDiffs } from "../systems";
import { SummarizedActionState } from "../summarized-action-state";

/**
 * Test action enum for testing action diffs
 */
class TestAction implements Actionlike {
	constructor(public readonly name: string) {}

	public hash(): string {
		return `Action_${this.name}`;
	}

	public equals(other: Actionlike): boolean {
		return other instanceof TestAction && other.name === this.name;
	}

	public toString(): string {
		return `Action(${this.name})`;
	}

	public static readonly Button = new TestAction("Button");
	public static readonly Axis = new TestAction("Axis");
	public static readonly DualAxis = new TestAction("DualAxis");
}

/**
 * Component marker for entities that should not send action diffs
 */
interface NoActionDiffs {
	readonly noActionDiffs: true;
}

/**
 * Helper to create a test world with an entity containing ActionState
 */
function createTestWorld(): { world: World; entity: number; actionState: ActionState<TestAction> } {
	const world = new World();
	const actionState = new ActionState<TestAction>();
	// Use a simple numeric entity ID for testing
	const entity = 1;

	return { world, entity, actionState };
}

/**
 * Asserts that no action diffs were generated
 * @param diffs - Array of action diffs
 */
function assertHasNoActionDiffs(diffs: Array<ActionDiff<TestAction>>): void {
	if (diffs.size() > 0) {
		error(`Expected no ActionDiff variants. Received: ${diffs.size()} diffs`);
	}
}

// Note: TestEZ's expect() is only available inside it() blocks
// Helper functions cannot use expect(), so we only validate data here

/**
 * Validation data for action diffs (without expect() calls)
 * Returns data to be asserted in the test itself
 */
interface DiffValidationResult {
	readonly isPressed?: boolean;
	readonly value?: number;
	readonly axisPair?: { readonly x: number; readonly y: number };
	readonly tripleAxisData?: {
		readonly axisPairX: number;
		readonly axisPairY: number;
		readonly value: number;
	};
}

function getDiffValidationData<T extends Actionlike>(
	actionState: ActionState<T>,
	diff: ActionDiff<T>,
): DiffValidationResult {
	if (diff.type === "Pressed") {
		return {
			isPressed: actionState.pressed(diff.action),
			value: actionState.value(diff.action),
		};
	} else if (diff.type === "Released") {
		return {
			isPressed: actionState.pressed(diff.action),
		};
	} else if (diff.type === "AxisChanged") {
		return {
			value: actionState.value(diff.action),
		};
	} else if (diff.type === "DualAxisChanged") {
		const axisPair = actionState.axisPair(diff.action);
		return {
			axisPair: { x: axisPair.x, y: axisPair.y },
		};
	} else if (diff.type === "TripleAxisChanged") {
		const actionData = actionState.getActionDataMap().get(diff.action.hash());
		if (!actionData) {
			return {};
		}
		return {
			tripleAxisData: {
				axisPairX: actionData.axisPairX,
				axisPairY: actionData.axisPairY,
				value: actionData.value,
			},
		};
	}
	return {};
}

/**
 * Asserts that exactly one action diff was created and validates it
 * @param diffs - Array of action diffs
 * @param validator - Validation function to run inside it() block
 */
function assertActionDiffCreated<T extends Actionlike>(
	diffs: Array<ActionDiff<T>>,
	validator: (diff: ActionDiff<T>) => void,
): void {
	if (diffs.size() === 0) {
		error("Expected 1 ActionDiff variant. Received: 0 diffs");
	}

	if (diffs.size() > 1) {
		error(`Expected 1 ActionDiff variant. Received: ${diffs.size()} diffs`);
	}

	const diff = diffs[0];
	validator(diff);
}

/**
 * Returns validation data for an action diff that was applied to ActionState
 * @param actionState - The action state to validate
 * @param diff - The diff that was applied
 * @returns Validation data to be asserted in the test
 */
function getAppliedDiffValidationData<T extends Actionlike>(
	actionState: ActionState<T>,
	diff: ActionDiff<T>,
): DiffValidationResult {
	return getDiffValidationData(actionState, diff);
}

export = () => {
	describe("Action Diffs", () => {
		describe("generate_button_action_diffs", () => {
			it("should generate Pressed diff when button is pressed", () => {
				const { world, entity, actionState } = createTestWorld();

				// Frame 1: Initial state
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: Press button
				actionState.press(TestAction.Button);
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertActionDiffCreated(result.diffs, (diff) => {
					expect(diff.type).to.equal("Pressed");

					if (diff.type === "Pressed") {
						expect(diff.action).to.equal(TestAction.Button);
						expect(diff.value).to.equal(1.0);
					}
				});
			});

			it("should not generate diff when button is held", () => {
				const { world, entity, actionState } = createTestWorld();

				// Frame 1: Press
				actionState.press(TestAction.Button);
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: Hold (no change)
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertHasNoActionDiffs(result.diffs);
			});

			it("should generate Pressed diff when button value changes", () => {
				const { world, entity, actionState } = createTestWorld();

				// Frame 1: Press with value 1.0
				actionState.press(TestAction.Button);
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: Change value to 0.5
				actionState.press(TestAction.Button, 0.5);
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertActionDiffCreated(result.diffs, (diff) => {
					expect(diff.type).to.equal("Pressed");

					if (diff.type === "Pressed") {
						expect(diff.action).to.equal(TestAction.Button);
						expect(diff.value).to.equal(0.5);
					}
				});
			});

			it("should generate Released diff when button is released", () => {
				const { world, entity, actionState } = createTestWorld();

				// Frame 1: Press
				actionState.press(TestAction.Button);
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: Release
				actionState.release(TestAction.Button);
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertActionDiffCreated(result.diffs, (diff) => {
					expect(diff.type).to.equal("Released");

					if (diff.type === "Released") {
						expect(diff.action).to.equal(TestAction.Button);
					}
				});
			});
		});

		describe("generate_axis_action_diffs", () => {
			it("should generate DualAxisChanged diff when axis pair changes", () => {
				const { world, entity, actionState } = createTestWorld();
				const testAxisPair = new Vector2(5, 8);

				// Frame 1: Initial
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: Change axis value
				actionState.setAxisPair(TestAction.DualAxis, testAxisPair);
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertActionDiffCreated(result.diffs, (diff) => {
					expect(diff.type).to.equal("DualAxisChanged");

					if (diff.type === "DualAxisChanged") {
						expect(diff.action).to.equal(TestAction.DualAxis);
						(expect(diff.axisPair.X).to.be as { near: (value: number, delta: number) => void }).near(
							testAxisPair.X,
							0.001,
						);
						(expect(diff.axisPair.Y).to.be as { near: (value: number, delta: number) => void }).near(
							testAxisPair.Y,
							0.001,
						);
					}
				});
			});

			it("should not generate diff when axis pair unchanged", () => {
				const { world, entity, actionState } = createTestWorld();
				const testAxisPair = new Vector2(5, 8);

				// Frame 1: Set axis
				actionState.setAxisPair(TestAction.DualAxis, testAxisPair);
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: No change
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertHasNoActionDiffs(result.diffs);
			});

			it("should generate DualAxisChanged diff when axis pair reset to zero", () => {
				const { world, entity, actionState } = createTestWorld();
				const testAxisPair = new Vector2(5, 8);

				// Frame 1: Set axis
				actionState.setAxisPair(TestAction.DualAxis, testAxisPair);
				let snapshot = generateActionDiffs(world, [{ entity, actionState }], undefined, undefined);

				// Frame 2: Reset to zero
				actionState.setAxisPair(TestAction.DualAxis, Vector2.zero);
				const result = generateActionDiffs(world, [{ entity, actionState }], undefined, snapshot.currentSnapshot);

				assertActionDiffCreated(result.diffs, (diff) => {
					expect(diff.type).to.equal("DualAxisChanged");

					if (diff.type === "DualAxisChanged") {
						expect(diff.action).to.equal(TestAction.DualAxis);
						(expect(diff.axisPair.X).to.be as { near: (value: number, delta: number) => void }).near(0, 0.001);
						(expect(diff.axisPair.Y).to.be as { near: (value: number, delta: number) => void }).near(0, 0.001);
					}
				});
			});
		});

		describe("generate_filtered_binary_action_diffs", () => {
			it("should only generate diffs for entities without NoActionDiffs marker", () => {
				const world = new World();

				// Entity 1: Normal entity
				const actionState1 = new ActionState<TestAction>();
				const entity1 = 1;

				// Entity 2: Entity with NoActionDiffs marker
				const actionState2 = new ActionState<TestAction>();
				const entity2 = 2;

				// Generate diffs only for entity1 (filter out entity2)
				const filteredQuery = [{ entity: entity1, actionState: actionState1 }];

				// Frame 1: Initial state
				let snapshot = generateActionDiffs(world, filteredQuery, undefined, undefined);

				// Frame 2: Press both
				actionState1.press(TestAction.Button);
				actionState2.press(TestAction.Button);
				const result = generateActionDiffs(world, filteredQuery, undefined, snapshot.currentSnapshot);

				// Only entity1 should have diffs
				const snapshotDiffsCount = result.diffs.size();
				expect(snapshotDiffsCount).to.equal(1);

				if (snapshotDiffsCount > 0) {
					const diff = result.diffs[0];
					expect(diff.type).to.equal("Pressed");

					if (diff.type === "Pressed") {
						expect(diff.action).to.equal(TestAction.Button);
					}
				}
			});
		});

		describe("process_binary_action_diffs", () => {
			it("should apply Pressed diff correctly", () => {
				const { world, entity, actionState } = createTestWorld();

				const diff: ActionDiff<TestAction> = {
					type: "Pressed",
					action: TestAction.Button,
					value: 1.0,
				};

				applyActionDiffs([{ entityId: tostring(entity), diff }], [{ entity, actionState }]);

				const validation = getAppliedDiffValidationData(actionState, diff);
				expect(validation.isPressed).to.equal(true);
				expect(validation.value).to.equal(1.0);
			});

			it("should apply Released diff correctly", () => {
				const { world, entity, actionState } = createTestWorld();

				// First press
				actionState.press(TestAction.Button);

				const diff: ActionDiff<TestAction> = {
					type: "Released",
					action: TestAction.Button,
				};

				applyActionDiffs([{ entityId: tostring(entity), diff }], [{ entity, actionState }]);

				const validation = getAppliedDiffValidationData(actionState, diff);
				expect(validation.isPressed).to.equal(false);
			});
		});

		describe("process_value_action_diff", () => {
			it("should apply AxisChanged diff correctly", () => {
				const { world, entity, actionState } = createTestWorld();

				const diff: ActionDiff<TestAction> = {
					type: "AxisChanged",
					action: TestAction.Axis,
					value: 0.5,
				};

				applyActionDiffs([{ entityId: tostring(entity), diff }], [{ entity, actionState }]);

				const validation = getAppliedDiffValidationData(actionState, diff);
				expect(validation.value).to.equal(0.5);
			});

			it("should apply Released diff after AxisChanged", () => {
				const { world, entity, actionState } = createTestWorld();

				// First apply axis change
				const diff1: ActionDiff<TestAction> = {
					type: "AxisChanged",
					action: TestAction.Axis,
					value: 0.5,
				};

				applyActionDiffs([{ entityId: tostring(entity), diff: diff1 }], [{ entity, actionState }]);

				// Then apply release
				const diff2: ActionDiff<TestAction> = {
					type: "Released",
					action: TestAction.Button,
				};

				applyActionDiffs([{ entityId: tostring(entity), diff: diff2 }], [{ entity, actionState }]);

				const validation = getAppliedDiffValidationData(actionState, diff2);
				expect(validation.isPressed).to.equal(false);
			});
		});

		describe("process_axis_action_diff", () => {
			it("should apply DualAxisChanged diff correctly", () => {
				const { world, entity, actionState } = createTestWorld();

				const diff: ActionDiff<TestAction> = {
					type: "DualAxisChanged",
					action: TestAction.DualAxis,
					axisPair: new Vector2(1, 0),
				};

				applyActionDiffs([{ entityId: tostring(entity), diff }], [{ entity, actionState }]);

				const validation = getAppliedDiffValidationData(actionState, diff);
				expect(validation.axisPair).to.be.ok();
				(expect(validation.axisPair!.x).to.be as { near: (value: number, delta: number) => void }).near(
					1,
					0.001,
				);
				(expect(validation.axisPair!.y).to.be as { near: (value: number, delta: number) => void }).near(
					0,
					0.001,
				);
			});

			it("should apply Released diff after DualAxisChanged", () => {
				const { world, entity, actionState } = createTestWorld();

				// First apply dual axis change
				const diff1: ActionDiff<TestAction> = {
					type: "DualAxisChanged",
					action: TestAction.DualAxis,
					axisPair: new Vector2(1, 0),
				};

				applyActionDiffs([{ entityId: tostring(entity), diff: diff1 }], [{ entity, actionState }]);

				// Then apply release
				const diff2: ActionDiff<TestAction> = {
					type: "Released",
					action: TestAction.Button,
				};

				applyActionDiffs([{ entityId: tostring(entity), diff: diff2 }], [{ entity, actionState }]);

				const validation = getAppliedDiffValidationData(actionState, diff2);
				expect(validation.isPressed).to.equal(false);
			});
		});
	});
};
