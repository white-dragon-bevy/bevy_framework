import { Instant } from "../core/instant";

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
	 * The accumulated duration the action has been pressed
	 */
	public duration: number = 0;

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
		this.duration = 0;
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

		// Update timing information
		if (pressed && !wasPressed) {
			this.whenPressed = Instant.now();
			this.duration = 0;
		} else if (!pressed && wasPressed) {
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
		return this.duration;
	}

	/**
	 * Updates the duration for pressed actions
	 * @param deltaTime - Time since last update in seconds
	 */
	public tick(deltaTime: number): void {
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
	 * Creates a copy of this ActionData
	 * @returns A new ActionData instance with the same values
	 */
	public clone(): ActionData {
		return new ActionData(this.pressed, this.value, this.axisPairX, this.axisPairY, this.whenPressed);
	}
}
