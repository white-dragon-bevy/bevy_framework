import { UserInputService } from "@rbxts/services";
import { World } from "@rbxts/matter";
import { InputControlKind } from "../input-control-kind";
import { UserInput } from "./traits/user-input";
import { BasicInputs } from "../clashing-inputs/basic-inputs";
import { Buttonlike, ButtonValue } from "./traits/buttonlike";
import { Axislike } from "./traits/axislike";
import { DualAxislike } from "./traits/dual-axislike";
import { CentralInputStore } from "./central-input-store";
import { DualAxisDirection, DualAxisType } from "../axislike";

/**
 * A mouse button that can be clicked
 */
export class MouseButton implements UserInput, Buttonlike {
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
		return `mouse_${this.button.Name}`;
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
export class MouseMove implements UserInput, DualAxislike {
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
 * Provides button-like behavior for mouse wheel scrolling in cardinal directions.
 * Based on Bevy's MouseScrollDirection.
 */
export class MouseScrollDirection implements UserInput, Buttonlike {
	/** Scrolling in the upward direction */
	static readonly UP = new MouseScrollDirection(DualAxisDirection.Up, 0.0);

	/** Scrolling in the downward direction */
	static readonly DOWN = new MouseScrollDirection(DualAxisDirection.Down, 0.0);

	/** Scrolling in the leftward direction */
	static readonly LEFT = new MouseScrollDirection(DualAxisDirection.Left, 0.0);

	/** Scrolling in the rightward direction */
	static readonly RIGHT = new MouseScrollDirection(DualAxisDirection.Right, 0.0);

	/**
	 * Creates a new MouseScrollDirection
	 * @param direction - The direction to monitor (up, down, left, or right)
	 * @param threshold - The threshold value for the direction to be considered pressed (must be non-negative)
	 */
	constructor(
		public readonly direction: DualAxisDirection,
		public readonly threshold: number = 0.0,
	) {
		assert(threshold >= 0, "Threshold must be non-negative");
	}

	/**
	 * Sets the threshold value
	 * @param threshold - The new threshold (must be non-negative)
	 * @returns A new MouseScrollDirection with the updated threshold
	 */
	withThreshold(threshold: number): MouseScrollDirection {
		return new MouseScrollDirection(this.direction, threshold);
	}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this.withThreshold(0.0));
	}

	hash(): string {
		return `MouseScrollDirection:${this.direction}:${this.threshold}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof MouseScrollDirection)) return false;
		return this.direction === other.direction && this.threshold === other.threshold;
	}

	pressed(inputStore: CentralInputStore, _gamepad?: number): boolean {
		return this.getPressed(inputStore, _gamepad) ?? false;
	}

	getPressed(inputStore: CentralInputStore, _gamepad?: number): boolean | undefined {
		const scrollValue = MouseScroll.get().getAxisPair(inputStore);
		if (!scrollValue) return undefined;

		return DualAxisDirection.isActive(this.direction, scrollValue, this.threshold);
	}

	released(inputStore: CentralInputStore, gamepad?: number): boolean {
		return !this.pressed(inputStore, gamepad);
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		return this.pressed(inputStore, gamepad) ? 1 : 0;
	}

	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		const pressed = this.getPressed(inputStore, gamepad);
		return pressed === undefined ? undefined : pressed ? 1 : 0;
	}

	press(_world: World): void {
		warn("MouseScrollDirection.press() is not implemented for testing");
	}

	release(_world: World): void {
		// No action needed - scroll directions are determined by frame delta
	}

	setValue(_world: World, value: number): void {
		if (value > 0) {
			this.press(_world);
		} else {
			this.release(_world);
		}
	}

	toString(): string {
		return `MouseScrollDirection::${this.direction}`;
	}
}

/**
 * Amount of mouse wheel scrolling on a single axis (X or Y).
 * Based on Bevy's MouseScrollAxis.
 */
export class MouseScrollAxis implements UserInput, Axislike {
	/** Horizontal scrolling of the mouse wheel */
	static readonly X = new MouseScrollAxis(DualAxisType.X);

	/** Vertical scrolling of the mouse wheel */
	static readonly Y = new MouseScrollAxis(DualAxisType.Y);

	/**
	 * Creates a new MouseScrollAxis
	 * @param axis - The axis that this input tracks
	 */
	constructor(public readonly axis: DualAxisType) {}

	kind(): InputControlKind {
		return InputControlKind.Axis;
	}

	decompose(): BasicInputs {
		const inputs = new Set<UserInput>([
			new MouseScrollDirection(
				this.axis === DualAxisType.X ? DualAxisDirection.Left : DualAxisDirection.Down,
				0.0,
			),
			new MouseScrollDirection(
				this.axis === DualAxisType.X ? DualAxisDirection.Right : DualAxisDirection.Up,
				0.0,
			),
		]);
		return BasicInputs.composite(inputs);
	}

	hash(): string {
		return `MouseScrollAxis:${this.axis}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof MouseScrollAxis)) return false;
		return this.axis === other.axis;
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		return this.getValue(inputStore, gamepad) ?? 0;
	}

	getValue(inputStore: CentralInputStore, _gamepad?: number): number | undefined {
		const scrollPair = MouseScroll.get().getAxisPair(inputStore);
		if (!scrollPair) return undefined;

		return DualAxisType.getValue(this.axis, scrollPair);
	}

	setValue(_world: World, _value: number): void {
		warn(`MouseScrollAxis.setValue() is not implemented for axis ${this.axis}`);
	}

	toString(): string {
		return `MouseScrollAxis::${this.axis}`;
	}
}

/**
 * Amount of mouse wheel scrolling on both axes.
 * Based on Bevy's MouseScroll (DualAxislike).
 */
export class MouseScroll implements UserInput, DualAxislike {
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
		return InputControlKind.DualAxis;
	}

	decompose(): BasicInputs {
		const inputs = new Set<UserInput>([
			MouseScrollDirection.UP,
			MouseScrollDirection.DOWN,
			MouseScrollDirection.LEFT,
			MouseScrollDirection.RIGHT,
		]);
		return BasicInputs.composite(inputs);
	}

	hash(): string {
		return "MouseScroll";
	}

	equals(other: UserInput): boolean {
		return other instanceof MouseScroll;
	}

	axisPair(inputStore: CentralInputStore, _gamepad?: number): Vector2 {
		return this.getAxisPair(inputStore, _gamepad) ?? Vector2.zero;
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
		warn("MouseScroll.setAxisPair() is not implemented");
	}

	toString(): string {
		return "MouseScroll";
	}
}

/**
 * Provides button-like behavior for mouse movement in cardinal directions.
 * Based on Bevy's MouseMoveDirection.
 */
export class MouseMoveDirection implements UserInput, Buttonlike {
	/** Movement in the upward direction */
	static readonly UP = new MouseMoveDirection(DualAxisDirection.Up, 0.0);

	/** Movement in the downward direction */
	static readonly DOWN = new MouseMoveDirection(DualAxisDirection.Down, 0.0);

	/** Movement in the leftward direction */
	static readonly LEFT = new MouseMoveDirection(DualAxisDirection.Left, 0.0);

	/** Movement in the rightward direction */
	static readonly RIGHT = new MouseMoveDirection(DualAxisDirection.Right, 0.0);

	/**
	 * Creates a new MouseMoveDirection
	 * @param direction - The direction to monitor (up, down, left, or right)
	 * @param threshold - The threshold value for the direction to be considered pressed (must be non-negative)
	 */
	constructor(
		public readonly direction: DualAxisDirection,
		public readonly threshold: number = 0.0,
	) {
		assert(threshold >= 0, "Threshold must be non-negative");
	}

	/**
	 * Sets the threshold value
	 * @param threshold - The new threshold (must be non-negative)
	 * @returns A new MouseMoveDirection with the updated threshold
	 */
	withThreshold(threshold: number): MouseMoveDirection {
		return new MouseMoveDirection(this.direction, threshold);
	}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this.withThreshold(0.0));
	}

	hash(): string {
		return `MouseMoveDirection:${this.direction}:${this.threshold}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof MouseMoveDirection)) return false;
		return this.direction === other.direction && this.threshold === other.threshold;
	}

	pressed(inputStore: CentralInputStore, _gamepad?: number): boolean {
		return this.getPressed(inputStore, _gamepad) ?? false;
	}

	getPressed(inputStore: CentralInputStore, _gamepad?: number): boolean | undefined {
		const mouseMovement = MouseMove.get().getAxisPair(inputStore);
		if (!mouseMovement) return undefined;

		return DualAxisDirection.isActive(this.direction, mouseMovement, this.threshold);
	}

	released(inputStore: CentralInputStore, gamepad?: number): boolean {
		return !this.pressed(inputStore, gamepad);
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		return this.pressed(inputStore, gamepad) ? 1 : 0;
	}

	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		const pressed = this.getPressed(inputStore, gamepad);
		return pressed === undefined ? undefined : pressed ? 1 : 0;
	}

	press(_world: World): void {
		warn("MouseMoveDirection.press() is not implemented for testing");
	}

	release(_world: World): void {
		// No action needed - directions are determined by frame delta
	}

	setValue(_world: World, value: number): void {
		if (value > 0) {
			this.press(_world);
		} else {
			this.release(_world);
		}
	}

	toString(): string {
		return `MouseMoveDirection::${this.direction}`;
	}
}

/**
 * Mouse movement along a specific axis
 */
export class MouseMoveAxis implements UserInput, Axislike {
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
