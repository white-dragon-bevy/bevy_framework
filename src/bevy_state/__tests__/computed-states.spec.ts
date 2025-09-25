/**
 * computed-states.spec.ts - ComputedStates 单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager, ResourceConstructor } from "../../bevy_ecs/resource";
import { State } from "../resources";
import { EnumStates } from "../states";
import { BaseComputedStates, ComputedStateManager, MappedComputedState, SingleStateSet } from "../computed-states";

// 测试用的计算状态
class TestComputedState extends BaseComputedStates<EnumStates> {
	private value: string;

	public constructor(value: string = "default") {
		super(new SingleStateSet(EnumStates));
		this.value = value;
	}

	public getStateId(): string {
		return this.value;
	}

	public clone(): TestComputedState {
		return new TestComputedState(this.value);
	}

	public compute(source: EnumStates | undefined): TestComputedState | undefined {
		if (source === undefined) {
			return undefined;
		}

		const sourceId = source.getStateId();
		if (sourceId === "menu") {
			return new TestComputedState("in_menu");
		} else if (sourceId === "game") {
			return new TestComputedState("in_game");
		}
		return undefined;
	}
}

export = () => {
	describe("ComputedStates", () => {
		let world: World;
		let resourceManager: ResourceManager;
		let menuState: EnumStates;
		let gameState: EnumStates;

		beforeEach(() => {
			world = new World();
			resourceManager = new ResourceManager();
			menuState = new EnumStates("menu");
			gameState = new EnumStates("game");
		});

		it("should compute state from source", () => {
			const computed = new TestComputedState("test");
			const result = computed.compute(menuState);

			expect(result).to.be.ok();
			expect(result?.getStateId()).to.equal("in_menu");
		});

		it("should return undefined when source is undefined", () => {
			const computed = new TestComputedState("test");
			const result = computed.compute(undefined);

			expect(result).to.equal(undefined);
		});

		it("should clone computed state", () => {
			const original = new TestComputedState("test");
			const cloned = original.clone() as TestComputedState;

			expect(cloned.getStateId()).to.equal(original.getStateId());
		});

		it("should handle different source states", () => {
			const computed = new TestComputedState("test");

			// Test menu state
			const menuResult = computed.compute(menuState);
			expect(menuResult?.getStateId()).to.equal("in_menu");

			// Test game state
			const gameResult = computed.compute(gameState);
			expect(gameResult?.getStateId()).to.equal("in_game");

			// Test unknown state
			const unknownState = new EnumStates("unknown");
			const unknownResult = computed.compute(unknownState);
			expect(unknownResult).to.equal(undefined);
		});

		it("should support equals method for computed states", () => {
			const computed1 = new TestComputedState("test");
			const computed2 = new TestComputedState("test");
			const computed3 = new TestComputedState("different");

			expect(computed1.equals(computed2)).to.equal(true);
			expect(computed1.equals(computed3)).to.equal(false);
		});
	});

	describe("ComputedStateManager", () => {
		let world: World;
		let resourceManager: ResourceManager;
		let menuState: EnumStates;
		let gameState: EnumStates;

		beforeEach(() => {
			world = new World();
			resourceManager = new ResourceManager();
			menuState = new EnumStates("menu");
			gameState = new EnumStates("game");
		});

		it("should manage computed state updates", () => {
			// Add static name property to EnumStates for the test
			(EnumStates as any).name = "EnumStates";
			(TestComputedState as any).name = "TestComputedState";

			const manager = new ComputedStateManager(
				TestComputedState as any,
			);

			// Use string-based resource keys
			const sourceStateKey = "State<EnumStates>" as ResourceConstructor<State<EnumStates>>;
			const computedStateKey = "State<TestComputedState>" as ResourceConstructor<State<TestComputedState>>;

			// Initially no source state
			manager.updateComputedState(world, resourceManager);
			expect(resourceManager.hasResource(computedStateKey)).to.equal(false);

			// Add source state with string key
			resourceManager.insertResource(sourceStateKey, State.create(menuState));
			manager.updateComputedState(world, resourceManager);

			const computedResource = resourceManager.getResource(computedStateKey);
			expect(computedResource).to.be.ok();
			expect(computedResource?.get().getStateId()).to.equal("in_menu");

			// Change source state
			const sourceResource = resourceManager.getResource(sourceStateKey)!;
			sourceResource._set(gameState);
			manager.updateComputedState(world, resourceManager);

			const updatedResource = resourceManager.getResource(computedStateKey);
			expect(updatedResource?.get().getStateId()).to.equal("in_game");
		});
	});

	describe("MappedComputedState", () => {
		let mapping: Map<string | number, EnumStates>;

		beforeEach(() => {
			mapping = new Map([
				["menu", new EnumStates("ui_active")],
				["game", new EnumStates("ui_hidden")],
			]);
		});

		it("should map source states correctly", () => {
			const mapped = new MappedComputedState(new SingleStateSet(EnumStates), mapping);
			const menuState = new EnumStates("menu");
			const result = mapped.compute(menuState);

			expect(result).to.be.ok();
			expect(result?.getStateId()).to.equal("ui_active");
		});

		it("should return undefined for unmapped states", () => {
			const mapped = new MappedComputedState(new SingleStateSet(EnumStates), mapping);
			const unknownState = new EnumStates("unknown");
			const result = mapped.compute(unknownState);

			expect(result).to.equal(undefined);
		});

		it("should return undefined when source is undefined", () => {
			const mapped = new MappedComputedState(new SingleStateSet(EnumStates), mapping);
			const result = mapped.compute(undefined);

			expect(result).to.equal(undefined);
		});
	});
};