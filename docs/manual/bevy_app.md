# bevy_app 模块操作手册

## 目录

- [模块概述](#模块概述)
- [核心概念](#核心概念)
- [API 详解](#api-详解)
- [高级特性](#高级特性)
- [最佳实践](#最佳实践)
- [实战示例](#实战示例)
- [常见问题解答](#常见问题解答)
- [API 参考](#api-参考)

---

## 模块概述

### 模块功能定位

`bevy_app` 是 bevy_framework 的核心应用程序框架模块，负责管理整个应用的生命周期、插件系统、调度器和系统执行。它是从 Rust Bevy 引擎移植到 Roblox TypeScript 的企业级应用框架。

### 在整体框架中的角色

```
┌─────────────────────────────────────────┐
│           bevy_app (应用层)             │
│  ┌──────────┐  ┌─────────┐  ┌────────┐ │
│  │   App    │  │ Plugin  │  │Schedule│ │
│  └──────────┘  └─────────┘  └────────┘ │
└─────────────────────────────────────────┘
              ↓ 管理和协调
┌─────────────────────────────────────────┐
│           bevy_ecs (ECS 层)             │
│  ┌──────────┐  ┌─────────┐  ┌────────┐ │
│  │  World   │  │ Entity  │  │Resource│ │
│  └──────────┘  └─────────┘  └────────┘ │
└─────────────────────────────────────────┘
              ↓ 运行于
┌─────────────────────────────────────────┐
│          Roblox 平台                     │
│  RunService (Heartbeat/RenderStepped)   │
└─────────────────────────────────────────┘
```

### 核心设计理念

1. **模块化架构**: 通过插件系统实现功能模块化，便于扩展和维护
2. **确定性调度**: 系统按预定义的调度阶段有序执行，保证游戏逻辑的可预测性
3. **类型安全**: 充分利用 TypeScript 类型系统，在编译期捕获错误
4. **跨平台抽象**: 提供统一的 API，屏蔽 Roblox 平台细节
5. **资源共享**: 通过 Context 和资源系统实现插件间的数据共享

---

## 核心概念

### App（应用程序）

**App** 是整个框架的入口点和核心协调者，负责：
- 管理应用生命周期（启动、更新、退出）
- 协调插件注册和初始化
- 调度系统执行
- 管理全局资源和上下文

```typescript
// 基本结构
class App<T extends AppContext = AppContext> {
	private subApps: SubApps;           // 子应用集合
	private runner: (app: App) => AppExit; // 运行器
	readonly context: AppContext;       // 应用上下文
}
```

**生命周期阶段**:
```
创建 → 添加插件 → 完成设置 → 运行 → 更新循环 → 退出
  ↓        ↓          ↓        ↓       ↓         ↓
create  addPlugin  finish    run    update    exit
```

### Plugin（插件）

**Plugin** 是实现功能模块化的核心机制，每个插件封装一组相关功能。

```typescript
interface Plugin {
	build(app: App): void;           // 配置应用（必需）
	ready?(app: App): boolean;       // 检查是否准备完成
	finish?(app: App): void;         // 完成设置
	cleanup?(app: App): void;        // 清理资源
	name(): string;                  // 插件名称
	isUnique(): boolean;             // 是否唯一
	robloxContext?: RobloxContext;   // 运行环境（服务端/客户端）
}
```

**插件状态**:
```
Adding → Ready → Finished → Cleaned
  ↓       ↓        ↓          ↓
正在添加  准备完成  设置完成   已清理
```

### PluginGroup（插件组）

插件组允许批量管理和配置相关插件：

```typescript
interface PluginGroup {
	build(): PluginGroupBuilder;
	name(): string;
}

class PluginGroupBuilder {
	add(plugin: Plugin): this;
	addBefore<T>(beforePlugin: new (...args: any[]) => T, plugin: Plugin): this;
	addAfter<T>(afterPlugin: new (...args: any[]) => T, plugin: Plugin): this;
	disable<T>(pluginType: new (...args: any[]) => T): this;
	finish(app: App): void;
}
```

### Schedule（调度）

**调度**定义了系统的执行时机和顺序。框架内置多个调度阶段：

```typescript
// 启动调度（只执行一次）
PreStartup → Startup → PostStartup

// 主循环调度（每帧执行）
First → PreUpdate → Update → PostUpdate → Last

// 固定调度（固定时间步）
FixedFirst → FixedPreUpdate → FixedUpdate → FixedPostUpdate → FixedLast
```

**调度标签**:
```typescript
export const BuiltinSchedules = {
	FIRST: "First",
	PRE_UPDATE: "PreUpdate",
	UPDATE: "Update",
	POST_UPDATE: "PostUpdate",
	LAST: "Last",
	STARTUP: "Startup",
	PRE_STARTUP: "PreStartup",
	POST_STARTUP: "PostStartup",
} as const;
```

### SubApp（子应用）

**SubApp** 提供独立的 World 和调度系统，用于实现功能隔离：

```typescript
class SubApp {
	private _world: WorldContainer;      // 独立的 World
	private schedules: Schedules;        // 调度集合
	private resourceManager: ResourceManager;
	private commandBuffer: CommandBuffer;
	private messageRegistry: MessageRegistry;
}
```

**使用场景**:
- 渲染子应用（提取渲染数据）
- 网络子应用（独立的网络逻辑）
- 物理子应用（独立的物理模拟）

### AppContext（应用上下文）

**AppContext** 提供插件扩展的统一访问接口：

```typescript
class AppContext extends ContextBase {
	resources: ResourceManager;        // 资源管理器
	commands: CommandBuffer;          // 命令缓冲
	messages: MessageRegistry;        // 消息系统
	events: EventManager;             // 事件管理器
	eventPropagator: EventPropagator; // 事件传播器
}
```

---

## API 详解

### App 类

#### 构造和创建

```typescript
// 方法 1: 使用构造函数（高级用法）
const app = new App(customContext);

// 方法 2: 使用静态工厂方法（推荐）
const app = App.create();

// 方法 3: 创建空应用（无默认调度）
const app = App.empty();
```

#### 核心方法

##### addPlugin / addPlugins

添加插件到应用：

```typescript
// 添加单个插件
app.addPlugin(new MyPlugin());

// 添加多个插件
app.addPlugins(
	new PhysicsPlugin(),
	new RenderPlugin(),
	new AudioPlugin()
);

// 添加插件组
app.addPlugins(DefaultPlugins.build());
```

**注意事项**:
- 插件在 `finish()` 或 `cleanup()` 后无法添加
- 唯一插件重复添加会抛出 `DuplicatePluginError`
- 插件会根据 `robloxContext` 在对应环境中加载

##### insertResource / getResource

管理全局资源：

```typescript
// 插入资源
interface GameSettings {
	difficulty: number;
	soundEnabled: boolean;
}

const settings: GameSettings = {
	difficulty: 1,
	soundEnabled: true,
};

app.insertResource(settings);

// 获取资源
const settings = app.getResource<GameSettings>();
if (settings) {
	print(`Difficulty: ${settings.difficulty}`);
}
```

##### addSystems

添加系统到指定调度：

```typescript
// 简单系统
function mySystem(world: World, context: AppContext) {
	// 系统逻辑
}

app.addSystems(BuiltinSchedules.UPDATE, mySystem);

// 多个系统
app.addSystems(
	BuiltinSchedules.UPDATE,
	system1,
	system2,
	system3
);

// 环境特定系统
app.addServerSystems(BuiltinSchedules.UPDATE, serverOnlySystem);
app.addClientSystems(BuiltinSchedules.UPDATE, clientOnlySystem);
```

##### run / update

运行应用：

```typescript
// 方法 1: 使用默认运行器（运行一次）
const exitCode = app.run();

// 方法 2: 手动更新循环
while (true) {
	app.update();

	const exitStatus = app.shouldExit();
	if (exitStatus) {
		break;
	}
}
```

##### setRunner

自定义应用运行逻辑：

```typescript
function customRunner(app: App): AppExit {
	// 初始化逻辑
	print("App starting...");

	// 主循环
	const connection = RunService.Heartbeat.Connect(() => {
		app.update();

		if (app.shouldExit()) {
			connection.Disconnect();
		}
	});

	return AppExit.success();
}

app.setRunner(customRunner);
const result = app.run();
```

##### 调度管理

```typescript
// 初始化调度
app.initSchedule("CustomSchedule");

// 获取调度
const schedule = app.getSchedule(BuiltinSchedules.UPDATE);

// 编辑调度
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
	// 配置调度
	schedule.addSystem({
		system: mySystem,
		name: "MySystem",
	});
});

// 运行特定调度
app.runSchedule("CustomSchedule");
```

##### SubApp 管理

```typescript
// 获取主应用
const mainApp = app.main();

// 创建并插入子应用
const renderLabel = createAppLabel("Render");
const renderSubApp = new SubApp();

renderSubApp.setExtract((mainWorld, subWorld) => {
	// 从主世界提取渲染数据到子世界
});

app.insertSubApp(renderLabel, renderSubApp);

// 访问子应用
const renderApp = app.subApp(renderLabel);
renderApp.addSystems(BuiltinSchedules.UPDATE, renderSystem);
```

##### 退出管理

```typescript
// 发送成功退出事件
app.exit();

// 发送错误退出事件
app.exitWithCode(1);

// 检查是否应该退出
const exitStatus = app.shouldExit();
if (exitStatus && exitStatus.isError()) {
	print(`App exited with error code: ${exitStatus.code}`);
}
```

##### 错误处理

```typescript
// 设置全局错误处理器
app.setErrorHandler((error) => {
	warn(`System error: ${error}`);
	// 记录错误日志
	logError(error);
});

// 获取错误处理器
const handler = app.getErrorHandler();
```

### Plugin 接口

#### 实现基础插件

```typescript
class MyPlugin extends BasePlugin {
	build(app: App): void {
		// 添加资源
		app.insertResource({ value: 42 });

		// 添加系统
		app.addSystems(BuiltinSchedules.UPDATE, this.updateSystem);

		// 添加其他插件
		app.addPlugin(new DependencyPlugin());
	}

	private updateSystem(world: World, context: AppContext): void {
		// 系统逻辑
	}

	name(): string {
		return "MyPlugin";
	}
}
```

#### 生命周期回调

```typescript
class AdvancedPlugin extends BasePlugin {
	build(app: App): void {
		app.insertResource({ initialized: false });
	}

	// 检查插件是否准备完成
	ready(app: App): boolean {
		// 例如：检查异步资源是否加载完成
		return this.assetsLoaded;
	}

	// 完成插件设置
	finish(app: App): void {
		const resource = app.getResource<{ initialized: boolean }>();
		if (resource) {
			resource.initialized = true;
		}
		print("Plugin setup completed");
	}

	// 清理插件资源
	cleanup(app: App): void {
		this.disconnectEvents();
		this.releaseResources();
		print("Plugin cleaned up");
	}

	name(): string {
		return "AdvancedPlugin";
	}
}
```

#### 环境特定插件

```typescript
import { RobloxContext } from "../utils/roblox-utils";

// 仅在服务端运行
class ServerPlugin extends BasePlugin {
	robloxContext = RobloxContext.Server;

	build(app: App): void {
		app.addSystems(BuiltinSchedules.UPDATE, serverLogic);
	}

	name(): string {
		return "ServerPlugin";
	}
}

// 仅在客户端运行
class ClientPlugin extends BasePlugin {
	robloxContext = RobloxContext.Client;

	build(app: App): void {
		app.addSystems(BuiltinSchedules.UPDATE, clientLogic);
	}

	name(): string {
		return "ClientPlugin";
	}
}
```

#### 函数式插件

```typescript
// 简单的函数式插件
const simplePlugin = createPlugin((app) => {
	app.addSystems(BuiltinSchedules.UPDATE, mySystem);
}, "SimplePlugin");

app.addPlugin(simplePlugin);

// 非唯一插件（可以多次添加）
const utilPlugin = createPlugin(
	(app) => {
		// 插件逻辑
	},
	"UtilPlugin",
	false // 非唯一
);
```

### Schedule 系统

#### 调度顺序管理

```typescript
// 获取调度顺序
const order = app.main().getScheduleOrder();
print(`Schedules: ${order.join(" → ")}`);

// 在指定调度前插入新调度
app.main().configureScheduleOrder(
	BuiltinSchedules.UPDATE,
	"CustomPreUpdate"
);

// 结果: ... → PreUpdate → CustomPreUpdate → Update → ...
```

#### 自定义调度

```typescript
// 创建自定义调度
const customSchedule = "GameLogic";

app.initSchedule(customSchedule);

// 添加系统到自定义调度
app.addSystems(customSchedule,
	gameSystem1,
	gameSystem2
);

// 手动运行自定义调度
app.runSchedule(customSchedule);
```

### SubApp 机制

#### 创建和配置子应用

```typescript
// 1. 创建子应用
const physicsLabel = createAppLabel("Physics");
const physicsSubApp = new SubApp();

// 2. 配置子应用
physicsSubApp.setUpdateSchedule(BuiltinSchedules.UPDATE);

// 3. 设置提取函数（从主世界提取数据）
physicsSubApp.setExtract((mainWorld, subWorld) => {
	// 提取物理相关组件到子世界
	const entities = mainWorld.world.query(Transform, RigidBody);
	for (const [entity, transform, rigidBody] of entities) {
		// 复制数据到子世界
	}
});

// 4. 添加子应用系统
physicsSubApp.addSystems(BuiltinSchedules.UPDATE, physicsSimulation);

// 5. 插入到主应用
app.insertSubApp(physicsLabel, physicsSubApp);
```

#### 子应用更新流程

```typescript
// 主应用更新时，子应用自动更新
app.update();

// 执行顺序:
// 1. 更新主应用
// 2. 对每个子应用:
//    a. 调用 extract() 提取数据
//    b. 调用 update() 运行子应用系统
```

---

## 高级特性

### AppContext 扩展系统

AppContext 允许插件注册自定义扩展，实现类型安全的功能共享。

#### 声明扩展接口

```typescript
// 在 extensions.ts 中声明
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		'physics': PhysicsExtension;
		'physics.settings': PhysicsSettings;
	}
}

// 定义扩展类型
interface PhysicsExtension {
	setGravity(gravity: Vector3): void;
	simulate(deltaTime: number): void;
}

interface PhysicsSettings {
	gravity: Vector3;
	maxVelocity: number;
}
```

#### 注册扩展

```typescript
class PhysicsPlugin extends BasePlugin {
	build(app: App): void {
		// 创建扩展实例
		const physicsExt: PhysicsExtension = {
			setGravity: (gravity) => {
				// 实现
			},
			simulate: (dt) => {
				// 实现
			},
		};

		// 注册扩展
		this.registerExtension(app, 'physics', physicsExt, {
			description: "Physics simulation extension",
			version: "1.0.0",
			dependencies: [],
		});

		// 注册配置扩展
		this.registerExtension(app, 'physics.settings', {
			gravity: new Vector3(0, -9.8, 0),
			maxVelocity: 100,
		});
	}

	name(): string {
		return "PhysicsPlugin";
	}
}
```

#### 使用扩展

```typescript
function physicsSystem(world: World, context: AppContext): void {
	// 方法 1: 直接属性访问（需要扩展已注册）
	const physics = (context as any).physics as PhysicsExtension;
	physics.simulate(1/60);

	// 方法 2: 安全访问
	const settings = context.tryGet('physics.settings');
	if (settings) {
		print(`Gravity: ${settings.gravity}`);
	}

	// 方法 3: 获取命名空间
	const physicsExtensions = context.getNamespace('physics');
	// physicsExtensions 包含所有 'physics.*' 扩展
}
```

### Loop 中间件架构

Loop 提供了基于中间件的系统执行架构，支持调试和性能分析。

#### 启动 Loop

```typescript
// 配置调度到 Roblox 事件的映射
const eventMapping = {
	[BuiltinSchedules.FIRST]: RunService.Heartbeat,
	[BuiltinSchedules.PRE_UPDATE]: RunService.Heartbeat,
	[BuiltinSchedules.UPDATE]: RunService.Heartbeat,
	[BuiltinSchedules.POST_UPDATE]: RunService.Heartbeat,
	[BuiltinSchedules.LAST]: RunService.Heartbeat,
};

// 启动 Loop
app.main().startLoop(eventMapping);

// Loop 会自动在对应事件触发时执行系统
```

#### 停止 Loop

```typescript
// 停止 Loop 执行
app.main().stopLoop();
```

### 性能优化策略

#### 1. 系统执行顺序优化

```typescript
// 将频繁修改的系统放在合适的调度阶段
app.addSystems(BuiltinSchedules.PRE_UPDATE, inputSystem);
app.addSystems(BuiltinSchedules.UPDATE, gameLogicSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, renderSystem);
```

#### 2. 条件系统执行

```typescript
// 在系统内部实现条件逻辑
function conditionalSystem(world: World, context: AppContext): void {
	const settings = context.getResource<GameSettings>();
	if (!settings?.physicsEnabled) {
		return; // 跳过执行
	}

	// 执行物理逻辑
}
```

#### 3. 资源缓存

```typescript
// 在插件中缓存资源引用
class OptimizedPlugin extends BasePlugin {
	private cachedResource?: MyResource;

	build(app: App): void {
		app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
			// 使用缓存避免重复查询
			if (!this.cachedResource) {
				this.cachedResource = context.getResource<MyResource>();
			}

			if (this.cachedResource) {
				// 使用资源
			}
		});
	}

	name(): string {
		return "OptimizedPlugin";
	}
}
```

#### 4. 批量操作

```typescript
function batchSystem(world: World, context: AppContext): void {
	const commands = context.commands;

	// 批量创建实体
	const entities: Entity[] = [];
	for (let i = 0; i < 100; i++) {
		const entity = world.spawn();
		entities.push(entity);
	}

	// 批量添加组件
	for (const entity of entities) {
		commands.insertComponent(entity, new Transform());
		commands.insertComponent(entity, new Velocity());
	}

	// 命令在帧结束时批量执行
}
```

---

## 最佳实践

### 插件开发规范

#### 1. 单一职责原则

每个插件应该只负责一个功能领域：

```typescript
// ✅ 好的设计
class PhysicsPlugin extends BasePlugin {
	build(app: App): void {
		app.addSystems(BuiltinSchedules.UPDATE, physicsSimulation);
		app.addSystems(BuiltinSchedules.POST_UPDATE, physicsCleanup);
	}

	name(): string {
		return "PhysicsPlugin";
	}
}

// ❌ 不好的设计
class MegaPlugin extends BasePlugin {
	build(app: App): void {
		// 物理、渲染、音频、网络全部混在一起
		app.addSystems(BuiltinSchedules.UPDATE,
			physicsSystem,
			renderSystem,
			audioSystem,
			networkSystem
		);
	}

	name(): string {
		return "MegaPlugin";
	}
}
```

#### 2. 依赖声明

明确声明插件依赖：

```typescript
class RenderPlugin extends BasePlugin {
	build(app: App): void {
		// 检查依赖
		if (!app.isPluginAdded(TransformPlugin)) {
			error("RenderPlugin requires TransformPlugin");
		}

		// 插件逻辑
	}

	name(): string {
		return "RenderPlugin";
	}
}
```

#### 3. 配置资源模式

使用资源配置插件行为：

```typescript
interface PhysicsConfig {
	gravity: Vector3;
	substeps: number;
	collisionEnabled: boolean;
}

class PhysicsPlugin extends BasePlugin {
	constructor(private config?: PhysicsConfig) {
		super();
	}

	build(app: App): void {
		// 使用默认配置或传入的配置
		const config = this.config ?? {
			gravity: new Vector3(0, -9.8, 0),
			substeps: 4,
			collisionEnabled: true,
		};

		app.insertResource(config);
		app.addSystems(BuiltinSchedules.UPDATE, physicsSystem);
	}

	name(): string {
		return "PhysicsPlugin";
	}
}

// 使用
app.addPlugin(new PhysicsPlugin({
	gravity: new Vector3(0, -20, 0),
	substeps: 8,
	collisionEnabled: true,
}));
```

### 应用架构设计

#### 模块化架构

```typescript
// 核心插件组
class CorePlugins extends BasePluginGroup {
	build(): PluginGroupBuilder {
		return new PluginGroupBuilder()
			.add(new TimePlugin())
			.add(new TransformPlugin())
			.add(new HierarchyPlugin());
	}

	name(): string {
		return "CorePlugins";
	}
}

// 游戏逻辑插件组
class GamePlugins extends BasePluginGroup {
	build(): PluginGroupBuilder {
		return new PluginGroupBuilder()
			.add(new PlayerPlugin())
			.add(new EnemyPlugin())
			.add(new WeaponPlugin());
	}

	name(): string {
		return "GamePlugins";
	}
}

// 应用组装
const app = App.create()
	.addPlugins(new CorePlugins(), new GamePlugins())
	.run();
```

#### 分层架构

```
┌─────────────────────────────────┐
│      游戏逻辑层 (Game Logic)     │
│  PlayerPlugin, EnemyPlugin, etc │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│      引擎服务层 (Engine)         │
│  PhysicsPlugin, RenderPlugin    │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│      平台抽象层 (Platform)       │
│  RobloxInputPlugin, etc         │
└─────────────────────────────────┘
```

### 错误处理模式

#### 统一错误处理

```typescript
// 定义错误类型
class GameError {
	constructor(
		public readonly code: string,
		public readonly message: string,
		public readonly context?: Record<string, unknown>
	) {}
}

// 设置错误处理器
app.setErrorHandler((error) => {
	if (error instanceof GameError) {
		// 记录到远程服务
		logToServer(error);

		// 显示用户友好的错误信息
		showErrorDialog(error.message);
	} else {
		// 未知错误
		warn(`Unexpected error: ${error}`);
	}
});

// 在系统中抛出错误
function gameSystem(world: World, context: AppContext): void {
	const player = findPlayer(world);
	if (!player) {
		throw new GameError(
			"PLAYER_NOT_FOUND",
			"Player entity not found",
			{ system: "gameSystem" }
		);
	}

	// 正常逻辑
}
```

### 调试技巧

#### 1. 系统执行追踪

```typescript
// 创建执行追踪器
class ExecutionTracker {
	private logs: string[] = [];

	record(name: string): void {
		const timestamp = os.clock();
		this.logs.push(`[${timestamp}] ${name}`);
	}

	print(): void {
		print("=== System Execution Order ===");
		for (const log of this.logs) {
			print(log);
		}
	}
}

const tracker = new ExecutionTracker();

// 在系统中使用
function system1(world: World, context: AppContext): void {
	tracker.record("system1:start");
	// 系统逻辑
	tracker.record("system1:end");
}

// 打印追踪日志
tracker.print();
```

#### 2. 资源监控

```typescript
function debugSystem(world: World, context: AppContext): void {
	// 监控资源变化
	const resources = context.resources;
	const resourceCount = resources.size();

	print(`Active resources: ${resourceCount}`);

	// 检查特定资源
	const settings = context.getResource<GameSettings>();
	if (settings) {
		print(`Game settings: ${JSON.stringify(settings)}`);
	}
}
```

#### 3. 性能分析

```typescript
function profiledSystem(world: World, context: AppContext): void {
	const startTime = os.clock();

	// 系统逻辑
	performHeavyOperation();

	const endTime = os.clock();
	const duration = endTime - startTime;

	if (duration > 0.016) { // 超过一帧的时间
		warn(`System took ${duration * 1000}ms (>16ms)`);
	}
}
```

---

## 实战示例

### 示例 1: 基础应用创建

创建一个简单的游戏应用：

```typescript
import { App, BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";
import { World } from "@rbxts/matter";

// 定义游戏状态资源
interface GameState {
	score: number;
	level: number;
	isPaused: boolean;
}

// 初始化系统（只在启动时运行一次）
function initializeGame(world: World, context: AppContext): void {
	print("Game initializing...");

	// 创建初始游戏状态
	const gameState: GameState = {
		score: 0,
		level: 1,
		isPaused: false,
	};

	context.insertResource(gameState);

	// 创建玩家实体
	const player = world.spawn();
	world.insert(player,
		{ position: new Vector3(0, 0, 0) },
		{ health: 100 }
	);

	print("Game initialized!");
}

// 更新系统（每帧运行）
function updateGame(world: World, context: AppContext): void {
	const gameState = context.getResource<GameState>();

	if (!gameState || gameState.isPaused) {
		return; // 游戏暂停
	}

	// 游戏逻辑
	for (const [entity, position, health] of world.query({ position: true, health: true })) {
		// 更新玩家逻辑
	}
}

// 创建并运行应用
const app = App.create()
	.addSystems(BuiltinSchedules.STARTUP, initializeGame)
	.addSystems(BuiltinSchedules.UPDATE, updateGame)
	.run();
```

### 示例 2: 自定义插件开发

开发一个完整的输入处理插件：

```typescript
import { BasePlugin } from "@white-dragon-bevy/bevy-framework";
import { UserInputService } from "@rbxts/services";

// 输入状态资源
interface InputState {
	readonly pressedKeys: Set<Enum.KeyCode>;
	readonly mousePosition: Vector2;
	readonly mouseDown: boolean;
}

// 输入事件
class KeyPressedEvent {
	constructor(public readonly keyCode: Enum.KeyCode) {}
}

class KeyReleasedEvent {
	constructor(public readonly keyCode: Enum.KeyCode) {}
}

// 输入插件
class InputPlugin extends BasePlugin {
	private connections: RBXScriptConnection[] = [];

	build(app: App): void {
		// 初始化输入状态
		const inputState: InputState = {
			pressedKeys: new Set(),
			mousePosition: new Vector2(0, 0),
			mouseDown: false,
		};

		app.insertResource(inputState);

		// 注册事件类型
		app.addMessage<KeyPressedEvent>();
		app.addMessage<KeyReleasedEvent>();

		// 添加输入处理系统
		app.addSystems(BuiltinSchedules.PRE_UPDATE, this.processInput.bind(this));

		// 设置输入监听
		this.setupInputListeners(app);
	}

	private setupInputListeners(app: App): void {
		// 键盘输入
		const keyDown = UserInputService.InputBegan.Connect((input, gameProcessed) => {
			if (gameProcessed) return;

			if (input.KeyCode !== Enum.KeyCode.Unknown) {
				const state = app.getResource<InputState>();
				if (state) {
					state.pressedKeys.add(input.KeyCode);
				}

				// 发送事件
				const writer = app.getContext().messages.createWriter<KeyPressedEvent>();
				writer.send(new KeyPressedEvent(input.KeyCode));
			}
		});

		const keyUp = UserInputService.InputEnded.Connect((input) => {
			if (input.KeyCode !== Enum.KeyCode.Unknown) {
				const state = app.getResource<InputState>();
				if (state) {
					state.pressedKeys.delete(input.KeyCode);
				}

				// 发送事件
				const writer = app.getContext().messages.createWriter<KeyReleasedEvent>();
				writer.send(new KeyReleasedEvent(input.KeyCode));
			}
		});

		this.connections.push(keyDown, keyUp);
	}

	private processInput(world: World, context: AppContext): void {
		const inputState = context.getResource<InputState>();
		if (!inputState) return;

		// 更新鼠标位置
		const mouseLocation = UserInputService.GetMouseLocation();
		(inputState as any).mousePosition = mouseLocation;
		(inputState as any).mouseDown = UserInputService.IsMouseButtonPressed(
			Enum.UserInputType.MouseButton1
		);
	}

	cleanup(app: App): void {
		// 断开所有连接
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections = [];
	}

	name(): string {
		return "InputPlugin";
	}
}

// 使用输入插件
const app = App.create()
	.addPlugin(new InputPlugin())
	.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
		// 读取输入状态
		const input = context.getResource<InputState>();
		if (!input) return;

		if (input.pressedKeys.has(Enum.KeyCode.W)) {
			print("W key is pressed!");
		}

		if (input.mouseDown) {
			print(`Mouse clicked at ${input.mousePosition}`);
		}
	})
	.run();
```

### 示例 3: 复杂系统调度

实现一个带依赖关系的系统调度：

```typescript
import { BuiltinSchedules, IntoSystemConfigs } from "@white-dragon-bevy/bevy-framework";

// 定义系统
function collectInput(world: World, context: AppContext): void {
	print("1. Collecting input...");
	// 收集输入
}

function updatePhysics(world: World, context: AppContext): void {
	print("2. Updating physics...");
	// 物理模拟
}

function updateAnimation(world: World, context: AppContext): void {
	print("3. Updating animation...");
	// 动画更新
}

function renderScene(world: World, context: AppContext): void {
	print("4. Rendering scene...");
	// 渲染
}

// 创建应用并配置系统执行顺序
const app = App.create();

// 方法 1: 使用不同的调度阶段
app.addSystems(BuiltinSchedules.PRE_UPDATE, collectInput);
app.addSystems(BuiltinSchedules.UPDATE, updatePhysics, updateAnimation);
app.addSystems(BuiltinSchedules.POST_UPDATE, renderScene);

// 方法 2: 在同一调度内编排顺序
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
	// 添加带依赖的系统
	schedule.addSystem({
		system: collectInput,
		name: "CollectInput",
	});

	schedule.addSystem({
		system: updatePhysics,
		name: "UpdatePhysics",
		// 这个系统需要在 CollectInput 之后运行
	});

	schedule.addSystem({
		system: updateAnimation,
		name: "UpdateAnimation",
		// 这个系统可以和 UpdatePhysics 并行
	});

	schedule.addSystem({
		system: renderScene,
		name: "RenderScene",
		// 这个系统需要在所有逻辑更新之后运行
	});
});

app.run();
```

### 示例 4: 子应用集成

创建独立的渲染子应用：

```typescript
import { App, SubApp, createAppLabel, BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";

// 渲染数据组件
interface RenderData {
	mesh: string;
	material: string;
	transform: CFrame;
}

// 主应用中的Transform组件
interface Transform {
	position: Vector3;
	rotation: Vector3;
}

// 创建主应用
const app = App.create();

// 主应用系统
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	// 主应用的游戏逻辑
	for (const [entity, transform] of world.query({ transform: true })) {
		// 更新变换
		transform.position = transform.position.add(new Vector3(0, 0.1, 0));
	}
});

// 创建渲染子应用
const renderLabel = createAppLabel("Render");
const renderSubApp = new SubApp();

// 设置提取函数（从主世界提取数据到渲染世界）
renderSubApp.setExtract((mainWorld, renderWorld) => {
	// 从主世界提取需要渲染的实体
	for (const [entity, transform] of mainWorld.world.query({ transform: true })) {
		// 转换为渲染数据
		const renderData: RenderData = {
			mesh: "Sphere",
			material: "Plastic",
			transform: new CFrame(transform.position),
		};

		// 在渲染世界中创建或更新实体
		if (!renderWorld.world.contains(entity)) {
			renderWorld.world.insert(entity, renderData);
		} else {
			// 更新已存在的渲染数据
			const existing = renderWorld.world.get(entity, renderData);
			if (existing) {
				existing.transform = new CFrame(transform.position);
			}
		}
	}
});

// 添加渲染系统到子应用
renderSubApp.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	// 渲染逻辑
	for (const [entity, renderData] of world.query({ renderData: true })) {
		// 执行实际渲染
		renderMesh(renderData.mesh, renderData.material, renderData.transform);
	}
});

// 将渲染子应用插入主应用
app.insertSubApp(renderLabel, renderSubApp);

// 运行应用（子应用会自动更新）
app.run();

function renderMesh(mesh: string, material: string, transform: CFrame): void {
	// 实际渲染实现
	print(`Rendering ${mesh} with ${material} at ${transform.Position}`);
}
```

### 示例 5: 事件驱动架构

实现一个完整的事件系统：

```typescript
// 定义游戏事件
class PlayerDamagedEvent {
	constructor(
		public readonly playerId: number,
		public readonly damage: number,
		public readonly source: string
	) {}
}

class EnemyDefeatedEvent {
	constructor(
		public readonly enemyId: number,
		public readonly killedBy: number
	) {}
}

class LevelCompleteEvent {
	constructor(public readonly levelNumber: number) {}
}

// 创建应用
const app = App.create();

// 注册事件类型
app.addMessage<PlayerDamagedEvent>();
app.addMessage<EnemyDefeatedEvent>();
app.addMessage<LevelCompleteEvent>();

// 事件发送系统
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	// 检测玩家受伤
	for (const [entity, player, health] of world.query({ player: true, health: true })) {
		if (health.current < health.previous) {
			const damage = health.previous - health.current;

			// 发送事件
			const writer = context.messages.createWriter<PlayerDamagedEvent>();
			writer.send(new PlayerDamagedEvent(
				entity as number,
				damage,
				"Enemy"
			));
		}
	}
});

// 事件监听系统 1: 更新UI
app.addSystems(BuiltinSchedules.POST_UPDATE, (world, context) => {
	const reader = context.messages.createReader<PlayerDamagedEvent>();

	for (const event of reader.read()) {
		print(`Player ${event.playerId} took ${event.damage} damage from ${event.source}`);
		// 更新UI显示
		updateHealthUI(event.playerId, event.damage);
	}
});

// 事件监听系统 2: 播放音效
app.addSystems(BuiltinSchedules.POST_UPDATE, (world, context) => {
	const reader = context.messages.createReader<PlayerDamagedEvent>();

	for (const event of reader.read()) {
		// 播放受伤音效
		playSound("damage.mp3");
	}
});

// 事件监听系统 3: 敌人击败奖励
app.addSystems(BuiltinSchedules.POST_UPDATE, (world, context) => {
	const reader = context.messages.createReader<EnemyDefeatedEvent>();

	for (const event of reader.read()) {
		// 给予玩家奖励
		giveReward(event.killedBy, 100);
		print(`Player ${event.killedBy} defeated enemy ${event.enemyId}`);
	}
});

app.run();

function updateHealthUI(playerId: number, damage: number): void {
	// UI 更新实现
}

function playSound(soundFile: string): void {
	// 音效播放实现
}

function giveReward(playerId: number, amount: number): void {
	// 奖励发放实现
}
```

---

## 常见问题解答

### Q1: 插件应该在什么时候添加？

**A**: 插件必须在调用 `app.finish()` 或 `app.cleanup()` 之前添加。推荐的做法是在应用创建后立即添加所有插件：

```typescript
const app = App.create()
	.addPlugins(
		new CorePlugins(),
		new GamePlugins()
	)
	.run(); // run() 会自动调用 finish()
```

### Q2: 为什么我的启动系统执行了多次？

**A**: 确保你理解调度执行顺序。在第一次 `update()` 时，Main 调度会运行启动调度和常规调度。后续的 `update()` 只运行常规调度。

```typescript
// 第一次 update()
app.update(); // 运行: PreStartup → Startup → PostStartup → First → ... → Last

// 后续 update()
app.update(); // 只运行: First → PreUpdate → Update → PostUpdate → Last
```

### Q3: 如何在插件间共享数据？

**A**: 有三种主要方式：

1. **使用资源系统**（推荐）:
```typescript
// 插件 A
app.insertResource({ sharedData: "value" });

// 插件 B
const data = app.getResource<{ sharedData: string }>();
```

2. **使用 AppContext 扩展**:
```typescript
// 插件 A 注册扩展
this.registerExtension(app, 'shared', sharedService);

// 插件 B 使用扩展
const service = context.get('shared');
```

3. **使用 World 组件**:
```typescript
// 插件 A 创建实体
const entity = world.spawn();
world.insert(entity, sharedComponent);

// 插件 B 查询实体
for (const [e, component] of world.query({ sharedComponent: true })) {
	// 使用组件
}
```

### Q4: 系统执行顺序如何控制？

**A**: 有几种方式：

1. **使用不同的调度阶段**:
```typescript
app.addSystems(BuiltinSchedules.PRE_UPDATE, earlySystem);
app.addSystems(BuiltinSchedules.UPDATE, normalSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, lateSystem);
```

2. **在同一调度内配置顺序**（需要在调度编译前）:
```typescript
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
	schedule.addSystem({ system: system1, name: "System1" });
	schedule.addSystem({ system: system2, name: "System2" });
	// system1 会在 system2 之前执行
});
```

3. **使用自定义调度并控制运行顺序**:
```typescript
app.main().configureScheduleOrder(BuiltinSchedules.UPDATE, "CustomSchedule");
```

### Q5: 如何处理异步操作？

**A**: Bevy 的系统是同步的，但你可以：

1. **使用 Roblox 的异步工具**:
```typescript
function asyncSystem(world: World, context: AppContext): void {
	task.spawn(() => {
		// 异步操作
		const result = waitForAsyncOperation();

		// 结果需要通过命令或事件传回系统
		const writer = context.messages.createWriter<ResultEvent>();
		writer.send(new ResultEvent(result));
	});
}
```

2. **在插件 `ready()` 中检查异步完成**:
```typescript
class AsyncPlugin extends BasePlugin {
	private loaded = false;

	build(app: App): void {
		task.spawn(() => {
			loadAssets();
			this.loaded = true;
		});
	}

	ready(app: App): boolean {
		return this.loaded;
	}

	name(): string {
		return "AsyncPlugin";
	}
}
```

### Q6: SubApp 什么时候使用？

**A**: SubApp 适用于需要独立 World 和调度的场景：

- **渲染子应用**: 从主应用提取渲染数据，独立渲染
- **网络子应用**: 处理网络同步逻辑
- **物理子应用**: 固定时间步的物理模拟
- **编辑器子应用**: 在游戏内实现编辑器功能

大多数情况下，使用主应用的不同调度阶段就足够了。

### Q7: 如何调试系统执行问题？

**A**: 使用以下技巧：

1. **添加日志系统**:
```typescript
function logSystem(world: World, context: AppContext): void {
	print(`[${os.clock()}] System executing`);
}
```

2. **使用执行追踪器**（见调试技巧部分）

3. **检查调度配置**:
```typescript
const order = app.main().getScheduleOrder();
print(`Schedule order: ${order.join(" → ")}`);
```

4. **添加错误处理器**:
```typescript
app.setErrorHandler((error) => {
	warn(`System error: ${error}`);
	print(debug.traceback());
});
```

### Q8: 性能优化建议？

**A**:

1. **避免在系统中创建大量临时对象**
2. **使用对象池重用实体和组件**
3. **批量处理命令而不是逐个执行**
4. **将频繁访问的资源缓存在插件中**
5. **使用条件执行避免不必要的系统运行**
6. **合理使用调度阶段，避免过度细分**

---

## API 参考

### App 类 API

#### 构造和创建

| 方法 | 签名 | 说明 |
|------|------|------|
| `constructor` | `(context?: AppContext)` | 创建 App 实例 |
| `create` | `static (): App` | 创建标准 App |
| `empty` | `static (): App` | 创建空 App（无默认调度） |

#### 插件管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `addPlugin` | `(plugin: Plugin): this` | 添加单个插件 |
| `addPlugins` | `(...plugins: (Plugin \| PluginGroup)[]): this` | 添加多个插件 |
| `isPluginAdded` | `<T>(type: new (...args: unknown[]) => T): boolean` | 检查插件是否已添加 |
| `getAddedPlugins` | `<T>(type: new (...args: unknown[]) => T): T[]` | 获取已添加的插件 |
| `getPluginState` | `(): PluginState` | 获取插件状态 |
| `finish` | `(): void` | 完成插件设置 |
| `cleanup` | `(): void` | 清理插件 |

#### 系统管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `addSystems` | `(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this` | 添加系统 |
| `addServerSystems` | `(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this` | 添加服务端系统 |
| `addClientSystems` | `(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this` | 添加客户端系统 |

#### 调度管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `addSchedule` | `(schedule: Schedule): this` | 添加调度 |
| `initSchedule` | `(label: ScheduleLabel): this` | 初始化调度 |
| `getSchedule` | `(label: ScheduleLabel): Schedule \| undefined` | 获取调度 |
| `editSchedule` | `(label: ScheduleLabel, editor: (s: Schedule) => void): this` | 编辑调度 |
| `runSchedule` | `(label: ScheduleLabel): void` | 运行调度 |

#### 资源管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `insertResource` | `<T>(resource: T): this` | 插入资源 |
| `getResource` | `<T>(): T \| undefined` | 获取资源 |

#### 消息管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `addMessage` | `<T>(): this` | 添加消息类型 |

#### 运行控制

| 方法 | 签名 | 说明 |
|------|------|------|
| `run` | `(): AppExit` | 运行应用 |
| `update` | `(): void` | 更新一帧 |
| `setRunner` | `(runner: (app: App) => AppExit): this` | 设置自定义运行器 |
| `exit` | `(): void` | 发送退出事件 |
| `exitWithCode` | `(code: number): void` | 发送退出事件（带错误码） |
| `shouldExit` | `(): AppExit \| undefined` | 检查是否应退出 |

#### SubApp 管理

| 方法 | 签名 | 说明 |
|------|------|------|
| `main` | `(): SubApp` | 获取主 SubApp |
| `subApp` | `(label: AppLabel): SubApp` | 获取指定 SubApp |
| `getSubApp` | `(label: AppLabel): SubApp \| undefined` | 安全获取 SubApp |
| `insertSubApp` | `(label: AppLabel, subApp: SubApp): void` | 插入 SubApp |
| `removeSubApp` | `(label: AppLabel): SubApp \| undefined` | 移除 SubApp |

#### 其他

| 方法 | 签名 | 说明 |
|------|------|------|
| `world` | `(): WorldContainer` | 获取 World 容器 |
| `getWorld` | `(): BevyWorld` | 获取 BevyWorld |
| `getContext` | `(): AppContext` | 获取应用上下文 |
| `setErrorHandler` | `(handler: ErrorHandler): this` | 设置错误处理器 |
| `getErrorHandler` | `(): ErrorHandler \| undefined` | 获取错误处理器 |

### Plugin 接口 API

| 方法 | 签名 | 必需 | 说明 |
|------|------|------|------|
| `build` | `(app: App): void` | ✅ | 配置应用 |
| `ready` | `(app: App): boolean` | ❌ | 检查是否准备完成 |
| `finish` | `(app: App): void` | ❌ | 完成设置 |
| `cleanup` | `(app: App): void` | ❌ | 清理资源 |
| `name` | `(): string` | ✅ | 插件名称 |
| `isUnique` | `(): boolean` | ✅ | 是否唯一 |
| `robloxContext` | `?: RobloxContext` | ❌ | 运行环境 |

### SubApp 类 API

| 方法 | 签名 | 说明 |
|------|------|------|
| `world` | `(): WorldContainer` | 获取 World 容器 |
| `setUpdateSchedule` | `(schedule: ScheduleLabel): void` | 设置更新调度 |
| `setExtract` | `(fn: (main: WorldContainer, sub: WorldContainer) => void): void` | 设置提取函数 |
| `update` | `(): void` | 更新子应用 |
| `addSystems` | `(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): void` | 添加系统 |
| `runSchedule` | `(label: ScheduleLabel): void` | 运行调度 |
| `startLoop` | `(events: { [schedule: string]: RBXScriptSignal }): void` | 启动 Loop |
| `stopLoop` | `(): void` | 停止 Loop |

### BuiltinSchedules 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `FIRST` | `"First"` | 第一个调度 |
| `PRE_STARTUP` | `"PreStartup"` | 预启动调度 |
| `STARTUP` | `"Startup"` | 启动调度 |
| `POST_STARTUP` | `"PostStartup"` | 后启动调度 |
| `PRE_UPDATE` | `"PreUpdate"` | 预更新调度 |
| `UPDATE` | `"Update"` | 更新调度 |
| `POST_UPDATE` | `"PostUpdate"` | 后更新调度 |
| `LAST` | `"Last"` | 最后调度 |
| `MAIN` | `"Main"` | 主调度 |
| `FIXED_FIRST` | `"FixedFirst"` | 固定第一调度 |
| `FIXED_PRE_UPDATE` | `"FixedPreUpdate"` | 固定预更新 |
| `FIXED_UPDATE` | `"FixedUpdate"` | 固定更新 |
| `FIXED_POST_UPDATE` | `"FixedPostUpdate"` | 固定后更新 |
| `FIXED_LAST` | `"FixedLast"` | 固定最后 |

### AppContext API

| 属性/方法 | 签名 | 说明 |
|-----------|------|------|
| `resources` | `ResourceManager` | 资源管理器 |
| `commands` | `CommandBuffer` | 命令缓冲 |
| `messages` | `MessageRegistry` | 消息注册表 |
| `events` | `EventManager` | 事件管理器 |
| `insertResource` | `<T>(resource: T): this` | 插入资源 |
| `getResource` | `<T>(): T \| undefined` | 获取资源 |
| `trigger` | `<E>(event: E): void` | 触发事件 |
| `addObserver` | `<E>(type: new (...args: never[]) => E, cb: ObserverCallback<E>): ObserverConnection` | 添加观察者 |

---

## 总结

`bevy_app` 模块提供了一个强大、灵活、类型安全的应用程序框架。通过掌握其核心概念（App、Plugin、Schedule、SubApp）和最佳实践，你可以构建结构清晰、易于维护的大型 Roblox 游戏应用。

### 关键要点

1. **模块化设计**: 使用插件系统组织代码
2. **确定性调度**: 利用内置调度阶段控制系统执行顺序
3. **资源共享**: 通过资源系统和 AppContext 实现插件间通信
4. **类型安全**: 充分利用 TypeScript 类型系统
5. **性能优化**: 合理使用调度、批量操作、资源缓存

### 下一步学习

- 深入学习 `bevy_ecs` 模块（ECS 核心实现）
- 了解 `bevy_time` 模块（时间管理）
- 探索 `bevy_diagnostic` 模块（性能诊断）
- 研究高级调度配置和系统依赖管理

---

**文档版本**: 1.0.0
**最后更新**: 2025-09-28
**维护者**: White Dragon Bevy 团队