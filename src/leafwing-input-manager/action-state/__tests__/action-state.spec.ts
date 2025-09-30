import { ActionState } from "../action-state";
import { Instant } from "../../instant";
import { Actionlike } from "../../actionlike";
import { UpdatedActions } from "../action-state";
import { ActionData } from "../action-data";

class TestAction implements Actionlike {
	constructor(private readonly name: string) {}

	hash(): string {
		return this.name;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return this.name;
	}
}

const Jump = new TestAction("Jump");
const Move = new TestAction("Move");
const Shoot = new TestAction("Shoot");
const Aim = new TestAction("Aim");

export = () => {
	describe("ActionState Unit Tests", () => {
		let actionState: ActionState<TestAction>;

		beforeEach(() => {
			actionState = ActionState.default<TestAction>();
		});

		afterEach(() => {
			actionState.clear();
		});

		describe("Basic State Operations", () => {
			it("should initialize with default values", () => {
				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.released(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(false);
				expect(actionState.justReleased(Jump)).to.equal(false);
				expect(actionState.value(Jump)).to.equal(0);
			});

			it("should press an action correctly", () => {
				actionState.press(Jump);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.released(Jump)).to.equal(false);
				expect(actionState.justPressed(Jump)).to.equal(true);
				expect(actionState.value(Jump)).to.equal(1.0);
			});

			it("should press an action with custom value", () => {
				actionState.press(Move, 0.5);

				expect(actionState.pressed(Move)).to.equal(true);
				expect(actionState.value(Move)).to.equal(0.5);
			});

			it("should release an action correctly", () => {
				actionState.press(Jump);
				actionState.tick();
				actionState.release(Jump);

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.released(Jump)).to.equal(true);
				expect(actionState.justReleased(Jump)).to.equal(true);
				expect(actionState.value(Jump)).to.equal(0);
			});

			it("should handle multiple actions independently", () => {
				actionState.press(Jump);
				actionState.press(Shoot);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.pressed(Shoot)).to.equal(true);
				expect(actionState.pressed(Move)).to.equal(false);
			});
		});

		describe("State Transitions", () => {
			it("should transition from released to pressed", () => {
				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.justPressed(Jump)).to.equal(false);

				actionState.press(Jump);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(true);
				expect(actionState.justReleased(Jump)).to.equal(false);
			});

			it("should transition from pressed to released", () => {
				actionState.press(Jump);
				actionState.tick();

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(false);

				actionState.release(Jump);

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.justReleased(Jump)).to.equal(true);
			});

			it("should clear justPressed after tick", () => {
				actionState.press(Jump);

				expect(actionState.justPressed(Jump)).to.equal(true);

				actionState.tick();

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(false);
			});

			it("should clear justReleased after tick", () => {
				actionState.press(Jump);
				actionState.tick();
				actionState.release(Jump);

				expect(actionState.justReleased(Jump)).to.equal(true);

				actionState.tick();

				expect(actionState.released(Jump)).to.equal(true);
				expect(actionState.justReleased(Jump)).to.equal(false);
			});

			it("should handle repeated presses correctly", () => {
				actionState.press(Jump);
				actionState.tick();

				expect(actionState.justPressed(Jump)).to.equal(false);

				actionState.press(Jump);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(false);
			});
		});

		describe("Time Tracking", () => {
			it("should track duration with deltaTime using instants", () => {
				const startInstant = Instant.fromTimestamp(1.0);
				const instant1 = Instant.fromTimestamp(1.016);
				const instant2 = Instant.fromTimestamp(1.032);

				actionState.press(Jump);

				actionState.tickWithInstants(instant1, startInstant);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(0.016);

				actionState.tickWithInstants(instant2, instant1);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(0.032);
			});

			it("should track duration with instants", () => {
				const startInstant = Instant.fromTimestamp(1.0);
				const instant1 = Instant.fromTimestamp(1.016);
				const instant2 = Instant.fromTimestamp(1.032);

				actionState.press(Jump);
				actionState.tickWithInstants(instant1, startInstant);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(0.016);

				actionState.tickWithInstants(instant2, instant1);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(0.032);
			});

			it("should reset duration when released", () => {
				const startInstant = Instant.fromTimestamp(1.0);
				const instant1 = Instant.fromTimestamp(1.5);

				actionState.press(Jump);
				actionState.tickWithInstants(instant1, startInstant);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(0.5);

				actionState.release(Jump);

				expect(actionState.getCurrentDuration(Jump)).to.equal(0);
			});

			it("should track previous duration", () => {
				const instant0 = Instant.fromTimestamp(1.0);
				const instant1 = Instant.fromTimestamp(1.1);
				const instant2 = Instant.fromTimestamp(1.2);

				actionState.press(Jump);
				actionState.tickWithInstants(instant1, instant0);

				expect(actionState.getPreviousDuration(Jump)).to.equal(0);

				actionState.tickWithInstants(instant2, instant1);

				expect(actionState.getPreviousDuration(Jump)).to.be.near(0.1);
			});

			it("should track when action was pressed", () => {
				const startInstant = Instant.fromTimestamp(1.0);

				expect(actionState.whenPressed(Jump)).to.equal(undefined);

				actionState.press(Jump);
				actionState.tickWithInstants(startInstant, startInstant);

				const whenPressed = actionState.whenPressed(Jump);
				expect(whenPressed).to.be.ok();
			});
		});

		describe("FixedUpdate Support", () => {
			it("should handle fixed timestep updates", () => {
				const fixedDelta = 1 / 60;

				actionState.press(Jump);
				actionState.tickFixed(fixedDelta);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(fixedDelta);

				actionState.tickFixed(fixedDelta);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(fixedDelta * 2);
			});

			it("should clear justPressed in fixed update", () => {
				actionState.press(Jump);

				expect(actionState.justPressed(Jump)).to.equal(true);

				actionState.tickFixed(1 / 60);

				expect(actionState.justPressed(Jump)).to.equal(false);
				expect(actionState.pressed(Jump)).to.equal(true);
			});

			it("should accumulate duration correctly in fixed updates", () => {
				const fixedDelta = 1 / 50;

				actionState.press(Move);

				for (let index = 0; index < 10; index++) {
					actionState.tickFixed(fixedDelta);
				}

				expect(actionState.getCurrentDuration(Move)).to.be.near(fixedDelta * 10);
			});
		});

		describe("Update From Input", () => {
			it("should update from UpdatedActions", () => {
				const actionData = new Map<string, ActionData>();
				const jumpData = ActionData.default();
				jumpData.update(true, 1.0);
				actionData.set(Jump.hash(), jumpData);

				const updatedActions: UpdatedActions<TestAction> = {
					actionData,
					consumedInputs: new Set(),
				};

				actionState.updateFromUpdatedActions(updatedActions);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(true);
				expect(actionState.value(Jump)).to.equal(1.0);
			});

			it("should handle axis pair data", () => {
				const actionData = new Map<string, ActionData>();
				const aimData = ActionData.default();
				aimData.update(true, 1.0, 0.5, -0.5);
				actionData.set(Aim.hash(), aimData);

				const updatedActions: UpdatedActions<TestAction> = {
					actionData,
					consumedInputs: new Set(),
				};

				actionState.updateFromUpdatedActions(updatedActions);

				const axisPair = actionState.axisPair(Aim);
				expect(axisPair.x).to.be.near(0.5);
				expect(axisPair.y).to.be.near(-0.5);
			});

			it("should update multiple actions at once", () => {
				const actionData = new Map<string, ActionData>();

				const jumpData = ActionData.default();
				jumpData.update(true, 1.0);
				actionData.set(Jump.hash(), jumpData);

				const moveData = ActionData.default();
				moveData.update(true, 0.7);
				actionData.set(Move.hash(), moveData);

				const updatedActions: UpdatedActions<TestAction> = {
					actionData,
					consumedInputs: new Set(),
				};

				actionState.updateFromUpdatedActions(updatedActions);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.pressed(Move)).to.equal(true);
				expect(actionState.value(Jump)).to.equal(1.0);
				expect(actionState.value(Move)).to.equal(0.7);
			});
		});

		describe("Action Enable/Disable", () => {
			it("should disable a specific action", () => {
				actionState.press(Jump);
				expect(actionState.pressed(Jump)).to.equal(true);

				actionState.disable(Jump);

				actionState.press(Jump);
				expect(actionState.pressed(Jump)).to.equal(false);
			});

			it("should enable a disabled action", () => {
				actionState.disable(Jump);
				actionState.press(Jump);
				expect(actionState.pressed(Jump)).to.equal(false);

				actionState.enable(Jump);
				actionState.press(Jump);

				expect(actionState.pressed(Jump)).to.equal(true);
			});

			it("should not update disabled actions from input", () => {
				actionState.disable(Jump);
				actionState.disable(Move);

				actionState.press(Jump);
				actionState.press(Move);

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.pressed(Move)).to.equal(false);
			});

			it("should reset disabled action when disabled", () => {
				actionState.press(Jump);
				expect(actionState.pressed(Jump)).to.equal(true);

				actionState.disable(Jump);

				expect(actionState.pressed(Jump)).to.equal(false);
			});
		});

		describe("Reset Operations", () => {
			it("should reset a specific action", () => {
				const startInstant = Instant.fromTimestamp(1.0);
				const endInstant = Instant.fromTimestamp(1.5);

				actionState.press(Jump);
				actionState.tickWithInstants(endInstant, startInstant);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.getCurrentDuration(Jump)).to.be.near(0.5);

				actionState.reset(Jump);

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.getCurrentDuration(Jump)).to.equal(0);
			});

			it("should reset all actions", () => {
				const startInstant = Instant.fromTimestamp(1.0);
				const endInstant = Instant.fromTimestamp(1.5);

				actionState.press(Jump);
				actionState.press(Move);
				actionState.tickWithInstants(endInstant, startInstant);

				actionState.resetAll();

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.pressed(Move)).to.equal(false);
				expect(actionState.getCurrentDuration(Jump)).to.equal(0);
				expect(actionState.getCurrentDuration(Move)).to.equal(0);
			});

			it("should release all actions", () => {
				actionState.press(Jump);
				actionState.press(Move);
				actionState.press(Shoot);

				actionState.releaseAll();

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.pressed(Move)).to.equal(false);
				expect(actionState.pressed(Shoot)).to.equal(false);
			});

			it("should clear all action data", () => {
				actionState.press(Jump);
				actionState.press(Move);

				actionState.clear();

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.pressed(Move)).to.equal(false);
			});
		});

		describe("Edge Cases", () => {
			it("should handle pressing already pressed action", () => {
				actionState.press(Jump);
				actionState.tick();

				const initialDuration = actionState.getCurrentDuration(Jump);

				actionState.press(Jump);

				expect(actionState.pressed(Jump)).to.equal(true);
				expect(actionState.justPressed(Jump)).to.equal(false);
			});

			it("should handle releasing already released action", () => {
				actionState.release(Jump);

				expect(actionState.pressed(Jump)).to.equal(false);
				expect(actionState.justReleased(Jump)).to.equal(false);
			});

			it("should handle zero deltaTime", () => {
				const instant = Instant.fromTimestamp(1.0);

				actionState.press(Jump);
				actionState.tickWithInstants(instant, instant);

				expect(actionState.getCurrentDuration(Jump)).to.equal(0);
			});

			it("should handle large deltaTime", () => {
				const startInstant = Instant.fromTimestamp(1.0);
				const endInstant = Instant.fromTimestamp(11.0);

				actionState.press(Jump);
				actionState.tickWithInstants(endInstant, startInstant);

				expect(actionState.getCurrentDuration(Jump)).to.be.near(10.0);
			});

			it("should handle rapid press-release cycles", () => {
				for (let index = 0; index < 5; index++) {
					actionState.press(Jump);
					expect(actionState.pressed(Jump)).to.equal(true);

					actionState.tick();
					actionState.release(Jump);
					expect(actionState.pressed(Jump)).to.equal(false);

					actionState.tick();
				}
			});
		});

		describe("Action Registration", () => {
			it("should register actions automatically on press", () => {
				actionState.press(Jump);

				expect(actionState.pressed(Jump)).to.equal(true);
			});

			it("should manually register actions", () => {
				actionState.registerAction(Move);

				actionState.press(Move);
				expect(actionState.pressed(Move)).to.equal(true);
			});
		});
	});
};