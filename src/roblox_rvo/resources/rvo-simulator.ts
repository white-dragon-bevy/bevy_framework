/**
 * RVOSimulatorResource 资源 - RVO 模拟器管理
 * 管理 RVO 算法的核心模拟器实例
 */

import { Resource } from "../../bevy_ecs/resource";
import Simulator from "../core/Simulator";

/**
 * RVOSimulatorResource 类
 * RVO 模拟器资源，管理核心模拟器实例和实体映射关系
 * 实现 Resource 接口，可作为 ECS 资源使用
 */
export class RVOSimulatorResource implements Resource {
	/** 核心模拟器实例 */
	simulator: Simulator;
	/** Agent ID 到 Entity 的映射 */
	agentEntityMap: Map<number, number>;
	/** Entity 到 Agent ID 的映射 */
	entityAgentMap: Map<number, number>;
	/** Obstacle ID 到 Entity 的映射 */
	obstacleEntityMap: Map<number, number>;
	/** Entity 到 Obstacle ID 的映射 */
	entityObstacleMap: Map<number, number>;
	/** 下一个可用的 Agent ID */
	private nextAgentId: number;
	/** 下一个可用的 Obstacle ID */
	private nextObstacleId: number;
	/** 是否已初始化 */
	initialized: boolean;
	/** 统计信息 */
	stats: RVOStats;

	/**
	 * 创建 RVO 模拟器资源
	 */
	constructor() {
		this.simulator = new Simulator();
		this.agentEntityMap = new Map();
		this.entityAgentMap = new Map();
		this.obstacleEntityMap = new Map();
		this.entityObstacleMap = new Map();
		this.nextAgentId = 0;
		this.nextObstacleId = 0;
		this.initialized = false;
		this.stats = {
			agentCount: 0,
			obstacleCount: 0,
			lastSimulationTime: 0,
			totalSimulationTime: 0,
			simulationCount: 0,
		};
	}

	/**
	 * 注册 Agent 实体
	 * @param entity - 实体 ID
	 * @param agentId - Agent ID
	 */
	registerAgent(entity: number, agentId: number): void {
		this.agentEntityMap.set(agentId, entity);
		this.entityAgentMap.set(entity, agentId);
		this.stats.agentCount++;
	}

	/**
	 * 注销 Agent 实体
	 * @param entity - 实体 ID
	 */
	unregisterAgent(entity: number): void {
		const agentId = this.entityAgentMap.get(entity);
		if (agentId !== undefined) {
			this.agentEntityMap.delete(agentId);
			this.entityAgentMap.delete(entity);
			this.stats.agentCount--;
		}
	}

	/**
	 * 注册障碍物实体
	 * @param entity - 实体 ID
	 * @param obstacleId - 障碍物 ID
	 */
	registerObstacle(entity: number, obstacleId: number): void {
		this.obstacleEntityMap.set(obstacleId, entity);
		this.entityObstacleMap.set(entity, obstacleId);
		this.stats.obstacleCount++;
	}

	/**
	 * 注销障碍物实体
	 * @param entity - 实体 ID
	 */
	unregisterObstacle(entity: number): void {
		const obstacleId = this.entityObstacleMap.get(entity);
		if (obstacleId !== undefined) {
			this.obstacleEntityMap.delete(obstacleId);
			this.entityObstacleMap.delete(entity);
			this.stats.obstacleCount--;
		}
	}

	/**
	 * 获取 Agent 对应的实体
	 * @param agentId - Agent ID
	 * @returns 实体 ID
	 */
	getAgentEntity(agentId: number): number | undefined {
		return this.agentEntityMap.get(agentId);
	}

	/**
	 * 获取实体对应的 Agent
	 * @param entity - 实体 ID
	 * @returns Agent ID
	 */
	getEntityAgent(entity: number): number | undefined {
		return this.entityAgentMap.get(entity);
	}

	/**
	 * 获取障碍物对应的实体
	 * @param obstacleId - 障碍物 ID
	 * @returns 实体 ID
	 */
	getObstacleEntity(obstacleId: number): number | undefined {
		return this.obstacleEntityMap.get(obstacleId);
	}

	/**
	 * 获取实体对应的障碍物
	 * @param entity - 实体 ID
	 * @returns 障碍物 ID
	 */
	getEntityObstacle(entity: number): number | undefined {
		return this.entityObstacleMap.get(entity);
	}

	/**
	 * 生成下一个 Agent ID
	 * @returns 新的 Agent ID
	 */
	generateAgentId(): number {
		return this.nextAgentId++;
	}

	/**
	 * 生成下一个障碍物 ID
	 * @returns 新的障碍物 ID
	 */
	generateObstacleId(): number {
		return this.nextObstacleId++;
	}

	/**
	 * 执行模拟步骤
	 */
	simulate(): void {
		const startTime = os.clock();
		this.simulator.run();
		const endTime = os.clock();

		const simulationTime = endTime - startTime;
		this.stats.lastSimulationTime = simulationTime;
		this.stats.totalSimulationTime += simulationTime;
		this.stats.simulationCount++;
	}

	/**
	 * 获取平均模拟时间
	 * @returns 平均模拟时间 (毫秒)
	 */
	getAverageSimulationTime(): number {
		if (this.stats.simulationCount === 0) {
			return 0;
		}
		return (this.stats.totalSimulationTime / this.stats.simulationCount) * 1000;
	}

	/**
	 * 重置资源
	 */
	reset(): void {
		this.simulator = new Simulator();
		this.agentEntityMap.clear();
		this.entityAgentMap.clear();
		this.obstacleEntityMap.clear();
		this.entityObstacleMap.clear();
		this.nextAgentId = 0;
		this.nextObstacleId = 0;
		this.initialized = false;
		this.stats = {
			agentCount: 0,
			obstacleCount: 0,
			lastSimulationTime: 0,
			totalSimulationTime: 0,
			simulationCount: 0,
		};
	}

	/**
	 * 清理资源
	 */
	cleanup(): void {
		this.reset();
	}
}

/**
 * RVOStats 接口
 * RVO 模拟器的性能和状态统计信息
 */
interface RVOStats {
	/** 当前 Agent 数量 */
	agentCount: number;
	/** 当前障碍物数量 */
	obstacleCount: number;
	/** 最后一次模拟时间 (秒) */
	lastSimulationTime: number;
	/** 总模拟时间 (秒) */
	totalSimulationTime: number;
	/** 模拟次数 */
	simulationCount: number;
}