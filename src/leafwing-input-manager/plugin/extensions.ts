/**
 * InputManager 扩展接口定义
 * 为泛型 InputManagerPlugin 提供类型安全的扩展接口
 */

import type { Actionlike } from "../actionlike";
import type { ComponentDefinition } from "./component-factory";
import type { InputMap } from "../input-map/input-map";
import type { ActionState } from "../action-state/action-state";
import type { BevyWorld } from "../../bevy_ecs";

/**
 * 输入管理器扩展接口
 * 每个 InputManagerPlugin 实例注册一个命名空间扩展
 *
 * @template A - Action 类型
 */
export interface InputManagerExtension<A extends Actionlike> {
	/**
	 * 获取组件定义
	 * 用于查询和操作实体
	 */
	getComponents(): ComponentDefinition<A>;

	/**
	 * 创建带有输入组件的实体
	 *
	 * @param world - Bevy World
	 * @param inputMap - 输入映射
	 * @param actionState - 动作状态(可选)
	 * @returns 创建的实体 ID
	 */
	spawnWithInput(world: BevyWorld, inputMap: InputMap<A>, actionState?: ActionState<A>): number;

	/**
	 * 获取实体的输入数据
	 *
	 * @param world - Bevy World
	 * @param entityId - 实体 ID
	 * @returns 输入系统数据,如果实体没有该组件则返回 undefined
	 */
	getEntityInputData(world: BevyWorld, entityId: number): ReturnType<ComponentDefinition<A>["get"]>;

	/**
	 * 为现有实体添加输入组件
	 *
	 * @param world - Bevy World
	 * @param entityId - 实体 ID
	 * @param inputMap - 输入映射
	 * @param actionState - 动作状态(可选)
	 */
	addInputToEntity(
		world: BevyWorld,
		entityId: number,
		inputMap: InputMap<A>,
		actionState?: ActionState<A>
	): void;

	/**
	 * 从实体移除输入组件
	 *
	 * @param world - Bevy World
	 * @param entityId - 实体 ID
	 */
	removeInputFromEntity(world: BevyWorld, entityId: number): void;

	/**
	 * 查询所有具有特定动作类型组件的实体
	 *
	 * @param world - Bevy World
	 * @returns 实体和其输入数据的迭代器
	 */
	queryInputEntities(world: BevyWorld): ReturnType<ComponentDefinition<A>["query"]>;
}
