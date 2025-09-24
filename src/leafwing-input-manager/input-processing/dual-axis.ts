import { SingleAxisProcessor } from "./single-axis";

/**
 * Interface for processing dual-axis input values
 */
export interface DualAxisProcessor {
	/**
	 * Processes a dual-axis input value
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value
	 */
	process(value: Vector2): Vector2;

	/**
	 * Returns a string representation of the processor
	 * @returns String representation
	 */
	toString(): string;
}

/**
 * Processor that applies sensitivity scaling to both axes
 */
export class DualAxisSensitivity implements DualAxisProcessor {
	/**
	 * Creates a dual-axis sensitivity processor
	 * @param factorX - The X-axis sensitivity multiplier
	 * @param factorY - The Y-axis sensitivity multiplier (defaults to factorX if not provided)
	 */
	constructor(
		private readonly factorX: number,
		private readonly factorY: number = factorX,
	) {
		assert(factorX > 0, "X sensitivity factor must be positive");
		assert(factorY > 0, "Y sensitivity factor must be positive");
	}

	/**
	 * Processes the input value by applying sensitivity scaling
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value with sensitivity applied
	 */
	process(value: Vector2): Vector2 {
		const processedX = math.clamp(value.X * this.factorX, -1, 1);
		const processedY = math.clamp(value.Y * this.factorY, -1, 1);
		return new Vector2(processedX, processedY);
	}

	toString(): string {
		if (this.factorX === this.factorY) {
			return `DualAxisSensitivity(${this.factorX})`;
		}
		return `DualAxisSensitivity(X:${this.factorX}, Y:${this.factorY})`;
	}
}

/**
 * Processor that inverts one or both axes
 */
export class DualAxisInverted implements DualAxisProcessor {
	/**
	 * Creates a dual-axis inverted processor
	 * @param invertX - Whether to invert the X axis
	 * @param invertY - Whether to invert the Y axis
	 */
	constructor(
		private readonly invertX: boolean = true,
		private readonly invertY: boolean = true,
	) {}

	/**
	 * Processes the input value by inverting specified axes
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value with inversion applied
	 */
	process(value: Vector2): Vector2 {
		const processedX = this.invertX ? -value.X : value.X;
		const processedY = this.invertY ? -value.Y : value.Y;
		return new Vector2(processedX, processedY);
	}

	toString(): string {
		if (this.invertX && this.invertY) {
			return "DualAxisInverted(Both)";
		} else if (this.invertX) {
			return "DualAxisInverted(X)";
		} else if (this.invertY) {
			return "DualAxisInverted(Y)";
		} else {
			return "DualAxisInverted(None)";
		}
	}
}

/**
 * Processor that applies single-axis processors to each axis independently
 */
export class DualAxisSingleProcessors implements DualAxisProcessor {
	/**
	 * Creates a dual-axis processor that applies single-axis processors
	 * @param xProcessor - Processor for the X axis
	 * @param yProcessor - Processor for the Y axis (defaults to xProcessor if not provided)
	 */
	constructor(
		private readonly xProcessor: SingleAxisProcessor,
		private readonly yProcessor: SingleAxisProcessor = xProcessor,
	) {}

	/**
	 * Processes the input value by applying single-axis processors to each axis
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value
	 */
	process(value: Vector2): Vector2 {
		const processedX = this.xProcessor.process(value.X);
		const processedY = this.yProcessor.process(value.Y);
		return new Vector2(processedX, processedY);
	}

	toString(): string {
		if (this.xProcessor === this.yProcessor) {
			return `DualAxisSingleProcessors(${this.xProcessor.toString()})`;
		}
		return `DualAxisSingleProcessors(X:${this.xProcessor.toString()}, Y:${this.yProcessor.toString()})`;
	}
}

/**
 * Processor that chains multiple dual-axis processors together
 */
export class DualAxisProcessorPipeline implements DualAxisProcessor {
	/**
	 * Creates a dual-axis processor pipeline
	 * @param processors - The processors to chain together (applied in order)
	 */
	constructor(private readonly processors: Array<DualAxisProcessor>) {
		assert(processors.size() > 0, "Pipeline must contain at least one processor");
	}

	/**
	 * Processes the input value through all processors in the pipeline
	 * @param value - The Vector2 input value to process
	 * @returns The processed Vector2 value after all processors
	 */
	process(value: Vector2): Vector2 {
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
	getProcessors(): ReadonlyArray<DualAxisProcessor> {
		return this.processors;
	}

	toString(): string {
		const processorNames = this.processors.map((processor) => processor.toString());
		return `DualAxisPipeline[${processorNames.join(" -> ")}]`;
	}
}

/**
 * Helper function to create a dual-axis sensitivity processor
 * @param factorX - The X-axis sensitivity factor
 * @param factorY - The Y-axis sensitivity factor (optional)
 * @returns A DualAxisSensitivity processor
 */
export function dualAxisSensitivity(factorX: number, factorY?: number): DualAxisSensitivity {
	return new DualAxisSensitivity(factorX, factorY);
}

/**
 * Helper function to create a dual-axis inverted processor
 * @param invertX - Whether to invert X axis (default: true)
 * @param invertY - Whether to invert Y axis (default: true)
 * @returns A DualAxisInverted processor
 */
export function dualAxisInverted(invertX?: boolean, invertY?: boolean): DualAxisInverted {
	return new DualAxisInverted(invertX, invertY);
}

/**
 * Helper function to create a dual-axis processor using single-axis processors
 * @param xProcessor - Processor for X axis
 * @param yProcessor - Processor for Y axis (optional)
 * @returns A DualAxisSingleProcessors processor
 */
export function dualAxisSingleProcessors(
	xProcessor: SingleAxisProcessor,
	yProcessor?: SingleAxisProcessor,
): DualAxisSingleProcessors {
	return new DualAxisSingleProcessors(xProcessor, yProcessor);
}

/**
 * Helper function to create a dual-axis processor pipeline
 * @param processors - The processors to chain together
 * @returns A DualAxisProcessorPipeline
 */
export function dualAxisPipeline(...processors: Array<DualAxisProcessor>): DualAxisProcessorPipeline {
	return new DualAxisProcessorPipeline(processors);
}
