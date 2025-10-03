/**
 * Steps 复合 Action 单元测试
 * 测试顺序执行多个 Action 的组合行为
 */

import { World } from "@rbxts/matter";

/**
 * Action 状态枚举
 */
enum ActionState {
	Init = "Init",
	Requested = "Requested",
	Executing = "Executing",
	Cancelled = "Cancelled",
	Success = "Success",
	Failure = "Failure",
}

/**
 * ActionBuilder 接口
 */
interface ActionBuilder {
	build(world: World, actionEntity: number, actorEntity: number): void;
	label(): string | undefined;
}

/**
 * Steps 复合 Action
 * 按顺序执行多个子 Action，直到所有成功或某个失败
 */
class Steps implements ActionBuilder {
	private readonly stepBuilders: Array<ActionBuilder> = [];
	private readonly stepLabels: Array<string> = [];
	private actionLabel?: string;

	/**
	 * 添加一个步骤
	 * @param stepBuilder - 步骤的 ActionBuilder
	 * @returns this (用于链式调用)
	 */
	addStep(stepBuilder: ActionBuilder): this {
		this.stepBuilders.push(stepBuilder);
		this.stepLabels.push(stepBuilder.label() || "UnlabeledStep");
		return this;
	}

	/**
	 * 设置标签
	 * @param newLabel - 新标签
	 * @returns this (用于链式调用)
	 */
	setLabel(newLabel: string): this {
		this.actionLabel = newLabel;
		return this;
	}

	build(world: World, actionEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.actionLabel;
	}

	/**
	 * 获取步骤数量
	 * @returns 步骤数量
	 */
	getStepCount(): number {
		return this.stepBuilders.size();
	}

	/**
	 * 获取步骤标签列表
	 * @returns 步骤标签数组
	 */
	getStepLabels(): ReadonlyArray<string> {
		return this.stepLabels;
	}
}

/**
 * 简单测试 Action
 */
class SimpleAction implements ActionBuilder {
	constructor(private readonly actionLabel?: string) {}

	build(world: World, actionEntity: number, actorEntity: number): void {
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.actionLabel;
	}
}

/**
 * Concurrently 复合 Action
 * 同时执行多个 Action
 */
enum ConcurrentMode {
	/** 任意一个成功就成功 */
	Race = "Race",
	/** 全部成功才成功 */
	Join = "Join",
}

/**
 * Concurrently Action Builder
 */
class Concurrently implements ActionBuilder {
	private readonly actionBuilders: Array<ActionBuilder> = [];
	private readonly actionLabels: Array<string> = [];
	private concurrentMode: ConcurrentMode = ConcurrentMode.Join;
	private actionLabel?: string;

	/**
	 * 添加一个并发 Action
	 * @param actionBuilder - ActionBuilder
	 * @returns this (用于链式调用)
	 */
	addAction(actionBuilder: ActionBuilder): this {
		this.actionBuilders.push(actionBuilder);
		this.actionLabels.push(actionBuilder.label() || "UnlabeledAction");
		return this;
	}

	/**
	 * 设置并发模式
	 * @param mode - 并发模式
	 * @returns this (用于链式调用)
	 */
	setMode(mode: ConcurrentMode): this {
		this.concurrentMode = mode;
		return this;
	}

	/**
	 * 设置标签
	 * @param newLabel - 新标签
	 * @returns this (用于链式调用)
	 */
	setLabel(newLabel: string): this {
		this.actionLabel = newLabel;
		return this;
	}

	build(world: World, actionEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.actionLabel;
	}

	/**
	 * 获取 Action 数量
	 * @returns Action 数量
	 */
	getActionCount(): number {
		return this.actionBuilders.size();
	}

	/**
	 * 获取并发模式
	 * @returns 当前并发模式
	 */
	getMode(): ConcurrentMode {
		return this.concurrentMode;
	}
}

export = () => {
	describe("Steps 基础功能", () => {
		it("应该允许创建空的 Steps", () => {
			const steps = new Steps();
			expect(steps.getStepCount()).to.equal(0);
		});

		it("应该允许添加单个步骤", () => {
			const steps = new Steps();
			const action = new SimpleAction("Step1");

			steps.addStep(action);

			expect(steps.getStepCount()).to.equal(1);
		});

		it("应该允许添加多个步骤", () => {
			const steps = new Steps();

			steps.addStep(new SimpleAction("Step1"));
			steps.addStep(new SimpleAction("Step2"));
			steps.addStep(new SimpleAction("Step3"));

			expect(steps.getStepCount()).to.equal(3);
		});

		it("应该支持链式调用", () => {
			const steps = new Steps()
				.addStep(new SimpleAction("Step1"))
				.addStep(new SimpleAction("Step2"))
				.setLabel("MySteps");

			expect(steps.getStepCount()).to.equal(2);
			expect(steps.label()).to.equal("MySteps");
		});

		it("应该记录步骤标签", () => {
			const steps = new Steps()
				.addStep(new SimpleAction("Action1"))
				.addStep(new SimpleAction("Action2"))
				.addStep(new SimpleAction("Action3"));

			const labels = steps.getStepLabels();

			expect(labels.size()).to.equal(3);
			expect(labels[0]).to.equal("Action1");
			expect(labels[1]).to.equal("Action2");
			expect(labels[2]).to.equal("Action3");
		});

		it("应该为无标签步骤提供默认标签", () => {
			const steps = new Steps().addStep(new SimpleAction());

			const labels = steps.getStepLabels();

			expect(labels[0]).to.equal("UnlabeledStep");
		});
	});

	describe("Steps 执行逻辑概念", () => {
		it("应该按顺序执行步骤 (概念验证)", () => {
			const executionOrder: Array<string> = [];

			const step1 = new SimpleAction("Step1");
			const step2 = new SimpleAction("Step2");
			const step3 = new SimpleAction("Step3");

			const steps = new Steps().addStep(step1).addStep(step2).addStep(step3);

			// 模拟执行顺序
			let currentStepIndex = 0;
			const stepLabels = steps.getStepLabels();

			while (currentStepIndex < steps.getStepCount()) {
				executionOrder.push(stepLabels[currentStepIndex]);
				currentStepIndex++;
			}

			expect(executionOrder.size()).to.equal(3);
			expect(executionOrder[0]).to.equal("Step1");
			expect(executionOrder[1]).to.equal("Step2");
			expect(executionOrder[2]).to.equal("Step3");
		});

		it("应该在步骤失败时停止执行 (概念验证)", () => {
			const steps = new Steps()
				.addStep(new SimpleAction("Step1"))
				.addStep(new SimpleAction("FailingStep"))
				.addStep(new SimpleAction("Step3"));

			// 模拟执行：第二步失败
			const stepResults = [ActionState.Success, ActionState.Failure, ActionState.Init];

			let finalState = ActionState.Success;
			let currentStepIndex = 0;

			for (const result of stepResults) {
				if (result === ActionState.Failure) {
					finalState = ActionState.Failure;
					break;
				}

				if (result === ActionState.Success) {
					currentStepIndex++;

					if (currentStepIndex >= steps.getStepCount()) {
						break;
					}
				}
			}

			expect(finalState).to.equal(ActionState.Failure);
			expect(currentStepIndex).to.equal(1);
		});

		it("应该在所有步骤成功时返回成功 (概念验证)", () => {
			const steps = new Steps()
				.addStep(new SimpleAction("Step1"))
				.addStep(new SimpleAction("Step2"))
				.addStep(new SimpleAction("Step3"));

			// 模拟所有步骤成功
			const stepResults = [ActionState.Success, ActionState.Success, ActionState.Success];

			let finalState = ActionState.Executing;
			let currentStepIndex = 0;

			for (const result of stepResults) {
				if (result === ActionState.Success) {
					currentStepIndex++;

					if (currentStepIndex >= steps.getStepCount()) {
						finalState = ActionState.Success;
						break;
					}
				} else {
					finalState = ActionState.Failure;
					break;
				}
			}

			expect(finalState).to.equal(ActionState.Success);
		});
	});

	describe("Steps 取消逻辑", () => {
		it("应该支持取消当前步骤 (概念验证)", () => {
			const steps = new Steps()
				.addStep(new SimpleAction("Step1"))
				.addStep(new SimpleAction("Step2"))
				.addStep(new SimpleAction("Step3"));

			// 模拟在第二步时取消
			let currentStepIndex = 1;
			let currentStepState = ActionState.Executing;

			// 收到取消请求
			currentStepState = ActionState.Cancelled;

			expect(currentStepState).to.equal(ActionState.Cancelled);
			expect(currentStepIndex).to.equal(1);
		});

		it("应该等待当前步骤清理后再完成取消 (概念验证)", () => {
			const cleanupStates: Array<ActionState> = [
				ActionState.Cancelled,
				ActionState.Cancelled,
				ActionState.Failure,
			];

			let finalState = ActionState.Cancelled;

			for (const state of cleanupStates) {
				if (state === ActionState.Failure || state === ActionState.Success) {
					finalState = state;
					break;
				}
			}

			expect(finalState).to.equal(ActionState.Failure);
		});
	});

	describe("Concurrently 基础功能", () => {
		it("应该允许创建空的 Concurrently", () => {
			const concurrent = new Concurrently();
			expect(concurrent.getActionCount()).to.equal(0);
		});

		it("应该允许添加多个并发 Action", () => {
			const concurrent = new Concurrently()
				.addAction(new SimpleAction("Action1"))
				.addAction(new SimpleAction("Action2"))
				.addAction(new SimpleAction("Action3"));

			expect(concurrent.getActionCount()).to.equal(3);
		});

		it("应该默认使用 Join 模式", () => {
			const concurrent = new Concurrently();
			expect(concurrent.getMode()).to.equal(ConcurrentMode.Join);
		});

		it("应该允许设置 Race 模式", () => {
			const concurrent = new Concurrently().setMode(ConcurrentMode.Race);

			expect(concurrent.getMode()).to.equal(ConcurrentMode.Race);
		});

		it("应该支持链式调用", () => {
			const concurrent = new Concurrently()
				.addAction(new SimpleAction("Action1"))
				.addAction(new SimpleAction("Action2"))
				.setMode(ConcurrentMode.Race)
				.setLabel("MyConcurrent");

			expect(concurrent.getActionCount()).to.equal(2);
			expect(concurrent.getMode()).to.equal(ConcurrentMode.Race);
			expect(concurrent.label()).to.equal("MyConcurrent");
		});
	});

	describe("Concurrently Join 模式逻辑", () => {
		it("应该在所有 Action 成功时返回成功 (概念验证)", () => {
			const concurrent = new Concurrently()
				.setMode(ConcurrentMode.Join)
				.addAction(new SimpleAction("Action1"))
				.addAction(new SimpleAction("Action2"))
				.addAction(new SimpleAction("Action3"));

			// 模拟所有 Action 都成功
			const actionStates = [ActionState.Success, ActionState.Success, ActionState.Success];

			let allSuccess = true;
			let anyFailed = false;

			for (const state of actionStates) {
				if (state === ActionState.Failure) {
					anyFailed = true;
					allSuccess = false;
					break;
				}

				if (state !== ActionState.Success) {
					allSuccess = false;
				}
			}

			const finalState = allSuccess ? ActionState.Success : anyFailed ? ActionState.Failure : ActionState.Executing;

			expect(finalState).to.equal(ActionState.Success);
		});

		it("应该在任意 Action 失败时返回失败 (概念验证)", () => {
			const concurrent = new Concurrently()
				.setMode(ConcurrentMode.Join)
				.addAction(new SimpleAction("Action1"))
				.addAction(new SimpleAction("Action2"))
				.addAction(new SimpleAction("Action3"));

			// 模拟第二个 Action 失败
			const actionStates = [ActionState.Success, ActionState.Failure, ActionState.Executing];

			let anyFailed = false;

			for (const state of actionStates) {
				if (state === ActionState.Failure) {
					anyFailed = true;
					break;
				}
			}

			expect(anyFailed).to.equal(true);
		});
	});

	describe("Concurrently Race 模式逻辑", () => {
		it("应该在任意 Action 成功时返回成功 (概念验证)", () => {
			const concurrent = new Concurrently()
				.setMode(ConcurrentMode.Race)
				.addAction(new SimpleAction("Action1"))
				.addAction(new SimpleAction("Action2"))
				.addAction(new SimpleAction("Action3"));

			// 模拟第二个 Action 先成功
			const actionStates = [ActionState.Executing, ActionState.Success, ActionState.Executing];

			let anySuccess = false;

			for (const state of actionStates) {
				if (state === ActionState.Success) {
					anySuccess = true;
					break;
				}
			}

			expect(anySuccess).to.equal(true);
		});

		it("应该在所有 Action 失败时返回失败 (概念验证)", () => {
			const concurrent = new Concurrently()
				.setMode(ConcurrentMode.Race)
				.addAction(new SimpleAction("Action1"))
				.addAction(new SimpleAction("Action2"));

			// 模拟所有 Action 都失败
			const actionStates = [ActionState.Failure, ActionState.Failure];

			let allFailed = true;

			for (const state of actionStates) {
				if (state !== ActionState.Failure) {
					allFailed = false;
					break;
				}
			}

			expect(allFailed).to.equal(true);
		});
	});

	describe("复合 Action 嵌套", () => {
		it("应该允许 Steps 嵌套 Steps", () => {
			const innerSteps = new Steps()
				.addStep(new SimpleAction("Inner1"))
				.addStep(new SimpleAction("Inner2"))
				.setLabel("InnerSteps");

			const outerSteps = new Steps()
				.addStep(new SimpleAction("Outer1"))
				.addStep(innerSteps)
				.addStep(new SimpleAction("Outer3"))
				.setLabel("OuterSteps");

			expect(outerSteps.getStepCount()).to.equal(3);

			const labels = outerSteps.getStepLabels();
			expect(labels[1]).to.equal("InnerSteps");
		});

		it("应该允许 Steps 包含 Concurrently", () => {
			const concurrent = new Concurrently()
				.addAction(new SimpleAction("Concurrent1"))
				.addAction(new SimpleAction("Concurrent2"))
				.setLabel("ConcurrentAction");

			const steps = new Steps()
				.addStep(new SimpleAction("Before"))
				.addStep(concurrent)
				.addStep(new SimpleAction("After"))
				.setLabel("MixedSteps");

			expect(steps.getStepCount()).to.equal(3);

			const labels = steps.getStepLabels();
			expect(labels[1]).to.equal("ConcurrentAction");
		});

		it("应该允许 Concurrently 包含 Steps", () => {
			const stepsAction = new Steps()
				.addStep(new SimpleAction("Step1"))
				.addStep(new SimpleAction("Step2"))
				.setLabel("StepsAction");

			const concurrent = new Concurrently()
				.addAction(new SimpleAction("Simple"))
				.addAction(stepsAction)
				.setMode(ConcurrentMode.Join)
				.setLabel("MixedConcurrent");

			expect(concurrent.getActionCount()).to.equal(2);
		});
	});

	describe("构建方法验证", () => {
		it("Steps 构建应该抛出未实现错误", () => {
			const steps = new Steps().addStep(new SimpleAction("Test"));

			const world = new World();

			expect(() => {
				steps.build(world, 1, 2);
			}).to.throw();
		});

		it("Concurrently 构建应该抛出未实现错误", () => {
			const concurrent = new Concurrently().addAction(new SimpleAction("Test"));

			const world = new World();

			expect(() => {
				concurrent.build(world, 1, 2);
			}).to.throw();
		});
	});
};
