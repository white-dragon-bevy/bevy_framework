import { CentralInputStore, GamepadConfig } from "../user-input/central-input-store";
import { GamepadStick, GamepadButton, GamepadControlAxis } from "../user-input/gamepad";

/**
 * Example demonstrating how to use the new gamepad stick input functionality
 */
export function gamepadStickExample(): void {
	print("=== Gamepad Stick Input Example ===");

	// Create a central input store
	const inputStore = new CentralInputStore();

	// Initialize gamepad listeners (this sets up event handling for stick input)
	inputStore.initializeGamepadListeners();

	// Configure gamepad settings (optional)
	const customConfig: Partial<GamepadConfig> = {
		deadZone: 0.15,    // Increase dead zone for less sensitive sticks
		sensitivity: 1.2,   // Increase sensitivity for more responsive input
	};
	inputStore.setGamepadConfig(customConfig);

	print("Gamepad configuration set:");
	const config = inputStore.getGamepadConfig();
	print(`  Dead Zone: ${config.deadZone}`);
	print(`  Sensitivity: ${config.sensitivity}`);

	// Create gamepad input objects
	const leftStick = GamepadStick.left();
	const rightStick = GamepadStick.right();
	const leftStickX = GamepadControlAxis.leftX();
	const leftStickY = GamepadControlAxis.leftY();
	const buttonA = GamepadButton.south();

	print("\nCreated gamepad input objects:");
	print(`  Left Stick: ${leftStick.toString()} (${leftStick.hash()})`);
	print(`  Right Stick: ${rightStick.toString()} (${rightStick.hash()})`);
	print(`  Left Stick X Axis: ${leftStickX.toString()} (${leftStickX.hash()})`);

	// Simulate some gamepad input updates (normally these would come from UserInputService events)
	print("\n=== Simulating Gamepad Input ===");

	// Simulate left stick movement
	const leftStickInput = new Vector2(0.7, -0.3);
	inputStore.updateDualAxislike(leftStick.hash(), leftStickInput);
	print(`Updated left stick to: (${leftStickInput.X}, ${leftStickInput.Y})`);

	// Simulate right stick movement
	const rightStickInput = new Vector2(-0.2, 0.8);
	inputStore.updateDualAxislike(rightStick.hash(), rightStickInput);
	print(`Updated right stick to: (${rightStickInput.X}, ${rightStickInput.Y})`);

	// Simulate button press
	inputStore.updateButtonlike(buttonA.hash(), { pressed: true, value: 1.0 });
	print("Pressed Button A");

	// Read input values
	print("\n=== Reading Input Values ===");

	// Read stick values as Vector2
	const leftAxisPair = leftStick.axisPair(inputStore);
	const rightAxisPair = rightStick.axisPair(inputStore);

	print(`Left Stick: (${string.format("%.3f", leftAxisPair.X)}, ${string.format("%.3f", leftAxisPair.Y)}) | Magnitude: ${string.format("%.3f", leftAxisPair.Magnitude)}`);
	print(`Right Stick: (${string.format("%.3f", rightAxisPair.X)}, ${string.format("%.3f", rightAxisPair.Y)}) | Magnitude: ${string.format("%.3f", rightAxisPair.Magnitude)}`);

	// Read individual axis values
	const leftX = leftStickX.value(inputStore);
	const leftY = leftStickY.value(inputStore);

	print(`Left Stick X: ${string.format("%.3f", leftX)}`);
	print(`Left Stick Y: ${string.format("%.3f", leftY)}`);

	// Read button state
	const buttonPressed = buttonA.pressed(inputStore);
	const buttonValue = buttonA.value(inputStore);

	print(`Button A - Pressed: ${buttonPressed} | Value: ${buttonValue}`);

	// Demonstrate multi-gamepad support
	print("\n=== Multi-Gamepad Support ===");

	// The system automatically handles different gamepads (Gamepad1-4)
	// Stick inputs are tagged with gamepad number for distinction
	print("Gamepad stick keys support multiple controllers:");
	print("  Gamepad1 Left Stick: GamepadStick:Left:1");
	print("  Gamepad2 Left Stick: GamepadStick:Left:2");
	print("  Gamepad1 Right Stick: GamepadStick:Right:1");
	print("  Gamepad2 Right Stick: GamepadStick:Right:2");

	// Legacy compatibility
	print("\n=== Legacy Compatibility ===");
	print("The system maintains backwards compatibility with legacy keys:");
	print("  gamepad_stick_left - Always refers to primary gamepad left stick");
	print("  gamepad_stick_right - Always refers to primary gamepad right stick");

	const legacyLeftStick = inputStore.dualAxisValue("gamepad_stick_left");
	const legacyRightStick = inputStore.dualAxisValue("gamepad_stick_right");

	print(`Legacy Left Stick: (${string.format("%.3f", legacyLeftStick.X)}, ${string.format("%.3f", legacyLeftStick.Y)})`);
	print(`Legacy Right Stick: (${string.format("%.3f", legacyRightStick.X)}, ${string.format("%.3f", legacyRightStick.Y)})`);

	// Example usage in a game loop
	print("\n=== Game Loop Integration ===");
	print("In your game loop, you would typically:");
	print("1. The InputManagerPlugin automatically initializes gamepad listeners");
	print("2. UserInputService.InputChanged events update stick values in real-time");
	print("3. Dead zone and sensitivity are applied automatically");
	print("4. Read stick values using GamepadStick objects or legacy keys");

	// Example movement calculation
	const movementVector = leftAxisPair;
	if (movementVector.Magnitude > 0.1) {
		print(`\nPlayer should move in direction: (${string.format("%.2f", movementVector.X)}, ${string.format("%.2f", movementVector.Y)})`);
		print(`Movement speed: ${string.format("%.1f", movementVector.Magnitude * 100)}%`);
	}

	// Example camera control
	const cameraVector = rightAxisPair;
	if (cameraVector.Magnitude > 0.1) {
		print(`Camera should rotate: Yaw ${string.format("%.1f", cameraVector.X * 180)}° | Pitch ${string.format("%.1f", cameraVector.Y * 90)}°`);
	}

	// Clean up (important for proper resource management)
	print("\n=== Cleanup ===");
	inputStore.cleanupGamepadListeners();
	print("Gamepad listeners cleaned up successfully");

	print("\n=== Example Complete ===");
}

// Configuration examples for different game types
export const GAMEPAD_CONFIG_PRESETS = {
	// For precise controls (strategy games, UI navigation)
	PRECISE: {
		deadZone: 0.05,
		sensitivity: 0.8,
	} as GamepadConfig,

	// Standard controls (most action games)
	STANDARD: {
		deadZone: 0.1,
		sensitivity: 1.0,
	} as GamepadConfig,

	// Fast-paced controls (shooters, racing games)
	RESPONSIVE: {
		deadZone: 0.15,
		sensitivity: 1.5,
	} as GamepadConfig,

	// Accessibility (for players with motor difficulties)
	ACCESSIBILITY: {
		deadZone: 0.25,
		sensitivity: 2.0,
	} as GamepadConfig,
};

/**
 * Example of how to implement gamepad-based player movement
 * @param inputStore - The central input store
 * @param deltaTime - Time since last frame
 * @returns Movement data for the player
 */
export function calculatePlayerMovement(inputStore: CentralInputStore, deltaTime: number): {
	movement: Vector2;
	cameraRotation: Vector2;
	isRunning: boolean;
	isJumping: boolean;
} {
	const leftStick = GamepadStick.left();
	const rightStick = GamepadStick.right();
	const runButton = GamepadButton.leftTrigger();
	const jumpButton = GamepadButton.south();

	// Get stick inputs
	const movementInput = leftStick.axisPair(inputStore);
	const cameraInput = rightStick.axisPair(inputStore);

	// Get button inputs
	const isRunning = runButton.pressed(inputStore);
	const isJumping = jumpButton.pressed(inputStore);

	// Calculate movement with time-based scaling
	const baseSpeed = 10; // units per second
	const runMultiplier = isRunning ? 2 : 1;
	const movement = movementInput.mul(baseSpeed * runMultiplier * deltaTime);

	// Calculate camera rotation (sensitivity can be adjusted)
	const cameraSensitivity = 2; // degrees per second per unit input
	const cameraRotation = cameraInput.mul(cameraSensitivity * deltaTime);

	return {
		movement,
		cameraRotation,
		isRunning,
		isJumping,
	};
}