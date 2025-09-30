import { InputControlKind } from "../input-control-kind";
import { UserInput } from "./traits/user-input";
import { BasicInputs } from "../clashing-inputs/basic-inputs";
import { Buttonlike } from "./traits/buttonlike";
import { Axislike } from "./traits/axislike";
import { DualAxislike } from "./traits/dual-axislike";
import { CentralInputStore } from "./central-input-store";
import { World } from "@rbxts/matter";
import { KeyCode } from "./keyboard";

/**
 * A virtual axis created from two buttons
 */
export class VirtualAxis implements UserInput, Axislike {
	constructor(
		private readonly negative: Buttonlike,
		private readonly positive: Buttonlike,
	) {}

	/**
	 * Creates a horizontal axis from left/right keys
	 * @param left - The left button
	 * @param right - The right button
	 * @returns A new VirtualAxis
	 */
	static horizontal(left: Buttonlike, right: Buttonlike): VirtualAxis {
		return new VirtualAxis(left, right);
	}

	/**
	 * Creates a vertical axis from up/down keys
	 * @param down - The down button
	 * @param up - The up button
	 * @returns A new VirtualAxis
	 */
	static vertical(down: Buttonlike, up: Buttonlike): VirtualAxis {
		return new VirtualAxis(down, up);
	}

	kind(): InputControlKind {
		return InputControlKind.Axis;
	}

	decompose(): BasicInputs {
		return BasicInputs.multiple([this.negative, this.positive]);
	}

	hash(): string {
		return `VirtualAxis:${this.negative.hash()}:${this.positive.hash()}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof VirtualAxis)) return false;
		return this.negative.equals(other.negative) && this.positive.equals(other.positive);
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		const negValue = this.negative.value(inputStore, gamepad);
		const posValue = this.positive.value(inputStore, gamepad);
		return posValue - negValue;
	}

	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		const negValue = this.negative.getValue(inputStore, gamepad);
		const posValue = this.positive.getValue(inputStore, gamepad);
		if (negValue === undefined && posValue === undefined) return undefined;
		return (posValue ?? 0) - (negValue ?? 0);
	}

	setValue(world: World, value: number): void {
		if (value < 0) {
			this.negative.setValue(world, -value);
			this.positive.setValue(world, 0);
		} else {
			this.negative.setValue(world, 0);
			this.positive.setValue(world, value);
		}
	}
}

/**
 * A virtual D-pad created from four buttons
 */
export class VirtualDPad implements UserInput, DualAxislike {
	constructor(
		private readonly up: Buttonlike,
		private readonly down: Buttonlike,
		private readonly left: Buttonlike,
		private readonly right: Buttonlike,
	) {}

	/**
	 * Creates a WASD virtual D-pad
	 * @returns A new VirtualDPad for WASD keys
	 */
	static wasd(): VirtualDPad {
		return new VirtualDPad(
			new KeyCode(Enum.KeyCode.W),
			new KeyCode(Enum.KeyCode.S),
			new KeyCode(Enum.KeyCode.A),
			new KeyCode(Enum.KeyCode.D),
		);
	}

	/**
	 * Creates an arrow keys virtual D-pad
	 * @returns A new VirtualDPad for arrow keys
	 */
	static arrowKeys(): VirtualDPad {
		return new VirtualDPad(
			new KeyCode(Enum.KeyCode.Up),
			new KeyCode(Enum.KeyCode.Down),
			new KeyCode(Enum.KeyCode.Left),
			new KeyCode(Enum.KeyCode.Right),
		);
	}

	/**
	 * Creates a numpad virtual D-pad
	 * @returns A new VirtualDPad for numpad keys
	 */
	static numpad(): VirtualDPad {
		return new VirtualDPad(
			new KeyCode(Enum.KeyCode.KeypadEight),
			new KeyCode(Enum.KeyCode.KeypadTwo),
			new KeyCode(Enum.KeyCode.KeypadFour),
			new KeyCode(Enum.KeyCode.KeypadSix),
		);
	}

	kind(): InputControlKind {
		return InputControlKind.DualAxis;
	}

	decompose(): BasicInputs {
		return BasicInputs.multiple([this.up, this.down, this.left, this.right]);
	}

	hash(): string {
		return `VirtualDPad:${this.up.hash()}:${this.down.hash()}:${this.left.hash()}:${this.right.hash()}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof VirtualDPad)) return false;
		return (
			this.up.equals(other.up) &&
			this.down.equals(other.down) &&
			this.left.equals(other.left) &&
			this.right.equals(other.right)
		);
	}

	axisPair(inputStore: CentralInputStore, gamepad?: number): Vector2 {
		const x = this.right.value(inputStore, gamepad) - this.left.value(inputStore, gamepad);
		const y = this.up.value(inputStore, gamepad) - this.down.value(inputStore, gamepad);
		return new Vector2(x, y);
	}

	getAxisPair(inputStore: CentralInputStore, gamepad?: number): Vector2 | undefined {
		const upVal = this.up.getValue(inputStore, gamepad);
		const downVal = this.down.getValue(inputStore, gamepad);
		const leftVal = this.left.getValue(inputStore, gamepad);
		const rightVal = this.right.getValue(inputStore, gamepad);

		if (upVal === undefined && downVal === undefined && leftVal === undefined && rightVal === undefined) {
			return undefined;
		}

		const x = (rightVal ?? 0) - (leftVal ?? 0);
		const y = (upVal ?? 0) - (downVal ?? 0);
		return new Vector2(x, y);
	}

	x(inputStore: CentralInputStore, gamepad?: number): number {
		return this.right.value(inputStore, gamepad) - this.left.value(inputStore, gamepad);
	}

	y(inputStore: CentralInputStore, gamepad?: number): number {
		return this.up.value(inputStore, gamepad) - this.down.value(inputStore, gamepad);
	}

	setAxisPair(world: World, value: Vector2): void {
		// Set X axis
		if (value.X < 0) {
			this.left.setValue(world, -value.X);
			this.right.setValue(world, 0);
		} else {
			this.left.setValue(world, 0);
			this.right.setValue(world, value.X);
		}

		// Set Y axis
		if (value.Y < 0) {
			this.down.setValue(world, -value.Y);
			this.up.setValue(world, 0);
		} else {
			this.down.setValue(world, 0);
			this.up.setValue(world, value.Y);
		}
	}
}
