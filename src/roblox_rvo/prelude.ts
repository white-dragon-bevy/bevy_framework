/**
 * roblox_rvo prelude 模块
 * 包含最常用的导出，方便用户快速使用
 */

// 重新导出核心功能
export { RVOPlugin } from "./plugin";

// 导出最常用的组件
export { RVOAgent, createRVOAgent } from "./components";

// 导出配置资源
export { RVOConfig } from "./resources";

// 导出常用事件
export { CollisionAvoidanceEvent, GoalReachedEvent } from "./events";

// 导出常用辅助函数
export { getRVOSimulator, getRVOConfig } from "./helpers";