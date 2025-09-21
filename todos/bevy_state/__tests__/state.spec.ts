/**
 * State 资源单元测试
 */

import { World } from "@rbxts/matter";
import { State, NextState } from "../state";

export = () => {
	describe("State", () => {
	let world: World;

	beforeEach(() => {
		world = new World();
	});

	describe("基本功能", () => {
		it("应该正确初始化状态", () => {
			const state = new State<"Menu" | "Playing">("Menu");
			expect(state.current).to.equal("Menu");
			expect(state.previous).to.equal(undefined);
			expect(state.isTransitioning).to.equal(false);
		});

		it("应该正确转换状态", () => {
			const state = new State<"Menu" | "Playing">("Menu");
			state._transition("Playing", world);

			expect(state.current).to.equal("Playing");
			expect(state.previous).to.equal("Menu");
		});

		it("应该正确检查状态", () => {
			const state = new State<"Menu" | "Playing" | "Paused">("Menu");

			expect(state.isIn("Menu")).to.equal(true);
			expect(state.isIn("Playing")).to.equal(false);

			state._transition("Playing", world);

			expect(state.isIn("Menu")).to.equal(false);
			expect(state.isIn("Playing")).to.equal(true);
			expect(state.justEntered("Playing")).to.equal(true);
			expect(state.justExited("Menu")).to.equal(true);
		});
	});

	describe("状态历史", () => {
		it("应该记录状态历史", () => {
			const state = new State<"A" | "B" | "C">("A");

			state._transition("B", world);
			state._transition("C", world);

			const history = state.history;
			expect(history.size()).to.equal(3);
			expect(history[0].state).to.equal("A");
			expect(history[1].state).to.equal("B");
			expect(history[2].state).to.equal("C");
		});

		it("应该限制历史记录大小", () => {
			const state = new State<string>("S0");

			// 创建超过最大限制的历史记录
			for (let i = 1; i <= 110; i++) {
				state._transition(`S${i}`, world);
			}

			const history = state.history;
			expect(history.size() <= 100).to.equal(true);
		});

		it("应该正确计算状态持续时间", () => {
			const state = new State<"A" | "B">("A");

			// 等待一小段时间
			task.wait(0.1);

			const duration = state.getCurrentStateDuration();
			expect(duration > 0).to.equal(true);
			expect(duration < 1).to.equal(true);
		});
	});

	describe("状态验证", () => {
		it("应该验证状态转换", () => {
			const state = new State<"A" | "B">("A");

			state.addValidator("B", (s, w) => true);
			state._transition("B", world);
			expect(state.current).to.equal("B");

			state.addValidator("A", (s, w) => false);
			state._transition("A", world);
			expect(state.current).to.equal("B"); // 验证失败，保持在 B
		});

		it("应该移除验证器", () => {
			const state = new State<"A" | "B">("A");

			state.addValidator("B", (s, w) => false);
			state._transition("B", world);
			expect(state.current).to.equal("A"); // 验证失败

			state.removeValidator("B");
			state._transition("B", world);
			expect(state.current).to.equal("B"); // 验证已移除
		});
	});

	describe("状态回滚", () => {
		it("应该能够回滚到上一个状态", () => {
			const state = new State<"A" | "B" | "C">("A");

			state._transition("B", world);
			state._transition("C", world);

			const success = state.rollback(world);
			expect(success).to.equal(true);
			expect(state.current).to.equal("B");
			expect(state.previous).to.equal("C");
		});

		it("初始状态无法回滚", () => {
			const state = new State<"A">("A");

			const success = state.rollback(world);
			expect(success).to.equal(false);
			expect(state.current).to.equal("A");
		});
	});
});

describe("NextState", () => {
	it("应该正确设置和消费下一个状态", () => {
		const nextState = new NextState<"A" | "B">();

		expect(nextState.pending).to.equal(undefined);

		nextState.set("B");
		expect(nextState.pending).to.equal("B");
		expect(nextState.force).to.equal(false);

		const consumed = nextState.consume();
		expect(consumed).to.equal("B");
		expect(nextState.pending).to.equal(undefined);
	});

	it("应该支持强制转换", () => {
		const nextState = new NextState<"A" | "B">();

		nextState.set("B", true);
		expect(nextState.pending).to.equal("B");
		expect(nextState.force).to.equal(true);
	});

	it("应该能够清除排队状态", () => {
		const nextState = new NextState<"A" | "B">();

		nextState.set("B");
		nextState.clear();

		expect(nextState.pending).to.equal(undefined);
		expect(nextState.force).to.equal(false);
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

		expect(state.current).to.equal("Playing");
		expect(nextState.pending).to.equal(undefined);
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
		expect(state.current).to.equal("B");
		expect(state.previous).to.equal("A");
	});
});

describe("状态持续时间追踪", () => {
	it("应该追踪每个状态的总持续时间", () => {
		const state = new State<"A" | "B" | "C">("A");

		task.wait(0.05);
		state._transition("B", world);
		task.wait(0.05);
		state._transition("C", world);
		task.wait(0.05);
		state._transition("A", world);
		task.wait(0.05);

		const durationA = state.getStateDuration("A");
		const durationB = state.getStateDuration("B");
		const durationC = state.getStateDuration("C");

		expect(durationA > 0.08).to.equal(true); // 两次在 A 状态
		expect(durationB > 0.04).to.equal(true);
		expect(durationB < 0.06).to.equal(true);
		expect(durationC > 0.04).to.equal(true);
		expect(durationC < 0.06).to.equal(true);
	});

	it("应该正确处理当前状态的持续时间", () => {
		const state = new State<"A" | "B">("A");

		task.wait(0.1);

		const currentDuration = state.getCurrentStateDuration();
		const totalDuration = state.getStateDuration("A");

		expect(math.abs(currentDuration - totalDuration) < 0.01).to.equal(true);
		expect(currentDuration > 0.09).to.equal(true);
		expect(currentDuration < 0.11).to.equal(true);
	});
});

describe("状态历史管理", () => {
	it("应该能够清除历史记录", () => {
		const state = new State<"A" | "B" | "C">("A");

		state._transition("B", world);
		state._transition("C", world);

		expect(state.history.size()).to.equal(3);

		state.clearHistory();

		expect(state.history.size()).to.equal(1);
		expect(state.history[0].state).to.equal("C");
	});

	it("应该保留退出时间戳", () => {
		const state = new State<"A" | "B">("A");

		const startTime = os.clock();
		task.wait(0.05);
		state._transition("B", world);

		const history = state.history;
		const firstEntry = history[0];

		expect(firstEntry.state).to.equal("A");
		expect(math.abs(firstEntry.enteredAt - startTime) < 0.1).to.equal(true);
		expect(firstEntry.exitedAt !== undefined).to.equal(true);
		expect(firstEntry.exitedAt! - firstEntry.enteredAt > 0.04).to.equal(true);
	});
	});
};