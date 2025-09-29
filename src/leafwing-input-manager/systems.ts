/**
 * The systems that power each InputManagerPlugin.
 */

import { ActionState } from "./action-state/action-state";
import { ClashStrategy } from "./clashing-inputs/clash-strategy";
import { InputMap, ProcessedActionState } from "./input-map/input-map";
import { Actionlike } from "./actionlike";
import { CentralInputStore } from "./user-input/central-input-store";
import { ActionDiff } from "./action-diff";
import { World } from "@rbxts/matter";
import { ActionData } from "./action-state/action-data";
import { Instant } from "./instant";
import type { UpdatedActions } from "./action-state/action-state";
import { SummarizedActionState } from "./summarized-action-state";
import { usePrintDebounce } from "../utils";

/**
 * Converts ProcessedActionState to ActionData for ActionState updates
 * @param processedActions - The processed actions from InputMap
 * @returns UpdatedActions compatible with ActionState
 */
function convertToUpdatedActions<A extends Actionlike>(
	processedActions: { actionData: Map<string, ProcessedActionState>; consumedInputs: Set<string> },
): UpdatedActions<A> {
	const actionData = new Map<string, ActionData>();

	processedActions.actionData.forEach((processed, hash) => {
		const data = new ActionData();
		data.pressed = processed.pressed;
		data.value = processed.value;

		if (processed.axisPair) {
			data.axisPairX = processed.axisPair.X;
			data.axisPairY = processed.axisPair.Y;
		}

		actionData.set(hash, data);
	});

	return {
		actionData,
		consumedInputs: processedActions.consumedInputs,
	};
}

/**
 * We are about to enter the Main schedule, so we:
 * - save all the changes applied to state into the fixed_update_state
 * - switch to loading the update_state
 */
export function swapToUpdate<A extends Actionlike>(
	world: World,
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	if (resourceActionState) {
		resourceActionState.swapToUpdateState();
	}

	for (const entity of query) {
		entity.actionState.swapToUpdateState();
	}
}

/**
 * We are about to enter the FixedMain schedule, so we:
 * - save all the changes applied to state into the update_state
 * - switch to loading the fixed_update_state
 */
export function swapToFixedUpdate<A extends Actionlike>(
	world: World,
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	if (resourceActionState) {
		resourceActionState.swapToFixedUpdateState();
	}

	for (const entity of query) {
		entity.actionState.swapToFixedUpdateState();
	}
}

/**
 * Advances actions timer.
 *
 * Clears the just-pressed and just-released values of all ActionStates.
 * Also resets the internal pressed_this_tick field, used to track whether to release an action.
 */
export function tickActionState<A extends Actionlike>(
	world: World,
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState: ActionState<A> | undefined,
	currentTime: number,
	previousTime: number,
): void {
	const currentInstant = Instant.fromTimestamp(currentTime);
	const previousInstant = Instant.fromTimestamp(previousTime);

	// Only tick the ActionState resource if it exists
	if (resourceActionState) {
		resourceActionState.tickWithInstants(currentInstant, previousInstant);
	}

	// Only tick the ActionState components if they exist
	for (const entity of query) {
		entity.actionState.tickWithInstants(currentInstant, previousInstant);
	}
}

/**
 * Clears the CentralInputStore to prevent input from carrying over between frames
 *
 * This should be called at the end of each frame after all systems have processed input
 */
export function clearCentralInputStore(inputStore: CentralInputStore): void {
	inputStore.clear();
}

/**
 * Fetches the CentralInputStore to update ActionState according to the InputMap.
 *
 * Clashes will be resolved according to the ClashStrategy resource.
 */
export function updateActionState<A extends Actionlike>(
	inputStore: CentralInputStore,
	clashStrategy: ClashStrategy,
	query: Array<{ actionState: ActionState<A>; inputMap: InputMap<A> }>,
	resourceActionState?: ActionState<A>,
	resourceInputMap?: InputMap<A>,
): void {
	// 使用防抖打印检查空格键状态
	const spaceButtonValue = inputStore.getButtonValue("keyboard_Space");
	if (spaceButtonValue && spaceButtonValue.pressed) {
		usePrintDebounce(`[updateActionState] 🎯 检测到空格键输入！pressed: ${spaceButtonValue.pressed}, value: ${spaceButtonValue.value}`, 2);
	}

	// Handle resource-level action state and input map
	if (resourceActionState && resourceInputMap) {
		const processedActions = resourceInputMap.processActions(inputStore);
		const updatedActions = convertToUpdatedActions<A>(processedActions);
		resourceActionState.updateFromUpdatedActions(updatedActions);
	}

	// 调试：打印查询大小
	usePrintDebounce(`[updateActionState] 🔍 开始处理 ${query.size()} 个实体`, 5);

	// Handle entity-level action states and input maps
	for (const entity of query) {
		const processedActions = entity.inputMap.processActions(inputStore);
		const updatedActions = convertToUpdatedActions<A>(processedActions);

		// 使用防抖打印检查处理结果
		if (spaceButtonValue && spaceButtonValue.pressed && updatedActions.actionData.size() > 0) {
			usePrintDebounce(`[updateActionState] 📦 为实体处理了 ${updatedActions.actionData.size()} 个动作更新`, 2);
		}

		// 调试：记录更新前的动作数量
		const actionCount = updatedActions.actionData.size();
		if (actionCount > 0 && spaceButtonValue && spaceButtonValue.pressed) {
			usePrintDebounce(`[updateActionState] 🔄 实体将更新 ${actionCount} 个动作`, 2);
		}

		entity.actionState.updateFromUpdatedActions(updatedActions);
	}
}

/**
 * Release all inputs if the window loses focus
 *
 * This prevents inputs from being "stuck" when the user alt-tabs away from the game.
 */
export function releaseOnWindowFocusLost<A extends Actionlike>(
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
	windowFocused: boolean = true,
): void {
	if (!windowFocused) {
		if (resourceActionState) {
			resourceActionState.releaseAll();
		}

		for (const entity of query) {
			entity.actionState.releaseAll();
		}
	}
}

/**
 * Generates ActionDiff messages for network synchronization
 *
 * This system captures the differences in action states and prepares them
 * for transmission over the network.
 *
 * @param world - The Matter world
 * @param query - Query results containing entities with ActionState
 * @param resourceActionState - Optional resource-level ActionState
 * @param previousSnapshot - Previous frame's state snapshot (from useHook or resource)
 * @returns Object containing diffs and updated snapshot
 */
export function generateActionDiffs<A extends Actionlike>(
	world: World,
	query: Array<{ entity: number; actionState: ActionState<A> }>,
	resourceActionState: ActionState<A> | undefined,
	previousSnapshot: import("./summarized-action-state").SummarizedActionState<A> | undefined,
): {
	diffs: Array<ActionDiff<A>>;
	currentSnapshot: import("./summarized-action-state").SummarizedActionState<A>;
} {
	// Build hash to action map for reverse lookup
	const hashToAction = new Map<string, A>();
	if (resourceActionState) {
		const resourceHashMap = resourceActionState.getHashToActionMap();
		resourceHashMap.forEach((action: A, hash: string) => hashToAction.set(hash, action));
	}
	for (const { actionState } of query) {
		const entityHashMap = actionState.getHashToActionMap();
		entityHashMap.forEach((action: A, hash: string) => hashToAction.set(hash, action));
	}

	// Create entity states array with string IDs
	const entityStates = query.map(({ entity, actionState }) => ({
		entityId: tostring(entity),
		actionState,
	}));

	// Summarize current frame state
	const currentSnapshot = SummarizedActionState.summarize<A>(resourceActionState, entityStates);

	const diffs: Array<ActionDiff<A>> = [];

	// If no previous snapshot, return empty diffs (first frame)
	if (!previousSnapshot) {
		return { diffs, currentSnapshot };
	}

	// Generate diffs for all entities
	const allEntities = currentSnapshot.allEntities();
	allEntities.forEach((entityId) => {
		const entityDiffs = currentSnapshot.entityDiffs(entityId, previousSnapshot, hashToAction);
		for (const diff of entityDiffs) {
			diffs.push(diff);
		}
	});

	return { diffs, currentSnapshot };
}

/**
 * Applies received ActionDiff messages to update ActionStates
 *
 * This system processes incoming network messages to synchronize action states
 * across clients.
 *
 * @param diffs - Array of action diffs to apply
 * @param query - Query results containing entities with ActionState
 * @param resourceActionState - Optional resource-level ActionState
 * @param entityOwnerMap - Optional map from diff owner ID to entity ID
 */
export function applyActionDiffs<A extends Actionlike>(
	diffs: Array<{ entityId?: string; diff: ActionDiff<A> }>,
	query: Array<{ entity: number; actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
	entityOwnerMap?: Map<string, number>,
): void {
	// Build entity lookup map
	const entityMap = new Map<string, ActionState<A>>();
	for (const { entity, actionState } of query) {
		entityMap.set(tostring(entity), actionState);
	}

	// Apply each diff
	for (const { entityId, diff } of diffs) {
		if (!entityId || entityId === "resource") {
			// Apply to resource-level action state
			if (resourceActionState) {
				resourceActionState.applyDiff(diff);
			}
		} else {
			// Map owner ID to entity ID if needed
			const targetEntityId = entityOwnerMap?.get(entityId) || entityId;
			const targetActionState = entityMap.get(tostring(targetEntityId));

			if (targetActionState) {
				targetActionState.applyDiff(diff);
			}
		}
	}
}

/**
 * Clears all action states
 *
 * This can be useful when transitioning between game states.
 */
export function clearActionStates<A extends Actionlike>(
	query: Array<{ actionState: ActionState<A> }>,
	resourceActionState?: ActionState<A>,
): void {
	if (resourceActionState) {
		resourceActionState.clear();
	}

	for (const entity of query) {
		entity.actionState.clear();
	}
}