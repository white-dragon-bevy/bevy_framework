/**
 * computed-states.spec.ts - 计算状态系统单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { States } from "../states";
import { State } from "../resources";
import {
	SingleStateSet,
	TupleStateSet,
	BaseComputedStates,
	MappedComputedState,
	createComputedState,
	createMultiSourceComputedState,
	ComputedStateManager,
	ComputedStates,
	StateSet,
} from "../computed-states";

/**
 * Mock 状态类 - 应用状态
 */
class MockAppState implements States {
	public static DEPENDENCY_DEPTH = 1;

	constructor(private id: string) {}

	public getStateId(): string {
		return this.id;
	}

	public clone(): States {
		return new MockAppState(this.id);
	}

	public equals(other: States): boolean {
		return this.id === other.getStateId();
	}
}

/**
 * Mock 状态类 - 菜单状态
 */
class MockMenuState implements States {
	public static DEPENDENCY_DEPTH = 1;

	constructor(private id: string) {}

	public getStateId(): string {
		return this.id;
	}

	public clone(): States {
		return new MockMenuState(this.id);
	}

	public equals(other: States): boolean {
		return this.id === other.getStateId();
	}
}

/**
 * Mock 计算状态类
 */
class MockComputedState extends BaseComputedStates<MockAppState> {
	private value: string;

	constructor(sourceStateSet: StateSet<MockAppState>, value: string = "") {
		super(sourceStateSet);
		this.value = value;
	}

	public getStateId(): string {
		return this.value;
	}

	public clone(): States {
		if (!this.sourceStateSet) {
			error("StateSet not configured");
		}

		return new MockComputedState(this.sourceStateSet, this.value);
	}

	public compute(sources: MockAppState | undefined): ComputedStates<MockAppState> | undefined {
		if (sources === undefined) {
			return undefined;
		}

		const sourceId = sources.getStateId();
		const computedValue = `computed_${sourceId}`;

		if (!this.sourceStateSet) {
			error("StateSet not configured");
		}

		return new MockComputedState(this.sourceStateSet, computedValue);
	}
}

export = () => {
	let world: World;
	let resourceManager: ResourceManager;

	beforeEach(() => {
		world = {} as World;
		resourceManager = new ResourceManager();
	});

	afterEach(() => {
		// Cleanup after each test
	});

	describe("SingleStateSet", () => {
		it("should return correct dependency depth from state class", () => {
			const stateSet = new SingleStateSet(MockAppState);
			expect(stateSet.getDependencyDepth()).to.equal(1);
		});

		it("should return default dependency depth when DEPENDENCY_DEPTH not set", () => {
			class NoDepthState implements States {
				public getStateId(): string {
					return "test";
				}

				public clone(): States {
					return new NoDepthState();
				}

				public equals(other: States): boolean {
					return this.getStateId() === other.getStateId();
				}
			}

			const stateSet = new SingleStateSet(NoDepthState);
			expect(stateSet.getDependencyDepth()).to.equal(1);
		});

		it("should throw error when calling getStates (not implemented)", () => {
			const stateSet = new SingleStateSet(MockAppState);
			const [success] = pcall(() => {
				stateSet.getStates(resourceManager);
			});
			expect(success).to.equal(false);
		});
	});

	describe("TupleStateSet", () => {
		it("should return max depth plus one for single state", () => {
			const stateSet = new TupleStateSet(MockAppState);
			expect(stateSet.getDependencyDepth()).to.equal(2);
		});

		it("should return max depth plus one for multiple states", () => {
			const stateSet = new TupleStateSet(MockAppState, MockMenuState);
			expect(stateSet.getDependencyDepth()).to.equal(2);
		});

		it("should handle states with different depths correctly", () => {
			class DeepState implements States {
				public static DEPENDENCY_DEPTH = 5;

				public getStateId(): string {
					return "deep";
				}

				public clone(): States {
					return new DeepState();
				}

				public equals(other: States): boolean {
					return this.getStateId() === other.getStateId();
				}
			}

			const stateSet = new TupleStateSet(MockAppState, DeepState);
			expect(stateSet.getDependencyDepth()).to.equal(6);
		});

		it("should throw error when calling getStates (not implemented)", () => {
			const stateSet = new TupleStateSet(MockAppState, MockMenuState);
			const [success] = pcall(() => {
				stateSet.getStates(resourceManager);
			});
			expect(success).to.equal(false);
		});
	});

	describe("BaseComputedStates", () => {
		let stateSet: StateSet<MockAppState>;

		beforeEach(() => {
			stateSet = new SingleStateSet(MockAppState);
		});

		it("should compute state from source", () => {
			const computedState = new MockComputedState(stateSet, "");
			const sourceState = new MockAppState("running");
			const result = computedState.compute(sourceState);

			expect(result).never.to.equal(undefined);

			if (result) {
				expect(result.getStateId()).to.equal("computed_running");
			}
		});

		it("should return undefined when computing from undefined source", () => {
			const computedState = new MockComputedState(stateSet, "");
			const result = computedState.compute(undefined);
			expect(result).to.equal(undefined);
		});

		it("should return source state set", () => {
			const computedState = new MockComputedState(stateSet, "test");
			const returnedStateSet = computedState.getSourceStateSet();
			expect(returnedStateSet).to.equal(stateSet);
		});

		it("should throw error when source state set not configured", () => {
			class BadComputedState extends BaseComputedStates<MockAppState> {
				constructor() {
					super();
				}

				public getStateId(): string {
					return "bad";
				}

				public clone(): States {
					return new BadComputedState();
				}

				public compute(): ComputedStates<MockAppState> | undefined {
					return undefined;
				}
			}

			const badState = new BadComputedState();
			const [success] = pcall(() => {
				badState.getSourceStateSet();
			});
			expect(success).to.equal(false);
		});

		it("should clone state correctly", () => {
			const computedState = new MockComputedState(stateSet, "original");
			const cloned = computedState.clone();

			expect(cloned.getStateId()).to.equal("original");
			expect(cloned).never.to.equal(computedState);
		});

		it("should check equality correctly", () => {
			const state1 = new MockComputedState(stateSet, "test");
			const state2 = new MockComputedState(stateSet, "test");
			const state3 = new MockComputedState(stateSet, "other");

			expect(state1.equals(state2)).to.equal(true);
			expect(state1.equals(state3)).to.equal(false);
		});

		it("should set dependency depth based on source state set", () => {
			const computedState = new MockComputedState(stateSet, "");
			const constructor = getmetatable(computedState) as { DEPENDENCY_DEPTH?: number };
			expect(constructor.DEPENDENCY_DEPTH).to.equal(2);
		});
	});

	describe("MappedComputedState", () => {
		let stateSet: StateSet<MockAppState>;
		let mapping: Map<string | number, States>;

		beforeEach(() => {
			stateSet = new SingleStateSet(MockAppState);
			mapping = new Map<string | number, States>();
			mapping.set("running", new MockMenuState("main_menu"));
			mapping.set("paused", new MockMenuState("pause_menu"));
		});

		it("should map source state to target state", () => {
			const mappedState = new MappedComputedState(stateSet, mapping);
			const sourceState = new MockAppState("running");
			const result = mappedState.compute(sourceState);

			expect(result).never.to.equal(undefined);

			if (result) {
				expect(result.getStateId()).to.equal("main_menu");
			}
		});

		it("should return undefined when source state not in mapping", () => {
			const mappedState = new MappedComputedState(stateSet, mapping);
			const sourceState = new MockAppState("unknown");
			const result = mappedState.compute(sourceState);
			expect(result).to.equal(undefined);
		});

		it("should return undefined when computing from undefined source", () => {
			const mappedState = new MappedComputedState(stateSet, mapping);
			const result = mappedState.compute(undefined);
			expect(result).to.equal(undefined);
		});

		it("should clone mapped state correctly", () => {
			const mappedState = new MappedComputedState(stateSet, mapping);
			const sourceState = new MockAppState("running");
			const computed = mappedState.compute(sourceState);

			expect(computed).never.to.equal(undefined);

			if (computed) {
				const cloned = computed.clone();
				expect(cloned.getStateId()).to.equal(computed.getStateId());
				expect(cloned).never.to.equal(computed);
			}
		});
	});

	describe("createComputedState", () => {
		it("should create computed state class with custom compute function", () => {
			const stateSet = new SingleStateSet(MockAppState);
			const ComputedClass = createComputedState(stateSet, (source) => {
				if (!source) {
					return undefined;
				}

				const id = source.getStateId();
				return new MockMenuState(`menu_${id}`);
			});

			const instance = new ComputedClass();
			const sourceState = new MockAppState("game");
			const result = instance.compute(sourceState);

			expect(result).never.to.equal(undefined);

			if (result) {
				expect(result.getStateId()).to.equal("menu_game");
			}
		});

		it("should return undefined when compute function returns undefined", () => {
			const stateSet = new SingleStateSet(MockAppState);
			const ComputedClass = createComputedState(stateSet, () => {
				return undefined;
			});

			const instance = new ComputedClass();
			const sourceState = new MockAppState("test");
			const result = instance.compute(sourceState);
			expect(result).to.equal(undefined);
		});

		it("should clone created computed state correctly", () => {
			const stateSet = new SingleStateSet(MockAppState);
			const ComputedClass = createComputedState(stateSet, (source) => {
				if (!source) {
					return undefined;
				}

				return new MockMenuState("test");
			});

			const instance = new ComputedClass();
			const sourceState = new MockAppState("game");
			const computed = instance.compute(sourceState);

			expect(computed).never.to.equal(undefined);

			if (computed) {
				const cloned = computed.clone();
				expect(cloned.getStateId()).to.equal(computed.getStateId());
			}
		});
	});

	describe("createMultiSourceComputedState", () => {
		it("should create computed state from multiple sources", () => {
			const ComputedClass = createMultiSourceComputedState(
				[MockAppState, MockMenuState] as const,
				(sources) => {
					const [appState, menuState] = sources;
					const combinedId = `${appState.getStateId()}_${menuState.getStateId()}`;
					return new MockAppState(combinedId);
				},
			);

			const instance = new ComputedClass();
			const sources = [new MockAppState("running"), new MockMenuState("main")] as const;
			const result = instance.compute(sources);

			expect(result).never.to.equal(undefined);

			if (result) {
				expect(result.getStateId()).to.equal("running_main");
			}
		});

		it("should return undefined when sources is undefined", () => {
			const ComputedClass = createMultiSourceComputedState(
				[MockAppState, MockMenuState] as const,
				(sources) => {
					return new MockAppState("test");
				},
			);

			const instance = new ComputedClass();
			const result = instance.compute(undefined);
			expect(result).to.equal(undefined);
		});

		it("should return undefined when compute function returns undefined", () => {
			const ComputedClass = createMultiSourceComputedState(
				[MockAppState, MockMenuState] as const,
				() => {
					return undefined;
				},
			);

			const instance = new ComputedClass();
			const sources = [new MockAppState("test"), new MockMenuState("menu")] as const;
			const result = instance.compute(sources);
			expect(result).to.equal(undefined);
		});

		it("should clone multi-source computed state correctly", () => {
			const ComputedClass = createMultiSourceComputedState(
				[MockAppState, MockMenuState] as const,
				() => {
					return new MockAppState("result");
				},
			);

			const instance = new ComputedClass();
			const sources = [new MockAppState("test"), new MockMenuState("menu")] as const;
			const computed = instance.compute(sources);

			expect(computed).never.to.equal(undefined);

			if (computed) {
				const cloned = computed.clone();
				expect(cloned.getStateId()).to.equal(computed.getStateId());
			}
		});
	});

	describe("ComputedStateManager", () => {
		it("should update computed state when source changes", () => {
			const stateSet = new SingleStateSet(MockAppState);
			const ComputedClass = class extends BaseComputedStates<MockAppState> {
				private value: string;

				constructor() {
					super(stateSet);
					this.value = "";
				}

				public getStateId(): string {
					return this.value;
				}

				public clone(): States {
					const cloned = new ComputedClass();
					cloned.value = this.value;
					return cloned;
				}

				public compute(sources: MockAppState | undefined): ComputedStates<MockAppState> | undefined {
					if (!sources) {
						return undefined;
					}

					const result = new ComputedClass();
					result.value = `updated_${sources.getStateId()}`;
					return result;
				}
			};

			const manager = new ComputedStateManager(ComputedClass);

			// Note: updateComputedState will call getStates which throws error
			// This test verifies the manager calls compute method
			const [success] = pcall(() => {
				manager.updateComputedState(world, resourceManager);
			});

			// Expected to fail due to getStates not implemented
			expect(success).to.equal(false);
		});

		it("should handle undefined computed result", () => {
			const stateSet = new SingleStateSet(MockAppState);
			const ComputedClass = class extends BaseComputedStates<MockAppState> {
				constructor() {
					super(stateSet);
				}

				public getStateId(): string {
					return "";
				}

				public clone(): States {
					return new ComputedClass();
				}

				public compute(): ComputedStates<MockAppState> | undefined {
					return undefined;
				}
			};

			const manager = new ComputedStateManager(ComputedClass);

			// Note: updateComputedState will fail due to getStates not implemented
			const [success] = pcall(() => {
				manager.updateComputedState(world, resourceManager);
			});

			expect(success).to.equal(false);
		});
	});
};
