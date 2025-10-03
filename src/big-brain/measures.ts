/**
 * Measures combine multiple scores with weights
 */

import type { Score } from "./scorers";

/**
 * Measure trait - combines weighted scores
 */
export interface Measure {
	/**
	 * Calculate combined score from weighted inputs
	 * @param inputs - Array of (score, weight) tuples
	 * @returns Combined score
	 */
	calculate(inputs: ReadonlyArray<readonly [Score, number]>): number;
}

/**
 * Weighted sum measure - adds scores multiplied by weights
 */
export class WeightedSum implements Measure {
	calculate(inputs: ReadonlyArray<readonly [Score, number]>): number {
		let sum = 0.0;
		for (const [score, weight] of inputs) {
			sum += score.value * weight;
		}
		return sum;
	}
}

/**
 * Weighted product measure - multiplies scores with weights
 */
export class WeightedProduct implements Measure {
	calculate(inputs: ReadonlyArray<readonly [Score, number]>): number {
		let product = 1.0;
		for (const [score, weight] of inputs) {
			product *= score.value * weight;
		}
		return product;
	}
}

/**
 * Chebyshev distance measure - returns max weighted score
 */
export class ChebyshevDistance implements Measure {
	calculate(inputs: ReadonlyArray<readonly [Score, number]>): number {
		let maxValue = 0.0;
		for (const [score, weight] of inputs) {
			const weightedScore = score.value * weight;
			if (weightedScore > maxValue) {
				maxValue = weightedScore;
			}
		}
		return maxValue;
	}
}

/**
 * Default weighted measure with intuitive curve
 */
export class WeightedMeasure implements Measure {
	calculate(inputs: ReadonlyArray<readonly [Score, number]>): number {
		let weightSum = 0.0;
		for (const [_, weight] of inputs) {
			weightSum += weight;
		}

		if (weightSum === 0.0) {
			return 0.0;
		}

		let sum = 0.0;
		for (const [score, weight] of inputs) {
			const normalized = weight / weightSum;
			const powered = math.pow(score.value, 2.0);
			sum += normalized * powered;
		}

		return math.pow(sum, 1.0 / 2.0);
	}
}
