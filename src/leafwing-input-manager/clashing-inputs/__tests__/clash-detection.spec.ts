import { BasicInputs, InputType } from "../basic-inputs";
import { ClashDetector } from "../clash-detection";
import { ClashStrategy } from "../clash-strategy";
import { KeyCode } from "../../user-input/keyboard";
import { InputChord } from "../../user-input/chord";
import { MouseButton } from "../../user-input/mouse";
import { Actionlike } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";

/**
 * Mock action class for testing
 */
class TestAction implements Actionlike {
	constructor(private name: string) {}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof TestAction)) return false;
		return this.name === other.name;
	}

	hash(): string {
		return `action_${this.name}`;
	}

	toString(): string {
		return this.name;
	}
}

export = () => {
	describe("BasicInputs InputType Detection", () => {
		it("should detect Simple input type for KeyCode", () => {
			const keyS = KeyCode.S;
			const basicInputs = BasicInputs.single(keyS);

			expect(basicInputs.getInputType()).to.equal(InputType.Simple);
		});

		it("should detect Simple input type for MouseButton", () => {
			const leftClick = MouseButton.left();
			const basicInputs = BasicInputs.single(leftClick);

			expect(basicInputs.getInputType()).to.equal(InputType.Simple);
		});

		it("should detect Chord input type for InputChord", () => {
			const ctrlS = InputChord.ctrl(KeyCode.S);
			const basicInputs = BasicInputs.single(ctrlS);

			expect(basicInputs.getInputType()).to.equal(InputType.Chord);
		});

		it("should detect Composite input type for multiple inputs", () => {
			const keyW = KeyCode.W;
			const keyA = KeyCode.A;
			const basicInputs = BasicInputs.multiple([keyW, keyA]);

			expect(basicInputs.getInputType()).to.equal(InputType.Composite);
		});

		it("should detect None input type for empty inputs", () => {
			const basicInputs = BasicInputs.empty();

			expect(basicInputs.getInputType()).to.equal(InputType.None);
		});
	});

	describe("BasicInputs Size Calculation", () => {
		it("should calculate size 1 for simple inputs", () => {
			const keyS = KeyCode.S;
			const basicInputs = BasicInputs.single(keyS);

			expect(basicInputs.getTotalSize()).to.equal(1);
		});

		it("should calculate correct size for chord inputs", () => {
			const ctrlS = InputChord.ctrl(KeyCode.S);
			const basicInputs = BasicInputs.single(ctrlS);

			// Ctrl+S should have size 2 (Ctrl + S)
			expect(basicInputs.getTotalSize()).to.equal(2);
		});

		it("should calculate correct size for composite inputs", () => {
			const keyW = KeyCode.W;
			const keyA = KeyCode.A;
			const keyS = KeyCode.S;
			const basicInputs = BasicInputs.multiple([keyW, keyA, keyS]);

			expect(basicInputs.getTotalSize()).to.equal(3);
		});
	});

	describe("BasicInputs Clash Detection", () => {
		it("should NOT clash Simple vs Simple", () => {
			const keyS = BasicInputs.single(KeyCode.S);
			const keyA = BasicInputs.single(KeyCode.A);

			expect(keyS.clashesWith(keyA)).to.equal(false);
			expect(keyA.clashesWith(keyS)).to.equal(false);
		});

		it("should clash Simple vs Chord when chord contains simple", () => {
			const keyS = BasicInputs.single(KeyCode.S);
			const ctrlS = BasicInputs.single(InputChord.ctrl(KeyCode.S));

			expect(keyS.clashesWith(ctrlS)).to.equal(true);
			expect(ctrlS.clashesWith(keyS)).to.equal(true);
		});

		it("should NOT clash Simple vs Chord when chord doesn't contain simple", () => {
			const keyS = BasicInputs.single(KeyCode.S);
			const ctrlA = BasicInputs.single(InputChord.ctrl(KeyCode.A));

			expect(keyS.clashesWith(ctrlA)).to.equal(false);
			expect(ctrlA.clashesWith(keyS)).to.equal(false);
		});

		it("should clash Chord vs Chord when they share components", () => {
			const ctrlS = BasicInputs.single(InputChord.ctrl(KeyCode.S));
			const ctrlShiftS = BasicInputs.single(InputChord.ctrlShift(KeyCode.S));

			expect(ctrlS.clashesWith(ctrlShiftS)).to.equal(true);
			expect(ctrlShiftS.clashesWith(ctrlS)).to.equal(true);
		});

		it("should NOT clash Chord vs Chord when they don't share components", () => {
			const ctrlS = BasicInputs.single(InputChord.ctrl(KeyCode.S));
			const altA = BasicInputs.single(InputChord.alt(KeyCode.A));

			expect(ctrlS.clashesWith(altA)).to.equal(false);
			expect(altA.clashesWith(ctrlS)).to.equal(false);
		});

		it("should clash Simple vs Composite when composite contains simple", () => {
			const keyS = BasicInputs.single(KeyCode.S);
			const wasd = BasicInputs.multiple([KeyCode.W, KeyCode.A, KeyCode.S, KeyCode.D]);

			expect(keyS.clashesWith(wasd)).to.equal(true);
			expect(wasd.clashesWith(keyS)).to.equal(true);
		});

		it("should NOT clash with empty inputs", () => {
			const keyS = BasicInputs.single(KeyCode.S);
			const empty = BasicInputs.empty();

			expect(keyS.clashesWith(empty)).to.equal(false);
			expect(empty.clashesWith(keyS)).to.equal(false);
		});
	});

	describe("ClashDetector Integration", () => {
		let detector: ClashDetector<TestAction>;

		beforeEach(() => {
			detector = new ClashDetector<TestAction>();
		});

		it("should detect clash between Simple and Chord", () => {
			const saveAction = new TestAction("Save");
			const spellAction = new TestAction("Spell");

			detector.registerAction(saveAction, [KeyCode.S]);
			detector.registerAction(spellAction, [InputChord.ctrl(KeyCode.S)]);

			const clashes = detector.detectClashes();

			expect(clashes.size()).to.equal(1);
			expect(clashes[0].actions.size()).to.equal(2);
		});

		it("should NOT detect clash between different Simple inputs", () => {
			const moveForwardAction = new TestAction("MoveForward");
			const moveLeftAction = new TestAction("MoveLeft");

			detector.registerAction(moveForwardAction, [KeyCode.W]);
			detector.registerAction(moveLeftAction, [KeyCode.A]);

			const clashes = detector.detectClashes();

			expect(clashes.size()).to.equal(0);
		});

		it("should resolve clashes using PrioritizeLargest strategy", () => {
			const saveAction = new TestAction("Save");
			const spellAction = new TestAction("Spell");

			detector.registerAction(saveAction, [KeyCode.S]);
			detector.registerAction(spellAction, [InputChord.ctrl(KeyCode.S)]);

			const clashes = detector.detectClashes();
			const resolved = detector.resolveClashes(clashes, ClashStrategy.PrioritizeLargest);

			// Ctrl+S (size 2) should win over S (size 1)
			expect(resolved.has(spellAction.hash())).to.equal(true);
			expect(resolved.has(saveAction.hash())).to.equal(false);
		});

		it("should handle multiple complex chord clashes", () => {
			const action1 = new TestAction("Action1");
			const action2 = new TestAction("Action2");
			const action3 = new TestAction("Action3");

			detector.registerAction(action1, [KeyCode.S]);
			detector.registerAction(action2, [InputChord.ctrl(KeyCode.S)]);
			detector.registerAction(action3, [InputChord.ctrlShift(KeyCode.S)]);

			const clashes = detector.detectClashes();
			const resolved = detector.resolveClashes(clashes, ClashStrategy.PrioritizeLargest);

			// CtrlShift+S (size 3) should win
			expect(resolved.has(action3.hash())).to.equal(true);
			expect(resolved.has(action2.hash())).to.equal(false);
			expect(resolved.has(action1.hash())).to.equal(false);
		});

		it("should handle UseAll strategy correctly", () => {
			const saveAction = new TestAction("Save");
			const spellAction = new TestAction("Spell");

			detector.registerAction(saveAction, [KeyCode.S]);
			detector.registerAction(spellAction, [InputChord.ctrl(KeyCode.S)]);

			const clashes = detector.detectClashes();
			const resolved = detector.resolveClashes(clashes, ClashStrategy.UseAll);

			// Both actions should be triggered
			expect(resolved.has(saveAction.hash())).to.equal(true);
			expect(resolved.has(spellAction.hash())).to.equal(true);
		});

		it("should handle CancelAll strategy correctly", () => {
			const saveAction = new TestAction("Save");
			const spellAction = new TestAction("Spell");
			const jumpAction = new TestAction("Jump");

			detector.registerAction(saveAction, [KeyCode.S]);
			detector.registerAction(spellAction, [InputChord.ctrl(KeyCode.S)]);
			detector.registerAction(jumpAction, [KeyCode.Space]); // Non-clashing action

			const clashes = detector.detectClashes();
			const resolved = detector.resolveClashes(clashes, ClashStrategy.CancelAll);

			// Only non-clashing action should be triggered
			expect(resolved.has(saveAction.hash())).to.equal(false);
			expect(resolved.has(spellAction.hash())).to.equal(false);
			expect(resolved.has(jumpAction.hash())).to.equal(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle single-key chord correctly", () => {
			// A chord with only one key should behave like a simple input
			const singleKeyChord = new InputChord([KeyCode.S]);
			const basicInputs = BasicInputs.single(singleKeyChord);
			const simpleS = BasicInputs.single(KeyCode.S);

			// Single-key chord should not clash with simple input
			expect(basicInputs.clashesWith(simpleS)).to.equal(false);
		});

		it("should handle identical inputs correctly", () => {
			const keyS1 = BasicInputs.single(KeyCode.S);
			const keyS2 = BasicInputs.single(KeyCode.S);

			// Identical simple inputs should not clash
			expect(keyS1.clashesWith(keyS2)).to.equal(false);
		});

		it("should handle empty metadata gracefully", () => {
			const basicInputs = new BasicInputs(new Set(["unknown_hash"]));

			expect(basicInputs.getInputType()).to.equal(InputType.Composite);
			expect(basicInputs.getTotalSize()).to.equal(0);
		});
	});
};