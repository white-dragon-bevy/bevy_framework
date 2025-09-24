import { DualAxisProcessor } from "./dual-axis";

/**
 * Processor that applies a circular deadzone to dual-axis input
 */
export class CircleDeadzone implements DualAxisProcessor {
	/**
	 * Creates a circular deadzone processor
	 * @param radius - The deadzone radius (0.0 to 1.0)
	 */
	constructor(private readonly radius: number) {
		assert(radius >= 0, "Deadzone radius must be non-negative");
		assert(radius <= 1, "Deadzone radius must be <= 1");
	}

	/**
	 * Processes the input value by applying circular deadzone
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value with circular deadzone applied
	 */
	process(value: Vector2): Vector2 {
		const magnitude = value.Magnitude;
		if (magnitude < this.radius) {
			return Vector2.zero;
		}

		// Scale the remaining range to maintain full output range
		const scaledMagnitude = (magnitude - this.radius) / (1 - this.radius);
		const direction = value.Unit;
		return direction.mul(scaledMagnitude);
	}

	toString(): string {
		return `CircleDeadzone(${this.radius})`;
	}
}

/**
 * Processor that applies a square deadzone to dual-axis input
 */
export class SquareDeadzone implements DualAxisProcessor {
	/**
	 * Creates a square deadzone processor
	 * @param threshold - The deadzone threshold (0.0 to 1.0)
	 */
	constructor(private readonly threshold: number) {
		assert(threshold >= 0, "Deadzone threshold must be non-negative");
		assert(threshold <= 1, "Deadzone threshold must be <= 1");
	}

	/**
	 * Processes the input value by applying square deadzone
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value with square deadzone applied
	 */
	process(value: Vector2): Vector2 {
		const processedX = this.processAxis(value.X);
		const processedY = this.processAxis(value.Y);
		return new Vector2(processedX, processedY);
	}

	/**
	 * Processes a single axis value with the deadzone
	 * @param axisValue - The axis value to process
	 * @returns The processed axis value
	 */
	private processAxis(axisValue: number): number {
		const absoluteValue = math.abs(axisValue);
		if (absoluteValue < this.threshold) {
			return 0;
		}

		// Scale the remaining range to maintain full output range
		const sign = axisValue >= 0 ? 1 : -1;
		const scaledValue = (absoluteValue - this.threshold) / (1 - this.threshold);
		return sign * scaledValue;
	}

	toString(): string {
		return `SquareDeadzone(${this.threshold})`;
	}
}

/**
 * Processor that applies a cross deadzone to dual-axis input
 * This type of deadzone creates a cross-shaped dead area
 */
export class CrossDeadzone implements DualAxisProcessor {
	/**
	 * Creates a cross deadzone processor
	 * @param thresholdX - The X-axis deadzone threshold
	 * @param thresholdY - The Y-axis deadzone threshold (defaults to thresholdX if not provided)
	 */
	constructor(
		private readonly thresholdX: number,
		private readonly thresholdY: number = thresholdX,
	) {
		assert(thresholdX >= 0, "X deadzone threshold must be non-negative");
		assert(thresholdX <= 1, "X deadzone threshold must be <= 1");
		assert(thresholdY >= 0, "Y deadzone threshold must be non-negative");
		assert(thresholdY <= 1, "Y deadzone threshold must be <= 1");
	}

	/**
	 * Processes the input value by applying cross deadzone
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value with cross deadzone applied
	 */
	process(value: Vector2): Vector2 {
		const processedX = this.processAxis(value.X, this.thresholdX);
		const processedY = this.processAxis(value.Y, this.thresholdY);
		return new Vector2(processedX, processedY);
	}

	/**
	 * Processes a single axis value with the deadzone
	 * @param axisValue - The axis value to process
	 * @param threshold - The threshold for this axis
	 * @returns The processed axis value
	 */
	private processAxis(axisValue: number, threshold: number): number {
		const absoluteValue = math.abs(axisValue);
		if (absoluteValue < threshold) {
			return 0;
		}

		// Scale the remaining range to maintain full output range
		const sign = axisValue >= 0 ? 1 : -1;
		const scaledValue = (absoluteValue - threshold) / (1 - threshold);
		return sign * scaledValue;
	}

	toString(): string {
		if (this.thresholdX === this.thresholdY) {
			return `CrossDeadzone(${this.thresholdX})`;
		}
		return `CrossDeadzone(X:${this.thresholdX}, Y:${this.thresholdY})`;
	}
}

/**
 * Processor that applies an elliptical deadzone to dual-axis input
 */
export class EllipseDeadzone implements DualAxisProcessor {
	/**
	 * Creates an elliptical deadzone processor
	 * @param radiusX - The X-axis radius of the ellipse
	 * @param radiusY - The Y-axis radius of the ellipse (defaults to radiusX for circular)
	 */
	constructor(
		private readonly radiusX: number,
		private readonly radiusY: number = radiusX,
	) {
		assert(radiusX >= 0, "X radius must be non-negative");
		assert(radiusX <= 1, "X radius must be <= 1");
		assert(radiusY >= 0, "Y radius must be non-negative");
		assert(radiusY <= 1, "Y radius must be <= 1");
	}

	/**
	 * Processes the input value by applying elliptical deadzone
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value with elliptical deadzone applied
	 */
	process(value: Vector2): Vector2 {
		// Calculate if the point is inside the ellipse
		const normalizedX = value.X / this.radiusX;
		const normalizedY = value.Y / this.radiusY;
		const ellipseDistance = math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);

		if (ellipseDistance <= 1) {
			return Vector2.zero;
		}

		// Scale the vector to maintain direction but adjust magnitude
		const scale = (ellipseDistance - 1) / ellipseDistance;
		return new Vector2(value.X * scale, value.Y * scale);
	}

	toString(): string {
		if (this.radiusX === this.radiusY) {
			return `EllipseDeadzone(${this.radiusX})`;
		}
		return `EllipseDeadzone(X:${this.radiusX}, Y:${this.radiusY})`;
	}
}

/**
 * Helper function to create a circular deadzone processor
 * @param radius - The deadzone radius
 * @returns A CircleDeadzone processor
 */
export function circleDeadzone(radius: number): CircleDeadzone {
	return new CircleDeadzone(radius);
}

/**
 * Helper function to create a square deadzone processor
 * @param threshold - The deadzone threshold
 * @returns A SquareDeadzone processor
 */
export function squareDeadzone(threshold: number): SquareDeadzone {
	return new SquareDeadzone(threshold);
}

/**
 * Helper function to create a cross deadzone processor
 * @param thresholdX - The X-axis threshold
 * @param thresholdY - The Y-axis threshold (optional)
 * @returns A CrossDeadzone processor
 */
export function crossDeadzone(thresholdX: number, thresholdY?: number): CrossDeadzone {
	return new CrossDeadzone(thresholdX, thresholdY);
}

/**
 * Helper function to create an elliptical deadzone processor
 * @param radiusX - The X-axis radius
 * @param radiusY - The Y-axis radius (optional)
 * @returns An EllipseDeadzone processor
 */
export function ellipseDeadzone(radiusX: number, radiusY?: number): EllipseDeadzone {
	return new EllipseDeadzone(radiusX, radiusY);
}
