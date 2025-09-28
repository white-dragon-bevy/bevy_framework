/**
 * Represents a specific moment in time
 */
export class Instant {
	private readonly timestamp: number;

	constructor(timestamp?: number) {
		this.timestamp = timestamp ?? os.clock();
	}

	/**
	 * Creates an Instant representing the current moment
	 * @returns A new Instant for now
	 */
	static now(): Instant {
		return new Instant();
	}

	/**
	 * Creates an Instant from a specific timestamp
	 * @param timestamp - The timestamp in seconds
	 * @returns A new Instant with the given timestamp
	 */
	static fromTimestamp(timestamp: number): Instant {
		return new Instant(timestamp);
	}

	/**
	 * Gets the timestamp value
	 * @returns The timestamp in seconds
	 */
	getTimestamp(): number {
		return this.timestamp;
	}

	/**
	 * Calculates the duration elapsed since this instant
	 * @returns The elapsed time in seconds
	 */
	elapsed(): number {
		return os.clock() - this.timestamp;
	}

	/**
	 * Calculates the duration between this instant and another
	 * @param other - The other instant
	 * @returns The duration in seconds
	 */
	duration(other: Instant): number {
		return math.abs(this.timestamp - other.timestamp);
	}

	/**
	 * Calculates the duration since another instant
	 * @param other - The other instant
	 * @returns The duration in seconds (positive if this is after other)
	 */
	durationSince(other: Instant): number {
		return this.timestamp - other.timestamp;
	}

	/**
	 * Checks if this instant is before another
	 * @param other - The other instant
	 * @returns True if this instant is before the other
	 */
	isBefore(other: Instant): boolean {
		return this.timestamp < other.timestamp;
	}

	/**
	 * Checks if this instant is after another
	 * @param other - The other instant
	 * @returns True if this instant is after the other
	 */
	isAfter(other: Instant): boolean {
		return this.timestamp > other.timestamp;
	}
}