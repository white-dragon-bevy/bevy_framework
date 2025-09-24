import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { InputManagerSystem } from "./input-manager-system";
import { Actionlike } from "../core/actionlike";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { getKeyboardInput, getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input/resource-storage";

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
 * Integrates with bevy_input for input handling and provides action mapping
 */
export class InputManagerPlugin<A extends Actionlike> {
	private world: World;
	private config: InputManagerPluginConfig<A>;
	private centralStore: CentralInputStore;
	private inputSystem: InputManagerSystem<A>;
	private connections: RBXScriptConnection[] = [];
	private instanceManager: InputInstanceManager<A>;

	constructor(world: World, config: InputManagerPluginConfig<A>) {
		this.world = world;
		this.config = config;
		this.centralStore = new CentralInputStore();
		this.instanceManager = new InputInstanceManager<A>();
		this.inputSystem = new InputManagerSystem(world, this.centralStore, config, this.instanceManager);
	}

	/**
	 * Initializes the plugin and starts systems
	 */
	build(): void {
		this.setupSystems();

		if (this.config.networkSync?.enabled) {
			this.setupNetworkSync();
		}
	}

	/**
	 * Sets up the ECS systems
	 */
	private setupSystems(): void {
		// Run input system every frame
		// This now syncs from bevy_input instead of listening to raw events
		this.connections.push(
			RunService.Heartbeat.Connect((deltaTime) => {
				// Sync input state from bevy_input resources
				this.syncFromBevyInput();

				// Update the input system
				this.inputSystem.update(deltaTime);
			}),
		);
	}

	/**
	 * Syncs input state from bevy_input resources
	 */
	private syncFromBevyInput(): void {
		// Get bevy_input resources from the world
		const keyboardInput = getKeyboardInput(this.world);
		const mouseInput = getMouseInput(this.world);
		const mouseMotion = getMouseMotion(this.world);
		const mouseWheel = getMouseWheel(this.world);


		// Sync to central store
		this.centralStore.syncFromBevyInput(
			keyboardInput,
			mouseInput,
			mouseMotion,
			mouseWheel
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

	/**
	 * Gets the instance manager
	 * @returns The instance manager
	 */
	getInstanceManager(): InputInstanceManager<A> {
		return this.instanceManager;
	}
}

// Import InputInstanceManager at the end to avoid circular dependency
import { InputInstanceManager } from "./input-instance-manager";