/**
 * StateManager 单元测试
 */

import { World } from "@rbxts/matter";
import { State, NextState } from "../state";
import { StateManager } from "../state-manager";
import type { StateDefinition } from "../types";
import { createMockFn } from "./test-utils";

export = () => {
	describe("StateManager", () => {
	let world: World;
	let manager: StateManager<"Idle" | "Walking" | "Running" | "Jumping">;

	beforeEach(() => {
		world = new World();
		manager = new StateManager();

		// 在 world 中添加必要的资源
		world.insert("State", new State<"Idle" | "Walking" | "Running" | "Jumping">("Idle"));
		world.insert("NextState", new NextState<"Idle" | "Walking" | "Running" | "Jumping">());
	});

	describe("状态定义管理", () => {
		it("应该添加和移除状态定义", () => {
			const onEnterMock = createMockFn();
			const onExitMock = createMockFn();
			const definition: StateDefinition<"Idle"> = {
				onEnter: onEnterMock.fn,
				onExit: onExitMock.fn,
			};

			manager.addState("Idle", definition);
			expect(manager.hasState("Idle")).to.equal(true);

			manager.removeState("Idle");
			expect(manager.hasState("Idle")).to.equal(false);
		});

		it("应该批量添加状态", () => {
			const onEnterMock = createMockFn();
			const onUpdateMock = createMockFn();
			const states = new Map<"Idle" | "Walking", StateDefinition<"Idle" | "Walking">>();
			states.set("Idle", { onEnter: onEnterMock.fn });
			states.set("Walking", { onUpdate: onUpdateMock.fn });

			manager.addStates(states);

			expect(manager.hasState("Idle")).to.equal(true);
			expect(manager.hasState("Walking")).to.equal(true);
		});

		it("应该返回所有已注册的状态", () => {
			manager.addState("Idle", {});
			manager.addState("Walking", {});
			manager.addState("Running", {});

			const states = manager.getRegisteredStates();
			expect(states.includes("Idle")).to.equal(true);
			expect(states.includes("Walking")).to.equal(true);
			expect(states.includes("Running")).to.equal(true);
			expect(states.size()).to.equal(3);
		});
	});

	describe("状态转换", () => {
		it("应该执行状态转换", () => {
			const onExitMock = createMockFn();
			const onEnterMock = createMockFn();

			manager.addState("Idle", { onExit: onExitMock.fn });
			manager.addState("Walking", { onEnter: onEnterMock.fn });

			const state = world.get("State") as State<"Idle" | "Walking">;
			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;

			manager.setState(world, nextState, "Walking");
			manager.update(world, 0);

			expect(onExitMock.wasCalled()).to.equal(true);
			expect(onEnterMock.wasCalled()).to.equal(true);
			expect(state.current).to.equal("Walking");
		});

		it("应该处理转换队列", () => {
			manager.addState("Idle", {});
			manager.addState("Walking", {});
			manager.addState("Running", {});

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking" | "Running">;

			// 快速排队多个转换
			nextState.set("Walking");
			manager.update(world, 0);

			nextState.set("Running");
			manager.update(world, 0);

			const state = world.get("State") as State<"Idle" | "Walking" | "Running">;
			expect(state.current).to.equal("Running");
		});

		it("应该允许同状态转换（如果有处理器）", () => {
			const onEnterMock = createMockFn();
			manager.addState("Idle", { onEnter: onEnterMock.fn });

			const state = world.get("State") as State<"Idle">;
			const nextState = world.get("NextState") as NextState<"Idle">;

			nextState.set("Idle");
			manager.update(world, 0);

			// 因为有 onEnter 处理器，应该允许同状态转换
			expect(onEnterMock.wasCalled()).to.equal(true);
		});
	});

	describe("自动转换", () => {
		it("应该检查并执行自动转换", () => {
			const transitions = new Map<"Walking", (world: World, current: "Idle") => boolean>();
			transitions.set("Walking", () => true);

			manager.addState("Idle", { transitions });
			manager.addState("Walking", {});

			manager.update(world, 0);

			const state = world.get("State") as State<"Idle" | "Walking">;
			expect(state.current).to.equal("Idle"); // 第一次更新仍在 Idle

			// 下一帧应该触发自动转换
			manager.update(world, 0);

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;
			if (nextState.pending) {
				manager.update(world, 0);
				expect(state.current).to.equal("Walking");
			}
		});

		it("应该按优先级处理多个转换条件", () => {
			const transitions = new Map<"Walking" | "Running", (world: World, current: "Idle") => boolean>();
			transitions.set("Walking", () => true);
			transitions.set("Running", () => true);

			manager.addState("Idle", { transitions });
			manager.addState("Walking", {});
			manager.addState("Running", {});

			manager.update(world, 0);
			manager.update(world, 0); // 处理自动转换

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking" | "Running">;
			// 应该选择第一个满足条件的转换
			expect(nextState.pending).to.equal("Walking");
		});
	});

	describe("状态更新", () => {
		it("应该调用当前状态的 onUpdate", () => {
			const onUpdateMock = createMockFn();
			manager.addState("Idle", { onUpdate: onUpdateMock.fn });

			manager.update(world, 0.016);

			expect(onUpdateMock.wasCalled()).to.equal(true);
			expect(onUpdateMock.getLastArgs()?.[0]).to.equal(world);
		});

		it("只有活动状态的 onUpdate 被调用", () => {
			const idleUpdateMock = createMockFn();
			const walkingUpdateMock = createMockFn();

			manager.addState("Idle", { onUpdate: idleUpdateMock.fn });
			manager.addState("Walking", { onUpdate: walkingUpdateMock.fn });

			manager.update(world, 0.016);

			expect(idleUpdateMock.wasCalled()).to.equal(true);
			expect(walkingUpdateMock.wasCalled()).to.equal(false);

			// 转换到 Walking
			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;
			nextState.set("Walking");
			manager.update(world, 0.016);

			manager.update(world, 0.016);

			expect(walkingUpdateMock.wasCalled()).to.equal(true);
		});
	});

	describe("观察者模式", () => {
		it("应该通知观察者状态变化", () => {
			const onEnterMock = createMockFn();
			const onExitMock = createMockFn();
			const onTransitionMock = createMockFn();

			const observer = {
				id: "test-observer",
				onEnter: onEnterMock.fn,
				onExit: onExitMock.fn,
				onTransition: onTransitionMock.fn,
			};

			manager.addObserver(observer);
			manager.addState("Idle", {});
			manager.addState("Walking", {});

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;
			nextState.set("Walking");
			manager.update(world, 0);

			expect(onExitMock.wasCalledWith("Idle")).to.equal(true);
			expect(onEnterMock.wasCalledWith("Walking")).to.equal(true);
			expect(onTransitionMock.wasCalledWith("Idle", "Walking")).to.equal(true);
		});

		it("应该能够移除观察者", () => {
			const onTransitionMock = createMockFn();

			const observer = {
				id: "test-observer",
				onTransition: onTransitionMock.fn,
			};

			manager.addObserver(observer);
			manager.removeObserver("test-observer");

			manager.addState("Idle", {});
			manager.addState("Walking", {});

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;
			nextState.set("Walking");
			manager.update(world, 0);

			expect(onTransitionMock.wasCalled()).to.equal(false);
		});
	});

	describe("统计信息", () => {
		it("应该跟踪转换统计", () => {
			manager.addState("Idle", {});
			manager.addState("Walking", {});
			manager.addState("Running", {});

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking" | "Running">;

			nextState.set("Walking");
			manager.update(world, 0.016);

			nextState.set("Running");
			manager.update(world, 0.016);

			nextState.set("Walking");
			manager.update(world, 0.016);

			const stats = manager.getStatistics();
			expect(stats.totalTransitions).to.equal(3);
			expect(stats.transitionFrequency.get("Idle->Walking")).to.equal(1);
			expect(stats.transitionFrequency.get("Walking->Running")).toBe(1);
			expect(stats.transitionFrequency.get("Running->Walking")).toBe(1);
		});

		it("应该跟踪状态持续时间", () => {
			manager.addState("Idle", {});
			manager.addState("Walking", {});

			// Idle 状态 100ms
			manager.update(world, 0.1);

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;
			nextState.set("Walking");
			manager.update(world, 0);

			// Walking 状态 200ms
			manager.update(world, 0.2);

			const stats = manager.getStatistics();
			expect(stats.stateDurations.get("Idle")).toBeCloseTo(0.1, 2);
			expect(stats.stateDurations.get("Walking")).toBeCloseTo(0.2, 2);
		});

		it("应该能够重置统计信息", () => {
			manager.addState("Idle", {});
			manager.addState("Walking", {});

			const nextState = world.get("NextState") as NextState<"Idle" | "Walking">;
			nextState.set("Walking");
			manager.update(world, 0.1);

			manager.resetStatistics();

			const stats = manager.getStatistics();
			expect(stats.totalTransitions).toBe(0);
			expect(stats.stateDurations.get("Idle")).toBe(0);
			expect(stats.stateDurations.get("Walking")).toBe(0);
		});
	});

	describe("异步转换", () => {
		it("应该支持异步状态转换", async () => {
			manager.addState("Idle", {});
			manager.addState("Walking", {});

			const state = world.get("State") as State<"Idle" | "Walking">;
			const result = await manager.transitionAsync(world, state, "Walking");

			expect(result.success).toBe(true);
			expect(result.newState).toBe("Walking");
			expect(state.current).toBe("Walking");
		});

		it("应该处理无效的异步转换", async () => {
			const state = world.get("State") as State<"Idle" | "Invalid">;
			const result = await manager.transitionAsync(world, state, "Invalid" as any);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("调试模式", () => {
		it("应该在调试模式下输出日志", () => {
			const debugManager = new StateManager<"A" | "B">(true);
			const printSpy = jest.spyOn(global, "print").mockImplementation(() => {});

			debugManager.addState("A", {});
			debugManager.addState("B", {});

			expect(printSpy).toHaveBeenCalledWith(expect.stringContaining("Added state: A"));
			expect(printSpy).toHaveBeenCalledWith(expect.stringContaining("Added state: B"));

			printSpy.mockRestore();
		});
	});
	});
};