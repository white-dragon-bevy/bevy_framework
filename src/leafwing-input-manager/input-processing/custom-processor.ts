/**
 * Custom input processor support for advanced input processing
 * Allows users to define their own processing logic
 */

/**
 * Interface for custom single-axis processors
 */
export interface CustomSingleAxisProcessor {
	/**
	 * Process a single axis value
	 * @param value - The raw input value
	 * @returns The processed value
	 */
	process(value: number): number;

	/**
	 * Gets the processor name for debugging
	 * @returns The processor name
	 */
	getName(): string;
}

/**
 * Interface for custom dual-axis processors
 */
export interface CustomDualAxisProcessor {
	/**
	 * Process a dual axis value
	 * @param value - The raw input vector
	 * @returns The processed vector
	 */
	process(value: Vector2): Vector2;

	/**
	 * Gets the processor name for debugging
	 * @returns The processor name
	 */
	getName(): string;
}

/**
 * Base implementation for custom single-axis processor with chaining support
 */
export abstract class CustomSingleAxisProcessorBase implements CustomSingleAxisProcessor {
	private next?: CustomSingleAxisProcessor;

	/**
	 * Process the value through this processor and any chained processors
	 * @param value - The input value
	 * @returns The processed value
	 */
	process(value: number): number {
		const processed = this.processValue(value);
		return this.next ? this.next.process(processed) : processed;
	}

	/**
	 * Process the value (to be implemented by subclasses)
	 * @param value - The input value
	 * @returns The processed value
	 */
	protected abstract processValue(value: number): number;

	/**
	 * Chain another processor after this one
	 * @param processor - The processor to chain
	 * @returns This processor for method chaining
	 */
	chain(processor: CustomSingleAxisProcessor): this {
		if (!this.next) {
			this.next = processor;
		} else {
			// Find the end of the chain
			let current = this.next;
			while ((current as unknown as { next?: CustomSingleAxisProcessor }).next) {
				current = (current as unknown as { next?: CustomSingleAxisProcessor }).next!;
			}
			(current as unknown as { next?: CustomSingleAxisProcessor }).next = processor;
		}
		return this;
	}

	abstract getName(): string;
}

/**
 * Base implementation for custom dual-axis processor with chaining support
 */
export abstract class CustomDualAxisProcessorBase implements CustomDualAxisProcessor {
	private next?: CustomDualAxisProcessor;

	/**
	 * Process the value through this processor and any chained processors
	 * @param value - The input vector
	 * @returns The processed vector
	 */
	process(value: Vector2): Vector2 {
		const processed = this.processValue(value);
		return this.next ? this.next.process(processed) : processed;
	}

	/**
	 * Process the value (to be implemented by subclasses)
	 * @param value - The input vector
	 * @returns The processed vector
	 */
	protected abstract processValue(value: Vector2): Vector2;

	/**
	 * Chain another processor after this one
	 * @param processor - The processor to chain
	 * @returns This processor for method chaining
	 */
	chain(processor: CustomDualAxisProcessor): this {
		if (!this.next) {
			this.next = processor;
		} else {
			// Find the end of the chain
			let current = this.next;
			while ((current as unknown as { next?: CustomDualAxisProcessor }).next) {
				current = (current as unknown as { next?: CustomDualAxisProcessor }).next!;
			}
			(current as unknown as { next?: CustomDualAxisProcessor }).next = processor;
		}
		return this;
	}

	abstract getName(): string;
}

/**
 * Example custom processors
 */

/**
 * Exponential curve processor for single axis
 */
export class ExponentialCurveProcessor extends CustomSingleAxisProcessorBase {
	constructor(private exponent: number = 2.0) {
		super();
	}

	protected processValue(value: number): number {
		const sign = math.sign(value);
		const absValue = math.abs(value);
		return sign * math.pow(absValue, this.exponent);
	}

	getName(): string {
		return `ExponentialCurve(exp=${this.exponent})`;
	}
}

/**
 * Smoothing processor using exponential moving average
 */
export class SmoothingProcessor extends CustomSingleAxisProcessorBase {
	private previousValue = 0;

	constructor(private smoothingFactor: number = 0.1) {
		super();
		// Clamp smoothing factor between 0 and 1
		this.smoothingFactor = math.clamp(smoothingFactor, 0, 1);
	}

	protected processValue(value: number): number {
		this.previousValue = value * this.smoothingFactor + this.previousValue * (1 - this.smoothingFactor);
		return this.previousValue;
	}

	getName(): string {
		return `Smoothing(factor=${this.smoothingFactor})`;
	}

	/**
	 * Reset the smoothing state
	 */
	reset(): void {
		this.previousValue = 0;
	}
}

/**
 * Acceleration processor that applies acceleration/deceleration
 */
export class AccelerationProcessor extends CustomSingleAxisProcessorBase {
	private velocity = 0;

	constructor(
		private acceleration: number = 5.0,
		private deceleration: number = 10.0,
		private maxVelocity: number = 1.0,
	) {
		super();
	}

	protected processValue(value: number): number {
		const targetVelocity = value * this.maxVelocity;
		const deltaTime = 1 / 60; // Assuming 60 FPS, should be passed as parameter in real implementation

		if (math.abs(targetVelocity) > math.abs(this.velocity)) {
			// Accelerating
			const accelDirection = math.sign(targetVelocity - this.velocity);
			this.velocity += accelDirection * this.acceleration * deltaTime;

			// Don't overshoot target
			if (math.sign(targetVelocity - this.velocity) !== accelDirection) {
				this.velocity = targetVelocity;
			}
		} else {
			// Decelerating
			const decelDirection = math.sign(targetVelocity - this.velocity);
			this.velocity += decelDirection * this.deceleration * deltaTime;

			// Don't overshoot target
			if (math.sign(targetVelocity - this.velocity) !== decelDirection) {
				this.velocity = targetVelocity;
			}
		}

		// Clamp to max velocity
		this.velocity = math.clamp(this.velocity, -this.maxVelocity, this.maxVelocity);

		return this.velocity;
	}

	getName(): string {
		return `Acceleration(accel=${this.acceleration}, decel=${this.deceleration})`;
	}

	/**
	 * Reset the velocity state
	 */
	reset(): void {
		this.velocity = 0;
	}
}

/**
 * Radial deadzone processor for dual axis
 */
export class RadialDeadzoneProcessor extends CustomDualAxisProcessorBase {
	constructor(
		private innerRadius: number = 0.1,
		private outerRadius: number = 1.0,
	) {
		super();
	}

	protected processValue(value: Vector2): Vector2 {
		const magnitude = value.Magnitude;

		if (magnitude <= this.innerRadius) {
			return Vector2.zero;
		}

		if (magnitude >= this.outerRadius) {
			return value.Unit.mul(this.outerRadius);
		}

		// Remap from deadzone to full range
		const remapped = (magnitude - this.innerRadius) / (this.outerRadius - this.innerRadius);
		return value.Unit.mul(remapped);
	}

	getName(): string {
		return `RadialDeadzone(inner=${this.innerRadius}, outer=${this.outerRadius})`;
	}
}

/**
 * Square mapping processor for dual axis
 * Maps circular input to square output
 */
export class SquareMappingProcessor extends CustomDualAxisProcessorBase {
	protected processValue(value: Vector2): Vector2 {
		if (value.Magnitude === 0) {
			return Vector2.zero;
		}

		const x = value.X;
		const y = value.Y;
		const magnitude = value.Magnitude;

		// Map from circle to square using the algorithm from
		// http://mathproofs.blogspot.com/2005/07/mapping-square-to-circle.html
		const factor = magnitude / math.max(math.abs(x), math.abs(y));

		return new Vector2(x * factor, y * factor);
	}

	getName(): string {
		return "SquareMapping";
	}
}

/**
 * Rotation processor for dual axis
 * Rotates the input by a given angle
 */
export class RotationProcessor extends CustomDualAxisProcessorBase {
	private cosAngle: number;
	private sinAngle: number;

	constructor(angleRadians: number) {
		super();
		this.cosAngle = math.cos(angleRadians);
		this.sinAngle = math.sin(angleRadians);
	}

	protected processValue(value: Vector2): Vector2 {
		const x = value.X * this.cosAngle - value.Y * this.sinAngle;
		const y = value.X * this.sinAngle + value.Y * this.cosAngle;
		return new Vector2(x, y);
	}

	getName(): string {
		const angleDegrees = math.deg(math.acos(this.cosAngle));
		return `Rotation(${string.format("%.1f", angleDegrees)}°)`;
	}
}

/**
 * Factory for creating common processor chains
 */
export class ProcessorFactory {
	/**
	 * Create a standard gamepad stick processor chain
	 * @param deadzone - The deadzone radius
	 * @param sensitivity - The sensitivity multiplier
	 * @returns A configured processor chain
	 */
	static createGamepadStickProcessor(
		deadzone: number = 0.1,
		sensitivity: number = 1.0,
	): CustomDualAxisProcessor {
		return new RadialDeadzoneProcessor(deadzone, 1.0);
	}

	/**
	 * Create a standard trigger processor chain
	 * @param threshold - The activation threshold
	 * @param curve - The response curve exponent
	 * @returns A configured processor chain
	 */
	static createTriggerProcessor(
		threshold: number = 0.1,
		curve: number = 1.0,
	): CustomSingleAxisProcessor {
		const processor = new ExponentialCurveProcessor(curve);
		return processor;
	}

	/**
	 * Create a smoothed input processor
	 * @param smoothingFactor - The smoothing factor (0-1)
	 * @returns A configured processor
	 */
	static createSmoothedProcessor(
		smoothingFactor: number = 0.1,
	): CustomSingleAxisProcessor {
		return new SmoothingProcessor(smoothingFactor);
	}

	/**
	 * Create an accelerated input processor
	 * @param acceleration - Acceleration rate
	 * @param deceleration - Deceleration rate
	 * @returns A configured processor
	 */
	static createAcceleratedProcessor(
		acceleration: number = 5.0,
		deceleration: number = 10.0,
	): CustomSingleAxisProcessor {
		return new AccelerationProcessor(acceleration, deceleration);
	}
}

/**
 * Registry for custom processors
 */
export class ProcessorRegistry {
	private static singleAxisProcessors = new Map<string, () => CustomSingleAxisProcessor>();
	private static dualAxisProcessors = new Map<string, () => CustomDualAxisProcessor>();

	/**
	 * Register a custom single-axis processor factory
	 * @param name - The processor name
	 * @param factory - Factory function to create the processor
	 */
	static registerSingleAxis(name: string, factory: () => CustomSingleAxisProcessor): void {
		this.singleAxisProcessors.set(name, factory);
	}

	/**
	 * Register a custom dual-axis processor factory
	 * @param name - The processor name
	 * @param factory - Factory function to create the processor
	 */
	static registerDualAxis(name: string, factory: () => CustomDualAxisProcessor): void {
		this.dualAxisProcessors.set(name, factory);
	}

	/**
	 * Create a single-axis processor by name
	 * @param name - The processor name
	 * @returns The processor instance or undefined
	 */
	static createSingleAxis(name: string): CustomSingleAxisProcessor | undefined {
		const factory = this.singleAxisProcessors.get(name);
		return factory ? factory() : undefined;
	}

	/**
	 * Create a dual-axis processor by name
	 * @param name - The processor name
	 * @returns The processor instance or undefined
	 */
	static createDualAxis(name: string): CustomDualAxisProcessor | undefined {
		const factory = this.dualAxisProcessors.get(name);
		return factory ? factory() : undefined;
	}

	/**
	 * Get all registered single-axis processor names
	 * @returns Array of processor names
	 */
	static getSingleAxisProcessorNames(): string[] {
		const names: string[] = [];
		for (const [name] of this.singleAxisProcessors) {
			names.push(name);
		}
		return names;
	}

	/**
	 * Get all registered dual-axis processor names
	 * @returns Array of processor names
	 */
	static getDualAxisProcessorNames(): string[] {
		const names: string[] = [];
		for (const [name] of this.dualAxisProcessors) {
			names.push(name);
		}
		return names;
	}
}

// Register built-in processors
ProcessorRegistry.registerSingleAxis("exponential", () => new ExponentialCurveProcessor());
ProcessorRegistry.registerSingleAxis("smoothing", () => new SmoothingProcessor());
ProcessorRegistry.registerSingleAxis("acceleration", () => new AccelerationProcessor());
ProcessorRegistry.registerDualAxis("radial-deadzone", () => new RadialDeadzoneProcessor());
ProcessorRegistry.registerDualAxis("square-mapping", () => new SquareMappingProcessor());