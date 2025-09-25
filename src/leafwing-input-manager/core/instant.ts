/**
 * A measurement of time at a specific instant
 */
export class Instant {
	private constructor(private readonly timestamp: number) {}

	/**
	 * Creates a new Instant representing the current time
	 * @returns A new Instant for the current time
	 */
	static now(): Instant {
		return new Instant(os.clock());
	}

	/**
	 * Creates an Instant from a specific timestamp
	 * @param timestamp - The timestamp value
	 * @returns A new Instant for the given timestamp
	 */
	static fromTimestamp(timestamp: number): Instant {
		return new Instant(timestamp);
	}

	/**
	 * Creates an Instant from elapsed seconds
	 * @param seconds - The elapsed seconds value
	 * @returns A new Instant for the given seconds
	 */
	static fromSeconds(seconds: number): Instant {
		return new Instant(seconds);
	}

	/**
	 * Calculates the duration since an earlier instant
	 * @param earlier - The earlier instant
	 * @returns The duration in seconds
	 */
	durationSince(earlier: Instant): number {
		return this.timestamp - earlier.timestamp;
	}

	/**
	 * Gets the raw timestamp value
	 * @returns The timestamp value
	 */
	getTimestamp(): number {
		return this.timestamp;
	}

	/**
	 * Gets the elapsed seconds since start of measurement
	 * @returns The elapsed seconds value
	 */
	elapsedSeconds(): number {
		return this.timestamp;
	}

	/**
	 * Checks if this instant is after another instant
	 * @param other - The other instant
	 * @returns True if this instant is after the other
	 */
	isAfter(other: Instant): boolean {
		return this.timestamp > other.timestamp;
	}

	/**
	 * Checks if this instant is before another instant
	 * @param other - The other instant
	 * @returns True if this instant is before the other
	 */
	isBefore(other: Instant): boolean {
		return this.timestamp < other.timestamp;
	}
}