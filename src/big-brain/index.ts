/**
 * Big Brain AI System for White Dragon Bevy
 *
 * A Utility AI library for implementing complex AI behaviors using the Bevy ECS framework.
 * This is a port of the Rust big-brain crate to TypeScript/Roblox.
 *
 * Core concepts:
 * - Scorers: Evaluate the world and generate scores (0.0-1.0)
 * - Actions: Perform behaviors based on scores
 * - Thinkers: Connect scorers and actions to create intelligent behavior
 * - Pickers: Choose which action to execute based on scores
 *
 * @example
 * ```typescript
 * import { App, BuiltinSchedules } from "@white-dragon-bevy/bevy_app";
 * import { BigBrainPlugin, ThinkerBuilder, FirstToScore } from "@white-dragon-bevy/big-brain";
 *
 * const app = App.create()
 *     .addPlugin(new BigBrainPlugin())
 *     .run();
 * ```
 */

// Core components
export * from "./scorers";
export * from "./actions";
export * from "./thinker";
export * from "./pickers";
export * from "./choices";
export * from "./evaluators";
export * from "./measures";
export * from "./plugin";

// Re-export commonly used items for convenience
export { BigBrainPlugin, BigBrainSet } from "./plugin";
export { ThinkerBuilder, ThinkerBuilderComponent, ThinkerComponent, HasThinker } from "./thinker";
export { FirstToScore, Highest, HighestToScore } from "./pickers";
export { ActionState, StepsBuilder, ConcurrentlyBuilder, ConcurrentMode } from "./actions";
export {
	Score,
	FixedScorerBuilder,
	AllOrNothingBuilder,
	SumOfScorersBuilder,
	ProductOfScorersBuilder,
	WinningScorerBuilder,
	EvaluatingScorerBuilder,
	MeasuredScorerBuilder,
} from "./scorers";
export { LinearEvaluator, PowerEvaluator, SigmoidEvaluator } from "./evaluators";
export { WeightedSum, WeightedProduct, ChebyshevDistance, WeightedMeasure } from "./measures";

