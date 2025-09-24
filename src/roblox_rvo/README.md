# RVO Plugin

## 概述

RVO（Reciprocal Velocity Obstacles）是一种高效的多代理避障算法，专为实时群体仿真设计。本插件将经典的 RVO2 算法移植到 Roblox 平台，并与 Bevy ECS 系统深度集成。

### 应用场景

- 🎮 RTS/MOBA 游戏的单位移动
- 👥 群体仿真和人群模拟
- 🤖 NPC 自主导航
- 🚗 交通流量模拟
- ⚔️ 战斗单位编队移动

## 功能特性

- ✅ 多代理避障算法
- ✅ 静态障碍物支持
- ✅ 动态速度调整
- ✅ 可配置参数
- ✅ 高性能空间索引(KdTree)
- ✅ ECS组件集成
- ✅ 自动同步系统

## 快速开始

### 安装

```typescript
import { RVOPlugin } from "roblox_rvo";
```

### 基础使用 - 使用组件系统

```typescript
import { App } from "bevy_app";
import { RVOPlugin, RVOAgent, RVOTarget, Vector2D } from "roblox_rvo";
import { World } from "@rbxts/matter";

// 添加插件
const app = new App();
app.addPlugin(new RVOPlugin({
    autoUpdate: true,
    timeStep: 0.25,
    defaultRadius: 5,
    defaultMaxSpeed: 2
}));

// 创建代理实体
function spawnAgent(world: World, position: Vector2D, target: Vector2D) {
    const entity = world.spawn(
        RVOAgent({
            agentIndex: -1, // 会自动分配
            position: position,
            radius: 5,
            maxSpeed: 2,
            prefVelocity: Vector2D.ZERO
        }),
        RVOTarget({
            targetPosition: target,
            reached: false
        })
    );
    return entity;
}
```

### 直接使用Simulator (低级API)

```typescript
import { getRVOSimulator } from "roblox_rvo";

const simulator = getRVOSimulator(world);
if (simulator) {
    // 设置默认代理配置
    simulator.setAgentDefaults(
        80,  // neighborDist
        10,  // maxNeighbors
        100, // timeHorizon
        1,   // timeHorizonObst
        5,   // radius
        2    // maxSpeed
    );

    // 添加代理
    const agentIndex = simulator.addAgent(new Vector2D(0, 0));

    // 设置目标速度
    simulator.setAgentPrefVelocity(agentIndex, 1, 0);

    // 运行仿真步骤
    simulator.run();
}
```

## API参考

### ECS组件

#### RVOAgent
标记实体为需要避障的移动代理。

```typescript
interface RVOAgent {
    agentIndex: number;     // 仿真器中的索引
    radius: number;         // 代理半径
    maxSpeed: number;       // 最大速度
    prefVelocity: Vector2D; // 期望速度
    position: Vector2D;     // 当前位置
}
```

#### RVOTarget
设置代理的目标位置。

```typescript
interface RVOTarget {
    targetPosition: Vector2D; // 目标位置
    reached: boolean;        // 是否已到达
}
```

#### RVOObstacle
标记静态障碍物。

```typescript
interface RVOObstacle {
    vertices: Array<Vector2D>; // 障碍物顶点
    obstacleIndex?: number;    // 仿真器中的索引
}
```

### 核心类

#### KdTree - k维树空间索引

KdTree是RVO算法的核心性能优化组件，用于快速查找邻居代理和障碍物。

**工作原理：**
- 将空间递归划分成更小的区域
- 每个节点代表一个空间区域及其包含的代理/障碍物
- 通过树遍历快速排除不相关区域

**性能特点：**
- 构建复杂度：O(n log n)
- 查询复杂度：O(log n)
- 适合大量代理场景

**配置参数：**
```typescript
kdTree.MAXLEAF_SIZE = 10; // 叶节点最大代理数
```

#### Simulator - 主仿真器

管理所有代理和障碍物，执行避障算法。

**主要方法：**
- `addAgent(position)` - 添加代理
- `setAgentDefaults(...)` - 设置默认配置
- `setAgentPrefVelocity(id, vx, vy)` - 设置期望速度
- `setAgentPosition(id, x, y)` - 设置位置
- `addObstacle(vertices)` - 添加障碍物
- `run()` - 运行一个仿真步骤

#### Agent - 移动代理

代表一个需要避障的移动单位。

**属性：**
- `position` - 当前位置
- `velocity` - 当前速度
- `prefVelocity` - 期望速度
- `radius` - 碰撞半径
- `maxSpeed` - 最大速度

#### Obstacle - 障碍物

代表静态障碍物的一条边。

#### Vector2D - 二维向量

提供向量运算功能。

**方法：**
- `plus(vector)` - 向量加法
- `minus(vector)` - 向量减法
- `scale(scalar)` - 向量缩放
- `normalize()` - 归一化
- `abs()` - 长度
- `absSq()` - 平方长度

#### RVOMath - 数学工具

提供RVO算法所需的数学计算。

### 插件配置

```typescript
interface RVOConfig {
    autoUpdate: boolean;         // 是否自动更新
    defaultRadius: number;       // 默认代理半径
    defaultMaxNeighbors: number; // 默认最大邻居数
    defaultMaxSpeed: number;     // 默认最大速度
    defaultNeighborDist: number; // 默认邻居搜索距离
    defaultTimeHorizon: number;  // 默认时间范围
    defaultTimeHorizonObst: number; // 默认障碍物时间范围
    timeStep: number;           // 时间步长
}
```

## 高级用法

### 使用ECS系统

插件提供了完整的ECS系统集成，自动同步实体和RVO仿真器：

```typescript
// 系统执行顺序
PreUpdate:
  - syncNewAgents       // 同步新增代理
  - syncObstacles      // 同步障碍物
  - syncAgentPositions // 同步代理位置
  - updateAgentTargets // 更新目标速度

Update:
  - runSimulation      // 运行RVO仿真

PostUpdate:
  - syncFromSimulator  // 从仿真器同步位置
  - cleanupRemovedAgents // 清理已删除实体
```

### 自定义更新循环

如果需要手动控制仿真，可以禁用自动更新：

```typescript
app.addPlugin(new RVOPlugin({
    autoUpdate: false
}));

// 手动运行仿真
function customUpdate(world: World) {
    const simulator = getRVOSimulator(world);
    if (simulator) {
        // 自定义逻辑
        simulator.run();
    }
}
```

### 障碍物设置

```typescript
// 创建方形障碍物
const vertices = [
    new Vector2D(0, 0),
    new Vector2D(10, 0),
    new Vector2D(10, 10),
    new Vector2D(0, 10)
];

// 使用组件系统
world.spawn(RVOObstacle({
    vertices: vertices
}));

// 或直接使用仿真器
simulator.addObstacle(vertices);
simulator.processObstacles();
```

## 性能优化建议

### KdTree优化

1. **调整MAXLEAF_SIZE**
   - 较大值(10-20): 减少树深度，适合代理密度较低的场景
   - 较小值(5-10): 更精确的划分，适合代理密集的场景

2. **邻居搜索范围**
   - neighborDist: 设置合理的搜索半径，避免不必要的计算
   - maxNeighbors: 限制最大邻居数，平衡精度和性能

3. **空间分割策略**
   - KdTree会自动选择最佳分割轴（x或y）
   - 基于代理分布的包围盒进行划分

### 代理数量建议

- < 100代理: 使用默认配置
- 100-500代理: 考虑减少maxNeighbors到5-8
- > 500代理: 使用空间分区或LOD策略

### 参数调优

```typescript
// 密集场景优化
const denseConfig: RVOConfig = {
    defaultNeighborDist: 50,    // 减小搜索范围
    defaultMaxNeighbors: 5,     // 限制邻居数量
    defaultTimeHorizon: 50,     // 缩短预测时间
    timeStep: 0.5              // 增大时间步长
};

// 精确场景优化
const preciseConfig: RVOConfig = {
    defaultNeighborDist: 100,   // 增大搜索范围
    defaultMaxNeighbors: 15,    // 更多邻居考虑
    defaultTimeHorizon: 150,    // 延长预测时间
    timeStep: 0.1              // 减小时间步长
};
```

## 算法原理

### ORCA (Optimal Reciprocal Collision Avoidance)

RVO2使用ORCA算法，通过线性规划在速度空间中找到最优避障速度：

1. **速度障碍计算** - 计算与每个邻居的速度障碍区域
2. **ORCA线构建** - 将速度障碍转换为半平面约束
3. **线性规划** - 找到满足所有约束的最接近期望速度的速度
4. **位置更新** - 应用计算出的速度更新位置

### 时间范围概念

- `timeHorizon` - 预测与其他代理碰撞的时间窗口
- `timeHorizonObst` - 预测与障碍物碰撞的时间窗口
- 较大的值产生更早的避障行为，较小的值允许更紧密的通过

## 示例代码

### 完整示例 - 群体寻路

```typescript
import { App } from "bevy_app";
import { RVOPlugin, RVOAgent, RVOTarget, Vector2D } from "roblox_rvo";
import { World } from "@rbxts/matter";

function setupCrowdSimulation(app: App) {
    // 添加RVO插件
    app.addPlugin(new RVOPlugin({
        autoUpdate: true,
        defaultRadius: 2,
        defaultMaxSpeed: 5,
        defaultMaxNeighbors: 10,
        timeStep: 0.25
    }));

    const world = app.getWorld();

    // 创建100个代理
    for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * math.pi * 2;
        const radius = 50;

        // 起始位置在圆周上
        const startPos = new Vector2D(
            math.cos(angle) * radius,
            math.sin(angle) * radius
        );

        // 目标位置在对面
        const targetPos = new Vector2D(
            -startPos.x,
            -startPos.y
        );

        world.spawn(
            RVOAgent({
                agentIndex: -1,
                position: startPos,
                radius: 2,
                maxSpeed: 5,
                prefVelocity: Vector2D.ZERO
            }),
            RVOTarget({
                targetPosition: targetPos,
                reached: false
            })
        );
    }

    // 添加中心障碍物
    const obstacle = [
        new Vector2D(-10, -10),
        new Vector2D(10, -10),
        new Vector2D(10, 10),
        new Vector2D(-10, 10)
    ];

    world.spawn(RVOObstacle({
        vertices: obstacle
    }));
}
```

## 注意事项

- 所有代理被视为圆形碰撞体
- 障碍物必须是凸多边形或线段
- 大量代理时考虑使用空间分区
- 时间步长影响仿真稳定性和性能

## 参考资料

- [RVO2 Library](http://gamma.cs.unc.edu/RVO2/)
- [ORCA Paper](https://gamma.cs.unc.edu/ORCA/)
- [Original Implementation](https://github.com/snape/RVO2)