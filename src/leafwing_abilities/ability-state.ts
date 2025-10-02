import type { Abilitylike } from "./abilitylike";
import type { ChargeState } from "./charges";
import type { CooldownState } from "./cooldown";
import type { AbilityCosts, Pool } from "./pool";
import { CannotUseAbility } from "./errors";

/**
 * Simplified ActionState interface for ability input handling
 *
 * This represents the input state from leafwing_input_manager's ActionState
 * Projects using this should provide a compatible implementation
 */
export interface ActionState<A extends Abilitylike> {
	/**
	 * Checks if an action is currently pressed
	 *
	 * @param action - The action to check
	 * @returns True if the action is currently pressed
	 */
	pressed(action: A): boolean;

	/**
	 * Checks if an action was just pressed this frame
	 *
	 * @param action - The action to check
	 * @returns True if the action was just pressed
	 */
	justPressed(action: A): boolean;
}

/**
 * A convenience interface for querying ability state
 *
 * This simplifies working with all the components needed to check and trigger abilities
 */
export interface AbilityStateQuery<A extends Abilitylike, P extends Pool = NullPool> {
	/**
	 * The action state for input handling
	 */
	actionState?: ActionState<A>;

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
 *
 * This provides convenience methods that combine ability state checks with input handling,
 * matching the functionality of Bevy's QueryData-derived AbilityStateItem
 */
export class AbilityStateHelper<A extends Abilitylike, P extends Pool> {
	/**
	 * Creates a new ability state helper
	 *
	 * @param actionState - The action/input state
	 * @param charges - The charge state
	 * @param cooldowns - The cooldown state
	 * @param pool - Optional resource pool
	 * @param abilityCosts - Optional ability costs
	 */
	constructor(
		public actionState: ActionState<A> | undefined,
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
	 * Is this ability both ready and pressed?
	 *
	 * The error value for "this ability is not pressed" will be prioritized over "this ability is not ready".
	 *
	 * @param action - The ability to check
	 * @returns undefined if ready and pressed, or an error indicating why it cannot be used
	 */
	readyAndPressed(action: A): CannotUseAbility | undefined {
		if (!this.actionState) {
			return CannotUseAbility.NotPressed;
		}

		if (this.actionState.pressed(action)) {
			return this.ready(action);
		}

		return CannotUseAbility.NotPressed;
	}

	/**
	 * Is this ability both ready and just pressed?
	 *
	 * The error value for "this ability is not pressed" will be prioritized over "this ability is not ready".
	 *
	 * @param action - The ability to check
	 * @returns undefined if ready and just pressed, or an error indicating why it cannot be used
	 */
	readyAndJustPressed(action: A): CannotUseAbility | undefined {
		if (!this.actionState) {
			return CannotUseAbility.NotPressed;
		}

		if (this.actionState.justPressed(action)) {
			return this.ready(action);
		}

		return CannotUseAbility.NotPressed;
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

	/**
	 * Triggers this ability (and depletes available charges) if action is pressed
	 *
	 * @param action - The ability to trigger
	 * @returns undefined if successful, or an error if it failed
	 */
	triggerIfPressed(action: A): CannotUseAbility | undefined {
		if (!this.actionState) {
			return CannotUseAbility.NotPressed;
		}

		if (this.actionState.pressed(action)) {
			return action.trigger(this.charges, this.cooldowns, this.pool, this.abilityCosts);
		}

		return CannotUseAbility.NotPressed;
	}

	/**
	 * Triggers this ability (and depletes available charges) if action was just pressed
	 *
	 * @param action - The ability to trigger
	 * @returns undefined if successful, or an error if it failed
	 */
	triggerIfJustPressed(action: A): CannotUseAbility | undefined {
		if (!this.actionState) {
			return CannotUseAbility.NotPressed;
		}

		if (this.actionState.justPressed(action)) {
			return action.trigger(this.charges, this.cooldowns, this.pool, this.abilityCosts);
		}

		return CannotUseAbility.NotPressed;
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