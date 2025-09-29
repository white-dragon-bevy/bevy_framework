/**
 * @fileoverview Mutations 消息单元测试
 *
 * 测试 Mutations 消息的序列化和反序列化功能
 */

import { Mutations } from "../mutations";
import { SerializedData } from "../serialized-data";

export = () => {
	describe("Mutations", () => {
		let mutations: Mutations;
		let serializedData: SerializedData;

		beforeEach(() => {
			mutations = new Mutations();
			serializedData = new SerializedData();
		});

		afterEach(() => {
			mutations.clear();
			serializedData.clear();
		});

		it("should start empty", () => {
			expect(mutations.isEmpty()).to.equal(true);
			expect(mutations.getEntitiesCount()).to.equal(0);
		});

		it("should track entity addition state", () => {
			mutations.startEntity();
			expect(mutations.entityWasAdded()).to.equal(false);

			const entity = 1 as never;
			const entityRange = serializedData.writeEntity(entity);

			mutations.addEntity(entity, entityRange);
			expect(mutations.entityWasAdded()).to.equal(true);

			mutations.startEntity();
			expect(mutations.entityWasAdded()).to.equal(false);
		});

		it("should add entity with components", () => {
			mutations.startEntity();

			const entity = 42 as never;
			const entityRange = serializedData.writeEntity(entity);

			mutations.addEntity(entity, entityRange);
			expect(mutations.isEmpty()).to.equal(false);
			expect(mutations.getEntitiesCount()).to.equal(1);

			// 添加组件 (FnsId + Size + Data)
			const fnId1 = 10;
			const componentData1 = [1, 2, 3, 4];
			const fnIdRange1 = serializedData.writeU32(fnId1);
			const sizeRange1 = serializedData.writeU32(componentData1.size());
			const dataRange1 = serializedData.writeBytes(componentData1);

			mutations.addComponent(fnIdRange1);

			const entities = mutations.getEntities();
			expect(entities.size()).to.equal(1);
			expect(entities[0].entity).to.equal(entity);
			expect(entities[0].componentsLength).to.equal(1);
		});

		it("should add multiple components to entity", () => {
			mutations.startEntity();

			const entity = 100 as never;
			const entityRange = serializedData.writeEntity(entity);

			mutations.addEntity(entity, entityRange);

			// 添加第一个组件
			const fnId1 = 1;
			const data1 = [10, 20];
			const range1Start = serializedData.getLength();
			serializedData.writeU32(fnId1);
			serializedData.writeU32(data1.size());
			serializedData.writeBytes(data1);
			const range1End = serializedData.getLength();

			mutations.addComponent({ start: range1Start, end: range1End });

			// 写入一些额外数据,确保组件不相邻
			serializedData.writeBytes([99, 99, 99]);

			// 添加第二个组件
			const fnId2 = 2;
			const data2 = [30, 40, 50];
			const range2Start = serializedData.getLength();
			serializedData.writeU32(fnId2);
			serializedData.writeU32(data2.size());
			serializedData.writeBytes(data2);
			const range2End = serializedData.getLength();

			mutations.addComponent({ start: range2Start, end: range2End });

			const entities = mutations.getEntities();
			expect(entities[0].componentsLength).to.equal(2);
			expect(entities[0].components.size()).to.equal(2);
		});

		it("should merge adjacent component ranges", () => {
			mutations.startEntity();

			const entity = 1 as never;
			const entityRange = serializedData.writeEntity(entity);

			mutations.addEntity(entity, entityRange);

			// 添加相邻的组件范围
			const range1Start = serializedData.getLength();
			serializedData.writeBytes([1, 2, 3]);
			const range1End = serializedData.getLength();

			mutations.addComponent({ start: range1Start, end: range1End });

			const range2Start = range1End; // 相邻
			serializedData.writeBytes([4, 5, 6]);
			const range2End = serializedData.getLength();

			mutations.addComponent({ start: range2Start, end: range2End });

			const entities = mutations.getEntities();
			expect(entities[0].componentsLength).to.equal(2);
			// 应该合并成一个范围
			expect(entities[0].components.size()).to.equal(1);
			expect(entities[0].components[0].start).to.equal(range1Start);
			expect(entities[0].components[0].end).to.equal(range2End);
		});

		it("should add multiple entities", () => {
			// 第一个实体
			mutations.startEntity();
			const entity1 = 1 as never;
			const entityRange1 = serializedData.writeEntity(entity1);
			mutations.addEntity(entity1, entityRange1);

			// 第二个实体
			mutations.startEntity();
			const entity2 = 2 as never;
			const entityRange2 = serializedData.writeEntity(entity2);
			mutations.addEntity(entity2, entityRange2);

			expect(mutations.getEntitiesCount()).to.equal(2);

			const entities = mutations.getEntities();
			expect(entities[0].entity).to.equal(entity1);
			expect(entities[1].entity).to.equal(entity2);
		});

		it("should serialize and deserialize empty message", () => {
			const updateTick = 10;
			const serverTick = 100;

			const updateTickRange = serializedData.writeTick(updateTick);
			const serverTickRange = serializedData.writeTick(serverTick);

			const message = mutations.serialize(serializedData, updateTickRange, serverTickRange);

			const result = Mutations.deserialize(message);

			expect(result.updateTick).to.equal(updateTick);
			expect(result.serverTick).to.equal(serverTick);
			expect(result.entities.size()).to.equal(0);
		});

		it("should serialize and deserialize single entity with one component", () => {
			const updateTick = 5;
			const serverTick = 50;

			const updateTickRange = serializedData.writeTick(updateTick);
			const serverTickRange = serializedData.writeTick(serverTick);

			mutations.startEntity();

			const entity = 42 as never;
			const entityRange = serializedData.writeEntity(entity);
			mutations.addEntity(entity, entityRange);

			// 添加组件
			const fnId = 123;
			const componentData = [1, 2, 3, 4, 5];
			const componentStart = serializedData.getLength();
			serializedData.writeU32(fnId);
			serializedData.writeU32(componentData.size());
			serializedData.writeBytes(componentData);
			const componentEnd = serializedData.getLength();

			mutations.addComponent({ start: componentStart, end: componentEnd });

			const message = mutations.serialize(serializedData, updateTickRange, serverTickRange);

			const result = Mutations.deserialize(message);

			expect(result.updateTick).to.equal(updateTick);
			expect(result.serverTick).to.equal(serverTick);
			expect(result.entities.size()).to.equal(1);
			expect(result.entities[0].entity).to.equal(entity);
			expect(result.entities[0].components.size()).to.equal(1);
		});

		it("should serialize and deserialize multiple entities with multiple components", () => {
			const updateTick = 15;
			const serverTick = 150;

			const updateTickRange = serializedData.writeTick(updateTick);
			const serverTickRange = serializedData.writeTick(serverTick);

			// 第一个实体,两个组件
			mutations.startEntity();
			const entity1 = 10 as never;
			const entityRange1 = serializedData.writeEntity(entity1);
			mutations.addEntity(entity1, entityRange1);

			const component1Start1 = serializedData.getLength();
			serializedData.writeU32(1); // FnsId
			serializedData.writeU32(2); // Size
			serializedData.writeBytes([100, 200]); // Data
			const component1End1 = serializedData.getLength();
			mutations.addComponent({ start: component1Start1, end: component1End1 });

			const component1Start2 = serializedData.getLength();
			serializedData.writeU32(2);
			serializedData.writeU32(3);
			serializedData.writeBytes([10, 20, 30]);
			const component1End2 = serializedData.getLength();
			mutations.addComponent({ start: component1Start2, end: component1End2 });

			// 第二个实体,一个组件
			mutations.startEntity();
			const entity2 = 20 as never;
			const entityRange2 = serializedData.writeEntity(entity2);
			mutations.addEntity(entity2, entityRange2);

			const component2Start1 = serializedData.getLength();
			serializedData.writeU32(5);
			serializedData.writeU32(1);
			serializedData.writeBytes([255]);
			const component2End1 = serializedData.getLength();
			mutations.addComponent({ start: component2Start1, end: component2End1 });

			const message = mutations.serialize(serializedData, updateTickRange, serverTickRange);

			const result = Mutations.deserialize(message);

			expect(result.updateTick).to.equal(updateTick);
			expect(result.serverTick).to.equal(serverTick);
			expect(result.entities.size()).to.equal(2);

			expect(result.entities[0].entity).to.equal(entity1);
			expect(result.entities[0].components.size()).to.equal(2);

			expect(result.entities[1].entity).to.equal(entity2);
			expect(result.entities[1].components.size()).to.equal(1);
		});

		it("should clear and reuse memory", () => {
			mutations.startEntity();
			const entity = 1 as never;
			const entityRange = serializedData.writeEntity(entity);
			mutations.addEntity(entity, entityRange);

			mutations.clear();

			expect(mutations.isEmpty()).to.equal(true);
			expect(mutations.getEntitiesCount()).to.equal(0);

			// 可以重新使用
			mutations.startEntity();
			const newEntity = 2 as never;
			const newEntityRange = serializedData.writeEntity(newEntity);
			mutations.addEntity(newEntity, newEntityRange);

			expect(mutations.isEmpty()).to.equal(false);
			expect(mutations.getEntitiesCount()).to.equal(1);
		});

		it("should error when adding component before entity", () => {
			const componentRange = { start: 0, end: 10 };

			expect(() => {
				mutations.addComponent(componentRange);
			}).to.throw();
		});
	});
};