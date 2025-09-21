import { Stopwatch } from "./stopwatch";

/**
 * Timer mode - either runs once or repeats
 */
export enum TimerMode {
	/**
	 * Timer runs once and stops when finished
	 */
	Once,
	/**
	 * Timer repeats indefinitely
	 */
	Repeating,
}

/**
 * Timer that tracks elapsed time and triggers when duration is reached
 */
export class Timer {
	private stopwatch: Stopwatch;
	private duration: number;
	private mode: TimerMode;
	private finished: boolean;
	private timesFinishedThisTick: number;

	/**
	 * Create a new timer
	 * @param duration - Duration in seconds
	 * @param mode - Timer mode (Once or Repeating)
	 */
	constructor(duration: number, mode: TimerMode = TimerMode.Once) {
		this.stopwatch = new Stopwatch();
		this.duration = math.max(0.001, duration);
		this.mode = mode;
		this.finished = false;
		this.timesFinishedThisTick = 0;
	}

	/**
	 * Create a timer from seconds
	 * @param duration - Duration in seconds
	 * @param repeating - Whether the timer repeats
	 * @returns A new Timer instance
	 */
	public static fromSeconds(duration: number, repeating: boolean = false): Timer {
		return new Timer(duration, repeating ? TimerMode.Repeating : TimerMode.Once);
	}

	/**
	 * Update the timer with the elapsed time
	 * @param deltaTime - Time elapsed since last tick in seconds
	 */
	public tick(deltaTime: number): void {
		if (this.mode === TimerMode.Once && this.finished) {
			// Non-repeating timer that already finished
			this.timesFinishedThisTick = 0;
			return;
		}

		this.stopwatch.tick(deltaTime);
		this.timesFinishedThisTick = 0;

		const elapsed = this.stopwatch.elapsedSecs();

		if (this.mode === TimerMode.Repeating) {
			// Check how many times the timer finished this tick
			while (this.stopwatch.elapsedSecs() >= this.duration) {
				this.stopwatch.setElapsed(this.stopwatch.elapsedSecs() - this.duration);
				this.timesFinishedThisTick++;
			}
			this.finished = this.timesFinishedThisTick > 0;
		} else {
			// Once mode
			if (elapsed >= this.duration) {
				this.finished = true;
				this.timesFinishedThisTick = 1;
				// Clamp elapsed time to duration for once mode
				this.stopwatch.setElapsed(this.duration);
			}
		}
	}

	/**
	 * Check if the timer has finished
	 * @returns True if the timer has finished
	 */
	public isFinished(): boolean {
		return this.finished;
	}

	/**
	 * Check if the timer just finished this tick
	 * @returns True if the timer just finished
	 */
	public justFinished(): boolean {
		return this.timesFinishedThisTick > 0;
	}

	/**
	 * Get the number of times the timer finished this tick
	 * @returns Number of times finished (0 for non-repeating timers)
	 */
	public timesFinished(): number {
		return this.timesFinishedThisTick;
	}

	/**
	 * Get the elapsed time on the timer
	 * @returns Elapsed time in seconds
	 */
	public elapsed(): number {
		return this.stopwatch.elapsedSecs();
	}

	/**
	 * Get the remaining time on the timer
	 * @returns Remaining time in seconds
	 */
	public remaining(): number {
		return math.max(0, this.duration - this.elapsed());
	}

	/**
	 * Get the timer duration
	 * @returns Duration in seconds
	 */
	public getDuration(): number {
		return this.duration;
	}

	/**
	 * Set a new duration for the timer
	 * @param duration - New duration in seconds
	 */
	public setDuration(duration: number): void {
		this.duration = math.max(0.001, duration);
	}

	/**
	 * Get the timer mode
	 * @returns Timer mode
	 */
	public getMode(): TimerMode {
		return this.mode;
	}

	/**
	 * Set the timer mode
	 * @param mode - New timer mode
	 */
	public setMode(mode: TimerMode): void {
		this.mode = mode;
		if (mode === TimerMode.Once && this.finished) {
			// If switching to Once mode and already finished, stay finished
			this.stopwatch.setElapsed(this.duration);
		}
	}

	/**
	 * Get the completion percentage
	 * @returns Percentage from 0.0 to 1.0
	 */
	public percentComplete(): number {
		if (this.duration === 0) {
			return 1;
		}
		return math.min(1, this.elapsed() / this.duration);
	}

	/**
	 * Get the remaining percentage
	 * @returns Percentage from 0.0 to 1.0
	 */
	public percentRemaining(): number {
		return 1 - this.percentComplete();
	}

	/**
	 * Reset the timer
	 */
	public reset(): void {
		this.stopwatch.reset();
		this.finished = false;
		this.timesFinishedThisTick = 0;
	}

	/**
	 * Pause the timer
	 */
	public pause(): void {
		this.stopwatch.pause();
	}

	/**
	 * Resume the timer
	 */
	public resume(): void {
		this.stopwatch.resume();
	}

	/**
	 * Check if the timer is paused
	 * @returns True if paused
	 */
	public isPaused(): boolean {
		return this.stopwatch.isPaused();
	}

	/**
	 * Set the elapsed time directly
	 * @param elapsed - Elapsed time in seconds
	 */
	public setElapsed(elapsed: number): void {
		this.stopwatch.setElapsed(elapsed);
		if (this.mode === TimerMode.Once && elapsed >= this.duration) {
			this.finished = true;
			this.stopwatch.setElapsed(this.duration);
		}
	}
}
