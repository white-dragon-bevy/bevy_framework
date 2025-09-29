import { RunService } from "@rbxts/services";
import { CentralInputStore } from "../user-input/central-input-store";
import { Actionlike } from "../actionlike";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { getKeyboardInput, getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input/plugin";
import { Plugin } from "../../bevy_app/plugin";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { AppContext } from "../../bevy_app/context";
import { Resource } from "../../bevy_ecs";
import { InputInstanceManagerResource } from "./input-instance-manager-resource";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { createSystemAdapters } from "./system-adapter";
import { ClashStrategy, ClashStrategyResource } from "../clashing-inputs/clash-strategy";
import { Modding } from "@flamework/core";
import { getTypeDescriptor, TypeDescriptor } from "../../bevy_core/reflect";
import { INPUT_INSTANCE_MANAGER_RESOURCE_ID, INPUT_MANAGER_STATE_RESOURCE_ID } from "./const";

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

	// Debug: 检查键盘输入资源
	if (!keyboardInput) {
		if (tick() % 600 === 0) {
			print(`[syncFromBevyInput] ⚠️ keyboardInput 资源为 undefined`);
		}
	}

	// 同步到中央存储
	centralStore.syncFromBevyInput(
		keyboardInput,
		mouseInput,
		mouseMotion,
		mouseWheel
	);
}

/**
 * 创建一个包装系统，负责同步 bevy_input 到 CentralInputStore
 */
function createSyncBevyInputSystem() {
	return (world: BevyWorld, context: Context): void => {
		const centralStore = world.resources.getResource<CentralInputStore>();
		if (centralStore) {
			// Debug: 检查键盘输入
			const UserInputService = game.GetService("UserInputService");
			const keysPressed = UserInputService.GetKeysPressed();
			const spacePressed = keysPressed.some(key => key.KeyCode === Enum.KeyCode.Space);

			if (spacePressed) {
				print(`[syncBevyInput] 🎮 检测到空格键！准备同步到 CentralInputStore`);
			}

			syncFromBevyInput(world, centralStore);

			// Debug: 验证同步后的状态
			if (spacePressed) {
				const spaceValue = centralStore.getButtonValue("keyboard_Space");
				print(`[syncBevyInput] ✅ 同步后 Space 键状态: pressed=${spaceValue?.pressed}, value=${spaceValue?.value}`);
			}
		} else {
			if (tick() % 600 === 0) {
				print(`[syncBevyInput] ❌ 无法获取 CentralInputStore`);
			}
		}
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
 * Resource to store plugin state for system functions
 * 存储插件状态供系统函数访问的资源
 */
export class InputManagerStateResource<A extends Actionlike> implements Resource {
	constructor(
		public config: InputManagerPluginConfig<A>,
		public centralStore?: CentralInputStore,
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
	typeDescriptor:TypeDescriptor = undefined as unknown as TypeDescriptor;

	private constructor(
		config: InputManagerPluginConfig<A>,
		private inputManagerStateDescriptor:TypeDescriptor<InputManagerStateResource<A>>,
		private instanceManagerDescriptor:TypeDescriptor<InputInstanceManagerResource<A>>,

	
	) {
		this.config = config;
	}


	/**
	 * craete
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 */
	public static create<T extends Actionlike >(
		config: InputManagerPluginConfig<T>,
		id?: Modding.Generic<T, "id">, 
		text?: Modding.Generic<T,"text">
	) {

		const result = new InputManagerPlugin(
			config,
			getTypeDescriptor(id as string,text,INPUT_INSTANCE_MANAGER_RESOURCE_ID)!,
			getTypeDescriptor(id as string,text,INPUT_MANAGER_STATE_RESOURCE_ID)!,
		);

		return result;
	}

	/**
	 * Builds the plugin and registers systems with the App
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @param app - The Bevy App instance
	 */
	build(app: App): void {
		// Create InputInstanceManager
		let instanceManagerDescripter = table.clone(this.typeDescriptor)
		instanceManagerDescripter.genericId = INPUT_INSTANCE_MANAGER_RESOURCE_ID;
		const instanceManager = new InputInstanceManagerResource<A>(this.config.actionType.name);
		app.insertResourceByTypeDescriptor(instanceManager,instanceManagerDescripter);


		// Create system adapters that bridge Rust-style functions with Matter ECS
		const systems = createSystemAdapters(this.config.actionType);

		const isServer = RunService.IsServer();
		const isClient = RunService.IsClient();

		if (isServer) {
			// Server mode: Only tick action states
			// Matches Rust implementation (server does not process input)

			// // PreUpdate: tick action states
			// app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.tickActionState);

			// // Fixed Update support for server-side physics
			// // 1. Swap to fixed update state before the fixed main loop
			// app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, systems.swapToFixedUpdate);

			// // 2. Tick action states during fixed update with fixed timestep
			// app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, systems.tickActionState);

			// // 3. Swap back to regular update state after fixed update
			// app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.swapToUpdate);
		} else if (isClient) {
			// Client mode: full input processing

			// Initialize CentralInputStore and register as resource
			const centralStore = new CentralInputStore();
			centralStore.initializeGamepadListeners();
			app.insertResource<CentralInputStore>(centralStore);

			// Initialize ClashStrategy resource
			const clashStrategyResource = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			app.getWorld().resources.insertResource(clashStrategyResource);

			// Register systems with the App scheduler
			// PreUpdate: tick, sync input, clear store, update action states
			const syncBevyInput = createSyncBevyInputSystem();

			// app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.tickActionState);
			// app.addSystems(MainScheduleLabel.PRE_UPDATE, syncBevyInput);
			// app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.updateActionState);

			// // Last: clear input store for next frame
			// app.addSystems(MainScheduleLabel.LAST, systems.clearCentralInputStore);

			// // PostUpdate: cleanup and finalization
			// app.addSystems(MainScheduleLabel.POST_UPDATE, systems.releaseOnWindowFocusLost);

			// // Fixed Update support: comprehensive fixed timestep input handling
			// // 1. Swap to fixed update state before the fixed main loop
			// app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, systems.swapToFixedUpdate);

			// // 2. Tick action states during fixed update with fixed timestep
			// app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, systems.tickActionState);

			// // 3. Sync and update action states during fixed update
			// app.addSystems(BuiltinSchedules.FIXED_UPDATE, syncBevyInput);
			// app.addSystems(BuiltinSchedules.FIXED_UPDATE, systems.updateActionState);

			// // 4. Swap back to regular update state after fixed update
			// app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.swapToUpdate);

			// Store connections for cleanup
			const stateResource = new InputManagerStateResource(
				this.config,
				centralStore,
				this.connections
			);
			app.insertResource<InputManagerStateResource<A>>(stateResource);
		}
	}

	/**
	 * Sets up network synchronization
	 * TODO: Implement network sync using Rust-style action diff systems
	 */
	private setupNetworkSync(): void {
		// Network sync should use generate_action_diffs system from systems.ts
		// This is a placeholder for future implementation
		warn("Network sync not yet implemented with Rust-style systems");
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