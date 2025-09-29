import { Actionlike } from "../actionlike";
import { Instant } from "../instant";
import { ActionData } from "./action-data";
import { ButtonData } from "./button-data";
import { component } from "@rbxts/matter";

/**
 * Represents the updated state of all actions after processing from InputMap
 */
export interface UpdatedActions<Action extends Actionlike> {
	readonly actionData: Map<string, ActionData>;
	readonly consumedInputs: Set<string>;
}

/**
 * Stores the state of all actions for a single entity
 *
 * The ActionState struct tracks the current and previous state of each action,
 * allowing for queries about whether an action is currently pressed, was just pressed,
 * was just released, and how long it has been held down.
 */
export class ActionState<Action extends Actionlike> {
	/**
	 * The current state of each action
	 */
	private readonly actionData: Map<string, ActionData>;

	/**
	 * The button-specific state data
	 */
	private readonly buttonData: Map<string, ButtonData>;

	/**
	 * Actions that should not be updated from input
	 */
	private readonly disabledActions: Set<string>;

	/**
	 * Is this entire ActionState disabled?
	 */
	private disabled: boolean;

	/**
	 * Map from action hash to action instance for reverse lookup
	 */
	private readonly hashToAction: Map<string, Action>;

	/**
	 * Creates a new ActionState
	 * @param disabled - Whether the action state is initially disabled
	 */
	constructor(disabled: boolean = false) {
		this.actionData = new Map();
		this.buttonData = new Map();
		this.disabledActions = new Set();
		this.disabled = disabled;
		this.hashToAction = new Map();
	}

	/**
	 * Creates a new ActionState with default values
	 * @returns A new ActionState instance
	 */
	static default<T extends Actionlike>(): ActionState<T> {
		return new ActionState<T>();
	}

	/**
	 * Is the action currently pressed?
	 * @param action - The action to check
	 * @returns True if the action is currently pressed
	 */
	public pressed(action: Action): boolean {
		return this.getActionData(action).pressed;
	}

	/**
	 * Is the action currently released (not pressed)?
	 * @param action - The action to check
	 * @returns True if the action is currently released
	 */
	public released(action: Action): boolean {
		return !this.pressed(action);
	}

	/**
	 * Was the action pressed this frame?
	 * @param action - The action to check
	 * @returns True if the action was just pressed
	 */
	public justPressed(action: Action): boolean {
		return this.getButtonData(action).justPressed;
	}

	/**
	 * Was the action released this frame?
	 * @param action - The action to check
	 * @returns True if the action was just released
	 */
	public justReleased(action: Action): boolean {
		return this.getButtonData(action).justReleased;
	}

	/**
	 * Gets the current value of the action
	 * For buttons: 0.0 to 1.0
	 * For axes: -1.0 to 1.0
	 * @param action - The action to get the value for
	 * @returns The current value of the action
	 */
	public value(action: Action): number {
		return this.getActionData(action).value;
	}

	/**
	 * Gets the current axis pair value of the action
	 * Only meaningful for dual-axis actions
	 * @param action - The action to get the axis pair for
	 * @returns The current axis pair values
	 */
	public axisPair(action: Action): { x: number; y: number } {
		return this.getActionData(action).getAxisPair();
	}

	/**
	 * How long has the action been held down?
	 * @param action - The action to check
	 * @returns The duration in seconds, or 0 if not pressed
	 */
	public getCurrentDuration(action: Action): number {
		return this.getActionData(action).getCurrentDuration();
	}

	/**
	 * How long was the action held down in the previous frame?
	 * @param action - The action to check
	 * @returns The previous duration in seconds, or 0 if not pressed
	 */
	public getPreviousDuration(action: Action): number {
		return this.getActionData(action).getPreviousDuration();
	}

	/**
	 * When was the action first pressed?
	 * @param action - The action to check
	 * @returns The instant when pressed, or undefined if not pressed
	 */
	public whenPressed(action: Action): Instant | undefined {
		return this.getActionData(action).whenPressed;
	}

	/**
	 * Manually sets the action as pressed
	 * @param action - The action to press
	 * @param value - The value for the action (default 1.0)
	 */
	public press(action: Action, value: number = 1.0): void {
		if (this.disabled || this.disabledActions.has(action.hash())) {
			return;
		}

		// Register the action in the hash map
		const hash = action.hash();
		if (!this.hashToAction.has(hash)) {
			this.hashToAction.set(hash, action);
		}

		const actionData = this.getActionData(action);
		const buttonData = this.getButtonData(action);
		const wasPressed = actionData.pressed;

		actionData.update(true, value);
		buttonData.update(true, wasPressed);
	}

	/**
	 * Manually sets the action as released
	 * @param action - The action to release
	 */
	public release(action: Action): void {
		if (this.disabled || this.disabledActions.has(action.hash())) {
			return;
		}

		const actionData = this.getActionData(action);
		const buttonData = this.getButtonData(action);
		const wasPressed = actionData.pressed;

		actionData.update(false, 0.0);
		buttonData.update(false, wasPressed);
	}

	/**
	 * Updates the action state from processed input data
	 * @param updatedActions - The updated action data from input processing
	 */
	public updateFromUpdatedActions(updatedActions: UpdatedActions<Action>): void {
		if (this.disabled) {
			return;
		}

		updatedActions.actionData.forEach((newActionData, actionHash) => {
			if (this.disabledActions.has(actionHash)) {
				return;
			}

			const currentActionData = this.actionData.get(actionHash) || ActionData.default();
			const currentButtonData = this.buttonData.get(actionHash) || ButtonData.default();
			const wasPressed = currentActionData.pressed;

			// Update action data
			currentActionData.update(
				newActionData.pressed,
				newActionData.value,
				newActionData.axisPairX,
				newActionData.axisPairY,
			);

			// Update button data
			currentButtonData.update(newActionData.pressed, wasPressed);

			this.actionData.set(actionHash, currentActionData);
			this.buttonData.set(actionHash, currentButtonData);
		});
	}

	/**
	 * Advances the internal state to the next frame
	 * This should be called once per frame after processing input
	 * @param deltaTime - Time since last update in seconds
	 */
	public tick(deltaTime?: number): void {
		// Always tick button data
		this.buttonData.forEach((buttonData) => {
			buttonData.tick();
		});

		// Handle timing updates for action data
		if (deltaTime !== undefined) {
			this.actionData.forEach((actionData) => {
				actionData.tickDelta(deltaTime);
			});
		}
	}

	/**
	 * Advances the internal state to the next frame using precise instant-based timing
	 * @param currentInstant - Current time instant
	 * @param previousInstant - Previous time instant
	 */
	public tickWithInstants(currentInstant: Instant, previousInstant: Instant): void {
		// Always tick button data
		this.buttonData.forEach((buttonData) => {
			buttonData.tick();
		});

		// Use precise instant-based timing
		this.actionData.forEach((actionData) => {
			actionData.tick(currentInstant, previousInstant);
		});
	}

	/**
	 * Fixed timestep tick for consistent physics simulation
	 * This method is called during FixedUpdate schedule runs
	 * @param fixedDeltaTime - Fixed delta time in seconds (typically 1/50 or 1/60)
	 */
	public tickFixed(fixedDeltaTime: number): void {
		// Always tick button data for fixed updates
		this.buttonData.forEach((buttonData) => {
			buttonData.tick();
		});

		// Handle timing updates with fixed delta time
		this.actionData.forEach((actionData) => {
			if (actionData.pressed) {
				// Update duration with fixed delta time for consistent physics
				actionData.duration += fixedDeltaTime;

				// Update timing system with fixed delta time
				if (actionData.timing.isActive()) {
					const currentInstant = Instant.now();
					const previousInstant = Instant.fromTimestamp(currentInstant.getTimestamp() - fixedDeltaTime);
					actionData.timing.tick(currentInstant, previousInstant);
				} else {
					// If timing is not active, start it now
					const currentInstant = Instant.now();
					actionData.timing.start(currentInstant);
				}

				// Sync timing.currentDuration with actionData.duration for consistency
				actionData.timing.currentDuration = actionData.duration;
			}
		});
	}

	/**
	 * Registers an action in the state
	 * This ensures the action can be looked up by its hash
	 * @param action - The action to register
	 */
	public registerAction(action: Action): void {
		const hash = action.hash();
		if (!this.hashToAction.has(hash)) {
			this.hashToAction.set(hash, action);
		}
	}

	/**
	 * Resets the state of a specific action
	 * @param action - The action to reset
	 */
	public reset(action: Action): void {
		const actionHash = action.hash();
		this.actionData.get(actionHash)?.reset();
		this.buttonData.get(actionHash)?.reset();
	}

	/**
	 * Resets the state of all actions
	 */
	public resetAll(): void {
		this.actionData.forEach((actionData) => {
			actionData.reset();
		});

		this.buttonData.forEach((buttonData) => {
			buttonData.reset();
		});
	}

	/**
	 * Releases all currently pressed actions
	 * This is useful when the window loses focus to prevent inputs from being "stuck"
	 */
	public releaseAll(): void {
		this.actionData.forEach((data, hash) => {
			if (data.pressed) {
				const wasPressed = data.pressed;
				data.pressed = false;
				data.value = 0;
				data.axisPairX = 0;
				data.axisPairY = 0;

				// Update button data to reflect the release
				const buttonData = this.buttonData.get(hash);
				if (buttonData) {
					buttonData.update(false, wasPressed);
				}
			}
		});
	}

	/**
	 * Clears all action states completely
	 * This removes all action data and resets the state to empty
	 */
	public clear(): void {
		this.actionData.clear();
		this.buttonData.clear();
		this.hashToAction.clear();
		this.disabledActions.clear();
	}

	/**
	 * Disables the specified action
	 * Disabled actions will not be updated from input
	 * @param action - The action to disable
	 */
	public disable(action: Action): void {
		const actionHash = action.hash();
		this.disabledActions.add(actionHash);

		// Release the action if it's currently pressed
		const actionData = this.actionData.get(actionHash);
		if (actionData && actionData.pressed) {
			actionData.reset();
		}

		const buttonData = this.buttonData.get(actionHash);
		if (buttonData) {
			buttonData.reset();
		}
	}

	/**
	 * Enables the specified action
	 * @param action - The action to enable
	 */
	public enable(action: Action): void {
		this.disabledActions.delete(action.hash());
	}

	/**
	 * Disables all actions in this ActionState
	 */
	public disableAll(): void {
		this.disabled = true;
	}

	/**
	 * Enables all actions in this ActionState
	 */
	public enableAll(): void {
		this.disabled = false;
	}

	/**
	 * Checks if the specified action is disabled
	 * @param action - The action to check
	 * @returns True if the action is disabled
	 */
	public isDisabled(action: Action): boolean {
		return this.disabled || this.disabledActions.has(action.hash());
	}

	/**
	 * Checks if this entire ActionState is disabled
	 * @returns True if the entire ActionState is disabled
	 */
	public isDisabledAll(): boolean {
		return this.disabled;
	}

	/**
	 * Gets the number of currently active actions
	 * @returns The number of pressed actions
	 */
	public getActiveActionCount(): number {
		let count = 0;

		this.actionData.forEach((actionData) => {
			if (actionData.pressed) {
				count++;
			}
		});

		return count;
	}

	/**
	 * Gets all currently pressed actions
	 * @returns An array of action hashes that are currently pressed
	 */
	public getActiveActions(): Array<string> {
		const activeActions: Array<string> = [];

		this.actionData.forEach((actionData, actionHash) => {
			if (actionData.pressed) {
				activeActions.push(actionHash);
			}
		});

		return activeActions;
	}

	/**
	 * Gets action by its hash
	 * @param hash - The action hash
	 * @returns The action if found, undefined otherwise
	 */
	public getActionByHash(hash: string): Action | undefined {
		return this.hashToAction.get(hash);
	}

	/**
	 * Sets the axis value for an action
	 * @param action - The action to set
	 * @param value - The axis value
	 */
	public setAxisValue(action: Action, value: number): void {
		if (this.disabled || this.disabledActions.has(action.hash())) {
			return;
		}

		const actionData = this.getActionData(action);
		actionData.value = value;
	}

	/**
	 * Sets the axis pair values for an action
	 * @param action - The action to set
	 * @param axisPair - The axis pair values
	 */
	public setAxisPair(action: Action, axisPair: Vector2): void {
		if (this.disabled || this.disabledActions.has(action.hash())) {
			return;
		}

		const actionData = this.getActionData(action);
		actionData.axisPairX = axisPair.X;
		actionData.axisPairY = axisPair.Y;
	}

	/**
	 * Sets the axis triple values for an action
	 * @param action - The action to set
	 * @param axisTriple - The axis triple values
	 */
	public setAxisTriple(action: Action, axisTriple: Vector3): void {
		if (this.disabled || this.disabledActions.has(action.hash())) {
			return;
		}

		const actionData = this.getActionData(action);
		actionData.axisPairX = axisTriple.X;
		actionData.axisPairY = axisTriple.Y;
		// Note: ActionData doesn't have Z axis, this is a limitation
	}

	/**
	 * Updates an action from action data
	 * @param action - The action to update
	 * @param data - The action data
	 */
	public updateFromActionData(action: Action, data: ActionData): void {
		if (this.disabled || this.disabledActions.has(action.hash())) {
			return;
		}

		const actionData = this.getActionData(action);
		const buttonData = this.getButtonData(action);
		const wasPressed = actionData.pressed;

		// Update action data
		actionData.update(data.pressed, data.value, data.axisPairX, data.axisPairY);

		// Update button data
		buttonData.update(data.pressed, wasPressed);
	}


	/**
	 * Gets the action data Map for internal use
	 * @returns The action data map
	 */
	public getActionDataMap(): Map<string, ActionData> {
		return this.actionData;
	}

	/**
	 * Gets the button data Map for internal use
	 * @returns The button data map
	 */
	public getButtonDataMap(): Map<string, ButtonData> {
		return this.buttonData;
	}

	/**
	 * Gets the hash to action Map for internal use
	 * @returns The hash to action map
	 */
	public getHashToActionMap(): Map<string, Action> {
		return this.hashToAction;
	}

	/**
	 * Swaps all action and button states to their FixedUpdate variants
	 * This is called when transitioning from Update to FixedUpdate schedule
	 */
	public swapToFixedUpdateState(): void {
		if (this.disabled) {
			return;
		}

		// Swap all action data
		this.actionData.forEach((actionData) => {
			actionData.swapToFixedUpdateState();
		});

		// Swap all button data
		this.buttonData.forEach((buttonData) => {
			buttonData.swapToFixedUpdateState();
		});
	}

	/**
	 * Swaps all action and button states back to their Update variants
	 * This is called when transitioning from FixedUpdate to Update schedule
	 */
	public swapToUpdateState(): void {
		if (this.disabled) {
			return;
		}

		// Swap all action data back
		this.actionData.forEach((actionData) => {
			actionData.swapToUpdateState();
		});

		// Swap all button data back
		this.buttonData.forEach((buttonData) => {
			buttonData.swapToUpdateState();
		});
	}

	/**
	 * Legacy method name for backward compatibility
	 * @deprecated Use swapToFixedUpdateState() instead
	 */
	public swapToFixedUpdate(): void {
		this.swapToFixedUpdateState();
	}

	/**
	 * Legacy method name for backward compatibility
	 * @deprecated Use swapToUpdateState() instead
	 */
	public swapToUpdate(): void {
		this.swapToUpdateState();
	}

	/**
	 * Gets the action data for the specified action, creating it if it doesn't exist
	 * @param action - The action to get data for
	 * @returns The action data
	 */
	private getActionData(action: Action): ActionData {
		const actionHash = action.hash();
		// Register the action in the hash map
		if (!this.hashToAction.has(actionHash)) {
			this.hashToAction.set(actionHash, action);
		}

		let actionData = this.actionData.get(actionHash);

		if (actionData === undefined) {
			actionData = ActionData.default();
			this.actionData.set(actionHash, actionData);
		}

		return actionData;
	}

	/**
	 * Gets the button data for the specified action, creating it if it doesn't exist
	 * @param action - The action to get data for
	 * @returns The button data
	 */
	private getButtonData(action: Action): ButtonData {
		const actionHash = action.hash();
		let buttonData = this.buttonData.get(actionHash);

		if (buttonData === undefined) {
			buttonData = ButtonData.default();
			this.buttonData.set(actionHash, buttonData);
		}

		return buttonData;
	}

	/**
	 * Applies an ActionDiff to update this ActionState
	 * Used for network synchronization to apply received action changes
	 * @param diff - The action diff to apply
	 */
	public applyDiff(diff: import("../action-diff").ActionDiff<Action>): void {
		if (this.disabled) {
			return;
		}

		switch (diff.type) {
			case "Pressed": {
				const actionHash = diff.action.hash();
				if (this.disabledActions.has(actionHash)) {
					return;
				}

				const actionData = this.actionData.get(actionHash) || ActionData.default();
				const buttonData = this.buttonData.get(actionHash) || ButtonData.default();
				const wasPressed = actionData.pressed;

				actionData.pressed = true;
				actionData.value = diff.value;
				buttonData.update(true, wasPressed);

				this.actionData.set(actionHash, actionData);
				this.buttonData.set(actionHash, buttonData);
				this.hashToAction.set(actionHash, diff.action);
				break;
			}

			case "Released": {
				const actionHash = diff.action.hash();
				if (this.disabledActions.has(actionHash)) {
					return;
				}

				const actionData = this.actionData.get(actionHash) || ActionData.default();
				const buttonData = this.buttonData.get(actionHash) || ButtonData.default();
				const wasPressed = actionData.pressed;

				actionData.pressed = false;
				actionData.value = 0;
				buttonData.update(false, wasPressed);

				this.actionData.set(actionHash, actionData);
				this.buttonData.set(actionHash, buttonData);
				break;
			}

			case "AxisChanged": {
				const actionHash = diff.action.hash();
				if (this.disabledActions.has(actionHash)) {
					return;
				}

				const actionData = this.actionData.get(actionHash) || ActionData.default();
				actionData.value = diff.value;

				this.actionData.set(actionHash, actionData);
				this.hashToAction.set(actionHash, diff.action);
				break;
			}

			case "DualAxisChanged": {
				const actionHash = diff.action.hash();
				if (this.disabledActions.has(actionHash)) {
					return;
				}

				const actionData = this.actionData.get(actionHash) || ActionData.default();
				actionData.axisPairX = diff.axisPair.X;
				actionData.axisPairY = diff.axisPair.Y;

				this.actionData.set(actionHash, actionData);
				this.hashToAction.set(actionHash, diff.action);
				break;
			}

			case "TripleAxisChanged": {
				const actionHash = diff.action.hash();
				if (this.disabledActions.has(actionHash)) {
					return;
				}

				const actionData = this.actionData.get(actionHash) || ActionData.default();
				actionData.axisPairX = diff.axisTriple.X;
				actionData.axisPairY = diff.axisTriple.Y;
				actionData.value = diff.axisTriple.Z;

				this.actionData.set(actionHash, actionData);
				this.hashToAction.set(actionHash, diff.action);
				break;
			}
		}
	}
}

/**
 * Matter.js component for ActionState
 */
export const ActionStateComponent = component<ActionState<Actionlike>>("ActionState");
