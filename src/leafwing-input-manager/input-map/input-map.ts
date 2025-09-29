import { Actionlike } from "../actionlike";
import { InputControlKind } from "../input-control-kind";
import { UserInput } from "../user-input/traits/user-input";
import { Buttonlike } from "../user-input/traits/buttonlike";
import { Axislike } from "../user-input/traits/axislike";
import { DualAxislike } from "../user-input/traits/dual-axislike";
import { CentralInputStore } from "../user-input/central-input-store";
import { usePrintDebounce } from "../../utils";

import { component } from "@rbxts/matter";

/**
 * Represents the current state of an action during input processing
 */
export interface ProcessedActionState {
	readonly pressed: boolean;
	readonly justPressed: boolean;
	readonly justReleased: boolean;
	readonly value: number;
	readonly axisPair?: Vector2;
}

/**
 * Represents the updated state of all actions after processing
 * Note: This returns ProcessedActionState which will be converted to ActionData by the system
 */
export interface ProcessedActions<Action extends Actionlike> {
	readonly actionData: Map<string, ProcessedActionState>;
	readonly consumedInputs: Set<string>;
}

/**
 * Maps logical actions to physical inputs in a many-to-one fashion
 *
 * This allows you to abstract over the actual input method, making it easy
 * to implement input rebinding and support multiple controllers at once.
 */
export class InputMap<Action extends Actionlike> {
	private readonly actionToInputs: Map<string, Set<UserInput>>;
	private readonly inputToActions: Map<string, Set<string>>;
	private readonly gamepadAssociation: number | undefined;

	/**
	 * Creates a new InputMap
	 * @param gamepad - Optional gamepad entity for multi-player support
	 */
	constructor(gamepad?: number) {
		this.actionToInputs = new Map();
		this.inputToActions = new Map();
		this.gamepadAssociation = gamepad;
	}

	/**
	 * Inserts a single input for the specified action
	 * @param action - The action to bind the input to
	 * @param input - The input to bind
	 * @returns This InputMap for method chaining
	 */
	insert(action: Action, input: UserInput): InputMap<Action> {
		const actionKey = action.hash();
		const inputKey = input.hash();

		// Update action to inputs mapping
		let inputs = this.actionToInputs.get(actionKey);
		if (inputs === undefined) {
			inputs = new Set();
			this.actionToInputs.set(actionKey, inputs);
		}
		inputs.add(input);

		// Update input to actions mapping
		let actions = this.inputToActions.get(inputKey);
		if (actions === undefined) {
			actions = new Set();
			this.inputToActions.set(inputKey, actions);
		}
		actions.add(actionKey);

		return this;
	}

	/**
	 * Inserts multiple inputs for the specified action
	 * @param action - The action to bind the inputs to
	 * @param inputs - Array of inputs to bind
	 * @returns This InputMap for method chaining
	 */
	insertMultiple(action: Action, inputs: Array<UserInput>): InputMap<Action> {
		for (const input of inputs) {
			this.insert(action, input);
		}
		return this;
	}

	/**
	 * Removes a specific input binding for an action
	 * @param action - The action to remove the binding from
	 * @param input - The input to remove
	 * @returns True if the binding was removed, false if it didn't exist
	 */
	remove(action: Action, input: UserInput): boolean {
		const actionKey = action.hash();
		const inputKey = input.hash();
		const inputs = this.actionToInputs.get(actionKey);

		if (inputs === undefined) {
			return false;
		}

		const removed = inputs.delete(input);

		if (removed) {
			// Update reverse mapping
			const actions = this.inputToActions.get(inputKey);
			if (actions) {
				actions.delete(actionKey);
				if (actions.size() === 0) {
					this.inputToActions.delete(inputKey);
				}
			}

			// Clean up empty sets
			if (inputs.size() === 0) {
				this.actionToInputs.delete(actionKey);
			}
		}

		return removed;
	}

	/**
	 * Removes all input bindings for the specified action
	 * @param action - The action to clear
	 * @returns True if any bindings were removed
	 */
	clearAction(action: Action): boolean {
		const actionKey = action.hash();
		const inputs = this.actionToInputs.get(actionKey);

		if (inputs) {
			// Remove reverse mappings
			for (const input of inputs) {
				const inputKey = input.hash();
				const actions = this.inputToActions.get(inputKey);
				if (actions) {
					actions.delete(actionKey);
					if (actions.size() === 0) {
						this.inputToActions.delete(inputKey);
					}
				}
			}
		}

		return this.actionToInputs.delete(actionKey);
	}

	/**
	 * Removes all input bindings from this InputMap
	 */
	clear(): void {
		this.actionToInputs.clear();
		this.inputToActions.clear();
	}

	/**
	 * Builder pattern method to add a single input binding
	 * @param action - The action to bind the input to
	 * @param input - The input to bind
	 * @returns A new InputMap with the binding added
	 */
	with(action: Action, input: UserInput): InputMap<Action> {
		const newInputMap = this.clone();
		return newInputMap.insert(action, input);
	}

	/**
	 * Builder pattern method to add multiple input bindings
	 * @param action - The action to bind the inputs to
	 * @param inputs - Array of inputs to bind
	 * @returns A new InputMap with the bindings added
	 */
	withMultiple(action: Action, inputs: Array<UserInput>): InputMap<Action> {
		const newInputMap = this.clone();
		return newInputMap.insertMultiple(action, inputs);
	}

	/**
	 * Creates a deep copy of this InputMap
	 * @returns A new InputMap with the same bindings
	 */
	clone(): InputMap<Action> {
		const clonedMap = new InputMap<Action>(this.gamepadAssociation);

		this.actionToInputs.forEach((inputs, actionKey) => {
			const clonedInputs = new Set<UserInput>();
			for (const input of inputs) {
				clonedInputs.add(input);
			}
			clonedMap.actionToInputs.set(actionKey, clonedInputs);
		});

		return clonedMap;
	}

	/**
	 * Processes all inputs and generates updated action states
	 * @param inputStore - The central input store containing current input values
	 * @param previousActions - The previous action states for change detection
	 * @returns Updated action states and consumed inputs
	 */
	processActions(
		inputStore: CentralInputStore,
		previousActions?: Map<string, ProcessedActionState>,
	): ProcessedActions<Action> {
		const actionData: Map<string, ProcessedActionState> = new Map();
		const consumedInputs: Set<string> = new Set();

		this.actionToInputs.forEach((inputs, actionKey) => {
			let pressed = false;
			let value = 0;
			let axisPair: Vector2 | undefined;

			// 调试: 检查jump动作
			if (actionKey.find("jump")[0]) {
				usePrintDebounce(`[InputMap.processActions] 🌟 处理 jump 动作 - 输入数量: ${inputs.size()}`, 3);
			}

			// Process all inputs for this action
			for (const input of inputs) {
				const inputHash = input.hash();

				// Skip if this input was already consumed by another action
				if (consumedInputs.has(inputHash)) {
					continue;
				}

				const controlKind = input.kind();

				if (controlKind === InputControlKind.Button && this.isButtonlike(input)) {
					const buttonPressed = input.pressed(inputStore, this.gamepadAssociation);
					const buttonValue = input.value(inputStore, this.gamepadAssociation);

					// 调试: 检查空格键
					if (inputHash.find("Space")[0] && actionKey.find("jump")[0]) {
						usePrintDebounce(`[InputMap] 🎮 空格键状态 - pressed: ${buttonPressed}, value: ${buttonValue}, hash: ${inputHash}`, 2);
					}

					if (buttonPressed) {
						pressed = true;
						value = math.max(value, buttonValue);
						consumedInputs.add(inputHash);
					}
				} else if (controlKind === InputControlKind.Axis && this.isAxislike(input)) {
					const axisValue = input.value(inputStore, this.gamepadAssociation);

					if (math.abs(axisValue) > 0.01) { // Dead zone threshold
						pressed = true;
						value = math.max(value, math.abs(axisValue));
						consumedInputs.add(inputHash);
					}
				} else if (controlKind === InputControlKind.DualAxis && this.isDualAxislike(input)) {
					const dualAxisValue = input.axisPair(inputStore, this.gamepadAssociation);

					if (dualAxisValue.Magnitude > 0.01) { // Dead zone threshold
						pressed = true;
						value = math.max(value, dualAxisValue.Magnitude);
						axisPair = dualAxisValue;
						consumedInputs.add(inputHash);
					}
				}
			}

			// Determine just pressed and just released states
			const previousState = previousActions?.get(actionKey);
			const justPressed = pressed && !(previousState?.pressed ?? false);
			const justReleased = !pressed && (previousState?.pressed ?? false);

			// 调试: 记录jump动作状态
			if (actionKey.find("jump")[0] && (pressed || justPressed || justReleased)) {
				usePrintDebounce(`[InputMap] 🎯 jump 最终状态 - pressed: ${pressed}, justPressed: ${justPressed}, value: ${value}`, 2);
			}

			actionData.set(actionKey, {
				pressed,
				justPressed,
				justReleased,
				value,
				axisPair,
			});
		});

		return {
			actionData,
			consumedInputs,
		};
	}

	/**
	 * Gets all inputs bound to a specific action
	 * @param action - The action to query
	 * @returns Array of inputs bound to the action
	 */
	getInputs(action: Action): Array<UserInput> {
		const actionKey = action.hash();
		const inputs = this.actionToInputs.get(actionKey);
		return inputs ? [...inputs] : [];
	}

	/**
	 * Gets all actions that have input bindings
	 * @returns Array of action keys that have bindings
	 */
	getActions(): Array<string> {
		const actions: Array<string> = [];
		this.actionToInputs.forEach((_, actionKey) => {
			actions.push(actionKey);
		});
		return actions;
	}

	/**
	 * Checks if an action has any input bindings
	 * @param action - The action to check
	 * @returns True if the action has bindings
	 */
	hasAction(action: Action): boolean {
		const actionKey = action.hash();
		const inputs = this.actionToInputs.get(actionKey);
		return inputs !== undefined && inputs.size() > 0;
	}

	/**
	 * Gets the gamepad entity associated with this InputMap
	 * @returns The gamepad entity or undefined
	 */
	getGamepad(): number | undefined {
		return this.gamepadAssociation;
	}

	/**
	 * Clears the gamepad association from this InputMap
	 * This makes the InputMap generic and not specific to any gamepad
	 */
	private clearGamepad(): void {
		(this as unknown as { gamepadAssociation: number | undefined }).gamepadAssociation = undefined;
	}

	/**
	 * Merges another InputMap into this one
	 * If the gamepad associations don't match, this InputMap's gamepad association will be cleared
	 * @param other - The InputMap to merge from
	 */
	merge(other: InputMap<Action>): void {
		if (this.gamepadAssociation !== other.gamepadAssociation) {
			this.clearGamepad();
		}

		other.actionToInputs.forEach((inputs, actionKey) => {
			for (const input of inputs) {
				// We need to reconstruct the action from the hash
				// This is a limitation of the current design
				// For testing purposes, we'll add the inputs directly
				const existingInputs = this.actionToInputs.get(actionKey) || new Set();
				existingInputs.add(input);
				this.actionToInputs.set(actionKey, existingInputs);

				// Update reverse mapping
				const inputKey = input.hash();
				const actions = this.inputToActions.get(inputKey) || new Set();
				actions.add(actionKey);
				this.inputToActions.set(inputKey, actions);
			}
		});
	}

	/**
	 * Returns the total number of input bindings
	 * @returns The total count of all input bindings
	 */
	size(): number {
		let totalBindings = 0;
		this.actionToInputs.forEach((inputs) => {
			totalBindings += inputs.size();
		});
		return totalBindings;
	}

	/**
	 * Type guard to check if an input is buttonlike
	 * @param input - The input to check
	 * @returns True if the input is buttonlike
	 */
	private isButtonlike(input: UserInput): input is Buttonlike {
		return input.kind() === InputControlKind.Button;
	}

	/**
	 * Type guard to check if an input is axislike
	 * @param input - The input to check
	 * @returns True if the input is axislike
	 */
	private isAxislike(input: UserInput): input is Axislike {
		return input.kind() === InputControlKind.Axis;
	}

	/**
	 * Type guard to check if an input is dual-axislike
	 * @param input - The input to check
	 * @returns True if the input is dual-axislike
	 */
	private isDualAxislike(input: UserInput): input is DualAxislike {
		return input.kind() === InputControlKind.DualAxis;
	}
}

/**
 * Matter.js component for InputMap
 */
export const InputMapComponent = component<InputMap<Actionlike>>("InputMap");
