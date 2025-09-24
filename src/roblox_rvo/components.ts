/**
 * RVO组件定义
 * 用于标识和配置需要避障的实体
 */

import { component } from "@rbxts/matter";
import { Vector2D } from "./vector2d";

/**
 * RVO代理组件
 * 标记实体为需要避障的移动代理
 */
export const RVOAgent = component<{
	/**
	 * 代理在RVO仿真器中的索引
	 */
	agentIndex: number;

	/**
	 * 代理半径
	 */
	radius: number;

	/**
	 * 最大速度
	 */
	maxSpeed: number;

	/**
	 * 期望速度（目标速度）
	 */
	prefVelocity: Vector2D;

	/**
	 * 当前位置（与Transform同步）
	 */
	position: Vector2D;
}>("RVOAgent");

/**
 * RVO目标组件
 * 设置代理的目标位置
 */
export const RVOTarget = component<{
	/**
	 * 目标位置
	 */
	targetPosition: Vector2D;

	/**
	 * 是否已到达目标
	 */
	reached: boolean;
}>("RVOTarget");

/**
 * RVO障碍物组件
 * 标记静态障碍物
 */
export const RVOObstacle = component<{
	/**
	 * 障碍物顶点（顺时针或逆时针排列）
	 */
	vertices: Array<Vector2D>;

	/**
	 * 障碍物在仿真器中的索引
	 */
	obstacleIndex?: number;
}>("RVOObstacle");

/**
 * RVO配置组件
 * 每个代理的个性化配置
 */
export const RVOConfig = component<{
	/**
	 * 邻居搜索距离
	 */
	neighborDist: number;

	/**
	 * 最大邻居数
	 */
	maxNeighbors: number;

	/**
	 * 时间范围（动态避障）
	 */
	timeHorizon: number;

	/**
	 * 障碍物时间范围
	 */
	timeHorizonObst: number;
}>("RVOConfig");

/**
 * RVO调试组件
 * 用于可视化调试
 */
export const RVODebug = component<{
	/**
	 * 是否显示速度向量
	 */
	showVelocity: boolean;

	/**
	 * 是否显示ORCA线
	 */
	showOrcaLines: boolean;

	/**
	 * 是否显示邻居连接
	 */
	showNeighbors: boolean;
}>("RVODebug");