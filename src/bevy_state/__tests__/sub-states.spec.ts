/**
 * sub-states.spec.ts - SubStates 单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { State, NextState, getStateResource, getNextStateResource } from "../resources";
import { EnumStates } from "../states";
import { BaseSubStates, SubStateManager, SubStateConfig } from "../sub-states";

// 父状态
const ParentStates = {
	MENU: new EnumStates("menu"),
	GAME: new EnumStates("game"),
	PAUSED: new EnumStates("paused"),
};

// 子状态类
class TestSubState extends BaseSubStates<EnumStates> {
	private value: string;

	public constructor(value: string, config: SubStateConfig<EnumStates>) {
		super(config);
		this.value = value;
	}

	public getStateId(): string {
		return this.value;
	}

	public clone(): TestSubState {
		return new TestSubState(this.value, this.config);
	}
}

export = () => {
	describe("SubStates", () => {
		let config: SubStateConfig<EnumStates>;

		beforeEach(() => {
			config = {
				parentType: EnumStates as any,
				allowedParentStates: new Set(["menu", "paused"]),
			};
		});

		it("should check if should exist based on parent state", () => {
			const subState = new TestSubState("sub_menu", config);

			expect(subState.shouldExist(ParentStates.MENU)).to.equal(true);
			expect(subState.shouldExist(ParentStates.PAUSED)).to.equal(true);
			expect(subState.shouldExist(ParentStates.GAME)).to.equal(false);
			expect(subState.shouldExist(undefined)).to.equal(false);
		});

		it("should clone sub state correctly", () => {
			const original = new TestSubState("sub_menu", config);
			const cloned = original.clone() as TestSubState;

			expect(cloned.getStateId()).to.equal(original.getStateId());
			expect(cloned.shouldExist(ParentStates.MENU)).to.equal(true);
		});

		it("should get sub state config", () => {
			const subState = new TestSubState("sub_menu", config);
			const retrievedConfig = subState.getSubStateConfig();

			expect(retrievedConfig.allowedParentStates).to.equal(config.allowedParentStates);
		});
	});

	describe("SubStateManager", () => {
		let world: World;
		let resourceManager: ResourceManager;
		let config: SubStateConfig<EnumStates>;
		let manager: SubStateManager<EnumStates, TestSubState>;
		// Get typed resource classes
		const ParentStateResource = getStateResource(EnumStates as any);
		const SubStateResource = getStateResource(TestSubState as any);
		const NextSubStateResource = getNextStateResource(TestSubState as any);

		beforeEach(() => {
			world = new World();
			resourceManager = new ResourceManager();
			config = {
				parentType: EnumStates as any,
				allowedParentStates: new Set(["menu", "paused"]),
			};
			manager = new SubStateManager(
				EnumStates as any,
				TestSubState as any,
				() => new TestSubState("default_sub", config),
			);

			// Initialize NextState resources
			resourceManager.insertResource(NextSubStateResource as any, NextState.unchanged<TestSubState>());
		});

		it("should create sub state when parent is valid", () => {
			// Set parent to menu state
			const ParentStateClass = ParentStateResource as unknown as new (state: EnumStates) => State<EnumStates>;
			resourceManager.insertResource(ParentStateResource as any, new ParentStateClass(ParentStates.MENU));

			// Update sub state
			manager.updateSubState(world, resourceManager);

			// Sub state should exist
			const subStateResource = resourceManager.getResource(SubStateResource as any) as State<TestSubState> | undefined;
			expect(subStateResource).to.be.ok();
			expect(subStateResource?.get().getStateId()).to.equal("default_sub");
		});

		it("should remove sub state when parent is invalid", () => {
			// Set parent to menu state and create sub state
			const ParentStateClass = ParentStateResource as unknown as new (state: EnumStates) => State<EnumStates>;
			resourceManager.insertResource(ParentStateResource as any, new ParentStateClass(ParentStates.MENU));
			manager.updateSubState(world, resourceManager);

			// Verify sub state exists
			expect(resourceManager.hasResource(SubStateResource as any)).to.equal(true);

			// Change parent to game state (not allowed)
			const parentResource = resourceManager.getResource(ParentStateResource as any) as State<EnumStates> | undefined;
			parentResource!._set(ParentStates.GAME);

			// Update sub state
			manager.updateSubState(world, resourceManager);

			// Sub state should be removed
			expect(resourceManager.hasResource(SubStateResource as any)).to.equal(false);
		});

		it("should process sub state transitions", () => {
			// Set parent to menu state
			const ParentStateClass = ParentStateResource as unknown as new (state: EnumStates) => State<EnumStates>;
			resourceManager.insertResource(ParentStateResource as any, new ParentStateClass(ParentStates.MENU));
			manager.updateSubState(world, resourceManager);

			// Queue a sub state transition
			const nextSubState = resourceManager.getResource(NextSubStateResource as any) as NextState<TestSubState> | undefined;
			nextSubState!.set(new TestSubState("new_sub", config));

			// Process transition
			const transitioned = manager.processSubStateTransition(world, resourceManager);
			expect(transitioned).to.equal(true);

			// Check new state
			const subStateResource = resourceManager.getResource(SubStateResource as any) as State<TestSubState> | undefined;
			expect(subStateResource?.get().getStateId()).to.equal("new_sub");
		});

		it("should not transition when parent state is invalid", () => {
			// Set parent to game state (not allowed)
			const ParentStateClass = ParentStateResource as unknown as new (state: EnumStates) => State<EnumStates>;
			resourceManager.insertResource(ParentStateResource as any, new ParentStateClass(ParentStates.GAME));

			// Queue a sub state transition
			const nextSubState = resourceManager.getResource(NextSubStateResource as any) as NextState<TestSubState> | undefined;
			nextSubState!.set(new TestSubState("new_sub", config));

			// Process transition
			const transitioned = manager.processSubStateTransition(world, resourceManager);
			expect(transitioned).to.equal(false);

			// Sub state should not exist
			expect(resourceManager.hasResource(SubStateResource as any)).to.equal(false);
		});
	});
};