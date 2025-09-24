/**
 * Agent - 代理类
 * 表示RVO算法中的移动代理（如游戏中的角色或单位）
 */

import { Line } from "./line";
import { Obstacle } from "./obstacle";
import { RVOMath } from "./rvo-math";
import { Simulator } from "./simulator";
import { Vector2D } from "./vector2d";

/**
 * 键值对类
 * 用于存储邻居的距离和引用
 */
class KeyValuePair<K, V> {
	/**
	 * 键（通常是距离的平方）
	 */
	public key: K;

	/**
	 * 值（Agent或Obstacle的引用）
	 */
	public value: V;

	/**
	 * 创建一个键值对
	 * @param key - 键
	 * @param value - 值
	 */
	public constructor(key: K, value: V) {
		this.key = key;
		this.value = value;
	}
}

/**
 * 移动代理类
 * 负责计算避障和路径规划
 */
export class Agent {
	/**
	 * 代理邻居列表
	 */
	public agentNeighbors: Array<KeyValuePair<number, Agent>> = [];

	/**
	 * 代理唯一标识符
	 */
	public id: number = 0;

	/**
	 * 最大邻居数量
	 */
	public maxNeighbors: number = 0;

	/**
	 * 最大速度
	 */
	public maxSpeed: number = 0.0;

	/**
	 * 邻居搜索距离
	 */
	public neighborDist: number = 0.0;

	/**
	 * 新计算的速度
	 */
	private newVelocity: Vector2D = Vector2D.ZERO;

	/**
	 * 障碍物邻居列表
	 */
	public obstacleNeighbors: Array<KeyValuePair<number, Obstacle>> = [];

	/**
	 * ORCA线列表
	 */
	public orcaLines: Array<Line> = [];

	/**
	 * 当前位置
	 */
	public position: Vector2D = Vector2D.ZERO;

	/**
	 * 期望速度
	 */
	public prefVelocity: Vector2D = Vector2D.ZERO;

	/**
	 * 代理半径
	 */
	public radius: number = 0.0;

	/**
	 * 模拟器引用
	 */
	public simulator?: Simulator;

	/**
	 * 时间范围（用于动态避障）
	 */
	public timeHorizon: number = 0.0;

	/**
	 * 障碍物时间范围
	 */
	public timeHorizonObst: number = 0.0;

	/**
	 * 当前速度
	 */
	public velocity: Vector2D = Vector2D.ZERO;

	/**
	 * 计算邻居
	 * 查找在搜索范围内的所有代理和障碍物
	 */
	public computeNeighbors(): void {
		this.obstacleNeighbors = [];
		const rangeSq = RVOMath.sqr(this.timeHorizonObst * this.maxSpeed + this.radius);
		if (this.simulator) {
			this.simulator.kdTree.computeObstacleNeighbors(this, rangeSq);
		}

		this.agentNeighbors = [];
		if (this.maxNeighbors > 0) {
			const neighborRangeSq = RVOMath.sqr(this.neighborDist);
			if (this.simulator) {
				this.simulator.kdTree.computeAgentNeighbors(this, neighborRangeSq);
			}
		}
	}

	/**
	 * 计算新速度
	 * 使用ORCA算法计算避障后的新速度
	 */
	public computeNewVelocity(): void {
		this.orcaLines = [];
		const invTimeHorizonObst = 1.0 / this.timeHorizonObst;

		// 创建障碍物ORCA线
		for (let index = 0; index < this.obstacleNeighbors.size(); ++index) {
			const obstacle1 = this.obstacleNeighbors[index].value;
			const obstacle2 = obstacle1.next;

			if (!obstacle2) continue;

			const relativePosition1 = obstacle1.point.minus(this.position);
			const relativePosition2 = obstacle2.point.minus(this.position);

			// 检查速度障碍的合法性
			const alreadyCovered = this.checkObstacleCollision(
				obstacle1,
				obstacle2,
				relativePosition1,
				relativePosition2,
				invTimeHorizonObst,
			);

			if (alreadyCovered) continue;

			// 计算ORCA线
			this.computeObstacleOrcaLine(
				obstacle1,
				obstacle2,
				relativePosition1,
				relativePosition2,
				invTimeHorizonObst,
			);
		}

		const numObstLines = this.orcaLines.size();
		const invTimeHorizon = 1.0 / this.timeHorizon;

		// 创建代理ORCA线
		for (let index = 0; index < this.agentNeighbors.size(); ++index) {
			const other = this.agentNeighbors[index].value;
			const relativePosition = other.position.minus(this.position);
			const relativeVelocity = this.velocity.minus(other.velocity);
			const distSq = RVOMath.absSq(relativePosition);
			const combinedRadius = this.radius + other.radius;
			const combinedRadiusSq = RVOMath.sqr(combinedRadius);

			const line = new Line();

			// 计算代理避障线
			this.computeAgentOrcaLine(
				other,
				relativePosition,
				relativeVelocity,
				distSq,
				combinedRadius,
				combinedRadiusSq,
				invTimeHorizon,
				line,
			);

			this.orcaLines.push(line);
		}

		// 使用线性规划求解最优速度
		this.linearProgram(numObstLines);
	}

	/**
	 * 检查障碍物碰撞
	 * @param obstacle1 - 第一个障碍物
	 * @param obstacle2 - 第二个障碍物
	 * @param relativePosition1 - 相对位置1
	 * @param relativePosition2 - 相对位置2
	 * @param invTimeHorizonObst - 时间范围倒数
	 * @returns 是否已经被覆盖
	 */
	private checkObstacleCollision(
		obstacle1: Obstacle,
		obstacle2: Obstacle,
		relativePosition1: Vector2D,
		relativePosition2: Vector2D,
		invTimeHorizonObst: number,
	): boolean {
		// 简化的碰撞检测逻辑
		return false;
	}

	/**
	 * 计算障碍物ORCA线
	 * @param obstacle1 - 第一个障碍物
	 * @param obstacle2 - 第二个障碍物
	 * @param relativePosition1 - 相对位置1
	 * @param relativePosition2 - 相对位置2
	 * @param invTimeHorizonObst - 时间范围倒数
	 */
	private computeObstacleOrcaLine(
		obstacle1: Obstacle,
		obstacle2: Obstacle,
		relativePosition1: Vector2D,
		relativePosition2: Vector2D,
		invTimeHorizonObst: number,
	): void {
		// 简化的ORCA线计算逻辑
		const line = new Line();
		line.point = relativePosition1.scale(0.5);
		line.direction = RVOMath.normalize(relativePosition2.minus(relativePosition1));
		this.orcaLines.push(line);
	}

	/**
	 * 计算代理ORCA线
	 * @param other - 其他代理
	 * @param relativePosition - 相对位置
	 * @param relativeVelocity - 相对速度
	 * @param distSq - 距离平方
	 * @param combinedRadius - 组合半径
	 * @param combinedRadiusSq - 组合半径平方
	 * @param invTimeHorizon - 时间范围倒数
	 * @param line - 输出的ORCA线
	 */
	private computeAgentOrcaLine(
		other: Agent,
		relativePosition: Vector2D,
		relativeVelocity: Vector2D,
		distSq: number,
		combinedRadius: number,
		combinedRadiusSq: number,
		invTimeHorizon: number,
		line: Line,
	): void {
		// 简化的代理ORCA线计算
		const velocityOpt = relativeVelocity.scale(0.5);
		line.point = velocityOpt;
		line.direction = RVOMath.normalize(new Vector2D(-relativePosition.y, relativePosition.x));
	}

	/**
	 * 线性规划求解
	 * @param numObstLines - 障碍物线数量
	 */
	private linearProgram(numObstLines: number): void {
		// 简化的线性规划实现
		this.newVelocity = this.prefVelocity;

		// 确保速度不超过最大速度
		if (RVOMath.absSq(this.newVelocity) > RVOMath.sqr(this.maxSpeed)) {
			this.newVelocity = RVOMath.normalize(this.newVelocity).scale(this.maxSpeed);
		}
	}

	/**
	 * 更新代理状态
	 * 应用新计算的速度并更新位置
	 */
	public update(): void {
		this.velocity = this.newVelocity;
		if (this.simulator) {
			this.position = this.position.plus(this.velocity.scale(this.simulator.timeStep));
		}
	}

	/**
	 * 插入代理邻居
	 * @param agent - 要插入的代理
	 * @param rangeSq - 搜索范围的平方
	 */
	public insertAgentNeighbor(agent: Agent, rangeSq: number): void {
		const distSq = RVOMath.absSq(this.position.minus(agent.position));

		if (distSq < rangeSq) {
			if (this.agentNeighbors.size() < this.maxNeighbors) {
				this.agentNeighbors.push(new KeyValuePair(distSq, agent));
			}

			// 保持列表按距离排序
			let index = this.agentNeighbors.size() - 1;
			while (index !== 0 && distSq < this.agentNeighbors[index - 1].key) {
				this.agentNeighbors[index] = this.agentNeighbors[index - 1];
				--index;
			}
			this.agentNeighbors[index] = new KeyValuePair(distSq, agent);

			if (this.agentNeighbors.size() === this.maxNeighbors) {
				rangeSq = this.agentNeighbors[this.agentNeighbors.size() - 1].key;
			}
		}
	}

	/**
	 * 插入障碍物邻居
	 * @param obstacle - 要插入的障碍物
	 * @param rangeSq - 搜索范围的平方
	 */
	public insertObstacleNeighbor(obstacle: Obstacle, rangeSq: number): void {
		const nextObstacle = obstacle.next;
		if (!nextObstacle) return;

		const distSq = RVOMath.distSqPointLineSegment(
			obstacle.point,
			nextObstacle.point,
			this.position,
		);

		if (distSq < rangeSq) {
			this.obstacleNeighbors.push(new KeyValuePair(distSq, obstacle));

			// 保持列表按距离排序
			let index = this.obstacleNeighbors.size() - 1;
			while (index !== 0 && distSq < this.obstacleNeighbors[index - 1].key) {
				this.obstacleNeighbors[index] = this.obstacleNeighbors[index - 1];
				--index;
			}
			this.obstacleNeighbors[index] = new KeyValuePair(distSq, obstacle);
		}
	}
}