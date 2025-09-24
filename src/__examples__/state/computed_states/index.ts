/**
 * Computed States Example
 * Demonstrates complex state handling with computed states in the Bevy-inspired framework
 *
 * This example shows:
 * - Multiple state types (AppState, TutorialState)
 * - Computed states derived from source states (InGame, TurboMode, IsPaused, Tutorial)
 * - State-driven UI and gameplay systems
 * - State transitions and cleanup with DespawnOnExit
 */

import { App } from "../../../bevy_app/app";
import { AppExit } from "../../../bevy_app/types";
import { BuiltinSchedules } from "../../../bevy_app/main-schedule";
import { DefaultPlugins } from "../../../bevy_internal/default-plugins";
import { extendAppWithState, OnEnter, OnExit } from "./app-extensions";
import { AppState, TutorialState, InGameState, TurboModeState, IsPausedState, TutorialComputedState } from "./states";
import {
	setupMenu,
	setupGameSprite,
	setupPausedScreen,
	setupTurboText,
	setupMovementInstructions,
	setupPauseInstructions,
	cleanupMenu,
} from "./ui";
import {
	inputSystem,
	movementSystem,
	changeColorSystem,
	logStateTransitions,
	initInputResources,
	updateInputSystem,
	updateTutorialComputedState,
} from "./systems";
import { despawnOnExitSystem, despawnOnComputedExitSystem } from "./despawn-on-exit";
import { ResourceManager } from "../../../bevy_ecs/resource";
import { Time } from "../../../bevy_time/time";
import type { World } from "@rbxts/matter";

// Prevent multiple instances
let isRunning = false;

/**
 * Main function to run the computed states example
 */
export function runComputedStatesExample(): void {
	if (isRunning) {
		warn("Computed States Example is already running!");
		return;
	}
	isRunning = true;

	print("Starting Computed States Example");

	// Create app and extend it with state management
	const baseApp = App.create();
	const app = extendAppWithState(baseApp);

	// Create a shared resource manager for state management
	const resourceManager = new ResourceManager();
	const world = app.getWorld();
	(world as unknown as Record<string, unknown>)["stateResourceManager"] = resourceManager;

	// Initialize Time resource
	const timeContext = {} as any; // Empty context for now
	resourceManager.insertResource(Time, new Time(timeContext));

	// Initialize input resources
	initInputResources(world, resourceManager);

	// Add default plugins
	app.addPlugins(new DefaultPlugins());

	// Initialize states
	app.initState(AppState, () => AppState.Menu());
	app.initState(TutorialState, () => TutorialState.Active());

	// Add computed states
	app.addComputedState(AppState, InGameState);
	app.addComputedState(AppState, TurboModeState);
	// IsPausedState needs special handling as it returns different values
	// We'll handle it manually in the update loop
	// Note: TutorialComputedState requires special handling due to multiple sources

	// Startup system
	let startupCount = 0;
	app.addSystems(BuiltinSchedules.STARTUP, (world: World) => {
		startupCount++;
		print(`[computed_states] Startup system executed (call #${startupCount})`);
		if (startupCount > 1) {
			warn(`[computed_states] ERROR: STARTUP system called multiple times! This should only happen once.`);
		}
	});

	// Menu state systems
	app.addSystemsOnEnter(AppState.Menu(), (world: World) => {
		setupMenu(world, resourceManager);
	});

	app.addSystemsOnExit(AppState.Menu(), (world: World) => {
		cleanupMenu(world);
	});

	// InGame state systems (using computed state)
	const inGameState = new InGameState();
	app.addSystemsOnEnter(inGameState, (world: World) => {
		setupGameSprite(world);
	});

	// Paused state systems
	const pausedState = IsPausedState.Paused();
	app.addSystemsOnEnter(pausedState, (world: World) => {
		setupPausedScreen(world);
		print("Game paused");
	});

	// Turbo mode systems
	const turboState = new TurboModeState();
	app.addSystemsOnEnter(turboState, (world: World) => {
		setupTurboText(world);
		print("TURBO MODE ACTIVATED!");
	});

	// Tutorial instruction systems
	const movementInstructions = TutorialComputedState.MovementInstructions();
	app.addSystemsOnEnter(movementInstructions, (world: World) => {
		setupMovementInstructions(world);
	});

	const pauseInstructions = TutorialComputedState.PauseInstructions();
	app.addSystemsOnEnter(pauseInstructions, (world: World) => {
		setupPauseInstructions(world);
	});

	// Update systems - These run every frame
	app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
		// Update Time resource (Time updates are handled internally)

		// Update input state
		updateInputSystem(world, resourceManager);

		// Process input
		inputSystem(world, resourceManager);

		// Update computed tutorial state (special handling for multiple sources)
		updateTutorialComputedState(world, resourceManager);

		// Process state transitions and cleanup
		const currentAppState = resourceManager.getResource(State<AppState>)?.get();
		const previousAppState = resourceManager.getResource(PreviousState<AppState>)?.get();
		if (previousAppState && currentAppState && !previousAppState.equals(currentAppState)) {
			despawnOnExitSystem(world, previousAppState, currentAppState);
		}

		// Handle computed state cleanup
		despawnOnComputedExitSystem(world, "InGame", inGameState.compute(currentAppState) !== undefined);
		despawnOnComputedExitSystem(world, "TurboMode", turboState.compute(currentAppState) !== undefined);
		despawnOnComputedExitSystem(
			world,
			"Paused",
			pausedState.compute(currentAppState)?.equals(pausedState) ?? false,
		);
	});

	// Systems that run only when not paused
	const notPausedState = IsPausedState.NotPaused();
	app.addSystemsInState(BuiltinSchedules.UPDATE, notPausedState, (world: World) => {
		movementSystem(world, resourceManager);
	});

	// Systems that run whenever in game (regardless of pause state)
	app.addSystemsInState(BuiltinSchedules.UPDATE, inGameState, (world: World) => {
		changeColorSystem(world, resourceManager);
	});

	// Debug logging
	app.addSystems(BuiltinSchedules.POST_UPDATE, (world: World) => {
		// Log state transitions (simplified version)
		const states = [AppState, TutorialState];
		for (const stateType of states) {
			// Skip state logging for now as it has type issues
		}
	});

	// Set up a simple runner that updates the app in a loop
	let runnerConnection: RBXScriptConnection | undefined;

	app.setRunner((app: App) => {
		print("Starting main loop");
		const RunService = game.GetService("RunService");

		// Disconnect any existing connection
		if (runnerConnection) {
			runnerConnection.Disconnect();
		}

		// Track if we should keep running
		let frameCount = 0;
		const maxFrames = 100; // Run for 100 frames then stop

		// Main game loop
		runnerConnection = RunService.Heartbeat.Connect(() => {
			app.update();
			frameCount++;

			// Stop after maxFrames to prevent infinite loop in testing
			if (frameCount >= maxFrames) {
				print(`Stopping after ${maxFrames} frames`);
				if (runnerConnection) {
					runnerConnection.Disconnect();
					runnerConnection = undefined;
				}
			}
		});

		// The runner returns immediately, but the connection continues
		// This is the expected pattern for game loops in Roblox
		return AppExit.success();
	});

	// Run the app
	print("Running app...");
	const exitCode = app.run();
	print(`App exited with code: ${exitCode.code}`);
}

// Helper type for tracking previous state (simplified implementation)
class PreviousState<S extends States> {
	constructor(private state: S | undefined) {}
	get(): S | undefined {
		return this.state;
	}
	set(state: S | undefined): void {
		this.state = state;
	}
}

// Import required State type
import { State } from "../../../bevy_state/resources";
import type { States } from "../../../bevy_state/states";
