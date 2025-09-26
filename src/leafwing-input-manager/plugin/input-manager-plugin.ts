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
import { BuiltinSchedules } from "../../bevy_app/main-schedule";

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
		app.insertResource<InputManagerPluginResource<A>>(new InputManagerPluginResource(this));

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

			// Initialize gamepad input listeners
			this.centralStore.initializeGamepadListeners();

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

			// Fixed Update support: comprehensive fixed timestep input handling
			// 1. Swap to fixed update state before the fixed main loop
			app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, (world: World) => {
				this.swapToFixedUpdate(world);
			});

			// 2. Tick action states during fixed update with fixed timestep
			app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, (world: World) => {
				this.tickActionStateFixed(world);
			});

			// 3. Update action states during fixed update (maintain input responsiveness)
			app.addSystems(BuiltinSchedules.FIXED_UPDATE, (world: World) => {
				this.updateActionStateFixed(world);
			});

			// 4. Swap back to regular update state after fixed update
			app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
				this.swapToUpdate(world);
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
	 * Ticks action states during fixed update with fixed timestep
	 * This ensures consistent timing for physics-based input processing
	 * @param world - The Matter World instance
	 */
	private tickActionStateFixed(world: World): void {
		const fixedDeltaTime = 1 / 50; // 50Hz fixed timestep (20ms)

		if (RunService.IsServer()) {
			// Server mode: directly tick action states with fixed timestep
			if (this.instanceManager) {
				for (const [entity] of world.query(ActionStateComponent)) {
					const actionState = this.instanceManager.getActionState(entity);
					if (actionState) {
						actionState.tickFixed(fixedDeltaTime);
					}
				}
			}
		} else if (this.inputSystem) {
			// Client mode: use input system to tick with fixed timestep
			this.inputSystem.tickAllFixed(fixedDeltaTime);
		}
	}

	/**
	 * Updates action states during fixed update schedule
	 * Maintains input responsiveness during fixed timestep physics
	 * @param world - The Matter World instance
	 */
	private updateActionStateFixed(world: World): void {
		// Only run on client (server doesn't process inputs directly)
		if (RunService.IsServer()) {
			return;
		}

		if (!this.inputSystem || !this.instanceManager) {
			return;
		}

		// Sync input state from bevy_input resources (same as regular update)
		this.syncFromBevyInput();

		// Update action states for all entities during fixed update
		let entityCount = 0;
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			entityCount++;

			// Ensure instances are registered
			if (!this.instanceManager.getInputMap(entity)) {
				this.instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!this.instanceManager.getActionState(entity)) {
				this.instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
			}
		}

		// Update with fixed timestep
		if (entityCount > 0) {
			const fixedDeltaTime = 1 / 50; // 50Hz fixed timestep
			this.inputSystem.updateFixed(fixedDeltaTime);
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

		// Clean up gamepad listeners
		if (this.centralStore) {
			this.centralStore.cleanupGamepadListeners();
		}

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

	/**
	 * Swaps all action states to their FixedUpdate variants
	 * This system runs before the fixed update loop
	 * @param world - The Matter World instance
	 */
	private swapToFixedUpdate(world: World): void {
		if (!this.instanceManager) {
			return;
		}

		// Swap state for all entities with ActionState components
		for (const [entity] of world.query(ActionStateComponent)) {
			const actionState = this.instanceManager.getActionState(entity);
			if (actionState) {
				actionState.swapToFixedUpdateState();
			}
		}
	}

	/**
	 * Swaps all action states back to their Update variants
	 * This system runs before the regular update loop
	 * @param world - The Matter World instance
	 */
	private swapToUpdate(world: World): void {
		if (!this.instanceManager) {
			return;
		}

		// Swap state back for all entities with ActionState components
		for (const [entity] of world.query(ActionStateComponent)) {
			const actionState = this.instanceManager.getActionState(entity);
			if (actionState) {
				actionState.swapToUpdateState();
			}
		}
	}
}