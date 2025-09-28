# bevy_diagnostic 模块操作手册

## 📋 模块概述

`bevy_diagnostic` 模块提供了一个强大的诊断系统，用于收集、管理和监控应用程序的性能指标。它源自 Rust Bevy 框架的 `bevy_diagnostic` 模块，提供了 FPS 统计、帧时间监控、实体计数等核心诊断功能。

### 核心特性

- 📊 **时间序列数据收集** - 支持历史记录和统计分析
- 🎯 **多种聚合方式** - 简单移动平均(SMA)和指数移动平均(EMA)
- 🔌 **插件化架构** - 易于扩展的诊断系统
- 📈 **内置诊断插件** - FPS、帧时间、实体计数等
- 📝 **灵活的日志输出** - 支持过滤和自定义格式
- 🎨 **多种渲染格式** - 文本、JSON、表格

### 应用场景

- **性能监控** - 实时监控游戏性能指标
- **性能优化** - 识别性能瓶颈
- **调试辅助** - 追踪系统行为
- **自定义指标** - 记录业务相关的统计数据

---

## 🏗️ 核心组件

### 1. DiagnosticPath（诊断路径）

诊断的唯一标识符，使用 `/` 分隔的字符串路径。

#### 创建方式

```typescript
// 方式 1: 直接创建
const path = DiagnosticPath.constNew("fps");

// 方式 2: 从组件数组创建
const path = DiagnosticPath.fromComponents(["game", "performance", "fps"]);

// 方式 3: 嵌套路径
const path = DiagnosticPath.constNew("game/combat/damage_dealt");
```

#### 路径规则

- ✅ **允许**: `"fps"`, `"frame_time"`, `"game/player/health"`
- ❌ **禁止**: `""`, `"/fps"`, `"fps/"`, `"game//player"`

#### 常用操作

```typescript
const path = DiagnosticPath.constNew("game/player/health");

// 获取路径字符串
const pathStr = path.asStr(); // "game/player/health"

// 获取路径组件
const components = path.components(); // ["game", "player", "health"]

// 用于 Map 键
const diagnosticMap = new Map<string, Diagnostic>();
diagnosticMap.set(path.toString(), diagnostic);
```

---

### 2. Diagnostic（诊断时间线）

存储特定类型测量值的时间序列数据。

#### 基本创建

```typescript
const path = DiagnosticPath.constNew("fps");
const diagnostic = Diagnostic.create(path);

// 链式配置
const diagnostic = Diagnostic.create(path)
	.withMaxHistoryLength(120)     // 保留 120 个历史值
	.withSuffix("fps")             // 单位后缀
	.withSmoothingFactor(0.1);     // EMA 平滑因子
```

#### 添加测量值

```typescript
// 单次测量
diagnostic.addMeasurement({
	time: os.clock(),
	value: 60.5,
});

// 批量添加
for (let index = 0; index < 100; index++) {
	diagnostic.addMeasurement({
		time: os.clock(),
		value: math.random() * 60,
	});
}
```

#### 数据获取

```typescript
// 获取最新值
const latestValue = diagnostic.value(); // number | undefined

// 获取最新测量（包含时间戳）
const latestMeasurement = diagnostic.measurement();
// { time: number, value: number } | undefined

// 获取简单移动平均值 (SMA)
const average = diagnostic.average(); // number | undefined

// 获取指数移动平均值 (EMA)
const smoothed = diagnostic.smoothed(); // number | undefined

// 获取所有值
const allValues = diagnostic.values(); // number[]

// 获取所有测量记录
const allMeasurements = diagnostic.measurements(); // DiagnosticMeasurement[]
```

#### 历史管理

```typescript
// 获取历史长度
const historyLen = diagnostic.historyLen(); // number

// 获取时间跨度（最旧到最新的时间差）
const duration = diagnostic.duration(); // number | undefined

// 清空历史
diagnostic.clearHistory();

// 获取最大历史长度设置
const maxLen = diagnostic.getMaxHistoryLength(); // number
```

#### 启用/禁用

```typescript
// 禁用诊断（不再收集数据）
diagnostic.isEnabled = false;

// 重新启用
diagnostic.isEnabled = true;
```

---

### 3. DiagnosticsStore（诊断存储）

管理所有诊断实例的资源容器。

#### 基本操作

```typescript
// 创建存储（通常由 DiagnosticsPlugin 自动创建）
const store = new DiagnosticsStore();

// 添加诊断
const path = DiagnosticPath.constNew("fps");
const diagnostic = Diagnostic.create(path);
store.add(diagnostic);

// 获取诊断
const retrieved = store.get(path);
if (retrieved) {
	print(`FPS: ${retrieved.value()}`);
}

// 获取最新测量值（仅限已启用的诊断）
const measurement = store.getMeasurement(path);
```

#### 遍历诊断

```typescript
// 方式 1: 获取数组
const allDiagnostics = store.iter();
for (const diagnostic of allDiagnostics) {
	print(`${diagnostic.getPath().asStr()}: ${diagnostic.value()}`);
}

// 方式 2: 使用回调
store.iterDiagnostics((diagnostic) => {
	if (diagnostic.isEnabled) {
		print(diagnostic.value());
	}
});
```

#### 管理操作

```typescript
// 获取所有诊断
const all = store.getAll();

// 清空所有诊断
store.clear();
```

---

### 4. Diagnostics（系统参数）

用于在系统中记录新测量值的辅助类。

#### 在系统中使用

```typescript
function myDiagnosticSystem(world: World, context: Context): void {
	const resources = world.resources;
	const store = resources.getResource<DiagnosticsStore>();
	if (!store) return;

	const diagnostics = new Diagnostics(store);

	// 添加测量值（仅在诊断启用时调用回调）
	diagnostics.addMeasurement(
		DiagnosticPath.constNew("custom/metric"),
		() => {
			// 这个函数仅在诊断启用时执行
			return calculateExpensiveMetric();
		},
	);

	// 应用所有挂起的测量值
	diagnostics.apply();
}
```

**重要**: 必须调用 `apply()` 来将测量值实际添加到诊断中。

---

## 🔌 内置插件

### 1. DiagnosticsPlugin（核心插件）

基础诊断系统，必须首先添加。

```typescript
const app = App.create();
app.addPlugin(new DiagnosticsPlugin());
```

#### 扩展接口

```typescript
// 获取诊断扩展
const diagnosticExt = app.context.getExtension("diagnostic");

// 注册诊断（方式 1：配置对象）
diagnosticExt.registerDiagnostic({
	id: "custom/metric",
	name: "units",
	value: 100,
	maxHistory: 60,
});

// 注册诊断（方式 2：Diagnostic 对象）
const path = DiagnosticPath.constNew("custom/metric");
const diagnostic = Diagnostic.create(path).withSuffix("ms");
diagnosticExt.registerDiagnostic(diagnostic);

// 获取诊断
const diagnostic = diagnosticExt.getDiagnostic("fps");

// 更新诊断值
diagnosticExt.updateDiagnostic("fps", 60.5);

// 获取所有诊断
const all = diagnosticExt.getAllDiagnostics();

// 清空诊断
diagnosticExt.clearDiagnostics();

// 渲染到控制台
diagnosticExt.renderToConsole();

// 设置渲染格式
diagnosticExt.setRenderFormat("table"); // "json" | "text" | "table"
```

---

### 2. FrameCountPlugin（帧计数插件）

维护应用启动以来的总帧数。

```typescript
const app = App.create();
app.addPlugin(new FrameCountPlugin());

// 获取帧计数资源
const frameCount = app.getResource<FrameCount>();
print(`Current frame: ${frameCount?.value}`);
```

#### 特性

- **自动递增** - 在 `Last` 调度阶段自动增加
- **溢出处理** - 在 2^32-1 后自动回绕到 0
- **可预测行为** - 第一次更新时为 0，下一次为 1

```typescript
// 手动更新（通常不需要）
updateFrameCount(world, context);
```

---

### 3. FrameTimeDiagnosticsPlugin（帧时间诊断插件）

提供帧时间、FPS 和帧计数的诊断。

```typescript
const app = App.create();
app.addPlugin(new DiagnosticsPlugin());
app.addPlugin(new FrameTimeDiagnosticsPlugin());

// 自定义历史长度
app.addPlugin(new FrameTimeDiagnosticsPlugin(60)); // 保留 60 帧历史
```

#### 诊断路径

```typescript
// FPS（每秒帧数）
FrameTimeDiagnosticsPlugin.FPS // "fps"

// 帧时间（毫秒）
FrameTimeDiagnosticsPlugin.FRAME_TIME // "frame_time"

// 帧计数
FrameTimeDiagnosticsPlugin.FRAME_COUNT // "frame_count"
```

#### 获取数据

```typescript
const store = app.getResource<DiagnosticsStore>();

// 获取当前 FPS
const fpsDiagnostic = store?.get(FrameTimeDiagnosticsPlugin.FPS);
const currentFps = fpsDiagnostic?.smoothed(); // 使用平滑值更稳定

// 获取帧时间
const frameTimeDiagnostic = store?.get(FrameTimeDiagnosticsPlugin.FRAME_TIME);
const frameTime = frameTimeDiagnostic?.average();
print(`Frame time: ${frameTime}ms`);
```

---

### 4. EntityCountDiagnosticsPlugin（实体计数插件）

监控 ECS World 中的实体数量。

```typescript
const app = App.create();
app.addPlugin(new DiagnosticsPlugin());
app.addPlugin(new EntityCountDiagnosticsPlugin());

// 自定义历史长度
app.addPlugin(new EntityCountDiagnosticsPlugin(100));
```

#### 诊断路径

```typescript
// 实体计数
EntityCountDiagnosticsPlugin.ENTITY_COUNT // "entity_count"
```

#### 获取数据

```typescript
const store = app.getResource<DiagnosticsStore>();
const entityDiagnostic = store?.get(EntityCountDiagnosticsPlugin.ENTITY_COUNT);
const entityCount = entityDiagnostic?.value();
print(`Entities: ${entityCount}`);
```

---

### 5. LogDiagnosticsPlugin（日志输出插件）

将诊断信息输出到控制台。

#### 基本用法

```typescript
const app = App.create();
app.addPlugin(new DiagnosticsPlugin());
app.addPlugin(new FrameTimeDiagnosticsPlugin());

// 标准模式（每秒输出一次）
app.addPlugin(new LogDiagnosticsPlugin());

// 调试模式（输出详细信息）
app.addPlugin(new LogDiagnosticsPlugin({ debug: true }));

// 自定义输出间隔
app.addPlugin(new LogDiagnosticsPlugin({ waitDuration: 2 })); // 每 2 秒输出
```

#### 过滤输出

```typescript
// 仅输出指定的诊断
const filter = new Set<string>();
filter.add("fps");
filter.add("frame_time");

app.addPlugin(LogDiagnosticsPlugin.filtered(filter));

// 或使用构造函数
app.addPlugin(new LogDiagnosticsPlugin({ filter }));
```

#### 动态管理过滤器

```typescript
const state = app.getResource<LogDiagnosticsState>();

// 添加过滤器
const path = DiagnosticPath.constNew("custom/metric");
state?.addFilter(path);

// 批量添加
const paths = [
	DiagnosticPath.constNew("fps"),
	DiagnosticPath.constNew("frame_time"),
];
state?.extendFilter(paths);

// 移除过滤器
state?.removeFilter(path);

// 清空过滤器
state?.clearFilter();

// 启用/禁用过滤
state?.enableFiltering();
state?.disableFiltering();

// 修改输出间隔
state?.setTimerDuration(5); // 改为每 5 秒输出
```

#### 输出格式

标准模式输出示例：

```
fps         :      60.123456    (avg 59.876543)
frame_time  :      16.666667ms  (avg 16.789012ms)
entity_count:         150
```

---

## 🎯 实战示例

### 示例 1: 基础 FPS 监控

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import {
	DiagnosticsPlugin,
	FrameTimeDiagnosticsPlugin,
	LogDiagnosticsPlugin,
} from "@white-dragon-bevy/bevy-framework/bevy_diagnostic";

function setupFpsMonitoring(): App {
	const app = App.create();

	// 1. 添加核心诊断系统
	app.addPlugin(new DiagnosticsPlugin());

	// 2. 添加帧时间诊断
	app.addPlugin(new FrameTimeDiagnosticsPlugin());

	// 3. 添加日志输出（每 2 秒输出一次）
	const filter = new Set<string>();
	filter.add("fps");
	filter.add("frame_time");

	app.addPlugin(
		new LogDiagnosticsPlugin({
			waitDuration: 2,
			filter: filter,
		}),
	);

	return app;
}

const app = setupFpsMonitoring();
app.run();
```

---

### 示例 2: 自定义性能指标

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { Update } from "@white-dragon-bevy/bevy-framework/bevy_app";
import {
	DiagnosticsPlugin,
	DiagnosticPath,
	Diagnostic,
	Diagnostics,
	DiagnosticsStore,
	registerDiagnostic,
} from "@white-dragon-bevy/bevy-framework/bevy_diagnostic";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy-framework/bevy_ecs";

// 自定义诊断路径
class CustomDiagnostics {
	static readonly PLAYER_COUNT = DiagnosticPath.constNew("game/player_count");
	static readonly AVERAGE_PING = DiagnosticPath.constNew("game/network/ping");
	static readonly MEMORY_USAGE = DiagnosticPath.constNew("system/memory");
}

function setupCustomDiagnostics(): App {
	const app = App.create();

	// 添加核心插件
	app.addPlugin(new DiagnosticsPlugin());

	// 注册自定义诊断
	registerDiagnostic(
		app,
		Diagnostic.create(CustomDiagnostics.PLAYER_COUNT)
			.withMaxHistoryLength(60)
			.withSuffix(" players"),
	);

	registerDiagnostic(
		app,
		Diagnostic.create(CustomDiagnostics.AVERAGE_PING)
			.withMaxHistoryLength(120)
			.withSuffix("ms")
			.withSmoothingFactor(0.1), // 更平滑的曲线
	);

	registerDiagnostic(
		app,
		Diagnostic.create(CustomDiagnostics.MEMORY_USAGE)
			.withMaxHistoryLength(300)
			.withSuffix("MB"),
	);

	// 添加更新系统
	app.addSystems(Update, updateCustomDiagnostics);

	return app;
}

function updateCustomDiagnostics(world: World, context: Context): void {
	const resources = world.resources;
	const store = resources.getResource<DiagnosticsStore>();
	if (!store) return;

	const diagnostics = new Diagnostics(store);

	// 记录玩家数量
	diagnostics.addMeasurement(CustomDiagnostics.PLAYER_COUNT, () => {
		return getPlayerCount(); // 你的实现
	});

	// 记录平均延迟
	diagnostics.addMeasurement(CustomDiagnostics.AVERAGE_PING, () => {
		return calculateAveragePing(); // 你的实现
	});

	// 记录内存使用
	diagnostics.addMeasurement(CustomDiagnostics.MEMORY_USAGE, () => {
		return getMemoryUsageMB(); // 你的实现
	});

	diagnostics.apply();
}

// 辅助函数（示例）
function getPlayerCount(): number {
	// 实现玩家计数逻辑
	return 10;
}

function calculateAveragePing(): number {
	// 实现延迟计算逻辑
	return 50;
}

function getMemoryUsageMB(): number {
	// 实现内存监控逻辑
	return 256;
}
```

---

### 示例 3: 性能分析仪表板

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { Update, PostUpdate } from "@white-dragon-bevy/bevy-framework/bevy_app";
import {
	DiagnosticsPlugin,
	FrameTimeDiagnosticsPlugin,
	EntityCountDiagnosticsPlugin,
	DiagnosticsStore,
	FrameTimeDiagnosticsPlugin as FTD,
	EntityCountDiagnosticsPlugin as ECD,
} from "@white-dragon-bevy/bevy-framework/bevy_diagnostic";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy-framework/bevy_ecs";

interface PerformanceStats {
	fps: number;
	frameTime: number;
	entityCount: number;
	avgFps: number;
	avgFrameTime: number;
}

function setupPerformanceDashboard(): App {
	const app = App.create();

	// 添加诊断插件
	app.addPlugin(new DiagnosticsPlugin());
	app.addPlugin(new FrameTimeDiagnosticsPlugin(120));
	app.addPlugin(new EntityCountDiagnosticsPlugin(60));

	// 添加仪表板更新系统
	app.addSystems(PostUpdate, updatePerformanceDashboard);

	return app;
}

function updatePerformanceDashboard(world: World, context: Context): void {
	const resources = world.resources;
	const store = resources.getResource<DiagnosticsStore>();
	if (!store) return;

	const stats = collectPerformanceStats(store);
	if (stats) {
		displayPerformanceDashboard(stats);
	}
}

function collectPerformanceStats(store: DiagnosticsStore): PerformanceStats | undefined {
	const fpsDiagnostic = store.get(FTD.FPS);
	const frameTimeDiagnostic = store.get(FTD.FRAME_TIME);
	const entityDiagnostic = store.get(ECD.ENTITY_COUNT);

	// 检查是否有足够的数据
	if (!fpsDiagnostic || !frameTimeDiagnostic || !entityDiagnostic) {
		return undefined;
	}

	const fps = fpsDiagnostic.smoothed();
	const frameTime = frameTimeDiagnostic.smoothed();
	const entityCount = entityDiagnostic.value();
	const avgFps = fpsDiagnostic.average();
	const avgFrameTime = frameTimeDiagnostic.average();

	if (fps === undefined || frameTime === undefined || entityCount === undefined) {
		return undefined;
	}

	if (avgFps === undefined || avgFrameTime === undefined) {
		return undefined;
	}

	return {
		fps: fps,
		frameTime: frameTime,
		entityCount: entityCount,
		avgFps: avgFps,
		avgFrameTime: avgFrameTime,
	};
}

function displayPerformanceDashboard(stats: PerformanceStats): void {
	// 每秒更新一次
	const currentTime = os.clock();
	if (!lastUpdateTime || currentTime - lastUpdateTime >= 1) {
		print("=== Performance Dashboard ===");
		print(`FPS:          ${stats.fps.toFixed(1)} (avg: ${stats.avgFps.toFixed(1)})`);
		print(`Frame Time:   ${stats.frameTime.toFixed(2)}ms (avg: ${stats.avgFrameTime.toFixed(2)}ms)`);
		print(`Entities:     ${stats.entityCount}`);

		// 性能等级指示
		const perfLevel = getPerformanceLevel(stats.fps);
		print(`Performance:  ${perfLevel}`);
		print("============================");

		lastUpdateTime = currentTime;
	}
}

let lastUpdateTime = 0;

function getPerformanceLevel(fps: number): string {
	if (fps >= 55) return "🟢 Excellent";
	if (fps >= 45) return "🟡 Good";
	if (fps >= 30) return "🟠 Fair";
	return "🔴 Poor";
}
```

---

### 示例 4: 条件诊断和性能预算

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { Update } from "@white-dragon-bevy/bevy-framework/bevy_app";
import {
	DiagnosticsPlugin,
	DiagnosticPath,
	Diagnostic,
	DiagnosticsStore,
	registerDiagnostic,
} from "@white-dragon-bevy/bevy-framework/bevy_diagnostic";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy-framework/bevy_ecs";

// 性能预算配置
interface PerformanceBudget {
	maxFrameTime: number; // 毫秒
	maxEntityCount: number;
	minFps: number;
}

const PERFORMANCE_BUDGET: PerformanceBudget = {
	maxFrameTime: 16.67, // 60 FPS
	maxEntityCount: 1000,
	minFps: 55,
};

class BudgetDiagnostics {
	static readonly FRAME_BUDGET_EXCEEDED = DiagnosticPath.constNew("budget/frame_time_exceeded");
	static readonly ENTITY_BUDGET_EXCEEDED = DiagnosticPath.constNew("budget/entity_count_exceeded");
	static readonly FPS_BELOW_TARGET = DiagnosticPath.constNew("budget/fps_below_target");
}

function setupPerformanceBudget(): App {
	const app = App.create();

	app.addPlugin(new DiagnosticsPlugin());

	// 注册预算诊断（使用计数器）
	registerDiagnostic(
		app,
		Diagnostic.create(BudgetDiagnostics.FRAME_BUDGET_EXCEEDED)
			.withMaxHistoryLength(60)
			.withSuffix(" times"),
	);

	registerDiagnostic(
		app,
		Diagnostic.create(BudgetDiagnostics.ENTITY_BUDGET_EXCEEDED)
			.withMaxHistoryLength(60)
			.withSuffix(" times"),
	);

	registerDiagnostic(
		app,
		Diagnostic.create(BudgetDiagnostics.FPS_BELOW_TARGET)
			.withMaxHistoryLength(60)
			.withSuffix(" times"),
	);

	app.addSystems(Update, checkPerformanceBudget);

	return app;
}

let budgetViolationCounts = {
	frameTime: 0,
	entityCount: 0,
	fps: 0,
};

function checkPerformanceBudget(world: World, context: Context): void {
	const resources = world.resources;
	const store = resources.getResource<DiagnosticsStore>();
	if (!store) return;

	// 获取当前性能指标
	const deltaTime = context.has("time") ? context.get("time").getDeltaSeconds() : 0.016;
	const frameTimeMs = deltaTime * 1000;

	let entityCount = 0;
	for (const _ of world.query()) {
		entityCount++;
	}

	const fps = 1.0 / deltaTime;

	// 检查预算违规
	if (frameTimeMs > PERFORMANCE_BUDGET.maxFrameTime) {
		budgetViolationCounts.frameTime++;
		warn(`Frame time budget exceeded: ${frameTimeMs.toFixed(2)}ms > ${PERFORMANCE_BUDGET.maxFrameTime}ms`);
	}

	if (entityCount > PERFORMANCE_BUDGET.maxEntityCount) {
		budgetViolationCounts.entityCount++;
		warn(`Entity count budget exceeded: ${entityCount} > ${PERFORMANCE_BUDGET.maxEntityCount}`);
	}

	if (fps < PERFORMANCE_BUDGET.minFps) {
		budgetViolationCounts.fps++;
		warn(`FPS below target: ${fps.toFixed(1)} < ${PERFORMANCE_BUDGET.minFps}`);
	}

	// 记录违规次数
	const diagnostic = store.get(BudgetDiagnostics.FRAME_BUDGET_EXCEEDED);
	if (diagnostic) {
		diagnostic.addMeasurement({
			time: os.clock(),
			value: budgetViolationCounts.frameTime,
		});
	}

	const entityDiagnostic = store.get(BudgetDiagnostics.ENTITY_BUDGET_EXCEEDED);
	if (entityDiagnostic) {
		entityDiagnostic.addMeasurement({
			time: os.clock(),
			value: budgetViolationCounts.entityCount,
		});
	}

	const fpsDiagnostic = store.get(BudgetDiagnostics.FPS_BELOW_TARGET);
	if (fpsDiagnostic) {
		fpsDiagnostic.addMeasurement({
			time: os.clock(),
			value: budgetViolationCounts.fps,
		});
	}
}
```

---

### 示例 5: 动态启用/禁用诊断

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import {
	DiagnosticsPlugin,
	DiagnosticPath,
	DiagnosticsStore,
} from "@white-dragon-bevy/bevy-framework/bevy_diagnostic";

function toggleDiagnostics(app: App, enable: boolean): void {
	const store = app.getResource<DiagnosticsStore>();
	if (!store) return;

	// 切换所有诊断
	store.iterDiagnostics((diagnostic) => {
		diagnostic.isEnabled = enable;
	});

	print(`Diagnostics ${enable ? "enabled" : "disabled"}`);
}

function toggleSpecificDiagnostic(app: App, pathStr: string, enable: boolean): void {
	const store = app.getResource<DiagnosticsStore>();
	if (!store) return;

	const path = DiagnosticPath.constNew(pathStr);
	const diagnostic = store.get(path);

	if (diagnostic) {
		diagnostic.isEnabled = enable;
		print(`Diagnostic '${pathStr}' ${enable ? "enabled" : "disabled"}`);
	} else {
		warn(`Diagnostic '${pathStr}' not found`);
	}
}

// 使用示例
const app = App.create();
app.addPlugin(new DiagnosticsPlugin());

// 禁用所有诊断（用于发布版本）
toggleDiagnostics(app, false);

// 仅启用 FPS 诊断
toggleSpecificDiagnostic(app, "fps", true);
```

---

## 📚 最佳实践

### 1. 性能优化

```typescript
// ✅ 好: 使用延迟计算，仅在诊断启用时执行
diagnostics.addMeasurement(path, () => {
	return expensiveCalculation(); // 仅在诊断启用时调用
});

// ❌ 差: 总是计算
const value = expensiveCalculation(); // 即使诊断禁用也会执行
diagnostics.addMeasurement(path, () => value);
```

### 2. 历史长度配置

```typescript
// 短期监控（秒级）- 60 帧 @ 60fps = 1 秒
Diagnostic.create(path).withMaxHistoryLength(60);

// 中期监控（分钟级）- 3600 帧 @ 60fps = 1 分钟
Diagnostic.create(path).withMaxHistoryLength(3600);

// 实时监控（无历史）- 仅保留当前值
Diagnostic.create(path).withMaxHistoryLength(1);

// 平滑曲线（大历史 + 低平滑因子）
Diagnostic.create(path).withMaxHistoryLength(300).withSmoothingFactor(0.05);
```

### 3. 命名规范

```typescript
// ✅ 使用层级路径
DiagnosticPath.constNew("game/combat/damage_dealt");
DiagnosticPath.constNew("game/network/latency");
DiagnosticPath.constNew("system/memory/heap");

// ❌ 避免扁平命名
DiagnosticPath.constNew("damage_dealt"); // 难以组织
DiagnosticPath.constNew("latency"); // 缺乏上下文
```

### 4. 条件性诊断

```typescript
const IS_DEVELOPMENT = true; // 根据环境设置

function setupDiagnostics(app: App): void {
	app.addPlugin(new DiagnosticsPlugin());

	if (IS_DEVELOPMENT) {
		// 开发环境：详细诊断
		app.addPlugin(new FrameTimeDiagnosticsPlugin(120));
		app.addPlugin(new EntityCountDiagnosticsPlugin(120));
		app.addPlugin(new LogDiagnosticsPlugin());
	} else {
		// 生产环境：基础诊断
		app.addPlugin(new FrameTimeDiagnosticsPlugin(60));
		// 不添加日志插件
	}
}
```

### 5. 过滤重要指标

```typescript
// 仅输出关键性能指标
const criticalMetrics = new Set<string>([
	"fps",
	"frame_time",
	"entity_count",
]);

app.addPlugin(LogDiagnosticsPlugin.filtered(criticalMetrics));
```

### 6. 使用平滑值

```typescript
// 对于 UI 显示，使用平滑值避免抖动
const fpsDiagnostic = store?.get(FrameTimeDiagnosticsPlugin.FPS);
const smoothFps = fpsDiagnostic?.smoothed(); // 更稳定

// 对于精确分析，使用实际值
const actualFps = fpsDiagnostic?.value(); // 更精确
```

### 7. 清理历史数据

```typescript
// 在长时间运行后清理历史，避免内存积累
function periodicCleanup(world: World, context: Context): void {
	const store = world.resources.getResource<DiagnosticsStore>();
	if (!store) return;

	const currentTime = os.clock();
	if (!lastCleanupTime || currentTime - lastCleanupTime > 3600) {
		// 每小时清理一次
		store.iterDiagnostics((diagnostic) => {
			diagnostic.clearHistory();
		});
		lastCleanupTime = currentTime;
	}
}

let lastCleanupTime = 0;
```

### 8. 错误处理

```typescript
function safeDiagnosticAccess(store: DiagnosticsStore, pathStr: string): number | undefined {
	try {
		const path = DiagnosticPath.constNew(pathStr);
		const diagnostic = store.get(path);
		return diagnostic?.value();
	} catch (error) {
		warn(`Failed to access diagnostic '${pathStr}': ${error}`);
		return undefined;
	}
}
```

---

## 🔧 故障排查

### 问题 1: 诊断值为 undefined

**原因**:
- 诊断尚未收集任何数据
- 诊断被禁用
- 路径不正确

**解决方案**:

```typescript
const diagnostic = store.get(path);

if (!diagnostic) {
	print("诊断不存在，检查路径是否正确");
}

if (diagnostic && !diagnostic.isEnabled) {
	print("诊断已禁用");
	diagnostic.isEnabled = true;
}

if (diagnostic && diagnostic.historyLen() === 0) {
	print("诊断尚未收集数据，等待下一帧");
}
```

### 问题 2: FPS 数据不更新

**原因**:
- 未添加 `FrameTimeDiagnosticsPlugin`
- 时间系统未正确配置

**解决方案**:

```typescript
// 确保添加了所需插件
app.addPlugin(new DiagnosticsPlugin());
app.addPlugin(new FrameTimeDiagnosticsPlugin());

// 检查时间扩展是否可用
if (context.has("time")) {
	const deltaTime = context.get("time").getDeltaSeconds();
	print(`Delta time: ${deltaTime}`);
} else {
	warn("Time extension not available");
}
```

### 问题 3: 日志不输出

**原因**:
- 未添加 `LogDiagnosticsPlugin`
- 过滤器配置错误
- 输出间隔太长

**解决方案**:

```typescript
// 添加日志插件
app.addPlugin(new LogDiagnosticsPlugin({ waitDuration: 1 }));

// 检查过滤器
const state = app.getResource<LogDiagnosticsState>();
if (state?.filter && state.filter.size() === 0) {
	print("过滤器为空，不会输出任何诊断");
	state.disableFiltering(); // 禁用过滤
}
```

### 问题 4: 历史数据丢失

**原因**:
- `maxHistoryLength` 设置过小
- 调用了 `clearHistory()`

**解决方案**:

```typescript
// 增加历史长度
const diagnostic = Diagnostic.create(path).withMaxHistoryLength(300);

// 避免意外清空
// diagnostic.clearHistory(); // 仅在必要时调用
```

---

## 📊 性能影响

### 内存占用

每个测量值占用约 16 字节（time: 8 字节 + value: 8 字节）:

```
单个诊断内存 = 16 字节 × maxHistoryLength
总内存 = Σ(诊断数量 × 其历史长度 × 16 字节)

示例:
- 10 个诊断，每个 120 历史 = 10 × 120 × 16 = 19.2 KB
- 50 个诊断，每个 60 历史 = 50 × 60 × 16 = 48 KB
```

### CPU 开销

- **测量添加**: O(1) - 极低开销
- **平均值计算**: O(1) - 维护运行总和
- **平滑值计算**: O(1) - EMA 增量更新
- **历史遍历**: O(n) - n 为历史长度

**建议**:
- 生产环境: 60-120 历史长度
- 开发环境: 120-300 历史长度
- 禁用不需要的诊断以节省资源

---

## 🔗 相关资源

### 内部模块

- `bevy_app` - 应用程序和插件系统
- `bevy_ecs` - ECS 系统和资源管理
- `bevy_time` - 时间系统（DeltaTime）

### 参考文档

- [Rust Bevy Diagnostic 文档](https://docs.rs/bevy/latest/bevy/diagnostic/)
- [ECS 系统编写指南](./bevy_ecs.md)
- [插件开发指南](./bevy_app.md#插件系统)

---

## 🎓 总结

### 核心概念

1. **DiagnosticPath** - 唯一标识符，层级路径
2. **Diagnostic** - 时间序列数据容器
3. **DiagnosticsStore** - 诊断集合管理器
4. **Diagnostics** - 系统参数，用于添加测量值

### 使用流程

1. 添加 `DiagnosticsPlugin`
2. 添加内置诊断插件或注册自定义诊断
3. 在系统中使用 `Diagnostics` 添加测量值
4. 使用 `DiagnosticsStore` 读取数据
5. 可选: 添加 `LogDiagnosticsPlugin` 自动输出

### 典型配置

```typescript
const app = App.create();

// 基础配置
app.addPlugin(new DiagnosticsPlugin());
app.addPlugin(new FrameTimeDiagnosticsPlugin());
app.addPlugin(new EntityCountDiagnosticsPlugin());
app.addPlugin(new LogDiagnosticsPlugin());

// 你已经准备好监控性能了！
app.run();
```

---

**提示**: 诊断系统是性能优化的第一步。通过持续监控关键指标，你可以及早发现性能问题，并验证优化效果。

**版本**: 基于 bevy_diagnostic 0.15.0 移植
**最后更新**: 2025-09-28