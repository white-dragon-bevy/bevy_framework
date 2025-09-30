/**
 * @fileoverview MockNetworkAdapter 使用示例
 *
 * 展示如何在单元测试中使用 MockNetworkAdapter 进行网络模拟
 */

import { MockNetworkAdapter } from "../network";

export = () => {
	describe("MockNetworkAdapter Usage Examples", () => {
		let adapter: MockNetworkAdapter;

		beforeEach(() => {
			adapter = new MockNetworkAdapter();
		});

		afterEach(() => {
			adapter.clearMessages();
		});

		describe("Basic Message Tracking", () => {
			it("should track fire messages to specific players", () => {
				// 创建模拟玩家
				const player1 = { Name: "Player1", UserId: 1 } as Player;
				const player2 = { Name: "Player2", UserId: 2 } as Player;

				// 发送消息给特定玩家
				adapter.fire(player1, { type: "update", data: "test1" });
				adapter.fire(player2, { type: "update", data: "test2" });

				// 验证消息被记录
				expect(adapter.sentMessages.size()).to.equal(2);
				expect(adapter.sentMessages[0].type).to.equal("fire");
				expect(adapter.sentMessages[0].player).to.equal(player1);
				expect(adapter.sentMessages[1].player).to.equal(player2);
			});

			it("should track broadcast messages", () => {
				// 广播消息给所有玩家
				const broadcastData = { event: "gameStart", timestamp: os.time() };
				adapter.fireAll(broadcastData);

				// 验证广播被记录
				expect(adapter.sentMessages.size()).to.equal(1);
				expect(adapter.sentMessages[0].type).to.equal("fireAll");
				expect(adapter.sentMessages[0].value).to.equal(broadcastData);
				expect(adapter.sentMessages[0].player).to.never.be.ok();
			});

			it("should track exclusion messages", () => {
				const excludedPlayer = { Name: "ExcludedPlayer", UserId: 99 } as Player;
				const messageData = { notification: "Player joined" };

				// 发送消息给除特定玩家外的所有人
				adapter.fireExcept(excludedPlayer, messageData);

				// 验证排除消息被记录
				expect(adapter.sentMessages.size()).to.equal(1);
				expect(adapter.sentMessages[0].type).to.equal("fireExcept");
				expect(adapter.sentMessages[0].player).to.equal(excludedPlayer);
				expect(adapter.sentMessages[0].value).to.equal(messageData);
			});

			it("should track multicast messages", () => {
				const players = [
					{ Name: "Player1", UserId: 1 } as Player,
					{ Name: "Player2", UserId: 2 } as Player,
					{ Name: "Player3", UserId: 3 } as Player,
				];
				const groupMessage = { team: "red", action: "defend" };

				// 发送消息给玩家列表
				adapter.fireList(players, groupMessage);

				// 验证列表消息被记录
				expect(adapter.sentMessages.size()).to.equal(1);
				expect(adapter.sentMessages[0].type).to.equal("fireList");
				expect(adapter.sentMessages[0].value).to.equal(groupMessage);
			});
		});

		describe("Data Reception Simulation", () => {
			it("should simulate receiving data from server", () => {
				// 模拟从服务器接收的实体数据
				const entityData = new Map([
					[
						"entity-1",
						new Map([
							["Position", { data: { x: 10, y: 20, z: 30 } }],
							["Health", { data: { current: 75, max: 100 } }],
						]),
					],
					[
						"entity-2",
						new Map([
							["Position", { data: { x: 50, y: 60, z: 70 } }],
						]),
					],
				]);

				// 模拟接收数据
				adapter.simulateReceive(entityData);

				// 获取待处理的数据
				const pendingData = adapter.getPendingData();
				expect(pendingData).to.be.ok();
				expect(pendingData!.size()).to.equal(1);
				expect(pendingData![0]).to.equal(entityData);
			});

			it("should clear pending data after retrieval", () => {
				const testData = { message: "test" };

				// 模拟接收数据
				adapter.simulateReceive(testData);

				// 第一次获取
				const firstGet = adapter.getPendingData();
				expect(firstGet!.size()).to.equal(1);

				// 第二次获取应该为空
				const secondGet = adapter.getPendingData();
				expect(secondGet!.size()).to.equal(0);
			});

			it("should handle undefined values gracefully", () => {
				// 尝试模拟 undefined
				adapter.simulateReceive(undefined);

				// 应该不会添加到待处理数据
				const pendingData = adapter.getPendingData();
				expect(pendingData!.size()).to.equal(0);
			});
		});

		describe("Message History Management", () => {
			it("should clear message history", () => {
				const player = { Name: "TestPlayer", UserId: 123 } as Player;

				// 发送多个消息
				adapter.fire(player, "message1");
				adapter.fireAll("broadcast");
				adapter.fireExcept(player, "excluded");
				adapter.fireList([player], "list");

				expect(adapter.sentMessages.size()).to.equal(4);

				// 清除消息历史
				adapter.clearMessages();

				expect(adapter.sentMessages.size()).to.equal(0);
			});

			it("should maintain message order", () => {
				// 按顺序发送不同类型的消息
				adapter.fireAll("first");
				adapter.fire({} as Player, "second");
				adapter.fireExcept({} as Player, "third");
				adapter.fireList([], "fourth");

				// 验证消息顺序
				expect(adapter.sentMessages[0].value).to.equal("first");
				expect(adapter.sentMessages[1].value).to.equal("second");
				expect(adapter.sentMessages[2].value).to.equal("third");
				expect(adapter.sentMessages[3].value).to.equal("fourth");
			});
		});

		describe("Testing Scenarios", () => {
			it("should support testing server-to-client communication", () => {
				const player = { Name: "Client", UserId: 1 } as Player;
				const serverState = {
					entities: new Map([
						["e1", { x: 100, y: 200 }],
						["e2", { x: 300, y: 400 }],
					]),
				};

				// 模拟服务器发送状态更新
				adapter.fire(player, serverState);

				// 验证消息被发送
				const messages = adapter.sentMessages.filter(
					(msg) => msg.player === player,
				);
				expect(messages.size()).to.equal(1);
				expect(messages[0].value).to.equal(serverState);
			});

			it("should support testing client-to-server simulation", () => {
				// 模拟客户端输入
				const clientInput = {
					action: "move",
					direction: { x: 1, y: 0, z: 0 },
					timestamp: os.time(),
				};

				// 虽然 adapter 主要用于服务器->客户端，
				// 但我们可以使用 simulateReceive 来模拟客户端->服务器
				adapter.simulateReceive(clientInput);

				// 验证输入被接收
				const pending = adapter.getPendingData();
				expect(pending!.size()).to.equal(1);
				expect(pending![0]).to.equal(clientInput);
			});

			it("should support complex testing scenarios", () => {
				const players = [
					{ Name: "Alice", UserId: 1 } as Player,
					{ Name: "Bob", UserId: 2 } as Player,
				];

				// 场景：玩家加入游戏
				adapter.fireAll({ event: "player_joined", player: "Alice" });

				// 场景：发送初始状态给新玩家
				adapter.fire(players[0], { gameState: "initial" });

				// 场景：广播游戏开始，除了还在加载的玩家
				adapter.fireExcept(players[1], { event: "game_started" });

				// 场景：给队伍发送消息
				adapter.fireList(players, { team: "blue", message: "defend base" });

				// 验证所有场景的消息都被记录
				expect(adapter.sentMessages.size()).to.equal(4);

				// 验证每个场景
				expect(adapter.sentMessages[0].type).to.equal("fireAll");
				expect(adapter.sentMessages[1].type).to.equal("fire");
				expect(adapter.sentMessages[2].type).to.equal("fireExcept");
				expect(adapter.sentMessages[3].type).to.equal("fireList");
			});
		});

		describe("Integration with Plugin", () => {
			it("demonstrates how to inject into plugin", () => {
				// 这个测试展示了如何在插件初始化时注入 MockNetworkAdapter

				// 1. 创建 mock 适配器
				const mockAdapter = new MockNetworkAdapter();

				// 2. 注入到插件构造函数
				// const plugin = new SimpleReplicationPlugin(mockAdapter, config);

				// 3. 在测试中模拟网络交互
				mockAdapter.fire({} as Player, { test: "data" });

				// 4. 验证交互
				expect(mockAdapter.sentMessages.size()).to.equal(1);
			});
		});
	});
};