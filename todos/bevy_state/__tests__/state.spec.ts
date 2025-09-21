/**
 * State 资源单元测试
 */

import { World } from "@rbxts/matter";
import { State, NextState } from "../state";

describe("State", () => {
	let world: World;

	beforeEach(() => {
		world = new World();
	});

	describe("基本功能", () => {
		it("应该正确初始化状态", () => {
			const state = new State<"Menu" | "Playing">("Menu");
			expect(state.current).toBe("Menu");
			expect(state.previous).toBeUndefined();
			expect(state.isTransitioning).toBe(false);
		});

		it("应该正确转换状态", () => {
			const state = new State<"Menu" | "Playing">("Menu");
			state._transition("Playing", world);

			expect(state.current).toBe("Playing");
			expect(state.previous).toBe("Menu");
		});

		it("应该正确检查状态", () => {
			const state = new State<"Menu" | "Playing" | "Paused">("Menu");

			expect(state.isIn("Menu")).toBe(true);
			expect(state.isIn("Playing")).toBe(false);

			state._transition("Playing", world);

			expect(state.isIn("Menu")).toBe(false);
			expect(state.isIn("Playing")).toBe(true);
			expect(state.justEntered("Playing")).toBe(true);
			expect(state.justExited("Menu")).toBe(true);
		});
	});

	describe("状态历史", () => {
		it("应该记录状态历史", () => {
			const state = new State<"A" | "B" | "C">("A");

			state._transition("B", world);
			state._transition("C", world);

			const history = state.history;
			expect(history.size()).toBe(3);
			expect(history[0].state).toBe("A");
			expect(history[1].state).toBe("B");
			expect(history[2].state).toBe("C");
		});

		it("应该限制历史记录大小", () => {
			const state = new State<string>("S0");

			// 创建超过最大限制的历史记录
			for (let i = 1; i <= 110; i++) {
				state._transition(`S${i}`, world);
			}

			const history = state.history;
			expect(history.size()).toBeLessThanOrEqual(100);
		});

		it("应该正确计算状态持续时间", () => {
			const state = new State<"A" | "B">("A");

			// 等待一小段时间
			wait(0.1);

			const duration = state.getCurrentStateDuration();
			expect(duration).toBeGreaterThan(0);
			expect(duration).toBeLessThan(1);
		});
	});

	describe("状态验证", () => {
		it("应该验证状态转换", () => {
			const state = new State<"A" | "B">("A");

			state.addValidator("B", (s, w) => true);
			state._transition("B", world);
			expect(state.current).toBe("B");

			state.addValidator("A", (s, w) => false);
			state._transition("A", world);
			expect(state.current).toBe("B"); // 验证失败，保持在 B
		});

		it("应该移除验证器", () => {
			const state = new State<"A" | "B">("A");

			state.addValidator("B", (s, w) => false);
			state._transition("B", world);
			expect(state.current).toBe("A"); // 验证失败

			state.removeValidator("B");
			state._transition("B", world);
			expect(state.current).toBe("B"); // 验证已移除
		});
	});

	describe("状态回滚", () => {
		it("应该能够回滚到上一个状态", () => {
			const state = new State<"A" | "B" | "C">("A");

			state._transition("B", world);
			state._transition("C", world);

			const success = state.rollback(world);
			expect(success).toBe(true);
			expect(state.current).toBe("B");
			expect(state.previous).toBe("C");
		});

		it("初始状态无法回滚", () => {
			const state = new State<"A">("A");

			const success = state.rollback(world);
			expect(success).toBe(false);
			expect(state.current).toBe("A");
		});
	});
});

describe("NextState", () => {
	it("应该正确设置和消费下一个状态", () => {
		const nextState = new NextState<"A" | "B">();

		expect(nextState.pending).toBeUndefined();

		nextState.set("B");
		expect(nextState.pending).toBe("B");
		expect(nextState.force).toBe(false);

		const consumed = nextState.consume();
		expect(consumed).toBe("B");
		expect(nextState.pending).toBeUndefined();
	});

	it("应该支持强制转换", () => {
		const nextState = new NextState<"A" | "B">();

		nextState.set("B", true);
		expect(nextState.pending).toBe("B");
		expect(nextState.force).toBe(true);
	});

	it("应该能够清除排队状态", () => {
		const nextState = new NextState<"A" | "B">();

		nextState.set("B");
		nextState.clear();

		expect(nextState.pending).toBeUndefined();
		expect(nextState.force).toBe(false);
	});
});

describe("State 与 NextState 集成", () => {
	it("应该通过 NextState 触发状态转换", () => {
		const state = new State<"Menu" | "Playing">("Menu");
		const nextState = new NextState<"Menu" | "Playing">();

		nextState.set("Playing");

		const pending = nextState.consume();
		if (pending) {
			state._transition(pending, world);
		}

		expect(state.current).toBe("Playing");
		expect(nextState.pending).toBeUndefined();
	});

	it("应该防止并发转换", () => {
		const state = new State<"A" | "B" | "C">("A");

		// 模拟并发转换尝试
		let transitionCount = 0;
		const originalTransition = state._transition.bind(state);

		(state as any)._transition = function(this: State<"A" | "B" | "C">, nextState: "A" | "B" | "C", world: World) {
			transitionCount++;
			if (transitionCount === 1) {
				// 第一次转换时尝试再次转换
				originalTransition.call(this, "C", world);
			}
			originalTransition.call(this, nextState, world);
		};

		state._transition("B", world);

		// 应该只执行了到 B 的转换
		expect(state.current).toBe("B");
		expect(state.previous).toBe("A");
	});
});

describe("状态持续时间追踪", () => {
	it("应该追踪每个状态的总持续时间", () => {
		const state = new State<"A" | "B" | "C">("A");

		wait(0.05);
		state._transition("B", world);
		wait(0.05);
		state._transition("C", world);
		wait(0.05);
		state._transition("A", world);
		wait(0.05);

		const durationA = state.getStateDuration("A");
		const durationB = state.getStateDuration("B");
		const durationC = state.getStateDuration("C");

		expect(durationA).toBeGreaterThan(0.08); // 两次在 A 状态
		expect(durationB).toBeGreaterThan(0.04);
		expect(durationB).toBeLessThan(0.06);
		expect(durationC).toBeGreaterThan(0.04);
		expect(durationC).toBeLessThan(0.06);
	});

	it("应该正确处理当前状态的持续时间", () => {
		const state = new State<"A" | "B">("A");

		wait(0.1);

		const currentDuration = state.getCurrentStateDuration();
		const totalDuration = state.getStateDuration("A");

		expect(currentDuration).toBeCloseTo(totalDuration, 2);
		expect(currentDuration).toBeGreaterThan(0.09);
		expect(currentDuration).toBeLessThan(0.11);
	});
});

describe("状态历史管理", () => {
	it("应该能够清除历史记录", () => {
		const state = new State<"A" | "B" | "C">("A");

		state._transition("B", world);
		state._transition("C", world);

		expect(state.history.size()).toBe(3);

		state.clearHistory();

		expect(state.history.size()).toBe(1);
		expect(state.history[0].state).toBe("C");
	});

	it("应该保留退出时间戳", () => {
		const state = new State<"A" | "B">("A");

		const startTime = os.clock();
		wait(0.05);
		state._transition("B", world);

		const history = state.history;
		const firstEntry = history[0];

		expect(firstEntry.state).toBe("A");
		expect(firstEntry.enteredAt).toBeCloseTo(startTime, 1);
		expect(firstEntry.exitedAt).toBeDefined();
		expect(firstEntry.exitedAt! - firstEntry.enteredAt).toBeGreaterThan(0.04);
	});
});