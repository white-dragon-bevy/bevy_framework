/**
 * computed-states.spec.ts - ComputedStates 单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { State } from "../resources";
import { EnumStates } from "../states";
import { BaseComputedStates, ComputedStateManager, MappedComputedState } from "../computed-states";

// 测试用的计算状态
class TestComputedState extends BaseComputedStates<EnumStates> {
	private value: string;

	public constructor(value: string) {
		super();
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
			const manager = new ComputedStateManager(
				EnumStates as any,
				TestComputedState as any,
			);

			// Initially no source state
			manager.updateComputedState(world, resourceManager);
			expect(resourceManager.hasResource(State<TestComputedState>)).to.equal(false);

			// Add source state
			resourceManager.insertResource(State<EnumStates>, State.create(menuState));
			manager.updateComputedState(world, resourceManager);

			const computedResource = resourceManager.getResource(State<TestComputedState>);
			expect(computedResource).to.be.ok();
			expect(computedResource?.get().getStateId()).to.equal("in_menu");

			// Change source state
			const sourceResource = resourceManager.getResource(State<EnumStates>)!;
			sourceResource._set(gameState);
			manager.updateComputedState(world, resourceManager);

			const updatedResource = resourceManager.getResource(State<TestComputedState>);
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
			const mapped = new MappedComputedState(mapping);
			const menuState = new EnumStates("menu");
			const result = mapped.compute(menuState);

			expect(result).to.be.ok();
			expect(result?.getStateId()).to.equal("ui_active");
		});

		it("should return undefined for unmapped states", () => {
			const mapped = new MappedComputedState(mapping);
			const unknownState = new EnumStates("unknown");
			const result = mapped.compute(unknownState);

			expect(result).to.equal(undefined);
		});

		it("should return undefined when source is undefined", () => {
			const mapped = new MappedComputedState(mapping);
			const result = mapped.compute(undefined);

			expect(result).to.equal(undefined);
		});
	});
};