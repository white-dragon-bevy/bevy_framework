/**
 * KdTree - k维树空间数据结构
 * 用于高效查询代理和障碍物的邻居
 */

import { Agent } from "./agent";
import { Obstacle } from "./obstacle";
import { RVOMath } from "./rvo-math";
import { Simulator } from "./simulator";
import { Vector2D } from "./vector2d";

/**
 * 代理树节点
 */
class AgentTreeNode {
	/**
	 * 节点包围盒最大坐标
	 */
	public maxCoord: Vector2D = Vector2D.ZERO;

	/**
	 * 节点包围盒最小坐标
	 */
	public minCoord: Vector2D = Vector2D.ZERO;

	/**
	 * 节点结束索引
	 */
	public endIndex: number = 0;

	/**
	 * 节点开始索引
	 */
	public begin: number = 0;

	/**
	 * 左子节点
	 */
	public left?: AgentTreeNode;

	/**
	 * 右子节点
	 */
	public right?: AgentTreeNode;
}

/**
 * 障碍物树节点
 */
class ObstacleTreeNode {
	/**
	 * 障碍物引用
	 */
	public obstacle?: Obstacle;

	/**
	 * 左子节点
	 */
	public left?: ObstacleTreeNode;

	/**
	 * 右子节点
	 */
	public right?: ObstacleTreeNode;
}

/**
 * k维树类
 * 用于空间索引和邻居查询
 */
export class KdTree {
	/**
	 * 叶节点最大代理数
	 */
	public MAXLEAF_SIZE: number = 10;

	/**
	 * 代理数组
	 */
	private agents: Array<Agent> = [];

	/**
	 * 代理树根节点
	 */
	private agentTree?: AgentTreeNode;

	/**
	 * 障碍物树根节点
	 */
	private obstacleTree?: ObstacleTreeNode;

	/**
	 * 模拟器引用
	 */
	public simulator?: Simulator;

	/**
	 * 构建代理树
	 * 为所有代理构建k维树索引
	 */
	public buildAgentTree(): void {
		if (!this.simulator) return;

		this.agents = [];
		for (let index = 0; index < this.simulator.agents.size(); index++) {
			this.agents.push(this.simulator.agents[index]);
		}

		if (this.agents.size() > 0) {
			this.agentTree = this.buildAgentTreeRecursive(0, this.agents.size());
		}
	}

	/**
	 * 递归构建代理树
	 * @param begin - 开始索引
	 * @param endIdx - 结束索引
	 * @returns 树节点
	 */
	private buildAgentTreeRecursive(begin: number, endIdx: number): AgentTreeNode {
		const node = new AgentTreeNode();
		node.begin = begin;
		node.endIndex = endIdx;

		// 计算包围盒
		const minX = math.huge;
		const maxX = -math.huge;
		const minY = math.huge;
		const maxY = -math.huge;

		for (let index = begin; index < endIdx; index++) {
			const position = this.agents[index].position;
			const x = position.x;
			const y = position.y;

			if (x < minX) (minX as number) = x;
			if (x > maxX) (maxX as number) = x;
			if (y < minY) (minY as number) = y;
			if (y > maxY) (maxY as number) = y;
		}

		node.minCoord = new Vector2D(minX as number, minY as number);
		node.maxCoord = new Vector2D(maxX as number, maxY as number);

		// 如果节点包含的代理数小于最大叶节点大小，则为叶节点
		if (endIdx - begin <= this.MAXLEAF_SIZE) {
			return node;
		}

		// 选择分割轴（最长的维度）
		const isVertical = (maxX as number) - (minX as number) > (maxY as number) - (minY as number);
		const splitValue = isVertical
			? 0.5 * ((minX as number) + (maxX as number))
			: 0.5 * ((minY as number) + (maxY as number));

		// 分割代理
		let leftIndex = begin;
		let rightIndex = endIdx;

		while (leftIndex < rightIndex) {
			const agentPosition = this.agents[leftIndex].position;
			const value = isVertical ? agentPosition.x : agentPosition.y;

			if (value < splitValue) {
				leftIndex++;
			} else {
				rightIndex--;
				const temp = this.agents[leftIndex];
				this.agents[leftIndex] = this.agents[rightIndex];
				this.agents[rightIndex] = temp;
			}
		}

		const splitIndex = leftIndex;

		// 递归构建子树
		if (splitIndex > begin) {
			node.left = this.buildAgentTreeRecursive(begin, splitIndex);
		}
		if (endIdx > splitIndex) {
			node.right = this.buildAgentTreeRecursive(splitIndex, endIdx);
		}

		return node;
	}

	/**
	 * 构建障碍物树
	 * 为所有障碍物构建k维树索引
	 */
	public buildObstacleTree(): void {
		if (!this.simulator) return;

		const obstacles: Array<Obstacle> = [];
		for (let index = 0; index < this.simulator.obstacles.size(); index++) {
			obstacles.push(this.simulator.obstacles[index]);
		}

		if (obstacles.size() > 0) {
			this.obstacleTree = this.buildObstacleTreeRecursive(obstacles);
		}
	}

	/**
	 * 递归构建障碍物树
	 * @param obstacles - 障碍物数组
	 * @returns 树节点
	 */
	private buildObstacleTreeRecursive(obstacles: Array<Obstacle>): ObstacleTreeNode {
		if (obstacles.size() === 0) {
			return new ObstacleTreeNode();
		}

		const node = new ObstacleTreeNode();

		// 简化实现：选择中间的障碍物作为节点
		const optimalSplit = math.floor(obstacles.size() / 2);
		node.obstacle = obstacles[optimalSplit];

		// 分割障碍物
		const leftObstacles: Array<Obstacle> = [];
		const rightObstacles: Array<Obstacle> = [];

		for (let index = 0; index < obstacles.size(); index++) {
			if (index < optimalSplit) {
				leftObstacles.push(obstacles[index]);
			} else if (index > optimalSplit) {
				rightObstacles.push(obstacles[index]);
			}
		}

		// 递归构建子树
		if (leftObstacles.size() > 0) {
			node.left = this.buildObstacleTreeRecursive(leftObstacles);
		}
		if (rightObstacles.size() > 0) {
			node.right = this.buildObstacleTreeRecursive(rightObstacles);
		}

		return node;
	}

	/**
	 * 计算代理邻居
	 * @param agent - 查询代理
	 * @param rangeSq - 搜索范围的平方
	 */
	public computeAgentNeighbors(agent: Agent, rangeSq: number): void {
		if (this.agentTree) {
			this.queryAgentTreeRecursive(agent, rangeSq, this.agentTree);
		}
	}

	/**
	 * 递归查询代理树
	 * @param agent - 查询代理
	 * @param rangeSq - 搜索范围的平方
	 * @param node - 当前节点
	 */
	private queryAgentTreeRecursive(agent: Agent, rangeSq: number, node: AgentTreeNode): void {
		// 检查节点是否与搜索范围相交
		if (node.maxCoord.x < agent.position.x - math.sqrt(rangeSq) ||
			node.minCoord.x > agent.position.x + math.sqrt(rangeSq) ||
			node.maxCoord.y < agent.position.y - math.sqrt(rangeSq) ||
			node.minCoord.y > agent.position.y + math.sqrt(rangeSq)) {
			return;
		}

		// 如果是叶节点，检查所有代理
		if (!node.left && !node.right) {
			for (let index = node.begin; index < node.endIndex; index++) {
				const otherAgent = this.agents[index];
				if (otherAgent !== agent) {
					agent.insertAgentNeighbor(otherAgent, rangeSq);
				}
			}
		} else {
			// 递归搜索子节点
			if (node.left) {
				this.queryAgentTreeRecursive(agent, rangeSq, node.left);
			}
			if (node.right) {
				this.queryAgentTreeRecursive(agent, rangeSq, node.right);
			}
		}
	}

	/**
	 * 计算障碍物邻居
	 * @param agent - 查询代理
	 * @param rangeSq - 搜索范围的平方
	 */
	public computeObstacleNeighbors(agent: Agent, rangeSq: number): void {
		if (this.obstacleTree) {
			this.queryObstacleTreeRecursive(agent, rangeSq, this.obstacleTree);
		}
	}

	/**
	 * 递归查询障碍物树
	 * @param agent - 查询代理
	 * @param rangeSq - 搜索范围的平方
	 * @param node - 当前节点
	 */
	private queryObstacleTreeRecursive(agent: Agent, rangeSq: number, node: ObstacleTreeNode): void {
		if (node.obstacle) {
			agent.insertObstacleNeighbor(node.obstacle, rangeSq);
		}

		// 递归搜索子节点
		if (node.left) {
			this.queryObstacleTreeRecursive(agent, rangeSq, node.left);
		}
		if (node.right) {
			this.queryObstacleTreeRecursive(agent, rangeSq, node.right);
		}
	}

	/**
	 * 查询可见性
	 * @param point1 - 起点
	 * @param point2 - 终点
	 * @param radius - 代理半径
	 * @returns 是否可见
	 */
	public queryVisibility(point1: Vector2D, point2: Vector2D, radius: number): boolean {
		return this.queryVisibilityRecursive(point1, point2, radius, this.obstacleTree);
	}

	/**
	 * 递归查询可见性
	 * @param point1 - 起点
	 * @param point2 - 终点
	 * @param radius - 代理半径
	 * @param node - 当前节点
	 * @returns 是否可见
	 */
	private queryVisibilityRecursive(
		point1: Vector2D,
		point2: Vector2D,
		radius: number,
		node?: ObstacleTreeNode,
	): boolean {
		if (!node || !node.obstacle) {
			return true;
		}

		// 检查是否与障碍物相交
		const obstacle1 = node.obstacle;
		const obstacle2 = obstacle1.next;

		if (obstacle2) {
			const distSq = RVOMath.distSqPointLineSegment(obstacle1.point, obstacle2.point, point1);
			if (distSq < RVOMath.sqr(radius)) {
				return false;
			}
		}

		// 递归检查子节点
		if (node.left && !this.queryVisibilityRecursive(point1, point2, radius, node.left)) {
			return false;
		}
		if (node.right && !this.queryVisibilityRecursive(point1, point2, radius, node.right)) {
			return false;
		}

		return true;
	}
}