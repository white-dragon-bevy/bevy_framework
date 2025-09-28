/**
 * @fileoverview 复制系统单元测试
 */

import { World } from "@rbxts/matter";
import { ReplicationManager } from "../replication";
import { NetworkRole, ReplicationStrategy, createClientId } from "../types";

export = () => {
	let world: World;
	let manager: ReplicationManager;

	beforeEach(() => {
		world = new World();
		const context = (world as unknown as { context: { resources: Map<string, import("../../bevy_ecs").Resource> } }).context;
		world.resources = new Map();

		manager = new ReplicationManager(NetworkRole.Server, {
			strategy: ReplicationStrategy.Full,
			updateRate: 30,
			compression: false,
			maxPacketSize: 4096,
			reliable: true,
		});

		world.resources.set("ReplicationManager", manager);
	});

	describe("ReplicationManager", () => {
		it("should initialize with correct role", () => {
			expect(manager.getRole()).to.equal(NetworkRole.Server);
			expect(manager.isServer()).to.equal(true);
			expect(manager.isClient()).to.equal(false);
		});

		it("should manage client connections", () => {
			const client1 = createClientId(1);
			const client2 = createClientId(2);

			manager.addClient(client1);
			manager.addClient(client2);

			const clients = manager.getConnectedClients();
			expect(clients.has(client1)).to.equal(true);
			expect(clients.has(client2)).to.equal(true);

			manager.removeClient(client1);
			expect(manager.getConnectedClients().has(client1)).to.equal(false);
			expect(manager.getConnectedClients().has(client2)).to.equal(true);
		});

		it("should manage entity visibility", () => {
			const entity = world.spawn();
			const client1 = createClientId(1);
			const client2 = createClientId(2);

			manager.addClient(client1);
			manager.addClient(client2);

			manager.setEntityVisibility(entity, client1, true);
			expect(manager.isEntityVisibleToClient(entity, client1)).to.equal(true);
			expect(manager.isEntityVisibleToClient(entity, client2)).to.equal(false);

			manager.setEntityVisibility(entity, client2, true);
			const visibleClients = manager.getEntityVisibleClients(entity);
			expect(visibleClients.has(client1)).to.equal(true);
			expect(visibleClients.has(client2)).to.equal(true);

			manager.setEntityVisibility(entity, client1, false);
			expect(manager.isEntityVisibleToClient(entity, client1)).to.equal(false);
		});

		it("should register components", () => {
			const serializer = {
				serialize: (component: unknown) => component,
				deserialize: (data: unknown) => data as import("@rbxts/matter").AnyComponent,
			};

			manager.registerComponent("TestComponent", serializer);
			expect(manager.isComponentRegistered("TestComponent")).to.equal(true);
			expect(manager.isComponentRegistered("UnknownComponent")).to.equal(false);
		});

		it("should manage update timing", () => {
			const config = manager.getConfig();
			expect(config.updateRate).to.equal(30);

			// 初始应该需要更新
			expect(manager.shouldUpdate()).to.equal(true);

			// 标记更新后，立即检查应该不需要更新
			manager.markUpdated();
			expect(manager.shouldUpdate()).to.equal(false);

			// 等待足够时间后应该需要更新
			task.wait(1 / 30 + 0.01); // 等待超过更新间隔
			expect(manager.shouldUpdate()).to.equal(true);
		});

		it("should queue and flush messages", () => {
			const message1 = {
				id: 1 as import("../types").NetworkEventId,
				sender: createClientId(0),
				receiver: createClientId(1),
				data: { test: "data1" },
				reliable: true,
			};

			const message2 = {
				id: 2 as import("../types").NetworkEventId,
				sender: createClientId(0),
				receiver: undefined,
				data: { test: "data2" },
				reliable: false,
			};

			manager.queueMessage(message1);
			manager.queueMessage(message2);

			const messages = manager.flushMessageQueue();
			expect(messages.size()).to.equal(2);
			expect(messages[0]).to.equal(message1);
			expect(messages[1]).to.equal(message2);

			// 队列应该被清空
			const emptyQueue = manager.flushMessageQueue();
			expect(emptyQueue.size()).to.equal(0);
		});

		it("should update configuration", () => {
			const originalConfig = manager.getConfig();
			expect(originalConfig.updateRate).to.equal(30);
			expect(originalConfig.compression).to.equal(false);

			manager.updateConfig({
				updateRate: 60,
				compression: true,
			});

			const newConfig = manager.getConfig();
			expect(newConfig.updateRate).to.equal(60);
			expect(newConfig.compression).to.equal(true);
			// 其他配置应保持不变
			expect(newConfig.strategy).to.equal(ReplicationStrategy.Full);
			expect(newConfig.reliable).to.equal(true);
		});
	});

	describe("Client Role", () => {
		beforeEach(() => {
			manager = new ReplicationManager(NetworkRole.Client, {
				strategy: ReplicationStrategy.Full,
				updateRate: 30,
				compression: false,
				maxPacketSize: 4096,
				reliable: true,
			});
		});

		it("should identify as client", () => {
			expect(manager.getRole()).to.equal(NetworkRole.Client);
			expect(manager.isServer()).to.equal(false);
			expect(manager.isClient()).to.equal(true);
		});

		it("should error when trying to add clients", () => {
			const client = createClientId(1);
			expect(() => manager.addClient(client)).to.throw();
		});

		it("should error when trying to remove clients", () => {
			const client = createClientId(1);
			expect(() => manager.removeClient(client)).to.throw();
		});
	});
};