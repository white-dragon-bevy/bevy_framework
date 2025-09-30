import RVOMath from "./RVOMath";
import Simulator from "./Simulator";
import Obstacle from "./Obstacle";
import Line from "./Line";

/**
 * Agent 类
 * 表示 RVO 算法中的移动代理，处理碰撞避免计算
 * 每个代理维护自己的邻居列表、ORCA 约束线和运动参数
 */
export default class Agent {
	/** 代理唯一标识符 */
	public id = 0;

	/** 所属模拟器的引用 */
	simulator!: Simulator;

	/** 邻近代理列表（按距离排序的键值对） */
	agentNeighbors: KeyValuePair<number, Agent>[] = [];

	/** 最大邻居数量 */
	maxNeighbors = 0;

	/** 最大移动速度 */
	maxSpeed = 0.0;

	/** 邻居检测距离 */
	neighborDist = 0.0;

	/** 计算得出的新速度（内部使用） */
	private _newVelocity!: Vector2;

	/** 邻近障碍物列表（按距离排序的键值对） */
	obstaclNeighbors: KeyValuePair<number, Obstacle>[] = [];

	/** ORCA 约束线数组 */
	orcaLines: Line[] = [];

	/** 当前位置 */
	position!: Vector2;

	/** 首选速度（期望的移动方向和速度） */
	prefVelocity!: Vector2;

	/** 代理碰撞半径 */
	radius = 0.0;

	/** 时间视界（用于预测与其他代理的碰撞） */
	timeHorizon = 0.0;

	/** 障碍物时间视界（用于预测与障碍物的碰撞） */
	timeHorizonObst = 0.0;

	/** 当前速度 */
	velocity!: Vector2;

	/**
	 * 计算代理的邻居
	 * 查找附近的障碍物和其他代理，为速度计算做准备
	 */
	computeNeighbors(): void {
    this.obstaclNeighbors = [];
    let rangeSq = RVOMath.sqr(this.timeHorizonObst * this.maxSpeed + this.radius);
    this.simulator.kdTree.computeObstacleNeighbors(this, rangeSq);

    this.agentNeighbors = [];
    if (this.maxNeighbors > 0) {
      rangeSq = RVOMath.sqr(this.neighborDist);
      this.simulator.kdTree.computeAgentNeighbors(this, rangeSq);
    }
  }

	/**
	 * 计算新的速度
	 * 使用 ORCA (Optimal Reciprocal Collision Avoidance) 算法计算避免碰撞的最佳速度
	 * 构建 ORCA 约束线并通过线性规划求解最优速度
	 */
	computeNewVelocity(): void {
    this.orcaLines = [];
    let orcaLines = this.orcaLines;
    const invTimeHorizonObst = 1.0 / this.timeHorizonObst;

    /* Create obstacle ORCA lines. */
    for (let i = 0; i < this.obstaclNeighbors.size(); ++i) {
      let obstacle1: Obstacle = this.obstaclNeighbors[i].value;
      let obstacle2 = obstacle1.next;

      let relativePosition1 = obstacle1.point.sub(this.position)
      let relativePosition2 = obstacle2.point.sub(this.position)

      /*
       * Check if velocity obstacle of obstacle is already taken care of by
       * previously constructed obstacle ORCA lines.
       */
      let alreadyCovered = false

      for (let j = 0; j < orcaLines.size(); ++j) {
        if (RVOMath.det(relativePosition1.mul(invTimeHorizonObst).sub(orcaLines[j].point), orcaLines[j].direction) - invTimeHorizonObst * this.radius >= -RVOMath.RVO_EPSILON && RVOMath.det(relativePosition2.mul(invTimeHorizonObst).sub(orcaLines[j].point), orcaLines[j].direction) - invTimeHorizonObst * this.radius >= -RVOMath.RVO_EPSILON) {
          alreadyCovered = true
          break
        }
      }

      if (alreadyCovered) {
        continue
      }

      /* Not yet covered. Check for collisions. */

      let distSq1 = RVOMath.absSq(relativePosition1)
      let distSq2 = RVOMath.absSq(relativePosition2)

      let radiusSq = RVOMath.sqr(this.radius)

      let obstacleVector = obstacle2.point.sub(obstacle1.point)
      let s = relativePosition1.mul(-1).Dot(obstacleVector) / RVOMath.absSq(obstacleVector); //  (-relativePosition1 * obstacleVector) / RVOMath.absSq(obstacleVector)
      let distSqLine = RVOMath.absSq(relativePosition1.mul(-1).sub(obstacleVector.mul(s))); // RVOMath.absSq(-relativePosition1 - s * obstacleVector)

      let line = new Line();

      if (s < 0 && distSq1 <= radiusSq) {
        /* Collision with left vertex. Ignore if non-convex. */
        if (obstacle1.isConvex) {
          line.point = new Vector2(0, 0)
          line.direction = RVOMath.normalize(new Vector2(-relativePosition1.Y, relativePosition1.X))
          orcaLines.push(line)
        }
        continue
      } else if (s > 1 && distSq2 <= radiusSq) {
        /* Collision with right vertex. Ignore if non-convex
         * or if it will be taken care of by neighoring obstace */
        if (obstacle2.isConvex && RVOMath.det(relativePosition2, obstacle2.unitDir) >= 0) {
          line.point = new Vector2(0, 0)
          line.direction = RVOMath.normalize(new Vector2(-relativePosition2.Y, relativePosition2.X))
          orcaLines.push(line)
        }
        continue
      } else if (s >= 0 && s < 1 && distSqLine <= radiusSq) {
        /* Collision with obstacle segment. */
        line.point = new Vector2(0, 0)
        line.direction = obstacle1.unitDir.mul(-1)
        orcaLines.push(line)
        continue
      }

      /*
       * No collision.
       * Compute legs. When obliquely viewed, both legs can come from a single
       * vertex. Legs extend cut-off line when nonconvex vertex.
       */

      let leftLegDirection, rightLegDirection

      if (s < 0 && distSqLine <= radiusSq) {
        /*
         * Obstacle viewed obliquely so that left vertex
         * defines velocity obstacle.
         */
        if (!obstacle1.isConvex) {
          /* Ignore obstacle. */
          continue
        }

        obstacle2 = obstacle1

        let leg1 = math.sqrt(distSq1 - radiusSq)
        leftLegDirection = (new Vector2(relativePosition1.X * leg1 - relativePosition1.Y * this.radius, relativePosition1.X * this.radius + relativePosition1.Y * leg1)).mul(1 / distSq1)
        rightLegDirection = (new Vector2(relativePosition1.X * leg1 + relativePosition1.Y * this.radius, -relativePosition1.X * this.radius + relativePosition1.Y * leg1)).mul(1 / distSq1)
      } else if (s > 1 && distSqLine <= radiusSq) {
        /*
         * Obstacle viewed obliquely so that
         * right vertex defines velocity obstacle.
         */
        if (!obstacle2.isConvex) {
          /* Ignore obstacle. */
          continue
        }

        obstacle1 = obstacle2

        let leg2 = math.sqrt(distSq2 - radiusSq)
        leftLegDirection = (new Vector2(relativePosition2.X * leg2 - relativePosition2.Y * this.radius, relativePosition2.X * this.radius + relativePosition2.Y * leg2)).mul(1 / distSq2)
        rightLegDirection = (new Vector2(relativePosition2.X * leg2 + relativePosition2.Y * this.radius, -relativePosition2.X * this.radius + relativePosition2.Y * leg2)).mul(1 / distSq2)
      } else {
        /* Usual situation. */
        if (obstacle1.isConvex) {
          let leg1 = math.sqrt(distSq1 - radiusSq)
          leftLegDirection = (new Vector2(relativePosition1.X * leg1 - relativePosition1.Y * this.radius, relativePosition1.X * this.radius + relativePosition1.Y * leg1)).mul(1 / distSq1)
        } else {
          /* Left vertex non-convex; left leg extends cut-off line. */
          leftLegDirection = obstacle1.unitDir.mul(-1)
        }

        if (obstacle2.isConvex) {
          let leg2 = math.sqrt(distSq2 - radiusSq)
          rightLegDirection = (new Vector2(relativePosition2.X * leg2 + relativePosition2.Y * this.radius, -relativePosition2.X * this.radius + relativePosition2.Y * leg2)).mul(1 / distSq2)
        } else {
          /* Right vertex non-convex; right leg extends cut-off line. */
          rightLegDirection = obstacle1.unitDir
        }
      }

      /*
       * Legs can never point into neighboring edge when convex vertex,
       * take cutoff-line of neighboring edge instead. If velocity projected on
       * "foreign" leg, no constraint is added.
       */

      let leftNeighbor = obstacle1.previous;

      let isLeftLegForeign = false;
      let isRightLegForeign = false;

      if (obstacle1.isConvex && RVOMath.det(leftLegDirection, leftNeighbor.unitDir.mul(-1)) >= 0.0) {
        /* Left leg points into obstacle. */
        leftLegDirection = leftNeighbor.unitDir.mul(-1)
        isLeftLegForeign = true
      }

      if (obstacle2.isConvex && RVOMath.det(rightLegDirection, obstacle2.unitDir) <= 0.0) {
        /* Right leg points into obstacle. */
        rightLegDirection = obstacle2.unitDir
        isRightLegForeign = true
      }

      /* Compute cut-off centers. */
      let leftCutoff = obstacle1.point.sub(this.position).mul(invTimeHorizonObst)
      let rightCutoff = obstacle2.point.sub(this.position).mul(invTimeHorizonObst)
      let cutoffVec = rightCutoff.sub(leftCutoff)

      /* Project current velocity on velocity obstacle. */

      /* Check if current velocity is projected on cutoff circles. */
      let t = obstacle1 ===obstacle2 ? 0.5 : this.velocity.sub(leftCutoff).Dot(cutoffVec) / RVOMath.absSq(cutoffVec)
      let tLeft = this.velocity.sub(leftCutoff).Dot(leftLegDirection)
      let tRight = this.velocity.sub(rightCutoff).Dot(rightLegDirection)

      if ((t < 0.0 && tLeft < 0.0) || (obstacle1 ===obstacle2 && tLeft < 0.0 && tRight < 0.0)) {
        /* Project on left cut-off circle. */
        let unitW = RVOMath.normalize(this.velocity.sub(leftCutoff))

        line.direction = new Vector2(unitW.Y, -unitW.X)
        line.point = leftCutoff.add(unitW.mul(this.radius * invTimeHorizonObst))
        orcaLines.push(line)
        continue
      } else if (t > 1.0 && tRight < 0.0) {
        /* Project on right cut-off circle. */
        let unitW = RVOMath.normalize(this.velocity.sub(rightCutoff))

        line.direction = new Vector2(unitW.Y, -unitW.X)
        line.point = rightCutoff.add(unitW.mul(this.radius * invTimeHorizonObst))
        orcaLines.push(line)
        continue
      }

      /*
       * Project on left leg, right leg, or cut-off line, whichever is closest
       * to velocity.
       */
      let distSqCutoff = ((t < 0.0 || t > 1.0 || obstacle1 ===obstacle2) ? RVOMath.RVO_INFINITY : RVOMath.absSq(this.velocity.sub(cutoffVec.mul(t).add(leftCutoff))))
      let distSqLeft = ((tLeft < 0.0) ? RVOMath.RVO_INFINITY : RVOMath.absSq(this.velocity.sub(leftLegDirection.mul(tLeft).add(leftCutoff))))
      let distSqRight = ((tRight < 0.0) ? RVOMath.RVO_INFINITY : RVOMath.absSq(this.velocity.sub(rightLegDirection.mul(tRight).add(rightCutoff))))

      if (distSqCutoff <= distSqLeft && distSqCutoff <= distSqRight) {
        /* Project on cut-off line. */
        line.direction = obstacle1.unitDir.mul(-1)
        let aux = new Vector2(-line.direction.Y, line.direction.X)
        line.point = aux.mul(this.radius * invTimeHorizonObst).add(leftCutoff)
        orcaLines.push(line)
        continue
      } else if (distSqLeft <= distSqRight) {
        /* Project on left leg. */
        if (isLeftLegForeign) {
          continue
        }

        line.direction = leftLegDirection
        let aux = new Vector2(-line.direction.Y, line.direction.X)
        line.point = aux.mul(this.radius * invTimeHorizonObst).add(leftCutoff)
        orcaLines.push(line)
        continue
      } else {
        /* Project on right leg. */
        if (isRightLegForeign) {
          continue
        }

        line.direction = rightLegDirection.mul(-1)
        let aux = new Vector2(-line.direction.Y, line.direction.X)
        line.point = aux.mul(this.radius * invTimeHorizonObst).add(leftCutoff)
        orcaLines.push(line)
        continue
      }
    }

    let numObstLines = orcaLines.size()

    let invTimeHorizon = 1.0 / this.timeHorizon

    /* Create agent ORCA lines. */
    for (let i = 0; i < this.agentNeighbors.size(); ++i) {
      let other = this.agentNeighbors[i].value

      let relativePosition = other.position.sub(this.position)
      let relativeVelocity = this.velocity.sub(other.velocity)
      let distSq = RVOMath.absSq(relativePosition)
      let combinedRadius = this.radius + other.radius
      let combinedRadiusSq = RVOMath.sqr(combinedRadius)

      let line = new Line(); // Line
      let u: Vector2;

      if (distSq > combinedRadiusSq) {
        /* No collision. */
        let w = relativeVelocity.sub(relativePosition.mul(invTimeHorizon));; // Vector
        /* Vector from cutoff center to relative velocity. */
        let wLengthSq = RVOMath.absSq(w)

        let dotProduct1 = w.Dot(relativePosition)

        if (dotProduct1 < 0.0 && RVOMath.sqr(dotProduct1) > combinedRadiusSq * wLengthSq) {
          /* Project on cut-off circle. */
          let wLength = math.sqrt(wLengthSq);
          let unitW = w.mul(1 / wLength)

          line.direction = new Vector2(unitW.Y, -unitW.X)
          u = unitW.mul(combinedRadius * invTimeHorizon - wLength)
        } else {
          /* Project on legs. */
          let leg = math.sqrt(distSq - combinedRadiusSq)

          if (RVOMath.det(relativePosition, w) > 0.0) {
            /* Project on left leg. */
            let aux = new Vector2(relativePosition.X * leg - relativePosition.Y * combinedRadius, relativePosition.X * combinedRadius + relativePosition.Y * leg)
            line.direction = aux.mul(1 / distSq)
          } else {
            /* Project on right leg. */
            let aux = new Vector2(relativePosition.X * leg + relativePosition.Y * combinedRadius, -relativePosition.X * combinedRadius + relativePosition.Y * leg)
            line.direction = aux.mul(-1 / distSq)
          }

          let dotProduct2 = relativeVelocity.Dot(line.direction)

          u = line.direction.mul(dotProduct2).sub(relativeVelocity)
        }
      } else {
        /* Collision. Project on cut-off circle of time timeStep. */
        let invTimeStep = 1.0 / this.simulator.timeStep

        /* Vector from cutoff center to relative velocity. */
        const w = relativeVelocity.sub(relativePosition.mul(invTimeStep))

        let wLength = RVOMath.abs(w)
        let unitW = w.mul(1 / wLength);

        line.direction = new Vector2(unitW.Y, -unitW.X)
        u = unitW.mul(combinedRadius * invTimeStep - wLength)
      }

      line.point = u.mul(0.5).add(this.velocity)
      orcaLines.push(line)
    }

    let lineFail = this._linearProgram2(orcaLines, this.maxSpeed, this.prefVelocity, false);

    if (lineFail < orcaLines.size()) {
      this._linearProgram3(orcaLines, numObstLines, lineFail, this.maxSpeed);
    }
  }

  /**
   * 插入代理邻居
   * 将其他代理添加到邻居列表中（按距离排序）
   * @param agent - 要添加的代理
   * @param rangeSq - 搜索范围的平方
   * @returns 更新后的搜索范围平方
   */
  insertAgentNeighbor(agent: Agent, rangeSq: number): number {
    if (this !== agent) {
      const distSq = RVOMath.absSq(this.position.sub(agent.position))

      if (distSq < rangeSq) {
        if (this.agentNeighbors.size() < this.maxNeighbors) {
          this.agentNeighbors.push(new KeyValuePair(distSq, agent))
          let index = this.agentNeighbors.size() - 1
          while (index !== 0 && distSq < this.agentNeighbors[index - 1].key) {
            this.agentNeighbors[index] = this.agentNeighbors[index - 1]
            --index
          }
          this.agentNeighbors[index] = new KeyValuePair(distSq, agent)
        } else {
          let index = this.agentNeighbors.size() - 1
          if (distSq < this.agentNeighbors[index].key) {
            while (index !== 0 && distSq < this.agentNeighbors[index - 1].key) {
              this.agentNeighbors[index] = this.agentNeighbors[index - 1]
              --index
            }
            this.agentNeighbors[index] = new KeyValuePair(distSq, agent)
          }
        }

        if (this.agentNeighbors.size() === this.maxNeighbors) {
          rangeSq = this.agentNeighbors[this.agentNeighbors.size() - 1].key
        }
      }
    }

    return rangeSq
  }

  /**
   * 插入障碍物邻居
   * 将障碍物添加到邻居列表中（按距离排序）
   * @param obstacle - 要添加的障碍物
   * @param rangeSq - 搜索范围的平方
   */
  insertObstacleNeighbor(obstacle: Obstacle, rangeSq: number) {
    let nextObstacle = obstacle.next;

    let distSq = RVOMath.distSqPointLineSegment(obstacle.point, nextObstacle.point, this.position)

    if (distSq < rangeSq) {
      this.obstaclNeighbors.push(new KeyValuePair(distSq, obstacle))

      let i = this.obstaclNeighbors.size() - 1
      while (i !==0 && distSq < this.obstaclNeighbors[i - 1].key) {
        this.obstaclNeighbors[i] = this.obstaclNeighbors[i - 1]
        --i
      }
      this.obstaclNeighbors[i] = new KeyValuePair(distSq, obstacle)
    }
  }

	/**
	 * 更新代理状态
	 * 应用计算出的新速度并更新位置
	 */
	update(): void {
    // let rnd = new Vector2(math.random() * 0.1 - 0.05, math.random() * 0.1 - 0.05)
    // this.velocity = this.newVelocity.add(rnd)
    this.velocity = this._newVelocity;
    this.position = this.position.add(this._newVelocity.mul(this.simulator.timeStep))
  }

  /**
   * 线性规划求解 - 第一阶段
   * 在给定约束线上求解最优速度
   * @param lines - ORCA 约束线数组
   * @param lineNo - 当前处理的线编号
   * @param radius - 代理半径
   * @param optVelocity - 最优速度目标
   * @param directionOpt - 是否优化方向
   * @returns 是否成功找到解
   */
  private _linearProgram1(lines: Line[],
    lineNo: number,
    radius: number,
    optVelocity: Vector2,
    directionOpt: boolean): boolean {

    let dotProduct = lines[lineNo].point.Dot(lines[lineNo].direction)
    let discriminant = RVOMath.sqr(dotProduct) + RVOMath.sqr(radius) - RVOMath.absSq(lines[lineNo].point)

    if (discriminant < 0.0) {
      /* Max speed circle fully invalidates line lineNo. */
      return false;
    }

    let sqrtDiscriminant = math.sqrt(discriminant);
    let tLeft = -dotProduct - sqrtDiscriminant;
    let tRight = -dotProduct + sqrtDiscriminant;

    for (let i = 0; i < lineNo; ++i) {
      let denominator = RVOMath.det(lines[lineNo].direction, lines[i].direction);
      let numerator = RVOMath.det(lines[i].direction, lines[lineNo].point.sub(lines[i].point));

      if (math.abs(denominator) <= RVOMath.RVO_EPSILON) {
        /* Lines lineNo and i are (almost) parallel. */
        if (numerator < 0.0) {
          return false;
        } else {
          continue;
        }
      }

      let t = numerator / denominator;

      if (denominator >= 0.0) {
        /* Line i bounds line lineNo on the right. */
        tRight = math.min(tRight, t);
      } else {
        /* Line i bounds line lineNo on the left. */
        tLeft = math.max(tLeft, t);
      }

      if (tLeft > tRight) {
        return false;
      }
    }

    if (directionOpt) {
      if (optVelocity.Dot(lines[lineNo].direction) > 0.0) {
        // Take right extreme
        this._newVelocity = lines[lineNo].direction.mul(tRight).add(lines[lineNo].point);
      } else {
        // Take left extreme.
        this._newVelocity = lines[lineNo].direction.mul(tLeft).add(lines[lineNo].point);
      }
    } else {
      // Optimize closest point
      const t = lines[lineNo].direction.Dot(optVelocity.sub(lines[lineNo].point));

      if (t < tLeft) {
        this._newVelocity = lines[lineNo].direction.mul(tLeft).add(lines[lineNo].point);
      } else if (t > tRight) {
        this._newVelocity = lines[lineNo].direction.mul(tRight).add(lines[lineNo].point);
      } else {
        this._newVelocity = lines[lineNo].direction.mul(t).add(lines[lineNo].point);
      }
    }

    // TODO ugly hack by palmerabollo
    if (RVOMath.isNaN(this._newVelocity.X) || RVOMath.isNaN(this._newVelocity.Y)) {
      return false;
    }

    return true;
  }

  /**
   * 线性规划求解 - 第二阶段
   * 在多条约束线下求解最优速度
   * @param lines - ORCA 约束线数组
   * @param radius - 代理半径
   * @param optVelocity - 最优速度目标
   * @param directionOpt - 是否优化方向
   * @returns 失败的约束线编号，若全部成功则返回线数量
   */
  private _linearProgram2(lines: Line[],
    radius: number,
    optVelocity: Vector2,
    directionOpt: boolean): number {
    if (directionOpt) {
      /*
       * Optimize direction. Note that the optimization velocity is of unit
       * length in this case.
       */
      this._newVelocity = optVelocity.mul(radius);
    } else if (RVOMath.absSq(optVelocity) > RVOMath.sqr(radius)) {
      /* Optimize closest point and outside circle. */
      this._newVelocity = RVOMath.normalize(optVelocity).mul(radius);
    } else {
      /* Optimize closest point and inside circle. */
      this._newVelocity = optVelocity;
    }

    for (let i = 0; i < lines.size(); ++i) {
      if (RVOMath.det(lines[i].direction, lines[i].point.sub(this._newVelocity)) > 0.0) {
        /* Result does not satisfy constraint i. Compute new optimal result. */
        let tempResult = this._newVelocity;
        if (!this._linearProgram1(lines, i, this.radius, optVelocity, directionOpt)) {
          this._newVelocity = tempResult;
          return i;
        }
      }
    }

    return lines.size();
  }

  /**
   * 线性规划求解 - 第三阶段
   * 处理无解情况，寻找最接近的可行解
   * @param lines - ORCA 约束线数组
   * @param numObstLines - 障碍物约束线数量
   * @param beginLine - 开始处理的线编号
   * @param radius - 代理半径
   */
  private _linearProgram3(lines: Line[], numObstLines: number, beginLine: number, radius: number) {
    let distance = 0.0;

    for (let i = beginLine; i < lines.size(); ++i) {
      if (RVOMath.det(lines[i].direction, lines[i].point.sub(this._newVelocity)) > distance) {
        /* Result does not satisfy constraint of line i. */
        //std::vector<Line> projLines(lines.begin(), lines.begin() + numObstLines)
        let projLines = []; // new List<Line>()
        for (let ii = 0; ii < numObstLines; ++ii) {
          projLines.push(lines[ii]);
        }

        for (let j = numObstLines; j < i; ++j) {
          let line = new Line();

          let determinant = RVOMath.det(lines[i].direction, lines[j].direction);

          if (math.abs(determinant) <= RVOMath.RVO_EPSILON) {
            /* Line i and line j are parallel. */
            if (lines[i].direction.Dot(lines[j].direction) > 0.0) {
              /* Line i and line j point in the same direction. */
              continue;
            } else {
              /* Line i and line j point in opposite direction. */
              line.point = lines[i].point.add(lines[j].point).mul(0.5);
            }
          } else {
            let aux = lines[i].direction.mul(RVOMath.det(lines[j].direction, lines[i].point.sub(lines[j].point)) / determinant);
            line.point = lines[i].point.add(aux);
          }

          line.direction = RVOMath.normalize(lines[j].direction.sub(lines[i].direction));
          projLines.push(line);
        }

        let tempResult = this._newVelocity;
        if (this._linearProgram2(projLines, radius, new Vector2(-lines[i].direction.Y, lines[i].direction.X), true) < projLines.size()) {
          /* This should in principle not happen.  The result is by definition
           * already in the feasible region of this linear program. If it fails,
           * it is due to small floating point error, and the current result is
           * kept.
           */
          this._newVelocity = tempResult;
        }

        distance = RVOMath.det(lines[i].direction, lines[i].point.sub(this._newVelocity));
      }
    }
  }
}


/**
 * KeyValuePair 类
 * 用于存储邻居信息（距离的平方和对应的代理/障碍物引用）
 * @template K - 键类型（通常为 number，表示距离的平方）
 * @template V - 值类型（Agent 或 Obstacle）
 */
class KeyValuePair<K, V> {
	/** 键（距离的平方） */
	key: K;

	/** 值（代理或障碍物引用） */
	value: V;

	/**
	 * 创建键值对
	 * @param key - 键值（距离的平方）
	 * @param value - 关联的对象（代理或障碍物）
	 */
	constructor(key: K, value: V) {
		this.key = key;
		this.value = value;
	}
}
