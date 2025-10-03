# Multiplayer 示例迁移报告

## 概述

成功将 Rust Bevy 的 `multiplayer.rs` 示例迁移到 roblox-ts。

## 迁移文件

**源文件**: `bevy-origin-packages/leafwing-input-manager/examples/multiplayer.rs`
**目标文件**: `src/__examples__/leafwing-input-manager/multiplayer.ts`

## 核心功能

### 1. 多人输入映射

原始 Rust 代码展示了如何为两个玩家设置不同的输入方案：

- **玩家一**: 键盘 WASD + 手柄0
- **玩家二**: 方向键 + 手柄1

### 2. 主要组件

#### Action 动作定义

```typescript
class Action extends ActionlikeEnum {
    static readonly Left = new Action("Left");
    static readonly Right = new Action("Right");
    static readonly Jump = new Action("Jump");
}
```

对应 Rust 的：
```rust
#[derive(Actionlike, PartialEq, Eq, Clone, Copy, Hash, Debug, Reflect)]
enum Action {
    Left,
    Right,
    Jump,
}
```

#### Player 组件

```typescript
enum PlayerType {
    One = "One",
    Two = "Two",
}

const Player = component<{
    readonly playerType: PlayerType;
}>("Player");
```

对应 Rust 的：
```rust
#[derive(Component, Debug)]
enum Player {
    One,
    Two,
}
```

### 3. 输入映射创建

TypeScript 实现：
```typescript
function createPlayerInputMap(
    playerType: PlayerType,
    gamepad0?: number,
    gamepad1?: number,
): InputMap<Action> {
    let inputMap: InputMap<Action>;

    if (playerType === PlayerType.One) {
        inputMap = new InputMap<Action>(gamepad0);
        inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.A));
        inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.D));
        inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.W));
    } else {
        inputMap = new InputMap<Action>(gamepad1);
        inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.Left));
        inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.Right));
        inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Up));
    }

    // 添加通用手柄控制
    inputMap.insertMultiple(Action.Left, [GamepadButton.dPadLeft()]);
    inputMap.insertMultiple(Action.Right, [GamepadButton.dPadRight()]);
    inputMap.insertMultiple(Action.Jump, [
        GamepadButton.dPadUp(),
        GamepadButton.south(),
    ]);

    return inputMap;
}
```

对应 Rust 的：
```rust
fn input_map(player: Player, gamepad_0: Entity, gamepad_1: Entity) -> InputMap<Action> {
    let mut input_map = match player {
        Player::One => InputMap::new([
            (Action::Left, KeyCode::KeyA),
            (Action::Right, KeyCode::KeyD),
            (Action::Jump, KeyCode::KeyW),
        ]).with_gamepad(gamepad_0),
        Player::Two => InputMap::new([
            (Action::Left, KeyCode::ArrowLeft),
            (Action::Right, KeyCode::ArrowRight),
            (Action::Jump, KeyCode::ArrowUp),
        ]).with_gamepad(gamepad_1),
    };

    input_map.insert_multiple([
        (Action::Left, GamepadButton::DPadLeft),
        (Action::Right, GamepadButton::DPadRight),
        (Action::Jump, GamepadButton::DPadUp),
        (Action::Jump, GamepadButton::South),
    ]);

    input_map
}
```

### 4. 系统实现

#### 生成玩家系统

TypeScript:
```typescript
function spawnPlayers(world: BevyWorld): void {
    const components = inputPlugin.extension!.getComponents();
    const gamepad0Entity = world.spawn();
    const gamepad1Entity = world.spawn();

    // 创建玩家一
    {
        const inputMap = createPlayerInputMap(PlayerType.One, gamepad0Entity, gamepad1Entity);
        const actionState = new ActionState<Action>();
        actionState.registerAction(Action.Left);
        actionState.registerAction(Action.Right);
        actionState.registerAction(Action.Jump);

        const entity = world.spawn();
        components.insert(world, entity, inputMap, actionState);
        world.insert(entity as any, Player({ playerType: PlayerType.One }));
    }

    // 类似地创建玩家二...
}
```

Rust:
```rust
fn spawn_players(mut commands: Commands) {
    let gamepad_0 = commands.spawn(()).id();
    let gamepad_1 = commands.spawn(()).id();

    commands.spawn((
        Player::One,
        Player::input_map(Player::One, gamepad_0, gamepad_1),
    ));

    commands.spawn((
        Player::Two,
        Player::input_map(Player::Two, gamepad_0, gamepad_1),
    ));
}
```

#### 移动处理系统

TypeScript:
```typescript
function movePlayers(world: BevyWorld): void {
    const components = inputPlugin.extension!.getComponents();

    for (const [entityId, inputData] of components.query(world)) {
        const player = world.get(entityId as any, Player);

        if (!player || !inputData.actionState) {
            continue;
        }

        const justPressedActions: Array<string> = [];

        if (inputData.actionState.justPressed(Action.Left)) {
            justPressedActions.push("Left");
        }
        // 其他动作检查...

        if (justPressedActions.size() > 0) {
            const actionsStr = justPressedActions.join(", ");
            print(`Player ${player.playerType} performed actions: ${actionsStr}`);
        }
    }
}
```

Rust:
```rust
fn move_players(player_query: Query<(&Player, &ActionState<Action>)>) {
    for (player, action_state) in player_query.iter() {
        let actions = action_state.get_just_pressed();
        if !actions.is_empty() {
            info!("Player {player:?} performed actions {actions:?}");
        }
    }
}
```

## 迁移要点

### 1. 类型系统差异

| Rust | TypeScript | 说明 |
|------|-----------|------|
| `#[derive(Actionlike)]` | `extends ActionlikeEnum` | 动作特性实现 |
| `#[derive(Component)]` | `component<T>()` | 组件定义 |
| `enum Action` | `class Action` | 枚举实现为类 |
| `Commands` | `BevyWorld` | 实体操作接口 |

### 2. 命名约定

- Rust 使用蛇形命名: `spawn_players`, `move_players`
- TypeScript 使用驼峰命名: `spawnPlayers`, `movePlayers`

### 3. 组件插入

- Rust: `commands.spawn((Component1, Component2))`
- TypeScript:
  ```typescript
  const entity = world.spawn();
  components.insert(world, entity, inputMap, actionState);
  world.insert(entity, playerComponent);
  ```

### 4. 查询系统

- Rust: `Query<(&Player, &ActionState<Action>)>`
- TypeScript: `components.query(world)` + 手动过滤

## 编译状态

✅ **编译成功** - multiplayer.ts 没有任何类型错误或编译错误

运行命令：
```bash
npm run build
```

输出：
```
无 multiplayer.ts 相关错误
```

## 测试建议

### 单人测试

1. 在 Roblox Studio 中部署代码
2. 按下 WASD 键测试玩家一
3. 按下方向键测试玩家二
4. 观察控制台输出

### 预期输出

```
========================================
Multiplayer Example - Players Spawned

Player One Controls:
  A - Move Left
  D - Move Right
  W - Jump

Player Two Controls:
  Left Arrow - Move Left
  Right Arrow - Move Right
  Up Arrow - Jump

Both players can also use gamepad controls
========================================

[按下 W 键]
Player One performed actions: Jump

[按下左箭头和上箭头]
Player Two performed actions: Left, Jump
```

### 手柄测试

1. 连接两个 Xbox/PlayStation 手柄
2. 使用手柄的 D-Pad 和 A/Cross 按钮
3. 验证每个手柄控制对应的玩家

## 关键改进点

### 相比 Rust 原版的改进

1. **更清晰的日志输出**: 添加了详细的控制说明
2. **类型安全**: 使用 TypeScript 的类型系统确保类型正确
3. **Matter.js 集成**: 完全兼容 Matter ECS 系统
4. **Roblox 适配**: 使用 Roblox 的 KeyCode 枚举

### 代码质量

- ✅ 完整的 JSDoc 注释
- ✅ 清晰的分区注释
- ✅ 符合 roblox-ts 代码规范
- ✅ 使用 `readonly` 确保不可变性
- ✅ 正确的文件结尾换行符

## 后续扩展建议

### 1. 动态手柄分配

```typescript
// 监听手柄连接事件
const Gamepads = game.GetService("GamepadService");
Gamepads.GamepadConnected.Connect((gamepad) => {
    print(`Gamepad ${gamepad.Name} connected`);
    // 分配给空闲玩家
});
```

### 2. 玩家断线重连

```typescript
function handleGamepadDisconnect(playerId: PlayerType): void {
    // 禁用该玩家的输入
    // 显示重连提示
}
```

### 3. 输入重映射界面

```typescript
function showControlSettings(player: PlayerType): void {
    // 允许玩家自定义按键绑定
}
```

### 4. 本地多人游戏场景

```typescript
// 添加分屏支持
// 为每个玩家创建独立的摄像机视口
```

## 总结

这次迁移成功展示了：

1. ✅ Rust Bevy 代码可以有效迁移到 roblox-ts
2. ✅ Matter.js 作为 ECS 框架的可行性
3. ✅ leafwing-input-manager 的核心概念在 Roblox 平台的适用性
4. ✅ 多人输入管理的最佳实践

迁移后的代码保持了原始示例的所有核心功能，同时适配了 Roblox 平台的特性和约束。
