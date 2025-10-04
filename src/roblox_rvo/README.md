# RVO Plugin for Bevy Framework

RVO2 (Reciprocal Velocity Obstacles) 碰撞避免算法的 Bevy ECS 插件实现，提供多智能体导航和碰撞避免功能。

## 概述

RVO Plugin 为 Roblox Bevy 框架提供了高效的多智能体碰撞避免系统。它基于 RVO2 算法，能够在复杂环境中处理数百个智能体的实时导航，同时避免相互碰撞和障碍物。

### 主要特性

- 🚀 **高性能碰撞避免** - 使用优化的 RVO2 算法
- 🎯 **目标导航** - 自动计算到达目标的最优路径
- 🛡️ **障碍物避让** - 支持静态多边形障碍物
- 📊 **事件系统** - 碰撞避免、目标到达等事件通知
- ⚙️ **灵活配置** - 可调整的性能和质量参数
- 🔄 **Transform 集成** - 与 Bevy Transform 系统无缝集成

## 安装

```typescript
import { App } from "@rbxts/bevy_framework/app";
import { TransformPlugin } from "@rbxts/bevy_framework/transform";
import { RVOPlugin } from "@rbxts/bevy_framework/roblox_rvo";

const app = App.create()
    .addPlugin(new TransformPlugin())
    .addPlugin(new RVOPlugin());
```

## 基础用法

### 创建带碰撞避免的 Agent

```typescript
import { RVOAgent, createRVOAgent } from "@rbxts/bevy_framework/roblox_rvo";
import { Transform, transformFromPosition } from "@rbxts/bevy_framework/transform";

// 生成 Agent 实体
const agent = world.spawn(
    Transform(transformFromPosition(new Vector3(0, 0, 0))),
    RVOAgent(createRVOAgent({
        radius: 1.5,              // 碰撞半径
        maxSpeed: 5,              // 最大速度
        preferredVelocity: new Vector2(1, 0), // 首选移动方向
    }))
);
```

### 设置目标位置

```typescript
import { setAgentGoal } from "@rbxts/bevy_framework/roblox_rvo";

const agentData = world.get(agent, RVOAgent);
const currentPos = new Vector2(transform.cframe.Position.X, transform.cframe.Position.Z);
const goalPos = new Vector2(10, 10);

const updatedAgent = setAgentGoal(agentData, goalPos, currentPos);
world.insert(agent, RVOAgent(updatedAgent));
```

### 添加静态障碍物

```typescript
import { RVOObstacle, createRectangleObstacle, createCircleObstacle } from "@rbxts/bevy_framework/roblox_rvo";

// 矩形障碍物
const rectObstacle = world.spawn(
    RVOObstacle(createRectangleObstacle(
        new Vector2(5, 5),  // 中心位置
        10,                 // 宽度
        10                  // 高度
    ))
);

// 圆形障碍物
const circleObstacle = world.spawn(
    RVOObstacle(createCircleObstacle(
        new Vector2(0, 0),  // 中心位置
        5,                  // 半径
        8                   // 边数（多边形近似）
    ))
);
```

## 配置选项

### 插件配置

```typescript
const plugin = new RVOPlugin({
    maxAgents: 500,           // 最大 Agent 数量
    timeStep: 0.25,          // 模拟时间步长
    neighborDist: 15,        // 邻居检测距离
    maxNeighbors: 10,        // 最大邻居数量
    timeHorizon: 10,         // 时间视界
    timeHorizonObst: 10,     // 障碍物时间视界
    radius: 1.5,             // 默认半径
    maxSpeed: 2,             // 默认最大速度
    debugDraw: false,        // 调试绘制
    autoSimulate: true,      // 自动运行模拟
    kdTreeMaxLeafSize: 1000  // KD 树叶节点大小
});
```

### 预设配置

```typescript
// 默认配置
app.addPlugin(RVOPlugin.default());

// 高性能配置（较少邻居检测）
app.addPlugin(RVOPlugin.performance());

// 高质量配置（更多邻居检测）
app.addPlugin(RVOPlugin.quality());

// 调试配置
app.addPlugin(RVOPlugin.debug());
```

## 事件系统

### 监听碰撞避免事件

```typescript
import { CollisionAvoidanceEvent } from "@rbxts/bevy_framework/roblox_rvo";

function handleCollisionAvoidance(world: World, context: Context) {
    const reader = context.getEventReader<CollisionAvoidanceEvent>();
    for (const event of reader.read()) {
        print(`Entity ${event.entity} avoided ${event.avoidedEntities.size()} entities`);
        print(`Velocity changed from ${event.originalVelocity} to ${event.newVelocity}`);
    }
}
```

### 监听目标到达事件

```typescript
import { GoalReachedEvent } from "@rbxts/bevy_framework/roblox_rvo";

function handleGoalReached(world: World, context: Context) {
    const reader = context.getEventReader<GoalReachedEvent>();
    for (const event of reader.read()) {
        print(`Entity ${event.entity} reached goal at ${event.goalPosition}`);
        print(`Distance error: ${event.distanceError}`);
    }
}
```

## 高级用法

### 手动控制模拟

```typescript
import { getRVOConfig, stepRVOSimulation } from "@rbxts/bevy_framework/roblox_rvo";

// 禁用自动模拟
const config = getRVOConfig(context);
if (config) {
    config.autoSimulate = false;
}

// 手动执行模拟步骤
function customSimulation(world: World, context: Context) {
    // 自定义逻辑...

    // 执行一步模拟
    stepRVOSimulation(context);
}
```

### 获取统计信息

```typescript
import { getRVOStats } from "@rbxts/bevy_framework/roblox_rvo";

function printStats(context: Context) {
    const stats = getRVOStats(context);
    if (stats) {
        print(`Agents: ${stats.agentCount}`);
        print(`Obstacles: ${stats.obstacleCount}`);
        print(`Avg simulation time: ${stats.averageSimulationTime}ms`);
    }
}
```

### 动态修改 Agent 参数

```typescript
function updateAgentSpeed(world: World, entity: number, newSpeed: number) {
    const agent = world.get(entity, RVOAgent);
    if (agent) {
        world.insert(entity, RVOAgent({
            ...agent,
            maxSpeed: newSpeed
        }));
    }
}
```

## 完整示例

### 多智能体导航场景

```typescript
import { App } from "@rbxts/bevy_framework/app";
import { TransformPlugin, Transform, transformFromPosition } from "@rbxts/bevy_framework/transform";
import {
    RVOPlugin,
    RVOAgent,
    RVOObstacle,
    createRVOAgent,
    createRectangleObstacle,
    setAgentGoal,
    GoalReachedEvent
} from "@rbxts/bevy_framework/roblox_rvo";

// 创建应用
const app = App.create()
    .addPlugin(new TransformPlugin())
    .addPlugin(new RVOPlugin({
        maxAgents: 100,
        debugDraw: true
    }));

const world = app.getWorld();

// 创建障碍物环境
const obstacles = [
    { pos: new Vector2(0, 10), width: 20, height: 2 },    // 上墙
    { pos: new Vector2(0, -10), width: 20, height: 2 },   // 下墙
    { pos: new Vector2(-10, 0), width: 2, height: 20 },   // 左墙
    { pos: new Vector2(10, 0), width: 2, height: 20 },    // 右墙
    { pos: new Vector2(0, 0), width: 4, height: 4 },      // 中心障碍
];

for (const obstacle of obstacles) {
    world.spawn(
        RVOObstacle(createRectangleObstacle(obstacle.pos, obstacle.width, obstacle.height))
    );
}

// 创建智能体群组
const agents: number[] = [];
for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * math.pi * 2;
    const startPos = new Vector3(math.cos(angle) * 8, 0, math.sin(angle) * 8);
    const goalPos = new Vector2(-math.cos(angle) * 8, -math.sin(angle) * 8);

    const entity = world.spawn(
        Transform(transformFromPosition(startPos)),
        RVOAgent(createRVOAgent({
            radius: 0.5,
            maxSpeed: 3,
            goalPosition: goalPos
        }))
    );

    agents.push(entity);
}

// 监听目标到达事件
app.addSystem((world, context) => {
    const reader = context.getEventReader<GoalReachedEvent>();
    for (const event of reader.read()) {
        print(`Agent ${event.entity} reached goal!`);

        // 设置新的随机目标
        const newGoal = new Vector2(
            math.random() * 16 - 8,
            math.random() * 16 - 8
        );

        const agent = world.get(event.entity, RVOAgent);
        if (agent) {
            const transform = world.get(event.entity, Transform);
            const currentPos = new Vector2(
                transform.cframe.Position.X,
                transform.cframe.Position.Z
            );

            const updatedAgent = setAgentGoal(agent, newGoal, currentPos);
            world.insert(event.entity, RVOAgent(updatedAgent));
        }
    }
});

// 运行应用
app.run();
```

## 性能优化建议

1. **调整邻居参数**
   - 减少 `maxNeighbors` 可显著提高性能
   - 减小 `neighborDist` 降低检测范围

2. **使用合适的时间步长**
   - 较大的 `timeStep` 减少计算频率
   - 太大可能导致不稳定

3. **障碍物优化**
   - 使用简单的凸多边形
   - 避免过多顶点

4. **批量操作**
   - 同时创建多个 Agent
   - 批量更新目标

## API 参考

### 组件

- `RVOAgent` - Agent 组件
- `RVOObstacle` - 障碍物组件

### 资源

- `RVOConfig` - 配置资源
- `RVOSimulatorResource` - 模拟器资源

### 事件

- `CollisionAvoidanceEvent` - 碰撞避免事件
- `GoalReachedEvent` - 目标到达事件
- `ObstacleNearbyEvent` - 障碍物接近事件
- `VelocityChangedEvent` - 速度变化事件

### 辅助函数

- `createRVOAgent()` - 创建 Agent
- `setAgentGoal()` - 设置目标
- `hasReachedGoal()` - 检查到达
- `createRectangleObstacle()` - 创建矩形障碍
- `createCircleObstacle()` - 创建圆形障碍
- `getRVOSimulator()` - 获取模拟器
- `getRVOConfig()` - 获取配置
- `getRVOStats()` - 获取统计

## 注意事项

1. RVO 算法在 2D 平面工作，使用 X-Z 平面投影
2. Agent 数量影响性能，建议不超过 500 个
3. 障碍物必须在 Agent 创建前添加
4. Transform 组件是必需的

## 许可证

基于 RVO2 Library (MIT License)