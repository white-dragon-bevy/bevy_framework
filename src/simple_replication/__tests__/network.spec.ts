/**
 * @fileoverview 网络适配器单元测试
 */

import { MockNetworkAdapter } from "../network";

export = () => {
	describe("MockNetworkAdapter", () => {
		let adapter: MockNetworkAdapter;

		beforeEach(() => {
			adapter = new MockNetworkAdapter();
		});

		afterEach(() => {
			adapter.clearMessages();
		});

		it("should track fire messages", () => {
			const mockPlayer = {} as Player;
			const testValue = { data: "test" };

			adapter.fire(mockPlayer, testValue);

			expect(adapter.sentMessages.size()).to.equal(1);
			expect(adapter.sentMessages[0].type).to.equal("fire");
			expect(adapter.sentMessages[0].player).to.equal(mockPlayer);
			expect(adapter.sentMessages[0].value).to.equal(testValue);
		});

		it("should track fireAll messages", () => {
			const testValue = { broadcast: true };

			adapter.fireAll(testValue);

			expect(adapter.sentMessages.size()).to.equal(1);
			expect(adapter.sentMessages[0].type).to.equal("fireAll");
			expect(adapter.sentMessages[0].value).to.equal(testValue);
			expect(adapter.sentMessages[0].player).to.never.be.ok();
		});

		it("should track fireExcept messages", () => {
			const excludedPlayer = {} as Player;
			const testValue = { excluded: true };

			adapter.fireExcept(excludedPlayer, testValue);

			expect(adapter.sentMessages.size()).to.equal(1);
			expect(adapter.sentMessages[0].type).to.equal("fireExcept");
			expect(adapter.sentMessages[0].player).to.equal(excludedPlayer);
			expect(adapter.sentMessages[0].value).to.equal(testValue);
		});

		it("should track fireList messages", () => {
			const playerList = [{}, {}, {}] as Player[];
			const testValue = { multicast: true };

			adapter.fireList(playerList, testValue);

			expect(adapter.sentMessages.size()).to.equal(1);
			expect(adapter.sentMessages[0].type).to.equal("fireList");
			expect(adapter.sentMessages[0].value).to.equal(testValue);
		});

		it("should clear messages", () => {
			const mockPlayer = {} as Player;

			adapter.fire(mockPlayer, "test1");
			adapter.fireAll("test2");
			adapter.fireExcept(mockPlayer, "test3");

			expect(adapter.sentMessages.size()).to.equal(3);

			adapter.clearMessages();

			expect(adapter.sentMessages.size()).to.equal(0);
		});

		it("should return undefined for getEventSource", () => {
			const eventSource = adapter.getEventSource();
			expect(eventSource).to.never.be.ok();
		});

		describe("simulateReceive and getPendingData", () => {
			it("should simulate receiving data", () => {
				const testData1 = { message: "test1" };
				const testData2 = { message: "test2" };

				adapter.simulateReceive(testData1);
				adapter.simulateReceive(testData2);

				const pendingData = adapter.getPendingData();
				expect(pendingData).to.be.ok();
				expect(pendingData!.size()).to.equal(2);
				expect(pendingData![0]).to.equal(testData1);
				expect(pendingData![1]).to.equal(testData2);
			});

			it("should clear pending data after getting", () => {
				adapter.simulateReceive({ message: "test" });

				const firstGet = adapter.getPendingData();
				expect(firstGet).to.be.ok();
				expect(firstGet!.size()).to.equal(1);

				const secondGet = adapter.getPendingData();
				expect(secondGet).to.be.ok();
				expect(secondGet!.size()).to.equal(0);
			});

			it("should handle undefined values", () => {
				adapter.simulateReceive(undefined);

				const pendingData = adapter.getPendingData();
				expect(pendingData).to.be.ok();
				expect(pendingData!.size()).to.equal(0);
			});
		});

		it("should track multiple operations", () => {
			const player1 = { Name: "Player1" } as Player;
			const player2 = { Name: "Player2" } as Player;

			adapter.fire(player1, "data1");
			adapter.fireAll("broadcast");
			adapter.fireExcept(player2, "except");
			adapter.fireList([player1, player2], "list");

			expect(adapter.sentMessages.size()).to.equal(4);

			// 验证第一条消息
			expect(adapter.sentMessages[0].type).to.equal("fire");
			expect(adapter.sentMessages[0].player).to.equal(player1);

			// 验证第二条消息
			expect(adapter.sentMessages[1].type).to.equal("fireAll");
			expect(adapter.sentMessages[1].value).to.equal("broadcast");

			// 验证第三条消息
			expect(adapter.sentMessages[2].type).to.equal("fireExcept");
			expect(adapter.sentMessages[2].player).to.equal(player2);

			// 验证第四条消息
			expect(adapter.sentMessages[3].type).to.equal("fireList");
			expect(adapter.sentMessages[3].value).to.equal("list");
		});
	});
};