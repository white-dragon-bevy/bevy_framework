# Bevy Input 输入系统操作文档

## 模块概述

`bevy_input` 是 Bevy 游戏引擎的输入处理核心模块，提供了全面的输入设备支持和事件处理功能。该模块负责处理键盘、鼠标、游戏手柄和触摸屏等各种输入设备的输入数据。

### 主要功能

- **统一的输入抽象**: 提供统一的按钮和轴输入抽象，支持不同输入设备
- **事件驱动系统**: 基于 Bevy 的消息系统处理输入事件
- **状态管理**: 跟踪按钮的按下、释放和刚按下/刚释放状态
- **多设备支持**: 同时支持键盘、鼠标、游戏手柄和触摸设备
- **热插拔支持**: 动态处理设备连接和断开事件

### 支持的输入设备

1. **键盘输入** - 物理按键和逻辑按键支持
2. **鼠标输入** - 按钮、移动和滚轮事件
3. **游戏手柄输入** - 按钮、摇杆和触发器
4. **触摸输入** - 多点触控和手势支持

## 核心结构体和枚举

### 1. ButtonInput<T> - 通用按钮输入

`ButtonInput` 是处理所有可按压输入的核心结构，提供了便捷的状态查询功能。

```rust
// 核心状态查询方法
pub struct ButtonInput<T> {
    pressed: HashSet<T>,        // 当前按下的按钮
    just_pressed: HashSet<T>,   // 本帧刚按下的按钮
    just_released: HashSet<T>,  // 本帧刚释放的按钮
}
```

**主要方法:**
- `pressed(input)` - 检查按钮是否被按下
- `just_pressed(input)` - 检查按钮是否在本帧刚被按下
- `just_released(input)` - 检查按钮是否在本帧刚被释放
- `any_pressed(inputs)` - 检查是否有任意按钮被按下
- `all_pressed(inputs)` - 检查是否所有按钮都被按下

### 2. Axis<T> - 轴输入处理

`Axis` 用于处理连续的数值输入，如游戏手柄摇杆或触发器。

```rust
pub struct Axis<T> {
    axis_data: HashMap<T, f32>,
}

impl<T> Axis<T> {
    pub const MIN: f32 = -1.0;  // 最小值
    pub const MAX: f32 = 1.0;   // 最大值

    pub fn get(&self, input_device: T) -> Option<f32>           // 获取限制范围内的值
    pub fn get_unclamped(&self, input_device: T) -> Option<f32> // 获取未限制的原始值
    pub fn set(&mut self, input_device: T, value: f32)          // 设置轴值
}
```

### 3. ButtonState - 按钮状态枚举

```rust
pub enum ButtonState {
    Pressed,   // 按下状态
    Released,  // 释放状态
}

impl ButtonState {
    pub fn is_pressed(&self) -> bool  // 检查是否为按下状态
}
```

## 键盘输入 (Keyboard Input)

### KeyCode - 物理按键代码

`KeyCode` 表示键盘上按键的物理位置，不受键盘布局影响。

```rust
pub enum KeyCode {
    // 字母键
    KeyA, KeyB, KeyC, /* ... */ KeyZ,

    // 数字键
    Digit0, Digit1, /* ... */ Digit9,

    // 功能键
    F1, F2, /* ... */ F35,

    // 修饰键
    ControlLeft, ControlRight,
    ShiftLeft, ShiftRight,
    AltLeft, AltRight,
    SuperLeft, SuperRight,

    // 导航键
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    Home, End, PageUp, PageDown,

    // 特殊键
    Space, Enter, Escape, Tab, Backspace, Delete,

    // 小键盘
    Numpad0, /* ... */ Numpad9,
    NumpadAdd, NumpadSubtract, NumpadMultiply, NumpadDivide,

    // 未识别键
    Unidentified(NativeKeyCode),
}
```

### Key - 逻辑按键

`Key` 表示按键产生的逻辑字符，会根据键盘布局变化。

```rust
pub enum Key {
    // 字符键
    Character(SmolStr),  // 产生的字符

    // 修饰键
    Alt, AltGraph, CapsLock, Control, Fn, FnLock,
    NumLock, ScrollLock, Shift, Symbol, Meta, Hyper, Super,

    // 导航键
    ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
    End, Home, PageDown, PageUp,

    // 编辑键
    Backspace, Clear, Copy, Cut, Delete, Insert, Paste, Redo, Undo,

    // 系统键
    Enter, Tab, Space, Escape,

    // 未识别键
    Unidentified(NativeKey),
    Dead(Option<char>),  // 死键
}
```

### 键盘事件

```rust
pub struct KeyboardInput {
    pub key_code: KeyCode,      // 物理按键代码
    pub logical_key: Key,       // 逻辑按键
    pub state: ButtonState,     // 按键状态
    pub text: Option<SmolStr>,  // 产生的文本
    pub repeat: bool,           // 是否为重复按键
    pub window: Entity,         // 接收输入的窗口
}

pub struct KeyboardFocusLost;  // 窗口失去焦点事件
```

## 鼠标输入 (Mouse Input)

### MouseButton - 鼠标按钮

```rust
pub enum MouseButton {
    Left,           // 左键
    Right,          // 右键
    Middle,         // 中键
    Back,           // 后退键
    Forward,        // 前进键
    Other(u16),     // 其他按钮
}
```

### 鼠标事件

```rust
// 鼠标按钮事件
pub struct MouseButtonInput {
    pub button: MouseButton,    // 按钮类型
    pub state: ButtonState,     // 按钮状态
    pub window: Entity,         // 接收输入的窗口
}

// 鼠标移动事件
pub struct MouseMotion {
    pub delta: Vec2,  // 相对移动量
}

// 鼠标滚轮事件
pub struct MouseWheel {
    pub unit: MouseScrollUnit,  // 滚动单位
    pub x: f32,                 // 水平滚动值
    pub y: f32,                 // 垂直滚动值
    pub window: Entity,         // 接收输入的窗口
}

pub enum MouseScrollUnit {
    Line,   // 行滚动
    Pixel,  // 像素滚动
}
```

### 鼠标状态资源

```rust
// 累积的鼠标移动量（每帧重置）
pub struct AccumulatedMouseMotion {
    pub delta: Vec2,
}

// 累积的鼠标滚轮量（每帧重置）
pub struct AccumulatedMouseScroll {
    pub delta: Vec2,
}
```

## 游戏手柄输入 (Gamepad Input)

### 游戏手柄组件和事件

```rust
// 游戏手柄连接事件
pub struct GamepadConnectionEvent {
    pub gamepad: Entity,
    pub connection: GamepadConnection,
}

pub enum GamepadConnection {
    Connected { name: String },
    Disconnected,
}

// 游戏手柄按钮事件
pub struct GamepadButtonChangedEvent {
    pub gamepad: Entity,
    pub button: GamepadButton,
    pub value: f32,
}

// 游戏手柄轴事件
pub struct GamepadAxisChangedEvent {
    pub gamepad: Entity,
    pub axis: GamepadAxis,
    pub value: f32,
}
```

### GamepadButton - 游戏手柄按钮

```rust
pub enum GamepadButton {
    // 面部按钮
    South,      // A/X 按钮
    East,       // B/○ 按钮
    North,      // Y/△ 按钮
    West,       // X/□ 按钮

    // 肩键
    LeftTrigger, RightTrigger,
    LeftTrigger2, RightTrigger2,

    // 方向键
    DPadUp, DPadDown, DPadLeft, DPadRight,

    // 摇杆按钮
    LeftThumb, RightThumb,

    // 系统按钮
    Select, Start, Mode,

    // 其他
    Other(u8),
}
```

### GamepadAxis - 游戏手柄轴

```rust
pub enum GamepadAxis {
    // 左摇杆
    LeftStickX, LeftStickY,

    // 右摇杆
    RightStickX, RightStickY,

    // 触发器
    LeftZ, RightZ,

    // 其他
    Other(u8),
}
```

## 触摸输入 (Touch Input)

### 触摸事件

```rust
pub struct TouchInput {
    pub phase: TouchPhase,      // 触摸阶段
    pub position: Vec2,         // 触摸位置
    pub window: Entity,         // 接收输入的窗口
    pub force: Option<ForceTouch>, // 压力信息
    pub id: u64,               // 触摸点ID
}

pub enum TouchPhase {
    Started,    // 开始触摸
    Moved,      // 移动
    Ended,      // 结束触摸
    Canceled,   // 取消触摸
}

pub enum ForceTouch {
    Calibrated {
        force: f64,                 // 压力值
        max_possible_force: f64,    // 最大压力
        altitude_angle: Option<f64>, // 高度角
        azimuth_angle: Option<f64>,  // 方位角
    },
    Normalized(f64),  // 标准化压力值
}
```

### 触摸状态资源

```rust
pub struct Touches {
    // 存储所有活跃的触摸点信息
    // 提供根据ID查询触摸点的方法
}
```

## 主要API使用示例

### 1. 键盘输入检测

```rust
use bevy::prelude::*;
use bevy_input::prelude::*;

fn keyboard_input_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    key_input: Res<ButtonInput<Key>>,
) {
    // 检查物理按键
    if keyboard_input.pressed(KeyCode::KeyW) {
        println!("W键被按住");
    }

    if keyboard_input.just_pressed(KeyCode::Space) {
        println!("空格键刚被按下");
    }

    if keyboard_input.just_released(KeyCode::Escape) {
        println!("ESC键刚被释放");
    }

    // 检查逻辑按键（字符）
    if key_input.pressed(Key::Character("w".into())) {
        println!("字符 'w' 被按下");
    }

    // 组合键检测
    if keyboard_input.any_pressed([KeyCode::ControlLeft, KeyCode::ControlRight])
        && keyboard_input.just_pressed(KeyCode::KeyS) {
        println!("Ctrl+S 组合键被按下");
    }
}
```

### 2. 鼠标输入处理

```rust
fn mouse_input_system(
    mouse_input: Res<ButtonInput<MouseButton>>,
    mouse_motion: Res<AccumulatedMouseMotion>,
    mouse_scroll: Res<AccumulatedMouseScroll>,
) {
    // 鼠标按钮检测
    if mouse_input.just_pressed(MouseButton::Left) {
        println!("左键刚被按下");
    }

    if mouse_input.pressed(MouseButton::Right) {
        println!("右键被按住");
    }

    // 鼠标移动检测
    if mouse_motion.delta != Vec2::ZERO {
        println!("鼠标移动: {:?}", mouse_motion.delta);
    }

    // 鼠标滚轮检测
    if mouse_scroll.delta.y != 0.0 {
        println!("鼠标滚轮滚动: {}", mouse_scroll.delta.y);
    }
}
```

### 3. 游戏手柄输入

```rust
fn gamepad_input_system(
    gamepads: Query<&Gamepad>,
    button_inputs: Res<ButtonInput<GamepadButton>>,
    axes: Res<Axis<GamepadAxis>>,
) {
    for gamepad in gamepads.iter() {
        let gamepad_entity = gamepad.id;

        // 按钮检测
        if button_inputs.just_pressed(GamepadButton::South) {
            println!("游戏手柄 A/X 按钮被按下");
        }

        // 摇杆检测
        let left_stick_x = axes.get(GamepadAxis::LeftStickX).unwrap_or(0.0);
        let left_stick_y = axes.get(GamepadAxis::LeftStickY).unwrap_or(0.0);

        if left_stick_x.abs() > 0.1 || left_stick_y.abs() > 0.1 {
            println!("左摇杆位置: ({}, {})", left_stick_x, left_stick_y);
        }

        // 触发器检测
        let left_trigger = axes.get(GamepadAxis::LeftZ).unwrap_or(0.0);
        if left_trigger > 0.1 {
            println!("左触发器压下: {}", left_trigger);
        }
    }
}
```

### 4. 触摸输入处理

```rust
fn touch_input_system(
    touches: Res<Touches>,
    mut touch_events: EventReader<TouchInput>,
) {
    // 处理触摸事件
    for event in touch_events.read() {
        match event.phase {
            TouchPhase::Started => {
                println!("开始触摸，位置: {:?}, ID: {}", event.position, event.id);
            }
            TouchPhase::Moved => {
                println!("触摸移动，位置: {:?}, ID: {}", event.position, event.id);
            }
            TouchPhase::Ended => {
                println!("结束触摸，位置: {:?}, ID: {}", event.position, event.id);
            }
            TouchPhase::Canceled => {
                println!("取消触摸，ID: {}", event.id);
            }
        }

        // 压力检测
        if let Some(force) = &event.force {
            match force {
                ForceTouch::Calibrated { force, max_possible_force, .. } => {
                    println!("触摸压力: {}/{}", force, max_possible_force);
                }
                ForceTouch::Normalized(force) => {
                    println!("标准化压力: {}", force);
                }
            }
        }
    }

    // 查询当前活跃的触摸点
    for touch in touches.iter() {
        println!("活跃触摸点 ID: {}, 位置: {:?}", touch.id, touch.position);
    }
}
```

## 与其他bevy模块的集成方式

### 1. 与 bevy_ecs 集成

- **Resource 系统**: 输入状态作为全局资源存储
- **Component 系统**: 游戏手柄作为实体组件
- **System 系统**: 输入处理通过系统函数实现
- **Event 系统**: 输入事件通过消息系统传递

```rust
fn setup_input_systems(app: &mut App) {
    app
        // 添加输入资源
        .init_resource::<ButtonInput<KeyCode>>()
        .init_resource::<ButtonInput<MouseButton>>()
        .init_resource::<AccumulatedMouseMotion>()

        // 添加输入处理系统
        .add_systems(PreUpdate, (
            keyboard_input_system,
            mouse_button_input_system,
            accumulate_mouse_motion_system,
        ).in_set(InputSystems));
}
```

### 2. 与 bevy_app 集成

通过 `InputPlugin` 自动配置所有输入系统：

```rust
fn main() {
    App::new()
        .add_plugins(DefaultPlugins) // 包含 InputPlugin
        .add_systems(Update, game_input_system)
        .run();
}
```

### 3. 与 bevy_window 集成

- 输入事件与特定窗口关联
- 窗口焦点变化影响输入状态
- 支持多窗口输入处理

```rust
fn window_specific_input(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    windows: Query<&Window>,
    mut keyboard_events: EventReader<KeyboardInput>,
) {
    for event in keyboard_events.read() {
        if let Ok(window) = windows.get(event.window) {
            println!("窗口 {} 收到按键事件", window.title);
        }
    }
}
```

### 4. 与游戏逻辑集成

```rust
// 玩家控制系统
fn player_movement_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mut player_query: Query<&mut Transform, With<Player>>,
    time: Res<Time>,
) {
    for mut transform in player_query.iter_mut() {
        let mut direction = Vec3::ZERO;

        if keyboard_input.pressed(KeyCode::KeyW) {
            direction.z -= 1.0;
        }
        if keyboard_input.pressed(KeyCode::KeyS) {
            direction.z += 1.0;
        }
        if keyboard_input.pressed(KeyCode::KeyA) {
            direction.x -= 1.0;
        }
        if keyboard_input.pressed(KeyCode::KeyD) {
            direction.x += 1.0;
        }

        if direction != Vec3::ZERO {
            transform.translation += direction.normalize() * 5.0 * time.delta_secs();
        }
    }
}

// 跳跃系统
fn player_jump_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mut player_query: Query<&mut Velocity, With<Player>>,
) {
    if keyboard_input.just_pressed(KeyCode::Space) {
        for mut velocity in player_query.iter_mut() {
            velocity.linvel.y = 10.0; // 跳跃
        }
    }
}
```

## 常见使用场景

### 1. 基础玩家控制

```rust
#[derive(Component)]
struct Player;

fn player_control_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mouse_input: Res<ButtonInput<MouseButton>>,
    mouse_motion: Res<AccumulatedMouseMotion>,
    mut player_query: Query<&mut Transform, With<Player>>,
    time: Res<Time>,
) {
    for mut transform in player_query.iter_mut() {
        // WASD 移动
        let mut movement = Vec3::ZERO;
        if keyboard_input.pressed(KeyCode::KeyW) { movement.z -= 1.0; }
        if keyboard_input.pressed(KeyCode::KeyS) { movement.z += 1.0; }
        if keyboard_input.pressed(KeyCode::KeyA) { movement.x -= 1.0; }
        if keyboard_input.pressed(KeyCode::KeyD) { movement.x += 1.0; }

        // 跑步（Shift 加速）
        let speed = if keyboard_input.pressed(KeyCode::ShiftLeft) { 10.0 } else { 5.0 };
        transform.translation += movement.normalize_or_zero() * speed * time.delta_secs();

        // 鼠标视角控制
        if mouse_input.pressed(MouseButton::Right) {
            let sensitivity = 0.002;
            let delta = mouse_motion.delta * sensitivity;

            // 水平旋转
            transform.rotate_y(-delta.x);
            // 垂直旋转需要更复杂的逻辑以避免翻转
        }
    }
}
```

### 2. UI 交互处理

```rust
fn ui_interaction_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mouse_input: Res<ButtonInput<MouseButton>>,
    mut ui_state: ResMut<UIState>,
) {
    // ESC 键切换菜单
    if keyboard_input.just_pressed(KeyCode::Escape) {
        ui_state.menu_open = !ui_state.menu_open;
    }

    // Tab 键切换选项卡
    if keyboard_input.just_pressed(KeyCode::Tab) {
        ui_state.next_tab();
    }

    // Enter 键确认选择
    if keyboard_input.just_pressed(KeyCode::Enter) {
        ui_state.confirm_selection();
    }

    // 右键打开上下文菜单
    if mouse_input.just_pressed(MouseButton::Right) {
        ui_state.show_context_menu = true;
    }
}
```

### 3. 游戏手柄配置

```rust
fn gamepad_configuration_system(
    mut gamepad_events: EventReader<GamepadConnectionEvent>,
    button_inputs: Res<ButtonInput<GamepadButton>>,
    axes: Res<Axis<GamepadAxis>>,
    mut game_state: ResMut<GameState>,
) {
    // 处理手柄连接/断开
    for event in gamepad_events.read() {
        match event.connection {
            GamepadConnection::Connected { name } => {
                println!("游戏手柄已连接: {}", name);
                game_state.connected_gamepads.insert(event.gamepad);
            }
            GamepadConnection::Disconnected => {
                println!("游戏手柄已断开");
                game_state.connected_gamepads.remove(&event.gamepad);
            }
        }
    }

    // 游戏手柄输入处理
    for &gamepad in &game_state.connected_gamepads {
        // 使用左摇杆移动
        let left_x = axes.get(GamepadAxis::LeftStickX).unwrap_or(0.0);
        let left_y = axes.get(GamepadAxis::LeftStickY).unwrap_or(0.0);

        if left_x.abs() > 0.1 || left_y.abs() > 0.1 {
            // 处理移动逻辑
        }

        // 按钮映射
        if button_inputs.just_pressed(GamepadButton::South) {
            // A/X 按钮 - 跳跃
        }

        if button_inputs.just_pressed(GamepadButton::West) {
            // X/□ 按钮 - 攻击
        }
    }
}
```

### 4. 多点触控手势识别

```rust
fn gesture_recognition_system(
    touches: Res<Touches>,
    mut touch_events: EventReader<TouchInput>,
    mut gesture_state: ResMut<GestureState>,
) {
    for event in touch_events.read() {
        match event.phase {
            TouchPhase::Started => {
                gesture_state.add_touch(event.id, event.position);
            }
            TouchPhase::Moved => {
                gesture_state.update_touch(event.id, event.position);
            }
            TouchPhase::Ended | TouchPhase::Canceled => {
                gesture_state.remove_touch(event.id);
            }
        }
    }

    // 检测手势
    if let Some(gesture) = gesture_state.detect_gesture() {
        match gesture {
            Gesture::Tap { position } => {
                println!("单击手势，位置: {:?}", position);
            }
            Gesture::Pinch { center, scale } => {
                println!("缩放手势，中心: {:?}, 缩放: {}", center, scale);
            }
            Gesture::Swipe { start, end, direction } => {
                println!("滑动手势，从 {:?} 到 {:?}", start, end);
            }
        }
    }
}
```

### 5. 输入重映射系统

```rust
#[derive(Resource)]
struct InputBindings {
    move_forward: Vec<InputAction>,
    move_backward: Vec<InputAction>,
    jump: Vec<InputAction>,
    attack: Vec<InputAction>,
}

enum InputAction {
    Keyboard(KeyCode),
    Mouse(MouseButton),
    Gamepad(GamepadButton),
}

fn remappable_input_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mouse_input: Res<ButtonInput<MouseButton>>,
    gamepad_input: Res<ButtonInput<GamepadButton>>,
    bindings: Res<InputBindings>,
    mut player_query: Query<&mut PlayerController>,
) {
    for mut controller in player_query.iter_mut() {
        // 检查移动前进
        if is_action_pressed(&bindings.move_forward, &keyboard_input, &mouse_input, &gamepad_input) {
            controller.move_forward = true;
        }

        // 检查跳跃
        if is_action_just_pressed(&bindings.jump, &keyboard_input, &mouse_input, &gamepad_input) {
            controller.should_jump = true;
        }
    }
}

fn is_action_pressed(
    actions: &[InputAction],
    keyboard: &ButtonInput<KeyCode>,
    mouse: &ButtonInput<MouseButton>,
    gamepad: &ButtonInput<GamepadButton>,
) -> bool {
    actions.iter().any(|action| match action {
        InputAction::Keyboard(key) => keyboard.pressed(*key),
        InputAction::Mouse(button) => mouse.pressed(*button),
        InputAction::Gamepad(button) => gamepad.pressed(*button),
    })
}
```

### 6. 输入缓冲和组合键

```rust
#[derive(Resource)]
struct InputBuffer {
    buffer: VecDeque<(InputAction, f32)>, // (动作, 时间戳)
    combo_window: f32, // 组合键时间窗口
}

fn combo_input_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mut input_buffer: ResMut<InputBuffer>,
    time: Res<Time>,
    mut player_query: Query<&mut PlayerController>,
) {
    let current_time = time.elapsed_secs();

    // 添加新输入到缓冲区
    if keyboard_input.just_pressed(KeyCode::KeyA) {
        input_buffer.buffer.push_back((InputAction::A, current_time));
    }
    if keyboard_input.just_pressed(KeyCode::KeyS) {
        input_buffer.buffer.push_back((InputAction::S, current_time));
    }
    if keyboard_input.just_pressed(KeyCode::KeyD) {
        input_buffer.buffer.push_back((InputAction::D, current_time));
    }

    // 清理过期的输入
    input_buffer.buffer.retain(|(_, time)| current_time - time < input_buffer.combo_window);

    // 检测组合键
    for mut controller in player_query.iter_mut() {
        if let Some(combo) = detect_combo(&input_buffer.buffer) {
            match combo {
                Combo::QuickAttack => controller.trigger_quick_attack(),
                Combo::SpecialMove => controller.trigger_special_move(),
            }
            input_buffer.buffer.clear(); // 清空缓冲区
        }
    }
}
```

## 最佳实践

### 1. 性能优化

- **避免不必要的查询**: 只在需要时检查输入状态
- **使用事件而非轮询**: 对于一次性事件优先使用事件系统
- **合理使用 `just_pressed/just_released`**: 避免重复触发

```rust
// 好的做法
fn optimized_input_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    // 只在输入状态改变时运行
) {
    if keyboard_input.just_pressed(KeyCode::Space) {
        // 只执行一次的逻辑
    }
}

// 避免的做法
fn inefficient_input_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
) {
    if keyboard_input.pressed(KeyCode::Space) {
        // 每帧都会执行，可能导致重复操作
        spawn_bullet(); // 错误：会每帧生成子弹
    }
}
```

### 2. 输入处理顺序

使用 `InputSystems` 标签确保输入在正确的阶段处理：

```rust
app.add_systems(PreUpdate, my_input_system.in_set(InputSystems));
app.add_systems(Update, game_logic_system.after(InputSystems));
```

### 3. 窗口焦点处理

正确处理窗口失去焦点的情况：

```rust
fn focus_aware_input_system(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    windows: Query<&Window>,
) {
    // 检查主窗口是否有焦点
    if let Ok(window) = windows.get_single() {
        if !window.focused {
            return; // 窗口失去焦点时忽略输入
        }
    }

    // 正常的输入处理逻辑
    if keyboard_input.just_pressed(KeyCode::Space) {
        // 处理空格键
    }
}
```

## 总结

`bevy_input` 提供了完整而灵活的输入处理解决方案，支持多种输入设备和复杂的输入模式。通过理解其核心概念和API，开发者可以构建响应迅速、用户友好的交互系统。

关键要点：
1. 使用 `ButtonInput<T>` 处理按钮式输入
2. 使用 `Axis<T>` 处理连续数值输入
3. 区分物理按键 (`KeyCode`) 和逻辑按键 (`Key`)
4. 正确处理事件顺序和窗口焦点
5. 合理使用输入缓冲和组合键检测
6. 为不同输入设备提供一致的用户体验