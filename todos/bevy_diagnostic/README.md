# bevy_diagnostic

## 模块概述

`bevy_diagnostic` 是一个性能诊断和监控模块，用于收集、分析和报告应用程序的运行时指标。该模块提供了一套完整的诊断工具，包括帧率监控、实体计数、自定义性能指标等功能，帮助开发者识别性能瓶颈和优化应用程序。

这是 Rust Bevy 引擎诊断模块的 TypeScript/Roblox 移植版本，基于 @rbxts/matter ECS 框架实现。

## 核心功能介绍

### 1. 诊断系统架构

#### 核心组件

- **DiagnosticPath**: 诊断的唯一标识符，使用斜杠分隔的路径格式
- **Diagnostic**: 单个诊断指标的时间线，包含测量值历史记录
- **DiagnosticsStore**: 所有诊断的中央存储（Resource）
- **Diagnostics**: 用于记录新测量值的系统参数

#### 内置插件

1. **DiagnosticsPlugin**: 核心诊断插件，初始化诊断系统
2. **FrameTimeDiagnosticsPlugin**: 帧时间和 FPS 监控
3. **FrameCountPlugin**: 帧计数追踪
4. **EntityCountDiagnosticsPlugin**: 实体数量监控
5. **LogDiagnosticsPlugin**: 诊断信息日志输出

### 2. 关键特性

#### 测量值管理
- 历史记录保存（默认保留 120 个测量值）
- 简单移动平均值计算
- 指数移动平均值（EMA）平滑
- NaN 和无穷值处理

#### 性能分析
- 实时 FPS 监控
- 帧时间测量（毫秒）
- 实体数量统计
- 自定义指标支持

#### 灵活的日志系统
- 定期日志输出（可配置间隔）
- 诊断过滤（只输出特定指标）
- 调试模式支持
- 格式化输出（当前值和平均值）

## API 文档

### DiagnosticPath

诊断路径用于唯一标识每个诊断指标。

```typescript
// 创建诊断路径
const path = DiagnosticPath.constNew("render/fps");

// 从组件创建
const path = DiagnosticPath.fromComponents(["render", "fps"]);

// 获取路径字符串
const pathStr = path.asStr(); // "render/fps"

// 获取路径组件
const components = path.components(); // ["render", "fps"]
```

**路径要求**：
- 不能为空
- 不能以 `/` 开头或结尾
- 不能包含空组件（`//`）

### Diagnostic

单个诊断指标的管理类。

```typescript
// 创建诊断
const diagnostic = Diagnostic.new(path)
    .withMaxHistoryLength(120)      // 设置历史长度
    .withSuffix("ms")               // 设置单位后缀
    .withSmoothingFactor(0.1);      // 设置平滑因子

// 添加测量值
diagnostic.addMeasurement({
    time: os.clock(),
    value: 16.67
});

// 获取数据
const currentValue = diagnostic.value();        // 最新值
const average = diagnostic.average();           // 平均值
const smoothed = diagnostic.smoothed();         // 平滑值
const duration = diagnostic.duration();         // 时间跨度
```

### DiagnosticsStore

诊断存储资源，管理所有诊断实例。

```typescript
const store = new DiagnosticsStore();

// 添加诊断
store.add(diagnostic);

// 获取诊断
const diag = store.get(path);

// 获取测量值（仅启用的诊断）
const measurement = store.getMeasurement(path);

// 遍历所有诊断
for (const diag of store.iter()) {
    // 处理诊断
}
```

### 插件配置

#### FrameTimeDiagnosticsPlugin

```typescript
// 默认配置
app.addPlugin(new FrameTimeDiagnosticsPlugin());

// 自定义历史长度
app.addPlugin(FrameTimeDiagnosticsPlugin.new(60));
```

提供的诊断路径：
- `FrameTimeDiagnosticsPlugin.FPS`: 每秒帧数
- `FrameTimeDiagnosticsPlugin.FRAME_TIME`: 帧时间（毫秒）
- `FrameTimeDiagnosticsPlugin.FRAME_COUNT`: 总帧数

#### LogDiagnosticsPlugin

```typescript
// 基本配置
app.addPlugin(new LogDiagnosticsPlugin());

// 自定义配置
app.addPlugin(new LogDiagnosticsPlugin({
    debug: false,           // 调试模式
    waitDuration: 2,        // 日志间隔（秒）
    filter: new Set([       // 过滤器
        "fps",
        "frame_time"
    ])
}));

// 使用过滤器
app.addPlugin(LogDiagnosticsPlugin.filtered(
    new Set(["fps", "frame_time"])
));
```

#### EntityCountDiagnosticsPlugin

```typescript
// 默认配置
app.addPlugin(new EntityCountDiagnosticsPlugin());

// 自定义历史长度
app.addPlugin(EntityCountDiagnosticsPlugin.new(100));
```

提供的诊断路径：
- `EntityCountDiagnosticsPlugin.ENTITY_COUNT`: 实体数量

## 使用示例

### 基本使用

```typescript
import { App } from "../bevy_app/app";
import {
    DiagnosticsPlugin,
    FrameTimeDiagnosticsPlugin,
    LogDiagnosticsPlugin,
    EntityCountDiagnosticsPlugin
} from "../bevy_diagnostic";

// 创建应用并添加诊断插件
const app = new App()
    .addPlugin(new DiagnosticsPlugin())
    .addPlugin(new FrameTimeDiagnosticsPlugin())
    .addPlugin(new EntityCountDiagnosticsPlugin())
    .addPlugin(new LogDiagnosticsPlugin({
        waitDuration: 1,  // 每秒输出一次
    }));

// 运行应用
app.run();
```

### 自定义诊断

```typescript
import {
    Diagnostic,
    DiagnosticPath,
    Diagnostics,
    DiagnosticsStore
} from "../bevy_diagnostic";

// 定义自定义诊断路径
const MEMORY_USAGE = DiagnosticPath.constNew("system/memory_usage");
const NETWORK_LATENCY = DiagnosticPath.constNew("network/latency");

// 注册自定义诊断
app.registerDiagnostic(
    Diagnostic.new(MEMORY_USAGE)
        .withSuffix("MB")
        .withMaxHistoryLength(60)
);

app.registerDiagnostic(
    Diagnostic.new(NETWORK_LATENCY)
        .withSuffix("ms")
        .withMaxHistoryLength(120)
        .withSmoothingFactor(0.1)
);

// 创建记录测量值的系统
function memoryMonitorSystem(world: World): void {
    const diagnosticsStore = world.get(DiagnosticsStore);
    if (!diagnosticsStore) return;

    const diagnostics = new Diagnostics(diagnosticsStore);

    // 记录内存使用
    diagnostics.addMeasurement(MEMORY_USAGE, () => {
        // 获取内存使用量（示例）
        return gcinfo() / 1024; // 转换为 MB
    });

    diagnostics.apply();
}

// 添加系统到应用
app.addSystem(ScheduleLabel.Update, memoryMonitorSystem);
```

### 动态控制日志输出

```typescript
// 获取日志状态资源
const logState = app.getResource(LogDiagnosticsState);

if (logState) {
    // 修改日志间隔
    logState.setTimerDuration(5); // 5秒输出一次

    // 添加过滤器
    logState.addFilter(DiagnosticPath.constNew("fps"));
    logState.addFilter(DiagnosticPath.constNew("frame_time"));

    // 扩展过滤器
    logState.extendFilter([
        DiagnosticPath.constNew("entity_count"),
        DiagnosticPath.constNew("system/memory_usage")
    ]);

    // 移除过滤器
    logState.removeFilter(DiagnosticPath.constNew("frame_time"));

    // 清空过滤器
    logState.clearFilter();

    // 禁用过滤（输出所有诊断）
    logState.disableFiltering();
}
```

### 运行时访问诊断数据

```typescript
function analyzePerformance(world: World): void {
    const diagnosticsStore = world.get(DiagnosticsStore);
    if (!diagnosticsStore) return;

    // 获取 FPS 诊断
    const fpsDiag = diagnosticsStore.get(
        FrameTimeDiagnosticsPlugin.FPS
    );

    if (fpsDiag && fpsDiag.isEnabled) {
        const currentFPS = fpsDiag.value();
        const avgFPS = fpsDiag.average();
        const smoothFPS = fpsDiag.smoothed();

        // 性能警告
        if (avgFPS !== undefined && avgFPS < 30) {
            warn(`Low FPS detected: ${avgFPS.toFixed(1)}`);
        }

        // 获取历史数据
        const history = fpsDiag.measurements();
        const recentValues = fpsDiag.values();

        // 分析趋势
        if (history.size() >= 10) {
            // 分析最近10帧的性能
            const recent = history.slice(-10);
            // ... 进行分析
        }
    }
}
```

### 条件启用诊断

```typescript
// 根据条件启用/禁用诊断
function toggleDiagnostics(world: World, enabled: boolean): void {
    const diagnosticsStore = world.get(DiagnosticsStore);
    if (!diagnosticsStore) return;

    for (const diagnostic of diagnosticsStore.iterMut()) {
        // 只启用特定诊断
        if (diagnostic.getPath().asStr().startsWith("debug/")) {
            diagnostic.isEnabled = enabled;
        }
    }
}

// 在开发模式启用详细诊断
if (game.GetService("RunService").IsStudio()) {
    app.addPlugin(new LogDiagnosticsPlugin({
        debug: true,
        waitDuration: 0.5
    }));
}
```

## 与原始 Rust 版本的对比说明

### 主要差异

1. **类型系统**
   - Rust 版本使用强类型和 trait 系统
   - TypeScript 版本使用接口和类继承
   - 移除了 Rust 特有的生命周期和所有权概念

2. **资源管理**
   - Rust 版本使用 `Res<T>` 和 `ResMut<T>` 进行资源访问
   - TypeScript 版本直接通过 `world.get()` 访问资源
   - 没有借用检查器的限制

3. **系统参数**
   - Rust 版本的 `Diagnostics` 是 `SystemParam`
   - TypeScript 版本简化为普通类，手动管理挂起的测量值

4. **时间处理**
   - Rust 使用 `Instant` 类型
   - TypeScript 使用 `os.clock()` 获取时间
   - 时间单位统一为秒

5. **数值处理**
   - Rust 有更严格的数值类型（u32, f32, f64）
   - TypeScript 统一使用 `number` 类型
   - 手动处理溢出（如帧计数的 32 位回绕）

### 功能对等性

| Rust 功能 | TypeScript 实现 | 说明 |
|---------|--------------|------|
| `DiagnosticPath` | ✅ 完整实现 | 相同的路径验证逻辑 |
| `Diagnostic` | ✅ 完整实现 | 包含所有统计功能 |
| `DiagnosticsStore` | ✅ 完整实现 | 使用 Map 替代 HashMap |
| `Diagnostics` SystemParam | ✅ 适配实现 | 简化为普通类 |
| `RegisterDiagnostic` trait | ✅ 扩展方法 | 通过函数扩展 App |
| 插件系统 | ✅ 完整实现 | 适配 TypeScript 插件接口 |
| 帧时间诊断 | ✅ 完整实现 | 相同的计算逻辑 |
| 实体计数 | ✅ 适配实现 | 使用 Matter 查询系统 |
| 日志输出 | ✅ 完整实现 | 格式化输出保持一致 |

### 性能考虑

1. **内存管理**
   - TypeScript 依赖垃圾回收
   - 历史记录使用数组而非环形缓冲区
   - 可能在长时间运行时产生更多内存压力

2. **计算精度**
   - JavaScript 数值精度限制（IEEE 754）
   - 大数值计算可能有精度损失
   - 手动处理整数溢出

3. **并发性**
   - 没有 Rust 的并行系统执行
   - 所有诊断更新是顺序的
   - Roblox 环境的单线程限制

### 迁移指南

从 Rust Bevy 迁移代码时：

1. 将 `Res<DiagnosticsStore>` 改为 `world.get(DiagnosticsStore)`
2. 将 `SystemParam` 标记移除
3. 时间单位从纳秒改为秒
4. 使用 TypeScript 的链式调用语法
5. 手动处理数值溢出和 NaN
6. 使用 `os.clock()` 替代 `Instant::now()`

## 最佳实践

1. **合理设置历史长度**
   - 短期指标（如 FPS）：60-120 个采样点
   - 长期趋势：可以设置更大的值
   - 累计值（如帧计数）：设为 0

2. **平滑因子选择**
   - 默认值：`2.0 / (历史长度 + 1)`
   - 更平滑：使用更小的值
   - 更响应：使用更大的值

3. **性能优化**
   - 禁用不需要的诊断
   - 使用过滤器减少日志输出
   - 避免在测量函数中进行重计算

4. **调试技巧**
   - 开发时使用 `debug: true` 模式
   - 生产环境关闭或减少日志频率
   - 使用自定义诊断追踪特定问题

## 扩展开发

### 创建自定义诊断插件

```typescript
export class CustomDiagnosticsPlugin implements Plugin {
    static readonly CUSTOM_METRIC = DiagnosticPath.constNew("custom/metric");

    build(app: App): void {
        app.registerDiagnostic(
            Diagnostic.new(CustomDiagnosticsPlugin.CUSTOM_METRIC)
                .withSuffix("units")
        )
        .addSystem(ScheduleLabel.Update, this.updateMetrics);
    }

    private updateMetrics(world: World): void {
        // 实现测量逻辑
    }

    name(): string {
        return "CustomDiagnosticsPlugin";
    }

    isUnique(): boolean {
        return true;
    }
}
```

### 集成第三方监控

```typescript
// 导出诊断数据到外部系统
function exportDiagnostics(world: World): void {
    const store = world.get(DiagnosticsStore);
    if (!store) return;

    const metrics: Record<string, number> = {};

    for (const diagnostic of store.iter()) {
        const value = diagnostic.value();
        if (value !== undefined) {
            metrics[diagnostic.getPath().asStr()] = value;
        }
    }

    // 发送到监控服务
    // sendToMonitoring(metrics);
}
```

## 参考资源

- [Rust Bevy Diagnostic 文档](https://docs.rs/bevy_diagnostic/)
- [Matter ECS 文档](https://github.com/evaera/matter)
- [Roblox TypeScript 文档](https://roblox-ts.com/)