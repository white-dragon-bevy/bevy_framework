/**
 * @fileoverview ClientVisibility 性能基准测试
 *
 * 验证增强功能的性能表现
 */

import { Entity } from "@rbxts/matter";
import {
	ChangeTrackingConfig,
	ClientVisibility,
	VisibilityConfig,
	VisibilityPolicy,
} from "../client-visibility";
import { ClientId } from "../../shared/backend/backend-state";

export = () => {
	describe("ClientVisibility Performance Benchmarks", () => {
		let visibility: ClientVisibility;

		afterEach(() => {
			if (visibility) {
				visibility.clear();
			}
		});

		it("should handle large scale visibility queries efficiently", () => {
			const entityCount = 1000;
			const clientCount = 50;

			const entities: Entity[] = [];
			const clients: ClientId[] = [];

			// 生成测试数据
			for (let index = 0; index < entityCount; index++) {
				entities.push(index as Entity);
			}

			for (let index = 0; index < clientCount; index++) {
				clients.push(index as ClientId);
			}

			// 初始化可见性系统
			const config: Partial<VisibilityConfig> = {
				policy: VisibilityPolicy.All,
			};

			const changeConfig: Partial<ChangeTrackingConfig> = {
				enabled: false, // 禁用变更跟踪以专注性能测试
				enablePerformanceTracking: true,
			};

			visibility = new ClientVisibility(config, changeConfig);

			// 初始化一些客户端映射
			for (let index = 0; index < 10; index++) {
				visibility.setEntityVisibility(entities[0], clients[index], false);
			}

			// 性能测试：批量查询
			const startTime = os.clock();

			const entityClientPairs: Array<[Entity, ClientId]> = [];
			for (let entityIndex = 0; entityIndex < 100; entityIndex++) {
				for (let clientIndex = 0; clientIndex < 10; clientIndex++) {
					entityClientPairs.push([entities[entityIndex], clients[clientIndex]]);
				}
			}

			const results = visibility.batchIsVisible(entityClientPairs);
			const batchQueryTime = os.clock() - startTime;

			// 验证结果
			expect(results.size()).to.equal(entityClientPairs.size());
			expect(batchQueryTime < 0.1).to.equal(true); // 应该在100ms内完成

			// 性能测试：单个查询循环
			const singleQueryStart = os.clock();
			for (const [entity, clientId] of entityClientPairs) {
				visibility.isEntityVisibleToClient(entity, clientId);
			}
			const singleQueryTime = os.clock() - singleQueryStart;

			// 批量查询应该更快或相当
			expect(batchQueryTime <= singleQueryTime * 1.1).to.equal(true);

			// 检查缓存效果
			const perfStats = visibility.getPerformanceStats();
			expect(perfStats.cacheHitRate > 0).to.equal(true);

			print(`批量查询时间: ${batchQueryTime * 1000}ms`);
			print(`单个查询时间: ${singleQueryTime * 1000}ms`);
			print(`缓存命中率: ${perfStats.cacheHitRate * 100}%`);
		});

		it("should efficiently handle change detection for large datasets", () => {
			const entityCount = 500;
			const clientCount = 20;

			const entities: Entity[] = [];
			const clients: ClientId[] = [];

			// 生成测试数据
			for (let index = 0; index < entityCount; index++) {
				entities.push(index as Entity);
			}

			for (let index = 0; index < clientCount; index++) {
				clients.push(index as ClientId);
			}

			// 初始化变更跟踪系统
			const config: Partial<VisibilityConfig> = {
				policy: VisibilityPolicy.Whitelist,
				defaultVisible: false,
			};

			const changeConfig: Partial<ChangeTrackingConfig> = {
				enabled: true,
				maxHistorySize: 1000,
				enablePerformanceTracking: true,
			};

			visibility = new ClientVisibility(config, changeConfig);

			// 初始化客户端
			for (const clientId of clients) {
				visibility.setEntityVisibility(entities[0], clientId, false);
			}

			// 建立基线
			let changes = visibility.computeChanges(entities);
			visibility.applyChanges(changes);

			// 模拟大量可见性变更
			const changeStartTime = os.clock();

			for (let entityIndex = 0; entityIndex < 100; entityIndex++) {
				for (let clientIndex = 0; clientIndex < 5; clientIndex++) {
					visibility.setEntityVisibility(
						entities[entityIndex],
						clients[clientIndex],
						entityIndex % 2 === 0,
					);
				}
			}

			// 计算变更
			changes = visibility.computeChanges(entities);
			const changeDetectionTime = os.clock() - changeStartTime;

			// 验证变更检测性能
			expect(changeDetectionTime < 0.05).to.equal(true); // 应该在50ms内完成

			// 验证变更结果
			expect(changes.becameVisible.size() > 0).to.equal(true);
			expect(changes.becameHidden.size() > 0).to.equal(true);

			// 应用变更
			const applyStartTime = os.clock();
			visibility.applyChanges(changes);
			const applyTime = os.clock() - applyStartTime;

			expect(applyTime < 0.01).to.equal(true); // 应该在10ms内完成

			const perfStats = visibility.getPerformanceStats();
			expect(perfStats.totalUpdates).to.equal(2); // 基线 + 变更检测

			print(`变更检测时间: ${changeDetectionTime * 1000}ms`);
			print(`应用变更时间: ${applyTime * 1000}ms`);
			print(`总查询次数: ${perfStats.totalQueries}`);
		});

		it("should demonstrate memory usage within reasonable bounds", () => {
			const entityCount = 2000;
			const clientCount = 100;

			const entities: Entity[] = [];
			const clients: ClientId[] = [];

			// 生成测试数据
			for (let index = 0; index < entityCount; index++) {
				entities.push(index as Entity);
			}

			for (let index = 0; index < clientCount; index++) {
				clients.push(index as ClientId);
			}

			// 初始化系统
			visibility = new ClientVisibility({
				policy: VisibilityPolicy.Whitelist,
			}, {
				enabled: true,
				enablePerformanceTracking: true,
			});

			// 添加大量映射
			for (let entityIndex = 0; entityIndex < entityCount; entityIndex++) {
				for (let clientIndex = 0; clientIndex < 10; clientIndex++) {
					visibility.setEntityVisibility(
						entities[entityIndex],
						clients[clientIndex],
						entityIndex % 3 === 0,
					);
				}
			}

			// 检查内存使用
			const perfStats = visibility.getPerformanceStats();
			const memUsage = perfStats.memoryUsage;

			// 验证内存使用在合理范围内（每MB应该能处理相当数量的映射）
			const totalMappings = entityCount * 10;
			const totalMemoryMB = memUsage.entityVisibilityMB + memUsage.clientVisibilityMB;

			// 粗略估算：每1000个映射应该小于1MB
			const expectedMaxMB = totalMappings / 500; // 比较宽松的估算
			expect(totalMemoryMB < expectedMaxMB).to.equal(true);

			// 测试清理效率
			const cleanupStartTime = os.clock();

			// 模拟一半实体被移除
			const remainingEntities: Entity[] = [];
			for (let index = 0; index < entityCount / 2; index++) {
				remainingEntities.push(entities[index]);
			}
			visibility.cleanupRemovedEntities(remainingEntities);

			const cleanupTime = os.clock() - cleanupStartTime;
			expect(cleanupTime < 0.1).to.equal(true); // 清理应该在100ms内完成

			// 验证内存确实被清理
			const afterCleanupStats = visibility.getPerformanceStats();
			const afterMemUsage = afterCleanupStats.memoryUsage;

			expect(afterMemUsage.entityVisibilityMB < memUsage.entityVisibilityMB).to.equal(true);

			print(`总映射数: ${totalMappings}`);
			print(`内存使用: ${string.format("%.2f", totalMemoryMB)}MB`);
			print(`清理时间: ${cleanupTime * 1000}ms`);
			print(`清理后内存: ${string.format("%.2f", afterMemUsage.entityVisibilityMB)}MB`);
		});

		it("should maintain performance with frequent cache expiration", () => {
			// 这个测试验证缓存过期机制不会显著影响性能
			const entityCount = 100;
			const clientCount = 10;

			const entities: Entity[] = [];
			const clients: ClientId[] = [];

			// 生成测试数据
			for (let index = 0; index < entityCount; index++) {
				entities.push(index as Entity);
			}

			for (let index = 0; index < clientCount; index++) {
				clients.push(index as ClientId);
			}

			visibility = new ClientVisibility({
				policy: VisibilityPolicy.All,
			}, {
				enabled: false,
				enablePerformanceTracking: true,
			});

			// 初始化客户端
			for (const clientId of clients) {
				visibility.setEntityVisibility(entities[0], clientId, false);
			}

			// 快速重复查询来触发缓存和过期
			const iterations = 1000;
			const startTime = os.clock();

			for (let iteration = 0; iteration < iterations; iteration++) {
				const entity = entities[iteration % entityCount];
				const clientId = clients[iteration % clientCount];

				visibility.isEntityVisibleToClient(entity, clientId);

				// 每100次查询后短暂暂停，让缓存过期
				if (iteration % 100 === 99) {
					wait(0.11); // 略大于缓存过期时间
				}
			}

			const totalTime = os.clock() - startTime;
			const avgTimePerQuery = totalTime / iterations;

			// 平均每次查询应该很快
			expect(avgTimePerQuery < 0.001).to.equal(true); // 小于1ms

			const perfStats = visibility.getPerformanceStats();
			expect(perfStats.totalQueries).to.equal(iterations);

			print(`总查询时间: ${totalTime * 1000}ms`);
			print(`平均查询时间: ${avgTimePerQuery * 1000}ms`);
			print(`最终缓存命中率: ${perfStats.cacheHitRate * 100}%`);
		});
	});
};
