
import Obstacle from "./Obstacle";
import Agent from "./Agent";
import RVOMath from "./RVOMath";
import KdTree from "./KdTree";
import Line from "./Line";


export default class Simulator {

  agents: Agent[] = [];
  obstacles: Obstacle[] = [];
  private goals: Vector2[] = [];
  kdTree: KdTree = new KdTree();

  timeStep = 0.25;

  private defaultAgent!: Agent; // Agent

  private time = 0;

  constructor() {
    this.kdTree.simulator = this;
    this.kdTree.MAXLEAF_SIZE = 1000;
  }
  getGlobalTime(): number {
    return this.time;
  }

  getNumAgents(): number {
    return this.agents.size();
  }

  getTimeStep(): number {
    return this.timeStep;
  }

  setAgentPrefVelocity(i: number, vx:number, vy:number) {
    this.agents[i].prefVelocity = new Vector2(vx, vy);
  }

  setAgentPosition(i: number, x: number, y: number) {
    this.agents[i].position = new Vector2(x, y);
  }

  setAgentGoal(i: number, x: number, y: number) {
    this.goals[i] = new Vector2(x, y);
  }

  setTimeStep(timeStep: number) {
    this.timeStep = timeStep;
  }

  getAgentPosition(i: number): Vector2 {
    return this.agents[i].position;
  }

  getAgentPrefVelocity(i: number): Vector2 {
    return this.agents[i].prefVelocity;
  }

  getAgentVelocity(i: number): Vector2 {
    return this.agents[i].velocity;
  }

  getAgentRadius(i: number): number {
    return this.agents[i].radius;
  }

  getAgentOrcaLines(i: number): Line[] {
    return this.agents[i].orcaLines;
  }

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

  //  /** float */ neighborDist, /** int */ maxNeighbors, /** float */ timeHorizon, /** float */ timeHorizonObst, /** float */ radius, /** float*/ maxSpeed, /** Vector2 */ velocity)
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

  run() {
    this.kdTree.buildAgentTree();

    for (let i = 0; i < this.getNumAgents(); i++) {
      this.agents[i].computeNeighbors();
      this.agents[i].computeNewVelocity();
      this.agents[i].update();
    }

    this.time += this.timeStep;
  }

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

  addGoals(goals: Vector2[]) {
    this.goals = goals;
  }

  getGoal(goalNo: number): Vector2 {
    return this.goals[goalNo];
  }

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

  processObstacles() {
    this.kdTree.buildObstacleTree();
  }

  queryVisibility(point1: Vector2, point2: Vector2, radius: number): boolean {
    return this.kdTree.queryVisibility(point1, point2, radius);
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

}
