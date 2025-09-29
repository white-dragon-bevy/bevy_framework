import { InputMap } from "../input-map";
import { Actionlike } from "../../actionlike";
import { KeyCode } from "../../user-input/keyboard";

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
const Run = new TestAction("Run");
const Attack = new TestAction("Attack");

export = () => {
	describe("InputMap.clear() Memory Leak Fix", () => {
		let inputMap: InputMap<TestAction>;

		beforeEach(() => {
			inputMap = new InputMap<TestAction>();
		});

		it("should clear both actionToInputs and inputToActions maps", () => {
			const spaceKey = new KeyCode(Enum.KeyCode.Space);
			const shiftKey = new KeyCode(Enum.KeyCode.LeftShift);
			const eKey = new KeyCode(Enum.KeyCode.E);

			inputMap.insert(Jump, spaceKey);
			inputMap.insert(Run, shiftKey);
			inputMap.insert(Attack, eKey);

			expect(inputMap.getInputs(Jump).size()).to.equal(1);
			expect(inputMap.getInputs(Run).size()).to.equal(1);
			expect(inputMap.getInputs(Attack).size()).to.equal(1);

			inputMap.clear();

			expect(inputMap.getInputs(Jump).size()).to.equal(0);
			expect(inputMap.getInputs(Run).size()).to.equal(0);
			expect(inputMap.getInputs(Attack).size()).to.equal(0);
		});

		it("should allow re-inserting after clear without memory leak", () => {
			const spaceKey = new KeyCode(Enum.KeyCode.Space);

			inputMap.insert(Jump, spaceKey);
			expect(inputMap.getInputs(Jump).size()).to.equal(1);

			inputMap.clear();
			expect(inputMap.getInputs(Jump).size()).to.equal(0);

			inputMap.insert(Jump, spaceKey);
			expect(inputMap.getInputs(Jump).size()).to.equal(1);
		});

		it("should handle multiple clears without issues", () => {
			const spaceKey = new KeyCode(Enum.KeyCode.Space);

			inputMap.insert(Jump, spaceKey);
			inputMap.clear();
			inputMap.clear();
			inputMap.clear();

			expect(inputMap.getInputs(Jump).size()).to.equal(0);
		});

		it("should clear multiple inputs for same action", () => {
			const spaceKey = new KeyCode(Enum.KeyCode.Space);
			const wKey = new KeyCode(Enum.KeyCode.W);

			inputMap.insert(Jump, spaceKey);
			inputMap.insert(Jump, wKey);

			expect(inputMap.getInputs(Jump).size()).to.equal(2);

			inputMap.clear();

			expect(inputMap.getInputs(Jump).size()).to.equal(0);
		});
	});
};