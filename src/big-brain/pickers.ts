/**
 * Pickers are used by Thinkers to determine which Scorer "wins"
 */

import { World } from "@rbxts/matter";
import type { Choice } from "./choices";
import { getScore } from "./scorers";

/**
 * Picker trait - chooses which Choice to execute based on scores
 */
export interface Picker {
	/**
	 * Pick a choice from the available choices
	 * @param choices - Array of choices to pick from
	 * @param world - ECS world for score lookup
	 * @returns Selected choice or undefined
	 */
	pick(choices: ReadonlyArray<Choice>, world: World): Choice | undefined;
}

/**
 * Picker that chooses first Choice with score >= threshold
 */
export class FirstToScore implements Picker {
	constructor(public readonly threshold: number) {}

	pick(choices: ReadonlyArray<Choice>, world: World): Choice | undefined {
		for (const choice of choices) {
			const scoreValue = getScore(world, choice.scorerEntityId);
			if (scoreValue !== undefined && scoreValue >= this.threshold) {
				return choice;
			}
		}
		return undefined;
	}
}

/**
 * Picker that chooses the Choice with highest non-zero score
 * In case of tie, returns first highest
 */
export class Highest implements Picker {
	pick(choices: ReadonlyArray<Choice>, world: World): Choice | undefined {
		let maxScore = 0.0;
		let bestChoice: Choice | undefined = undefined;

		for (const choice of choices) {
			const scoreValue = getScore(world, choice.scorerEntityId);
			if (scoreValue !== undefined && scoreValue > maxScore && scoreValue > 0.0) {
				maxScore = scoreValue;
				bestChoice = choice;
			}
		}

		return bestChoice;
	}
}

/**
 * Picker that chooses highest Choice with score >= threshold
 */
export class HighestToScore implements Picker {
	constructor(public readonly threshold: number) {}

	pick(choices: ReadonlyArray<Choice>, world: World): Choice | undefined {
		let highestScore = 0.0;
		let bestChoice: Choice | undefined = undefined;

		for (const choice of choices) {
			const scoreValue = getScore(world, choice.scorerEntityId);
			if (scoreValue !== undefined && scoreValue >= this.threshold && scoreValue > highestScore) {
				highestScore = scoreValue;
				bestChoice = choice;
			}
		}

		return bestChoice;
	}
}
