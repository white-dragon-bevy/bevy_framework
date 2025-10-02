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
	/** Whether to use polling for gamepad input (disable in tests) */
	private useGamepadPolling = true;

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
	 * 清除每帧输入数据（鼠标移动和滚轮）
	 *
	 * 此方法只清除每帧的移动数据，不清除按钮状态。
	 * 应在每帧结束时调用，以防止数据在帧之间累积。
	 */
	clearFrameData(): void {
		// 清除鼠标移动数据
		this.dualAxisValues.delete("MouseMove");
		this.dualAxisValues.delete("mouse_move");

		// 清除鼠标滚轮数据
		this.dualAxisValues.delete("MouseScroll");
		this.axisValues.delete("mouse_wheel");
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
		this.updateDualAxislike("MouseMove", delta);
	}

	/**
	 * Updates mouse wheel
	 * @param delta - The wheel delta
	 */
	updateMouseWheel(delta: number): void {
		this.updateAxislike("mouse_wheel", delta);
		// Also update as dual-axis (Y-axis only for backwards compatibility)
		this.updateDualAxislike("MouseScroll", new Vector2(0, delta));
	}

	/**
	 * Updates mouse wheel (dual-axis vector)
	 * @param delta - The wheel delta vector
	 */
	updateMouseWheelVector(delta: Vector2): void {
		this.updateAxislike("mouse_wheel", delta.Y);
		this.updateDualAxislike("MouseScroll", delta);
	}

	/**
	 * Polls gamepad state synchronously (replaces async event listeners)
	 * This should be called once per frame during input sync
	 * @param gamepadNum - The gamepad number (1-4), defaults to 1
	 */
	pollGamepadState(gamepadNum: number = 1): void {
		const gamepadType = this.getGamepadType(gamepadNum);
		if (!gamepadType) {
			return;
		}

		// Get all gamepad state for this gamepad
		const gamepadStates = UserInputService.GetGamepadState(gamepadType);

		for (const state of gamepadStates) {
			// Handle thumbstick inputs
			if (state.KeyCode === Enum.KeyCode.Thumbstick1 || state.KeyCode === Enum.KeyCode.Thumbstick2) {
				const rawInput = new Vector2(state.Position.X, state.Position.Y);
				const processedInput = this.processGamepadStickInput(rawInput);
				const stickKey = this.getGamepadStickKey(gamepadType, state.KeyCode);

				// Update dual axis value for the specific gamepad stick
				this.updateDualAxislike(stickKey, processedInput);

				// Also update the legacy gamepad stick keys for backwards compatibility
				const legacyKey = state.KeyCode === Enum.KeyCode.Thumbstick1
					? "gamepad_stick_left"
					: "gamepad_stick_right";
				this.updateDualAxislike(legacyKey, processedInput);
			}
			// Handle button inputs
			else {
				const pressed = state.Position.Magnitude > 0.5; // Trigger threshold
				this.updateGamepadButton(state.KeyCode, pressed);
			}
		}
	}

	/**
	 * Gets the gamepad type enum from gamepad number
	 * @param gamepadNum - The gamepad number (1-4)
	 * @returns The corresponding Enum.UserInputType or undefined
	 */
	private getGamepadType(gamepadNum: number): Enum.UserInputType | undefined {
		switch (gamepadNum) {
			case 1:
				return Enum.UserInputType.Gamepad1;
			case 2:
				return Enum.UserInputType.Gamepad2;
			case 3:
				return Enum.UserInputType.Gamepad3;
			case 4:
				return Enum.UserInputType.Gamepad4;
			default:
				return undefined;
		}
	}

	/**
	 * @deprecated Use pollGamepadState() instead. This method is kept for backward compatibility but does nothing.
	 */
	initializeGamepadListeners(): void {
		// No-op: We now use polling instead of event listeners
		warn("CentralInputStore.initializeGamepadListeners() is deprecated. Gamepad input now uses polling.");
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
	 * Disables gamepad polling (for testing)
	 * When disabled, gamepad state must be updated manually via updateGamepadButton/updateGamepadStick* methods
	 */
	disableGamepadPolling(): void {
		this.useGamepadPolling = false;
	}

	/**
	 * Enables gamepad polling (default)
	 */
	enableGamepadPolling(): void {
		this.useGamepadPolling = true;
	}

	/**
	 * Checks if gamepad polling is enabled
	 * @returns True if polling is enabled
	 */
	isGamepadPollingEnabled(): boolean {
		return this.useGamepadPolling;
	}

	/**
	 * @deprecated Gamepad input now uses polling. This method is kept for backward compatibility but does nothing.
	 */
	cleanupGamepadListeners(): void {
		// No-op: We now use polling instead of event listeners
		// Clear old connection tracking for safety
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
	 * @param keysToSync - Optional set of keyboard keys to sync. If not provided, syncs all pressed keys.
	 * @param pollGamepad - Whether to poll gamepad state (default true)
	 */
	syncFromBevyInput(
		keyboardInput?: ButtonInput<Enum.KeyCode>,
		mouseInput?: ButtonInput<Enum.UserInputType>,
		mouseMotion?: AccumulatedMouseMotion,
		mouseWheel?: AccumulatedMouseWheel,
		keysToSync?: ReadonlySet<Enum.KeyCode>,
		pollGamepad: boolean = true,
	): void {
		// Don't clear state - we need to preserve it for proper state tracking
		// Only update the values that have changed

		// Sync keyboard state
		if (keyboardInput) {
			// If specific keys are provided, sync only those
			// Otherwise sync all pressed keys from ButtonInput
			if (keysToSync && keysToSync.size() > 0) {
				for (const keyCode of keysToSync) {
					const key = `keyboard_${keyCode.Name}`;
					const pressed = keyboardInput.isPressed(keyCode);

					// Always update the state, whether pressed or not
					this.updateButtonlike(key, {
						pressed,
						value: pressed ? 1 : 0
					});
				}
			} else {
				// Fallback: sync all currently pressed keys
				const pressedKeys = keyboardInput.getPressed();
				for (const keyCode of pressedKeys) {
					const key = `keyboard_${keyCode.Name}`;
					this.updateButtonlike(key, {
						pressed: true,
						value: 1
					});
				}
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
			// Always update, even if delta is zero (to clear previous frame's data)
			this.updateDualAxislike("MouseMove", delta);
		}

		// Sync mouse wheel
		if (mouseWheel) {
			const delta = mouseWheel.consume();
			if (delta !== undefined && delta !== 0) {
				this.updateAxislike("mouse_wheel", delta);
			}
		}

		// Poll gamepad state synchronously (replaces async event listeners)
		// Only poll if enabled (disabled in tests where GamepadSimulator updates directly)
		if (pollGamepad && this.useGamepadPolling) {
			// Poll all connected gamepads
			for (let gamepadNum = 1; gamepadNum <= 4; gamepadNum++) {
				this.pollGamepadState(gamepadNum);
			}
		}
	}
}
