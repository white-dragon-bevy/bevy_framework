/**
 * @fileoverview 实体映射系统端到端集成测试
 *
 * 测试完整的客户端预测流程:
 * 1. 服务器收集 ClientEntityMap 映射
 * 2. 序列化为 Updates 消息
 * 3. 客户端反序列化消息
 * 4. 应用映射到 ServerEntityMap
 */

import { Entity } from "@rbxts/matter";
import { clearMappings, createClientEntityMap, getMappings, insertMapping } from "../../../server/client-entity-map";
import { SerializedData } from "../serialized-data";
import { ServerEntityMap } from "../server-entity-map";
import { collectMappingsFromClients, serializeMappings, Updates } from "../updates";

export = (): void => {
	describe("实体映射系统集成测试", () => {
		describe("完整流程: 服务器 -> 客户端", () => {
			it("应该正确传输单个客户端的映射", () => {
				// === 服务器端 ===

				// 1. 创建客户端实体映射 (模拟客户端预生成)
				let clientEntityMap = createClientEntityMap();

				const serverBullet = 1001 as Entity;
				const clientBullet = 5001 as Entity;

				clientEntityMap = insertMapping(clientEntityMap, serverBullet, clientBullet);

				// 2. 收集映射
				const allMappings = collectMappingsFromClients([getMappings(clientEntityMap)]);
				expect(allMappings.size()).to.equal(1);

				// 3. 序列化
				const serializedData = new SerializedData();
				const updates = new Updates();

				const currentTick = 100;
				const tickRange = serializedData.writeTick(currentTick);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, allMappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// 4. 清空映射 (模拟发送后清空)
				clientEntityMap = clearMappings(clientEntityMap);
				expect(getMappings(clientEntityMap).size()).to.equal(0);

				// === 客户端 ===

				// 5. 反序列化消息
				const deserialized = Updates.deserialize(message);

				expect(deserialized.tick).to.equal(currentTick);
				expect(deserialized.mappings.size()).to.equal(1);

				// 6. 应用映射到 ServerEntityMap
				const serverEntityMap = new ServerEntityMap();

				for (const [server, client] of deserialized.mappings) {
					serverEntityMap.addMapping(server, client);
				}

				// 7. 验证映射
				expect(serverEntityMap.getClientEntity(serverBullet)).to.equal(clientBullet);
				expect(serverEntityMap.getServerEntity(clientBullet)).to.equal(serverBullet);
			});

			it("应该正确传输多个客户端的映射", () => {
				// === 服务器端 ===

				// 客户端 1 的映射
				let client1Map = createClientEntityMap();
				client1Map = insertMapping(client1Map, 100 as Entity, 1000 as Entity);
				client1Map = insertMapping(client1Map, 101 as Entity, 1001 as Entity);

				// 客户端 2 的映射
				let client2Map = createClientEntityMap();
				client2Map = insertMapping(client2Map, 200 as Entity, 2000 as Entity);
				client2Map = insertMapping(client2Map, 201 as Entity, 2001 as Entity);
				client2Map = insertMapping(client2Map, 202 as Entity, 2002 as Entity);

				// 收集所有映射
				const allMappings = collectMappingsFromClients([getMappings(client1Map), getMappings(client2Map)]);

				expect(allMappings.size()).to.equal(5);

				// 序列化
				const serializedData = new SerializedData();
				const updates = new Updates();

				const tickRange = serializedData.writeTick(200);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, allMappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// === 客户端 1 ===

				const deserialized1 = Updates.deserialize(message);
				const serverEntityMap1 = new ServerEntityMap();

				for (const [server, client] of deserialized1.mappings) {
					// 客户端 1 只关心自己的映射
					if (client === 1000 || client === 1001) {
						serverEntityMap1.addMapping(server, client);
					}
				}

				expect(serverEntityMap1.getMappingCount()).to.equal(2);
				expect(serverEntityMap1.getClientEntity(100 as Entity)).to.equal(1000);
				expect(serverEntityMap1.getClientEntity(101 as Entity)).to.equal(1001);

				// === 客户端 2 ===

				const deserialized2 = Updates.deserialize(message);
				const serverEntityMap2 = new ServerEntityMap();

				for (const [server, client] of deserialized2.mappings) {
					// 客户端 2 只关心自己的映射
					if (client === 2000 || client === 2001 || client === 2002) {
						serverEntityMap2.addMapping(server, client);
					}
				}

				expect(serverEntityMap2.getMappingCount()).to.equal(3);
				expect(serverEntityMap2.getClientEntity(200 as Entity)).to.equal(2000);
				expect(serverEntityMap2.getClientEntity(201 as Entity)).to.equal(2001);
				expect(serverEntityMap2.getClientEntity(202 as Entity)).to.equal(2002);
			});

			it("应该处理空映射消息", () => {
				// 服务器端
				const serializedData = new SerializedData();
				const updates = new Updates();

				const tickRange = serializedData.writeTick(50);
				// 不设置任何映射

				const message = updates.serialize(serializedData, tickRange);

				// 客户端
				const deserialized = Updates.deserialize(message);

				expect(deserialized.tick).to.equal(50);
				expect(deserialized.mappings.size()).to.equal(0);
			});
		});

		describe("客户端预测场景", () => {
			it("应该支持射击子弹的客户端预测", () => {
				// === 场景: 客户端射击子弹 ===

				// 1. 客户端立即生成子弹实体
				const clientBulletEntity = 9999 as Entity;

				// 2. 客户端发送射击事件到服务器 (包含客户端实体 ID)
				// (这里模拟服务器接收)
				const receivedClientBulletEntity = clientBulletEntity;

				// === 服务器端 ===

				// 3. 服务器验证后生成自己的子弹实体
				const serverBulletEntity = 1234 as Entity;

				// 4. 服务器注册映射
				let clientMap = createClientEntityMap();
				clientMap = insertMapping(clientMap, serverBulletEntity, receivedClientBulletEntity);

				// 5. 序列化并发送
				const serializedData = new SerializedData();
				const updates = new Updates();

				const tickRange = serializedData.writeTick(150);
				const allMappings = collectMappingsFromClients([getMappings(clientMap)]);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, allMappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// === 客户端接收 ===

				// 6. 反序列化
				const deserialized = Updates.deserialize(message);

				// 7. 应用映射
				const serverEntityMap = new ServerEntityMap();
				for (const [server, client] of deserialized.mappings) {
					serverEntityMap.addMapping(server, client);
				}

				// 8. 验证: 服务器子弹映射到客户端预生成的子弹
				expect(serverEntityMap.getClientEntity(serverBulletEntity)).to.equal(clientBulletEntity);

				// 9. 后续组件更新会应用到客户端的原始实体
				// (这里只验证映射存在)
				expect(serverEntityMap.hasServerEntity(serverBulletEntity)).to.equal(true);
				expect(serverEntityMap.hasClientEntity(clientBulletEntity)).to.equal(true);
			});

			it("应该支持多个玩家同时预测", () => {
				// === 场景: 两个玩家同时射击 ===

				// 客户端 1 预测
				const player1ClientBullet = 8001 as Entity;

				// 客户端 2 预测
				const player2ClientBullet = 8002 as Entity;

				// === 服务器端 ===

				// 服务器为玩家 1 生成子弹
				const player1ServerBullet = 1001 as Entity;
				let player1Map = createClientEntityMap();
				player1Map = insertMapping(player1Map, player1ServerBullet, player1ClientBullet);

				// 服务器为玩家 2 生成子弹
				const player2ServerBullet = 1002 as Entity;
				let player2Map = createClientEntityMap();
				player2Map = insertMapping(player2Map, player2ServerBullet, player2ClientBullet);

				// 收集并序列化
				const allMappings = collectMappingsFromClients([getMappings(player1Map), getMappings(player2Map)]);

				const serializedData = new SerializedData();
				const updates = new Updates();

				const tickRange = serializedData.writeTick(300);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, allMappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const message = updates.serialize(serializedData, tickRange);

				// === 客户端 1 接收 ===
				const deserialized1 = Updates.deserialize(message);
				const player1EntityMap = new ServerEntityMap();

				for (const [server, client] of deserialized1.mappings) {
					if (client === player1ClientBullet) {
						player1EntityMap.addMapping(server, client);
					}
				}

				expect(player1EntityMap.getMappingCount()).to.equal(1);
				expect(player1EntityMap.getClientEntity(player1ServerBullet)).to.equal(player1ClientBullet);

				// === 客户端 2 接收 ===
				const deserialized2 = Updates.deserialize(message);
				const player2EntityMap = new ServerEntityMap();

				for (const [server, client] of deserialized2.mappings) {
					if (client === player2ClientBullet) {
						player2EntityMap.addMapping(server, client);
					}
				}

				expect(player2EntityMap.getMappingCount()).to.equal(1);
				expect(player2EntityMap.getClientEntity(player2ServerBullet)).to.equal(player2ClientBullet);
			});
		});

		describe("边界情况", () => {
			it("应该处理大量映射 (压力测试)", () => {
				const mappingCount = 100;

				// 创建大量映射
				let clientMap = createClientEntityMap();
				for (let index = 0; index < mappingCount; index++) {
					clientMap = insertMapping(clientMap, index as Entity, (index + 10000) as Entity);
				}

				// 序列化
				const serializedData = new SerializedData();
				const updates = new Updates();

				const tickRange = serializedData.writeTick(500);
				const allMappings = collectMappingsFromClients([getMappings(clientMap)]);
				const [mappingsRange, mappingsLength] = serializeMappings(serializedData, allMappings);
				updates.setMappings(mappingsRange, mappingsLength);

				const startTime = os.clock();
				const message = updates.serialize(serializedData, tickRange);
				const serializeTime = os.clock() - startTime;

				expect(serializeTime < 0.1).to.equal(true); // 100ms 内

				// 反序列化
				const deserializeStart = os.clock();
				const deserialized = Updates.deserialize(message);
				const deserializeTime = os.clock() - deserializeStart;

				expect(deserializeTime < 0.1).to.equal(true);
				expect(deserialized.mappings.size() > 0).to.equal(true);

				// 应用映射
				const serverEntityMap = new ServerEntityMap();
				for (const [server, client] of deserialized.mappings) {
					serverEntityMap.addMapping(server, client);
				}

				expect(serverEntityMap.getMappingCount() > 0).to.equal(true);
			});

			it("应该正确处理映射重复", () => {
				// 服务器端
				let clientMap = createClientEntityMap();
				clientMap = insertMapping(clientMap, 100 as Entity, 1000 as Entity);

				// 序列化第一次
				const serializedData1 = new SerializedData();
				const updates1 = new Updates();
				const tickRange1 = serializedData1.writeTick(10);
				const allMappings1 = collectMappingsFromClients([getMappings(clientMap)]);
				const [mappingsRange1, mappingsLength1] = serializeMappings(serializedData1, allMappings1);
				updates1.setMappings(mappingsRange1, mappingsLength1);
				const message1 = updates1.serialize(serializedData1, tickRange1);

				// 客户端应用
				const serverEntityMap = new ServerEntityMap();
				const deserialized1 = Updates.deserialize(message1);
				for (const [server, client] of deserialized1.mappings) {
					serverEntityMap.addMapping(server, client);
				}

				expect(serverEntityMap.getMappingCount()).to.equal(1);

				// 服务器清空并添加新映射
				clientMap = clearMappings(clientMap);
				clientMap = insertMapping(clientMap, 101 as Entity, 1001 as Entity);

				// 序列化第二次
				const serializedData2 = new SerializedData();
				const updates2 = new Updates();
				const tickRange2 = serializedData2.writeTick(20);
				const allMappings2 = collectMappingsFromClients([getMappings(clientMap)]);
				const [mappingsRange2, mappingsLength2] = serializeMappings(serializedData2, allMappings2);
				updates2.setMappings(mappingsRange2, mappingsLength2);
				const message2 = updates2.serialize(serializedData2, tickRange2);

				// 客户端应用第二次
				const deserialized2 = Updates.deserialize(message2);
				for (const [server, client] of deserialized2.mappings) {
					serverEntityMap.addMapping(server, client);
				}

				// 应该有两个映射
				expect(serverEntityMap.getMappingCount()).to.equal(2);
			});
		});
	});
};