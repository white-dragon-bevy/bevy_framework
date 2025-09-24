/**
 * Example usage of the leafwing-input-manager for Roblox
 * Demonstrates how to set up input handling in a Roblox game
 */

import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import {
	ActionlikeEnum,
	InputControlKind,
	InputMap,
	ActionState,
	KeyCode,
	MouseButton,
	GamepadButton,
	VirtualDPad,
	InputChord,
	ModifierKey,
} from "./index";

/**
 * Define your game's actions
 */
class PlayerAction extends ActionlikeEnum {
	// Movement actions
	static readonly MoveForward = new PlayerAction("MoveForward", InputControlKind.Button);
	static readonly MoveBackward = new PlayerAction("MoveBackward", InputControlKind.Button);
	static readonly MoveLeft = new PlayerAction("MoveLeft", InputControlKind.Button);
	static readonly MoveRight = new PlayerAction("MoveRight", InputControlKind.Button);

	// Combat actions
	static readonly Attack = new PlayerAction("Attack", InputControlKind.Button);
	static readonly Block = new PlayerAction("Block", InputControlKind.Button);
	static readonly SpecialAttack = new PlayerAction("SpecialAttack", InputControlKind.Button);

	// Interaction
	static readonly Interact = new PlayerAction("Interact", InputControlKind.Button);
	static readonly OpenInventory = new PlayerAction("OpenInventory", InputControlKind.Button);

	// Camera control (dual axis)
	static readonly LookAround = new PlayerAction("LookAround", InputControlKind.DualAxis);

	// Movement as dual axis
	static readonly Move = new PlayerAction("Move", InputControlKind.DualAxis);
}

/**
 * Example game setup
 */
export class InputExample {
	private world: World;
	private inputMap: InputMap<PlayerAction>;
	private actionState: ActionState<PlayerAction>;
	private connection?: RBXScriptConnection;

	constructor() {
		this.world = new World();
		this.inputMap = this.createInputMap();
		this.actionState = new ActionState<PlayerAction>();
	}

	/**
	 * Creates the input mapping for the game
	 */
	private createInputMap(): InputMap<PlayerAction> {
		const map = new InputMap<PlayerAction>();

		// Basic movement - WASD and arrow keys
		map.insert(PlayerAction.MoveForward, KeyCode.W);
		map.insert(PlayerAction.MoveForward, KeyCode.Up);

		map.insert(PlayerAction.MoveBackward, KeyCode.S);
		map.insert(PlayerAction.MoveBackward, KeyCode.Down);

		map.insert(PlayerAction.MoveLeft, KeyCode.A);
		map.insert(PlayerAction.MoveLeft, KeyCode.Left);

		map.insert(PlayerAction.MoveRight, KeyCode.D);
		map.insert(PlayerAction.MoveRight, KeyCode.Right);

		// Movement as virtual D-pad for dual axis control
		const movementDpad = new VirtualDPad(
			KeyCode.W,
			KeyCode.S,
			KeyCode.A,
			KeyCode.D,
		);
		map.insert(PlayerAction.Move, movementDpad);

		// Combat - Mouse and gamepad
		map.insert(PlayerAction.Attack, MouseButton.left());
		map.insert(PlayerAction.Attack, GamepadButton.ButtonR2);

		map.insert(PlayerAction.Block, MouseButton.right());
		map.insert(PlayerAction.Block, GamepadButton.ButtonL2);

		// Special attack with chord (Shift + Click)
		const specialAttackChord = InputChord.shiftClick();
		map.insert(PlayerAction.SpecialAttack, specialAttackChord);

		// Interaction
		map.insert(PlayerAction.Interact, KeyCode.E);
		map.insert(PlayerAction.Interact, GamepadButton.ButtonX);

		// Inventory with chord (Ctrl + I)
		const inventoryChord = InputChord.ctrl(KeyCode.I);
		map.insert(PlayerAction.OpenInventory, inventoryChord);
		map.insert(PlayerAction.OpenInventory, KeyCode.Tab);

		// Camera control would use mouse movement
		// This is simplified - real implementation would use MouseMove

		return map;
	}

	/**
	 * Starts the input system
	 */
	start(): void {
		print("[InputExample] Starting input system");

		// Main game loop
		this.connection = RunService.Heartbeat.Connect((deltaTime) => {
			this.update(deltaTime);
		});
	}

	/**
	 * Updates the input system
	 * @param deltaTime - Time since last frame
	 */
	private update(deltaTime: number): void {
		// Tick the action state
		this.actionState.tick(deltaTime);

		// Process inputs (simplified - real implementation would use CentralInputStore)
		// const updatedActions = this.inputMap.processActions(centralStore);

		// Check for pressed actions
		if (this.actionState.justPressed(PlayerAction.Attack)) {
			print("[InputExample] Attack pressed!");
			this.performAttack();
		}

		if (this.actionState.pressed(PlayerAction.Block)) {
			print("[InputExample] Blocking...");
			this.performBlock();
		}

		if (this.actionState.justPressed(PlayerAction.SpecialAttack)) {
			print("[InputExample] Special attack activated!");
			this.performSpecialAttack();
		}

		// Handle movement
		const movement = this.actionState.axisPair(PlayerAction.Move);
		if (movement.x !== 0 || movement.y !== 0) {
			this.handleMovement(movement);
		}

		// Handle interactions
		if (this.actionState.justPressed(PlayerAction.Interact)) {
			print("[InputExample] Interacting with object");
			this.interact();
		}

		if (this.actionState.justPressed(PlayerAction.OpenInventory)) {
			print("[InputExample] Opening inventory");
			this.toggleInventory();
		}
	}

	/**
	 * Example action handlers
	 */
	private performAttack(): void {
		// Attack logic here
		print("Attacking!");
	}

	private performBlock(): void {
		// Block logic here
		print("Blocking damage");
	}

	private performSpecialAttack(): void {
		// Special attack logic
		print("Unleashing special attack!");
	}

	private handleMovement(movement: { x: number; y: number }): void {
		// Movement logic here
		print(`Moving: X=${movement.x}, Y=${movement.y}`);
	}

	private interact(): void {
		// Interaction logic
		print("Checking for nearby interactables");
	}

	private toggleInventory(): void {
		// Inventory toggle logic
		print("Toggling inventory UI");
	}

	/**
	 * Stops the input system
	 */
	stop(): void {
		if (this.connection) {
			this.connection.Disconnect();
			this.connection = undefined;
		}
		print("[InputExample] Input system stopped");
	}
}

/**
 * Advanced example with network synchronization
 */
export class NetworkedInputExample {
	// This would integrate with the plugin system
	// Shows how to use the full plugin architecture

	constructor() {
		// Example of how the plugin would be used:
		/*
		const world = new World();
		const plugin = new InputManagerPlugin(world, {
			actionType: PlayerAction,
			defaultInputMap: this.createInputMap(),
			autoConnect: true,
			networkSync: {
				enabled: true,
				syncRate: 30,
				authority: "client",
			},
		});

		plugin.build();

		// Create player entity with input components
		const playerEntity = world.spawn(
			plugin.createInputBundle(),
			{ LocalPlayer: true },
		);
		*/
	}
}

/**
 * Example of custom input processing
 */
export class CustomInputProcessingExample {
	/**
	 * Shows how to use input processors for analog stick dead zones
	 */
	setupAnalogProcessing(): void {
		// Example with dual axis processor
		/*
		const processor = new DualAxisProcessor();
		processor.setSensitivity(1.5, 1.5);
		processor.setDeadzone(new CircleDeadzone(0.1));

		// Apply to gamepad stick input
		const leftStick = new GamepadStick(GamepadStickSide.Left);
		leftStick.setProcessor(processor);

		const inputMap = new InputMap<PlayerAction>();
		inputMap.insert(PlayerAction.Move, leftStick);
		*/
	}

	/**
	 * Shows how to handle input clashes
	 */
	setupClashResolution(): void {
		// Example of clash detection
		/*
		const detector = new ClashDetector<PlayerAction>();

		// Register actions with their inputs
		detector.registerAction(PlayerAction.Attack, [MouseButton.left()]);
		detector.registerAction(PlayerAction.SpecialAttack, [
			ModifierKey.shift(),
			MouseButton.left(),
		]);

		// Detect clashes
		const clashes = detector.detectClashes();

		// Resolve with strategy (larger combinations win)
		const triggered = detector.resolveClashes(
			clashes,
			ClashStrategy.PrioritizeLargest,
		);
		*/
	}
}

/**
 * Run the example
 */
export function runExample(): void {
	const example = new InputExample();
	example.start();

	// Stop after 30 seconds for demo
	task.wait(30);
	example.stop();
}
