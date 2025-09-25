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
import { registerInputManagerExtension } from "./context-helpers";
import { InputMapComponent, ActionStateComponent } from "./components";
import { Resource } from "../../bevy_ecs";
import { InputInstanceManager } from "./input-instance-manager";

/**
 * Configuration for the InputManagerPlugin
 */
export interface InputManagerPluginConfig<A extends Actionlike> {
	/**
	 * The action type to use
	 */
	actionType: (new (...args: any[]) => A) & { name: string };

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
// Debug counter for limiting log output
let debugCounter = 0;

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
		print(`[InputManagerPlugin] build() called for ${this.config.actionType.name}`);

		// Initialize internal state
		this.world = app.getWorld() as unknown as World;
		this.instanceManager = new InputInstanceManager<A>();

		print(`[InputManagerPlugin] Created InputInstanceManager: ${this.instanceManager !== undefined}`);

		// Store the plugin instance as a resource for access by systems
		app.insertResource(InputManagerPluginResource<A>, new InputManagerPluginResource(this));

		// Register extension to AppContext using dynamic key
		// This needs to be available on both client and server
		const context = app.getContext();
		registerInputManagerExtension(context, this.config.actionType, this);
		print(`[InputManagerPlugin] Registered extension with key: input-manager:${this.config.actionType.name}`);

		const isServer = RunService.IsServer();
		const isClient = RunService.IsClient();

		if (isServer) {
			// Server mode: only register tick system
			// Matches Rust implementation which only adds tick_action_state on server
			print(`[InputManagerPlugin] Initializing on SERVER for ${this.config.actionType.name}`);

			// PreUpdate: tick action states
			app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
				this.tickActionState(world);
			});
		} else if (isClient) {
			// Client mode: full input processing
			print(`[InputManagerPlugin] Initializing on CLIENT for ${this.config.actionType.name}`);

			// Initialize client-only components
			this.centralStore = new CentralInputStore();
			this.inputSystem = new InputManagerSystem(this.world, this.centralStore, this.config, this.instanceManager);

			// Register systems with the App scheduler
			// PreUpdate: tick and update action states
			app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
				debugCounter++;
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

		print(`[InputManagerPlugin] Initialized successfully for ${this.config.actionType.name} on ${isServer ? "SERVER" : "CLIENT"}`)
	}

	/**
	 * Ticks the action state - clears just_pressed and just_released
	 * Corresponds to Rust's tick_action_state system
	 * This runs on both client and server
	 */
	private tickActionState(world: World): void {
		// On server, we only need to tick the instance manager's action states
		// On client, we tick through the input system
		if (RunService.IsServer()) {
			// Server mode: directly tick action states in instance manager
			if (this.instanceManager) {
				// Tick all registered action states
				for (const [entity] of world.query(ActionStateComponent)) {
					const actionState = this.instanceManager.getActionState(entity);
					if (actionState) {
						actionState.tick(1 / 60);
					}
				}
			}
		} else if (this.inputSystem) {
			// Client mode: use input system to tick
			this.inputSystem.tickAll(1 / 60);
		}
	}

	/**
	 * Updates the action state based on current inputs
	 * Corresponds to Rust's update_action_state system
	 * This only runs on client (server doesn't process inputs)
	 */
	private updateActionState(world: World): void {
		// Server doesn't process inputs, only client does
		if (RunService.IsServer()) {
			return;
		}

		if (!this.inputSystem || !this.instanceManager) {
			if (debugCounter % 60 === 0) {
				print(`[InputManagerPlugin] updateActionState skipped:`);
				print(`  - inputSystem: ${this.inputSystem !== undefined}`);
				print(`  - instanceManager: ${this.instanceManager !== undefined}`);
				print(`  - world: ${this.world !== undefined}`);
				print(`  - centralStore: ${this.centralStore !== undefined}`);
			}
			return;
		}

		// Sync input state from bevy_input resources
		this.syncFromBevyInput();

		// Update action states for all entities with input components
		let entityCount = 0;
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			entityCount++;
			// Register the actual instances with the manager if not already registered
			if (!this.instanceManager.getInputMap(entity)) {
				this.instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
				print(`[InputManagerPlugin] Registered InputMap for entity ${entity}`);
			}
			if (!this.instanceManager.getActionState(entity)) {
				this.instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
				print(`[InputManagerPlugin] Registered ActionState for entity ${entity}`);
			}
		}

		// Update the input system
		if (entityCount > 0) {
			this.inputSystem.update(1 / 60);
		}
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
	 * @returns The plugin name with action type
	 */
	name(): string {
		return `InputManagerPlugin<${this.config.actionType.name}>`;
	}

	/**
	 * Checks if the plugin is unique
	 * @returns false - allows multiple InputManagerPlugin with different Action types
	 */
	isUnique(): boolean {
		return false;
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
		if (debugCounter % 60 === 0) {
			print(`[InputManagerPlugin.getInstanceManager] Called`);
			print(`  - this exists: ${this !== undefined}`);
			print(`  - config exists: ${this.config !== undefined}`);
			if (this.config) {
				print(`  - actionType.name: ${this.config.actionType.name}`);
			}
			print(`  - instanceManager exists: ${this.instanceManager !== undefined}`);
			print(`  - world exists: ${this.world !== undefined}`);
			print(`  - centralStore exists: ${this.centralStore !== undefined}`);
			print(`  - inputSystem exists: ${this.inputSystem !== undefined}`);
		}
		return this.instanceManager;
	}
}