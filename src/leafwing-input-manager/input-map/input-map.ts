import { Actionlike } from "../actionlike";
import { InputControlKind } from "../input-control-kind";
import { UserInput } from "../user-input/traits/user-input";
import { Buttonlike } from "../user-input/traits/buttonlike";
import { Axislike } from "../user-input/traits/axislike";
import { DualAxislike } from "../user-input/traits/dual-axislike";
import { CentralInputStore } from "../user-input/central-input-store";
import { usePrintDebounce } from "../../utils";
import { ClashDetector } from "../clashing-inputs/clash-detection";
import { ClashStrategyResource } from "../clashing-inputs/clash-strategy";
import type { BevyWorld } from "../../bevy_ecs/types";

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
	 * Optimized to use single-pass traversal
	 * @param inputStore - The central input store containing current input values
	 * @param previousActions - The previous action states for change detection
	 * @param world - The game world for accessing clash strategy resource
	 * @returns Updated action states and consumed inputs
	 */
	processActions(
		inputStore: CentralInputStore,
		previousActions?: Map<string, ProcessedActionState>,
		world?: BevyWorld,
	): ProcessedActions<Action> {
		const actionData: Map<string, ProcessedActionState> = new Map();
		const consumedInputs: Set<string> = new Set();

		// Single-pass: Collect all action states in one traversal
		interface ActionProcessingState {
			actionKey: string;
			pressed: boolean;
			value: number;
			axisPair?: Vector2;
			inputs: Array<UserInput>;
		}

		const actionStates = new Map<string, ActionProcessingState>();

		// Phase 1: Single traversal to collect all action states
		this.actionToInputs.forEach((inputs, actionKey) => {
			let pressed = false;
			let value = 0;
			let axisPair: Vector2 | undefined;

			// Process all inputs for this action
			for (const input of inputs) {
				const controlKind = input.kind();

				if (controlKind === InputControlKind.Button && this.isButtonlike(input)) {
					const buttonPressed = input.pressed(inputStore, this.gamepadAssociation);
					const buttonValue = input.value(inputStore, this.gamepadAssociation);

					if (buttonPressed) {
						pressed = true;
						value = math.max(value, buttonValue);
					}
				} else if (controlKind === InputControlKind.Axis && this.isAxislike(input)) {
					const axisValue = input.value(inputStore, this.gamepadAssociation);

					if (math.abs(axisValue) > 0.01) {
						pressed = true;
						value = math.max(value, math.abs(axisValue));
					}
				} else if (controlKind === InputControlKind.DualAxis && this.isDualAxislike(input)) {
					const dualAxisValue = input.axisPair(inputStore, this.gamepadAssociation);

					if (dualAxisValue.Magnitude > 0.01) {
						pressed = true;
						value = math.max(value, dualAxisValue.Magnitude);
						axisPair = dualAxisValue;
					}
				}
			}

			// Store state for all actions (even unpressed ones for complete state tracking)
			const inputsArray: Array<UserInput> = [];
			for (const input of inputs) {
				inputsArray.push(input);
			}

			actionStates.set(actionKey, {
				actionKey,
				pressed,
				value,
				axisPair,
				inputs: inputsArray,
			});
		});

		// Phase 2: Clash detection and resolution (only for pressed actions)
		let allowedActions: Set<string> | undefined;
		const pressedActions: Array<ActionProcessingState> = [];

		// Filter to pressed actions for clash detection
		actionStates.forEach((state) => {
			if (state.pressed) {
				pressedActions.push(state);
			}
		});

		if (world && pressedActions.size() > 1) {
			const clashStrategyResource = world.resources.getResource<ClashStrategyResource>();

			if (clashStrategyResource) {
				const detector = new ClashDetector<Action>();

				// Register all pressed actions
				for (const state of pressedActions) {
					// Create a mock action from the action key
					const mockAction = {
						hash() {
							return state.actionKey;
						},
					} as Action;

					detector.registerAction(mockAction, state.inputs);
				}

				// Detect and resolve clashes
				const clashes = detector.detectClashes();
				allowedActions = detector.resolveClashes(clashes, clashStrategyResource.strategy);
			}
		}

		// Phase 3: Build final action data (no additional traversal)
		for (const [actionKey, state] of actionStates) {
			// Determine if this action should trigger
			let shouldTrigger = false;

			if (state.pressed) {
				// If clash resolution was performed, check if allowed
				if (allowedActions) {
					shouldTrigger = allowedActions.has(actionKey);
				} else {
					// No clash resolution, allow all pressed actions
					shouldTrigger = true;
				}
			}

			// Calculate final states
			const pressed = shouldTrigger;
			const value = shouldTrigger ? state.value : 0;
			const axisPair = shouldTrigger ? state.axisPair : undefined;

			const previousState = previousActions?.get(actionKey);
			const justPressed = pressed && !(previousState?.pressed ?? false);
			const justReleased = !pressed && (previousState?.pressed ?? false);

			// Mark inputs as consumed if triggered
			if (shouldTrigger) {
				for (const input of state.inputs) {
					consumedInputs.add(input.hash());
				}
			}

			actionData.set(actionKey, {
				pressed,
				justPressed,
				justReleased,
				value,
				axisPair,
			});
		}

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

	/**
	 * Gets all user inputs bound in this InputMap
	 * @returns Array of all user inputs
	 */
	getAllInputs(): Array<UserInput> {
		const allInputs: Array<UserInput> = [];
		this.actionToInputs.forEach((inputs) => {
			for (const input of inputs) {
				// Avoid duplicates
				if (!allInputs.includes(input)) {
					allInputs.push(input);
				}
			}
		});
		return allInputs;
	}
}

/**
 * Matter.js component for InputMap
 */
export const InputMapComponent = component<InputMap<Actionlike>>("InputMap");
