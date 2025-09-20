# Bevy Dev Tools 开发工具模块详细文档

## 概述

`bevy_dev_tools` 是 Bevy 游戏引擎的开发工具集合，专注于提升开发者体验。该模块提供了一系列调试和开发辅助工具，帮助开发者在游戏开发过程中监控性能、调试交互和自动化测试。

**重要提示**：不建议在最终发布的游戏或应用程序中启用此模块，因为开发工具提供了对应用程序内部的高级访问权限，可能会干扰正常使用和游戏体验。

## 核心插件

### DevToolsPlugin

`DevToolsPlugin` 是主插件，负责启用应用程序中的开发者工具。该插件在启用 `bevy_dev_tools` 功能时会自动添加。

```rust
use bevy_dev_tools::DevToolsPlugin;

#[derive(Default)]
pub struct DevToolsPlugin;

impl Plugin for DevToolsPlugin {
    fn build(&self, _app: &mut App) {}
}
```

#### 启用方式

1. **自定义 crate 功能**（推荐）：
```toml
[features]
dev_mode = ["bevy/bevy_dev_tools", "other_dev_tools"]
```

2. **命令行标志**：
```bash
cargo run --features bevy/bevy_dev_tools
```

3. **直接添加到依赖**（不推荐用于生产环境）：
```toml
bevy = { version = "0.17.0-dev", features = ["bevy_dev_tools"] }
```

## 模块详细说明

### 1. CI Testing 模块 (`ci_testing`)

用于持续集成环境中的自动化测试工具。

#### 核心结构体

##### CiTestingPlugin
```rust
#[derive(Default)]
pub struct CiTestingPlugin;
```

自动执行用户定义动作的 CI 测试插件。读取由环境变量 `CI_TESTING_CONFIG` 指定的 RON 文件（默认为 `ci_testing_config.ron`）。

##### CiTestingConfig
```rust
#[derive(Deserialize, Resource, PartialEq, Debug, Default)]
pub struct CiTestingConfig {
    pub setup: CiTestingSetup,
    pub events: Vec<CiTestingEventOnFrame>,
}
```

CI 测试的配置结构体，包含测试设置和事件列表。

##### CiTestingSetup
```rust
#[derive(Deserialize, Default, PartialEq, Debug)]
pub struct CiTestingSetup {
    pub fixed_frame_time: Option<f32>,
}
```

测试设置，可指定固定的帧时间（秒）。

##### CiTestingEvent
```rust
#[derive(Deserialize, PartialEq, Debug)]
pub enum CiTestingEvent {
    Screenshot,                    // 截屏
    ScreenshotAndExit,            // 截屏并退出
    NamedScreenshot(String),      // 命名截屏
    AppExit,                      // 退出应用
    Custom(String),               // 自定义事件
}
```

#### 使用示例

配置文件示例（`ci_testing_config.ron`）：
```ron
(
    setup: (
        fixed_frame_time: Some(0.03),
    ),
    events: [
        (100, Custom("Hello, world!")),
        (200, Screenshot),
        (300, AppExit),
    ],
)
```

### 2. FPS Overlay 模块 (`fps_overlay`)

提供 FPS 覆盖层显示功能，用于实时监控帧率性能。

#### 核心结构体

##### FpsOverlayPlugin
```rust
#[derive(Default)]
pub struct FpsOverlayPlugin {
    pub config: FpsOverlayConfig,
}
```

FPS 覆盖层插件，自动添加 `FrameTimeDiagnosticsPlugin`。

##### FpsOverlayConfig
```rust
#[derive(Resource, Clone)]
pub struct FpsOverlayConfig {
    pub text_config: TextFont,                              // 文本配置
    pub text_color: Color,                                  // 文本颜色
    pub enabled: bool,                                      // 是否启用
    pub refresh_interval: Duration,                         // 刷新间隔
    pub frame_time_graph_config: FrameTimeGraphConfig,      // 帧时间图配置
}
```

##### FrameTimeGraphConfig
```rust
#[derive(Clone, Copy)]
pub struct FrameTimeGraphConfig {
    pub enabled: bool,      // 是否启用图表
    pub min_fps: f32,       // 最小可接受 FPS（低于此值显示红色）
    pub target_fps: f32,    // 目标 FPS（高于此值显示绿色）
}
```

#### 使用示例

```rust
use bevy::prelude::*;
use bevy_dev_tools::fps_overlay::{FpsOverlayPlugin, FpsOverlayConfig};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(FpsOverlayPlugin {
            config: FpsOverlayConfig {
                text_config: TextFont {
                    font_size: 42.0,
                    ..default()
                },
                enabled: true,
                ..default()
            }
        })
        .run();
}

// 运行时切换显示
fn toggle_fps_overlay(mut config: ResMut<FpsOverlayConfig>) {
    config.enabled = !config.enabled;
}
```

#### 常量

- `FPS_OVERLAY_ZINDEX`: `i32::MAX - 32` - FPS 覆盖层的全局 Z 索引
- `FRAME_TIME_GRAPH_WIDTH_SCALE`: `6.0` - 帧时间图宽度缩放比例
- `FRAME_TIME_GRAPH_HEIGHT_SCALE`: `2.0` - 帧时间图高度缩放比例

### 3. Frame Time Graph 模块 (`frame_time_graph`)

提供帧时间图表的渲染功能，可视化性能数据。

#### 核心结构体

##### FrameTimeGraphPlugin
```rust
pub struct FrameTimeGraphPlugin;
```

设置帧时间图表材质渲染的插件。

##### FrametimeGraphMaterial
```rust
#[derive(AsBindGroup, Asset, TypePath, Debug, Clone)]
pub struct FrametimeGraphMaterial {
    #[storage(0, read_only)]
    pub values: Handle<ShaderStorageBuffer>,    // 帧时间历史值
    #[uniform(1)]
    pub config: FrameTimeGraphConfigUniform,   // 着色器配置
}
```

##### FrameTimeGraphConfigUniform
```rust
#[derive(Debug, Clone, Copy, ShaderType)]
pub struct FrameTimeGraphConfigUniform {
    dt_min: f32,                    // 最小预期增量时间
    dt_max: f32,                    // 最大预期增量时间
    dt_min_log2: f32,              // 最小增量时间的 log2 值
    dt_max_log2: f32,              // 最大增量时间的 log2 值
    proportional_width: u32,        // 是否按比例宽度显示
}
```

#### 使用示例

```rust
use bevy_dev_tools::frame_time_graph::{FrameTimeGraphPlugin, FrametimeGraphMaterial};

fn setup_frame_time_graph(
    mut commands: Commands,
    mut materials: ResMut<Assets<FrametimeGraphMaterial>>,
) {
    // 帧时间图会自动通过 FpsOverlayPlugin 创建
    // 也可以手动创建图表材质
}
```

### 4. Picking Debug 模块 (`picking_debug`)

提供交互拾取系统的调试工具，包括文本和屏幕调试工具。

#### 核心结构体

##### DebugPickingPlugin
```rust
#[derive(Debug, Default, Clone)]
pub struct DebugPickingPlugin;
```

拾取调试插件，记录事件并显示调试覆盖层。

##### DebugPickingMode
```rust
#[derive(Debug, Clone, Copy, Default, Eq, PartialEq, Hash, Resource)]
pub enum DebugPickingMode {
    Normal,     // 仅记录非噪声事件，显示调试覆盖层
    Noisy,      // 记录所有事件（包括 Move 和 Drag），显示调试覆盖层
    #[default]
    Disabled,   // 不显示调试覆盖层或记录任何消息
}
```

##### PointerDebug
```rust
#[derive(Debug, Component, Clone, Default)]
pub struct PointerDebug {
    pub location: Option<Location>,     // 指针位置
    pub press: PointerPress,           // 指针按钮状态
    pub hits: Vec<(String, HitData)>,  // 命中元素列表
}
```

#### 使用示例

```rust
use bevy::prelude::*;
use bevy_dev_tools::picking_debug::{DebugPickingPlugin, DebugPickingMode};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(DebugPickingPlugin)
        .insert_resource(DebugPickingMode::Normal)
        .add_systems(Update, toggle_picking_debug)
        .run();
}

// 切换拾取调试模式
fn toggle_picking_debug(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut mode: ResMut<DebugPickingMode>,
) {
    if keyboard.just_pressed(KeyCode::F3) {
        *mode = match *mode {
            DebugPickingMode::Disabled => DebugPickingMode::Normal,
            DebugPickingMode::Normal => DebugPickingMode::Noisy,
            DebugPickingMode::Noisy => DebugPickingMode::Disabled,
        };
    }
}
```

#### 条件函数

- `DebugPickingMode::is_enabled()` - 插件是否启用
- `DebugPickingMode::is_disabled()` - 插件是否禁用
- `DebugPickingMode::is_noisy()` - 是否处于噪声模式

### 5. States 模块 (`states`)

提供状态调试工具。

#### 核心函数

##### log_transitions
```rust
pub fn log_transitions<S: States>(mut transitions: MessageReader<StateTransitionEvent<S>>)
```

将状态转换记录到控制台的系统，便于跟踪状态变化进行调试。

#### 使用示例

```rust
use bevy::prelude::*;
use bevy_dev_tools::states::log_transitions;

#[derive(States, Debug, Clone, PartialEq, Eq, Hash)]
enum GameState {
    Menu,
    Playing,
    Paused,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .init_state::<GameState>()
        .add_systems(Update, log_transitions::<GameState>)
        .run();
}
```

输出示例：
```
GameState transition: Some(Menu) => Some(Playing)
GameState transition: Some(Playing) => Some(Paused)
```

## 与其他 Bevy 模块的集成

### 依赖关系

`bevy_dev_tools` 依赖以下 Bevy 模块：

- `bevy_app` - 应用程序框架
- `bevy_asset` - 资产管理
- `bevy_camera` - 相机系统
- `bevy_color` - 颜色系统
- `bevy_diagnostic` - 诊断系统
- `bevy_ecs` - 实体组件系统
- `bevy_math` - 数学库
- `bevy_picking` - 拾取系统
- `bevy_render` - 渲染系统
- `bevy_reflect` - 反射系统
- `bevy_time` - 时间系统
- `bevy_text` - 文本系统
- `bevy_shader` - 着色器系统
- `bevy_ui` - 用户界面
- `bevy_ui_render` - UI 渲染
- `bevy_window` - 窗口系统
- `bevy_state` - 状态管理

### 自动插件添加

某些开发工具插件会自动添加其依赖插件：

1. `FpsOverlayPlugin` 自动添加 `FrameTimeDiagnosticsPlugin` 和 `FrameTimeGraphPlugin`
2. `FrameTimeGraphPlugin` 要求预先添加 `FrameTimeDiagnosticsPlugin`

## 常见使用场景

### 1. 性能监控

```rust
use bevy::prelude::*;
use bevy_dev_tools::fps_overlay::FpsOverlayPlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(FpsOverlayPlugin::default())
        .run();
}
```

### 2. 交互调试

```rust
use bevy::prelude::*;
use bevy_dev_tools::picking_debug::{DebugPickingPlugin, DebugPickingMode};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(DebugPickingPlugin)
        .insert_resource(DebugPickingMode::Normal)
        .run();
}
```

### 3. 状态转换追踪

```rust
use bevy::prelude::*;
use bevy_dev_tools::states::log_transitions;

#[derive(States, Debug, Clone, PartialEq, Eq, Hash)]
enum AppState {
    Loading,
    Menu,
    Game,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .init_state::<AppState>()
        .add_systems(Update, log_transitions::<AppState>)
        .run();
}
```

### 4. CI 自动化测试

```rust
// ci_testing_config.ron
(
    setup: (
        fixed_frame_time: Some(0.016), // 60 FPS
    ),
    events: [
        (60, Screenshot),              // 第60帧截图
        (120, NamedScreenshot("ui")),  // 第120帧命名截图
        (180, AppExit),               // 第180帧退出
    ],
)
```

### 5. 综合调试环境

```rust
use bevy::prelude::*;
use bevy_dev_tools::{
    DevToolsPlugin,
    fps_overlay::{FpsOverlayPlugin, FpsOverlayConfig},
    picking_debug::{DebugPickingPlugin, DebugPickingMode},
    states::log_transitions,
};

#[derive(States, Debug, Clone, PartialEq, Eq, Hash)]
enum GameState {
    Menu,
    Playing,
    Paused,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(DevToolsPlugin)
        .add_plugins(FpsOverlayPlugin {
            config: FpsOverlayConfig {
                enabled: true,
                text_config: TextFont {
                    font_size: 36.0,
                    ..default()
                },
                ..default()
            }
        })
        .add_plugins(DebugPickingPlugin)
        .insert_resource(DebugPickingMode::Normal)
        .init_state::<GameState>()
        .add_systems(Update, (
            log_transitions::<GameState>,
            toggle_debug_systems,
        ))
        .run();
}

fn toggle_debug_systems(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut fps_config: ResMut<FpsOverlayConfig>,
    mut picking_mode: ResMut<DebugPickingMode>,
) {
    if keyboard.just_pressed(KeyCode::F1) {
        fps_config.enabled = !fps_config.enabled;
    }

    if keyboard.just_pressed(KeyCode::F2) {
        *picking_mode = match *picking_mode {
            DebugPickingMode::Disabled => DebugPickingMode::Normal,
            _ => DebugPickingMode::Disabled,
        };
    }
}
```

## 最佳实践

1. **仅在开发环境使用**：通过功能标志控制开发工具的启用
2. **性能考虑**：开发工具会消耗额外的系统资源，不适用于生产环境
3. **日志级别设置**：合理设置 `RUST_LOG` 环境变量以查看调试信息
4. **键盘快捷键**：为常用调试功能绑定键盘快捷键
5. **模块化使用**：根据需要选择性地启用特定的调试工具

## 注意事项

- 某些功能需要特定的功能标志（如 `bevy_ci_testing`）
- WASM 目标下某些功能可能受限
- 开发工具提供高级系统访问权限，可能影响应用程序安全性
- 建议在发布前移除或禁用所有开发工具相关代码

该文档涵盖了 `bevy_dev_tools` 模块的所有核心功能，为开发者提供了完整的使用指南和最佳实践建议。