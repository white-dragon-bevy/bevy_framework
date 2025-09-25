# 调度系统

## 概述

调度系统控制系统（Systems）的执行时机和顺序。Bevy 提供了一组内置调度阶段，并允许创建自定义调度。

## 内置调度

### 启动调度（只执行一次）

```typescript
import { BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";

// 启动前
app.addSystems(BuiltinSchedules.PRE_STARTUP, preStartupSystem);

// 主启动
app.addSystems(BuiltinSchedules.STARTUP, startupSystem);

// 启动后
app.addSystems(BuiltinSchedules.POST_STARTUP, postStartupSystem);
```

执行顺序：`PreStartup → Startup → PostStartup`

### 主循环调度（每帧执行）

```typescript
// 帧开始
app.addSystems(BuiltinSchedules.FIRST, firstSystem);

// 更新前
app.addSystems(BuiltinSchedules.PRE_UPDATE, preUpdateSystem);

// 主更新
app.addSystems(BuiltinSchedules.UPDATE, updateSystem);

// 更新后
app.addSystems(BuiltinSchedules.POST_UPDATE, postUpdateSystem);

// 帧结束
app.addSystems(BuiltinSchedules.LAST, lastSystem);
```

执行顺序：`First → PreUpdate → Update → PostUpdate → Last`

## 系统执行顺序

### 默认顺序

同一调度中的系统默认按添加顺序执行：

```typescript
app.addSystems(BuiltinSchedules.UPDATE, systemA); // 先执行
app.addSystems(BuiltinSchedules.UPDATE, systemB); // 后执行
```

### 使用依赖控制顺序

```typescript
// 方式 1：使用 after
app.addSystems(
    BuiltinSchedules.UPDATE,
    systemA,
    systemB.after(systemA)
);

// 方式 2：使用 before
app.addSystems(
    BuiltinSchedules.UPDATE,
    systemA.before(systemB),
    systemB
);

// 方式 3：链式执行
app.addSystems(
    BuiltinSchedules.UPDATE,
    [systemA, systemB, systemC].chain()
);
```

## 系统集（SystemSet）

### 创建系统集

```typescript
import { SystemSet } from "@white-dragon-bevy/bevy-framework";

// 使用内置系统集
const inputSet: SystemSet = CoreSystemSet.INPUT;

// 创建自定义系统集
const gameplaySet: SystemSet = "Gameplay";
```

### 配置系统集

```typescript
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
    // 配置系统集
    schedule.configureSet({
        name: "Gameplay",
        before: ["Rendering"],
        after: ["Input"],
    });

    // 将系统添加到集合
    schedule.addSystemToSet(playerMovement, "Gameplay");
    schedule.addSystemToSet(enemyAI, "Gameplay");
});
```

### 系统集依赖

```typescript
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
    // 定义集合顺序
    schedule.configureSet({
        name: "Physics",
        after: ["Input"],
        before: ["Rendering"],
    });

    schedule.configureSet({
        name: "Rendering",
        after: ["Physics"],
    });
});
```

## 创建自定义调度

### 基础自定义调度

```typescript
import { Schedule } from "@white-dragon-bevy/bevy-framework";

// 创建调度
const customSchedule = new Schedule("CustomUpdate");

// 添加到应用
app.addSchedule(customSchedule);

// 添加系统到自定义调度
app.addSystems("CustomUpdate", customSystem);
```

### 手动运行调度

```typescript
// 在系统中手动运行调度
function runCustomSchedule(world: World, context: Context): void {
    app.runSchedule("CustomUpdate");
}

app.addSystems(BuiltinSchedules.UPDATE, runCustomSchedule);
```

## 条件执行

### 使用 runIf

```typescript
function isGameRunning(world: World, context: Context): boolean {
    const state = context.getResource(GameState);
    return state?.isRunning ?? false;
}

app.addSystems(
    BuiltinSchedules.UPDATE,
    gameplaySystem.runIf(isGameRunning)
);
```

### 条件系统示例

```typescript
// 定义条件
function isServer(): boolean {
    return game.GetService("RunService").IsServer();
}

function hasPlayers(world: World, context: Context): boolean {
    const players = context.getResource(PlayerList);
    return (players?.count ?? 0) > 0;
}

// 应用条件
app.addSystems(
    BuiltinSchedules.UPDATE,
    serverSystem.runIf(isServer),
    multiplayerSystem.runIf(hasPlayers)
);
```

## 固定时间步调度

```typescript
// 固定更新调度（未来版本）
app.addSystems(BuiltinSchedules.FIXED_UPDATE, physicsSystem);

// 配置固定时间步
app.insertResource({
    fixedTimestep: 1/60, // 60 FPS
});
```

## Main 调度

Main 调度是特殊的元调度，包含启动和主循环的执行：

```typescript
// Main 调度自动执行：
// 1. 第一次运行时：启动调度
// 2. 之后每次运行：主循环调度

app.main().setUpdateSchedule(BuiltinSchedules.MAIN);
```

## 调度顺序配置

### 使用 MainScheduleOrder

```typescript
import { MainScheduleOrder } from "@white-dragon-bevy/bevy-framework";

// 获取当前顺序
const order = app.main().getScheduleOrder();

// 插入新调度
app.main().configureScheduleOrder(
    BuiltinSchedules.UPDATE,
    "CustomPhysics" // 在 Update 之前插入
);
```

## 与 Roblox 集成

### 映射到 RunService 事件

```typescript
import { RunService } from "@rbxts/services";

// 默认映射
const scheduleEvents = {
    [BuiltinSchedules.FIRST]: RunService.Heartbeat,
    [BuiltinSchedules.PRE_UPDATE]: RunService.Heartbeat,
    [BuiltinSchedules.UPDATE]: RunService.Heartbeat,
    [BuiltinSchedules.POST_UPDATE]: RunService.Heartbeat,
    [BuiltinSchedules.LAST]: RunService.Heartbeat,
    [BuiltinSchedules.RENDER]: RunService.RenderStepped,
};

// 启动 Loop 执行
app.main().startLoop(scheduleEvents);
```

## 调试调度

### 查看调度状态

```typescript
const schedule = app.getSchedule(BuiltinSchedules.UPDATE);
if (schedule) {
    const state = schedule.getState();
    print(`Systems: ${state.systemCount}`);
    print(`Sets: ${state.setCount}`);
    print(`Compiled: ${state.compiled}`);
}
```

### 可视化调度图

```typescript
const schedule = app.getSchedule(BuiltinSchedules.UPDATE);
if (schedule) {
    const graph = schedule.getGraph();

    // 打印系统
    for (const [id, system] of graph.systems) {
        print(`System: ${system.name}`);
    }

    // 打印依赖
    for (const [id, deps] of graph.dependencies) {
        print(`${id} depends on: ${deps.join(", ")}`);
    }
}
```

## 性能优化

### 1. 选择正确的调度

```typescript
// ✅ 输入处理应该在 PreUpdate
app.addSystems(BuiltinSchedules.PRE_UPDATE, handleInput);

// ✅ 游戏逻辑在 Update
app.addSystems(BuiltinSchedules.UPDATE, gameLogic);

// ✅ 渲染准备在 PostUpdate
app.addSystems(BuiltinSchedules.POST_UPDATE, prepareRender);
```

### 2. 避免不必要的系统

```typescript
// ✅ 使用条件执行
app.addSystems(
    BuiltinSchedules.UPDATE,
    expensiveSystem.runIf(shouldRun)
);

// ❌ 在系统内部判断
function expensiveSystem(world: World, context: Context): void {
    if (!shouldRun()) return; // 浪费调度开销
    // ...
}
```

### 3. 批量操作

```typescript
// ✅ 在一个系统中处理所有实体
function updateAllEntities(world: World, context: Context): void {
    for (const [id, transform] of world.query(Transform)) {
        // 更新所有
    }
}

// ❌ 每个实体一个系统
function updateEntity1(): void { /* ... */ }
function updateEntity2(): void { /* ... */ }
// ...
```

## 完整示例

```typescript
import {
    App,
    Plugin,
    BuiltinSchedules,
    Schedule,
    World,
    Context,
    Resource
} from "@white-dragon-bevy/bevy-framework";

// 游戏状态
class GameState implements Resource {
    isPaused = false;
    isRunning = false;
}

// 游戏插件
class GameSchedulePlugin implements Plugin {
    build(app: App): void {
        // 添加资源
        app.insertResource(new GameState());

        // 配置调度
        this.setupSchedules(app);
        this.setupSystems(app);
    }

    private setupSchedules(app: App): void {
        // 创建自定义调度
        const pauseSchedule = new Schedule("Pause");
        app.addSchedule(pauseSchedule);

        // 配置系统集
        app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
            schedule.configureSet({
                name: "GameplayInput",
                before: ["GameplayLogic"],
            });

            schedule.configureSet({
                name: "GameplayLogic",
                after: ["GameplayInput"],
                before: ["GameplayRender"],
            });

            schedule.configureSet({
                name: "GameplayRender",
                after: ["GameplayLogic"],
            });
        });
    }

    private setupSystems(app: App): void {
        // 启动系统
        app.addSystems(BuiltinSchedules.STARTUP, this.initGame);

        // 条件系统
        app.addSystems(
            BuiltinSchedules.UPDATE,
            this.updateGame.runIf(this.isRunning),
            this.pauseMenu.runIf(this.isPaused)
        );

        // 清理系统
        app.addSystems(BuiltinSchedules.LAST, this.cleanup);
    }

    private initGame(): void {
        print("Game initialized");
    }

    private updateGame(world: World, context: Context): void {
        // 游戏逻辑
    }

    private pauseMenu(world: World, context: Context): void {
        // 暂停菜单
    }

    private cleanup(): void {
        // 帧结束清理
    }

    private isRunning(world: World, context: Context): boolean {
        const state = context.getResource(GameState);
        return state?.isRunning ?? false;
    }

    private isPaused(world: World, context: Context): boolean {
        const state = context.getResource(GameState);
        return state?.isPaused ?? false;
    }

    name(): string { return "GameSchedulePlugin"; }
    isUnique(): boolean { return true; }
}
```