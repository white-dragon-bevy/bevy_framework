import { UserInputService } from "@rbxts/services";
import { World } from "@rbxts/matter";
import { InputControlKind } from "../core/input-control-kind";
import { BasicInputs, UserInput } from "./traits/user-input";
import { Buttonlike, ButtonValue } from "./traits/buttonlike";
import { Axislike } from "./traits/axislike";
import { DualAxislike } from "./traits/dual-axislike";
import { CentralInputStore } from "./central-input-store";

/**
 * A mouse button that can be clicked
 */
export class MouseButton implements Buttonlike {
	constructor(private readonly button: Enum.UserInputType) {}

	/**
	 * Creates a left mouse button
	 * @returns A MouseButton for the left button
	 */
	static left(): MouseButton {
		return new MouseButton(Enum.UserInputType.MouseButton1);
	}

	/**
	 * Creates a right mouse button
	 * @returns A MouseButton for the right button
	 */
	static right(): MouseButton {
		return new MouseButton(Enum.UserInputType.MouseButton2);
	}

	/**
	 * Creates a middle mouse button
	 * @returns A MouseButton for the middle button
	 */
	static middle(): MouseButton {
		return new MouseButton(Enum.UserInputType.MouseButton3);
	}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return `MouseButton:${this.button.Name}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof MouseButton)) return false;
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
		warn(`MouseButton.press() is not implemented for ${this.button.Name}`);
	}

	release(_world: World): void {
		warn(`MouseButton.release() is not implemented for ${this.button.Name}`);
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
 * Mouse movement as a dual-axis input
 */
export class MouseMove implements DualAxislike {
	private static instance?: MouseMove;

	private constructor() {}

	/**
	 * Gets the singleton instance of MouseMove
	 * @returns The MouseMove instance
	 */
	static get(): MouseMove {
		if (!MouseMove.instance) {
			MouseMove.instance = new MouseMove();
		}
		return MouseMove.instance;
	}

	kind(): InputControlKind {
		return InputControlKind.DualAxis;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return "MouseMove";
	}

	equals(other: UserInput): boolean {
		return other instanceof MouseMove;
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
		warn("MouseMove.setAxisPair() is not implemented");
	}

	toString(): string {
		return "MouseMove";
	}
}

/**
 * Mouse scroll wheel as a single-axis input
 */
export class MouseScroll implements Axislike {
	private static instance?: MouseScroll;

	private constructor() {}

	/**
	 * Gets the singleton instance of MouseScroll
	 * @returns The MouseScroll instance
	 */
	static get(): MouseScroll {
		if (!MouseScroll.instance) {
			MouseScroll.instance = new MouseScroll();
		}
		return MouseScroll.instance;
	}

	kind(): InputControlKind {
		return InputControlKind.Axis;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return "MouseScroll";
	}

	equals(other: UserInput): boolean {
		return other instanceof MouseScroll;
	}

	value(inputStore: CentralInputStore, _gamepad?: number): number {
		return inputStore.axisValue(this.hash());
	}

	getValue(inputStore: CentralInputStore, _gamepad?: number): number | undefined {
		return inputStore.getAxisValue(this.hash());
	}

	setValue(_world: World, _value: number): void {
		warn("MouseScroll.setValue() is not implemented");
	}

	toString(): string {
		return "MouseScroll";
	}
}

/**
 * Mouse movement along a specific axis
 */
export class MouseMoveAxis implements Axislike {
	constructor(private readonly axis: "X" | "Y") {}

	/**
	 * Creates a MouseMoveAxis for the X axis
	 * @returns A MouseMoveAxis for X
	 */
	static x(): MouseMoveAxis {
		return new MouseMoveAxis("X");
	}

	/**
	 * Creates a MouseMoveAxis for the Y axis
	 * @returns A MouseMoveAxis for Y
	 */
	static y(): MouseMoveAxis {
		return new MouseMoveAxis("Y");
	}

	kind(): InputControlKind {
		return InputControlKind.Axis;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		return `MouseMoveAxis:${this.axis}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof MouseMoveAxis)) return false;
		return this.axis === other.axis;
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		const mouseMove = MouseMove.get();
		return this.axis === "X"
			? mouseMove.x(inputStore, gamepad)
			: mouseMove.y(inputStore, gamepad);
	}

	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		const mousePair = MouseMove.get().getAxisPair(inputStore, gamepad);
		if (!mousePair) return undefined;
		return this.axis === "X" ? mousePair.X : mousePair.Y;
	}

	setValue(_world: World, _value: number): void {
		warn(`MouseMoveAxis.setValue() is not implemented for axis ${this.axis}`);
	}

	toString(): string {
		return `MouseMove${this.axis}`;
	}
}

// Store for tracking mouse delta
let lastMousePosition: Vector2 | undefined;

/**
 * Updates mouse input states in the CentralInputStore
 * @param inputStore - The central input store to update
 */
export function updateMouseInput(inputStore: CentralInputStore): void {
	// Update mouse buttons
	const mouseButtons = [
		new MouseButton(Enum.UserInputType.MouseButton1),
		new MouseButton(Enum.UserInputType.MouseButton2),
		new MouseButton(Enum.UserInputType.MouseButton3),
	];

	for (const mouseButton of mouseButtons) {
		const pressed = UserInputService.IsMouseButtonPressed(
			mouseButton["button"] as Enum.UserInputType,
		);
		const buttonValue: ButtonValue = {
			pressed: pressed,
			value: pressed ? 1 : 0,
		};
		inputStore.updateButtonlike(mouseButton.hash(), buttonValue);
	}

	// Update mouse movement
	const currentMousePosition = UserInputService.GetMouseLocation();
	if (lastMousePosition) {
		const delta = currentMousePosition.sub(lastMousePosition);
		inputStore.updateDualAxislike(MouseMove.get().hash(), delta);
	} else {
		inputStore.updateDualAxislike(MouseMove.get().hash(), Vector2.zero);
	}
	lastMousePosition = currentMousePosition;

	// Mouse scroll is handled through InputChanged events
	// This would need to be set up separately in the system initialization
}