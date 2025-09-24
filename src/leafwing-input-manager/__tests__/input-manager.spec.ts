/**
 * Unit tests for leafwing-input-manager
 */

import {
	ActionlikeEnum,
	InputControlKind,
	InputMap,
	ActionState,
	KeyCode,
	MouseButton,
	VirtualAxis,
	VirtualDPad,
	InputChord,
	ModifierKey,
	BasicInputs,
	ClashDetector,
	ClashStrategy,
} from "../index";

export = () => {
	// Test action definitions
	class TestAction extends ActionlikeEnum {
		static readonly Jump = new TestAction("Jump", InputControlKind.Button);
		static readonly Move = new TestAction("Move", InputControlKind.DualAxis);
		static readonly Attack = new TestAction("Attack", InputControlKind.Button);
		static readonly Block = new TestAction("Block", InputControlKind.Button);
	}

	describe("ActionlikeEnum", () => {
		it("should create actions with correct properties", () => {
			expect(TestAction.Jump.toString()).to.equal("Jump");
			expect(TestAction.Jump.getInputControlKind()).to.equal(InputControlKind.Button);
			expect(TestAction.Move.getInputControlKind()).to.equal(InputControlKind.DualAxis);
		});

		it("should generate unique hashes", () => {
			const hash1 = TestAction.Jump.hash();
			const hash2 = TestAction.Move.hash();
			const hash3 = TestAction.Attack.hash();

			expect(hash1).to.never.equal(hash2);
			expect(hash2).to.never.equal(hash3);
			expect(hash1).to.never.equal(hash3);
		});

		it("should maintain consistent hashes", () => {
			const hash1 = TestAction.Jump.hash();
			const hash2 = TestAction.Jump.hash();

			expect(hash1).to.equal(hash2);
		});
	});

	describe("InputMap", () => {
		let inputMap: InputMap<TestAction>;

		beforeEach(() => {
			inputMap = new InputMap<TestAction>();
		});

		it("should insert and retrieve inputs", () => {
			inputMap.insert(TestAction.Jump, KeyCode.Space);
			const inputs = inputMap.getInputs(TestAction.Jump);

			expect(inputs).to.be.ok();
			expect(inputs!.size()).to.equal(1);
		});

		it("should support multiple inputs for one action", () => {
			inputMap.insert(TestAction.Jump, KeyCode.Space);
			inputMap.insert(TestAction.Jump, KeyCode.Up);
			const inputs = inputMap.getInputs(TestAction.Jump);

			expect(inputs).to.be.ok();
			expect(inputs!.size()).to.equal(2);
		});

		it("should remove inputs", () => {
			inputMap.insert(TestAction.Jump, KeyCode.Space);
			inputMap.remove(TestAction.Jump, KeyCode.Space);
			const inputs = inputMap.getInputs(TestAction.Jump);

			expect(inputs.size()).to.equal(0);
		});

		it("should clear all inputs for an action", () => {
			inputMap.insert(TestAction.Jump, KeyCode.Space);
			inputMap.insert(TestAction.Jump, KeyCode.Up);
			inputMap.clearAction(TestAction.Jump);
			const inputs = inputMap.getInputs(TestAction.Jump);

			expect(inputs.size()).to.equal(0);
		});

		it("should merge with another input map", () => {
			const otherMap = new InputMap<TestAction>();
			otherMap.insert(TestAction.Attack, MouseButton.left());

			inputMap.insert(TestAction.Jump, KeyCode.Space);
			inputMap.merge(otherMap);

			expect(inputMap.getInputs(TestAction.Jump)).to.be.ok();
			expect(inputMap.getInputs(TestAction.Attack)).to.be.ok();
		});
	});

	describe("ActionState", () => {
		let actionState: ActionState<TestAction>;

		beforeEach(() => {
			actionState = new ActionState<TestAction>();
		});

		it("should track pressed state", () => {
			expect(actionState.pressed(TestAction.Jump)).to.equal(false);

			actionState.press(TestAction.Jump);
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);

			actionState.release(TestAction.Jump);
			expect(actionState.pressed(TestAction.Jump)).to.equal(false);
		});

		it("should track just pressed state", () => {
			actionState.press(TestAction.Jump);
			expect(actionState.justPressed(TestAction.Jump)).to.equal(true);

			actionState.tick(0.016);
			expect(actionState.justPressed(TestAction.Jump)).to.equal(false);
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);
		});

		it("should track just released state", () => {
			actionState.press(TestAction.Jump);
			actionState.tick(0.016);
			actionState.release(TestAction.Jump);

			expect(actionState.justReleased(TestAction.Jump)).to.equal(true);
			expect(actionState.pressed(TestAction.Jump)).to.equal(false);

			actionState.tick(0.016);
			expect(actionState.justReleased(TestAction.Jump)).to.equal(false);
		});

		it("should track press duration", () => {
			actionState.press(TestAction.Jump);
			actionState.tick(0.5);

			const duration = actionState.getCurrentDuration(TestAction.Jump);
			expect(duration).to.be.near(0.5, 0.01);
		});

		it("should handle action disabling", () => {
			actionState.press(TestAction.Jump);
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);

			actionState.disable(TestAction.Jump);
			expect(actionState.pressed(TestAction.Jump)).to.equal(false);

			actionState.enable(TestAction.Jump);
			actionState.press(TestAction.Jump);
			expect(actionState.pressed(TestAction.Jump)).to.equal(true);
		});
	});

	describe("VirtualAxis", () => {
		it("should create virtual axis from buttons", () => {
			const axis = new VirtualAxis(KeyCode.Left, KeyCode.Right);

			expect(axis.kind()).to.equal(InputControlKind.Axis);
			expect(axis.hash()).to.be.a("string");
		});

		it("should decompose into basic inputs", () => {
			const axis = new VirtualAxis(KeyCode.Left, KeyCode.Right);
			const decomposed = axis.decompose();

			expect(decomposed).to.be.ok();
			expect(decomposed.size()).to.equal(2);
		});
	});

	describe("VirtualDPad", () => {
		it("should create virtual dpad from buttons", () => {
			const dpad = new VirtualDPad(
				KeyCode.W,
				KeyCode.S,
				KeyCode.A,
				KeyCode.D,
			);

			expect(dpad.kind()).to.equal(InputControlKind.DualAxis);
			expect(dpad.hash()).to.be.a("string");
		});

		it("should decompose into basic inputs", () => {
			const dpad = new VirtualDPad(
				KeyCode.W,
				KeyCode.S,
				KeyCode.A,
				KeyCode.D,
			);
			const decomposed = dpad.decompose();

			expect(decomposed).to.be.ok();
			expect(decomposed.size()).to.equal(4);
		});
	});

	describe("InputChord", () => {
		it("should create keyboard shortcuts", () => {
			const chord = InputChord.ctrl(KeyCode.S);

			expect(chord.kind()).to.equal(InputControlKind.Button);
			expect(chord.size()).to.equal(2);
		});

		it("should create mouse shortcuts", () => {
			const chord = InputChord.shiftClick();

			expect(chord.kind()).to.equal(InputControlKind.Button);
			expect(chord.size()).to.equal(2);
		});

		it("should check chord containment", () => {
			const chord1 = InputChord.ctrl(KeyCode.S);
			const chord2 = InputChord.ctrlShift(KeyCode.S);

			expect(chord1.isSubsetOf(chord2)).to.equal(true);
			expect(chord2.isSupersetOf(chord1)).to.equal(true);
			expect(chord2.isSubsetOf(chord1)).to.equal(false);
		});

		it("should decompose into basic inputs", () => {
			const chord = InputChord.ctrl(KeyCode.S);
			const decomposed = chord.decompose();

			expect(decomposed).to.be.ok();
			expect(decomposed.size()).to.equal(2);
		});
	});

	describe("BasicInputs", () => {
		it("should create from single input", () => {
			const inputs = BasicInputs.single(KeyCode.Space);

			expect(inputs.size()).to.equal(1);
			expect(inputs.isEmpty()).to.equal(false);
		});

		it("should create from multiple inputs", () => {
			const inputs = BasicInputs.multiple([
				KeyCode.Space,
				KeyCode.Enter,
				MouseButton.left(),
			]);

			expect(inputs.size()).to.equal(3);
		});

		it("should check overlap", () => {
			const inputs1 = BasicInputs.multiple([KeyCode.Space, KeyCode.Enter]);
			const inputs2 = BasicInputs.multiple([KeyCode.Enter, KeyCode.Escape]);
			const inputs3 = BasicInputs.multiple([KeyCode.Tab, KeyCode.Delete]);

			expect(inputs1.overlaps(inputs2)).to.equal(true);
			expect(inputs1.overlaps(inputs3)).to.equal(false);
		});

		it("should compute union", () => {
			const inputs1 = BasicInputs.multiple([KeyCode.Space]);
			const inputs2 = BasicInputs.multiple([KeyCode.Enter]);
			const union = inputs1.union(inputs2);

			expect(union.size()).to.equal(2);
		});

		it("should compute intersection", () => {
			const inputs1 = BasicInputs.multiple([KeyCode.Space, KeyCode.Enter]);
			const inputs2 = BasicInputs.multiple([KeyCode.Enter, KeyCode.Escape]);
			const intersection = inputs1.intersection(inputs2);

			expect(intersection.size()).to.equal(1);
		});
	});

	describe("ClashDetector", () => {
		let detector: ClashDetector<TestAction>;

		beforeEach(() => {
			detector = new ClashDetector<TestAction>();
		});

		it("should detect clashing inputs", () => {
			detector.registerAction(TestAction.Jump, [KeyCode.Space]);
			detector.registerAction(TestAction.Attack, [KeyCode.Space]);

			const clashes = detector.detectClashes();
			expect(clashes.size()).to.equal(1);
		});

		it("should not detect non-clashing inputs", () => {
			detector.registerAction(TestAction.Jump, [KeyCode.Space]);
			detector.registerAction(TestAction.Attack, [MouseButton.left()]);

			const clashes = detector.detectClashes();
			expect(clashes.size()).to.equal(0);
		});

		it("should resolve clashes with PrioritizeLargest", () => {
			const simpleInput = [KeyCode.S];
			const chordInput = [ModifierKey.control(), KeyCode.S];

			detector.registerAction(TestAction.Jump, simpleInput);
			detector.registerAction(TestAction.Attack, chordInput);

			const clashes = detector.detectClashes();
			const resolved = detector.resolveClashes(clashes, ClashStrategy.PrioritizeLargest);

			// The chord (Attack) should win because it has more inputs
			expect(resolved.has(TestAction.Attack.hash())).to.equal(true);
			expect(resolved.has(TestAction.Jump.hash())).to.equal(false);
		});

		it("should check if specific actions clash", () => {
			detector.registerAction(TestAction.Jump, [KeyCode.Space]);
			detector.registerAction(TestAction.Attack, [KeyCode.Space]);
			detector.registerAction(TestAction.Block, [MouseButton.right()]);

			expect(detector.doActionsClash(TestAction.Jump, TestAction.Attack)).to.equal(true);
			expect(detector.doActionsClash(TestAction.Jump, TestAction.Block)).to.equal(false);
		});
	});
};
