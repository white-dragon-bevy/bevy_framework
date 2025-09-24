import { UserInput } from "./traits/user-input";
import { InputControlKind } from "../core/input-control-kind";
import { CentralInputStore } from "./central-input-store";
import { KeyCode, ModifierKey } from "./keyboard";
import { MouseButton } from "./mouse";
import { GamepadButton } from "./gamepad";
import { BasicInputs } from "../clashing-inputs/basic-inputs";

/**
 * Represents a combination of inputs that must be pressed simultaneously
 * Similar to keyboard shortcuts like Ctrl+S or Shift+Click
 */
export class InputChord implements UserInput {
	private inputs: UserInput[];
	private requireAllModifiers: boolean;

	/**
	 * Creates a new input chord
	 * @param inputs - The inputs that make up this chord
	 * @param requireAllModifiers - If true, all modifiers must match exactly
	 */
	constructor(inputs: UserInput[], requireAllModifiers = false) {
		this.inputs = inputs;
		this.requireAllModifiers = requireAllModifiers;
	}

	/**
	 * Creates a chord from multiple inputs
	 * @param inputs - The inputs to combine
	 * @returns A new InputChord
	 */
	static from(...inputs: UserInput[]): InputChord {
		return new InputChord(inputs);
	}

	/**
	 * Creates a keyboard shortcut chord
	 * @param modifiers - The modifier keys
	 * @param key - The main key
	 * @returns A new InputChord
	 */
	static keyboardShortcut(modifiers: ModifierKey[], key: KeyCode): InputChord {
		const inputs: UserInput[] = [...modifiers, key];
		return new InputChord(inputs, true);
	}

	/**
	 * Creates a Ctrl+Key shortcut
	 * @param key - The key to combine with Ctrl
	 * @returns A new InputChord
	 */
	static ctrl(key: KeyCode): InputChord {
		return InputChord.keyboardShortcut([ModifierKey.control()], key);
	}

	/**
	 * Creates a Shift+Key shortcut
	 * @param key - The key to combine with Shift
	 * @returns A new InputChord
	 */
	static shift(key: KeyCode): InputChord {
		return InputChord.keyboardShortcut([ModifierKey.shift()], key);
	}

	/**
	 * Creates an Alt+Key shortcut
	 * @param key - The key to combine with Alt
	 * @returns A new InputChord
	 */
	static alt(key: KeyCode): InputChord {
		return InputChord.keyboardShortcut([ModifierKey.alt()], key);
	}

	/**
	 * Creates a Ctrl+Shift+Key shortcut
	 * @param key - The key to combine with Ctrl+Shift
	 * @returns A new InputChord
	 */
	static ctrlShift(key: KeyCode): InputChord {
		return InputChord.keyboardShortcut([ModifierKey.control(), ModifierKey.shift()], key);
	}

	/**
	 * Creates a Ctrl+Alt+Key shortcut
	 * @param key - The key to combine with Ctrl+Alt
	 * @returns A new InputChord
	 */
	static ctrlAlt(key: KeyCode): InputChord {
		return InputChord.keyboardShortcut([ModifierKey.control(), ModifierKey.alt()], key);
	}

	/**
	 * Creates a mouse button with modifier keys
	 * @param modifiers - The modifier keys
	 * @param button - The mouse button
	 * @returns A new InputChord
	 */
	static mouseWithModifiers(modifiers: ModifierKey[], button: MouseButton): InputChord {
		const inputs: UserInput[] = [...modifiers, button];
		return new InputChord(inputs, true);
	}

	/**
	 * Creates a Shift+Click chord
	 * @param button - The mouse button
	 * @returns A new InputChord
	 */
	static shiftClick(button = MouseButton.left()): InputChord {
		return InputChord.mouseWithModifiers([ModifierKey.shift()], button);
	}

	/**
	 * Creates a Ctrl+Click chord
	 * @param button - The mouse button
	 * @returns A new InputChord
	 */
	static ctrlClick(button = MouseButton.left()): InputChord {
		return InputChord.mouseWithModifiers([ModifierKey.control()], button);
	}

	/**
	 * Creates an Alt+Click chord
	 * @param button - The mouse button
	 * @returns A new InputChord
	 */
	static altClick(button = MouseButton.left()): InputChord {
		return InputChord.mouseWithModifiers([ModifierKey.alt()], button);
	}

	/**
	 * Gets the input control kind for this input
	 * @returns The input control kind
	 */
	kind(): InputControlKind {
		// Chord inherits the control kind of its primary input
		if (this.inputs.size() === 0) {
			return InputControlKind.Button;
		}

		// Find the first non-modifier input
		for (const input of this.inputs) {
			if (!(input instanceof ModifierKey)) {
				return input.kind();
			}
		}

		return InputControlKind.Button;
	}

	/**
	 * Checks if this input is currently active
	 * @param store - The central input store
	 * @returns True if the chord is active
	 */
	pressed(store: CentralInputStore): boolean {
		// All inputs must be pressed
		for (const input of this.inputs) {
			// Check if input is pressed through the store
			const inputHash = input.hash();
			const pressed = store.pressed(inputHash);
			if (!pressed) {
				return false;
			}
		}

		// If requireAllModifiers is true, check that no extra modifiers are pressed
		if (this.requireAllModifiers) {
			const requiredModifiers = new Set<ModifierKey>();
			for (const input of this.inputs) {
				if (input instanceof ModifierKey) {
					requiredModifiers.add(input);
				}
			}

			// Check that no other modifiers are pressed
			const ctrlModifier = ModifierKey.control();
			const shiftModifier = ModifierKey.shift();
			const altModifier = ModifierKey.alt();

			if (!requiredModifiers.has(ctrlModifier) && store.pressed(ctrlModifier.hash())) {
				return false;
			}
			if (!requiredModifiers.has(shiftModifier) && store.pressed(shiftModifier.hash())) {
				return false;
			}
			if (!requiredModifiers.has(altModifier) && store.pressed(altModifier.hash())) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Gets the value of this input (0.0 or 1.0 for chords)
	 * @param store - The central input store
	 * @returns The value
	 */
	value(store: CentralInputStore): number {
		return this.pressed(store) ? 1.0 : 0.0;
	}

	/**
	 * Gets the axis value (always 0.0 for chords)
	 * @param store - The central input store
	 * @returns The axis value
	 */
	axisValue(store: CentralInputStore): number {
		return 0.0;
	}

	/**
	 * Gets the dual axis value (always zero for chords)
	 * @param store - The central input store
	 * @returns The dual axis value
	 */
	axisPair(store: CentralInputStore): Vector2 {
		return Vector2.zero;
	}

	/**
	 * Gets the triple axis value (always zero for chords)
	 * @param store - The central input store
	 * @returns The triple axis value
	 */
	axisTriple(store: CentralInputStore): Vector3 {
		return Vector3.zero;
	}

	/**
	 * Gets a unique hash for this input
	 * @returns The hash
	 */
	hash(): string {
		const sortedHashes = this.inputs.map((input) => input.hash()).sort();
		return `Chord:[${sortedHashes.join(",")}]:${this.requireAllModifiers}`;
	}

	/**
	 * Gets the inputs that make up this chord
	 * @returns The inputs
	 */
	getInputs(): UserInput[] {
		return [...this.inputs];
	}

	/**
	 * Checks if this chord contains a specific input
	 * @param input - The input to check
	 * @returns True if the chord contains the input
	 */
	containsInput(input: UserInput): boolean {
		const targetHash = input.hash();
		for (const chordInput of this.inputs) {
			if (chordInput.hash() === targetHash) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Gets the number of inputs in this chord
	 * @returns The number of inputs
	 */
	size(): number {
		return this.inputs.size();
	}

	/**
	 * Checks if this chord is a subset of another chord
	 * @param other - The other chord
	 * @returns True if this is a subset
	 */
	isSubsetOf(other: InputChord): boolean {
		for (const input of this.inputs) {
			if (!other.containsInput(input)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Checks if this chord is a superset of another chord
	 * @param other - The other chord
	 * @returns True if this is a superset
	 */
	isSupersetOf(other: InputChord): boolean {
		return other.isSubsetOf(this);
	}

	/**
	 * Decomposes this input into its base components
	 * @returns BasicInputs containing the component input hashes
	 */
	decompose(): BasicInputs {
		return BasicInputs.multiple(this.inputs);
	}

	/**
	 * Checks if this input equals another input
	 * @param other - The other input
	 * @returns True if equal
	 */
	equals(other: UserInput): boolean {
		if (!(other instanceof InputChord)) {
			return false;
		}

		if (this.inputs.size() !== other.inputs.size()) {
			return false;
		}

		if (this.requireAllModifiers !== other.requireAllModifiers) {
			return false;
		}

		// Check all inputs are present
		for (const input of this.inputs) {
			if (!other.containsInput(input)) {
				return false;
			}
		}

		return true;
	}
}
