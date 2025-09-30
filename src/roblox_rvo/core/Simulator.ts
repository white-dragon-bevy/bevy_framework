
import Obstacle from "./Obstacle";
import Agent from "./Agent";
import RVOMath from "./RVOMath";
import KdTree from "./KdTree";
import Line from "./Line";

/**
 * Simulator 类
 * RVO 算法的核心模拟器，管理所有代理和障碍物
 * 负责执行碰撞避免模拟和空间查询
 */
export default class Simulator {
	/** 所有代理的数组 */
	agents: Agent[] = [];

	/** 所有障碍物的数组 */
	obstacles: Obstacle[] = [];

	/** 代理目标位置数组 */
	private goals: Vector2[] = [];

	/** K-D 树，用于快速空间查询 */
	kdTree: KdTree = new KdTree();

	/** 模拟时间步长（秒） */
	timeStep = 0.25;

	/** 默认代理配置模板 */
	private defaultAgent!: Agent;

	/** 当前模拟时间 */
	private time = 0;

	/**
	 * 创建模拟器实例
	 */
	constructor() {
		this.kdTree.simulator = this;
		this.kdTree.MAXLEAF_SIZE = 1000;
	}
  /**
   * 获取全局模拟时间
   * @returns 当前模拟时间
   */
  getGlobalTime(): number {
    return this.time;
  }

  /**
   * 获取代理数量
   * @returns 代理总数
   */
  getNumAgents(): number {
    return this.agents.size();
  }

  /**
   * 获取时间步长
   * @returns 时间步长
   */
  getTimeStep(): number {
    return this.timeStep;
  }

  /**
   * 设置代理的首选速度
   * @param i - 代理索引
   * @param vx - X 方向速度
   * @param vy - Y 方向速度
   */
  setAgentPrefVelocity(i: number, vx:number, vy:number) {
    this.agents[i].prefVelocity = new Vector2(vx, vy);
  }

  /**
   * 设置代理位置
   * @param i - 代理索引
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  setAgentPosition(i: number, x: number, y: number) {
    this.agents[i].position = new Vector2(x, y);
  }

  /**
   * 设置代理目标位置
   * @param i - 代理索引
   * @param x - 目标 X 坐标
   * @param y - 目标 Y 坐标
   */
  setAgentGoal(i: number, x: number, y: number) {
    this.goals[i] = new Vector2(x, y);
  }

  /**
   * 设置时间步长
   * @param timeStep - 新的时间步长
   */
  setTimeStep(timeStep: number) {
    this.timeStep = timeStep;
  }

  /**
   * 获取代理位置
   * @param i - 代理索引
   * @returns 代理位置
   */
  getAgentPosition(i: number): Vector2 {
    return this.agents[i].position;
  }

  /**
   * 获取代理首选速度
   * @param i - 代理索引
   * @returns 首选速度
   */
  getAgentPrefVelocity(i: number): Vector2 {
    return this.agents[i].prefVelocity;
  }

  /**
   * 获取代理当前速度
   * @param i - 代理索引
   * @returns 当前速度
   */
  getAgentVelocity(i: number): Vector2 {
    return this.agents[i].velocity;
  }

  /**
   * 获取代理半径
   * @param i - 代理索引
   * @returns 代理半径
   */
  getAgentRadius(i: number): number {
    return this.agents[i].radius;
  }

  /**
   * 获取代理的 ORCA 约束线
   * @param i - 代理索引
   * @returns ORCA 约束线数组
   */
  getAgentOrcaLines(i: number): Line[] {
    return this.agents[i].orcaLines;
  }

  /**
   * 添加新代理
   * @param position - 初始位置（可选）
   * @returns 新代理的索引
   */
  addAgent(position?: Vector2) {
    if (!this.defaultAgent) {
      error("no default agent");
    }

    if (!position) position = new Vector2(0, 0);

    const agent = new Agent();

    agent.position = position;
    agent.maxNeighbors = this.defaultAgent.maxNeighbors;

    agent.radius = this.defaultAgent.radius;
    agent.maxSpeed = this.defaultAgent.maxSpeed;
    agent.neighborDist = this.defaultAgent.neighborDist;
    agent.timeHorizon = this.defaultAgent.timeHorizon;
    agent.timeHorizonObst = this.defaultAgent.timeHorizonObst;
    agent.velocity = this.defaultAgent.velocity;
    agent.simulator = this;

    agent.id = this.agents.size();
    this.agents.push(agent);
    this.goals.push(position);

    return this.agents.size() - 1;
  }

	/**
	 * 从模拟中移除代理
	 * @param agentId - 要移除的代理 ID
	 */
	removeAgent(agentId: number): void {
    if (agentId < 0 || agentId >= this.agents.size()) {
      return;
    }

    // Remove agent from arrays by rebuilding them without the removed element
    const newAgents: Agent[] = [];
    const newGoals: Vector2[] = [];

    for (let index = 0; index < this.agents.size(); index++) {
      if (index !== agentId) {
        newAgents.push(this.agents[index]);
        newGoals.push(this.goals[index]);
      }
    }

    this.agents = newAgents;
    this.goals = newGoals;

    // Update IDs for agents after the removed one
    for (let index = agentId; index < this.agents.size(); index++) {
      this.agents[index].id = index;
    }
  }

  /**
   * 设置代理默认参数
   * 所有新创建的代理将使用这些默认值
   * @param neighborDist - 邻居检测距离
   * @param maxNeighbors - 最大邻居数量
   * @param timeHorizon - 时间视界
   * @param timeHorizonObst - 障碍物时间视界
   * @param radius - 代理半径
   * @param maxSpeed - 最大速度
   * @param velocityX - 初始 X 速度（默认 0）
   * @param velocityY - 初始 Y 速度（默认 0）
   */
  setAgentDefaults(neighborDist: number,
    maxNeighbors: number,
    timeHorizon: number,
    timeHorizonObst: number,
    radius: number,
    maxSpeed: number,
    velocityX: number = 0, velocityY: number = 0) {
    if (!this.defaultAgent) {
      this.defaultAgent = new Agent();
    }

    this.defaultAgent.maxNeighbors = maxNeighbors;
    this.defaultAgent.maxSpeed = maxSpeed;
    this.defaultAgent.neighborDist = neighborDist;
    this.defaultAgent.radius = radius;
    this.defaultAgent.timeHorizon = timeHorizon;
    this.defaultAgent.timeHorizonObst = timeHorizonObst;
    this.defaultAgent.velocity = new Vector2(velocityX, velocityY);
    this.defaultAgent.simulator = this;
  }

  /**
   * 运行一步模拟
   * 更新所有代理的位置和速度
   */
  run() {
    this.kdTree.buildAgentTree();

    for (let i = 0; i < this.getNumAgents(); i++) {
      this.agents[i].computeNeighbors();
      this.agents[i].computeNewVelocity();
      this.agents[i].update();
    }

    this.time += this.timeStep;
  }

  /**
   * 检查所有代理是否到达目标
   * @returns 是否所有代理都到达目标
   */
  reachedGoal(): boolean {
    let pos: Vector2;
    for (let i = 0, len = this.getNumAgents(); i < len; ++i) {
      pos = this.getAgentPosition(i);
      if (RVOMath.absSq(this.goals[i].sub(pos)) > RVOMath.RVO_EPSILON) {
        return false;
      }
    }
    return true;
  }

  /**
   * 批量设置目标位置
   * @param goals - 目标位置数组
   */
  addGoals(goals: Vector2[]) {
    this.goals = goals;
  }

  /**
   * 获取指定代理的目标位置
   * @param goalNo - 代理索引
   * @returns 目标位置
   */
  getGoal(goalNo: number): Vector2 {
    return this.goals[goalNo];
  }

  /**
   * 添加障碍物
   * @param vertices - 障碍物顶点数组（逆时针顺序）
   * @returns 障碍物 ID，失败返回 -1
   */
  addObstacle(vertices: Vector2[]): number {
    if (vertices.size() < 2) {
      return -1;
    }

    const obstacleNo = this.obstacles.size();

    for (let i = 0, len = vertices.size(); i < len; ++i) {
      const obstacle = new Obstacle();
      obstacle.point = vertices[i];
      if (i !==0) {
        obstacle.previous = this.obstacles[this.obstacles.size() - 1];
        obstacle.previous.next = obstacle;
      }
      if (i ===vertices.size() - 1) {
        obstacle.next = this.obstacles[obstacleNo];
        obstacle.next.previous = obstacle;
      }
      obstacle.unitDir = RVOMath.normalize(vertices[(i ===vertices.size() - 1 ? 0 : i + 1)].sub(vertices[i]))

      if (vertices.size() ===2) {
        obstacle.isConvex = true;
      } else {
        obstacle.isConvex = (
          RVOMath.leftOf(vertices[(i ===0 ? vertices.size() - 1 : i - 1)],
            vertices[i], vertices[(i ===vertices.size() - 1 ? 0 : i + 1)]) >= 0);
      }

      obstacle.id = this.obstacles.size();

      this.obstacles.push(obstacle);
    }

    return obstacleNo;
  }

  /**
   * 处理障碍物
   * 构建障碍物的空间索引结构
   */
  processObstacles() {
    this.kdTree.buildObstacleTree();
  }

  /**
   * 查询两点间的可见性
   * @param point1 - 起点
   * @param point2 - 终点
   * @param radius - 查询半径
   * @returns 两点间是否可见（无障碍物阻挡）
   */
  queryVisibility(point1: Vector2, point2: Vector2, radius: number): boolean {
    return this.kdTree.queryVisibility(point1, point2, radius);
  }

  /**
   * 获取所有障碍物
   * @returns 障碍物数组
   */
  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

}
