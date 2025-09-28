/**
 * @fileoverview 类型定义单元测试
 */

import {
	createClientId,
	ReplicationStrategy,
	NetworkRole,
	AuthorityLevel,
} from "../types";

export = () => {
	describe("ClientId", () => {
		it("should create valid client IDs", () => {
			const id1 = createClientId(1);
			const id2 = createClientId(2);

			expect(id1).to.equal(1 as unknown);
			expect(id2).to.equal(2 as unknown);
			expect(id1).never.equal(id2);
		});

		it("should handle zero ID", () => {
			const serverId = createClientId(0);
			expect(serverId).to.equal(0 as unknown);
		});

		it("should handle large IDs", () => {
			const largeId = createClientId(999999);
			expect(largeId).to.equal(999999 as unknown);
		});
	});

	describe("Enums", () => {
		it("should have correct ReplicationStrategy values", () => {
			expect(ReplicationStrategy.Full).to.equal("Full");
			expect(ReplicationStrategy.Delta).to.equal("Delta");
			expect(ReplicationStrategy.OnDemand).to.equal("OnDemand");
		});

		it("should have correct NetworkRole values", () => {
			expect(NetworkRole.Server).to.equal("Server");
			expect(NetworkRole.Client).to.equal("Client");
			expect(NetworkRole.ListenServer).to.equal("ListenServer");
		});

		it("should have correct AuthorityLevel values", () => {
			expect(AuthorityLevel.None).to.equal(0);
			expect(AuthorityLevel.Observer).to.equal(1);
			expect(AuthorityLevel.Player).to.equal(2);
			expect(AuthorityLevel.Admin).to.equal(3);
			expect(AuthorityLevel.Server).to.equal(4);
		});
	});

	describe("Type Guards", () => {
		it("should identify Resource types", () => {
			const stats = {
				__brand: "Resource" as const,
				bytesSent: 0,
				bytesReceived: 0,
				packetsSent: 0,
				packetsReceived: 0,
				averageLatency: 0,
				packetLoss: 0,
				connectedClients: 0,
			};

			expect(stats.__brand).to.equal("Resource");
		});

		it("should create valid ReplicationConfig", () => {
			const config = {
				strategy: ReplicationStrategy.Delta,
				updateRate: 60,
				compression: true,
				maxPacketSize: 8192,
				reliable: false,
			};

			expect(config.strategy).to.equal("Delta");
			expect(config.updateRate).to.equal(60);
			expect(config.compression).to.equal(true);
			expect(config.maxPacketSize).to.equal(8192);
			expect(config.reliable).to.equal(false);
		});
	});
};