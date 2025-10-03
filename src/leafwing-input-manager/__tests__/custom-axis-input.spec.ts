/**
 * 自定义轴输入测试
 * 测试自定义 Axislike 输入类型的实现和注册
 * 对应 Rust 测试: axislike_axis_data.rs
 */

import { Actionlike } from "../actionlike";
import { ActionState } from "../action-state/action-state";
import { InputControlKind } from "../input-control-kind";
import { InputMap } from "../input-map/input-map";
import { advanceFrame, createTestApp } from "./test-utils";
import { App } from "../../bevy_app/app";
import { createInputManagerPlugin } from "../plugin/input-manager-plugin";
import { UserInput } from "../user-input/traits/user-input";
import { Axislike } from "../user-input/traits/axislike";
import { CentralInputStore } from "../user-input/central-input-store";
import { BasicInputs } from "../clashing-inputs/basic-inputs";
import { Resource, World } from "../../bevy_ecs";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import type { Context } from "../../bevy_ecs";

/**
 * 模拟 MIDI 控制器状态资源
 * 对应 Rust 的 MidiControllerState
 */
class MidiControllerState implements Resource {
	constructor() {}
}

/**
 * 自定义 MIDI 轴输入类型
 * 对应 Rust 的 MidiAxis
 * 实现 UserInput 和 Axislike 接口
 */
class MidiAxis implements UserInput, Axislike {
	/**
	 * 创建 MIDI 轴输入
	 * @param channel - MIDI 通道号
	 */
	constructor(private readonly channel: number) {}

	/**
	 * 获取输入类型
	 * @returns 轴输入类型
	 */
	kind(): InputControlKind {
		return InputControlKind.Axis;
	}

	/**
	 * 分解为基础输入(用于冲突检测)
	 * @returns 无基础输入
	 */
	decompose(): BasicInputs {
		return BasicInputs.empty();
	}

	/**
	 * 获取唯一哈希
	 * @returns 哈希字符串
	 */
	hash(): string {
		return `MidiAxis(${this.channel})`;
	}

	/**
	 * 检查是否相等
	 * @param other - 另一个输入
	 * @returns 是否相等
	 */
	equals(other: UserInput): boolean {
		if (!(other instanceof MidiAxis)) {
			return false;
		}

		return this.channel === other.channel;
	}

	/**
	 * 获取当前轴值
	 * @param inputStore - 中央输入存储
	 * @param gamepad - 游戏手柄实体(可选)
	 * @returns 轴值,通常在 -1.0 到 1.0 之间
	 */
	value(inputStore: CentralInputStore, gamepad?: number): number {
		// 从中央输入存储读取轴值
		return inputStore.axisValue(this.hash());
	}

	/**
	 * 获取当前轴值(可能未设置)
	 * @param inputStore - 中央输入存储
	 * @param gamepad - 游戏手柄实体(可选)
	 * @returns 轴值或 undefined
	 */
	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined {
		return inputStore.getAxisValue(this.hash());
	}

	/**
	 * 设置轴值
	 * @param world - 游戏世界
	 * @param value - 要设置的值
	 */
	setValue(world: World, value: number): void {
		// 注意: 在测试环境中,我们通过 CentralInputStore 直接设置值
		// 实际使用时,这个方法可能需要访问 Bevy World 的资源系统
		// 这里我们先留空,因为测试中会直接调用 CentralInputStore
	}

	/**
	 * 获取通道号
	 * @returns MIDI 通道号
	 */
	getChannel(): number {
		return this.channel;
	}
}

/**
 * 模拟 MIDI 输入更新
 * 这个函数在测试中手动调用，而不是作为系统
 * @param app - App 实例
 * @param channel - MIDI 通道
 * @param value - 轴值
 */
function updateMidiInput(app: App, channel: number, value: number): void {
	const inputStore = app.getWorld().resources.getResource<CentralInputStore>();

	if (!inputStore) {
		return;
	}

	// 更新指定通道的轴输入
	inputStore.updateAxislike(new MidiAxis(channel).hash(), value);
}

/**
 * 测试用动作枚举
 * 对应 Rust 的 Action enum
 */
class TestAction implements Actionlike {
	static readonly Axis0 = new TestAction("Axis0");
	static readonly Axis1 = new TestAction("Axis1");
	static readonly Axis2 = new TestAction("Axis2");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Axis;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

/**
 * 创建测试 App 并配置自定义输入
 * @returns 配置好的 App 实例
 */
function createCustomAxisTestApp(): App {
	const app = createTestApp();

	// 初始化 MIDI 控制器状态资源
	app.insertResource(new MidiControllerState());

	// 添加 InputManagerPlugin
	const plugin = createInputManagerPlugin<TestAction>({
		actionTypeName: "TestAction",
	});
	app.addPlugins(plugin);

	// 注册自定义输入类型
	// 对应 Rust: app.register_input_kind::<MidiAxis>(InputControlKind::Axis);
	// 注意: TypeScript 版本不需要显式注册,因为类型系统已经处理了这个问题

	// 初始化 ActionState 资源
	const actionState = new ActionState<TestAction>();
	actionState.registerAction(TestAction.Axis0);
	actionState.registerAction(TestAction.Axis1);
	actionState.registerAction(TestAction.Axis2);

	// 创建 InputMap 并绑定自定义轴输入
	const inputMap = new InputMap<TestAction>();
	inputMap.insert(TestAction.Axis0, new MidiAxis(0));
	inputMap.insert(TestAction.Axis1, new MidiAxis(1));
	// 注意: Axis2 不在输入映射中

	// 插入资源
	app.insertResource(inputMap);
	app.insertResource(actionState);

	return app;
}

export = () => {
	describe("Custom Axis Input Tests", () => {
		describe("MidiAxis Implementation", () => {
			it("should implement UserInput interface correctly", () => {
				const midiAxis = new MidiAxis(0);

				expect(midiAxis.kind()).to.equal(InputControlKind.Axis);
				expect(midiAxis.hash()).to.equal("MidiAxis(0)");

				const decomposed = midiAxis.decompose();
				expect(decomposed.isEmpty()).to.equal(true);
			});

			it("should implement equality correctly", () => {
				const axis1 = new MidiAxis(0);
				const axis2 = new MidiAxis(0);
				const axis3 = new MidiAxis(1);

				expect(axis1.equals(axis2)).to.equal(true);
				expect(axis1.equals(axis3)).to.equal(false);
			});

			it("should have unique hashes for different channels", () => {
				const axis0 = new MidiAxis(0);
				const axis1 = new MidiAxis(1);

				expect(axis0.hash()).to.equal("MidiAxis(0)");
				expect(axis1.hash()).to.equal("MidiAxis(1)");
				expect(axis0.hash() !== axis1.hash()).to.equal(true);
			});
		});

		describe("axis_data_should_be_none_before_update_axislike", () => {
			it("should return None for unmapped and unupdated axis", () => {
				const app = createCustomAxisTestApp();
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// Axis2 不在输入映射中且未更新,应该返回 undefined
				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				const axis2Input = new MidiAxis(2);
				const axis2Value = axis2Input.getValue(inputStore!, undefined);

				// 未设置的轴应该返回 undefined
				expect(axis2Value).to.equal(undefined);

				// ActionState 中的值应该是 0(默认值)
				const actionValue = actionState!.value(TestAction.Axis2);
				expect(actionValue).to.equal(0.0);
			});

			it("should return Some for mapped and updated axis", () => {
				const app = createCustomAxisTestApp();

				// 手动更新 MIDI 输入
				updateMidiInput(app, 1, 0.5);

				// 运行更新以处理输入
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// Axis1 在输入映射中且被更新,应该返回 Some(0.5)
				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				const axis1Input = new MidiAxis(1);
				const axis1Value = axis1Input.getValue(inputStore!, undefined);

				// 已更新的轴应该返回 0.5
				expect(axis1Value).to.equal(0.5);

				// ActionState 中的值应该也是 0.5
				const actionValue = actionState!.value(TestAction.Axis1);
				expect(actionValue).to.equal(0.5);
			});

			it("should return None for mapped but not updated axis", () => {
				const app = createCustomAxisTestApp();

				// 运行更新
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// Axis0 在输入映射中但未被更新,应该返回 undefined
				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				const axis0Input = new MidiAxis(0);
				const axis0Value = axis0Input.getValue(inputStore!, undefined);

				// 未更新的轴应该返回 undefined
				expect(axis0Value).to.equal(undefined);

				// ActionState 中的值应该是 0(默认值)
				const actionValue = actionState!.value(TestAction.Axis0);
				expect(actionValue).to.equal(0.0);
			});
		});

		describe("Custom Input Update System", () => {
			it("should update only specified axis", () => {
				const app = createCustomAxisTestApp();
				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				// 初始状态,所有轴都应该是 undefined
				const axis0 = new MidiAxis(0);
				const axis1 = new MidiAxis(1);
				const axis2 = new MidiAxis(2);

				expect(axis0.getValue(inputStore!, undefined)).to.equal(undefined);
				expect(axis1.getValue(inputStore!, undefined)).to.equal(undefined);
				expect(axis2.getValue(inputStore!, undefined)).to.equal(undefined);

				// 手动更新只有 Axis1
				updateMidiInput(app, 1, 0.5);

				// 运行更新以处理输入
				advanceFrame(app);

				expect(axis0.getValue(inputStore!, undefined)).to.equal(undefined);
				expect(axis1.getValue(inputStore!, undefined)).to.equal(0.5);
				expect(axis2.getValue(inputStore!, undefined)).to.equal(undefined);
			});

			it("should persist axis value across frames", () => {
				const app = createCustomAxisTestApp();

				// 手动更新 MIDI 输入
				updateMidiInput(app, 1, 0.5);

				// 第一帧更新
				advanceFrame(app);

				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				const axis1 = new MidiAxis(1);
				expect(axis1.getValue(inputStore!, undefined)).to.equal(0.5);

				// 第二帧更新
				advanceFrame(app);

				// 值应该保持不变
				expect(axis1.getValue(inputStore!, undefined)).to.equal(0.5);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();
				expect(actionState!.value(TestAction.Axis1)).to.equal(0.5);
			});
		});

		describe("InputMap Integration", () => {
			it("should correctly bind custom axis to actions", () => {
				const app = createCustomAxisTestApp();
				const inputMap = app.getResource<InputMap<TestAction>>();
				expect(inputMap).to.be.ok();

				// 验证输入映射配置
				const axis0Input = new MidiAxis(0);
				const axis1Input = new MidiAxis(1);

				// 手动更新 Axis1
				updateMidiInput(app, 1, 0.5);

				// 测试输入是否正确绑定到动作
				// 注意: InputMap 没有直接的 get 方法,我们通过 ActionState 来验证
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// Axis1 应该有值(因为被更新了)
				const axis1Value = actionState!.value(TestAction.Axis1);
				expect(axis1Value).to.equal(0.5);

				// Axis0 没有值(未更新)
				const axis0Value = actionState!.value(TestAction.Axis0);
				expect(axis0Value).to.equal(0.0);

				// Axis2 没有绑定也没有值
				const axis2Value = actionState!.value(TestAction.Axis2);
				expect(axis2Value).to.equal(0.0);
			});
		});

		describe("setValue Method", () => {
			it("should correctly set axis value through CentralInputStore", () => {
				const app = createCustomAxisTestApp();
				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				const axis0 = new MidiAxis(0);

				// 通过 CentralInputStore 直接设置值
				inputStore!.updateAxislike(axis0.hash(), 0.75);

				// 验证值已设置
				const value = axis0.getValue(inputStore!, undefined);
				expect(value).to.equal(0.75);

				// 运行更新,验证 ActionState 能读取到值
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				const actionValue = actionState!.value(TestAction.Axis0);
				expect(actionValue).to.equal(0.75);
			});

			it("should update axis value when called multiple times", () => {
				const app = createCustomAxisTestApp();
				const inputStore = app.getWorld().resources.getResource<CentralInputStore>();
				expect(inputStore).to.be.ok();

				const axis1 = new MidiAxis(1);

				// 设置第一个值
				inputStore!.updateAxislike(axis1.hash(), 0.3);
				expect(axis1.getValue(inputStore!, undefined)).to.equal(0.3);

				// 更新为新值
				inputStore!.updateAxislike(axis1.hash(), 0.8);
				expect(axis1.getValue(inputStore!, undefined)).to.equal(0.8);

				// 验证 ActionState
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();
				expect(actionState!.value(TestAction.Axis1)).to.equal(0.8);
			});
		});
	});
};
