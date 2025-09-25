/**
 * roblox_rvo 模块
 * RVO2 (Reciprocal Velocity Obstacles) 碰撞避免算法的 Bevy 插件实现
 * 提供多智能体导航和碰撞避免功能
 */

// 核心插件导出
export { RVOPlugin } from "./plugin";

// 组件导出
export { RVOAgent, createRVOAgent, RVOObstacle, createRVOObstacle } from "./components";

// 资源导出
export { RVOConfig, RVOSimulatorResource } from "./resources";

// 事件导出
export { CollisionAvoidanceEvent, GoalReachedEvent, ObstacleNearbyEvent } from "./events";

// 系统导出（供高级用户使用）
export {
	initRVOSystem,
	syncTransformToRVO,
	simulateRVO,
	updateTransformFromRVO,
	cleanupRVOSystem,
} from "./systems";

// 核心算法类导出（供直接使用）
export { default as Simulator } from "./core/Simulator";
export { default as Agent } from "./core/Agent";
export { default as Obstacle } from "./core/Obstacle";
export { default as RVOMath } from "./core/RVOMath";

// 类型导出
export type { RVOAgentData, RVOObstacleData } from "./components";
export type { RVOPluginConfig } from "./plugin";

// 辅助函数导出
export { getRVOSimulator, getRVOConfig, getAgentEntity, getEntityAgent } from "./helpers";