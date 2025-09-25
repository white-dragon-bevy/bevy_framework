/**
 * Button-specific state data that tracks just-pressed and just-released states
 */
export class ButtonData {
	/**
	 * Was the button pressed this frame?
	 */
	public justPressed: boolean;

	/**
	 * Was the button released this frame?
	 */
	public justReleased: boolean;

	/**
	 * State that's swapped in during FixedUpdate schedule runs
	 * This maintains separate state for fixed timestep operations
	 */
	public fixedUpdateState?: ButtonData;

	/**
	 * State that's active during normal Update schedule runs
	 * This is saved when switching to FixedUpdate
	 */
	public updateState?: ButtonData;

	/**
	 * Creates a new ButtonData instance
	 * @param justPressed - Initial just-pressed state
	 * @param justReleased - Initial just-released state
	 */
	constructor(justPressed: boolean = false, justReleased: boolean = false) {
		this.justPressed = justPressed;
		this.justReleased = justReleased;
	}

	/**
	 * Creates a default ButtonData instance
	 * @returns A new ButtonData with default values
	 */
	static default(): ButtonData {
		return new ButtonData();
	}

	/**
	 * Updates the button data based on current and previous pressed state
	 * @param currentPressed - Is the button currently pressed?
	 * @param previousPressed - Was the button pressed last frame?
	 */
	public update(currentPressed: boolean, previousPressed: boolean): void {
		this.justPressed = currentPressed && !previousPressed;
		this.justReleased = !currentPressed && previousPressed;
	}

	/**
	 * Advances to the next frame, clearing just-pressed and just-released states
	 */
	public tick(): void {
		this.justPressed = false;
		this.justReleased = false;
	}

	/**
	 * Resets the button data to default state
	 */
	public reset(): void {
		this.justPressed = false;
		this.justReleased = false;
		this.fixedUpdateState = undefined;
		this.updateState = undefined;
	}

	/**
	 * Swaps the current state to FixedUpdate state
	 * This is used when transitioning from Update to FixedUpdate schedules
	 */
	public swapToFixedUpdateState(): void {
		// Save current state as updateState if not already saved
		if (!this.updateState) {
			this.updateState = this.clone();
		} else {
			// Update the saved update state with current values
			this.updateState.copyFrom(this);
		}

		// Initialize fixedUpdateState if it doesn't exist
		if (!this.fixedUpdateState) {
			this.fixedUpdateState = new ButtonData();
		}

		// Swap to fixed update state
		this.copyFrom(this.fixedUpdateState);
	}

	/**
	 * Legacy method name for backward compatibility
	 * @deprecated Use swapToFixedUpdateState() instead
	 */
	public swapToFixedUpdate(): void {
		this.swapToFixedUpdateState();
	}

	/**
	 * Swaps back to Update state from FixedUpdate state
	 * This is used when transitioning from FixedUpdate to Update schedules
	 */
	public swapToUpdateState(): void {
		// Save current (fixed update) state
		if (this.fixedUpdateState) {
			this.fixedUpdateState.copyFrom(this);
		}

		// Restore update state
		if (this.updateState) {
			this.copyFrom(this.updateState);
		} else {
			// If no saved update state, reset to default
			this.justPressed = false;
			this.justReleased = false;
		}
	}

	/**
	 * Legacy method name for backward compatibility
	 * @deprecated Use swapToUpdateState() instead
	 */
	public swapToUpdate(): void {
		this.swapToUpdateState();
	}

	/**
	 * Copies data from another ButtonData instance
	 * @param other - The ButtonData to copy from
	 */
	public copyFrom(other: ButtonData): void {
		this.justPressed = other.justPressed;
		this.justReleased = other.justReleased;
	}

	/**
	 * Creates a copy of this ButtonData
	 * @returns A new ButtonData instance with the same values
	 */
	public clone(): ButtonData {
		return new ButtonData(this.justPressed, this.justReleased);
	}
}