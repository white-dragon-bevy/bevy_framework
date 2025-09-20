# Bevy Internal 模块详细文档

## 目录
1. [模块概述和主要功能](#模块概述和主要功能)
2. [核心结构体和枚举说明](#核心结构体和枚举说明)
3. [主要API使用示例](#主要api使用示例)
4. [与其他bevy模块的集成方式](#与其他bevy模块的集成方式)
5. [常见使用场景](#常见使用场景)
6. [功能特性配置](#功能特性配置)

---

## 模块概述和主要功能

### 1. 模块定位
`bevy_internal` 是 Bevy 游戏引擎的内部核心模块，主要作用是：
- **模块统一入口**：提供对所有 Bevy 子模块的统一访问接口
- **动态链接支持**：通过 `dynamic_linking` 特性支持可选的动态链接
- **插件组管理**：定义和管理默认插件组合
- **特性门控**：通过 Cargo 特性标志控制功能组件的包含

### 2. 核心功能
- **模块重导出**：将所有 Bevy 子模块重新导出，提供统一的API入口
- **插件组定义**：定义 `DefaultPlugins` 和 `MinimalPlugins` 两个核心插件组
- **预设配置**：通过 `prelude` 模块提供常用组件的快速导入
- **无标准库支持**：支持 `no_std` 环境下的运行

### 3. 架构特点
- **模块化设计**：每个功能模块都可以独立启用/禁用
- **条件编译**：大量使用 `#[cfg]` 属性进行条件编译
- **依赖管理**：通过可选依赖和特性标志管理复杂的依赖关系

---

## 核心结构体和枚举说明

### 1. 插件组结构

#### DefaultPlugins
```rust
pub struct DefaultPlugins {
    // 核心系统插件
    PanicHandlerPlugin,          // 异常处理
    LogPlugin,                   // 日志系统
    TaskPoolPlugin,              // 任务池
    FrameCountPlugin,           // 帧计数
    TimePlugin,                 // 时间系统
    TransformPlugin,            // 变换系统
    DiagnosticsPlugin,          // 诊断信息
    InputPlugin,                // 输入处理

    // 窗口和界面
    WindowPlugin,               // 窗口管理
    AccessibilityPlugin,        // 无障碍支持
    WinitPlugin,               // Winit窗口后端

    // 渲染系统
    RenderPlugin,              // 核心渲染
    ImagePlugin,               // 图像处理
    MeshPlugin,                // 网格系统
    CameraPlugin,              // 相机系统
    LightPlugin,               // 光照系统
    CorePipelinePlugin,        // 核心渲染管线
    AntiAliasPlugin,           // 抗锯齿

    // 2D/3D图形
    SpritePlugin,              // 2D精灵
    SpriteRenderPlugin,        // 精灵渲染
    PbrPlugin,                 // 基于物理的渲染

    // 用户界面
    TextPlugin,                // 文本渲染
    UiPlugin,                  // UI系统
    UiRenderPlugin,            // UI渲染

    // 资源和场景
    AssetPlugin,               // 资源管理
    ScenePlugin,               // 场景系统
    GltfPlugin,                // GLTF格式支持

    // 音频和动画
    AudioPlugin,               // 音频系统
    AnimationPlugin,           // 动画系统

    // 输入设备
    GilrsPlugin,               // 游戏手柄支持

    // 调试和开发工具
    GizmoPlugin,               // 调试绘制
    DevToolsPlugin,            // 开发工具
    StatesPlugin,              // 状态管理
}
```

#### MinimalPlugins
```rust
pub struct MinimalPlugins {
    TaskPoolPlugin,            // 任务池（必需）
    FrameCountPlugin,          // 帧计数（必需）
    TimePlugin,                // 时间系统（必需）
    ScheduleRunnerPlugin,      // 调度运行器（必需）
}
```

### 2. 内部辅助结构

#### IgnoreAmbiguitiesPlugin
```rust
#[derive(Default)]
struct IgnoreAmbiguitiesPlugin;
```
- **作用**：处理系统间的歧义性问题
- **功能**：自动忽略已知的安全系统歧义

---

## 主要API使用示例

### 1. 基础应用创建

#### 使用默认插件组
```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup)
        .add_systems(Update, update_system)
        .run();
}

fn setup(mut commands: Commands) {
    // 设置相机
    commands.spawn(Camera2dBundle::default());
}

fn update_system() {
    // 游戏逻辑
}
```

#### 使用最小插件组
```rust
use bevy::prelude::*;
use std::time::Duration;

fn main() {
    App::new()
        .add_plugins(MinimalPlugins.set(
            ScheduleRunnerPlugin::run_loop(Duration::from_secs_f64(1.0 / 60.0))
        ))
        .add_systems(Update, headless_system)
        .run();
}

fn headless_system() {
    println!("无头模式运行中...");
}
```

### 2. 自定义插件组配置

#### 禁用特定插件
```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.build().disable::<bevy::log::LogPlugin>())
        .run();
}
```

#### 替换插件配置
```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "自定义标题".into(),
                resolution: (800.0, 600.0).into(),
                ..default()
            }),
            ..default()
        }))
        .run();
}
```

### 3. 条件插件加载

#### 根据特性启用插件
```rust
use bevy::prelude::*;

fn main() {
    let mut app = App::new();

    // 添加核心插件
    app.add_plugins(MinimalPlugins);

    // 条件性添加渲染插件
    #[cfg(feature = "bevy_render")]
    app.add_plugins(bevy::render::RenderPlugin::default());

    // 条件性添加音频插件
    #[cfg(feature = "bevy_audio")]
    app.add_plugins(bevy::audio::AudioPlugin::default());

    app.run();
}
```

### 4. 预设模块使用

#### 使用预设导入
```rust
use bevy::prelude::*;  // 导入所有常用组件

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup_game)
        .run();
}

fn setup_game(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 创建3D场景
    commands.spawn(PbrBundle {
        mesh: meshes.add(Mesh::from(Cuboid::new(1.0, 1.0, 1.0))),
        material: materials.add(Color::srgb(0.8, 0.7, 0.6)),
        transform: Transform::from_xyz(0.0, 0.5, 0.0),
        ..default()
    });

    // 添加光源
    commands.spawn(PointLightBundle {
        point_light: PointLight {
            intensity: 1500.0,
            shadows_enabled: true,
            ..default()
        },
        transform: Transform::from_xyz(4.0, 8.0, 4.0),
        ..default()
    });

    // 添加相机
    commands.spawn(Camera3dBundle {
        transform: Transform::from_xyz(-2.0, 2.5, 5.0)
            .looking_at(Vec3::ZERO, Vec3::Y),
        ..default()
    });
}
```

---

## 与其他bevy模块的集成方式

### 1. 模块重导出架构

#### 核心模块集成
```rust
// lib.rs 中的模块重导出
pub use bevy_app as app;           // 应用框架
pub use bevy_ecs as ecs;           // 实体组件系统
pub use bevy_math as math;         // 数学库
pub use bevy_time as time;         // 时间系统
pub use bevy_transform as transform; // 变换系统
```

#### 条件模块集成
```rust
#[cfg(feature = "bevy_render")]
pub use bevy_render as render;     // 渲染系统

#[cfg(feature = "bevy_audio")]
pub use bevy_audio as audio;       // 音频系统

#[cfg(feature = "bevy_ui")]
pub use bevy_ui as ui;             // 用户界面
```

### 2. 插件依赖管理

#### 默认插件的依赖顺序
```rust
// 必须按照正确顺序加载插件以确保依赖关系正确
plugin_group! {
    pub struct DefaultPlugins {
        // 1. 核心系统首先加载
        bevy_app:::PanicHandlerPlugin,
        bevy_app:::TaskPoolPlugin,
        bevy_time:::TimePlugin,

        // 2. 输入和窗口系统
        bevy_input:::InputPlugin,
        bevy_window:::WindowPlugin,
        bevy_winit:::WinitPlugin,

        // 3. 资源管理（在渲染器之前）
        bevy_asset:::AssetPlugin,

        // 4. 渲染系统
        bevy_render:::RenderPlugin,
        bevy_image:::ImagePlugin,  // 在渲染器之后，了解支持的纹理格式

        // 5. 特定渲染功能
        bevy_pbr:::PbrPlugin,
        bevy_sprite:::SpritePlugin,
        bevy_ui:::UiPlugin,
    }
}
```

### 3. 特性门控集成

#### Cargo.toml 特性配置
```toml
[features]
# 基础特性
default = ["bevy_render", "bevy_ui", "bevy_audio"]

# 渲染相关
bevy_render = ["dep:bevy_render", "bevy_camera", "bevy_shader"]
bevy_pbr = ["dep:bevy_pbr", "bevy_light", "bevy_core_pipeline"]

# 平台特性
webgl = ["bevy_render?/webgl", "bevy_pbr?/webgl"]
android-native-activity = ["bevy_winit/android-native-activity"]
```

---

## 常见使用场景

### 1. 完整游戏应用

#### 3D游戏场景
```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "我的3D游戏".into(),
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup_3d_scene)
        .add_systems(Update, (rotate_cube, camera_controls))
        .run();
}

#[derive(Component)]
struct RotatingCube;

fn setup_3d_scene(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 旋转的立方体
    commands.spawn((
        PbrBundle {
            mesh: meshes.add(Mesh::from(Cuboid::new(2.0, 2.0, 2.0))),
            material: materials.add(StandardMaterial {
                base_color: Color::srgb(0.3, 0.5, 0.3),
                ..default()
            }),
            ..default()
        },
        RotatingCube,
    ));

    // 平面
    commands.spawn(PbrBundle {
        mesh: meshes.add(Mesh::from(Plane3d::default().mesh().size(5.0, 5.0))),
        material: materials.add(StandardMaterial {
            base_color: Color::srgb(0.3, 0.3, 0.3),
            ..default()
        }),
        transform: Transform::from_xyz(0.0, -2.5, 0.0),
        ..default()
    });

    // 方向光
    commands.spawn(DirectionalLightBundle {
        directional_light: DirectionalLight {
            shadows_enabled: true,
            ..default()
        },
        transform: Transform::from_rotation(Quat::from_euler(
            EulerRot::ZYX, 0.0, 1.0, -std::f32::consts::FRAC_PI_4
        )),
        ..default()
    });

    // 相机
    commands.spawn(Camera3dBundle {
        transform: Transform::from_xyz(-2.0, 2.5, 5.0)
            .looking_at(Vec3::ZERO, Vec3::Y),
        ..default()
    });
}

fn rotate_cube(mut query: Query<&mut Transform, With<RotatingCube>>, time: Res<Time>) {
    for mut transform in &mut query {
        transform.rotate_y(time.delta_seconds() * 0.5);
    }
}

fn camera_controls(
    mut camera_query: Query<&mut Transform, With<Camera3d>>,
    keyboard_input: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
) {
    let mut camera_transform = camera_query.single_mut();
    let speed = 5.0 * time.delta_seconds();

    if keyboard_input.pressed(KeyCode::KeyW) {
        camera_transform.translation += camera_transform.forward() * speed;
    }
    if keyboard_input.pressed(KeyCode::KeyS) {
        camera_transform.translation -= camera_transform.forward() * speed;
    }
    if keyboard_input.pressed(KeyCode::KeyA) {
        camera_transform.translation -= camera_transform.right() * speed;
    }
    if keyboard_input.pressed(KeyCode::KeyD) {
        camera_transform.translation += camera_transform.right() * speed;
    }
}
```

### 2. 2D游戏应用

#### 精灵游戏
```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup_2d_scene)
        .add_systems(Update, move_sprite)
        .run();
}

#[derive(Component)]
struct Player {
    speed: f32,
}

fn setup_2d_scene(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 2D相机
    commands.spawn(Camera2dBundle::default());

    // 玩家精灵
    commands.spawn((
        SpriteBundle {
            texture: asset_server.load("player.png"),
            transform: Transform::from_xyz(0.0, 0.0, 0.0),
            ..default()
        },
        Player { speed: 200.0 },
    ));
}

fn move_sprite(
    mut query: Query<(&mut Transform, &Player)>,
    keyboard_input: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
) {
    for (mut transform, player) in &mut query {
        let mut direction = Vec3::ZERO;

        if keyboard_input.pressed(KeyCode::ArrowLeft) {
            direction.x -= 1.0;
        }
        if keyboard_input.pressed(KeyCode::ArrowRight) {
            direction.x += 1.0;
        }
        if keyboard_input.pressed(KeyCode::ArrowUp) {
            direction.y += 1.0;
        }
        if keyboard_input.pressed(KeyCode::ArrowDown) {
            direction.y -= 1.0;
        }

        if direction != Vec3::ZERO {
            direction = direction.normalize();
            transform.translation += direction * player.speed * time.delta_seconds();
        }
    }
}
```

### 3. 无头/服务器应用

#### 游戏服务器
```rust
use bevy::prelude::*;
use std::time::Duration;

fn main() {
    App::new()
        .add_plugins(MinimalPlugins.set(
            ScheduleRunnerPlugin::run_loop(Duration::from_millis(16)) // ~60 FPS
        ))
        .add_systems(Startup, setup_server)
        .add_systems(Update, (
            server_tick,
            handle_connections,
            update_game_state,
        ))
        .run();
}

#[derive(Resource)]
struct GameServer {
    tick_count: u64,
    connected_players: Vec<u32>,
}

fn setup_server(mut commands: Commands) {
    println!("游戏服务器启动中...");
    commands.insert_resource(GameServer {
        tick_count: 0,
        connected_players: Vec::new(),
    });
}

fn server_tick(mut server: ResMut<GameServer>) {
    server.tick_count += 1;
    if server.tick_count % 60 == 0 {
        println!("服务器运行时间: {} 秒", server.tick_count / 60);
    }
}

fn handle_connections(mut server: ResMut<GameServer>) {
    // 模拟玩家连接
    if server.tick_count % 300 == 0 {  // 每5秒
        let player_id = server.connected_players.len() as u32;
        server.connected_players.push(player_id);
        println!("玩家 {} 已连接", player_id);
    }
}

fn update_game_state(server: Res<GameServer>) {
    // 更新游戏状态逻辑
    if !server.connected_players.is_empty() {
        // 处理游戏逻辑
    }
}
```

### 4. 自定义插件集成

#### 模块化应用架构
```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins((
            DefaultPlugins,
            GamePlugin,           // 自定义游戏插件
            NetworkPlugin,        // 自定义网络插件
            UIPlugin,            // 自定义UI插件
        ))
        .run();
}

struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, setup_game)
           .add_systems(Update, game_logic);
    }
}

struct NetworkPlugin;

impl Plugin for NetworkPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(NetworkConfig::default())
           .add_systems(Update, handle_network);
    }
}

struct UIPlugin;

impl Plugin for UIPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, setup_ui)
           .add_systems(Update, update_ui);
    }
}

#[derive(Resource, Default)]
struct NetworkConfig {
    server_address: String,
}

fn setup_game() {
    println!("游戏设置完成");
}

fn game_logic() {
    // 游戏核心逻辑
}

fn handle_network() {
    // 网络处理逻辑
}

fn setup_ui() {
    println!("UI设置完成");
}

fn update_ui() {
    // UI更新逻辑
}
```

---

## 功能特性配置

### 1. 核心特性组

#### 基础特性
```toml
[dependencies]
bevy = { version = "0.17", default-features = false, features = [
    "bevy_app",          # 应用框架（必需）
    "bevy_ecs",          # ECS系统（必需）
    "bevy_time",         # 时间系统（必需）
    "bevy_transform",    # 变换系统（必需）
    "bevy_math",         # 数学库（必需）
] }
```

#### 渲染特性
```toml
bevy = { version = "0.17", features = [
    "bevy_render",       # 核心渲染
    "bevy_image",        # 图像处理
    "bevy_mesh",         # 网格系统
    "bevy_camera",       # 相机系统
    "bevy_light",        # 光照系统
    "bevy_core_pipeline",# 渲染管线
    "bevy_pbr",          # PBR渲染
    "bevy_sprite",       # 2D精灵
    "bevy_ui",           # 用户界面
] }
```

#### 平台特定特性
```toml
# Windows特性
[target.'cfg(windows)'.features]
default = ["x11"]  # 或 "wayland"

# Android特性
[target.'cfg(target_os = "android")'.features]
default = ["android-game-activity"]  # 或 "android-native-activity"

# Web特性
[target.'cfg(target_arch = "wasm32")'.features]
default = ["webgl"]
```

### 2. 图形和渲染特性

#### 图像格式支持
```toml
bevy = { version = "0.17", features = [
    "png",               # PNG图像（默认）
    "jpeg",              # JPEG图像
    "hdr",               # HDR图像（默认）
    "ktx2",              # KTX2压缩纹理
    "basis-universal",   # Basis Universal压缩
    "webp",              # WebP图像
    "exr",               # OpenEXR图像
] }
```

#### 渲染管线特性
```toml
bevy = { version = "0.17", features = [
    "tonemapping_luts",             # 色调映射LUT
    "smaa_luts",                    # SMAA抗锯齿LUT
    "pbr_transmission_textures",    # PBR透射纹理
    "pbr_multi_layer_material_textures", # 多层材质纹理
    "experimental_pbr_pcss",        # 实验性PCSS阴影
] }
```

### 3. 音频特性

#### 音频格式支持
```toml
bevy = { version = "0.17", features = [
    "vorbis",            # Vorbis格式（默认）
    "mp3",               # MP3格式
    "flac",              # FLAC格式
    "wav",               # WAV格式
    "symphonia-all",     # 所有Symphonia支持的格式
] }
```

### 4. 开发和调试特性

#### 调试特性
```toml
bevy = { version = "0.17", features = [
    "trace",             # 性能追踪
    "trace_chrome",      # Chrome追踪输出
    "bevy_dev_tools",    # 开发工具
    "bevy_ci_testing",   # CI测试支持
    "debug_glam_assert", # GLM数学库断言
] }
```

#### 序列化特性
```toml
bevy = { version = "0.17", features = [
    "serialize",         # 序列化支持
    "bevy_scene",        # 场景序列化
] }
```

### 5. 高级特性

#### 实验性特性
```toml
bevy = { version = "0.17", features = [
    "meshlet",           # Meshlet渲染器（实验性）
    "meshlet_processor", # Meshlet处理器
    "reflect_functions", # 反射函数
    "bevy_remote",       # 远程协议
] }
```

#### 性能优化特性
```toml
bevy = { version = "0.17", features = [
    "multi_threaded",    # 多线程支持
    "dynamic_linking",   # 动态链接
    "file_watcher",      # 文件监视器
] }
```

---

## 总结

`bevy_internal` 模块是 Bevy 引擎的核心集成层，提供了：

1. **统一的模块访问接口**：通过重导出机制提供对所有子模块的统一访问
2. **灵活的插件系统**：支持从最小配置到完整功能的不同应用需求
3. **细粒度的特性控制**：通过 Cargo 特性标志实现功能的精确控制
4. **跨平台兼容性**：支持多种平台和运行环境
5. **开发友好的API**：通过预设和默认配置简化常见用例

通过合理使用 `bevy_internal` 提供的插件组和特性配置，开发者可以构建从简单的2D游戏到复杂的3D应用，以及无头服务器等各种类型的应用程序。