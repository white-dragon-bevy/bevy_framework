/**
 * RVO Transform 更新系统
 * 在 PostUpdate 阶段运行，将 RVO 计算结果应用到 Transform
 */

import { BevyWorld } from "../../bevy_ecs/bevy-world";
import { Context } from "../../bevy_ecs/types";
import { MessageWriter } from "../../bevy_ecs/message";
import { Transform } from "../../bevy_transform/components/transform";
import { RVOAgent, hasReachedGoal } from "../components/rvo-agent";
import { RVOSimulatorResource } from "../resources/rvo-simulator";
import Agent from "../core/Agent";
import {
	CollisionAvoidanceEvent,
	GoalReachedEvent,
	VelocityChangedEvent,
	createCollisionAvoidanceEvent,
	createGoalReachedEvent,
	createVelocityChangedEvent,
	hasSignificantVelocityChange,
} from "../events/rvo-events";

/**
 * 更新 Transform 从 RVO 系统
 * @param world - ECS 世界实例
 * @param context - 系统上下文
 */
export function updateTransformFromRVO(world: BevyWorld, context: Context): void {
	// 获取模拟器资源
	const simulatorResource = world.resources.getResource<RVOSimulatorResource>();
	if (!simulatorResource || !simulatorResource.initialized) {
		return;
	}

	const simulator = simulatorResource.simulator;

	// 获取消息写入器 - 暂时使用undefined，待context支持MessageWriter
	const collisionMessageWriter = undefined as unknown as MessageWriter<CollisionAvoidanceEvent> | undefined;
	const goalMessageWriter = undefined as unknown as MessageWriter<GoalReachedEvent> | undefined;
	const velocityMessageWriter = undefined as unknown as MessageWriter<VelocityChangedEvent> | undefined;

	// 查询所有带 RVOAgent 和 Transform 的实体
	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		if (!agent.enabled || agent.agentId === undefined) {
			continue;
		}

		const agentId = agent.agentId;
		const simAgent = simulator.agents[agentId];
		if (!simAgent) {
			continue;
		}

		// 获取新位置和速度
		const newPosition = simulator.getAgentPosition(agentId);
		const newVelocity = simulator.getAgentVelocity(agentId);

		// 转换 2D 位置到 3D
		const newPosition3D = new Vector3(newPosition.X, transform.cframe.Position.Y, newPosition.Y);

		// 计算新的 Transform
		let newCFrame: CFrame;
		if (newVelocity.Magnitude > 0.01) {
			// 如果有速度，朝向移动方向
			const lookAt3D = newPosition3D.add(new Vector3(newVelocity.X, 0, newVelocity.Y));
			newCFrame = CFrame.lookAt(newPosition3D, lookAt3D);
		} else {
			// 保持原有朝向，只更新位置
			newCFrame = new CFrame(newPosition3D).mul(transform.cframe.sub(transform.cframe.Position));
		}

		// 应用新的 Transform
		world.insert(
			entity,
			Transform({
				cframe: newCFrame,
				scale: transform.scale,
			}),
		);

		// 检查速度变化
		if (agent.currentVelocity) {
			if (hasSignificantVelocityChange(agent.currentVelocity, newVelocity, 0.1)) {
				// 发送速度变化消息
				if (velocityMessageWriter) {
					velocityMessageWriter.send(createVelocityChangedEvent(entity, agent.currentVelocity, newVelocity));
				}

				// 检查是否正在避碰
				const prefVelocity = simulator.getAgentPrefVelocity(agentId);
				if (!velocitiesEqual(newVelocity, prefVelocity, 0.1)) {
					// 速度与首选速度不同，说明正在避碰
					const avoidedEntities = getAvoidedEntities(simAgent, simulatorResource);
					if (collisionMessageWriter && avoidedEntities.size() > 0) {
						collisionMessageWriter.send(
							createCollisionAvoidanceEvent(entity, avoidedEntities, prefVelocity, newVelocity),
						);
					}
				}
			}
		}

		// 检查是否到达目标
		if (agent.goalPosition) {
			if (hasReachedGoal(agent, newPosition, 0.5)) {
				// 发送目标到达消息
				if (goalMessageWriter) {
					goalMessageWriter.send(createGoalReachedEvent(entity, agent.goalPosition, newPosition, newVelocity));
				}

				// 清除目标
				world.insert(
					entity,
					RVOAgent({
						...agent,
						currentVelocity: newVelocity,
						goalPosition: undefined,
						preferredVelocity: new Vector2(0, 0),
						targetVelocity: new Vector2(0, 0),
					}),
				);
			} else {
				// 更新当前速度
				world.insert(
					entity,
					RVOAgent({
						...agent,
						currentVelocity: newVelocity,
					}),
				);
			}
		} else {
			// 更新当前速度
			world.insert(
				entity,
				RVOAgent({
					...agent,
					currentVelocity: newVelocity,
				}),
			);
		}
	}
}

/**
 * 获取正在避让的实体列表
 * @param simAgent - 模拟器中的 Agent
 * @param simulatorResource - RVO 模拟器资源
 * @returns 避让的实体 ID 列表
 */
function getAvoidedEntities(simAgent: Agent, simulatorResource: RVOSimulatorResource): Array<number> {
	const avoidedEntities: Array<number> = [];

	// 检查 Agent 邻居
	for (const neighbor of simAgent.agentNeighbors) {
		const neighborAgentId = neighbor.value.id;
		const neighborEntity = simulatorResource.getAgentEntity(neighborAgentId);
		if (neighborEntity !== undefined) {
			avoidedEntities.push(neighborEntity);
		}
	}

	return avoidedEntities;
}

/**
 * 检查两个速度是否相等
 * @param v1 - 速度1
 * @param v2 - 速度2
 * @param epsilon - 误差容限
 * @returns 是否相等
 */
function velocitiesEqual(v1: Vector2, v2: Vector2, epsilon: number = 0.01): boolean {
	return v1.sub(v2).Magnitude < epsilon;
}