/**
 * Twin Stick Controller Example
 *
 * This is a fairly complete example that implements a twin stick controller.
 *
 * The controller supports both gamepad/MKB inputs and switches between them depending on
 * the most recent input.
 *
 * This example builds on top of several concepts introduced in other examples. In particular,
 * the `default_controls`, `mouse_position`, and `action_state_resource` examples.
 *
 * Ported from: bevy-origin-packages/leafwing-input-manager/examples/twin_stick_controller.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs";
import {
	Actionlike,
	ActionState,
	InputManagerPlugin,
	InputMap,
	InputManagerExtension,
	KeyCode,
	MouseButton,
} from "../../leafwing-input-manager";
import { VirtualDPad } from "../../leafwing-input-manager/user-input/virtual-controls";
import { GamepadButton, GamepadStick } from "../../leafwing-input-manager/user-input/gamepad";

// ----------------------------- Player Action Input Handling -----------------------------

/**
 * Player action types
 */
enum PlayerActionType {
	Move,
	Look,
	Shoot,
}

/**
 * PlayerAction Actionlike implementation
 */
class PlayerAction implements Actionlike {
	constructor(public readonly action: PlayerActionType) {}

	/**
	 * Generates a unique hash for this action
	 * @returns A string hash that uniquely identifies this action
	 */
	hash(): string {
		return `PlayerAction:${this.action}`;
	}

	/**
	 * Checks equality with another action
	 * @param other - The other action to compare with
	 * @returns True if the actions are equal
	 */
	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	/**
	 * Gets the display name for this action
	 * @returns A human-readable name for the action
	 */
	toString(): string {
		return PlayerActionType[this.action];
	}
}

/**
 * Define the default bindings to the input
 * @returns Input map with default bindings
 */
function createDefaultInputMap(): InputMap<PlayerAction> {
	const inputMap = new InputMap<PlayerAction>();

	// Default gamepad input bindings
	inputMap.insert(new PlayerAction(PlayerActionType.Move), GamepadStick.left());
	inputMap.insert(new PlayerAction(PlayerActionType.Look), GamepadStick.right());
	inputMap.insert(new PlayerAction(PlayerActionType.Shoot), new GamepadButton(Enum.KeyCode.ButtonR2));

	// Default kbm input bindings
	inputMap.insert(new PlayerAction(PlayerActionType.Move), VirtualDPad.wasd());
	inputMap.insert(new PlayerAction(PlayerActionType.Look), VirtualDPad.arrowKeys());
	inputMap.insert(new PlayerAction(PlayerActionType.Shoot), MouseButton.left());

	return inputMap;
}

// ----------------------------- Input mode handling -----------------------------

/**
 * Active input mode
 */
enum ActiveInput {
	MouseKeyboard = "MouseKeyboard",
	Gamepad = "Gamepad",
}

/**
 * Active input resource to track current input mode
 */
class ActiveInputResource {
	constructor(public mode: ActiveInput = ActiveInput.MouseKeyboard) {}
}

// ----------------------------- Movement -----------------------------

/**
 * Player marker component
 */
interface Player {
	readonly __brand: "Player";
}

/**
 * Creates a player marker component
 * @returns Player component
 */
function createPlayerMarker(): Player {
	return { __brand: "Player" } as Player;
}

/**
 * Player transform data
 */
interface PlayerTransform {
	position: Vector3;
	rotation: Vector3;
}

/**
 * Control player movement and actions
 * @param world - Bevy world
 * @param context - Application context
 */
function controlPlayer(world: BevyWorld, context: Context): void {
	const actionState = world.resources.getResource<ActionState<PlayerAction>>();

	if (!actionState) {
		return;
	}

	// Get delta time from world (os.clock based timing)
	const currentTime = os.clock();
	const deltaTime = 1 / 60; // Approximate delta time, in real usage this would be tracked

	const moveAction = new PlayerAction(PlayerActionType.Move);
	const lookAction = new PlayerAction(PlayerActionType.Look);
	const shootAction = new PlayerAction(PlayerActionType.Shoot);

	// Handle movement
	const moveAxis = actionState.axisPair(moveAction);

	if (moveAxis.x !== 0 || moveAxis.y !== 0) {
		// Calculate clamped axis manually (ensure magnitude <= 1)
		const magnitude = math.sqrt(moveAxis.x * moveAxis.x + moveAxis.y * moveAxis.y);
		const clampedX = magnitude > 1 ? moveAxis.x / magnitude : moveAxis.x;
		const clampedY = magnitude > 1 ? moveAxis.y / magnitude : moveAxis.y;

		const moveDeltaX = clampedX * deltaTime;
		const moveDeltaY = clampedY * deltaTime;

		// Note: In a real game we'd feed this into an actual player controller
		// and respect the camera extrinsics to ensure the direction is correct
		print(`Player moved by: (${string.format("%.2f", moveDeltaX)}, ${string.format("%.2f", moveDeltaY)})`);
	}

	// Handle looking
	const lookAxis = actionState.axisPair(lookAction);

	if (lookAxis.x !== 0 || lookAxis.y !== 0) {
		// Normalize manually
		const lookMagnitude = math.sqrt(lookAxis.x * lookAxis.x + lookAxis.y * lookAxis.y);
		const normalizedX = lookMagnitude > 0 ? lookAxis.x / lookMagnitude : 0;
		const normalizedY = lookMagnitude > 0 ? lookAxis.y / lookMagnitude : 0;

		print(`Player looking in direction: (${string.format("%.2f", normalizedX)}, ${string.format("%.2f", normalizedY)})`);
	}

	// Handle shooting
	if (actionState.pressed(shootAction)) {
		print("Shoot!");
	}
}

/**
 * Handle mouse look for mouse/keyboard input mode
 *
 * Note: This system would need camera and window systems to work fully in Roblox
 * For now, we'll skip the mouse-to-world projection logic
 * @param world - Bevy world
 * @param context - Application context
 */
function playerMouseLook(world: BevyWorld, context: Context): void {
	const activeInput = world.resources.getResource<ActiveInputResource>();

	if (!activeInput || activeInput.mode !== ActiveInput.MouseKeyboard) {
		return;
	}

	// In Roblox, we would use UserInputService to get mouse position
	// and workspace.CurrentCamera to do raycasting
	// For now, this is a placeholder
	// const userInputService = game.GetService("UserInputService");
	// const mouse = userInputService.GetMouseLocation();
}

// ----------------------------- Input Mode Switching -----------------------------

/**
 * Switch to gamepad when any button is pressed or any axis input used
 *
 * Note: In Roblox, we would listen to UserInputService.GamepadConnected
 * and UserInputService.InputBegan to detect gamepad input
 * @param world - Bevy world
 * @param context - Application context
 */
function activateGamepad(world: BevyWorld, context: Context): void {
	const activeInput = world.resources.getResource<ActiveInputResource>();

	if (!activeInput || activeInput.mode !== ActiveInput.MouseKeyboard) {
		return;
	}

	// Placeholder: In Roblox, we would check for gamepad input events
	// For now, we'll just keep the current mode
}

/**
 * Switch to mouse and keyboard input when any keyboard button is pressed
 *
 * Note: In Roblox, we would listen to UserInputService.InputBegan
 * with InputType.Keyboard to detect keyboard input
 * @param world - Bevy world
 * @param context - Application context
 */
function activateMkb(world: BevyWorld, context: Context): void {
	const activeInput = world.resources.getResource<ActiveInputResource>();

	if (!activeInput || activeInput.mode !== ActiveInput.Gamepad) {
		return;
	}

	// Placeholder: In Roblox, we would check for keyboard input events
	// For now, we'll just keep the current mode
}

// ----------------------------- Scene Setup -----------------------------

/**
 * Setup the scene with camera and player
 *
 * Note: In Roblox, we would create actual Part/Model objects in workspace
 * For now, this is a placeholder
 * @param world - Bevy world
 * @param context - Application context
 */
function setupScene(world: BevyWorld, context: Context): void {
	// In Roblox, we would:
	// 1. Create a camera (or use workspace.CurrentCamera)
	// 2. Create a player model/part in workspace
	// 3. Attach components to track player state

	print("Scene setup complete");
}

// ----------------------------- Application Setup -----------------------------

/**
 * Create the application instance
 * @returns App instance
 */
export function createApp(): App {
	const app = new App();

	// Add default plugins
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// Add InputManagerPlugin
	const inputPlugin = InputManagerPlugin.create<PlayerAction>({
		
	});
	const typedApp = app.addPlugin(inputPlugin);

	// Initialize ActionState resource
	const actionState = new ActionState<PlayerAction>();
	actionState.registerAction(new PlayerAction(PlayerActionType.Move));
	actionState.registerAction(new PlayerAction(PlayerActionType.Look));
	actionState.registerAction(new PlayerAction(PlayerActionType.Shoot));
	typedApp.insertResource<ActionState<PlayerAction>>(actionState);

	// Insert InputMap resource
	const inputMap = createDefaultInputMap();
	typedApp.insertResource<InputMap<PlayerAction>>(inputMap);

	// Initialize active input mode resource
	typedApp.insertResource<ActiveInputResource>(new ActiveInputResource());

	// Add scene setup system
	typedApp.addSystems(MainScheduleLabel.STARTUP, setupScene);

	// Add input mode switching systems
	typedApp.addSystems(MainScheduleLabel.UPDATE, activateGamepad);
	typedApp.addSystems(MainScheduleLabel.UPDATE, activateMkb);

	// Add mouse look system (runs conditionally based on input mode)
	typedApp.addSystems(MainScheduleLabel.UPDATE, playerMouseLook);

	// Add player control system (runs after mouse look)
	typedApp.addSystems(MainScheduleLabel.UPDATE, controlPlayer);

	return typedApp;
}

// ----------------------------- Entry Point -----------------------------

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting Twin Stick Controller Example");
	const app = createApp();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting Twin Stick Controller Example");
	print("========================================");
	print("Twin Stick Controller Example");
	print("Controls:");
	print("  Gamepad:");
	print("    Left Stick - Move");
	print("    Right Stick - Look");
	print("    Right Trigger - Shoot");
	print("  Mouse/Keyboard:");
	print("    WASD - Move");
	print("    Arrow Keys - Look");
	print("    Left Mouse Button - Shoot");
	print("========================================");
	const app = createApp();
	app.run();
}
