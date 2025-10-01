import { RunService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { Actionlike } from "../actionlike";
import { plugin } from "../../bevy_app/plugin";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { ClashStrategy, ClashStrategyResource } from "../clashing-inputs/clash-strategy";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { createActionComponents, ComponentDefinition } from "./component-factory";
import { getKeyboardInput, getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input/plugin";
import type { InputManagerExtension } from "./extensions";
import { ActionState } from "../action-state/action-state";
import { InputMap } from "../input-map/input-map";

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
	centralStore.syncFromBevyInput(keyboardInput, mouseInput, mouseMotion, mouseWheel);
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
 * 创建扩展对象的辅助函数
 * @param components - 组件定义
 * @returns 扩展对象
 */
function createExtensionObject<A extends Actionlike>(
	components: ComponentDefinition<A>,
): InputManagerExtension<A> {
	return {
		getComponents() {
			return components;
		},

		spawnWithInput(world: BevyWorld, inputMap: InputMap<A>, actionState?: ActionState<A>) {
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

// =============================================================================
// 系统函数
// =============================================================================

/**
 * Tick all action states
 * @param components - 组件定义
 */
function createTickActionStatesSystem<A extends Actionlike>(components: ComponentDefinition<A>) {
	return (world: BevyWorld, context: Context): void => {
		const currentTime = os.clock();
		const deltaTime = (context as { deltaTime?: number }).deltaTime;
		const previousTime = deltaTime ? currentTime - deltaTime : currentTime;

		// Query all entities with our action components
		for (const [entityId, data] of components.query(world)) {
			if (data.actionState && data.enabled) {
				data.actionState.tick();
			}
		}

		// Also tick global resource if exists
		const globalActionState = world.resources.getResource<ActionState<A>>();

		if (globalActionState) {
			globalActionState.tick();
		}
	};
}

/**
 * Sync inputs from bevy_input to CentralInputStore
 */
function syncBevyInputSystem(world: BevyWorld): void {
	const centralStore = world.resources.getResource<CentralInputStore>();

	if (centralStore) {
		syncFromBevyInput(world, centralStore);
	}
}

/**
 * Update all action states based on input maps
 * @param components - 组件定义
 */
function createUpdateActionStatesSystem<A extends Actionlike>(components: ComponentDefinition<A>) {
	return (world: BevyWorld, context: Context): void => {
		const centralStore = world.resources.getResource<CentralInputStore>();
		const clashStrategy = world.resources.getResource<ClashStrategyResource>();

		if (!centralStore || !clashStrategy) {
			return;
		}

		// Query all entities with our action components
		for (const [entityId, data] of components.query(world)) {
			if (data.inputMap && data.actionState && data.enabled) {
				// Process inputs through the input map
				const updatedActions = data.inputMap.processActions(
					centralStore,
					clashStrategy.strategy as never,
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
			const updatedActions = globalInputMap.processActions(centralStore, clashStrategy.strategy as never);
			// Update the global action state with processed actions
			globalActionState.updateFromProcessed(updatedActions.actionData);
		}
	};
}

/**
 * Release actions when window loses focus
 * @param components - 组件定义
 */
function createReleaseOnWindowFocusLostSystem<A extends Actionlike>(components: ComponentDefinition<A>) {
	return (world: BevyWorld): void => {
		// Check if window has focus (simplified for Roblox)
		const UserInputService = game.GetService("UserInputService");
		const windowFocused = UserInputService.WindowFocused;

		if (!windowFocused) {
			// Release all actions
			for (const [entityId, data] of components.query(world)) {
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
	};
}

/**
 * Clear input store for next frame
 */
function clearInputStoreSystem(world: BevyWorld): void {
	const centralStore = world.resources.getResource<CentralInputStore>();
	centralStore?.clear();
}

// =============================================================================
// 插件工厂函数
// =============================================================================

/**
 * 创建 InputManagerPlugin 实例
 *
 * Main plugin for the leafwing input manager
 * Integrates with bevy_input for input handling and provides action mapping
 *
 * This plugin now uses dynamic component creation instead of InputInstanceManagerResource,
 * allowing for proper ECS queries while maintaining type safety.
 *
 * @template A - Action 类型
 * @param config - 插件配置
 * @returns 插件实例
 */
export function createInputManagerPlugin<A extends Actionlike>(config: InputManagerPluginConfig<A>) {
	// Create dynamic components for this Action type
	const components = createActionComponents<A>(config.actionTypeName);
	const extensionObject = createExtensionObject<A>(components);

	// Store for cleanup
	let centralStoreInstance: CentralInputStore | undefined;

	return plugin<InputManagerExtension<A>>({
		/**
		 * 插件名称
		 */
		name: `InputManagerPlugin<${config.actionTypeName}>`,

		/**
		 * 构建插件
		 * @param app - 应用实例
		 */
		build: (app: App) => {
			const isServer = RunService.IsServer();
			const isClient = RunService.IsClient();

			// In Studio test environment, IsServer and IsClient may both be true
			// or we may want to test input processing even in server mode
			// So we always register client systems if they're needed
			const isTestEnvironment = RunService.IsStudio();

			if (isClient || isTestEnvironment) {
				// Client mode or test environment: full input processing
				registerClientSystems(app, components);

				// Store the central store instance for cleanup
				centralStoreInstance = app.getWorld().resources.getResource<CentralInputStore>();
			} else if (isServer) {
				// Pure server mode: Only tick action states
				registerServerSystems(app, components);
			}
		},

		/**
		 * 清理资源
		 * @param app - 应用实例
		 */
		cleanup: (app: App) => {
			// Clean up gamepad listeners from CentralInputStore
			if (centralStoreInstance) {
				centralStoreInstance.cleanupGamepadListeners();
			}
		},

		/**
		 * 插件不唯一，允许多个不同泛型参数的实例
		 */
		unique: false,

		/**
		 * 插件扩展 - 直接提供扩展对象
		 */
		extension: extensionObject,
	});
}

/**
 * Register server-side systems
 * @param app - 应用实例
 * @param components - 组件定义
 */
function registerServerSystems<A extends Actionlike>(app: App, components: ComponentDefinition<A>): void {
	// Server only needs to tick action states
	app.addSystems(MainScheduleLabel.PRE_UPDATE, createTickActionStatesSystem(components));
}

/**
 * Register client-side systems
 * @param app - 应用实例
 * @param components - 组件定义
 */
function registerClientSystems<A extends Actionlike>(app: App, components: ComponentDefinition<A>): void {
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
		createTickActionStatesSystem(components),
		syncBevyInputSystem,
		createUpdateActionStatesSystem(components),
	]);

	// Last: clear input store for next frame
	app.addSystems(MainScheduleLabel.LAST, clearInputStoreSystem);

	// PostUpdate: cleanup and finalization
	app.addSystems(MainScheduleLabel.POST_UPDATE, createReleaseOnWindowFocusLostSystem(components));
}
