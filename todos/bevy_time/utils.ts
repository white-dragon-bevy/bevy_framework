/**
 * Convert seconds to a Duration-like object
 * @param secs - Time in seconds
 * @returns Duration object with seconds and milliseconds
 */
export function secondsToDuration(secs: number): { secs: number; millis: number } {
	const wholeSecs = math.floor(secs);
	const millis = math.floor((secs - wholeSecs) * 1000);
	return { secs: wholeSecs, millis };
}

/**
 * Convert a Duration-like object to seconds
 * @param duration - Duration object
 * @returns Time in seconds
 */
export function durationToSeconds(duration: { secs: number; millis: number }): number {
	return duration.secs + duration.millis / 1000;
}

/**
 * Format time as HH:MM:SS
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
	const hours = math.floor(seconds / 3600);
	const minutes = math.floor((seconds % 3600) / 60);
	const secs = math.floor(seconds % 60);

	const pad = (n: number): string => {
		return n < 10 ? `0${n}` : `${n}`;
	};

	return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Format time as MM:SS.mmm
 * @param seconds - Time in seconds
 * @returns Formatted time string with milliseconds
 */
export function formatTimeWithMillis(seconds: number): string {
	const minutes = math.floor(seconds / 60);
	const secs = math.floor(seconds % 60);
	const millis = math.floor((seconds % 1) * 1000);

	const pad = (n: number, length = 2): string => {
		const str = `${n}`;
		return string.rep("0", math.max(0, length - str.size())) + str;
	};

	return `${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`;
}

/**
 * Clamp a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
	return math.max(min, math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Smooth step interpolation
 * @param edge0 - Lower edge
 * @param edge1 - Upper edge
 * @param x - Value to interpolate
 * @returns Smoothly interpolated value
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

/**
 * Check if a duration has elapsed
 * @param startTime - Start time from os.clock()
 * @param duration - Duration in seconds
 * @returns True if duration has elapsed
 */
export function hasElapsed(startTime: number, duration: number): boolean {
	return os.clock() - startTime >= duration;
}

/**
 * Create a simple frame rate counter
 */
export class FrameRateCounter {
	private frameCount = 0;
	private elapsedTime = 0;
	private currentFps = 0;
	private updateInterval = 1; // Update FPS every second

	/**
	 * Update the frame rate counter
	 * @param deltaTime - Time since last frame in seconds
	 */
	public update(deltaTime: number): void {
		this.frameCount++;
		this.elapsedTime += deltaTime;

		if (this.elapsedTime >= this.updateInterval) {
			this.currentFps = this.frameCount / this.elapsedTime;
			this.frameCount = 0;
			this.elapsedTime = 0;
		}
	}

	/**
	 * Get the current FPS
	 * @returns Current frames per second
	 */
	public getFps(): number {
		return this.currentFps;
	}

	/**
	 * Reset the counter
	 */
	public reset(): void {
		this.frameCount = 0;
		this.elapsedTime = 0;
		this.currentFps = 0;
	}
}

/**
 * Performance timer for measuring code execution time
 */
export class PerformanceTimer {
	private startTime: number;
	private name: string;

	/**
	 * Create a new performance timer
	 * @param name - Name of the timer
	 */
	constructor(name: string) {
		this.name = name;
		this.startTime = os.clock();
	}

	/**
	 * Stop the timer and return elapsed time
	 * @returns Elapsed time in seconds
	 */
	public stop(): number {
		const elapsed = os.clock() - this.startTime;
		return elapsed;
	}

	/**
	 * Stop the timer and print the result
	 */
	public stopAndPrint(): void {
		const elapsed = this.stop();
		const ms = elapsed * 1000;
		const rounded = math.floor(ms * 1000) / 1000; // Round to 3 decimal places
		print(`[${this.name}] took ${rounded}ms`);
	}

	/**
	 * Create and start a new performance timer
	 * @param name - Name of the timer
	 * @returns New performance timer
	 */
	public static start(name: string): PerformanceTimer {
		return new PerformanceTimer(name);
	}
}
