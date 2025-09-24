/**
 * 最小化的 Leafwing Input Manager 示例
 * 用于调试输入问题
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import {
	InputMap,
	ActionState,
	ActionlikeEnum,
	InputControlKind,
	KeyCode,
	MouseButton,
	InputManagerPlugin,
	InputManagerPluginResource,
	InputMapComponent,
	ActionStateComponent,
	InputEnabled,
	LocalPlayer,
	isJustPressed,
	isJustReleased,
} from "../../leafwing-input-manager";
import { component, type World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";

/**
 * 简单动作枚举
 */
class SimpleAction extends ActionlikeEnum {
	static readonly Test = new SimpleAction("Test");

	constructor(name: string) {
		super(name, InputControlKind.Button);
	}
}

/**
 * Player组件
 */
const Player = component<{ name: string }>("Player");

/**
 * 全局 App 实例
 */
let globalApp: App | undefined;

/**
 * 生成玩家
 */
function spawnPlayer(world: World): void {
	print("========================================");
	print("Minimal Input Manager Example");
	print("IsClient:", RunService.IsClient());
	print("IsServer:", RunService.IsServer());
	print("========================================");

	// 检查是否已存在玩家
	for (const [_entity, _player] of world.query(Player)) {
		return;
	}

	// 创建输入映射
	const inputMap = new InputMap<SimpleAction>();
	inputMap.insert(SimpleAction.Test, KeyCode.Space);
	inputMap.insert(SimpleAction.Test, MouseButton.left());

	print("InputMap created with bindings:");
	print("  Space -> Test");
	print("  Left Mouse -> Test");

	// 创建动作状态
	const actionState = new ActionState<SimpleAction>();
	actionState.registerAction(SimpleAction.Test);

	// 生成玩家实体
	const entity = world.spawn(
		Player({ name: "TestPlayer" }),
		InputMapComponent({} as unknown as InputMap<ActionlikeEnum>),
		ActionStateComponent({} as unknown as ActionState<ActionlikeEnum>),
		InputEnabled({ enabled: true }),
		LocalPlayer({ playerId: 1 }),
	);

	// 注册实例到 InstanceManager
	const resource = getInputManagerResource();
	if (resource) {
		const instanceManager = resource.plugin.getInstanceManager();
		if (instanceManager) {
			instanceManager.registerInputMap(entity, inputMap);
			instanceManager.registerActionState(entity, actionState);
			print("Instances registered successfully");
		} else {
			print("ERROR: InstanceManager not found");
		}
	} else {
		print("ERROR: InputManagerResource not found");
	}

	print("========================================");
}

/**
 * 获取资源
 */
function getInputManagerResource(): InputManagerPluginResource<SimpleAction> | undefined {
	if (!globalApp) {
		return undefined;
	}
	return globalApp.getResource(InputManagerPluginResource<SimpleAction>);
}

/**
 * 处理动作
 */
function handleActions(world: World): void {
	const resource = getInputManagerResource();
	if (!resource) {
		return;
	}

	const instanceManager = resource.plugin.getInstanceManager();
	if (!instanceManager) {
		return;
	}

	for (const [entity, player] of world.query(Player)) {
		const state = instanceManager.getActionState(entity) as ActionState<SimpleAction> | undefined;
		if (!state) {
			continue;
		}

		// 使用安全包装函数
		if (isJustPressed(state, SimpleAction.Test)) {
			print(`[SUCCESS] ${player.name} triggered Test action!`);
		}
		if (isJustReleased(state, SimpleAction.Test)) {
			print(`[SUCCESS] ${player.name} released Test action!`);
		}
	}
}

/**
 * 主函数
 */
export function main(): App {
	const app = App.create();
	globalApp = app;

	// 添加默认插件组（包含 InputPlugin）
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加 InputManagerPlugin
	app.addPlugin(
		new InputManagerPlugin<SimpleAction>({
			actionType: SimpleAction as unknown as new () => SimpleAction,
		}),
	);

	// 添加系统
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, handleActions);

	return app;
}

// 运行应用
main().run();