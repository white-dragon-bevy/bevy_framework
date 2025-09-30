import { Duration } from "../bevy_time";

import type { Abilitylike } from "./abilitylike";
import type { ChargeState, Charges } from "./charges";
import { CannotUseAbility } from "./errors";

/**
 * A cooldown timer that can be used to limit ability usage frequency
 */
export class Cooldown {
	private maxTime: Duration;
	private elapsedTime: Duration;

	/**
	 * Creates a new cooldown with the specified maximum duration
	 * The cooldown starts in a ready state (elapsed time equals max time)
	 *
	 * @param maxTime - The maximum cooldown duration
	 */
	constructor(maxTime: Duration) {
		this.maxTime = maxTime;
		this.elapsedTime = maxTime; // Start ready
	}

	/**
	 * Creates a new cooldown from a duration in seconds
	 *
	 * @param seconds - The cooldown duration in seconds
	 * @returns A new cooldown instance
	 */
	static fromSecs(seconds: number): Cooldown {
		return new Cooldown(Duration.fromSecs(seconds));
	}

	/**
	 * Advances the cooldown timer by the specified delta time
	 *
	 * @param deltaTime - The time elapsed since the last tick
	 * @param charges - Optional charges that should be replenished when cooldown completes
	 */
	tick(deltaTime: Duration, charges?: Charges): void {
		if (this.elapsedTime.lessThan(this.maxTime)) {
			this.elapsedTime = this.elapsedTime.add(deltaTime);

			// Clamp to max time
			if (this.elapsedTime.greaterThan(this.maxTime)) {
				this.elapsedTime = this.maxTime;

				// Replenish charges when cooldown completes
				if (charges !== undefined) {
					charges.replenish();
				}
			}
		}
	}

	/**
	 * Checks if the cooldown is ready (elapsed >= max)
	 *
	 * @returns undefined if ready, CannotUseAbility.OnCooldown otherwise
	 */
	ready(): CannotUseAbility | undefined {
		if (this.elapsedTime.lessThan(this.maxTime)) {
			return CannotUseAbility.OnCooldown;
		}

		return undefined;
	}

	/**
	 * Triggers the cooldown, resetting the elapsed time to zero
	 *
	 * @returns undefined if successfully triggered, CannotUseAbility.OnCooldown if not ready
	 */
	trigger(): CannotUseAbility | undefined {
		const readyError = this.ready();
		if (readyError !== undefined) {
			return readyError;
		}

		this.elapsedTime = Duration.ZERO;
		return undefined;
	}

	/**
	 * Refreshes the cooldown, resetting it regardless of current state
	 */
	refresh(): void {
		this.elapsedTime = Duration.ZERO;
	}

	/**
	 * Gets the maximum cooldown duration
	 *
	 * @returns The maximum duration
	 */
	getMaxTime(): Duration {
		return this.maxTime;
	}

	/**
	 * Gets the elapsed time on this cooldown
	 *
	 * @returns The elapsed duration
	 */
	getElapsed(): Duration {
		return this.elapsedTime;
	}

	/**
	 * Gets the remaining cooldown time
	 *
	 * @returns The remaining duration
	 */
	getRemaining(): Duration {
		return this.maxTime.saturatingSub(this.elapsedTime);
	}

	/**
	 * Checks if the cooldown is currently active (not ready)
	 *
	 * @returns True if on cooldown
	 */
	isActive(): boolean {
		return this.elapsedTime.lessThan(this.maxTime);
	}

	/**
	 * Gets the cooldown progress as a fraction (0.0 to 1.0)
	 *
	 * @returns The progress fraction
	 */
	getFraction(): number {
		const maxSecs = this.maxTime.asSecsF32();
		if (maxSecs === 0) {
			return 1.0;
		}

		const elapsedSecs = this.elapsedTime.asSecsF32();
		return math.clamp(elapsedSecs / maxSecs, 0, 1);
	}
}

/**
 * Stores cooldown state for all abilities of type A
 */
export class CooldownState<A extends Abilitylike> {
	private cooldownMap: Map<string, Cooldown>;
	globalCooldown?: Cooldown;

	/**
	 * Creates a new cooldown state
	 */
	constructor() {
		this.cooldownMap = new Map();
	}

	/**
	 * Triggers the cooldown for the specified action
	 *
	 * @param action - The ability to trigger cooldown for
	 * @returns undefined if successful, or an error if the cooldown is not ready
	 */
	trigger(action: A): CannotUseAbility | undefined {
		// Check global cooldown first
		if (this.globalCooldown !== undefined) {
			const gcdError = this.globalCooldown.ready();
			if (gcdError !== undefined) {
				return CannotUseAbility.OnGlobalCooldown;
			}
		}

		// Then check action-specific cooldown
		const cooldown = this.get(action);
		if (cooldown !== undefined) {
			const cooldownError = cooldown.trigger();
			if (cooldownError !== undefined) {
				return cooldownError;
			}
		}

		// Trigger global cooldown if present
		if (this.globalCooldown !== undefined) {
			this.globalCooldown.trigger();
		}

		return undefined;
	}

	/**
	 * Checks if the ability is ready (not on cooldown)
	 *
	 * @param action - The ability to check
	 * @returns undefined if ready, or an error indicating the cooldown state
	 */
	ready(action: A): CannotUseAbility | undefined {
		// Check global cooldown first
		if (this.globalCooldown !== undefined) {
			const gcdError = this.globalCooldown.ready();
			if (gcdError !== undefined) {
				return CannotUseAbility.OnGlobalCooldown;
			}
		}

		// Then check action-specific cooldown
		const cooldown = this.get(action);
		if (cooldown !== undefined) {
			return cooldown.ready();
		}

		return undefined;
	}

	/**
	 * Advances all cooldowns by the specified time
	 *
	 * @param deltaTime - The time elapsed since the last tick
	 * @param charges - Optional charge state for replenishing charges
	 */
	tick(deltaTime: Duration, charges?: ChargeState<A>): void {
		// Tick global cooldown
		if (this.globalCooldown !== undefined) {
			this.globalCooldown.tick(deltaTime);
		}

		// Tick all action-specific cooldowns
		for (const [actionHash, cooldown] of this.cooldownMap) {
			const actionCharges = charges?.getByHash(actionHash);
			cooldown.tick(deltaTime, actionCharges);
		}
	}

	/**
	 * Gets the cooldown for a specific action
	 *
	 * @param action - The ability to get cooldown for
	 * @returns The cooldown if it exists, undefined otherwise
	 */
	get(action: A): Cooldown | undefined {
		return this.cooldownMap.get(action.hash());
	}

	/**
	 * Sets the cooldown for a specific action
	 *
	 * @param action - The ability to set cooldown for
	 * @param cooldown - The cooldown to set
	 * @returns This instance for method chaining
	 */
	set(action: A, cooldown: Cooldown): this {
		this.cooldownMap.set(action.hash(), cooldown);
		return this;
	}

	/**
	 * Removes the cooldown for a specific action
	 *
	 * @param action - The ability to remove cooldown for
	 * @returns True if a cooldown was removed
	 */
	remove(action: A): boolean {
		return this.cooldownMap.delete(action.hash());
	}

	/**
	 * Clears all cooldowns
	 */
	clear(): void {
		this.cooldownMap.clear();
		this.globalCooldown = undefined;
	}

	/**
	 * Gets the number of cooldowns being tracked
	 *
	 * @returns The count of cooldowns
	 */
	size(): number {
		return this.cooldownMap.size();
	}
}