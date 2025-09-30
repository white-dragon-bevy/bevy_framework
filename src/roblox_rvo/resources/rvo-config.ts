/**
 * RVOConfig 资源 - RVO 系统全局配置
 * 存储 RVO 算法的默认参数
 */

import { Resource } from "../../bevy_ecs/resource";

/**
 * RVOConfig 类
 * RVO 系统配置资源，控制 RVO 算法的全局行为和默认参数
 * 实现 Resource 接口，可作为 ECS 资源使用
 */
export class RVOConfig implements Resource {
	/** 最大代理数量 */
	maxAgents: number;
	/** 模拟时间步长 (秒) */
	timeStep: number;
	/** 默认邻居检测距离 */
	neighborDist: number;
	/** 默认最大邻居数量 */
	maxNeighbors: number;
	/** 默认时间视界 */
	timeHorizon: number;
	/** 默认障碍物时间视界 */
	timeHorizonObst: number;
	/** 默认代理半径 */
	radius: number;
	/** 默认最大速度 */
	maxSpeed: number;
	/** 是否启用调试绘制 */
	debugDraw: boolean;
	/** 是否自动运行模拟 */
	autoSimulate: boolean;
	/** KD 树最大叶节点大小 */
	kdTreeMaxLeafSize: number;

	/**
	 * 创建 RVO 配置
	 * @param partial - 部分配置覆盖
	 */
	constructor(partial?: Partial<RVOConfig>) {
		this.maxAgents = partial?.maxAgents ?? 1000;
		this.timeStep = partial?.timeStep ?? 0.25;
		this.neighborDist = partial?.neighborDist ?? 15;
		this.maxNeighbors = partial?.maxNeighbors ?? 10;
		this.timeHorizon = partial?.timeHorizon ?? 10;
		this.timeHorizonObst = partial?.timeHorizonObst ?? 10;
		this.radius = partial?.radius ?? 1.5;
		this.maxSpeed = partial?.maxSpeed ?? 2;
		this.debugDraw = partial?.debugDraw ?? false;
		this.autoSimulate = partial?.autoSimulate ?? true;
		this.kdTreeMaxLeafSize = partial?.kdTreeMaxLeafSize ?? 1000;
	}

	/**
	 * 应用配置到 Agent 默认值
	 * @returns Agent 默认参数
	 */
	getAgentDefaults(): {
		neighborDist: number;
		maxNeighbors: number;
		timeHorizon: number;
		timeHorizonObst: number;
		radius: number;
		maxSpeed: number;
	} {
		return {
			neighborDist: this.neighborDist,
			maxNeighbors: this.maxNeighbors,
			timeHorizon: this.timeHorizon,
			timeHorizonObst: this.timeHorizonObst,
			radius: this.radius,
			maxSpeed: this.maxSpeed,
		};
	}

	/**
	 * 验证配置有效性
	 * @returns 配置是否有效
	 */
	validate(): boolean {
		if (this.maxAgents <= 0) {
			return false;
		}

		if (this.timeStep <= 0) {
			return false;
		}

		if (this.radius <= 0) {
			return false;
		}

		if (this.maxSpeed <= 0) {
			return false;
		}

		if (this.maxNeighbors < 0) {
			return false;
		}

		return true;
	}

	/**
	 * 克隆配置
	 * @returns 配置副本
	 */
	clone(): RVOConfig {
		return new RVOConfig({
			maxAgents: this.maxAgents,
			timeStep: this.timeStep,
			neighborDist: this.neighborDist,
			maxNeighbors: this.maxNeighbors,
			timeHorizon: this.timeHorizon,
			timeHorizonObst: this.timeHorizonObst,
			radius: this.radius,
			maxSpeed: this.maxSpeed,
			debugDraw: this.debugDraw,
			autoSimulate: this.autoSimulate,
			kdTreeMaxLeafSize: this.kdTreeMaxLeafSize,
		});
	}

	/**
	 * 合并另一个配置
	 * @param other - 要合并的配置
	 */
	merge(other: Partial<RVOConfig>): void {
		if (other.maxAgents !== undefined) this.maxAgents = other.maxAgents;
		if (other.timeStep !== undefined) this.timeStep = other.timeStep;
		if (other.neighborDist !== undefined) this.neighborDist = other.neighborDist;
		if (other.maxNeighbors !== undefined) this.maxNeighbors = other.maxNeighbors;
		if (other.timeHorizon !== undefined) this.timeHorizon = other.timeHorizon;
		if (other.timeHorizonObst !== undefined) this.timeHorizonObst = other.timeHorizonObst;
		if (other.radius !== undefined) this.radius = other.radius;
		if (other.maxSpeed !== undefined) this.maxSpeed = other.maxSpeed;
		if (other.debugDraw !== undefined) this.debugDraw = other.debugDraw;
		if (other.autoSimulate !== undefined) this.autoSimulate = other.autoSimulate;
		if (other.kdTreeMaxLeafSize !== undefined) this.kdTreeMaxLeafSize = other.kdTreeMaxLeafSize;
	}

	/**
	 * 创建默认配置
	 * @returns 默认配置实例
	 */
	static default(): RVOConfig {
		return new RVOConfig();
	}

	/**
	 * 创建高性能配置 (较少邻居检测)
	 * @returns 高性能配置实例
	 */
	static performance(): RVOConfig {
		return new RVOConfig({
			maxNeighbors: 5,
			neighborDist: 10,
			timeHorizon: 5,
			timeHorizonObst: 5,
		});
	}

	/**
	 * 创建高质量配置 (更多邻居检测)
	 * @returns 高质量配置实例
	 */
	static quality(): RVOConfig {
		return new RVOConfig({
			maxNeighbors: 20,
			neighborDist: 20,
			timeHorizon: 15,
			timeHorizonObst: 15,
		});
	}
}