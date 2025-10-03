/**
 * Virtual Button Example
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
	InputControlKind,
	CentralInputStore,
} from "../../leafwing-input-manager";

import { UserInput } from "../../leafwing-input-manager/user-input/traits/user-input";
import { Buttonlike } from "../../leafwing-input-manager/user-input/traits/buttonlike";
import { MouseButton } from "../../leafwing-input-manager/user-input/mouse";
import { BasicInputs } from "../../leafwing-input-manager/clashing-inputs/basic-inputs";

// =====================================
// 虚拟按钮实现
// =====================================

/**
 * 虚拟按钮状态存储
 * 全局存储所有虚拟按钮的按下状态
 */
class VirtualButtonStore {
	private static instance: VirtualButtonStore;
	private buttonStates = new Map<string, boolean>();

	static getInstance(): VirtualButtonStore {
		if (!VirtualButtonStore.instance) {
			VirtualButtonStore.instance = new VirtualButtonStore();
		}
		return VirtualButtonStore.instance;
	}

	setPressed(id: string, pressed: boolean): void {
		this.buttonStates.set(id, pressed);
	}

	isPressed(id: string): boolean {
		return this.buttonStates.get(id) ?? false;
	}

	clear(): void {
		this.buttonStates.clear();
	}
}

/**
 * 虚拟按钮输入类
 * 实现 Buttonlike 接口，可以像键盘按键一样使用
 */
export class VirtualButton implements UserInput, Buttonlike {
	constructor(public readonly id: string) {}

	kind(): InputControlKind {
		return InputControlKind.Button;
	}

	decompose(): BasicInputs {
		const inputs = new Set<string>();
	inputs.add(this.hash());
	return new BasicInputs(inputs, [this]);
	}

	hash(): string {
		return `VirtualButton:${this.id}`;
	}

	pressed(inputStore: CentralInputStore, gamepad: unknown): boolean {
		return VirtualButtonStore.getInstance().isPressed(this.id);
	}

	getPressed(inputStore: CentralInputStore, gamepad: unknown): boolean | undefined {
		return this.pressed(inputStore, gamepad);
	}

	value(inputStore: CentralInputStore, gamepad: unknown): number {
		return this.pressed(inputStore, gamepad) ? 1.0 : 0.0;
	}

	getValue(inputStore: CentralInputStore, gamepad: unknown): number | undefined {
		const pressed = this.getPressed(inputStore, gamepad);
		return pressed !== undefined ? (pressed ? 1.0 : 0.0) : undefined;
	}

	// 模拟按下（用于测试）
	press(world: BevyWorld): void {
		VirtualButtonStore.getInstance().setPressed(this.id, true);
	}

	pressAsGamepad(world: BevyWorld, gamepad: unknown): void {
		this.press(world);
	}

	// 模拟释放（用于测试）
	release(world: BevyWorld): void {
		VirtualButtonStore.getInstance().setPressed(this.id, false);
	}

	releaseAsGamepad(world: BevyWorld, gamepad: unknown): void {
		this.release(world);
	}

	setValue(world: BevyWorld, value: number): void {
		VirtualButtonStore.getInstance().setPressed(this.id, value > 0.5);
	}

	equals(other: UserInput): boolean {
		if (!(other instanceof VirtualButton)) return false;
		return this.id === other.id;
	}

	released(inputStore: CentralInputStore, gamepad?: number): boolean {
		return !this.pressed(inputStore, gamepad);
	}
}

// =====================================
// 定义游戏动作
// =====================================

enum PlayerAction {
	Jump,
	Attack,
}

// 创建 Actionlike 类
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
// UI 创建
// =====================================

/**
 * 创建虚拟按钮 UI
 */
function createVirtualButtonUI(virtualJumpButton: VirtualButton, virtualAttackButton: VirtualButton): void {
	const localPlayer = Players.LocalPlayer;
	if (!localPlayer) return;

	const playerGui = localPlayer.WaitForChild("PlayerGui") as PlayerGui;

	// 创建 ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "VirtualButtonGui";
	screenGui.Parent = playerGui;

	// 创建容器
	const container = new Instance("Frame");
	container.Name = "ButtonContainer";
	container.Size = new UDim2(1, 0, 0.3, 0);
	container.Position = new UDim2(0, 0, 0.7, 0);
	container.BackgroundTransparency = 1;
	container.Parent = screenGui;

	// 跳跃按钮
	const jumpButton = new Instance("TextButton");
	jumpButton.Name = "JumpButton";
	jumpButton.Text = "跳跃\n(Space)";
	jumpButton.Size = new UDim2(0, 120, 0, 120);
	jumpButton.Position = new UDim2(0.1, 0, 0.5, -60);
	jumpButton.BackgroundColor3 = new Color3(0.2, 0.5, 1);
	jumpButton.TextColor3 = new Color3(1, 1, 1);
	jumpButton.TextScaled = true;
	jumpButton.Font = Enum.Font.SourceSansBold;
	jumpButton.Parent = container;

	// 跳跃按钮圆角
	const jumpCorner = new Instance("UICorner");
	jumpCorner.CornerRadius = new UDim(0, 12);
	jumpCorner.Parent = jumpButton;

	// 攻击按钮
	const attackButton = new Instance("TextButton");
	attackButton.Name = "AttackButton";
	attackButton.Text = "攻击\n(Click)";
	attackButton.Size = new UDim2(0, 120, 0, 120);
	attackButton.Position = new UDim2(0.9, -120, 0.5, -60);
	attackButton.BackgroundColor3 = new Color3(1, 0.3, 0.3);
	attackButton.TextColor3 = new Color3(1, 1, 1);
	attackButton.TextScaled = true;
	attackButton.Font = Enum.Font.SourceSansBold;
	attackButton.Parent = container;

	// 攻击按钮圆角
	const attackCorner = new Instance("UICorner");
	attackCorner.CornerRadius = new UDim(0, 12);
	attackCorner.Parent = attackButton;

	// 跳跃按钮事件
	jumpButton.MouseButton1Down.Connect(() => {
		VirtualButtonStore.getInstance().setPressed(virtualJumpButton.id, true);
		jumpButton.BackgroundColor3 = new Color3(0.1, 0.3, 0.7);
	});

	jumpButton.MouseButton1Up.Connect(() => {
		VirtualButtonStore.getInstance().setPressed(virtualJumpButton.id, false);
		jumpButton.BackgroundColor3 = new Color3(0.2, 0.5, 1);
	});

	jumpButton.MouseLeave.Connect(() => {
		VirtualButtonStore.getInstance().setPressed(virtualJumpButton.id, false);
		jumpButton.BackgroundColor3 = new Color3(0.2, 0.5, 1);
	});

	// 攻击按钮事件
	attackButton.MouseButton1Down.Connect(() => {
		VirtualButtonStore.getInstance().setPressed(virtualAttackButton.id, true);
		attackButton.BackgroundColor3 = new Color3(0.7, 0.2, 0.2);
	});

	attackButton.MouseButton1Up.Connect(() => {
		VirtualButtonStore.getInstance().setPressed(virtualAttackButton.id, false);
		attackButton.BackgroundColor3 = new Color3(1, 0.3, 0.3);
	});

	attackButton.MouseLeave.Connect(() => {
		VirtualButtonStore.getInstance().setPressed(virtualAttackButton.id, false);
		attackButton.BackgroundColor3 = new Color3(1, 0.3, 0.3);
	});

	// 添加提示文本
	const hintLabel = new Instance("TextLabel");
	hintLabel.Text = "使用屏幕按钮或键盘控制";
	hintLabel.Size = new UDim2(0.5, 0, 0, 30);
	hintLabel.Position = new UDim2(0.25, 0, 0, 10);
	hintLabel.BackgroundTransparency = 1;
	hintLabel.TextColor3 = new Color3(1, 1, 1);
	hintLabel.TextScaled = true;
	hintLabel.Font = Enum.Font.SourceSans;
	hintLabel.Parent = container;
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
	print("Virtual Button Example");
	print("========================================");
	print("控制方式:");
	print("  跳跃: 空格键 或 屏幕左侧按钮");
	print("  攻击: 鼠标左键 或 屏幕右侧按钮");
	print("========================================\n");

	// 创建虚拟按钮实例
	const virtualJumpButton = new VirtualButton("virtual_jump");
	const virtualAttackButton = new VirtualButton("virtual_attack");

	// 创建输入映射
	const inputMap = new InputMap<PlayerActionlike>();

	// 跳跃动作 - 同时映射物理键和虚拟按钮
	inputMap.insert(new PlayerActionlike(PlayerAction.Jump), KeyCode.Space);
	inputMap.insert(new PlayerActionlike(PlayerAction.Jump), virtualJumpButton as any);

	// 攻击动作 - 同时映射鼠标和虚拟按钮
	inputMap.insert(new PlayerActionlike(PlayerAction.Attack), MouseButton.left());
	inputMap.insert(new PlayerActionlike(PlayerAction.Attack), virtualAttackButton as any);

	// 创建动作状态
	const actionState = new ActionState<PlayerActionlike>();

	// 注册动作到 ActionState
	actionState.registerAction(new PlayerActionlike(PlayerAction.Jump));
	actionState.registerAction(new PlayerActionlike(PlayerAction.Attack));

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
		createVirtualButtonUI(virtualJumpButton, virtualAttackButton);
	}
}

/**
 * 处理玩家输入
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

		// 检测跳跃
		const jumpAction = new PlayerActionlike(PlayerAction.Jump);
		if (actionState.justPressed(jumpAction)) {
			const newJumpCount = playerData.jumpCount + 1;
			world.insert(
				entityId as any,
				Player({
					name: playerData.name,
					jumpCount: newJumpCount,
				})
			);
			print(`[${playerData.name}] 跳跃! (第 ${newJumpCount} 次)`);

			// 检查输入来源（调试用）
			const virtualPressed = VirtualButtonStore.getInstance().isPressed("virtual_jump");
			const source = virtualPressed ? "虚拟按钮" : "键盘";
			print(`  输入来源: ${source}`);
		}

		// 检测攻击
		const attackAction = new PlayerActionlike(PlayerAction.Attack);
		if (actionState.justPressed(attackAction)) {
			print(`[${playerData.name}] 攻击!`);

			// 检查输入来源
			const virtualPressed = VirtualButtonStore.getInstance().isPressed("virtual_attack");
			const source = virtualPressed ? "虚拟按钮" : "鼠标";
			print(`  输入来源: ${source}`);
		}
	}
}

/**
 * 显示状态信息
 */
function displayStatus(world: BevyWorld): void {
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState) continue;

		const playerData = player as unknown as {
			name: string;
			jumpCount: number;
		};

		// 持续按住时显示
		const jumpAction = new PlayerActionlike(PlayerAction.Jump);
		if (actionState.pressed(jumpAction)) {
			// print(`[${playerData.name}] 跳跃键按住中...`);
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
	app.addSystems(MainScheduleLabel.UPDATE, handlePlayerInput, displayStatus);

	return app;
}

// =====================================
// 入口点
// =====================================

if (RunService.IsServer()) {
	print("[Server] Virtual Button Example Started");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Virtual Button Example Started");
	const app = createApp();
	app.run();
}