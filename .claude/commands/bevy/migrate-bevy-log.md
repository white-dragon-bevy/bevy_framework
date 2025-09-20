# 迁移 bevy_log 模块到 roblox-ts

## 任务描述

将 Bevy 引擎的 `bevy_log` 模块迁移到 roblox-ts 生态，实现完整的日志系统，适配 Roblox 输出机制。

## 输入目录

- `bevy-origin/crates/bevy_log/` - Bevy 原始日志系统代码

## 输出目录

- `src/bevy_log/` - 迁移后的 roblox-ts 日志系统

## 任务要求

### 1. 核心功能迁移

- 实现分级日志系统 (Trace, Debug, Info, Warn, Error)
- 支持结构化日志和格式化输出
- 实现日志过滤和筛选机制
- 支持多个日志目标（控制台、文件、远程）
- 提供性能友好的日志宏

### 2. 架构设计

```typescript
// 日志级别枚举
enum LogLevel {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Warn = 3,
    Error = 4,
}

// 日志记录
interface LogRecord {
    readonly level: LogLevel;
    readonly message: string;
    readonly target: string;
    readonly timestamp: number;
    readonly metadata?: Record<string, unknown>;
}

// 日志器接口
interface Logger {
    log(record: LogRecord): void;
    isEnabled(level: LogLevel, target: string): boolean;
    flush(): void;
}

// 日志管理器
class LogManager {
    addLogger(logger: Logger): void;
    removeLogger(logger: Logger): void;
    setLevel(level: LogLevel): void;
    setFilter(filter: LogFilter): void;
}
```

### 3. Roblox 集成

- 使用 Roblox `print()`, `warn()`, `error()` 函数
- 支持 Roblox Studio 输出窗口
- 集成 Roblox 的开发者控制台
- 支持游戏内日志查看器
- 处理客户端和服务器的日志同步

### 4. 编码规范

严格遵循 `.claude/agents/roblox-ts-pro.md` 中的编码规范：

- 所有导出函数必须有 JSDoc 注释
- 使用显式返回类型
- 文件末尾必须以换行符结束
- 接口属性按字母顺序排列
- 使用描述性变量名

### 5. 单元测试

使用 `@rbxts/testez` 编写完整的单元测试：

- 测试各个日志级别的输出
- 测试日志过滤机制
- 测试多日志器的协作
- 测试日志格式化
- 测试性能影响
- 测试错误处理

### 6. 特殊考虑

- 避免在高频系统中产生性能影响
- 支持生产环境的日志级别控制
- 处理敏感信息的过滤
- 支持远程日志收集
- 与调试工具的集成

## 文件结构

```
crates/bevy_log/
├── src/
│   ├── index.ts                 # 主要导出
│   ├── logger.ts                # 核心日志器
│   ├── level.ts                 # 日志级别定义
│   ├── record.ts                # 日志记录结构
│   ├── manager.ts               # 日志管理器
│   ├── filter.ts                # 日志过滤器
│   ├── formatter.ts             # 日志格式化器
│   ├── targets/
│   │   ├── console.ts           # 控制台输出
│   │   ├── file.ts              # 文件输出（有限支持）
│   │   └── remote.ts            # 远程日志收集
│   └── macros.ts                # 日志宏定义
├── tests/
│   ├── logger.spec.ts           # 日志器测试
│   ├── manager.spec.ts          # 管理器测试
│   ├── filter.spec.ts           # 过滤器测试
│   ├── formatter.spec.ts        # 格式化器测试
│   ├── targets.spec.ts          # 输出目标测试
│   └── performance.spec.ts      # 性能测试
├── package.json
└── tsconfig.json
```

### 7. 高级特性

- 异步日志输出（避免阻塞游戏循环）
- 日志缓冲和批量输出
- 结构化日志的查询和分析
- 日志压缩和归档

## 预期产出

1. 完整的分级日志系统
2. 高性能的日志输出机制
3. 灵活的日志过滤和格式化
4. 多种输出目标支持
5. 全面的单元测试覆盖
6. 详细的 JSDoc 文档

## 验证标准

- 所有测试通过
- ESLint 检查无错误
- TypeScript 编译无错误
- 符合 roblox-ts-pro 编码规范
- 日志输出性能开销小于 1%
- 支持高并发日志输出

## 使用示例

```typescript
// 基础日志使用
import { Logger, LogLevel } from "@/crates/bevy_log";

const logger = Logger.getLogger("GameSystem");

logger.info("Game started");
logger.warn("Low health warning", { playerId: 123, health: 10 });
logger.error("Failed to load asset", { assetId: "weapon_001" });

// 条件日志（性能优化）
if (logger.isEnabled(LogLevel.Debug)) {
    logger.debug("Complex calculation result", {
        result: expensiveCalculation()
    });
}

// 系统中使用日志
function healthSystem(world: World) {
    const logger = Logger.getLogger("HealthSystem");

    for (const [entity, health] of world.query(Health)) {
        if (health.value <= 0) {
            logger.info("Entity died", { entityId: entity });
        }
    }
}

// 配置日志管理器
const logManager = new LogManager();
logManager.setLevel(LogLevel.Info);
logManager.addLogger(new ConsoleLogger());
logManager.addLogger(new RemoteLogger("https://api.example.com/logs"));

// 插件集成
class LogPlugin implements MatterPlugin {
    install(world: World): void {
        world.insertResource(logManager);
    }
}
```

## 性能优化

- 惰性字符串构建
- 日志级别快速检查
- 对象池管理日志记录
- 异步批量输出

## 与其他模块集成

- 与 `bevy_app` 插件系统集成
- 与 `bevy_diagnostic` 诊断系统集成
- 与开发工具的日志查看器集成
