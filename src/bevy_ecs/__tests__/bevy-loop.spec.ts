/**
 * Bevy Loop 调度系统测试
 * 验证增强的 Loop 实现是否正确支持 Bevy 调度特性
 */

import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { BevyEcsAdapter, BevySchedule } from "../bevy-ecs-adapter";
import { ResourceManager, SingletonManager } from "../resource";
import { CommandBuffer } from "../command-buffer";

describe("Bevy Loop Scheduler", () => {
	let world: World;
	let resources: SingletonManager;
	let commands: CommandBuffer;
	let adapter: BevyEcsAdapter;

	beforeEach(() => {
		world = new World();
		resources = new ResourceManager();
		commands = new CommandBuffer();
		adapter = new BevyEcsAdapter(world, resources, commands);
	});

	afterEach(() => {
		adapter.stop();
	});

	describe("调度阶段", () => {
		it("应该按照 Bevy 调度阶段顺序执行系统", () => {
			const executionOrder: string[] = [];

			// 添加不同调度阶段的系统
			adapter.addSystem({
				name: "first_system",
				system: () => executionOrder.push("First"),
				priority: 0,
				schedule: BevySchedule.First,
				dependencies: [],
			});

			adapter.addSystem({
				name: "pre_update_system",
				system: () => executionOrder.push("PreUpdate"),
				priority: 0,
				schedule: BevySchedule.PreUpdate,
				dependencies: [],
			});

			adapter.addSystem({
				name: "update_system",
				system: () => executionOrder.push("Update"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "post_update_system",
				system: () => executionOrder.push("PostUpdate"),
				priority: 0,
				schedule: BevySchedule.PostUpdate,
				dependencies: [],
			});

			adapter.addSystem({
				name: "last_system",
				system: () => executionOrder.push("Last"),
				priority: 0,
				schedule: BevySchedule.Last,
				dependencies: [],
			});

			// 运行一次
			adapter.runOnce(0.016);

			// 验证执行顺序
			expect(executionOrder).equal(["First", "PreUpdate", "Update", "PostUpdate", "Last"]);
		});

		it("应该支持 Startup 调度阶段", () => {
			let startupCalled = false;
			let updateCalled = false;

			adapter.addSystem({
				name: "startup_system",
				system: () => {
					startupCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.Startup,
				dependencies: [],
			});

			adapter.addSystem({
				name: "update_system",
				system: () => {
					updateCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			// 运行一次
			adapter.runOnce(0.016);

			expect(startupCalled).equal(true);
			expect(updateCalled).equal(true);
		});
	});

	describe("运行条件", () => {
		it("应该只在条件满足时运行系统", () => {
			let systemRan = false;
			let conditionChecked = false;

			adapter.addSystem({
				name: "conditional_system",
				system: () => {
					systemRan = true;
				},
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
				runCondition: () => {
					conditionChecked = true;
					return false; // 条件不满足
				},
			});

			adapter.runOnce(0.016);

			expect(conditionChecked).equal(true);
			expect(systemRan).equal(false);
		});

		it("应该支持基于资源的运行条件", () => {
			// 添加一个资源
			resources.insertResource("GameState" as any, { isPaused: false });

			let systemRan = false;

			adapter.addSystem({
				name: "resource_conditional_system",
				system: () => {
					systemRan = true;
				},
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
				runCondition: (_world, res) => {
					const gameState = res.getResource("GameState" as any) as { isPaused: boolean } | undefined;
					return gameState ? !gameState.isPaused : false;
				},
			});

			// 第一次运行，游戏未暂停
			adapter.runOnce(0.016);
			expect(systemRan).equal(true);

			// 暂停游戏
			resources.insertResource("GameState" as any, { isPaused: true });
			systemRan = false;

			// 第二次运行，游戏已暂停
			adapter.runOnce(0.016);
			expect(systemRan).equal(false);
		});
	});

	describe("系统依赖", () => {
		it("应该按照依赖关系顺序执行系统", () => {
			const executionOrder: string[] = [];

			adapter.addSystem({
				name: "system_a",
				system: () => executionOrder.push("A"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "system_b",
				system: () => executionOrder.push("B"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: ["system_a"],
			});

			adapter.addSystem({
				name: "system_c",
				system: () => executionOrder.push("C"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: ["system_b"],
			});

			adapter.runOnce(0.016);

			expect(executionOrder).equal(["A", "B", "C"]);
		});

		it("应该支持多个依赖", () => {
			const executionOrder: string[] = [];

			adapter.addSystem({
				name: "system_a",
				system: () => executionOrder.push("A"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "system_b",
				system: () => executionOrder.push("B"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "system_c",
				system: () => executionOrder.push("C"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: ["system_a", "system_b"],
			});

			adapter.runOnce(0.016);

			// C 应该在 A 和 B 之后
			const cIndex = executionOrder.indexOf("C");
			const aIndex = executionOrder.indexOf("A");
			const bIndex = executionOrder.indexOf("B");

			expect(cIndex > aIndex).equal(true);
			expect(cIndex > bIndex).equal(true);
		});
	});

	describe("优先级", () => {
		it("应该按照优先级顺序执行系统", () => {
			const executionOrder: string[] = [];

			adapter.addSystem({
				name: "low_priority",
				system: () => executionOrder.push("Low"),
				priority: 10,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "high_priority",
				system: () => executionOrder.push("High"),
				priority: -10,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "medium_priority",
				system: () => executionOrder.push("Medium"),
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.runOnce(0.016);

			expect(executionOrder).equal(["High", "Medium", "Low"]);
		});
	});

	describe("客户端/服务端特定调度", () => {
		it("应该支持 FixedUpdate 调度", () => {
			let fixedUpdateCalled = false;

			adapter.addSystem({
				name: "fixed_update_system",
				system: () => {
					fixedUpdateCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.FixedUpdate,
				dependencies: [],
			});

			adapter.runOnce(0.016);

			expect(fixedUpdateCalled).equal(true);
		});

		it("应该在客户端支持 Render 调度", () => {
			if (!RunService.IsClient()) {
				return; // 跳过服务端测试
			}

			let renderCalled = false;

			adapter.addSystem({
				name: "render_system",
				system: () => {
					renderCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.Render,
				dependencies: [],
			});

			adapter.runOnce(0.016);

			expect(renderCalled).equal(true);
		});
	});

	describe("系统热重载", () => {
		it("应该支持替换系统", () => {
			let oldSystemCalled = false;
			let newSystemCalled = false;

			adapter.addSystem({
				name: "replaceable_system",
				system: () => {
					oldSystemCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			// 替换系统
			adapter.removeSystem("replaceable_system");
			adapter.addSystem({
				name: "replaceable_system",
				system: () => {
					newSystemCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.runOnce(0.016);

			expect(oldSystemCalled).equal(false);
			expect(newSystemCalled).equal(true);
		});
	});

	describe("错误处理", () => {
		it("应该捕获系统错误而不影响其他系统", () => {
			let beforeErrorCalled = false;
			let afterErrorCalled = false;

			adapter.addSystem({
				name: "before_error",
				system: () => {
					beforeErrorCalled = true;
				},
				priority: 0,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "error_system",
				system: () => {
					error("Test error");
				},
				priority: 1,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			adapter.addSystem({
				name: "after_error",
				system: () => {
					afterErrorCalled = true;
				},
				priority: 2,
				schedule: BevySchedule.Update,
				dependencies: [],
			});

			// 运行不应该抛出错误
			let threwError = false;
			try {
				adapter.runOnce(0.016);
			} catch {
				threwError = true;
			}
			expect(threwError).equal(false);

			// 其他系统应该正常执行
			expect(beforeErrorCalled).equal(true);
			expect(afterErrorCalled).equal(true);
		});
	});
});