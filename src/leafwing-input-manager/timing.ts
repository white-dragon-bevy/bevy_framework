import { Instant } from "./instant";

/**
 * Manages timing information for actions, tracking durations across state transitions
 */
export class Timing {
	/**
	 * The instant when the action was first started
	 */
	public instantStarted?: Instant;

	/**
	 * The current duration the action has been active
	 */
	public currentDuration: number = 0;

	/**
	 * The previous duration from the last frame
	 */
	public previousDuration: number = 0;

	/**
	 * Creates a new Timing instance
	 * @param instantStarted - The instant when timing started
	 * @param currentDuration - The current duration
	 * @param previousDuration - The previous duration
	 */
	constructor(
		instantStarted?: Instant,
		currentDuration: number = 0,
		previousDuration: number = 0,
	) {
		this.instantStarted = instantStarted;
		this.currentDuration = currentDuration;
		this.previousDuration = previousDuration;
	}

	/**
	 * Creates a default Timing instance
	 * @returns A new Timing instance with default values
	 */
	static default(): Timing {
		return new Timing();
	}

	/**
	 * Updates the timing information based on current and previous instants
	 * Following Rust implementation: if instant_started is None, set it and calculate from previous_instant
	 * @param currentInstant - The current instant
	 * @param previousInstant - The previous instant
	 */
	public tick(currentInstant: Instant, previousInstant: Instant): void {
		// Save the current duration as previous before updating
		this.previousDuration = this.currentDuration;

		if (this.instantStarted !== undefined) {
			// Calculate durations based on when the action started
			this.currentDuration = currentInstant.durationSince(this.instantStarted);
		} else {
			// Start timing from previous instant (matches Rust implementation)
			this.currentDuration = currentInstant.durationSince(previousInstant);
			this.instantStarted = previousInstant;
		}

		// Ensure non-negative values
		this.currentDuration = math.max(0, this.currentDuration);
	}

	/**
	 * Flips the timing state during action state transitions
	 * This should be called when actions change from pressed to released or vice versa
	 * According to Rust implementation: moves current to previous, resets current to zero, and clears start instant
	 */
	public flip(): void {
		this.previousDuration = this.currentDuration;
		this.currentDuration = 0;
		this.instantStarted = undefined;
	}

	/**
	 * Starts the timing from a specific instant
	 * @param instant - The instant to start timing from
	 */
	public start(instant: Instant): void {
		this.instantStarted = instant;
		this.currentDuration = 0;
		this.previousDuration = 0;
	}

	/**
	 * Stops the timing and resets all values
	 */
	public stop(): void {
		this.instantStarted = undefined;
		this.currentDuration = 0;
		this.previousDuration = 0;
	}

	/**
	 * Resets the timing to default values
	 */
	public reset(): void {
		this.instantStarted = undefined;
		this.currentDuration = 0;
		this.previousDuration = 0;
	}

	/**
	 * Checks if timing is currently active (started)
	 * @returns True if timing is active
	 */
	public isActive(): boolean {
		return this.instantStarted !== undefined;
	}

	/**
	 * Gets the current duration
	 * @returns The current duration in seconds
	 */
	public getCurrentDuration(): number {
		return this.currentDuration;
	}

	/**
	 * Gets the previous duration
	 * @returns The previous duration in seconds
	 */
	public getPreviousDuration(): number {
		return this.previousDuration;
	}

	/**
	 * Gets the instant when timing started
	 * @returns The starting instant, or undefined if not started
	 */
	public getStartInstant(): Instant | undefined {
		return this.instantStarted;
	}

	/**
	 * Creates a copy of this Timing instance
	 * @returns A new Timing instance with the same values
	 */
	public clone(): Timing {
		return new Timing(this.instantStarted, this.currentDuration, this.previousDuration);
	}
}