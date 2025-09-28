# Bevy-Roblox 框架概述与入门指南

> **版本**: 0.1.0
> **最后更新**: 2025-09-28
> **目标平台**: Roblox (roblox-ts)

---

## 📚 目录

1. [框架概述](#第一部分框架概述)
2. [快速入门](#第二部分快速入门)
3. [核心模块导览](#第三部分核心模块导览)
4. [完整示例](#第四部分完整示例)
5. [开发工作流](#第五部分开发工作流)
6. [进阶主题](#第六部分进阶主题)
7. [迁移指南](#第七部分迁移指南)
8. [资源与支持](#第八部分资源与支持)

---

## 第一部分:框架概述

### 1.1 项目简介

Bevy-Roblox 是一个将 Rust 游戏引擎 [Bevy](https://bevyengine.org) 的核心设计理念移植到 Roblox 平台的 TypeScript 框架。它提供了完整的 **实体组件系统 (ECS)** 架构、**模块化插件系统**和**精确的调度管理**,帮助开发者构建大型、可维护的 Roblox 游戏。

**核心特性**:

- 🎯 **ECS 架构**: 基于 @rbxts/matter 实现的高性能实体组件系统
- 🔌 **插件系统**: 灵活的模块化功能扩展机制
- ⏱️ **调度系统**: 精确控制系统执行顺序和时机
- 🛡️ **类型安全**: 充分利用 TypeScript 类型系统,减少运行时错误
- 🎮 **Roblox 集成**: 深度整合 Roblox 服务和事件系统
- 🌐 **网络支持**: 内置客户端-服务端复制系统(规划中)

### 1.2 为什么选择 Bevy-Roblox

#### 传统 Roblox 开发的挑战

```lua
-- 传统方式:代码耦合严重
local player = game.Players.LocalPlayer
local character = player.Character
local humanoid = character:FindFirstChild("Humanoid")
local weapon = player.Backpack:FindFirstChild("Sword")

-- 逻辑分散在各处,难以测试和维护
humanoid.Health = humanoid.Health - 10
weapon.Damage.Value = weapon.Damage.Value * 1.5
```

#### Bevy-Roblox 的优势

```typescript
// ECS 方式:数据驱动,逻辑分离
function combatSystem(world: World, context: Context) {
  for (const [entity, health, weapon] of world.query(Health, Weapon)) {
    if (health.value <= 0) {
      world.despawn(entity);
    }
  }
}

// 系统独立可测,组件可复用
app.addSystems(Update, combatSystem);
```

**关键优势**:

1. **可扩展性**: 通过插件系统轻松添加新功能
2. **可测试性**: 系统函数纯粹,易于单元测试
3. **可维护性**: 关注点分离,代码组织清晰
4. **性能**: Matter ECS 提供高效的查询和更新
5. **团队协作**: 模块化设计便于多人并行开发

### 1.3 框架架构

#### 七层架构设计

```
┌─────────────────────────────────────────────────┐
│  7. Application Layer (应用层)                   │
│     App 实例 - 生命周期管理、错误处理            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  6. Plugin System (插件层)                       │
│     BasePlugin、PluginGroup、默认插件集          │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  5. SubApp System (子应用层)                     │
│     MainSubApp、RenderSubApp、多世界支持         │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  4. Schedule System (调度层)                     │
│     Startup、Update、FixedUpdate 等调度阶段      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  3. ECS Core (ECS 核心层)                        │
│     World、Entity、Component、System、Resource   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  2. Matter Integration (Matter 集成层)           │
│     @rbxts/matter 的封装和扩展                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  1. Roblox Platform (Roblox 平台层)             │
│     RunService、Players、ReplicatedStorage 等    │
└─────────────────────────────────────────────────┘
```

#### 核心概念关系图

```
┌──────────┐      contains      ┌──────────┐
│   App    │ ───────────────→  │  Plugin  │
└──────────┘                    └──────────┘
     │                               │
     │ manages                       │ configures
     ↓                               ↓
┌──────────┐      executes     ┌──────────┐
│ Schedule │ ───────────────→  │  System  │
└──────────┘                    └──────────┘
     │                               │
     │ runs on                       │ operates on
     ↓                               ↓
┌──────────┐      stores       ┌──────────┐
│  World   │ ←───────────────  │Component │
└──────────┘                    └──────────┘
     │
     │ provides
     ↓
┌──────────┐
│ Resource │
└──────────┘
```

### 1.4 与 Rust Bevy 的关系

Bevy-Roblox 忠实移植了 Bevy 的核心设计,但针对 Roblox 平台和 TypeScript 语言特性进行了适配:

| 方面               | Rust Bevy          | Bevy-Roblox              |
| ------------------ | ------------------ | ------------------------ |
| **ECS 实现** | 自研 bevy_ecs      | 基于 @rbxts/matter       |
| **并发模型** | 多线程并行         | 单线程异步               |
| **类型系统** | Rust 所有权        | TypeScript 可选类型      |
| **插件注册** | `add_plugins()`  | `addPlugins()`         |
| **系统调度** | 依赖图并行         | 拓扑排序顺序执行         |
| **资源存储** | World 统一存储     | ResourceManager 独立管理 |
| **事件系统** | EventReader/Writer | Message + Event 双系统   |

**保留的 Bevy 特性**:

- ✅ ECS 架构和数据驱动设计
- ✅ 插件系统和模块化
- ✅ 调度阶段和系统依赖
- ✅ 状态机和计算状态
- ✅ 命令缓冲和延迟执行

**Roblox 特有创新**:

- 🆕 AppContext 扩展系统 (类型安全的插件通信)
- 🆕 Message + Event 双事件系统
- 🆕 RobloxDefaultPlugins (平台适配插件集)
- 🆕 环境感知系统 (自动区分客户端/服务端)

### 1.5 与 Rust Bevy 的区别

- world主体为 matter world, 提供 `resource`,`messages`,`events`, `commands` 访问支持.
- system: wb 的系统不能动态注入参数, 固定为 foo(world,context)
- context: wb 的独有概念, 用来替代 system params, 可以访问所有对象, 可以由其他插件注入快捷访问方式 (扩展).

---

## 第二部分:快速入门

### 2.1 环境准备

#### 系统要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **Roblox Studio**: 最新版本
- **编辑器**: VS Code (推荐) + roblox-ts 扩展

#### 安装工具链

```bash
# 1. 安装 pnpm (如未安装)
npm install -g pnpm

# 2. 安装 roblox-ts 编译器
pnpm install -g roblox-ts

# 3. 验证安装
rbxtsc --version
```

### 2.2 创建项目

```bash
# 1. 创建项目目录
mkdir my-bevy-game
cd my-bevy-game

# 2. 初始化 roblox-ts 项目
pnpm init
pnpm add -D roblox-ts typescript @rbxts/types

# 3. 安装 Bevy-Roblox 框架
pnpm add @white-dragon-bevy/bevy_framework

# 4. 创建 tsconfig.json
cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["@rbxts/types"]
  },
  "include": ["src/**/*"]
}
EOF

# 5. 创建构建脚本
```

在 `package.json` 中添加:

```json
{
  "scripts": {
    "build": "rbxtsc --type game",
    "watch": "rbxtsc --type game --watch"
  }
}
```

### 2.3 Hello World 示例

创建 `src/main.ts`:

```typescript
import { App } from "@white-dragon-bevy/bevy_framework/bevy_app";
import { DefaultPlugins } from "@white-dragon-bevy/bevy_framework/bevy_internal";
import { BuiltinSchedules } from "@white-dragon-bevy/bevy_framework/bevy_app/main-schedule";

/**
 * Hello World 系统
 * 在控制台输出消息
 */
function helloWorldSystem(world: World, context: Context) {
  print("Hello, Bevy-Roblox!");
}

/**
 * 主入口
 */
function main() {
  App.create()
    .addPlugins(DefaultPlugins.create())
    .addSystems(BuiltinSchedules.STARTUP, helloWorldSystem)
    .run();
}

main();
```

编译并运行:

```bash
pnpm build
# 在 Roblox Studio 中打开生成的 .rbxl 文件
```

**预期输出**:

```
Hello, Bevy-Roblox!
```

### 2.4 基础概念介绍

#### 2.4.1 App - 应用实例

App 是整个框架的入口,管理应用生命周期:

```typescript
const app = App.create();  // 创建应用
app.addPlugin(plugin);      // 添加插件
app.addSystems(schedule, system); // 添加系统
app.insertResource(resource);     // 添加资源
app.run();                  // 运行应用
```

#### 2.4.2 Entity - 实体

实体是轻量级 ID,代表游戏中的对象:

```typescript
import { World } from "@rbxts/matter";

function spawnSystem(world: World, context: Context) {
  // 创建实体
  const playerId = world.spawn(
    Position({ x: 0, y: 0, z: 0 }),
    Health({ value: 100 })
  );

  print(`Spawned player: ${playerId}`);
}
```

#### 2.4.3 Component - 组件

组件是纯数据结构,描述实体的属性:

```typescript
import { component } from "@rbxts/matter";

// 位置组件
export const Position = component<{
  x: number;
  y: number;
  z: number;
}>("Position");

// 生命值组件
export const Health = component<{
  value: number;
  max: number;
}>("Health");

// 速度组件
export const Velocity = component<{
  x: number;
  y: number;
  z: number;
}>("Velocity");
```

#### 2.4.4 System - 系统

系统是纯函数,处理具有特定组件的实体:

```typescript
import { World } from "@rbxts/matter";

/**
 * 移动系统 - 根据速度更新位置
 */
function movementSystem(world: World, context: Context) {
  // 查询所有具有 Position 和 Velocity 的实体
  for (const [entity, position, velocity] of world.query(Position, Velocity)) {
    // 更新位置
    world.insert(entity, Position({
      x: position.x + velocity.x,
      y: position.y + velocity.y,
      z: position.z + velocity.z
    }));
  }
}
```

#### 2.4.5 Schedule - 调度

调度控制系统何时执行:

```typescript
import { BuiltinSchedules } from "bevy_app/main-schedule";

// 启动时执行一次
app.addSystems(BuiltinSchedules.STARTUP, setupSystem);

// 每帧执行
app.addSystems(BuiltinSchedules.UPDATE, movementSystem);

// 固定时间步执行 (适合物理)
app.addSystems(BuiltinSchedules.FIXED_UPDATE, physicsSystem);
```

---

## 第三部分:核心模块导览

### 3.1 bevy_app - 应用生命周期

**职责**: 管理应用的创建、配置、运行和清理。

**核心功能**:

- **生命周期管理**: create → addPlugin → finish → run → cleanup
- **插件协调**: 插件注册、依赖解析、构建序列
- **调度管理**: 调度创建、编辑、执行
- **资源管理**: 全局资源的添加、获取、移除
- **错误处理**: 统一的错误捕获和处理机制

**典型使用**:

```typescript
import { App } from "bevy_app";

const app = App.create()
  .addPlugin(new MyPlugin())
  .insertResource(new GameConfig())
  .setErrorHandler((error) => warn(`Error: ${error}`))
  .run();
```

**详细文档**: [bevy_app.md](./bevy_app.md)

### 3.2 bevy_ecs - 实体组件系统

**职责**: 提供 ECS 架构的核心功能,基于 @rbxts/matter 封装。

**核心功能**:

- **World**: 实体和组件的容器
- **Commands**: 延迟执行的结构变更操作
- **Query**: 高效的实体查询
- **Resource**: 全局单例资源管理
- **Messages**: 基于拉取的消息系统
- **Events**: 基于观察者的事件系统

**典型使用**:

```typescript
import { World } from "@rbxts/matter";
import { CommandBuffer } from "bevy_ecs";

function damageSystem(world: World, context: Context) {
  const commands = new CommandBuffer();

  for (const [entity, health] of world.query(Health)) {
    if (health.value <= 0) {
      commands.despawn(entity); // 延迟执行
    }
  }

  commands.flush(world); // 批量执行
}
```

**详细文档**: [bevy_ecs.md](./bevy_ecs.md)

### 3.3 bevy_transform - 变换系统

**职责**: 管理实体的位置、旋转、缩放和父子关系。

**核心功能**:

- **Transform**: 本地变换 (相对父节点)
- **GlobalTransform**: 全局变换 (世界坐标)
- **Parent/Children**: 层级关系管理
- **变换传播**: 自动计算全局变换

**典型使用**:

```typescript
import { Transform, Parent } from "bevy_transform";

function setupHierarchy(world: World, context: Context) {
  // 创建父节点
  const parent = world.spawn(
    Transform({ translation: new Vector3(10, 0, 0) })
  );

  // 创建子节点 (自动继承父节点变换)
  const child = world.spawn(
    Transform({ translation: new Vector3(5, 0, 0) }),
    Parent({ entity: parent })
  );
}
```

**详细文档**: [bevy_transform.md](./bevy_transform.md)

### 3.4 bevy_state - 状态管理

**职责**: 实现有限状态机 (FSM) 和状态驱动的系统调度。

**核心功能**:

- **States**: 枚举状态定义
- **NextState**: 状态转换控制
- **ComputedStates**: 基于其他状态计算的派生状态
- **SubStates**: 依赖父状态的子状态
- **OnEnter/OnExit**: 状态转换时的回调调度

**典型使用**:

```typescript
import { States, NextState, OnEnter, OnExit } from "bevy_state";

enum GameState {
  Menu,
  Playing,
  Paused
}

// 进入 Playing 状态时执行
app.addSystems(OnEnter(GameState.Playing), startGame);

// 在 Playing 状态下每帧执行
app.addSystems(Update, gameplaySystem.runIf(inState(GameState.Playing)));

// 切换状态
function pauseGame(world: World, context: Context) {
  context.app.insertResource(NextState({ state: GameState.Paused }));
}
```

**详细文档**: [bevy_state.md](./bevy_state.md)

### 3.5 bevy_time - 时间系统

**职责**: 提供高精度的时间管理和计时功能。

**核心功能**:

- **Time**: 当前时间和 delta time
- **Timer**: 倒计时和循环计时器
- **Stopwatch**: 秒表计时器
- **Fixed Time**: 固定时间步

**典型使用**:

```typescript
import { Time, Timer } from "bevy_time";

function respawnSystem(world: World, context: Context) {
  const time = context.app.getResource(Time);
  const deltaSeconds = time.deltaSeconds();

  for (const [entity, respawnTimer] of world.query(RespawnTimer)) {
    respawnTimer.tick(deltaSeconds);

    if (respawnTimer.finished()) {
      // 重生逻辑
    }
  }
}
```

**详细文档**: [bevy_time.md](./bevy_time.md)

### 3.6 bevy_input - 输入系统

**职责**: 统一管理键盘、鼠标、触摸和手柄输入。

**核心功能**:

- **ButtonInput**: 按钮输入状态 (按下、刚按下、刚释放)
- **Axis**: 轴输入 (鼠标移动、摇杆)
- **输入映射**: 将硬件输入映射到游戏动作
- **输入历史**: 记录输入序列用于连招检测

**典型使用**:

```typescript
import { KeyCode, ButtonInput } from "bevy_input";

function movementSystem(world: World, context: Context) {
  const keyboard = context.app.getResource(ButtonInput.ofKeyCode());

  if (keyboard.pressed(KeyCode.W)) {
    // 向前移动
  }

  if (keyboard.justPressed(KeyCode.Space)) {
    // 跳跃
  }
}
```

**详细文档**: [bevy_input.md](./bevy_input.md)

### 3.7 bevy_render - 渲染系统

**职责**: 管理 Roblox 实例的可见性和渲染状态。

**核心功能**:

- **Visibility**: 可见性状态 (Visible/Hidden/Inherited)
- **ViewVisibility**: 最终计算的可见性
- **RobloxInstance**: 关联 Roblox 对象
- **可见性传播**: 层级可见性继承

**典型使用**:

```typescript
import { Visibility, VisibilityState, RobloxInstance } from "bevy_render";

function setupRendering(world: World, context: Context) {
  const part = new Instance("Part");
  part.Parent = Workspace;

  world.spawn(
    RobloxInstance({ instance: part }),
    Visibility({ state: VisibilityState.Visible })
  );
}
```

**详细文档**: [bevy_render.md](./bevy_render.md)

### 3.8 bevy_diagnostic - 性能诊断

**职责**: 收集和显示性能指标。

**核心功能**:

- **FPS 诊断**: 帧率监控
- **System Time 诊断**: 系统执行时间
- **Entity Count 诊断**: 实体数量统计
- **内存诊断**: 内存使用监控

**典型使用**:

```typescript
import { DiagnosticsPlugin } from "bevy_diagnostic";

app.addPlugin(new DiagnosticsPlugin());

function displayDiagnostics(world: World, context: Context) {
  const diagnostics = context.app.context.get("diagnostics");
  const fps = diagnostics.getDiagnostic("fps")?.value;

  print(`FPS: ${fps}`);
}
```

**详细文档**: [bevy_diagnostic.md](./bevy_diagnostic.md)

### 3.9 bevy_log - 日志系统

**职责**: 提供结构化日志记录。

**核心功能**:

- **分级日志**: trace/debug/info/warn/error
- **日志过滤**: 按模块或级别过滤
- **日志格式化**: 自定义输出格式
- **日志输出**: 控制台、文件、远程

**典型使用**:

```typescript
import { LogPlugin, log, error } from "bevy_log";

app.addPlugin(new LogPlugin({ level: LogLevel.Info }));

function system(world: World, context: Context) {
  log.info("System executing");
  log.debug("Debug information");
  log.error("An error occurred");
}
```

**详细文档**: [bevy_log.md](./bevy_log.md)

### 3.10 leafwing-input-manager - 高级输入管理

**职责**: 提供灵活的输入映射和动作管理系统。

**核心功能**:

- **Input Mapping**: 将多种输入映射到游戏动作
- **Action States**: 追踪动作状态 (按下、释放、值)
- **Conflict Detection**: 检测和解决输入冲突
- **Input Chords**: 组合键支持
- **Gamepad Support**: 完整的手柄支持

**典型使用**:

```typescript
import { InputMap, ActionState, Actionlike } from "leafwing-input-manager";

enum PlayerAction {
  Move,
  Jump,
  Attack
}

const inputMap = new InputMap<PlayerAction>();
inputMap.insert(PlayerAction.Jump, KeyCode.Space);
inputMap.insert(PlayerAction.Attack, MouseButton.Left);

function playerInputSystem(world: World, context: Context) {
  for (const [entity, actionState] of world.query(ActionState.of<PlayerAction>())) {
    if (actionState.justPressed(PlayerAction.Jump)) {
      // 跳跃逻辑
    }
  }
}
```

**详细文档**: [leafwing-input-manager.md](./leafwing-input-manager.md)

### 3.11 roblox_rvo - 群体避障

**职责**: 实现 RVO (Reciprocal Velocity Obstacles) 算法用于群体寻路和避障。

**核心功能**:

- **RVO Simulator**: 群体模拟核心
- **Agent Management**: 代理的添加、更新、移除
- **Obstacle Support**: 静态和动态障碍物
- **Neighbor Detection**: KD树加速的邻居查询
- **Velocity Computation**: 避障速度计算

**典型使用**:

```typescript
import { RVOSimulator, Vector2 } from "roblox_rvo";

const simulator = new RVOSimulator();

// 添加代理
const agentId = simulator.addAgent(
  new Vector2(0, 0),      // 位置
  15,                      // 邻居距离
  5,                       // 最大邻居数
  1,                       // 时间范围
  2,                       // 半径
  5                        // 最大速度
);

// 每帧更新
function rvoUpdateSystem(world: World, context: Context) {
  simulator.setAgentPrefVelocity(agentId, new Vector2(1, 0));
  simulator.doStep(1/60);

  const newVelocity = simulator.getAgentVelocity(agentId);
  // 应用速度到实体
}
```

**详细文档**: [roblox_rvo.md](./roblox_rvo.md)

### 3.12 bevy_replicon - 网络复制 (规划中)

**职责**: 提供客户端-服务端的自动网络同步。

**规划功能**:

- **组件复制**: 自动同步标记组件
- **事件复制**: 网络事件传输
- **权威性管理**: 客户端预测和服务端校正
- **带宽优化**: 增量更新和压缩

**详细文档**: [bevy_replicon.md](./bevy_replicon.md)

### 3.13 bevy_ecs_debugger - ECS 调试器

**职责**: 提供可视化的 ECS 调试工具。

**核心功能**:

- **实体浏览器**: 查看所有实体和组件
- **系统监控**: 查看系统执行时间
- **查询测试**: 实时测试查询表达式
- **事件日志**: 记录 ECS 操作历史

**详细文档**: [bevy_ecs_debugger.md](./bevy_ecs_debugger.md)

---

## 第四部分:完整示例

### 4.1 简单的移动游戏

这个示例展示如何创建一个可以用键盘控制移动的角色:

```typescript
import { App } from "bevy_app";
import { DefaultPlugins } from "bevy_internal";
import { World, component } from "@rbxts/matter";
import { BuiltinSchedules } from "bevy_app/main-schedule";
import { ButtonInput } from "bevy_input";
import { KeyCode } from "bevy_input/keyboard";
import { Workspace } from "@rbxts/services";

// ============ 组件定义 ============

/** 位置组件 */
const Position = component<{
  x: number;
  y: number;
  z: number;
}>("Position");

/** 速度组件 */
const Velocity = component<{
  x: number;
  y: number;
  z: number;
}>("Velocity");

/** 玩家标记组件 */
const Player = component<{
  speed: number;
}>("Player");

/** Roblox Part 引用组件 */
const PartRef = component<{
  part: Part;
}>("PartRef");

// ============ 系统定义 ============

/**
 * 启动系统 - 创建玩家实体
 */
function setupPlayer(world: World, context: Context) {
  // 创建 Roblox Part
  const part = new Instance("Part");
  part.Name = "Player";
  part.Size = new Vector3(2, 4, 2);
  part.Position = new Vector3(0, 10, 0);
  part.BrickColor = BrickColor.Green();
  part.TopSurface = Enum.SurfaceType.Smooth;
  part.BottomSurface = Enum.SurfaceType.Smooth;
  part.Anchored = false;
  part.Parent = Workspace;

  // 创建 ECS 实体
  const player = world.spawn(
    Player({ speed: 16 }),
    Position({ x: 0, y: 10, z: 0 }),
    Velocity({ x: 0, y: 0, z: 0 }),
    PartRef({ part })
  );

  print(`Player spawned: ${player}`);
}

/**
 * 输入处理系统 - 将键盘输入转换为速度
 */
function playerInputSystem(world: World, context: Context) {
  const keyboard = context.app.getResource(ButtonInput.ofKeyCode());
  if (keyboard === undefined) return;

  for (const [entity, player] of world.query(Player)) {
    let velocityX = 0;
    let velocityZ = 0;

    // WASD 控制
    if (keyboard.pressed(KeyCode.W)) velocityZ -= 1;
    if (keyboard.pressed(KeyCode.S)) velocityZ += 1;
    if (keyboard.pressed(KeyCode.A)) velocityX -= 1;
    if (keyboard.pressed(KeyCode.D)) velocityX += 1;

    // 标准化并应用速度
    const magnitude = math.sqrt(velocityX * velocityX + velocityZ * velocityZ);
    if (magnitude > 0) {
      velocityX = (velocityX / magnitude) * player.speed;
      velocityZ = (velocityZ / magnitude) * player.speed;
    }

    // 更新速度组件
    world.insert(entity, Velocity({ x: velocityX, y: 0, z: velocityZ }));
  }
}

/**
 * 移动系统 - 根据速度更新位置
 */
function movementSystem(world: World, context: Context) {
  const time = context.app.getResource(Time);
  if (time === undefined) return;

  const deltaSeconds = time.deltaSeconds();

  for (const [entity, position, velocity] of world.query(Position, Velocity)) {
    // 更新位置
    const newPosition = Position({
      x: position.x + velocity.x * deltaSeconds,
      y: position.y + velocity.y * deltaSeconds,
      z: position.z + velocity.z * deltaSeconds
    });

    world.insert(entity, newPosition);
  }
}

/**
 * 同步系统 - 将 ECS 位置同步到 Roblox Part
 */
function syncToRobloxSystem(world: World, context: Context) {
  for (const [entity, position, partRef] of world.query(Position, PartRef)) {
    const part = partRef.part;
    if (part && part.Parent !== undefined) {
      part.Position = new Vector3(position.x, position.y, position.z);
    }
  }
}

// ============ 主入口 ============

function main() {
  App.create()
    // 添加默认插件 (包含输入、时间等)
    .addPlugins(DefaultPlugins.create())

    // 启动阶段:创建玩家
    .addSystems(BuiltinSchedules.STARTUP, setupPlayer)

    // 更新阶段:输入 → 移动 → 同步
    .addSystems(
      BuiltinSchedules.UPDATE,
      playerInputSystem,
      movementSystem.after(playerInputSystem),
      syncToRobloxSystem.after(movementSystem)
    )

    // 运行应用
    .run();

  print("Simple movement game started!");
}

main();
```

### 4.2 带状态管理的示例

扩展上面的示例,添加菜单和暂停功能:

```typescript
import { States, NextState, inState, OnEnter, OnExit } from "bevy_state";

// ============ 状态定义 ============

enum GameState {
  Menu,
  Playing,
  Paused
}

// ============ 状态转换系统 ============

/**
 * 进入菜单状态
 */
function enterMenuState(world: World, context: Context) {
  print("=== MENU ===");
  print("Press ENTER to start");
}

/**
 * 进入游戏状态
 */
function enterPlayingState(world: World, context: Context) {
  print("=== GAME STARTED ===");
  print("WASD to move, ESC to pause");
}

/**
 * 进入暂停状态
 */
function enterPausedState(world: World, context: Context) {
  print("=== PAUSED ===");
  print("Press ESC to resume");
}

/**
 * 状态切换系统
 */
function stateControlSystem(world: World, context: Context) {
  const keyboard = context.app.getResource(ButtonInput.ofKeyCode());
  if (keyboard === undefined) return;

  const currentState = context.app.getResource(State.of<GameState>());
  if (currentState === undefined) return;

  switch (currentState.get()) {
    case GameState.Menu:
      if (keyboard.justPressed(KeyCode.Return)) {
        context.app.insertResource(NextState({ state: GameState.Playing }));
      }
      break;

    case GameState.Playing:
      if (keyboard.justPressed(KeyCode.Escape)) {
        context.app.insertResource(NextState({ state: GameState.Paused }));
      }
      break;

    case GameState.Paused:
      if (keyboard.justPressed(KeyCode.Escape)) {
        context.app.insertResource(NextState({ state: GameState.Playing }));
      }
      break;
  }
}

// ============ 主入口 (修改版) ============

function mainWithStates() {
  App.create()
    .addPlugins(DefaultPlugins.create())

    // 初始化状态
    .initState(GameState.Menu)

    // 状态转换回调
    .addSystems(OnEnter(GameState.Menu), enterMenuState)
    .addSystems(OnEnter(GameState.Playing), enterPlayingState)
    .addSystems(OnEnter(GameState.Paused), enterPausedState)

    // 只在 Playing 状态创建玩家
    .addSystems(
      OnEnter(GameState.Playing),
      setupPlayer
    )

    // 状态切换控制 (总是运行)
    .addSystems(BuiltinSchedules.UPDATE, stateControlSystem)

    // 游戏系统 (只在 Playing 状态运行)
    .addSystems(
      BuiltinSchedules.UPDATE,
      playerInputSystem.runIf(inState(GameState.Playing)),
      movementSystem.runIf(inState(GameState.Playing)),
      syncToRobloxSystem.runIf(inState(GameState.Playing))
    )

    .run();
}

mainWithStates();
```

### 4.3 战斗系统示例

展示更复杂的交互:

```typescript
// ============ 额外组件 ============

/** 生命值组件 */
const Health = component<{
  current: number;
  max: number;
}>("Health");

/** 武器组件 */
const Weapon = component<{
  damage: number;
  cooldown: number;
  lastAttackTime: number;
}>("Weapon");

/** 敌人标记 */
const Enemy = component<{
  aiType: "Aggressive" | "Passive";
}>("Enemy");

// ============ 战斗系统 ============

/**
 * 攻击系统
 */
function attackSystem(world: World, context: Context) {
  const time = context.app.getResource(Time);
  const keyboard = context.app.getResource(ButtonInput.ofKeyCode());
  if (time === undefined || keyboard === undefined) return;

  const currentTime = time.elapsedSeconds();

  // 玩家攻击
  for (const [playerEntity, playerPos, weapon] of world.query(Player, Position, Weapon)) {
    // 检查冷却
    if (currentTime - weapon.lastAttackTime < weapon.cooldown) continue;

    // 按空格攻击
    if (keyboard.justPressed(KeyCode.Space)) {
      // 查找附近的敌人
      for (const [enemyEntity, enemyPos, enemyHealth] of world.query(Enemy, Position, Health)) {
        const distance = math.sqrt(
          (playerPos.x - enemyPos.x) ** 2 +
          (playerPos.z - enemyPos.z) ** 2
        );

        // 攻击范围 5 单位
        if (distance <= 5) {
          // 造成伤害
          const newHealth = math.max(0, enemyHealth.current - weapon.damage);
          world.insert(enemyEntity, Health({
            current: newHealth,
            max: enemyHealth.max
          }));

          print(`Hit enemy ${enemyEntity} for ${weapon.damage} damage!`);

          // 更新冷却
          world.insert(playerEntity, Weapon({
            ...weapon,
            lastAttackTime: currentTime
          }));

          break; // 每次只攻击一个敌人
        }
      }
    }
  }
}

/**
 * 死亡系统
 */
function deathSystem(world: World, context: Context) {
  const commands = new CommandBuffer();

  for (const [entity, health, partRef] of world.query(Health, PartRef)) {
    if (health.current <= 0) {
      // 销毁 Roblox Part
      if (partRef.part && partRef.part.Parent) {
        partRef.part.Destroy();
      }

      // 销毁实体
      commands.despawn(entity);
      print(`Entity ${entity} died`);
    }
  }

  commands.flush(world);
}

/**
 * 生成敌人
 */
function spawnEnemy(world: World, context: Context, position: Vector3) {
  const part = new Instance("Part");
  part.Name = "Enemy";
  part.Size = new Vector3(2, 4, 2);
  part.Position = position;
  part.BrickColor = BrickColor.Red();
  part.TopSurface = Enum.SurfaceType.Smooth;
  part.BottomSurface = Enum.SurfaceType.Smooth;
  part.Anchored = false;
  part.Parent = Workspace;

  const enemy = world.spawn(
    Enemy({ aiType: "Aggressive" }),
    Position({ x: position.X, y: position.Y, z: position.Z }),
    Health({ current: 50, max: 50 }),
    PartRef({ part })
  );

  print(`Enemy spawned: ${enemy}`);
}

/**
 * 敌人生成系统
 */
function enemySpawnerSystem(world: World, context: Context) {
  const time = context.app.getResource(Time);
  if (time === undefined) return;

  // 每5秒生成一个敌人
  if (math.floor(time.elapsedSeconds()) % 5 === 0 &&
      time.deltaSeconds() < 0.05) { // 防止同一秒内多次生成
    const angle = math.random() * 2 * math.pi;
    const distance = 20;
    const x = math.cos(angle) * distance;
    const z = math.sin(angle) * distance;

    spawnEnemy(world, context, new Vector3(x, 10, z));
  }
}
```

---

## 第五部分:开发工作流

### 5.1 推荐项目结构

```
my-bevy-game/
├── src/
│   ├── shared/              # 客户端+服务端共享代码
│   │   ├── components/      # 组件定义
│   │   │   ├── player.ts
│   │   │   ├── combat.ts
│   │   │   └── index.ts
│   │   ├── systems/         # 系统实现
│   │   │   ├── movement.ts
│   │   │   ├── combat.ts
│   │   │   └── index.ts
│   │   ├── resources/       # 资源定义
│   │   │   ├── game-config.ts
│   │   │   └── index.ts
│   │   └── states/          # 状态定义
│   │       ├── game-state.ts
│   │       └── index.ts
│   │
│   ├── server/              # 服务端专用
│   │   ├── plugins/
│   │   │   └── server-plugin.ts
│   │   ├── systems/
│   │   │   └── server-systems.ts
│   │   └── main.server.ts
│   │
│   ├── client/              # 客户端专用
│   │   ├── plugins/
│   │   │   └── ui-plugin.ts
│   │   ├── systems/
│   │   │   └── render-systems.ts
│   │   └── main.client.ts
│   │
│   └── tests/               # 单元测试
│       ├── components.spec.ts
│       └── systems.spec.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

### 5.2 开发流程

#### 5.2.1 常用命令

```bash
# 开发模式 (自动重新编译)
pnpm watch

# 生产构建
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

#### 5.2.2 组件开发工作流

1. **定义组件**

```typescript
// src/shared/components/player.ts
import { component } from "@rbxts/matter";

export const Player = component<{
  name: string;
  level: number;
}>("Player");
```

2. **创建系统**

```typescript
// src/shared/systems/level-up.ts
import { World } from "@rbxts/matter";
import { Player } from "../components/player";

export function levelUpSystem(world: World, context: Context) {
  for (const [entity, player] of world.query(Player)) {
    // 升级逻辑
  }
}
```

3. **注册到插件**

```typescript
// src/shared/plugins/gameplay-plugin.ts
import { BasePlugin } from "bevy_app";
import { levelUpSystem } from "../systems/level-up";

export class GameplayPlugin extends BasePlugin {
  build(app: App) {
    app.addSystems(BuiltinSchedules.UPDATE, levelUpSystem);
  }

  name() { return "GameplayPlugin"; }
}
```

4. **添加到应用**

```typescript
// src/main.ts
import { GameplayPlugin } from "./shared/plugins/gameplay-plugin";

App.create()
  .addPlugin(new GameplayPlugin())
  .run();
```

### 5.3 调试技巧

#### 5.3.1 启用调试日志

```typescript
import { LogPlugin, LogLevel } from "bevy_log";

app.addPlugin(new LogPlugin({
  level: LogLevel.Debug,
  filter: "my_game.*"  // 只显示 my_game 模块的日志
}));
```

#### 5.3.2 使用 ECS 调试器

```typescript
import { ECSDebuggerPlugin } from "bevy_ecs_debugger";

app.addPlugin(new ECSDebuggerPlugin({
  enableEntityBrowser: true,
  enableSystemProfiler: true
}));
```

按 F9 打开调试器界面,可以:

- 查看所有实体和组件
- 监控系统执行时间
- 实时测试查询

#### 5.3.3 性能分析

```typescript
import { DiagnosticsPlugin, FrameTimeDiagnosticsPlugin } from "bevy_diagnostic";

app.addPlugin(new DiagnosticsPlugin());
app.addPlugin(new FrameTimeDiagnosticsPlugin());

function displayPerf(world: World, context: Context) {
  const diagnostics = context.app.context.get("diagnostics");

  const fps = diagnostics.getDiagnostic("fps")?.value ?? 0;
  const frameTime = diagnostics.getDiagnostic("frame_time")?.value ?? 0;

  print(`FPS: ${fps.toFixed(1)}, Frame Time: ${frameTime.toFixed(2)}ms`);
}

app.addSystems(BuiltinSchedules.UPDATE, displayPerf);
```

#### 5.3.4 条件断点调试

```typescript
function debugSystem(world: World, context: Context) {
  for (const [entity, player] of world.query(Player)) {
    if (player.level > 10) {
      // 在这里设置断点,只在 level > 10 时触发
      print(`High level player: ${entity}`);
    }
  }
}
```

### 5.4 性能优化指南

#### 5.4.1 使用 queryChanged 减少迭代

```typescript
// ❌ 低效:每次都遍历所有实体
function badSystem(world: World, context: Context) {
  for (const [entity, transform] of world.query(Transform)) {
    updateTransform(transform);
  }
}

// ✅ 高效:只处理变更的实体
function goodSystem(world: World, context: Context) {
  for (const [entity, transform] of world.queryChanged(Transform)) {
    updateTransform(transform);
  }
}
```

#### 5.4.2 批量执行 Commands

```typescript
function spawnManyEntities(world: World, context: Context) {
  const commands = new CommandBuffer();

  // 批量添加实体
  for (let index = 0; index < 100; index++) {
    commands.spawn([
      Position({ x: index, y: 0, z: 0 }),
      Health({ current: 100, max: 100 })
    ]);
  }

  // 一次性执行所有命令
  commands.flush(world);
}
```

#### 5.4.3 缓存频繁访问的资源

```typescript
// ❌ 每次都获取
function badSystem(world: World, context: Context) {
  for (const [entity] of world.query(Enemy)) {
    const config = context.app.getResource(GameConfig);
    // 使用 config
  }
}

// ✅ 缓存到系统外
function goodSystem(world: World, context: Context) {
  const config = context.app.getResource(GameConfig);
  if (config === undefined) return;

  for (const [entity] of world.query(Enemy)) {
    // 使用缓存的 config
  }
}
```

#### 5.4.4 使用运行条件跳过不必要的系统

```typescript
// 只在有敌人时运行 AI 系统
function hasEnemies(world: World, context: Context) {
  for (const _ of world.query(Enemy)) {
    return true;
  }
  return false;
}

app.addSystems(
  BuiltinSchedules.UPDATE,
  aiSystem.runIf(hasEnemies)
);
```

---

## 第六部分:进阶主题

### 6.1 插件开发

#### 6.1.1 创建自定义插件

```typescript
import { BasePlugin, App } from "bevy_app";

export class CustomPlugin extends BasePlugin {
  build(app: App): void {
    // 添加资源
    app.insertResource(new CustomResource());

    // 添加系统
    app.addSystems(BuiltinSchedules.STARTUP, setupSystem);
    app.addSystems(BuiltinSchedules.UPDATE, updateSystem);

    // 注册扩展 (供其他插件访问)
    this.registerExtension(app, "custom", {
      doSomething: () => { /* ... */ }
    });
  }

  ready(app: App): void {
    // 检查依赖
    const required = app.context.get("someRequiredPlugin");
    if (required === undefined) {
      error("CustomPlugin requires SomeRequiredPlugin");
    }
  }

  finish(app: App): void {
    // 完成配置
    print("CustomPlugin initialized");
  }

  cleanup(app: App): void {
    // 清理资源
  }

  name() { return "CustomPlugin"; }
}
```

#### 6.1.2 插件扩展接口

```typescript
// custom-plugin-extension.ts
export interface CustomPluginExtension {
  getValue(): number;
  setValue(value: number): void;
}

declare module "bevy_app/extensions" {
  interface PluginExtensions {
    "custom": CustomPluginExtension;
  }
}

// custom-plugin.ts
export class CustomPlugin extends BasePlugin {
  private value = 0;

  build(app: App) {
    this.registerExtension(app, "custom", {
      getValue: () => this.value,
      setValue: (v) => { this.value = v; }
    });
  }

  name() { return "CustomPlugin"; }
}

// 使用
function someSystem(world: World, context: Context) {
  const custom = context.app.context.get("custom"); // 完整类型提示
  custom.setValue(42);
}
```

### 6.2 自定义系统配置

#### 6.2.1 系统依赖

```typescript
app.addSystems(
  BuiltinSchedules.UPDATE,

  // 基础系统
  inputSystem,

  // 依赖 inputSystem
  movementSystem.after(inputSystem),

  // 依赖 movementSystem
  collisionSystem.after(movementSystem),

  // 依赖 collisionSystem
  renderSystem.after(collisionSystem)
);
```

#### 6.2.2 系统集

```typescript
// 定义系统集
app.configureSet(BuiltinSchedules.UPDATE, "Physics", {
  before: "Rendering"
});

// 添加系统到集合
app.addSystems(
  BuiltinSchedules.UPDATE,

  physicsSystem1.inSet("Physics"),
  physicsSystem2.inSet("Physics"),

  renderSystem.inSet("Rendering")
);
```

#### 6.2.3 运行条件组合

```typescript
import { andCondition, orCondition, notCondition, inState } from "bevy_state";

// 只在 Playing 状态且有玩家时运行
app.addSystems(
  BuiltinSchedules.UPDATE,
  gameplaySystem.runIf(
    andCondition(
      inState(GameState.Playing),
      hasPlayers
    )
  )
);

// 在 Menu 或 Paused 状态时运行
app.addSystems(
  BuiltinSchedules.UPDATE,
  uiSystem.runIf(
    orCondition(
      inState(GameState.Menu),
      inState(GameState.Paused)
    )
  )
);
```

### 6.3 网络多人游戏 (规划中)

#### 6.3.1 组件复制

```typescript
import { Replicated } from "bevy_replicon";

// 标记需要复制的组件
world.spawn(
  Player({ name: "Alice" }),
  Health({ current: 100 }),
  Replicated() // 自动同步到所有客户端
);
```

#### 6.3.2 客户端预测

```typescript
function clientPredictionSystem(world: World, context: Context) {
  // 客户端:立即应用输入
  if (context.app.getResource(RobloxContext) === RobloxContext.Client) {
    for (const [entity, input, position] of world.query(Input, Position)) {
      // 预测新位置
      const predictedPos = calculateNewPosition(position, input);
      world.insert(entity, position);
    }
  }

  // 服务端:权威计算
  if (context.app.getResource(RobloxContext) === RobloxContext.Server) {
    for (const [entity, input, position] of world.query(Input, Position)) {
      const authorativePos = calculateNewPosition(position, input);
      world.insert(entity, authorativePos);
      // 自动复制到客户端,客户端会校正预测误差
    }
  }
}
```

### 6.4 高级优化技巧

#### 6.4.1 空间分区

```typescript
import { KDTree } from "some-spatial-library";

class SpatialIndex {
  private tree: KDTree;

  update(world: World) {
    this.tree.clear();

    for (const [entity, position] of world.query(Position)) {
      this.tree.insert(entity, [position.x, position.z]);
    }
  }

  queryNearby(position: Position, radius: number) {
    return this.tree.radiusSearch([position.x, position.z], radius);
  }
}

// 在系统中使用
function nearbyQuerySystem(world: World, context: Context) {
  const spatial = context.app.getResource(SpatialIndex);

  for (const [entity, position] of world.query(Player, Position)) {
    const nearby = spatial.queryNearby(position, 10);
    // 只处理附近的实体
  }
}
```

#### 6.4.2 懒加载插件

```typescript
class LazyLoadPlugin extends BasePlugin {
  private loaded = false;

  build(app: App) {
    // 初始只注册轻量级系统
    app.addSystems(BuiltinSchedules.UPDATE, this.checkLoadCondition);
  }

  private checkLoadCondition = (world: World, context: Context) => {
    if (this.shouldLoad() && !this.loaded) {
      // 动态加载重量级系统
      context.app.addSystems(BuiltinSchedules.UPDATE, heavySystem);
      this.loaded = true;
    }
  };

  private shouldLoad(): boolean {
    // 检查加载条件 (如玩家数量、关卡进度等)
    return true;
  }

  name() { return "LazyLoadPlugin"; }
}
```

---

## 第七部分:迁移指南

### 7.1 从 Rust Bevy 迁移

#### 7.1.1 类型映射

| Rust Bevy          | Roblox-TS                | 说明                       |
| ------------------ | ------------------------ | -------------------------- |
| `Entity`         | `Entity (number)`      | Matter 使用数字作为实体 ID |
| `Component`      | `component<T>()`       | Matter 组件工厂函数        |
| `Resource`       | `object`               | 任意对象都可作为资源       |
| `Query<&T>`      | `world.query(T)`       | 查询语法略有不同           |
| `Commands`       | `CommandBuffer`        | 自定义实现,API 类似        |
| `EventReader<T>` | `MessageReader<T>`     | 基于拉取的消息系统         |
| `ResMut<T>`      | `app.getResource<T>()` | 直接获取可变引用           |

#### 7.1.2 API 对照

**Rust Bevy**:

```rust
fn my_system(
    mut commands: Commands,
    query: Query<&Transform, With<Player>>,
    time: Res<Time>
) {
    for transform in query.iter() {
        // 逻辑
    }
}

app.add_systems(Update, my_system);
```

**Roblox-TS**:

```typescript
function mySystem(world: World, context: Context) {
  const commands = new CommandBuffer();
  const time = context.app.getResource(Time);

  for (const [entity, transform] of world.query(Transform, Player)) {
    // 逻辑
  }

  commands.flush(world);
}

app.addSystems(BuiltinSchedules.UPDATE, mySystem);
```

#### 7.1.3 常见迁移问题

**问题 1: 生命周期和借用检查**

Rust:

```rust
fn system(query: Query<&mut Transform>) {
    // 编译器保证不会有数据竞争
}
```

TypeScript:

```typescript
// 需要手动确保不会同时修改同一组件
function system(world: World, context: Context) {
  // 使用约定:在迭代中只读,使用 Commands 延迟写入
}
```

**解决方案**: 遵循 ECS 最佳实践,避免在迭代中直接修改数据。

**问题 2: 泛型约束**

Rust:

```rust
fn generic_system<T: Component>(query: Query<&T>) {
    // ...
}
```

TypeScript:

```typescript
// TypeScript 泛型无法直接用于运行时
// 解决方案:使用工厂函数
function createGenericSystem<T>(componentType: ComponentType<T>) {
  return (world: World, context: Context) => {
    for (const [entity, component] of world.query(componentType)) {
      // ...
    }
  };
}
```

### 7.2 从原生 Roblox 迁移

#### 7.2.1 重构传统代码

**传统 Roblox Lua**:

```lua
-- 面向对象+服务模式
local PlayerService = {}

function PlayerService:CreatePlayer(player)
    local character = player.Character
    local humanoid = character:WaitForChild("Humanoid")

    humanoid.Died:Connect(function()
        self:OnPlayerDied(player)
    end)
end

function PlayerService:OnPlayerDied(player)
    -- 复活逻辑
end

return PlayerService
```

**Bevy-Roblox**:

```typescript
// ECS 模式

// 组件
const PlayerCharacter = component<{
  character: Model;
  humanoid: Humanoid;
}>("PlayerCharacter");

const Health = component<{
  current: number;
  max: number;
}>("Health");

// 系统
function deathDetectionSystem(world: World, context: Context) {
  for (const [entity, char, health] of world.query(PlayerCharacter, Health)) {
    if (char.humanoid.Health <= 0 && health.current > 0) {
      // 标记为死亡
      world.insert(entity, Health({ current: 0, max: health.max }));
    }
  }
}

function respawnSystem(world: World, context: Context) {
  const commands = new CommandBuffer();

  for (const [entity, health] of world.query(Health)) {
    if (health.current <= 0) {
      // 重生逻辑
      commands.insert(entity, Health({ current: health.max, max: health.max }));
    }
  }

  commands.flush(world);
}

// 注册
app.addSystems(BuiltinSchedules.UPDATE, deathDetectionSystem, respawnSystem);
```

#### 7.2.2 重构指南

**步骤 1: 识别数据和行为**

- 将类的属性转换为组件
- 将类的方法转换为系统

**步骤 2: 分解大类**

```typescript
// 传统:一个大类
class Player {
  health: number;
  position: Vector3;
  inventory: Item[];

  move() { }
  takeDamage() { }
  pickupItem() { }
}

// ECS:多个小组件 + 专用系统
const Health = component<{ current: number }>();
const Position = component<{ x: number, y: number, z: number }>();
const Inventory = component<{ items: Item[] }>();

function movementSystem(world: World, context: Context) { }
function combatSystem(world: World, context: Context) { }
function inventorySystem(world: World, context: Context) { }
```

**步骤 3: 使用组合代替继承**

```typescript
// 传统:继承
class Character { }
class Player extends Character { }
class Enemy extends Character { }

// ECS:组合
world.spawn(Player(), Health(), Position()); // 玩家实体
world.spawn(Enemy(), Health(), Position(), AI()); // 敌人实体
```

### 7.3 常见模式转换

#### 7.3.1 单例 → Resource

```typescript
// 传统单例
class GameManager {
  private static instance: GameManager;

  static getInstance() {
    if (!this.instance) {
      this.instance = new GameManager();
    }
    return this.instance;
  }
}

// ECS 资源
class GameConfig {
  maxPlayers = 16;
  roundDuration = 300;
}

app.insertResource(new GameConfig());

function useConfig(world: World, context: Context) {
  const config = context.app.getResource(GameConfig);
}
```

#### 7.3.2 事件监听 → ECS Events

```typescript
// 传统事件
const onPlayerJoined = new Signal<(player: Player) => void>();
onPlayerJoined.Connect((player) => {
  print(`${player.Name} joined`);
});

// ECS 事件
class PlayerJoinedEvent {
  constructor(public player: Player) {}
}

function playerJoinSystem(world: World, context: Context) {
  const reader = context.app.getResource(MessageReader.of<PlayerJoinedEvent>());

  for (const event of reader.read()) {
    print(`${event.player.Name} joined`);
  }
}
```

---

## 第八部分:资源与支持

### 8.1 文档链接

#### 核心文档

- [bevy_app - 应用系统](./bevy_app.md)
- [bevy_ecs - ECS 核心](./bevy_ecs.md)
- [bevy_transform - 变换系统](./bevy_transform.md)
- [bevy_state - 状态管理](./bevy_state.md)
- [bevy_time - 时间系统](./bevy_time.md)
- [bevy_input - 输入系统](./bevy_input.md)

#### 扩展模块

- [leafwing-input-manager - 高级输入](./leafwing-input-manager.md)
- [roblox_rvo - 群体避障](./roblox_rvo.md)
- [bevy_render - 渲染系统](./bevy_render.md)
- [bevy_diagnostic - 性能诊断](./bevy_diagnostic.md)
- [bevy_log - 日志系统](./bevy_log.md)

#### 参考

- [架构分析报告](../.audit/architecture-analysis.md)
- [Rust Bevy 官方文档](https://docs.rs/bevy)
- [@rbxts/matter 文档](https://matter.lua.org)

### 8.2 社区资源

#### 学习资源

- **Bevy 官方示例**: [GitHub - bevyengine/bevy/examples](https://github.com/bevyengine/bevy/tree/main/examples)
- **ECS 设计模式**: [Game Programming Patterns - Component](https://gameprogrammingpatterns.com/component.html)
- **roblox-ts 指南**: [roblox-ts.com](https://roblox-ts.com)

#### 相关项目

- **Bevy (Rust)**: [bevyengine.org](https://bevyengine.org)
- **Matter (Lua)**: [matter.lua.org](https://matter.lua.org)
- **Plasma (Roblox UI)**: [@rbxts/plasma](https://www.npmjs.com/package/@rbxts/plasma)

### 8.3 常见问题 (FAQ)

#### Q1: Bevy-Roblox 与原生 Roblox 开发有何区别？

**A**: Bevy-Roblox 提供了 ECS 架构和模块化插件系统,更适合大型项目。原生 Roblox 开发更简单直接,适合小型项目。选择取决于项目规模和团队经验。

#### Q2: 性能会不会比原生 Lua 差？

**A**: TypeScript 会编译为 Lua,有轻微的性能开销,但 ECS 的数据局部性和批处理优势可以弥补。对于正确设计的系统,性能与原生 Lua 相当甚至更好。

#### Q3: 如何在现有项目中逐步引入 Bevy-Roblox？

**A**: 可以从单个模块开始,例如先用 ECS 重构战斗系统,其他部分保持原样。Bevy-Roblox 可以与传统代码共存。

#### Q4: 团队成员需要学习 Rust 吗？

**A**: 不需要。虽然框架移植自 Bevy,但 API 是 TypeScript 风格的。了解 Bevy 概念有帮助,但不是必须。

#### Q5: 支持哪些 Roblox 版本？

**A**: 框架使用标准 Roblox API,兼容所有现代 Roblox Studio 版本。建议使用最新稳定版。

#### Q6: 如何调试 ECS 系统？

**A**:

1. 使用 bevy_ecs_debugger 插件查看实体和组件
2. 启用 bevy_log 插件记录系统执行
3. 使用 bevy_diagnostic 插件监控性能
4. VS Code 断点调试仍然可用

#### Q7: 如何处理客户端-服务端通信？

**A**: bevy_replicon 模块(规划中)将提供自动复制。当前可以使用传统 RemoteEvents 配合 ECS:

```typescript
// 服务端
function serverSystem(world: World, context: Context) {
  const event = new Instance("RemoteEvent");

  for (const [entity, data] of world.query(NeedSync)) {
    event.FireAllClients(entity, data);
  }
}

// 客户端
function clientSystem(world: World, context: Context) {
  event.OnClientEvent.Connect((entity, data) => {
    world.insert(entity, data);
  });
}
```

#### Q8: 可以与现有 Roblox 库一起使用吗？

**A**: 可以。Bevy-Roblox 不会替代 Roblox API,只是提供了更好的代码组织方式。你仍然可以使用 Roact、Rodux 等库。

#### Q9: 如何测试系统？

**A**: 系统是纯函数,易于单元测试:

```typescript
import { TestEZ } from "@rbxts/testez";
import { World } from "@rbxts/matter";

export = () => {
  it("movement system updates position", () => {
    const world = new World();
    const entity = world.spawn(
      Position({ x: 0, y: 0 }),
      Velocity({ x: 1, y: 0 })
    );

    const context = { app: mockApp }; // 模拟 context
    movementSystem(world, context);

    const position = world.get(entity, Position);
    expect(position.x).to.equal(1);
  });
};
```

#### Q10: 如何贡献代码？

**A**:

1. Fork 项目仓库
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request
5. 等待审核

遵循项目的代码规范和提交规范。

---

## 附录:快速参考卡

### 常用导入

```typescript
// 核心
import { App } from "bevy_app";
import { World, component } from "@rbxts/matter";
import { BuiltinSchedules } from "bevy_app/main-schedule";

// 插件
import { DefaultPlugins } from "bevy_internal";
import { RobloxRunnerPlugin } from "bevy_app/roblox-adapters";

// ECS
import { CommandBuffer } from "bevy_ecs";
import { MessageWriter, MessageReader } from "bevy_ecs";

// 状态
import { States, NextState, inState, OnEnter, OnExit } from "bevy_state";

// 输入
import { ButtonInput, KeyCode, MouseButton } from "bevy_input";

// 时间
import { Time, Timer, Stopwatch } from "bevy_time";

// 变换
import { Transform, GlobalTransform, Parent, Children } from "bevy_transform";
```

### 常用模式

```typescript
// 创建应用
const app = App.create()
  .addPlugins(DefaultPlugins.create())
  .addSystems(BuiltinSchedules.UPDATE, mySystem)
  .run();

// 定义组件
const MyComponent = component<{ value: number }>("MyComponent");

// 生成实体
const entity = world.spawn(MyComponent({ value: 42 }));

// 查询实体
for (const [entity, comp] of world.query(MyComponent)) {
  // 处理
}

// 使用命令
const commands = new CommandBuffer();
commands.spawn([MyComponent({ value: 42 })]);
commands.flush(world);

// 获取资源
const time = app.getResource(Time);

// 切换状态
app.insertResource(NextState({ state: GameState.Playing }));
```

---

**祝你使用 Bevy-Roblox 框架开发愉快！** 🎮

如有问题,请查阅详细文档或在社区提问。
