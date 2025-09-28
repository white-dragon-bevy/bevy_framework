/**
 * RVO 初始化系统
 * 在 Startup 阶段运行，初始化 RVO 模拟器
 */

import { World } from "../../bevy_ecs/bevy-world";
import { Context } from "../../bevy_ecs/types";
import { RVOConfig } from "../resources/rvo-config";
import { RVOSimulatorResource } from "../resources/rvo-simulator";

/**
 * 初始化 RVO 系统
 * @param world - ECS 世界实例
 * @param context - 系统上下文
 */
export function initRVOSystem(world: World, context: Context): void {
	// 获取配置资源
	const config = world.resources.getResource<RVOConfig>();
	if (!config) {
		warn("[initRVOSystem] RVOConfig resource not found");
		return;
	}

	// 验证配置
	if (!config.validate()) {
		error("[initRVOSystem] Invalid RVO configuration");
	}

	// 获取模拟器资源
	const simulatorResource = world.resources.getResource<RVOSimulatorResource>();
	if (!simulatorResource) {
		warn("[initRVOSystem] RVOSimulatorResource not found");
		return;
	}

	// 如果已初始化，跳过
	if (simulatorResource.initialized) {
		return;
	}

	// 配置模拟器
	const simulator = simulatorResource.simulator;
	const defaults = config.getAgentDefaults();

	// 设置默认 Agent 参数
	simulator.setAgentDefaults(
		defaults.neighborDist,
		defaults.maxNeighbors,
		defaults.timeHorizon,
		defaults.timeHorizonObst,
		defaults.radius,
		defaults.maxSpeed,
		0,
		0, // 初始速度为 0
	);

	// 设置时间步长
	simulator.setTimeStep(config.timeStep);

	// 设置 KD 树参数
	simulator.kdTree.MAXLEAF_SIZE = config.kdTreeMaxLeafSize;

	// 标记为已初始化
	simulatorResource.initialized = true;

	// print(`[RVO] System initialized with ${config.maxAgents} max agents, timeStep: ${config.timeStep}`);
}