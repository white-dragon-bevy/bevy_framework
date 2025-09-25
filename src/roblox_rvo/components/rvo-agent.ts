/**
 * RVOAgent 组件 - 描述 RVO 代理实体
 * 用于标记需要进行碰撞避免的移动实体
 */

import { component } from "@rbxts/matter";

/**
 * RVOAgent 组件数据接口
 */
export interface RVOAgentData {
	/** 内部 Agent ID (由系统自动分配) */
	agentId?: number;
	/** 目标速度向量 */
	targetVelocity: Vector2;
	/** 首选速度向量 (由用户设置) */
	preferredVelocity: Vector2;
	/** 当前实际速度 (由 RVO 计算) */
	currentVelocity?: Vector2;
	/** 碰撞半径 */
	radius: number;
	/** 最大移动速度 */
	maxSpeed: number;
	/** 最大邻居数量 */
	maxNeighbors: number;
	/** 邻居检测距离 */
	neighborDist: number;
	/** 时间视界 (用于预测碰撞) */
	timeHorizon: number;
	/** 障碍物时间视界 */
	timeHorizonObst: number;
	/** 是否启用 */
	enabled: boolean;
	/** 目标位置 (可选) */
	goalPosition?: Vector2;
}

/**
 * RVOAgent 组件
 * 存储 RVO 代理的配置和状态
 */
export const RVOAgent = component<RVOAgentData>("RVOAgent");

/**
 * 创建 RVOAgent 的辅助函数
 * @param config - Agent 配置
 * @returns RVOAgent 组件数据
 */
export function createRVOAgent(config: Partial<RVOAgentData> = {}): RVOAgentData {
	return {
		agentId: config.agentId,
		targetVelocity: config.targetVelocity || new Vector2(0, 0),
		preferredVelocity: config.preferredVelocity || new Vector2(0, 0),
		currentVelocity: config.currentVelocity,
		radius: config.radius ?? 1.5,
		maxSpeed: config.maxSpeed ?? 2.0,
		maxNeighbors: config.maxNeighbors ?? 10,
		neighborDist: config.neighborDist ?? 15,
		timeHorizon: config.timeHorizon ?? 10,
		timeHorizonObst: config.timeHorizonObst ?? 10,
		enabled: config.enabled ?? true,
		goalPosition: config.goalPosition,
	};
}

/**
 * 设置 Agent 目标位置的辅助函数
 * @param agentData - Agent 数据
 * @param goalPosition - 目标位置
 * @param currentPosition - 当前位置
 * @returns 更新后的 Agent 数据
 */
export function setAgentGoal(
	agentData: RVOAgentData,
	goalPosition: Vector2,
	currentPosition: Vector2,
): RVOAgentData {
	const direction = goalPosition.sub(currentPosition);
	const distance = direction.Magnitude;

	if (distance > 0.1) {
		// 计算首选速度
		const preferredSpeed = math.min(agentData.maxSpeed, distance);
		const preferredVelocity = direction.Unit.mul(preferredSpeed);

		return {
			...agentData,
			goalPosition,
			preferredVelocity,
			targetVelocity: preferredVelocity,
		};
	}

	// 已到达目标
	return {
		...agentData,
		goalPosition,
		preferredVelocity: new Vector2(0, 0),
		targetVelocity: new Vector2(0, 0),
	};
}

/**
 * 检查 Agent 是否到达目标
 * @param agentData - Agent 数据
 * @param currentPosition - 当前位置
 * @param threshold - 到达阈值
 * @returns 是否到达目标
 */
export function hasReachedGoal(
	agentData: RVOAgentData,
	currentPosition: Vector2,
	threshold: number = 0.5,
): boolean {
	if (!agentData.goalPosition) {
		return false;
	}

	const distance = agentData.goalPosition.sub(currentPosition).Magnitude;
	return distance <= threshold;
}