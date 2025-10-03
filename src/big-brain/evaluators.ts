/**
 * Evaluators transform score values using different curves
 */

/**
 * Clamp a value between min and max
 */
function clamp(value: number, minValue: number, maxValue: number): number {
	return math.clamp(value, minValue, maxValue);
}

/**
 * Evaluator trait - transforms a score value
 */
export interface Evaluator {
	/**
	 * Evaluate and transform a score value
	 * @param value - Input value
	 * @returns Transformed value
	 */
	evaluate(value: number): number;
}

/**
 * Linear evaluator - no curve, linear mapping
 */
export class LinearEvaluator implements Evaluator {
	private xa: number;
	private ya: number;
	private yb: number;
	private dyOverDx: number;

	constructor(xa = 0.0, ya = 0.0, xb = 1.0, yb = 1.0) {
		this.xa = xa;
		this.ya = ya;
		this.yb = yb;
		this.dyOverDx = (yb - ya) / (xb - xa);
	}

	/**
	 * Create default linear evaluator (0,0) to (1,1)
	 */
	static create(): LinearEvaluator {
		return new LinearEvaluator(0.0, 0.0, 1.0, 1.0);
	}

	/**
	 * Create inversed linear evaluator (1,0) to (0,1)
	 */
	static createInversed(): LinearEvaluator {
		return new LinearEvaluator(0.0, 1.0, 1.0, 0.0);
	}

	/**
	 * Create ranged linear evaluator
	 */
	static createRanged(minValue: number, maxValue: number): LinearEvaluator {
		return new LinearEvaluator(minValue, 0.0, maxValue, 1.0);
	}

	evaluate(value: number): number {
		return clamp(this.ya + this.dyOverDx * (value - this.xa), this.ya, this.yb);
	}
}

/**
 * Power evaluator - exponential curve
 */
export class PowerEvaluator implements Evaluator {
	private xa: number;
	private ya: number;
	private xb: number;
	private power: number;
	private dy: number;

	constructor(power: number, xa = 0.0, ya = 0.0, xb = 1.0, yb = 1.0) {
		this.power = clamp(power, 0.0, 10000.0);
		this.dy = yb - ya;
		this.xa = xa;
		this.ya = ya;
		this.xb = xb;
	}

	/**
	 * Create power evaluator with specified power
	 */
	static create(power: number): PowerEvaluator {
		return new PowerEvaluator(power, 0.0, 0.0, 1.0, 1.0);
	}

	/**
	 * Create ranged power evaluator
	 */
	static createRanged(power: number, minValue: number, maxValue: number): PowerEvaluator {
		return new PowerEvaluator(power, minValue, 0.0, maxValue, 1.0);
	}

	evaluate(value: number): number {
		const cx = clamp(value, this.xa, this.xb);
		return this.dy * math.pow((cx - this.xa) / (this.xb - this.xa), this.power) + this.ya;
	}
}

/**
 * Sigmoid evaluator - S-curve
 */
export class SigmoidEvaluator implements Evaluator {
	private xa: number;
	private xb: number;
	private ya: number;
	private yb: number;
	private k: number;
	private twoOverDx: number;
	private xMean: number;
	private yMean: number;
	private dyOverTwo: number;
	private oneMinusK: number;

	constructor(k: number, xa = 0.0, ya = 0.0, xb = 1.0, yb = 1.0) {
		this.k = clamp(k, -0.99999, 0.99999);
		this.xa = xa;
		this.xb = xb;
		this.ya = ya;
		this.yb = yb;
		this.twoOverDx = math.abs(2.0 / (xb - ya));
		this.xMean = (xa + xb) / 2.0;
		this.yMean = (ya + yb) / 2.0;
		this.dyOverTwo = (yb - ya) / 2.0;
		this.oneMinusK = 1.0 - this.k;
	}

	/**
	 * Create sigmoid evaluator with k parameter
	 */
	static create(k: number): SigmoidEvaluator {
		return new SigmoidEvaluator(k, 0.0, 0.0, 1.0, 1.0);
	}

	/**
	 * Create ranged sigmoid evaluator
	 */
	static createRanged(k: number, minValue: number, maxValue: number): SigmoidEvaluator {
		return new SigmoidEvaluator(k, minValue, 0.0, maxValue, 1.0);
	}

	evaluate(x: number): number {
		const cxMinusXMean = clamp(x, this.xa, this.xb) - this.xMean;
		const numerator = this.twoOverDx * cxMinusXMean * this.oneMinusK;
		const denominator = this.k * math.abs(1.0 - 2.0 * (this.twoOverDx * cxMinusXMean)) + 1.0;
		return clamp(this.dyOverTwo * (numerator / denominator) + this.yMean, this.ya, this.yb);
	}
}
