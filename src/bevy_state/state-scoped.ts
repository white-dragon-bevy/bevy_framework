/**
 * state-scoped.ts - 状态作用域实体管理系统
 * 对应 Rust bevy_state/src/state_scoped.rs
 *
 * 提供在状态转换时自动清理实体的功能
 */

import { component } from "@rbxts/matter";
import type { World, Entity } from "@rbxts/matter";
import type { States } from "./states";
import { SystemFunction } from "../bevy_ecs/schedule/types";
import { State, NextState } from "./resources";
import { BevyWorld, Context } from "../bevy_ecs";

/**
 * 清理策略枚举
 * 定义实体在什么时候被清理
 */
export enum DespawnStrategy {
	/** 在状态退出时清理 */
	OnExit = "on_exit",
	/** 在状态进入时清理 */
	OnEnter = "on_enter",
}

/**
 * 状态作用域组件
 * 标记实体在特定状态退出时被清理
 * @template S - 状态类型
 */
export const StateScoped = component<{
	/** 关联的状态ID */
	readonly stateId: string | number;
	/** 清理策略 */
	readonly strategy: DespawnStrategy;
	/** 是否递归清理子实体 */
	readonly recursive?: boolean;
}>("StateScoped");

/**
 * 状态作用域组件类型
 */
export type StateScopedComponent = ReturnType<typeof StateScoped>;

/**
 * 系统用于在状态退出时清理标记的实体
 * 该系统在状态转换调度阶段执行
 *
 * **注意**: 实际清理由 StateTransitionManager 在状态转换时自动调用 cleanupOnStateExit 完成。
 * 此系统函数保留为空，因为 StateTransitionManager 已在 processRegularTransition() 方法中
 * 直接调用 cleanupOnStateExit()。如需自定义清理逻辑，应在 OnExit 调度中添加自定义系统。
 *
 * @param world - ECS 世界
 * @param context - 应用上下文
 */
export function despawnOnExitStateSystem(world: BevyWorld, context: Context): void {
	// 空实现：清理逻辑由 StateTransitionManager.processRegularTransition() 自动执行
	// 参见 transitions.ts 第 237-239 行
}

/**
 * 系统用于在状态进入时清理标记的实体
 * 该系统在状态转换调度阶段执行
 *
 * **注意**: 实际清理由 StateTransitionManager 在状态转换时自动调用 cleanupOnStateEnter 完成。
 * 此系统函数保留为空，因为 StateTransitionManager 已在 processRegularTransition() 方法中
 * 直接调用 cleanupOnStateEnter()。如需自定义清理逻辑，应在 OnEnter 调度中添加自定义系统。
 *
 * @param world - ECS 世界
 * @param context - 应用上下文
 */
export function despawnOnEnterStateSystem(world: BevyWorld, context: Context): void {
	// 空实现：清理逻辑由 StateTransitionManager.processRegularTransition() 自动执行
	// 参见 transitions.ts 第 260-261 行
}

/**
 * 递归清理实体及其子实体
 *
 * **当前限制**: 由于项目尚未实现 Parent/Child 层级组件系统，此函数目前仅清理当前实体。
 *
 * **未来实现计划**:
 * 1. 定义 Parent 和 Child 组件:
 *    ```typescript
 *    export const Parent = component<{ entityId: Entity }>("Parent");
 *    export const Children = component<{ entityIds: Array<Entity> }>("Children");
 *    ```
 *
 * 2. 递归清理算法:
 *    ```typescript
 *    function despawnRecursive(world: World, entityId: Entity): void {
 *        // 获取所有子实体
 *        const childrenComponent = world.get(entityId, Children);
 *        if (childrenComponent) {
 *            // 递归清理每个子实体
 *            for (const childId of childrenComponent.entityIds) {
 *                despawnRecursive(world, childId);
 *            }
 *        }
 *        // 最后清理当前实体
 *        world.despawn(entityId);
 *    }
 *    ```
 *
 * 3. 或者使用查询方式:
 *    ```typescript
 *    // 查询所有以 entityId 为父实体的子实体
 *    for (const [childId, parent] of world.query(Parent)) {
 *        if (parent.entityId === entityId) {
 *            despawnRecursive(world, childId);
 *        }
 *    }
 *    ```
 *
 * @param world - ECS 世界
 * @param entityId - 要清理的实体ID
 */
function despawnEntityRecursive(world: World, entityId: Entity): void {
	// 当前实现：直接清理单个实体
	if (world.contains(entityId)) {
		world.despawn(entityId);
	}

	// TODO: 在实现 Parent/Child 组件后，添加递归清理逻辑
}

/**
 * 标记实体在状态退出时被清理
 *
 * **用途**: 为实体添加 StateScoped 组件，使其在指定状态退出时自动清理
 *
 * @param world - ECS 世界实例
 * @param entityId - 要标记的实体ID
 * @param state - 关联的状态实例
 * @param recursive - 是否递归清理子实体（默认 false）
 */
export function markForDespawnOnExit<S extends States>(
	world: World,
	entityId: Entity,
	state: S,
	recursive = false,
): void {
	world.insert(
		entityId,
		StateScoped({
			stateId: state.getStateId(),
			strategy: DespawnStrategy.OnExit,
			recursive,
		}),
	);
}

/**
 * 标记实体在状态进入时被清理
 *
 * **用途**: 为实体添加 StateScoped 组件，使其在指定状态进入时自动清理
 *
 * @param world - ECS 世界实例
 * @param entityId - 要标记的实体ID
 * @param state - 关联的状态实例
 * @param recursive - 是否递归清理子实体（默认 false）
 */
export function markForDespawnOnEnter<S extends States>(
	world: World,
	entityId: Entity,
	state: S,
	recursive = false,
): void {
	world.insert(
		entityId,
		StateScoped({
			stateId: state.getStateId(),
			strategy: DespawnStrategy.OnEnter,
			recursive,
		}),
	);
}

/**
 * 批量标记多个实体在状态退出时被清理
 *
 * **性能优势**: 相比循环调用单个标记函数，批量操作减少了函数调用开销
 *
 * **用途**: 为多个实体批量添加 StateScoped 组件，减少重复代码
 *
 * @param world - ECS 世界实例
 * @param entities - 要标记的实体ID数组
 * @param state - 关联的状态实例
 * @param recursive - 是否递归清理子实体（默认 false）
 */
export function markEntitiesForDespawnOnExit<S extends States>(
	world: World,
	entities: ReadonlyArray<Entity>,
	state: S,
	recursive = false,
): void {
	const stateId = state.getStateId();
	const component = StateScoped({
		stateId,
		strategy: DespawnStrategy.OnExit,
		recursive,
	});

	for (const entityId of entities) {
		world.insert(entityId, component);
	}
}

/**
 * 批量标记多个实体在状态进入时被清理
 *
 * **性能优势**: 相比循环调用单个标记函数，批量操作减少了函数调用开销
 *
 * **用途**: 为多个实体批量添加 StateScoped 组件，减少重复代码
 *
 * @param world - ECS 世界实例
 * @param entities - 要标记的实体ID数组
 * @param state - 关联的状态实例
 * @param recursive - 是否递归清理子实体（默认 false）
 */
export function markEntitiesForDespawnOnEnter<S extends States>(
	world: World,
	entities: ReadonlyArray<Entity>,
	state: S,
	recursive = false,
): void {
	const stateId = state.getStateId();
	const component = StateScoped({
		stateId,
		strategy: DespawnStrategy.OnEnter,
		recursive,
	});

	for (const entityId of entities) {
		world.insert(entityId, component);
	}
}

/**
 * 检查实体是否被标记为状态作用域清理
 *
 * **用途**: 获取实体的 StateScoped 组件数据，用于查询清理策略和状态信息
 *
 * @param world - ECS 世界实例
 * @param entityId - 要查询的实体ID
 * @returns 状态作用域组件数据或 undefined（实体未标记时）
 */
export function getStateScopedData(world: World, entityId: Entity): StateScopedComponent | undefined {
	return world.get(entityId, StateScoped);
}

/**
 * 移除实体的状态作用域标记
 *
 * **用途**: 从实体移除 StateScoped 组件，取消自动清理行为
 *
 * @param world - ECS 世界实例
 * @param entityId - 要移除标记的实体ID
 */
export function removeStateScopedMarker(world: World, entityId: Entity): void {
	world.remove(entityId, StateScoped);
}

/**
 * 获取所有被特定状态标记的实体
 *
 * **性能优化**: 使用早期退出条件减少不必要的比较
 *
 * **用途**: 查询所有关联到指定状态的实体，可选过滤清理策略
 *
 * @param world - ECS 世界实例
 * @param state - 要查询的状态实例
 * @param strategy - 清理策略过滤器（可选，不提供则返回所有策略的实体）
 * @returns 符合条件的实体ID数组
 */
export function getEntitiesInState<S extends States>(
	world: World,
	state: S,
	strategy?: DespawnStrategy,
): Array<Entity> {
	const stateId = state.getStateId();
	const entities: Array<Entity> = [];

	for (const [entityId, stateScoped] of world.query(StateScoped)) {
		if (stateScoped.stateId !== stateId) continue;
		if (strategy && stateScoped.strategy !== strategy) continue;

		entities.push(entityId);
	}

	return entities;
}

/**
 * 清理指定状态的所有实体
 *
 * **用途**: 立即清理所有关联到指定状态的实体，支持递归清理
 *
 * @param world - ECS 世界实例
 * @param state - 要清理的状态实例
 * @param strategy - 清理策略过滤器（可选，不提供则清理所有策略的实体）
 */
export function despawnAllInState<S extends States>(
	world: World,
	state: S,
	strategy?: DespawnStrategy,
): void {
	const entities = getEntitiesInState(world, state, strategy);

	for (const entityId of entities) {
		const stateScoped = world.get(entityId, StateScoped);
		if (stateScoped?.recursive) {
			despawnEntityRecursive(world, entityId);
		} else {
			world.despawn(entityId);
		}
	}
}

/**
 * 清理指定状态退出时的实体
 *
 * **用途**: 自动清理所有标记为 OnExit 策略且关联到退出状态的实体
 *
 * **调用时机**: 由 StateTransitionManager 在状态退出时自动调用
 *
 * @param world - ECS 世界实例
 * @param exitedState - 退出的状态实例
 */
export function cleanupOnStateExit<S extends States>(world: World, exitedState: S): void {
	const exitedStateId = exitedState.getStateId();

	// 查询所有带有 StateScoped 组件的实体
	for (const [entityId, stateScoped] of world.query(StateScoped)) {
		// 检查是否匹配退出的状态和策略
		if (
			stateScoped.stateId === exitedStateId &&
			stateScoped.strategy === DespawnStrategy.OnExit
		) {
			// 递归清理子实体（如果启用）
			if (stateScoped.recursive) {
				despawnEntityRecursive(world, entityId);
			} else {
				world.despawn(entityId);
			}
		}
	}
}

/**
 * 清理指定状态进入时的实体
 *
 * **用途**: 自动清理所有标记为 OnEnter 策略且关联到进入状态的实体
 *
 * **调用时机**: 由 StateTransitionManager 在状态进入时自动调用
 *
 * @param world - ECS 世界实例
 * @param enteredState - 进入的状态实例
 */
export function cleanupOnStateEnter<S extends States>(world: World, enteredState: S): void {
	const enteredStateId = enteredState.getStateId();

	// 查询所有带有 StateScoped 组件的实体
	for (const [entityId, stateScoped] of world.query(StateScoped)) {
		// 检查是否匹配进入的状态和策略
		if (
			stateScoped.stateId === enteredStateId &&
			stateScoped.strategy === DespawnStrategy.OnEnter
		) {
			// 递归清理子实体（如果启用）
			if (stateScoped.recursive) {
				despawnEntityRecursive(world, entityId);
			} else {
				world.despawn(entityId);
			}
		}
	}
}

/**
 * 注册状态作用域系统的便利函数
 *
 * **用途**: 返回状态作用域清理系统数组，便于批量注册到调度
 *
 * **注意**: 实际清理由 StateTransitionManager 自动执行，这些系统为空实现
 *
 * @returns 系统函数数组（包含 despawnOnExitStateSystem 和 despawnOnEnterStateSystem）
 */
export function registerStateScopedSystems(): Array<SystemFunction> {
	return [despawnOnExitStateSystem, despawnOnEnterStateSystem];
}

/**
 * 状态作用域插件配置
 */
export interface StateScopedPluginConfig {
	/** 是否启用退出时清理 */
	readonly enableExitCleanup?: boolean;
	/** 是否启用进入时清理 */
	readonly enableEnterCleanup?: boolean;
	/** 是否启用递归清理 */
	readonly enableRecursiveCleanup?: boolean;
}

/**
 * 默认状态作用域插件配置
 */
export const DEFAULT_STATE_SCOPED_CONFIG: StateScopedPluginConfig = {
	enableExitCleanup: true,
	enableEnterCleanup: false,
	enableRecursiveCleanup: false,
};
