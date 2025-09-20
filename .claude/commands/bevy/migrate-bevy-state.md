# 迁移 bevy_state 模块到 roblox-ts

## 任务描述

将 Bevy 引擎的 `bevy_state` 模块迁移到 roblox-ts 生态，实现状态机系统和游戏状态管理。

## 输入目录
- `bevy-origin/crates/bevy_state/` - Bevy 原始状态管理代码

## 输出目录
- `crates/bevy_state/` - 迁移后的 roblox-ts 状态系统

## 任务要求

### 1. 核心功能迁移
- 实现 `State<T>` 状态资源管理
- 实现状态转换系统 `StateTransition`
- 支持状态进入/退出事件
- 实现嵌套状态和子状态
- 提供状态历史记录和回滚功能

### 2. 架构设计
```typescript
// 状态枚举类型
type GameState = "Menu" | "Playing" | "Paused" | "GameOver";

// 状态资源
class State<T extends string> {
    readonly current: T;
    readonly previous?: T;
    readonly isTransitioning: boolean;

    transition(nextState: T): void;
    isIn(state: T): boolean;
    justEntered(state: T): boolean;
    justExited(state: T): boolean;
}

// 状态转换管理器
class StateManager<T extends string> {
    readonly states: Map<T, StateDefinition<T>>;

    addState(state: T, definition: StateDefinition<T>): void;
    setState(state: T): void;
    update(world: World): void;
}

// 状态定义
interface StateDefinition<T extends string> {
    onEnter?: (world: World) => void;
    onExit?: (world: World) => void;
    onUpdate?: (world: World) => void;
    transitions?: Map<T, TransitionCondition>;
}
```

### 3. 状态事件系统
- 实现状态进入事件 `StateEnterEvent<T>`
- 实现状态退出事件 `StateExitEvent<T>`
- 支持状态转换的条件检查
- 提供状态变化的监听机制

### 4. 编码规范
严格遵循 `.claude/agents/roblox-ts-pro.md` 中的编码规范：
- 使用字符串联合类型定义状态
- 所有导出函数必须有 JSDoc 注释
- 使用显式返回类型
- 文件末尾必须以换行符结束
- 接口属性按字母顺序排列

### 5. 单元测试
使用 `@rbxts/testez` 编写完整的单元测试：
- 测试状态转换的正确性
- 测试状态事件的触发
- 测试嵌套状态的管理
- 测试状态历史记录
- 测试条件转换
- 测试错误处理和边界情况

### 6. 特殊考虑
- 支持异步状态转换
- 与网络同步的状态管理
- 状态序列化和反序列化
- 开发模式下的状态调试
- 与其他系统的状态协调

## 文件结构
```
crates/bevy_state/
├── src/
│   ├── index.ts                 # 主要导出
│   ├── state.ts                 # State 资源
│   ├── state-manager.ts         # 状态管理器
│   ├── transitions.ts           # 状态转换逻辑
│   ├── events.ts                # 状态事件系统
│   ├── nested-state.ts          # 嵌套状态支持
│   └── serialization.ts         # 状态序列化
├── tests/
│   ├── state.spec.ts            # State 测试
│   ├── manager.spec.ts          # 管理器测试
│   ├── transitions.spec.ts      # 转换测试
│   ├── events.spec.ts           # 事件测试
│   ├── nested.spec.ts           # 嵌套状态测试
│   └── integration.spec.ts      # 集成测试
├── package.json
└── tsconfig.json
```

### 7. 高级特性
- 状态机可视化调试
- 状态转换的性能分析
- 并发状态管理
- 状态快照和回放

## 预期产出
1. 类型安全的状态管理系统
2. 灵活的状态转换机制
3. 完整的状态事件系统
4. 支持嵌套和并发状态
5. 全面的单元测试覆盖
6. 详细的 JSDoc 文档

## 验证标准
- 所有测试通过
- ESLint 检查无错误
- TypeScript 编译无错误
- 符合 roblox-ts-pro 编码规范
- 状态转换无死锁
- 事件系统性能良好

## 使用示例
```typescript
// 定义游戏状态
type GameState = "MainMenu" | "Playing" | "Paused" | "GameOver";

// 创建状态管理器
const stateManager = new StateManager<GameState>();

// 添加状态定义
stateManager.addState("MainMenu", {
    onEnter: (world) => {
        // 显示主菜单 UI
        showMainMenu();
    },
    onExit: (world) => {
        // 隐藏主菜单 UI
        hideMainMenu();
    }
});

stateManager.addState("Playing", {
    onEnter: (world) => {
        // 开始游戏逻辑
        startGameplay();
    },
    onUpdate: (world) => {
        // 游戏循环逻辑
        updateGameplay(world);
    }
});

// 在系统中使用状态
function gameStateSystem(world: World) {
    const gameState = world.getResource(State<GameState>);

    if (gameState.justEntered("Playing")) {
        print("Game started!");
    }

    if (gameState.isIn("Playing")) {
        // 处理游戏逻辑
    }
}

// 状态转换
function handleInput(world: World, input: InputEvent) {
    const gameState = world.getResource(State<GameState>);

    if (gameState.isIn("MainMenu") && input.key === "Space") {
        gameState.transition("Playing");
    }
}
```

## 与其他模块集成
- 与 `bevy_app` 的插件系统集成
- 与 `bevy_ecs` 的事件系统集成
- 与 UI 系统的状态同步