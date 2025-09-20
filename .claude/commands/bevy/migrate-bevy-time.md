# 迁移 bevy_time 模块到 roblox-ts

## 任务描述

将 Bevy 引擎的 `bevy_time` 模块迁移到 roblox-ts 生态，实现高精度时间系统和游戏循环管理。

## 输入目录
- `bevy-origin/crates/bevy_time/` - Bevy 原始时间系统代码

## 输出目录
- `crates/bevy_time/` - 迁移后的 roblox-ts 时间系统

## 任务要求

### 1. 核心功能迁移
- 实现 `Time` 资源组件，提供统一的时间信息
- 实现 `Timer` 和 `Stopwatch` 工具类
- 支持固定时间步长和可变时间步长
- 实现时间缩放和暂停功能
- 提供高精度的 delta time 计算

### 2. 架构设计
```typescript
// 时间资源组件
class Time {
    readonly deltaTime: number;          // 帧间时间
    readonly elapsedTime: number;        // 总运行时间
    readonly frameCount: number;         // 帧计数
    readonly timeScale: number;          // 时间缩放
    readonly isPaused: boolean;          // 是否暂停

    setTimeScale(scale: number): void;
    pause(): void;
    resume(): void;
}

// 定时器类
class Timer {
    readonly duration: number;
    readonly elapsed: number;
    readonly isFinished: boolean;
    readonly isRepeating: boolean;

    tick(deltaTime: number): void;
    reset(): void;
    setDuration(duration: number): void;
}

// 秒表类
class Stopwatch {
    readonly elapsed: number;
    readonly isRunning: boolean;

    start(): void;
    stop(): void;
    reset(): void;
    tick(deltaTime: number): void;
}
```

### 3. Roblox 集成
- 使用 `os.clock()` 获取高精度时间
- 避免使用 `RunService.Heartbeat.Wait()` 等会 yield 的操作
- 与 `RunService.Heartbeat` 事件集成
- 支持固定时间步长的物理更新

### 4. 编码规范
严格遵循 `.claude/agents/roblox-ts-pro.md` 中的编码规范：
- 使用 `os.clock()` 替代 yield 操作
- 所有导出函数必须有 JSDoc 注释
- 使用显式返回类型
- 文件末尾必须以换行符结束
- 接口属性按字母顺序排列

### 5. 单元测试
使用 `@rbxts/testez` 编写完整的单元测试：
- 测试 Time 组件的准确性
- 测试 Timer 的各种模式（单次、重复）
- 测试 Stopwatch 的状态管理
- 测试时间缩放功能
- 测试暂停和恢复功能
- 测试边界情况和错误处理

### 6. 特殊考虑
- 确保时间精度在 Roblox 环境下的稳定性
- 处理网络延迟对时间同步的影响
- 支持不同帧率下的一致性表现
- 优化性能，减少计算开销
- 与其他系统的时间同步

## 文件结构
```
crates/bevy_time/
├── src/
│   ├── index.ts                 # 主要导出
│   ├── time.ts                  # Time 资源组件
│   ├── timer.ts                 # Timer 类
│   ├── stopwatch.ts             # Stopwatch 类
│   ├── time-system.ts           # 时间系统更新
│   └── utils.ts                 # 时间工具函数
├── tests/
│   ├── time.spec.ts             # Time 组件测试
│   ├── timer.spec.ts            # Timer 测试
│   ├── stopwatch.spec.ts        # Stopwatch 测试
│   ├── integration.spec.ts      # 集成测试
│   └── performance.spec.ts      # 性能测试
├── package.json
└── tsconfig.json
```

### 7. 性能优化
- 缓存时间计算结果
- 避免频繁的对象创建
- 使用对象池管理 Timer 和 Stopwatch 实例
- 优化数值计算的精度

## 预期产出
1. 高精度的时间管理系统
2. 灵活的定时器和秒表工具
3. 稳定的时间缩放功能
4. 全面的单元测试覆盖
5. 详细的 JSDoc 文档
6. 与 Roblox RunService 的无缝集成

## 验证标准
- 所有测试通过
- ESLint 检查无错误
- TypeScript 编译无错误
- 符合 roblox-ts-pro 编码规范
- 时间精度误差小于 1ms
- 在不同帧率下表现一致

## 使用示例
```typescript
// 在系统中使用时间
function movementSystem(world: World) {
    const time = world.getResource(Time);

    for (const [entity, position, velocity] of world.query(Position, Velocity)) {
        position.x += velocity.x * time.deltaTime;
        position.y += velocity.y * time.deltaTime;
    }
}

// 使用定时器
const attackTimer = new Timer(2.0, true); // 2秒重复定时器

function attackSystem(world: World) {
    const time = world.getResource(Time);
    attackTimer.tick(time.deltaTime);

    if (attackTimer.isFinished) {
        performAttack();
    }
}
```