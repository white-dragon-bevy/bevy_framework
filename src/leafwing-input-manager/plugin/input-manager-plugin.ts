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
import { Modding } from "@flamework/core";
import { buildGenericType, getGenericTypeDescriptor, getNameFromId, getTypeDescriptor, getTypeDescriptorWithGenericParameter, TypeDescriptor } from "bevy_core";
import { useHookState } from "@rbxts/matter";
import { Instant } from "../instant";
import { KeyCode } from "../user-input/keyboard";

// =============================================================================
// 辅助工具
// =============================================================================

/**
 * 从 InputMap 收集所有绑定的键盘键
 * @param inputMap - 输入映射
 * @returns 绑定的键盘键集合
 */
function collectBoundKeyboardKeys<A extends Actionlike>(inputMap: InputMap<A>): Set<Enum.KeyCode> {
	const boundKeys = new Set<Enum.KeyCode>();
	const allInputs = inputMap.getAllInputs();

	for (const input of allInputs) {
		// Check if this is a KeyCode input
		if (input instanceof KeyCode) {
			boundKeys.add(input.getKeyCode());
		}
		// Note: ModifierKey is not directly handled here as it decomposes to KeyCodes
		// We could also check for ModifierKey and add its decomposed keys if needed
	}

	return boundKeys;
}

/**
 * 同步bevy_input资源到CentralInputStore
 * @param world - Bevy世界实例
 * @param centralStore - 中央输入存储
 * @param keysToSync - 要同步的键盘键（可选）
 */
function syncFromBevyInput(world: BevyWorld, centralStore: CentralInputStore, keysToSync?: ReadonlySet<Enum.KeyCode>): void {
	// 获取bevy_input资源
	const keyboardInput = getKeyboardInput(world);
	const mouseInput = getMouseInput(world);
	const mouseMotion = getMouseMotion(world);
	const mouseWheel = getMouseWheel(world);

	// 同步到中央存储
	centralStore.syncFromBevyInput(keyboardInput, mouseInput, mouseMotion, mouseWheel, keysToSync);
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

interface InnerDescriptors{
	actionStateDescriptor: TypeDescriptor;
	inputMapDescriptor: TypeDescriptor;
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
 * Tick all action states with precise timing
 * @param components - 组件定义
 * @param actionStateDescriptor - Action state 类型描述符
 */
function createTickActionStatesSystem<A extends Actionlike>(components: ComponentDefinition<A>, actionStateDescriptor: TypeDescriptor) {
	return (world: BevyWorld, context: Context, discriminator?: unknown): void => {
		// Use hook to store previous time across frames
		type TimeStorage = { previousTime: number };
		const storage = useHookState<TimeStorage>(discriminator, () => true);

		const currentTime = os.clock();

		// Initialize previousTime on first run
		if (storage.previousTime === undefined) {
			storage.previousTime = currentTime;
		}

		const currentInstant = Instant.fromTimestamp(currentTime);
		const previousInstant = Instant.fromTimestamp(storage.previousTime);

		// Query all entities with our action components
		for (const [entityId, data] of components.query(world)) {
			if (data.actionState && data.enabled) {
				data.actionState.tickWithInstants(currentInstant, previousInstant);
			}
		}

		// Also tick global resource if exists
		const globalActionState = world.resources.getResourceByTypeDescriptor<ActionState<A>>(actionStateDescriptor);

		if (globalActionState) {
			globalActionState.tickWithInstants(currentInstant, previousInstant);
		}

		// Update previous time for next frame
		storage.previousTime = currentTime;
	};
}

/**
 * Sync inputs from bevy_input to CentralInputStore
 * @param components - 组件定义
 * @param inputMapDescriptor - InputMap 类型描述符
 */
function createSyncBevyInputSystem<A extends Actionlike>(components: ComponentDefinition<A>, inputMapDescriptor: TypeDescriptor) {
	return (world: BevyWorld): void => {
		const centralStore = world.resources.getResource<CentralInputStore>();

		if (!centralStore) {
			return;
		}

		// Collect all bound keyboard keys from all InputMaps
		const allBoundKeys = new Set<Enum.KeyCode>();

		// Collect from entity InputMaps
		for (const [entityId, data] of components.query(world)) {
			if (data.inputMap && data.enabled) {
				const boundKeys = collectBoundKeyboardKeys(data.inputMap);
				for (const key of boundKeys) {
					allBoundKeys.add(key);
				}
			}
		}

		// Collect from global InputMap resource if exists
		const globalInputMap = world.resources.getResourceByTypeDescriptor<InputMap<A>>(inputMapDescriptor);
		if (globalInputMap) {
			const boundKeys = collectBoundKeyboardKeys(globalInputMap);
			for (const key of boundKeys) {
				allBoundKeys.add(key);
			}
		}

		// Sync with collected keys
		syncFromBevyInput(world, centralStore, allBoundKeys);
	};
}

/**
 * Update all action states based on input maps
 * @param components - 组件定义
 */
function createUpdateActionStatesSystem<A extends Actionlike>(components: ComponentDefinition<A>, inputMapDescriptor: TypeDescriptor, actionStateDescriptor: TypeDescriptor) {
	return (world: BevyWorld, context: Context): void => {
		const centralStore = world.resources.getResource<CentralInputStore>();
		const clashStrategy = world.resources.getResource<ClashStrategyResource>();

		if (!centralStore || !clashStrategy) {
			return;
		}

		// Query all entities with our action components
		for (const [entityId, data] of components.query(world)) {
			if (data.inputMap && data.actionState && data.enabled) {
				// Get previous frame's state for change detection
				const previousData = data.actionState.getPreviousProcessedData();

				// Process inputs through the input map
				const updatedActions = data.inputMap.processActions(centralStore, previousData, world);

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
		const globalInputMap = world.resources.getResourceByTypeDescriptor<InputMap<A>>(inputMapDescriptor);
		const globalActionState = world.resources.getResourceByTypeDescriptor<ActionState<A>>(actionStateDescriptor);

		if (globalInputMap && globalActionState) {
			// Get previous frame's state for change detection
			const previousData = globalActionState.getPreviousProcessedData();
			const updatedActions = globalInputMap.processActions(centralStore, previousData, world);
			// Update the global action state with processed actions
			globalActionState.updateFromProcessed(updatedActions.actionData);
		}
	};
}

/**
 * Release actions when window loses focus
 * @param components - 组件定义
 */
function createReleaseOnWindowFocusLostSystem<A extends Actionlike>(components: ComponentDefinition<A>, actionStateDescriptor: TypeDescriptor) {
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
			const globalActionState = world.resources.getResourceByTypeDescriptor<ActionState<A>>(actionStateDescriptor);

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
 * @metadata macro
 * 
 * @template A - Action 类型
 * @param config - 插件配置
 * @returns 插件实例
 */
export function createInputManagerPlugin<A extends Actionlike>(
	config: InputManagerPluginConfig<A>,
	id?: Modding.Generic<A, "id">,
	text?: Modding.Generic<A, "text">,
) {
	// Create dynamic components for this Action type
	const components = createActionComponents<A>(config.actionTypeName);
	const extensionObject = createExtensionObject<A>(components);
	const innerDescriptors: InnerDescriptors = {
		actionStateDescriptor: getTypeDescriptorWithGenericParameter<ActionState<A>>(text as string)!,
		inputMapDescriptor: getTypeDescriptorWithGenericParameter<InputMap<A>>(text as string)!,
	}

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
				registerClientSystems(app, components, innerDescriptors);

				// Store the central store instance for cleanup
				centralStoreInstance = app.getWorld().resources.getResource<CentralInputStore>();
			} else if (isServer) {
				// Pure server mode: Only tick action states
				registerServerSystems(app, components, innerDescriptors);
			}
		},

		/**
		 * 清理资源
		 * @param app - 应用实例
		 */
		cleanup: (app: App) => {
			// Note: Gamepad input now uses polling, no cleanup needed
			// This is kept for backward compatibility
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
function registerServerSystems<A extends Actionlike>(app: App, components: ComponentDefinition<A>, innerDescriptors: InnerDescriptors): void {
	// Server在每帧开始时tick action states来清除just pressed/released状态
	app.addSystems(MainScheduleLabel.FIRST, createTickActionStatesSystem(components, innerDescriptors.actionStateDescriptor));
}

/**
 * Register client-side systems
 * @param app - 应用实例
 * @param components - 组件定义
 */
function registerClientSystems<A extends Actionlike>(app: App, components: ComponentDefinition<A>, innerDescriptors: InnerDescriptors): void {
	// Initialize CentralInputStore and register as resource (if not already exists)
	// 插件负责创建所有需要的资源，这符合 Bevy 的架构原则
	// 但如果已经存在（例如多个InputManagerPlugin实例），则复用现有实例
	let centralStore = app.getResource<CentralInputStore>();
	if (!centralStore) {
		centralStore = new CentralInputStore();
		// Note: Gamepad input now uses polling in syncFromBevyInput, no need for event listeners
		app.insertResource<CentralInputStore>(centralStore);
	}

	// Initialize ClashStrategy resource
	const clashStrategyResource = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
	app.getWorld().resources.insertResource(clashStrategyResource);

	// Register systems with proper ordering
	// First: tick (clear just pressed/released states from previous frame)
	app.addSystems(MainScheduleLabel.FIRST, createTickActionStatesSystem(components, innerDescriptors.actionStateDescriptor));

	// PreUpdate: sync input, update action states
	app.addSystems(
		MainScheduleLabel.PRE_UPDATE,
		createSyncBevyInputSystem(components, innerDescriptors.inputMapDescriptor),
		createUpdateActionStatesSystem(components, innerDescriptors.inputMapDescriptor, innerDescriptors.actionStateDescriptor),
	);

	// PostUpdate: cleanup and finalization
	app.addSystems(MainScheduleLabel.POST_UPDATE, createReleaseOnWindowFocusLostSystem(components, innerDescriptors.actionStateDescriptor));

	// Note: CentralInputStore is NOT cleared here because:
	// 1. In production: syncFromBevyInput() always updates all button states (行 403-427)
	// 2. In testing: Simulators need the state to persist across frames
	// 3. bevy_input's ButtonInput.clear() already handles just_pressed/just_released cleanup
	// Therefore clearInputStoreSystem is unnecessary and breaks testing.
}
