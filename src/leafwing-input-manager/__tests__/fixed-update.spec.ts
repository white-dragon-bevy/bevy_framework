import { ActionState } from "../action-state/action-state";
import { ActionData } from "../action-state/action-data";
import { ButtonData } from "../action-state/button-data";
import { Actionlike } from "../actionlike";
import { InputControlKind } from "../input-control-kind";

class TestAction implements Actionlike {
	static readonly Jump = new TestAction("Jump");
	static readonly Move = new TestAction("Move");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

export = () => {
	describe("Fixed Update State Management", () => {
		let actionState: ActionState<TestAction>;

		beforeEach(() => {
			actionState = new ActionState<TestAction>();
		});

		afterEach(() => {
			actionState.resetAll();
		});

		describe("New State Swap Methods", () => {
			it("should use new swapToFixedUpdateState method", () => {
				// Set up initial state
				actionState.press(TestAction.Jump, 1.0);
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);

				// Use new method name
				actionState.swapToFixedUpdateState();

				// Should have separate state
				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.value(TestAction.Jump)).to.equal(0.0);
			});

			it("should use new swapToUpdateState method", () => {
				// Set up initial state
				actionState.press(TestAction.Jump, 1.0);
				actionState.swapToFixedUpdateState();
				actionState.press(TestAction.Move, 0.5);

				// Use new method name
				actionState.swapToUpdateState();

				// Should restore original state
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.value(TestAction.Jump)).to.equal(1.0);
				expect(actionState.pressed(TestAction.Move)).to.equal(false);
			});
		});

		describe("Fixed Timestep Tick", () => {
			it("should implement tickFixed method", () => {
				// Press action
				actionState.press(TestAction.Jump, 1.0);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(true);

				// Tick with fixed timestep
				const fixedDeltaTime = 1 / 50; // 20ms
				actionState.tickFixed(fixedDeltaTime);

				// Just pressed should be cleared
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(false);
			});

			it("should maintain consistent duration with fixed timestep", () => {
				actionState.press(TestAction.Jump, 1.0);

				const fixedDeltaTime = 1 / 50; // 20ms
				let previousDuration = 0;

				// Multiple fixed ticks should increase duration consistently
				for (let tickIndex = 0; tickIndex < 5; tickIndex++) {
					actionState.tickFixed(fixedDeltaTime);
					const currentDuration = actionState.getCurrentDuration(TestAction.Jump);

					expect(currentDuration > previousDuration).to.equal(true);

					if (tickIndex > 0) {
						const deltaIncrease = currentDuration - previousDuration;
						expect(deltaIncrease).to.be.near(fixedDeltaTime, 0.001);
					}

					previousDuration = currentDuration;
				}
			});
		});

		it("should swap ActionState to fixed update state", () => {
			// Set up initial state
			actionState.press(TestAction.Jump, 1.0);
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			expect(actionState.value(TestAction.Jump)).to.equal(1.0);

			// Swap to fixed update
			actionState.swapToFixedUpdateState();

			// Should have separate state now
			expect(actionState.pressed(TestAction.Jump)).to.equal(false);
			expect(actionState.value(TestAction.Jump)).to.equal(0.0);

			// Press in fixed update state
			actionState.press(TestAction.Move, 0.8);
			expect(actionState.pressed(TestAction.Move)).to.equal(true);
		});

		it("should swap ActionState back to update state", () => {
			// Set up initial state
			actionState.press(TestAction.Jump, 1.0);

			// Swap to fixed update
			actionState.swapToFixedUpdateState();

			// Press different action in fixed update
			actionState.press(TestAction.Move, 0.5);

			// Swap back to update
			actionState.swapToUpdateState();

			// Should restore original state
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			expect(actionState.value(TestAction.Jump)).to.equal(1.0);

			// Fixed update state should not be visible
			expect(actionState.pressed(TestAction.Move)).to.equal(false);
		});

		it("should handle ActionData state swapping", () => {
			const actionData = new ActionData(true, 1.0, 0.5, -0.3);

			// Swap to fixed update state
			actionData.swapToFixedUpdateState();

			// Should have reset values
			expect(actionData.pressed).to.equal(false);
			expect(actionData.value).to.equal(0.0);
			expect(actionData.axisPairX).to.equal(0.0);
			expect(actionData.axisPairY).to.equal(0.0);

			// Modify fixed update state
			actionData.update(true, 0.8, 0.2, 0.7);

			// Swap back to update
			actionData.swapToUpdateState();

			// Should restore original values
			expect(actionData.pressed).to.equal(true);
			expect(actionData.value).to.equal(1.0);
			expect(actionData.axisPairX).to.equal(0.5);
			expect(actionData.axisPairY).to.equal(-0.3);
		});

		it("should handle ButtonData state swapping", () => {
			const buttonData = new ButtonData(true, false);

			// Swap to fixed update state
			buttonData.swapToFixedUpdateState();

			// Should have default fixed update state
			expect(buttonData.justPressed).to.equal(false);
			expect(buttonData.justReleased).to.equal(false);

			// Modify fixed update state
			buttonData.update(true, false); // Just pressed
			expect(buttonData.justPressed).to.equal(true);

			// Swap back to update
			buttonData.swapToUpdateState();

			// Should restore original state
			expect(buttonData.justPressed).to.equal(true);
			expect(buttonData.justReleased).to.equal(false);
		});

		it("should maintain separate state between swaps", () => {
			// Set up initial state
			actionState.press(TestAction.Jump, 1.0);

			// Multiple swaps should maintain state integrity
			actionState.swapToFixedUpdateState();
			actionState.press(TestAction.Move, 0.5);

			actionState.swapToUpdateState();
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			expect(actionState.pressed(TestAction.Move)).to.equal(false);

			actionState.swapToFixedUpdateState();
			expect(actionState.pressed(TestAction.Jump)).to.equal(false);
			expect(actionState.pressed(TestAction.Move)).to.equal(true);

			actionState.swapToUpdateState();
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			expect(actionState.pressed(TestAction.Move)).to.equal(false);
		});

		it("should handle disabled action state gracefully", () => {
			actionState.disableAll();

			// Should not crash when swapping disabled state
			actionState.swapToFixedUpdateState();
			actionState.swapToUpdateState();

			// Should remain disabled
			expect(actionState.isDisabledAll()).to.equal(true);
		});

		describe("ActionData State Management", () => {
			it("should maintain separate updateState in ActionData", () => {
				const actionData = new ActionData(true, 0.8, 0.5, -0.3);

				// Swap to fixed update
				actionData.swapToFixedUpdateState();

				// Should save original state as updateState
				expect(actionData.updateState).to.be.ok();
				expect(actionData.updateState!.pressed).to.equal(true);
				expect(actionData.updateState!.value).to.equal(0.8);

				// Current state should be reset
				expect(actionData.pressed).to.equal(false);
				expect(actionData.value).to.equal(0.0);

				// Modify fixed update state
				actionData.update(true, 0.3, 0.1, 0.7);

				// Swap back
				actionData.swapToUpdateState();

				// Should restore original values
				expect(actionData.pressed).to.equal(true);
				expect(actionData.value).to.equal(0.8);
				expect(actionData.axisPairX).to.equal(0.5);
				expect(actionData.axisPairY).to.equal(-0.3);

				// Fixed update state should be preserved
				expect(actionData.fixedUpdateState!.pressed).to.equal(true);
				expect(actionData.fixedUpdateState!.value).to.equal(0.3);
			});
		});

		describe("ButtonData State Management", () => {
			it("should maintain separate updateState in ButtonData", () => {
				const buttonData = new ButtonData(true, false);

				// Swap to fixed update
				buttonData.swapToFixedUpdateState();

				// Should save original state as updateState
				expect(buttonData.updateState).to.be.ok();
				expect(buttonData.updateState!.justPressed).to.equal(true);
				expect(buttonData.updateState!.justReleased).to.equal(false);

				// Current state should be reset
				expect(buttonData.justPressed).to.equal(false);
				expect(buttonData.justReleased).to.equal(false);

				// Modify fixed update state
				buttonData.update(false, true); // Just released

				// Swap back
				buttonData.swapToUpdateState();

				// Should restore original values
				expect(buttonData.justPressed).to.equal(true);
				expect(buttonData.justReleased).to.equal(false);

				// Fixed update state should be preserved
				expect(buttonData.fixedUpdateState!.justPressed).to.equal(false);
				expect(buttonData.fixedUpdateState!.justReleased).to.equal(true);
			});
		});

		describe("Legacy Method Compatibility", () => {
			it("should maintain backward compatibility for ActionState", () => {
				actionState.press(TestAction.Jump, 1.0);

				// Legacy methods should work
				actionState.swapToFixedUpdate();
				expect(actionState.pressed(TestAction.Jump)).to.equal(false);

				actionState.swapToUpdate();
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("should maintain backward compatibility for ActionData and ButtonData", () => {
				const actionData = new ActionData(true, 0.7);
				const buttonData = new ButtonData(true, false);

				// Legacy methods should work
				actionData.swapToFixedUpdate();
				buttonData.swapToFixedUpdate();

				expect(actionData.pressed).to.equal(false);
				expect(buttonData.justPressed).to.equal(false);

				actionData.swapToUpdate();
				buttonData.swapToUpdate();

				expect(actionData.pressed).to.equal(true);
				expect(actionData.value).to.equal(0.7);
				expect(buttonData.justPressed).to.equal(true);
			});
		});

		describe("Reset Behavior", () => {
			it("should clear both updateState and fixedUpdateState on reset", () => {
				const actionData = new ActionData(true, 0.8);
				const buttonData = new ButtonData(true, false);

				// Set up dual states
				actionData.swapToFixedUpdateState();
				buttonData.swapToFixedUpdateState();

				actionData.update(true, 0.3);
				buttonData.update(false, true);

				// Reset should clear all states
				actionData.reset();
				buttonData.reset();

				expect(actionData.updateState).to.equal(undefined);
				expect(actionData.fixedUpdateState).to.equal(undefined);
				expect(buttonData.updateState).to.equal(undefined);
				expect(buttonData.fixedUpdateState).to.equal(undefined);
			});
		});
	});
};