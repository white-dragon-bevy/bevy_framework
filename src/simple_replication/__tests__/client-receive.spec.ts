/**
 * @fileoverview 客户端接收系统单元测试
 */

import { World, component, AnyEntity, AnyComponent } from "@rbxts/matter";
import { clientReceiveSystem } from "../client-receive";
import { MockNetworkAdapter } from "../network";
import { SimpleContext, SimpleState, ComponentName, ComponentCtor } from "../types";

export = () => {
	describe("clientReceiveSystem", () => {
		let world: World;
		let mockAdapter: MockNetworkAdapter;
		let state: SimpleState;
		let context: SimpleContext;

		// 创建测试组件
		const TestComponent = component<{ value: number }>("Test");
		const AnotherComponent = component<{ text: string }>("Another");

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
				IsEcsServer: false,
				IsClient: true,
				Replicated: {
					ToAllPlayers: new Set(),
					ToSelfOnly: new Set(),
				},
				Components: {
					Test: TestComponent as any,
					Another: AnotherComponent as any,
				},
				getComponent: <T extends object = object>(name: string) => {
					if (name === "Test") {
						return TestComponent as (data?: T) => AnyComponent;
					} else if (name === "Another") {
						return AnotherComponent as (data?: T) => AnyComponent;
					} else {
						error(`Component ${name} not found`);
					}
				},
			};
		});

		it("should process pending data from mock adapter", () => {
			// 模拟接收的数据
			const replicationData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					"1",
					new Map([
						["Test", { data: { value: 100 } }],
						["Another", { data: { text: "hello" } }],
					]),
				],
			]);

			// 模拟接收数据
			mockAdapter.simulateReceive(replicationData);

			// 运行客户端接收系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证实体被创建
			let entityFound = false;
			for (const [entityId, _] of world) {
				entityFound = true;
				const testComp = world.get(entityId, TestComponent);
				const anotherComp = world.get(entityId, AnotherComponent);

				expect(testComp).to.be.ok();
				if (testComp) {
					expect(testComp.value).to.equal(100);
				}
				expect(anotherComp).to.be.ok();
				if (anotherComp) {
					expect(anotherComp.text).to.equal("hello");
				}
			}

			expect(entityFound).to.equal(true);
		});

		it("should update existing entities", () => {
			// 创建一个实体并记录其ID
			const entityId = world.spawn(TestComponent({ value: 50 }));
			const entityIdStr = tostring(entityId);

			// 模拟更新数据
			const updateData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					entityIdStr,
					new Map([
						["Test", { data: { value: 200 } }],
						["Another", { data: { text: "updated" } }],
					]),
				],
			]);

			mockAdapter.simulateReceive(updateData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证实体被更新
			const testComp = world.get(entityId, TestComponent);
			const anotherComp = world.get(entityId, AnotherComponent);

			expect(testComp).to.be.ok();
			if (testComp) {
				expect(testComp.value).to.equal(200);
			}
			expect(anotherComp).to.be.ok();
			if (anotherComp) {
				expect(anotherComp.text).to.equal("updated");
			}
		});

		it("should remove components when data is undefined", () => {
			// 创建一个带有两个组件的实体
			const entityId = world.spawn(
				TestComponent({ value: 100 }),
				AnotherComponent({ text: "initial" }),
			);
			const entityIdStr = tostring(entityId);

			// 模拟移除 Another 组件
			const removeData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					entityIdStr,
					new Map([
						["Test", { data: { value: 150 } }], // 保留 Test
						["Another", { data: undefined }], // 移除 Another
					]),
				],
			]);

			mockAdapter.simulateReceive(removeData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证 Test 组件还在，Another 组件被移除
			const testComp = world.get(entityId, TestComponent);
			const anotherComp = world.get(entityId, AnotherComponent);

			expect(testComp).to.be.ok();
			if (testComp) {
				expect(testComp.value).to.equal(150);
			}
			expect(anotherComp).to.never.be.ok();
		});

		it("should despawn entities with empty component map", () => {
			// 创建一个实体
			const entityId = world.spawn(TestComponent({ value: 100 }));
			const entityIdStr = tostring(entityId);

			// 发送空的组件映射来删除实体
			const despawnData = new Map<string, Map<ComponentName, { data: any }>>([
				[entityIdStr, new Map()],
			]);

			mockAdapter.simulateReceive(despawnData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证实体被删除
			expect(world.contains(entityId)).to.equal(false);
		});

		it("should handle multiple entities in one update", () => {
			// 模拟多个实体的数据
			const multiEntityData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					"10",
					new Map([
						["Test", { data: { value: 10 } }],
					]),
				],
				[
					"20",
					new Map([
						["Another", { data: { text: "entity2" } }],
					]),
				],
				[
					"30",
					new Map([
						["Test", { data: { value: 30 } }],
						["Another", { data: { text: "entity3" } }],
					]),
				],
			]);

			mockAdapter.simulateReceive(multiEntityData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 计数创建的实体
			let entityCount = 0;
			for (const _ of world) {
				entityCount++;
			}

			expect(entityCount).to.equal(3);
		});

		it("should store entity ID mapping for new entities", () => {
			// 模拟新实体数据
			const newEntityData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					"server-id-123",
					new Map([
						["Test", { data: { value: 999 } }],
					]),
				],
			]);

			mockAdapter.simulateReceive(newEntityData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证实体ID映射被保存
			expect(state.entityIdMap.has("server-id-123")).to.equal(true);

			const clientEntityId = state.entityIdMap.get("server-id-123");
			expect(clientEntityId).to.be.ok();
			expect(world.contains(clientEntityId!)).to.equal(true);
		});

		it("should handle debug logging when enabled", () => {
			// 启用调试
			state.debugEnabled = true;

			// 在 roblox-ts 中，我们无法直接替换 print 函数
			// 但可以通过验证实体被正确处理来确认 debug 逻辑

			// 模拟数据
			const debugData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					"debug-entity",
					new Map([
						["Test", { data: { value: 777 } }],
					]),
				],
			]);

			mockAdapter.simulateReceive(debugData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证实体被创建 (当 debugEnabled 为 true 时，系统会调用 print)
			const clientEntityId = state.entityIdMap.get("debug-entity");
			expect(clientEntityId).to.be.ok();
			if (clientEntityId) {
				const testComp = world.get(clientEntityId, TestComponent);
				expect(testComp).to.be.ok();
				if (testComp) {
					expect(testComp.value).to.equal(777);
				}
			}
		});

		it("should handle empty pending data", () => {
			// 不模拟任何数据
			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证没有创建实体
			let entityCount = 0;
			for (const _ of world) {
				entityCount++;
			}

			expect(entityCount).to.equal(0);
		});

		it("should create entity at specific ID if it doesn't exist", () => {
			// 使用一个不存在的实体ID
			const nonExistentId = "99999";

			const createAtIdData = new Map<string, Map<ComponentName, { data: any }>>([
				[
					nonExistentId,
					new Map([
						["Test", { data: { value: 555 } }],
					]),
				],
			]);

			mockAdapter.simulateReceive(createAtIdData);

			// 运行系统
			clientReceiveSystem(world, state, context, mockAdapter);

			// 验证实体被创建
			const numericId = tonumber(nonExistentId);
			if (numericId !== undefined) {
				// 如果ID可以转换为数字，应该在该ID创建实体
				expect(world.contains(numericId as AnyEntity)).to.equal(true);

				const testComp = world.get(numericId as AnyEntity, TestComponent);
				expect(testComp).to.be.ok();
				if (testComp) {
					expect(testComp.value).to.equal(555);
				}
			}
		});
	});
};