import { ActionState } from "../action-state/action-state";
import { ActionDiff } from "../action-diff";
import { SummarizedActionState } from "../summarized-action-state";
import { generateActionDiffs, applyActionDiffs } from "../systems";
import { World } from "@rbxts/matter";
import { Actionlike } from "../actionlike";

class TestAction implements Actionlike {
	constructor(public readonly name: string) {}

	public hash(): string {
		return `TestAction_${this.name}`;
	}

	public equals(other: Actionlike): boolean {
		return other instanceof TestAction && other.name === this.name;
	}

	public toString(): string {
		return `TestAction(${this.name})`;
	}

	public static readonly Jump = new TestAction("Jump");
	public static readonly Run = new TestAction("Run");
	public static readonly Look = new TestAction("Look");
}

export = () => {
	describe("Network Synchronization", () => {
		describe("ActionState.applyDiff", () => {
			it("should apply Pressed diff", () => {
				const actionState = new ActionState<TestAction>();

				const diff: ActionDiff<TestAction> = {
					type: "Pressed",
					action: TestAction.Jump,
					value: 1.0,
				};

				actionState.applyDiff(diff);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.value(TestAction.Jump)).to.equal(1.0);
			});

			it("should apply Released diff", () => {
				const actionState = new ActionState<TestAction>();

				// First press
				actionState.press(TestAction.Jump);
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);

				// Then release via diff
				const diff: ActionDiff<TestAction> = {
					type: "Released",
					action: TestAction.Jump,
				};

				actionState.applyDiff(diff);

				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.value(TestAction.Jump)).to.equal(0);
			});

			it("should apply AxisChanged diff", () => {
				const actionState = new ActionState<TestAction>();

				const diff: ActionDiff<TestAction> = {
					type: "AxisChanged",
					action: TestAction.Run,
					value: 0.75,
				};

				actionState.applyDiff(diff);

				expect(actionState.value(TestAction.Run)).to.equal(0.75);
			});

			it("should apply DualAxisChanged diff", () => {
				const actionState = new ActionState<TestAction>();

				const diff: ActionDiff<TestAction> = {
					type: "DualAxisChanged",
					action: TestAction.Look,
					axisPair: new Vector2(0.5, -0.3),
				};

				actionState.applyDiff(diff);

				const axisPair = actionState.axisPair(TestAction.Look);
				expect(axisPair).to.be.ok();
				expect(axisPair!.x).to.be.near(0.5, 0.001);
				expect(axisPair!.y).to.be.near(-0.3, 0.001);
			});

			it("should apply TripleAxisChanged diff", () => {
				const actionState = new ActionState<TestAction>();

				const diff: ActionDiff<TestAction> = {
					type: "TripleAxisChanged",
					action: TestAction.Look,
					axisTriple: new Vector3(1.0, 0.5, -0.25),
				};

				actionState.applyDiff(diff);

				const actionData = actionState.getActionDataMap().get(TestAction.Look.hash());
				expect(actionData).to.be.ok();
				expect(actionData!.axisPairX).to.be.near(1.0, 0.001);
				expect(actionData!.axisPairY).to.be.near(0.5, 0.001);
				expect(actionData!.value).to.be.near(-0.25, 0.001);
			});
		});

		describe("SummarizedActionState", () => {
			it("should capture button states", () => {
				const actionState = new ActionState<TestAction>();
				actionState.press(TestAction.Jump);

				const summary = SummarizedActionState.summarize(
					actionState,
					[],
				);

				const entities = summary.allEntities();
				expect(entities.has("resource")).to.equal(true);
			});

			it("should generate diffs for button press", () => {
				const actionState = new ActionState<TestAction>();
				const hashToAction = new Map<string, TestAction>();
				hashToAction.set(TestAction.Jump.hash(), TestAction.Jump);

				// Frame 1: Nothing pressed
				const snapshot1 = SummarizedActionState.summarize(actionState, []);

				// Frame 2: Jump pressed
				actionState.press(TestAction.Jump);
				const snapshot2 = SummarizedActionState.summarize(actionState, []);

				const diffs = snapshot2.entityDiffs("resource", snapshot1, hashToAction);

				expect(diffs.size()).to.equal(1);
				expect(diffs[0].type).to.equal("Pressed");
				expect((diffs[0] as { action: TestAction }).action).to.equal(TestAction.Jump);
			});

			it("should generate diffs for button release", () => {
				const actionState = new ActionState<TestAction>();
				const hashToAction = new Map<string, TestAction>();
				hashToAction.set(TestAction.Jump.hash(), TestAction.Jump);

				// Frame 1: Jump pressed
				actionState.press(TestAction.Jump);
				const snapshot1 = SummarizedActionState.summarize(actionState, []);

				// Frame 2: Jump released
				actionState.release(TestAction.Jump);
				const snapshot2 = SummarizedActionState.summarize(actionState, []);

				const diffs = snapshot2.entityDiffs("resource", snapshot1, hashToAction);

				expect(diffs.size()).to.equal(1);
				expect(diffs[0].type).to.equal("Released");
			});

			it("should not generate diffs when state unchanged", () => {
				const actionState = new ActionState<TestAction>();
				const hashToAction = new Map<string, TestAction>();
				hashToAction.set(TestAction.Jump.hash(), TestAction.Jump);

				actionState.press(TestAction.Jump);

				const snapshot1 = SummarizedActionState.summarize(actionState, []);
				const snapshot2 = SummarizedActionState.summarize(actionState, []);

				const diffs = snapshot2.entityDiffs("resource", snapshot1, hashToAction);

				expect(diffs.size()).to.equal(0);
			});
		});

		describe("generateActionDiffs system", () => {
			it("should generate diffs for resource action state", () => {
				const world = new World();
				const actionState = new ActionState<TestAction>();

				// Frame 1: Generate initial snapshot
				const result1 = generateActionDiffs(world, [], actionState, undefined);
				expect(result1.diffs.size()).to.equal(0);

				// Frame 2: Press Jump
				actionState.press(TestAction.Jump);
				const result2 = generateActionDiffs(world, [], actionState, result1.currentSnapshot);

				expect(result2.diffs.size()).to.equal(1);
				expect(result2.diffs[0].type).to.equal("Pressed");
			});

			it("should generate diffs for entity action states", () => {
				const world = new World();
				const entityId = 12345;
				const actionState = new ActionState<TestAction>();

				const query = [{ entity: entityId, actionState }];

				// Frame 1: Initial
				const result1 = generateActionDiffs(world, query, undefined, undefined);

				// Frame 2: Press Run
				actionState.press(TestAction.Run);
				const result2 = generateActionDiffs(world, query, undefined, result1.currentSnapshot);

				expect(result2.diffs.size()).to.equal(1);
				expect(result2.diffs[0].type).to.equal("Pressed");
			});

			it("should handle multiple entities", () => {
				const world = new World();
				const entity1 = 1;
				const entity2 = 2;
				const actionState1 = new ActionState<TestAction>();
				const actionState2 = new ActionState<TestAction>();

				const query = [
					{ entity: entity1, actionState: actionState1 },
					{ entity: entity2, actionState: actionState2 },
				];

				// Frame 1: Initial
				const result1 = generateActionDiffs(world, query, undefined, undefined);

				// Frame 2: Both press different actions
				actionState1.press(TestAction.Jump);
				actionState2.press(TestAction.Run);
				const result2 = generateActionDiffs(world, query, undefined, result1.currentSnapshot);

				expect(result2.diffs.size()).to.equal(2);
			});
		});

		describe("applyActionDiffs system", () => {
			it("should apply diffs to resource action state", () => {
				const resourceActionState = new ActionState<TestAction>();

				const diffs = [
					{
						entityId: "resource",
						diff: {
							type: "Pressed",
							action: TestAction.Jump,
							value: 1.0,
						} as ActionDiff<TestAction>,
					},
				];

				applyActionDiffs(diffs, [], resourceActionState);

				expect(resourceActionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("should apply diffs to entity action states", () => {
				const entityId = 12345;
				const actionState = new ActionState<TestAction>();
				const query = [{ entity: entityId, actionState }];

				const diffs = [
					{
						entityId: tostring(entityId),
						diff: {
							type: "Pressed",
							action: TestAction.Run,
							value: 0.8,
						} as ActionDiff<TestAction>,
					},
				];

				applyActionDiffs(diffs, query);

				expect(actionState.pressed(TestAction.Run)).to.equal(true);
				expect(actionState.value(TestAction.Run)).to.equal(0.8);
			});

			it("should handle multiple diffs", () => {
				const actionState = new ActionState<TestAction>();
				const query = [{ entity: 1, actionState }];

				const diffs = [
					{
						entityId: "1",
						diff: {
							type: "Pressed",
							action: TestAction.Jump,
							value: 1.0,
						} as ActionDiff<TestAction>,
					},
					{
						entityId: "1",
						diff: {
							type: "AxisChanged",
							action: TestAction.Run,
							value: 0.5,
						} as ActionDiff<TestAction>,
					},
				];

				applyActionDiffs(diffs, query);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.value(TestAction.Run)).to.equal(0.5);
			});
		});

		describe("End-to-end network sync simulation", () => {
			it("should sync action state from client to server", () => {
				// Simulate client
				const clientWorld = new World();
				const clientActionState = new ActionState<TestAction>();

				// Simulate server
				const serverWorld = new World();
				const serverActionState = new ActionState<TestAction>();

				// Frame 1: Client generates initial snapshot
				let clientSnapshot = generateActionDiffs(
					clientWorld,
					[],
					clientActionState,
					undefined,
				).currentSnapshot;

				// Frame 2: Client presses Jump
				clientActionState.press(TestAction.Jump);
				const { diffs, currentSnapshot } = generateActionDiffs(
					clientWorld,
					[],
					clientActionState,
					clientSnapshot,
				);
				clientSnapshot = currentSnapshot;

				expect(diffs.size()).to.equal(1);

				// Transfer diffs to server (serialize/deserialize would happen here)
				const transferredDiffs = diffs.map((diff) => ({ entityId: "resource", diff }));

				// Server applies diffs
				applyActionDiffs(transferredDiffs, [], serverActionState);

				// Verify server state matches client
				expect(serverActionState.pressed(TestAction.Jump)).to.equal(true);
				expect(serverActionState.pressed(TestAction.Jump)).to.equal(
					clientActionState.pressed(TestAction.Jump),
				);
			});

			it("should sync continuous input changes", () => {
				const clientWorld = new World();
				const serverWorld = new World();
				const clientActionState = new ActionState<TestAction>();
				const serverActionState = new ActionState<TestAction>();

				let clientSnapshot = generateActionDiffs(
					clientWorld,
					[],
					clientActionState,
					undefined,
				).currentSnapshot;

				// Frame 1: Press
				clientActionState.press(TestAction.Jump);
				let result = generateActionDiffs(clientWorld, [], clientActionState, clientSnapshot);
				clientSnapshot = result.currentSnapshot;
				applyActionDiffs(
					result.diffs.map((diff) => ({ entityId: "resource", diff })),
					[],
					serverActionState,
				);

				expect(serverActionState.pressed(TestAction.Jump)).to.equal(true);

				// Frame 2: Release
				clientActionState.release(TestAction.Jump);
				result = generateActionDiffs(clientWorld, [], clientActionState, clientSnapshot);
				clientSnapshot = result.currentSnapshot;
				applyActionDiffs(
					result.diffs.map((diff) => ({ entityId: "resource", diff })),
					[],
					serverActionState,
				);

				expect(serverActionState.pressed(TestAction.Jump)).to.equal(false);

				// Frame 3: Press again
				clientActionState.press(TestAction.Jump);
				result = generateActionDiffs(clientWorld, [], clientActionState, clientSnapshot);
				applyActionDiffs(
					result.diffs.map((diff) => ({ entityId: "resource", diff })),
					[],
					serverActionState,
				);

				expect(serverActionState.pressed(TestAction.Jump)).to.equal(true);
			});
		});
	});
};