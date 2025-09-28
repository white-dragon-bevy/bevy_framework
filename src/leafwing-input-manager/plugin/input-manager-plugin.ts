import { RunService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { InputManagerSystem } from "./input-manager-system";
import { Actionlike } from "../actionlike";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { getKeyboardInput, getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input/plugin";
import { Plugin } from "../../bevy_app/plugin";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { AppContext } from "../../bevy_app/context";
import { registerInputManagerExtension, getInputManagerExtension } from "./context-helpers";
import { InputMapComponent, ActionStateComponent } from "./components";
import { Resource, World } from "../../bevy_ecs";
import { InputInstanceManager } from "./input-instance-manager";
import { InputInstanceManagerResource } from "./input-instance-manager-resource";
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
export class InputManagerPlugin<A extends Actionlike> implements Plugin {
	private config: InputManagerPluginConfig<A>;
	private world?: World;
	private centralStore?: CentralInputStore;
	private inputSystem?: InputManagerSystem<A>;
	private connections: RBXScriptConnection[] = [];
	private instanceManagerKey?: string;

	constructor(config: InputManagerPluginConfig<A>) {
		this.config = config;
	}

	/**
	 * Builds the plugin and registers systems with the App
	 * @param app - The Bevy App instance
	 */
	build(app: App): void {
		// Initialize internal state
		this.world = app.getWorld() as unknown as World;

		// Create InputInstanceManager
		const instanceManager = new InputInstanceManagerResource<A>(this.config.actionType.name);
		this.instanceManagerKey = this.config.actionType.name;

		// Store the plugin instance as a resource for access by systems
		app.insertResource<InputManagerPluginResource<A>>(new InputManagerPluginResource(this));

		// Register extension to AppContext using dynamic key with instanceManager
		// This needs to be available on both client and server
		const context = app.getContext();
		registerInputManagerExtension(context, this.config.actionType, this, instanceManager);

		const isServer = RunService.IsServer();
		const isClient = RunService.IsClient();

		if (isServer) {
			// Server mode: register tick and fixed update systems
			// Matches Rust implementation which only adds tick_action_state on server
			// but we also need fixed update support for physics integration

			// PreUpdate: tick action states
			app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
				this.tickActionState(world, app);
			});

			// Fixed Update support for server-side physics
			// 1. Swap to fixed update state before the fixed main loop
			app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, (world: World) => {
				this.swapToFixedUpdate(world);
			});

			// 2. Tick action states during fixed update with fixed timestep
			app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, (world: World) => {
				this.tickActionStateFixed(world, app);
			});

			// 3. Swap back to regular update state after fixed update
			app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
				this.swapToUpdate(world);
			});
		} else if (isClient) {
			// Client mode: full input processing

			// Initialize client-only components
			this.centralStore = new CentralInputStore();
			const manager = this.getInstanceManagerFromContext(context);
			if (!manager) {
				error(`[InputManagerPlugin] Failed to get InputInstanceManager from extension for ${this.config.actionType.name}`);
			}
			this.inputSystem = new InputManagerSystem(this.world, this.centralStore, this.config, manager as InputInstanceManagerResource<A>);

			// Initialize gamepad input listeners
			this.centralStore.initializeGamepadListeners();

			// Register systems with the App scheduler
			// PreUpdate: tick and update action states
			app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
				this.tickActionState(world, app);
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
				this.tickActionStateFixed(world, app);
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
	}

	/**
	 * Ticks the action state - clears just_pressed and just_released
	 * Corresponds to Rust's tick_action_state system
	 * This runs on both client and server
	 */
	private tickActionState(world: World, app: App): void {
		// On server, we only need to tick the instance manager's action states
		// On client, we tick through the input system
		if (RunService.IsServer()) {
			// Server mode: directly tick action states in instance manager
			const context = app.getContext();
			const manager = this.getInstanceManagerFromContext(context);
			if (manager) {
				// Tick all registered action states
				for (const [entity] of world.query(ActionStateComponent)) {
					const actionState = manager.getActionState(entity);
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
	private tickActionStateFixed(world: World, app: App): void {
		const fixedDeltaTime = 1 / 50; // 50Hz fixed timestep (20ms)

		if (RunService.IsServer()) {
			// Server mode: directly tick action states with fixed timestep
			const context = app.getContext();
			const manager = this.getInstanceManagerFromContext(context);
			if (manager) {
				for (const [entity] of world.query(ActionStateComponent)) {
					const actionState = manager.getActionState(entity);
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

		if (!this.inputSystem) {
			return;
		}

		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}
		const context = app.getContext();
		const instanceManager = this.getInstanceManagerFromContext(context);
		if (!instanceManager) {
			return;
		}

		// Sync input state from bevy_input resources (same as regular update)
		this.syncFromBevyInput();

		// Update action states for all entities during fixed update
		let entityCount = 0;
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			entityCount++;

			// Ensure instances are registered
			if (!instanceManager.getInputMap(entity)) {
				instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!instanceManager.getActionState(entity)) {
				instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
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

		if (!this.inputSystem) {
			return;
		}

		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}
		const context = app.getContext();
		const instanceManager = this.getInstanceManagerFromContext(context);
		if (!instanceManager) {
			return;
		}

		// Sync input state from bevy_input resources
		this.syncFromBevyInput();

		// Update action states for all entities with input components
		let entityCount = 0;
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			entityCount++;
			// Register the actual instances with the manager if not already registered
			if (!instanceManager.getInputMap(entity)) {
				instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!instanceManager.getActionState(entity)) {
				instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
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
		this.instanceManagerKey = undefined;
	}

	/**
	 * Internal getter for instance manager - used by systems
	 * @internal
	 */
	getInstanceManager(): InputInstanceManagerResource<A> | undefined {
		// Get from extension system
		if (!this.world) {
			return undefined;
		}
		const app = (this.world as unknown as { __app?: App }).__app;
		if (!app) {
			return undefined;
		}
		const context = app.getContext();
		const extension = getInputManagerExtension(context, this.config.actionType);
		if (!extension) {
			return undefined;
		}
		return extension.getInstanceManager();
	}

	/**
	 * Helper to get instance manager from context
	 * @param context - App context
	 * @returns InputInstanceManagerResource or undefined
	 */
	private getInstanceManagerFromContext(context: AppContext): InputInstanceManagerResource<A> | undefined {
		const extension = getInputManagerExtension(context, this.config.actionType);
		if (!extension) {
			return undefined;
		}
		return extension.getInstanceManager();
	}

	/**
	 * Swaps all action states to their FixedUpdate variants
	 * This system runs before the fixed update loop
	 * @param world - The Matter World instance
	 */
	private swapToFixedUpdate(world: World): void {
		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}
		const context = app.getContext();
		const instanceManager = this.getInstanceManagerFromContext(context);
		if (!instanceManager) {
			return;
		}

		// Register and swap state for all entities with ActionState and InputMap components
		for (const [entity, inputMapData, actionStateData] of world.query(InputMapComponent, ActionStateComponent)) {
			// Register instances if not already registered
			// InputMapComponent can be either the raw InputMap or wrapped in { map: InputMap }
			const inputMap = (inputMapData as unknown as { map?: InputMap<A> }).map || inputMapData;
			// ActionStateComponent can be either the raw ActionState or wrapped in { state: ActionState }
			const actionState = (actionStateData as unknown as { state?: ActionState<A> }).state || actionStateData;

			if (!instanceManager.getInputMap(entity)) {
				instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!instanceManager.getActionState(entity)) {
				instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
			}

			// Swap state
			const registeredActionState = instanceManager.getActionState(entity);
			if (registeredActionState) {
				registeredActionState.swapToFixedUpdateState();
			}
		}
	}

	/**
	 * Swaps all action states back to their Update variants
	 * This system runs before the regular update loop
	 * @param world - The Matter World instance
	 */
	private swapToUpdate(world: World): void {
		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}
		const context = app.getContext();
		const instanceManager = this.getInstanceManagerFromContext(context);
		if (!instanceManager) {
			return;
		}

		// Swap state back for all entities with ActionState components
		for (const [entity] of world.query(ActionStateComponent)) {
			const actionState = instanceManager.getActionState(entity);
			if (actionState) {
				actionState.swapToUpdateState();
			}
		}
	}
}