/**
 * RVO 模拟系统
 * 在 Update 阶段运行，执行 RVO 算法计算
 */

import { World } from "../../bevy_ecs/bevy-world";
import { Context } from "../../bevy_ecs/types";
import { RVOConfig } from "../resources/rvo-config";
import { RVOSimulatorResource } from "../resources/rvo-simulator";

/**
 * 执行 RVO 模拟
 * @param world - ECS 世界实例
 * @param context - 系统上下文
 */
export function simulateRVO(world: World, context: Context): void {
	// 获取配置资源
	const config = world.resources.getResource<RVOConfig>();
	if (!config) {
		return;
	}

	// 检查是否启用自动模拟
	if (!config.autoSimulate) {
		return;
	}

	// 获取模拟器资源
	const simulatorResource = world.resources.getResource<RVOSimulatorResource>();
	if (!simulatorResource || !simulatorResource.initialized) {
		return;
	}

	// 检查是否有 Agent
	if (simulatorResource.stats.agentCount === 0) {
		return;
	}

	// 执行模拟
	simulatorResource.simulate();

	// 调试输出（如果启用）
	if (config.debugDraw) {
		debugPrintStats(simulatorResource);
	}
}

/**
 * 打印调试统计信息
 * @param simulatorResource - RVO 模拟器资源
 */
function debugPrintStats(simulatorResource: RVOSimulatorResource): void {
	const stats = simulatorResource.stats;
	const avgTime = simulatorResource.getAverageSimulationTime();

	// 调试日志（已禁用）
	// if (stats.simulationCount % 60 === 0) {
	// 	print(
	// 		`[RVO Debug] Agents: ${stats.agentCount}, Obstacles: ${stats.obstacleCount}, ` +
	// 			`Last: ${string.format("%.2f", stats.lastSimulationTime * 1000)}ms, ` +
	// 			`Avg: ${string.format("%.2f", avgTime)}ms`,
	// 	);
	// }
}

/**
 * 手动执行单步模拟
 * 供需要精确控制模拟时机的场景使用
 * @param world - ECS 世界实例
 * @returns 是否成功执行模拟
 */
export function stepSimulation(world: World): boolean {
	const simulatorResource = world.resources.getResource<RVOSimulatorResource>();
	if (!simulatorResource || !simulatorResource.initialized) {
		return false;
	}

	if (simulatorResource.stats.agentCount === 0) {
		return false;
	}

	simulatorResource.simulate();
	return true;
}

/**
 * 设置模拟时间步长
 * @param world - ECS 世界实例
 * @param context - 系统上下文
 * @param timeStep - 新的时间步长
 */
export function setSimulationTimeStep(world: World, context: Context, timeStep: number): void {
	const config = world.resources.getResource<RVOConfig>();
	if (config) {
		config.timeStep = timeStep;
	}

	const simulatorResource = world.resources.getResource<RVOSimulatorResource>();
	if (simulatorResource && simulatorResource.initialized) {
		simulatorResource.simulator.setTimeStep(timeStep);
	}
}

/**
 * 获取模拟统计信息
 * @param context - 系统上下文
 * @returns 统计信息
 */
export function getSimulationStats(world: World): {
	agentCount: number;
	obstacleCount: number;
	averageSimulationTime: number;
} | undefined {
	const simulatorResource = world.resources.getResource<RVOSimulatorResource>();
	if (!simulatorResource) {
		return undefined;
	}

	return {
		agentCount: simulatorResource.stats.agentCount,
		obstacleCount: simulatorResource.stats.obstacleCount,
		averageSimulationTime: simulatorResource.getAverageSimulationTime(),
	};
}