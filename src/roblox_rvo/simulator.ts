/**
 * Simulator - RVO仿真器类
 * 管理所有代理和障碍物，执行避障算法
 */

import { Agent } from "./agent";
import { KdTree } from "./kd-tree";
import { Obstacle } from "./obstacle";
import { RVOMath } from "./rvo-math";
import { Vector2D } from "./vector2d";

/**
 * RVO仿真器
 * 负责管理和更新所有代理和障碍物
 */
export class Simulator {
	/**
	 * 所有代理的数组
	 */
	public agents: Array<Agent> = [];

	/**
	 * 默认代理配置
	 */
	private defaultAgent?: Agent;

	/**
	 * 代理目标位置数组
	 */
	private goals: Array<Vector2D> = [];

	/**
	 * k维树（用于空间索引）
	 */
	public kdTree: KdTree;

	/**
	 * 所有障碍物的数组
	 */
	public obstacles: Array<Obstacle> = [];

	/**
	 * 全局时间
	 */
	private time: number = 0;

	/**
	 * 时间步长
	 */
	public timeStep: number = 0.25;

	/**
	 * 创建一个新的仿真器
	 */
	public constructor() {
		this.kdTree = new KdTree();
		this.kdTree.simulator = this;
		this.kdTree.MAXLEAF_SIZE = 1000;
	}

	/**
	 * 添加代理
	 * @param position - 代理初始位置
	 * @returns 新代理的索引
	 */
	public addAgent(position?: Vector2D): number {
		if (!this.defaultAgent) {
			error("No default agent configuration set");
		}

		const agentPosition = position ?? new Vector2D(0, 0);
		const agent = new Agent();

		// 复制默认代理配置
		agent.position = agentPosition;
		agent.maxNeighbors = this.defaultAgent.maxNeighbors;
		agent.radius = this.defaultAgent.radius;
		agent.maxSpeed = this.defaultAgent.maxSpeed;
		agent.neighborDist = this.defaultAgent.neighborDist;
		agent.timeHorizon = this.defaultAgent.timeHorizon;
		agent.timeHorizonObst = this.defaultAgent.timeHorizonObst;
		agent.velocity = this.defaultAgent.velocity.clone();
		agent.simulator = this;

		agent.id = this.agents.size();
		this.agents.push(agent);
		this.goals.push(agentPosition);

		return this.agents.size() - 1;
	}

	/**
	 * 添加目标位置数组
	 * @param goals - 目标位置数组
	 */
	public addGoals(goals: Array<Vector2D>): void {
		this.goals = goals;
	}

	/**
	 * 添加障碍物
	 * @param vertices - 障碍物顶点数组
	 * @returns 障碍物的起始索引，如果失败返回-1
	 */
	public addObstacle(vertices: Array<Vector2D>): number {
		if (vertices.size() < 2) {
			return -1;
		}

		const obstacleNo = this.obstacles.size();

		for (let index = 0; index < vertices.size(); ++index) {
			const obstacle = new Obstacle();
			obstacle.point = vertices[index];

			if (index !== 0) {
				obstacle.previous = this.obstacles[this.obstacles.size() - 1];
				obstacle.previous.next = obstacle;
			}

			if (index === vertices.size() - 1) {
				obstacle.next = this.obstacles[obstacleNo];
				obstacle.next.previous = obstacle;
			}

			const nextIndex = index === vertices.size() - 1 ? 0 : index + 1;
			obstacle.unitDir = RVOMath.normalize(vertices[nextIndex].minus(vertices[index]));

			if (vertices.size() === 2) {
				obstacle.isConvex = true;
			} else {
				const prevIndex = index === 0 ? vertices.size() - 1 : index - 1;
				obstacle.isConvex = RVOMath.leftOf(
					vertices[prevIndex],
					vertices[index],
					vertices[nextIndex],
				) >= 0;
			}

			obstacle.id = this.obstacles.size();
			this.obstacles.push(obstacle);
		}

		return obstacleNo;
	}

	/**
	 * 获取代理的ORCA线
	 * @param agentIndex - 代理索引
	 * @returns ORCA线数组
	 */
	public getAgentOrcaLines(agentIndex: number): Array<import("./line").Line> {
		return this.agents[agentIndex].orcaLines;
	}

	/**
	 * 获取代理位置
	 * @param agentIndex - 代理索引
	 * @returns 代理位置
	 */
	public getAgentPosition(agentIndex: number): Vector2D {
		return this.agents[agentIndex].position;
	}

	/**
	 * 获取代理期望速度
	 * @param agentIndex - 代理索引
	 * @returns 代理期望速度
	 */
	public getAgentPrefVelocity(agentIndex: number): Vector2D {
		return this.agents[agentIndex].prefVelocity;
	}

	/**
	 * 获取代理半径
	 * @param agentIndex - 代理索引
	 * @returns 代理半径
	 */
	public getAgentRadius(agentIndex: number): number {
		return this.agents[agentIndex].radius;
	}

	/**
	 * 获取代理速度
	 * @param agentIndex - 代理索引
	 * @returns 代理速度
	 */
	public getAgentVelocity(agentIndex: number): Vector2D {
		return this.agents[agentIndex].velocity;
	}

	/**
	 * 获取全局时间
	 * @returns 当前全局时间
	 */
	public getGlobalTime(): number {
		return this.time;
	}

	/**
	 * 获取目标位置
	 * @param goalNo - 目标索引
	 * @returns 目标位置
	 */
	public getGoal(goalNo: number): Vector2D {
		return this.goals[goalNo];
	}

	/**
	 * 获取代理数量
	 * @returns 代理数量
	 */
	public getNumAgents(): number {
		return this.agents.size();
	}

	/**
	 * 获取所有障碍物
	 * @returns 障碍物数组
	 */
	public getObstacles(): Array<Obstacle> {
		return this.obstacles;
	}

	/**
	 * 获取时间步长
	 * @returns 时间步长
	 */
	public getTimeStep(): number {
		return this.timeStep;
	}

	/**
	 * 处理障碍物
	 * 构建障碍物的k维树索引
	 */
	public processObstacles(): void {
		this.kdTree.buildObstacleTree();
	}

	/**
	 * 查询可见性
	 * @param point1 - 起点
	 * @param point2 - 终点
	 * @param radius - 代理半径
	 * @returns 是否可见
	 */
	public queryVisibility(point1: Vector2D, point2: Vector2D, radius: number): boolean {
		return this.kdTree.queryVisibility(point1, point2, radius);
	}

	/**
	 * 检查所有代理是否到达目标
	 * @returns 是否所有代理都到达目标
	 */
	public reachedGoal(): boolean {
		for (let index = 0; index < this.getNumAgents(); ++index) {
			const position = this.getAgentPosition(index);
			const goal = this.goals[index];
			if (RVOMath.absSq(goal.minus(position)) > RVOMath.RVO_EPSILON) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 运行一个仿真步骤
	 * 更新所有代理的位置和速度
	 */
	public run(): void {
		// 构建代理树
		this.kdTree.buildAgentTree();

		// 计算每个代理的新速度
		for (let index = 0; index < this.getNumAgents(); index++) {
			this.agents[index].computeNeighbors();
			this.agents[index].computeNewVelocity();
			this.agents[index].update();
		}

		// 更新全局时间
		this.time += this.timeStep;
	}

	/**
	 * 设置代理默认配置
	 * @param neighborDist - 邻居搜索距离
	 * @param maxNeighbors - 最大邻居数
	 * @param timeHorizon - 时间范围
	 * @param timeHorizonObst - 障碍物时间范围
	 * @param radius - 代理半径
	 * @param maxSpeed - 最大速度
	 * @param velocityX - 初始速度X分量
	 * @param velocityY - 初始速度Y分量
	 */
	public setAgentDefaults(
		neighborDist: number,
		maxNeighbors: number,
		timeHorizon: number,
		timeHorizonObst: number,
		radius: number,
		maxSpeed: number,
		velocityX: number = 0,
		velocityY: number = 0,
	): void {
		if (!this.defaultAgent) {
			this.defaultAgent = new Agent();
		}

		this.defaultAgent.maxNeighbors = maxNeighbors;
		this.defaultAgent.maxSpeed = maxSpeed;
		this.defaultAgent.neighborDist = neighborDist;
		this.defaultAgent.radius = radius;
		this.defaultAgent.timeHorizon = timeHorizon;
		this.defaultAgent.timeHorizonObst = timeHorizonObst;
		this.defaultAgent.velocity = new Vector2D(velocityX, velocityY);
		this.defaultAgent.simulator = this;
	}

	/**
	 * 设置代理目标位置
	 * @param agentIndex - 代理索引
	 * @param x - 目标X坐标
	 * @param y - 目标Y坐标
	 */
	public setAgentGoal(agentIndex: number, x: number, y: number): void {
		this.goals[agentIndex] = new Vector2D(x, y);
	}

	/**
	 * 设置代理位置
	 * @param agentIndex - 代理索引
	 * @param x - X坐标
	 * @param y - Y坐标
	 */
	public setAgentPosition(agentIndex: number, x: number, y: number): void {
		this.agents[agentIndex].position = new Vector2D(x, y);
	}

	/**
	 * 设置代理期望速度
	 * @param agentIndex - 代理索引
	 * @param vx - 速度X分量
	 * @param vy - 速度Y分量
	 */
	public setAgentPrefVelocity(agentIndex: number, vx: number, vy: number): void {
		this.agents[agentIndex].prefVelocity = new Vector2D(vx, vy);
	}

	/**
	 * 设置时间步长
	 * @param timeStep - 新的时间步长
	 */
	public setTimeStep(timeStep: number): void {
		this.timeStep = timeStep;
	}
}