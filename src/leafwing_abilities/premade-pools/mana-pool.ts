import { Duration } from "../../bevy_time";

import { CannotUseAbility } from "../errors";
import { MaxPoolLessThanMinError, Pool, RegeneratingPool } from "../pool";

/**
 * A quantity of mana (magical power/MP)
 */
export class Mana {
	/**
	 * Creates a new mana quantity
	 *
	 * @param value - The mana value
	 */
	constructor(public readonly value: number) {}

	/**
	 * Adds two mana values
	 *
	 * @param other - The mana to add
	 * @returns The sum
	 */
	add(other: Mana): Mana {
		return new Mana(this.value + other.value);
	}

	/**
	 * Subtracts another mana value
	 *
	 * @param other - The mana to subtract
	 * @returns The difference
	 */
	sub(other: Mana): Mana {
		return new Mana(this.value - other.value);
	}

	/**
	 * Multiplies by a scalar
	 *
	 * @param scalar - The multiplier
	 * @returns The product
	 */
	mul(scalar: number): Mana {
		return new Mana(this.value * scalar);
	}

	/**
	 * Divides by a scalar
	 *
	 * @param scalar - The divisor
	 * @returns The quotient
	 */
	div(scalar: number): Mana {
		return new Mana(this.value / scalar);
	}

	/**
	 * Compares with another mana value
	 *
	 * @param other - The mana to compare with
	 * @returns True if equal
	 */
	equals(other: Mana): boolean {
		return this.value === other.value;
	}

	/**
	 * Checks if less than another mana value
	 *
	 * @param other - The mana to compare with
	 * @returns True if less than
	 */
	lessThan(other: Mana): boolean {
		return this.value < other.value;
	}

	/**
	 * Checks if greater than another mana value
	 *
	 * @param other - The mana to compare with
	 * @returns True if greater than
	 */
	greaterThan(other: Mana): boolean {
		return this.value > other.value;
	}

	/**
	 * Converts to string
	 *
	 * @returns String representation
	 */
	toString(): string {
		return tostring(this.value);
	}
}

/**
 * A pool of mana that can be spent and regenerated
 */
export class ManaPool implements RegeneratingPool {
	private currentValue: Mana;
	private maxValue: Mana;
	regenPerSecondValue: Mana;

	/**
	 * The minimum mana value (zero)
	 */
	static readonly MIN = new Mana(0);

	/**
	 * Creates a new mana pool
	 *
	 * @param current - The current mana
	 * @param max - The maximum mana
	 * @param regenPerSecond - The regeneration rate per second
	 */
	constructor(current: Mana, max: Mana, regenPerSecond: Mana) {
		assert(current.value <= max.value, "Current mana cannot exceed maximum");
		assert(current.value >= ManaPool.MIN.value, "Current mana cannot be negative");
		assert(max.value >= ManaPool.MIN.value, "Maximum mana cannot be negative");

		this.currentValue = current;
		this.maxValue = max;
		this.regenPerSecondValue = regenPerSecond;
	}

	/**
	 * Creates a new mana pool with simple values
	 *
	 * @param current - The current mana value
	 * @param max - The maximum mana value
	 * @param regenPerSecond - The regeneration rate per second
	 * @returns A new mana pool
	 */
	static simple(current: number, max: number, regenPerSecond: number = 0): ManaPool {
		return new ManaPool(new Mana(current), new Mana(max), new Mana(regenPerSecond));
	}

	// Pool interface implementation

	current(): number {
		return this.currentValue.value;
	}

	max(): number {
		return this.maxValue.value;
	}

	available(amount: number): CannotUseAbility | undefined {
		if (this.currentValue.value < amount) {
			return CannotUseAbility.PoolInsufficient;
		}

		return undefined;
	}

	expend(amount: number): CannotUseAbility | undefined {
		const availableError = this.available(amount);
		if (availableError !== undefined) {
			return availableError;
		}

		this.currentValue = this.currentValue.sub(new Mana(amount));
		return undefined;
	}

	replenish(amount: number): void {
		this.setCurrent(this.currentValue.value + amount);
	}

	setCurrent(value: number): number {
		const clampedValue = math.clamp(value, 0, this.maxValue.value);
		this.currentValue = new Mana(clampedValue);
		return clampedValue;
	}

	setMax(value: number): void {
		if (value < ManaPool.MIN.value) {
			throw new MaxPoolLessThanMinError();
		}

		this.maxValue = new Mana(value);
		// Clamp current to new max
		this.setCurrent(this.currentValue.value);
	}

	isFull(): boolean {
		return this.currentValue.equals(this.maxValue);
	}

	isEmpty(): boolean {
		return this.currentValue.equals(ManaPool.MIN);
	}

	// RegeneratingPool interface implementation

	regenPerSecond(): number {
		return this.regenPerSecondValue.value;
	}

	setRegenPerSecond(rate: number): void {
		this.regenPerSecondValue = new Mana(rate);
	}

	regenerate(deltaTime: Duration): void {
		const regenAmount = this.regenPerSecondValue.value * deltaTime.asSecsF32();
		this.replenish(regenAmount);
	}

	// Additional methods

	/**
	 * Gets the current mana as a Mana object
	 *
	 * @returns The current mana
	 */
	getCurrentMana(): Mana {
		return this.currentValue;
	}

	/**
	 * Gets the maximum mana as a Mana object
	 *
	 * @returns The maximum mana
	 */
	getMaxMana(): Mana {
		return this.maxValue;
	}

	/**
	 * Gets the mana percentage (0.0 to 1.0)
	 *
	 * @returns The mana percentage
	 */
	getPercentage(): number {
		if (this.maxValue.value === 0) {
			return 0;
		}

		return this.currentValue.value / this.maxValue.value;
	}

	/**
	 * Spends mana for casting a spell
	 *
	 * @param cost - The mana cost
	 * @returns True if the spell was cast (had enough mana)
	 */
	cast(cost: Mana): boolean {
		return this.expend(cost.value) === undefined;
	}

	/**
	 * Restores mana
	 *
	 * @param restoration - The mana to restore
	 */
	restore(restoration: Mana): void {
		this.replenish(restoration.value);
	}

	/**
	 * Converts to string format "current/max"
	 *
	 * @returns String representation
	 */
	toString(): string {
		return `${this.currentValue}/${this.maxValue}`;
	}
}