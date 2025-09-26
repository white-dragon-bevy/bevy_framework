# bevy_state 模块

`bevy_state` 模块为 Roblox TypeScript 平台提供了完整的有限状态机（FSM）系统实现。该模块对应 Rust Bevy 框架的 bevy_state crate，提供状态管理、状态转换、计算状态、子状态以及基于状态的系统运行条件等功能。

## 概述

状态管理是游戏开发中的核心概念之一。本模块提供了一套强大而灵活的状态系统，支持：

- **标准状态（States）** - 基础的有限状态机实现
- **计算状态（Computed States）** - 从其他状态派生的状态
- **子状态（Sub States）** - 依赖于父状态的层级状态
- **状态转换（Transitions）** - 状态变更和转换事件
- **运行条件（Run Conditions）** - 基于状态的系统执行条件

## 公共 API

### 1. 核心状态系统

#### `States` 接口
定义状态的核心接口，所有状态类型都必须实现此接口。

```typescript
interface States {
    getStateId(): string | number;
    equals(other: States): boolean;
    clone(): States;
}
```

#### `EnumStates`
用于创建简单枚举状态的基础类。

```typescript
import { EnumStates } from "bevy_state";

// 创建单个状态
const menuState = new EnumStates("menu");
const gameState = new EnumStates("game");

// 比较状态
if (menuState.equals(gameState)) {
    print("States are equal");
}
```

#### `createStates` 辅助函数
快速创建枚举状态映射的便捷函数。

```typescript
import { createStates } from "bevy_state";

// 定义游戏状态枚举
const GameState = createStates({
    MENU: "menu",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "game_over"
});

// 使用状态
const currentState = GameState.MENU;
```

### 2. 状态资源

#### `State<S>` 资源
存储当前活动状态的资源。

```typescript
import { State, States } from "bevy_state";

// 在 App 中使用
app.insertResource(State, State.new(GameState.MENU));

// 在系统中查询当前状态
function gameSystem(world: World, resourceManager: ResourceManager) {
    const stateResource = resourceManager.getResource<State<typeof GameState.MENU>>();
    if (stateResource && stateResource.is(GameState.PLAYING)) {
        // 游戏进行中的逻辑
    }
}
```

#### `NextState<S>` 资源
用于请求状态转换的资源。

```typescript
import { NextState } from "bevy_state";

// 请求状态转换
function pauseGame(resourceManager: ResourceManager) {
    const nextState = resourceManager.getResource<NextState>();
    if (nextState) {
        nextState.set(GameState.PAUSED);
    }
}

// 创建待处理状态
const pendingState = NextState.pending(GameState.GAME_OVER);
```

### 3. 状态转换

#### 转换调度标签
在特定状态转换时运行系统。

```typescript
import { OnEnter, OnExit, OnTransition } from "bevy_state";

// 进入状态时运行
app.addSystems(OnEnter(GameState.PLAYING), initializeGame);

// 退出状态时运行
app.addSystems(OnExit(GameState.PLAYING), cleanupGame);

// 特定转换时运行
app.addSystems(
    OnTransition(GameState.MENU, GameState.PLAYING),
    startGameTransition
);
```

#### `StateTransitionEvent`
状态转换事件，包含退出和进入的状态信息。

```typescript
import { StateTransitionEvent } from "bevy_state";

function handleTransition(event: StateTransitionEvent<typeof GameState.MENU>) {
    if (event.isExitingFrom(GameState.MENU)) {
        print("Leaving menu");
    }
    if (event.isEnteringTo(GameState.PLAYING)) {
        print("Starting game");
    }
}
```

### 4. 计算状态

#### `ComputedStates` 接口
从其他状态派生的状态，不能直接修改。

```typescript
import { ComputedStates, BaseComputedStates } from "bevy_state";

// 定义计算状态
class GameMode extends BaseComputedStates<typeof GameState.MENU> {
    private mode: string;

    getStateId(): string {
        return this.mode;
    }

    clone(): States {
        const cloned = new GameMode();
        cloned.mode = this.mode;
        return cloned;
    }

    compute(source: typeof GameState.MENU | undefined): ComputedStates<typeof GameState.MENU> | undefined {
        if (source === undefined) return undefined;

        const computed = new GameMode();
        if (source.equals(GameState.PLAYING)) {
            computed.mode = "action";
        } else if (source.equals(GameState.MENU)) {
            computed.mode = "ui";
        }
        return computed;
    }
}
```

#### `createComputedState` 辅助函数
创建简单计算状态的便捷方法。

```typescript
import { createComputedState } from "bevy_state";

// 创建映射计算状态
const UiMode = createComputedState((gameState) => {
    if (gameState?.equals(GameState.MENU)) {
        return new EnumStates("menu_ui");
    } else if (gameState?.equals(GameState.PLAYING)) {
        return new EnumStates("game_ui");
    }
    return undefined;
});
```

### 5. 子状态

#### `SubStates` 接口
依赖于父状态存在的层级状态。

```typescript
import { SubStates, BaseSubStates, SubStateConfig } from "bevy_state";

// 定义战斗子状态（仅在 PLAYING 状态下存在）
class BattleState extends BaseSubStates<typeof GameState.MENU> {
    private phase: string;

    constructor() {
        const config: SubStateConfig<typeof GameState.MENU> = {
            parentType: GameState.MENU.constructor as any,
            allowedParentStates: new Set(["playing"])
        };
        super(config);
    }

    getStateId(): string {
        return this.phase;
    }

    clone(): States {
        const cloned = new BattleState();
        cloned.phase = this.phase;
        return cloned;
    }
}
```

#### `createEnumSubState` 辅助函数
创建简单枚举子状态的便捷方法。

```typescript
import { createEnumSubState } from "bevy_state";

// 创建菜单子状态（仅在 MENU 状态下存在）
const MenuSubState = createEnumSubState(
    {
        parentType: GameState.MENU.constructor as any,
        allowedParentStates: new Set(["menu"])
    },
    {
        MAIN: "main_menu",
        SETTINGS: "settings_menu",
        CREDITS: "credits_menu"
    }
);
```

### 6. 运行条件

#### 基础条件函数
检查状态并决定系统是否运行。

```typescript
import { inState, stateExists, stateChanged } from "bevy_state";

// 仅在特定状态下运行系统
app.addSystemWithCondition(
    BuiltinSchedules.UPDATE,
    updateGame,
    inState(GameState.constructor as any, GameState.PLAYING)
);

// 检查状态是否存在
const hasState = stateExists(GameState.constructor as any);

// 检查状态是否改变
const changed = stateChanged(GameState.constructor as any);
```

#### 状态转换条件
检测状态转换的条件函数。

```typescript
import { enteringState, exitingState } from "bevy_state";

// 进入状态时运行
app.addSystemWithCondition(
    BuiltinSchedules.UPDATE,
    onEnterMenu,
    enteringState(GameState.constructor as any, GameState.MENU)
);

// 退出状态时运行
app.addSystemWithCondition(
    BuiltinSchedules.UPDATE,
    onExitGame,
    exitingState(GameState.constructor as any, GameState.PLAYING)
);
```

#### 组合条件
组合多个条件创建复杂逻辑。

```typescript
import { andCondition, orCondition, notCondition } from "bevy_state";

// AND 逻辑
const inPlayingAndNotPaused = andCondition(
    inState(GameState.constructor as any, GameState.PLAYING),
    notCondition(inState(PauseState.constructor as any, PauseState.PAUSED))
);

// OR 逻辑
const inMenuOrPaused = orCondition(
    inState(GameState.constructor as any, GameState.MENU),
    inState(GameState.constructor as any, GameState.PAUSED)
);

// NOT 逻辑
const notInMenu = notCondition(
    inState(GameState.constructor as any, GameState.MENU)
);
```

### 7. 插件系统

#### `StatesPlugin`
提供状态管理功能的主插件。

```typescript
import { StatesPlugin } from "bevy_state";

const statePlugin = new StatesPlugin({
    stateType: GameState.MENU.constructor as any,
    defaultState: () => GameState.MENU,
    initOnStartup: true
});

app.addPlugin(statePlugin);
```

#### `ComputedStatesPlugin`
管理计算状态的插件。

```typescript
import { ComputedStatesPlugin } from "bevy_state";

const computedPlugin = new ComputedStatesPlugin(
    GameState.MENU.constructor as any,
    GameMode
);

app.addPlugin(computedPlugin);
```

#### `SubStatesPlugin`
管理子状态的插件。

```typescript
import { SubStatesPlugin } from "bevy_state";

const subStatePlugin = new SubStatesPlugin(
    GameState.MENU.constructor as any,
    BattleState as any,
    () => new BattleState()
);

app.addPlugin(subStatePlugin);
```

## 使用示例

### 完整的游戏状态管理示例

```typescript
import { App, BuiltinSchedules } from "bevy_app";
import {
    createStates,
    StatesPlugin,
    State,
    NextState,
    OnEnter,
    OnExit,
    inState
} from "bevy_state";

// 定义游戏状态
const GameState = createStates({
    MENU: "menu",
    LOADING: "loading",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "game_over"
});

// 创建应用
const app = App.create();

// 添加状态插件
app.addPlugin(new StatesPlugin({
    stateType: GameState.MENU.constructor as any,
    defaultState: () => GameState.MENU
}));

// 菜单系统
function menuSystem(world: World, resourceManager: ResourceManager) {
    // 检测开始游戏按钮
    if (/* start button pressed */) {
        const nextState = resourceManager.getResource<NextState>();
        nextState?.set(GameState.LOADING);
    }
}

// 加载系统
function loadingSystem(world: World, resourceManager: ResourceManager) {
    // 加载资源...
    if (/* loading complete */) {
        const nextState = resourceManager.getResource<NextState>();
        nextState?.set(GameState.PLAYING);
    }
}

// 游戏系统
function gameSystem(world: World, resourceManager: ResourceManager) {
    // 游戏逻辑...
    if (/* pause pressed */) {
        const nextState = resourceManager.getResource<NextState>();
        nextState?.set(GameState.PAUSED);
    }
}

// 注册状态相关系统
app.addSystems(OnEnter(GameState.MENU), initMenu);
app.addSystems(OnExit(GameState.MENU), cleanupMenu);

app.addSystemWithCondition(
    BuiltinSchedules.UPDATE,
    menuSystem,
    inState(GameState.constructor as any, GameState.MENU)
);

app.addSystemWithCondition(
    BuiltinSchedules.UPDATE,
    loadingSystem,
    inState(GameState.constructor as any, GameState.LOADING)
);

app.addSystemWithCondition(
    BuiltinSchedules.UPDATE,
    gameSystem,
    inState(GameState.constructor as any, GameState.PLAYING)
);

// 运行应用
app.run();
```

### 计算状态示例

```typescript
import { createComputedState, ComputedStatesPlugin } from "bevy_state";

// 基于游戏状态计算 UI 模式
const UiMode = createComputedState((gameState) => {
    if (!gameState) return undefined;

    if (gameState.equals(GameState.MENU) || gameState.equals(GameState.PAUSED)) {
        return new EnumStates("ui_visible");
    } else if (gameState.equals(GameState.PLAYING)) {
        return new EnumStates("ui_minimal");
    } else {
        return new EnumStates("ui_hidden");
    }
});

// 添加计算状态插件
app.addPlugin(new ComputedStatesPlugin(
    GameState.MENU.constructor as any,
    UiMode
));
```

### 子状态示例

```typescript
import { createEnumSubState, SubStatesPlugin } from "bevy_state";

// 创建战斗阶段子状态（仅在 PLAYING 状态下存在）
const BattlePhase = createEnumSubState(
    {
        parentType: GameState.MENU.constructor as any,
        allowedParentStates: new Set(["playing"])
    },
    {
        PLANNING: "planning",
        EXECUTING: "executing",
        RESULT: "result"
    }
);

// 添加子状态插件
app.addPlugin(new SubStatesPlugin(
    GameState.MENU.constructor as any,
    BattlePhase.type,
    () => BattlePhase.states.PLANNING
));

// 使用子状态
function battleSystem(world: World, resourceManager: ResourceManager) {
    const battleState = resourceManager.getResource<State<typeof BattlePhase.states.PLANNING>>();
    if (battleState?.is(BattlePhase.states.EXECUTING)) {
        // 执行战斗动作
    }
}
```

## 设计原则

### 1. 状态独立性
每个状态应该是独立的，不依赖于其他状态的内部实现。状态转换应该通过明确的接口进行。

### 2. 层级管理
- **标准状态**：最基础的状态，不依赖其他状态
- **计算状态**：从标准状态派生，只读，自动更新
- **子状态**：依赖父状态存在，父状态改变时自动管理生命周期

### 3. 事件驱动
状态转换通过事件系统通知，允许系统响应状态变化而不需要轮询。

### 4. 类型安全
所有状态操作都是类型安全的，在编译时捕获错误。

## 注意事项

1. **状态转换时机**：状态转换在 `StateTransition` 调度中处理，通常在 `PreUpdate` 之前运行。

2. **资源管理**：`State` 和 `NextState` 资源应该通过插件初始化，避免手动管理。

3. **性能考虑**：
   - 避免在每帧创建新状态对象，使用预定义的状态实例
   - 计算状态应该保持轻量，避免复杂计算
   - 使用运行条件减少不必要的系统执行

4. **调试提示**：
   - 使用 `StateTransitionEvent` 监听所有状态转换
   - 在开发环境中记录状态转换日志
   - 确保所有状态都有明确的进入和退出处理

5. **最佳实践**：
   - 为每个主要游戏阶段定义清晰的状态
   - 使用子状态管理复杂的游戏内状态
   - 利用计算状态派生 UI 和渲染状态
   - 通过插件组织状态相关的系统和资源

## 版本信息

- **当前版本**：1.0.0
- **对应 Rust Bevy 版本**：0.14
- **最后更新**：2025-01-24
- **兼容性**：roblox-ts 3.x, @rbxts/matter 0.7.x

## 相关模块

- [`bevy_app`](../bevy_app/README.md) - 应用程序和插件系统
- [`bevy_ecs`](../bevy_ecs/README.md) - ECS 核心系统
- [`bevy_time`](../bevy_time/README.md) - 时间管理系统