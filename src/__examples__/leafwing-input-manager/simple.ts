/**
 * Leafwing Input Manager 示例
 * 演示如何使用输入管理器处理玩家输入
 * 对应 Rust leafwing-input-manager 示例
 */

import { App } from "../../bevy_app";
import { BevyWorld } from "../../bevy_ecs";
import { DefaultPlugins } from "../../bevy_internal";
import {
	InputMap,
	ActionState,
	ActionlikeEnum,
	InputControlKind,
	KeyCode,
	MouseButton,
	InputManagerPlugin,
	CentralInputStore,
} from "../../leafwing-input-manager";
import { component, World } from "@rbxts/matter";
import { getKeyboardInput, getMouseInput } from "../../bevy_input/resource-storage";
import { InputMapComponent } from "../../leafwing-input-manager/input-map/input-map";
import { ActionStateComponent } from "../../leafwing-input-manager/action-state/action-state";
import { InputEnabled } from "../../leafwing-input-manager/plugin/input-enabled";
import { LocalPlayer } from "../../leafwing-input-manager/plugin/local-player";

// 2. 定义一个类来表示所有可能的游戏内动作
class PlayerAction extends ActionlikeEnum {
	static readonly Jump = new PlayerAction("Jump");
	static readonly Shoot = new PlayerAction("Shoot");

	constructor(name: string) {
		super(name, InputControlKind.Button);
	}
}

// Player 组件（使用 Matter 的 component 函数）
const Player = component<{ name: string }>("Player");

// 存储插件实例的全局变量
let inputPlugin: InputManagerPlugin<PlayerAction> | undefined;
let centralStore: CentralInputStore | undefined;

// 3. 在启动时，生成一个玩家实体
function spawnPlayer(world: BevyWorld): void {
	// 检查是否已经生成过玩家
	const worldWithData = world as unknown as {
		playerEntity?: number;
		playerSpawned?: boolean;
	};

	// 如果已经生成过，直接返回
	if (worldWithData.playerSpawned) {
		return;
	}

	// 创建输入映射
	const inputMap = new InputMap<PlayerAction>();

	// 将动作连接到输入
	inputMap.insert(PlayerAction.Jump, KeyCode.Space);
	inputMap.insert(PlayerAction.Shoot, MouseButton.left());


	// 创建动作状态
	const actionState = new ActionState<PlayerAction>();

	// 注册所有动作到 ActionState
	actionState.registerAction(PlayerAction.Jump);
	actionState.registerAction(PlayerAction.Shoot);

	// 生成玩家实体，使用 Matter 组件系统
	// 注意：我们传递空对象作为组件数据，实际的实例存储在管理器中
	const entity = world.spawn(
		Player({ name: "Player1" }),
		InputMapComponent({} as unknown as InputMap<ActionlikeEnum>),
		ActionStateComponent({} as unknown as ActionState<ActionlikeEnum>),
		InputEnabled({ enabled: true }),
		LocalPlayer({ playerId: 1 }),
	);

	// 注册实际的实例到管理器
	if (inputPlugin) {
		const instanceManager = inputPlugin.getInstanceManager();
		instanceManager.registerInputMap(entity, inputMap as unknown as InputMap<PlayerAction>);
		instanceManager.registerActionState(entity, actionState as unknown as ActionState<PlayerAction>);
	}

	// 存储实体 ID
	worldWithData.playerEntity = entity;
	worldWithData.playerSpawned = true;

	print("Player spawned with input bindings:");
	print("  - Space: Jump");
	print("  - Left Mouse Button: Shoot");
}

// 处理输入系统更新
function updateInputSystem(world: BevyWorld): void {
	// 首先让输入管理系统处理输入
	if (inputPlugin) {
		// 添加调试输出来检查 CentralInputStore 中的鼠标按钮状态
		const store = inputPlugin.getCentralStore();
		const mouseLeftKey = "mouse_MouseButton1";
		const pressed = store.pressed(mouseLeftKey);

		// 只在状态改变时打印
		const worldData = world as unknown as { lastMousePressed?: boolean };
		if (pressed !== worldData.lastMousePressed) {
			print(`[CentralInputStore] Mouse left button pressed = ${pressed ?? "undefined"}`);
			worldData.lastMousePressed = pressed ?? false;
		}

		inputPlugin.getInputSystem().update(1 / 60); // 假设 60 FPS
	}
}

// 4. 在每帧更新时，查询玩家的 ActionState
function checkActions(world: BevyWorld): void {
	// 测试 bevy_input 是否工作
	const mouseInputResource = getMouseInput(world as unknown as World);
	if (mouseInputResource) {
		const mousePressed = mouseInputResource.isPressed(Enum.UserInputType.MouseButton1);
		const worldData = world as unknown as { bevyMousePressed?: boolean };
		if (mousePressed !== worldData.bevyMousePressed) {
			print(`[bevy_input] Mouse left button pressed = ${mousePressed}`);
			worldData.bevyMousePressed = mousePressed;
		}
	}

	const keyboard = getKeyboardInput(world as unknown as World);
	if (keyboard) {
		if (keyboard.justPressed(Enum.KeyCode.Space)) {
			print("[TEST] bevy_input detected Space!");
		}
		// 也测试 pressed 状态
		if (keyboard.isPressed(Enum.KeyCode.Space)) {
			const worldData = world as unknown as { spaceHeldCounter?: number };
			worldData.spaceHeldCounter = (worldData.spaceHeldCounter ?? 0) + 1;
			if (worldData.spaceHeldCounter === 1) {
				print("[TEST] Space is being held");
			}
		} else {
			const worldData = world as unknown as { spaceHeldCounter?: number };
			worldData.spaceHeldCounter = 0;
		}
	}

	// 查询玩家实体的动作状态
	for (const [entity, player] of world.query(Player)) {
		// 从管理器获取实际的 ActionState 实例
		const instanceManager = inputPlugin?.getInstanceManager();
		const actionState = instanceManager?.getActionState(entity) as ActionState<PlayerAction> | undefined;

		if (!actionState) {
			print("[ERROR] No ActionState found for player entity");
			continue;
		}

		// 检查跳跃动作
		if (actionState.justPressed(PlayerAction.Jump)) {
			print(`${player.name} jumped!`);
		}
		if (actionState.justReleased(PlayerAction.Jump)) {
			print(`${player.name} stopped jumping`);
		}

		// 检查射击动作
		if (actionState.justPressed(PlayerAction.Shoot)) {
			print(`${player.name} started shooting!`);
		}

		// 调试：直接检查 pressed 状态
		const isPressed = actionState.pressed(PlayerAction.Shoot);
		if (isPressed) {
			const worldData = world as unknown as { shootCounter?: number };
			worldData.shootCounter = (worldData.shootCounter ?? 0) + 1;
			if (worldData.shootCounter === 1) {
				print(`[DEBUG] Shoot pressed = true`);
			}
			if (worldData.shootCounter % 30 === 0) {
				print(`${player.name} is still shooting...`);
			}
		} else {
			const worldData = world as unknown as { shootCounter?: number };
			if (worldData.shootCounter && worldData.shootCounter > 0) {
				print(`[DEBUG] Shoot pressed = false (was pressed for ${worldData.shootCounter} frames)`);
			}
			worldData.shootCounter = 0;
		}

		if (actionState.justReleased(PlayerAction.Shoot)) {
			print(`${player.name} stopped shooting`);
		}
	}
}

// 在帧末尾执行 tick
function tickActionStates(world: BevyWorld): void {
	if (inputPlugin) {
		inputPlugin.getInputSystem().tickAll(1 / 60);
	}
}


export function main(): void {
	// 创建应用
	const app = App.create();

	// 添加默认插件
	app.addPlugins(DefaultPlugins.create());

	// 1. 创建并配置输入管理器插件
	// 现在 InputManagerPlugin 使用 bevy_input 作为输入源
	// 不需要单独监听 UserInputService
	const world = app.getWorld();
	inputPlugin = new InputManagerPlugin(world as unknown as World, {
		actionType: PlayerAction as unknown as new () => PlayerAction,
	});

	// 初始化插件
	inputPlugin.build();

	// 获取中央输入存储以便调试
	centralStore = inputPlugin.getCentralStore();

	// 添加系统 - 按正确的顺序
	app.addSystems("Startup", spawnPlayer);
	app.addSystems("PreUpdate", updateInputSystem);  // 先更新输入
	app.addSystems("Update", checkActions);           // 再检查动作
	app.addSystems("PostUpdate", tickActionStates);   // 最后 tick

	print("========================================");
	print("Leafwing Input Manager Example Started");
	print("Press Space to jump, Left Mouse Button to shoot");
	print("========================================");

	// 运行应用
	app.run();
}

// 导出 main 函数以便运行
main();
