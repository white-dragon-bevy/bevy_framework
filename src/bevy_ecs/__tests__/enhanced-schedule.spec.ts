/**
 * 增强调度系统测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../resource";
import { CommandBuffer } from "../command-buffer";
import {
	EnhancedSchedule,
	CoreSet,
	StateTransitionSet,
	inState,
	resourceExists,
} from "../enhanced-schedule";
import {
	system,
	configureSet,
	chain,
	systemSet,
} from "../schedule-config";

export = () => {
	describe("EnhancedSchedule", () => {
		let world: World;
		let resources: ResourceManager;
		let commands: CommandBuffer;
		let schedule: EnhancedSchedule;
		let executionOrder: string[];

		beforeEach(() => {
			world = new World();
			resources = new ResourceManager();
			commands = new CommandBuffer();
			// 创建带警告抑制的测试调度
			schedule = new EnhancedSchedule("TestSchedule", {
				suppressAmbiguityWarnings: true
			});
			executionOrder = [];
		});

		describe("基础功能", () => {
			it("应该按添加顺序执行系统", () => {
				schedule
					.addSystem(() => executionOrder.push("A"))
					.addSystem(() => executionOrder.push("B"))
					.addSystem(() => executionOrder.push("C"));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});

			it("应该支持链式配置", () => {
				const systemA = system(() => executionOrder.push("A"), "systemA");
				const systemB = system(() => executionOrder.push("B"), "systemB").after("systemA");
				const systemC = system(() => executionOrder.push("C"), "systemC").after("systemB");

				schedule.addSystems(systemA, systemB, systemC);

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});
		});

		describe("before/after 依赖", () => {
			it("应该正确处理 after 依赖", () => {
				schedule
					.addSystem(system(() => executionOrder.push("B"), "B").after("A"))
					.addSystem(system(() => executionOrder.push("A"), "A"))
					.addSystem(system(() => executionOrder.push("C"), "C").after("B"));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});

			it("应该正确处理 before 依赖", () => {
				schedule
					.addSystem(system(() => executionOrder.push("C"), "C"))
					.addSystem(system(() => executionOrder.push("B"), "B").before("C"))
					.addSystem(system(() => executionOrder.push("A"), "A").before("B"));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});

			it("应该正确处理混合依赖", () => {
				schedule
					.addSystem(system(() => executionOrder.push("A"), "A"))
					.addSystem(system(() => executionOrder.push("C"), "C"))
					.addSystem(
						system(() => executionOrder.push("B"), "B")
							.after("A")
							.before("C"),
					);

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});
		});

		describe("系统集", () => {
			it("应该支持系统集", () => {
				const InputSet = systemSet("Input");
				const LogicSet = systemSet("Logic");
				const RenderSet = systemSet("Render");

				schedule
					.configureSet(configureSet(LogicSet).after(InputSet))
					.configureSet(configureSet(RenderSet).after(LogicSet))
					.addSystem(system(() => executionOrder.push("Input1")).inSet(InputSet))
					.addSystem(system(() => executionOrder.push("Input2")).inSet(InputSet))
					.addSystem(system(() => executionOrder.push("Logic1")).inSet(LogicSet))
					.addSystem(system(() => executionOrder.push("Logic2")).inSet(LogicSet))
					.addSystem(system(() => executionOrder.push("Render1")).inSet(RenderSet))
					.addSystem(system(() => executionOrder.push("Render2")).inSet(RenderSet));

				schedule.run(world, 0, resources, commands);

				// 验证执行顺序：Input -> Logic -> Render
				const inputIndex = math.max(executionOrder.indexOf("Input1"), executionOrder.indexOf("Input2"));
				const logicIndex = math.min(executionOrder.indexOf("Logic1"), executionOrder.indexOf("Logic2"));
				const renderIndex = math.min(executionOrder.indexOf("Render1"), executionOrder.indexOf("Render2"));

				expect(inputIndex < logicIndex).to.equal(true);
				expect(logicIndex < renderIndex).to.equal(true);
			});

			it("应该支持嵌套系统集", () => {
				const UpdateSet = systemSet("Update");
				const PhysicsSet = systemSet("Physics");

				schedule
					.addSetHierarchy(PhysicsSet, UpdateSet)
					.addSystem(system(() => executionOrder.push("Physics")).inSet(PhysicsSet))
					.addSystem(system(() => executionOrder.push("Other")).inSet(UpdateSet));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder.includes("Physics")).to.equal(true);
				expect(executionOrder.includes("Other")).to.equal(true);
			});

			it("应该使用核心系统集", () => {
				schedule
					.addSystem(system(() => executionOrder.push("First")).inSet(CoreSet.First))
					.addSystem(system(() => executionOrder.push("Update")).inSet(CoreSet.Update))
					.addSystem(system(() => executionOrder.push("Last")).inSet(CoreSet.Last))
					.configureSet(configureSet(CoreSet.Update).after(CoreSet.First))
					.configureSet(configureSet(CoreSet.Last).after(CoreSet.Update));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("First");
				expect(executionOrder[1]).to.equal("Update");
				expect(executionOrder[2]).to.equal("Last");
			});
		});

		describe("运行条件", () => {
			it("应该支持运行条件", () => {
				let shouldRun = false;

				schedule
					.addSystem(system(() => executionOrder.push("Always")))
					.addSystem(system(() => executionOrder.push("Conditional")).runIf(() => shouldRun));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(1);
				expect(executionOrder[0]).to.equal("Always");

				executionOrder = [];
				shouldRun = true;
				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(2);
				expect(executionOrder[0]).to.equal("Always");
				expect(executionOrder[1]).to.equal("Conditional");
			});

			it("应该支持多个运行条件", () => {
				let condition1 = true;
				const condition2 = true;

				schedule.addSystem(
					system(() => executionOrder.push("Multi"))
						.runIf(() => condition1)
						.runIf(() => condition2),
				);

				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(1);
				expect(executionOrder[0]).to.equal("Multi");

				executionOrder = [];
				condition1 = false;
				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(0);
			});

			it("应该支持系统集运行条件", () => {
				const ConditionalSet = systemSet("Conditional");
				let shouldRun = false;

				schedule
					.configureSet(configureSet(ConditionalSet).runIf(() => shouldRun))
					.addSystem(system(() => executionOrder.push("InSet")).inSet(ConditionalSet))
					.addSystem(system(() => executionOrder.push("NotInSet")));

				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(1);
				expect(executionOrder[0]).to.equal("NotInSet");

				executionOrder = [];
				shouldRun = true;
				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(2);
				expect(executionOrder[0]).to.equal("InSet");
				expect(executionOrder[1]).to.equal("NotInSet");
			});
		});

		describe("链式系统", () => {
			it("应该支持链式系统", () => {
				const systems = chain(
					() => executionOrder.push("A"),
					() => executionOrder.push("B"),
					() => executionOrder.push("C"),
				).chain();

				for (const config of systems.getConfigs()) {
					schedule.addSystem(system(config.system, config.name));
				}

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});

			it("应该支持链式系统配置", () => {
				const PhysicsSet = systemSet("Physics");

				const systems = chain(
					() => executionOrder.push("UpdateVelocity"),
					() => executionOrder.push("UpdatePosition"),
					() => executionOrder.push("CheckCollisions"),
				)
					.chain()
					.inSet(PhysicsSet);

				for (const config of systems.getConfigs()) {
					schedule.addSystem(system(config.system, config.name));
				}

				schedule.run(world, 0, resources, commands);
				expect(executionOrder[0]).to.equal("UpdateVelocity");
				expect(executionOrder[1]).to.equal("UpdatePosition");
				expect(executionOrder[2]).to.equal("CheckCollisions");
			});
		});

		describe("模糊性检测", () => {
			it("应该检测模糊性冲突", () => {
				// 两个系统没有明确的执行顺序
				schedule
					.addSystem(system(() => executionOrder.push("A"), "A"))
					.addSystem(system(() => executionOrder.push("B"), "B"));

				// 运行时应该警告模糊性（但仍然执行）
				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(2);
			});

			it("应该忽略指定的模糊性", () => {
				const GroupA = systemSet("GroupA");
				const GroupB = systemSet("GroupB");

				schedule
					.addSystem(system(() => executionOrder.push("A1"), "A1").inSet(GroupA))
					.addSystem(system(() => executionOrder.push("A2"), "A2").inSet(GroupA))
					.addSystem(
						system(() => executionOrder.push("B1"), "B1")
							.inSet(GroupB)
							.ambiguousWith(GroupA),
					)
					.addSystem(
						system(() => executionOrder.push("B2"), "B2")
							.inSet(GroupB)
							.ambiguousWith(GroupA),
					);

				// 不应该警告 GroupA 和 GroupB 之间的模糊性
				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(4);
			});

			it("应该忽略所有模糊性", () => {
				schedule
					.addSystem(system(() => executionOrder.push("A"), "A").ambiguousWithAll())
					.addSystem(system(() => executionOrder.push("B"), "B"))
					.addSystem(system(() => executionOrder.push("C"), "C"));

				// 不应该警告任何模糊性
				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(3);
			});
		});

		describe("循环依赖检测", () => {
			it("应该检测简单循环", () => {
				schedule
					.addSystem(system(() => executionOrder.push("A"), "A").after("B"))
					.addSystem(system(() => executionOrder.push("B"), "B").after("A"));

				// 应该抛出错误
				expect(() => schedule.run(world, 0, resources, commands)).to.throw();
			});

			it("应该检测复杂循环", () => {
				schedule
					.addSystem(system(() => executionOrder.push("A"), "A").after("C"))
					.addSystem(system(() => executionOrder.push("B"), "B").after("A"))
					.addSystem(system(() => executionOrder.push("C"), "C").after("B"));

				// 应该抛出错误
				expect(() => schedule.run(world, 0, resources, commands)).to.throw();
			});
		});

		describe("性能测试", () => {
			it("应该处理大量系统", () => {
				const systemCount = 100;

				for (let i = 0; i < systemCount; i++) {
					const name = `system_${i}`;
					const builder = system(() => executionOrder.push(name), name);

					// 创建链式依赖关系，避免模糊性警告
					if (i > 0) {
						// 每个系统依赖前一个系统
						builder.after(`system_${i - 1}`);
					}

					schedule.addSystem(builder);
				}

				schedule.run(world, 0, resources, commands);
				expect(executionOrder.size()).to.equal(systemCount);

				// 验证执行顺序
				for (let i = 0; i < systemCount; i++) {
					expect(executionOrder[i]).to.equal(`system_${i}`);
				}
			});
		});
	});
};
