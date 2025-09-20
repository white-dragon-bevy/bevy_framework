# Bevy Window 模块文档

## 概述

`bevy_window` 是 Bevy 引擎的窗口管理模块，提供了一个平台无关的窗口接口。该模块定义了窗口管理、事件处理和用户界面交互所需的核心类型和系统，是 Bevy 默认插件集 `DefaultPlugins` 的重要组成部分。

### 主要功能

- **窗口管理**：创建、配置和管理应用程序窗口
- **事件系统**：处理窗口相关事件，如重置大小、鼠标移动、键盘输入等
- **光标控制**：管理鼠标光标的显示和行为
- **显示器支持**：多显示器配置和视频模式选择
- **跨平台兼容**：支持多种操作系统和窗口系统

## 核心结构体和枚举

### 1. Window 组件

`Window` 是窗口实体的核心组件，定义了窗口的外观和行为：

```rust
#[derive(Component, Debug, Clone)]
pub struct Window {
    pub present_mode: PresentMode,           // 呈现模式（VSync等）
    pub mode: WindowMode,                    // 窗口模式（窗口化/全屏）
    pub position: WindowPosition,            // 窗口位置
    pub resolution: WindowResolution,        // 窗口分辨率
    pub title: String,                       // 窗口标题
    pub name: Option<String>,               // 窗口名称/应用ID
    pub composite_alpha_mode: CompositeAlphaMode, // Alpha合成模式
    pub resize_constraints: WindowResizeConstraints, // 调整大小限制
    pub resizable: bool,                    // 是否可调整大小
    pub enabled_buttons: EnabledButtons,    // 启用的窗口控制按钮
    pub decorations: bool,                  // 是否显示窗口装饰
    pub transparent: bool,                  // 是否透明
    pub focused: bool,                      // 是否聚焦
    pub window_level: WindowLevel,          // 窗口层级
    pub canvas: Option<String>,             // Web画布元素选择器
    pub fit_canvas_to_parent: bool,         // 是否适应父元素
    pub prevent_default_event_handling: bool, // 阻止默认事件处理
    pub internal: InternalWindowState,      // 内部状态
    pub ime_enabled: bool,                  // 输入法编辑器
    pub ime_position: Vec2,                 // 输入法位置
    pub window_theme: Option<WindowTheme>,  // 窗口主题
    pub visible: bool,                      // 是否可见
    // ... 更多平台特定属性
}
```

### 2. 窗口模式枚举

```rust
pub enum WindowMode {
    /// 窗口化模式
    Windowed,
    /// 无边框全屏模式
    BorderlessFullscreen(MonitorSelection),
    /// 独占全屏模式
    Fullscreen(MonitorSelection, VideoModeSelection),
}
```

### 3. 窗口位置枚举

```rust
pub enum WindowPosition {
    /// 由窗口管理器自动决定位置
    Automatic,
    /// 在指定显示器上居中
    Centered(MonitorSelection),
    /// 指定具体位置（物理像素）
    At(IVec2),
}
```

### 4. 窗口分辨率结构

```rust
pub struct WindowResolution {
    physical_width: u32,              // 物理宽度
    physical_height: u32,             // 物理高度
    scale_factor_override: Option<f32>, // 缩放因子覆盖
    scale_factor: f32,                // 操作系统提供的缩放因子
}
```

### 5. 呈现模式枚举

```rust
pub enum PresentMode {
    AutoVsync,      // 自动垂直同步
    AutoNoVsync,    // 自动关闭垂直同步
    Fifo,           // 传统垂直同步
    FifoRelaxed,    // 自适应垂直同步
    Immediate,      // 立即呈现
    Mailbox,        // 邮箱模式
}
```

### 6. 光标控制

```rust
pub struct CursorOptions {
    pub visible: bool,              // 光标可见性
    pub grab_mode: CursorGrabMode,  // 光标抓取模式
    pub hit_test: bool,             // 鼠标事件穿透
}

pub enum CursorGrabMode {
    None,       // 自由移动
    Confined,   // 限制在窗口内
    Locked,     // 锁定位置
}

pub enum CursorIcon {
    System(SystemCursorIcon),       // 系统光标
    #[cfg(feature = "custom_cursor")]
    Custom(CustomCursor),           // 自定义光标
}
```

## 主要 API 使用示例

### 1. 基本窗口设置

```rust
use bevy::prelude::*;
use bevy_window::{Window, WindowPlugin, WindowResolution, PresentMode};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "我的Bevy应用".to_string(),
                resolution: WindowResolution::new(1280.0, 720.0),
                present_mode: PresentMode::AutoVsync,
                resizable: true,
                ..default()
            }),
            ..default()
        }))
        .run();
}
```

### 2. 动态修改窗口属性

```rust
fn change_window_properties(
    mut windows: Query<&mut Window, With<PrimaryWindow>>,
    input: Res<ButtonInput<KeyCode>>,
) {
    if let Ok(mut window) = windows.get_single_mut() {
        if input.just_pressed(KeyCode::F11) {
            // 切换全屏模式
            match window.mode {
                WindowMode::Windowed => {
                    window.mode = WindowMode::BorderlessFullscreen(MonitorSelection::Current);
                }
                _ => {
                    window.mode = WindowMode::Windowed;
                }
            }
        }

        if input.just_pressed(KeyCode::KeyT) {
            // 切换透明度
            window.transparent = !window.transparent;
        }

        if input.just_pressed(KeyCode::KeyD) {
            // 切换窗口装饰
            window.decorations = !window.decorations;
        }
    }
}
```

### 3. 处理窗口事件

```rust
fn handle_window_events(
    mut resize_reader: MessageReader<WindowResized>,
    mut close_reader: MessageReader<WindowCloseRequested>,
    mut cursor_reader: MessageReader<CursorMoved>,
) {
    // 处理窗口大小变化
    for event in resize_reader.read() {
        println!("窗口 {:?} 大小变为: {}x{}",
                event.window, event.width, event.height);
    }

    // 处理窗口关闭请求
    for event in close_reader.read() {
        println!("窗口 {:?} 请求关闭", event.window);
    }

    // 处理鼠标移动
    for event in cursor_reader.read() {
        println!("鼠标在窗口 {:?} 移动到: {:?}",
                event.window, event.position);
    }
}
```

### 4. 多窗口管理

```rust
fn create_secondary_window(mut commands: Commands) {
    // 创建次要窗口
    commands.spawn(Window {
        title: "次要窗口".to_string(),
        resolution: WindowResolution::new(800.0, 600.0),
        position: WindowPosition::At(IVec2::new(100, 100)),
        ..default()
    });
}

fn manage_multiple_windows(
    primary_window: Query<&Window, (With<PrimaryWindow>, Without<SecondaryWindow>)>,
    secondary_windows: Query<&Window, (With<SecondaryWindow>, Without<PrimaryWindow>)>,
) {
    if let Ok(primary) = primary_window.get_single() {
        println!("主窗口大小: {}x{}", primary.width(), primary.height());
    }

    for window in secondary_windows.iter() {
        println!("次要窗口大小: {}x{}", window.width(), window.height());
    }
}
```

### 5. 光标管理

```rust
fn manage_cursor(
    mut windows: Query<&mut Window>,
    mut cursor_options: Query<&mut CursorOptions>,
    input: Res<ButtonInput<KeyCode>>,
) {
    if input.just_pressed(KeyCode::KeyC) {
        // 切换光标可见性
        for mut cursor in cursor_options.iter_mut() {
            cursor.visible = !cursor.visible;
        }
    }

    if input.just_pressed(KeyCode::KeyL) {
        // 锁定光标
        for mut cursor in cursor_options.iter_mut() {
            cursor.grab_mode = match cursor.grab_mode {
                CursorGrabMode::None => CursorGrabMode::Locked,
                _ => CursorGrabMode::None,
            };
        }
    }
}
```

## 与其他Bevy模块的集成方式

### 1. 与渲染系统集成

`bevy_window` 与 `bevy_render` 紧密集成：

```rust
use bevy::prelude::*;
use bevy_render::camera::Camera;

fn setup_camera_with_window(
    mut commands: Commands,
    windows: Query<Entity, With<PrimaryWindow>>,
) {
    if let Ok(window_entity) = windows.get_single() {
        commands.spawn(Camera2dBundle {
            camera: Camera {
                target: bevy_render::camera::RenderTarget::Window(
                    bevy_window::WindowRef::Entity(window_entity)
                ),
                ..default()
            },
            ..default()
        });
    }
}
```

### 2. 与输入系统集成

窗口事件会转换为 `bevy_input` 的输入事件：

```rust
use bevy_input::mouse::{MouseButtonInput, MouseMotion};
use bevy_input::keyboard::KeyboardInput;

fn handle_input_events(
    mut mouse_button_events: MessageReader<MouseButtonInput>,
    mut mouse_motion_events: MessageReader<MouseMotion>,
    mut keyboard_events: MessageReader<KeyboardInput>,
) {
    // 这些事件都源自窗口系统
    for event in mouse_button_events.read() {
        println!("鼠标按钮事件: {:?}", event);
    }

    for event in mouse_motion_events.read() {
        println!("鼠标移动: {:?}", event);
    }

    for event in keyboard_events.read() {
        println!("键盘输入: {:?}", event);
    }
}
```

### 3. 与ECS系统集成

窗口是ECS实体，可以与其他组件组合：

```rust
#[derive(Component)]
struct GameWindow;

#[derive(Component)]
struct MenuWindow;

fn setup_specialized_windows(mut commands: Commands) {
    // 游戏窗口
    commands.spawn((
        Window {
            title: "游戏".to_string(),
            ..default()
        },
        GameWindow,
    ));

    // 菜单窗口
    commands.spawn((
        Window {
            title: "菜单".to_string(),
            ..default()
        },
        MenuWindow,
    ));
}

fn update_game_windows(
    mut game_windows: Query<&mut Window, With<GameWindow>>,
) {
    for mut window in game_windows.iter_mut() {
        // 更新游戏窗口特定属性
        window.title = format!("游戏 - FPS: 60");
    }
}
```

## 常见使用场景

### 1. 游戏启动器

```rust
fn create_launcher_window() -> Window {
    Window {
        title: "游戏启动器".to_string(),
        resolution: WindowResolution::new(600.0, 400.0),
        position: WindowPosition::Centered(MonitorSelection::Primary),
        resizable: false,
        decorations: true,
        ..default()
    }
}
```

### 2. 全屏游戏

```rust
fn setup_fullscreen_game(mut windows: Query<&mut Window, With<PrimaryWindow>>) {
    if let Ok(mut window) = windows.get_single_mut() {
        window.mode = WindowMode::BorderlessFullscreen(MonitorSelection::Current);
        window.cursor_options.visible = false;
        window.cursor_options.grab_mode = CursorGrabMode::Locked;
    }
}
```

### 3. 工具应用

```rust
fn setup_tool_application() -> WindowPlugin {
    WindowPlugin {
        primary_window: Some(Window {
            title: "Bevy工具".to_string(),
            resolution: WindowResolution::new(1200.0, 800.0),
            resizable: true,
            decorations: true,
            window_theme: Some(WindowTheme::Dark),
            ..default()
        }),
        exit_condition: ExitCondition::OnAllClosed,
        close_when_requested: true,
        ..default()
    }
}
```

### 4. 多显示器设置

```rust
fn setup_multi_monitor(
    mut commands: Commands,
    monitors: Query<Entity, With<Monitor>>,
) {
    let monitor_entities: Vec<Entity> = monitors.iter().collect();

    for (i, &monitor) in monitor_entities.iter().enumerate() {
        commands.spawn(Window {
            title: format!("窗口 {}", i + 1),
            position: WindowPosition::Centered(
                MonitorSelection::Entity(monitor)
            ),
            ..default()
        });
    }
}
```

### 5. Web应用配置

```rust
fn setup_web_application() -> Window {
    Window {
        title: "Bevy Web应用".to_string(),
        canvas: Some("#bevy-canvas".to_string()),
        fit_canvas_to_parent: true,
        prevent_default_event_handling: true,
        ..default()
    }
}
```

### 6. 窗口状态保存和恢复

```rust
#[derive(Resource, serde::Serialize, serde::Deserialize)]
struct WindowState {
    width: f32,
    height: f32,
    position: Option<IVec2>,
    maximized: bool,
}

fn save_window_state(
    windows: Query<&Window, With<PrimaryWindow>>,
    mut state: ResMut<WindowState>,
) {
    if let Ok(window) = windows.get_single() {
        state.width = window.width();
        state.height = window.height();
        // 保存窗口状态到文件或本地存储
    }
}

fn restore_window_state(
    mut windows: Query<&mut Window, With<PrimaryWindow>>,
    state: Res<WindowState>,
) {
    if let Ok(mut window) = windows.get_single_mut() {
        window.resolution.set(state.width, state.height);
        if let Some(pos) = state.position {
            window.position = WindowPosition::At(pos);
        }
    }
}
```

## 事件系统详解

### 窗口生命周期事件

- `WindowCreated`: 窗口创建
- `WindowCloseRequested`: 窗口关闭请求
- `WindowClosing`: 窗口正在关闭
- `WindowClosed`: 窗口已关闭
- `WindowDestroyed`: 窗口被销毁

### 窗口属性变化事件

- `WindowResized`: 窗口大小变化
- `WindowMoved`: 窗口位置变化
- `WindowScaleFactorChanged`: 缩放因子变化
- `WindowFocused`: 窗口焦点变化
- `WindowOccluded`: 窗口遮挡状态变化

### 用户交互事件

- `CursorMoved`: 鼠标移动
- `CursorEntered`: 鼠标进入窗口
- `CursorLeft`: 鼠标离开窗口
- `FileDragAndDrop`: 文件拖放
- `Ime`: 输入法编辑器事件

## 最佳实践

1. **性能优化**：
   - 合理选择呈现模式
   - 避免频繁改变窗口属性
   - 使用适当的分辨率

2. **用户体验**：
   - 提供窗口状态保存功能
   - 支持多显示器配置
   - 响应系统主题变化

3. **平台兼容性**：
   - 测试不同操作系统的行为
   - 处理平台特定限制
   - 提供备用方案

4. **内存管理**：
   - 及时清理不需要的窗口
   - 避免内存泄漏
   - 合理使用事件处理器

## 总结

`bevy_window` 模块是Bevy引擎窗口管理的核心，提供了完整的窗口控制能力。通过合理使用其API，可以创建各种类型的应用程序，从简单的游戏到复杂的工具软件。该模块的设计充分考虑了跨平台兼容性和灵活性，是Bevy生态系统的重要组成部分。