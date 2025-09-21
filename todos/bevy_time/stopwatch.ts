/**
 * Stopwatch that tracks elapsed time
 */
export class Stopwatch {
	private elapsed: number;
	private paused: boolean;

	/**
	 * Create a new stopwatch
	 * @param startPaused - Whether to start in paused state
	 */
	constructor(startPaused: boolean = false) {
		this.elapsed = 0;
		this.paused = startPaused;
	}

	/**
	 * Update the stopwatch with elapsed time
	 * @param deltaTime - Time elapsed since last tick in seconds
	 */
	public tick(deltaTime: number): void {
		if (!this.paused && deltaTime > 0) {
			this.elapsed += deltaTime;
		}
	}

	/**
	 * Get the elapsed time as Duration-like object
	 * @returns Object with elapsed time in various formats
	 */
	public elapsedDuration(): { secs: number; millis: number } {
		return {
			secs: math.floor(this.elapsed),
			millis: math.floor((this.elapsed % 1) * 1000),
		};
	}

	/**
	 * Get the elapsed time in seconds
	 * @returns Elapsed time in seconds
	 */
	public elapsedSecs(): number {
		return this.elapsed;
	}

	/**
	 * Get the elapsed time in seconds as f64 (for compatibility)
	 * @returns Elapsed time in seconds
	 */
	public elapsedSecsF64(): number {
		return this.elapsed;
	}

	/**
	 * Get the elapsed time in milliseconds
	 * @returns Elapsed time in milliseconds
	 */
	public elapsedMillis(): number {
		return this.elapsed * 1000;
	}

	/**
	 * Set the elapsed time directly
	 * @param secs - Elapsed time in seconds
	 */
	public setElapsed(secs: number): void {
		this.elapsed = math.max(0, secs);
	}

	/**
	 * Pause the stopwatch
	 */
	public pause(): void {
		this.paused = true;
	}

	/**
	 * Resume the stopwatch
	 */
	public resume(): void {
		this.paused = false;
	}

	/**
	 * Toggle between paused and resumed state
	 */
	public toggle(): void {
		this.paused = !this.paused;
	}

	/**
	 * Check if the stopwatch is paused
	 * @returns True if paused
	 */
	public isPaused(): boolean {
		return this.paused;
	}

	/**
	 * Reset the stopwatch to zero elapsed time
	 * The stopwatch remains in its current paused/resumed state
	 */
	public reset(): void {
		this.elapsed = 0;
	}

	/**
	 * Reset the stopwatch and pause it
	 */
	public resetAndPause(): void {
		this.elapsed = 0;
		this.paused = true;
	}

	/**
	 * Reset the stopwatch and resume it
	 */
	public resetAndResume(): void {
		this.elapsed = 0;
		this.paused = false;
	}

	/**
	 * Create a new stopwatch that starts running
	 * @returns A new running stopwatch
	 */
	public static new(): Stopwatch {
		return new Stopwatch(false);
	}

	/**
	 * Create a new stopwatch that starts paused
	 * @returns A new paused stopwatch
	 */
	public static newPaused(): Stopwatch {
		return new Stopwatch(true);
	}
}
