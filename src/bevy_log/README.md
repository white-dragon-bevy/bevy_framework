# bevy_log

Bevy 日志系统的 Roblox TypeScript 移植版本，为 Bevy 应用提供强大的日志记录和管理功能。

## 模块概述

`bevy_log` 是 Rust Bevy 游戏引擎日志系统的 Roblox 平台移植版本。它提供了一套完整的日志解决方案，包括多级别日志记录、模块化过滤、自定义日志层和性能优化的一次性日志功能。

该模块基于 Rust 的 `tracing` crate 概念设计，在 Roblox 环境中提供类似的功能体验，同时充分利用了 TypeScript 类型系统和 Roblox 平台特性。

### 核心特性

- **多级别日志系统** - 支持 ERROR、WARN、INFO、DEBUG、TRACE 五个日志级别
- **模块化过滤** - 可以为不同模块设置不同的日志级别
- **插件化集成** - 通过 LogPlugin 轻松集成到 Bevy App 中
- **一次性日志** - 防止重复日志，优化性能
- **自定义日志层** - 支持扩展日志处理逻辑
- **Roblox 平台适配** - 自动区分服务端/客户端，Studio 环境优化

## 安装使用

### 基础使用

```typescript
import { App } from "../bevy_app";
import { LogPlugin } from "../bevy_log";
import { info, warn, error, debug, trace } from "../bevy_log";

// 创建应用并添加日志插件
const app = new App();
app.addPlugin(new LogPlugin());

// 使用日志函数
info("应用启动成功");
debug("调试信息", "MyModule");
error("发生错误", "ErrorHandler", new Map([["code", 404]]));
```

### 配置日志级别

```typescript
// 自定义日志配置
app.addPlugin(new LogPlugin({
    level: Level.DEBUG,  // 设置默认日志级别
    filter: "bevy_app=warn,bevy_ecs=info,my_module=trace"  // 模块级别过滤
}));
```

### 使用 Prelude 模块

```typescript
// 导入常用的日志功能
import { info, warn, error, debugOnce, warnOnce } from "../bevy_log/prelude";

// 直接使用
info("系统初始化");
warnOnce("这条警告只会显示一次");
```

## API 参考

### LogPlugin 类

日志系统的核心插件，负责初始化和配置日志系统。

```typescript
class LogPlugin {
    filter: string;           // 过滤器配置字符串
    level: Level;            // 默认日志级别
    customLayer?: (app: App) => Layer;  // 自定义日志层
    fmtLayer?: (app: App) => Layer;     // 自定义格式化层

    constructor(config?: Partial<LogPlugin>);
    build(app: App): void;
    name(): string;
}
```

### 日志函数

#### 基础日志函数

```typescript
// 错误级别 - 用于严重错误
function error(message: string, module?: string, fields?: Map<string, unknown>): void;

// 警告级别 - 用于潜在问题
function warn(message: string, module?: string, fields?: Map<string, unknown>): void;

// 信息级别 - 用于一般信息
function info(message: string, module?: string, fields?: Map<string, unknown>): void;

// 调试级别 - 用于调试信息
function debug(message: string, module?: string, fields?: Map<string, unknown>): void;

// 追踪级别 - 用于详细追踪
function trace(message: string, module?: string, fields?: Map<string, unknown>): void;
```

#### Span 函数

用于追踪代码块执行的函数：

```typescript
// 创建各级别的 span
function errorSpan(name: string): (fn: () => void) => void;
function warnSpan(name: string): (fn: () => void) => void;
function infoSpan(name: string): (fn: () => void) => void;
function debugSpan(name: string): (fn: () => void) => void;
function traceSpan(name: string): (fn: () => void) => void;
```

#### 一次性日志函数

防止重复日志的优化函数：

```typescript
// 每个调用位置只记录一次
function errorOnce(message: string, module?: string, fields?: Map<string, unknown>): void;
function warnOnce(message: string, module?: string, fields?: Map<string, unknown>): void;
function infoOnce(message: string, module?: string, fields?: Map<string, unknown>): void;
function debugOnce(message: string, module?: string, fields?: Map<string, unknown>): void;
function traceOnce(message: string, module?: string, fields?: Map<string, unknown>): void;

// 通用的一次性执行函数
function once(fn: () => void): void;
```

### Level 枚举

日志级别定义：

```typescript
enum Level {
    ERROR = 1,   // 错误 - 最高优先级
    WARN = 2,    // 警告
    INFO = 3,    // 信息
    DEBUG = 4,   // 调试
    TRACE = 5,   // 追踪 - 最低优先级
}
```

### EnvFilter 类

环境过滤器，用于控制日志输出：

```typescript
class EnvFilter {
    constructor(filterString: string);
    static tryFromDefaultEnv(defaultFilter: string): EnvFilter;
    static parseLossy(filterString: string): EnvFilter;
    isEnabled(level: Level, module?: string): boolean;
    getDefaultLevel(): Level;
    getModuleFilters(): readonly ModuleFilter[];
}
```

### Layer 接口

自定义日志层接口：

```typescript
interface Layer {
    onEvent(record: LogRecord): void;
    name(): string;
}
```

### LogRecord 接口

日志记录数据结构：

```typescript
interface LogRecord {
    level: Level;                    // 日志级别
    message: string;                 // 日志消息
    module?: string;                 // 模块名称
    timestamp: number;               // 时间戳
    fields?: Map<string, unknown>;  // 额外字段
}
```

## 配置选项

### LogPlugin 配置

```typescript
interface LogPluginConfig {
    // 日志级别过滤
    level?: Level;

    // 过滤器字符串，支持以下格式：
    // - "level" - 设置默认级别
    // - "level,module=level,..." - 为特定模块设置级别
    filter?: string;

    // 自定义日志层
    customLayer?: (app: App) => Layer | undefined;

    // 覆盖默认格式化层
    fmtLayer?: (app: App) => Layer | undefined;
}
```

### 过滤器语法

过滤器字符串支持灵活的配置语法：

```typescript
// 设置默认级别
"info"

// 设置默认级别和模块级别
"warn,my_module=debug"

// 多个模块配置
"info,bevy_app=warn,bevy_ecs=debug,my_game=trace"

// 禁用特定模块（设置为 error 只显示错误）
"info,noisy_module=error"
```

## 使用示例

### 基础日志记录

```typescript
import { info, warn, error, debug } from "../bevy_log";

// 简单日志
info("游戏开始");
warn("内存使用率较高");
error("无法加载资源");

// 带模块名的日志
info("玩家加入游戏", "PlayerManager");
debug("实体位置更新", "Physics");

// 带额外字段的日志
error("网络请求失败", "Network", new Map([
    ["url", "https://api.example.com"],
    ["status", 500],
    ["retry", 3]
]));
```

### 配置不同日志级别

```typescript
import { App } from "../bevy_app";
import { LogPlugin, Level } from "../bevy_log";

// 开发环境配置
const devApp = new App();
devApp.addPlugin(new LogPlugin({
    level: Level.TRACE,  // 显示所有日志
    filter: "bevy_ecs=debug,bevy_render=info"
}));

// 生产环境配置
const prodApp = new App();
prodApp.addPlugin(new LogPlugin({
    level: Level.WARN,   // 只显示警告和错误
    filter: "critical_system=info"  // 关键系统保持信息级别
}));
```

### 使用一次性日志

```typescript
import { warnOnce, infoOnce } from "../bevy_log";

// 在循环或频繁调用的代码中使用
function update(dt: number) {
    if (fps < 30) {
        // 这条警告在同一位置只会显示一次
        warnOnce("FPS 过低，可能影响游戏体验");
    }

    if (playerCount > 100) {
        // 避免重复日志
        infoOnce("玩家数量超过100");
    }
}
```

### 使用 Span 追踪代码执行

```typescript
import { infoSpan, debugSpan } from "../bevy_log";

// 追踪函数执行
const loadResources = infoSpan("LoadResources");

loadResources(() => {
    // 这里的代码执行会被追踪
    loadTextures();
    loadSounds();
    loadModels();
});

// 追踪系统执行
const updatePhysics = debugSpan("PhysicsUpdate");

updatePhysics(() => {
    simulatePhysics();
    detectCollisions();
    resolveCollisions();
});
```

### 自定义日志层

```typescript
import { LogPlugin, Layer, LogRecord } from "../bevy_log";

// 创建自定义日志层
class FileLogger implements Layer {
    private logs: string[] = [];

    onEvent(record: LogRecord): void {
        const timestamp = os.date("%Y-%m-%d %H:%M:%S", record.timestamp);
        const log = `[${timestamp}] [${Level[record.level]}] ${record.message}`;
        this.logs.push(log);

        // 定期保存到文件或发送到服务器
        if (this.logs.size() >= 100) {
            this.flush();
        }
    }

    name(): string {
        return "FileLogger";
    }

    private flush(): void {
        // 保存日志逻辑
        this.logs.clear();
    }
}

// 使用自定义层
app.addPlugin(new LogPlugin({
    customLayer: () => new FileLogger()
}));
```

### 条件日志

```typescript
import { debug, trace, Level } from "../bevy_log";

// 根据配置动态选择日志级别
function logWithLevel(level: Level, message: string) {
    switch (level) {
        case Level.ERROR:
            error(message);
            break;
        case Level.WARN:
            warn(message);
            break;
        case Level.INFO:
            info(message);
            break;
        case Level.DEBUG:
            debug(message);
            break;
        case Level.TRACE:
            trace(message);
            break;
    }
}

// 开发环境详细日志
if (IS_DEV) {
    debug("详细的调试信息");
    trace("极其详细的追踪信息");
}
```

### 模块化日志管理

```typescript
// 为不同模块创建日志包装器
class ModuleLogger {
    constructor(private moduleName: string) {}

    info(message: string, fields?: Map<string, unknown>) {
        info(message, this.moduleName, fields);
    }

    warn(message: string, fields?: Map<string, unknown>) {
        warn(message, this.moduleName, fields);
    }

    error(message: string, fields?: Map<string, unknown>) {
        error(message, this.moduleName, fields);
    }
}

// 使用模块日志器
const networkLogger = new ModuleLogger("Network");
const gameplayLogger = new ModuleLogger("Gameplay");

networkLogger.info("连接建立");
gameplayLogger.warn("玩家行为异常");
```

## 与 Rust Bevy 的对应关系

| Rust Bevy | TypeScript 移植 | 说明 |
|-----------|----------------|------|
| `LogPlugin` | `LogPlugin` | 日志插件主类 |
| `Level` | `Level` 枚举 | 日志级别定义 |
| `error!` | `error()` | 错误级别日志 |
| `warn!` | `warn()` | 警告级别日志 |
| `info!` | `info()` | 信息级别日志 |
| `debug!` | `debug()` | 调试级别日志 |
| `trace!` | `trace()` | 追踪级别日志 |
| `error_span!` | `errorSpan()` | 错误级别 span |
| `warn_span!` | `warnSpan()` | 警告级别 span |
| `info_span!` | `infoSpan()` | 信息级别 span |
| `debug_span!` | `debugSpan()` | 调试级别 span |
| `trace_span!` | `traceSpan()` | 追踪级别 span |
| `error_once!` | `errorOnce()` | 一次性错误日志 |
| `warn_once!` | `warnOnce()` | 一次性警告日志 |
| `info_once!` | `infoOnce()` | 一次性信息日志 |
| `debug_once!` | `debugOnce()` | 一次性调试日志 |
| `trace_once!` | `traceOnce()` | 一次性追踪日志 |
| `EnvFilter` | `EnvFilter` | 环境过滤器 |
| `Layer` trait | `Layer` 接口 | 日志层接口 |
| `tracing::subscriber` | `LogSubscriber` | 日志订阅器 |
| `Box<dyn Layer>` | `BoxedLayer` 类型 | 装箱的日志层 |
| Android/WASM/iOS 层 | `RobloxLayer` | 平台适配层 |

### 主要差异说明

1. **宏 vs 函数**：Rust 使用宏（`info!`），TypeScript 使用函数（`info()`）
2. **结构化日志**：Rust 支持更复杂的结构化日志，TypeScript 版本简化为 Map 参数
3. **Span 实现**：Rust 的 span 是真正的追踪范围，TypeScript 版本简化为函数包装
4. **异步支持**：Rust 版本有完整的异步追踪，TypeScript 版本根据 Roblox 特性调整
5. **平台适配**：原版支持多平台（Android/WASM/iOS），移植版专注于 Roblox 平台

## 性能考虑

1. **使用一次性日志**：在频繁调用的代码中使用 `*Once` 函数避免日志泛滥
2. **合理设置级别**：生产环境使用 WARN 或 ERROR 级别减少开销
3. **模块化过滤**：只为需要的模块开启详细日志
4. **自定义层优化**：实现批量处理或异步上传的自定义层

## 最佳实践

1. **模块命名规范**：使用清晰的模块名称便于过滤和追踪
2. **错误处理**：始终记录错误级别的关键失败
3. **开发与生产分离**：为不同环境配置不同的日志级别
4. **结构化数据**：使用 fields 参数记录结构化数据便于分析
5. **避免敏感信息**：不要在日志中记录密码、token 等敏感信息

## 故障排除

### 日志未显示

1. 检查日志级别设置是否正确
2. 验证过滤器配置是否过滤了相关模块
3. 确认 LogPlugin 已正确添加到 App

### 性能问题

1. 减少 TRACE 和 DEBUG 级别日志
2. 使用一次性日志函数
3. 实现批量处理的自定义层

### Roblox Studio 特定问题

1. 日志会自动添加 [Server] 或 [Client] 前缀
2. 使用 error() 和 warn() 会在输出窗口显示不同颜色
3. print() 用于 INFO、DEBUG、TRACE 级别

## 扩展开发

如需扩展日志系统功能，可以：

1. 实现自定义 Layer 接口
2. 扩展 LogRecord 添加更多元数据
3. 创建专门的日志工具函数
4. 集成外部日志服务

## 相关模块

- `bevy_app` - 应用程序框架
- `bevy_ecs` - ECS 系统
- `bevy_diagnostic` - 诊断和性能监控