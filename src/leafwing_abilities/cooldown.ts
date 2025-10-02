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
	 * When charges are provided, this will calculate how many cooldown cycles have completed
	 * and add the corresponding number of charges. This ensures correct behavior even with
	 * large delta times (e.g., after a pause).
	 *
	 * @param deltaTime - The time elapsed since the last tick
	 * @param charges - Optional charges that should be replenished when cooldown completes
	 */
	tick(deltaTime: Duration, charges?: Charges): void {
		// Don't tick cooldowns when they are fully elapsed
		if (this.elapsedTime.equals(this.maxTime)) {
			return;
		}

		if (charges !== undefined) {
			const totalTime = this.elapsedTime.add(deltaTime);

			const totalNanos = totalTime.asNanos();
			const maxNanos = this.maxTime.asNanos();

			// Calculate how many complete cycles occurred
			const nCompleted = math.floor(totalNanos / maxNanos);
			const extraNanos = totalNanos % maxNanos;

			// Try to add the completed charges
			const excessCompletions = charges.addCharges(nCompleted);

			if (excessCompletions === 0) {
				// All charges were added, set elapsed to the remainder
				const remainderTime = Duration.fromNanos(extraNanos);
				this.elapsedTime = remainderTime.lessThan(this.maxTime) ? remainderTime : this.maxTime;
			} else {
				// Charges are full, set elapsed to max
				this.elapsedTime = this.maxTime;
			}
		} else {
			// No charges, just advance the timer
			const newElapsed = this.elapsedTime.add(deltaTime);
			this.elapsedTime = newElapsed.lessThan(this.maxTime) ? newElapsed : this.maxTime;
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
	 * Refreshes the cooldown, causing the underlying action to be ready to use immediately
	 */
	refresh(): void {
		this.elapsedTime = this.maxTime;
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