# bevy_time

Bevy 时间管理模块的 TypeScript/Roblox 实现。该模块提供了完整的时间跟踪、固定时间步和虚拟时间管理功能。

## 概述

`bevy_time` 模块是 Bevy 游戏引擎时间系统的核心实现，提供了：
- 实时时间跟踪（Real Time）
- 虚拟时间控制（Virtual Time）- 支持暂停、速度调节
- 固定时间步（Fixed Timestep）- 用于物理模拟
- 灵活的时间更新策略

## 快速开始

```typescript
import { App } from "../bevy_app/app";
import { TimePlugin } from "./time-plugin";
import { VirtualTimeResource } from "./time-resources";

// 添加时间插件到应用
const app = new App();
app.addPlugins(new TimePlugin());

// 访问虚拟时间资源
const virtualTime = app.getResource(VirtualTimeResource);
if (virtualTime) {
    // 暂停游戏时间
    virtualTime.value.getContext().paused = true;

    // 调整时间速度为2倍
    virtualTime.value.getContext().relativeSpeed = 2.0;
}
```

## 公共 API

### 1. 插件结构体 (Plugin Struct)

#### `TimePlugin`
主要的时间管理插件，自动管理所有时间资源的更新。

```typescript
export class TimePlugin implements Plugin {
    name(): string;
    build(app: App): void;
}
```

使用方式：
```typescript
app.addPlugins(new TimePlugin());
```

### 2. 公共组件 (Public Components)

本模块主要使用资源而非组件，时间数据作为全局资源存在。

### 3. 公共资源 (Public Resources)

#### `RealTimeResource`
追踪实际经过的时间，不受暂停或速度调节影响。

```typescript
export class RealTimeResource {
    value: Time<Real>;
}
```

#### `VirtualTimeResource`
可控制的游戏时间，支持暂停和速度调节。

```typescript
export class VirtualTimeResource {
    value: Time<Virtual>;
}

// Virtual 时间上下文
interface Virtual {
    paused: boolean;        // 是否暂停
    relativeSpeed: number;  // 相对速度（1.0 = 正常速度）
    effectiveSpeed: number; // 有效速度
    maxDelta: Duration;     // 最大时间增量限制
}
```

#### `FixedTimeResource`
固定时间步资源，用于物理模拟等需要固定更新频率的系统。

```typescript
export class FixedTimeResource {
    value: TimeFixed;
}
```

#### `GenericTimeResource`
通用时间资源，默认跟随虚拟时间。

```typescript
export class GenericTimeResource {
    value: Time<Empty>;
}
```

#### `TimeUpdateStrategyResource`
时间更新策略资源，用于控制时间的更新方式。

```typescript
export class TimeUpdateStrategyResource {
    lastUpdate: number | undefined;
    mockDelta?: number;  // 用于测试的模拟时间增量
}
```

### 4. 公共类型 (Public Types)

#### `Duration`
表示时间段的核心类型。

```typescript
export class Duration {
    static ZERO: Duration;
    static fromSecs(secs: number): Duration;
    static fromMillis(millis: number): Duration;

    add(other: Duration): Duration;
    sub(other: Duration): Duration;
    mul(scalar: number): Duration;
    div(scalar: number): Duration;

    asSecsF32(): number;
    asSecsF64(): number;
    asMillis(): number;

    isZero(): boolean;
    lessThan(other: Duration): boolean;
    greaterThan(other: Duration): boolean;
}
```

#### `Time<T>`
通用时间类，支持不同的时间上下文。

```typescript
export class Time<T extends TimeContext = Empty> {
    // 时间推进
    advanceBy(delta: Duration): void;
    advanceTo(elapsed: Duration): void;

    // 获取时间信息
    getDelta(): Duration;           // 本帧时间增量
    getDeltaSecs(): number;          // 本帧时间增量（秒）
    getElapsed(): Duration;          // 总经过时间
    getElapsedSecs(): number;        // 总经过时间（秒）
    getElapsedWrapped(): Duration;   // 包装后的时间

    // 配置
    setWrapPeriod(period: Duration): void;
    getWrapPeriod(): Duration;

    // 获取上下文
    getContext(): T;
}
```

#### `TimeFixed`
固定时间步管理器。

```typescript
export class TimeFixed {
    // 设置固定时间步
    setTimestep(timestep: Duration): void;
    setTimestepHz(hz: number): void;

    // 时间步管理
    accumulate(delta: Duration): void;
    expend(): boolean;  // 消费一个时间步

    // 获取信息
    getTimestep(): Duration;
    getOverstep(): Duration;
    getOverstepFraction(): number;

    // 转换为通用时间
    asGeneric(): Time<Fixed>;
}
```

### 5. 公共函数 (Public Functions)

#### `advanceTime`
手动推进时间（主要用于测试）。

```typescript
export function advanceTime(app: App, seconds: number): void;
```

#### `runFixedMainSchedule`
运行固定时间步调度。

```typescript
export function runFixedMainSchedule(world: World, context: Context, app: App): void;
```

#### `updateFrameCount`
更新帧计数器。

```typescript
export function updateFrameCount(world: World, context: Context, app: App): void;
```

### 6. 类型别名 (Type Aliases)

为了更方便的使用，提供了以下类型别名：

```typescript
export type GenericTime = Time<Empty>;
export type RealTime = Time<Real>;
export type VirtualTime = Time<Virtual>;
export type FixedTime = Time<Fixed>;
```

## 使用示例

### 基础时间追踪

```typescript
import { App } from "../bevy_app/app";
import { TimePlugin } from "./time-plugin";
import { VirtualTimeResource } from "./time-resources";

const app = new App();
app.addPlugins(new TimePlugin());

// 在系统中使用时间
function mySystem(world: World, context: Context, app: App) {
    const timeResource = app.getResource(VirtualTimeResource);
    if (timeResource) {
        const time = timeResource.value;
        const delta = time.getDeltaSecs();
        const elapsed = time.getElapsedSecs();

        print(`Delta: ${delta}s, Total: ${elapsed}s`);
    }
}

app.addSystems(BuiltinSchedules.UPDATE, mySystem);
```

### 暂停和速度控制

```typescript
function pauseGame(app: App) {
    const virtualTime = app.getResource(VirtualTimeResource);
    if (virtualTime) {
        virtualTime.value.getContext().paused = true;
    }
}

function setGameSpeed(app: App, speed: number) {
    const virtualTime = app.getResource(VirtualTimeResource);
    if (virtualTime) {
        virtualTime.value.getContext().relativeSpeed = speed;
    }
}
```

### 固定时间步

```typescript
import { FixedTimeResource } from "./time-resources";

function setupPhysics(app: App) {
    const fixedTime = app.getResource(FixedTimeResource);
    if (fixedTime) {
        // 设置60 Hz的物理更新频率
        fixedTime.value.setTimestepHz(60);
    }
}

// 物理系统应该使用固定时间
function physicsSystem(world: World, context: Context, app: App) {
    const fixedTime = app.getResource(FixedTimeResource);
    if (fixedTime) {
        const timestep = fixedTime.value.getTimestep().asSecsF32();
        // 使用固定的时间步进行物理计算
        updatePhysics(timestep);
    }
}
```

### 测试中的时间控制

```typescript
import { advanceTime } from "./time-plugin";

// 在测试中手动推进时间
describe("Time-based system", () => {
    it("should update after time passes", () => {
        const app = new App();
        app.addPlugins(new TimePlugin());

        // 推进1秒
        advanceTime(app, 1.0);
        app.update();

        const time = app.getResource(VirtualTimeResource);
        expect(time?.value.getElapsedSecs()).toBe(1.0);
    });
});
```

## prelude 模块

为了方便使用，建议创建一个 `prelude` 导出：

```typescript
// 在 index.ts 中已经导出了所有公共 API
export * from "./index";
```

## 注意事项

1. **时间精度**：使用 `os.clock()` 获取时间，精度取决于 Roblox 平台。

2. **最大增量限制**：Virtual 时间有最大增量限制（默认 0.25 秒），防止长时间暂停后的时间跳跃。

3. **固定时间步**：固定时间步会累积虚拟时间的增量，并在合适的时机批量消费。

4. **时间包装**：默认情况下，`elapsedWrapped` 会在 1 小时后重置，可以通过 `setWrapPeriod` 修改。

## 与原版 Bevy 的差异

1. **Roblox 适配**：使用 `os.clock()` 代替系统时间。
2. **TypeScript 实现**：使用 TypeScript 的类型系统替代 Rust 的泛型系统。
3. **资源管理**：使用 Matter ECS 的资源系统。
4. **调度系统**：集成到 Bevy 的调度系统中，但实现方式适配了 TypeScript。

## 相关模块

- `bevy_app`: 应用程序框架，提供插件系统
- `bevy_ecs`: ECS 系统，提供资源管理
- `bevy_transform`: 变换系统，可能使用时间进行动画

## 贡献指南

在修改或扩展此模块时，请确保：
1. 保持与原版 Bevy API 的一致性
2. 添加适当的 JSDoc 注释
3. 编写单元测试
4. 遵循项目的 TypeScript 编码规范