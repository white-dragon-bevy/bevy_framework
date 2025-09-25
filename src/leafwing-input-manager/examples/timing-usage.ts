import { ActionState } from "../action-state/action-state";
import { Instant } from "../core/instant";
import { Actionlike, InputControlKind } from "../core";

/**
 * Example demonstrating the usage of the enhanced Timing system
 */

// Define some example actions
enum ExampleActionEnum {
	Jump,
	Sprint,
	Attack,
}

// Create Actionlike wrapper
class ExampleAction implements Actionlike {
	constructor(private readonly action: ExampleActionEnum) {}

	static readonly Jump = new ExampleAction(ExampleActionEnum.Jump);
	static readonly Sprint = new ExampleAction(ExampleActionEnum.Sprint);
	static readonly Attack = new ExampleAction(ExampleActionEnum.Attack);

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof ExampleAction)) return false;
		return this.action === (other as ExampleAction).action;
	}

	hash(): string {
		return `ExampleAction:${this.action}`;
	}

	toString(): string {
		return ExampleActionEnum[this.action];
	}
}

class TimingExample {
	private actionState: ActionState<ExampleAction>;
	private previousInstant: Instant;

	constructor() {
		this.actionState = ActionState.default<ExampleAction>();
		this.previousInstant = Instant.now();
	}

	/**
	 * Update using the legacy delta time method (backward compatible)
	 * @param deltaTime - Time in seconds since last frame
	 */
	public updateLegacy(deltaTime: number): void {
		// Process input and update action states
		this.actionState.press(ExampleAction.Jump, 1.0);

		// Update timing using delta time
		this.actionState.tick(deltaTime);

		// Check timing information
		const currentDuration = this.actionState.getCurrentDuration(ExampleAction.Jump);
		print(`Legacy - Jump held for: ${currentDuration} seconds`);
	}

	/**
	 * Update using the enhanced instant-based timing system
	 */
	public updateEnhanced(): void {
		const currentInstant = Instant.now();

		// Process input and update action states
		this.actionState.press(ExampleAction.Jump, 1.0);

		// Update timing using precise instants
		this.actionState.tickWithInstants(currentInstant, this.previousInstant);

		// Check current and previous timing information
		const currentDuration = this.actionState.getCurrentDuration(ExampleAction.Jump);
		const previousDuration = this.actionState.getPreviousDuration(ExampleAction.Jump);

		print(`Enhanced - Jump held for: ${currentDuration} seconds`);
		print(`Enhanced - Previous duration: ${previousDuration} seconds`);

		// Update for next frame
		this.previousInstant = currentInstant;
	}

	/**
	 * Example showing complex timing queries
	 */
	public complexTimingExample(): void {
		const currentInstant = Instant.now();

		// Simulate different action states
		this.actionState.press(ExampleAction.Jump, 1.0);
		this.actionState.press(ExampleAction.Sprint, 0.8);
		this.actionState.release(ExampleAction.Attack);

		// Update timing
		this.actionState.tickWithInstants(currentInstant, this.previousInstant);

		// Query timing information
		for (const action of [ExampleAction.Jump, ExampleAction.Sprint, ExampleAction.Attack]) {
			const actionName = action.toString();
			const pressed = this.actionState.pressed(action);
			const justPressed = this.actionState.justPressed(action);
			const justReleased = this.actionState.justReleased(action);
			const currentDuration = this.actionState.getCurrentDuration(action);
			const previousDuration = this.actionState.getPreviousDuration(action);
			const whenPressed = this.actionState.whenPressed(action);

			print(`${actionName}:`);
			print(`  Pressed: ${pressed}`);
			print(`  Just Pressed: ${justPressed}`);
			print(`  Just Released: ${justReleased}`);
			print(`  Current Duration: ${currentDuration}s`);
			print(`  Previous Duration: ${previousDuration}s`);
			print(`  When Pressed: ${whenPressed ? whenPressed.getTimestamp() : "N/A"}`);
		}

		this.previousInstant = currentInstant;
	}

	/**
	 * Example showing how to detect timing-based events
	 */
	public timingBasedEvents(): void {
		const currentInstant = Instant.now();
		this.actionState.tickWithInstants(currentInstant, this.previousInstant);

		// Check for hold duration thresholds
		const jumpDuration = this.actionState.getCurrentDuration(ExampleAction.Jump);

		if (this.actionState.pressed(ExampleAction.Jump)) {
			if (jumpDuration >= 2.0) {
				print("Super jump activated! (held for 2+ seconds)");
			} else if (jumpDuration >= 1.0) {
				print("Charging jump... (held for 1+ seconds)");
			}
		}

		// Check for quick tap detection
		if (this.actionState.justReleased(ExampleAction.Attack)) {
			const previousDuration = this.actionState.getPreviousDuration(ExampleAction.Attack);
			if (previousDuration < 0.2) {
				print("Quick attack! (tap duration < 0.2s)");
			} else {
				print("Charged attack!");
			}
		}

		this.previousInstant = currentInstant;
	}
}

export { TimingExample, ExampleAction };