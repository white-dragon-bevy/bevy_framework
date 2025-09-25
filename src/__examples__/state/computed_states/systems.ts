/**
 * systems.ts - Game systems for the computed states example
 * Implements movement, input handling, and visual effects
 */

import { UserInputService } from "@rbxts/services";
import type { World } from "@rbxts/matter";
import { AppState, TutorialState, IsPausedState, TurboModeState, TutorialComputedState } from "./states";
import { GameSprite } from "./ui";
import { State, NextState } from "../../../bevy_state/resources";
import type { ResourceManager, ResourceConstructor } from "../../../bevy_ecs/resource";
import { Time } from "../../../bevy_time/time";
import { ButtonInput } from "../../../bevy_input/button-input";

// Movement speeds
const NORMAL_SPEED = 0.1; // Normalized screen units per second
const TURBO_SPEED = 0.3; // Faster speed in turbo mode

/**
 * Input system - handles keyboard input for state transitions
 * @param world - The game world
 * @param resourceManager - Resource manager for state access
 */
export function inputSystem(world: World, resourceManager: ResourceManager): void {
	const inputKey = ButtonInput<Enum.KeyCode> as ResourceConstructor<ButtonInput<Enum.KeyCode>>;
	const input = resourceManager.getResource(inputKey) as ButtonInput<Enum.KeyCode> | undefined;
	if (!input) return;

	const appStateKey = "State<AppState>" as ResourceConstructor<State<AppState>>;
	const nextAppStateKey = "NextState<AppState>" as ResourceConstructor<NextState<AppState>>;
	const currentAppState = resourceManager.getResource(appStateKey) as State<AppState> | undefined;
	const nextAppState = resourceManager.getResource(nextAppStateKey) as NextState<AppState> | undefined;

	if (!currentAppState || !nextAppState) return;

	const current = currentAppState.get();

	// Handle Space key - toggle pause
	if (input.justPressed(Enum.KeyCode.Space)) {
		if (current.isInGame()) {
			const isPaused = current.isPaused() ?? false;
			const isTurbo = current.isTurbo() ?? false;
			nextAppState.set(AppState.InGame(!isPaused, isTurbo));
		}
	}

	// Handle T key - toggle turbo mode
	if (input.justPressed(Enum.KeyCode.T)) {
		if (current.isInGame()) {
			const isPaused = current.isPaused() ?? false;
			const isTurbo = current.isTurbo() ?? false;
			nextAppState.set(AppState.InGame(isPaused, !isTurbo));
		}
	}

	// Handle Escape key - return to menu
	if (input.justPressed(Enum.KeyCode.Escape)) {
		if (current.isInGame()) {
			nextAppState.set(AppState.Menu());
		}
	}
}

/**
 * Movement system - handles sprite movement with arrow keys
 * @param world - The game world
 * @param resourceManager - Resource manager for resources
 */
export function movementSystem(world: World, resourceManager: ResourceManager): void {
	const inputKey = ButtonInput<Enum.KeyCode> as ResourceConstructor<ButtonInput<Enum.KeyCode>>;
	const input = resourceManager.getResource(inputKey) as ButtonInput<Enum.KeyCode> | undefined;
	const time = resourceManager.getResource(Time) as Time | undefined;

	if (!input || !time) return;

	// Check if we're in turbo mode
	const turboStateKey = "State<TurboModeState>" as ResourceConstructor<State<TurboModeState>>;
	const turboState = resourceManager.getResource(turboStateKey) as State<TurboModeState> | undefined;
	const speed = turboState ? TURBO_SPEED : NORMAL_SPEED;

	// Process movement for all game sprites
	for (const [entity, sprite] of world.query(GameSprite)) {
		let velocity = new Vector2(0, 0);

		// Check arrow keys
		if (input.isPressed(Enum.KeyCode.Left)) {
			velocity = velocity.add(new Vector2(-1, 0));
		}
		if (input.isPressed(Enum.KeyCode.Right)) {
			velocity = velocity.add(new Vector2(1, 0));
		}
		if (input.isPressed(Enum.KeyCode.Up)) {
			velocity = velocity.add(new Vector2(0, -1));
		}
		if (input.isPressed(Enum.KeyCode.Down)) {
			velocity = velocity.add(new Vector2(0, 1));
		}

		// Normalize velocity if moving diagonally
		if (velocity.Magnitude > 0) {
			velocity = velocity.Unit;
		}

		// Apply velocity with delta time (using fixed timestep)
		const deltaTime = 1 / 60; // 60 FPS fixed timestep
		const movement = velocity.mul(speed * deltaTime);
		let newPosition = sprite.position.add(movement);

		// Keep sprite on screen (clamping to 0-1 range)
		newPosition = new Vector2(
			math.clamp(newPosition.X, 0.1, 0.9),
			math.clamp(newPosition.Y, 0.1, 0.9),
		);

		// Update sprite component
		world.insert(
			entity,
			GameSprite({
				screenGui: sprite.screenGui,
				imageLabel: sprite.imageLabel,
				position: newPosition,
				velocity: velocity,
			}),
		);

		// Update visual position
		sprite.imageLabel.Position = new UDim2(newPosition.X, -50, newPosition.Y, -50);
	}
}

/**
 * Color change system - animates sprite colors
 * @param world - The game world
 * @param resourceManager - Resource manager for resources
 */
export function changeColorSystem(world: World, resourceManager: ResourceManager): void {
	const time = resourceManager.getResource(Time) as Time | undefined;
	if (!time) return;

	// Get elapsed time (using os.clock() as a fallback)
	const elapsed = os.clock();

	// Calculate color based on time
	const hue = (elapsed * 0.5) % 1; // Cycle through hues
	const color = Color3.fromHSV(hue, 0.8, 1.0);

	// Apply color to all game sprites
	for (const [, sprite] of world.query(GameSprite)) {
		sprite.imageLabel.BackgroundColor3 = color;
	}
}

/**
 * State transition logging system
 * @param world - The game world
 * @param resourceManager - Resource manager for resources
 * @param stateType - The type of state to log
 */
export function logStateTransitions<S extends States>(
	world: World,
	resourceManager: ResourceManager,
	stateType: StateConstructor<S>,
): void {
	// This would normally use StateTransitionEvent, but for simplicity we'll just log current state
	const stateKey = State<S> as ResourceConstructor<State<S>>;
	const currentState = resourceManager.getResource(stateKey) as State<S> | undefined;
	if (currentState) {
		const state = currentState.get();
		print(`[State] ${(stateType as unknown as { name?: string }).name}: ${state.getStateId()}`);
	}
}

/**
 * Initialize input system resources
 * @param world - The game world
 * @param resourceManager - Resource manager for resources
 */
export function initInputResources(world: World, resourceManager: ResourceManager): void {
	// Create and insert ButtonInput resource if it doesn't exist
	const inputKey = ButtonInput<Enum.KeyCode> as ResourceConstructor<ButtonInput<Enum.KeyCode>>;
	if (!resourceManager.getResource(inputKey)) {
		const buttonInput = new ButtonInput<Enum.KeyCode>();
		resourceManager.insertResource(inputKey, buttonInput);
	}

	// Setup UserInputService connections
	const input = resourceManager.getResource(inputKey) as ButtonInput<Enum.KeyCode>;

	UserInputService.InputBegan.Connect((inputObject, gameProcessed) => {
		if (gameProcessed) return;
		if (inputObject.UserInputType === Enum.UserInputType.Keyboard) {
			input.press(inputObject.KeyCode);
		}
	});

	UserInputService.InputEnded.Connect((inputObject, gameProcessed) => {
		if (gameProcessed) return;
		if (inputObject.UserInputType === Enum.UserInputType.Keyboard) {
			input.release(inputObject.KeyCode);
		}
	});
}

/**
 * Update input system - should be called each frame before other systems
 * @param world - The game world
 * @param resourceManager - Resource manager for resources
 */
export function updateInputSystem(world: World, resourceManager: ResourceManager): void {
	const inputKey = ButtonInput<Enum.KeyCode> as ResourceConstructor<ButtonInput<Enum.KeyCode>>;
	const input = resourceManager.getResource(inputKey) as ButtonInput<Enum.KeyCode> | undefined;
	if (input) {
		// Clear just pressed/released states for all keys
		for (const keyCode of Enum.KeyCode.GetEnumItems()) {
			input.clearJustPressed(keyCode as Enum.KeyCode);
			input.clearJustReleased(keyCode as Enum.KeyCode);
		}
	}
}

/**
 * Complex tutorial state computation system
 * Since TutorialComputedState needs multiple sources, we handle it specially
 * @param world - The game world
 * @param resourceManager - Resource manager for resources
 */
export function updateTutorialComputedState(world: World, resourceManager: ResourceManager): void {
	// Temporarily skip this complex computation to avoid errors
	return;

	// TODO: Fix state resource access
	// The following code needs proper state resource type handling
	/*
	// Get all the states we need
	const tutorialStateResource = resourceManager.getResource(State<TutorialState>) as State<TutorialState> | undefined;
	const tutorialState = tutorialStateResource?.get();

	const appStateResource = resourceManager.getResource(State<AppState>) as State<AppState> | undefined;
	const appState = appStateResource?.get();

	const isPausedStateResource = resourceManager.getResource(State<IsPausedState>) as State<IsPausedState> | undefined;
	const isPausedState = isPausedStateResource?.get();

	// Check if we're in game
	const inGame = appState && typeIs(appState.isInGame, "function") ? appState.isInGame() : false;
	*/

	// Simplified version - just return for now
	// The rest of the function is commented out until we fix state resource access
}

// Type imports for state constructors
import type { StateConstructor } from "../../../bevy_state/resources";
import type { States } from "../../../bevy_state/states";