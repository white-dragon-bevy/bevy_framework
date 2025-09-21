/**
 * 状态转换系统单元测试
 */

import { World } from "@rbxts/matter";
import { State } from "../state";
import {
	StateTransition,
	StateTransitionEvent,
	TransitionScheduler,
	TransitionValidator,
	TransitionAnimator,
} from "../transitions";
import { createMockFn } from "./test-utils";

export = () => {
	describe("StateTransition", () => {
	it("应该创建状态转换", () => {
		const transition = new StateTransition("Idle", "Walking", "User input");

		expect(transition.from).to.equal("Idle");
		expect(transition.to).to.equal("Walking");
		expect(transition.reason).to.equal("User input");
		expect(transition.timestamp).to.be.near(os.clock(), 1);
	});

	it("应该识别同状态转换", () => {
		const identity = new StateTransition("Idle", "Idle");
		const different = new StateTransition("Idle", "Walking");

		expect(identity.isIdentity()).to.equal(true);
		expect(different.isIdentity()).to.equal(false);
	});

	it("应该生成转换键", () => {
		const transition = new StateTransition("Idle", "Walking");
		expect(transition.getKey()).to.equal("Idle->Walking");
	});

	it("应该创建反向转换", () => {
		const transition = new StateTransition("Idle", "Walking", "Forward");
		const reverse = transition.reverse();

		expect(reverse.from).to.equal("Walking");
		expect(reverse.to).to.equal("Idle");
		expect(reverse.reason:find("Reverse")).to.be.ok();
	});
});

describe("StateTransitionEvent", () => {
	it("应该创建转换事件", () => {
		const event = new StateTransitionEvent("Idle", "Walking");

		expect(event.from).to.equal("Idle");
		expect(event.to).to.equal("Walking");
		expect(event.cancelled).to.equal(false);
	});

	it("应该支持取消转换", () => {
		const event = new StateTransitionEvent("Idle", "Walking");

		event.cancel();
		expect(event.cancelled).to.equal(true);
	});

	it("应该转换为组件", () => {
		const event = new StateTransitionEvent("Idle", "Walking");
		const component = event.toComponent();

		expect(component.StateTransitionEvent).to.equal(true);
		expect(component.from).to.equal("Idle");
		expect(component.to).to.equal("Walking");
		expect(component.cancelled).to.equal(false);
	});
});

describe("TransitionScheduler", () => {
	let scheduler: TransitionScheduler<"A" | "B" | "C">;
	let world: World;
	let state: State<"A" | "B" | "C">;

	beforeEach(() => {
		scheduler = new TransitionScheduler();
		world = new World();
		state = new State("A");
	});

	it("应该管理转换队列", () => {
		const t1 = new StateTransition("A", "B");
		const t2 = new StateTransition("B", "C");

		scheduler.enqueue(t1);
		scheduler.enqueue(t2);

		expect(scheduler.queueSize).to.equal(2);
		expect(scheduler.hasPendingTransitions()).to.equal(true);
	});

	it("应该按顺序处理转换", () => {
		const t1 = new StateTransition("A", "B");
		const t2 = new StateTransition("B", "C");

		scheduler.enqueue(t1);
		scheduler.enqueue(t2);

		const first = scheduler.processNext(world, state);
		expect(first).to.equal(t1);

		const second = scheduler.processNext(world, state);
		expect(second).to.equal(t2);

		expect(scheduler.queueSize).to.equal(0);
	});

	it("应该支持查看下一个转换", () => {
		const t1 = new StateTransition("A", "B");
		scheduler.enqueue(t1);

		const peeked = scheduler.peekNext();
		expect(peeked).to.equal(t1);
		expect(scheduler.queueSize).to.equal(1); // 不应该移除
	});

	it("应该记录转换历史", () => {
		const t1 = new StateTransition("A", "B");
		const t2 = new StateTransition("B", "C");

		scheduler.enqueue(t1);
		scheduler.enqueue(t2);

		scheduler.processNext(world, state);
		scheduler.processNext(world, state);

		const history = scheduler.getHistory();
		expect(table.find(history, t1)).to.be.ok();
		expect(table.find(history, t2)).to.be.ok();
	});

	it("应该清空队列", () => {
		scheduler.enqueue(new StateTransition("A", "B"));
		scheduler.enqueue(new StateTransition("B", "C"));

		scheduler.clearQueue();
		expect(scheduler.queueSize).to.equal(0);
		expect(scheduler.hasPendingTransitions()).to.equal(false);
	});

	describe("拦截器", () => {
		it("应该支持转换拦截器", () => {
			const interceptorMock = createMockFn(false);
			const interceptor = interceptorMock.fn; // 拒绝所有转换
			scheduler.addInterceptor(interceptor);

			const transition = new StateTransition("A", "B");
			scheduler.enqueue(transition);

			const processed = scheduler.processNext(world, state);

			expect(interceptorMock.wasCalledWith(transition)).to.equal(true);
			expect(processed).to.equal(undefined);
		});

		it("应该能够移除拦截器", () => {
			const interceptorMock = createMockFn(false);
			const interceptor = interceptorMock.fn;
			const removeInterceptor = scheduler.addInterceptor(interceptor);

			removeInterceptor();

			const transition = new StateTransition("A", "B");
			scheduler.enqueue(transition);

			const processed = scheduler.processNext(world, state);
			expect(processed).to.equal(transition);
		});
	});
});

describe("TransitionValidator", () => {
	let validator: TransitionValidator<"A" | "B" | "C" | "D">;

	beforeEach(() => {
		validator = new TransitionValidator();
	});

	it("应该验证允许的转换", () => {
		validator.allow("A", "B");
		validator.allow("B", "C");

		expect(validator.isValid("A", "B")).to.equal(true);
		expect(validator.isValid("B", "C")).to.equal(true);
		expect(validator.isValid("A", "C")).to.equal(false); // 不在允许列表
		expect(validator.isValid("C", "D")).to.equal(true); // 没有限制
	});

	it("应该验证禁止的转换", () => {
		validator.forbid("A", "C");
		validator.forbid("B", "D");

		expect(validator.isValid("A", "C")).to.equal(false);
		expect(validator.isValid("B", "D")).to.equal(false);
		expect(validator.isValid("A", "B")).to.equal(true); // 不在禁止列表
	});

	it("禁止规则优先于允许规则", () => {
		validator.allow("A", "B");
		validator.forbid("A", "B");

		expect(validator.isValid("A", "B")).to.equal(false);
	});

	it("应该批量添加规则", () => {
		validator.allowMany([
			["A", "B"],
			["B", "C"],
			["C", "D"],
		]);

		expect(validator.isValid("A", "B")).to.equal(true);
		expect(validator.isValid("B", "C")).to.equal(true);
		expect(validator.isValid("C", "D")).to.equal(true);

		validator.forbidMany([
			["B", "C"],
			["C", "D"],
		]);

		expect(validator.isValid("B", "C")).to.equal(false);
		expect(validator.isValid("C", "D")).to.equal(false);
	});

	it("应该获取允许的转换", () => {
		validator.allow("A", "B");
		validator.allow("A", "C");
		validator.allow("B", "C");

		const fromA = validator.getAllowedTransitions("A");
		expect(table.find(fromA, "B")).to.be.ok();
		expect(table.find(fromA, "C")).to.be.ok();

		const fromB = validator.getAllowedTransitions("B");
		expect(table.find(fromB, "C")).to.be.ok();
		expect(fromB.size()).to.equal(1);
	});

	it("应该清除所有规则", () => {
		validator.allow("A", "B");
		validator.forbid("C", "D");

		validator.clear();

		expect(validator.isValid("A", "B")).to.equal(true); // 无限制
		expect(validator.isValid("C", "D")).to.equal(true); // 无限制
	});
});

describe("TransitionAnimator", () => {
	let animator: TransitionAnimator<"A" | "B" | "C">;

	beforeEach(() => {
		animator = new TransitionAnimator();
	});

	it("应该注册和启动转换动画", () => {
		const onStartMock = createMockFn();
		const onUpdateMock = createMockFn();
		const onCompleteMock = createMockFn();

		animator.register("A", "B", {
			duration: 1,
			onStart: onStartMock.fn,
			onUpdate: onUpdateMock.fn,
			onComplete: onCompleteMock.fn,
		});

		animator.startTransition("A", "B");

		expect(onStartMock.wasCalledWith("A", "B")).to.equal(true);
		expect(animator.isAnimating()).to.equal(true);
	});

	it("应该更新动画进度", () => {
		const onUpdateMock = createMockFn();

		animator.register("A", "B", {
			duration: 1,
			onUpdate: onUpdateMock.fn,
		});

		animator.startTransition("A", "B");
		animator.update(0.5);

		expect(onUpdateMock.wasCalled()).to.equal(true);
		const progress = animator.getProgress();
		expect(progress > 0).to.equal(true);
		expect(progress <= 0.5).to.equal(true);
	});

	it("应该完成动画", () => {
		const onCompleteMock = createMockFn();

		animator.register("A", "B", {
			duration: 0.1,
			onComplete: onCompleteMock.fn,
		});

		animator.startTransition("A", "B");
		animator.update(0.2); // 超过持续时间

		expect(onCompleteMock.wasCalled()).to.equal(true);
		expect(animator.isAnimating()).to.equal(false);
	});

	it("应该应用缓动函数", () => {
		const onUpdate = createMockFn().fn;
		const easing = (t: number) => t * t; // 二次缓动

		animator.register("A", "B", {
			duration: 1,
			easing,
			onUpdate,
		});

		animator.startTransition("A", "B");

		// 模拟 50% 时间经过
		task.wait(0.5);
		animator.update(0);

		// 由于二次缓动，进度应该约为 0.25
		expect(animator.getProgress() < 0.3).to.equal(true);
	});

	it("应该停止动画", () => {
		animator.register("A", "B", {
			duration: 1,
			onComplete: createMockFn().fn,
		});

		animator.startTransition("A", "B");
		animator.stopAnimation();

		expect(animator.isAnimating()).to.equal(false);
		expect(animator.getProgress()).to.equal(0);
	});

	it("应该忽略未注册的转换", () => {
		animator.startTransition("A", "C");
		expect(animator.isAnimating()).to.equal(false);
	});
	});
};