/**
 * @fileoverview 增强 ClientVisibility 系统测试
 *
 * 测试变更检测、性能优化、自动清理等增强功能
 */

import { Entity } from "@rbxts/matter";
import {
	ChangeTrackingConfig,
	ClientVisibility,
	VisibilityChange,
	VisibilityChangeSet,
	VisibilityConfig,
	VisibilityPolicy,
} from "../client-visibility";
import { ClientId } from "../../shared/backend/backend-state";

export = () => {
	describe("ClientVisibility Enhanced Features", () => {
		let visibility: ClientVisibility;
		let testEntities: Entity[];
		let testClients: ClientId[];

		beforeEach(() => {
			testEntities = [100, 101, 102, 103, 104] as Entity[];
			testClients = [1, 2, 3] as ClientId[];
		});

		afterEach(() => {
			if (visibility) {
				visibility.clear();
			}
		});

		describe("Change Tracking", () => {
			beforeEach(() => {
				const config: Partial<VisibilityConfig> = {
					policy: VisibilityPolicy.Whitelist,
					defaultVisible: false,
				};

				const changeConfig: Partial<ChangeTrackingConfig> = {
					enabled: true,
					maxHistorySize: 100,
					enablePerformanceTracking: true,
				};

				visibility = new ClientVisibility(config, changeConfig);

				// 初始化客户端
				for (const clientId of testClients) {
					visibility.setEntityVisibility(testEntities[0], clientId, false);
				}
			});

			it("should detect visibility changes correctly", () => {
				const entity = testEntities[0];
				const clientId = testClients[0];

				// 初始状态：不可见
				expect(visibility.isEntityVisibleToClient(entity, clientId)).to.equal(false);

				// 第一次计算变更 - 建立基线
				let changes = visibility.computeChanges([entity]);
				visibility.applyChanges(changes);

				// 设置为可见
				visibility.setEntityVisibility(entity, clientId, true);

				// 计算变更
				changes = visibility.computeChanges([entity]);

				expect(changes.becameVisible.size()).to.equal(1);
				expect(changes.becameVisible[0][0]).to.equal(entity);
				expect(changes.becameVisible[0][1]).to.equal(clientId);
				expect(changes.becameHidden.size()).to.equal(0);
			});

			it("should track change history", () => {
				const entity = testEntities[0];
				const clientId = testClients[0];

				// 建立基线
				let changes = visibility.computeChanges([entity]);
				visibility.applyChanges(changes);

				// 多次变更
				visibility.setEntityVisibility(entity, clientId, true);
				changes = visibility.computeChanges([entity]);
				visibility.applyChanges(changes);

				visibility.setEntityVisibility(entity, clientId, false);
				changes = visibility.computeChanges([entity]);
				visibility.applyChanges(changes);

				// 检查客户端的变更历史
				const clientChanges = visibility.getChangesForClient(clientId);
				expect(clientChanges.size()).to.equal(2);

				expect(clientChanges[0].wasVisible).to.equal(false);
				expect(clientChanges[0].isVisible).to.equal(true);
				expect(clientChanges[1].wasVisible).to.equal(true);
				expect(clientChanges[1].isVisible).to.equal(false);
			});

			it("should handle change tracking disable", () => {
				const entity = testEntities[0];
				const clientId = testClients[0];

				// 禁用变更跟踪
				visibility.enableChangeTracking(false);

				visibility.setEntityVisibility(entity, clientId, true);
				const changes = visibility.computeChanges([entity]);

				expect(changes.becameVisible.size()).to.equal(0);
				expect(changes.becameHidden.size()).to.equal(0);
				expect(changes.unchanged.size()).to.equal(0);
			});
		});

		describe("Performance Optimization", () => {
			beforeEach(() => {
				const config: Partial<VisibilityConfig> = {
					policy: VisibilityPolicy.All,
				};

				const changeConfig: Partial<ChangeTrackingConfig> = {
					enabled: false,
					enablePerformanceTracking: true,
				};

				visibility = new ClientVisibility(config, changeConfig);

				// 初始化客户端
				for (const clientId of testClients) {
					visibility.setEntityVisibility(testEntities[0], clientId, false);
				}
			});

			it("should cache query results", () => {
				const entity = testEntities[0];
				const clientId = testClients[0];

				// 第一次查询
				const result1 = visibility.isEntityVisibleToClient(entity, clientId);
				const stats1 = visibility.getPerformanceStats();

				// 第二次查询（应该命中缓存）
				const result2 = visibility.isEntityVisibleToClient(entity, clientId);
				const stats2 = visibility.getPerformanceStats();

				expect(result1).to.equal(result2);
				expect(stats2.totalQueries).to.equal(stats1.totalQueries + 1);
				expect(stats2.cacheHitRate > 0).to.equal(true);
			});

			it("should handle batch queries efficiently", () => {
				const entityClientPairs: Array<[Entity, ClientId]> = [];
				for (const entity of testEntities) {
					for (const clientId of testClients) {
						entityClientPairs.push([entity, clientId]);
					}
				}

				const results = visibility.batchIsVisible(entityClientPairs);
				expect(results.size()).to.equal(entityClientPairs.size());

				// 所有结果都应该是 true（因为策略是 All）
				for (const result of results) {
					expect(result).to.equal(true);
				}
			});

			it("should track performance statistics", () => {
				const entity = testEntities[0];
				const clientId = testClients[0];

				// 执行一些查询
				for (let index = 0; index < 10; index++) {
					visibility.isEntityVisibleToClient(entity, clientId);
				}

				const stats = visibility.getPerformanceStats();
				expect(stats.totalQueries).to.equal(10);
				expect(stats.lastQueryTime > 0).to.equal(true);

				// 重置统计
				visibility.resetPerformanceStats();
				const resetStats = visibility.getPerformanceStats();
				expect(resetStats.totalQueries).to.equal(0);
			});
		});

		describe("Automatic Cleanup", () => {
			beforeEach(() => {
				visibility = new ClientVisibility({
					policy: VisibilityPolicy.Whitelist,
				});

				// 设置初始状态
				for (const entity of testEntities) {
					for (const clientId of testClients) {
						visibility.setEntityVisibility(entity, clientId, true);
					}
				}
			});

			it("should cleanup removed entities", () => {
				// 初始统计
				const initialStats = visibility.getStats();
				expect(initialStats.totalEntities > 0).to.equal(true);

				// 模拟一些实体被移除
				const remainingEntities = [testEntities[0], testEntities[1]];
				visibility.cleanupRemovedEntities(remainingEntities);

				// 检查清理效果
				const afterStats = visibility.getStats();
				expect(afterStats.totalEntities < initialStats.totalEntities).to.equal(true);

				// 验证被移除的实体不再有可见性设置
				for (const clientId of testClients) {
					expect(visibility.isEntityVisibleToClient(testEntities[2], clientId)).to.equal(false);
					expect(visibility.isEntityVisibleToClient(testEntities[3], clientId)).to.equal(false);
				}
			});

			it("should cleanup disconnected clients", () => {
				// 初始统计
				const initialStats = visibility.getStats();
				expect(initialStats.totalClients > 0).to.equal(true);

				// 模拟一些客户端断开连接
				const activeClients = [testClients[0], testClients[1]];
				visibility.cleanupDisconnectedClients(activeClients);

				// 检查清理效果
				const afterStats = visibility.getStats();
				expect(afterStats.totalClients < initialStats.totalClients).to.equal(true);

				// 验证断开的客户端不再有可见性设置
				const visibleEntities = visibility.getVisibleEntities(testClients[2]);
				expect(visibleEntities.size()).to.equal(0);
			});
		});

		describe("Debug and Monitoring", () => {
			beforeEach(() => {
				const changeConfig: Partial<ChangeTrackingConfig> = {
					enabled: true,
					enablePerformanceTracking: true,
				};

				visibility = new ClientVisibility({
					policy: VisibilityPolicy.All,
				}, changeConfig);

				// 初始化一些数据
				for (const clientId of testClients) {
					visibility.setEntityVisibility(testEntities[0], clientId, false);
				}
			});

			it("should provide comprehensive debug information", () => {
				const debugInfo = visibility.exportDebugInfo();

				expect(debugInfo.config).to.be.ok();
				expect(debugInfo.changeTrackingConfig).to.be.ok();
				expect(debugInfo.stats).to.be.ok();
				expect(debugInfo.performanceStats).to.be.ok();
				expect(typeIs(debugInfo.cacheSize, "number")).to.equal(true);
				expect(typeIs(debugInfo.changeHistorySize, "number")).to.equal(true);
			});

			it("should calculate memory usage estimates", () => {
				// 添加一些数据
				for (const entity of testEntities) {
					for (const clientId of testClients) {
						visibility.setEntityVisibility(entity, clientId, true);
					}
				}

				const perfStats = visibility.getPerformanceStats();
				const memUsage = perfStats.memoryUsage;

				expect(memUsage.entityVisibilityMB >= 0).to.equal(true);
				expect(memUsage.clientVisibilityMB >= 0).to.equal(true);
				expect(typeIs(memUsage.cacheMB, "number")).to.equal(true);
				expect(typeIs(memUsage.changeTrackingMB, "number")).to.equal(true);
			});

			it("should track query and update performance", () => {
				const entity = testEntities[0];
				const clientId = testClients[0];

				// 执行一些操作
				for (let index = 0; index < 5; index++) {
					visibility.isEntityVisibleToClient(entity, clientId);
				}

				const changes = visibility.computeChanges([entity]);
				visibility.applyChanges(changes);

				const perfStats = visibility.getPerformanceStats();
				expect(perfStats.totalQueries).to.equal(5);
				expect(perfStats.totalUpdates).to.equal(1);
				expect(perfStats.lastQueryTime >= 0).to.equal(true);
				expect(perfStats.lastUpdateTime >= 0).to.equal(true);
			});
		});

		describe("Backward Compatibility", () => {
			it("should maintain compatibility with existing API", () => {
				// 使用原始构造函数
				visibility = new ClientVisibility();

				const entity = testEntities[0];
				const clientId = testClients[0];

				// 原始 API 应该正常工作
				visibility.setEntityVisibility(entity, clientId, true);
				expect(visibility.isEntityVisibleToClient(entity, clientId)).to.equal(true);

				visibility.setEntityGlobalVisibility(entity, true);
				expect(visibility.isEntityVisibleToClient(entity, clientId)).to.equal(true);

				const visibleEntities = visibility.getVisibleEntities(clientId);
				expect(visibleEntities.includes(entity)).to.equal(true);

				const visibleClients = visibility.getVisibleClients(entity);
				expect(visibleClients.includes(clientId)).to.equal(true);

				visibility.removeEntity(entity);
				expect(visibility.isEntityVisibleToClient(entity, clientId)).to.equal(true); // 策略为 All

				const stats = visibility.getStats();
				expect(stats).to.be.ok();
			});

			it("should handle undefined change tracking gracefully", () => {
				visibility = new ClientVisibility();

				// 变更跟踪默认禁用，应该返回空结果
				const changes = visibility.computeChanges(testEntities);
				expect(changes.becameVisible.size()).to.equal(0);
				expect(changes.becameHidden.size()).to.equal(0);
				expect(changes.unchanged.size()).to.equal(0);

				// 其他新功能应该可用但不影响核心功能
				const perfStats = visibility.getPerformanceStats();
				expect(perfStats).to.be.ok();

				const debugInfo = visibility.exportDebugInfo();
				expect(debugInfo).to.be.ok();
			});
		});
	});
};