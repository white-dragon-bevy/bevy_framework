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
 * This is the default implementation used by most abilities
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
	// Check charges first
	const chargesError = charges.ready(action);
	if (chargesError !== undefined) {
		return chargesError;
	}

	// Then check cooldowns
	const cooldownError = cooldowns.ready(action);
	if (cooldownError !== undefined) {
		return cooldownError;
	}

	// Finally check resource pool if present
	if (pool !== undefined && costs !== undefined) {
		const cost = costs.get(action);
		if (cost !== undefined) {
			const poolError = pool.available(cost);
			if (poolError !== undefined) {
				return poolError;
			}
		}
	}

	return undefined;
}

/**
 * Helper function to trigger an ability
 *
 * This is the default implementation used by most abilities
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
	// First check if we can trigger
	const readyError = abilityReady(action, charges, cooldowns, pool, costs);
	if (readyError !== undefined) {
		return readyError;
	}

	// Expend a charge
	const chargeError = charges.expend(action);
	if (chargeError !== undefined) {
		return chargeError;
	}

	// Trigger the cooldown
	const cooldownError = cooldowns.trigger(action);
	if (cooldownError !== undefined) {
		return cooldownError;
	}

	// Deduct from pool if present
	if (pool !== undefined && costs !== undefined) {
		const cost = costs.get(action);
		if (cost !== undefined) {
			const poolError = pool.expend(cost);
			if (poolError !== undefined) {
				return poolError;
			}
		}
	}

	return undefined;
}