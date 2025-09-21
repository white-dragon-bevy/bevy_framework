/**
 * Time resource component for tracking game time
 */
export class Time {
	private _deltaTime: number = 0;
	private _elapsedTime: number = 0;
	private _frameCount: number = 0;
	private _timeScale: number = 1;
	private _isPaused: boolean = false;
	private _lastTime: number = os.clock();
	private _wrappedTime: number = 0;
	private _wrapPeriod: number = 3600; // 1 hour in seconds

	/**
	 * Get the time elapsed since the last frame in seconds
	 */
	public get deltaTime(): number {
		return this._deltaTime;
	}

	/**
	 * Get the total time elapsed since creation in seconds
	 */
	public get elapsedTime(): number {
		return this._elapsedTime;
	}

	/**
	 * Get the total number of frames
	 */
	public get frameCount(): number {
		return this._frameCount;
	}

	/**
	 * Get the current time scale
	 */
	public get timeScale(): number {
		return this._timeScale;
	}

	/**
	 * Check if time is paused
	 */
	public get isPaused(): boolean {
		return this._isPaused;
	}

	/**
	 * Get wrapped elapsed time to avoid precision loss
	 */
	public get wrappedTime(): number {
		return this._wrappedTime;
	}

	/**
	 * Set the time scale factor
	 * @param scale - The time scale factor (1.0 = normal speed)
	 */
	public setTimeScale(scale: number): void {
		this._timeScale = math.max(0, scale);
	}

	/**
	 * Pause time advancement
	 */
	public pause(): void {
		this._isPaused = true;
	}

	/**
	 * Resume time advancement
	 */
	public resume(): void {
		this._isPaused = false;
	}

	/**
	 * Set the wrap period for wrapped time
	 * @param period - Period in seconds before time wraps
	 */
	public setWrapPeriod(period: number): void {
		this._wrapPeriod = math.max(0.001, period);
	}

	/**
	 * Update the time system
	 * @param currentTime - Current time from os.clock()
	 */
	public update(currentTime?: number): void {
		const now = currentTime ?? os.clock();
		const rawDelta = now - this._lastTime;
		this._lastTime = now;

		if (this._isPaused) {
			this._deltaTime = 0;
			return;
		}

		this._deltaTime = rawDelta * this._timeScale;
		this._elapsedTime += this._deltaTime;
		this._frameCount++;

		// Update wrapped time
		this._wrappedTime += this._deltaTime;
		if (this._wrappedTime >= this._wrapPeriod) {
			this._wrappedTime = this._wrappedTime % this._wrapPeriod;
		}
	}

	/**
	 * Reset the time to initial state
	 */
	public reset(): void {
		this._deltaTime = 0;
		this._elapsedTime = 0;
		this._frameCount = 0;
		this._wrappedTime = 0;
		this._lastTime = os.clock();
	}
}

/**
 * Fixed time resource for fixed timestep updates
 */
export class FixedTime extends Time {
	private _timestep: number = 1 / 60; // 60 FPS by default
	private _accumulator: number = 0;
	private _maxAccumulation: number = 0.25; // Maximum time to accumulate

	/**
	 * Get the fixed timestep duration
	 */
	public get timestep(): number {
		return this._timestep;
	}

	/**
	 * Get the accumulated time
	 */
	public get accumulator(): number {
		return this._accumulator;
	}

	/**
	 * Set the fixed timestep
	 * @param timestep - The fixed timestep in seconds
	 */
	public setTimestep(timestep: number): void {
		this._timestep = math.max(0.001, timestep);
	}

	/**
	 * Set the maximum accumulation time
	 * @param maxTime - Maximum time to accumulate in seconds
	 */
	public setMaxAccumulation(maxTime: number): void {
		this._maxAccumulation = math.max(0, maxTime);
	}

	/**
	 * Accumulate time and check if fixed update should run
	 * @param deltaTime - Time to accumulate
	 * @returns Whether a fixed update should run
	 */
	public accumulate(deltaTime: number): boolean {
		if (this.isPaused) {
			return false;
		}

		this._accumulator += deltaTime;
		// Clamp accumulator to prevent spiral of death
		this._accumulator = math.min(this._accumulator, this._maxAccumulation);

		if (this._accumulator >= this._timestep) {
			this._accumulator -= this._timestep;
			super.update();
			return true;
		}

		return false;
	}

	/**
	 * Reset the accumulator
	 */
	public resetAccumulator(): void {
		this._accumulator = 0;
	}

	/**
	 * Override update to use fixed timestep
	 */
	public override update(): void {
		// Override parent's private properties through setter/getter
		const timestep = this._timestep * this.timeScale;
		(this as any)._deltaTime = timestep;
		(this as any)._elapsedTime += timestep;
		(this as any)._frameCount++;

		// Update wrapped time
		(this as any)._wrappedTime += timestep;
		const wrapPeriod = (this as any)._wrapPeriod;
		if ((this as any)._wrappedTime >= wrapPeriod) {
			(this as any)._wrappedTime = (this as any)._wrappedTime % wrapPeriod;
		}
	}
}

/**
 * Virtual time that can be paused and scaled independently
 */
export class VirtualTime extends Time {
	private _effectiveSpeed: number = 1;

	/**
	 * Get the effective speed (considering pause state)
	 */
	public get effectiveSpeed(): number {
		return this.isPaused ? 0 : this.timeScale;
	}

	/**
	 * Check if time was paused in the last update
	 */
	public wasPaused(): boolean {
		return this.deltaTime === 0 && !this.isPaused;
	}
}

/**
 * Real time that always advances at normal speed
 */
export class RealTime extends Time {
	constructor() {
		super();
		// Real time cannot be paused or scaled
	}

	/**
	 * Override pause to prevent pausing real time
	 */
	public pause(): void {
		// Real time cannot be paused
	}

	/**
	 * Override setTimeScale to prevent scaling real time
	 */
	public setTimeScale(_scale: number): void {
		// Real time cannot be scaled
	}
}
