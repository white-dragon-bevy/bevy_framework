/**
 * Represents the direction of axis input
 *
 * This enum defines the two possible directions for a single axis:
 * - Negative: represents the negative direction (e.g., left, down) with value -1
 * - Positive: represents the positive direction (e.g., right, up) with value 1
 */
export enum AxisDirection {
	/**
	 * The negative direction of an axis (-1.0)
	 */
	Negative = -1,

	/**
	 * The positive direction of an axis (1.0)
	 */
	Positive = 1,
}

export namespace AxisDirection {
	/**
	 * Gets the full active value for this axis direction
	 * @param direction - The axis direction
	 * @returns -1.0 for Negative, 1.0 for Positive
	 */
	export function fullActiveValue(direction: AxisDirection): number {
		return direction as number;
	}

	/**
	 * Checks if the given value is active in this direction beyond the threshold
	 * @param direction - The axis direction to check
	 * @param value - The input value to test
	 * @param threshold - The minimum threshold for activation (default: 0.5)
	 * @returns True if the value is active in this direction
	 */
	export function isActive(direction: AxisDirection, value: number, threshold: number = 0.5): boolean {
		assert(threshold >= 0, "Threshold must be non-negative");
		assert(threshold <= 1, "Threshold must be <= 1");

		switch (direction) {
			case AxisDirection.Negative:
				return value <= -threshold;
			case AxisDirection.Positive:
				return value >= threshold;
			default:
				error(`Invalid AxisDirection: ${direction}`);
		}
	}

	/**
	 * Gets the opposite direction
	 * @param direction - The axis direction
	 * @returns The opposite axis direction
	 */
	export function opposite(direction: AxisDirection): AxisDirection {
		switch (direction) {
			case AxisDirection.Negative:
				return AxisDirection.Positive;
			case AxisDirection.Positive:
				return AxisDirection.Negative;
			default:
				error(`Invalid AxisDirection: ${direction}`);
		}
	}

	/**
	 * Converts a raw input value to the appropriate axis direction
	 * @param value - The input value
	 * @param threshold - The minimum threshold for direction detection (default: 0.1)
	 * @returns The axis direction, or undefined if below threshold
	 */
	export function fromValue(value: number, threshold: number = 0.1): AxisDirection | undefined {
		assert(threshold >= 0, "Threshold must be non-negative");
		assert(threshold <= 1, "Threshold must be <= 1");

		if (value >= threshold) {
			return AxisDirection.Positive;
		} else if (value <= -threshold) {
			return AxisDirection.Negative;
		}

		return undefined;
	}

	/**
	 * Gets a string representation of the axis direction
	 * @param direction - The axis direction
	 * @returns String representation
	 */
	export function toString(direction: AxisDirection): string {
		switch (direction) {
			case AxisDirection.Negative:
				return "Negative";
			case AxisDirection.Positive:
				return "Positive";
			default:
				error(`Invalid AxisDirection: ${direction}`);
		}
	}
}

/**
 * Represents the type of axis in a dual-axis system
 *
 * This enum defines which axis we're referring to:
 * - X: the horizontal axis
 * - Y: the vertical axis
 */
export enum DualAxisType {
	/**
	 * The X (horizontal) axis
	 */
	X = "X",

	/**
	 * The Y (vertical) axis
	 */
	Y = "Y",
}

export namespace DualAxisType {
	/**
	 * Gets both axis types as an array
	 * @returns Array containing [X, Y]
	 */
	export function axes(): [DualAxisType, DualAxisType] {
		return [DualAxisType.X, DualAxisType.Y];
	}

	/**
	 * Gets the directions for this axis type
	 * @param axisType - The axis type
	 * @returns Array containing [Negative, Positive] directions
	 */
	export function directions(axisType: DualAxisType): [AxisDirection, AxisDirection] {
		return [AxisDirection.Negative, AxisDirection.Positive];
	}

	/**
	 * Gets the negative direction for this axis type
	 * @param axisType - The axis type
	 * @returns The negative axis direction
	 */
	export function negative(axisType: DualAxisType): AxisDirection {
		return AxisDirection.Negative;
	}

	/**
	 * Gets the positive direction for this axis type
	 * @param axisType - The axis type
	 * @returns The positive axis direction
	 */
	export function positive(axisType: DualAxisType): AxisDirection {
		return AxisDirection.Positive;
	}

	/**
	 * Gets the value from a Vector2 for this axis type
	 * @param axisType - The axis type
	 * @param vector - The Vector2 to extract from
	 * @returns The value for this axis
	 */
	export function getValue(axisType: DualAxisType, vector: Vector2): number {
		switch (axisType) {
			case DualAxisType.X:
				return vector.X;
			case DualAxisType.Y:
				return vector.Y;
			default:
				error(`Invalid DualAxisType: ${axisType}`);
		}
	}

	/**
	 * Creates a Vector2 with the given value on this axis and 0 on the other
	 * @param axisType - The axis type
	 * @param value - The value to set on this axis
	 * @returns Vector2 with the value on the specified axis
	 */
	export function dualAxisValue(axisType: DualAxisType, value: number): Vector2 {
		switch (axisType) {
			case DualAxisType.X:
				return new Vector2(value, 0);
			case DualAxisType.Y:
				return new Vector2(0, value);
			default:
				error(`Invalid DualAxisType: ${axisType}`);
		}
	}

	/**
	 * Gets the opposite axis type
	 * @param axisType - The axis type
	 * @returns The opposite axis type
	 */
	export function opposite(axisType: DualAxisType): DualAxisType {
		switch (axisType) {
			case DualAxisType.X:
				return DualAxisType.Y;
			case DualAxisType.Y:
				return DualAxisType.X;
			default:
				error(`Invalid DualAxisType: ${axisType}`);
		}
	}

	/**
	 * Gets a string representation of the axis type
	 * @param axisType - The axis type
	 * @returns String representation
	 */
	export function toString(axisType: DualAxisType): string {
		return axisType;
	}
}

/**
 * Represents specific directions in a dual-axis system
 *
 * This enum combines axis type and direction into common directional concepts:
 * - Up: Y-axis positive direction
 * - Down: Y-axis negative direction
 * - Left: X-axis negative direction
 * - Right: X-axis positive direction
 */
export enum DualAxisDirection {
	/**
	 * Up direction (Y-axis positive)
	 */
	Up = "Up",

	/**
	 * Down direction (Y-axis negative)
	 */
	Down = "Down",

	/**
	 * Left direction (X-axis negative)
	 */
	Left = "Left",

	/**
	 * Right direction (X-axis positive)
	 */
	Right = "Right",
}

export namespace DualAxisDirection {
	/**
	 * Gets the axis type for this dual-axis direction
	 * @param direction - The dual-axis direction
	 * @returns The axis type (X for Left/Right, Y for Up/Down)
	 */
	export function axis(direction: DualAxisDirection): DualAxisType {
		switch (direction) {
			case DualAxisDirection.Left:
			case DualAxisDirection.Right:
				return DualAxisType.X;
			case DualAxisDirection.Up:
			case DualAxisDirection.Down:
				return DualAxisType.Y;
			default:
				error(`Invalid DualAxisDirection: ${direction}`);
		}
	}

	/**
	 * Gets the axis direction for this dual-axis direction
	 * @param direction - The dual-axis direction
	 * @returns The axis direction (Positive for Up/Right, Negative for Down/Left)
	 */
	export function axisDirection(direction: DualAxisDirection): AxisDirection {
		switch (direction) {
			case DualAxisDirection.Up:
			case DualAxisDirection.Right:
				return AxisDirection.Positive;
			case DualAxisDirection.Down:
			case DualAxisDirection.Left:
				return AxisDirection.Negative;
			default:
				error(`Invalid DualAxisDirection: ${direction}`);
		}
	}

	/**
	 * Gets the full active value for this direction as a Vector2
	 * @param direction - The dual-axis direction
	 * @returns Vector2 with 1.0/-1.0 in the appropriate axis and 0.0 in the other
	 */
	export function fullActiveValue(direction: DualAxisDirection): Vector2 {
		const axisType = axis(direction);
		const axisDir = axisDirection(direction);
		const value = AxisDirection.fullActiveValue(axisDir);
		return DualAxisType.dualAxisValue(axisType, value);
	}

	/**
	 * Checks if the given vector is active in this direction beyond the threshold
	 * @param direction - The dual-axis direction to check
	 * @param vector - The Vector2 input to test
	 * @param threshold - The minimum threshold for activation (default: 0.5)
	 * @returns True if the vector is active in this direction
	 */
	export function isActive(direction: DualAxisDirection, vector: Vector2, threshold: number = 0.5): boolean {
		const axisType = axis(direction);
		const axisDir = axisDirection(direction);
		const value = DualAxisType.getValue(axisType, vector);
		return AxisDirection.isActive(axisDir, value, threshold);
	}

	/**
	 * Gets the opposite direction
	 * @param direction - The dual-axis direction
	 * @returns The opposite dual-axis direction
	 */
	export function opposite(direction: DualAxisDirection): DualAxisDirection {
		switch (direction) {
			case DualAxisDirection.Up:
				return DualAxisDirection.Down;
			case DualAxisDirection.Down:
				return DualAxisDirection.Up;
			case DualAxisDirection.Left:
				return DualAxisDirection.Right;
			case DualAxisDirection.Right:
				return DualAxisDirection.Left;
			default:
				error(`Invalid DualAxisDirection: ${direction}`);
		}
	}

	/**
	 * Gets all dual-axis directions as an array
	 * @returns Array containing all four directions
	 */
	export function all(): Array<DualAxisDirection> {
		return [
			DualAxisDirection.Up,
			DualAxisDirection.Down,
			DualAxisDirection.Left,
			DualAxisDirection.Right,
		];
	}

	/**
	 * Gets the directions for a specific axis
	 * @param axisType - The axis type
	 * @returns Array of directions for that axis
	 */
	export function forAxis(axisType: DualAxisType): Array<DualAxisDirection> {
		switch (axisType) {
			case DualAxisType.X:
				return [DualAxisDirection.Left, DualAxisDirection.Right];
			case DualAxisType.Y:
				return [DualAxisDirection.Up, DualAxisDirection.Down];
			default:
				error(`Invalid DualAxisType: ${axisType}`);
		}
	}

	/**
	 * Converts a Vector2 to the most prominent dual-axis direction
	 * @param vector - The input vector
	 * @param threshold - The minimum threshold for direction detection (default: 0.1)
	 * @returns The most prominent direction, or undefined if below threshold
	 */
	export function fromVector(vector: Vector2, threshold: number = 0.1): DualAxisDirection | undefined {
		assert(threshold >= 0, "Threshold must be non-negative");
		assert(threshold <= 1, "Threshold must be <= 1");

		const absX = math.abs(vector.X);
		const absY = math.abs(vector.Y);

		// Find the axis with larger magnitude
		if (absX >= absY && absX >= threshold) {
			return vector.X >= 0 ? DualAxisDirection.Right : DualAxisDirection.Left;
		} else if (absY >= absX && absY >= threshold) {
			return vector.Y >= 0 ? DualAxisDirection.Up : DualAxisDirection.Down;
		}

		return undefined;
	}

	/**
	 * Gets a string representation of the dual-axis direction
	 * @param direction - The dual-axis direction
	 * @returns String representation
	 */
	export function toString(direction: DualAxisDirection): string {
		return direction;
	}
}