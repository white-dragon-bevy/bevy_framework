/**
 * condition.spec.ts - 状态运行条件单元测试
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { State } from "../resources";
import { EnumStates } from "../states";
import {
	RunCondition,
	inState,
	stateChanged,
	exitingState,
	enteringState,
	andCondition,
	orCondition,
	notCondition,
	customCondition,
	alwaysRun,
	neverRun,
} from "../condition";
import { getTypeDescriptor, TypeDescriptor } from "../../bevy_core";

/**
 * 测试用的游戏状态枚举
 */
class GameState extends EnumStates {
	public static readonly MENU = new GameState("menu");
	public static readonly PLAYING = new GameState("playing");
	public static readonly PAUSED = new GameState("paused");
}

/**
 * 创建测试环境
 * @returns 测试环境对象
 */
function createTestEnvironment(): {
	resourceManager: ResourceManager;
	stateTypeDescriptor: TypeDescriptor;
	world: World;
} {
	const world = new World();
	const resourceManager = new ResourceManager();
	const stateTypeDescriptor = getTypeDescriptor("GameState", "GameState")!;

	return { resourceManager, stateTypeDescriptor, world };
}

export = () => {
	describe("inState", () => {
		it("should return true when in target state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = inState(stateTypeDescriptor, GameState.MENU);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should return false when not in target state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = inState(stateTypeDescriptor, GameState.PLAYING);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should return false when state resource does not exist", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();

			const condition = inState(stateTypeDescriptor, GameState.MENU);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should handle state transitions correctly", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = inState(stateTypeDescriptor, GameState.PLAYING);

			expect(condition(world, resourceManager)).to.equal(false);

			stateResource.setInternal(GameState.PLAYING);

			expect(condition(world, resourceManager)).to.equal(true);
		});
	});

	describe("stateChanged", () => {
		it("should return true on first check (initialization)", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = stateChanged(stateTypeDescriptor);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should return false when state has not changed", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = stateChanged(stateTypeDescriptor);

			condition(world, resourceManager);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should return true when state has changed", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = stateChanged(stateTypeDescriptor);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PLAYING);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should track state changes correctly over multiple transitions", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = stateChanged(stateTypeDescriptor);

			expect(condition(world, resourceManager)).to.equal(true);

			expect(condition(world, resourceManager)).to.equal(false);

			stateResource.setInternal(GameState.PLAYING);

			expect(condition(world, resourceManager)).to.equal(true);

			expect(condition(world, resourceManager)).to.equal(false);

			stateResource.setInternal(GameState.PAUSED);

			expect(condition(world, resourceManager)).to.equal(true);
		});

		it("should return true when state resource is removed", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = stateChanged(stateTypeDescriptor);

			condition(world, resourceManager);

			resourceManager.removeResourceByDescriptor(stateTypeDescriptor);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});
	});

	describe("exitingState", () => {
		it("should return false when not exiting state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = exitingState(stateTypeDescriptor, GameState.MENU);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should return true when exiting target state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = exitingState(stateTypeDescriptor, GameState.MENU);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PLAYING);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should return false after exiting is complete", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = exitingState(stateTypeDescriptor, GameState.MENU);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PLAYING);

			condition(world, resourceManager);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should only detect exit from specific state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.PLAYING);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = exitingState(stateTypeDescriptor, GameState.MENU);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PAUSED);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});
	});

	describe("enteringState", () => {
		it("should return false when not entering state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = enteringState(stateTypeDescriptor, GameState.PLAYING);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should return true when entering target state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = enteringState(stateTypeDescriptor, GameState.PLAYING);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PLAYING);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should return false after entering is complete", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = enteringState(stateTypeDescriptor, GameState.PLAYING);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PLAYING);

			condition(world, resourceManager);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should only detect entry to specific state", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = enteringState(stateTypeDescriptor, GameState.PLAYING);

			condition(world, resourceManager);

			stateResource.setInternal(GameState.PAUSED);
			const result = condition(world, resourceManager);

			expect(result).to.equal(false);
		});
	});

	describe("andCondition", () => {
		it("should return true when all conditions are true", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition1 = inState(stateTypeDescriptor, GameState.MENU);
			const condition2: RunCondition = () => true;
			const combined = andCondition(condition1, condition2);

			const result = combined(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should return false when any condition is false", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition1 = inState(stateTypeDescriptor, GameState.MENU);
			const condition2: RunCondition = () => false;
			const combined = andCondition(condition1, condition2);

			const result = combined(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should handle empty conditions array", () => {
			const { world, resourceManager } = createTestEnvironment();

			const combined = andCondition();
			const result = combined(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should short-circuit on first false condition", () => {
			const { world, resourceManager } = createTestEnvironment();
			let callCount = 0;
			const condition1: RunCondition = () => false;
			const condition2: RunCondition = () => {
				callCount += 1;
				return true;
			};

			const combined = andCondition(condition1, condition2);
			combined(world, resourceManager);

			expect(callCount).to.equal(0);
		});
	});

	describe("orCondition", () => {
		it("should return true when any condition is true", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition1 = inState(stateTypeDescriptor, GameState.PLAYING);
			const condition2 = inState(stateTypeDescriptor, GameState.MENU);
			const combined = orCondition(condition1, condition2);

			const result = combined(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should return false when all conditions are false", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition1 = inState(stateTypeDescriptor, GameState.PLAYING);
			const condition2 = inState(stateTypeDescriptor, GameState.PAUSED);
			const combined = orCondition(condition1, condition2);

			const result = combined(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should handle empty conditions array", () => {
			const { world, resourceManager } = createTestEnvironment();

			const combined = orCondition();
			const result = combined(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should short-circuit on first true condition", () => {
			const { world, resourceManager } = createTestEnvironment();
			let callCount = 0;
			const condition1: RunCondition = () => true;
			const condition2: RunCondition = () => {
				callCount += 1;
				return false;
			};

			const combined = orCondition(condition1, condition2);
			combined(world, resourceManager);

			expect(callCount).to.equal(0);
		});
	});

	describe("notCondition", () => {
		it("should invert true condition", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = inState(stateTypeDescriptor, GameState.MENU);
			const inverted = notCondition(condition);

			const result = inverted(world, resourceManager);

			expect(result).to.equal(false);
		});

		it("should invert false condition", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = inState(stateTypeDescriptor, GameState.PLAYING);
			const inverted = notCondition(condition);

			const result = inverted(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should support double negation", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const condition = inState(stateTypeDescriptor, GameState.MENU);
			const doubleNegated = notCondition(notCondition(condition));

			const result = doubleNegated(world, resourceManager);

			expect(result).to.equal(true);
		});
	});

	describe("customCondition", () => {
		it("should wrap custom function correctly", () => {
			const { world, resourceManager } = createTestEnvironment();
			const customFn = (): boolean => true;

			const condition = customCondition(customFn);
			const result = condition(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should pass world and resourceManager to custom function", () => {
			const { world, resourceManager } = createTestEnvironment();
			let receivedWorld: World | undefined;
			let receivedResourceManager: ResourceManager | undefined;

			const customFn = (w: World, rm: ResourceManager): boolean => {
				receivedWorld = w;
				receivedResourceManager = rm;
				return true;
			};

			const condition = customCondition(customFn);
			condition(world, resourceManager);

			expect(receivedWorld).to.equal(world);
			expect(receivedResourceManager).to.equal(resourceManager);
		});

		it("should support stateful custom conditions", () => {
			const { world, resourceManager } = createTestEnvironment();
			let callCount = 0;

			const customFn = (): boolean => {
				callCount += 1;
				return callCount > 2;
			};

			const condition = customCondition(customFn);

			expect(condition(world, resourceManager)).to.equal(false);
			expect(condition(world, resourceManager)).to.equal(false);
			expect(condition(world, resourceManager)).to.equal(true);
		});
	});

	describe("alwaysRun", () => {
		it("should always return true", () => {
			const { world, resourceManager } = createTestEnvironment();

			expect(alwaysRun(world, resourceManager)).to.equal(true);
			expect(alwaysRun(world, resourceManager)).to.equal(true);
			expect(alwaysRun(world, resourceManager)).to.equal(true);
		});

		it("should work with condition combinators", () => {
			const { world, resourceManager } = createTestEnvironment();

			const combined = andCondition(alwaysRun, alwaysRun);

			expect(combined(world, resourceManager)).to.equal(true);
		});
	});

	describe("neverRun", () => {
		it("should always return false", () => {
			const { world, resourceManager } = createTestEnvironment();

			expect(neverRun(world, resourceManager)).to.equal(false);
			expect(neverRun(world, resourceManager)).to.equal(false);
			expect(neverRun(world, resourceManager)).to.equal(false);
		});

		it("should work with condition combinators", () => {
			const { world, resourceManager } = createTestEnvironment();

			const combined = orCondition(neverRun, neverRun);

			expect(combined(world, resourceManager)).to.equal(false);
		});
	});

	describe("complex condition combinations", () => {
		it("should support nested AND/OR combinations", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const inMenu = inState(stateTypeDescriptor, GameState.MENU);
			const inPlaying = inState(stateTypeDescriptor, GameState.PLAYING);
			const combined = andCondition(orCondition(inMenu, inPlaying), alwaysRun);

			const result = combined(world, resourceManager);

			expect(result).to.equal(true);
		});

		it("should support NOT with combinations", () => {
			const { world, resourceManager, stateTypeDescriptor } = createTestEnvironment();
			const stateResource = State.create(GameState.MENU);
			resourceManager.insertResourceByTypeDescriptor(stateResource, stateTypeDescriptor);

			const inMenu = inState(stateTypeDescriptor, GameState.MENU);
			const notInMenu = notCondition(inMenu);
			const combined = orCondition(notInMenu, neverRun);

			const result = combined(world, resourceManager);

			expect(result).to.equal(false);
		});
	});
};