import { World } from "@rbxts/matter";
import { RunService, UserInputService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { InputManagerSystem } from "./input-manager-system";
import { Actionlike } from "../core/actionlike";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";

/**
 * Configuration for the InputManagerPlugin
 */
export interface InputManagerPluginConfig<A extends Actionlike> {
	/**
	 * The action type to use
	 */
	actionType: new () => A;

	/**
	 * Default input map to use
	 */
	defaultInputMap?: InputMap<A>;

	/**
	 * Whether to auto-connect to input services
	 */
	autoConnect?: boolean;

	/**
	 * Network sync configuration
	 */
	networkSync?: {
		enabled: boolean;
		syncRate?: number; // Hz
		authority?: "client" | "server";
	};
}

/**
 * Components for the input manager system
 */
export interface InputManagerComponents<A extends Actionlike> {
	/**
	 * Component for entities with input mapping
	 */
	InputMap: InputMap<A>;

	/**
	 * Component for entities with action state
	 */
	ActionState: ActionState<A>;

	/**
	 * Component marking an entity as input-enabled
	 */
	InputEnabled: boolean;

	/**
	 * Component marking local player entity
	 */
	LocalPlayer: boolean;
}

/**
 * Main plugin for the leafwing input manager
 * Integrates with Matter ECS to provide input handling
 */
export class InputManagerPlugin<A extends Actionlike> {
	private world: World;
	private config: InputManagerPluginConfig<A>;
	private centralStore: CentralInputStore;
	private inputSystem: InputManagerSystem<A>;
	private connections: RBXScriptConnection[] = [];

	constructor(world: World, config: InputManagerPluginConfig<A>) {
		this.world = world;
		this.config = config;
		this.centralStore = new CentralInputStore();
		this.inputSystem = new InputManagerSystem(world, this.centralStore, config);
	}

	/**
	 * Initializes the plugin and starts systems
	 */
	build(): void {
		if (this.config.autoConnect !== false) {
			this.connectInputServices();
		}

		this.setupSystems();

		if (this.config.networkSync?.enabled) {
			this.setupNetworkSync();
		}
	}

	/**
	 * Connects to Roblox input services
	 */
	private connectInputServices(): void {
		// Connect keyboard input
		this.connections.push(
			UserInputService.InputBegan.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.KeyCode !== Enum.KeyCode.Unknown) {
					this.centralStore.updateKeyboardKey(input.KeyCode, true);
				}
			}),
		);

		this.connections.push(
			UserInputService.InputEnded.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.KeyCode !== Enum.KeyCode.Unknown) {
					this.centralStore.updateKeyboardKey(input.KeyCode, false);
				}
			}),
		);

		// Connect mouse input
		this.connections.push(
			UserInputService.InputBegan.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton1) {
					this.centralStore.updateMouseButton(Enum.UserInputType.MouseButton1, true);
				} else if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton2) {
					this.centralStore.updateMouseButton(Enum.UserInputType.MouseButton2, true);
				} else if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton3) {
					this.centralStore.updateMouseButton(Enum.UserInputType.MouseButton3, true);
				}
			}),
		);

		this.connections.push(
			UserInputService.InputEnded.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton1) {
					this.centralStore.updateMouseButton(Enum.UserInputType.MouseButton1, false);
				} else if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton2) {
					this.centralStore.updateMouseButton(Enum.UserInputType.MouseButton2, false);
				} else if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseButton3) {
					this.centralStore.updateMouseButton(Enum.UserInputType.MouseButton3, false);
				}
			}),
		);

		// Connect mouse movement
		this.connections.push(
			UserInputService.InputChanged.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseMovement) {
					this.centralStore.updateMouseMove(new Vector2(input.Delta.X, input.Delta.Y));
				} else if (!gameProcessed && input.UserInputType === Enum.UserInputType.MouseWheel) {
					this.centralStore.updateMouseWheel(input.Position.Z);
				}
			}),
		);

		// Connect gamepad input
		this.connections.push(
			UserInputService.InputBegan.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.UserInputType.Name.find("Gamepad")[0]) {
					this.centralStore.updateGamepadButton(input.KeyCode, true);
				}
			}),
		);

		this.connections.push(
			UserInputService.InputEnded.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.UserInputType.Name.find("Gamepad")[0]) {
					this.centralStore.updateGamepadButton(input.KeyCode, false);
				}
			}),
		);

		// Connect gamepad sticks
		this.connections.push(
			UserInputService.InputChanged.Connect((input, gameProcessed) => {
				if (!gameProcessed && input.UserInputType === Enum.UserInputType.Gamepad1) {
					if (input.KeyCode === Enum.KeyCode.Thumbstick1) {
						this.centralStore.updateGamepadStickLeft(input.Position);
					} else if (input.KeyCode === Enum.KeyCode.Thumbstick2) {
						this.centralStore.updateGamepadStickRight(input.Position);
					}
				}
			}),
		);
	}

	/**
	 * Sets up the ECS systems
	 */
	private setupSystems(): void {
		// Run input system every frame
		this.connections.push(
			RunService.Heartbeat.Connect((deltaTime) => {
				this.inputSystem.update(deltaTime);
			}),
		);
	}

	/**
	 * Sets up network synchronization
	 */
	private setupNetworkSync(): void {
		const syncRate = this.config.networkSync?.syncRate ?? 30;
		const syncInterval = 1 / syncRate;
		let lastSyncTime = 0;

		this.connections.push(
			RunService.Heartbeat.Connect(() => {
				const currentTime = os.clock();
				if (currentTime - lastSyncTime >= syncInterval) {
					lastSyncTime = currentTime;
					this.inputSystem.syncNetwork();
				}
			}),
		);
	}

	/**
	 * Creates an input bundle for an entity
	 * @param inputMap - The input map for the entity
	 * @returns A bundle of components
	 */
	createInputBundle(inputMap?: InputMap<A>): InputManagerComponents<A> {
		const map = inputMap ?? this.config.defaultInputMap ?? new InputMap<A>();
		const actionState = new ActionState<A>();

		return {
			InputMap: map,
			ActionState: actionState,
			InputEnabled: true,
			LocalPlayer: false,
		};
	}

	/**
	 * Cleans up the plugin
	 */
	destroy(): void {
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections.clear();
	}

	/**
	 * Gets the central input store
	 * @returns The central input store
	 */
	getCentralStore(): CentralInputStore {
		return this.centralStore;
	}

	/**
	 * Gets the input system
	 * @returns The input system
	 */
	getInputSystem(): InputManagerSystem<A> {
		return this.inputSystem;
	}
}
