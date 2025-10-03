# leafwing-input-manager 示例集合

这个目录包含了从 Rust Bevy 的 leafwing-input-manager 迁移过来的完整示例代码。

## 运行示例

你可以通过以下方式运行示例：

```bash
# 编译项目
npm run build

# 在 Roblox Studio 中运行对应的 .luau 文件
# 文件位置: out/__examples__/leafwing-input-manager/
```

推荐从 `minimal.ts` 示例开始，以获得对该插件的基本了解！

## 示例列表

### 1. minimal.ts ⭐ (推荐起点)
最小化示例，演示基本的输入绑定和检测。

**功能**: 基础的跳跃动作绑定
**难度**: ⭐ 入门级

### 2. action_state_resource.ts
演示如何将 ActionState 作为全局资源使用（适用于暂停菜单等全局输入）。

**功能**: 全局动作状态管理
**难度**: ⭐⭐ 初级

### 3. arpg_indirection.ts
ARPG 风格的输入间接层系统，演示槽位到技能的映射。

**功能**:
- 两层动作系统（槽位 + 技能）
- 动态技能绑定
- 状态复制机制

**难度**: ⭐⭐⭐⭐ 高级

### 4. axis_inputs.ts
演示轴输入（双轴、单轴、按钮）的使用。

**功能**:
- 双轴输入（左摇杆控制移动）
- 单轴输入（右摇杆X轴控制方向舵）
- 按钮压力感应（右扳机控制油门）

**难度**: ⭐⭐ 初级

### 5. clash_handling.ts
演示输入冲突处理策略。

**功能**:
- 单键动作
- 组合键动作（两键、三键）
- 冲突策略（PrioritizeLongest）

**难度**: ⭐⭐⭐ 中级

### 6. default_controls.ts
演示默认输入映射的创建和使用。

**功能**:
- 手柄默认控制
- 键鼠默认控制
- 统一的输入映射

**难度**: ⭐⭐ 初级

### 7. input_processing.ts
演示输入处理管道的配置。

**功能**:
- 输入处理管道
- 死区设置
- 轴反转

**难度**: ⭐⭐⭐ 中级

### 8. mouse_motion.ts
演示鼠标移动输入的处理。

**功能**:
- 鼠标移动检测
- 相机平移控制

**难度**: ⭐⭐ 初级

### 9. mouse_wheel.ts
演示鼠标滚轮输入的处理。

**功能**:
- 垂直滚轮缩放
- 水平滚轮平移
- 滚轮方向检测

**难度**: ⭐⭐⭐ 中级

### 10. multiplayer.ts
演示本地多人输入管理。

**功能**:
- 玩家一（WASD + 手柄0）
- 玩家二（方向键 + 手柄1）
- 独立输入映射

**难度**: ⭐⭐⭐ 中级

### 11. press_duration.ts
演示按键持续时间检测和蓄力系统。

**功能**:
- 按键持续时间检测
- 蓄力冲刺系统
- 物理模拟（速度、阻力、碰撞）

**难度**: ⭐⭐⭐⭐ 高级

### 12. register_gamepads.ts
演示游戏手柄动态注册和玩家加入系统。

**功能**:
- 检测手柄连接
- 玩家加入/退出
- 动态实体创建

**难度**: ⭐⭐⭐⭐ 高级

### 13. send_actions_over_network.ts
演示 ActionDiff 消息的网络同步。

**功能特性:**
- ActionDiff 消息的生成和处理
- 客户端到服务器的动作同步
- 模拟网络消息传输
- 按键状态的网络同步

**核心概念:**
1. **ActionDiff**: 动作状态的最小化表示，适用于网络传输
2. **消息流**: 使用 Bevy ECS 的消息系统进行状态同步
3. **客户端-服务器架构**: 演示如何在分布式环境中使用输入管理器

**难度**: ⭐⭐⭐⭐⭐ 专家级

### 14. single_player.ts
完整的单人游戏输入系统示例。

**功能**:
- 完整的 ARPG 动作系统
- 移动、技能、终极技能
- 消息系统集成

**难度**: ⭐⭐⭐ 中级

### 15. twin_stick_controller.ts
演示双摇杆控制器的实现。

**功能**:
- 左摇杆控制移动
- 右摇杆控制瞄准
- 输入模式切换（手柄/键鼠）

**难度**: ⭐⭐⭐⭐ 高级

### 16. virtual_dpad.ts
演示虚拟方向键（组合多个按键创建双轴输入）。

**功能**:
- VirtualDPad 创建
- 混合输入源（键盘 + 手柄）
- 离散值输出

**难度**: ⭐⭐ 初级

## 快速开始

### 1. 最简单的示例（minimal.ts）

```typescript
import { App } from "bevy_app";
import { InputManagerPlugin } from "leafwing-input-manager";
import { ActionlikeEnum } from "leafwing-input-manager";

// 定义动作
class Action extends ActionlikeEnum {
    static readonly Jump = new Action("Jump", InputControlKind.Button);
}

// 创建应用
const app = new App();

// 添加输入管理插件
const inputPlugin = InputManagerPlugin.create<Action>({
    actionTypeName: "Action",
});
app.addPlugin(inputPlugin);

// 添加系统检测跳跃
app.addSystems(MainScheduleLabel.UPDATE, (world: BevyWorld) => {
    for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
        if (inputData.actionState?.justPressed(Action.Jump)) {
            print("I'm jumping!");
        }
    }
});

app.run();
```

### 2. 使用虚拟方向键（virtual_dpad.ts）

```typescript
import { VirtualDPad } from "leafwing-input-manager";

const inputMap = new InputMap<Action>();

// 使用 WASD 创建虚拟方向键
inputMap.insert(Action.Move, VirtualDPad.wasd());

// 或自定义按键组合
inputMap.insert(Action.Move, new VirtualDPad(
    KeyCode.from(Enum.KeyCode.W),     // 上
    KeyCode.from(Enum.KeyCode.S),     // 下
    GamepadButton.dPadLeft(),         // 左
    GamepadButton.dPadRight()         // 右
));
```

### 3. 读取输入（axis_inputs.ts）

```typescript
// 读取双轴输入
const moveVector = actionState.axisPair(Action.Move);
print(`移动: X=${moveVector.x}, Y=${moveVector.y}`);

// 读取单轴输入
const throttle = actionState.value(Action.Throttle);
print(`油门: ${throttle}`);

// 检测按键状态
if (actionState.pressed(Action.Jump)) {
    print("跳跃键正在按下");
}

if (actionState.justPressed(Action.Fire)) {
    print("刚按下射击键");
}

if (actionState.justReleased(Action.Fire)) {
    print("刚释放射击键");
}
```

### 4. 多人输入（multiplayer.ts）

```typescript
// 玩家一：键盘 + 手柄0
const player1Map = new InputMap<Action>();
player1Map.insert(Action.Left, KeyCode.from(Enum.KeyCode.A));
player1Map.insert(Action.Right, KeyCode.from(Enum.KeyCode.D));
player1Map.insert(Action.Jump, KeyCode.from(Enum.KeyCode.W));

// 玩家二：方向键 + 手柄1
const player2Map = new InputMap<Action>();
player2Map.insert(Action.Left, KeyCode.from(Enum.KeyCode.Left));
player2Map.insert(Action.Right, KeyCode.from(Enum.KeyCode.Right));
player2Map.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Up));
```

## 迁移说明

### Rust 到 roblox-ts 的主要变化

| Rust 概念 | TypeScript 实现 | 说明 |
|-----------|----------------|------|
| `#[derive(Actionlike)]` | `extends ActionlikeEnum` | 动作特性 |
| `enum Action` | `class Action` | 枚举转类 |
| `#[derive(Component)]` | `component<T>()` | Matter 组件 |
| `Commands::spawn()` | `world.spawn()` | 实体创建 |
| `Query<...>` | `components.query(world)` | 组件查询 |
| `InputMap::new(...)` | `new InputMap()` | 输入映射 |
| `ActionState` | `ActionState<Action>` | 动作状态 |
| `MessageReader<E>` | `MessageReader<E>` (从 resources 获取) | 消息读取 |
| `Res<Time>` | `os.clock()` | 时间管理 |

### 关键适配点

1. **组件定义**
   ```rust
   // Rust
   #[derive(Component)]
   struct Player;
   ```
   ```typescript
   // TypeScript
   const Player = component<{}>()("Player");
   ```

2. **实体生成**
   ```rust
   // Rust
   commands.spawn(input_map).insert(Player);
   ```
   ```typescript
   // TypeScript
   const entity = world.spawn();
   components.insert(world, entity, inputMap, actionState);
   world.insert(entity as any, Player({ tag: "Player" }));
   ```

3. **动作查询**
   ```rust
   // Rust - Single query
   action_state: Single<&ActionState<Action>, With<Player>>
   ```
   ```typescript
   // TypeScript - Iterator pattern
   for (const [entityId, inputData] of components.query(world)) {
       const player = world.get(entityId as any, Player);
       if (player && inputData.actionState) {
           // Process actions
       }
   }
   ```

## 注意事项

1. **环境检测**: 大部分示例会自动检测服务端/客户端环境
2. **编译验证**: 所有示例都已通过 `npm run build` 编译验证
3. **依赖项**:
   - `bevy_app` - 应用框架
   - `bevy_ecs` - ECS 系统和消息
   - `@rbxts/matter` - Matter ECS 框架
   - `leafwing-input-manager` - 输入管理插件
4. **网络通信**: 在实际 Roblox 应用中，你需要使用 RemoteEvent 或 RemoteFunction 进行网络通信
5. **ActionDiff 序列化**: ActionDiff 可以被序列化为 JSON 或其他格式进行网络传输

## 获取帮助

如果你在使用这些示例时遇到问题，可以：

1. 查看示例代码中的详细注释
2. 参考 leafwing-input-manager 的文档
3. 查看 Bevy 原版示例对比（在 `bevy-origin-packages/leafwing-input-manager/examples/`）
4. 查看各个示例文件的迁移说明文档（MIGRATION_NOTES_*.md）

## 贡献

欢迎提交新的示例或改进现有示例！所有迁移的示例都应该：
- 保持与 Rust 原版的功能对等
- 包含详细的中文注释
- 通过编译验证
- 提供使用说明
