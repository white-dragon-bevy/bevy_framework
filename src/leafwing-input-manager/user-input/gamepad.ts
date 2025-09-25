import { UserInputService } from "@rbxts/services";
import { World } from "@rbxts/matter";
import { InputControlKind } from "../core/input-control-kind";
import { BasicInputs, UserInput } from "./traits/user-input";
import { Buttonlike, ButtonValue } from "./traits/buttonlike";
import { Axislike } from "./traits/axislike";
import { DualAxislike } from "./traits/dual-axislike";
import { CentralInputStore } from "./central-input-store";

/**
 * A gamepad button that can be pressed
 */
export class GamepadButton implements Buttonlike {
	constructor(private readonly button: Enum.KeyCode) {}

	/**
	 * Creates a gamepad button from a Roblox KeyCode
	 * @param button - The button KeyCode
	 * @returns A new GamepadButton
	 */
	static from(button: Enum.KeyCode): GamepadButton {
		return new GamepadButton(button);
	}

	// Static button constants for compatibility
	static readonly ButtonA = new GamepadButton(Enum.KeyCode.ButtonA);
	static readonly ButtonB = new GamepadButton(Enum.KeyCode.ButtonB);
	static readonly ButtonX = new GamepadButton(Enum.KeyCode.ButtonX);
	static readonly ButtonY = new GamepadButton(Enum.KeyCode.ButtonY);
	static readonly ButtonL1 = new GamepadButton(Enum.KeyCode.ButtonL1);
	static readonly ButtonL2 = new GamepadButton(Enum.KeyCode.ButtonL2);
	static readonly ButtonL3 = new GamepadButton(Enum.KeyCode.ButtonL3);
	static readonly ButtonR1 = new GamepadButton(Enum.KeyCode.ButtonR1);
	static readonly ButtonR2 = new GamepadButton(Enum.KeyCode.ButtonR2);
	static readonly ButtonR3 = new GamepadButton(Enum.KeyCode.ButtonR3);
	static readonly ButtonSelect = new GamepadButton(Enum.KeyCode.ButtonSelect);
	static readonly ButtonStart = new GamepadButton(Enum.KeyCode.ButtonStart);
	static readonly DPadUp = new GamepadButton(Enum.KeyCode.DPadUp);
	static readonly DPadDown = new GamepadButton(Enum.KeyCode.DPadDown);
	static readonly DPadLeft = new GamepadButton(Enum.KeyCode.DPadLeft);
	static readonly DPadRight = new GamepadButton(Enum.KeyCode.DPadRight);

	// Common gamepad buttons
	static south(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonA);
	}

	static east(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonB);
	}

	static west(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonX);
	}

	static north(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonY);
	}

	static leftBumper(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonL1);
	}

	static rightBumper(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonR1);
	}

	static leftTrigger(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonL2);
	}

	static rightTrigger(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonR2);
	}

	static leftThumb(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonL3);
	}

	static rightThumb(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonR3);
	}

	static select(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonSelect);
	}

	static start(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.ButtonStart);
	}

	static dPadUp(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.DPadUp);
	}

	static dPadDown(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.DPadDown);
	}

	static dPadLeft(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.DPadLeft);
	}

	static dPadRight(): GamepadButton {
		return new GamepadButton(Enum.KeyCode.DPadRight);
	}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return `GamepadButton:${this.button.Name}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof GamepadButton)) return false;
		return this.button === other.button;
	}

	pressed(inputStore: CentralInputStore, _gamepad?: number): boolean {
		return inputStore.pressed(this.hash()) ?? false;
	}

	getPressed(inputStore: CentralInputStore, _gamepad?: number): boolean | undefined {
		return inputStore.pressed(this.hash());
	}

	released(inputStore: CentralInputStore, gamepad?: number): boolean {
		return !this.pressed(inputStore, gamepad);
	}

	value(inputStore: CentralInputStore, _gamepad?: number): number {
		return inputStore.buttonValue(this.hash());
	}

	getValue(inputStore: CentralInputStore, _gamepad?: number): number | undefined {
		const buttonValue = inputStore.getButtonValue(this.hash());
		return buttonValue?.value;
	}

	press(_world: World): void {
		warn(`GamepadButton.press() is not implemented for ${this.button.Name}`);
	}

	release(_world: World): void {
		warn(`GamepadButton.release() is not implemented for ${this.button.Name}`);
	}

	setValue(_world: World, value: number): void {
		if (value > 0) {
			this.press(_world);
		} else {
			this.release(_world);
		}
	}

	toString(): string {
		return this.button.Name;
	}
}

/**
 * A gamepad stick (thumbstick) that provides dual-axis input
 */
export class GamepadStick implements DualAxislike {
	constructor(private readonly stickType: "Left" | "Right") {}

	/**
	 * Creates a left thumbstick
	 * @returns A GamepadStick for the left stick
	 */
	static left(): GamepadStick {
		return new GamepadStick("Left");
	}

	/**
	 * Creates a right thumbstick
	 * @returns A GamepadStick for the right stick
	 */
	static right(): GamepadStick {
		return new GamepadStick("Right");
	}

	kind(): InputControlKind {
		return InputControlKind.DualAxis;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return `GamepadStick:${this.stickType}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof GamepadStick)) return false;
		return this.stickType === other.stickType;
	}

	axisPair(inputStore: CentralInputStore, _gamepad?: number): Vector2 {
		return inputStore.dualAxisValue(this.hash());
	}

	getAxisPair(inputStore: CentralInputStore, _gamepad?: number): Vector2 | undefined {
		return inputStore.getDualAxisValue(this.hash());
	}

	x(inputStore: CentralInputStore, gamepad?: number): number {
		const pair = this.axisPair(inputStore, gamepad);
		return pair.X;
	}

	y(inputStore: CentralInputStore, gamepad?: number): number {
		const pair = this.axisPair(inputStore, gamepad);
		return pair.Y;
	}

	setAxisPair(_world: World, _value: Vector2): void {
		warn(`GamepadStick.setAxisPair() is not implemented for ${this.stickType} stick`);
	}

	toString(): string {
		return `${this.stickType}Stick`;
	}
}

/**
 * A single axis from a gamepad stick
 */
export class GamepadControlAxis implements Axislike {
	constructor(
		private readonly stick: GamepadStick,
		private readonly axis: "X" | "Y",
	) {}

	/**
	 * Creates an axis for the left stick X
	 * @returns A GamepadControlAxis
	 */
	static leftX(): GamepadControlAxis {
		return new GamepadControlAxis(GamepadStick.left(), "X");
	}

	/**
	 * Creates an axis for the left stick Y
	 * @returns A GamepadControlAxis
	 */
	static leftY(): GamepadControlAxis {
		return new GamepadControlAxis(GamepadStick.left(), "Y");
	}

	/**
	 * Creates an axis for the right stick X
	 * @returns A GamepadControlAxis
	 */
	static rightX(): GamepadControlAxis {
		return new GamepadControlAxis(GamepadStick.right(), "X");
	}

	/**
	 * Creates an axis for the right stick Y
	 * @returns A GamepadControlAxis
	 */
	static rightY(): GamepadControlAxis {
		return new GamepadControlAxis(GamepadStick.right(), "Y");
	}

	kind(): InputControlKind {
		return InputControlKind.Axis;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return `${this.stick.hash()}:${this.axis}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof GamepadControlAxis)) return false;
		return this.stick.equals(other.stick) && this.axis === other.axis;
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		return this.axis === "X"
			? this.stick.x(inputStore, gamepad)
			: this.stick.y(inputStore, gamepad);
	}

	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		const axisPair = this.stick.getAxisPair(inputStore, gamepad);
		if (!axisPair) return undefined;
		return this.axis === "X" ? axisPair.X : axisPair.Y;
	}

	setValue(_world: World, _value: number): void {
		warn(`GamepadControlAxis.setValue() is not implemented`);
	}

	toString(): string {
		return `${this.stick.toString()}${this.axis}`;
	}
}

/**
 * Updates gamepad input states in the CentralInputStore
 * @param inputStore - The central input store to update
 */
export function updateGamepadInput(inputStore: CentralInputStore): void {
	const gamepadButtons = [
		Enum.KeyCode.ButtonA,
		Enum.KeyCode.ButtonB,
		Enum.KeyCode.ButtonX,
		Enum.KeyCode.ButtonY,
		Enum.KeyCode.ButtonL1,
		Enum.KeyCode.ButtonR1,
		Enum.KeyCode.ButtonL2,
		Enum.KeyCode.ButtonR2,
		Enum.KeyCode.ButtonL3,
		Enum.KeyCode.ButtonR3,
		Enum.KeyCode.ButtonSelect,
		Enum.KeyCode.ButtonStart,
		Enum.KeyCode.DPadUp,
		Enum.KeyCode.DPadDown,
		Enum.KeyCode.DPadLeft,
		Enum.KeyCode.DPadRight,
	];

	// Update gamepad buttons
	for (const buttonCode of gamepadButtons) {
		const button = new GamepadButton(buttonCode);
		const pressed = UserInputService.IsKeyDown(buttonCode);
		const buttonValue: ButtonValue = {
			pressed: pressed,
			value: pressed ? 1 : 0,
		};
		inputStore.updateButtonlike(button.hash(), buttonValue);
	}

	// Initialize gamepad listeners if not already done
	// The actual stick values will be updated through InputChanged events
	inputStore.initializeGamepadListeners();
}
