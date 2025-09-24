import { Actionlike } from "../core/actionlike";
import { HashMap, Instant } from "../core";
import { ActionData } from "./action-data";
import { ButtonData } from "./button-data";
import { component } from "@rbxts/matter";

/**
 * Represents the updated state of all actions after processing from InputMap
 */
export interface UpdatedActions<Action extends Actionlike> {
	readonly actionData: HashMap<string, ActionData>;
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
	private readonly actionData: HashMap<string, ActionData>;

	/**
	 * The button-specific state data
	 */
	private readonly buttonData: HashMap<string, ButtonData>;

	/**
	 * Actions that should not be updated from input
	 */
	private readonly disabledActions: Set<string>;

	/**
	 * Is this entire ActionState disabled?
	 */
	private disabled: boolean;

	/**
	 * Creates a new ActionState
	 * @param disabled - Whether the action state is initially disabled
	 */
	constructor(disabled: boolean = false) {
		this.actionData = new Map();
		this.buttonData = new Map();
		this.disabledActions = new Set();
		this.disabled = disabled;
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

		for (const [actionHash, newActionData] of updatedActions.actionData) {
			if (this.disabledActions.has(actionHash)) {
				continue;
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
		}
	}

	/**
	 * Advances the internal state to the next frame
	 * This should be called once per frame after processing input
	 * @param deltaTime - Time since last update
	 */
	public tick(deltaTime?: number): void {
		for (const [, buttonData] of this.buttonData) {
			buttonData.tick();
		}
		if (deltaTime !== undefined) {
			for (const [, actionData] of this.actionData) {
				actionData.tick(deltaTime);
			}
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
		for (const [, actionData] of this.actionData) {
			actionData.reset();
		}

		for (const [, buttonData] of this.buttonData) {
			buttonData.reset();
		}
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

		for (const [, actionData] of this.actionData) {
			if (actionData.pressed) {
				count++;
			}
		}

		return count;
	}

	/**
	 * Gets all currently pressed actions
	 * @returns An array of action hashes that are currently pressed
	 */
	public getActiveActions(): Array<string> {
		const activeActions: Array<string> = [];

		for (const [actionHash, actionData] of this.actionData) {
			if (actionData.pressed) {
				activeActions.push(actionHash);
			}
		}

		return activeActions;
	}

	/**
	 * Gets action by its hash
	 * @param hash - The action hash
	 * @returns The action if found, undefined otherwise
	 */
	public getActionByHash(hash: string): Action | undefined {
		// This is a simplified implementation
		// In a real implementation, you'd need to maintain a reverse mapping
		// from hash to action instance
		return undefined;
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
	 * Gets the action data for the specified action, creating it if it doesn't exist
	 * @param action - The action to get data for
	 * @returns The action data
	 */
	private getActionData(action: Action): ActionData {
		const actionHash = action.hash();
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
}

/**
 * Matter.js component for ActionState
 */
export const ActionStateComponent = component<ActionState<Actionlike>>("ActionState");
