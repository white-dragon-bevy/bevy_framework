# RVO 示例集

这个目录包含了多个展示 RVO (Reciprocal Velocity Obstacles) 碰撞避免系统的示例。

## 示例列表

### 1. simple-collision-avoidance.ts

**简单碰撞避免示例**

演示两个 Agent 相向运动并相互避让的基础功能。

**特性：**
- 两个 Agent 从相对位置出发
- 相向运动并自动避让
- 清晰展示 RVO 避让效果

**适合：**
- 初学者了解 RVO 基本原理
- 验证 RVO 插件是否正常工作

**使用方法：**
```typescript
import { runSimpleCollisionAvoidanceExample } from "./simple-collision-avoidance";
runSimpleCollisionAvoidanceExample();
```

### 2. multi-agent-navigation.ts

**多智能体导航示例**

演示 10 个 Agent 在圆形区域中相互避让并到达各自目标的复杂场景。

**特性：**
- 创建 10 个 Agent 在圆周上均匀分布
- 每个 Agent 的目标在圆周对面
- 所有 Agent 同时移动并相互避让
- 显示统计信息（Agent 数量、模拟时间）
- 监控 Agent 到达目标的进度

**适合：**
- 测试多 Agent 场景性能
- 观察复杂避让行为
- 学习 RVO 统计信息使用

**使用方法：**
```typescript
import { runMultiAgentNavigationExample } from "./multi-agent-navigation";
runMultiAgentNavigationExample();
```

## 运行示例

在 `src/__examples__/index.ts` 中修改配置：

```typescript
const exampleFolder: string = "roblox_rvo";
const exampleName: string = "simple-collision-avoidance"; // 或 "multi-agent-navigation"
```

## RVO 核心概念

### Agent (代理)
- 需要避让的移动实体
- 具有半径、最大速度等属性
- 自动计算避让速度

### Goal (目标)
- Agent 想要到达的位置
- RVO 会计算到达目标的最优路径
- 自动避让其他 Agent

### 碰撞避免算法
- 基于 RVO2 算法
- 预测未来碰撞
- 计算最优避让速度
- 保证平滑运动

## 常见问题

### Q: Agent 不移动？
A: 检查是否设置了 `goalPosition` 或 `preferredVelocity`

### Q: Agent 抖动？
A: 尝试调整 `timeHorizon` 和 `neighborDist` 参数

### Q: 性能问题？
A: 减少 `maxNeighbors` 和 `neighborDist`，使用 `RVOPlugin.performance()`

## 相关文档

- [RVO Plugin 文档](../../roblox_rvo/README.md)
- [RVO2 算法原理](https://gamma.cs.unc.edu/RVO2/)