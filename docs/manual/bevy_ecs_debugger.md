# Bevy ECS Debugger 操作手册

> **版本**: 1.0.0
> **最后更新**: 2025-09-28
> **模块路径**: `src/bevy_ecs_debugger`

---

## 目录

1. [模块概述](#模块概述)
2. [核心概念](#核心概念)
3. [快速入门](#快速入门)
4. [调试工具](#调试工具)
5. [API 详解](#api-详解)
6. [实战示例](#实战示例)
7. [最佳实践](#最佳实践)
8. [故障排除](#故障排除)
9. [性能考虑](#性能考虑)

---

## 模块概述

### 简介

`bevy_ecs_debugger` 模块为 Bevy TypeScript 项目提供了强大的 Matter ECS 可视化调试功能。它集成了基于 Plasma UI 的实时调试界面，允许开发者在运行时检查和监控 ECS 世界中的实体、组件、系统和性能指标。

### 主要功能

- **🔍 实时实体检查器**: 查看所有活动实体及其组件数据
- **🎮 系统监控**: 监控系统执行顺序、性能和调用栈
- **📊 性能分析**: 实时性能分析和性能瓶颈识别
- **🎯 3D 模型关联**: 支持将 ECS 实体与游戏中的 3D 模型关联
- **🔐 权限管理**: 基于 Roblox 群组的访问控制
- **🔥 热重载支持**: 支持开发中的系统热替换
- **💬 便捷控制**: 支持快捷键和聊天命令
- **🌐 双端调试**: 服务端和客户端都可独立调试

### 架构设计

```
bevy_ecs_debugger/
├── debugger.ts              # 调试器工厂函数
├── debugger-plugin.ts       # Bevy 插件实现
├── types.ts                 # 类型定义
├── prelude.ts              # 常用导出
└── matter-debugger/         # Matter 调试器实现（Luau）
    ├── debugger.luau        # 核心调试器逻辑
    ├── ui.luau              # UI 渲染
    ├── clientBindings.luau  # 客户端绑定
    ├── EventBridge.luau     # 事件桥接
    └── widgets/             # UI 组件库
        ├── panel.luau       # 面板组件
        ├── worldInspect.luau    # 世界检查器
        ├── entityInspect.luau   # 实体检查器
        ├── selectionList.luau   # 选择列表
        └── ...
```

---

## 核心概念

### 1. 调试器实例 (Debugger Instance)

调试器实例是整个调试系统的核心，负责：
- 管理调试界面的显示和隐藏
- 处理实体和组件的检查
- 协调系统监控和性能分析
- 管理客户端/服务端视图切换

### 2. 权限系统 (Authorization System)

调试器使用两级权限验证：

1. **Studio 模式**: 在 Roblox Studio 中始终可用
2. **群组权限**: 在游戏中，只有指定群组的 Admin 或 Owner 可访问

### 3. 视图切换 (Realm Switching)

调试器支持在客户端查看服务端的 ECS 状态：
- **客户端视图**: 查看本地客户端的 ECS 世界
- **服务端视图**: 在客户端查看服务端的 ECS 世界（通过网络同步）

### 4. 实体-模型关联 (Entity-Model Mapping)

通过 `getRenderableComponent` 函数，调试器可以：
- 在 3D 视图中高亮显示选中的实体
- 通过点击 3D 模型选择对应的实体
- 在实体检查器中显示模型信息

### 5. 性能分析 (Profiling)

调试器集成了 Matter Loop 的性能分析功能：
- 记录每个系统的执行时间
- 显示系统调用频率
- 识别性能瓶颈

---

## 快速入门

### 基础安装

#### 1. 最简单的使用方式

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";

const app = new App();

// 添加调试器插件（使用默认配置）
app.addPlugin(new DebuggerPlugin());

// 运行应用
app.run();
```

#### 2. 自定义配置

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin, type DebuggerOptions } from "./bevy_ecs_debugger";

const app = new App();

// 自定义调试器配置
const debuggerOptions: DebuggerOptions = {
	toggleKey: Enum.KeyCode.F5,  // 改为 F5 键切换
	groupId: 123456,              // 你的 Roblox 群组 ID
};

app.addPlugin(new DebuggerPlugin(debuggerOptions));

app.run();
```

### 使用 Prelude 导入

```typescript
import { DebuggerPlugin, DefaultDebuggerOptions } from "./bevy_ecs_debugger/prelude";

const app = new App();
app.addPlugin(new DebuggerPlugin({
	...DefaultDebuggerOptions,
	groupId: 123456,  // 覆盖默认群组 ID
}));
```

### 启用调试器

调试器添加后，可以通过以下方式启用：

1. **快捷键**: 按 `F4`（或自定义的按键）
2. **聊天命令**: 输入 `/matter` 或 `/matterdebug`

---

## 调试工具

### 1. 世界检查器 (World Inspector)

世界检查器显示 ECS 世界的全局状态。

#### 功能特性

- **实体列表**: 显示所有活动实体的 ID
- **组件统计**: 显示每种组件的实例数量
- **系统列表**: 显示所有注册的系统
- **性能总览**: 显示整体性能指标

#### 使用方式

打开调试器后，默认显示世界检查器界面。在左侧面板可以看到：

```
📦 World Overview
   Entities: 150
   Components: 12 types
   Systems: 25
   FPS: 60
```

### 2. 实体检查器 (Entity Inspector)

实体检查器用于详细查看单个实体的信息。

#### 功能特性

- **实体 ID**: 显示实体的唯一标识符
- **组件列表**: 显示该实体拥有的所有组件
- **组件数据**: 实时查看和监控组件的属性值
- **模型关联**: 如果配置了模型关联，可以在 3D 视图中高亮显示

#### 使用方式

1. 在实体列表中点击实体 ID
2. 或在 3D 视图中点击关联的模型

查看器将显示：

```
🎯 Entity #42
   Components:
   ├── Transform
   │   ├── position: (10, 5, 20)
   │   └── rotation: (0, 90, 0)
   ├── Health
   │   ├── current: 80
   │   └── max: 100
   └── Velocity
       └── value: (1.5, 0, 0)
```

### 3. 系统监控器 (System Monitor)

系统监控器显示所有系统的执行信息。

#### 功能特性

- **系统列表**: 显示所有注册的系统
- **执行顺序**: 显示系统的执行顺序和调度阶段
- **性能数据**: 显示每个系统的执行时间
- **调用统计**: 显示系统的调用次数

#### 使用方式

切换到 "Systems" 标签页，查看：

```
📊 Systems (PreUpdate Schedule)
   ├── InputSystem          0.15ms  [60 calls/s]
   ├── PhysicsSystem        2.30ms  [60 calls/s]
   └── TransformSystem      0.45ms  [60 calls/s]

📊 Systems (Update Schedule)
   ├── MovementSystem       1.20ms  [60 calls/s]
   ├── CombatSystem         0.80ms  [60 calls/s]
   └── AnimationSystem      1.50ms  [60 calls/s]
```

### 4. 性能分析器 (Performance Profiler)

性能分析器提供详细的性能指标。

#### 功能特性

- **帧率监控**: 实时 FPS 显示
- **系统耗时**: 每个系统的执行时间统计
- **热点识别**: 自动标记耗时最长的系统
- **历史趋势**: 显示性能数据的历史趋势

#### 性能指标

- **Total Frame Time**: 整个帧的总时间
- **System Time**: 所有系统的总执行时间
- **Idle Time**: 空闲时间
- **Bottleneck**: 最慢的系统

### 5. 查询检查器 (Query Inspector)

查询检查器显示 Matter 查询的执行信息。

#### 功能特性

- **查询列表**: 显示所有活动的查询
- **匹配实体**: 显示每个查询匹配的实体数量
- **查询性能**: 显示查询的执行时间

### 6. 3D 可视化工具

#### 鼠标高亮 (Mouse Highlight)

当启用 3D 关联时，鼠标悬停在模型上会显示：
- 实体 ID
- 组件摘要
- 实时数据预览

#### 模型选择

点击 3D 模型会：
- 自动选中对应的实体
- 在实体检查器中显示详细信息
- 在模型上显示高亮边框

---

## API 详解

### 1. DebuggerPlugin

#### 构造函数

```typescript
constructor(
	options?: DebuggerOptions,
	getRenderableComponent?: (entityId: number) => { model: Model } | undefined
)
```

**参数说明**:

- `options`: 调试器配置选项（可选）
  - `toggleKey`: 切换调试器的快捷键（默认 `Enum.KeyCode.F4`）
  - `groupId`: Roblox 群组 ID，用于权限验证（可选）

- `getRenderableComponent`: 获取实体对应模型的函数（可选）
  - 参数: `entityId: number` - 实体 ID
  - 返回: `{ model: Model } | undefined` - 包含模型的对象，或 undefined

**示例**:

```typescript
const debuggerPlugin = new DebuggerPlugin(
	{
		toggleKey: Enum.KeyCode.F4,
		groupId: 123456,
	},
	(entityId) => {
		const entity = world.get(entityId);
		return entity?.Renderable;
	}
);
```

#### 方法

##### `getDebugger(): IDebugger | undefined`

获取调试器实例。

**返回值**: 调试器实例，如果未初始化则返回 `undefined`

**示例**:

```typescript
const debugger = debuggerPlugin.getDebugger();
if (debugger) {
	print("Debugger enabled:", debugger.enabled);
}
```

##### `getWidgets(): Plasma.Widgets | undefined`

获取 Plasma UI 控件实例。

**返回值**: Plasma Widgets 对象，如果未初始化则返回 `undefined`

**示例**:

```typescript
const widgets = debuggerPlugin.getWidgets();
if (widgets) {
	// 使用 widgets 创建自定义 UI
}
```

##### `setLoop(loop: Loop<unknown[]>): void`

设置 Matter Loop，用于自动初始化和性能分析。

**参数**:
- `loop`: Matter Loop 实例

**示例**:

```typescript
import { Loop } from "@rbxts/matter";

const loop = new Loop(world);
debuggerPlugin.setLoop(loop);
```

##### `setState(state: DebuggerState): void`

设置状态对象，用于外部监控调试器状态。

**参数**:
- `state`: 状态对象，必须包含 `debugEnabled?: boolean` 属性

**示例**:

```typescript
const state: DebuggerState = {
	debugEnabled: false,
};

debuggerPlugin.setState(state);

// 状态会自动同步
print(state.debugEnabled); // 输出当前调试器启用状态
```

##### `replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void`

替换系统，用于热重载。

**参数**:
- `oldSystem`: 旧系统函数
- `newSystem`: 新系统函数

**示例**:

```typescript
// 热重载场景
const newMovementSystem = (world: World, dt: number) => {
	// 新的系统逻辑
};

debuggerPlugin.replaceSystem(oldMovementSystem, newMovementSystem);
```

### 2. createDebugger 工厂函数

```typescript
function createDebugger(
	world: World,
	options: DebuggerOptions,
	getRenderableComponent?: (entityId: number) => { model: Model } | undefined
): IDebugger
```

直接创建调试器实例（高级用法）。

**参数**:
- `world`: Matter World 实例
- `options`: 调试器配置
- `getRenderableComponent`: 模型关联函数（可选）

**返回值**: 调试器实例

**示例**:

```typescript
import { createDebugger } from "./bevy_ecs_debugger";

const debugger = createDebugger(
	world,
	{ toggleKey: Enum.KeyCode.F5 },
	(entityId) => world.get(entityId)?.Renderable
);

// 手动控制调试器
debugger.show();
debugger.hide();
debugger.toggle();
```

### 3. IDebugger 接口

```typescript
interface IDebugger {
	enabled: boolean;
	toggle(): void;
	findInstanceFromEntity: (id: AnyEntity) => Model | undefined;
	authorize: (player: Player) => boolean;
	replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void;
	autoInitialize(loop: Loop<unknown[]>): void;
	getWidgets(): Plasma.Widgets;
}
```

#### 属性

- **`enabled: boolean`**: 调试器是否启用

#### 方法

- **`toggle(): void`**: 切换调试器显示状态
- **`findInstanceFromEntity(id: AnyEntity): Model | undefined`**: 根据实体 ID 查找对应的 3D 模型
- **`authorize(player: Player): boolean`**: 验证玩家是否有权限使用调试器
- **`replaceSystem(oldSystem, newSystem): void`**: 替换系统
- **`autoInitialize(loop): void`**: 自动初始化（内部使用）
- **`getWidgets(): Plasma.Widgets`**: 获取 Plasma UI 控件

### 4. 类型定义

#### DebuggerOptions

```typescript
interface DebuggerOptions {
	/** 切换调试器的按键，默认 F4 */
	toggleKey?: Enum.KeyCode;
	/** 权限组ID，用于验证调试权限 */
	groupId?: number;
}
```

#### DebuggerState

```typescript
interface DebuggerState {
	/** 调试器是否启用 */
	debugEnabled?: boolean;
}
```

#### DefaultDebuggerOptions

```typescript
const DefaultDebuggerOptions: DebuggerOptions = {
	toggleKey: Enum.KeyCode.F4,
	groupId: 9999999,
};
```

---

## 实战示例

### 示例 1: 基础游戏调试

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";

// 创建应用
const app = new App();

// 添加调试器（Studio 中默认启用）
app.addPlugin(new DebuggerPlugin());

// 添加游戏系统
app.addSystemsToSchedule("Update", [
	movementSystem,
	combatSystem,
	renderSystem,
]);

// 运行
app.run();
```

**使用方式**:
1. 在 Studio 中运行游戏
2. 按 `F4` 打开调试器
3. 查看实体、组件和系统信息

### 示例 2: 3D 模型关联调试

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";
import { World } from "@rbxts/matter";

// 定义 Renderable 组件
interface Renderable {
	model: Model;
}

// 创建应用
const app = new App();

// 获取 World
const world = app.getWorld()!;

// 添加调试器，配置模型关联
const debuggerPlugin = new DebuggerPlugin(
	undefined, // 使用默认选项
	(entityId) => {
		// 获取实体的 Renderable 组件
		const entity = world.get(entityId);
		if (entity && "Renderable" in entity) {
			return entity.Renderable as Renderable;
		}
		return undefined;
	}
);

app.addPlugin(debuggerPlugin);

// 创建带模型的实体
const entity = world.spawn();
world.insert(entity, {
	Renderable: {
		model: workspace.FindFirstChild("PlayerModel") as Model,
	},
});

app.run();
```

**功能**:
- 点击 3D 模型自动选择实体
- 在实体检查器中查看详细信息
- 鼠标悬停显示实体预览

### 示例 3: 权限管理

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";

const app = new App();

// 配置群组权限（只有 Admin 和 Owner 可以使用）
app.addPlugin(new DebuggerPlugin({
	toggleKey: Enum.KeyCode.F4,
	groupId: 123456, // 替换为你的群组 ID
}));

app.run();
```

**权限规则**:
- **Studio 环境**: 始终可用
- **游戏中**: 只有指定群组的 Admin 或 Owner 可用
- **其他玩家**: 无法打开调试器

### 示例 4: 性能分析

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin, type DebuggerState } from "./bevy_ecs_debugger";

const app = new App();

// 创建状态对象
const state: DebuggerState = {
	debugEnabled: false,
};

const debuggerPlugin = new DebuggerPlugin();
app.addPlugin(debuggerPlugin);

// 设置状态对象
debuggerPlugin.setState(state);

// 添加系统
app.addSystemsToSchedule("Update", [
	movementSystem,
	physicsSystem,
	renderSystem,
]);

app.run();

// 在其他地方检查调试器状态
if (state.debugEnabled) {
	print("Debugger is currently enabled");
}
```

**性能分析功能**:
1. 打开调试器（`F4`）
2. 切换到 "Systems" 标签
3. 查看每个系统的执行时间
4. 识别性能瓶颈

### 示例 5: 热重载支持

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";
import { World } from "@rbxts/matter";

const app = new App();
const debuggerPlugin = new DebuggerPlugin();
app.addPlugin(debuggerPlugin);

// 原始系统
function oldMovementSystem(world: World, dt: number) {
	// 旧的逻辑
	print("Old movement system");
}

// 添加系统
app.addSystemsToSchedule("Update", [oldMovementSystem]);

app.run();

// 热重载：替换系统
function newMovementSystem(world: World, dt: number) {
	// 新的改进逻辑
	print("New improved movement system");
}

// 通知调试器更新系统
debuggerPlugin.replaceSystem(oldMovementSystem, newMovementSystem);
```

### 示例 6: 客户端-服务端视图切换

```typescript
// 服务端代码
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";

const serverApp = new App();
serverApp.addPlugin(new DebuggerPlugin());
serverApp.run();

// 客户端代码
const clientApp = new App();
clientApp.addPlugin(new DebuggerPlugin());
clientApp.run();
```

**使用方式**:
1. 在客户端按 `F4` 打开调试器
2. 使用 "Realm Switch" 按钮切换视图
3. 切换到 "Server" 查看服务端 ECS 状态
4. 切换回 "Client" 查看客户端状态

### 示例 7: 自定义 UI 集成

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";
import Plasma from "@rbxts/plasma";

const app = new App();
const debuggerPlugin = new DebuggerPlugin();
app.addPlugin(debuggerPlugin);

// 获取 Widgets 用于自定义 UI
const widgets = debuggerPlugin.getWidgets();
if (widgets) {
	// 使用 Plasma 创建自定义调试面板
	const customPanel = widgets.panel(() => {
		widgets.label("Custom Debug Info");
		widgets.label(`Entities: ${world.size()}`);
	});
}

app.run();
```

---

## 最佳实践

### 1. 开发环境配置

#### 推荐配置

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin } from "./bevy_ecs_debugger";

const RunService = game.GetService("RunService");

const app = new App();

// 只在开发环境启用调试器
if (RunService.IsStudio()) {
	app.addPlugin(new DebuggerPlugin({
		toggleKey: Enum.KeyCode.F4,
	}));
}

app.run();
```

#### 条件编译（生产环境禁用）

```typescript
// 使用环境变量控制
const ENABLE_DEBUGGER = script.GetAttribute("EnableDebugger") as boolean | undefined ?? false;

if (ENABLE_DEBUGGER) {
	app.addPlugin(new DebuggerPlugin());
}
```

### 2. 性能优化

#### 避免频繁切换

```typescript
// ❌ 不推荐：频繁切换影响性能
setInterval(() => {
	debugger.toggle();
}, 100);

// ✅ 推荐：使用快捷键或命令切换
// 让用户手动控制
```

#### 限制组件刷新频率

```typescript
// 调试器默认刷新频率已优化
// 如果需要更低的刷新频率，可以设置：
const debugger = debuggerPlugin.getDebugger();
if (debugger) {
	debugger.componentRefreshFrequency = 1; // 每秒 1 次
}
```

### 3. 组件关联最佳实践

#### 高效的 getRenderableComponent 实现

```typescript
// ✅ 推荐：缓存组件访问
const componentCache = new Map<number, { model: Model }>();

const getRenderableComponent = (entityId: number) => {
	// 检查缓存
	if (componentCache.has(entityId)) {
		return componentCache.get(entityId);
	}

	// 获取组件
	const entity = world.get(entityId);
	const renderable = entity?.Renderable;

	// 缓存结果
	if (renderable) {
		componentCache.set(entityId, renderable);
	}

	return renderable;
};

app.addPlugin(new DebuggerPlugin(undefined, getRenderableComponent));

// 清理缓存
world.onEntityRemoved.Connect((entityId) => {
	componentCache.delete(entityId);
});
```

#### 支持多种渲染组件

```typescript
const getRenderableComponent = (entityId: number) => {
	const entity = world.get(entityId);

	// 尝试多种组件类型
	if (entity?.ModelComponent) {
		return entity.ModelComponent;
	}

	if (entity?.MeshComponent) {
		return { model: entity.MeshComponent.instance };
	}

	if (entity?.PartComponent) {
		return { model: entity.PartComponent.part };
	}

	return undefined;
};
```

### 4. 权限管理最佳实践

#### 多层权限验证

```typescript
const debuggerPlugin = new DebuggerPlugin({
	groupId: 123456,
});

// 自定义授权逻辑
const debugger = debuggerPlugin.getDebugger();
if (debugger) {
	const originalAuthorize = debugger.authorize;

	debugger.authorize = (player: Player) => {
		// 首先检查原始权限
		if (!originalAuthorize(player)) {
			return false;
		}

		// 添加自定义验证
		const customPermission = player.GetAttribute("DebugAccess") as boolean | undefined;
		return customPermission === true;
	};
}
```

### 5. 调试工作流程

#### 推荐工作流程

1. **开发阶段**:
   - 启用调试器
   - 使用实体检查器验证组件数据
   - 使用系统监控器检查执行顺序

2. **性能优化**:
   - 打开性能分析器
   - 识别耗时最长的系统
   - 优化瓶颈代码

3. **测试阶段**:
   - 使用状态对象监控调试器状态
   - 在特定条件下自动启用调试器
   - 记录关键时刻的 ECS 快照

4. **生产环境**:
   - 禁用调试器
   - 或限制访问权限为管理员

### 6. 调试技巧

#### 快速定位实体

```typescript
// 在控制台中添加全局调试函数
(globalThis as any).findEntity = (id: number) => {
	const debugger = debuggerPlugin.getDebugger();
	if (debugger) {
		const model = debugger.findInstanceFromEntity(id);
		if (model) {
			print(`Entity ${id} -> Model:`, model.GetFullName());
		} else {
			warn(`Entity ${id} has no associated model`);
		}
	}
};

// 使用：在控制台输入
// findEntity(42)
```

#### 监控特定组件

```typescript
// 创建自定义监控系统
function componentMonitorSystem(world: World, dt: number) {
	const debugger = debuggerPlugin.getDebugger();

	if (debugger?.enabled) {
		// 只在调试器启用时监控
		for (const [id, health] of world.query(world.Health)) {
			if (health.current < 20) {
				warn(`Entity ${id} health critical: ${health.current}`);
			}
		}
	}
}

app.addSystemsToSchedule("Update", [componentMonitorSystem]);
```

---

## 故障排除

### 常见问题

#### 1. 调试器无法打开

**问题**: 按快捷键或输入命令后，调试器没有显示。

**解决方案**:

```typescript
// 检查调试器是否初始化
const debugger = debuggerPlugin.getDebugger();
if (!debugger) {
	warn("Debugger not initialized! Ensure plugin is added before app.run()");
}

// 检查权限
const Players = game.GetService("Players");
const player = Players.LocalPlayer;
if (debugger && player) {
	const authorized = debugger.authorize(player);
	print("Player authorized:", authorized);
}
```

#### 2. 3D 模型关联不工作

**问题**: 点击模型没有反应，实体检查器中看不到模型。

**解决方案**:

```typescript
// 验证 getRenderableComponent 函数
const getRenderableComponent = (entityId: number) => {
	const entity = world.get(entityId);
	print(`Checking entity ${entityId}:`, entity);

	if (!entity) {
		warn(`Entity ${entityId} not found in world`);
		return undefined;
	}

	const renderable = entity.Renderable;
	if (!renderable) {
		warn(`Entity ${entityId} has no Renderable component`);
		return undefined;
	}

	print(`Found Renderable:`, renderable.model?.GetFullName());
	return renderable;
};
```

#### 3. 性能分析数据不显示

**问题**: 系统监控器中看不到执行时间。

**解决方案**:

```typescript
// 确保设置了 Loop
const debuggerPlugin = new DebuggerPlugin();
app.addPlugin(debuggerPlugin);

// 获取 Loop 并设置
const schedules = app.main().getSchedules();
const loop = schedules?.getLoop();
if (loop) {
	debuggerPlugin.setLoop(loop);
	print("Loop set successfully");
} else {
	warn("Loop not found!");
}
```

#### 4. 服务端视图无法切换

**问题**: 在客户端无法查看服务端的 ECS 状态。

**检查清单**:

1. 确保服务端也安装了 `DebuggerPlugin`
2. 确保网络连接正常
3. 检查 ReplicatedStorage 中是否有 "MatterDebugger" GUI

```typescript
// 服务端检查
if (RunService.IsServer()) {
	const ReplicatedStorage = game.GetService("ReplicatedStorage");
	const debuggerGui = ReplicatedStorage.FindFirstChild("MatterDebugger");
	print("Server GUI exists:", debuggerGui !== undefined);
}

// 客户端检查
if (RunService.IsClient()) {
	task.wait(1); // 等待服务端初始化
	const ReplicatedStorage = game.GetService("ReplicatedStorage");
	const serverGui = ReplicatedStorage.FindFirstChild("MatterDebugger");
	print("Server GUI visible on client:", serverGui !== undefined);
}
```

#### 5. 热重载后系统监控器显示错误

**问题**: 使用 `replaceSystem` 后，调试器中显示重复的系统或旧系统。

**解决方案**:

```typescript
// 确保正确传递系统引用
let movementSystem = (world: World, dt: number) => {
	// 系统逻辑
};

app.addSystemsToSchedule("Update", [movementSystem]);

// 热重载时
const newMovementSystem = (world: World, dt: number) => {
	// 新逻辑
};

// ✅ 正确：传递原始引用
debuggerPlugin.replaceSystem(movementSystem, newMovementSystem);

// 更新引用
movementSystem = newMovementSystem;
```

### 调试日志

启用详细日志：

```typescript
// 在调试器初始化前启用
const debuggerPlugin = new DebuggerPlugin();

// 添加日志监听
const debugger = debuggerPlugin.getDebugger();
if (debugger) {
	print("[Debugger] Enabled:", debugger.enabled);
	print("[Debugger] Widgets:", debugger.getWidgets());
}
```

---

## 性能考虑

### 1. 性能影响

调试器对性能的影响取决于使用方式：

| 操作 | 性能影响 | 建议 |
|------|---------|------|
| 调试器关闭 | 几乎无影响 | 生产环境可保留插件 |
| 调试器打开（空闲） | < 1% | 可在需要时打开 |
| 实体检查器 | 1-3% | 避免检查大量实体 |
| 性能分析 | 2-5% | 仅在优化时启用 |
| 3D 模型关联 | 取决于实现 | 使用缓存优化 |

### 2. 优化建议

#### 限制组件刷新

```typescript
const debugger = debuggerPlugin.getDebugger();
if (debugger) {
	// 降低刷新频率（默认 60Hz）
	debugger.componentRefreshFrequency = 10; // 10Hz
}
```

#### 条件启用

```typescript
// 只在特定条件下启用调试器
const ENABLE_DEBUGGER = script.GetAttribute("Debug") === true;

if (ENABLE_DEBUGGER) {
	app.addPlugin(new DebuggerPlugin());
}
```

#### 延迟初始化

```typescript
// 延迟到需要时才初始化
let debuggerPlugin: DebuggerPlugin | undefined;

UserInputService.InputBegan.Connect((input) => {
	if (input.KeyCode === Enum.KeyCode.F12 && !debuggerPlugin) {
		debuggerPlugin = new DebuggerPlugin();
		app.addPlugin(debuggerPlugin);
		print("Debugger initialized on demand");
	}
});
```

### 3. 内存管理

#### 清理资源

```typescript
// 插件卸载时自动清理
app.cleanup(); // 会调用 debuggerPlugin.cleanup()
```

#### 避免内存泄漏

```typescript
// 确保移除事件监听
const connection = UserInputService.InputBegan.Connect((input) => {
	if (input.KeyCode === Enum.KeyCode.F4) {
		debugger?.toggle();
	}
});

// 在清理时断开连接
app.onCleanup(() => {
	connection.Disconnect();
});
```

---

## 附录

### A. 完整配置示例

```typescript
import { App } from "./bevy_app";
import { DebuggerPlugin, type DebuggerOptions, type DebuggerState } from "./bevy_ecs_debugger";
import { World } from "@rbxts/matter";

const RunService = game.GetService("RunService");

// 配置选项
const debuggerOptions: DebuggerOptions = {
	toggleKey: Enum.KeyCode.F4,
	groupId: 123456,
};

// 状态对象
const state: DebuggerState = {
	debugEnabled: false,
};

// 模型关联函数
const getRenderableComponent = (entityId: number) => {
	const entity = world.get(entityId);
	return entity?.Renderable;
};

// 创建应用
const app = new App();

// 添加调试器
const debuggerPlugin = new DebuggerPlugin(debuggerOptions, getRenderableComponent);
app.addPlugin(debuggerPlugin);

// 设置状态
debuggerPlugin.setState(state);

// 运行应用
app.run();

// 设置 Loop（在 app.run() 后）
const schedules = app.main().getSchedules();
const loop = schedules?.getLoop();
if (loop) {
	debuggerPlugin.setLoop(loop);
}
```

### B. 快捷键参考

| 快捷键 | 功能 | 默认 |
|--------|------|------|
| `F4` | 切换调试器 | ✅ |
| `F5` | 自定义快捷键示例 | ❌ |
| `/matter` | 聊天命令打开调试器 | ✅ |
| `/matterdebug` | 备用聊天命令 | ✅ |

### C. 依赖项

```json
{
	"dependencies": {
		"@rbxts/matter": "^0.5.0",
		"@rbxts/plasma": "^0.1.0",
		"@rbxts/services": "^1.5.0"
	}
}
```

### D. 相关资源

- [Matter ECS 文档](https://eryn.io/matter/)
- [Plasma UI 文档](https://eryn.io/plasma/)
- [Bevy 框架概述](./bevy_app.md)
- [ECS 系统指南](./bevy_ecs.md)

---

## 更新日志

### v1.0.0 (2025-09-28)

- ✨ 初始版本
- 🎯 支持实体和组件检查
- 📊 支持系统监控和性能分析
- 🎮 支持快捷键和聊天命令
- 🔐 支持权限管理
- 🌐 支持客户端/服务端视图切换
- 🔥 支持热重载

---

**文档版本**: 1.0.0
**最后更新**: 2025-09-28
**维护者**: White Dragon Bevy Team