/**
 * 简单虚拟按钮示例
 *
 * 展示如何创建虚拟按钮并与物理按键一起映射到同一个动作
 * - 空格键触发跳跃
 * - 屏幕上的虚拟按钮也触发跳跃
 * - 两种输入方式完全等效
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs";
import { component } from "@rbxts/matter";
import { RunService, Players } from "@rbxts/services";

// 导入输入管理器
import {
	createInputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	Actionlike,
	spawnWithInput,
	queryInputEntities,
} from "../../leafwing-input-manager";

// =====================================
// 定义游戏动作
// =====================================

enum PlayerAction {
	Jump,
}

class PlayerActionlike implements Actionlike {
	constructor(public readonly action: PlayerAction) {}

	hash(): string {
		return `PlayerAction:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return PlayerAction[this.action];
	}
}

// =====================================
// 组件定义
// =====================================

const Player = component<{
	name: string;
	jumpCount: number;
}>("Player");

// =====================================
// 虚拟按钮状态管理（简化版）
// =====================================

let virtualJumpPressed = false;

/**
 * 创建虚拟按钮 UI
 */
function createVirtualButtonUI(): void {
	const localPlayer = Players.LocalPlayer;
	if (!localPlayer) return;

	const playerGui = localPlayer.WaitForChild("PlayerGui") as PlayerGui;

	// 创建 ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "VirtualButtonGui";
	screenGui.Parent = playerGui;

	// 跳跃按钮
	const jumpButton = new Instance("TextButton");
	jumpButton.Name = "JumpButton";
	jumpButton.Text = "跳跃\n(或按空格)";
	jumpButton.Size = new UDim2(0, 150, 0, 150);
	jumpButton.Position = new UDim2(0.5, -75, 0.7, 0);
	jumpButton.BackgroundColor3 = new Color3(0.2, 0.5, 1);
	jumpButton.TextColor3 = new Color3(1, 1, 1);
	jumpButton.TextScaled = true;
	jumpButton.Font = Enum.Font.SourceSansBold;
	jumpButton.Parent = screenGui;

	// 圆角
	const corner = new Instance("UICorner");
	corner.CornerRadius = new UDim(0, 12);
	corner.Parent = jumpButton;

	// 按钮事件
	jumpButton.MouseButton1Down.Connect(() => {
		virtualJumpPressed = true;
		jumpButton.BackgroundColor3 = new Color3(0.1, 0.3, 0.7);
	});

	jumpButton.MouseButton1Up.Connect(() => {
		virtualJumpPressed = false;
		jumpButton.BackgroundColor3 = new Color3(0.2, 0.5, 1);
	});

	jumpButton.MouseLeave.Connect(() => {
		virtualJumpPressed = false;
		jumpButton.BackgroundColor3 = new Color3(0.2, 0.5, 1);
	});

	// 提示文本
	const hintLabel = new Instance("TextLabel");
	hintLabel.Text = "点击按钮或按空格键跳跃";
	hintLabel.Size = new UDim2(0.4, 0, 0, 40);
	hintLabel.Position = new UDim2(0.3, 0, 0.1, 0);
	hintLabel.BackgroundTransparency = 1;
	hintLabel.TextColor3 = new Color3(1, 1, 1);
	hintLabel.TextScaled = true;
	hintLabel.Font = Enum.Font.SourceSans;
	hintLabel.Parent = screenGui;
}

// =====================================
// 系统定义
// =====================================

let inputPlugin: ReturnType<typeof createInputManagerPlugin<PlayerActionlike>>;

/**
 * 生成玩家
 */
function spawnPlayer(world: BevyWorld): void {
	print("========================================");
	print("简单虚拟按钮示例");
	print("========================================");
	print("控制方式:");
	print("  跳跃: 空格键 或 屏幕按钮");
	print("========================================\n");

	// 创建输入映射（只映射物理按键）
	const inputMap = new InputMap<PlayerActionlike>()
		.insert(new PlayerActionlike(PlayerAction.Jump), KeyCode.Space);

	// 创建动作状态
	const actionState = new ActionState<PlayerActionlike>();
	actionState.registerAction(new PlayerActionlike(PlayerAction.Jump));

	// 生成玩家实体
	const entity = spawnWithInput(
		{ world } as any,
		inputPlugin as any,
		inputMap,
		actionState
	);

	world.insert(
		entity as any,
		Player({
			name: "Player1",
			jumpCount: 0,
		})
	);

	// 在客户端创建 UI
	if (RunService.IsClient()) {
		createVirtualButtonUI();
	}
}

/**
 * 处理玩家输入（包括虚拟按钮）
 */
function handlePlayerInput(world: BevyWorld): void {
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		const playerData = player as unknown as {
			name: string;
			jumpCount: number;
		};

		const jumpAction = new PlayerActionlike(PlayerAction.Jump);

		// 方法1：检查原生输入（空格键）
		const spacePressed = actionState.justPressed(jumpAction);

		// 方法2：直接在系统中处理虚拟按钮
		// 检测虚拟按钮的按下（只在第一帧）
		const virtualJustPressed = virtualJumpPressed && !actionState.pressed(jumpAction);

		// 如果任一输入触发了跳跃
		if (spacePressed || virtualJustPressed) {
			const newJumpCount = playerData.jumpCount + 1;
			world.insert(
				entityId as any,
				Player({
					name: playerData.name,
					jumpCount: newJumpCount,
				})
			);

			const source = spacePressed ? "键盘" : "虚拟按钮";
			print(`[${playerData.name}] 跳跃! (第 ${newJumpCount} 次, 来源: ${source})`);

			// 如果是虚拟按钮触发的，手动更新 ActionState
			if (virtualJustPressed && !spacePressed) {
				actionState.press(jumpAction);
			}
		}

		// 释放虚拟按钮时也要释放动作
		if (!virtualJumpPressed && !actionState.justReleased(jumpAction)) {
			if (actionState.pressed(jumpAction)) {
				actionState.release(jumpAction);
			}
		}
	}
}

// =====================================
// 创建应用
// =====================================

function createApp(): App {
	const app = new App();

	// 添加默认插件
	app.addPlugins(new DefaultPlugins());

	// 添加输入管理器插件
	inputPlugin = createInputManagerPlugin<PlayerActionlike>({} as any) as any;
	app.addPlugin(inputPlugin);

	// 添加系统
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, handlePlayerInput);

	return app;
}

// =====================================
// 入口点
// =====================================

if (RunService.IsServer()) {
	print("[Server] 简单虚拟按钮示例已启动");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] 简单虚拟按钮示例已启动");
	const app = createApp();
	app.run();
}