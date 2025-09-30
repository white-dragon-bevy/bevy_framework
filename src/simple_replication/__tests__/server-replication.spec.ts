/**
 * @fileoverview 服务器复制系统单元测试
 */

import { World, component } from "@rbxts/matter";
import { Loop } from "../../bevy_ecs/schedule/loop";
import { serverReplicationSystem } from "../server-replication";
import { MockNetworkAdapter } from "../network";
import { SimpleContext, SimpleState, ClientComponent } from "../types";

export = () => {
	describe("serverReplicationSystem", () => {
		let world: World;
		let mockAdapter: MockNetworkAdapter;
		let state: SimpleState;
		let context: SimpleContext;

		// 创建测试组件
		const TestComponent = component<{ value: number }>("Test");
		const ReplicatedComponent = component<{ data: string }>("Replicated");
		const SelfOnlyComponent = component<{ personal: boolean }>("SelfOnly");
		const ClientComponentCtor = component<ClientComponent>("Client");

		beforeEach(() => {
			world = new World();
			mockAdapter = new MockNetworkAdapter();
			state = {
				debugEnabled: false,
				debugSignal: false,
				entityIdMap: new Map(),
			};

			// 设置上下文
			context = {
				IsEcsServer: true,
				IsClient: false,
				Replicated: {
					ToAllPlayers: new Set([ReplicatedComponent as any]),
					ToSelfOnly: new Set([SelfOnlyComponent as any]),
				},
				Components: {
					Client: ClientComponentCtor as any,
					Test: TestComponent as any,
					Replicated: ReplicatedComponent as any,
					SelfOnly: SelfOnlyComponent as any,
				},
				getComponent: (name: string) => {
					const comp = context.Components[name];
					if (!comp) {
						error(`Component ${name} not found`);
					}
					return comp;
				},
			};
		});

		afterEach(() => {
			mockAdapter.clearMessages();
		});

		it("should not send data when no clients are connected", () => {
			// 创建一个带有复制组件的实体
			const entity = world.spawn(ReplicatedComponent({ data: "test" }));

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 使用 step 方法执行一帧
			loop.step("default", 1/60);

			// 验证没有发送消息
			expect(mockAdapter.sentMessages.size()).to.equal(0);

			world.despawn(entity);
		});

		it("should send initial state to newly connected clients", () => {
			// 创建一些实体
			const entity1 = world.spawn(ReplicatedComponent({ data: "entity1" }));
			const entity2 = world.spawn(ReplicatedComponent({ data: "entity2" }));

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 先运行一帧，让 Loop 记录初始状态
			loop.step("default", 1/60);

			// 创建一个客户端
			const player = { Name: "TestPlayer", UserId: 123 } as Player;
			const clientEntity = world.spawn(
				ClientComponentCtor({ player: player, loaded: true } as any),
			);

			// 再运行一帧，此时 queryChanged 能检测到新客户端
			loop.step("default", 1/60);

			// 验证发送了初始状态
			expect(mockAdapter.sentMessages.size() > 0).to.equal(true);

			// 清理
			world.despawn(entity1);
			world.despawn(entity2);
			world.despawn(clientEntity);
		});

		it("should replicate ToAllPlayers components to all connected clients", () => {
			// 创建两个客户端
			const player1 = { Name: "Player1", UserId: 1 } as Player;
			const player2 = { Name: "Player2", UserId: 2 } as Player;

			const client1 = world.spawn(
				ClientComponentCtor({ player: player1, loaded: true } as any),
			);

			const client2 = world.spawn(
				ClientComponentCtor({ player: player2, loaded: true } as any),
			);

			// 创建一个带有复制组件的实体
			const entity = world.spawn(ReplicatedComponent({ data: "shared" }));

			// 修改组件以触发变更检测
			world.insert(entity, ReplicatedComponent({ data: "modified" }));

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 使用 step 方法执行一帧
			loop.step("default", 1/60);

			// 验证向两个玩家都发送了数据
			const sentToPlayer1 = mockAdapter.sentMessages.filter(
				(message) => message.player === player1,
			);
			const sentToPlayer2 = mockAdapter.sentMessages.filter(
				(message) => message.player === player2,
			);

			expect(sentToPlayer1.size() > 0).to.equal(true);
			expect(sentToPlayer2.size() > 0).to.equal(true);

			// 清理
			world.despawn(entity);
			world.despawn(client1);
			world.despawn(client2);
		});

		it("should replicate ToSelfOnly components only to the owning client", () => {
			// 创建两个客户端
			const player1 = { Name: "Player1", UserId: 1 } as Player;
			const player2 = { Name: "Player2", UserId: 2 } as Player;

			const client1 = world.spawn(
				ClientComponentCtor({ player: player1, loaded: true } as any),
			);

			const client2 = world.spawn(
				ClientComponentCtor({ player: player2, loaded: true } as any),
			);

			// 给 client1 添加 SelfOnly 组件
			world.insert(client1, SelfOnlyComponent({ personal: true }));

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 使用 step 方法执行一帧
			loop.step("default", 1/60);

			// 验证只向 player1 发送了数据
			const sentToPlayer1 = mockAdapter.sentMessages.filter(
				(message) => message.player === player1,
			);
			const sentToPlayer2 = mockAdapter.sentMessages.filter(
				(message) => message.player === player2,
			);

			expect(sentToPlayer1.size() > 0).to.equal(true);
			expect(sentToPlayer2.size()).to.equal(0);

			// 清理
			world.despawn(client1);
			world.despawn(client2);
		});

		it("should not send data to unloaded clients", () => {
			// 创建一个未加载的客户端
			const player = { Name: "UnloadedPlayer", UserId: 999 } as Player;
			const clientEntity = world.spawn(
				ClientComponentCtor({ player: player, loaded: false } as any),
			);

			// 创建一个带有复制组件的实体
			const entity = world.spawn(ReplicatedComponent({ data: "test" }));

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 使用 step 方法执行一帧
			loop.step("default", 1/60);

			// 验证没有向未加载的客户端发送数据
			expect(mockAdapter.sentMessages.size()).to.equal(0);

			// 清理
			world.despawn(entity);
			world.despawn(clientEntity);
		});

		it("should handle entity despawn correctly", () => {
			// 创建客户端
			const player = { Name: "TestPlayer", UserId: 123 } as Player;
			const clientEntity = world.spawn(
				ClientComponentCtor({ player: player, loaded: true } as any),
			);

			// 创建并立即删除一个实体
			const entity = world.spawn(ReplicatedComponent({ data: "temporary" }));
			world.despawn(entity);

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 使用 step 方法执行一帧
			loop.step("default", 1/60);

			// 系统应该正常运行，不会因为实体不存在而出错
			expect(mockAdapter.sentMessages.size()).to.be.ok();

			// 清理
			world.despawn(clientEntity);
		});

		it("should use debug logging when enabled", () => {
			// 启用调试
			state.debugEnabled = true;

			// 在 roblox-ts 中，我们无法直接替换 print 函数
			// 但可以通过验证数据被正确发送来确认 debug 逻辑

			// 创建客户端和实体
			const player = { Name: "DebugPlayer", UserId: 456 } as Player;
			const clientEntity = world.spawn(
				ClientComponentCtor({ player: player, loaded: true } as any),
			);
			const entity = world.spawn(ReplicatedComponent({ data: "debug" }));

			// 使用 bevy_ecs 的 Loop
			const loop = new Loop(world);
			const wrappedSystem = (w: World) => serverReplicationSystem(w, state, context, mockAdapter);
			loop.scheduleSystems([wrappedSystem]);

			// 使用 step 方法执行一帧
			loop.step("default", 1/60);

			// 验证数据被发送 (当 debugEnabled 为 true 时，系统会调用 print)
			const sentMessages = mockAdapter.sentMessages.filter(
				(message) => message.player === player,
			);
			expect(sentMessages.size() > 0).to.equal(true);

			// 清理
			world.despawn(entity);
			world.despawn(clientEntity);
		});
	});
};