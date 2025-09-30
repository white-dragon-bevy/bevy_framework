import { Duration } from "../bevy_time";

import type { Abilitylike } from "./abilitylike";
import { CannotUseAbility } from "./errors";

/**
 * Error type for when trying to set max pool value below minimum
 */
export class MaxPoolLessThanMinError {
	public readonly message = "Max pool value cannot be less than minimum";
}

/**
 * A pool of resources (like health, mana, stamina) that can be expended and replenished
 */
export interface Pool {
	/**
	 * Gets the current amount in the pool
	 *
	 * @returns The current value
	 */
	current(): number;

	/**
	 * Gets the maximum amount the pool can hold
	 *
	 * @returns The maximum value
	 */
	max(): number;

	/**
	 * Checks if the specified amount is available in the pool
	 *
	 * @param amount - The amount to check
	 * @returns undefined if available, CannotUseAbility.PoolInsufficient otherwise
	 */
	available(amount: number): CannotUseAbility | undefined;

	/**
	 * Expends the specified amount from the pool
	 *
	 * @param amount - The amount to expend
	 * @returns undefined if successful, CannotUseAbility.PoolInsufficient if insufficient
	 */
	expend(amount: number): CannotUseAbility | undefined;

	/**
	 * Replenishes the specified amount to the pool
	 *
	 * @param amount - The amount to replenish
	 */
	replenish(amount: number): void;

	/**
	 * Sets the current value directly
	 *
	 * @param value - The new current value
	 * @returns The actual value set (clamped to valid range)
	 */
	setCurrent(value: number): number;

	/**
	 * Sets the maximum value
	 *
	 * @param value - The new maximum value
	 */
	setMax(value: number): void;

	/**
	 * Checks if the pool is at maximum capacity
	 *
	 * @returns True if full
	 */
	isFull(): boolean;

	/**
	 * Checks if the pool is empty
	 *
	 * @returns True if empty
	 */
	isEmpty(): boolean;
}

/**
 * A pool that automatically regenerates over time
 */
export interface RegeneratingPool extends Pool {
	/**
	 * Gets the regeneration rate per second
	 *
	 * @returns The regen rate
	 */
	regenPerSecond(): number;

	/**
	 * Sets the regeneration rate per second
	 *
	 * @param rate - The new regen rate
	 */
	setRegenPerSecond(rate: number): void;

	/**
	 * Regenerates the pool based on elapsed time
	 *
	 * @param deltaTime - The time elapsed since last regeneration
	 */
	regenerate(deltaTime: Duration): void;
}

/**
 * Stores the costs of abilities in terms of a resource pool
 */
export class AbilityCosts<A extends Abilitylike, P extends Pool> {
	private costMap: Map<string, number>;

	/**
	 * Creates a new ability costs map
	 */
	constructor() {
		this.costMap = new Map();
	}

	/**
	 * Gets the cost of an ability
	 *
	 * @param action - The ability to get cost for
	 * @returns The cost, or undefined if no cost is set
	 */
	get(action: A): number | undefined {
		return this.costMap.get(action.hash());
	}

	/**
	 * Sets the cost of an ability
	 *
	 * @param action - The ability to set cost for
	 * @param cost - The cost value
	 * @returns This instance for method chaining
	 */
	set(action: A, cost: number): this {
		this.costMap.set(action.hash(), cost);
		return this;
	}

	/**
	 * Checks if an ability's cost can be paid from the pool
	 *
	 * @param action - The ability to check
	 * @param pool - The resource pool
	 * @returns True if the cost can be paid
	 */
	available(action: A, pool: P): boolean {
		const cost = this.get(action);
		if (cost === undefined) {
			return true; // No cost means always available
		}

		return pool.available(cost) === undefined;
	}

	/**
	 * Removes the cost for an ability
	 *
	 * @param action - The ability to remove cost for
	 * @returns True if a cost was removed
	 */
	remove(action: A): boolean {
		return this.costMap.delete(action.hash());
	}

	/**
	 * Clears all costs
	 */
	clear(): void {
		this.costMap.clear();
	}

	/**
	 * Gets the number of costs being tracked
	 *
	 * @returns The count of costs
	 */
	size(): number {
		return this.costMap.size();
	}
}

/**
 * A bundle containing a resource pool and associated ability costs
 */
export interface PoolBundle<A extends Abilitylike, P extends Pool> {
	/**
	 * The resource pool
	 */
	pool: P;

	/**
	 * The ability costs in terms of this pool
	 */
	abilityCosts: AbilityCosts<A, P>;
}