# Bevy Winit 模块详细文档

## 1. 模块概述和主要功能

### 1.1 概述
`bevy_winit` 是 Bevy 引擎中负责窗口创建和事件循环管理的核心模块。它基于 Rust 的 `winit` 库，为 Bevy 应用程序提供跨平台的窗口管理功能。

### 1.2 主要功能
- **窗口创建和管理**：创建、配置和销毁应用程序窗口
- **事件循环处理**：处理操作系统级别的窗口和输入事件
- **输入事件转换**：将 winit 的原生事件转换为 Bevy 的事件系统
- **无障碍支持**：集成 AccessKit 提供无障碍功能
- **多显示器支持**：管理多个显示器和窗口定位
- **自定义光标支持**：支持系统光标和自定义图像光标
- **跨平台兼容**：支持 Windows、macOS、Linux、Web、Android 等平台

### 1.3 模块依赖
- `winit`：底层窗口和事件处理
- `accesskit_winit`：无障碍功能支持
- `bevy_window`：窗口相关组件和资源
- `bevy_input`：输入事件处理
- `bevy_ecs`：实体组件系统集成

## 2. 核心结构体和枚举说明

### 2.1 WinitPlugin<M>
```rust
pub struct WinitPlugin<M: Message = WakeUp> {
    pub run_on_any_thread: bool,
}
```
**功能**：Bevy 的主要插件，负责初始化 winit 事件循环和窗口系统。
- `run_on_any_thread`: 允许在任何线程上创建窗口（仅限 Linux 和 Windows）
- `M`: 自定义消息类型，默认为 `WakeUp`

### 2.2 WinitSettings
```rust
pub struct WinitSettings {
    pub focused_mode: UpdateMode,
    pub unfocused_mode: UpdateMode,
}
```
**功能**：控制应用程序在不同状态下的更新模式。

**预设配置**：
- `game()`：游戏模式 - 聚焦时连续更新，失焦时低功耗
- `desktop_app()`：桌面应用模式 - 响应式更新
- `mobile()`：移动设备模式 - 优化电池续航
- `continuous()`：持续更新模式

### 2.3 UpdateMode
```rust
pub enum UpdateMode {
    Continuous,
    Reactive {
        wait: Duration,
        react_to_device_events: bool,
        react_to_user_events: bool,
        react_to_window_events: bool,
    },
}
```
**功能**：定义应用程序的更新策略。
- `Continuous`：持续更新，尽可能快地运行
- `Reactive`：响应式更新，只在特定事件或时间间隔后更新

### 2.4 WinitWindows
```rust
pub struct WinitWindows {
    pub windows: HashMap<WindowId, WindowWrapper<WinitWindow>>,
    pub entity_to_winit: EntityHashMap<WindowId>,
    pub winit_to_entity: HashMap<WindowId, Entity>,
}
```
**功能**：管理 Bevy 实体与 winit 窗口之间的映射关系。

### 2.5 EventLoopProxyWrapper<T>
```rust
#[derive(Resource, Deref)]
pub struct EventLoopProxyWrapper<T: 'static>(EventLoopProxy<T>);
```
**功能**：事件循环代理的包装器，允许从外部线程请求重绘。

### 2.6 DisplayHandleWrapper
```rust
#[derive(Resource, Deref)]
pub struct DisplayHandleWrapper(pub winit::event_loop::OwnedDisplayHandle);
```
**功能**：显示句柄的包装器，用于需要直接访问显示硬件的集成。

### 2.7 WinitMonitors
```rust
pub struct WinitMonitors {
    pub(crate) monitors: Vec<(MonitorHandle, Entity)>,
}
```
**功能**：存储 winit 显示器和对应实体的映射关系。

### 2.8 光标相关结构
```rust
pub enum CursorSource {
    CustomCached(CustomCursorCacheKey),
    Custom((CustomCursorCacheKey, winit::window::CustomCursorSource)),
    System(winit::window::CursorIcon),
}

#[derive(Component, Debug)]
pub struct PendingCursor(pub Option<CursorSource>);
```
**功能**：管理窗口光标的显示和缓存。

## 3. 主要API使用示例

### 3.1 基本窗口应用设置
```rust
use bevy::prelude::*;
use bevy_winit::{WinitPlugin, WinitSettings};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(
            WinitPlugin::default()
        ))
        .insert_resource(WinitSettings::game()) // 使用游戏模式
        .add_systems(Startup, setup)
        .run();
}

fn setup(mut commands: Commands) {
    // 创建窗口实体
    commands.spawn(Window {
        title: "我的 Bevy 应用".to_string(),
        resolution: (800.0, 600.0).into(),
        ..default()
    });
}
```

### 3.2 自定义更新模式
```rust
use bevy_winit::{WinitSettings, UpdateMode};
use std::time::Duration;

fn configure_update_mode(mut settings: ResMut<WinitSettings>) {
    // 自定义响应式更新模式
    settings.focused_mode = UpdateMode::reactive(Duration::from_millis(16)); // ~60 FPS
    settings.unfocused_mode = UpdateMode::reactive_low_power(Duration::from_secs(1)); // 1 FPS
}
```

### 3.3 多显示器支持
```rust
use bevy_window::{Window, WindowPosition, MonitorSelection};

fn create_multi_monitor_windows(mut commands: Commands) {
    // 主显示器窗口
    commands.spawn(Window {
        position: WindowPosition::Centered(MonitorSelection::Primary),
        title: "主窗口".to_string(),
        ..default()
    });

    // 第二显示器窗口
    commands.spawn(Window {
        position: WindowPosition::Centered(MonitorSelection::Index(1)),
        title: "副窗口".to_string(),
        ..default()
    });
}
```

### 3.4 处理原始 Winit 事件
```rust
use bevy_winit::RawWinitWindowEvent;

fn handle_raw_winit_events(mut events: MessageReader<RawWinitWindowEvent>) {
    for event in events.read() {
        match &event.event {
            winit::event::WindowEvent::Resized(size) => {
                println!("窗口大小改变为: {:?}", size);
            }
            winit::event::WindowEvent::CloseRequested => {
                println!("窗口关闭请求");
            }
            _ => {}
        }
    }
}
```

### 3.5 使用事件循环代理
```rust
use bevy_winit::{EventLoopProxyWrapper, WakeUp};
use std::thread;

fn spawn_background_task(proxy: Res<EventLoopProxyWrapper<WakeUp>>) {
    let proxy = proxy.clone();
    thread::spawn(move || {
        // 后台工作
        thread::sleep(Duration::from_secs(1));

        // 请求应用程序重绘
        let _ = proxy.send_event(WakeUp);
    });
}
```

### 3.6 自定义光标（需要 custom_cursor 特性）
```rust
use bevy_window::{CursorIcon, SystemCursorIcon, CustomCursor};

fn setup_custom_cursor(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 系统光标
    commands.spawn((
        Window::default(),
        CursorIcon::System(SystemCursorIcon::Hand),
    ));

    // 自定义图像光标
    commands.spawn((
        Window::default(),
        CursorIcon::Custom(CustomCursor::Image(bevy_window::CustomCursorImage {
            handle: asset_server.load("cursor.png"),
            hotspot: (16, 16),
            ..default()
        })),
    ));
}
```

### 3.7 窗口事件监听
```rust
use bevy_window::{WindowResized, WindowCloseRequested, WindowFocused};

fn handle_window_events(
    mut resize_events: MessageReader<WindowResized>,
    mut close_events: MessageReader<WindowCloseRequested>,
    mut focus_events: MessageReader<WindowFocused>,
) {
    // 处理窗口大小变化
    for event in resize_events.read() {
        println!("窗口 {:?} 大小变化为: {:?}", event.window, event.size);
    }

    // 处理窗口关闭请求
    for event in close_events.read() {
        println!("窗口 {:?} 请求关闭", event.window);
    }

    // 处理窗口焦点变化
    for event in focus_events.read() {
        println!("窗口 {:?} 焦点状态: {}", event.window, event.focused);
    }
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与 bevy_window 的集成
`bevy_winit` 作为 `bevy_window` 的具体实现：
- 读取 `Window` 组件配置，创建对应的 winit 窗口
- 将 winit 窗口事件转换为 Bevy 的 `WindowEvent`
- 同步窗口属性变化（标题、大小、位置等）

### 4.2 与 bevy_input 的集成
负责输入事件的转换和分发：
- 键盘事件：`KeyboardInput`
- 鼠标事件：`MouseButtonInput`、`MouseMotion`、`MouseWheel`
- 触摸事件：`TouchInput`
- 手势事件：`PinchGesture`、`RotationGesture`

### 4.3 与 bevy_app 的集成
作为应用程序运行器：
- 通过 `App::set_runner()` 设置自定义运行器
- 管理应用程序生命周期
- 处理退出条件

### 4.4 与 bevy_a11y 的集成
提供无障碍功能：
- 集成 AccessKit 适配器
- 处理屏幕阅读器交互
- 管理无障碍树结构

### 4.5 与渲染模块的集成
通过 `RawHandleWrapper` 提供窗口句柄：
- 为 wgpu/vulkan 等渲染后端提供表面创建句柄
- 支持 GPU 渲染上下文初始化

## 5. 常见使用场景

### 5.1 游戏开发
```rust
use bevy::prelude::*;
use bevy_winit::WinitSettings;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .insert_resource(WinitSettings::game()) // 游戏优化设置
        .add_systems(Startup, setup_game)
        .run();
}

fn setup_game(mut commands: Commands) {
    commands.spawn(Window {
        title: "我的游戏".to_string(),
        mode: bevy_window::WindowMode::Fullscreen(
            bevy_window::MonitorSelection::Primary
        ),
        cursor_options: bevy_window::CursorOptions {
            visible: false, // 隐藏光标
            grab_mode: bevy_window::CursorGrabMode::Locked, // 锁定光标
            ..default()
        },
        ..default()
    });
}
```

### 5.2 桌面应用程序
```rust
use bevy_winit::WinitSettings;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .insert_resource(WinitSettings::desktop_app()) // 桌面应用优化
        .add_systems(Startup, setup_desktop_app)
        .run();
}

fn setup_desktop_app(mut commands: Commands) {
    commands.spawn(Window {
        title: "桌面应用".to_string(),
        resolution: (1024.0, 768.0).into(),
        resizable: true,
        decorations: true,
        window_level: bevy_window::WindowLevel::Normal,
        ..default()
    });
}
```

### 5.3 多窗口应用
```rust
fn create_multi_window_app(mut commands: Commands) {
    // 主窗口
    commands.spawn(Window {
        title: "主窗口".to_string(),
        position: WindowPosition::At(IVec2::new(100, 100)),
        resolution: (800.0, 600.0).into(),
        ..default()
    });

    // 工具窗口
    commands.spawn(Window {
        title: "工具面板".to_string(),
        position: WindowPosition::At(IVec2::new(920, 100)),
        resolution: (300.0, 600.0).into(),
        window_level: bevy_window::WindowLevel::AlwaysOnTop,
        ..default()
    });
}
```

### 5.4 移动设备应用
```rust
#[cfg(target_os = "android")]
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .insert_resource(WinitSettings::mobile()) // 移动设备优化
        .add_systems(Startup, setup_mobile)
        .run();
}

fn setup_mobile(mut commands: Commands) {
    commands.spawn(Window {
        title: "移动应用".to_string(),
        resolution: (360.0, 640.0).into(),
        // 移动设备通常是全屏
        mode: bevy_window::WindowMode::BorderlessFullscreen(
            bevy_window::MonitorSelection::Primary
        ),
        ..default()
    });
}
```

### 5.5 Web 应用
```rust
#[cfg(target_arch = "wasm32")]
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup_web)
        .run();
}

fn setup_web(mut commands: Commands) {
    commands.spawn(Window {
        title: "Web 应用".to_string(),
        canvas: Some("#bevy-canvas".to_string()), // 指定 HTML canvas 元素
        prevent_default_event_handling: false,
        ..default()
    });
}
```

### 5.6 自定义事件处理
```rust
use bevy_winit::RawWinitWindowEvent;

fn custom_event_handler(
    mut raw_events: MessageReader<RawWinitWindowEvent>,
    mut app_exit: MessageWriter<AppExit>,
) {
    for event in raw_events.read() {
        match &event.event {
            winit::event::WindowEvent::KeyboardInput { event, .. } => {
                // 自定义键盘处理逻辑
                if event.logical_key == winit::keyboard::Key::Named(winit::keyboard::NamedKey::Escape) {
                    app_exit.send(AppExit::Success);
                }
            }
            _ => {}
        }
    }
}
```

### 5.7 性能监控和调试
```rust
use bevy_window::{WindowResized, RequestRedraw};

fn performance_monitor(
    mut resize_events: MessageReader<WindowResized>,
    mut redraw_requests: MessageWriter<RequestRedraw>,
    time: Res<Time>,
    mut last_resize: Local<f32>,
) {
    // 监控窗口调整大小事件
    for event in resize_events.read() {
        *last_resize = time.elapsed_secs();
        println!("窗口大小调整: {:?}", event.size);

        // 请求重绘
        redraw_requests.send(RequestRedraw { window: event.window });
    }

    // 性能统计
    if time.elapsed_secs() - *last_resize > 1.0 {
        println!("FPS: {:.2}", 1.0 / time.delta_secs());
    }
}
```

## 6. 平台特定功能

### 6.1 Windows 平台
- 支持任务栏图标控制
- 窗口裁剪子元素功能
- 类名设置

### 6.2 macOS 平台
- 标题栏自定义
- 窗口阴影控制
- 全尺寸内容视图

### 6.3 Linux 平台
- X11 和 Wayland 支持
- 多线程事件循环

### 6.4 Web 平台
- Canvas 元素绑定
- 防止默认事件处理
- 自定义光标 URL 支持

### 6.5 移动平台
- Android Activity 集成
- iOS 系统手势处理
- 状态栏和主页指示器控制

## 7. 最佳实践和注意事项

### 7.1 性能优化
- 根据应用类型选择合适的 `WinitSettings`
- 使用响应式更新模式减少 CPU 占用
- 避免在失焦状态下的不必要更新

### 7.2 内存管理
- 窗口实体会自动清理对应的 winit 资源
- 自定义光标会被缓存以避免重复创建
- 显示器信息会在硬件变化时自动更新

### 7.3 错误处理
- 窗口创建失败会导致 panic，应在应用级别处理
- 部分平台的光标设置可能失败，会记录警告日志
- 显示器断开连接可能导致 winit 内部 panic

### 7.4 线程安全
- `WinitWindows` 不是线程安全的（`!Send + !Sync`）
- 使用 `EventLoopProxy` 在其他线程中触发事件
- 避免在非主线程中直接操作窗口属性

这份文档提供了 `bevy_winit` 模块的全面指南，涵盖了从基础概念到高级用法的各个方面。开发者可以根据具体需求选择合适的功能和配置来构建自己的应用程序。