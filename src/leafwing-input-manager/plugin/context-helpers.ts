/**
 * InputManager Context Helper Functions
 * 提供新的组件系统访问方法
 *
 * @deprecated 推荐使用通过 AppContext 扩展访问,这些辅助函数将在未来版本中移除
 * 新方式: context.playerInput.spawnWithInput(world, inputMap)
 * 旧方式: spawnWithInput(context, plugin, inputMap)
 */

import { AppContext } from "../../bevy_app/context";
import { Actionlike } from "../actionlike";
import type { InputManagerExtension } from "./extensions";
import { ComponentDefinition } from "./component-factory";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";

interface InputManagerPlugin<A extends Actionlike> {
	extension: InputManagerExtension<A>;
}

/**
 * 获取特定 Action 类型的组件定义
 *
 * @param plugin - InputManagerPlugin 实例
 * @returns ComponentDefinition 用于查询和操作实体
 * @example
 * ```typescript
 * const plugin = new InputManagerPlugin<PlayerAction>({ actionTypeName: "PlayerAction" });
 * const components = getActionComponents(plugin);
 *
 * // 查询所有具有该动作组件的实体
 * for (const [entityId, data] of components.query(world)) {
 *     if (data.actionState?.pressed(PlayerAction.Jump)) {
 *         // Handle jump
 *     }
 * }
 * ```
 */
export function getActionComponents<A extends Actionlike>(
	plugin: InputManagerPlugin<A>,
): ComponentDefinition<A> {
	return plugin.extension.getComponents();
}

/**
 * 创建带有输入组件的实体
 *
 * @param context - App 上下文
 * @param plugin - InputManagerPlugin 实例
 * @param inputMap - 输入映射
 * @param actionState - 动作状态（可选）
 * @returns 创建的实体 ID
 * @example
 * ```typescript
 * const plugin = new InputManagerPlugin<PlayerAction>({ actionTypeName: "PlayerAction" });
 * const inputMap = new InputMap<PlayerAction>()
 *     .insert(PlayerAction.Jump, KeyCode.Space)
 *     .insert(PlayerAction.Attack, MouseButton.Left);
 *
 * const entityId = spawnWithInput(context, plugin, inputMap);
 * ```
 */
export function spawnWithInput<A extends Actionlike>(
	context: AppContext,
	plugin: InputManagerPlugin<A>,
	inputMap: InputMap<A>,
	actionState?: ActionState<A>,
): number {
	const components = plugin.extension.getComponents();
	return components.spawn(context.world, inputMap, actionState);
}

/**
 * 获取实体的输入数据
 *
 * @param context - App 上下文
 * @param plugin - InputManagerPlugin 实例
 * @param entityId - 实体 ID
 * @returns 输入系统数据，如果实体没有该组件则返回 undefined
 * @example
 * ```typescript
 * const data = getEntityInputData(context, plugin, playerId);
 * if (data?.actionState?.pressed(PlayerAction.Jump)) {
 *     // Player is jumping
 * }
 * ```
 */
export function getEntityInputData<A extends Actionlike>(
	context: AppContext,
	plugin: InputManagerPlugin<A>,
	entityId: number,
) {
	const components = plugin.extension.getComponents();
	return components.get(context.world, entityId);
}

/**
 * 为现有实体添加输入组件
 *
 * @param context - App 上下文
 * @param plugin - InputManagerPlugin 实例
 * @param entityId - 实体 ID
 * @param inputMap - 输入映射
 * @param actionState - 动作状态（可选）
 * @example
 * ```typescript
 * const entityId = world.spawn();
 * const inputMap = new InputMap<PlayerAction>()
 *     .insert(PlayerAction.Jump, KeyCode.Space);
 *
 * addInputToEntity(context, plugin, entityId, inputMap);
 * ```
 */
export function addInputToEntity<A extends Actionlike>(
	context: AppContext,
	plugin: InputManagerPlugin<A>,
	entityId: number,
	inputMap: InputMap<A>,
	actionState?: ActionState<A>,
): void {
	const components = plugin.extension.getComponents();
	components.insert(context.world, entityId, inputMap, actionState);
}

/**
 * 从实体移除输入组件
 *
 * @param context - App 上下文
 * @param plugin - InputManagerPlugin 实例
 * @param entityId - 实体 ID
 * @example
 * ```typescript
 * removeInputFromEntity(context, plugin, playerId);
 * ```
 */
export function removeInputFromEntity<A extends Actionlike>(
	context: AppContext,
	plugin: InputManagerPlugin<A>,
	entityId: number,
): void {
	const components = plugin.extension.getComponents();
	components.remove(context.world, entityId);
}

/**
 * 查询所有具有特定动作类型组件的实体
 *
 * @param context - App 上下文
 * @param plugin - InputManagerPlugin 实例
 * @returns 实体和其输入数据的迭代器
 * @example
 * ```typescript
 * for (const [entityId, data] of queryInputEntities(context, plugin)) {
 *     if (data.actionState?.pressed(PlayerAction.Attack)) {
 *         // Process attack
 *     }
 * }
 * ```
 */
export function queryInputEntities<A extends Actionlike>(
	context: AppContext,
	plugin: InputManagerPlugin<A>,
) {
	const components = plugin.extension.getComponents();
	return components.query(context.world);
}
