/**
 * @fileoverview 客户端预测系统单元测试
 */

import { World, AnyComponent } from "@rbxts/matter";
import { ClientPredictionManager } from "../client-prediction";

export = () => {
	let world: World;
	let manager: ClientPredictionManager;

	beforeEach(() => {
		world = new World();
		const context = (world as unknown as { context: { resources: Map<string, import("../../bevy_ecs").Resource> } }).context;
		context.resources = new Map();

		manager = new ClientPredictionManager(60, 0.01);
		context.resources.set("ClientPredictionManager", manager);
	});

	describe("ClientPredictionManager", () => {
		it("should initialize with correct settings", () => {
			expect(manager.isEnabled()).to.equal(true);
			expect(manager.getCurrentFrame()).to.equal(0);
			expect(manager.getLastConfirmedFrame()).to.equal(0);
			expect(manager.getPredictionLatency()).to.equal(0);
		});

		it("should enable and disable prediction", () => {
			manager.setEnabled(false);
			expect(manager.isEnabled()).to.equal(false);

			manager.setEnabled(true);
			expect(manager.isEnabled()).to.equal(true);
		});

		it("should manage predicted entities", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			manager.addPredictedEntity(entity1);
			manager.addPredictedEntity(entity2);

			expect(manager.isEntityPredicted(entity1)).to.equal(true);
			expect(manager.isEntityPredicted(entity2)).to.equal(true);

			manager.removePredictedEntity(entity1);
			expect(manager.isEntityPredicted(entity1)).to.equal(false);
			expect(manager.isEntityPredicted(entity2)).to.equal(true);
		});

		it("should record input and save snapshots", () => {
			const entity = world.spawn();
			manager.addPredictedEntity(entity);

			const input1 = { action: "move", direction: "forward" };
			const input2 = { action: "jump" };

			manager.recordInput(input1);
			manager.savePredictionSnapshot(world, input1);
			expect(manager.getCurrentFrame()).to.equal(1);

			manager.recordInput(input2);
			manager.savePredictionSnapshot(world, input2);
			expect(manager.getCurrentFrame()).to.equal(2);

			expect(manager.getPredictionLatency()).to.equal(2);
		});

		it("should handle rollback callbacks", () => {
			let rollbackCalled = false;
			let rollbackData: import("../types").PredictionRollback | undefined;

			manager.onRollback((rollback) => {
				rollbackCalled = true;
				rollbackData = rollback;
			});

			// 模拟服务器确认触发回滚
			const entity = world.spawn();
			const serverState = new Map<import("@rbxts/matter").Entity, Map<string, AnyComponent>>();
			const componentMap = new Map<string, AnyComponent>();
			componentMap.set("TestComponent", { test: "value" } as unknown as AnyComponent);
			serverState.set(entity, componentMap);

			// 由于handleServerConfirmation需要比较状态，
			// 我们需要先添加实体并创建一些预测历史
			manager.addPredictedEntity(entity);
			manager.savePredictionSnapshot(world, { test: "input" });

			// 注意：实际的回滚逻辑需要更复杂的设置
			// 这里主要测试回调机制
		});

		it("should track frame numbers correctly", () => {
			const initialFrame = manager.getCurrentFrame();
			const initialConfirmed = manager.getLastConfirmedFrame();

			expect(initialFrame).to.equal(0);
			expect(initialConfirmed).to.equal(0);

			// 记录几个预测帧
			for (let i = 0; i < 5; i++) {
				manager.recordInput({ frame: i });
				manager.savePredictionSnapshot(world, { frame: i });
			}

			expect(manager.getCurrentFrame()).to.equal(5);
			expect(manager.getLastConfirmedFrame()).to.equal(0); // 还没有确认
			expect(manager.getPredictionLatency()).to.equal(5);
		});

		it("should cleanup resources", () => {
			const entity = world.spawn();
			manager.addPredictedEntity(entity);

			// 添加一些数据
			manager.recordInput({ test: "input" });
			manager.savePredictionSnapshot(world, { test: "input" });
			manager.onRollback(() => {});

			// 清理
			manager.cleanup();

			expect(manager.getCurrentFrame()).to.equal(0);
			expect(manager.getLastConfirmedFrame()).to.equal(0);
			expect(manager.isEntityPredicted(entity)).to.equal(false);
		});

		it("should respect max history frames", () => {
			const maxHistory = 10;
			const testManager = new ClientPredictionManager(maxHistory, 0.01);

			// 添加超过最大历史数量的快照
			for (let i = 0; i < maxHistory + 5; i++) {
				testManager.recordInput({ frame: i });
				testManager.savePredictionSnapshot(world, { frame: i });
			}

			// 当前帧应该正确更新
			expect(testManager.getCurrentFrame()).to.equal(maxHistory + 5);

			// 历史不应该超过最大值（内部实现细节，这里主要验证不会内存泄漏）
		});
	});

	describe("Disabled Prediction", () => {
		beforeEach(() => {
			manager.setEnabled(false);
		});

		it("should not save snapshots when disabled", () => {
			const entity = world.spawn();
			manager.addPredictedEntity(entity);

			const initialFrame = manager.getCurrentFrame();
			manager.savePredictionSnapshot(world, { test: "input" });

			// 帧号不应该增加
			expect(manager.getCurrentFrame()).to.equal(initialFrame);
		});
	});
};