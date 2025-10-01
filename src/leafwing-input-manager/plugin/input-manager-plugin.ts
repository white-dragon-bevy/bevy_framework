import { RunService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { Actionlike } from "../actionlike";
import { Plugin } from "../../bevy_app/plugin";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { ClashStrategy, ClashStrategyResource } from "../clashing-inputs/clash-strategy";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { createActionComponents, ComponentDefinition } from "./component-factory";
import { getKeyboardInput, getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input/plugin";
import type { InputManagerExtension } from "./extensions";
import type { ExtensionFactory } from "../../bevy_app/app";
import type { AppContext } from "../../bevy_app/context";

// =============================================================================
// 辅助工具
// =============================================================================

/**
 * 同步bevy_input资源到CentralInputStore
 * @param world - Bevy世界实例
 * @param centralStore - 中央输入存储
 */
function syncFromBevyInput(world: BevyWorld, centralStore: CentralInputStore): void {
	// 获取bevy_input资源
	const keyboardInput = getKeyboardInput(world);
	const mouseInput = getMouseInput(world);
	const mouseMotion = getMouseMotion(world);
	const mouseWheel = getMouseWheel(world);

	// 同步到中央存储
	centralStore.syncFromBevyInput(
		keyboardInput,
		mouseInput,
		mouseMotion,
		mouseWheel
	);
}

/**
 * Configuration for the InputManagerPlugin
 */
export interface InputManagerPluginConfig<A extends Actionlike> {
	/**
	 * The action type name (used for component identification)
	 */
	actionTypeName: string;

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
 * 创建扩展工厂的辅助函数
 * 这个函数返回一个具有确定键名的对象,供 TypeScript 类型推导
 */
function createExtensionFactory<A extends Actionlike>(
	components: ComponentDefinition<A>,
):  InputManagerExtension<A> {
	return {
		getComponents() {
			return components;
		},

		spawnWithInput(
			world: BevyWorld,
			inputMap: InputMap<A>,
			actionState?: ActionState<A>,
		) {
			return components.spawn(world, inputMap, actionState);
		},

		getEntityInputData(world: BevyWorld, entityId: number) {
			return components.get(world, entityId);
		},

		addInputToEntity(
			world: BevyWorld,
			entityId: number,
			inputMap: InputMap<A>,
			actionState?: ActionState<A>,
		) {
			components.insert(world, entityId, inputMap, actionState);
		},

		removeInputFromEntity(world: BevyWorld, entityId: number) {
			components.remove(world, entityId);
		},

		queryInputEntities(world: BevyWorld) {
			return components.query(world);
		},
	};
}

/**
 * Main plugin for the leafwing input manager
 * Integrates with bevy_input for input handling and provides action mapping
 *
 * This plugin now uses dynamic component creation instead of InputInstanceManagerResource,
 * allowing for proper ECS queries while maintaining type safety.
 *
 * @template A - Action 类型
 */
export class InputManagerPlugin<A extends Actionlike>
	implements Plugin
{
	private config: InputManagerPluginConfig<A>;
	private components: ComponentDefinition<A>;
	private connections: RBXScriptConnection[] = [];

	/**
	 * API 辅助方法 - 提供类型安全的实体操作接口
	 */
	readonly api:InputManagerExtension<A>;

	constructor(config: InputManagerPluginConfig<A>) {
		this.config = config;
		// Create dynamic components for this Action type
		this.components = createActionComponents<A>(config.actionTypeName);


		// 创建 API 辅助对象
		this.api = createExtensionFactory<A>( this.components);
	}

	/**
	 * Builds the plugin and registers systems with the App
	 * @param app - The Bevy App instance
	 */
	build(app: App): void {
		const isServer = RunService.IsServer();
		const isClient = RunService.IsClient();

		// In Studio test environment, IsServer and IsClient may both be true
		// or we may want to test input processing even in server mode
		// So we always register client systems if they're needed
		const isTestEnvironment = RunService.IsStudio();

		if (isClient || isTestEnvironment) {
			// Client mode or test environment: full input processing
			this.registerClientSystems(app);
		} else if (isServer) {
			// Pure server mode: Only tick action states
			this.registerServerSystems(app);
		}
	}

	/**
	 * Register server-side systems
	 */
	private registerServerSystems(app: App): void {
		const components = this.components;

		// Server only needs to tick action states
		app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: BevyWorld, context: Context) => {
			this.tickActionStates(world, context);
		});
	}

	/**
	 * Register client-side systems
	 */
	private registerClientSystems(app: App): void {
		// Initialize CentralInputStore and register as resource
		const centralStore = new CentralInputStore();
		centralStore.initializeGamepadListeners();
		app.insertResource<CentralInputStore>(centralStore);

		// Initialize ClashStrategy resource
		const clashStrategyResource = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
		app.getWorld().resources.insertResource(clashStrategyResource);

		// Register systems with proper ordering
		// PreUpdate: tick, sync input, update action states
		app.addSystems(MainScheduleLabel.PRE_UPDATE, [
			(world: BevyWorld, context: Context) => this.tickActionStates(world, context),
			(world: BevyWorld, context: Context) => this.syncBevyInput(world),
			(world: BevyWorld, context: Context) => this.updateActionStates(world, context),
		]);

		// Last: clear input store for next frame
		app.addSystems(MainScheduleLabel.LAST, (world: BevyWorld) => {
			const centralStore = world.resources.getResource<CentralInputStore>();
			centralStore?.clear();
		});

		// PostUpdate: cleanup and finalization
		app.addSystems(MainScheduleLabel.POST_UPDATE, (world: BevyWorld) => {
			this.releaseOnWindowFocusLost(world);
		});

		// Store connections for cleanup
		// Note: getGamepadConnections was removed in the refactor
	}

	/**
	 * Tick all action states
	 */
	private tickActionStates(world: BevyWorld, context: Context): void {
		const currentTime = os.clock();
		const deltaTime = (context as { deltaTime?: number }).deltaTime;
		const previousTime = deltaTime ? currentTime - deltaTime : currentTime;

		// Query all entities with our action components
		for (const [entityId, data] of this.components.query(world)) {
			if (data.actionState && data.enabled) {
				data.actionState.tick();
			}
		}

		// Also tick global resource if exists
		const globalActionState = world.resources.getResource<ActionState<A>>();
		if (globalActionState) {
			globalActionState.tick();
		}
	}

	/**
	 * Sync inputs from bevy_input to CentralInputStore
	 */
	private syncBevyInput(world: BevyWorld): void {
		const centralStore = world.resources.getResource<CentralInputStore>();
		if (centralStore) {
			syncFromBevyInput(world, centralStore);
		}
	}

	/**
	 * Update all action states based on input maps
	 */
	private updateActionStates(world: BevyWorld, context: Context): void {
		const centralStore = world.resources.getResource<CentralInputStore>();
		const clashStrategy = world.resources.getResource<ClashStrategyResource>();

		if (!centralStore || !clashStrategy) {
			return;
		}

		// Query all entities with our action components
		for (const [entityId, data] of this.components.query(world)) {
			if (data.inputMap && data.actionState && data.enabled) {
				// Process inputs through the input map
				const updatedActions = data.inputMap.processActions(
					centralStore,
					clashStrategy.strategy as any
				);

				// Update the action state with processed actions
				// Note: Since InputMap stores action hashes internally, we need to
				// recreate the actions from their states in ActionState
				if (data.actionState) {
					// Simply update based on the processed state
					data.actionState.updateFromProcessed(updatedActions.actionData);
				}
			}
		}

		// Also update global resources if they exist
		const globalInputMap = world.resources.getResource<InputMap<A>>();
		const globalActionState = world.resources.getResource<ActionState<A>>();

		if (globalInputMap && globalActionState) {
			const updatedActions = globalInputMap.processActions(
				centralStore,
				clashStrategy.strategy as any
			);
			// Update the global action state with processed actions
			globalActionState.updateFromProcessed(updatedActions.actionData);
		}
	}

	/**
	 * Release actions when window loses focus
	 */
	private releaseOnWindowFocusLost(world: BevyWorld): void {
		// Check if window has focus (simplified for Roblox)
		const UserInputService = game.GetService("UserInputService");
		const windowFocused = UserInputService.WindowFocused;

		if (!windowFocused) {
			// Release all actions
			for (const [entityId, data] of this.components.query(world)) {
				if (data.actionState) {
					data.actionState.releaseAll();
				}
			}

			// Also release global action state if exists
			const globalActionState = world.resources.getResource<ActionState<A>>();
			if (globalActionState) {
				globalActionState.releaseAll();
			}
		}
	}

	/**
	 * Gets the plugin name
	 * @returns The plugin name with action type
	 */
	name(): string {
		return `InputManagerPlugin<${this.config.actionTypeName}>`;
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

		// Clean up gamepad listeners from CentralInputStore
		const centralStore = app.getWorld().resources.getResource<CentralInputStore>();
		if (centralStore) {
			centralStore.cleanupGamepadListeners();
		}
	}

	/**
	 * Get the component definition for this plugin
	 * This allows external code to interact with entities using the same components
	 */
	getComponents(): ComponentDefinition<A> {
		return this.components;
	}
}

// Import statements for missing types
import { ActionState } from "../action-state/action-state";
import { InputMap } from "../input-map/input-map";
