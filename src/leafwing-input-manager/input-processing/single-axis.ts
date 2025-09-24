/**
 * Interface for processing single-axis input values
 */
export interface SingleAxisProcessor {
	/**
	 * Processes a single axis input value
	 * @param value - The input value to process
	 * @returns The processed value
	 */
	process(value: number): number;

	/**
	 * Returns a string representation of the processor
	 * @returns String representation
	 */
	toString(): string;
}

/**
 * Processor that applies a deadzone to an axis
 */
export class AxisDeadzone implements SingleAxisProcessor {
	/**
	 * Creates an axis deadzone processor
	 * @param threshold - The deadzone threshold (values below this are set to 0)
	 */
	constructor(private readonly threshold: number) {
		assert(threshold >= 0, "Deadzone threshold must be non-negative");
		assert(threshold <= 1, "Deadzone threshold must be <= 1");
	}

	/**
	 * Processes the input value by applying deadzone
	 * @param value - The input value to process
	 * @returns The processed value with deadzone applied
	 */
	process(value: number): number {
		const absoluteValue = math.abs(value);
		if (absoluteValue < this.threshold) {
			return 0;
		}

		// Scale the remaining range to maintain full output range
		const sign = value >= 0 ? 1 : -1;
		const scaledValue = (absoluteValue - this.threshold) / (1 - this.threshold);
		return sign * scaledValue;
	}

	toString(): string {
		return `AxisDeadzone(${this.threshold})`;
	}
}

/**
 * Processor that applies sensitivity scaling to an axis
 */
export class AxisSensitivity implements SingleAxisProcessor {
	/**
	 * Creates an axis sensitivity processor
	 * @param factor - The sensitivity multiplier
	 */
	constructor(private readonly factor: number) {
		assert(factor > 0, "Sensitivity factor must be positive");
	}

	/**
	 * Processes the input value by applying sensitivity scaling
	 * @param value - The input value to process
	 * @returns The processed value with sensitivity applied
	 */
	process(value: number): number {
		const result = value * this.factor;
		return math.clamp(result, -1, 1);
	}

	toString(): string {
		return `AxisSensitivity(${this.factor})`;
	}
}

/**
 * Processor that inverts an axis
 */
export class AxisInverted implements SingleAxisProcessor {
	/**
	 * Creates an axis inverted processor
	 */
	constructor() {}

	/**
	 * Processes the input value by inverting it
	 * @param value - The input value to process
	 * @returns The inverted value
	 */
	process(value: number): number {
		return -value;
	}

	toString(): string {
		return "AxisInverted";
	}
}

/**
 * Processor that chains multiple single-axis processors together
 */
export class SingleAxisProcessorPipeline implements SingleAxisProcessor {
	/**
	 * Creates a processor pipeline
	 * @param processors - The processors to chain together (applied in order)
	 */
	constructor(private readonly processors: Array<SingleAxisProcessor>) {
		assert(processors.size() > 0, "Pipeline must contain at least one processor");
	}

	/**
	 * Processes the input value through all processors in the pipeline
	 * @param value - The input value to process
	 * @returns The processed value after all processors
	 */
	process(value: number): number {
		let result = value;
		for (const processor of this.processors) {
			result = processor.process(result);
		}
		return result;
	}

	/**
	 * Gets the processors in this pipeline
	 * @returns Array of processors in order
	 */
	getProcessors(): ReadonlyArray<SingleAxisProcessor> {
		return this.processors;
	}

	toString(): string {
		const processorNames = this.processors.map((processor) => processor.toString());
		return `Pipeline[${processorNames.join(" -> ")}]`;
	}
}

/**
 * Helper function to create an axis deadzone processor
 * @param threshold - The deadzone threshold
 * @returns An AxisDeadzone processor
 */
export function axisDeadzone(threshold: number): AxisDeadzone {
	return new AxisDeadzone(threshold);
}

/**
 * Helper function to create an axis sensitivity processor
 * @param factor - The sensitivity factor
 * @returns An AxisSensitivity processor
 */
export function axisSensitivity(factor: number): AxisSensitivity {
	return new AxisSensitivity(factor);
}

/**
 * Helper function to create an axis inverted processor
 * @returns An AxisInverted processor
 */
export function axisInverted(): AxisInverted {
	return new AxisInverted();
}

/**
 * Helper function to create a processor pipeline
 * @param processors - The processors to chain together
 * @returns A SingleAxisProcessorPipeline
 */
export function singleAxisPipeline(...processors: Array<SingleAxisProcessor>): SingleAxisProcessorPipeline {
	return new SingleAxisProcessorPipeline(processors);
}
