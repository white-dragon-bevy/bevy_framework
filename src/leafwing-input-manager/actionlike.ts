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
	constructor(protected readonly value: string | number) {}

	abstract getInputControlKind(): InputControlKind;

	hash(): string {
		// Use a static class name or override in subclasses
		return `ActionlikeEnum:${this.value}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return tostring(this.value);
	}
}

/**
 * Cached hash implementation for performance optimization
 */
export class CachedActionlike implements Actionlike {
	private cachedHash?: string;

	constructor(private readonly baseAction: Actionlike) {}

	hash(): string {
		if (!this.cachedHash) {
			this.cachedHash = this.baseAction.hash();
		}
		return this.cachedHash;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return this.baseAction.toString();
	}
}