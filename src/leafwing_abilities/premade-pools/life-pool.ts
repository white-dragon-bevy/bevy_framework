import { Duration } from "../../bevy_time";

import { CannotUseAbility } from "../errors";
import { MaxPoolLessThanMinError, Pool, RegeneratingPool } from "../pool";

/**
 * A quantity of life (health/HP)
 */
export class Life {
	/**
	 * Creates a new life quantity
	 *
	 * @param value - The life value
	 */
	constructor(public readonly value: number) {}

	/**
	 * Adds two life values
	 *
	 * @param other - The life to add
	 * @returns The sum
	 */
	add(other: Life): Life {
		return new Life(this.value + other.value);
	}

	/**
	 * Subtracts another life value
	 *
	 * @param other - The life to subtract
	 * @returns The difference
	 */
	sub(other: Life): Life {
		return new Life(this.value - other.value);
	}

	/**
	 * Multiplies by a scalar
	 *
	 * @param scalar - The multiplier
	 * @returns The product
	 */
	mul(scalar: number): Life {
		return new Life(this.value * scalar);
	}

	/**
	 * Divides by a scalar
	 *
	 * @param scalar - The divisor
	 * @returns The quotient
	 */
	div(scalar: number): Life {
		return new Life(this.value / scalar);
	}

	/**
	 * Compares with another life value
	 *
	 * @param other - The life to compare with
	 * @returns True if equal
	 */
	equals(other: Life): boolean {
		return this.value === other.value;
	}

	/**
	 * Checks if less than another life value
	 *
	 * @param other - The life to compare with
	 * @returns True if less than
	 */
	lessThan(other: Life): boolean {
		return this.value < other.value;
	}

	/**
	 * Checks if greater than another life value
	 *
	 * @param other - The life to compare with
	 * @returns True if greater than
	 */
	greaterThan(other: Life): boolean {
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
 * A pool of life (health) that can be damaged and healed
 */
export class LifePool implements RegeneratingPool {
	private currentValue: Life;
	private maxValue: Life;
	regenPerSecondValue: Life;

	/**
	 * The minimum life value (zero)
	 */
	static readonly MIN = new Life(0);

	/**
	 * Creates a new life pool
	 *
	 * @param current - The current life
	 * @param max - The maximum life
	 * @param regenPerSecond - The regeneration rate per second
	 */
	constructor(current: Life, max: Life, regenPerSecond: Life) {
		assert(current.value <= max.value, "Current life cannot exceed maximum");
		assert(current.value >= LifePool.MIN.value, "Current life cannot be negative");
		assert(max.value >= LifePool.MIN.value, "Maximum life cannot be negative");

		this.currentValue = current;
		this.maxValue = max;
		this.regenPerSecondValue = regenPerSecond;
	}

	/**
	 * Creates a new life pool with simple values
	 *
	 * @param current - The current life value
	 * @param max - The maximum life value
	 * @param regenPerSecond - The regeneration rate per second
	 * @returns A new life pool
	 */
	static simple(current: number, max: number, regenPerSecond: number = 0): LifePool {
		return new LifePool(new Life(current), new Life(max), new Life(regenPerSecond));
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

		this.currentValue = this.currentValue.sub(new Life(amount));
		return undefined;
	}

	replenish(amount: number): void {
		this.setCurrent(this.currentValue.value + amount);
	}

	setCurrent(value: number): number {
		const clampedValue = math.clamp(value, 0, this.maxValue.value);
		this.currentValue = new Life(clampedValue);
		return clampedValue;
	}

	setMax(value: number): void {
		if (value < LifePool.MIN.value) {
			throw new MaxPoolLessThanMinError();
		}

		this.maxValue = new Life(value);
		// Clamp current to new max
		this.setCurrent(this.currentValue.value);
	}

	isFull(): boolean {
		return this.currentValue.equals(this.maxValue);
	}

	isEmpty(): boolean {
		return this.currentValue.equals(LifePool.MIN);
	}

	// RegeneratingPool interface implementation

	regenPerSecond(): number {
		return this.regenPerSecondValue.value;
	}

	setRegenPerSecond(rate: number): void {
		this.regenPerSecondValue = new Life(rate);
	}

	regenerate(deltaTime: Duration): void {
		const regenAmount = this.regenPerSecondValue.value * deltaTime.asSecsF32();
		this.replenish(regenAmount);
	}

	// Additional methods

	/**
	 * Gets the current life as a Life object
	 *
	 * @returns The current life
	 */
	getCurrentLife(): Life {
		return this.currentValue;
	}

	/**
	 * Gets the maximum life as a Life object
	 *
	 * @returns The maximum life
	 */
	getMaxLife(): Life {
		return this.maxValue;
	}

	/**
	 * Gets the life percentage (0.0 to 1.0)
	 *
	 * @returns The life percentage
	 */
	getPercentage(): number {
		if (this.maxValue.value === 0) {
			return 0;
		}

		return this.currentValue.value / this.maxValue.value;
	}

	/**
	 * Damages the pool by the specified amount
	 * Unlike expend(), this will always succeed and clamp to minimum (0)
	 *
	 * @param damage - The damage to apply
	 */
	takeDamage(damage: Life): void {
		this.setCurrent(this.currentValue.value - damage.value);
	}

	/**
	 * Heals the pool by the specified amount
	 *
	 * @param healing - The healing to apply
	 */
	heal(healing: Life): void {
		this.replenish(healing.value);
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