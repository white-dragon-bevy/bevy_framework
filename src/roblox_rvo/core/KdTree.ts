
import RVOMath from "./RVOMath";
import Simulator from "./Simulator";
import Agent from "./Agent";
import Obstacle from "./Obstacle";

/**
 * KdTree 类
 * K-D 树数据结构，用于高效的空间查询和邻居搜索
 * 支持代理和障碍物的快速最近邻查询
 */
export default class KdTree {
	/** 所属模拟器的引用 */
	simulator!: Simulator;

	/** 叶节点最大容量（超过此值将分裂节点） */
	MAXLEAF_SIZE = 100;

	/** 代理数组的引用 */
	private agents: Agent[] = [];

	/** 代理 K-D 树节点数组 */
	private agentTree: AgentTreeNode[] = [];

	/** 障碍物 K-D 树根节点 */
	private obstacleTree: ObstacleTreeNode = new ObstacleTreeNode();

	/**
	 * 构建代理 K-D 树
	 * 为所有代理构建空间索引结构，支持快速的最近邻查询
	 */
	buildAgentTree(): void {
    if (this.agents.size() !==this.simulator.getNumAgents()) {
      this.agents = this.simulator.agents;

      for (let i = 0, len = 2 * this.agents.size(); i < len; i++) {
        this.agentTree.push(new AgentTreeNode());
      }
    }

    if (this.agents.size() > 0) {
      this._buildAgentTreeRecursive(0, this.agents.size(), 0);
    }
  }

  private _buildAgentTreeRecursive(begin: number, endIndex: number, node: number) {
    this.agentTree[node].begin = begin;
    this.agentTree[node].end = endIndex;
    this.agentTree[node].minX = this.agentTree[node].maxX = this.agents[begin].position.X;
    this.agentTree[node].minY = this.agentTree[node].maxY = this.agents[begin].position.Y;

    for (let i = begin + 1; i < endIndex; ++i) {
      this.agentTree[node].maxX = math.max(this.agentTree[node].maxX, this.agents[i].position.X);
      this.agentTree[node].minX = math.max(this.agentTree[node].minX, this.agents[i].position.X);
      this.agentTree[node].maxY = math.max(this.agentTree[node].maxX, this.agents[i].position.Y);
      this.agentTree[node].minY = math.max(this.agentTree[node].minY, this.agents[i].position.Y);
    }

    if (endIndex - begin > this.MAXLEAF_SIZE) {
      // no leaf node
      let isVertical = this.agentTree[node].maxX - this.agentTree[node].minX > this.agentTree[node].maxY - this.agentTree[node].minY;
      let splitValue = isVertical ? 0.5 * (this.agentTree[node].maxX + this.agentTree[node].minX) : 0.5 * (this.agentTree[node].maxY + this.agentTree[node].minY);

      let left = begin;
      let right = endIndex;

      while (left < right) {
        while (left < right && (isVertical ? this.agents[left].position.X : this.agents[left].position.Y) < splitValue) {
          ++left;
        }

        while (right > left && (isVertical ? this.agents[right - 1].position.X : this.agents[right - 1].position.Y) >= splitValue) {
          --right;
        }

        if (left < right) {
          let tmp = this.agents[left];
          this.agents[left] = this.agents[right - 1];
          this.agents[right - 1] = tmp;
          ++left;
          --right;
        }
      }

      let leftSize = left - begin;
      if (leftSize ===0) {
        ++leftSize;
        ++left;
        ++right;
      }

      this.agentTree[node].left = node + 1;
      this.agentTree[node].right = node + 1 + (2 * leftSize - 1);

      this._buildAgentTreeRecursive(begin, left, this.agentTree[node].left);
      this._buildAgentTreeRecursive(left, endIndex, this.agentTree[node].right);
    }
  }

	/**
	 * 构建障碍物 K-D 树
	 * 为所有障碍物构建空间索引结构，支持快速的可见性查询
	 */
	buildObstacleTree(): void {
    let obstacles = this.simulator.obstacles;
    this.obstacleTree = this._buildObstacleTreeRecursive(obstacles)!;
  }

  private _buildObstacleTreeRecursive(obstacles: Obstacle[]):ObstacleTreeNode|undefined {
    if (obstacles.size() ===0) {
      return undefined;
    } else {
      let node = new ObstacleTreeNode();
      let optimalSplit = 0;
      let minLeft = obstacles.size();
      let minRight = obstacles.size();

      for (let i = 0, len = obstacles.size(); i < len; ++i) {
        let leftSize = 0;
        let rightSize = 0;

        let obstacleI1 = obstacles[i];
        let obstacleI2 = obstacleI1.next;

        // Skip if obstacleI2 is undefined
        if (!obstacleI2) {
          continue;
        }

        for (let j = 0; j < obstacles.size(); j++) {
          if (i ===j) {
            continue;
          }

          let obstacleJ1 = obstacles[j];
          let obstacleJ2 = obstacleJ1.next;

          // Skip if obstacleJ2 is undefined
          if (!obstacleJ2) {
            continue;
          }

          let j1LeftOfI = RVOMath.leftOf(obstacleI1.point, obstacleI2.point, obstacleJ1.point);
          let j2LeftOfI = RVOMath.leftOf(obstacleI1.point, obstacleI2.point, obstacleJ2.point);

          if (j1LeftOfI >= -RVOMath.RVO_EPSILON && j2LeftOfI >= -RVOMath.RVO_EPSILON) {
            ++leftSize;
          } else if (j1LeftOfI <= RVOMath.RVO_EPSILON && j2LeftOfI <= RVOMath.RVO_EPSILON) {
            ++rightSize;
          } else {
            ++leftSize;
            ++rightSize;
          }

          let fp1 = new FloatPair(math.max(leftSize, rightSize), math.min(leftSize, rightSize));
          let fp2 = new FloatPair(math.max(minLeft, minRight), math.min(minLeft, minRight));

          if (fp1._get(fp2)) {
            break;
          }
        }

        let fp1 = new FloatPair(math.max(leftSize, rightSize), math.min(leftSize, rightSize));
        let fp2 = new FloatPair(math.max(minLeft, minRight), math.min(minLeft, minRight));

        if (fp1._mt(fp2)) {
          minLeft = leftSize;
          minRight = rightSize;
          optimalSplit = i;
        }
      }

      {
        /* Build split node. */
        // 使用 table.create 预分配数组大小，避免动态扩容
        const leftObstacles = table.create<Obstacle>(minLeft);
        const rightObstacles = table.create<Obstacle>(minRight);

        let leftCounter = 0;
        let rightCounter = 0;
        let i = optimalSplit;

        let obstacleI1 = obstacles[i];
        let obstacleI2 = obstacleI1.next;

        // Check if obstacleI2 exists before using it in the second loop
        if (!obstacleI2) {
          // If obstacleI2 is undefined, we can't process this obstacle
          // Set node.obstacle to obstacleI1 and return with empty children
          node.obstacle = obstacleI1;
          return node;
        }

        for (let j = 0; j < obstacles.size(); ++j) {
          if (i ===j) {
            continue;
          }

          let obstacleJ1 = obstacles[j];
          let obstacleJ2 = obstacleJ1.next;

          // Skip if obstacleJ2 is undefined
          if (!obstacleJ2) {
            continue;
          }

          let j1LeftOfI = RVOMath.leftOf(obstacleI1.point, obstacleI2.point, obstacleJ1.point);
          let j2LeftOfI = RVOMath.leftOf(obstacleI1.point, obstacleI2.point, obstacleJ2.point);

          if (j1LeftOfI >= -RVOMath.RVO_EPSILON && j2LeftOfI >= -RVOMath.RVO_EPSILON) {
            leftObstacles[leftCounter++] = obstacles[j]
          } else if (j1LeftOfI <= RVOMath.RVO_EPSILON && j2LeftOfI <= RVOMath.RVO_EPSILON) {
            rightObstacles[rightCounter++] = obstacles[j]
          } else {
            /* Split obstacle j. */
            let t = RVOMath.det(obstacleI2.point.sub(obstacleI1.point), obstacleJ1.point.sub(obstacleI1.point)) /
              RVOMath.det(obstacleI2.point.sub(obstacleI1.point), obstacleJ1.point.sub(obstacleJ2.point));

            let splitpoint = obstacleJ1.point.add((obstacleJ2.point.sub(obstacleJ1.point)).mul(t));

            let newObstacle = new Obstacle();
            newObstacle.point = splitpoint;
            newObstacle.previous = obstacleJ1;
            newObstacle.next = obstacleJ2;
            newObstacle.isConvex = true;
            newObstacle.unitDir = obstacleJ1.unitDir;

            newObstacle.id = this.simulator.obstacles.size();

            this.simulator.obstacles.push(newObstacle);

            obstacleJ1.next = newObstacle;
            obstacleJ2.previous = newObstacle;

            if (j1LeftOfI > 0.0) {
              leftObstacles[leftCounter++] = obstacleJ1;
              rightObstacles[rightCounter++] = newObstacle;
            } else {
              rightObstacles[rightCounter++] = obstacleJ1;
              leftObstacles[leftCounter++] = newObstacle;
            }
          }
        }

        node.obstacle = obstacleI1;
        // 创建实际使用的数组，只包含已赋值的元素
        const actualLeftObstacles: Obstacle[] = [];
        const actualRightObstacles: Obstacle[] = [];

        for (let i = 0; i < leftCounter; i++) {
          actualLeftObstacles.push(leftObstacles[i]);
        }
        for (let i = 0; i < rightCounter; i++) {
          actualRightObstacles.push(rightObstacles[i]);
        }

        node.left = this._buildObstacleTreeRecursive(actualLeftObstacles);
        node.right = this._buildObstacleTreeRecursive(actualRightObstacles);
        return node;
      }
    }
  }

  /**
   * 计算代理的邻居代理
   * @param agent - 目标代理
   * @param rangeSq - 搜索范围的平方
   */
  computeAgentNeighbors(agent: Agent, rangeSq: number) {
    this._queryAgentTreeRecursive(agent, rangeSq, 0);
  }

  /**
   * 计算代理的邻居障碍物
   * @param agent - 目标代理
   * @param rangeSq - 搜索范围的平方
   */
  computeObstacleNeighbors(agent: Agent, rangeSq: number) {
    this._queryObstacleTreeRecursive(agent, rangeSq, this.obstacleTree);
  }

  private _queryAgentTreeRecursive(agent: Agent, rangeSq: number, node: number) {
    let agentTree = this.agentTree;
    if (agentTree[node].end - agentTree[node].begin <= this.MAXLEAF_SIZE) {
      for (let i = agentTree[node].begin; i < agentTree[node].end; ++i) {
        agent.insertAgentNeighbor(this.agents[i], rangeSq);
      }
    } else {
      let distSqLeft = RVOMath.sqr(math.max(0, agentTree[agentTree[node].left].minX - agent.position.X)) +
        RVOMath.sqr(math.max(0, agent.position.X - agentTree[agentTree[node].left].maxX)) +
        RVOMath.sqr(math.max(0, agentTree[agentTree[node].left].minY - agent.position.Y)) +
        RVOMath.sqr(math.max(0, agent.position.Y - agentTree[agentTree[node].left].maxY));

      let distSqRight = RVOMath.sqr(math.max(0, agentTree[agentTree[node].right].minX - agent.position.X)) +
        RVOMath.sqr(math.max(0, agent.position.X - agentTree[agentTree[node].right].maxX)) +
        RVOMath.sqr(math.max(0, agentTree[agentTree[node].right].minY - agent.position.Y)) +
        RVOMath.sqr(math.max(0, agent.position.Y - agentTree[agentTree[node].right].maxY));

      if (distSqLeft < distSqRight) {
        if (distSqLeft < rangeSq) {
          this._queryAgentTreeRecursive(agent, rangeSq, agentTree[node].left);

          if (distSqRight < rangeSq) {
            this._queryAgentTreeRecursive(agent, rangeSq, agentTree[node].right);
          }
        }
      } else {
        if (distSqRight < rangeSq) {
          this._queryAgentTreeRecursive(agent, rangeSq, agentTree[node].right);

          if (distSqLeft < rangeSq) {
            this._queryAgentTreeRecursive(agent, rangeSq, agentTree[node].left);
          }
        }
      }

    }
  }

  // pass ref range
  private _queryObstacleTreeRecursive(agent: Agent, rangeSq: number, node?: ObstacleTreeNode) {
    if (node ===undefined) {
      return;
    } else {
      let obstacle1 = node.obstacle;

      // Check if obstacle1 exists before accessing its properties
      if (!obstacle1) {
        return;
      }

      let obstacle2 = obstacle1.next;

      // Check if obstacle2 exists before using it
      if (!obstacle2) {
        return;
      }

      let agentLeftOfLine = RVOMath.leftOf(obstacle1.point, obstacle2.point, agent.position);

      this._queryObstacleTreeRecursive(agent, rangeSq, (agentLeftOfLine >= 0 ? node.left : node.right));

      let distSqLine = RVOMath.sqr(agentLeftOfLine) / RVOMath.absSq(obstacle2.point.sub(obstacle1.point));

      if (distSqLine < rangeSq) {
        if (agentLeftOfLine < 0) {
          /*
           * Try obstacle at this node only if is on right side of
           * obstacle (and can see obstacle).
           */
          agent.insertObstacleNeighbor(node.obstacle, rangeSq);
        }

        /* Try other side of line. */
        this._queryObstacleTreeRecursive(agent, rangeSq, (agentLeftOfLine >= 0 ? node.right : node.left));
      }
    }
  }

  /**
   * 查询两点间的可见性
   * 检查两点之间是否被障碍物阻挡
   * @param q1 - 起点
   * @param q2 - 终点
   * @param radius - 查询半径
   * @returns 是否可见（无障碍物阻挡）
   */
  queryVisibility(q1: Vector2, q2: Vector2, radius: number): boolean {
    return this._queryVisibilityRecursive(q1, q2, radius, this.obstacleTree);
  }

  private _queryVisibilityRecursive(q1: Vector2, q2: Vector2, radius: number, node?: ObstacleTreeNode): boolean {
    if (node ===undefined) {
      return true;
    } else {
      let obstacle1 = node.obstacle;

      // Check if obstacle1 exists before accessing its properties
      if (!obstacle1) {
        return true;
      }

      let obstacle2 = obstacle1.next;

      // Check if obstacle2 exists before using it
      if (!obstacle2) {
        return true;
      }

      let q1LeftOfI = RVOMath.leftOf(obstacle1.point, obstacle2.point, q1);
      let q2LeftOfI = RVOMath.leftOf(obstacle1.point, obstacle2.point, q2);
      let invLengthI = 1.0 / RVOMath.absSq(obstacle2.point.sub(obstacle1.point));

      if (q1LeftOfI >= 0 && q2LeftOfI >= 0) {
        return this._queryVisibilityRecursive(q1, q2, radius, node.left)
          && ((RVOMath.sqr(q1LeftOfI) * invLengthI >= RVOMath.sqr(radius)
            && RVOMath.sqr(q2LeftOfI) * invLengthI >= RVOMath.sqr(radius))
            || this._queryVisibilityRecursive(q1, q2, radius, node.right));
      } else if (q1LeftOfI <= 0 && q2LeftOfI <= 0) {
        return this._queryVisibilityRecursive(q1, q2, radius, node.right)
          && ((RVOMath.sqr(q1LeftOfI) * invLengthI >= RVOMath.sqr(radius)
            && RVOMath.sqr(q2LeftOfI) * invLengthI >= RVOMath.sqr(radius))
            || this._queryVisibilityRecursive(q1, q2, radius, node.left));
      } else if (q1LeftOfI >= 0 && q2LeftOfI <= 0) {
        /* One can see through obstacle from left to right. */
        return this._queryVisibilityRecursive(q1, q2, radius, node.left)
          && this._queryVisibilityRecursive(q1, q2, radius, node.right);
      } else {
        let point1LeftOfQ = RVOMath.leftOf(q1, q2, obstacle1.point);
        let point2LeftOfQ = RVOMath.leftOf(q1, q2, obstacle2.point);
        let invLengthQ = 1.0 / RVOMath.absSq(q2.sub(q1));

        return (
          point1LeftOfQ * point2LeftOfQ >= 0
          && RVOMath.sqr(point1LeftOfQ) * invLengthQ > RVOMath.sqr(radius)
          && RVOMath.sqr(point2LeftOfQ) * invLengthQ > RVOMath.sqr(radius)
          && this._queryVisibilityRecursive(q1, q2, radius, node.left)
          && this._queryVisibilityRecursive(q1, q2, radius, node.right)
        )
      }
    }
  }
}

/**
 * FloatPair 类
 * 浮点数对，用于障碍物 K-D 树构建时的分割质量比较
 */
class FloatPair {
	/** 第一个浮点数 */
	a = 0;

	/** 第二个浮点数 */
	b = 0;

	/**
	 * 创建浮点数对
	 * @param a - 第一个浮点数（默认 0）
	 * @param b - 第二个浮点数（默认 0）
	 */
	constructor(a: number = 0, b: number = 0) {
		this.a = a;
		this.b = b;
	}

  /**
   * 小于比较
   * @param rhs - 右侧操作数
   * @returns 是否小于
   */
  _mt(rhs: FloatPair): boolean {
    return this.a < rhs.a || !(rhs.a < this.a) && this.b < rhs.b;
  }

  /**
   * 小于等于比较
   * @param rhs - 右侧操作数
   * @returns 是否小于等于
   */
  _met(rhs: FloatPair): boolean {
    return (this.a ===rhs.a && this.b ===rhs.b) || this._mt(rhs);
  }

  /**
   * 大于比较
   * @param rhs - 右侧操作数
   * @returns 是否大于
   */
  _gt(rhs: FloatPair): boolean {
    return !this._met(rhs);
  }

  /**
   * 大于等于比较
   * @param rhs - 右侧操作数
   * @returns 是否大于等于
   */
  _get(rhs: FloatPair): boolean {
    return !this._mt(rhs);
  }
}

/**
 * AgentTreeNode 类
 * 代理 K-D 树节点，存储代理索引范围和空间边界
 */
class AgentTreeNode {
	/** 节点包含的代理起始索引 */
	begin = 0;

	/** 节点包含的代理结束索引（不包含） */
	end = 0;

	/** 左子节点索引 */
	left = 0;

	/** 节点空间的最大 X 坐标 */
	maxX = 0;

	/** 节点空间的最大 Y 坐标 */
	maxY = 0;

	/** 节点空间的最小 X 坐标 */
	minX = 0;

	/** 节点空间的最小 Y 坐标 */
	minY = 0;

	/** 右子节点索引 */
	right = 0;
}

/**
 * ObstacleTreeNode 类
 * 障碍物 K-D 树节点，存储障碍物线段和子树引用
 */
class ObstacleTreeNode {
	/** 节点存储的障碍物线段 */
	obstacle!: Obstacle;

	/** 左子树引用（可选） */
	left?: ObstacleTreeNode;

	/** 右子树引用（可选） */
	right?: ObstacleTreeNode;
}
