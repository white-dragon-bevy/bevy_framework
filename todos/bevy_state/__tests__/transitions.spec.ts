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

describe("StateTransition", () => {
	it("应该创建状态转换", () => {
		const transition = new StateTransition("Idle", "Walking", "User input");

		expect(transition.from).toBe("Idle");
		expect(transition.to).toBe("Walking");
		expect(transition.reason).toBe("User input");
		expect(transition.timestamp).toBeCloseTo(os.clock(), 1);
	});

	it("应该识别同状态转换", () => {
		const identity = new StateTransition("Idle", "Idle");
		const different = new StateTransition("Idle", "Walking");

		expect(identity.isIdentity()).toBe(true);
		expect(different.isIdentity()).toBe(false);
	});

	it("应该生成转换键", () => {
		const transition = new StateTransition("Idle", "Walking");
		expect(transition.getKey()).toBe("Idle->Walking");
	});

	it("应该创建反向转换", () => {
		const transition = new StateTransition("Idle", "Walking", "Forward");
		const reverse = transition.reverse();

		expect(reverse.from).toBe("Walking");
		expect(reverse.to).toBe("Idle");
		expect(reverse.reason).toContain("Reverse");
	});
});

describe("StateTransitionEvent", () => {
	it("应该创建转换事件", () => {
		const event = new StateTransitionEvent("Idle", "Walking");

		expect(event.from).toBe("Idle");
		expect(event.to).toBe("Walking");
		expect(event.cancelled).toBe(false);
	});

	it("应该支持取消转换", () => {
		const event = new StateTransitionEvent("Idle", "Walking");

		event.cancel();
		expect(event.cancelled).toBe(true);
	});

	it("应该转换为组件", () => {
		const event = new StateTransitionEvent("Idle", "Walking");
		const component = event.toComponent();

		expect(component.StateTransitionEvent).toBe(true);
		expect(component.from).toBe("Idle");
		expect(component.to).toBe("Walking");
		expect(component.cancelled).toBe(false);
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

		expect(scheduler.queueSize).toBe(2);
		expect(scheduler.hasPendingTransitions()).toBe(true);
	});

	it("应该按顺序处理转换", () => {
		const t1 = new StateTransition("A", "B");
		const t2 = new StateTransition("B", "C");

		scheduler.enqueue(t1);
		scheduler.enqueue(t2);

		const first = scheduler.processNext(world, state);
		expect(first).toBe(t1);

		const second = scheduler.processNext(world, state);
		expect(second).toBe(t2);

		expect(scheduler.queueSize).toBe(0);
	});

	it("应该支持查看下一个转换", () => {
		const t1 = new StateTransition("A", "B");
		scheduler.enqueue(t1);

		const peeked = scheduler.peekNext();
		expect(peeked).toBe(t1);
		expect(scheduler.queueSize).toBe(1); // 不应该移除
	});

	it("应该记录转换历史", () => {
		const t1 = new StateTransition("A", "B");
		const t2 = new StateTransition("B", "C");

		scheduler.enqueue(t1);
		scheduler.enqueue(t2);

		scheduler.processNext(world, state);
		scheduler.processNext(world, state);

		const history = scheduler.getHistory();
		expect(history).toContain(t1);
		expect(history).toContain(t2);
	});

	it("应该清空队列", () => {
		scheduler.enqueue(new StateTransition("A", "B"));
		scheduler.enqueue(new StateTransition("B", "C"));

		scheduler.clearQueue();
		expect(scheduler.queueSize).toBe(0);
		expect(scheduler.hasPendingTransitions()).toBe(false);
	});

	describe("拦截器", () => {
		it("应该支持转换拦截器", () => {
			const interceptor = jest.fn(() => false); // 拒绝所有转换
			scheduler.addInterceptor(interceptor);

			const transition = new StateTransition("A", "B");
			scheduler.enqueue(transition);

			const processed = scheduler.processNext(world, state);

			expect(interceptor).toHaveBeenCalledWith(transition);
			expect(processed).toBeUndefined();
		});

		it("应该能够移除拦截器", () => {
			const interceptor = jest.fn(() => false);
			const removeInterceptor = scheduler.addInterceptor(interceptor);

			removeInterceptor();

			const transition = new StateTransition("A", "B");
			scheduler.enqueue(transition);

			const processed = scheduler.processNext(world, state);
			expect(processed).toBe(transition);
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

		expect(validator.isValid("A", "B")).toBe(true);
		expect(validator.isValid("B", "C")).toBe(true);
		expect(validator.isValid("A", "C")).toBe(false); // 不在允许列表
		expect(validator.isValid("C", "D")).toBe(true); // 没有限制
	});

	it("应该验证禁止的转换", () => {
		validator.forbid("A", "C");
		validator.forbid("B", "D");

		expect(validator.isValid("A", "C")).toBe(false);
		expect(validator.isValid("B", "D")).toBe(false);
		expect(validator.isValid("A", "B")).toBe(true); // 不在禁止列表
	});

	it("禁止规则优先于允许规则", () => {
		validator.allow("A", "B");
		validator.forbid("A", "B");

		expect(validator.isValid("A", "B")).toBe(false);
	});

	it("应该批量添加规则", () => {
		validator.allowMany([
			["A", "B"],
			["B", "C"],
			["C", "D"],
		]);

		expect(validator.isValid("A", "B")).toBe(true);
		expect(validator.isValid("B", "C")).toBe(true);
		expect(validator.isValid("C", "D")).toBe(true);

		validator.forbidMany([
			["B", "C"],
			["C", "D"],
		]);

		expect(validator.isValid("B", "C")).toBe(false);
		expect(validator.isValid("C", "D")).toBe(false);
	});

	it("应该获取允许的转换", () => {
		validator.allow("A", "B");
		validator.allow("A", "C");
		validator.allow("B", "C");

		const fromA = validator.getAllowedTransitions("A");
		expect(fromA).toContain("B");
		expect(fromA).toContain("C");

		const fromB = validator.getAllowedTransitions("B");
		expect(fromB).toContain("C");
		expect(fromB.size()).toBe(1);
	});

	it("应该清除所有规则", () => {
		validator.allow("A", "B");
		validator.forbid("C", "D");

		validator.clear();

		expect(validator.isValid("A", "B")).toBe(true); // 无限制
		expect(validator.isValid("C", "D")).toBe(true); // 无限制
	});
});

describe("TransitionAnimator", () => {
	let animator: TransitionAnimator<"A" | "B" | "C">;

	beforeEach(() => {
		animator = new TransitionAnimator();
	});

	it("应该注册和启动转换动画", () => {
		const onStart = jest.fn();
		const onUpdate = jest.fn();
		const onComplete = jest.fn();

		animator.register("A", "B", {
			duration: 1,
			onStart,
			onUpdate,
			onComplete,
		});

		animator.startTransition("A", "B");

		expect(onStart).toHaveBeenCalledWith("A", "B");
		expect(animator.isAnimating()).toBe(true);
	});

	it("应该更新动画进度", () => {
		const onUpdate = jest.fn();

		animator.register("A", "B", {
			duration: 1,
			onUpdate,
		});

		animator.startTransition("A", "B");
		animator.update(0.5);

		expect(onUpdate).toHaveBeenCalled();
		const progress = animator.getProgress();
		expect(progress).toBeGreaterThan(0);
		expect(progress).toBeLessThanOrEqual(0.5);
	});

	it("应该完成动画", () => {
		const onComplete = jest.fn();

		animator.register("A", "B", {
			duration: 0.1,
			onComplete,
		});

		animator.startTransition("A", "B");
		animator.update(0.2); // 超过持续时间

		expect(onComplete).toHaveBeenCalled();
		expect(animator.isAnimating()).toBe(false);
	});

	it("应该应用缓动函数", () => {
		const onUpdate = jest.fn();
		const easing = (t: number) => t * t; // 二次缓动

		animator.register("A", "B", {
			duration: 1,
			easing,
			onUpdate,
		});

		animator.startTransition("A", "B");

		// 模拟 50% 时间经过
		wait(0.5);
		animator.update(0);

		// 由于二次缓动，进度应该约为 0.25
		expect(animator.getProgress()).toBeLessThan(0.3);
	});

	it("应该停止动画", () => {
		animator.register("A", "B", {
			duration: 1,
			onComplete: jest.fn(),
		});

		animator.startTransition("A", "B");
		animator.stopAnimation();

		expect(animator.isAnimating()).toBe(false);
		expect(animator.getProgress()).toBe(0);
	});

	it("应该忽略未注册的转换", () => {
		animator.startTransition("A", "C");
		expect(animator.isAnimating()).toBe(false);
	});
});