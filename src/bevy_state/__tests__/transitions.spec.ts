/**
 * transitions.spec.ts - 状态转换系统单元测试
 */

import { World } from "@rbxts/matter";
import { EnumStates, States } from "../states";
import {
	StateTransitionMessage,
	OnEnter,
	OnExit,
	OnTransition,
	StateTransitionManager,
	getStateTransitionReader,
	lastTransition,
} from "../transitions";
import { State, NextState, StateConstructor } from "../resources";
import { ResourceManager } from "../../bevy_ecs/resource";
import { MessageRegistry as EventManager } from "../../bevy_ecs/message";
import { getTypeDescriptor } from "../../bevy_core";

/**
 * 测试用状态类
 */
class TestState extends EnumStates {
	public static readonly IDLE = new TestState("idle");
	public static readonly RUNNING = new TestState("running");
	public static readonly PAUSED = new TestState("paused");
}

export = () => {
	let world: World;
	let resourceManager: ResourceManager;
	let eventManager: EventManager;

	beforeEach(() => {
		// 创建测试环境
		world = new World();
		resourceManager = new ResourceManager();
		eventManager = new EventManager(world);
	});

	afterEach(() => {
		// 清理测试环境
		world = undefined as unknown as World;
		resourceManager = undefined as unknown as ResourceManager;
		eventManager = undefined as unknown as EventManager;
	});

	describe("StateTransitionEvent", () => {
		it("should create event with exited and entered states", () => {
			const event = new StateTransitionMessage(TestState.IDLE, TestState.RUNNING);

			expect(event.exited).to.be.ok();
			expect(event.entered).to.be.ok();
			expect(event.exited!.equals(TestState.IDLE)).to.equal(true);
			expect(event.entered!.equals(TestState.RUNNING)).to.equal(true);
		});

		it("should create event with only entered state", () => {
			const event = new StateTransitionMessage(undefined, TestState.RUNNING);

			expect(event.exited).never.to.be.ok();
			expect(event.entered).to.be.ok();
			expect(event.entered!.equals(TestState.RUNNING)).to.equal(true);
		});

		it("should clone event correctly", () => {
			const original = new StateTransitionMessage(TestState.IDLE, TestState.RUNNING);
			const cloned = original.clone();

			expect(cloned.exited).to.be.ok();
			expect(cloned.entered).to.be.ok();
			expect(cloned.exited!.equals(original.exited!)).to.equal(true);
			expect(cloned.entered!.equals(original.entered!)).to.equal(true);
		});

		it("should check isExitingFrom correctly", () => {
			const event = new StateTransitionMessage(TestState.IDLE, TestState.RUNNING);

			expect(event.isExitingFrom(TestState.IDLE)).to.equal(true);
			expect(event.isExitingFrom(TestState.RUNNING)).to.equal(false);
			expect(event.isExitingFrom(TestState.PAUSED)).to.equal(false);
		});

		it("should check isEnteringTo correctly", () => {
			const event = new StateTransitionMessage(TestState.IDLE, TestState.RUNNING);

			expect(event.isEnteringTo(TestState.RUNNING)).to.equal(true);
			expect(event.isEnteringTo(TestState.IDLE)).to.equal(false);
			expect(event.isEnteringTo(TestState.PAUSED)).to.equal(false);
		});

		it("should check isTransition correctly", () => {
			const event = new StateTransitionMessage(TestState.IDLE, TestState.RUNNING);

			expect(event.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
			expect(event.isTransition(TestState.RUNNING, TestState.IDLE)).to.equal(false);
			expect(event.isTransition(TestState.IDLE, TestState.PAUSED)).to.equal(false);
		});

		it("should handle undefined states in checks", () => {
			const event = new StateTransitionMessage(undefined, TestState.RUNNING);

			expect(event.isExitingFrom(TestState.IDLE)).to.equal(false);
			expect(event.isEnteringTo(TestState.RUNNING)).to.equal(true);
			expect(event.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(false);
		});
	});

	describe("Schedule Label Functions", () => {
		it("should generate OnEnter labels correctly", () => {
			const label = OnEnter(TestState.IDLE);

			expect(label).to.equal("OnEnter_idle");
		});

		it("should generate OnExit labels correctly", () => {
			const label = OnExit(TestState.RUNNING);

			expect(label).to.equal("OnExit_running");
		});

		it("should generate OnTransition labels correctly", () => {
			const label = OnTransition(TestState.IDLE, TestState.RUNNING);

			expect(label).to.equal("OnTransition_idle_to_running");
		});

		it("should generate unique labels for different states", () => {
			const label1 = OnEnter(TestState.IDLE);
			const label2 = OnEnter(TestState.RUNNING);

			expect(label1).never.to.equal(label2);
		});

		it("should generate unique transition labels", () => {
			const label1 = OnTransition(TestState.IDLE, TestState.RUNNING);
			const label2 = OnTransition(TestState.RUNNING, TestState.IDLE);

			expect(label1).never.to.equal(label2);
		});
	});

	describe("StateTransitionManager", () => {
		let manager: StateTransitionManager<TestState>;
		let typeDescriptor: NonNullable<ReturnType<typeof getTypeDescriptor>>;

		beforeEach(() => {
			const descriptor = getTypeDescriptor("TestState", "TestState");
			assert(descriptor !== undefined, "TypeDescriptor should not be undefined");
			typeDescriptor = descriptor;
			manager = new StateTransitionManager(typeDescriptor, eventManager);
		});

		it("should not process transition when NextState is not pending", () => {
			const nextState = NextState.unchanged<TestState>();
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should process transition when NextState is pending", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should handle identity transition correctly", () => {
			// 设置初始状态为 IDLE
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态也为 IDLE（身份转换）
			const nextState = NextState.withPending(TestState.IDLE);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			// 应该处理转换
			expect(result).to.equal(true);

			// 应该记录最后的转换
			const lastEvent = manager.getLastTransition();
			expect(lastEvent).to.be.ok();
			expect(lastEvent!.isTransition(TestState.IDLE, TestState.IDLE)).to.equal(true);
		});

		it("should handle regular transition correctly", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(true);

			// 验证状态已更新
			const updatedState = resourceManager.getResourceByTypeDescriptor<State<TestState>>(
				currentState.getTypeDescriptor(),
			);
			expect(updatedState).to.be.ok();
			expect(updatedState!.is(TestState.RUNNING)).to.equal(true);
		});

		it("should record last transition event", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			manager.processTransition(world, resourceManager);

			const lastEvent = manager.getLastTransition();
			expect(lastEvent).to.be.ok();
			expect(lastEvent!.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
		});

		it("should handle first transition without current state", () => {
			// 不设置初始状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(true);

			// 验证状态已创建
			const createdState = resourceManager.getResourceByTypeDescriptor<State<TestState>>(typeDescriptor);
			expect(createdState).to.be.ok();
			expect(createdState!.is(TestState.RUNNING)).to.equal(true);
		});

		it("should clone last transition correctly", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			manager.processTransition(world, resourceManager);

			const lastEvent1 = manager.getLastTransition();
			const lastEvent2 = manager.getLastTransition();

			expect(lastEvent1).to.be.ok();
			expect(lastEvent2).to.be.ok();
			expect(lastEvent1!.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
			expect(lastEvent2!.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
		});
	});

	describe("getStateTransitionReader", () => {
		it("should create event reader correctly", () => {
			const reader = getStateTransitionReader<TestState>(eventManager);

			expect(reader).to.be.ok();
		});

		it("should read transition events", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = new StateTransitionManager<TestState>(typeDescriptor, eventManager);

			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			// 处理转换
			manager.processTransition(world, resourceManager);

			// 创建读取器并读取事件
			const reader = getStateTransitionReader<TestState>(eventManager);
			const events = reader.read();

			expect(events.size()).to.equal(1);
			expect(events[0].isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
		});
	});

	describe("lastTransition", () => {
		it("should return undefined when no manager exists", () => {
			const result = lastTransition(world, TestState as unknown as StateConstructor<TestState>);

			expect(result).never.to.be.ok();
		});

		it("should return last transition when manager exists", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = new StateTransitionManager<TestState>(typeDescriptor, eventManager);

			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			resourceManager.insertResourceByTypeDescriptor(currentState, currentState.getTypeDescriptor());

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			// 处理转换
			manager.processTransition(world, resourceManager);

			// 将管理器存储到 world
			const worldWithManagers = world as unknown as Record<string, unknown>;
			const managerKey = `stateTransitionManager_${tostring(TestState)}`;
			worldWithManagers[managerKey] = manager;

			// 获取最后的转换
			const result = lastTransition(world, TestState as unknown as StateConstructor<TestState>);

			expect(result).to.be.ok();
			expect(result!.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
		});

		it("should handle errors gracefully", () => {
			// 创建一个会抛出错误的 world
			const badWorld = {} as World;

			const result = lastTransition(badWorld, TestState as unknown as StateConstructor<TestState>);

			expect(result).never.to.be.ok();
		});
	});

	describe("Edge Cases", () => {
		it("should handle multiple sequential transitions", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = new StateTransitionManager<TestState>(typeDescriptor, eventManager);

			// 第一次转换：undefined -> IDLE
			const nextState1 = NextState.withPending(TestState.IDLE);
			const nextStateDescriptor1 = getTypeDescriptor("TestState_NextState1", "TestState_NextState1")!;
			resourceManager.insertResourceByTypeDescriptor(nextState1, nextStateDescriptor1);
			manager.processTransition(world, resourceManager);

			// 第二次转换：IDLE -> RUNNING
			const nextState2 = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor2 = getTypeDescriptor("TestState_NextState2", "TestState_NextState2")!;
			resourceManager.insertResourceByTypeDescriptor(nextState2, nextStateDescriptor2);
			manager.processTransition(world, resourceManager);

			// 第三次转换：RUNNING -> PAUSED
			const nextState3 = NextState.withPending(TestState.PAUSED);
			const nextStateDescriptor3 = getTypeDescriptor("TestState_NextState3", "TestState_NextState3")!;
			resourceManager.insertResourceByTypeDescriptor(nextState3, nextStateDescriptor3);
			manager.processTransition(world, resourceManager);

			const lastEvent = manager.getLastTransition();
			expect(lastEvent).to.be.ok();
			expect(lastEvent!.isTransition(TestState.RUNNING, TestState.PAUSED)).to.equal(true);
		});

		it("should handle transition when NextState is taken", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = new StateTransitionManager<TestState>(typeDescriptor, eventManager);

			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getTypeDescriptor("TestState_NextState", "TestState_NextState")!;
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			// 手动取出状态
			nextState.take();

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(false);
		});
	});
};