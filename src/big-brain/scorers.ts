/**
 * Scorers look at the world and boil down arbitrary characteristics into a
 * range of 0.0..=1.0. This module includes the ScorerBuilder interface and
 * built-in Composite Scorers.
 */

import { World, component } from "@rbxts/matter";
import type { AnyEntity, Component } from "@rbxts/matter";
import type { Context } from "../bevy_ecs";

// ============================================================================
// Core Components
// ============================================================================

/**
 * Score value between 0.0 and 1.0 associated with a Scorer
 */
export const Score = component<{ value: number }>("Score");
export type Score = ReturnType<typeof Score>;

/**
 * Actor component - references the acting entity
 */
export const Actor = component<{ entityId: AnyEntity }>("Actor");
export type Actor = ReturnType<typeof Actor>;

/**
 * Scorer marker component
 */
export const Scorer = component<{ entityId: AnyEntity }>("Scorer");
export type Scorer = ReturnType<typeof Scorer>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sets a score value with validation
 */
export function setScore(world: World, entityId: AnyEntity, value: number): void {
	assert(value >= 0.0 && value <= 1.0, `Score value must be between 0.0 and 1.0, got ${value}`);
	world.insert(entityId, Score({ value }));
}

/**
 * Gets the score value from an entity
 */
export function getScore(world: World, entityId: AnyEntity): number | undefined {
	const score = world.get(entityId, Score);
	return score?.value;
}

// ============================================================================
// Builder Interface
// ============================================================================

/**
 * Trait/Interface that ScorerBuilders must implement
 */
export interface ScorerBuilder {
	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void;
	label?(): string;
}

/**
 * Spawn a new scorer entity
 */
export function spawnScorer(builder: ScorerBuilder, world: World, actorEntityId: AnyEntity): AnyEntity {
	const scorerEntityId = world.spawn(Score({ value: 0.0 }), Actor({ entityId: actorEntityId }));
	builder.build(world, scorerEntityId, actorEntityId);
	return scorerEntityId;
}

// ============================================================================
// Built-in Scorers
// ============================================================================

/**
 * FixedScore - always returns the same score
 */
export const FixedScore = component<{ fixedValue: number }>("FixedScore");
export type FixedScore = ReturnType<typeof FixedScore>;

export class FixedScorerBuilder implements ScorerBuilder {
	constructor(
		private readonly scoreValue: number,
		private readonly labelText?: string,
	) {
		assert(scoreValue >= 0.0 && scoreValue <= 1.0, `FixedScore value must be between 0.0 and 1.0`);
	}

	build(world: World, scorerEntityId: AnyEntity): void {
		world.insert(scorerEntityId, FixedScore({ fixedValue: this.scoreValue }));
	}

	label(): string {
		return this.labelText ?? "FixedScore";
	}

	withLabel(labelText: string): this {
		return new FixedScorerBuilder(this.scoreValue, labelText) as this;
	}
}

export function fixedScoreSystem(world: World, context: Context): void {
	for (const [entityId, fixedScore] of world.query(FixedScore)) {
		setScore(world, entityId, fixedScore.fixedValue);
	}
}

/**
 * AllOrNothing - sum of scores if all >= threshold
 */
export const AllOrNothing = component<{ threshold: number; scorerIds: AnyEntity[] }>("AllOrNothing");
export type AllOrNothing = ReturnType<typeof AllOrNothing>;

export class AllOrNothingBuilder implements ScorerBuilder {
	private scorerBuilders: ScorerBuilder[] = [];
	private labelText?: string;

	constructor(private readonly threshold: number) {}

	push(scorer: ScorerBuilder): this {
		this.scorerBuilders.push(scorer);
		return this;
	}

	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const scorerIds: AnyEntity[] = [];
		for (const builder of this.scorerBuilders) {
			scorerIds.push(spawnScorer(builder, world, actorEntityId));
		}
		world.insert(scorerEntityId, AllOrNothing({ threshold: this.threshold, scorerIds }));
	}

	label(): string {
		return this.labelText ?? "AllOrNothing";
	}
}

export function allOrNothingSystem(world: World, context: Context): void {
	for (const [entityId, aon] of world.query(AllOrNothing)) {
		let sum = 0.0;
		let allAboveThreshold = true;

		for (const childId of aon.scorerIds) {
			const scoreValue = getScore(world, childId);
			if (scoreValue === undefined || scoreValue < aon.threshold) {
				allAboveThreshold = false;
				break;
			}
			sum += scoreValue;
		}

		setScore(world, entityId, allAboveThreshold ? math.clamp(sum, 0.0, 1.0) : 0.0);
	}
}

/**
 * SumOfScorers - sum if total >= threshold
 */
export const SumOfScorers = component<{ threshold: number; scorerIds: AnyEntity[] }>("SumOfScorers");
export type SumOfScorers = ReturnType<typeof SumOfScorers>;

export class SumOfScorersBuilder implements ScorerBuilder {
	private scorerBuilders: ScorerBuilder[] = [];
	private labelText?: string;

	constructor(private readonly threshold: number) {}

	push(scorer: ScorerBuilder): this {
		this.scorerBuilders.push(scorer);
		return this;
	}

	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const scorerIds: AnyEntity[] = [];
		for (const builder of this.scorerBuilders) {
			scorerIds.push(spawnScorer(builder, world, actorEntityId));
		}
		world.insert(scorerEntityId, SumOfScorers({ threshold: this.threshold, scorerIds }));
	}

	label(): string {
		return this.labelText ?? "SumOfScorers";
	}
}

export function sumOfScorersSystem(world: World, context: Context): void {
	for (const [entityId, sos] of world.query(SumOfScorers)) {
		let sum = 0.0;
		for (const childId of sos.scorerIds) {
			const scoreValue = getScore(world, childId);
			if (scoreValue !== undefined) {
				sum += scoreValue;
			}
		}
		setScore(world, entityId, sum >= sos.threshold ? math.clamp(sum, 0.0, 1.0) : 0.0);
	}
}

/**
 * ProductOfScorers - product if >= threshold
 */
export const ProductOfScorers = component<{
	threshold: number;
	useCompensation: boolean;
	scorerIds: AnyEntity[];
}>("ProductOfScorers");
export type ProductOfScorers = ReturnType<typeof ProductOfScorers>;

export class ProductOfScorersBuilder implements ScorerBuilder {
	private scorerBuilders: ScorerBuilder[] = [];
	private useCompensationValue = false;
	private labelText?: string;

	constructor(private readonly threshold: number) {}

	useCompensation(value: boolean): this {
		this.useCompensationValue = value;
		return this;
	}

	push(scorer: ScorerBuilder): this {
		this.scorerBuilders.push(scorer);
		return this;
	}

	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const scorerIds: AnyEntity[] = [];
		for (const builder of this.scorerBuilders) {
			scorerIds.push(spawnScorer(builder, world, actorEntityId));
		}
		world.insert(
			scorerEntityId,
			ProductOfScorers({
				threshold: this.threshold,
				useCompensation: this.useCompensationValue,
				scorerIds,
			}),
		);
	}

	label(): string {
		return this.labelText ?? "ProductOfScorers";
	}
}

export function productOfScorersSystem(world: World, context: Context): void {
	for (const [entityId, pos] of world.query(ProductOfScorers)) {
		let product = 1.0;
		let numScorers = 0;

		for (const childId of pos.scorerIds) {
			const scoreValue = getScore(world, childId);
			if (scoreValue !== undefined) {
				product *= scoreValue;
				numScorers += 1;
			}
		}

		if (pos.useCompensation && product < 1.0 && numScorers > 0) {
			const modFactor = 1.0 - 1.0 / numScorers;
			const makeup = (1.0 - product) * modFactor;
			product += makeup * product;
		}

		setScore(world, entityId, product >= pos.threshold ? math.clamp(product, 0.0, 1.0) : 0.0);
	}
}

/**
 * WinningScorer - highest score if >= threshold
 */
export const WinningScorer = component<{ threshold: number; scorerIds: AnyEntity[] }>("WinningScorer");
export type WinningScorer = ReturnType<typeof WinningScorer>;

export class WinningScorerBuilder implements ScorerBuilder {
	private scorerBuilders: ScorerBuilder[] = [];
	private labelText?: string;

	constructor(private readonly threshold: number) {}

	push(scorer: ScorerBuilder): this {
		this.scorerBuilders.push(scorer);
		return this;
	}

	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const scorerIds: AnyEntity[] = [];
		for (const builder of this.scorerBuilders) {
			scorerIds.push(spawnScorer(builder, world, actorEntityId));
		}
		world.insert(scorerEntityId, WinningScorer({ threshold: this.threshold, scorerIds }));
	}

	label(): string {
		return this.labelText ?? "WinningScorer";
	}
}

export function winningScorerSystem(world: World, context: Context): void {
	for (const [entityId, ws] of world.query(WinningScorer)) {
		let highestScore = 0.0;
		for (const childId of ws.scorerIds) {
			const scoreValue = getScore(world, childId);
			if (scoreValue !== undefined && scoreValue > highestScore) {
				highestScore = scoreValue;
			}
		}
		setScore(world, entityId, highestScore >= ws.threshold ? highestScore : 0.0);
	}
}

/**
 * EvaluatingScorer - applies evaluator to scorer
 */
export const EvaluatingScorer = component<{
	scorerEntityId: AnyEntity;
	evaluator: { evaluate(value: number): number };
}>("EvaluatingScorer");
export type EvaluatingScorer = ReturnType<typeof EvaluatingScorer>;

export class EvaluatingScorerBuilder implements ScorerBuilder {
	private labelText?: string;

	constructor(
		private readonly scorerBuilder: ScorerBuilder,
		private readonly evaluatorValue: { evaluate(value: number): number },
	) {}

	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const innerScorerId = spawnScorer(this.scorerBuilder, world, actorEntityId);
		world.insert(scorerEntityId, EvaluatingScorer({ scorerEntityId: innerScorerId, evaluator: this.evaluatorValue }));
	}

	label(): string {
		return this.labelText ?? "EvaluatingScorer";
	}
}

export function evaluatingScorerSystem(world: World, context: Context): void {
	for (const [entityId, es] of world.query(EvaluatingScorer)) {
		const innerScore = getScore(world, es.scorerEntityId);
		if (innerScore !== undefined) {
			setScore(world, entityId, math.clamp(es.evaluator.evaluate(innerScore), 0.0, 1.0));
		}
	}
}

/**
 * MeasuredScorer - combines weighted scorers using measure
 */
export const MeasuredScorer = component<{
	threshold: number;
	measure: { calculate(inputs: ReadonlyArray<readonly [{ value: number }, number]>): number };
	scorerWeights: Array<readonly [AnyEntity, number]>;
}>("MeasuredScorer");
export type MeasuredScorer = ReturnType<typeof MeasuredScorer>;

export class MeasuredScorerBuilder implements ScorerBuilder {
	private scorerBuilders: Array<readonly [ScorerBuilder, number]> = [];
	private measureValue: { calculate(inputs: ReadonlyArray<readonly [{ value: number }, number]>): number };
	private labelText?: string;

	constructor(
		private readonly threshold: number,
		measure?: { calculate(inputs: ReadonlyArray<readonly [{ value: number }, number]>): number },
	) {
		this.measureValue = measure ?? {
			calculate(inputs: ReadonlyArray<readonly [{ value: number }, number]>): number {
				let weightSum = 0.0;
				for (const [_, weight] of inputs) {
					weightSum += weight;
				}
				if (weightSum === 0.0) return 0.0;

				let sum = 0.0;
				for (const [score, weight] of inputs) {
					sum += (weight / weightSum) * math.pow(score.value, 2.0);
				}
				return math.pow(sum, 0.5);
			},
		};
	}

	measure(measure: { calculate(inputs: ReadonlyArray<readonly [{ value: number }, number]>): number }): this {
		this.measureValue = measure;
		return this;
	}

	push(scorer: ScorerBuilder, weight: number): this {
		this.scorerBuilders.push([scorer, weight]);
		return this;
	}

	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const scorerWeights: Array<readonly [AnyEntity, number]> = [];
		for (const [builder, weight] of this.scorerBuilders) {
			scorerWeights.push([spawnScorer(builder, world, actorEntityId), weight]);
		}
		world.insert(
			scorerEntityId,
			MeasuredScorer({ threshold: this.threshold, measure: this.measureValue, scorerWeights }),
		);
	}

	label(): string {
		return this.labelText ?? "MeasuredScorer";
	}
}

export function measuredScorerSystem(world: World, context: Context): void {
	for (const [entityId, ms] of world.query(MeasuredScorer)) {
		const inputs: Array<readonly [{ value: number }, number]> = [];
		for (const [childId, weight] of ms.scorerWeights) {
			const scoreValue = getScore(world, childId);
			if (scoreValue !== undefined) {
				inputs.push([{ value: scoreValue }, weight]);
			}
		}
		if (inputs.size() > 0) {
			const measured = ms.measure.calculate(inputs);
			setScore(world, entityId, measured >= ms.threshold ? math.clamp(measured, 0.0, 1.0) : 0.0);
		}
	}
}
