/**
 * condition.spec.ts - Condition 单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { State } from "../resources";
import { EnumStates } from "../states";
import {
	inState,
	stateExists,
	stateChanged,
	andCondition,
	orCondition,
	notCondition,
} from "../condition";

export = () => {
	describe("State Conditions", () => {
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

		describe("inState", () => {
			it("should return true when in target state", () => {
				resourceManager.insertResource(State<EnumStates>, State.create(menuState));
				const condition = inState(EnumStates as any, menuState);

				expect(condition(world, resourceManager)).to.equal(true);
			});

			it("should return false when not in target state", () => {
				resourceManager.insertResource(State<EnumStates>, State.create(gameState));
				const condition = inState(EnumStates as any, menuState);

				expect(condition(world, resourceManager)).to.equal(false);
			});

			it("should return false when state doesn't exist", () => {
				const condition = inState(EnumStates as any, menuState);
				expect(condition(world, resourceManager)).to.equal(false);
			});
		});

		describe("stateExists", () => {
			it("should return true when state exists", () => {
				resourceManager.insertResource(State<EnumStates>, State.create(menuState));
				const condition = stateExists(EnumStates as any);

				expect(condition(world, resourceManager)).to.equal(true);
			});

			it("should return false when state doesn't exist", () => {
				const condition = stateExists(EnumStates as any);
				expect(condition(world, resourceManager)).to.equal(false);
			});
		});

		describe("stateChanged", () => {
			it("should detect initial state", () => {
				const condition = stateChanged(EnumStates as any);

				// First call - no state
				expect(condition(world, resourceManager)).to.equal(false);

				// Add state
				resourceManager.insertResource(State<EnumStates>, State.create(menuState));

				// Second call - state added
				expect(condition(world, resourceManager)).to.equal(true);

				// Third call - no change
				expect(condition(world, resourceManager)).to.equal(false);
			});

			it("should detect state changes", () => {
				resourceManager.insertResource(State<EnumStates>, State.create(menuState));
				const condition = stateChanged(EnumStates as any);

				// Initial check
				expect(condition(world, resourceManager)).to.equal(true);

				// No change
				expect(condition(world, resourceManager)).to.equal(false);

				// Change state
				const stateResource = resourceManager.getResource(State<EnumStates>)!;
				stateResource._set(gameState);

				// Detect change
				expect(condition(world, resourceManager)).to.equal(true);
			});
		});

		describe("Condition Combinators", () => {
			it("should combine conditions with AND logic", () => {
				resourceManager.insertResource(State<EnumStates>, State.create(menuState));

				const condition1 = stateExists(EnumStates as any);
				const condition2 = inState(EnumStates as any, menuState);
				const combined = andCondition(condition1, condition2);

				expect(combined(world, resourceManager)).to.equal(true);

				// Change to different state
				const stateResource = resourceManager.getResource(State<EnumStates>)!;
				stateResource._set(gameState);

				expect(combined(world, resourceManager)).to.equal(false);
			});

			it("should combine conditions with OR logic", () => {
				const condition1 = inState(EnumStates as any, menuState);
				const condition2 = inState(EnumStates as any, gameState);
				const combined = orCondition(condition1, condition2);

				// Neither state exists
				expect(combined(world, resourceManager)).to.equal(false);

				// Add menu state
				resourceManager.insertResource(State<EnumStates>, State.create(menuState));
				expect(combined(world, resourceManager)).to.equal(true);

				// Change to game state
				const stateResource = resourceManager.getResource(State<EnumStates>)!;
				stateResource._set(gameState);
				expect(combined(world, resourceManager)).to.equal(true);
			});

			it("should negate conditions", () => {
				const condition = stateExists(EnumStates as any);
				const negated = notCondition(condition);

				expect(negated(world, resourceManager)).to.equal(true);

				resourceManager.insertResource(State<EnumStates>, State.create(menuState));
				expect(negated(world, resourceManager)).to.equal(false);
			});
		});
	});
};