/**
 * computed-states-multi-level.spec.ts - 多层计算状态集成测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { EnumStates, States } from "../states";
import {
	BaseComputedStates,
	ComputedStates,
	ComputedStateManager,
	SingleStateSet,
	sortByDependencyDepth,
} from "../computed-states";
import { State, StateConstructor } from "../resources";
import { getTypeDescriptor, TypeDescriptor } from "../../bevy_core";

/**
 * 基础状态 - 第一层
 */
class BaseState extends EnumStates {
	public static readonly ACTIVE = new BaseState("active");
	public static readonly INACTIVE = new BaseState("inactive");

	public constructor(value: string) {
		super(value);
	}

	public clone(): States {
		return new BaseState(this.getStateId() as string);
	}
}

/**
 * 派生状态 Level 1 - 从 BaseState 派生
 */
class Level1ComputedState extends BaseComputedStates<BaseState> {
	public static readonly ENABLED = new Level1ComputedState("enabled");
	public static readonly DISABLED = new Level1ComputedState("disabled");

	public constructor(private readonly value: string = "") {
		const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState");
		const stateSet = new SingleStateSet<BaseState>(
			BaseState as unknown as StateConstructor<BaseState>,
			baseTypeDescriptor,
		);
		super(stateSet);
	}

	public getStateId(): string | number {
		return this.value;
	}

	public clone(): States {
		return new Level1ComputedState(this.value);
	}

	public compute(source: BaseState | undefined): ComputedStates<BaseState> | undefined {
		if (source === undefined) {
			return undefined;
		}

		if (source.equals(BaseState.ACTIVE)) {
			return Level1ComputedState.ENABLED;
		}

		return Level1ComputedState.DISABLED;
	}
}

/**
 * 派生状态 Level 2 - 从 Level1ComputedState 派生
 */
class Level2ComputedState extends BaseComputedStates<Level1ComputedState> {
	public static readonly RUNNING = new Level2ComputedState("running");
	public static readonly STOPPED = new Level2ComputedState("stopped");

	public constructor(private readonly value: string = "") {
		const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState");
		const stateSet = new SingleStateSet<Level1ComputedState>(
			Level1ComputedState as unknown as StateConstructor<Level1ComputedState>,
			level1TypeDescriptor,
		);
		super(stateSet);
	}

	public getStateId(): string | number {
		return this.value;
	}

	public clone(): States {
		return new Level2ComputedState(this.value);
	}

	public compute(source: Level1ComputedState | undefined): ComputedStates<Level1ComputedState> | undefined {
		if (source === undefined) {
			return undefined;
		}

		if (source.equals(Level1ComputedState.ENABLED)) {
			return Level2ComputedState.RUNNING;
		}

		return Level2ComputedState.STOPPED;
	}
}

/**
 * 派生状态 Level 3 - 从 Level2ComputedState 派生
 */
class Level3ComputedState extends BaseComputedStates<Level2ComputedState> {
	public static readonly ONLINE = new Level3ComputedState("online");
	public static readonly OFFLINE = new Level3ComputedState("offline");

	public constructor(private readonly value: string = "") {
		const level2TypeDescriptor = getTypeDescriptor("Level2ComputedState", "Level2ComputedState");
		const stateSet = new SingleStateSet<Level2ComputedState>(
			Level2ComputedState as unknown as StateConstructor<Level2ComputedState>,
			level2TypeDescriptor,
		);
		super(stateSet);
	}

	public getStateId(): string | number {
		return this.value;
	}

	public clone(): States {
		return new Level3ComputedState(this.value);
	}

	public compute(source: Level2ComputedState | undefined): ComputedStates<Level2ComputedState> | undefined {
		if (source === undefined) {
			return undefined;
		}

		if (source.equals(Level2ComputedState.RUNNING)) {
			return Level3ComputedState.ONLINE;
		}

		return Level3ComputedState.OFFLINE;
	}
}

/**
 * 创建测试环境
 * @returns 测试环境对象
 */
function createTestEnvironment(): {
	resourceManager: ResourceManager;
	world: World;
} {
	const world = new World();
	const resourceManager = new ResourceManager();

	return { resourceManager, world };
}

export = () => {
	describe("Two-Level Computed States", () => {
		it("should derive level 1 from base state", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			const level1State = resourceManager.getResource<State<Level1ComputedState>>();

			expect(level1State).to.be.ok();
			expect(level1State!.get().equals(Level1ComputedState.ENABLED)).to.equal(true);
		});

		it("should update level 1 when base state changes", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			let level1State = resourceManager.getResource<State<Level1ComputedState>>();
			expect(level1State!.get().equals(Level1ComputedState.ENABLED)).to.equal(true);

			baseState.setInternal(BaseState.INACTIVE);
			level1Manager.updateComputedState(world, resourceManager);

			level1State = resourceManager.getResource<State<Level1ComputedState>>();
			expect(level1State!.get().equals(Level1ComputedState.DISABLED)).to.equal(true);
		});

		it("should derive level 2 from level 1", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState")!;
			const level1State = resourceManager.getResource<State<Level1ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level1State!, level1TypeDescriptor);

			const level2Manager = new ComputedStateManager(Level2ComputedState);
			level2Manager.updateComputedState(world, resourceManager);

			const level2State = resourceManager.getResource<State<Level2ComputedState>>();

			expect(level2State).to.be.ok();
			expect(level2State!.get().equals(Level2ComputedState.RUNNING)).to.equal(true);
		});

		it("should cascade updates through two levels", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState")!;

			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			const level1State = resourceManager.getResource<State<Level1ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level1State!, level1TypeDescriptor);

			const level2Manager = new ComputedStateManager(Level2ComputedState);
			level2Manager.updateComputedState(world, resourceManager);

			let level2State = resourceManager.getResource<State<Level2ComputedState>>();
			expect(level2State!.get().equals(Level2ComputedState.RUNNING)).to.equal(true);

			baseState.setInternal(BaseState.INACTIVE);
			level1Manager.updateComputedState(world, resourceManager);
			level2Manager.updateComputedState(world, resourceManager);

			level2State = resourceManager.getResource<State<Level2ComputedState>>();
			expect(level2State!.get().equals(Level2ComputedState.STOPPED)).to.equal(true);
		});
	});

	describe("Three-Level Computed States", () => {
		it("should derive level 3 from level 2", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState")!;
			const level2TypeDescriptor = getTypeDescriptor("Level2ComputedState", "Level2ComputedState")!;

			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			const level1State = resourceManager.getResource<State<Level1ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level1State!, level1TypeDescriptor);

			const level2Manager = new ComputedStateManager(Level2ComputedState);
			level2Manager.updateComputedState(world, resourceManager);

			const level2State = resourceManager.getResource<State<Level2ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level2State!, level2TypeDescriptor);

			const level3Manager = new ComputedStateManager(Level3ComputedState);
			level3Manager.updateComputedState(world, resourceManager);

			const level3State = resourceManager.getResource<State<Level3ComputedState>>();

			expect(level3State).to.be.ok();
			expect(level3State!.get().equals(Level3ComputedState.ONLINE)).to.equal(true);
		});

		it("should cascade updates through three levels", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState")!;
			const level2TypeDescriptor = getTypeDescriptor("Level2ComputedState", "Level2ComputedState")!;

			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			const level1State = resourceManager.getResource<State<Level1ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level1State!, level1TypeDescriptor);

			const level2Manager = new ComputedStateManager(Level2ComputedState);
			level2Manager.updateComputedState(world, resourceManager);

			const level2State = resourceManager.getResource<State<Level2ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level2State!, level2TypeDescriptor);

			const level3Manager = new ComputedStateManager(Level3ComputedState);
			level3Manager.updateComputedState(world, resourceManager);

			let level3State = resourceManager.getResource<State<Level3ComputedState>>();
			expect(level3State!.get().equals(Level3ComputedState.ONLINE)).to.equal(true);

			baseState.setInternal(BaseState.INACTIVE);
			level1Manager.updateComputedState(world, resourceManager);
			level2Manager.updateComputedState(world, resourceManager);
			level3Manager.updateComputedState(world, resourceManager);

			level3State = resourceManager.getResource<State<Level3ComputedState>>();
			expect(level3State!.get().equals(Level3ComputedState.OFFLINE)).to.equal(true);
		});

		it("should handle partial updates correctly", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState")!;
			const level2TypeDescriptor = getTypeDescriptor("Level2ComputedState", "Level2ComputedState")!;

			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level1Manager = new ComputedStateManager(Level1ComputedState);
			level1Manager.updateComputedState(world, resourceManager);

			const level1State = resourceManager.getResource<State<Level1ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level1State!, level1TypeDescriptor);

			const level2Manager = new ComputedStateManager(Level2ComputedState);
			level2Manager.updateComputedState(world, resourceManager);

			const level2State = resourceManager.getResource<State<Level2ComputedState>>();
			resourceManager.insertResourceByTypeDescriptor(level2State!, level2TypeDescriptor);

			const level3Manager = new ComputedStateManager(Level3ComputedState);
			level3Manager.updateComputedState(world, resourceManager);

			baseState.setInternal(BaseState.INACTIVE);
			level1Manager.updateComputedState(world, resourceManager);

			let level3State = resourceManager.getResource<State<Level3ComputedState>>();
			expect(level3State!.get().equals(Level3ComputedState.ONLINE)).to.equal(true);

			level2Manager.updateComputedState(world, resourceManager);
			level3Manager.updateComputedState(world, resourceManager);

			level3State = resourceManager.getResource<State<Level3ComputedState>>();
			expect(level3State!.get().equals(Level3ComputedState.OFFLINE)).to.equal(true);
		});
	});

	describe("DEPENDENCY_DEPTH", () => {
		it("should have correct dependency depth for level 1", () => {
			const metatable = getmetatable(new Level1ComputedState("test")) as { DEPENDENCY_DEPTH?: number };

			expect(metatable.DEPENDENCY_DEPTH).to.be.ok();
			expect(metatable.DEPENDENCY_DEPTH).to.equal(2);
		});

		it("should have correct dependency depth for level 2", () => {
			const metatable = getmetatable(new Level2ComputedState("test")) as { DEPENDENCY_DEPTH?: number };

			expect(metatable.DEPENDENCY_DEPTH).to.be.ok();
			expect(metatable.DEPENDENCY_DEPTH).to.equal(3);
		});

		it("should have correct dependency depth for level 3", () => {
			const metatable = getmetatable(new Level3ComputedState("test")) as { DEPENDENCY_DEPTH?: number };

			expect(metatable.DEPENDENCY_DEPTH).to.be.ok();
			expect(metatable.DEPENDENCY_DEPTH).to.equal(4);
		});

		it("should increment dependency depth at each level", () => {
			const level1Depth = (getmetatable(new Level1ComputedState("test")) as { DEPENDENCY_DEPTH?: number })
				.DEPENDENCY_DEPTH;
			const level2Depth = (getmetatable(new Level2ComputedState("test")) as { DEPENDENCY_DEPTH?: number })
				.DEPENDENCY_DEPTH;
			const level3Depth = (getmetatable(new Level3ComputedState("test")) as { DEPENDENCY_DEPTH?: number })
				.DEPENDENCY_DEPTH;

			expect(level2Depth).to.equal(level1Depth! + 1);
			expect(level3Depth).to.equal(level2Depth! + 1);
		});
	});

	describe("sortByDependencyDepth", () => {
		it("should sort states by dependency depth ascending", () => {
			type ComputedStateConstructor = new () => ComputedStates;

			const states: Array<ComputedStateConstructor> = [
				Level3ComputedState as unknown as ComputedStateConstructor,
				Level1ComputedState as unknown as ComputedStateConstructor,
				Level2ComputedState as unknown as ComputedStateConstructor,
			];

			const sorted = sortByDependencyDepth(states);

			const depth1 = (getmetatable(new sorted[0]()) as { DEPENDENCY_DEPTH?: number }).DEPENDENCY_DEPTH;
			const depth2 = (getmetatable(new sorted[1]()) as { DEPENDENCY_DEPTH?: number }).DEPENDENCY_DEPTH;
			const depth3 = (getmetatable(new sorted[2]()) as { DEPENDENCY_DEPTH?: number }).DEPENDENCY_DEPTH;

			expect(depth1).to.equal(2);
			expect(depth2).to.equal(3);
			expect(depth3).to.equal(4);
		});

		it("should maintain order for equal depths", () => {
			class EqualDepth1 extends BaseComputedStates<BaseState> {
				public constructor() {
					const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState");
					const stateSet = new SingleStateSet<BaseState>(
						BaseState as unknown as StateConstructor<BaseState>,
						baseTypeDescriptor,
					);
					super(stateSet);
				}

				public getStateId(): string | number {
					return "equal1";
				}

				public clone(): States {
					return new EqualDepth1();
				}

				public compute(source: BaseState | undefined): ComputedStates<BaseState> | undefined {
					return source ? this : undefined;
				}
			}

			class EqualDepth2 extends BaseComputedStates<BaseState> {
				public constructor() {
					const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState");
					const stateSet = new SingleStateSet<BaseState>(
						BaseState as unknown as StateConstructor<BaseState>,
						baseTypeDescriptor,
					);
					super(stateSet);
				}

				public getStateId(): string | number {
					return "equal2";
				}

				public clone(): States {
					return new EqualDepth2();
				}

				public compute(source: BaseState | undefined): ComputedStates<BaseState> | undefined {
					return source ? this : undefined;
				}
			}

			type ComputedStateConstructor = new () => ComputedStates;

			const states: Array<ComputedStateConstructor> = [
				EqualDepth1 as unknown as ComputedStateConstructor,
				EqualDepth2 as unknown as ComputedStateConstructor,
			];

			const sorted = sortByDependencyDepth(states);

			expect(sorted[0]).to.equal(EqualDepth1);
			expect(sorted[1]).to.equal(EqualDepth2);
		});

		it("should handle empty array", () => {
			type ComputedStateConstructor = new () => ComputedStates;

			const states: Array<ComputedStateConstructor> = [];

			const sorted = sortByDependencyDepth(states);

			expect(sorted.size()).to.equal(0);
		});

		it("should handle single element", () => {
			type ComputedStateConstructor = new () => ComputedStates;

			const states: Array<ComputedStateConstructor> = [
				Level1ComputedState as unknown as ComputedStateConstructor,
			];

			const sorted = sortByDependencyDepth(states);

			expect(sorted.size()).to.equal(1);
			expect(sorted[0]).to.equal(Level1ComputedState);
		});
	});

	describe("Dependency Update Order Validation", () => {
		it("should update in correct order when sorted", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;
			const level1TypeDescriptor = getTypeDescriptor("Level1ComputedState", "Level1ComputedState")!;
			const level2TypeDescriptor = getTypeDescriptor("Level2ComputedState", "Level2ComputedState")!;

			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			type ComputedStateConstructor = new () => ComputedStates;

			const managers: Array<ComputedStateConstructor> = [
				Level3ComputedState as unknown as ComputedStateConstructor,
				Level1ComputedState as unknown as ComputedStateConstructor,
				Level2ComputedState as unknown as ComputedStateConstructor,
			];

			const sorted = sortByDependencyDepth(managers);

			for (const StateClass of sorted) {
				const manager = new ComputedStateManager(StateClass as new () => ComputedStates);
				manager.updateComputedState(world, resourceManager);

				if (StateClass === (Level1ComputedState as unknown as ComputedStateConstructor)) {
					const level1State = resourceManager.getResource<State<Level1ComputedState>>();
					resourceManager.insertResourceByTypeDescriptor(level1State!, level1TypeDescriptor);
				} else if (StateClass === (Level2ComputedState as unknown as ComputedStateConstructor)) {
					const level2State = resourceManager.getResource<State<Level2ComputedState>>();
					resourceManager.insertResourceByTypeDescriptor(level2State!, level2TypeDescriptor);
				}
			}

			const level3State = resourceManager.getResource<State<Level3ComputedState>>();

			expect(level3State).to.be.ok();
			expect(level3State!.get().equals(Level3ComputedState.ONLINE)).to.equal(true);
		});

		it("should fail when updated in wrong order", () => {
			const { world, resourceManager } = createTestEnvironment();

			const baseTypeDescriptor = getTypeDescriptor("BaseState", "BaseState")!;

			const baseState = State.create(BaseState.ACTIVE);
			resourceManager.insertResourceByTypeDescriptor(baseState, baseTypeDescriptor);

			const level3Manager = new ComputedStateManager(Level3ComputedState);
			level3Manager.updateComputedState(world, resourceManager);

			const level3State = resourceManager.getResource<State<Level3ComputedState>>();

			expect(level3State).never.to.be.ok();
		});
	});
};
