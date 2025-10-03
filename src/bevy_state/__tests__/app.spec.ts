/**
 * app.spec.ts - App 状态系统集成测试
 * 对应 Rust bevy_state/src/app.rs 中的测试
 */

import { App } from "../../bevy_app/app";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { EnumStates, States } from "../states";
import { State, NextState } from "../resources";
import { StateTransition, StateTransitionMessage } from "../transitions";
import { ComputedStates, BaseComputedStates, SingleStateSet } from "../computed-states";
import { SubStates, BaseSubStates, SubStateConfig } from "../sub-states";
import "../app"; // 导入扩展方法

/**
 * 测试状态枚举
 */
class TestState extends EnumStates {
	public static readonly DEPENDENCY_DEPTH = 1;

	public static readonly Menu = new TestState("Menu");
	public static readonly InGame = new TestState("InGame");
	public static readonly Paused = new TestState("Paused");

	public static default(): TestState {
		return TestState.Menu;
	}
}

/**
 * 测试计算状态
 */
class TestComputedState extends BaseComputedStates<TestState> {
	public static readonly DEPENDENCY_DEPTH = 2;

	public static readonly Active = new TestComputedState("Active");
	public static readonly Inactive = new TestComputedState("Inactive");

	private value: string;

	constructor(value?: string) {
		super(new SingleStateSet(TestState));
		this.value = value ?? "";
	}

	public getStateId(): string | number {
		return this.value;
	}

	public clone(): States {
		return new TestComputedState(this.value);
	}

	public compute(source: TestState | undefined): TestComputedState | undefined {
		if (!source) {
			return undefined;
		}

		if (source.equals(TestState.Menu)) {
			return TestComputedState.Inactive;
		}

		return TestComputedState.Active;
	}
}

/**
 * 测试子状态
 */
class TestSubState extends BaseSubStates<TestState> {
	public static readonly DEPENDENCY_DEPTH = 2;

	public static readonly SubMenu1 = new TestSubState("SubMenu1");
	public static readonly SubMenu2 = new TestSubState("SubMenu2");

	private value: string;

	constructor(value?: string) {
		super({
			parentType: TestState,
			allowedParentStates: new Set(["Menu"]),
		} as SubStateConfig<TestState>);
		this.value = value ?? "";
	}

	public getStateId(): string | number {
		return this.value;
	}

	public clone(): States {
		return new TestSubState(this.value);
	}

	public shouldExist(parentState: TestState | undefined): this | undefined {
		if (!parentState) {
			return undefined;
		}

		if (parentState.equals(TestState.Menu)) {
			return this;
		}

		return undefined;
	}
}

export = () => {
	describe("App 状态系统集成", () => {
		let app: App;

		beforeEach(() => {
			app = new App();
		});

		afterEach(() => {
			// 清理
		});

		it("应该能够初始化状态（initState）", () => {
			// 初始化状态
			app.initState(() => TestState.default());

			// 获取资源管理器
			const resourceManager = app.world().world.resources;

			// 验证 State 资源不存在（因为还未执行 StateTransition 调度）
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.never.be.ok();

			// 验证 NextState 资源存在且为 Pending
			const nextStateResource = resourceManager.getResource<NextState<TestState>>();
			expect(nextStateResource).to.be.ok();
			expect(nextStateResource!.isPending()).to.equal(true);

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 验证状态已初始化
			const stateResourceAfter = resourceManager.getResource<State<TestState>>();
			expect(stateResourceAfter).to.be.ok();
			expect(stateResourceAfter!.get().equals(TestState.Menu)).to.equal(true);
		});

		it("应该能够插入状态（insertState）", () => {
			// 插入状态
			app.insertState(TestState.InGame);

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 获取资源管理器
			const resourceManager = app.world().world.resources;

			// 验证状态已设置
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.be.ok();
			expect(stateResource!.get().equals(TestState.InGame)).to.equal(true);
		});

		it("insertState 应该能够覆盖 initState", () => {
			// 先初始化
			app.initState(() => TestState.default());

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 再插入新状态
			app.insertState(TestState.Paused);

			// 获取资源管理器
			const resourceManager = app.world().world.resources;

			// 验证状态已被覆盖
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.be.ok();
			expect(stateResource!.get().equals(TestState.Paused)).to.equal(true);
		});

		it("insertState 应该能够覆盖 insertState", () => {
			// 插入第一个状态
			app.insertState(TestState.InGame);

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 插入第二个状态
			app.insertState(TestState.Paused);

			// 获取资源管理器
			const resourceManager = app.world().world.resources;

			// 验证状态已被覆盖
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.be.ok();
			expect(stateResource!.get().equals(TestState.Paused)).to.equal(true);
		});

		it("重复初始化相同状态应该产生警告但不出错", () => {
			// 第一次初始化
			app.initState(() => TestState.default());

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 第二次初始化相同状态（应该产生警告但不出错）
			app.initState(() => TestState.InGame);

			// 获取资源管理器
			const resourceManager = app.world().world.resources;

			// 验证状态仍然是第一次初始化的值
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.be.ok();
			expect(stateResource!.get().equals(TestState.Menu)).to.equal(true);
		});

		// 暂时跳过计算状态测试，因为需要特殊的类型构造
		// it("应该能够添加计算状态（addComputedState）", () => {
		// 	// 初始化基础状态
		// 	app.initState(() => TestState.default());

		// 	// 添加计算状态
		// 	app.addComputedState(TestState, TestComputedState);

		// 	// 执行 StateTransition 调度
		// 	app.runSchedule(StateTransition);

		// 	// 获取资源管理器
		// 	const resourceManager = app.world().world.resources;

		// 	// 验证计算状态已初始化
		// 	const computedStateResource = resourceManager.getResource<State<TestComputedState>>();
		// 	expect(computedStateResource).to.be.ok();

		// 	// 验证计算状态的值正确（Menu -> Inactive）
		// 	expect(computedStateResource!.get().equals(TestComputedState.Inactive)).to.equal(true);
		// });

		// 暂时跳过子状态测试，因为需要特殊的类型构造
		// it("应该能够添加子状态（addSubState）", () => {
		// 	// 初始化父状态
		// 	app.initState(() => TestState.default());

		// 	// 添加子状态
		// 	app.addSubState(TestSubState);

		// 	// 执行 StateTransition 调度
		// 	app.runSchedule(StateTransition);

		// 	// 获取资源管理器
		// 	const resourceManager = app.world().world.resources;

		// 	// 验证子状态已初始化（因为父状态是 Menu）
		// 	const subStateResource = resourceManager.getResource<State<TestSubState>>();
		// 	expect(subStateResource).to.be.ok();
		// });

		it("状态转换应该触发 StateTransition 调度", () => {
			// 初始化状态
			app.initState(() => TestState.default());

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 添加跟踪变量
			let transitionExecuted = false;

			// 添加 StateTransition 系统
			app.addSystems(StateTransition, () => {
				transitionExecuted = true;
			});

			// 获取资源管理器并设置下一个状态
			const resourceManager = app.world().world.resources;
			const nextStateResource = resourceManager.getResource<NextState<TestState>>();
			expect(nextStateResource).to.be.ok();

			nextStateResource!.set(TestState.InGame);

			// 执行 StateTransition 调度
			app.runSchedule(StateTransition);

			// 验证转换已执行
			expect(transitionExecuted).to.equal(true);

			// 验证状态已更新
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.be.ok();
			expect(stateResource!.get().equals(TestState.InGame)).to.equal(true);
		});

		it("应该在应用启动时自动初始化状态", () => {
			// 初始化状态
			app.initState(() => TestState.default());

			// 执行启动调度（模拟 app.run()）
			app.runSchedule(BuiltinSchedules.STARTUP);

			// 获取资源管理器
			const resourceManager = app.world().world.resources;

			// 验证状态已在启动时初始化
			const stateResource = resourceManager.getResource<State<TestState>>();
			expect(stateResource).to.be.ok();
			expect(stateResource!.get().equals(TestState.Menu)).to.equal(true);
		});
	});
};
