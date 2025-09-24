/**
 * states.ts - State definitions for the computed states example
 * Demonstrates complex state handling with computed states
 */

import { BaseStates, States } from "../../../bevy_state/states";
import { BaseComputedStates, ComputedStates } from "../../../bevy_state/computed-states";

/**
 * Main application state
 * Represents the overall game state with menu and in-game states
 */
export class AppState extends BaseStates {
	public static readonly name = "AppState";

	public constructor(
		private readonly stateType: "Menu" | "InGame",
		private readonly pausedFlag?: boolean,
		private readonly turboFlag?: boolean,
	) {
		super();
	}

	/**
	 * Create the Menu state
	 */
	public static Menu(): AppState {
		return new AppState("Menu");
	}

	/**
	 * Create the InGame state with pause and turbo flags
	 * @param paused - Whether the game is paused
	 * @param turbo - Whether turbo mode is active
	 */
	public static InGame(paused: boolean, turbo: boolean): AppState {
		return new AppState("InGame", paused, turbo);
	}

	public getStateId(): string {
		if (this.stateType === "Menu") {
			return "Menu";
		}
		return `InGame_${this.pausedFlag ? "paused" : "unpaused"}_${this.turboFlag ? "turbo" : "normal"}`;
	}

	public clone(): States {
		return new AppState(this.stateType, this.pausedFlag, this.turboFlag);
	}

	public equals(other: States): boolean {
		if (!(other instanceof AppState)) {
			return false;
		}
		return (
			this.stateType === other.stateType &&
			this.pausedFlag === other.pausedFlag &&
			this.turboFlag === other.turboFlag
		);
	}

	/**
	 * Check if this is a menu state
	 */
	public isMenu(): boolean {
		return this.stateType === "Menu";
	}

	/**
	 * Check if this is an in-game state
	 */
	public isInGame(): boolean {
		return this.stateType === "InGame";
	}

	/**
	 * Get the paused flag (only valid for InGame states)
	 */
	public isPaused(): boolean | undefined {
		return this.pausedFlag;
	}

	/**
	 * Get the turbo flag (only valid for InGame states)
	 */
	public isTurbo(): boolean | undefined {
		return this.turboFlag;
	}
}

/**
 * Tutorial state
 * Controls whether tutorial hints are displayed
 */
export class TutorialState extends BaseStates {
	public static readonly name = "TutorialState";

	public constructor(private readonly active: boolean) {
		super();
	}

	/**
	 * Create the Active tutorial state
	 */
	public static Active(): TutorialState {
		return new TutorialState(true);
	}

	/**
	 * Create the Inactive tutorial state
	 */
	public static Inactive(): TutorialState {
		return new TutorialState(false);
	}

	public getStateId(): string {
		return this.active ? "TutorialActive" : "TutorialInactive";
	}

	public clone(): States {
		return new TutorialState(this.active);
	}

	public equals(other: States): boolean {
		if (!(other instanceof TutorialState)) {
			return false;
		}
		return this.active === other.active;
	}

	/**
	 * Check if tutorial is active
	 */
	public isActive(): boolean {
		return this.active;
	}
}

/**
 * Computed state: InGame
 * Exists when the app is in any InGame state
 */
export class InGameState extends BaseComputedStates<AppState> {
	public static readonly name = "InGameState";
	private exists = false;

	public getStateId(): string {
		return "InGame";
	}

	public clone(): States {
		const cloned = new InGameState();
		cloned.exists = this.exists;
		return cloned;
	}

	public compute(source: AppState | undefined): ComputedStates<AppState> | undefined {
		if (source && source.isInGame()) {
			const result = new InGameState();
			result.exists = true;
			return result;
		}
		return undefined;
	}
}

/**
 * Computed state: TurboMode
 * Exists when the app is in game with turbo mode active
 */
export class TurboModeState extends BaseComputedStates<AppState> {
	public static readonly name = "TurboModeState";
	private exists = false;

	public getStateId(): string {
		return "TurboMode";
	}

	public clone(): States {
		const cloned = new TurboModeState();
		cloned.exists = this.exists;
		return cloned;
	}

	public compute(source: AppState | undefined): ComputedStates<AppState> | undefined {
		if (source && source.isInGame() && source.isTurbo() === true) {
			const result = new TurboModeState();
			result.exists = true;
			return result;
		}
		return undefined;
	}
}

/**
 * Computed state: IsPaused
 * Has two states: Paused and NotPaused when in game
 */
export class IsPausedState extends BaseComputedStates<AppState> {
	public static readonly name = "IsPausedState";

	public constructor(private readonly paused: boolean) {
		super();
	}

	public static Paused(): IsPausedState {
		return new IsPausedState(true);
	}

	public static NotPaused(): IsPausedState {
		return new IsPausedState(false);
	}

	public getStateId(): string {
		return this.paused ? "Paused" : "NotPaused";
	}

	public clone(): States {
		return new IsPausedState(this.paused);
	}

	public compute(source: AppState | undefined): ComputedStates<AppState> | undefined {
		if (source && source.isInGame()) {
			const isPaused = source.isPaused();
			if (isPaused === true) {
				return IsPausedState.Paused();
			} else if (isPaused === false) {
				return IsPausedState.NotPaused();
			}
		}
		return undefined;
	}

	public equals(other: States): boolean {
		if (!(other instanceof IsPausedState)) {
			return false;
		}
		return this.paused === other.paused;
	}

	public isPaused(): boolean {
		return this.paused;
	}
}

/**
 * Complex computed state: Tutorial
 * Depends on TutorialState, InGameState, and IsPausedState
 * Shows different instructions based on game state
 */
export class TutorialComputedState extends BaseComputedStates<TutorialState> {
	public static readonly name = "TutorialComputedState";

	public constructor(private readonly instructionType: "Movement" | "Pause") {
		super();
	}

	public static MovementInstructions(): TutorialComputedState {
		return new TutorialComputedState("Movement");
	}

	public static PauseInstructions(): TutorialComputedState {
		return new TutorialComputedState("Pause");
	}

	public getStateId(): string {
		return this.instructionType === "Movement"
			? "MovementInstructions"
			: "PauseInstructions";
	}

	public clone(): States {
		return new TutorialComputedState(this.instructionType);
	}

	/**
	 * Special compute method that needs multiple source states
	 * This will be called with the tutorial state, but needs to check other states
	 */
	public compute(source: TutorialState | undefined): ComputedStates<TutorialState> | undefined {
		// In the real implementation, this would access multiple states through the resource manager
		// For now, we'll return undefined and handle the logic in the system
		return undefined;
	}

	/**
	 * Advanced compute with multiple sources
	 * This is a custom method for complex state dependencies
	 */
	public computeWithMultipleSources(
		tutorialState: TutorialState | undefined,
		inGameExists: boolean,
		isPausedState: IsPausedState | undefined,
	): TutorialComputedState | undefined {
		// If tutorial is not active, return undefined
		if (!tutorialState || !tutorialState.isActive()) {
			return undefined;
		}

		// If not in game, return undefined
		if (!inGameExists) {
			return undefined;
		}

		// Check pause state
		if (isPausedState && isPausedState.isPaused()) {
			return TutorialComputedState.PauseInstructions();
		} else if (isPausedState && !isPausedState.isPaused()) {
			return TutorialComputedState.MovementInstructions();
		}

		return undefined;
	}

	public equals(other: States): boolean {
		if (!(other instanceof TutorialComputedState)) {
			return false;
		}
		return this.instructionType === other.instructionType;
	}

	public isMovementInstructions(): boolean {
		return this.instructionType === "Movement";
	}

	public isPauseInstructions(): boolean {
		return this.instructionType === "Pause";
	}
}