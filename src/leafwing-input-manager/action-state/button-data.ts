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
	}

	/**
	 * Creates a copy of this ButtonData
	 * @returns A new ButtonData instance with the same values
	 */
	public clone(): ButtonData {
		return new ButtonData(this.justPressed, this.justReleased);
	}
}