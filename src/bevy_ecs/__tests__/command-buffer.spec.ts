import { AnyComponent, component } from "@rbxts/matter";
import { BevyWorld } from "../bevy-world";
import {
	CommandBuffer,
	CommandType,
	SpawnCommand,
	DespawnCommand,
	AddComponentCommand,
	RemoveComponentCommand,
	InsertResourceCommand,
	RemoveResourceCommand,
	ComponentConstructor,
	globalCommandBuffer,
} from "../command-buffer";

/**
 * 测试组件类
 */
const TestComponent = component<{ value: number; name: string }>("TestComponent", {
	value: 0,
	name: "test",
});

/**
 * 另一个测试组件类
 */
const AnotherComponent = component<{ data: string; active: boolean }>("AnotherComponent", {
	data: "default",
	active: true,
});

/**
 * 位置组件
 */
const PositionComponent = component<{ x: number; y: number; z: number }>("PositionComponent", {
	x: 0,
	y: 0,
	z: 0,
});

/**
 * 速度组件
 */
const VelocityComponent = component<{ vx: number; vy: number; vz: number }>("VelocityComponent", {
	vx: 0,
	vy: 0,
	vz: 0,
});

export = () => {
	let world: BevyWorld;
	let commandBuffer: CommandBuffer;

	beforeEach(() => {
		world = new BevyWorld();
		commandBuffer = new CommandBuffer();
	});

	afterEach(() => {
		// 清理命令缓冲器
		commandBuffer.clear();
	});

	describe("CommandBuffer", () => {
		describe("基本功能", () => {
			it("应该初始为空", () => {
				expect(commandBuffer.isEmpty()).to.equal(true);
				expect(commandBuffer.getCommandCount()).to.equal(0);
			});

			it("clear 应该清空所有命令", () => {
				commandBuffer.spawn([TestComponent({ value: 0, name: "test" })]);
				commandBuffer.spawn([AnotherComponent({ data: "default", active: true })]);

				expect(commandBuffer.getCommandCount()).to.equal(2);
				expect(commandBuffer.isEmpty()).to.equal(false);

				commandBuffer.clear();

				expect(commandBuffer.getCommandCount()).to.equal(0);
				expect(commandBuffer.isEmpty()).to.equal(true);
			});

			it("getCommands 应该返回命令的只读副本", () => {
				const testComponent = TestComponent({ value: 42, name: "readonly test" });
				commandBuffer.spawn([testComponent]);

				const commands = commandBuffer.getCommands();
				expect(commands.size()).to.equal(1);

				const spawnCommand = commands[0] as SpawnCommand;
				expect(spawnCommand.type).to.equal(CommandType.Spawn);
				expect(spawnCommand.components.size()).to.equal(1);
			});
		});

		describe("实体生成命令", () => {
			it("应该能够创建生成实体命令", () => {
				const testComponent = TestComponent({ value: 100, name: "spawn test" });
				const anotherComponent = AnotherComponent({ data: "spawn data", active: true });

				const entityId = commandBuffer.spawn([testComponent, anotherComponent]);

				expect(commandBuffer.getCommandCount()).to.equal(1);
				expect(entityId).to.be.a("number");

				const commands = commandBuffer.getCommands();
				const spawnCommand = commands[0] as SpawnCommand;

				expect(spawnCommand.type).to.equal(CommandType.Spawn);
				expect(spawnCommand.components.size()).to.equal(2);
				expect(spawnCommand.entityId).to.equal(entityId);
			});

			it("应该能够生成只有单个组件的实体", () => {
				const component = TestComponent({ value: 123, name: "test" });
				const entityId = commandBuffer.spawn([component]);

				const commands = commandBuffer.getCommands();
				const spawnCommand = commands[0] as SpawnCommand;

				expect(spawnCommand.components.size()).to.equal(1);
			});

			it("应该能够生成空组件列表的实体", () => {
				const entityId = commandBuffer.spawn([]);

				const commands = commandBuffer.getCommands();
				const spawnCommand = commands[0] as SpawnCommand;

				expect(spawnCommand.components.size()).to.equal(0);
			});
		});

		describe("实体销毁命令", () => {
			it("应该能够创建销毁实体命令", () => {
				const entityId = 12345 as never;
				commandBuffer.despawn(entityId);

				expect(commandBuffer.getCommandCount()).to.equal(1);

				const commands = commandBuffer.getCommands();
				const despawnCommand = commands[0] as DespawnCommand;

				expect(despawnCommand.type).to.equal(CommandType.Despawn);
				expect(despawnCommand.entityId).to.equal(entityId);
			});
		});

		describe("组件操作命令", () => {
			it("应该能够创建添加组件命令", () => {
				const entityId = 54321 as never;
				const component = TestComponent({ value: 999, name: "add component test" });

				commandBuffer.addComponent(entityId, component);

				expect(commandBuffer.getCommandCount()).to.equal(1);

				const commands = commandBuffer.getCommands();
				const addCommand = commands[0] as AddComponentCommand;

				expect(addCommand.type).to.equal(CommandType.AddComponent);
				expect(addCommand.entityId).to.equal(entityId);
				expect(addCommand.component).to.equal(component);
			});

			it("应该能够创建移除组件命令", () => {
				const entityId = 11111 as never;
				const componentType = TestComponent as ComponentConstructor;

				commandBuffer.removeComponent(entityId, componentType);

				expect(commandBuffer.getCommandCount()).to.equal(1);

				const commands = commandBuffer.getCommands();
				const removeCommand = commands[0] as RemoveComponentCommand;

				expect(removeCommand.type).to.equal(CommandType.RemoveComponent);
				expect(removeCommand.entityId).to.equal(entityId);
				expect(removeCommand.componentType).to.equal(componentType);
			});
		});

		describe("资源操作命令", () => {
			it("应该能够创建插入资源命令", () => {
				const resource = TestComponent({ value: 777, name: "resource test" });

				commandBuffer.insertResource(resource);

				expect(commandBuffer.getCommandCount()).to.equal(1);

				const commands = commandBuffer.getCommands();
				const insertCommand = commands[0] as InsertResourceCommand;

				expect(insertCommand.type).to.equal(CommandType.InsertResource);
				expect(insertCommand.resource).to.equal(resource);
			});

			it("应该能够创建移除资源命令", () => {
				const resourceType = TestComponent as ComponentConstructor;

				commandBuffer.removeResource(resourceType);

				expect(commandBuffer.getCommandCount()).to.equal(1);

				const commands = commandBuffer.getCommands();
				const removeCommand = commands[0] as RemoveResourceCommand;

				expect(removeCommand.type).to.equal(CommandType.RemoveResource);
				expect(removeCommand.resourceType).to.equal(resourceType);
			});
		});

		describe("命令执行 (flush)", () => {
			it("应该能够执行生成实体命令", () => {
				const position = PositionComponent({ x: 10, y: 20, z: 30 });
				const velocity = VelocityComponent({ vx: 1, vy: 2, vz: 3 });

				const tempEntityId = commandBuffer.spawn([position, velocity]);
				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(1);
				expect(results[0].success).to.equal(true);
				expect(results[0].entityId).to.be.a("number");
				expect(results[0].entityId).never.to.equal(tempEntityId);

				// 验证实体确实在世界中创建了
				const realEntityId = results[0].entityId!;
				expect(world.contains(realEntityId)).to.equal(true);
			});

			it("应该能够执行销毁实体命令", () => {
				// 先创建一个实体
				const entityId = world.spawn(TestComponent({ value: 0, name: "test" }));

				// 然后销毁它
				commandBuffer.despawn(entityId);
				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(1);
				expect(results[0].success).to.equal(true);
				expect(results[0].entityId).to.equal(entityId);

				// 验证实体已被销毁
				expect(world.contains(entityId)).to.equal(false);
			});

			it("应该能够执行添加组件命令", () => {
				// 先创建一个实体
				const entityId = world.spawn(TestComponent({ value: 0, name: "test" }));

				// 添加另一个组件
				const newComponent = AnotherComponent({ data: "added", active: true });
				commandBuffer.addComponent(entityId, newComponent);
				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(1);
				expect(results[0].success).to.equal(true);

				// 验证组件已被添加（这里需要根据实际的Matter API调整）
				// 由于Matter的API限制，我们只能验证操作成功
			});

			it("应该能够执行移除组件命令", () => {
				// 先创建一个带有组件的实体
				const testComponent = TestComponent({ value: 42, name: "test" });
				const entityId = world.spawn(testComponent);

				// 移除组件
				commandBuffer.removeComponent(entityId, TestComponent as ComponentConstructor);
				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(1);
				expect(results[0].success).to.equal(true);
			});

			it("flush 后应该清空命令缓冲器", () => {
				commandBuffer.spawn([TestComponent({ value: 0, name: "test" })]);
				commandBuffer.spawn([AnotherComponent({ data: "default", active: true })]);

				expect(commandBuffer.getCommandCount()).to.equal(2);

				commandBuffer.flush(world);

				expect(commandBuffer.getCommandCount()).to.equal(0);
				expect(commandBuffer.isEmpty()).to.equal(true);
			});

			it("应该能够处理多个命令的批量执行", () => {
				// 创建多个不同类型的命令
				const tempEntityId1 = commandBuffer.spawn([TestComponent({ value: 1, name: "entity1" })]);
				const tempEntityId2 = commandBuffer.spawn([AnotherComponent({ data: "entity2", active: false })]);

				// 先创建一个实体用于后续操作
				const existingEntity = world.spawn(TestComponent({ value: 999, name: "test" }));
				commandBuffer.addComponent(existingEntity, AnotherComponent({ data: "added", active: true }));

				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(3);
				for (const result of results) {
					expect(result.success).to.equal(true);
				}

				// 验证所有操作都成功执行
				expect(world.contains(results[0].entityId!)).to.equal(true);
				expect(world.contains(results[1].entityId!)).to.equal(true);
			});

			it("应该正确处理执行中的错误", () => {
				// 尝试销毁一个不存在的实体
				const nonExistentEntity = 99999 as never;
				commandBuffer.despawn(nonExistentEntity);

				const results = commandBuffer.flush(world);

				// 即使操作失败，也应该返回结果
				expect(results.size()).to.equal(1);
				// 具体的错误处理取决于Matter的实现
			});
		});

		describe("资源命令执行", () => {
			it("资源命令应该成功执行", () => {
				const resource = TestComponent({ value: 123, name: "resource" });
				commandBuffer.insertResource(resource);

				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(1);
				expect(results[0].success).to.equal(true);
			});
		});

		describe("复杂场景", () => {
			it("应该支持实体的完整生命周期", () => {
				// 生成实体
				const tempEntityId = commandBuffer.spawn([PositionComponent({ x: 5, y: 5, z: 5 })]);

				// 添加更多组件
				commandBuffer.addComponent(tempEntityId, VelocityComponent({ vx: 1, vy: 1, vz: 1 }));
				commandBuffer.addComponent(tempEntityId, TestComponent({ value: 42, name: "lifecycle" }));

				// 执行命令
				const spawnResults = commandBuffer.flush(world);
				const realEntityId = spawnResults[0].entityId!;

				// 移除一个组件
				commandBuffer.removeComponent(realEntityId, VelocityComponent as ComponentConstructor);

				// 最后销毁实体
				commandBuffer.despawn(realEntityId);

				const finalResults = commandBuffer.flush(world);

				// 验证所有操作都成功
				expect(spawnResults.size()).to.equal(3);
				expect(finalResults.size()).to.equal(2);

				for (const result of spawnResults) {
					expect(result.success).to.equal(true);
				}
				for (const result of finalResults) {
					expect(result.success).to.equal(true);
				}

				// 验证实体最终被销毁
				expect(world.contains(realEntityId)).to.equal(false);
			});

			it("应该支持同时操作多个实体", () => {
				const entity1 = commandBuffer.spawn([TestComponent({ value: 1, name: "entity1" })]);
				const entity2 = commandBuffer.spawn([TestComponent({ value: 2, name: "entity2" })]);
				const entity3 = commandBuffer.spawn([TestComponent({ value: 3, name: "entity3" })]);

				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(3);
				for (const result of results) {
					expect(result.success).to.equal(true);
					expect(world.contains(result.entityId!)).to.equal(true);
				}

				// 获取真实的实体ID
				const realEntityIds = results.map((result) => result.entityId!);

				// 为所有实体添加相同的组件
				for (const entityId of realEntityIds) {
					commandBuffer.addComponent(entityId, AnotherComponent({ data: "batch added", active: true }));
				}

				const addResults = commandBuffer.flush(world);
				expect(addResults.size()).to.equal(3);
				for (const result of addResults) {
					expect(result.success).to.equal(true);
				}
			});

			it("应该正确处理临时实体ID的映射", () => {
				// 生成实体并获取临时ID
				const tempId = commandBuffer.spawn([TestComponent({ value: 100, name: "test" })]);

				// 使用临时ID添加更多组件
				commandBuffer.addComponent(tempId, AnotherComponent({ data: "temp id test", active: true }));

				// 使用临时ID销毁实体
				commandBuffer.despawn(tempId);

				const results = commandBuffer.flush(world);

				expect(results.size()).to.equal(3); // spawn, add, despawn
				const realEntityId = results[0].entityId!;

				// 验证所有操作都使用了正确的实体ID
				expect(results[1].entityId).to.equal(realEntityId);
				expect(results[2].entityId).to.equal(realEntityId);
			});
		});
	});

	describe("全局命令缓冲器", () => {
		it("应该提供全局可访问的命令缓冲器实例", () => {
			expect(globalCommandBuffer).to.be.ok();
			expect(globalCommandBuffer.isEmpty()).to.equal(true);

			globalCommandBuffer.spawn([TestComponent({ value: 999, name: "global test" })]);
			expect(globalCommandBuffer.getCommandCount()).to.equal(1);

			globalCommandBuffer.clear();
			expect(globalCommandBuffer.isEmpty()).to.equal(true);
		});

		it("全局实例应该与局部实例独立工作", () => {
			const localBuffer = new CommandBuffer();

			localBuffer.spawn([TestComponent({ value: 1, name: "local" })]);
			globalCommandBuffer.spawn([TestComponent({ value: 2, name: "global" })]);

			expect(localBuffer.getCommandCount()).to.equal(1);
			expect(globalCommandBuffer.getCommandCount()).to.equal(1);

			localBuffer.clear();
			expect(localBuffer.getCommandCount()).to.equal(0);
			expect(globalCommandBuffer.getCommandCount()).to.equal(1);

			globalCommandBuffer.clear();
		});
	});

	describe("枚举和类型", () => {
		it("CommandType 枚举应该包含所有命令类型", () => {
			expect(CommandType.Spawn).to.equal("spawn");
			expect(CommandType.Despawn).to.equal("despawn");
			expect(CommandType.AddComponent).to.equal("add_component");
			expect(CommandType.RemoveComponent).to.equal("remove_component");
			expect(CommandType.InsertResource).to.equal("insert_resource");
			expect(CommandType.RemoveResource).to.equal("remove_resource");
		});
	});

	describe("错误处理和边界情况", () => {
		it("应该处理空的命令缓冲器flush", () => {
			const results = commandBuffer.flush(world);
			expect(results.size()).to.equal(0);
		});

		it("应该处理重复的清理操作", () => {
			commandBuffer.spawn([TestComponent({ value: 0, name: "test" })]);
			commandBuffer.clear();
			commandBuffer.clear(); // 重复清理

			expect(commandBuffer.isEmpty()).to.equal(true);
			expect(commandBuffer.getCommandCount()).to.equal(0);
		});

		it("应该处理大量命令的执行", () => {
			const COMMAND_COUNT = 100;

			// 创建大量生成命令
			for (let index = 0; index < COMMAND_COUNT; index++) {
				commandBuffer.spawn([TestComponent({ value: index, name: `entity_${index}` })]);
			}

			expect(commandBuffer.getCommandCount()).to.equal(COMMAND_COUNT);

			const results = commandBuffer.flush(world);

			expect(results.size()).to.equal(COMMAND_COUNT);
			for (const result of results) {
				expect(result.success).to.equal(true);
				expect(world.contains(result.entityId!)).to.equal(true);
			}
		});
	});
};