import type { Abilitylike } from "./abilitylike";
import { ChargeState } from "./charges";
import { CooldownState } from "./cooldown";

/**
 * A bundle containing all the components needed for an ability system
 *
 * This is a convenient way to add all ability-related components at once
 */
export interface AbilitiesBundle<A extends Abilitylike> {
	/**
	 * The cooldown state for all abilities of type A
	 */
	cooldowns: CooldownState<A>;

	/**
	 * The charge state for all abilities of type A
	 */
	charges: ChargeState<A>;
}

/**
 * Creates a new abilities bundle with default values
 *
 * @returns A new bundle with empty cooldown and charge states
 */
export function createAbilitiesBundle<A extends Abilitylike>(): AbilitiesBundle<A> {
	return {
		cooldowns: new CooldownState<A>(),
		charges: new ChargeState<A>(),
	};
}