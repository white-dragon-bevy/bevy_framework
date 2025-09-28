import { InputControlKind } from "../../input-control-kind";
import { World } from "@rbxts/matter";
import type { BasicInputs } from "../../clashing-inputs/basic-inputs";

/**
 * A trait for defining the behavior expected from different user input sources
 */
export interface UserInput {
	/**
	 * Defines the kind of behavior that the input should be
	 * @returns The input control kind
	 */
	kind(): InputControlKind;

	/**
	 * Returns the set of primitive inputs that make up this input
	 * @returns The basic inputs for clash detection
	 */
	decompose(): BasicInputs;

	/**
	 * Returns a unique hash for this input
	 * @returns A unique hash string
	 */
	hash(): string;

	/**
	 * Checks equality with another input
	 * @param other - The other input to compare
	 * @returns True if the inputs are equal
	 */
	equals(other: UserInput): boolean;
}