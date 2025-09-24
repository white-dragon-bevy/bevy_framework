/**
 * RVO系统集合
 * 提供ECS实体与RVO仿真器的同步
 */

import { World } from "@rbxts/matter";
import { AppContext } from "../bevy_app/context";
import { RVOAgent, RVOConfig, RVOObstacle, RVOTarget } from "./components";
import { getRVOSimulator } from "./resources";
import { Vector2D } from "./vector2d";

/**
 * 同步新增的RVO代理到仿真器
 * @param world - World实例
 * @param context - 应用上下文
 */
export function syncNewAgents(world: World, context: AppContext): void {
	const simulator = getRVOSimulator(world);
	if (!simulator) return;

	// 查询新增的RVO代理组件
	for (const [id, agent] of world.query(RVOAgent)) {
		// 检查是否已经在仿真器中
		if (agent.agentIndex === -1 || agent.agentIndex === undefined) {
			// 添加到仿真器
			const agentIndex = simulator.addAgent(agent.position);

			// 更新组件中的索引
			world.insert(id, RVOAgent({
				...agent,
				agentIndex: agentIndex,
			}));

			// 设置代理属性
			simulator.setAgentPrefVelocity(
				agentIndex,
				agent.prefVelocity.x,
				agent.prefVelocity.y,
			);

			// 如果有配置组件，应用配置
			const config = world.get(id, RVOConfig);
			if (config) {
				const agentObj = simulator.agents[agentIndex];
				agentObj.neighborDist = config.neighborDist;
				agentObj.maxNeighbors = config.maxNeighbors;
				agentObj.timeHorizon = config.timeHorizon;
				agentObj.timeHorizonObst = config.timeHorizonObst;
			}
		}
	}
}

/**
 * 同步代理位置到仿真器
 * @param world - World实例
 * @param context - 应用上下文
 */
export function syncAgentPositions(world: World, context: AppContext): void {
	const simulator = getRVOSimulator(world);
	if (!simulator) return;

	for (const [id, agent] of world.query(RVOAgent)) {
		if (agent.agentIndex >= 0 && agent.agentIndex < simulator.agents.size()) {
			// 同步位置到仿真器
			simulator.setAgentPosition(
				agent.agentIndex,
				agent.position.x,
				agent.position.y,
			);
		}
	}
}

/**
 * 计算代理的期望速度（基于目标）
 * @param world - World实例
 * @param context - 应用上下文
 */
export function updateAgentTargets(world: World, context: AppContext): void {
	const simulator = getRVOSimulator(world);
	if (!simulator) return;

	// 查询有目标的代理
	for (const [id, agent, target] of world.query(RVOAgent, RVOTarget)) {
		if (agent.agentIndex < 0) continue;

		// 计算到目标的方向和速度
		const currentPos = agent.position;
		const targetPos = target.targetPosition;
		const direction = targetPos.minus(currentPos);
		const distance = direction.abs();

		if (distance < 0.1) {
			// 已到达目标
			simulator.setAgentPrefVelocity(agent.agentIndex, 0, 0);
			world.insert(id, RVOTarget({
				...target,
				reached: true,
			}));
		} else {
			// 计算期望速度
			const desiredSpeed = math.min(distance, agent.maxSpeed);
			const velocity = direction.normalize().scale(desiredSpeed);

			simulator.setAgentPrefVelocity(
				agent.agentIndex,
				velocity.x,
				velocity.y,
			);

			// 更新组件
			world.insert(id, RVOAgent({
				...agent,
				prefVelocity: velocity,
			}));
		}
	}
}

/**
 * 从仿真器同步位置回ECS
 * @param world - World实例
 * @param context - 应用上下文
 */
export function syncFromSimulator(world: World, context: AppContext): void {
	const simulator = getRVOSimulator(world);
	if (!simulator) return;

	for (const [id, agent] of world.query(RVOAgent)) {
		if (agent.agentIndex >= 0 && agent.agentIndex < simulator.agents.size()) {
			// 从仿真器获取新位置
			const newPosition = simulator.getAgentPosition(agent.agentIndex);
			const velocity = simulator.getAgentVelocity(agent.agentIndex);

			// 更新组件
			world.insert(id, RVOAgent({
				...agent,
				position: newPosition,
				prefVelocity: velocity,
			}));

			// TODO: 这里可以更新Transform组件，与渲染系统同步
		}
	}
}

/**
 * 同步障碍物到仿真器
 * @param world - World实例
 * @param context - 应用上下文
 */
export function syncObstacles(world: World, context: AppContext): void {
	const simulator = getRVOSimulator(world);
	if (!simulator) return;

	// 查询新增的障碍物
	for (const [id, obstacle] of world.query(RVOObstacle)) {
		if (obstacle.obstacleIndex === undefined) {
			// 添加到仿真器
			const obstacleIndex = simulator.addObstacle(obstacle.vertices);

			// 更新组件中的索引
			world.insert(id, RVOObstacle({
				...obstacle,
				obstacleIndex: obstacleIndex,
			}));
		}
	}

	// 处理完所有障碍物后，构建障碍物树
	if (simulator.obstacles.size() > 0) {
		simulator.processObstacles();
	}
}

/**
 * 清理已删除实体的RVO代理
 * @param world - World实例
 * @param context - 应用上下文
 */
export function cleanupRemovedAgents(world: World, context: AppContext): void {
	const simulator = getRVOSimulator(world);
	if (!simulator) return;

	// TODO: 实现代理移除逻辑
	// 需要跟踪哪些实体被删除，并从仿真器中移除对应的代理
}