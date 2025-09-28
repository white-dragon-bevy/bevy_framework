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
import { BevyWorld, Context } from "../../bevy_ecs/types";

// =============================================================================
// 系统函数辅助工具
// =============================================================================

/**
 * 从上下文获取InputInstanceManager
 * @param context - App上下文
 * @param actionType - Action类型构造函数
 * @returns InputInstanceManagerResource或undefined
 */
function getInstanceManagerFromContext<A extends Actionlike>(
	context: AppContext, 
	actionType: (new (...args: any[]) => A) & { name: string }
): InputInstanceManagerResource<A> | undefined {
	const extension = getInputManagerExtension(context, actionType);
	if (!extension) {
		return undefined;
	}
	return extension.getInstanceManager();
}

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

// =============================================================================
// 系统函数工厂
// =============================================================================

/**
 * 创建特定Action类型的系统函数
 * @param actionType - Action类型构造函数
 * @returns 系统函数集合
 */
function createInputManagerSystems<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string }
) {
	/**
	 * 服务端和客户端的Action State Tick系统
	 */
	const tickActionStateSystem = (world: BevyWorld, context: Context): void => {
		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}

		const appContext = app.getContext();
		const instanceManager = getInstanceManagerFromContext(appContext, actionType);
		
		if (RunService.IsServer()) {
			// 服务端模式：直接tick实例管理器中的action states
			if (instanceManager) {
				for (const [entity] of world.query(ActionStateComponent)) {
					const actionState = instanceManager.getActionState(entity);
					if (actionState) {
						actionState.tick(1 / 60);
					}
				}
			}
		} else {
			// 客户端模式：通过InputSystem来tick
			const stateResource = world.resources.getResource<InputManagerStateResource<A>>();
			if (stateResource?.inputSystem) {
				stateResource.inputSystem.tickAll(1 / 60);
			}
		}
	};

	/**
	 * 固定时间步长的Action State Tick系统
	 */
	const tickActionStateFixedSystem = (world: BevyWorld, context: Context): void => {
		const fixedDeltaTime = 1 / 50; // 50Hz固定时间步长
		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}

		const appContext = app.getContext();
		const instanceManager = getInstanceManagerFromContext(appContext, actionType);
		
		if (RunService.IsServer()) {
			// 服务端模式
			if (instanceManager) {
				for (const [entity] of world.query(ActionStateComponent)) {
					const actionState = instanceManager.getActionState(entity);
					if (actionState) {
						actionState.tickFixed(fixedDeltaTime);
					}
				}
			}
		} else {
			// 客户端模式
			const stateResource = world.resources.getResource<InputManagerStateResource<A>>();
			if (stateResource?.inputSystem) {
				stateResource.inputSystem.tickAllFixed(fixedDeltaTime);
			}
		}
	};

	/**
	 * 客户端Action State更新系统
	 */
	const updateActionStateSystem = (world: BevyWorld, context: Context): void => {
		// 只在客户端运行
		if (RunService.IsServer()) {
			return;
		}

		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}

		const appContext = app.getContext();
		const instanceManager = getInstanceManagerFromContext(appContext, actionType);
		const stateResource = world.resources.getResource<InputManagerStateResource<A>>();
		
		if (!instanceManager || !stateResource?.inputSystem || !stateResource?.centralStore) {
			return;
		}

		// 同步bevy_input资源
		syncFromBevyInput(world, stateResource.centralStore);

		// 更新所有带有输入组件的实体的action状态
		let entityCount = 0;
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			entityCount++;
			
			// 注册实例到管理器
			if (!instanceManager.getInputMap(entity)) {
				instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!instanceManager.getActionState(entity)) {
				instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
			}
		}

		// 更新输入系统
		if (entityCount > 0) {
			stateResource.inputSystem.update(1 / 60);
		}
	};

	/**
	 * 固定更新的Action State更新系统
	 */
	const updateActionStateFixedSystem = (world: BevyWorld, context: Context): void => {
		// 只在客户端运行
		if (RunService.IsServer()) {
			return;
		}


		const instanceManager = getInstanceManagerFromContext(context, actionType);
		const stateResource = world.resources.getResource<InputManagerStateResource<A>>();
		
		if (!instanceManager || !stateResource?.inputSystem || !stateResource?.centralStore) {
			return;
		}

		// 同步bevy_input资源
		syncFromBevyInput(world, stateResource.centralStore);

		// 更新所有带有输入组件的实体
		let entityCount = 0;
		for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
			entityCount++;
			
			// 注册实例到管理器
			if (!instanceManager.getInputMap(entity)) {
				instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!instanceManager.getActionState(entity)) {
				instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
			}
		}

		// 使用固定时间步长更新
		if (entityCount > 0) {
			const fixedDeltaTime = 1 / 50;
			stateResource.inputSystem.updateFixed(fixedDeltaTime);
		}
	};

	/**
	 * InputMap移除时释放Action State系统
	 */
	const releaseOnInputMapRemovedSystem = (world: BevyWorld, context: Context): void => {
		// 实现组件移除时的清理逻辑
		// 当前为占位符，与Rust版本保持一致
	};

	/**
	 * 交换到固定更新状态的系统
	 */
	const swapToFixedUpdateSystem = (world: BevyWorld, context: Context): void => {
		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}

		const appContext = app.getContext();
		const instanceManager = getInstanceManagerFromContext(appContext, actionType);
		if (!instanceManager) {
			return;
		}

		// 为所有带有ActionState和InputMap组件的实体交换状态
		for (const [entity, inputMapData, actionStateData] of world.query(InputMapComponent, ActionStateComponent)) {
			// 注册实例（如果尚未注册）
			const inputMap = (inputMapData as unknown as { map?: InputMap<A> }).map || inputMapData;
			const actionState = (actionStateData as unknown as { state?: ActionState<A> }).state || actionStateData;

			if (!instanceManager.getInputMap(entity)) {
				instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<A>);
			}
			if (!instanceManager.getActionState(entity)) {
				instanceManager.registerActionState(entity, actionState as unknown as ActionState<A>);
			}

			// 交换状态
			const registeredActionState = instanceManager.getActionState(entity);
			if (registeredActionState) {
				registeredActionState.swapToFixedUpdateState();
			}
		}
	};

	/**
	 * 交换回常规更新状态的系统
	 */
	const swapToUpdateSystem = (world: BevyWorld, context: Context): void => {
		const app = (world as unknown as { __app?: App }).__app;
		if (!app) {
			return;
		}

		const appContext = app.getContext();
		const instanceManager = getInstanceManagerFromContext(appContext, actionType);
		if (!instanceManager) {
			return;
		}

		// 为所有带有ActionState组件的实体交换回常规状态
		for (const [entity] of world.query(ActionStateComponent)) {
			const actionState = instanceManager.getActionState(entity);
			if (actionState) {
				actionState.swapToUpdateState();
			}
		}
	};

	return {
		tickActionStateSystem,
		tickActionStateFixedSystem,
		updateActionStateSystem,
		updateActionStateFixedSystem,
		releaseOnInputMapRemovedSystem,
		swapToFixedUpdateSystem,
		swapToUpdateSystem
	};
}

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
 * Resource to store plugin state for system functions
 * 存储插件状态供系统函数访问的资源
 */
export class InputManagerStateResource<A extends Actionlike> implements Resource {
	constructor(
		public config: InputManagerPluginConfig<A>,
		public centralStore?: CentralInputStore,
		public inputSystem?: InputManagerSystem<A>,
		public connections: RBXScriptConnection[] = []
	) {}
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
	private connections: RBXScriptConnection[] = [];

	constructor(config: InputManagerPluginConfig<A>) {
		this.config = config;
	}

	/**
	 * Builds the plugin and registers systems with the App
	 * @param app - The Bevy App instance
	 */
	build(app: App): void {
		// Create InputInstanceManager
		const instanceManager = new InputInstanceManagerResource<A>(this.config.actionType.name);

		// Store the plugin instance as a resource for access by systems
		app.insertResource<InputManagerPluginResource<A>>(new InputManagerPluginResource(this));

		// Register extension to AppContext using dynamic key with instanceManager
		// This needs to be available on both client and server
		const context = app.getContext();
		registerInputManagerExtension(context, this.config.actionType, this, instanceManager);

		// Create system functions for this specific action type
		const systems = createInputManagerSystems(this.config.actionType);

		const isServer = RunService.IsServer();
		const isClient = RunService.IsClient();

		if (isServer) {
			// Server mode: register tick and fixed update systems
			// Matches Rust implementation which only adds tick_action_state on server
			// but we also need fixed update support for physics integration

			// PreUpdate: tick action states
			app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.tickActionStateSystem);

			// Fixed Update support for server-side physics
			// 1. Swap to fixed update state before the fixed main loop
			app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, systems.swapToFixedUpdateSystem);

			// 2. Tick action states during fixed update with fixed timestep
			app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, systems.tickActionStateFixedSystem);

			// 3. Swap back to regular update state after fixed update
			app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.swapToUpdateSystem);
		} else if (isClient) {
			// Client mode: full input processing

			// Initialize client-only components
			const centralStore = new CentralInputStore();
			const world = app.getWorld() as unknown as World;
			const inputSystem = new InputManagerSystem(world, centralStore, this.config, instanceManager);

			// Initialize gamepad input listeners
			centralStore.initializeGamepadListeners();

			// Store state resource for system functions to access
			const stateResource = new InputManagerStateResource(
				this.config,
				centralStore,
				inputSystem,
				this.connections
			);
			app.insertResource<InputManagerStateResource<A>>(stateResource);

			// Register systems with the App scheduler
			// PreUpdate: tick and update action states
			app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.tickActionStateSystem);
			app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.updateActionStateSystem);

			// PostUpdate: cleanup and finalization
			app.addSystems(MainScheduleLabel.POST_UPDATE, systems.releaseOnInputMapRemovedSystem);

			// Fixed Update support: comprehensive fixed timestep input handling
			// 1. Swap to fixed update state before the fixed main loop
			app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, systems.swapToFixedUpdateSystem);

			// 2. Tick action states during fixed update with fixed timestep
			app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, systems.tickActionStateFixedSystem);

			// 3. Update action states during fixed update (maintain input responsiveness)
			app.addSystems(BuiltinSchedules.FIXED_UPDATE, systems.updateActionStateFixedSystem);

			// 4. Swap back to regular update state after fixed update
			app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.swapToUpdateSystem);

			if (this.config.networkSync?.enabled) {
				this.setupNetworkSync(inputSystem);
			}
		}
	}

	/**
	 * Sets up network synchronization
	 * @param inputSystem - The input system instance
	 */
	private setupNetworkSync(inputSystem: InputManagerSystem<A>): void {
		const syncRate = this.config.networkSync?.syncRate ?? 30;
		const syncInterval = 1 / syncRate;
		let lastSyncTime = 0;

		this.connections.push(
			RunService.Heartbeat.Connect(() => {
				const currentTime = os.clock();
				if (currentTime - lastSyncTime >= syncInterval) {
					lastSyncTime = currentTime;
					inputSystem.syncNetwork();
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

		// Clean up gamepad listeners from state resource
		const stateResource = app.getWorld().resources.getResource<InputManagerStateResource<A>>();
		if (stateResource?.centralStore) {
			stateResource.centralStore.cleanupGamepadListeners();
		}
	}
}