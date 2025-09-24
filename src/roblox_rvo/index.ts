/**
 * RVO (Reciprocal Velocity Obstacles) 避障算法库
 * 提供多代理避障和路径规划功能
 */

// 核心类导出
export { Agent } from "./agent";
export { KdTree } from "./kd-tree";
export { Line } from "./line";
export { Obstacle } from "./obstacle";
export { RVOMath } from "./rvo-math";
export { Simulator } from "./simulator";
export { Vector2D } from "./vector2d";

// 插件导出
export { RVOPlugin } from "./plugin";

// 资源导出
export { getRVOConfig, getRVOSimulator, RVOResources, setRVOConfig, setRVOSimulator } from "./resources";
export type { RVOConfig } from "./resources";

// 组件导出
export { RVOAgent, RVOConfig as RVOAgentConfig, RVODebug, RVOObstacle, RVOTarget } from "./components";

// 系统导出
export {
	cleanupRemovedAgents,
	syncAgentPositions,
	syncFromSimulator,
	syncNewAgents,
	syncObstacles,
	updateAgentTargets,
} from "./systems";