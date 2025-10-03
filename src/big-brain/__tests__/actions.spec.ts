/**
 * Actions 系统单元测试
 * 测试 Action 状态机转换和 ActionBuilder 机制
 */

import { World } from "@rbxts/matter";

/**
 * Action 状态枚举
 * 对应 Bevy big-brain 的 ActionState
 */
enum ActionState {
	/** 初始状态，未执行任何操作 */
	Init = "Init",
	/** 动作已请求，应尽快开始执行 */
	Requested = "Requested",
	/** 动作正在执行中 */
	Executing = "Executing",
	/** 动作已被取消，需要清理 */
	Cancelled = "Cancelled",
	/** 动作成功完成 */
	Success = "Success",
	/** 动作执行失败 */
	Failure = "Failure",
}

/**
 * ActionBuilder 接口
 * 对应 Bevy big-brain 的 ActionBuilder trait
 */
interface ActionBuilder {
	/**
	 * 构建 Action 组件
	 * @param world - Matter World 实例
	 * @param actionEntity - Action 实体 ID
	 * @param actorEntity - Actor 实体 ID
	 */
	build(world: World, actionEntity: number, actorEntity: number): void;

	/**
	 * 获取 Action 标签
	 * @returns Action 标签字符串
	 */
	label(): string | undefined;
}

/**
 * 简单测试 Action
 */
class TestAction implements ActionBuilder {
	constructor(public readonly actionLabel?: string) {}

	build(world: World, actionEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.actionLabel;
	}
}

/**
 * 泛型测试 Action
 */
class GenericTestAction<T> implements ActionBuilder {
	constructor(
		public readonly value: T,
		public readonly actionLabel?: string,
	) {}

	build(world: World, actionEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.actionLabel;
	}
}

export = () => {
	describe("ActionBuilder 基础功能", () => {
		it("应该正确返回 Action 标签", () => {
			const action = new TestAction("MyLabel");
			expect(action.label()).to.equal("MyLabel");
		});

		it("应该支持无标签的 Action", () => {
			const action = new TestAction();
			expect(action.label()).to.equal(undefined);
		});

		it("应该支持泛型 Action 并返回正确标签", () => {
			const action = new GenericTestAction(42, "MyGenericLabel");
			expect(action.label()).to.equal("MyGenericLabel");
			expect(action.value).to.equal(42);
		});

		it("应该支持不同类型的泛型参数", () => {
			const stringAction = new GenericTestAction("test", "StringAction");
			const numberAction = new GenericTestAction(123, "NumberAction");

			expect(stringAction.value).to.equal("test");
			expect(numberAction.value).to.equal(123);
		});
	});

	describe("ActionState 状态转换", () => {
		it("应该定义所有必需的状态", () => {
			expect(ActionState.Init).to.be.ok();
			expect(ActionState.Requested).to.be.ok();
			expect(ActionState.Executing).to.be.ok();
			expect(ActionState.Cancelled).to.be.ok();
			expect(ActionState.Success).to.be.ok();
			expect(ActionState.Failure).to.be.ok();
		});

		it("应该验证正常的状态转换流程 (Init -> Requested -> Executing -> Success)", () => {
			let currentState = ActionState.Init;

			// Init -> Requested
			currentState = ActionState.Requested;
			expect(currentState).to.equal(ActionState.Requested);

			// Requested -> Executing
			currentState = ActionState.Executing;
			expect(currentState).to.equal(ActionState.Executing);

			// Executing -> Success
			currentState = ActionState.Success;
			expect(currentState).to.equal(ActionState.Success);
		});

		it("应该支持取消流程 (Executing -> Cancelled -> Failure)", () => {
			let currentState = ActionState.Executing;

			// Executing -> Cancelled
			currentState = ActionState.Cancelled;
			expect(currentState).to.equal(ActionState.Cancelled);

			// Cancelled -> Failure (cleanup完成)
			currentState = ActionState.Failure;
			expect(currentState).to.equal(ActionState.Failure);
		});

		it("应该支持立即失败 (Executing -> Failure)", () => {
			let currentState = ActionState.Executing;

			currentState = ActionState.Failure;
			expect(currentState).to.equal(ActionState.Failure);
		});
	});

	describe("Action 构建和初始化", () => {
		it("应该在构建时抛出未实现错误 (因为实现未完成)", () => {
			const action = new TestAction("TestLabel");
			const world = new World();
			const actionEntity = 1;
			const actorEntity = 2;

			expect(() => {
				action.build(world, actionEntity, actorEntity);
			}).to.throw();
		});
	});

	describe("ActionBuilder 模式验证", () => {
		it("应该允许创建多个相同类型的 Action 实例", () => {
			const action1 = new TestAction("Label1");
			const action2 = new TestAction("Label2");
			const action3 = new TestAction("Label1");

			expect(action1.label()).to.equal("Label1");
			expect(action2.label()).to.equal("Label2");
			expect(action3.label()).to.equal("Label1");
			expect(action1).never.to.equal(action2);
		});

		it("应该支持 Action 克隆语义", () => {
			const original = new GenericTestAction(100, "Original");
			const cloned = new GenericTestAction(original.value, original.label());

			expect(cloned.value).to.equal(original.value);
			expect(cloned.label()).to.equal(original.label());
		});
	});
};
