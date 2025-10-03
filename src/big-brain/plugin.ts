/**
 * BigBrainPlugin - Main plugin for the Big Brain AI system
 */

import { BasePlugin, type App, BuiltinSchedules } from "../bevy_app";
import {
	fixedScoreSystem,
	allOrNothingSystem,
	sumOfScorersSystem,
	productOfScorersSystem,
	winningScorerSystem,
	evaluatingScorerSystem,
	measuredScorerSystem,
} from "./scorers";
import { thinkerSystem, thinkerComponentAttachSystem, thinkerComponentDetachSystem } from "./thinker";
import { stepsSystem, concurrentlySystem } from "./actions";

/**
 * BigBrain system sets for organizing execution order
 */
export enum BigBrainSet {
	/** Scorers are evaluated in this set */
	Scorers = "Scorers",
	/** Thinkers run their logic in this set */
	Thinkers = "Thinkers",
	/** Actions are executed in this set */
	Actions = "Actions",
	/** Cleanup tasks run in this set */
	Cleanup = "Cleanup",
}

/**
 * Main BigBrain plugin
 * Adds all necessary systems for the AI behavior system to work
 */
export class BigBrainPlugin extends BasePlugin {
	/**
	 * Build the plugin and register all systems
	 */
	build(app: App): void {
		// Register scorer systems in PRE_UPDATE
		app.addSystems(BuiltinSchedules.PRE_UPDATE, [
			fixedScoreSystem,
			measuredScorerSystem,
			allOrNothingSystem,
			sumOfScorersSystem,
			productOfScorersSystem,
			winningScorerSystem,
			evaluatingScorerSystem,
		]);

		// Register thinker system in UPDATE
		app.addSystems(BuiltinSchedules.UPDATE, thinkerSystem);

		// Register action systems in POST_UPDATE
		app.addSystems(BuiltinSchedules.POST_UPDATE, [stepsSystem, concurrentlySystem]);

		// Register cleanup systems in LAST
		app.addSystems(BuiltinSchedules.LAST, [thinkerComponentAttachSystem, thinkerComponentDetachSystem]);
	}

	/**
	 * Plugin name
	 */
	name(): string {
		return "BigBrainPlugin";
	}
}
