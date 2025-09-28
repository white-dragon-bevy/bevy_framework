# bevy_log 操作手册

## 目录

1. [模块概述](#模块概述)
2. [日志系统架构](#日志系统架构)
3. [核心组件详解](#核心组件详解)
4. [API 参考](#api-参考)
5. [实战示例](#实战示例)
6. [高级用法](#高级用法)
7. [最佳实践](#最佳实践)
8. [性能优化](#性能优化)
9. [故障排查](#故障排查)

---

## 模块概述

### 简介

`bevy_log` 是 Rust Bevy 游戏引擎日志系统的 Roblox TypeScript 移植版本。它提供了一套企业级的日志解决方案,支持:

- **分级日志系统** - ERROR、WARN、INFO、DEBUG、TRACE 五个级别
- **模块化过滤** - 为不同模块设置独立的日志级别
- **插件化集成** - 通过 LogPlugin 无缝集成到 Bevy App
- **一次性日志** - 防止重复日志,优化性能
- **可扩展架构** - 支持自定义日志层和订阅器
- **Roblox 优化** - 针对 Roblox 平台的特殊优化

### 设计理念

bevy_log 采用分层架构设计,参考 Rust tracing 生态系统:

```
应用层 (Application)
    ↓ 使用日志函数
日志函数层 (Logging Functions)
    ↓ 创建 LogRecord
订阅器层 (Subscriber)
    ↓ 分发给所有层
日志层 (Layers)
    ↓ 过滤和格式化
输出层 (Output)
```

### 核心特性

#### 1. 类型安全

利用 TypeScript 类型系统确保编译时安全:

```typescript
// 编译时类型检查
const level: Level = Level.INFO;
const fields: Map<string, unknown> = new Map([["key", "value"]]);
```

#### 2. 零配置开箱即用

```typescript
const app = new App();
app.addPlugin(new LogPlugin()); // 默认配置即可使用
info("应用启动");
```

#### 3. 灵活的过滤系统

```typescript
// 为不同模块设置不同级别
new LogPlugin({
    level: Level.INFO,
    filter: "bevy_app=warn,my_game=trace"
})
```

#### 4. Roblox 平台集成

- 自动区分 Server/Client 环境
- Studio 模式特殊处理
- 与 Roblox 输出窗口完美集成

---

## 日志系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Code                        │
│  info(), warn(), error(), debug(), trace()                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      LogSubscriber                           │
│  - 管理所有 Layer                                            │
│  - 分发 LogRecord                                            │
│  - 全局单例                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ RobloxLayer│   │CustomLayer│   │FmtLayer │
    │  - Filter │   │  - Custom │   │ - Format│
    │  - Output │   │  - Logic  │   │ - Output│
    └──────────┘   └──────────┘   └──────────┘
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                 Roblox Console
```

### 核心组件

#### 1. LogPlugin

日志系统的启动器和配置中心:

```typescript
export class LogPlugin extends BasePlugin {
    filter: string;           // 过滤规则
    level: Level;            // 默认级别
    customLayer?: (app: App) => BoxedLayer;  // 自定义层
    fmtLayer?: (app: App) => BoxedFmtLayer;  // 格式化层

    build(app: App): void {
        // 1. 创建订阅器
        // 2. 添加自定义层
        // 3. 创建过滤器
        // 4. 添加默认层
        // 5. 设置全局订阅器
    }
}
```

#### 2. LogSubscriber

全局日志订阅管理器:

```typescript
export class LogSubscriber {
    private layers: Layer[] = [];
    private static instance?: LogSubscriber;

    addLayer(layer: Layer): this;
    logEvent(record: LogRecord): void;
    static setGlobalDefault(subscriber: LogSubscriber): boolean;
    static getGlobal(): LogSubscriber | undefined;
}
```

#### 3. Layer 接口

可扩展的日志处理层:

```typescript
export interface Layer {
    onEvent(record: LogRecord): void;  // 处理日志记录
    name(): string;                     // 层名称
}
```

#### 4. EnvFilter

强大的日志过滤器:

```typescript
export class EnvFilter {
    private defaultLevel: Level;
    private moduleFilters: ModuleFilter[];

    constructor(filterString: string);
    isEnabled(level: Level, module?: string): boolean;
}
```

### 数据流

1. **日志创建**: 应用代码调用 `info()` 等函数
2. **记录构建**: 创建 `LogRecord` 对象
3. **订阅分发**: LogSubscriber 将记录分发给所有 Layer
4. **过滤处理**: 每个 Layer 根据自己的过滤规则处理
5. **输出格式化**: 格式化并输出到目标位置

---

## 核心组件详解

### Level - 日志级别

#### 级别定义

```typescript
export enum Level {
    ERROR = 1,   // 错误 - 最高优先级,用于严重错误
    WARN  = 2,   // 警告 - 潜在问题或不期望的情况
    INFO  = 3,   // 信息 - 一般运行信息
    DEBUG = 4,   // 调试 - 调试时有用的信息
    TRACE = 5,   // 追踪 - 最低优先级,详细追踪信息
}
```

#### 级别选择指南

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| ERROR | 严重错误,需要立即关注 | 无法连接数据库、关键资源加载失败 |
| WARN | 潜在问题,但程序可继续运行 | 配置项缺失使用默认值、性能警告 |
| INFO | 重要的业务流程信息 | 玩家加入游戏、关卡加载完成 |
| DEBUG | 开发调试信息 | 变量值、函数调用、状态变化 |
| TRACE | 非常详细的追踪信息 | 循环内部、频繁调用的函数 |

#### 级别比较

```typescript
// 检查级别是否启用
function isLevelEnabled(current: Level, threshold: Level): boolean {
    return current <= threshold;
}

// 示例
isLevelEnabled(Level.ERROR, Level.INFO); // true (ERROR ≤ INFO)
isLevelEnabled(Level.TRACE, Level.WARN); // false (TRACE > WARN)
```

### EnvFilter - 环境过滤器

#### 过滤规则语法

```typescript
// 格式: "默认级别,模块1=级别1,模块2=级别2,..."
"info"                              // 所有模块 INFO 级别
"warn,my_game=debug"               // 默认 WARN, my_game 模块 DEBUG
"info,network=trace,ui=warn"       // 多模块配置
```

#### 过滤规则匹配

过滤器使用**前缀匹配**:

```typescript
// 规则: "game=debug"
"game::player"        // ✅ 匹配
"game::enemy"         // ✅ 匹配
"game_system"         // ❌ 不匹配 (不是前缀)
"ui::game"            // ❌ 不匹配

// 规则: "game::player=trace"
"game::player::health"  // ✅ 匹配
"game::player"          // ✅ 匹配
"game::enemy"           // ❌ 不匹配
```

#### 过滤优先级

规则按**模块路径长度降序**排列,更具体的规则优先:

```typescript
const filter = new EnvFilter("info,game=debug,game::player=trace");

// 匹配过程:
filter.isEnabled(Level.TRACE, "game::player::move");
// 1. 检查 "game::player" 规则 → 匹配! 使用 TRACE 级别
// 2. 不再检查 "game" 和默认规则

filter.isEnabled(Level.DEBUG, "game::enemy");
// 1. 检查 "game::player" 规则 → 不匹配
// 2. 检查 "game" 规则 → 匹配! 使用 DEBUG 级别

filter.isEnabled(Level.INFO, "ui::button");
// 1. 检查所有模块规则 → 都不匹配
// 2. 使用默认规则 → 使用 INFO 级别
```

#### 创建过滤器

```typescript
// 方法1: 直接构造
const filter = new EnvFilter("warn,my_module=debug");

// 方法2: 从环境创建 (Roblox 中直接使用默认值)
const filter = EnvFilter.tryFromDefaultEnv("info");

// 方法3: 宽松解析 (忽略错误)
const filter = EnvFilter.parseLossy("invalid,debug");
```

### RobloxLayer - Roblox 日志层

#### 功能特性

```typescript
export class RobloxLayer implements Layer {
    constructor(
        filter: EnvFilter,          // 过滤器
        showTimestamp = true,       // 显示时间戳
        showModule = true           // 显示模块名
    );

    onEvent(record: LogRecord): void {
        // 1. 过滤检查
        // 2. 格式化消息
        // 3. 输出到控制台
    }
}
```

#### 格式化输出

```typescript
// 输出格式:
[时间戳] [级别] 模块名: 消息 { 字段 }

// 示例:
[14:23:15] [INFO] GameSystem: 玩家加入 { player_id=123, level=5 }
[14:23:16] [WARN] Physics: 碰撞检测异常 { entity=456 }
```

#### Roblox 平台特性

```typescript
// 1. 环境检测
if (RunService.IsStudio()) {
    // Studio 模式: 添加 [Server]/[Client] 前缀
    message = `${side} ${message}`;
}

// 2. 输出选择
switch (level) {
    case Level.ERROR:
    case Level.WARN:
        warn(message);  // 黄色警告
        break;
    case Level.INFO:
        print(message); // 白色信息
        break;
    case Level.DEBUG:
    case Level.TRACE:
        // 只在 Studio 中输出
        if (RunService.IsStudio()) {
            print(message);
        }
        break;
}
```

---

## API 参考

### 日志函数

#### 基础日志函数

```typescript
/**
 * 记录错误级别日志
 * @param message - 日志消息
 * @param module - 模块名称 (可选)
 * @param fields - 额外字段 (可选)
 */
export function error(
    message: string,
    module?: string,
    fields?: Map<string, unknown>
): void;

// 同样签名的函数:
warn(message, module?, fields?)   // 警告
info(message, module?, fields?)   // 信息
debug(message, module?, fields?)  // 调试
trace(message, module?, fields?)  // 追踪
```

**使用示例:**

```typescript
// 简单日志
error("无法加载资源");

// 带模块名
warn("内存使用率高", "MemoryManager");

// 带额外字段
info("玩家加入", "PlayerSystem", new Map([
    ["player_id", 123],
    ["username", "Player1"],
    ["level", 5]
]));
```

#### Span 函数

```typescript
/**
 * 创建日志 span,用于追踪代码块执行
 * @param name - Span 名称
 * @returns Span 包装函数
 */
export function infoSpan(name: string): (fn: () => void) => void;

// 同样签名的函数:
errorSpan(name)  // 错误级别
warnSpan(name)   // 警告级别
infoSpan(name)   // 信息级别
debugSpan(name)  // 调试级别
traceSpan(name)  // 追踪级别
```

**使用示例:**

```typescript
// 创建 span
const loadAssets = infoSpan("LoadAssets");

// 使用 span 包装代码
loadAssets(() => {
    // 这段代码的执行会被追踪
    loadTextures();
    loadSounds();
    loadModels();
});

// 输出:
// [INFO] [SPAN:LoadAssets] Enter
// ... 资源加载日志 ...
// [INFO] [SPAN:LoadAssets] Exit
```

#### 一次性日志函数

```typescript
/**
 * 在每个调用位置只记录一次日志
 * 对于频繁调用的代码很有用
 */
export function infoOnce(
    message: string,
    module?: string,
    fields?: Map<string, unknown>
): void;

// 同样签名的函数:
errorOnce(message, module?, fields?)
warnOnce(message, module?, fields?)
infoOnce(message, module?, fields?)
debugOnce(message, module?, fields?)
traceOnce(message, module?, fields?)
```

**使用示例:**

```typescript
// 在循环中使用
function update() {
    for (const entity of entities) {
        if (entity.isInvalid()) {
            // 这条日志在此位置只会输出一次
            warnOnce("发现无效实体", "EntitySystem");
        }
    }
}

// 第一次: 输出日志
// 第二次及之后: 不输出
```

**once 函数:**

```typescript
/**
 * 通用的一次性执行函数
 * @param fn - 要执行的函数
 */
export function once(fn: () => void): void;

// 示例:
once(() => {
    print("这只会执行一次");
});
```

### LogPlugin 类

```typescript
export class LogPlugin extends BasePlugin {
    /**
     * 构造函数
     * @param config - 配置选项
     */
    constructor(config?: {
        level?: Level;                          // 默认日志级别
        filter?: string;                        // 过滤规则
        customLayer?: (app: App) => Layer;      // 自定义层
        fmtLayer?: (app: App) => Layer;         // 格式化层
    });

    build(app: App): void;  // 构建插件
    name(): string;         // 插件名称
}
```

**配置示例:**

```typescript
// 最小配置
new LogPlugin();

// 基础配置
new LogPlugin({
    level: Level.DEBUG,
    filter: "my_game=trace"
});

// 完整配置
new LogPlugin({
    level: Level.INFO,
    filter: "bevy_app=warn,my_game::player=trace",
    customLayer: (app) => new CustomFileLogger(),
    fmtLayer: (app) => new CustomFormatter()
});
```

### Level 枚举

```typescript
export enum Level {
    ERROR = 1,
    WARN  = 2,
    INFO  = 3,
    DEBUG = 4,
    TRACE = 5,
}

// 工具函数
export function levelToString(level: Level): string;
export function parseLevel(str: string): Level | undefined;
export function isLevelEnabled(a: Level, b: Level): boolean;
```

**使用示例:**

```typescript
// 字符串转换
levelToString(Level.INFO);  // "INFO"

// 解析字符串
parseLevel("debug");  // Level.DEBUG
parseLevel("invalid");  // undefined

// 级别比较
isLevelEnabled(Level.ERROR, Level.INFO);  // true
isLevelEnabled(Level.TRACE, Level.WARN);  // false
```

### EnvFilter 类

```typescript
export class EnvFilter {
    constructor(filterString: string);

    // 静态方法
    static tryFromDefaultEnv(defaultFilter: string): EnvFilter;
    static parseLossy(filterString: string): EnvFilter;

    // 实例方法
    isEnabled(level: Level, module?: string): boolean;
    getDefaultLevel(): Level;
    getModuleFilters(): readonly ModuleFilter[];
}

interface ModuleFilter {
    module: string;  // 模块路径
    level: Level;    // 日志级别
}
```

### LogRecord 接口

```typescript
export interface LogRecord {
    level: Level;                    // 日志级别
    message: string;                 // 日志消息
    module?: string;                 // 模块名称
    timestamp: number;               // 时间戳 (os.time())
    fields?: Map<string, unknown>;  // 额外字段
}
```

### Layer 接口

```typescript
export interface Layer {
    /**
     * 处理日志记录
     * @param record - 日志记录
     */
    onEvent(record: LogRecord): void;

    /**
     * 层名称
     * @returns 层的唯一标识
     */
    name(): string;
}
```

### LogSubscriber 类

```typescript
export class LogSubscriber {
    // 实例方法
    addLayer(layer: Layer): this;
    logEvent(record: LogRecord): void;

    // 静态方法
    static setGlobalDefault(subscriber: LogSubscriber): boolean;
    static getGlobal(): LogSubscriber | undefined;
    static clearGlobal(): void;  // 测试用
}
```

---

## 实战示例

### 示例 1: 基础日志记录

```typescript
import { App } from "../bevy_app";
import { LogPlugin, info, warn, error, debug } from "../bevy_log";

// 设置日志系统
const app = new App();
app.addPlugin(new LogPlugin());

// 简单日志
info("应用启动");
debug("初始化配置");
warn("使用默认配置");
error("无法加载可选资源");

// 输出:
// [14:23:15] [INFO] 应用启动
// [14:23:15] [DEBUG] 初始化配置
// [14:23:15] [WARN] 使用默认配置
// [14:23:15] [ERROR] 无法加载可选资源
```

### 示例 2: 模块化日志

```typescript
import { info, warn, error } from "../bevy_log";

// 不同模块的日志
class PlayerSystem {
    onPlayerJoin(playerId: number) {
        info("玩家加入游戏", "PlayerSystem", new Map([
            ["player_id", playerId],
            ["timestamp", os.time()]
        ]));
    }

    onPlayerError(playerId: number, reason: string) {
        error(`玩家错误: ${reason}`, "PlayerSystem", new Map([
            ["player_id", playerId]
        ]));
    }
}

class PhysicsSystem {
    update() {
        warn("碰撞检测性能警告", "Physics", new Map([
            ["entities", 1000],
            ["time_ms", 16.7]
        ]));
    }
}

// 输出:
// [INFO] PlayerSystem: 玩家加入游戏 { player_id=123, timestamp=1234567890 }
// [ERROR] PlayerSystem: 玩家错误: 网络超时 { player_id=123 }
// [WARN] Physics: 碰撞检测性能警告 { entities=1000, time_ms=16.7 }
```

### 示例 3: 配置日志级别和过滤

```typescript
import { App } from "../bevy_app";
import { LogPlugin, Level } from "../bevy_log";

// 开发环境: 显示所有日志
const devApp = new App();
devApp.addPlugin(new LogPlugin({
    level: Level.TRACE,
    filter: ""  // 无额外过滤
}));

// 测试环境: 显示调试及以上
const testApp = new App();
testApp.addPlugin(new LogPlugin({
    level: Level.DEBUG,
    filter: "performance=warn"  // 性能模块只显示警告
}));

// 生产环境: 只显示警告和错误
const prodApp = new App();
prodApp.addPlugin(new LogPlugin({
    level: Level.WARN,
    filter: "critical=info,analytics=error"
}));

// 高级过滤: 不同模块不同级别
const app = new App();
app.addPlugin(new LogPlugin({
    level: Level.INFO,
    filter: [
        "bevy_app=warn",        // Bevy 应用框架只显示警告
        "bevy_ecs=error",       // ECS 系统只显示错误
        "my_game::player=trace", // 玩家系统显示所有
        "my_game::enemy=debug",  // 敌人系统显示调试
        "my_game::ui=info"      // UI 系统显示信息
    ].join(",")
}));
```

### 示例 4: 使用 Span 追踪

```typescript
import { infoSpan, debugSpan, traceSpan } from "../bevy_log";

// 追踪资源加载
function loadGameAssets() {
    const loadSpan = infoSpan("LoadGameAssets");

    loadSpan(() => {
        info("开始加载资源");

        // 追踪子任务
        const textureSpan = debugSpan("LoadTextures");
        textureSpan(() => {
            // 加载纹理
            info("加载纹理完成");
        });

        const soundSpan = debugSpan("LoadSounds");
        soundSpan(() => {
            // 加载音频
            info("加载音频完成");
        });

        info("资源加载完成");
    });
}

// 输出:
// [INFO] [SPAN:LoadGameAssets] Enter
// [INFO] 开始加载资源
// [DEBUG] [SPAN:LoadTextures] Enter
// [INFO] 加载纹理完成
// [DEBUG] [SPAN:LoadTextures] Exit
// [DEBUG] [SPAN:LoadSounds] Enter
// [INFO] 加载音频完成
// [DEBUG] [SPAN:LoadSounds] Exit
// [INFO] 资源加载完成
// [INFO] [SPAN:LoadGameAssets] Exit
```

### 示例 5: 一次性日志

```typescript
import { warnOnce, infoOnce, once } from "../bevy_log";

// 示例 1: 循环中的警告
function updateEntities(entities: Entity[]) {
    for (const entity of entities) {
        if (!entity.isValid()) {
            // 这条警告只会输出一次,不会每帧都输出
            warnOnce("发现无效实体", "EntitySystem");
        }

        if (entity.needsOptimization()) {
            // 同一位置的日志只输出一次
            infoOnce("实体需要优化", "EntitySystem");
        }
    }
}

// 示例 2: 初始化检查
function checkConfiguration() {
    if (!configExists()) {
        // 只在第一次调用时输出
        warnOnce("配置文件不存在,使用默认配置");
    }
}

// 示例 3: 使用 once 函数
function frequentlyCalledFunction() {
    once(() => {
        // 这段代码在此位置只会执行一次
        print("首次调用此函数");
        initializeOnce();
    });

    // 正常的每次调用逻辑
    doSomething();
}
```

### 示例 6: 模块日志包装器

```typescript
import { info, warn, error, debug } from "../bevy_log";

/**
 * 模块日志包装器
 * 自动添加模块名称
 */
class ModuleLogger {
    constructor(private readonly moduleName: string) {}

    info(message: string, fields?: Map<string, unknown>) {
        info(message, this.moduleName, fields);
    }

    warn(message: string, fields?: Map<string, unknown>) {
        warn(message, this.moduleName, fields);
    }

    error(message: string, fields?: Map<string, unknown>) {
        error(message, this.moduleName, fields);
    }

    debug(message: string, fields?: Map<string, unknown>) {
        debug(message, this.moduleName, fields);
    }
}

// 使用
class PlayerSystem {
    private logger = new ModuleLogger("PlayerSystem");

    onPlayerJoin(playerId: number) {
        this.logger.info("玩家加入", new Map([["id", playerId]]));
    }

    onPlayerError(error: string) {
        this.logger.error(`错误: ${error}`);
    }
}

class NetworkSystem {
    private logger = new ModuleLogger("Network");

    onConnected() {
        this.logger.info("连接建立");
    }

    onLatency(ms: number) {
        if (ms > 200) {
            this.logger.warn("高延迟", new Map([["latency_ms", ms]]));
        }
    }
}
```

---

## 高级用法

### 自定义日志层

#### 示例: 文件日志层

```typescript
import { Layer, LogRecord, Level } from "../bevy_log";

/**
 * 文件日志层 - 将日志保存到文件
 */
class FileLogger implements Layer {
    private buffer: string[] = [];
    private readonly maxBufferSize = 100;
    private readonly filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    onEvent(record: LogRecord): void {
        // 格式化日志
        const timestamp = os.date("%Y-%m-%d %H:%M:%S", record.timestamp);
        const levelStr = Level[record.level];
        const module = record.module ? `[${record.module}]` : "";
        const message = `[${timestamp}] [${levelStr}] ${module} ${record.message}`;

        // 添加到缓冲区
        this.buffer.push(message);

        // 达到缓冲区大小时写入文件
        if (this.buffer.size() >= this.maxBufferSize) {
            this.flush();
        }
    }

    name(): string {
        return "FileLogger";
    }

    private flush(): void {
        // 实际实现需要使用 DataStore 或其他持久化方案
        const content = this.buffer.join("\n");
        // saveToFile(this.filePath, content);
        this.buffer.clear();
    }

    // 应用关闭时调用
    shutdown(): void {
        this.flush();
    }
}

// 使用文件日志层
app.addPlugin(new LogPlugin({
    customLayer: () => new FileLogger("game_logs.txt")
}));
```

#### 示例: 远程日志层

```typescript
/**
 * 远程日志层 - 将错误发送到服务器
 */
class RemoteErrorLogger implements Layer {
    private readonly endpoint: string;
    private errorQueue: LogRecord[] = [];

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    onEvent(record: LogRecord): void {
        // 只处理错误级别
        if (record.level !== Level.ERROR) {
            return;
        }

        // 添加到队列
        this.errorQueue.push(record);

        // 立即发送或批量发送
        if (this.errorQueue.size() >= 10) {
            this.sendErrors();
        }
    }

    name(): string {
        return "RemoteErrorLogger";
    }

    private sendErrors(): void {
        const errors = [...this.errorQueue];
        this.errorQueue.clear();

        // 异步发送 (在 Roblox 中使用 HttpService)
        // HttpService.PostAsync(this.endpoint, toJSON(errors));
    }
}
```

#### 示例: 过滤日志层

```typescript
/**
 * 过滤日志层 - 只处理特定条件的日志
 */
class FilteredLogger implements Layer {
    constructor(
        private readonly predicate: (record: LogRecord) => boolean,
        private readonly innerLayer: Layer
    ) {}

    onEvent(record: LogRecord): void {
        if (this.predicate(record)) {
            this.innerLayer.onEvent(record);
        }
    }

    name(): string {
        return `Filtered(${this.innerLayer.name()})`;
    }
}

// 使用示例: 只记录包含特定关键字的日志
const securityLogger = new FilteredLogger(
    (record) => record.message.lower().find("security")[0] !== undefined,
    new FileLogger("security_logs.txt")
);
```

### 自定义格式化层

```typescript
/**
 * JSON 格式化层
 */
class JsonFormatter implements Layer {
    private filter: EnvFilter;

    constructor(filter: EnvFilter) {
        this.filter = filter;
    }

    onEvent(record: LogRecord): void {
        if (!this.filter.isEnabled(record.level, record.module)) {
            return;
        }

        // 转换为 JSON 格式
        const jsonLog = {
            timestamp: record.timestamp,
            level: Level[record.level],
            module: record.module,
            message: record.message,
            fields: record.fields ? this.mapToObject(record.fields) : undefined
        };

        // 输出 JSON 字符串
        print(HttpService.JSONEncode(jsonLog));
    }

    name(): string {
        return "JsonFormatter";
    }

    private mapToObject(map: Map<string, unknown>): { [key: string]: unknown } {
        const obj: { [key: string]: unknown } = {};
        map.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }
}

// 使用
app.addPlugin(new LogPlugin({
    fmtLayer: (app) => new JsonFormatter(EnvFilter.tryFromDefaultEnv("info"))
}));
```

### 条件日志系统

```typescript
/**
 * 环境感知日志配置
 */
function createLogPlugin(): LogPlugin {
    const isProduction = !RunService.IsStudio();
    const isServer = RunService.IsServer();

    if (isProduction) {
        // 生产环境: 只记录警告和错误
        return new LogPlugin({
            level: Level.WARN,
            filter: "critical_system=info",
            customLayer: (app) => new RemoteErrorLogger("https://api.example.com/logs")
        });
    } else if (isServer) {
        // 开发服务器: 记录所有信息
        return new LogPlugin({
            level: Level.TRACE,
            filter: ""
        });
    } else {
        // 开发客户端: 适中的日志
        return new LogPlugin({
            level: Level.DEBUG,
            filter: "rendering=info,network=warn"
        });
    }
}

// 使用
app.addPlugin(createLogPlugin());
```

### 性能监控层

```typescript
/**
 * 性能监控日志层
 * 统计不同模块的日志数量
 */
class PerformanceMonitor implements Layer {
    private counters = new Map<string, number>();
    private lastReport = os.clock();
    private readonly reportInterval = 60; // 60秒

    onEvent(record: LogRecord): void {
        const module = record.module ?? "unknown";
        const count = this.counters.get(module) ?? 0;
        this.counters.set(module, count + 1);

        // 定期报告
        const now = os.clock();
        if (now - this.lastReport >= this.reportInterval) {
            this.report();
            this.lastReport = now;
        }
    }

    name(): string {
        return "PerformanceMonitor";
    }

    private report(): void {
        info("===== 日志性能报告 =====");

        const entries: Array<[string, number]> = [];
        this.counters.forEach((count, module) => {
            entries.push([module, count]);
        });

        // 按数量排序
        entries.sort((a, b) => b[1] > a[1]);

        for (const [module, count] of entries) {
            info(`  ${module}: ${count} 条日志`);
        }

        // 重置计数器
        this.counters.clear();
    }
}
```

---

## 最佳实践

### 1. 日志级别选择

```typescript
// ❌ 错误示例: 级别使用不当
error("玩家移动");        // 玩家移动不是错误!
info("空指针异常");       // 异常应该是 ERROR!
debug("游戏开始");        // 重要事件应该是 INFO!

// ✅ 正确示例
info("玩家移动", "Player", new Map([["position", pos]]));
error("空指针异常", "Core", new Map([["stacktrace", trace]]));
info("游戏开始");
```

### 2. 模块命名规范

```typescript
// ❌ 错误示例: 模块名不清晰
info("处理完成", "sys");
warn("问题", "handler");
error("错误", "x");

// ✅ 正确示例: 清晰的模块路径
info("处理完成", "game::player::inventory");
warn("库存已满", "game::player::inventory");
error("数据库连接失败", "core::database");

// ✅ 推荐: 使用模块包装器
class InventorySystem {
    private logger = new ModuleLogger("game::player::inventory");

    addItem(item: Item) {
        this.logger.info("添加物品", new Map([["item_id", item.id]]));
    }
}
```

### 3. 结构化日志

```typescript
// ❌ 错误示例: 将数据硬编码在消息中
info(`玩家123加入游戏,等级5,位置(10,20,30)`);
warn(`性能警告: FPS=25, 实体数=1000`);

// ✅ 正确示例: 使用 fields 参数
info("玩家加入游戏", "Player", new Map([
    ["player_id", 123],
    ["level", 5],
    ["position", new Vector3(10, 20, 30)]
]));

warn("性能警告", "Performance", new Map([
    ["fps", 25],
    ["entity_count", 1000]
]));
```

### 4. 错误日志

```typescript
// ❌ 错误示例: 错误信息不足
try {
    loadResource(path);
} catch (e) {
    error("加载失败");
}

// ✅ 正确示例: 包含完整上下文
try {
    loadResource(path);
} catch (e) {
    error("资源加载失败", "ResourceManager", new Map([
        ["path", path],
        ["error", tostring(e)],
        ["stack", debug.traceback()]
    ]));
}
```

### 5. 性能敏感代码

```typescript
// ❌ 错误示例: 在循环中频繁记录
function update(entities: Entity[]) {
    for (const entity of entities) {
        trace(`更新实体 ${entity.id}`);  // 每帧成千上万条日志!
    }
}

// ✅ 正确示例 1: 使用 once
function update(entities: Entity[]) {
    for (const entity of entities) {
        if (entity.hasError()) {
            traceOnce("发现错误实体", "EntitySystem");
        }
    }
}

// ✅ 正确示例 2: 批量记录
function update(entities: Entity[]) {
    let errorCount = 0;

    for (const entity of entities) {
        if (entity.hasError()) {
            errorCount++;
        }
    }

    if (errorCount > 0) {
        warn("发现错误实体", "EntitySystem", new Map([
            ["count", errorCount],
            ["total", entities.size()]
        ]));
    }
}
```

### 6. 环境分离

```typescript
// ✅ 推荐: 根据环境配置日志
class GameConfig {
    static getLogConfig(): Partial<LogPlugin> {
        if (RunService.IsStudio()) {
            // 开发环境: 详细日志
            return {
                level: Level.TRACE,
                filter: ""
            };
        } else {
            // 生产环境: 只记录重要信息
            return {
                level: Level.WARN,
                filter: "critical=info",
                customLayer: (app) => new RemoteErrorLogger("https://api.game.com/errors")
            };
        }
    }
}

// 使用
app.addPlugin(new LogPlugin(GameConfig.getLogConfig()));
```

### 7. 敏感信息保护

```typescript
// ❌ 危险示例: 记录敏感信息
info("用户登录", "Auth", new Map([
    ["username", "player123"],
    ["password", "secret123"],  // 绝对不要记录密码!
    ["token", "abc123xyz"]       // 不要记录令牌!
]));

// ✅ 安全示例: 脱敏处理
function maskSensitive(value: string): string {
    if (value.size() <= 4) {
        return "****";
    }
    return `${value.sub(1, 2)}***${value.sub(-2)}`;
}

info("用户登录", "Auth", new Map([
    ["username", "player123"],
    ["user_id", getUserId()],  // 使用 ID 而不是敏感信息
    ["timestamp", os.time()]
]));
```

### 8. 日志与监控集成

```typescript
/**
 * 日志驱动的监控指标
 */
class MetricsLayer implements Layer {
    private metrics = {
        errorCount: 0,
        warnCount: 0,
        lastError: "",
        lastErrorTime: 0
    };

    onEvent(record: LogRecord): void {
        switch (record.level) {
            case Level.ERROR:
                this.metrics.errorCount++;
                this.metrics.lastError = record.message;
                this.metrics.lastErrorTime = record.timestamp;

                // 错误率过高时触发告警
                if (this.metrics.errorCount > 100) {
                    this.sendAlert("错误率过高");
                }
                break;

            case Level.WARN:
                this.metrics.warnCount++;
                break;
        }
    }

    name(): string {
        return "MetricsLayer";
    }

    getMetrics() {
        return this.metrics;
    }

    private sendAlert(message: string): void {
        // 发送告警到监控系统
    }
}
```

---

## 性能优化

### 1. 使用一次性日志

```typescript
// 场景: 每帧都可能触发的警告
function update() {
    if (memoryUsage > threshold) {
        // ❌ 不好: 每帧都输出
        warn("内存使用率高");

        // ✅ 好: 只输出一次
        warnOnce("内存使用率高", "Memory");
    }
}
```

### 2. 条件日志编译

```typescript
// 使用常量控制日志
const ENABLE_TRACE_LOGS = RunService.IsStudio();
const ENABLE_DEBUG_LOGS = RunService.IsStudio() || IS_DEV_BUILD;

function criticalPath() {
    if (ENABLE_TRACE_LOGS) {
        trace("进入关键路径");
    }

    // 关键逻辑

    if (ENABLE_TRACE_LOGS) {
        trace("退出关键路径");
    }
}
```

### 3. 延迟字符串构造

```typescript
// ❌ 不好: 即使不记录也构造了字符串
trace(`复杂计算结果: ${expensiveCalculation()}`);

// ✅ 好: 先检查级别再构造
function traceComplex(fn: () => string, module?: string) {
    const subscriber = LogSubscriber.getGlobal();
    if (subscriber) {
        // 假设有办法检查级别是否启用
        trace(fn(), module);
    }
}

traceComplex(() => `复杂计算结果: ${expensiveCalculation()}`);
```

### 4. 批量日志

```typescript
/**
 * 批量日志缓冲
 */
class BatchLogger {
    private buffer: LogRecord[] = [];
    private readonly batchSize = 50;
    private readonly flushInterval = 1; // 1秒
    private lastFlush = os.clock();

    log(level: Level, message: string, module?: string) {
        this.buffer.push({
            level,
            message,
            module,
            timestamp: os.time()
        });

        // 达到批量大小或时间间隔时刷新
        if (this.buffer.size() >= this.batchSize ||
            os.clock() - this.lastFlush >= this.flushInterval) {
            this.flush();
        }
    }

    private flush() {
        if (this.buffer.size() === 0) return;

        // 批量处理日志
        const subscriber = LogSubscriber.getGlobal();
        if (subscriber) {
            for (const record of this.buffer) {
                subscriber.logEvent(record);
            }
        }

        this.buffer.clear();
        this.lastFlush = os.clock();
    }
}
```

### 5. 采样日志

```typescript
/**
 * 采样日志层 - 只记录部分日志
 */
class SamplingLogger implements Layer {
    private counter = 0;

    constructor(
        private readonly sampleRate: number, // 采样率 (0-1)
        private readonly innerLayer: Layer
    ) {}

    onEvent(record: LogRecord): void {
        this.counter++;

        // 根据采样率决定是否记录
        if (this.counter % math.floor(1 / this.sampleRate) === 0) {
            this.innerLayer.onEvent(record);
        }
    }

    name(): string {
        return `Sampling(${this.innerLayer.name()})`;
    }
}

// 使用: 只记录 10% 的 TRACE 日志
const sampledLayer = new SamplingLogger(0.1, new RobloxLayer(filter));
```

### 6. 异步日志 (谨慎使用)

```typescript
/**
 * 异步日志缓冲 (Roblox 中需要特殊处理)
 * 注意: Roblox 没有真正的多线程,这里使用延迟处理
 */
class AsyncLogger implements Layer {
    private queue: LogRecord[] = [];
    private processing = false;

    onEvent(record: LogRecord): void {
        // 快速入队
        this.queue.push(record);

        // 触发异步处理
        if (!this.processing) {
            this.scheduleProcessing();
        }
    }

    name(): string {
        return "AsyncLogger";
    }

    private scheduleProcessing(): void {
        this.processing = true;

        // 使用 task.defer 延迟处理
        task.defer(() => {
            this.processQueue();
            this.processing = false;
        });
    }

    private processQueue(): void {
        while (this.queue.size() > 0) {
            const record = this.queue.shift();
            if (record) {
                // 实际处理日志
                this.writeLog(record);
            }
        }
    }

    private writeLog(record: LogRecord): void {
        // 写入文件或发送到服务器
    }
}
```

---

## 故障排查

### 问题 1: 日志未显示

**症状**: 调用日志函数但没有输出

**可能原因和解决方案**:

```typescript
// 原因 1: 未添加 LogPlugin
// 解决: 确保添加了插件
const app = new App();
app.addPlugin(new LogPlugin());  // ✅ 必需

// 原因 2: 日志级别过滤
// 检查当前配置
const plugin = new LogPlugin({
    level: Level.WARN,  // 只显示 WARN 和 ERROR
    filter: "my_module=error"  // my_module 只显示 ERROR
});

// 解决: 调整级别
const plugin = new LogPlugin({
    level: Level.INFO,  // 显示 INFO 及以上
    filter: "my_module=debug"  // my_module 显示 DEBUG 及以上
});

// 原因 3: 模块过滤规则
debug("测试消息", "filtered_module");  // 如果 filtered_module 被过滤

// 检查过滤规则
const filter = new EnvFilter("warn,filtered_module=error");
filter.isEnabled(Level.DEBUG, "filtered_module");  // false!

// 原因 4: 在 LogPlugin 之前调用
info("这不会显示");  // ❌ LogPlugin 还未初始化
app.addPlugin(new LogPlugin());
info("这会显示");    // ✅
```

### 问题 2: 性能问题

**症状**: 大量日志导致游戏卡顿

**诊断和解决**:

```typescript
// 1. 添加性能监控层
class LogPerformanceMonitor implements Layer {
    private counts = new Map<Level, number>();
    private startTime = os.clock();

    onEvent(record: LogRecord): void {
        const count = this.counts.get(record.level) ?? 0;
        this.counts.set(record.level, count + 1);
    }

    name(): string {
        return "LogPerformanceMonitor";
    }

    report(): void {
        const elapsed = os.clock() - this.startTime;
        const total = Array.from(this.counts.values()).reduce((a, b) => a + b, 0);

        print(`===== 日志性能报告 =====`);
        print(`时间: ${elapsed}秒`);
        print(`总日志数: ${total}`);
        print(`日志速率: ${total / elapsed} 条/秒`);

        this.counts.forEach((count, level) => {
            print(`  ${Level[level]}: ${count} 条`);
        });
    }
}

// 使用
const perfMonitor = new LogPerformanceMonitor();
app.addPlugin(new LogPlugin({
    customLayer: () => perfMonitor
}));

// 定期报告
task.delay(60, () => {
    perfMonitor.report();
});

// 2. 解决方案: 提高过滤级别
app.addPlugin(new LogPlugin({
    level: Level.WARN,  // 只记录警告和错误
    filter: "hot_path=error"  // 热路径只记录错误
}));

// 3. 使用采样
const sampledLogger = new SamplingLogger(0.1, baseLayer);

// 4. 使用 once 函数
function hotFunction() {
    debugOnce("这只会记录一次");
}
```

### 问题 3: 日志过多难以查找

**症状**: 控制台被大量日志淹没

**解决方案**:

```typescript
// 1. 使用更精细的过滤
app.addPlugin(new LogPlugin({
    level: Level.INFO,
    filter: [
        "noisy_module=warn",      // 减少噪音模块
        "important_module=trace",  // 保留重要模块
        "spam_system=error"        // 屏蔽垃圾系统
    ].join(",")
}));

// 2. 创建专用日志文件
class FilteredFileLogger implements Layer {
    constructor(
        private readonly moduleName: string,
        private readonly filePath: string
    ) {}

    onEvent(record: LogRecord): void {
        // 只记录特定模块
        if (record.module === this.moduleName) {
            this.writeToFile(record);
        }
    }

    name(): string {
        return `FilteredFileLogger(${this.moduleName})`;
    }

    private writeToFile(record: LogRecord): void {
        // 写入专用文件
    }
}

// 3. 使用搜索友好的格式
info("玩家加入", "Player", new Map([
    ["event", "player_join"],  // 添加事件标签便于搜索
    ["player_id", 123]
]));

// 搜索: "event=player_join"
```

### 问题 4: Studio vs 生产环境差异

**症状**: Studio 中正常但生产环境中日志异常

**解决方案**:

```typescript
// 1. 检测环境
const isStudio = RunService.IsStudio();
const isServer = RunService.IsServer();

// 2. 条件配置
app.addPlugin(new LogPlugin({
    level: isStudio ? Level.DEBUG : Level.WARN,
    filter: isStudio ? "" : "critical=info",
    customLayer: isStudio ? undefined : (app) => new RemoteLogger()
}));

// 3. 添加环境标签
function logWithEnv(level: Level, message: string) {
    const env = isStudio ? "Studio" : "Production";
    const side = isServer ? "Server" : "Client";
    info(message, `${env}::${side}`);
}
```

### 问题 5: 内存泄漏

**症状**: 长时间运行后内存占用增加

**诊断**:

```typescript
// 检查 once 缓存大小
import { calledSites } from "../bevy_log/once";

function checkOnceCache() {
    warn("Once 缓存大小", "Memory", new Map([
        ["size", calledSites.size()]
    ]));
}

// 定期清理 (仅测试环境)
if (RunService.IsStudio()) {
    task.delay(300, () => {
        import { clearOnceCache } from "../bevy_log/once";
        clearOnceCache();
        info("已清理 once 缓存");
    });
}
```

### 问题 6: 自定义层不工作

**症状**: 自定义层的 onEvent 未被调用

**检查清单**:

```typescript
// 1. 确保实现了 Layer 接口
class MyLayer implements Layer {
    onEvent(record: LogRecord): void {
        print("onEvent called");  // 添加调试
    }

    name(): string {
        return "MyLayer";  // 必须实现
    }
}

// 2. 确保返回了层实例
app.addPlugin(new LogPlugin({
    customLayer: (app) => {
        const layer = new MyLayer();
        print(`Created layer: ${layer.name()}`);  // 调试
        return layer;  // ✅ 必须返回
    }
}));

// 3. 检查层是否被添加
const subscriber = LogSubscriber.getGlobal();
if (subscriber) {
    print("Subscriber exists");  // 调试
}
```

---

## 附录

### 与 Rust Bevy 的对应关系

| Rust Bevy | TypeScript 移植 | 说明 |
|-----------|----------------|------|
| `LogPlugin` | `LogPlugin` | 日志插件 |
| `Level` | `Level` 枚举 | 日志级别 |
| `error!` | `error()` | 错误日志宏→函数 |
| `warn!` | `warn()` | 警告日志宏→函数 |
| `info!` | `info()` | 信息日志宏→函数 |
| `debug!` | `debug()` | 调试日志宏→函数 |
| `trace!` | `trace()` | 追踪日志宏→函数 |
| `error_span!` | `errorSpan()` | 错误 span |
| `warn_span!` | `warnSpan()` | 警告 span |
| `info_span!` | `infoSpan()` | 信息 span |
| `debug_span!` | `debugSpan()` | 调试 span |
| `trace_span!` | `traceSpan()` | 追踪 span |
| `error_once!` | `errorOnce()` | 一次性错误日志 |
| `warn_once!` | `warnOnce()` | 一次性警告日志 |
| `info_once!` | `infoOnce()` | 一次性信息日志 |
| `debug_once!` | `debugOnce()` | 一次性调试日志 |
| `trace_once!` | `traceOnce()` | 一次性追踪日志 |
| `EnvFilter` | `EnvFilter` | 环境过滤器 |
| `Layer` trait | `Layer` 接口 | 日志层接口 |
| `tracing::subscriber` | `LogSubscriber` | 日志订阅器 |
| `Box<dyn Layer>` | `BoxedLayer` | 类型别名 |
| android_tracing/tracing-wasm | `RobloxLayer` | 平台适配 |

### 快速参考

#### 导入常用功能

```typescript
// 方式 1: 具名导入
import { LogPlugin, Level, info, warn, error } from "../bevy_log";

// 方式 2: 使用 prelude
import * as log from "../bevy_log/prelude";
log.info("消息");
log.warnOnce("警告");
```

#### 常用配置模板

```typescript
// 开发环境
new LogPlugin({
    level: Level.TRACE,
    filter: ""
});

// 测试环境
new LogPlugin({
    level: Level.DEBUG,
    filter: "external_lib=warn"
});

// 生产环境
new LogPlugin({
    level: Level.WARN,
    filter: "critical_system=info"
});
```

#### 日志级别对照

```
TRACE < DEBUG < INFO < WARN < ERROR
  5       4       3      2       1
```

---

## 总结

bevy_log 提供了一套完整的日志解决方案:

1. **易用性** - 零配置开箱即用,简单清晰的 API
2. **灵活性** - 支持自定义层、过滤器和格式化
3. **性能** - 一次性日志、过滤系统、延迟计算
4. **可维护性** - 模块化设计、清晰的架构
5. **Roblox 集成** - 完美适配 Roblox 平台特性

通过合理使用日志系统,可以大大提升开发效率和问题排查能力!