# Bevy GilRs 手柄输入系统

## 模块概述和主要功能

`bevy_gilrs` 是 Bevy 引擎中专门处理手柄（游戏控制器）输入的模块，基于 [GilRs](https://github.com/Arvamer/gilrs) 库构建，为不同平台的手柄 API 提供统一的抽象层。

### 主要功能特性

1. **跨平台手柄支持**：通过 GilRs 库支持多种操作系统和手柄类型
2. **手柄连接管理**：自动检测手柄的连接和断开连接
3. **按键和轴输入处理**：处理手柄按键按下/释放和摇杆轴移动事件
4. **震动反馈支持**：提供手柄震动效果的播放和管理
5. **实体映射系统**：将物理手柄映射到 Bevy 的实体系统中

### 模块依赖

- **外部依赖**：`gilrs` (0.11.0) - 底层手柄处理库
- **内部依赖**：
  - `bevy_app` - 应用和插件系统
  - `bevy_ecs` - 实体组件系统
  - `bevy_input` - 输入处理基础
  - `bevy_time` - 时间管理
  - `bevy_platform` - 平台抽象层

## 核心结构体和枚举

### 1. 插件和资源类型

#### `GilrsPlugin`
```rust
#[derive(Default)]
pub struct GilrsPlugin;
```
主要的插件类型，负责初始化手柄系统并注册相关系统。

#### `Gilrs` (Resource)
```rust
pub(crate) struct Gilrs {
    #[cfg(not(target_arch = "wasm32"))]
    cell: SyncCell<gilrs::Gilrs>,
}
```
封装了 GilRs 实例的资源，提供线程安全的访问接口。

#### `GilrsGamepads` (Resource)
```rust
#[derive(Debug, Default, Resource)]
pub(crate) struct GilrsGamepads {
    /// 实体到手柄ID的映射
    pub(crate) entity_to_id: EntityHashMap<gilrs::GamepadId>,
    /// 手柄ID到实体的映射
    pub(crate) id_to_entity: HashMap<gilrs::GamepadId, Entity>,
}
```
维护手柄ID和 Bevy 实体之间的双向映射关系。

#### `RunningRumbleEffects` (Resource)
```rust
#[derive(Default, Resource)]
pub(crate) struct RunningRumbleEffects {
    rumbles: HashMap<GamepadId, Vec<RunningRumble>>,
}
```
管理当前正在运行的震动效果。

### 2. 事件类型

通过 `bevy_input` 模块提供的事件类型：

#### 手柄连接事件
- `GamepadConnectionEvent` - 手柄连接/断开连接事件
- `GamepadConnection::Connected` - 包含手柄名称、厂商ID、产品ID
- `GamepadConnection::Disconnected` - 手柄断开连接

#### 输入事件
- `RawGamepadButtonChangedEvent` - 原始按键变化事件
- `RawGamepadAxisChangedEvent` - 原始轴变化事件
- `GamepadRumbleRequest` - 震动请求事件

### 3. 手柄输入类型

#### `GamepadButton` 枚举
```rust
pub enum GamepadButton {
    South,          // 下方动作按键 (PS: ×, Xbox: A)
    East,           // 右方动作按键 (PS: ○, Xbox: B)
    North,          // 上方动作按键 (PS: △, Xbox: Y)
    West,           // 左方动作按键 (PS: □, Xbox: X)
    C,              // C 按键
    Z,              // Z 按键
    LeftTrigger,    // 左扳机键
    LeftTrigger2,   // 左扳机键2
    RightTrigger,   // 右扳机键
    RightTrigger2,  // 右扳机键2
    Select,         // 选择按键
    Start,          // 开始按键
    Mode,           // 模式按键
    LeftThumb,      // 左摇杆按键
    RightThumb,     // 右摇杆按键
    DPadUp,         // 方向键上
    DPadDown,       // 方向键下
    DPadLeft,       // 方向键左
    DPadRight,      // 方向键右
}
```

#### `GamepadAxis` 枚举
```rust
pub enum GamepadAxis {
    LeftStickX,     // 左摇杆X轴
    LeftStickY,     // 左摇杆Y轴
    LeftZ,          // 左Z轴（通常是油门轴）
    RightStickX,    // 右摇杆X轴
    RightStickY,    // 右摇杆Y轴
    RightZ,         // 右Z轴
    Other(u8),      // 其他非标准轴
}
```

## 主要API使用示例

### 1. 基础设置

```rust
use bevy::prelude::*;
use bevy_gilrs::GilrsPlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(GilrsPlugin)  // 添加手柄插件
        .add_systems(Update, (
            handle_gamepad_connections,
            handle_gamepad_input,
            handle_gamepad_rumble,
        ))
        .run();
}
```

### 2. 处理手柄连接事件

```rust
use bevy::prelude::*;
use bevy_input::gamepad::{GamepadConnectionEvent, GamepadConnection};

fn handle_gamepad_connections(
    mut events: MessageReader<GamepadConnectionEvent>,
) {
    for event in events.read() {
        match &event.connection {
            GamepadConnection::Connected { name, vendor_id, product_id } => {
                info!(
                    "手柄已连接: {} (厂商ID: {:?}, 产品ID: {:?})",
                    name, vendor_id, product_id
                );
            }
            GamepadConnection::Disconnected => {
                info!("手柄已断开连接: {:?}", event.gamepad);
            }
        }
    }
}
```

### 3. 处理手柄按键输入

```rust
use bevy::prelude::*;
use bevy_input::gamepad::{GamepadButtonChangedEvent, GamepadButton};

fn handle_gamepad_input(
    mut button_events: MessageReader<GamepadButtonChangedEvent>,
    mut axis_events: MessageReader<GamepadAxisChangedEvent>,
) {
    // 处理按键事件
    for event in button_events.read() {
        match event.button {
            GamepadButton::South => {
                if event.value > 0.5 {
                    info!("玩家按下了A键/×键");
                }
            }
            GamepadButton::Start => {
                if event.value > 0.5 {
                    info!("玩家按下了开始键");
                }
            }
            _ => {}
        }
    }

    // 处理轴事件
    for event in axis_events.read() {
        match event.axis {
            GamepadAxis::LeftStickX => {
                if event.value.abs() > 0.1 {
                    info!("左摇杆X轴: {}", event.value);
                }
            }
            GamepadAxis::LeftStickY => {
                if event.value.abs() > 0.1 {
                    info!("左摇杆Y轴: {}", event.value);
                }
            }
            _ => {}
        }
    }
}
```

### 4. 使用手柄震动反馈

```rust
use bevy::prelude::*;
use bevy_input::gamepad::{GamepadRumbleRequest, GamepadRumbleIntensity};
use std::time::Duration;

fn handle_gamepad_rumble(
    mut rumble_requests: MessageWriter<GamepadRumbleRequest>,
    gamepad_query: Query<Entity, With<Gamepad>>,
    input: Res<ButtonInput<GamepadButton>>,
) {
    for gamepad in gamepad_query.iter() {
        // 当按下South键时触发震动
        if input.just_pressed(GamepadButton::South) {
            rumble_requests.write(GamepadRumbleRequest::Add {
                gamepad,
                duration: Duration::from_millis(500),
                intensity: GamepadRumbleIntensity {
                    strong_motor: 1.0,  // 强震动马达强度 (0.0-1.0)
                    weak_motor: 0.5,    // 弱震动马达强度 (0.0-1.0)
                },
            });
        }

        // 停止震动
        if input.just_pressed(GamepadButton::East) {
            rumble_requests.write(GamepadRumbleRequest::Stop { gamepad });
        }
    }
}
```

### 5. 自定义手柄输入处理系统

```rust
use bevy::prelude::*;
use bevy_input::gamepad::{Gamepad, GamepadAxis, GamepadButton};

#[derive(Component)]
struct Player {
    speed: f32,
}

fn player_movement_system(
    mut player_query: Query<(&mut Transform, &Player)>,
    gamepad_query: Query<Entity, With<Gamepad>>,
    axes: Res<Axis<GamepadAxis>>,
    time: Res<Time>,
) {
    for gamepad in gamepad_query.iter() {
        // 获取左摇杆输入
        let left_stick_x = axes.get(GamepadAxis::LeftStickX).unwrap_or(0.0);
        let left_stick_y = axes.get(GamepadAxis::LeftStickY).unwrap_or(0.0);

        // 应用死区
        let deadzone = 0.1;
        let movement = if left_stick_x.abs() > deadzone || left_stick_y.abs() > deadzone {
            Vec2::new(left_stick_x, left_stick_y)
        } else {
            Vec2::ZERO
        };

        // 移动玩家
        for (mut transform, player) in player_query.iter_mut() {
            let velocity = movement * player.speed * time.delta_seconds();
            transform.translation.x += velocity.x;
            transform.translation.y += velocity.y;
        }
    }
}
```

## 与其他bevy模块的集成方式

### 1. 与 `bevy_input` 的集成

`bevy_gilrs` 作为 `bevy_input` 的底层实现，负责：
- 将 GilRs 事件转换为 Bevy 输入事件
- 维护手柄状态和映射
- 提供原始输入数据给上层输入系统

```rust
// bevy_input 提供的高级API
use bevy_input::gamepad::{Gamepad, GamepadButton, GamepadAxis};

fn high_level_input_system(
    gamepads: Res<Gamepads>,  // 连接的手柄列表
    button_inputs: Res<ButtonInput<GamepadButton>>,
    axis_inputs: Res<Axis<GamepadAxis>>,
) {
    for gamepad in gamepads.iter() {
        if button_inputs.just_pressed(GamepadButton::South) {
            // 处理按键按下
        }

        let stick_value = axis_inputs.get(GamepadAxis::LeftStickX).unwrap_or(0.0);
        // 处理摇杆输入
    }
}
```

### 2. 与 `bevy_ecs` 的集成

```rust
// 手柄作为实体存在于ECS中
#[derive(Component)]
struct GamepadMarker;

fn spawn_gamepad_entities(
    mut commands: Commands,
    mut connection_events: MessageReader<GamepadConnectionEvent>,
) {
    for event in connection_events.read() {
        if let GamepadConnection::Connected { name, .. } = &event.connection {
            commands.entity(event.gamepad)
                .insert(GamepadMarker)
                .insert(Name::new(name.clone()));
        }
    }
}
```

### 3. 与 `bevy_time` 的集成

震动系统使用时间资源来管理效果持续时间：

```rust
use bevy_time::{Time, Real};

fn rumble_management_system(
    time: Res<Time<Real>>,
    mut running_effects: ResMut<RunningRumbleEffects>,
) {
    let current_time = time.elapsed();
    // 清理过期的震动效果
    // ...
}
```

## 常见使用场景

### 1. 游戏角色控制

```rust
#[derive(Component)]
struct PlayerController {
    move_speed: f32,
    jump_force: f32,
}

fn player_controller_system(
    mut player_query: Query<(&mut Transform, &PlayerController)>,
    gamepad_query: Query<Entity, With<Gamepad>>,
    button_input: Res<ButtonInput<GamepadButton>>,
    axis_input: Res<Axis<GamepadAxis>>,
    time: Res<Time>,
) {
    for gamepad in gamepad_query.iter() {
        for (mut transform, controller) in player_query.iter_mut() {
            // 移动控制
            let move_x = axis_input.get(GamepadAxis::LeftStickX).unwrap_or(0.0);
            let move_y = axis_input.get(GamepadAxis::LeftStickY).unwrap_or(0.0);

            if move_x.abs() > 0.1 || move_y.abs() > 0.1 {
                let movement = Vec3::new(move_x, 0.0, move_y)
                    * controller.move_speed
                    * time.delta_seconds();
                transform.translation += movement;
            }

            // 跳跃控制
            if button_input.just_pressed(GamepadButton::South) {
                transform.translation.y += controller.jump_force;
            }
        }
    }
}
```

### 2. 菜单导航

```rust
#[derive(Component)]
struct MenuItem {
    index: usize,
}

#[derive(Resource)]
struct MenuState {
    selected_index: usize,
    item_count: usize,
}

fn menu_navigation_system(
    mut menu_state: ResMut<MenuState>,
    button_input: Res<ButtonInput<GamepadButton>>,
    axis_input: Res<Axis<GamepadAxis>>,
) {
    // 使用方向键或左摇杆导航
    let vertical_input = axis_input.get(GamepadAxis::LeftStickY).unwrap_or(0.0);

    if button_input.just_pressed(GamepadButton::DPadUp) || vertical_input > 0.8 {
        if menu_state.selected_index > 0 {
            menu_state.selected_index -= 1;
        }
    }

    if button_input.just_pressed(GamepadButton::DPadDown) || vertical_input < -0.8 {
        if menu_state.selected_index < menu_state.item_count - 1 {
            menu_state.selected_index += 1;
        }
    }

    // 确认选择
    if button_input.just_pressed(GamepadButton::South) {
        // 处理菜单项选择
    }
}
```

### 3. 车辆控制

```rust
#[derive(Component)]
struct Vehicle {
    acceleration: f32,
    max_speed: f32,
    turn_speed: f32,
    current_speed: f32,
}

fn vehicle_control_system(
    mut vehicle_query: Query<(&mut Transform, &mut Vehicle)>,
    gamepad_query: Query<Entity, With<Gamepad>>,
    axis_input: Res<Axis<GamepadAxis>>,
    button_input: Res<ButtonInput<GamepadButton>>,
    time: Res<Time>,
) {
    for gamepad in gamepad_query.iter() {
        for (mut transform, mut vehicle) in vehicle_query.iter_mut() {
            // 油门控制（右扳机）
            let throttle = axis_input.get(GamepadAxis::RightZ).unwrap_or(0.0);
            // 刹车控制（左扳机）
            let brake = axis_input.get(GamepadAxis::LeftZ).unwrap_or(0.0);
            // 转向控制（左摇杆X轴）
            let steering = axis_input.get(GamepadAxis::LeftStickX).unwrap_or(0.0);

            // 计算速度
            if throttle > 0.1 {
                vehicle.current_speed = (vehicle.current_speed +
                    vehicle.acceleration * throttle * time.delta_seconds())
                    .min(vehicle.max_speed);
            } else if brake > 0.1 {
                vehicle.current_speed = (vehicle.current_speed -
                    vehicle.acceleration * brake * time.delta_seconds())
                    .max(0.0);
            } else {
                // 自然减速
                vehicle.current_speed *= 0.95;
            }

            // 应用移动和转向
            if vehicle.current_speed > 0.1 {
                let forward = transform.forward();
                transform.translation += forward * vehicle.current_speed * time.delta_seconds();

                if steering.abs() > 0.1 {
                    let rotation = Quat::from_rotation_y(
                        steering * vehicle.turn_speed * time.delta_seconds()
                    );
                    transform.rotation *= rotation;
                }
            }
        }
    }
}
```

### 4. 多手柄支持

```rust
#[derive(Component)]
struct PlayerTag(usize);  // 玩家编号

fn multi_gamepad_system(
    mut player_query: Query<(&mut Transform, &PlayerTag)>,
    gamepad_query: Query<(Entity, &Gamepad)>,
    button_input: Res<ButtonInput<GamepadButton>>,
    axis_input: Res<Axis<GamepadAxis>>,
) {
    for (gamepad_entity, gamepad) in gamepad_query.iter() {
        // 假设手柄实体ID对应玩家编号
        let player_id = gamepad_entity.index() % 4;  // 支持最多4个玩家

        for (mut transform, player_tag) in player_query.iter_mut() {
            if player_tag.0 == player_id {
                // 为特定玩家处理输入
                let move_x = axis_input.get(GamepadAxis::LeftStickX).unwrap_or(0.0);
                let move_y = axis_input.get(GamepadAxis::LeftStickY).unwrap_or(0.0);

                if move_x.abs() > 0.1 || move_y.abs() > 0.1 {
                    transform.translation.x += move_x * 100.0 * time.delta_seconds();
                    transform.translation.z += move_y * 100.0 * time.delta_seconds();
                }
            }
        }
    }
}
```

### 5. 触觉反馈应用

```rust
fn haptic_feedback_system(
    mut rumble_requests: MessageWriter<GamepadRumbleRequest>,
    gamepad_query: Query<Entity, With<Gamepad>>,
    // 游戏事件
    mut collision_events: MessageReader<CollisionEvent>,
    mut damage_events: MessageReader<DamageEvent>,
) {
    for gamepad in gamepad_query.iter() {
        // 碰撞时的短暂震动
        for _collision in collision_events.read() {
            rumble_requests.write(GamepadRumbleRequest::Add {
                gamepad,
                duration: Duration::from_millis(100),
                intensity: GamepadRumbleIntensity {
                    strong_motor: 0.3,
                    weak_motor: 0.1,
                },
            });
        }

        // 受伤时的强烈震动
        for _damage in damage_events.read() {
            rumble_requests.write(GamepadRumbleRequest::Add {
                gamepad,
                duration: Duration::from_millis(300),
                intensity: GamepadRumbleIntensity {
                    strong_motor: 0.8,
                    weak_motor: 0.6,
                },
            });
        }
    }
}
```

## 系统调度和生命周期

### 系统运行顺序

1. **PreStartup**: `gilrs_event_startup_system` - 检测启动时已连接的手柄
2. **PreUpdate**: `gilrs_event_system` - 处理手柄输入事件（在 `InputSystems` 之前）
3. **PostUpdate**: `play_gilrs_rumble` - 处理震动效果（在 `RumbleSystems` 集合中）

### 平台特定处理

- **非WASM平台**: 使用 `SyncCell` 提供线程安全的 GilRs 访问
- **WASM平台**: 使用 `thread_local!` 存储，因为WASM是单线程的

## 最佳实践和注意事项

### 1. 性能优化
- 使用死区来避免摇杆漂移
- 适当降低事件处理频率
- 及时清理不需要的震动效果

### 2. 用户体验
- 提供手柄配置选项
- 支持多种手柄布局
- 实现平滑的输入插值

### 3. 错误处理
- 优雅处理手柄断开连接
- 处理不支持震动的设备
- 提供键盘鼠标备选方案

这个文档提供了 `bevy_gilrs` 模块的全面介绍，包括核心概念、API使用方法和实际应用场景。通过这些示例，开发者可以快速集成手柄支持到他们的 Bevy 游戏中。