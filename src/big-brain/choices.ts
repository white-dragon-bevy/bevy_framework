/**
 * Choices pair Scorers with Actions
 */

import { World } from "@rbxts/matter";
import type { AnyEntity } from "@rbxts/matter";
import type { ScorerBuilder, spawnScorer } from "./scorers";
import type { ActionBuilder } from "./actions";
import { spawnScorer as scorerSpawn } from "./scorers";

/**
 * Choice represents a pairing of a Scorer and an Action
 */
export interface Choice {
	readonly scorerEntityId: AnyEntity;
	readonly actionBuilder: ActionBuilder;
	readonly actionLabel?: string;
}

/**
 * Builder for creating Choices
 */
export class ChoiceBuilder {
	constructor(
		private readonly scorerBuilder: ScorerBuilder,
		private readonly actionBuilderValue: ActionBuilder,
	) {}

	/**
	 * Build the choice by spawning the scorer
	 * @param world - ECS world
	 * @param actorEntityId - Actor entity ID
	 * @returns Built choice
	 */
	build(world: World, actorEntityId: AnyEntity): Choice {
		const scorerEntityId = scorerSpawn(this.scorerBuilder, world, actorEntityId);

		return {
			scorerEntityId: scorerEntityId,
			actionBuilder: this.actionBuilderValue,
			actionLabel: this.actionBuilderValue.label?.(),
		};
	}
}
