/**
 * sub-states.spec.ts - SubStates 单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { EnumStates, States } from "../states";
import { BaseSubStates, SubStateConfig, SubStateManager, createEnumSubState } from "../sub-states";
import { State, NextState, StateConstructor } from "../resources";
import { getTypeDescriptor, TypeDescriptor } from "../../bevy_core";

/**
 * Mock 父状态类
 */
class MockParentState extends EnumStates {
	public static readonly ACTIVE = new MockParentState("active");
	public static readonly INACTIVE = new MockParentState("inactive");
	public static readonly PAUSED = new MockParentState("paused");

	public constructor(value: string) {
		super(value);
	}

	public clone(): States {
		return new MockParentState(this.getStateId() as string);
	}
}

/**
 * Mock 子状态类
 */
class MockSubState extends BaseSubStates<MockParentState> {
	public static readonly SUB_A = new MockSubState("sub_a");
	public static readonly SUB_B = new MockSubState("sub_b");

	public constructor(
		private readonly value: string,
		config?: SubStateConfig<MockParentState>,
	) {
		super(
			config ?? {
				parentType: MockParentState as unknown as StateConstructor<MockParentState>,
				allowedParentStates: new Set([MockParentState.ACTIVE.getStateId()]),
			},
		);
	}

	/**
	 * 检查在给定父状态下是否应该存在
	 * @param parentState - 父状态
	 * @returns 初始状态或 undefined
	 */
	public shouldExist(parentState: MockParentState | undefined): this | undefined {
		if (parentState === undefined) {
			return undefined;
		}
		return this.config.allowedParentStates.has(parentState.getStateId()) ? this : undefined;
	}

	public getStateId(): string | number {
		return this.value;
	}

	public clone(): States {
		return new MockSubState(this.value, this.getSubStateConfig());
	}
}

/**
 * 创建测试用的 TypeDescriptor
 * @param name - 类型名称
 * @returns TypeDescriptor
 */
function createMockTypeDescriptor(name: string): TypeDescriptor {
	return {
		id: tostring(math.random()),
		text: name,
	};
}

export = () => {
	describe("BaseSubStates", () => {
		let config: SubStateConfig<MockParentState>;

		beforeEach(() => {
			config = {
				parentType: MockParentState as unknown as StateConstructor<MockParentState>,
				allowedParentStates: new Set([MockParentState.ACTIVE.getStateId()]),
			};
		});

		describe("getStateId", () => {
			it("should return correct state id", () => {
				const subState = new MockSubState("test_state", config);
				expect(subState.getStateId()).to.equal("test_state");
			});

			it("should handle different state ids", () => {
				const subState1 = new MockSubState("state_1", config);
				const subState2 = new MockSubState("state_2", config);

				expect(subState1.getStateId()).to.equal("state_1");
				expect(subState2.getStateId()).to.equal("state_2");
				expect(subState1.getStateId()).never.to.equal(subState2.getStateId());
			});
		});

		describe("equals", () => {
			it("should compare states correctly when equal", () => {
				const subState1 = new MockSubState("test_state", config);
				const subState2 = new MockSubState("test_state", config);

				expect(subState1.equals(subState2)).to.equal(true);
			});

			it("should compare states correctly when not equal", () => {
				const subState1 = new MockSubState("state_a", config);
				const subState2 = new MockSubState("state_b", config);

				expect(subState1.equals(subState2)).to.equal(false);
			});
		});

		describe("clone", () => {
			it("should clone state correctly", () => {
				const original = new MockSubState("test_state", config);
				const cloned = original.clone();

				expect(cloned.getStateId()).to.equal(original.getStateId());
				expect(cloned.equals(original)).to.equal(true);
			});

			it("should create independent instances", () => {
				const original = new MockSubState("test_state", config);
				const cloned = original.clone() as MockSubState;

				expect(cloned).never.to.equal(original);
				expect(cloned.getSubStateConfig()).to.equal(original.getSubStateConfig());
			});
		});

		describe("getSubStateConfig", () => {
			it("should return correct config", () => {
				const subState = new MockSubState("test_state", config);
				const returnedConfig = subState.getSubStateConfig();

				expect(returnedConfig).to.equal(config);
				expect(returnedConfig.parentType).to.equal(config.parentType);
				expect(returnedConfig.allowedParentStates).to.equal(config.allowedParentStates);
			});

			it("should preserve allowed parent states", () => {
				const allowedStates = new Set([
					MockParentState.ACTIVE.getStateId(),
					MockParentState.PAUSED.getStateId(),
				]);
				const customConfig: SubStateConfig<MockParentState> = {
					parentType: MockParentState as unknown as StateConstructor<MockParentState>,
					allowedParentStates: allowedStates,
				};

				const subState = new MockSubState("test_state", customConfig);
				const returnedConfig = subState.getSubStateConfig();

				expect(returnedConfig.allowedParentStates).to.equal(allowedStates);
				expect(returnedConfig.allowedParentStates.size()).to.equal(2);
			});
		});

		describe("shouldExist", () => {
			it("should return self when parent state is allowed", () => {
				const subState = new MockSubState("test_state", config);
				const allowedParent = MockParentState.ACTIVE;

				const result = subState.shouldExist(allowedParent);
				expect(result).to.equal(subState);
			});

			it("should return undefined when parent state is not allowed", () => {
				const subState = new MockSubState("test_state", config);
				const notAllowedParent = MockParentState.INACTIVE;

				expect(subState.shouldExist(notAllowedParent)).to.equal(undefined);
			});

			it("should return undefined when parent state is undefined", () => {
				const subState = new MockSubState("test_state", config);

				expect(subState.shouldExist(undefined)).to.equal(undefined);
			});

			it("should handle multiple allowed parent states", () => {
				const multiConfig: SubStateConfig<MockParentState> = {
					parentType: MockParentState as unknown as StateConstructor<MockParentState>,
					allowedParentStates: new Set([
						MockParentState.ACTIVE.getStateId(),
						MockParentState.PAUSED.getStateId(),
					]),
				};
				const subState = new MockSubState("test_state", multiConfig);

				expect(subState.shouldExist(MockParentState.ACTIVE)).to.equal(subState);
				expect(subState.shouldExist(MockParentState.PAUSED)).to.equal(subState);
				expect(subState.shouldExist(MockParentState.INACTIVE)).to.equal(undefined);
			});
		});
	});

	describe("SubStateManager", () => {
		let world: World;
		let resourceManager: ResourceManager;
		let parentTypeDescriptor: TypeDescriptor;
		let stateTypeDescriptor: TypeDescriptor;
		let nextStateTypeDescriptor: TypeDescriptor;
		let manager: SubStateManager<MockParentState, MockSubState>;

		beforeEach(() => {
			world = {} as World;
			resourceManager = new ResourceManager();
			parentTypeDescriptor = createMockTypeDescriptor("MockParentState");
			stateTypeDescriptor = createMockTypeDescriptor("State<MockSubState>");
			nextStateTypeDescriptor = createMockTypeDescriptor("NextState<MockSubState>");

			// 创建一个简单的子状态类作为工厂
			class SubStateFactory extends MockSubState {
				public constructor() {
					super("sub_a");
				}
			}

			manager = new SubStateManager<MockParentState, MockSubState>(
				parentTypeDescriptor,
				stateTypeDescriptor,
				nextStateTypeDescriptor,
				SubStateFactory as unknown as new () => MockSubState,
			);
		});

		afterEach(() => {
			// Cleanup resources
			resourceManager = undefined as unknown as ResourceManager;
		});

		describe("updateSubState", () => {
			it("should create sub state when parent state is allowed", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				manager.updateSubState(world, resourceManager);

				const subStateResource =
					resourceManager.getResourceByTypeDescriptor<State<MockSubState>>(stateTypeDescriptor);

				expect(subStateResource).to.be.ok();
				expect(subStateResource!.get().getStateId()).to.equal(MockSubState.SUB_A.getStateId());
			});

			it("should not create sub state when parent state is not allowed", () => {
				const parentState = State.create(MockParentState.INACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				manager.updateSubState(world, resourceManager);

				const subStateResource =
					resourceManager.getResourceByTypeDescriptor<State<MockSubState>>(stateTypeDescriptor);

				expect(subStateResource).never.to.be.ok();
			});

			it("should remove sub state when parent changes to disallowed state", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const subState = State.create(MockSubState.SUB_A);
				subState.typeDescriptor = stateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(subState, stateTypeDescriptor);

				parentState.setInternal(MockParentState.INACTIVE);

				manager.updateSubState(world, resourceManager);

				const subStateResource =
					resourceManager.getResourceByTypeDescriptor<State<MockSubState>>(stateTypeDescriptor);

				expect(subStateResource).never.to.be.ok();
			});

			it("should clear NextState when removing sub state", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const subState = State.create(MockSubState.SUB_A);
				subState.typeDescriptor = stateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(subState, stateTypeDescriptor);

				const nextSubState = NextState.create<MockSubState>();
				nextSubState.typeDescriptor = nextStateTypeDescriptor;
				nextSubState.set(MockSubState.SUB_B);
				resourceManager.insertResourceByTypeDescriptor(nextSubState, nextStateTypeDescriptor);

				parentState.setInternal(MockParentState.INACTIVE);

				manager.updateSubState(world, resourceManager);

				const nextSubStateResource =
					resourceManager.getResourceByTypeDescriptor<NextState<MockSubState>>(nextStateTypeDescriptor);

				expect(nextSubStateResource).to.be.ok();
				expect(nextSubStateResource!.isUnchanged()).to.equal(true);
			});

			it("should not recreate existing sub state when still allowed", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const existingSubState = State.create(MockSubState.SUB_B);
				existingSubState.typeDescriptor = stateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(existingSubState, stateTypeDescriptor);

				manager.updateSubState(world, resourceManager);

				const subStateResource =
					resourceManager.getResourceByTypeDescriptor<State<MockSubState>>(stateTypeDescriptor);

				expect(subStateResource).to.be.ok();
				expect(subStateResource!.get().getStateId()).to.equal(MockSubState.SUB_B.getStateId());
			});
		});

		describe("processSubStateTransition", () => {
			it("should process pending sub state transition", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const subState = State.create(MockSubState.SUB_A);
				subState.typeDescriptor = stateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(subState, stateTypeDescriptor);

				const nextSubState = NextState.create<MockSubState>();
				nextSubState.typeDescriptor = nextStateTypeDescriptor;
				nextSubState.set(MockSubState.SUB_B);
				resourceManager.insertResourceByTypeDescriptor(nextSubState, nextStateTypeDescriptor);

				const transitioned = manager.processSubStateTransition(world, resourceManager);

				expect(transitioned).to.equal(true);

				const subStateResource =
					resourceManager.getResourceByTypeDescriptor<State<MockSubState>>(stateTypeDescriptor);

				expect(subStateResource).to.be.ok();
				expect(subStateResource!.get().getStateId()).to.equal(MockSubState.SUB_B.getStateId());
			});

			it("should return false when no sub state exists", () => {
				const parentState = State.create(MockParentState.INACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const transitioned = manager.processSubStateTransition(world, resourceManager);

				expect(transitioned).to.equal(false);
			});

			it("should return false when NextState is not pending", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const subState = State.create(MockSubState.SUB_A);
				subState.typeDescriptor = stateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(subState, stateTypeDescriptor);

				const nextSubState = NextState.create<MockSubState>();
				nextSubState.typeDescriptor = nextStateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(nextSubState, nextStateTypeDescriptor);

				const transitioned = manager.processSubStateTransition(world, resourceManager);

				expect(transitioned).to.equal(false);
			});

			it("should clear NextState after transition", () => {
				const parentState = State.create(MockParentState.ACTIVE);
				parentState.typeDescriptor = parentTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(parentState, parentTypeDescriptor);

				const subState = State.create(MockSubState.SUB_A);
				subState.typeDescriptor = stateTypeDescriptor;
				resourceManager.insertResourceByTypeDescriptor(subState, stateTypeDescriptor);

				const nextSubState = NextState.create<MockSubState>();
				nextSubState.typeDescriptor = nextStateTypeDescriptor;
				nextSubState.set(MockSubState.SUB_B);
				resourceManager.insertResourceByTypeDescriptor(nextSubState, nextStateTypeDescriptor);

				manager.processSubStateTransition(world, resourceManager);

				const nextSubStateResource =
					resourceManager.getResourceByTypeDescriptor<NextState<MockSubState>>(nextStateTypeDescriptor);

				expect(nextSubStateResource).to.be.ok();
				expect(nextSubStateResource!.isUnchanged()).to.equal(true);
			});
		});
	});

	describe("createEnumSubState", () => {
		let config: SubStateConfig<MockParentState>;

		beforeEach(() => {
			config = {
				parentType: MockParentState as unknown as StateConstructor<MockParentState>,
				allowedParentStates: new Set([MockParentState.ACTIVE.getStateId()]),
			};
		});

		it("should create sub states correctly", () => {
			const result = createEnumSubState(config, {
				LOADING: "loading",
				READY: "ready",
				ERROR: "error",
			});

			expect(result.states.LOADING.getStateId()).to.equal("loading");
			expect(result.states.READY.getStateId()).to.equal("ready");
			expect(result.states.ERROR.getStateId()).to.equal("error");
		});

		it("should handle numeric values", () => {
			const result = createEnumSubState(config, {
				LOADING: 0,
				READY: 1,
				ERROR: 2,
			});

			expect(result.states.LOADING.getStateId()).to.equal(0);
			expect(result.states.READY.getStateId()).to.equal(1);
			expect(result.states.ERROR.getStateId()).to.equal(2);
		});

		it("should create states with correct config", () => {
			const result = createEnumSubState(config, {
				STATE_A: "a",
				STATE_B: "b",
			});

			expect(result.states.STATE_A.getSubStateConfig()).to.equal(config);
			expect(result.states.STATE_B.getSubStateConfig()).to.equal(config);
		});

		it("should support shouldExist checks", () => {
			const result = createEnumSubState(config, {
				STATE_A: "a",
			});

			expect(result.states.STATE_A.shouldExist(MockParentState.ACTIVE)).to.equal(result.states.STATE_A);
			expect(result.states.STATE_A.shouldExist(MockParentState.INACTIVE)).to.equal(undefined);
		});

		it("should create cloneable states", () => {
			const result = createEnumSubState(config, {
				STATE_A: "a",
			});

			const original = result.states.STATE_A;
			const cloned = original.clone();

			expect(cloned.getStateId()).to.equal(original.getStateId());
			expect(cloned.equals(original)).to.equal(true);
		});

		it("should handle empty values object", () => {
			const result = createEnumSubState(config, {});

			expect(result.states).to.be.ok();
			expect(next(result.states)[0]).never.to.be.ok();
		});

		it("should create independent state instances", () => {
			const result = createEnumSubState(config, {
				STATE_A: "a",
				STATE_B: "b",
			});

			expect(result.states.STATE_A.equals(result.states.STATE_B)).to.equal(false);
		});
	});
};