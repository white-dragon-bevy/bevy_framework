import { InputControlKind } from "./input-control-kind";

/**
 * Allows a type to be used as a gameplay action in an input-agnostic fashion
 *
 * Actions are modelled as "virtual buttons" (or axes), cleanly abstracting over messy,
 * customizable inputs in a way that can be easily consumed by your game logic.
 */
export interface Actionlike {
	/**
	 * Returns the kind of input control this action represents
	 * @returns The input control kind for this action
	 */
	getInputControlKind(): InputControlKind;

	/**
	 * Compares this action with another for equality
	 * @param other - The other action to compare with
	 * @returns True if the actions are equal
	 */
	equals(other: Actionlike): boolean;

	/**
	 * Returns a unique hash string for this action
	 * @returns A unique hash string
	 */
	hash(): string;

	/**
	 * Returns a string representation of this action
	 * @returns A string representation
	 */
	toString(): string;
}

/**
 * Helper class for implementing Actionlike enums
 */
export abstract class ActionlikeEnum implements Actionlike {
	constructor(
		protected readonly name: string,
		protected readonly controlKind: InputControlKind = InputControlKind.Button,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof ActionlikeEnum)) return false;
		return this.name === other.name && this.controlKind === other.controlKind;
	}

	hash(): string {
		return `ActionlikeEnum:${this.name}:${this.controlKind}`;
	}

	toString(): string {
		return this.name;
	}
}