/**
 * Clash Handling Example - 输入冲突处理示例
 *
 * 演示当多个动作绑定到重叠的按键组合时如何处理冲突:
 * - 单键动作 vs 组合键动作的冲突
 * - ClashStrategy 的不同处理策略
 * - 使用 InputChord 创建组合键输入
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/clash_handling.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	createInputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	Actionlike,
	ClashStrategy,
	InputChord,
	InputManagerExtension,
} from "../../leafwing-input-manager";
import { ClashStrategyResource } from "../../leafwing-input-manager/clashing-inputs/clash-strategy";

// =====================================
// 定义测试动作
// =====================================

/**
 * 测试动作枚举
 * 对应 Rust 的 TestAction enum
 */
enum TestActionEnum {
	One,
	Two,
	Three,
	OneAndTwo,
	OneAndThree,
	TwoAndThree,
	OneAndTwoAndThree,
}

class TestActionlike implements Actionlike {
	constructor(public readonly action: TestActionEnum) {}

	hash(): string {
		return `TestAction:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return TestActionEnum[this.action];
	}
}

// =====================================
// 类型扩展声明
// =====================================
declare module "../../bevy_app/context" {
	interface AppContext {
		testInput: InputManagerExtension<TestActionlike>;
	}
}

// =====================================
// 系统定义
// =====================================

let inputPlugin: ReturnType<typeof createInputManagerPlugin<TestActionlike>>;

/**
 * 生成输入映射
 * 对应 Rust 的 spawn_input_map 函数
 */
function spawnInputMap(world: BevyWorld, context: Context): void {
	print("========================================");
	print("Clash Handling Example");
	print("========================================");

	// 创建输入映射
	const inputMap = new InputMap<TestActionlike>();

	// 单键绑定
	// 对应 Rust: InputMap::new([(One, Digit1), (Two, Digit2), (Three, Digit3)])
	inputMap.insert(new TestActionlike(TestActionEnum.One), KeyCode.from(Enum.KeyCode.One));
	inputMap.insert(new TestActionlike(TestActionEnum.Two), KeyCode.from(Enum.KeyCode.Two));
	inputMap.insert(new TestActionlike(TestActionEnum.Three), KeyCode.from(Enum.KeyCode.Three));

	// 组合键绑定 (两键)
	// 对应 Rust: input_map.insert(OneAndTwo, ButtonlikeChord::new([Digit1, Digit2]));
	const oneAndTwo = InputChord.from(KeyCode.from(Enum.KeyCode.One), KeyCode.from(Enum.KeyCode.Two));
	inputMap.insert(new TestActionlike(TestActionEnum.OneAndTwo), oneAndTwo);

	const oneAndThree = InputChord.from(KeyCode.from(Enum.KeyCode.One), KeyCode.from(Enum.KeyCode.Three));
	inputMap.insert(new TestActionlike(TestActionEnum.OneAndThree), oneAndThree);

	const twoAndThree = InputChord.from(KeyCode.from(Enum.KeyCode.Two), KeyCode.from(Enum.KeyCode.Three));
	inputMap.insert(new TestActionlike(TestActionEnum.TwoAndThree), twoAndThree);

	// 组合键绑定 (三键)
	// 对应 Rust: input_map.insert(OneAndTwoAndThree, ButtonlikeChord::new([Digit1, Digit2, Digit3]));
	const oneAndTwoAndThree = InputChord.from(
		KeyCode.from(Enum.KeyCode.One),
		KeyCode.from(Enum.KeyCode.Two),
		KeyCode.from(Enum.KeyCode.Three),
	);
	inputMap.insert(new TestActionlike(TestActionEnum.OneAndTwoAndThree), oneAndTwoAndThree);

	// 创建动作状态
	const actionState = new ActionState<TestActionlike>();

	// 注册所有动作
	actionState.registerAction(new TestActionlike(TestActionEnum.One));
	actionState.registerAction(new TestActionlike(TestActionEnum.Two));
	actionState.registerAction(new TestActionlike(TestActionEnum.Three));
	actionState.registerAction(new TestActionlike(TestActionEnum.OneAndTwo));
	actionState.registerAction(new TestActionlike(TestActionEnum.OneAndThree));
	actionState.registerAction(new TestActionlike(TestActionEnum.TwoAndThree));
	actionState.registerAction(new TestActionlike(TestActionEnum.OneAndTwoAndThree));

	// 使用插件扩展创建带有输入组件的实体
	// 对应 Rust: commands.spawn(input_map);
	const entity = inputPlugin.extension!.spawnWithInput(world, inputMap, actionState);

	print(`Input map spawned with entity ID: ${entity}`);
	print("========================================");
	print("Controls:");
	print("  1 - Action One");
	print("  2 - Action Two");
	print("  3 - Action Three");
	print("  1+2 - Action OneAndTwo");
	print("  1+3 - Action OneAndThree");
	print("  2+3 - Action TwoAndThree");
	print("  1+2+3 - Action OneAndTwoAndThree");
	print("\nClash Strategy: PrioritizeLongest");
	print("When multiple actions match, longer combinations win.");
	print("========================================");
}

/**
 * 报告刚按下的动作
 * 对应 Rust 的 report_pressed_actions 函数
 */
function reportPressedActions(world: BevyWorld, context: Context): void {
	// 对应 Rust: fn report_pressed_actions(action_state: Single<&ActionState<TestAction>, Changed<ActionState<TestAction>>>)
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) {
			continue;
		}

		// 收集所有刚按下的动作
		// 对应 Rust: dbg!(action_state.get_just_pressed());
		const justPressed: Array<string> = [];

		// 检查所有动作
		for (const action of [
			TestActionEnum.One,
			TestActionEnum.Two,
			TestActionEnum.Three,
			TestActionEnum.OneAndTwo,
			TestActionEnum.OneAndThree,
			TestActionEnum.TwoAndThree,
			TestActionEnum.OneAndTwoAndThree,
		]) {
			const actionlike = new TestActionlike(action);
			if (actionState.justPressed(actionlike)) {
				justPressed.push(TestActionEnum[action]);
			}
		}

		// 如果有动作被触发，打印出来
		if (justPressed.size() > 0) {
			print(`[Entity ${entityId}] Just pressed: [${justPressed.join(", ")}]`);
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

export function createApp(): App {
	const app = new App();

	// 对应 Rust: App::new().add_plugins(DefaultPlugins)
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 对应 Rust: .add_plugins(InputManagerPlugin::<TestAction>::default())
	inputPlugin = createInputManagerPlugin<TestActionlike>({
		actionTypeName: "TestAction",
	});
	app.addPlugin(inputPlugin);

	// 对应 Rust: .add_systems(Startup, spawn_input_map)
	app.addSystems(MainScheduleLabel.STARTUP, spawnInputMap);

	// 对应 Rust: .add_systems(Update, report_pressed_actions)
	app.addSystems(MainScheduleLabel.UPDATE, reportPressedActions);

	// 对应 Rust: .insert_resource(ClashStrategy::PrioritizeLongest)
	const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
	app.insertResource(clashStrategy);

	return app;
}

// =====================================
// 入口点
// =====================================

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting Clash Handling Example");
	const app = createApp();
	// 对应 Rust: .run();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting Clash Handling Example");
	const app = createApp();
	app.run();
}
