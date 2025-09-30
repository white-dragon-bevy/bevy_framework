/**
 * @fileoverview ClientEntityMap 单元测试
 */

import { Entity } from "@rbxts/matter";
import {
	clearMappings,
	createClientEntityMap,
	getClientEntity,
	getMappingCount,
	getMappings,
	getStats,
	hasMapping,
	insertMapping,
	insertManyMappings,
	isEmpty,
	removeMapping,
} from "../client-entity-map";

export = () => {
	describe("ClientEntityMap", () => {
		it("should start empty", () => {
			const entityMap = createClientEntityMap();

			expect(isEmpty(entityMap)).to.equal(true);
			expect(getMappingCount(entityMap)).to.equal(0);
			expect(getMappings(entityMap).size()).to.equal(0);
		});

		it("should insert mappings correctly", () => {
			let entityMap = createClientEntityMap();
			const serverEntity = 100 as Entity;
			const clientEntity = 200 as Entity;

			entityMap = insertMapping(entityMap, serverEntity, clientEntity);

			expect(isEmpty(entityMap)).to.equal(false);
			expect(getMappingCount(entityMap)).to.equal(1);
			expect(hasMapping(entityMap, serverEntity)).to.equal(true);
		});

		it("should retrieve client entity by server entity", () => {
			let entityMap = createClientEntityMap();
			const serverEntity = 100 as Entity;
			const clientEntity = 200 as Entity;

			entityMap = insertMapping(entityMap, serverEntity, clientEntity);

			const result = getClientEntity(entityMap, serverEntity);
			expect(result).to.equal(clientEntity);
		});

		it("should return undefined for non-existent server entity", () => {
			const entityMap = createClientEntityMap();
			const serverEntity = 100 as Entity;

			const result = getClientEntity(entityMap, serverEntity);
			expect(result).never.to.be.ok();
		});

		it("should accumulate multiple mappings", () => {
			let entityMap = createClientEntityMap();
			const mappings = [
				[100 as Entity, 1000 as Entity],
				[101 as Entity, 1001 as Entity],
				[102 as Entity, 1002 as Entity],
			] as Array<[Entity, Entity]>;

			for (const [server, client] of mappings) {
				entityMap = insertMapping(entityMap, server, client);
			}

			expect(getMappingCount(entityMap)).to.equal(3);

			const retrieved = getMappings(entityMap);
			expect(retrieved.size()).to.equal(3);

			for (let index = 0; index < mappings.size(); index++) {
				expect(retrieved[index][0]).to.equal(mappings[index][0]);
				expect(retrieved[index][1]).to.equal(mappings[index][1]);
			}
		});

		it("should clear all mappings", () => {
			let entityMap = createClientEntityMap();
			entityMap = insertMapping(entityMap, 100 as Entity, 1000 as Entity);
			entityMap = insertMapping(entityMap, 101 as Entity, 1001 as Entity);

			expect(getMappingCount(entityMap)).to.equal(2);

			entityMap = clearMappings(entityMap);

			expect(isEmpty(entityMap)).to.equal(true);
			expect(getMappingCount(entityMap)).to.equal(0);
			expect(getMappings(entityMap).size()).to.equal(0);
		});

		it("should remove specific mapping", () => {
			let entityMap = createClientEntityMap();
			const serverEntity1 = 100 as Entity;
			const clientEntity1 = 1000 as Entity;
			const serverEntity2 = 101 as Entity;
			const clientEntity2 = 1001 as Entity;

			entityMap = insertMapping(entityMap, serverEntity1, clientEntity1);
			entityMap = insertMapping(entityMap, serverEntity2, clientEntity2);

			expect(getMappingCount(entityMap)).to.equal(2);

			entityMap = removeMapping(entityMap, serverEntity1);

			expect(getMappingCount(entityMap)).to.equal(1);
			expect(hasMapping(entityMap, serverEntity1)).to.equal(false);
			expect(hasMapping(entityMap, serverEntity2)).to.equal(true);
		});

		it("should allow duplicate insertions of same mapping", () => {
			let entityMap = createClientEntityMap();
			const serverEntity = 100 as Entity;
			const clientEntity = 200 as Entity;

			entityMap = insertMapping(entityMap, serverEntity, clientEntity);
			entityMap = insertMapping(entityMap, serverEntity, clientEntity);

			expect(getMappingCount(entityMap)).to.equal(2);
		});

		it("should batch insert mappings", () => {
			let entityMap = createClientEntityMap();
			const mappings = [
				[100 as Entity, 1000 as Entity],
				[101 as Entity, 1001 as Entity],
				[102 as Entity, 1002 as Entity],
			] as Array<[Entity, Entity]>;

			entityMap = insertManyMappings(entityMap, mappings);

			expect(getMappingCount(entityMap)).to.equal(3);

			for (const [server, client] of mappings) {
				expect(getClientEntity(entityMap, server)).to.equal(client);
			}
		});

		it("should provide accurate stats", () => {
			let entityMap = createClientEntityMap();
			entityMap = insertMapping(entityMap, 100 as Entity, 1000 as Entity);
			entityMap = insertMapping(entityMap, 101 as Entity, 1001 as Entity);

			const stats = getStats(entityMap);

			expect(stats.totalMappings).to.equal(2);
		});

		it("should return read-only mappings array", () => {
			let entityMap = createClientEntityMap();
			const serverEntity = 100 as Entity;
			const clientEntity = 200 as Entity;

			entityMap = insertMapping(entityMap, serverEntity, clientEntity);

			const mappings = getMappings(entityMap);

			expect(mappings.size()).to.equal(1);
		});

		it("should handle edge case with entity ID 0", () => {
			let entityMap = createClientEntityMap();
			const serverEntity = 0 as Entity;
			const clientEntity = 1000 as Entity;

			entityMap = insertMapping(entityMap, serverEntity, clientEntity);

			expect(hasMapping(entityMap, serverEntity)).to.equal(true);
			expect(getClientEntity(entityMap, serverEntity)).to.equal(clientEntity);
		});

		it("should maintain insertion order", () => {
			let entityMap = createClientEntityMap();
			const mappings = [
				[100 as Entity, 1000 as Entity],
				[101 as Entity, 1001 as Entity],
				[102 as Entity, 1002 as Entity],
			] as Array<[Entity, Entity]>;

			for (const [server, client] of mappings) {
				entityMap = insertMapping(entityMap, server, client);
			}

			const retrieved = getMappings(entityMap);

			for (let index = 0; index < mappings.size(); index++) {
				expect(retrieved[index][0]).to.equal(mappings[index][0]);
				expect(retrieved[index][1]).to.equal(mappings[index][1]);
			}
		});

		it("should handle large number of mappings", () => {
			let entityMap = createClientEntityMap();
			const count = 1000;

			for (let index = 0; index < count; index++) {
				entityMap = insertMapping(entityMap, index as Entity, (index + 10000) as Entity);
			}

			expect(getMappingCount(entityMap)).to.equal(count);

			for (let index = 0; index < count; index++) {
				const clientEntity = getClientEntity(entityMap, index as Entity);
				expect(clientEntity).to.equal((index + 10000) as Entity);
			}
		});

		it("should be immutable", () => {
			const original = createClientEntityMap();
			const serverEntity = 100 as Entity;
			const clientEntity = 200 as Entity;

			const updated = insertMapping(original, serverEntity, clientEntity);

			expect(getMappingCount(original)).to.equal(0);
			expect(getMappingCount(updated)).to.equal(1);
		});
	});

	describe("createClientEntityMap", () => {
		it("should create empty ClientEntityMap", () => {
			const entityMap = createClientEntityMap();

			expect(isEmpty(entityMap)).to.equal(true);
			expect(getMappingCount(entityMap)).to.equal(0);
		});

		it("should create independent instances", () => {
			let entityMap1 = createClientEntityMap();
			const entityMap2 = createClientEntityMap();

			entityMap1 = insertMapping(entityMap1, 100 as Entity, 200 as Entity);

			expect(getMappingCount(entityMap1)).to.equal(1);
			expect(getMappingCount(entityMap2)).to.equal(0);
		});
	});
};