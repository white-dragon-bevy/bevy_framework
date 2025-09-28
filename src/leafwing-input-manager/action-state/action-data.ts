import { Instant } from "../instant";
import { Timing } from "../timing";

/**
 * The raw data of an action
 */
export class ActionData {
	/**
	 * Is the action currently pressed?
	 */
	public pressed: boolean;

	/**
	 * The value of the action
	 * On a scale of `0.0` to `1.0` for buttons
	 * Ranges from `-1.0` to `1.0` for axes
	 */
	public value: number;

	/**
	 * The "X" axis value of the action
	 * Only meaningful for axis-like actions
	 * Ranges from `-1.0` to `1.0`
	 */
	public axisPairX: number;

	/**
	 * The "Y" axis value of the action
	 * Only meaningful for axis-like actions
	 * Ranges from `-1.0` to `1.0`
	 */
	public axisPairY: number;

	/**
	 * When was the action was first pressed?
	 * Will be undefined if the action is not pressed
	 */
	public whenPressed?: Instant;

	/**
	 * The timing system for this action
	 */
	public timing: Timing;

	/**
	 * The accumulated duration the action has been pressed
	 * @deprecated Use timing.getCurrentDuration() instead
	 */
	public duration: number = 0;

	/**
	 * State that's swapped in during FixedUpdate schedule runs
	 * This allows input to work correctly with different update frequencies
	 */
	public fixedUpdateState?: ActionData;

	/**
	 * State that's active during normal Update schedule runs
	 * This is saved when switching to FixedUpdate
	 */
	public updateState?: ActionData;

	/**
	 * Creates a new ActionData with default values
	 * @param pressed - Initial pressed state
	 * @param value - Initial value
	 * @param axisPairX - Initial X axis value
	 * @param axisPairY - Initial Y axis value
	 * @param whenPressed - When the action was first pressed
	 */
	constructor(
		pressed: boolean = false,
		value: number = 0.0,
		axisPairX: number = 0.0,
		axisPairY: number = 0.0,
		whenPressed?: Instant,
	) {
		this.pressed = pressed;
		this.value = value;
		this.axisPairX = axisPairX;
		this.axisPairY = axisPairY;
		this.whenPressed = whenPressed;
		this.timing = Timing.default();
		this.duration = 0;
	}

	/**
	 * Creates a new ActionData with default values
	 * @returns A new ActionData instance with default values
	 */
	static default(): ActionData {
		return new ActionData();
	}

	/**
	 * Resets the action data to default values
	 */
	public reset(): void {
		this.pressed = false;
		this.value = 0.0;
		this.axisPairX = 0.0;
		this.axisPairY = 0.0;
		this.whenPressed = undefined;
		this.timing.reset();
		this.duration = 0;
		this.fixedUpdateState = undefined;
		this.updateState = undefined;
	}

	/**
	 * Updates the action data with new values
	 * @param pressed - New pressed state
	 * @param value - New value
	 * @param axisPairX - New X axis value
	 * @param axisPairY - New Y axis value
	 */
	public update(pressed: boolean, value: number, axisPairX: number = 0.0, axisPairY: number = 0.0): void {
		const wasPressed = this.pressed;
		this.pressed = pressed;
		this.value = value;
		this.axisPairX = axisPairX;
		this.axisPairY = axisPairY;

		// Update timing information based on state changes
		if (pressed && !wasPressed) {
			// Action just started - flip timing to capture previous state, then start new timing
			this.timing.flip();
			const currentInstant = Instant.now();
			this.timing.start(currentInstant);
			this.whenPressed = currentInstant;
			this.duration = 0;
		} else if (!pressed && wasPressed) {
			// Action just stopped - flip timing to move current duration to previous
			this.timing.flip();
			this.whenPressed = undefined;
			this.duration = 0;
		}
	}

	/**
	 * Gets the duration the action has been pressed
	 * @returns The duration in seconds, or 0 if not pressed
	 */
	public getCurrentDuration(): number {
		if (!this.pressed) {
			return 0.0;
		}

		// Return timing.currentDuration if available, otherwise fall back to duration
		// This ensures compatibility with both instant-based and delta-based timing
		if (this.timing.isActive()) {
			return this.timing.getCurrentDuration();
		}

		return this.duration;
	}

	/**
	 * Gets the previous frame's duration the action was pressed
	 * This returns the duration from the last time the action was active
	 * @returns The previous duration in seconds
	 */
	public getPreviousDuration(): number {
		return this.timing.getPreviousDuration();
	}

	/**
	 * Updates the timing for actions using instant-based tracking
	 * @param currentInstant - Current time instant
	 * @param previousInstant - Previous time instant
	 */
	public tick(currentInstant: Instant, previousInstant: Instant): void {
		if (this.pressed) {
			// Update timing with current and previous instants
			this.timing.tick(currentInstant, previousInstant);
			// Keep legacy duration updated for backward compatibility
			this.duration = this.timing.getCurrentDuration();
		} else {
			// Ensure timing is stopped when not pressed
			if (this.timing.isActive()) {
				this.timing.stop();
				this.duration = 0;
			}
		}
	}

	/**
	 * Updates the duration for pressed actions using delta time
	 * @param deltaTime - Time since last update in seconds
	 * @deprecated Use tick(currentInstant, previousInstant) for more accurate timing
	 */
	public tickDelta(deltaTime: number): void {
		if (this.pressed) {
			this.duration += deltaTime;
		}
	}

	/**
	 * Gets the axis pair as a Vector2-like object
	 * @returns An object with x and y properties
	 */
	public getAxisPair(): { x: number; y: number } {
		return { x: this.axisPairX, y: this.axisPairY };
	}

	/**
	 * Swaps the current state to FixedUpdate state
	 * This is used when transitioning from Update to FixedUpdate schedules
	 */
	public swapToFixedUpdateState(): void {
		// Save current state as updateState
		if (!this.updateState) {
			this.updateState = this.clone();
		} else {
			// Update the saved update state with current values
			this.updateState.copyFrom(this);
		}

		// Initialize fixedUpdateState if it doesn't exist, or copy from it if it exists
		if (!this.fixedUpdateState) {
			this.fixedUpdateState = new ActionData();
			// Reset current state to default for fixed update
			this.pressed = false;
			this.value = 0.0;
			this.axisPairX = 0.0;
			this.axisPairY = 0.0;
			this.whenPressed = undefined;
			this.duration = 0;
		} else {
			// Swap to existing fixed update state
			this.copyFrom(this.fixedUpdateState);
		}
	}

	/**
	 * Swaps back to Update state from FixedUpdate state
	 * This is used when transitioning from FixedUpdate to Update schedules
	 */
	public swapToUpdateState(): void {
		// Save current (fixed update) state
		if (!this.fixedUpdateState) {
			this.fixedUpdateState = new ActionData();
		}
		this.fixedUpdateState.copyFrom(this);

		// Restore update state
		if (this.updateState) {
			this.copyFrom(this.updateState);
		} else {
			// If no saved update state, reset to default values
			this.pressed = false;
			this.value = 0.0;
			this.axisPairX = 0.0;
			this.axisPairY = 0.0;
			this.whenPressed = undefined;
			this.duration = 0;
		}
	}

	/**
	 * Legacy method name for backward compatibility
	 * @deprecated Use swapToFixedUpdateState() instead
	 */
	public swapToFixedUpdate(): void {
		this.swapToFixedUpdateState();
	}

	/**
	 * Legacy method name for backward compatibility
	 * @deprecated Use swapToUpdateState() instead
	 */
	public swapToUpdate(): void {
		this.swapToUpdateState();
	}

	/**
	 * Copies data from another ActionData instance
	 * @param other - The ActionData to copy from
	 */
	public copyFrom(other: ActionData): void {
		this.pressed = other.pressed;
		this.value = other.value;
		this.axisPairX = other.axisPairX;
		this.axisPairY = other.axisPairY;
		this.whenPressed = other.whenPressed;
		this.timing = other.timing.clone();
		this.duration = other.duration;
	}

	/**
	 * Creates a copy of this ActionData
	 * @returns A new ActionData instance with the same values
	 */
	public clone(): ActionData {
		const cloned = new ActionData(this.pressed, this.value, this.axisPairX, this.axisPairY, this.whenPressed);
		cloned.timing = this.timing.clone();
		cloned.duration = this.duration;
		return cloned;
	}
}
