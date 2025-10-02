import type { Actionlike } from "../leafwing-input-manager";

import type { AbilityCosts, Pool } from "./pool";
import type { ChargeState } from "./charges";
import type { CooldownState } from "./cooldown";
import { CannotUseAbility } from "./errors";

/**
 * An ability that can be triggered, with associated cooldowns, charges, and costs
 *
 * This trait extends Actionlike from leafwing-input-manager, adding ability-specific functionality
 * like resource costs, cooldowns, and charges
 */
export interface Abilitylike extends Actionlike {
	/**
	 * Checks if the ability is ready to be used
	 *
	 * @param charges - The charge state for this ability type
	 * @param cooldowns - The cooldown state for this ability type
	 * @param pool - Optional resource pool to check costs against
	 * @param costs - Optional ability costs in terms of the pool
	 * @returns undefined if ready, or an error indicating why it cannot be used
	 */
	ready<P extends Pool>(
		charges: ChargeState<this>,
		cooldowns: CooldownState<this>,
		pool?: P,
		costs?: AbilityCosts<this, P>,
	): CannotUseAbility | undefined;

	/**
	 * Triggers the ability, consuming a charge and starting cooldown
	 *
	 * @param charges - The charge state for this ability type
	 * @param cooldowns - The cooldown state for this ability type
	 * @param pool - Optional resource pool to deduct costs from
	 * @param costs - Optional ability costs in terms of the pool
	 * @returns undefined if successfully triggered, or an error indicating why it failed
	 */
	trigger<P extends Pool>(
		charges: ChargeState<this>,
		cooldowns: CooldownState<this>,
		pool?: P,
		costs?: AbilityCosts<this, P>,
	): CannotUseAbility | undefined;
}

/**
 * Helper function to check if an ability is ready to be used
 *
 * This is the default implementation used by most abilities.
 *
 * Logic (matching Rust version):
 * - If ability has charges, check if charges > 0
 * - Else if ability has cooldown, check if cooldown is ready
 * - Else if pool exists, check if pool has enough resources
 * - Else if cost exists but pool doesn't, return PoolInsufficient
 * - Otherwise ready
 *
 * @param action - The ability to check
 * @param charges - The charge state for this ability type
 * @param cooldowns - The cooldown state for this ability type
 * @param pool - Optional resource pool to check costs against
 * @param costs - Optional ability costs in terms of the pool
 * @returns undefined if ready, or an error indicating why it cannot be used
 */
export function abilityReady<A extends Abilitylike, P extends Pool>(
	action: A,
	charges: ChargeState<A>,
	cooldowns: CooldownState<A>,
	pool?: P,
	costs?: AbilityCosts<A, P>,
): CannotUseAbility | undefined {
	const chargesObj = charges.get(action);
	const cooldownObj = cooldowns.get(action);
	const cost = costs?.get(action);

	// If this ability has charges, only check charges
	if (chargesObj !== undefined) {
		if (chargesObj.charges() > 0) {
			return undefined;
		}

		return CannotUseAbility.NoCharges;
	}

	// Else if it has a cooldown but no charges, check cooldown
	if (cooldownObj !== undefined) {
		return cooldowns.ready(action);
	}

	// Else if we have a pool, check if it has enough resources
	if (pool !== undefined) {
		if (cost !== undefined) {
			return pool.available(cost);
		}

		return undefined;
	}

	// Pool doesn't exist but cost does
	if (cost !== undefined) {
		// Assuming non-zero cost means insufficient
		return CannotUseAbility.PoolInsufficient;
	}

	// No charges, no cooldown, no pool, no cost - always ready
	return undefined;
}

/**
 * Helper function to trigger an ability
 *
 * This is the default implementation used by most abilities.
 *
 * Logic (matching Rust version):
 * - First check if ready
 * - If ability has charges, expend one charge
 * - Else if ability has cooldown, trigger cooldown
 * - If pool and cost exist, deduct from pool
 *
 * @param action - The ability to trigger
 * @param charges - The charge state for this ability type
 * @param cooldowns - The cooldown state for this ability type
 * @param pool - Optional resource pool to deduct costs from
 * @param costs - Optional ability costs in terms of the pool
 * @returns undefined if successfully triggered, or an error indicating why it failed
 */
export function triggerAbility<A extends Abilitylike, P extends Pool>(
	action: A,
	charges: ChargeState<A>,
	cooldowns: CooldownState<A>,
	pool?: P,
	costs?: AbilityCosts<A, P>,
): CannotUseAbility | undefined {
	const chargesObj = charges.get(action);
	const cooldownObj = cooldowns.get(action);
	const cost = costs?.get(action);

	// First check if we can trigger
	const readyError = abilityReady(action, charges, cooldowns, pool, costs);
	if (readyError !== undefined) {
		return readyError;
	}

	// If ability has charges, expend one charge
	if (chargesObj !== undefined) {
		const chargeError = charges.expend(action);
		if (chargeError !== undefined) {
			return chargeError;
		}
	}
	// Else if ability has cooldown, trigger cooldown
	else if (cooldownObj !== undefined) {
		const cooldownError = cooldowns.trigger(action);
		if (cooldownError !== undefined) {
			return cooldownError;
		}
	}

	// Deduct from pool if present
	if (pool !== undefined && cost !== undefined) {
		const poolError = pool.expend(cost);
		if (poolError !== undefined) {
			// This should never happen because we checked in ready()
			// but we return the error anyway for safety
			return poolError;
		}
	}

	return undefined;
}