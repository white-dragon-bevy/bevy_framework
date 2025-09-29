import { ButtonValue } from "./traits/buttonlike";

import { ButtonInput } from "../../bevy_input/button-input";
import { AccumulatedMouseMotion, AccumulatedMouseWheel, MouseButton } from "../../bevy_input/mouse";
import { UserInputService } from "@rbxts/services";
import { Resource } from "../../bevy_ecs";

/**
 * An overarching store for all user inputs
 *
 * This resource allows values to be updated and fetched in a single location,
 * and ensures that their values are only recomputed once per frame
 */
/**
 * Configuration for gamepad input handling
 */
export interface GamepadConfig {
	readonly deadZone: number;
	readonly sensitivity: number;
}

/**
 * Default gamepad configuration
 */
const DEFAULT_GAMEPAD_CONFIG: GamepadConfig = {
	deadZone: 0.1,
	sensitivity: 1.0,
};

export class CentralInputStore implements Resource {
	private buttonStates: Map<string, ButtonValue> = new Map();
	private axisValues: Map<string, number> = new Map();
	private dualAxisValues: Map<string, Vector2> = new Map();
	private tripleAxisValues: Map<string, Vector3> = new Map();
	private gamepadConfig: GamepadConfig = DEFAULT_GAMEPAD_CONFIG;
	private gamepadConnections: Array<RBXScriptConnection> = [];
	private isGamepadListenerActive = false;

	/**
	 * Clears all existing values
	 *
	 * This should be called once at the start of each frame, before polling for new input
	 */
	clear(): void {
		this.buttonStates.clear();
		this.axisValues.clear();
		this.dualAxisValues.clear();
		this.tripleAxisValues.clear();
	}

	/**
	 * Applies dead zone and sensitivity to a gamepad stick input
	 * @param rawInput - Raw input from the gamepad stick
	 * @returns Processed input with dead zone and sensitivity applied
	 */
	private processGamepadStickInput(rawInput: Vector2): Vector2 {
		const magnitude = rawInput.Magnitude;

		// Apply dead zone
		if (magnitude < this.gamepadConfig.deadZone) {
			return Vector2.zero;
		}

		// Normalize and apply sensitivity
		const normalized = rawInput.Unit;
		const adjustedMagnitude = math.min(
			(magnitude - this.gamepadConfig.deadZone) / (1 - this.gamepadConfig.deadZone) * this.gamepadConfig.sensitivity,
			1.0
		);

		return normalized.mul(adjustedMagnitude);
	}

	/**
	 * Gets the gamepad key from UserInputType and KeyCode
	 * @param userInputType - The gamepad type (Gamepad1-4)
	 * @param keyCode - The key code (Thumbstick1/Thumbstick2)
	 * @returns Formatted gamepad key string
	 */
	private getGamepadStickKey(userInputType: Enum.UserInputType, keyCode: Enum.KeyCode): string {
		const gamepadNumber = userInputType.Name.gsub("Gamepad", "")[0];
		const stickName = keyCode === Enum.KeyCode.Thumbstick1 ? "Left" : "Right";
		return `GamepadStick:${stickName}:${gamepadNumber}`;
	}

	/**
	 * Updates the value of a buttonlike input
	 * @param key - The unique identifier for the button
	 * @param value - The button value
	 */
	updateButtonlike(key: string, value: ButtonValue): void {
		this.buttonStates.set(key, value);
	}

	/**
	 * Updates the value of an axislike input
	 * @param key - The unique identifier for the axis
	 * @param value - The axis value
	 */
	updateAxislike(key: string, value: number): void {
		this.axisValues.set(key, value);
	}

	/**
	 * Updates the value of a dual-axislike input
	 * @param key - The unique identifier for the dual axis
	 * @param value - The dual axis value
	 */
	updateDualAxislike(key: string, value: Vector2): void {
		this.dualAxisValues.set(key, value);
	}

	/**
	 * Updates the value of a triple-axislike input
	 * @param key - The unique identifier for the triple axis
	 * @param value - The triple axis value
	 */
	updateTripleAxislike(key: string, value: Vector3): void {
		this.tripleAxisValues.set(key, value);
	}

	/**
	 * Check if a buttonlike input is currently pressing
	 * @param key - The unique identifier for the button
	 * @returns True if pressed, undefined if never pressed
	 */
	pressed(key: string): boolean | undefined {
		const buttonValue = this.buttonStates.get(key);
		return buttonValue?.pressed;
	}

	/**
	 * Fetches the value of a buttonlike input
	 * @param key - The unique identifier for the button
	 * @returns A value between 0.0 and 1.0
	 */
	buttonValue(key: string): number {
		const buttonValue = this.buttonStates.get(key);
		return buttonValue?.value ?? 0;
	}

	/**
	 * Fetches the full button value object
	 * @param key - The unique identifier for the button
	 * @returns The button value object or undefined
	 */
	getButtonValue(key: string): ButtonValue | undefined {
		return this.buttonStates.get(key);
	}

	/**
	 * Fetches the value of an axislike input
	 * @param key - The unique identifier for the axis
	 * @returns The axis value, typically between -1.0 and 1.0
	 */
	axisValue(key: string): number {
		return this.axisValues.get(key) ?? 0;
	}

	/**
	 * Fetches the value of an axislike input
	 * @param key - The unique identifier for the axis
	 * @returns The axis value or undefined if never set
	 */
	getAxisValue(key: string): number | undefined {
		return this.axisValues.get(key);
	}

	/**
	 * Fetches the value of a dual-axislike input
	 * @param key - The unique identifier for the dual axis
	 * @returns The dual axis value as Vector2
	 */
	dualAxisValue(key: string): Vector2 {
		return this.dualAxisValues.get(key) ?? Vector2.zero;
	}

	/**
	 * Fetches the value of a dual-axislike input
	 * @param key - The unique identifier for the dual axis
	 * @returns The dual axis value or undefined if never set
	 */
	getDualAxisValue(key: string): Vector2 | undefined {
		return this.dualAxisValues.get(key);
	}

	/**
	 * Fetches the value of a triple-axislike input
	 * @param key - The unique identifier for the triple axis
	 * @returns The triple axis value as Vector3
	 */
	tripleAxisValue(key: string): Vector3 {
		return this.tripleAxisValues.get(key) ?? Vector3.zero;
	}

	/**
	 * Fetches the value of a triple-axislike input
	 * @param key - The unique identifier for the triple axis
	 * @returns The triple axis value or undefined if never set
	 */
	getTripleAxisValue(key: string): Vector3 | undefined {
		return this.tripleAxisValues.get(key);
	}

	/**
	 * Returns the number of stored inputs
	 * @returns The total count of all input types
	 */
	size(): number {
		const buttonCount = this.buttonStates.size();
		const axisCount = this.axisValues.size();
		const dualAxisCount = this.dualAxisValues.size();
		const tripleAxisCount = this.tripleAxisValues.size();
		return buttonCount + axisCount + dualAxisCount + tripleAxisCount;
	}

	/**
	 * Updates a keyboard key state
	 * @param keyCode - The keyboard key code
	 * @param pressed - Whether the key is pressed
	 */
	updateKeyboardKey(keyCode: Enum.KeyCode, pressed: boolean): void {
		const key = `keyboard_${keyCode.Name}`;
		this.updateButtonlike(key, { pressed, value: pressed ? 1 : 0 });
	}

	/**
	 * Updates a mouse button state
	 * @param button - The mouse button type
	 * @param pressed - Whether the button is pressed
	 */
	updateMouseButton(button: Enum.UserInputType, pressed: boolean): void {
		const key = `mouse_${button.Name}`;
		this.updateButtonlike(key, { pressed, value: pressed ? 1 : 0 });
	}

	/**
	 * Updates mouse movement
	 * @param delta - The mouse delta movement
	 */
	updateMouseMove(delta: Vector2): void {
		this.updateDualAxislike("mouse_move", delta);
	}

	/**
	 * Updates mouse wheel
	 * @param delta - The wheel delta
	 */
	updateMouseWheel(delta: number): void {
		this.updateAxislike("mouse_wheel", delta);
	}

	/**
	 * Initializes gamepad input listeners
	 * This sets up UserInputService.InputChanged event handling for gamepad sticks
	 */
	initializeGamepadListeners(): void {
		if (this.isGamepadListenerActive) {
			return; // Already initialized
		}


		// Listen for gamepad input changes
		const inputChangedConnection = UserInputService.InputChanged.Connect((input: InputObject) => {
			this.handleGamepadInputChanged(input);
		});

		this.gamepadConnections.push(inputChangedConnection);
		this.isGamepadListenerActive = true;
	}

	/**
	 * Checks if the input type is a gamepad
	 * @param inputType - The UserInputType to check
	 * @returns True if the input type is a gamepad
	 */
	private isGamepadInputType(inputType: Enum.UserInputType): boolean {
		return inputType === Enum.UserInputType.Gamepad1 ||
			inputType === Enum.UserInputType.Gamepad2 ||
			inputType === Enum.UserInputType.Gamepad3 ||
			inputType === Enum.UserInputType.Gamepad4;
	}

	/**
	 * Handles gamepad input changes from UserInputService
	 * @param input - The input object from UserInputService
	 */
	private handleGamepadInputChanged(input: InputObject): void {
		// Check if this is a gamepad input
		if (!this.isGamepadInputType(input.UserInputType)) {
			return;
		}

		// Handle thumbstick inputs
		if (input.KeyCode === Enum.KeyCode.Thumbstick1 || input.KeyCode === Enum.KeyCode.Thumbstick2) {
			const rawInput = new Vector2(input.Position.X, input.Position.Y);
			const processedInput = this.processGamepadStickInput(rawInput);
			const stickKey = this.getGamepadStickKey(input.UserInputType, input.KeyCode);

			// Update dual axis value for the specific gamepad stick
			this.updateDualAxislike(stickKey, processedInput);

			// Also update the legacy gamepad stick keys for backwards compatibility
			const legacyKey = input.KeyCode === Enum.KeyCode.Thumbstick1
				? "gamepad_stick_left"
				: "gamepad_stick_right";
			this.updateDualAxislike(legacyKey, processedInput);
		}
	}

	/**
	 * Sets gamepad configuration
	 * @param config - The gamepad configuration to apply
	 */
	setGamepadConfig(config: Partial<GamepadConfig>): void {
		this.gamepadConfig = {
			...this.gamepadConfig,
			...config,
		};
	}

	/**
	 * Gets the current gamepad configuration
	 * @returns The current gamepad configuration
	 */
	getGamepadConfig(): GamepadConfig {
		return { ...this.gamepadConfig };
	}

	/**
	 * Cleans up gamepad input listeners
	 */
	cleanupGamepadListeners(): void {
		if (!this.isGamepadListenerActive) {
			return;
		}


		for (const connection of this.gamepadConnections) {
			connection.Disconnect();
		}
		this.gamepadConnections.clear();
		this.isGamepadListenerActive = false;
	}

	/**
	 * Updates a gamepad button state
	 * @param keyCode - The gamepad key code
	 * @param pressed - Whether the button is pressed
	 */
	updateGamepadButton(keyCode: Enum.KeyCode, pressed: boolean): void {
		const key = `gamepad_${keyCode.Name}`;
		this.updateButtonlike(key, { pressed, value: pressed ? 1 : 0 });
	}

	/**
	 * Updates left gamepad stick
	 * @param position - The stick position
	 */
	updateGamepadStickLeft(position: Vector3): void {
		this.updateDualAxislike("gamepad_stick_left", new Vector2(position.X, position.Y));
	}

	/**
	 * Updates right gamepad stick
	 * @param position - The stick position
	 */
	updateGamepadStickRight(position: Vector3): void {
		this.updateDualAxislike("gamepad_stick_right", new Vector2(position.X, position.Y));
	}

	/**
	 * 模拟键盘按键输入（用于测试）
	 * @param keyCode - 键盘键码
	 * @param pressed - 是否按下
	 */
	simulateKeyPress(keyCode: Enum.KeyCode, pressed: boolean): void {
		this.updateKeyboardKey(keyCode, pressed);
	}

	/**
	 * 模拟鼠标按键输入（用于测试）
	 * @param button - 鼠标按钮类型
	 * @param pressed - 是否按下
	 */
	simulateMousePress(button: Enum.UserInputType, pressed: boolean): void {
		this.updateMouseButton(button, pressed);
	}

	/**
	 * Synchronizes input state from bevy_input resources
	 * @param keyboardInput - The keyboard ButtonInput resource
	 * @param mouseInput - The mouse ButtonInput resource
	 * @param mouseMotion - The mouse motion resource
	 * @param mouseWheel - The mouse wheel resource
	 */
	syncFromBevyInput(
		keyboardInput?: ButtonInput<Enum.KeyCode>,
		mouseInput?: ButtonInput<Enum.UserInputType>,
		mouseMotion?: AccumulatedMouseMotion,
		mouseWheel?: AccumulatedMouseWheel,
	): void {
		// Don't clear state - we need to preserve it for proper state tracking
		// Only update the values that have changed

		// Sync keyboard state
		if (keyboardInput) {
			// Only check commonly used keys to improve performance
			const commonKeys = [
				Enum.KeyCode.Space, Enum.KeyCode.Return, Enum.KeyCode.LeftShift, Enum.KeyCode.LeftControl,
				Enum.KeyCode.A, Enum.KeyCode.D, Enum.KeyCode.W, Enum.KeyCode.S,
				Enum.KeyCode.Left, Enum.KeyCode.Right, Enum.KeyCode.Up, Enum.KeyCode.Down,
				Enum.KeyCode.Q, Enum.KeyCode.E, Enum.KeyCode.R, Enum.KeyCode.F,
				Enum.KeyCode.One, Enum.KeyCode.Two, Enum.KeyCode.Three, Enum.KeyCode.Four,
				Enum.KeyCode.Tab, Enum.KeyCode.Escape,
			];

			for (const keyCode of commonKeys) {
				const key = `keyboard_${keyCode.Name}`;
				const pressed = keyboardInput.isPressed(keyCode);

				// Always update the state, whether pressed or not
				this.updateButtonlike(key, {
					pressed,
					value: pressed ? 1 : 0
				});
			}
		}

		// Sync mouse button state
		if (mouseInput) {
			const mouseButtons = [
				Enum.UserInputType.MouseButton1,
				Enum.UserInputType.MouseButton2,
				Enum.UserInputType.MouseButton3,
			];

			for (const button of mouseButtons) {
				const key = `mouse_${button.Name}`;
				const pressed = mouseInput.isPressed(button);

				// Always update the state
				this.updateButtonlike(key, {
					pressed,
					value: pressed ? 1 : 0
				});
			}
		}

		// Sync mouse motion
		if (mouseMotion) {
			const deltaX = mouseMotion.getDeltaX();
			const deltaY = mouseMotion.getDeltaY();
			const delta = new Vector2(deltaX, deltaY);
			if (delta.Magnitude > 0) {
				this.updateDualAxislike("mouse_move", delta);
			}
		}

		// Sync mouse wheel
		if (mouseWheel) {
			const delta = mouseWheel.consume();
			if (delta !== undefined && delta !== 0) {
				this.updateAxislike("mouse_wheel", delta);
			}
		}
	}
}