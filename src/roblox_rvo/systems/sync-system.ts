/**
 * RVO Transform 同步系统
 * 在 PreUpdate 阶段运行，同步 Transform 到 RVO Agent
 */

import { BevyWorld, World } from "../../bevy_ecs/bevy-world";
import { Context } from "../../bevy_ecs/types";
import { Transform } from "../../bevy_transform/src/components/transform";
import { RVOAgent, setAgentGoal } from "../components/rvo-agent";
import { RVOObstacle, transformObstacleVertices } from "../components/rvo-obstacle";
import { RVOSimulatorResource } from "../resources/rvo-simulator";

/**
 * 同步 Transform 到 RVO 系统
 * @param world - ECS 世界实例
 * @param context - 系统上下文
 */
export function syncTransformToRVO(world: BevyWorld, context: Context): void {
	// 获取模拟器资源
	const simulatorResource = context.resources.getResource<RVOSimulatorResource>();
	if (!simulatorResource || !simulatorResource.initialized) {
		return;
	}

	const simulator = simulatorResource.simulator;

	// 同步 Agent
	syncAgents(world, simulatorResource);

	// 同步障碍物
	syncObstacles(world, simulatorResource);
}

/**
 * 同步 Agent 实体
 * @param world - Matter 世界实例
 * @param simulatorResource - RVO 模拟器资源
 */
function syncAgents(world: World, simulatorResource: RVOSimulatorResource): void {
	const simulator = simulatorResource.simulator;

	// 查询所有带 RVOAgent 和 Transform 的实体
	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		if (!agent.enabled) {
			continue;
		}

		// 获取位置 (从 3D 投影到 2D)
		const position3D = transform.cframe.Position;
		const position2D = new Vector2(position3D.X, position3D.Z);

		// 检查是否已注册
		let agentId = simulatorResource.getEntityAgent(entity);

		if (agentId === undefined) {
			// 新 Agent，需要添加到模拟器
			agentId = simulator.addAgent(position2D);
			simulatorResource.registerAgent(entity, agentId);

			// 设置 Agent 参数
			const simAgent = simulator.agents[agentId];
			simAgent.radius = agent.radius;
			simAgent.maxSpeed = agent.maxSpeed;
			simAgent.maxNeighbors = agent.maxNeighbors;
			simAgent.neighborDist = agent.neighborDist;
			simAgent.timeHorizon = agent.timeHorizon;
			simAgent.timeHorizonObst = agent.timeHorizonObst;

			// 更新组件中的 Agent ID
			world.insert(
				entity,
				RVOAgent({
					...agent,
					agentId,
				}),
			);
		} else {
			// 更新现有 Agent 位置
			simulator.setAgentPosition(agentId, position2D.X, position2D.Y);
		}

		// 设置首选速度
		if (agent.goalPosition) {
			// 如果有目标位置，计算朝向目标的速度
			const updatedAgent = setAgentGoal(agent, agent.goalPosition, position2D);
			simulator.setAgentPrefVelocity(
				agentId,
				updatedAgent.preferredVelocity.X,
				updatedAgent.preferredVelocity.Y,
			);

			// 更新组件
			if (updatedAgent.preferredVelocity !== agent.preferredVelocity) {
				world.insert(entity, RVOAgent(updatedAgent));
			}
		} else {
			// 使用设置的首选速度
			simulator.setAgentPrefVelocity(agentId, agent.preferredVelocity.X, agent.preferredVelocity.Y);
		}

		// 更新 Agent 参数（如果有变化）
		const simAgent = simulator.agents[agentId];
		if (
			simAgent.radius !== agent.radius ||
			simAgent.maxSpeed !== agent.maxSpeed ||
			simAgent.maxNeighbors !== agent.maxNeighbors
		) {
			simAgent.radius = agent.radius;
			simAgent.maxSpeed = agent.maxSpeed;
			simAgent.maxNeighbors = agent.maxNeighbors;
			simAgent.neighborDist = agent.neighborDist;
			simAgent.timeHorizon = agent.timeHorizon;
			simAgent.timeHorizonObst = agent.timeHorizonObst;
		}
	}

	// 清理已删除的 Agent
	cleanupRemovedAgents(world, simulatorResource);
}

/**
 * 同步障碍物实体
 * @param world - Matter 世界实例
 * @param simulatorResource - RVO 模拟器资源
 */
function syncObstacles(world: World, simulatorResource: RVOSimulatorResource): void {
	const simulator = simulatorResource.simulator;
	const processedEntities = new Set<number>();

	// 查询所有带 RVOObstacle 的实体
	for (const [entity, obstacle] of world.query(RVOObstacle)) {
		if (!obstacle.enabled) {
			continue;
		}

		processedEntities.add(entity);

		// 检查是否已注册
		let obstacleId = simulatorResource.getEntityObstacle(entity);

		if (obstacleId === undefined) {
			// 新障碍物，需要添加到模拟器
			let vertices = obstacle.vertices;

			// 如果有 Transform，应用变换
			const transform = world.get(entity, Transform);
			if (transform) {
				vertices = transformObstacleVertices(obstacle, transform.cframe);
			}

			// 添加障碍物到模拟器
			obstacleId = simulator.addObstacle(vertices);
			if (obstacleId >= 0) {
				simulatorResource.registerObstacle(entity, obstacleId);

				// 更新组件中的障碍物 ID
				world.insert(
					entity,
					RVOObstacle({
						...obstacle,
						obstacleId,
					}),
				);
			}
		}
	}

	// 处理障碍物（只需要在添加新障碍物后处理一次）
	if (processedEntities.size() > 0) {
		simulator.processObstacles();
	}

	// 清理已删除的障碍物
	cleanupRemovedObstacles(world, simulatorResource, processedEntities);
}

/**
 * 清理已删除的 Agent
 * @param world - Matter 世界实例
 * @param simulatorResource - RVO 模拟器资源
 */
function cleanupRemovedAgents(world: World, simulatorResource: RVOSimulatorResource): void {
	const entitiesToRemove: Array<number> = [];

	// 检查所有已注册的 Agent
	for (const [entity] of simulatorResource.entityAgentMap) {
		// 如果实体不再有 RVOAgent 组件，移除它
		if (!world.get(entity, RVOAgent)) {
			entitiesToRemove.push(entity);
		}
	}

	// 移除这些 Agent
	for (const entity of entitiesToRemove) {
		const agentId = simulatorResource.getEntityAgent(entity);
		if (agentId !== undefined) {
			// 从模拟器中移除 Agent
			// 注意：当前 Simulator 实现没有提供移除 Agent 的方法
			// 需要扩展 Simulator 类或使用其他策略
			simulatorResource.unregisterAgent(entity);
		}
	}
}

/**
 * 清理已删除的障碍物
 * @param world - Matter 世界实例
 * @param simulatorResource - RVO 模拟器资源
 * @param activeEntities - 当前活跃的实体集合
 */
function cleanupRemovedObstacles(
	world: World,
	simulatorResource: RVOSimulatorResource,
	activeEntities: Set<number>,
): void {
	const entitiesToRemove: Array<number> = [];

	// 检查所有已注册的障碍物
	for (const [entity] of simulatorResource.entityObstacleMap) {
		// 如果实体不在活跃集合中，移除它
		if (!activeEntities.has(entity)) {
			entitiesToRemove.push(entity);
		}
	}

	// 移除这些障碍物
	for (const entity of entitiesToRemove) {
		simulatorResource.unregisterObstacle(entity);
		// 注意：当前 Simulator 实现没有提供移除障碍物的方法
		// 需要重新构建障碍物或使用其他策略
	}
}