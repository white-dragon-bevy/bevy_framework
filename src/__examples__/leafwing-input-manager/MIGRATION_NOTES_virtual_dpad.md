# Virtual D-Pad Example - 迁移说明

## 源文件
- **原始文件**: `bevy-origin-packages/leafwing-input-manager/examples/virtual_dpad.rs`
- **目标文件**: `src/__examples__/leafwing-input-manager/virtual_dpad.ts`

## 迁移概述

这是一个演示如何使用虚拟方向键（VirtualDPad）的简单示例。VirtualDPad 允许组合多个按键创建一个虚拟双轴输入。

## 主要迁移内容

### 1. 动作定义（Action Enum）

**Rust 原代码:**
```rust
#[derive(Actionlike, PartialEq, Eq, Clone, Copy, Hash, Debug, Reflect)]
#[actionlike(DualAxis)]
enum Action {
    Move,
}
```

**TypeScript 迁移:**
```typescript
enum Action {
    Move,
}

class ActionlikeImpl implements Actionlike {
    constructor(public readonly action: Action) {}

    hash(): string {
        return `Action:${this.action}`;
    }

    equals(other: Actionlike): boolean {
        return this.hash() === other.hash();
    }

    toString(): string {
        return Action[this.action];
    }
}
```

### 2. 虚拟方向键创建

**Rust 原代码:**
```rust
let input_map = InputMap::default().with_dual_axis(
    Action::Move,
    VirtualDPad::new(
        KeyCode::KeyW,
        KeyCode::KeyS,
        GamepadButton::DPadLeft,
        GamepadButton::DPadRight,
    ),
);
```

**TypeScript 迁移:**
```typescript
const inputMap = new InputMap<ActionlikeImpl>().insert(
    new ActionlikeImpl(Action.Move),
    new VirtualDPad(
        KeyCode.from(Enum.KeyCode.W),      // 上
        KeyCode.from(Enum.KeyCode.S),      // 下
        GamepadButton.dPadLeft(),          // 左
        GamepadButton.dPadRight(),         // 右
    ),
);
```

### 3. 实体生成

**Rust 原代码:**
```rust
commands.spawn(input_map).insert(Player);
```

**TypeScript 迁移:**
```typescript
const entity = inputPlugin.extension!.spawnWithInput(world, inputMap, actionState);
world.insert(entity as any, Player({ tag: "Player" }));
```

### 4. 动作状态查询

**Rust 原代码:**
```rust
fn move_player(action_state: Single<&ActionState<Action>, With<Player>>) {
    if action_state.axis_pair(&Action::Move) != Vec2::ZERO {
        let axis_pair = action_state.axis_pair(&Action::Move);
        println!("Move:");
        println!("   distance: {}", axis_pair.length());
        println!("          x: {}", axis_pair.x);
        println!("          y: {}", axis_pair.y);
    }
}
```

**TypeScript 迁移:**
```typescript
function movePlayer(world: BevyWorld, _context: Context): void {
    for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
        const player = world.get(entityId as any, Player);
        if (!player) continue;

        const actionState = inputData.actionState;
        if (!actionState || !inputData.enabled) continue;

        const moveAction = new ActionlikeImpl(Action.Move);
        const axisPair = actionState.axisPair(moveAction);

        if (axisPair.x !== 0 || axisPair.y !== 0) {
            const movementVector = new Vector2(axisPair.x, axisPair.y);
            const distance = movementVector.Magnitude;

            print("Move:");
            print(`   distance: ${string.format("%.1f", distance)}`);
            print(`          x: ${string.format("%.1f", axisPair.x)}`);
            print(`          y: ${string.format("%.1f", axisPair.y)}`);
        }
    }
}
```

## 关键技术点

### 1. VirtualDPad 参数顺序
VirtualDPad 构造函数接受四个按钮参数：
- 第1个参数：上（Up）
- 第2个参数：下（Down）
- 第3个参数：左（Left）
- 第4个参数：右（Right）

### 2. 离散值输出
Virtual D-Pad 返回的轴向值是离散的：
- `-1.0`：按下负方向键
- `0.0`：未按下任何键
- `1.0`：按下正方向键

### 3. 混合输入
本示例展示了如何混合不同类型的输入设备：
- 键盘（W/S）用于 Y 轴
- 手柄方向键（左/右）用于 X 轴

## 编译状态

✅ **编译成功** - 没有类型错误或语法错误

```bash
npm run build
# No virtual_dpad errors found
```

## 测试文件

创建了基础测试文件：
- `src/__examples__/leafwing-input-manager/__tests__/virtual_dpad.spec.ts`

## 使用方法

### 运行示例

```typescript
// 在服务端或客户端运行
const app = createApp();
app.run();
```

### 控制方式

- **W 键** - 向上移动（Y = 1.0）
- **S 键** - 向下移动（Y = -1.0）
- **手柄方向键左** - 向左移动（X = -1.0）
- **手柄方向键右** - 向右移动（X = 1.0）

## 与 Rust 版本的差异

### 1. 系统参数
Rust 使用 `Single` 查询单个实体，TypeScript 需要遍历所有实体并过滤。

### 2. 组件定义
Rust 使用 `#[derive(Component)]`，TypeScript 使用 `@rbxts/matter` 的 `component()` 函数。

### 3. 插件集成
TypeScript 版本需要通过插件扩展（`inputPlugin.extension`）来访问组件工厂和查询方法。

### 4. 打印格式
TypeScript 使用 `string.format()` 和 `print()` 替代 Rust 的 `println!` 宏。

## 相关文件

- 主示例文件：`src/__examples__/leafwing-input-manager/virtual_dpad.ts`
- 测试文件：`src/__examples__/leafwing-input-manager/__tests__/virtual_dpad.spec.ts`
- VirtualDPad 实现：`src/leafwing-input-manager/user-input/virtual-controls.ts`
- 相关示例：
  - `minimal.ts` - 基础输入示例
  - `axis_inputs.ts` - 轴输入示例

## 迁移完成度

- [x] 核心功能迁移
- [x] 类型定义迁移
- [x] 系统逻辑迁移
- [x] 编译验证
- [x] 基础测试创建
- [x] 文档注释
- [ ] 完整单元测试（可选）

## 下一步建议

1. 添加更多输入组合的测试用例
2. 测试多玩家场景下的虚拟方向键
3. 添加死区处理示例
4. 创建更复杂的虚拟输入组合示例

## 备注

此示例成功展示了如何使用 VirtualDPad 创建自定义的输入映射，允许开发者灵活地组合不同的输入源创建统一的输入体验。
