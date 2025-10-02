import type { Abilitylike } from "./abilitylike";
import { CannotUseAbility } from "./errors";

/**
 * How should charges be replenished when the cooldown finishes?
 */
export enum ReplenishStrategy {
	/**
	 * Replenish one charge at a time as each cooldown completes
	 */
	OneAtATime = "OneAtATime",

	/**
	 * Replenish all charges at once when the final cooldown completes
	 */
	AllAtOnce = "AllAtOnce",
}

/**
 * How should the cooldown be reset when a charge is used?
 */
export enum CooldownStrategy {
	/**
	 * Ignore cooldowns completely (charges are independent of cooldowns)
	 */
	Ignore = "Ignore",

	/**
	 * Reset the cooldown every time a charge is used
	 */
	ConstantlyRefresh = "ConstantlyRefresh",

	/**
	 * Only reset the cooldown when all charges are exhausted
	 */
	RefreshWhenEmpty = "RefreshWhenEmpty",
}

/**
 * A charge system that allows abilities to be used multiple times before going on cooldown
 */
export class Charges {
	private currentCharges: number;
	private maxCharges: number;

	/**
	 * How should charges be replenished?
	 */
	replenishStrategy: ReplenishStrategy;

	/**
	 * How should cooldowns interact with charges?
	 */
	cooldownStrategy: CooldownStrategy;

	/**
	 * Creates a new charge system
	 *
	 * @param maxCharges - The maximum number of charges
	 * @param replenishStrategy - How to replenish charges
	 * @param cooldownStrategy - How cooldowns interact with charges
	 */
	constructor(
		maxCharges: number,
		replenishStrategy: ReplenishStrategy = ReplenishStrategy.OneAtATime,
		cooldownStrategy: CooldownStrategy = CooldownStrategy.RefreshWhenEmpty,
	) {
		this.currentCharges = maxCharges;
		this.maxCharges = maxCharges;
		this.replenishStrategy = replenishStrategy;
		this.cooldownStrategy = cooldownStrategy;
	}

	/**
	 * Creates a simple charge system with independent charges
	 *
	 * @param maxCharges - The maximum number of charges
	 * @returns A new charges instance
	 */
	static simple(maxCharges: number): Charges {
		return new Charges(maxCharges, ReplenishStrategy.OneAtATime, CooldownStrategy.Ignore);
	}

	/**
	 * Creates a charge system that replenishes one charge at a time
	 *
	 * @param maxCharges - The maximum number of charges
	 * @returns A new charges instance
	 */
	static replenishOne(maxCharges: number): Charges {
		return new Charges(maxCharges, ReplenishStrategy.OneAtATime, CooldownStrategy.RefreshWhenEmpty);
	}

	/**
	 * Creates a charge system that replenishes all charges at once
	 *
	 * @param maxCharges - The maximum number of charges
	 * @returns A new charges instance
	 */
	static replenishAll(maxCharges: number): Charges {
		return new Charges(maxCharges, ReplenishStrategy.AllAtOnce, CooldownStrategy.RefreshWhenEmpty);
	}

	/**
	 * Creates a charge system for ammo-style charges (all at once, no cooldown interaction)
	 *
	 * @param maxCharges - The maximum number of charges
	 * @returns A new charges instance
	 */
	static ammo(maxCharges: number): Charges {
		return new Charges(maxCharges, ReplenishStrategy.AllAtOnce, CooldownStrategy.Ignore);
	}

	/**
	 * Gets the current number of charges
	 *
	 * @returns The current charge count
	 */
	charges(): number {
		return this.currentCharges;
	}

	/**
	 * Gets the maximum number of charges
	 *
	 * @returns The maximum charge count
	 */
	max(): number {
		return this.maxCharges;
	}

	/**
	 * Checks if there are charges available
	 *
	 * @returns True if charges are available
	 */
	available(): boolean {
		return this.currentCharges > 0;
	}

	/**
	 * Expends a charge
	 *
	 * @returns undefined if successful, CannotUseAbility.NoCharges if no charges available
	 */
	expend(): CannotUseAbility | undefined {
		if (!this.available()) {
			return CannotUseAbility.NoCharges;
		}

		this.currentCharges -= 1;
		return undefined;
	}

	/**
	 * Replenishes charges according to the replenish strategy
	 */
	replenish(): void {
		if (this.replenishStrategy === ReplenishStrategy.OneAtATime) {
			// Replenish one charge
			this.currentCharges = math.min(this.currentCharges + 1, this.maxCharges);
		} else if (this.replenishStrategy === ReplenishStrategy.AllAtOnce) {
			// Replenish all charges
			this.currentCharges = this.maxCharges;
		}
	}

	/**
	 * Adds charges, capping at max charges
	 *
	 * @param count - The number of charges to add
	 * @returns The number of excess charges (charges that couldn't be added due to the cap)
	 */
	addCharges(count: number): number {
		const newCharges = this.currentCharges + count;
		const excess = math.max(0, newCharges - this.maxCharges);
		this.currentCharges = math.min(newCharges, this.maxCharges);
		return excess;
	}

	/**
	 * Sets the current charges directly
	 *
	 * @param charges - The new charge count
	 * @returns The number of excess charges (charges that couldn't be set due to the cap)
	 */
	setCharges(charges: number): number {
		const excess = math.max(0, charges - this.maxCharges);
		this.currentCharges = math.clamp(charges, 0, this.maxCharges);
		return excess;
	}

	/**
	 * Sets the maximum charges
	 *
	 * @param maxCharges - The new maximum
	 */
	setMax(maxCharges: number): void {
		this.maxCharges = math.max(0, maxCharges);
		this.currentCharges = math.min(this.currentCharges, this.maxCharges);
	}

	/**
	 * Checks if the charges are full
	 *
	 * @returns True if at maximum charges
	 */
	isFull(): boolean {
		return this.currentCharges === this.maxCharges;
	}

	/**
	 * Checks if the charges are empty
	 *
	 * @returns True if no charges remaining
	 */
	isEmpty(): boolean {
		return this.currentCharges === 0;
	}
}

/**
 * Stores charge state for all abilities of type A
 */
export class ChargeState<A extends Abilitylike> {
	private chargesMap: Map<string, Charges>;

	/**
	 * Creates a new charge state
	 */
	constructor() {
		this.chargesMap = new Map();
	}

	/**
	 * Checks if the ability has available charges
	 *
	 * @param action - The ability to check
	 * @returns True if charges are available
	 */
	available(action: A): boolean {
		const charges = this.get(action);
		if (charges === undefined) {
			return true; // No charge system means always available
		}

		return charges.available();
	}

	/**
	 * Checks if the ability is ready (has charges)
	 *
	 * @param action - The ability to check
	 * @returns undefined if ready, CannotUseAbility.NoCharges if no charges available
	 */
	ready(action: A): CannotUseAbility | undefined {
		const charges = this.get(action);
		if (charges === undefined) {
			return undefined; // No charge system means always ready
		}

		if (!charges.available()) {
			return CannotUseAbility.NoCharges;
		}

		return undefined;
	}

	/**
	 * Expends a charge for the specified ability
	 *
	 * @param action - The ability to expend a charge for
	 * @returns undefined if successful, or an error if no charges available
	 */
	expend(action: A): CannotUseAbility | undefined {
		const charges = this.get(action);
		if (charges === undefined) {
			return undefined; // No charge system means always successful
		}

		return charges.expend();
	}

	/**
	 * Replenishes a charge for the specified ability
	 *
	 * @param action - The ability to replenish a charge for
	 */
	replenish(action: A): void {
		const charges = this.get(action);
		if (charges !== undefined) {
			charges.replenish();
		}
	}

	/**
	 * Gets the charges for a specific action
	 *
	 * @param action - The ability to get charges for
	 * @returns The charges if they exist, undefined otherwise
	 */
	get(action: A): Charges | undefined {
		return this.chargesMap.get(action.hash());
	}

	/**
	 * Gets the charges by action hash
	 *
	 * @param actionHash - The hash of the ability
	 * @returns The charges if they exist, undefined otherwise
	 */
	getByHash(actionHash: string): Charges | undefined {
		return this.chargesMap.get(actionHash);
	}

	/**
	 * Sets the charges for a specific action
	 *
	 * @param action - The ability to set charges for
	 * @param charges - The charges to set
	 * @returns This instance for method chaining
	 */
	set(action: A, charges: Charges): this {
		this.chargesMap.set(action.hash(), charges);
		return this;
	}

	/**
	 * Removes the charges for a specific action
	 *
	 * @param action - The ability to remove charges for
	 * @returns True if charges were removed
	 */
	remove(action: A): boolean {
		return this.chargesMap.delete(action.hash());
	}

	/**
	 * Clears all charges
	 */
	clear(): void {
		this.chargesMap.clear();
	}

	/**
	 * Gets the number of charge systems being tracked
	 *
	 * @returns The count of charge systems
	 */
	size(): number {
		return this.chargesMap.size();
	}
}