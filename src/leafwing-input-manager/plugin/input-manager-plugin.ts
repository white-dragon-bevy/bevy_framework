import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { InputManagerSystem } from "./input-manager-system";
import { Actionlike } from "../core/actionlike";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { getKeyboardInput, getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input/resource-storage";
import { Plugin } from "../../bevy_app/plugin";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { AppContext } from "../../bevy_app/context";
import { InputManagerExtension } from "./extensions";
import { InputMapComponent, ActionStateComponent } from "./components";
import { Resource } from "../../bevy_ecs";

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
 * Resource to store the InputManagerPlugin instance in the App
 */
export class InputManagerPluginResource<A extends Actionlike> implements Resource {
	constructor(public plugin: InputManagerPlugin<A>) {}
}

/**
 * Main plugin for the leafwing input manager
 * Integrates with bevy_input for input handling and provides action mapping
 *
 * This plugin implements the Bevy Plugin interface and manages:
 * - Input state synchronization from bevy_input
 * - Action state updates based on input mappings
 * - System scheduling for input processing
 */
export class InputManagerPlugin<A extends Actionlike> implements Plugin {
	private config: InputManagerPluginConfig<A>;
	private world?: World;
	private centralStore?: CentralInputStore;
	private inputSystem?: InputManagerSystem<A>;
	private connections: RBXScriptConnection[] = [];
	private instanceManager?: InputInstanceManager<A>;

	constructor(config: InputManagerPluginConfig<A>) {
		this.config = config;
	}

	/**
	 * Builds the plugin and registers systems with the App
	 * @param app - The Bevy App instance
	 */
	build(app: App): void {
		// Only run on client
		if (RunService.IsServer()) {
			print("[InputManagerPlugin] Skipping initialization on server");
			return;
		}

		// Initialize internal state
		this.world = app.getWorld() as unknown as World;
		this.centralStore = new CentralInputStore();
		this.instanceManager = new InputInstanceManager<A>();
		this.inputSystem = new InputManagerSystem(this.world, this.centralStore, this.config, this.instanceManager);

		// Store the plugin instance as a resource for access by systems
		app.insertResource(InputManagerPluginResource<A>, new InputManagerPluginResource(this));

		// Register extension to AppContext
		const context = app.getContext();
		const pluginInstance = this;
		const extension: InputManagerExtension<A> = {
			getPlugin(): InputManagerPlugin<A> {
				return pluginInstance;
			},
		};
		context.registerExtension("input-manager", extension as InputManagerExtension, {
			description: "Leafwing Input Manager Plugin",
			version: "0.1.0",
		});

		print("[InputManagerPlugin] Initialized successfully");

		// Register systems with the App scheduler
		// PreUpdate: tick and update action states
		app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
			this.tickActionState(world);
		});

		app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
			this.updateActionState(world);
		});

		// PostUpdate: cleanup and finalization
		app.addSystems(MainScheduleLabel.POST_UPDATE, (world: World) => {
			this.releaseOnInputMapRemoved(world);
		});

		if (this.config.networkSync?.enabled) {
			this.setupNetworkSync();
		}
	}

	/**
	 * Ticks the action state - clears just_pressed and just_released
	 * Corresponds to Rust's tick_action_state system
	 */
	private tickActionState(world: World): void {
		if (!this.inputSystem) return;
		this.inputSystem.tickAll(1 / 60);
	}

	/**
	 * Updates the action state based on current inputs
	 * Corresponds to Rust's update_action_state system
	 */
	private updateActionState(world: World): void {
		if (!this.inputSystem || !this.instanceManager) return;

		// Sync input state from bevy_input resources
		this.syncFromBevyInput();

		// Update action states for all entities with input components
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			// Register the actual instances with the manager if not already registered
			if (!this.instanceManager.getInputMap(entity)) {
				this.instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!this.instanceManager.getActionState(entity)) {
				this.instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
			}
		}

		// Update the input system
		this.inputSystem.update(1 / 60);
	}

	/**
	 * Releases action states when input maps are removed
	 * Corresponds to Rust's release_on_input_map_removed system
	 */
	private releaseOnInputMapRemoved(world: World): void {
		// This will be implemented when we have proper component tracking
		// For now, it's a placeholder for consistency with Rust version
	}

	/**
	 * Syncs input state from bevy_input resources
	 */
	private syncFromBevyInput(): void {
		if (!this.world || !this.centralStore) return;

		// Get bevy_input resources from the world
		const keyboardInput = getKeyboardInput(this.world);
		const mouseInput = getMouseInput(this.world);
		const mouseMotion = getMouseMotion(this.world);
		const mouseWheel = getMouseWheel(this.world);

		// Debug: Check if resources exist
		if (!keyboardInput) {
			print("[InputManagerPlugin] WARNING: keyboardInput is null");
		}
		if (!mouseInput) {
			print("[InputManagerPlugin] WARNING: mouseInput is null");
		}

		// Sync to central store
		this.centralStore!.syncFromBevyInput(
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
					if (this.inputSystem) {
						this.inputSystem.syncNetwork();
					}
				}
			}),
		);
	}

	/**
	 * Gets the plugin name
	 * @returns The plugin name
	 */
	name(): string {
		return "InputManagerPlugin";
	}

	/**
	 * Checks if the plugin is unique
	 * @returns Always true - only one input manager should exist per action type
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * Cleans up the plugin resources
	 * @param app - The App instance
	 */
	cleanup(app: App): void {
		// Disconnect all event connections
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections.clear();

		// Clear internal state
		this.world = undefined;
		this.centralStore = undefined;
		this.inputSystem = undefined;
		this.instanceManager = undefined;
	}

	/**
	 * Internal getter for instance manager - used by systems
	 * @internal
	 */
	getInstanceManager(): InputInstanceManager<A> | undefined {
		return this.instanceManager;
	}
}

// Import InputInstanceManager at the end to avoid circular dependency
import { InputInstanceManager } from "./input-instance-manager";