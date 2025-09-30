/**
 * Classifies UserInputs and Actionlike actions based on their behavior (buttons, analog axes, etc.).
 */
export enum InputControlKind {
	/**
	 * A single input with binary state (active or inactive), typically a button press (on or off).
	 *
	 * Corresponds to Buttonlike inputs.
	 */
	Button = "Button",

	/**
	 * A single analog or digital input, often used for range controls like a thumb stick on a gamepad or mouse wheel,
	 * providing a value within a min-max range.
	 *
	 * Corresponds to Axislike inputs.
	 */
	Axis = "Axis",

	/**
	 * A combination of two axis-like inputs, often used for directional controls like a D-pad on a gamepad,
	 * providing separate values for the X and Y axes.
	 *
	 * Corresponds to DualAxislike inputs.
	 */
	DualAxis = "DualAxis",

	/**
	 * A combination of three axis-like inputs, providing separate values for the X, Y and Z axes.
	 *
	 * Corresponds to TripleAxislike inputs.
	 */
	TripleAxis = "TripleAxis",
}
