import { InputMap } from "../input-map";
import { Actionlike } from "../../actionlike";
import { KeyCode } from "../../user-input/keyboard";
import { GamepadButton } from "../../user-input/gamepad";

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
	describe("InputMap.merge() Gamepad Compatibility Fix", () => {
		it("should merge InputMaps with same gamepad association", () => {
			const inputMap1 = new InputMap<TestAction>(1);
			const inputMap2 = new InputMap<TestAction>(1);

			inputMap1.insert(Jump, new KeyCode(Enum.KeyCode.Space));
			inputMap2.insert(Run, new KeyCode(Enum.KeyCode.LeftShift));

			expect(inputMap1.getGamepad()).to.equal(1);

			inputMap1.merge(inputMap2);

			expect(inputMap1.getGamepad()).to.equal(1);
			expect(inputMap1.getInputs(Jump).size()).to.equal(1);
			expect(inputMap1.getInputs(Run).size()).to.equal(1);
		});

		it("should clear gamepad association when merging different gamepads", () => {
			const inputMap1 = new InputMap<TestAction>(1);
			const inputMap2 = new InputMap<TestAction>(2);

			inputMap1.insert(Jump, GamepadButton.south());
			inputMap2.insert(Run, GamepadButton.south());

			expect(inputMap1.getGamepad()).to.equal(1);
			expect(inputMap2.getGamepad()).to.equal(2);

			inputMap1.merge(inputMap2);

			expect(inputMap1.getGamepad()).to.equal(undefined);
			expect(inputMap1.getInputs(Jump).size()).to.equal(1);
			expect(inputMap1.getInputs(Run).size()).to.equal(1);
		});

		it("should clear gamepad when merging with generic InputMap", () => {
			const inputMap1 = new InputMap<TestAction>(1);
			const inputMap2 = new InputMap<TestAction>();

			inputMap1.insert(Jump, GamepadButton.south());
			inputMap2.insert(Run, new KeyCode(Enum.KeyCode.LeftShift));

			expect(inputMap1.getGamepad()).to.equal(1);
			expect(inputMap2.getGamepad()).to.equal(undefined);

			inputMap1.merge(inputMap2);

			expect(inputMap1.getGamepad()).to.equal(undefined);
		});

		it("should handle merging generic InputMaps", () => {
			const inputMap1 = new InputMap<TestAction>();
			const inputMap2 = new InputMap<TestAction>();

			inputMap1.insert(Jump, new KeyCode(Enum.KeyCode.Space));
			inputMap2.insert(Run, new KeyCode(Enum.KeyCode.LeftShift));

			expect(inputMap1.getGamepad()).to.equal(undefined);

			inputMap1.merge(inputMap2);

			expect(inputMap1.getGamepad()).to.equal(undefined);
			expect(inputMap1.getInputs(Jump).size()).to.equal(1);
			expect(inputMap1.getInputs(Run).size()).to.equal(1);
		});

		it("should prevent player input confusion in multiplayer", () => {
			const player1Map = new InputMap<TestAction>(1);
			const player2Map = new InputMap<TestAction>(2);

			player1Map.insert(Jump, GamepadButton.south());
			player1Map.insert(Attack, GamepadButton.east());

			player2Map.insert(Run, GamepadButton.south());

			player1Map.merge(player2Map);

			expect(player1Map.getGamepad()).to.equal(undefined);
		});

		it("should handle empty InputMap merge", () => {
			const inputMap1 = new InputMap<TestAction>(1);
			const inputMap2 = new InputMap<TestAction>(1);

			inputMap1.insert(Jump, new KeyCode(Enum.KeyCode.Space));

			inputMap1.merge(inputMap2);

			expect(inputMap1.getGamepad()).to.equal(1);
			expect(inputMap1.getInputs(Jump).size()).to.equal(1);
		});
	});
};