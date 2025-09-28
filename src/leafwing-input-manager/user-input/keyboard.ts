import { UserInputService } from "@rbxts/services";
import { World } from "@rbxts/matter";
import { InputControlKind } from "../input-control-kind";
import { UserInput } from "./traits/user-input";
import { BasicInputs } from "../clashing-inputs/basic-inputs";
import { Buttonlike, ButtonValue } from "./traits/buttonlike";
import { CentralInputStore } from "./central-input-store";

/**
 * A keyboard key that can be pressed
 */
export class KeyCode implements UserInput, Buttonlike {
	private cachedHash?: string;

	constructor(private readonly keyCode: Enum.KeyCode) {}

	// Static key constants for common keys
	static readonly A = new KeyCode(Enum.KeyCode.A);
	static readonly B = new KeyCode(Enum.KeyCode.B);
	static readonly C = new KeyCode(Enum.KeyCode.C);
	static readonly D = new KeyCode(Enum.KeyCode.D);
	static readonly E = new KeyCode(Enum.KeyCode.E);
	static readonly F = new KeyCode(Enum.KeyCode.F);
	static readonly G = new KeyCode(Enum.KeyCode.G);
	static readonly H = new KeyCode(Enum.KeyCode.H);
	static readonly I = new KeyCode(Enum.KeyCode.I);
	static readonly J = new KeyCode(Enum.KeyCode.J);
	static readonly K = new KeyCode(Enum.KeyCode.K);
	static readonly L = new KeyCode(Enum.KeyCode.L);
	static readonly M = new KeyCode(Enum.KeyCode.M);
	static readonly N = new KeyCode(Enum.KeyCode.N);
	static readonly O = new KeyCode(Enum.KeyCode.O);
	static readonly P = new KeyCode(Enum.KeyCode.P);
	static readonly Q = new KeyCode(Enum.KeyCode.Q);
	static readonly R = new KeyCode(Enum.KeyCode.R);
	static readonly S = new KeyCode(Enum.KeyCode.S);
	static readonly T = new KeyCode(Enum.KeyCode.T);
	static readonly U = new KeyCode(Enum.KeyCode.U);
	static readonly V = new KeyCode(Enum.KeyCode.V);
	static readonly W = new KeyCode(Enum.KeyCode.W);
	static readonly X = new KeyCode(Enum.KeyCode.X);
	static readonly Y = new KeyCode(Enum.KeyCode.Y);
	static readonly Z = new KeyCode(Enum.KeyCode.Z);

	// Numbers
	static readonly Zero = new KeyCode(Enum.KeyCode.Zero);
	static readonly One = new KeyCode(Enum.KeyCode.One);
	static readonly Two = new KeyCode(Enum.KeyCode.Two);
	static readonly Three = new KeyCode(Enum.KeyCode.Three);
	static readonly Four = new KeyCode(Enum.KeyCode.Four);
	static readonly Five = new KeyCode(Enum.KeyCode.Five);
	static readonly Six = new KeyCode(Enum.KeyCode.Six);
	static readonly Seven = new KeyCode(Enum.KeyCode.Seven);
	static readonly Eight = new KeyCode(Enum.KeyCode.Eight);
	static readonly Nine = new KeyCode(Enum.KeyCode.Nine);

	// Special keys
	static readonly Space = new KeyCode(Enum.KeyCode.Space);
	static readonly Tab = new KeyCode(Enum.KeyCode.Tab);
	static readonly Return = new KeyCode(Enum.KeyCode.Return);
	static readonly Enter = new KeyCode(Enum.KeyCode.Return); // Alias for Return
	static readonly Escape = new KeyCode(Enum.KeyCode.Escape);
	static readonly Backspace = new KeyCode(Enum.KeyCode.Backspace);
	static readonly Delete = new KeyCode(Enum.KeyCode.Delete);

	// Arrow keys
	static readonly Up = new KeyCode(Enum.KeyCode.Up);
	static readonly Down = new KeyCode(Enum.KeyCode.Down);
	static readonly Left = new KeyCode(Enum.KeyCode.Left);
	static readonly Right = new KeyCode(Enum.KeyCode.Right);

	// Modifiers aa
	static readonly LeftShift = new KeyCode(Enum.KeyCode.LeftShift);
	static readonly RightShift = new KeyCode(Enum.KeyCode.RightShift);
	static readonly LeftControl = new KeyCode(Enum.KeyCode.LeftControl);
	static readonly RightControl = new KeyCode(Enum.KeyCode.RightControl);
	static readonly LeftAlt = new KeyCode(Enum.KeyCode.LeftAlt);
	static readonly RightAlt = new KeyCode(Enum.KeyCode.RightAlt);

	/**
	 * Creates a KeyCode from a Roblox KeyCode enum
	 * @param keyCode - The Roblox KeyCode enum
	 * @returns A new KeyCode instance
	 */
	static from(keyCode: Enum.KeyCode): KeyCode {
		return new KeyCode(keyCode);
	}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		return BasicInputs.single(this);
	}

	hash(): string {
		if (!this.cachedHash) {
			this.cachedHash = `keyboard_${this.keyCode.Name}`;
		}
		return this.cachedHash;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof KeyCode)) return false;
		return this.keyCode === other.keyCode;
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
		// In a real implementation, we would simulate key press
		// For now, this is handled by the input update system
		warn(`KeyCode.press() is not implemented for ${this.keyCode.Name}`);
	}

	release(_world: World): void {
		// In a real implementation, we would simulate key release
		// For now, this is handled by the input update system
		warn(`KeyCode.release() is not implemented for ${this.keyCode.Name}`);
	}

	setValue(_world: World, value: number): void {
		if (value > 0) {
			this.press(_world);
		} else {
			this.release(_world);
		}
	}

	/**
	 * Gets the Roblox KeyCode enum
	 * @returns The underlying KeyCode enum
	 */
	getKeyCode(): Enum.KeyCode {
		return this.keyCode;
	}

	toString(): string {
		return this.keyCode.Name;
	}
}

/**
 * Updates keyboard input states in the CentralInputStore
 * @param inputStore - The central input store to update
 */
export function updateKeyboardInput(inputStore: CentralInputStore): void {
	// Check all common keys
	const keyCodes = [
		// Letters
		Enum.KeyCode.A,
		Enum.KeyCode.B,
		Enum.KeyCode.C,
		Enum.KeyCode.D,
		Enum.KeyCode.E,
		Enum.KeyCode.F,
		Enum.KeyCode.G,
		Enum.KeyCode.H,
		Enum.KeyCode.I,
		Enum.KeyCode.J,
		Enum.KeyCode.K,
		Enum.KeyCode.L,
		Enum.KeyCode.M,
		Enum.KeyCode.N,
		Enum.KeyCode.O,
		Enum.KeyCode.P,
		Enum.KeyCode.Q,
		Enum.KeyCode.R,
		Enum.KeyCode.S,
		Enum.KeyCode.T,
		Enum.KeyCode.U,
		Enum.KeyCode.V,
		Enum.KeyCode.W,
		Enum.KeyCode.X,
		Enum.KeyCode.Y,
		Enum.KeyCode.Z,
		// Numbers
		Enum.KeyCode.Zero,
		Enum.KeyCode.One,
		Enum.KeyCode.Two,
		Enum.KeyCode.Three,
		Enum.KeyCode.Four,
		Enum.KeyCode.Five,
		Enum.KeyCode.Six,
		Enum.KeyCode.Seven,
		Enum.KeyCode.Eight,
		Enum.KeyCode.Nine,
		// Special keys
		Enum.KeyCode.Space,
		Enum.KeyCode.Tab,
		Enum.KeyCode.Return,
		Enum.KeyCode.Escape,
		Enum.KeyCode.Backspace,
		// Modifiers
		Enum.KeyCode.LeftShift,
		Enum.KeyCode.RightShift,
		Enum.KeyCode.LeftControl,
		Enum.KeyCode.RightControl,
		Enum.KeyCode.LeftAlt,
		Enum.KeyCode.RightAlt,
		// Arrow keys
		Enum.KeyCode.Up,
		Enum.KeyCode.Down,
		Enum.KeyCode.Left,
		Enum.KeyCode.Right,
	];

	for (const keyCodeEnum of keyCodes) {
		const keyCode = new KeyCode(keyCodeEnum);
		const pressed = UserInputService.IsKeyDown(keyCodeEnum);
		const buttonValue: ButtonValue = {
			pressed: pressed,
			value: pressed ? 1 : 0,
		};
		inputStore.updateButtonlike(keyCode.hash(), buttonValue);
	}
}

/**
 * Helper class for modifier keys that can be either left or right
 */
export class ModifierKey implements UserInput, Buttonlike {
	private readonly leftKey: KeyCode;
	private readonly rightKey: KeyCode;

	constructor(
		private readonly name: string,
		leftKeyCode: Enum.KeyCode,
		rightKeyCode: Enum.KeyCode,
	) {
		this.leftKey = new KeyCode(leftKeyCode);
		this.rightKey = new KeyCode(rightKeyCode);
	}

	/**
	 * Creates a Shift modifier key
	 * @returns A ModifierKey for Shift
	 */
	static shift(): ModifierKey {
		return new ModifierKey("Shift", Enum.KeyCode.LeftShift, Enum.KeyCode.RightShift);
	}

	/**
	 * Creates a Control modifier key
	 * @returns A ModifierKey for Control
	 */
	static control(): ModifierKey {
		return new ModifierKey("Control", Enum.KeyCode.LeftControl, Enum.KeyCode.RightControl);
	}

	/**
	 * Creates an Alt modifier key
	 * @returns A ModifierKey for Alt
	 */
	static alt(): ModifierKey {
		return new ModifierKey("Alt", Enum.KeyCode.LeftAlt, Enum.KeyCode.RightAlt);
	}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		return BasicInputs.composite(new Set([this.leftKey, this.rightKey]));
	}

	hash(): string {
		return `ModifierKey:${this.name}`;
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof ModifierKey)) return false;
		return this.name === other.name;
	}

	pressed(inputStore: CentralInputStore, gamepad?: number): boolean {
		return this.leftKey.pressed(inputStore, gamepad) || this.rightKey.pressed(inputStore, gamepad);
	}

	getPressed(inputStore: CentralInputStore, gamepad?: number): boolean | undefined {
		const leftPressed = this.leftKey.getPressed(inputStore, gamepad);
		const rightPressed = this.rightKey.getPressed(inputStore, gamepad);
		if (leftPressed === undefined && rightPressed === undefined) return undefined;
		return (leftPressed ?? false) || (rightPressed ?? false);
	}

	released(inputStore: CentralInputStore, gamepad?: number): boolean {
		return !this.pressed(inputStore, gamepad);
	}

	value(inputStore: CentralInputStore, gamepad?: number): number {
		const leftValue = this.leftKey.value(inputStore, gamepad);
		const rightValue = this.rightKey.value(inputStore, gamepad);
		return math.max(leftValue, rightValue);
	}

	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		const leftValue = this.leftKey.getValue(inputStore, gamepad);
		const rightValue = this.rightKey.getValue(inputStore, gamepad);
		if (leftValue === undefined && rightValue === undefined) return undefined;
		return math.max(leftValue ?? 0, rightValue ?? 0);
	}

	press(world: World): void {
		this.leftKey.press(world);
	}

	release(world: World): void {
		this.leftKey.release(world);
		this.rightKey.release(world);
	}

	setValue(world: World, value: number): void {
		this.leftKey.setValue(world, value);
	}

	toString(): string {
		return this.name;
	}
}
