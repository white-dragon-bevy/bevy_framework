/**
 * Classifies user inputs and actionlike actions based on their behavior
 */
export enum InputControlKind {
	/**
	 * A single input with binary state (active or inactive), typically a button press (on or off)
	 */
	Button = "Button",

	/**
	 * A single analog or digital input, providing a value within a min-max range
	 */
	Axis = "Axis",

	/**
	 * A combination of two axis-like inputs, providing separate values for the X and Y axes
	 */
	DualAxis = "DualAxis",

	/**
	 * A combination of three axis-like inputs, providing separate values for the X, Y and Z axes
	 */
	TripleAxis = "TripleAxis",
}