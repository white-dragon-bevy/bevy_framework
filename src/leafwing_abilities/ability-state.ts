import type { Abilitylike } from "./abilitylike";
import type { ChargeState } from "./charges";
import type { CooldownState } from "./cooldown";
import type { AbilityCosts, Pool } from "./pool";
import { CannotUseAbility } from "./errors";

/**
 * A convenience interface for querying ability state
 *
 * This simplifies working with all the components needed to check and trigger abilities
 */
export interface AbilityStateQuery<A extends Abilitylike, P extends Pool = NullPool> {
	/**
	 * The charge state for this ability type
	 */
	charges: ChargeState<A>;

	/**
	 * The cooldown state for this ability type
	 */
	cooldowns: CooldownState<A>;

	/**
	 * Optional resource pool
	 */
	pool?: P;

	/**
	 * Optional ability costs
	 */
	abilityCosts?: AbilityCosts<A, P>;
}

/**
 * Helper class for working with ability state queries
 */
export class AbilityStateHelper<A extends Abilitylike, P extends Pool> {
	/**
	 * Creates a new ability state helper
	 *
	 * @param charges - The charge state
	 * @param cooldowns - The cooldown state
	 * @param pool - Optional resource pool
	 * @param abilityCosts - Optional ability costs
	 */
	constructor(
		public charges: ChargeState<A>,
		public cooldowns: CooldownState<A>,
		public pool?: P,
		public abilityCosts?: AbilityCosts<A, P>,
	) {}

	/**
	 * Checks if an ability is ready to use
	 *
	 * @param action - The ability to check
	 * @returns undefined if ready, or an error indicating why it cannot be used
	 */
	ready(action: A): CannotUseAbility | undefined {
		return action.ready(this.charges, this.cooldowns, this.pool, this.abilityCosts);
	}

	/**
	 * Triggers an ability
	 *
	 * @param action - The ability to trigger
	 * @returns undefined if successful, or an error if it failed
	 */
	trigger(action: A): CannotUseAbility | undefined {
		return action.trigger(this.charges, this.cooldowns, this.pool, this.abilityCosts);
	}
}

/**
 * A null pool implementation that does nothing
 *
 * Used when abilities don't require resource costs
 */
export class NullPool implements Pool {
	current(): number {
		return 0;
	}

	max(): number {
		return 0;
	}

	available(_amount: number): CannotUseAbility | undefined {
		return undefined; // Always available
	}

	expend(_amount: number): CannotUseAbility | undefined {
		return undefined; // Always successful
	}

	replenish(_amount: number): void {
		// No-op
	}

	setCurrent(_value: number): number {
		return 0;
	}

	setMax(_value: number): void {
		// No-op
	}

	isFull(): boolean {
		return true;
	}

	isEmpty(): boolean {
		return true;
	}
}