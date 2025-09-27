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
import { getTypeDescriptor, getGenericTypeDescriptor } from "../../bevy_core";

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
			const event = StateTransitionMessage.create(TestState.IDLE, TestState.RUNNING);

			expect(event.exited).to.be.ok();
			expect(event.entered).to.be.ok();
			expect(event.exited!.equals(TestState.IDLE)).to.equal(true);
			expect(event.entered!.equals(TestState.RUNNING)).to.equal(true);
		});

		it("should create event with only entered state", () => {
			const event = StateTransitionMessage.create(undefined, TestState.RUNNING);

			expect(event.exited).never.to.be.ok();
			expect(event.entered).to.be.ok();
			expect(event.entered!.equals(TestState.RUNNING)).to.equal(true);
		});

		it("should clone event correctly", () => {
			const original = StateTransitionMessage.create(TestState.IDLE, TestState.RUNNING);
			const cloned = original.clone();

			expect(cloned.exited).to.be.ok();
			expect(cloned.entered).to.be.ok();
			expect(cloned.exited!.equals(original.exited!)).to.equal(true);
			expect(cloned.entered!.equals(original.entered!)).to.equal(true);
		});

		it("should check isExitingFrom correctly", () => {
			const event = StateTransitionMessage.create(TestState.IDLE, TestState.RUNNING);

			expect(event.isExitingFrom(TestState.IDLE)).to.equal(true);
			expect(event.isExitingFrom(TestState.RUNNING)).to.equal(false);
			expect(event.isExitingFrom(TestState.PAUSED)).to.equal(false);
		});

		it("should check isEnteringTo correctly", () => {
			const event = StateTransitionMessage.create(TestState.IDLE, TestState.RUNNING);

			expect(event.isEnteringTo(TestState.RUNNING)).to.equal(true);
			expect(event.isEnteringTo(TestState.IDLE)).to.equal(false);
			expect(event.isEnteringTo(TestState.PAUSED)).to.equal(false);
		});

		it("should check isTransition correctly", () => {
			const event = StateTransitionMessage.create(TestState.IDLE, TestState.RUNNING);

			expect(event.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
			expect(event.isTransition(TestState.RUNNING, TestState.IDLE)).to.equal(false);
			expect(event.isTransition(TestState.IDLE, TestState.PAUSED)).to.equal(false);
		});

		it("should handle undefined states in checks", () => {
			const event = StateTransitionMessage.create(undefined, TestState.RUNNING);

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
			manager = StateTransitionManager.create(typeDescriptor, eventManager);
		});

		it("should not process transition when NextState is not pending", () => {
			const nextState = NextState.unchanged<TestState>();
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should process transition when NextState is pending", () =>       {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should handle identity transition correctly", () => {
			// 设置初始状态为 IDLE
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 验证状态已正确存储
			const storedState = resourceManager.getResourceByTypeDescriptor<State<TestState>>(typeDescriptor);
			expect(storedState).to.be.ok();
			if (storedState) {
				expect(typeOf(storedState.get)).to.equal("function");
			}

			// 设置下一个状态也为 IDLE（身份转换）
			const nextState = NextState.withPending(TestState.IDLE);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			// 应该处理转换
			expect(result).to.equal(true);

			// 应该记录最后的转换
			const lastEvent = manager.getLastTransition();
			expect(lastEvent).to.be.ok();

			// 检查事件的值
			if (lastEvent) {
				// 身份转换：exited 和 entered 都应该是 IDLE
				expect(lastEvent.exited).to.be.ok();
				expect(lastEvent.entered).to.be.ok();
				expect(lastEvent.exited?.equals(TestState.IDLE)).to.equal(true);
				expect(lastEvent.entered?.equals(TestState.IDLE)).to.equal(true);
				expect(lastEvent.isTransition(TestState.IDLE, TestState.IDLE)).to.equal(true);
			}
		});

		it("should handle regular transition correctly", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(true);

			// 验证状态已更新
			const updatedState = resourceManager.getResourceByTypeDescriptor<State<TestState>>(typeDescriptor);
			expect(updatedState).to.be.ok();
			if (updatedState && typeIs(updatedState.is, "function")) {
				expect(updatedState.is(TestState.RUNNING)).to.equal(true);
			} else if (updatedState && typeIs(updatedState.get, "function")) {
				// 如果是 State 对象，使用 get() 方法获取当前状态
				const currentState = updatedState.get();
				expect(currentState.equals(TestState.RUNNING)).to.equal(true);
			}
		});

		it("should record last transition event", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			manager.processTransition(world, resourceManager);

			const lastEvent = manager.getLastTransition();
			expect(lastEvent).to.be.ok();
			expect(lastEvent!.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
		});

		it("should handle first transition without current state", () => {
			// 不设置初始状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(true);

			// 验证状态已创建
			const createdState = resourceManager.getResourceByTypeDescriptor<State<TestState>>(typeDescriptor);
			expect(createdState).to.be.ok();
			if (createdState && typeIs(createdState.is, "function")) {
				expect(createdState.is(TestState.RUNNING)).to.equal(true);
			} else if (createdState && typeIs(createdState.get, "function")) {
				const currentState = createdState.get();
				expect(currentState.equals(TestState.RUNNING)).to.equal(true);
			}
		});

		it("should clone last transition correctly", () => {
			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
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
			const manager = StateTransitionManager.create(typeDescriptor, eventManager);

			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
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
			const result = lastTransition<TestState>(resourceManager, "TestState" as any, "TestState" as any);

			expect(result).never.to.be.ok();
		});

		it("should return last transition when manager exists", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = StateTransitionManager.create(typeDescriptor, eventManager);

			// 将 StateTransitionManager 注册到 resourceManager
			// 注意：getGenericTypeDescriptor 的第一个参数应该是 undefined，与 lastTransition 函数中的保持一致
			const managerTypeDescriptor = getGenericTypeDescriptor<StateTransitionManager<TestState>>(undefined, "TestState" as any, "TestState" as any);
			resourceManager.insertResourceByTypeDescriptor(manager, managerTypeDescriptor);

			// 设置初始状态
			const currentState = State.create(TestState.IDLE);
			// State 资源使用状态类型的 TypeDescriptor，而不是 State 本身的
			resourceManager.insertResourceByTypeDescriptor(currentState, typeDescriptor);

			// 设置下一个状态
			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			// 处理转换
			manager.processTransition(world, resourceManager);

			// 获取最后的转换
			// lastTransition 需要正确的 id 和 text 参数
			const result = lastTransition<TestState>(resourceManager, "TestState" as any, "TestState" as any);

			expect(result).to.be.ok();
			expect(result!.isTransition(TestState.IDLE, TestState.RUNNING)).to.equal(true);
		});

		it("should handle errors gracefully", () => {
			// 创建一个会抛出错误的 rm
			const badRM = {} as ResourceManager;

			const result = lastTransition<TestState>(badRM);

			expect(result).never.to.be.ok();
		});
	});

	describe("Edge Cases", () => {
		it("should handle multiple sequential transitions", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = StateTransitionManager.create(typeDescriptor, eventManager);

			// 将 StateTransitionManager 注册到 resourceManager
			// 注意：getGenericTypeDescriptor 的第一个参数应该是 undefined，与 lastTransition 函数中的保持一致
			const managerTypeDescriptor = getGenericTypeDescriptor<StateTransitionManager<TestState>>(undefined, "TestState" as any, "TestState" as any);
			resourceManager.insertResourceByTypeDescriptor(manager, managerTypeDescriptor);

			// 第一次转换：undefined -> IDLE
			const nextState1 = NextState.withPending(TestState.IDLE);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState1, nextStateDescriptor);
			manager.processTransition(world, resourceManager);

			// 第二次转换：IDLE -> RUNNING
			const nextState2 = NextState.withPending(TestState.RUNNING);
			resourceManager.insertResourceByTypeDescriptor(nextState2, nextStateDescriptor);
			manager.processTransition(world, resourceManager);

			// 第三次转换：RUNNING -> PAUSED
			const nextState3 = NextState.withPending(TestState.PAUSED);
			resourceManager.insertResourceByTypeDescriptor(nextState3, nextStateDescriptor);
			manager.processTransition(world, resourceManager);

			const lastEvent = manager.getLastTransition();
			expect(lastEvent).to.be.ok();
			expect(lastEvent!.isTransition(TestState.RUNNING, TestState.PAUSED)).to.equal(true);
		});

		it("should handle transition when NextState is taken", () => {
			const typeDescriptor = getTypeDescriptor("TestState", "TestState")!;
			const manager = StateTransitionManager.create(typeDescriptor, eventManager);

			const nextState = NextState.withPending(TestState.RUNNING);
			const nextStateDescriptor = getGenericTypeDescriptor<NextState<TestState>>(typeDescriptor);
			resourceManager.insertResourceByTypeDescriptor(nextState, nextStateDescriptor);

			// 手动取出状态
			nextState.take();

			const result = manager.processTransition(world, resourceManager);

			expect(result).to.equal(false);
		});
	});
};