/**
 * Unit tests for systems module
 */

import { World } from "@rbxts/matter";
import { ActionState } from "../action-state/action-state";
import { InputMap } from "../input-map/input-map";
import { CentralInputStore } from "../user-input/central-input-store";
import { ClashStrategy } from "../clashing-inputs/clash-strategy";
import { KeyCode } from "../user-input/keyboard";
import { Actionlike } from "../actionlike";
import { InputControlKind } from "../input-control-kind";
import {
	updateActionState,
	tickActionState,
	clearCentralInputStore,
	releaseOnWindowFocusLost,
	clearActionStates,
} from "../systems";

class TestAction implements Actionlike {
	static readonly Jump = new TestAction("Jump", InputControlKind.Button);
	static readonly Move = new TestAction("Move", InputControlKind.DualAxis);
	static readonly Attack = new TestAction("Attack", InputControlKind.Button);

	constructor(
		private readonly name: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `TestAction_${this.name}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && other.name === this.name;
	}

	toString(): string {
		return this.name;
	}
}

export = () => {
	describe("Systems Module", () => {
		let world: World;
		let inputStore: CentralInputStore;
		let clashStrategy: ClashStrategy;

		beforeEach(() => {
			world = new World();
			inputStore = new CentralInputStore();
			clashStrategy = ClashStrategy.UseAll;
		});

		describe("updateActionState", () => {
			it("should update ActionState from InputMap", () => {
				const actionState = new ActionState<TestAction>();
				const inputMap = new InputMap<TestAction>();
				inputMap.insert(TestAction.Jump, new KeyCode(Enum.KeyCode.Space));

				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);

				updateActionState(inputStore, clashStrategy, [], actionState, inputMap);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("should handle multiple entities", () => {
				const entity1 = {
					actionState: new ActionState<TestAction>(),
					inputMap: new InputMap<TestAction>(),
				};
				entity1.inputMap.insert(TestAction.Jump, new KeyCode(Enum.KeyCode.Space));

				const entity2 = {
					actionState: new ActionState<TestAction>(),
					inputMap: new InputMap<TestAction>(),
				};
				entity2.inputMap.insert(TestAction.Attack, new KeyCode(Enum.KeyCode.E));

				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);
				inputStore.updateKeyboardKey(Enum.KeyCode.E, true);

				updateActionState(inputStore, clashStrategy, [entity1, entity2]);

				expect(entity1.actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(entity2.actionState.pressed(TestAction.Attack)).to.equal(true);
			});

			it("should convert ProcessedActionState to ActionData correctly", () => {
				const actionState = new ActionState<TestAction>();
				const inputMap = new InputMap<TestAction>();
				inputMap.insert(TestAction.Jump, new KeyCode(Enum.KeyCode.Space));

				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);

				updateActionState(inputStore, clashStrategy, [], actionState, inputMap);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.value(TestAction.Jump)).to.be.ok();
			});
		});

		describe("tickActionState", () => {
			it("should advance action state timing", () => {
				const actionState = new ActionState<TestAction>();
				actionState.press(TestAction.Jump);

				const currentTime = os.clock();
				const previousTime = currentTime - 0.016;

				tickActionState(world, [], actionState, currentTime, previousTime);

				expect(actionState.justPressed(TestAction.Jump)).to.equal(false);
			});

			it("should use Instant-based timing", () => {
				const actionState = new ActionState<TestAction>();
				actionState.press(TestAction.Jump);

				const currentTime = 1.0;
				const previousTime = 0.9;

				tickActionState(world, [], actionState, currentTime, previousTime);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("should handle multiple entities", () => {
				const entity1 = { actionState: new ActionState<TestAction>() };
				const entity2 = { actionState: new ActionState<TestAction>() };

				entity1.actionState.press(TestAction.Jump);
				entity2.actionState.press(TestAction.Attack);

				const currentTime = os.clock();
				const previousTime = currentTime - 0.016;

				tickActionState(world, [entity1, entity2], undefined, currentTime, previousTime);

				expect(entity1.actionState.justPressed(TestAction.Jump)).to.equal(false);
				expect(entity2.actionState.justPressed(TestAction.Attack)).to.equal(false);
			});
		});

		describe("clearCentralInputStore", () => {
			it("should clear all inputs from store", () => {
				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);
				inputStore.updateKeyboardKey(Enum.KeyCode.W, true);
				inputStore.updateMouseButton(Enum.UserInputType.MouseButton1, true);

				expect(inputStore.size()).to.equal(3);

				clearCentralInputStore(inputStore);

				expect(inputStore.size()).to.equal(0);
			});

			it("should allow new inputs after clearing", () => {
				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);
				clearCentralInputStore(inputStore);

				inputStore.updateKeyboardKey(Enum.KeyCode.W, true);

				expect(inputStore.size()).to.equal(1);
			});
		});

		describe("releaseOnWindowFocusLost", () => {
			it("should release all actions when window loses focus", () => {
				const actionState = new ActionState<TestAction>();
				actionState.press(TestAction.Jump);
				actionState.press(TestAction.Attack);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.pressed(TestAction.Attack)).to.equal(true);

				releaseOnWindowFocusLost([], actionState, false);

				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.pressed(TestAction.Attack)).to.equal(false);
			});

			it("should NOT release actions when window has focus", () => {
				const actionState = new ActionState<TestAction>();
				actionState.press(TestAction.Jump);

				releaseOnWindowFocusLost([], actionState, true);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("should handle multiple entities", () => {
				const entity1 = { actionState: new ActionState<TestAction>() };
				const entity2 = { actionState: new ActionState<TestAction>() };

				entity1.actionState.press(TestAction.Jump);
				entity2.actionState.press(TestAction.Attack);

				releaseOnWindowFocusLost([entity1, entity2], undefined, false);

				expect(entity1.actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(entity2.actionState.pressed(TestAction.Attack)).to.equal(false);
			});
		});

		describe("clearActionStates", () => {
			it("should clear all action data", () => {
				const actionState = new ActionState<TestAction>();
				actionState.press(TestAction.Jump);
				actionState.press(TestAction.Attack);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);

				clearActionStates([], actionState);

				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.pressed(TestAction.Attack)).to.equal(false);
			});

			it("should handle multiple entities", () => {
				const entity1 = { actionState: new ActionState<TestAction>() };
				const entity2 = { actionState: new ActionState<TestAction>() };

				entity1.actionState.press(TestAction.Jump);
				entity2.actionState.press(TestAction.Attack);

				clearActionStates([entity1, entity2]);

				expect(entity1.actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(entity2.actionState.pressed(TestAction.Attack)).to.equal(false);
			});
		});

		describe("Integration Tests", () => {
			it("should handle complete input processing flow", () => {
				const actionState = new ActionState<TestAction>();
				const inputMap = new InputMap<TestAction>();
				inputMap.insert(TestAction.Jump, new KeyCode(Enum.KeyCode.Space));

				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);

				updateActionState(inputStore, clashStrategy, [], actionState, inputMap);
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(true);

				const currentTime = os.clock();
				const previousTime = currentTime - 0.016;
				tickActionState(world, [], actionState, currentTime, previousTime);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(false);

				clearCentralInputStore(inputStore);
				expect(inputStore.size()).to.equal(0);
			});

			it("should handle window focus loss correctly", () => {
				const actionState = new ActionState<TestAction>();
				const inputMap = new InputMap<TestAction>();
				inputMap.insert(TestAction.Jump, new KeyCode(Enum.KeyCode.Space));

				inputStore.updateKeyboardKey(Enum.KeyCode.Space, true);
				updateActionState(inputStore, clashStrategy, [], actionState, inputMap);

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);

				releaseOnWindowFocusLost([], actionState, false);

				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
			});
		});
	});
};