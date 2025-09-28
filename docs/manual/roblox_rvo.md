# roblox_rvo 模块操作手册

## 目录

1. [模块概述](#模块概述)
2. [核心组件](#核心组件)
3. [API 详解](#api-详解)
4. [实战示例](#实战示例)
5. [最佳实践](#最佳实践)
6. [性能优化](#性能优化)
7. [故障排除](#故障排除)

---

## 模块概述

### 什么是 roblox_rvo？

**roblox_rvo** 是基于 RVO2 (Reciprocal Velocity Obstacles) 算法的碰撞避免系统，为 Roblox 平台提供智能多智能体导航和路径规划能力。该模块能够让多个移动实体在复杂环境中自主避让，实现流畅的群体移动效果。

### 核心特性

- ✨ **智能避障** - 基于速度障碍的预测性碰撞避免
- 🎯 **目标导航** - 自动计算到达目标的最优路径
- 🚀 **高性能** - 使用 KD-Tree 加速邻居查询
- 🔧 **易于集成** - 完全融入 Bevy ECS 架构
- ⚙️ **灵活配置** - 支持运行时参数调整
- 📊 **性能监控** - 内置统计和调试功能

### RVO2 算法简介

RVO2 算法的核心思想是：每个智能体（Agent）预测其他智能体的未来位置，并计算一个"避免速度"（Avoidance Velocity），使其既能朝目标前进，又能避免碰撞。

**关键概念：**

- **速度障碍（Velocity Obstacle）**: 表示会导致碰撞的速度集合
- **ORCA 线（ORCA Line）**: 定义允许速度的半平面
- **时间视界（Time Horizon）**: 预测碰撞的时间范围
- **邻居检测（Neighbor Detection）**: 只考虑附近的智能体，提高性能

---

## 核心组件

### 1. RVOPlugin - 插件入口

RVOPlugin 是整个 RVO 系统的入口，负责注册资源、系统和事件。

#### 基本用法

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { RVOPlugin } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

// 方式 1: 使用默认配置
const app = new App();
app.addPlugin(RVOPlugin.default());

// 方式 2: 使用性能优化配置
app.addPlugin(RVOPlugin.performance());

// 方式 3: 使用高质量配置
app.addPlugin(RVOPlugin.quality());

// 方式 4: 自定义配置
app.addPlugin(new RVOPlugin({
	maxAgents: 500,
	timeStep: 0.2,
	neighborDist: 12,
	maxNeighbors: 8,
	debugDraw: true,
}));
```

#### 配置选项说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxAgents` | number | 1000 | 最大智能体数量 |
| `timeStep` | number | 0.25 | 模拟时间步长（秒） |
| `neighborDist` | number | 15 | 邻居检测距离 |
| `maxNeighbors` | number | 10 | 最大邻居数量 |
| `timeHorizon` | number | 10 | 智能体时间视界 |
| `timeHorizonObst` | number | 10 | 障碍物时间视界 |
| `radius` | number | 1.5 | 默认智能体半径 |
| `maxSpeed` | number | 2.0 | 默认最大速度 |
| `debugDraw` | boolean | false | 是否启用调试绘制 |
| `autoSimulate` | boolean | true | 是否自动运行模拟 |
| `kdTreeMaxLeafSize` | number | 1000 | KD树最大叶节点大小 |

---

### 2. RVOAgent - 智能体组件

RVOAgent 组件标记一个实体为参与避障的移动智能体。

#### 组件接口

```typescript
interface RVOAgentData {
	/** 内部 Agent ID (系统自动分配) */
	agentId?: number;

	/** 目标速度向量 */
	targetVelocity: Vector2;

	/** 首选速度向量 (由用户设置) */
	preferredVelocity: Vector2;

	/** 当前实际速度 (由 RVO 计算) */
	currentVelocity?: Vector2;

	/** 碰撞半径 */
	radius: number;

	/** 最大移动速度 */
	maxSpeed: number;

	/** 最大邻居数量 */
	maxNeighbors: number;

	/** 邻居检测距离 */
	neighborDist: number;

	/** 时间视界 (用于预测碰撞) */
	timeHorizon: number;

	/** 障碍物时间视界 */
	timeHorizonObst: number;

	/** 是否启用 */
	enabled: boolean;

	/** 目标位置 (可选) */
	goalPosition?: Vector2;
}
```

#### 创建 Agent

```typescript
import { createRVOAgent, setAgentGoal } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

// 基本 Agent (使用默认参数)
const agent = createRVOAgent();

// 自定义参数的 Agent
const customAgent = createRVOAgent({
	radius: 2.0,
	maxSpeed: 5.0,
	maxNeighbors: 15,
	neighborDist: 20,
	preferredVelocity: new Vector2(1, 0),
});

// 添加到实体
world.spawn(
	Transform(CFrame.fromPosition(startPosition)),
	RVOAgent(agent),
);
```

#### 设置目标

```typescript
// 方式 1: 在创建时设置目标
const agent = createRVOAgent({
	goalPosition: new Vector2(100, 100),
});

// 方式 2: 使用辅助函数设置目标
const currentPosition = new Vector2(0, 0);
const goalPosition = new Vector2(100, 100);
const updatedAgent = setAgentGoal(agent, goalPosition, currentPosition);

// 更新实体
world.insert(entity, RVOAgent(updatedAgent));

// 方式 3: 直接修改组件
world.insert(entity, RVOAgent({
	...agent,
	goalPosition: new Vector2(100, 100),
}));
```

#### 检查是否到达目标

```typescript
import { hasReachedGoal } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

const agent = world.get(entity, RVOAgent);
const transform = world.get(entity, Transform);

if (agent && transform) {
	const position2D = new Vector2(
		transform.cframe.Position.X,
		transform.cframe.Position.Z,
	);

	if (hasReachedGoal(agent, position2D, 0.5)) {
		print("Agent reached goal!");
	}
}
```

---

### 3. RVOObstacle - 障碍物组件

RVOObstacle 组件定义静态障碍物，智能体会主动避开这些障碍物。

#### 组件接口

```typescript
interface RVOObstacleData {
	/** 障碍物顶点列表 (逆时针顺序) */
	vertices: Array<Vector2>;

	/** 是否为凸多边形 */
	isConvex: boolean;

	/** 障碍物 ID (系统自动分配) */
	obstacleId?: number;

	/** 是否启用 */
	enabled: boolean;
}
```

#### 创建障碍物

```typescript
import {
	createRectangleObstacle,
	createCircleObstacle,
	createLineObstacle,
	createRVOObstacle,
} from "@white-dragon-bevy/bevy-framework/roblox_rvo";

// 矩形障碍物
const rectObstacle = createRectangleObstacle(
	new Vector2(50, 50),  // 中心位置
	20,                   // 宽度
	10,                   // 高度
);

world.spawn(
	Transform(CFrame.fromPosition(new Vector3(50, 0, 50))),
	RVOObstacle(rectObstacle),
);

// 圆形障碍物 (用多边形近似)
const circleObstacle = createCircleObstacle(
	new Vector2(100, 100), // 中心位置
	5,                     // 半径
	12,                    // 边数
);

world.spawn(
	RVOObstacle(circleObstacle),
);

// 线段障碍物 (墙壁)
const lineObstacle = createLineObstacle(
	new Vector2(0, 0),
	new Vector2(100, 0),
);

world.spawn(
	RVOObstacle(lineObstacle),
);

// 自定义多边形障碍物
const customVertices = [
	new Vector2(0, 0),
	new Vector2(10, 0),
	new Vector2(10, 10),
	new Vector2(5, 15),
	new Vector2(0, 10),
];

const customObstacle = createRVOObstacle(customVertices);

world.spawn(
	RVOObstacle(customObstacle),
);
```

#### 动态障碍物

虽然 RVOObstacle 主要用于静态障碍物，但可以通过 Transform 组件实现动态变换：

```typescript
// 创建可移动的障碍物
const obstacle = createRectangleObstacle(
	new Vector2(0, 0),
	10,
	10,
);

const entity = world.spawn(
	Transform(CFrame.fromPosition(initialPosition)),
	RVOObstacle(obstacle),
);

// 在系统中移动障碍物
function moveObstacleSystem(world: World, context: Context): void {
	for (const [entity, transform, obstacle] of world.query(Transform, RVOObstacle)) {
		// 更新 Transform
		const newPosition = calculateNewPosition();
		world.insert(entity, Transform(
			CFrame.fromPosition(newPosition),
		));

		// RVO 系统会自动重新计算障碍物位置
	}
}
```

---

### 4. RVOConfig - 配置资源

RVOConfig 资源存储全局配置参数。

#### 访问配置

```typescript
import { getRVOConfig } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

function customSystem(world: World, context: Context): void {
	const config = getRVOConfig(context);
	if (config) {
		print(`Max agents: ${config.maxAgents}`);
		print(`Time step: ${config.timeStep}`);
	}
}
```

#### 运行时修改配置

```typescript
function adjustConfigSystem(world: World, context: Context): void {
	const config = getRVOConfig(context);
	if (config) {
		// 调整邻居检测距离
		config.neighborDist = 20;

		// 启用调试模式
		config.debugDraw = true;

		// 验证配置有效性
		if (!config.validate()) {
			warn("Invalid RVO configuration!");
		}
	}
}
```

---

### 5. RVOSimulatorResource - 模拟器资源

RVOSimulatorResource 管理核心模拟器实例和实体映射。

#### 访问模拟器

```typescript
import { getRVOSimulator, getRVOStats } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

function monitorSystem(world: World, context: Context): void {
	const stats = getRVOStats(context);
	if (stats) {
		print(`Agents: ${stats.agentCount}`);
		print(`Obstacles: ${stats.obstacleCount}`);
		print(`Avg simulation time: ${stats.averageSimulationTime.toFixed(2)}ms`);
	}
}
```

---

## API 详解

### 辅助函数

#### 1. getRVOSimulator

获取 RVO 模拟器实例（用于高级操作）。

```typescript
function getRVOSimulator(context: Context): Simulator | undefined;
```

**示例：**

```typescript
const simulator = getRVOSimulator(context);
if (simulator) {
	// 直接操作模拟器
	const agentPosition = simulator.getAgentPosition(agentId);
	const agentVelocity = simulator.getAgentVelocity(agentId);
}
```

#### 2. getEntityAgent

获取实体对应的 Agent ID。

```typescript
function getEntityAgent(context: Context, entity: number): number | undefined;
```

**示例：**

```typescript
const agentId = getEntityAgent(context, entity);
if (agentId !== undefined) {
	const simulator = getRVOSimulator(context);
	const velocity = simulator?.getAgentVelocity(agentId);
}
```

#### 3. getRVOStats

获取 RVO 系统统计信息。

```typescript
function getRVOStats(context: Context): {
	agentCount: number;
	obstacleCount: number;
	averageSimulationTime: number;
	lastSimulationTime: number;
	totalSimulationTime: number;
	simulationCount: number;
} | undefined;
```

#### 4. isRVOInitialized

检查 RVO 系统是否已初始化。

```typescript
function isRVOInitialized(context: Context): boolean;
```

#### 5. setRVODebugMode

设置调试模式。

```typescript
function setRVODebugMode(context: Context, enabled: boolean): void;
```

#### 6. setRVOAutoSimulate

控制是否自动运行模拟。

```typescript
function setRVOAutoSimulate(context: Context, enabled: boolean): void;
```

#### 7. stepRVOSimulation

手动执行一步模拟（当 autoSimulate 为 false 时）。

```typescript
function stepRVOSimulation(context: Context): boolean;
```

#### 8. resetRVO

重置 RVO 系统。

```typescript
function resetRVO(context: Context): void;
```

---

## 实战示例

### 示例 1: 基础群体移动

创建一群智能体，让它们朝同一个目标移动并自动避让。

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { RVOPlugin, createRVOAgent } from "@white-dragon-bevy/bevy-framework/roblox_rvo";
import { Transform } from "@white-dragon-bevy/bevy-framework/bevy_transform";

// 创建应用
const app = new App();
app.addPlugin(RVOPlugin.default());

// 获取 World
const world = app.getWorld();

// 目标位置
const goalPosition = new Vector2(100, 100);

// 生成 20 个智能体
for (let index = 0; index < 20; index++) {
	const angle = (index / 20) * math.pi * 2;
	const radius = 20;
	const startX = math.cos(angle) * radius;
	const startZ = math.sin(angle) * radius;

	const agent = createRVOAgent({
		radius: 1.5,
		maxSpeed: 3.0,
		goalPosition: goalPosition,
	});

	world.spawn(
		Transform(CFrame.fromPosition(new Vector3(startX, 0, startZ))),
		RVOAgent(agent),
	);
}

// 运行应用
app.run();
```

### 示例 2: 带障碍物的导航

在环境中添加障碍物，智能体需要绕过障碍物到达目标。

```typescript
import {
	RVOPlugin,
	createRVOAgent,
	createRectangleObstacle,
	createCircleObstacle,
} from "@white-dragon-bevy/bevy-framework/roblox_rvo";

const app = new App();
app.addPlugin(RVOPlugin.default());
const world = app.getWorld();

// 创建障碍物 1: 矩形墙壁
const wall1 = createRectangleObstacle(
	new Vector2(50, 0),
	5,
	30,
);
world.spawn(RVOObstacle(wall1));

// 创建障碍物 2: 圆形柱子
const pillar = createCircleObstacle(
	new Vector2(75, 50),
	3,
	8,
);
world.spawn(RVOObstacle(pillar));

// 创建智能体
for (let index = 0; index < 10; index++) {
	const agent = createRVOAgent({
		radius: 1.0,
		maxSpeed: 2.5,
		goalPosition: new Vector2(100, 100),
	});

	world.spawn(
		Transform(CFrame.fromPosition(new Vector3(index * 5, 0, 0))),
		RVOAgent(agent),
	);
}

app.run();
```

### 示例 3: 动态更新目标

创建一个系统，根据游戏逻辑动态更新智能体的目标。

```typescript
import { hasReachedGoal, setAgentGoal } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

function updateGoalsSystem(world: World, context: Context): void {
	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		const position3D = transform.cframe.Position;
		const position2D = new Vector2(position3D.X, position3D.Z);

		// 检查是否到达目标
		if (hasReachedGoal(agent, position2D, 1.0)) {
			// 生成新的随机目标
			const newGoal = new Vector2(
				math.random() * 200 - 100,
				math.random() * 200 - 100,
			);

			// 更新 Agent
			const updatedAgent = setAgentGoal(agent, newGoal, position2D);
			world.insert(entity, RVOAgent(updatedAgent));

			print(`Entity ${entity} reached goal, new target: ${newGoal}`);
		}
	}
}

// 添加到 Update 调度
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
	schedule.addSystem({
		system: updateGoalsSystem,
		name: "updateGoalsSystem",
	});
});
```

### 示例 4: 单位编队移动

创建一个编队系统，让多个单位保持阵型移动。

```typescript
interface Formation {
	leaderId: number;
	followers: Array<number>;
	formationType: "line" | "circle" | "wedge";
}

function formationSystem(world: World, context: Context): void {
	// 假设我们有一个编队资源
	const formations = context.resources.getResource<Array<Formation>>();
	if (!formations) return;

	for (const formation of formations) {
		const leaderAgent = world.get(formation.leaderId, RVOAgent);
		const leaderTransform = world.get(formation.leaderId, Transform);

		if (!leaderAgent || !leaderTransform) continue;

		const leaderPos = leaderTransform.cframe.Position;
		const leaderPos2D = new Vector2(leaderPos.X, leaderPos.Z);

		// 更新跟随者目标
		formation.followers.forEach((followerId, index) => {
			const followerAgent = world.get(followerId, RVOAgent);
			if (!followerAgent) return;

			// 根据编队类型计算目标位置
			let offset: Vector2;

			if (formation.formationType === "line") {
				offset = new Vector2(index * 3, 0);
			} else if (formation.formationType === "circle") {
				const angle = (index / formation.followers.size()) * math.pi * 2;
				const radius = 5;
				offset = new Vector2(
					math.cos(angle) * radius,
					math.sin(angle) * radius,
				);
			} else {
				// wedge formation
				const row = math.floor(index / 2);
				const side = index % 2 === 0 ? -1 : 1;
				offset = new Vector2(side * (row + 1) * 2, -row * 3);
			}

			const targetPosition = leaderPos2D.add(offset);

			// 更新跟随者目标
			world.insert(followerId, RVOAgent({
				...followerAgent,
				goalPosition: targetPosition,
			}));
		});
	}
}
```

### 示例 5: 性能监控面板

创建一个调试系统，实时显示 RVO 性能数据。

```typescript
import { getRVOStats } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

function rvoDebugSystem(world: World, context: Context): void {
	const stats = getRVOStats(context);
	if (!stats) return;

	// 每秒更新一次
	const frameCount = context.resources.getResource<FrameCount>();
	if (frameCount && frameCount.value % 60 === 0) {
		const debugText = `
=== RVO Performance ===
Agents: ${stats.agentCount}
Obstacles: ${stats.obstacleCount}
Last Simulation: ${stats.lastSimulationTime.toFixed(4)}s
Avg Simulation: ${stats.averageSimulationTime.toFixed(2)}ms
Total Simulations: ${stats.simulationCount}
=======================
		`;

		print(debugText);

		// 性能警告
		if (stats.averageSimulationTime > 5) {
			warn("RVO simulation is taking too long! Consider reducing agent count or neighbor distance.");
		}
	}
}
```

---

## 最佳实践

### 1. 参数调优

#### 邻居检测参数

```typescript
// 性能优先（适合大量单位）
const performanceAgent = createRVOAgent({
	maxNeighbors: 5,
	neighborDist: 10,
	timeHorizon: 5,
});

// 质量优先（适合少量单位）
const qualityAgent = createRVOAgent({
	maxNeighbors: 20,
	neighborDist: 20,
	timeHorizon: 15,
});

// 平衡配置（推荐）
const balancedAgent = createRVOAgent({
	maxNeighbors: 10,
	neighborDist: 15,
	timeHorizon: 10,
});
```

#### 速度和半径设置

```typescript
// 小型快速单位 (如：小动物)
const fastSmallAgent = createRVOAgent({
	radius: 0.5,
	maxSpeed: 5.0,
	timeHorizon: 5,
});

// 大型慢速单位 (如：载具)
const slowLargeAgent = createRVOAgent({
	radius: 3.0,
	maxSpeed: 1.5,
	timeHorizon: 15,
});

// 人形单位 (标准配置)
const humanoidAgent = createRVOAgent({
	radius: 1.5,
	maxSpeed: 2.0,
	timeHorizon: 10,
});
```

### 2. 障碍物优化

#### 减少顶点数量

```typescript
// ❌ 不好：过多顶点
const overdetailedCircle = createCircleObstacle(center, radius, 64);

// ✅ 好：合理的顶点数
const optimizedCircle = createCircleObstacle(center, radius, 8);
```

#### 使用凸多边形

```typescript
// RVO2 对凸多边形的处理更高效
const convexObstacle = createRVOObstacle(vertices, {
	isConvex: true,  // 明确标记为凸
});
```

#### 合并静态障碍物

```typescript
// ❌ 不好：多个小障碍物
for (let index = 0; index < 100; index++) {
	world.spawn(RVOObstacle(createCircleObstacle(positions[index], 1, 8)));
}

// ✅ 好：合并为大障碍物
const mergedVertices = mergePrimitives(positions);
world.spawn(RVOObstacle(createRVOObstacle(mergedVertices)));
```

### 3. 目标更新策略

#### 避免频繁更新

```typescript
// ❌ 不好：每帧更新目标
function badUpdateSystem(world: World, context: Context): void {
	for (const [entity, agent] of world.query(RVOAgent)) {
		const newGoal = calculateGoal(entity);
		world.insert(entity, RVOAgent({
			...agent,
			goalPosition: newGoal,
		}));
	}
}

// ✅ 好：只在必要时更新
function goodUpdateSystem(world: World, context: Context): void {
	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		// 只在到达目标或目标改变时更新
		if (hasReachedGoal(agent, getCurrentPosition(transform), 1.0)) {
			const newGoal = calculateGoal(entity);
			world.insert(entity, RVOAgent({
				...agent,
				goalPosition: newGoal,
			}));
		}
	}
}
```

#### 使用路径点系统

```typescript
interface Waypoints {
	points: Array<Vector2>;
	currentIndex: number;
}

function waypointSystem(world: World, context: Context): void {
	for (const [entity, agent, waypoints, transform] of world.query(RVOAgent, Waypoints, Transform)) {
		const position = getCurrentPosition(transform);

		// 到达当前路径点
		if (hasReachedGoal(agent, position, 2.0)) {
			waypoints.currentIndex++;

			// 所有路径点完成
			if (waypoints.currentIndex >= waypoints.points.size()) {
				waypoints.currentIndex = 0; // 循环
			}

			// 设置新目标
			const nextWaypoint = waypoints.points[waypoints.currentIndex];
			world.insert(entity, RVOAgent({
				...agent,
				goalPosition: nextWaypoint,
			}));
		}
	}
}
```

### 4. 动态启用/禁用

```typescript
function conditionalRVOSystem(world: World, context: Context): void {
	for (const [entity, agent, health] of world.query(RVOAgent, Health)) {
		// 死亡时禁用 RVO
		if (health.current <= 0 && agent.enabled) {
			world.insert(entity, RVOAgent({
				...agent,
				enabled: false,
			}));
		}

		// 复活时启用 RVO
		if (health.current > 0 && !agent.enabled) {
			world.insert(entity, RVOAgent({
				...agent,
				enabled: true,
			}));
		}
	}
}
```

### 5. 分层避障

为不同类型的单位使用不同的避障参数：

```typescript
enum UnitType {
	Infantry,
	Vehicle,
	Aircraft,
}

function createAgentByType(unitType: UnitType): RVOAgentData {
	switch (unitType) {
		case UnitType.Infantry:
			return createRVOAgent({
				radius: 0.5,
				maxSpeed: 2.5,
				maxNeighbors: 8,
				neighborDist: 10,
			});

		case UnitType.Vehicle:
			return createRVOAgent({
				radius: 2.0,
				maxSpeed: 5.0,
				maxNeighbors: 5,
				neighborDist: 20,
				timeHorizon: 15,
			});

		case UnitType.Aircraft:
			// 飞行单位可以忽略地面障碍物
			return createRVOAgent({
				radius: 3.0,
				maxSpeed: 10.0,
				maxNeighbors: 3,
				neighborDist: 30,
				timeHorizonObst: 0,  // 忽略障碍物
			});
	}
}
```

---

## 性能优化

### 1. KD-Tree 优化

KD-Tree 用于加速邻居查询，调整叶节点大小可以影响性能：

```typescript
// 小场景（< 100 agents）
app.addPlugin(new RVOPlugin({
	kdTreeMaxLeafSize: 500,
}));

// 中等场景（100-500 agents）
app.addPlugin(new RVOPlugin({
	kdTreeMaxLeafSize: 1000,
}));

// 大场景（> 500 agents）
app.addPlugin(new RVOPlugin({
	kdTreeMaxLeafSize: 2000,
}));
```

### 2. 时间步长调整

```typescript
// 快速响应（更频繁的更新）
const fastResponse = new RVOPlugin({
	timeStep: 0.1,  // 每 0.1 秒更新
});

// 标准配置
const standard = new RVOPlugin({
	timeStep: 0.25,  // 每 0.25 秒更新
});

// 性能优先（降低更新频率）
const performance = new RVOPlugin({
	timeStep: 0.5,  // 每 0.5 秒更新
});
```

### 3. 分批处理

对于大量智能体，可以分批进行更新：

```typescript
const BATCH_SIZE = 50;
let currentBatch = 0;

function batchedUpdateSystem(world: World, context: Context): void {
	const allAgents = [...world.query(RVOAgent)];
	const startIndex = currentBatch * BATCH_SIZE;
	const endIndex = math.min(startIndex + BATCH_SIZE, allAgents.size());

	for (let index = startIndex; index < endIndex; index++) {
		const [entity, agent] = allAgents[index];
		// 处理这批智能体
		updateAgent(entity, agent);
	}

	// 移动到下一批
	currentBatch = (currentBatch + 1) % math.ceil(allAgents.size() / BATCH_SIZE);
}
```

### 4. LOD (Level of Detail) 系统

根据距离调整智能体的避障精度：

```typescript
function lodRVOSystem(world: World, context: Context): void {
	const camera = getMainCamera(world);
	if (!camera) return;

	const cameraPos = camera.cframe.Position;

	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		const distance = cameraPos.sub(transform.cframe.Position).Magnitude;

		let maxNeighbors: number;
		let neighborDist: number;

		if (distance < 50) {
			// 近距离：高质量
			maxNeighbors = 15;
			neighborDist = 20;
		} else if (distance < 100) {
			// 中距离：中等质量
			maxNeighbors = 10;
			neighborDist = 15;
		} else {
			// 远距离：低质量
			maxNeighbors = 5;
			neighborDist = 10;
		}

		// 只在参数改变时更新
		if (agent.maxNeighbors !== maxNeighbors || agent.neighborDist !== neighborDist) {
			world.insert(entity, RVOAgent({
				...agent,
				maxNeighbors,
				neighborDist,
			}));
		}
	}
}
```

### 5. 性能监控

```typescript
import { getRVOStats } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

function performanceMonitorSystem(world: World, context: Context): void {
	const stats = getRVOStats(context);
	if (!stats) return;

	// 设置性能阈值
	const PERFORMANCE_THRESHOLD_MS = 5;
	const CRITICAL_THRESHOLD_MS = 10;

	if (stats.averageSimulationTime > CRITICAL_THRESHOLD_MS) {
		// 紧急降级
		const config = getRVOConfig(context);
		if (config) {
			warn("[RVO] Critical performance! Reducing quality...");
			config.maxNeighbors = 5;
			config.neighborDist = 10;
		}
	} else if (stats.averageSimulationTime > PERFORMANCE_THRESHOLD_MS) {
		// 性能警告
		warn(`[RVO] Performance warning: ${stats.averageSimulationTime.toFixed(2)}ms`);
	}
}
```

---

## 故障排除

### 常见问题

#### 1. 智能体不移动

**症状：** 智能体创建后静止不动

**可能原因：**
- 没有设置目标位置或首选速度
- Agent 被禁用 (`enabled: false`)
- maxSpeed 设置为 0

**解决方案：**

```typescript
// 检查 Agent 配置
const agent = world.get(entity, RVOAgent);
if (agent) {
	print(`Enabled: ${agent.enabled}`);
	print(`Max Speed: ${agent.maxSpeed}`);
	print(`Goal: ${agent.goalPosition}`);
	print(`Preferred Velocity: ${agent.preferredVelocity}`);
}

// 设置有效的目标
world.insert(entity, RVOAgent({
	...agent,
	enabled: true,
	maxSpeed: 2.0,
	goalPosition: new Vector2(100, 100),
}));
```

#### 2. 智能体穿过障碍物

**症状：** 智能体无视障碍物直接穿过

**可能原因：**
- 障碍物未正确添加到模拟器
- 障碍物顶点顺序错误（应为逆时针）
- timeHorizonObst 设置过小

**解决方案：**

```typescript
// 确保顶点为逆时针顺序
function ensureCounterClockwise(vertices: Array<Vector2>): Array<Vector2> {
	// 计算面积（使用叉积）
	let area = 0;
	for (let index = 0; index < vertices.size(); index++) {
		const current = vertices[index];
		const nextVertex = vertices[(index + 1) % vertices.size()];
		area += (nextVertex.X - current.X) * (nextVertex.Y + current.Y);
	}

	// 如果面积为负，说明是顺时针，需要反转
	if (area > 0) {
		vertices.reverse();
	}

	return vertices;
}

// 增加障碍物时间视界
const agent = createRVOAgent({
	timeHorizonObst: 15,  // 增加到 15
});
```

#### 3. 智能体抖动

**症状：** 智能体在原地震动或来回移动

**可能原因：**
- 目标距离过近
- maxSpeed 过大
- 邻居过多导致过度避让

**解决方案：**

```typescript
// 使用到达阈值
const ARRIVAL_THRESHOLD = 2.0;  // 增大阈值

if (hasReachedGoal(agent, currentPosition, ARRIVAL_THRESHOLD)) {
	// 停止移动
	world.insert(entity, RVOAgent({
		...agent,
		preferredVelocity: new Vector2(0, 0),
		goalPosition: undefined,
	}));
}

// 调整避障参数
const stableAgent = createRVOAgent({
	maxSpeed: 2.0,        // 降低速度
	maxNeighbors: 8,      // 减少邻居数量
	neighborDist: 12,     // 减小检测范围
	timeHorizon: 8,       // 减小时间视界
});
```

#### 4. 性能问题

**症状：** 游戏卡顿，帧率下降

**可能原因：**
- 智能体数量过多
- 邻居检测参数过大
- KD-Tree 配置不当

**解决方案：**

```typescript
// 使用性能配置
app.addPlugin(RVOPlugin.performance());

// 或手动优化参数
app.addPlugin(new RVOPlugin({
	maxNeighbors: 5,           // 减少邻居数量
	neighborDist: 10,          // 减小检测范围
	timeHorizon: 5,            // 减小时间视界
	kdTreeMaxLeafSize: 500,    // 优化 KD-Tree
}));

// 禁用远处的 Agent
function disableDistantAgentsSystem(world: World, context: Context): void {
	const camera = getMainCamera(world);
	if (!camera) return;

	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		const distance = camera.cframe.Position.sub(transform.cframe.Position).Magnitude;
		const shouldEnable = distance < 100;

		if (agent.enabled !== shouldEnable) {
			world.insert(entity, RVOAgent({
				...agent,
				enabled: shouldEnable,
			}));
		}
	}
}
```

#### 5. 智能体聚集

**症状：** 多个智能体聚集在一起无法分开

**可能原因：**
- radius 设置过小
- 目标位置相同
- maxNeighbors 过少

**解决方案：**

```typescript
// 增加半径
const agent = createRVOAgent({
	radius: 2.0,  // 增大半径
	maxNeighbors: 15,  // 增加邻居数量
});

// 为每个 Agent 设置略微不同的目标
function disperseGoals(baseGoal: Vector2, agentCount: number): Array<Vector2> {
	const goals: Array<Vector2> = [];
	const spreadRadius = 5;

	for (let index = 0; index < agentCount; index++) {
		const offset = new Vector2(
			(math.random() - 0.5) * spreadRadius,
			(math.random() - 0.5) * spreadRadius,
		);
		goals.push(baseGoal.add(offset));
	}

	return goals;
}
```

### 调试技巧

#### 1. 启用调试模式

```typescript
import { setRVODebugMode } from "@white-dragon-bevy/bevy-framework/roblox_rvo";

function toggleDebugSystem(world: World, context: Context): void {
	// 按键切换调试模式
	const userInputService = game.GetService("UserInputService");

	userInputService.InputBegan.Connect((input) => {
		if (input.KeyCode === Enum.KeyCode.F3) {
			const config = getRVOConfig(context);
			if (config) {
				config.debugDraw = !config.debugDraw;
				print(`RVO Debug: ${config.debugDraw}`);
			}
		}
	});
}
```

#### 2. 可视化 Agent 状态

```typescript
function visualizeAgentsSystem(world: World, context: Context): void {
	for (const [entity, agent, transform] of world.query(RVOAgent, Transform)) {
		const position = transform.cframe.Position;

		// 绘制 Agent 半径
		drawCircle(position, agent.radius, new Color3(0, 1, 0));

		// 绘制速度向量
		if (agent.currentVelocity) {
			const velocity3D = new Vector3(
				agent.currentVelocity.X,
				0,
				agent.currentVelocity.Y,
			);
			drawArrow(position, position.add(velocity3D), new Color3(1, 0, 0));
		}

		// 绘制目标
		if (agent.goalPosition) {
			const goalPos3D = new Vector3(
				agent.goalPosition.X,
				position.Y,
				agent.goalPosition.Y,
			);
			drawLine(position, goalPos3D, new Color3(0, 0, 1));
		}
	}
}
```

#### 3. 日志系统

```typescript
function logAgentDetailsSystem(world: World, context: Context): void {
	const selectedEntity = getSelectedEntity();
	if (selectedEntity === undefined) return;

	const agent = world.get(selectedEntity, RVOAgent);
	if (!agent) return;

	const details = `
Agent Details:
- ID: ${agent.agentId}
- Enabled: ${agent.enabled}
- Position: ${agent.position}
- Velocity: ${agent.currentVelocity}
- Preferred Velocity: ${agent.preferredVelocity}
- Goal: ${agent.goalPosition}
- Radius: ${agent.radius}
- Max Speed: ${agent.maxSpeed}
- Max Neighbors: ${agent.maxNeighbors}
- Neighbor Distance: ${agent.neighborDist}
	`;

	print(details);
}
```

---

## 总结

roblox_rvo 模块提供了强大的群体移动和避障能力。通过合理配置参数、优化性能和遵循最佳实践，你可以创建流畅自然的智能体导航系统。

**关键要点：**

1. **从默认配置开始**，根据实际需求逐步调整
2. **平衡质量和性能**，不要盲目追求最高精度
3. **监控性能指标**，及时发现和解决问题
4. **使用分层策略**，为不同类型的单位设置不同参数
5. **善用调试工具**，快速定位和修复问题

如需更多帮助，请参考：
- [Bevy ECS 文档](../bevy_ecs.md)
- [Transform 组件文档](../bevy_transform.md)
- [RVO2 原始论文](http://gamma.cs.unc.edu/RVO2/)