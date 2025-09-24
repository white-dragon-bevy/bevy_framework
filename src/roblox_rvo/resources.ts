/**
 * RVO资源管理
 * 提供对RVO仿真器和配置的访问
 */

import { World } from "@rbxts/matter";
import { Simulator } from "./simulator";

/**
 * RVO配置
 */
export interface RVOConfig {
	/**
	 * 是否自动更新仿真器
	 */
	autoUpdate: boolean;

	/**
	 * 默认代理半径
	 */
	defaultRadius: number;

	/**
	 * 默认最大邻居数量
	 */
	defaultMaxNeighbors: number;

	/**
	 * 默认最大速度
	 */
	defaultMaxSpeed: number;

	/**
	 * 默认邻居检测距离
	 */
	defaultNeighborDist: number;

	/**
	 * 默认时间范围
	 */
	defaultTimeHorizon: number;

	/**
	 * 默认障碍物时间范围
	 */
	defaultTimeHorizonObst: number;

	/**
	 * 仿真时间步长
	 */
	timeStep: number;
}

/**
 * RVO资源存储键
 */
export const RVOResources = {
	Simulator: "RVO_Simulator",
	Config: "RVO_Config",
} as const;

/**
 * 获取RVO仿真器
 * @param world - World实例
 * @returns RVO仿真器实例或undefined
 */
export function getRVOSimulator(world: World): Simulator | undefined {
	const worldWithResources = world as unknown as Record<string, unknown>;
	return worldWithResources[RVOResources.Simulator] as Simulator | undefined;
}

/**
 * 设置RVO仿真器
 * @param world - World实例
 * @param simulator - RVO仿真器实例
 */
export function setRVOSimulator(world: World, simulator: Simulator): void {
	const worldWithResources = world as unknown as Record<string, unknown>;
	worldWithResources[RVOResources.Simulator] = simulator;
}

/**
 * 获取RVO配置
 * @param world - World实例
 * @returns RVO配置或undefined
 */
export function getRVOConfig(world: World): RVOConfig | undefined {
	const worldWithResources = world as unknown as Record<string, unknown>;
	return worldWithResources[RVOResources.Config] as RVOConfig | undefined;
}

/**
 * 设置RVO配置
 * @param world - World实例
 * @param config - RVO配置
 */
export function setRVOConfig(world: World, config: RVOConfig): void {
	const worldWithResources = world as unknown as Record<string, unknown>;
	worldWithResources[RVOResources.Config] = config;
}