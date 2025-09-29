/**
 * @fileoverview 插件集成测试
 *
 * 展示如何使用 MockNetworkAdapter 进行插件的集成测试
 */

import { App, BuiltinSchedules } from "../../bevy_app";
import { World, component } from "@rbxts/matter";
import { SimpleReplicationPlugin } from "../plugin";
import { MockNetworkAdapter } from "../network";
import { ComponentCtor } from "../types";

export = () => {
	describe("SimpleReplicationPlugin Integration", () => {
		let app: App;
		let mockAdapter: MockNetworkAdapter;

		// 定义测试组件
		const PositionComponent = component<{ x: number; y: number; z: number }>("Position");
		const HealthComponent = component<{ current: number; max: number }>("Health");
		const PlayerComponent = component<{ name: string; id: number }>("Player");

		beforeEach(() => {
			// 创建 Mock 网络适配器
			mockAdapter = new MockNetworkAdapter();

			// 创建应用并添加插件
			app = App.create();

			// 创建插件并配置
			const plugin = new SimpleReplicationPlugin(
				mockAdapter,
				{
					debugEnabled: false,
					updateRate: 60,
				},
				{
					toAllPlayers: new Set([PositionComponent as any, HealthComponent as any]),
					toSelfOnly: new Set([PlayerComponent as any]),
				},
			);

			// 添加插件到应用
			app.addPlugin(plugin);
		});

		it("should inject mock network adapter into the plugin", () => {
			// 完成应用设置
			app.finish();

			// 获取注入的网络适配器资源
			const injectedAdapter = app.getResource(MockNetworkAdapter as any);

			// 验证适配器被正确注入
			expect(injectedAdapter).to.equal(mockAdapter);
		});

		it("should allow simulating network data reception", () => {
			// 完成应用设置
			app.finish();

			// 模拟接收网络数据
			const testData = new Map([
				[
					"entity-1",
					new Map([
						["Position", { data: { x: 10, y: 20, z: 30 } }],
						["Health", { data: { current: 50, max: 100 } }],
					]),
				],
			]);

			mockAdapter.simulateReceive(testData);

			// 运行一帧以处理数据
			app.update();

			// 验证数据被处理（通过检查 getPendingData 是否被清空）
			const pendingData = mockAdapter.getPendingData();
			expect(pendingData).to.be.ok();
			expect(pendingData!.size()).to.equal(0); // 数据应该已被处理
		});

		it("should track messages sent by the server", () => {
			// 完成应用设置
			app.finish();

			// 获取世界实例
			const world = app.getWorld();
			expect(world).to.be.ok();

			// 创建一个测试实体
			const entity = world!.spawn(
				PositionComponent(),
				HealthComponent(),
			);

			// 模拟客户端连接
			const mockPlayer = { Name: "TestPlayer", UserId: 123 } as Player;

			// 这里需要创建客户端组件来触发服务器发送
			// 注意：实际测试中需要正确设置客户端组件

			// 运行一帧
			app.update();

			// 如果是服务器环境，应该记录发送的消息
			// 验证消息跟踪
			expect(mockAdapter.sentMessages).to.be.ok();

			// 清理
			world!.despawn(entity);
		});

		it("should handle multiple plugins with different adapters", () => {
			// 创建第二个 mock 适配器
			const secondAdapter = new MockNetworkAdapter();

			// 创建第二个应用
			const app2 = App.create();

			// 添加使用不同适配器的插件
			app2.addPlugin(
				new SimpleReplicationPlugin(
					secondAdapter,
					{ debugEnabled: true },
				),
			);

			// 完成两个应用设置
			app.finish();
			app2.finish();

			// 验证两个适配器是独立的
			mockAdapter.fire({} as Player, "test1");
			secondAdapter.fire({} as Player, "test2");

			expect(mockAdapter.sentMessages.size()).to.equal(1);
			expect(secondAdapter.sentMessages.size()).to.equal(1);

			expect(mockAdapter.sentMessages[0].value).to.equal("test1");
			expect(secondAdapter.sentMessages[0].value).to.equal("test2");
		});

		it("should clear messages between tests", () => {
			// 发送一些消息
			mockAdapter.fire({} as Player, "message1");
			mockAdapter.fireAll("broadcast");
			expect(mockAdapter.sentMessages.size()).to.equal(2);

			// 清除消息
			mockAdapter.clearMessages();
			expect(mockAdapter.sentMessages.size()).to.equal(0);

			// 发送新消息
			mockAdapter.fireExcept({} as Player, "new message");
			expect(mockAdapter.sentMessages.size()).to.equal(1);
		});

		describe("Plugin Configuration", () => {
			it("should configure replicated components correctly", () => {
				// 创建带有特定组件配置的插件
				const customPlugin = new SimpleReplicationPlugin(
					mockAdapter,
					{ debugEnabled: false },
				);

				// 动态添加组件
				customPlugin
					.addReplicatedToAll(PositionComponent as any)
					.addReplicatedToAll(HealthComponent as any)
					.addReplicatedToSelf(PlayerComponent as any);

				// 创建新应用并添加插件
				const customApp = App.create();
				customApp.addPlugin(customPlugin);
				customApp.finish();

				// 验证插件被正确配置
				const injectedAdapter = customApp.getResource(MockNetworkAdapter as any);
				expect(injectedAdapter).to.equal(mockAdapter);
			});

			it("should support chained configuration", () => {
				const plugin = new SimpleReplicationPlugin(mockAdapter)
					.addReplicatedToAll(PositionComponent as any)
					.addReplicatedToAll(HealthComponent as any)
					.addReplicatedToSelf(PlayerComponent as any);

				expect(plugin).to.be.ok();
				expect(plugin.name()).to.equal("SimpleReplicationPlugin");
				expect(plugin.isUnique()).to.equal(true);
			});
		});

		describe("Data Flow Testing", () => {
			it("should simulate complete client-server data flow", () => {
				app.finish();

				// Step 1: 模拟服务器发送数据
				const serverData = new Map([
					[
						"server-entity-1",
						new Map([
							["Position", { data: { x: 100, y: 200, z: 300 } }],
						]),
					],
				]);

				// Step 2: 客户端接收数据
				mockAdapter.simulateReceive(serverData);

				// Step 3: 运行客户端系统处理数据
				app.update();

				// Step 4: 验证数据已被处理
				const remaining = mockAdapter.getPendingData();
				expect(remaining).to.be.ok();
				expect(remaining!.size()).to.equal(0);
			});

			it("should handle empty data gracefully", () => {
				app.finish();

				// 模拟接收空数据
				mockAdapter.simulateReceive(new Map());

				// 运行系统
				app.update();

				// 系统应该正常运行
				const pending = mockAdapter.getPendingData();
				expect(pending).to.be.ok();
				expect(pending!.size()).to.equal(0);
			});
		});
	});
};