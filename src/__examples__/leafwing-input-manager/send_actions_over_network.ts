/**
 * Send Actions Over Network Example
 *
 * ActionDiff 消息流是动作状态的最小化表示，用于序列化和网络传输。
 * 虽然它们比完整的 ActionState 使用不太方便，但它们更小，
 * 可以从 ActionState 创建并重建回 ActionState。
 *
 * 注意：ActionState 也可以直接序列化和发送。
 * 这种方法带宽效率较低，但涉及的复杂性和 CPU 工作更少。
 *
 * ## 特别说明
 *
 * 这个示例与其他示例不同，它需要在真实的客户端-服务端环境中运行。
 * - 客户端：创建 InputManagerPlugin，接收玩家输入，生成 ActionDiff，通过 RemoteEvent 发送到服务端
 * - 服务端：接收 ActionDiff，重建 ActionState，用于游戏逻辑
 *
 * ## 如何测试
 *
 * 1. 在 Roblox Studio 中运行游戏
 * 2. 客户端和服务端都会初始化各自的 App
 * 3. 在客户端按下 Space（跳跃）或鼠标左键（射击）
 * 4. 客户端会生成 ActionDiff 并发送到服务端
 * 5. 服务端接收并处理 ActionDiff，打印消息
 *
 * ## 在真实项目中的使用
 *
 * 这个示例只是演示基本的网络同步。在真实项目中，你需要：
 * - 为每个玩家创建独立的实体和 InputMap
 * - 处理玩家加入/离开
 * - 添加网络预测和延迟补偿
 * - 实现服务端验证以防作弊
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/send_actions_over_network.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld } from "../../bevy_ecs";
import { ActionState } from "../../leafwing-input-manager/action-state/action-state";
import { ActionDiff, ActionDiffMessage } from "../../leafwing-input-manager/action-diff";
import { ActionlikeEnum } from "../../leafwing-input-manager/actionlike";
import { InputControlKind } from "../../leafwing-input-manager/input-control-kind";
import { InputMap } from "../../leafwing-input-manager/input-map/input-map";
import { KeyCode } from "../../leafwing-input-manager/user-input/keyboard";
import { MouseButton } from "../../leafwing-input-manager/user-input/mouse";
import { createInputManagerPlugin } from "../../leafwing-input-manager/plugin/input-manager-plugin";
import { MessageReader, MessageWriter } from "../../bevy_ecs/message";
import { Messages } from "../../bevy_ecs/message/messages";
import { RunService, ReplicatedStorage } from "@rbxts/services";

// ============================================================================
// 动作定义
// ============================================================================

/**
 * FPS 游戏动作枚举
 * 对应 Rust 的 FpsAction enum
 */
class FpsAction extends ActionlikeEnum {
	static readonly Jump = new FpsAction("Jump");
	static readonly Shoot = new FpsAction("Shoot");

	private constructor(value: string) {
		super(value);
	}

	hash(): string {
		return `FpsAction:${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}
}

// ============================================================================
// 客户端代码
// ============================================================================

// 客户端插件全局变量
let clientInputPlugin: ReturnType<typeof createInputManagerPlugin<FpsAction>>;

/**
 * 生成玩家实体（客户端）
 */
function clientSpawnPlayer(world: BevyWorld): void {
	const components = clientInputPlugin.extension!.getComponents();

	// 创建输入映射
	const inputMap = new InputMap<FpsAction>();
	inputMap.insert(FpsAction.Jump, KeyCode.from(Enum.KeyCode.Space));
	inputMap.insert(FpsAction.Shoot, MouseButton.left());

	// 创建动作状态
	const actionState = new ActionState<FpsAction>();
	actionState.registerAction(FpsAction.Jump);
	actionState.registerAction(FpsAction.Shoot);

	// 生成实体
	const entityId = world.spawn();
	components.insert(world, entityId, inputMap, actionState);

	print("[Client] ✅ Player entity spawned with input mapping");
	print("[Client] 提示: 按 Space 跳跃，点击鼠标左键射击");
}

/**
 * 生成 ActionDiff 消息
 */
function clientGenerateActionDiffs(world: BevyWorld): void {
	const messages = world.resources.getResource<Messages<ActionDiffMessage<FpsAction>>>();
	if (!messages) return;

	const writer = new MessageWriter<ActionDiffMessage<FpsAction>>(messages);
	const components = clientInputPlugin.extension!.getComponents();

	// 查询所有实体的 ActionState
	for (const [entityId, data] of components.query(world)) {
		if (data.actionState) {
			// 生成 diffs
			const diffs = generateDiffsForActionState(data.actionState);

			if (diffs.size() > 0) {
				const message: ActionDiffMessage<FpsAction> = {
					owner: undefined, // 在真实场景中，这应该是 Player ID
					timestamp: os.clock(),
					diffs: diffs,
				};

				writer.write(message);
			}
		}
	}
}

/**
 * 发送 ActionDiff 到服务端
 */
function clientSendActionDiffs(world: BevyWorld): void {
	const messages = world.resources.getResource<Messages<ActionDiffMessage<FpsAction>>>();
	if (!messages) return;

	// 获取当前帧的所有消息
	const messagesToSend = messages.iterCurrentUpdateMessages();
	if (messagesToSend.size() === 0) return;

	// 获取或创建 RemoteEvent
	let remoteEvent = ReplicatedStorage.FindFirstChild("ActionDiffEvent") as RemoteEvent | undefined;
	if (!remoteEvent) {
		remoteEvent = new Instance("RemoteEvent");
		remoteEvent.Name = "ActionDiffEvent";
		remoteEvent.Parent = ReplicatedStorage;
		print("[Client] 📡 Created RemoteEvent");
	}

	// 发送每个消息到服务端
	for (const message of messagesToSend) {
		print(`[Client] 📤 Sending ${message.diffs.size()} action diffs`);
		for (const diff of message.diffs) {
			print(`[Client]   - ${diff.type}: ${diff.action.toString()}`);
		}
		remoteEvent.FireServer(message);
	}
}

/**
 * 调试输入状态（客户端）
 */
function clientDebugInput(world: BevyWorld): void {
	const components = clientInputPlugin.extension!.getComponents();

	for (const [entityId, data] of components.query(world)) {
		if (data.actionState) {
			// 检查跳跃
			if (data.actionState.justPressed(FpsAction.Jump)) {
				print("[Client] 🎮 Jump just pressed!");
			}
			// 检查射击
			if (data.actionState.justPressed(FpsAction.Shoot)) {
				print("[Client] 🎮 Shoot just pressed!");
			}
		}
		break; // 只处理第一个实体
	}
}

/**
 * 创建客户端 App
 */
function createClientApp(): App {
	const app = new App();

	// 添加默认插件
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加 InputManagerPlugin
	clientInputPlugin = createInputManagerPlugin<FpsAction>({
		actionTypeName: "FpsAction",
	});
	app.addPlugin(clientInputPlugin);

	// 添加消息系统
	app.getWorld().resources.insertResource(new Messages<ActionDiffMessage<FpsAction>>());

	// 添加系统
	app.addSystems(MainScheduleLabel.STARTUP, clientSpawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, clientDebugInput);
	app.addSystems(MainScheduleLabel.POST_UPDATE, clientGenerateActionDiffs, clientSendActionDiffs);

	return app;
}

// ============================================================================
// 服务端代码
// ============================================================================

// 服务端插件全局变量
let serverInputPlugin: ReturnType<typeof createInputManagerPlugin<FpsAction>>;

/**
 * 生成玩家实体（服务端）
 */
function serverSpawnPlayer(world: BevyWorld): void {
	const components = serverInputPlugin.extension!.getComponents();

	// 创建空的输入映射（服务端不需要实际输入）
	const inputMap = new InputMap<FpsAction>();

	// 创建动作状态
	const actionState = new ActionState<FpsAction>();
	actionState.registerAction(FpsAction.Jump);
	actionState.registerAction(FpsAction.Shoot);

	// 生成实体
	const entityId = world.spawn();
	components.insert(world, entityId, inputMap, actionState);

	print("[Server] ✅ Player entity spawned (waiting for client input)");
}

/**
 * 处理 ActionDiff 消息流
 */
function serverProcessActionDiffs(world: BevyWorld): void {
	const actionDiffReader = world.resources.getResource<MessageReader<ActionDiffMessage<FpsAction>>>();
	if (!actionDiffReader) return;

	const components = serverInputPlugin.extension!.getComponents();

	// 读取所有 ActionDiff 消息
	const messages = actionDiffReader.read();

	for (const actionDiffMessage of messages) {
		// 查询第一个实体的 ActionState
		for (const [entityId, data] of components.query(world)) {
			if (data.actionState) {
				// 应用所有 diff
				for (const diff of actionDiffMessage.diffs) {
					data.actionState.applyDiff(diff);
					print(`[Server] ✅ Applied ${diff.type} for ${diff.action.toString()}`);
				}
			}
			break; // 只处理第一个实体
		}
	}
}

/**
 * 验证服务端状态
 */
function serverVerifyState(world: BevyWorld): void {
	const components = serverInputPlugin.extension!.getComponents();

	for (const [entityId, data] of components.query(world)) {
		if (data.actionState) {
			if (data.actionState.pressed(FpsAction.Jump)) {
				print("[Server] 🎮 Jump is pressed on server");
			}
			if (data.actionState.pressed(FpsAction.Shoot)) {
				print("[Server] 🎮 Shoot is pressed on server");
			}
		}
		break;
	}
}

/**
 * 创建服务端 App
 */
function createServerApp(): App {
	const app = new App();

	// 添加默认插件
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加 InputManagerPlugin
	serverInputPlugin = createInputManagerPlugin<FpsAction>({
		actionTypeName: "FpsAction",
	});
	app.addPlugin(serverInputPlugin);

	// 添加消息系统
	app.getWorld().resources.insertResource(new Messages<ActionDiffMessage<FpsAction>>());
	app.getWorld().resources.insertResource(
		new MessageReader<ActionDiffMessage<FpsAction>>(
			app.getWorld().resources.getResource<Messages<ActionDiffMessage<FpsAction>>>()!,
		),
	);

	// 添加系统
	app.addSystems(MainScheduleLabel.STARTUP, serverSpawnPlayer);
	app.addSystems(MainScheduleLabel.PRE_UPDATE, serverProcessActionDiffs);
	app.addSystems(MainScheduleLabel.UPDATE, serverVerifyState);

	// 设置 RemoteEvent 监听
	setupRemoteEventListener(app);

	return app;
}

/**
 * 设置 RemoteEvent 监听器
 */
function setupRemoteEventListener(app: App): void {
	// 获取或创建 RemoteEvent
	let remoteEvent = ReplicatedStorage.FindFirstChild("ActionDiffEvent") as RemoteEvent | undefined;
	if (!remoteEvent) {
		remoteEvent = new Instance("RemoteEvent");
		remoteEvent.Name = "ActionDiffEvent";
		remoteEvent.Parent = ReplicatedStorage;
	}

	// 监听来自客户端的消息
	remoteEvent.OnServerEvent.Connect((player, actionDiffData: unknown) => {
		print(`[Server] 📥 Received ActionDiff from ${player.Name}`);

		const messages = app.getWorld().resources.getResource<Messages<ActionDiffMessage<FpsAction>>>();
		if (messages && typeIs(actionDiffData, "table")) {
			const message = actionDiffData as ActionDiffMessage<FpsAction>;
			print(`[Server] 📥 ${message.diffs.size()} diffs in message`);
			messages.write(message);
		}
	});

	print("[Server] 📡 RemoteEvent listener setup complete");
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从 ActionState 生成 ActionDiff 列表
 */
function generateDiffsForActionState<A extends FpsAction>(
	actionState: ActionState<FpsAction>,
): Array<ActionDiff<FpsAction>> {
	const diffs: Array<ActionDiff<FpsAction>> = [];

	// 获取所有动作数据
	const actionDataMap = actionState.getActionDataMap();
	const buttonDataMap = actionState.getButtonDataMap();

	// 创建哈希到动作的映射
	const hashToActionMap = new Map<string, FpsAction>();
	hashToActionMap.set(FpsAction.Jump.hash(), FpsAction.Jump);
	hashToActionMap.set(FpsAction.Shoot.hash(), FpsAction.Shoot);

	for (const [actionHash, actionData] of actionDataMap) {
		const buttonData = buttonDataMap.get(actionHash);
		const action = hashToActionMap.get(actionHash);

		if (!action) continue;

		// 如果刚按下
		if (buttonData && buttonData.justPressed) {
			diffs.push({
				type: "Pressed",
				action: action,
				value: actionData.value,
			});
		}

		// 如果刚释放
		if (buttonData && buttonData.justReleased) {
			diffs.push({
				type: "Released",
				action: action,
			});
		}
	}

	return diffs;
}

// ============================================================================
// 入口点
// ============================================================================

if (RunService.IsClient()) {
	print("[Client] 🚀 Starting network sync example");
	const clientApp = createClientApp();
	clientApp.run();
} else if (RunService.IsServer()) {
	print("[Server] 🚀 Starting network sync example");
	const serverApp = createServerApp();
	serverApp.run();
}
