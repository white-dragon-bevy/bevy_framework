/**
 * RVO 辅助函数
 * 提供便捷的 API 访问 RVO 系统
 */

import { BevyWorld, Context } from "../bevy_ecs/types";
import { RVOConfig } from "./resources/rvo-config";
import { RVOSimulatorResource } from "./resources/rvo-simulator";
import Simulator from "./core/Simulator";

/**
 * 获取 RVO 模拟器实例
 * @param context - 系统上下文
 * @returns 模拟器实例
 */
export function getRVOSimulator(world:BevyWorld): Simulator | undefined {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	return resource?.simulator;
}

/**
 * 获取 RVO 配置
 * @param context - 系统上下文
 * @returns RVO 配置
 */
export function getRVOConfig(world:BevyWorld): RVOConfig | undefined {
	return world.resources.getResource<RVOConfig>();
}

/**
 * 获取 Agent 对应的实体
 * @param context - 系统上下文
 * @param agentId - Agent ID
 * @returns 实体 ID
 */
export function getAgentEntity(world:BevyWorld, agentId: number): number | undefined {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	return resource?.getAgentEntity(agentId);
}

/**
 * 获取实体对应的 Agent
 * @param context - 系统上下文
 * @param entity - 实体 ID
 * @returns Agent ID
 */
export function getEntityAgent(world:BevyWorld, entity: number): number | undefined {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	return resource?.getEntityAgent(entity);
}

/**
 * 获取障碍物对应的实体
 * @param context - 系统上下文
 * @param obstacleId - 障碍物 ID
 * @returns 实体 ID
 */
export function getObstacleEntity(world:BevyWorld, obstacleId: number): number | undefined {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	return resource?.getObstacleEntity(obstacleId);
}

/**
 * 获取实体对应的障碍物
 * @param context - 系统上下文
 * @param entity - 实体 ID
 * @returns 障碍物 ID
 */
export function getEntityObstacle(world:BevyWorld, entity: number): number | undefined {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	return resource?.getEntityObstacle(entity);
}

/**
 * 获取 RVO 统计信息
 * @param context - 系统上下文
 * @returns 统计信息
 */
export function getRVOStats(world:BevyWorld): {
	agentCount: number;
	obstacleCount: number;
	averageSimulationTime: number;
	lastSimulationTime: number;
	totalSimulationTime: number;
	simulationCount: number;
} | undefined {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	if (!resource) {
		return undefined;
	}

	return {
		...resource.stats,
		averageSimulationTime: resource.getAverageSimulationTime(),
	};
}

/**
 * 检查 RVO 系统是否已初始化
 * @param context - 系统上下文
 * @returns 是否已初始化
 */
export function isRVOInitialized(world:BevyWorld): boolean {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	return resource?.initialized ?? false;
}

/**
 * 重置 RVO 系统
 * @param context - 系统上下文
 */
export function resetRVO(world:BevyWorld): void {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	resource?.reset();
}

/**
 * 设置 RVO 调试模式
 * @param context - 系统上下文
 * @param enabled - 是否启用调试
 */
export function setRVODebugMode(world:BevyWorld, enabled: boolean): void {
	const config = world.resources.getResource<RVOConfig>();
	if (config) {
		config.debugDraw = enabled;
	}
}

/**
 * 设置 RVO 自动模拟
 * @param context - 系统上下文
 * @param enabled - 是否启用自动模拟
 */
export function setRVOAutoSimulate(world:BevyWorld, enabled: boolean): void {
	const config = world.resources.getResource<RVOConfig>();
	if (config) {
		config.autoSimulate = enabled;
	}
}

/**
 * 手动执行一步 RVO 模拟
 * @param context - 系统上下文
 * @returns 是否成功执行
 */
export function stepRVOSimulation(world: BevyWorld): boolean {
	const resource = world.resources.getResource<RVOSimulatorResource>();
	if (!resource || !resource.initialized) {
		return false;
	}

	resource.simulate();
	return true;
}

/**
 * 检查所有 Agent 是否到达目标
 * @returns 是否所有 Agent 都到达目标
 */
export function allAgentsReachedGoal(world: BevyWorld): boolean {
	const simulator = getRVOSimulator(world);
	if (!simulator) {
		return false;
	}

	return simulator.reachedGoal();
}