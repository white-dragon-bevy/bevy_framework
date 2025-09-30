import { InputControlKind } from "./input-control-kind";

/**
 * Trait-like interface for defining action types that can be managed by the input system.
 *
 * Actions must be hashable and comparable for efficient storage and lookup.
 */
export interface Actionlike {
	/**
	 * Generates a unique hash for this action
	 * @returns A string hash that uniquely identifies this action
	 */
	hash(): string;

	/**
	 * Checks equality with another action
	 * @param other - The other action to compare with
	 * @returns True if the actions are equal
	 */
	equals(other: Actionlike): boolean;

	/**
	 * Gets the display name for this action
	 * @returns A human-readable name for the action
	 */
	toString(): string;
}

/**
 * Helper class for implementing Actionlike for enum-style actions
 */
export abstract class ActionlikeEnum implements Actionlike {
	/**
	 * Creates a new ActionlikeEnum instance
	 * @param value - The unique identifier for this action (string or number)
	 */
	constructor(protected readonly value: string | number) {}

	/**
	 * Gets the input control kind for this action
	 * @returns The type of input control (Button, Axis, DualAxis, or TripleAxis)
	 */
	abstract getInputControlKind(): InputControlKind;

	/**
	 * Generates a unique hash for this action
	 * @returns A string hash that uniquely identifies this action
	 */
	hash(): string {
		// Use a static class name or override in subclasses
		return `ActionlikeEnum:${this.value}`;
	}

	/**
	 * Checks equality with another action
	 * @param other - The other action to compare with
	 * @returns True if the actions are equal
	 */
	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	/**
	 * Gets the display name for this action
	 * @returns A human-readable name for the action
	 */
	toString(): string {
		return tostring(this.value);
	}
}

/**
 * Cached hash implementation for performance optimization
 */
export class CachedActionlike implements Actionlike {
	private cachedHash?: string;

	/**
	 * Creates a new CachedActionlike wrapper
	 * @param baseAction - The action to wrap with hash caching
	 */
	constructor(private readonly baseAction: Actionlike) {}

	/**
	 * Generates a unique hash for this action (with caching)
	 * @returns A string hash that uniquely identifies this action
	 */
	hash(): string {
		if (!this.cachedHash) {
			this.cachedHash = this.baseAction.hash();
		}
		return this.cachedHash;
	}

	/**
	 * Checks equality with another action
	 * @param other - The other action to compare with
	 * @returns True if the actions are equal
	 */
	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	/**
	 * Gets the display name for this action
	 * @returns A human-readable name for the action
	 */
	toString(): string {
		return this.baseAction.toString();
	}
}
