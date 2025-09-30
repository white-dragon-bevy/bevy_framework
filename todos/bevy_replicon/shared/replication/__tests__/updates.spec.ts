/**
 * @fileoverview Updates 消息单元测试
 */

import { Entity } from "@rbxts/matter";
import type { Range } from "../serialized-data";
import { createRange, SerializedData } from "../serialized-data";
import { UpdateMessageFlags, flagsToString, hasFlag } from "../update-message-flags";
import { collectMappingsFromClients, serializeMappings, Updates } from "../updates";

export = (): void => {
	describe("Updates", () => {
		let updates: Updates;
		let serializedData: SerializedData;

		beforeEach(() => {
			updates = new Updates();
			serializedData = new SerializedData();
		});

		describe("基础操作", () => {
			it("应该初始化为空", () => {
				expect(updates.isEmpty()).to.equal(true);
			});

			it("应该能够清空", () => {
				const mappings: Array<[Entity, Entity]> = [[1 as Entity, 2 as Entity]];
				const [range, length] = serializeMappings(serializedData, mappings);
				updates.setMappings(range, length);

				expect(updates.isEmpty()).to.equal(false);

				updates.clear();
				expect(updates.isEmpty()).to.equal(true);
			});
		});

		describe("映射段", () => {
			it("应该能够设置和获取映射", () => {
				const mappings: Array<[Entity, Entity]> = [
					[100 as Entity, 1000 as Entity],
					[101 as Entity, 1001 as Entity],
				];

				const [range, length] = serializeMappings(serializedData, mappings);
				updates.setMappings(range, length);

				expect(updates.getMappingsLength()).to.equal(2);
				expect(updates.isEmpty()).to.equal(false);
			});

			it("设置映射后标志位应包含 MAPPINGS", () => {
				const mappings: Array<[Entity, Entity]> = [[1 as Entity, 2 as Entity]];
				const [range, length] = serializeMappings(serializedData, mappings);
				updates.setMappings(range, length);

				const flags = updates.getFlags();
				expect(hasFlag(flags, UpdateMessageFlags.MAPPINGS)).to.equal(true);
			});

			it("空更新的标志位应为 NONE", () => {
				const flags = updates.getFlags();
				expect(flags).to.equal(UpdateMessageFlags.NONE);
			});
		});

		describe("序列化", () => {
			it("应该正确序列化空消息", () => {
				const tickRange = serializedData.writeTick(100);
				const message = updates.serialize(serializedData, tickRange);

				expect(message.size() > 0).to.equal(true);

				// 反序列化验证
				const deserialized = Updates.deserialize(message);
				expect(deserialized.tick).to.equal(100);
				expect(deserialized.mappings.size()).to.equal(0);
			});

			it("应该正确序列化包含映射的消息", () => {
				const mappings: Array<[Entity, Entity]> = [
					[10 as Entity, 100 as Entity],
					[20 as Entity, 200 as Entity],
				];

				const tickRange = serializedData.writeTick(50);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, mappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// 反序列化验证
				const deserialized = Updates.deserialize(message);
				expect(deserialized.tick).to.equal(50);
				expect(deserialized.flags).to.equal(UpdateMessageFlags.MAPPINGS);
				expect(deserialized.mappings.size()).to.equal(2);

				// 验证映射数据
				for (let index = 0; index < mappings.size(); index++) {
					expect(deserialized.mappings[index][0]).to.equal(mappings[index][0]);
					expect(deserialized.mappings[index][1]).to.equal(mappings[index][1]);
				}
			});

			it("应该正确处理大量映射", () => {
				const mappings: Array<[Entity, Entity]> = [];
				for (let index = 0; index < 50; index++) {
					mappings.push([index as Entity, (index + 5000) as Entity]);
				}

				const tickRange = serializedData.writeTick(999);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, mappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// 反序列化验证
				const deserialized = Updates.deserialize(message);
				expect(deserialized.tick).to.equal(999);
				expect(deserialized.mappings.size() > 0).to.equal(true);
			});
		});

		describe("销毁段 (DESPAWNS)", () => {
			it("应该能够添加销毁的实体", () => {
				const entity1 = serializedData.writeEntity(1 as Entity);
				const entity2 = serializedData.writeEntity(2 as Entity);

				updates.addDespawn(entity1);
				updates.addDespawn(entity2);

				expect(updates.isEmpty()).to.equal(false);

				const flags = updates.getFlags();
				expect(hasFlag(flags, UpdateMessageFlags.DESPAWNS)).to.equal(true);
			});

			it("应该自动合并相邻的销毁范围", () => {
				// 创建两个相邻范围
				const range1 = createRange(0, 10);
				const range2 = createRange(10, 20); // 与 range1 相邻

				updates.addDespawn(range1);
				updates.addDespawn(range2);

				// 验证合并
				const tickRange = serializedData.writeTick(100);
				const message = updates.serialize(serializedData, tickRange);
				const deserialized = Updates.deserialize(message);

				expect(deserialized.despawns.size() > 0).to.equal(true);
			});

			it("应该正确序列化和反序列化销毁段", () => {
				const entity1 = serializedData.writeEntity(10 as Entity);
				const entity2 = serializedData.writeEntity(20 as Entity);

				updates.addDespawn(entity1);
				updates.addDespawn(entity2);

				const tickRange = serializedData.writeTick(50);
				const message = updates.serialize(serializedData, tickRange);

				const deserialized = Updates.deserialize(message);
				expect(deserialized.tick).to.equal(50);
				expect(deserialized.despawns.size()).to.equal(2);
				expect(deserialized.despawns[0]).to.equal(10);
				expect(deserialized.despawns[1]).to.equal(20);
			});
		});

		describe("移除段 (REMOVALS)", () => {
			it("应该能够添加组件移除", () => {
				const entity = serializedData.writeEntity(1 as Entity);
				const fnIds = serializedData.writeFnIds([10, 20, 30]);

				updates.addRemovals(entity, 3, fnIds);

				expect(updates.isEmpty()).to.equal(false);

				const flags = updates.getFlags();
				expect(hasFlag(flags, UpdateMessageFlags.REMOVALS)).to.equal(true);
			});

			it("应该正确序列化和反序列化移除段", () => {
				const entity1 = serializedData.writeEntity(5 as Entity);
				const fnIds1 = serializedData.writeFnIds([100, 200]);

				const entity2 = serializedData.writeEntity(6 as Entity);
				const fnIds2 = serializedData.writeFnIds([300]);

				updates.addRemovals(entity1, 2, fnIds1);
				updates.addRemovals(entity2, 1, fnIds2);

				const tickRange = serializedData.writeTick(75);
				const message = updates.serialize(serializedData, tickRange);

				const deserialized = Updates.deserialize(message);
				expect(deserialized.tick).to.equal(75);
				expect(deserialized.removals.size()).to.equal(2);
				expect(deserialized.removals[0].entity).to.equal(5);
				expect(deserialized.removals[0].fnIds.size()).to.equal(2);
				expect(deserialized.removals[0].fnIds[0]).to.equal(100);
				expect(deserialized.removals[0].fnIds[1]).to.equal(200);
				expect(deserialized.removals[1].entity).to.equal(6);
				expect(deserialized.removals[1].fnIds.size()).to.equal(1);
				expect(deserialized.removals[1].fnIds[0]).to.equal(300);
			});
		});

		describe("变更段 (CHANGES)", () => {
			// 辅助函数: 写入带 FnsId 和 size 的组件
			function writeComponent(buffer: SerializedData, fnId: number, data: Array<number>): Range {
				const start = buffer.getLength();
				// 写入 FnsId
				buffer.writeU32(fnId);
				// 写入数据大小
				buffer.writeU32(data.size());
				// 写入数据
				buffer.writeBytes(data);
				const endIndex = buffer.getLength();
				return createRange(start, endIndex);
			}

			it("应该能够添加变更的实体和组件", () => {
				const entity = serializedData.writeEntity(1 as Entity);
				const component1 = writeComponent(serializedData, 100, [1, 2, 3, 4]);
				const component2 = writeComponent(serializedData, 200, [5, 6, 7, 8]);

				updates.startEntityChanges();
				updates.addChangedEntity(entity);
				updates.addInsertedComponent(component1);
				updates.addInsertedComponent(component2);

				expect(updates.isEmpty()).to.equal(false);
				expect(updates.changedEntityWasAdded()).to.equal(true);

				const flags = updates.getFlags();
				expect(hasFlag(flags, UpdateMessageFlags.CHANGES)).to.equal(true);
			});

			it("应该自动合并相邻的组件范围", () => {
				const entity = serializedData.writeEntity(1 as Entity);
				const component1 = createRange(0, 10);
				const component2 = createRange(10, 20); // 与 component1 相邻

				updates.startEntityChanges();
				updates.addChangedEntity(entity);
				updates.addInsertedComponent(component1);
				updates.addInsertedComponent(component2);

				const tickRange = serializedData.writeTick(100);
				const message = updates.serialize(serializedData, tickRange);

				const deserialized = Updates.deserialize(message);
				expect(deserialized.changes.size()).to.equal(1);
			});

			it("应该正确序列化和反序列化变更段", () => {
				const entity1 = serializedData.writeEntity(10 as Entity);
				const comp1 = writeComponent(serializedData, 100, [1, 2, 3]);
				const comp2 = writeComponent(serializedData, 200, [4, 5, 6]);

				const entity2 = serializedData.writeEntity(20 as Entity);
				const comp3 = writeComponent(serializedData, 300, [7, 8, 9]);

				// 第一个实体
				updates.startEntityChanges();
				updates.addChangedEntity(entity1);
				updates.addInsertedComponent(comp1);
				updates.addInsertedComponent(comp2);

				// 第二个实体
				updates.startEntityChanges();
				updates.addChangedEntity(entity2);
				updates.addInsertedComponent(comp3);

				const tickRange = serializedData.writeTick(99);
				const message = updates.serialize(serializedData, tickRange);

				const deserialized = Updates.deserialize(message);
				expect(deserialized.tick).to.equal(99);
				expect(deserialized.changes.size()).to.equal(2);
				expect(deserialized.changes[0].entity).to.equal(10);
				expect(deserialized.changes[0].components.size()).to.equal(2);
				expect(deserialized.changes[1].entity).to.equal(20);
				expect(deserialized.changes[1].components.size()).to.equal(1);
			});
		});

		describe("混合段测试", () => {
			it("应该能够同时包含所有类型的段", () => {
				// 辅助函数
				function writeComponent(buffer: SerializedData, fnId: number, data: Array<number>): Range {
					const start = buffer.getLength();
					buffer.writeU32(fnId);
					buffer.writeU32(data.size());
					buffer.writeBytes(data);
					const endIndex = buffer.getLength();
					return createRange(start, endIndex);
				}

				// MAPPINGS
				const mappings: Array<[Entity, Entity]> = [[1 as Entity, 100 as Entity]];
				const [mappingsRange, mappingsCount] = serializeMappings(serializedData, mappings);
				updates.setMappings(mappingsRange, mappingsCount);

				// DESPAWNS
				const despawnEntity = serializedData.writeEntity(2 as Entity);
				updates.addDespawn(despawnEntity);

				// REMOVALS
				const removalEntity = serializedData.writeEntity(3 as Entity);
				const fnIds = serializedData.writeFnIds([10, 20]);
				updates.addRemovals(removalEntity, 2, fnIds);

				// CHANGES
				const changeEntity = serializedData.writeEntity(4 as Entity);
				const component = writeComponent(serializedData, 300, [1, 2, 3]);
				updates.startEntityChanges();
				updates.addChangedEntity(changeEntity);
				updates.addInsertedComponent(component);

				// 验证标志位
				const flags = updates.getFlags();
				expect(hasFlag(flags, UpdateMessageFlags.MAPPINGS)).to.equal(true);
				expect(hasFlag(flags, UpdateMessageFlags.DESPAWNS)).to.equal(true);
				expect(hasFlag(flags, UpdateMessageFlags.REMOVALS)).to.equal(true);
				expect(hasFlag(flags, UpdateMessageFlags.CHANGES)).to.equal(true);

				// 序列化和反序列化
				const tickRange = serializedData.writeTick(123);
				const message = updates.serialize(serializedData, tickRange);
				const deserialized = Updates.deserialize(message);

				// 验证所有段
				expect(deserialized.tick).to.equal(123);
				expect(deserialized.mappings.size()).to.equal(1);
				expect(deserialized.despawns.size()).to.equal(1);
				expect(deserialized.removals.size()).to.equal(1);
				expect(deserialized.changes.size()).to.equal(1);
			});
		});

		describe("清空和复用", () => {
			it("应该能够清空并复用内存", () => {
				// 添加一些数据
				const entity = serializedData.writeEntity(1 as Entity);
				const component = serializedData.writeBytes([1, 2, 3]);
				updates.startEntityChanges();
				updates.addChangedEntity(entity);
				updates.addInsertedComponent(component);

				expect(updates.isEmpty()).to.equal(false);

				// 清空
				updates.clear();

				// 验证为空
				expect(updates.isEmpty()).to.equal(true);
				expect(updates.getFlags()).to.equal(UpdateMessageFlags.NONE);

				// 复用
				const entity2 = serializedData.writeEntity(2 as Entity);
				updates.addDespawn(entity2);
				expect(updates.isEmpty()).to.equal(false);
			});
		});

		describe("往返测试 (Round-trip)", () => {
			it("序列化和反序列化应该保持数据一致", () => {
				const originalMappings: Array<[Entity, Entity]> = [
					[111 as Entity, 1111 as Entity],
					[222 as Entity, 2222 as Entity],
					[333 as Entity, 3333 as Entity],
				];

				const originalTick = 42;

				// 序列化
				const tickRange = serializedData.writeTick(originalTick);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, originalMappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// 反序列化
				const deserialized = Updates.deserialize(message);

				// 验证
				expect(deserialized.tick).to.equal(originalTick);
				expect(deserialized.mappings.size()).to.equal(originalMappings.size());

				for (let index = 0; index < originalMappings.size(); index++) {
					expect(deserialized.mappings[index][0]).to.equal(originalMappings[index][0]);
					expect(deserialized.mappings[index][1]).to.equal(originalMappings[index][1]);
				}
			});
		});
	});

	describe("消息标志位", () => {
		it("flagsToString 应该正确转换标志位", () => {
			expect(flagsToString(UpdateMessageFlags.NONE)).to.equal("NONE");
			expect(flagsToString(UpdateMessageFlags.MAPPINGS)).to.equal("MAPPINGS");
			const flagStr = flagsToString(UpdateMessageFlags.MAPPINGS | UpdateMessageFlags.DESPAWNS);
			expect(flagStr.find("MAPPINGS")[0] !== undefined).to.equal(true);
			const flagStr2 = flagsToString(UpdateMessageFlags.MAPPINGS | UpdateMessageFlags.DESPAWNS);
			expect(flagStr2.find("DESPAWNS")[0] !== undefined).to.equal(true);
		});

		it("hasFlag 应该正确检查标志位", () => {
			const flags = UpdateMessageFlags.MAPPINGS | UpdateMessageFlags.CHANGES;

			expect(hasFlag(flags, UpdateMessageFlags.MAPPINGS)).to.equal(true);
			expect(hasFlag(flags, UpdateMessageFlags.CHANGES)).to.equal(true);
			expect(hasFlag(flags, UpdateMessageFlags.DESPAWNS)).to.equal(false);
			expect(hasFlag(flags, UpdateMessageFlags.REMOVALS)).to.equal(false);
		});
	});

	describe("工具函数", () => {
		it("collectMappingsFromClients 应该正确合并多个客户端的映射", () => {
			const client1Mappings: Array<[Entity, Entity]> = [
				[1 as Entity, 10 as Entity],
				[2 as Entity, 20 as Entity],
			];

			const client2Mappings: Array<[Entity, Entity]> = [
				[3 as Entity, 30 as Entity],
				[4 as Entity, 40 as Entity],
			];

			const client3Mappings: Array<[Entity, Entity]> = [[5 as Entity, 50 as Entity]];

			const allMappings = collectMappingsFromClients([client1Mappings, client2Mappings, client3Mappings]);

			expect(allMappings.size()).to.equal(5);
			expect(allMappings[0][0]).to.equal(1);
			expect(allMappings[0][1]).to.equal(10);
			expect(allMappings[4][0]).to.equal(5);
			expect(allMappings[4][1]).to.equal(50);
		});

		it("collectMappingsFromClients 应该处理空数组", () => {
			const allMappings = collectMappingsFromClients([]);
			expect(allMappings.size()).to.equal(0);
		});

		it("serializeMappings 应该正确序列化并返回范围和长度", () => {
			const serializedData = new SerializedData();
			const mappings: Array<[Entity, Entity]> = [
				[100 as Entity, 1000 as Entity],
				[200 as Entity, 2000 as Entity],
			];

			const [range, length] = serializeMappings(serializedData, mappings);

			expect(length).to.equal(2);
			expect(range.start).to.equal(0);
			expect(range.end > 0).to.equal(true);
		});
	});

	describe("性能测试", () => {
		it("应该能高效序列化大量映射", () => {
			const mappings: Array<[Entity, Entity]> = [];
			for (let index = 0; index < 200; index++) {
				mappings.push([index as Entity, (index + 20000) as Entity]);
			}

			const serializedData = new SerializedData();
			const updates = new Updates();

			const startTime = os.clock();

			const tickRange = serializedData.writeTick(1000);
			const [mappingsRange, mappingsLength] = serializeMappings(serializedData, mappings);
			updates.setMappings(mappingsRange, mappingsLength);

			const message = updates.serialize(serializedData, tickRange);

			const serializeTime = os.clock() - startTime;
			expect(serializeTime < 0.05).to.equal(true); // 50ms 内
			expect(message.size() > 0).to.equal(true);
		});

		it("应该能高效反序列化大量映射", () => {
			const mappings: Array<[Entity, Entity]> = [];
			for (let index = 0; index < 200; index++) {
				mappings.push([index as Entity, (index + 20000) as Entity]);
			}

			const serializedData = new SerializedData();
			const updates = new Updates();

			const tickRange = serializedData.writeTick(1000);
			const [mappingsRange, mappingsLength] = serializeMappings(serializedData, mappings);
			updates.setMappings(mappingsRange, mappingsLength);

			const message = updates.serialize(serializedData, tickRange);

			const startTime = os.clock();
			const deserialized = Updates.deserialize(message);
			const deserializeTime = os.clock() - startTime;

			expect(deserializeTime < 0.05).to.equal(true); // 50ms 内
			expect(deserialized.mappings.size() > 0).to.equal(true);
		});
	});
};