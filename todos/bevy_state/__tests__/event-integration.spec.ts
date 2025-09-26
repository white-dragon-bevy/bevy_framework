/**
 * 测试状态转换事件系统集成
 */

import { World } from "@rbxts/matter";
import { EventManager } from "../../../src/bevy_ecs/events";
import { ResourceManager, ResourceConstructor } from "../../../src/bevy_ecs/resource";
import { StateTransitionManager, getStateTransitionReader, lastTransition, StateTransitionEvent } from "../../../src/bevy_state/transitions";
import { Error } from "@rbxts/luau-polyfill";
import { NextState, State } from "../../../src/bevy_state/resources";
import { EnumStates } from "../../../src/bevy_state/states";

// 定义测试状态
class TestState extends EnumStates {
	equals(Loading: TestState): any {
		throw new Error("Method not implemented.");
	}
	public static readonly Loading = new TestState("Loading");
	public static readonly Menu = new TestState("Menu");
	public static readonly Game = new TestState("Game");

	public constructor(value: string) {
		super(value);
	}

	public clone(): TestState {
		return new TestState(this.getStateId() as string);
	}
	getStateId(): string {
		throw new Error("Method not implemented.");
	}
}

export = () => {
	describe("StateTransitionEvent Integration", () => {
		let world: World;
		let eventManager: EventManager;
		let resourceManager: ResourceManager;
		let transitionManager: StateTransitionManager<TestState>;

		beforeEach(() => {
			world = new World();
			eventManager = new EventManager(world);
			resourceManager = new ResourceManager();
			transitionManager = new StateTransitionManager(
				TestState as unknown as new (...args: any[]) => TestState,
				eventManager,
			);

			// 存储 transitionManager 到 world 中以便 lastTransition 函数能够访问
			const worldWithManagers = world as unknown as Record<string, unknown>;
			const managerKey = `stateTransitionManager_${tostring(TestState)}`;
			worldWithManagers[managerKey] = transitionManager;
		});

		it("should send transition events when state changes", () => {
			// 创建事件读取器
			const eventReader = getStateTransitionReader<TestState>(eventManager);

			// 设置初始状态转换 - 使用 NextState 类作为键
			const nextStateKey = NextState<TestState> as ResourceConstructor<NextState<TestState>>;
			resourceManager.insertResource(nextStateKey, NextState.withPending(TestState.Loading));

			// 处理转换
			transitionManager.processTransition(world, resourceManager);

			// 读取事件
			const events = eventReader.read();
			expect(events.size()).to.equal(1);

			const event = events[0];
			expect(event).to.be.ok();
			expect(event.entered).to.be.ok();
			expect(event.entered!.equals(TestState.Loading)).to.equal(true);
			expect(event.exited).to.never.be.ok(); // 初始状态没有退出
		});

		it("should track last transition event", () => {
			// 设置初始状态转换 - 使用类作为键
			const nextStateKey = NextState<TestState> as ResourceConstructor<NextState<TestState>>;
			const stateKey = State<TestState> as ResourceConstructor<State<TestState>>;

			// 先设置一个当前状态
			resourceManager.insertResource(stateKey, State.create(TestState.Loading));

			// 设置转换到 Menu 状态
			resourceManager.insertResource(nextStateKey, NextState.withPending(TestState.Menu));

			// 处理转换
			transitionManager.processTransition(world, resourceManager);

			// 检查最后转换事件
			const lastEvent = lastTransition(world, TestState as unknown as new (...args: any[]) => TestState);
			expect(lastEvent).to.be.ok();

			if (lastEvent) {
				expect(lastEvent.exited).to.be.ok();
				expect(lastEvent.exited!.equals(TestState.Loading)).to.equal(true);
				expect(lastEvent.entered).to.be.ok();
				expect(lastEvent.entered!.equals(TestState.Menu)).to.equal(true);
			}
		});

		it("should clone transition events correctly", () => {
			const originalEvent = new StateTransitionEvent(TestState.Loading, TestState.Menu);
			const clonedEvent = originalEvent.clone();

			expect(clonedEvent).to.be.ok();
			expect(clonedEvent).to.never.equal(originalEvent); // 不是同一个对象
			expect(clonedEvent.exited).to.be.ok();
			expect(clonedEvent.exited!.equals(TestState.Loading)).to.equal(true);
			expect(clonedEvent.entered).to.be.ok();
			expect(clonedEvent.entered!.equals(TestState.Menu)).to.equal(true);
		});

		it("should handle identity transitions correctly", () => {
			const eventReader = getStateTransitionReader<TestState>(eventManager);

			// 设置初始状态 - 使用类作为键
			const nextStateKey = NextState<TestState> as ResourceConstructor<NextState<TestState>>;
			const stateKey = State<TestState> as ResourceConstructor<State<TestState>>;

			resourceManager.insertResource(stateKey, State.create(TestState.Loading));

			// 设置相同状态转换（身份转换）
			resourceManager.insertResource(nextStateKey, NextState.withPending(TestState.Loading));

			// 处理转换
			transitionManager.processTransition(world, resourceManager);

			// 读取事件
			const events = eventReader.read();
			expect(events.size()).to.equal(1);

			const event = events[0];
			expect(event.exited).to.be.ok();
			expect(event.exited!.equals(TestState.Loading)).to.equal(true);
			expect(event.entered).to.be.ok();
			expect(event.entered!.equals(TestState.Loading)).to.equal(true);
		});

		it("should check transition event conditions correctly", () => {
			const event = new StateTransitionEvent(TestState.Loading, TestState.Menu);

			expect(event.isExitingFrom(TestState.Loading)).to.equal(true);
			expect(event.isExitingFrom(TestState.Game)).to.equal(false);

			expect(event.isEnteringTo(TestState.Menu)).to.equal(true);
			expect(event.isEnteringTo(TestState.Loading)).to.equal(false);

			expect(event.isTransition(TestState.Loading, TestState.Menu)).to.equal(true);
			expect(event.isTransition(TestState.Menu, TestState.Game)).to.equal(false);
		});

		afterEach(() => {
			// 清理事件管理器
			eventManager.cleanup();
		});
	});
};
