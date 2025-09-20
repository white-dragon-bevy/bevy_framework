# Bevy Android 模块详细文档

## 1. 模块概述和主要功能

`bevy_android` 是 Bevy 引擎专门为 Android 平台提供功能支持的核心模块。该模块主要负责：

- **Android 应用程序生命周期管理**：提供对 Android 应用状态的查询和监控
- **Android 原生 API 集成**：封装 Android Activity 相关功能
- **跨平台兼容性**：在非 Android 平台上提供空实现，确保代码可移植性
- **资源访问支持**：为其他 Bevy 模块（如资源系统、日志系统）提供 Android 特定的实现

### 核心依赖

- `android-activity` (0.6): 提供 Android Activity 的 Rust 绑定
- 仅在 `target_os = "android"` 时启用相关功能

## 2. 核心结构体和枚举说明

### 2.1 ANDROID_APP 静态变量

```rust
pub static ANDROID_APP: std::sync::OnceLock<android_activity::AndroidApp> =
    std::sync::OnceLock::new();
```

**功能说明：**
- 全局单例，存储 Android 应用程序实例
- 使用 `OnceLock` 确保线程安全的一次性初始化
- 提供对 Android 应用状态和事件监控的接口

**生命周期：**
- 在应用启动时通过 `#[bevy_main]` 宏自动初始化
- 整个应用生命周期内保持有效
- 提供对 Android AssetManager、输入事件等的访问

### 2.2 android_activity 重导出

```rust
#[cfg(target_os = "android")]
pub use android_activity;
```

**作用：**
- 重导出 `android_activity` crate 的所有公共 API
- 提供对 `AndroidApp`、`AssetManager` 等类型的直接访问
- 简化其他模块对 Android 功能的使用

## 3. 主要API使用示例

### 3.1 基本应用设置

```rust
use bevy::prelude::*;

// 在 Android 平台上必须使用 #[bevy_main] 宏
#[bevy_main]
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .run();
}
```

**重要说明：**
- `#[bevy_main]` 宏在 Android 平台上会生成 `android_main` 函数
- 自动处理 Android 应用程序的初始化和 `ANDROID_APP` 的设置
- 在其他平台上该宏为空操作，保证代码兼容性

### 3.2 访问 Android 应用实例

```rust
#[cfg(target_os = "android")]
fn get_android_app() -> Option<&'static bevy::android::android_activity::AndroidApp> {
    bevy::android::ANDROID_APP.get()
}

// 安全的访问方式
fn access_android_features() {
    #[cfg(target_os = "android")]
    {
        if let Some(android_app) = bevy::android::ANDROID_APP.get() {
            // 访问 Asset Manager
            let asset_manager = android_app.asset_manager();

            // 获取应用配置
            let config = android_app.config();

            // 处理输入事件
            // android_app 提供了事件循环和输入处理的接口
        }
    }
}
```

### 3.3 资源文件访问示例

```rust
use bevy::prelude::*;
use bevy::asset::AssetServer;

fn load_android_assets(asset_server: Res<AssetServer>) {
    // 在 Android 上，这会自动使用 AndroidAssetReader
    let texture: Handle<Image> = asset_server.load("textures/sprite.png");
    let audio: Handle<AudioSource> = asset_server.load("sounds/music.ogg");

    // Android 资源系统会从 APK 的 assets 目录读取文件
}
```

### 3.4 自定义 Android 功能扩展

```rust
#[cfg(target_os = "android")]
use bevy::android::android_activity::{AndroidApp, InputStatus};

#[cfg(target_os = "android")]
fn handle_android_input() -> impl Fn() {
    move || {
        if let Some(android_app) = bevy::android::ANDROID_APP.get() {
            // 处理 Android 特定的输入事件
            // 例如：处理返回键、菜单键等

            // 获取窗口信息
            if let Some(native_window) = android_app.native_window() {
                let width = native_window.width();
                let height = native_window.height();
                println!("Android 窗口尺寸: {}x{}", width, height);
            }
        }
    }
}

// 在系统中使用
fn setup_android_systems(app: &mut App) {
    #[cfg(target_os = "android")]
    app.add_systems(Update, handle_android_input());
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与 bevy_asset 的集成

**AndroidAssetReader 实现：**
```rust
// 位于 bevy_asset::io::android
pub struct AndroidAssetReader;

impl AssetReader for AndroidAssetReader {
    async fn read<'a>(&'a self, path: &'a Path) -> Result<impl Reader + 'a, AssetReaderError> {
        let asset_manager = bevy_android::ANDROID_APP
            .get()
            .expect("Bevy must be setup with the #[bevy_main] macro on Android")
            .asset_manager();
        // 使用 Android AssetManager 读取文件
    }
}
```

**特点：**
- 自动从 APK 的 assets 目录读取资源
- 支持目录遍历和文件类型检测
- 过滤 `.meta` 文件，只返回实际资源
- 不支持文件监听（Android 限制）

### 4.2 与 bevy_log 的集成

**AndroidLayer 日志实现：**
```rust
// 位于 bevy_log::android_tracing
pub(crate) struct AndroidLayer;

impl<S: Subscriber + for<'a> LookupSpan<'a>> Layer<S> for AndroidLayer {
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        // 将 Rust 日志转发到 Android logcat
        let priority = match *event.metadata().level() {
            Level::TRACE => android_log_sys::LogPriority::VERBOSE,
            Level::DEBUG => android_log_sys::LogPriority::DEBUG,
            Level::INFO => android_log_sys::LogPriority::INFO,
            Level::WARN => android_log_sys::LogPriority::WARN,
            Level::ERROR => android_log_sys::LogPriority::ERROR,
        };
        // 输出到 Android 日志系统
    }
}
```

### 4.3 与 bevy_winit 的集成

```rust
// 在 bevy_winit 中使用 Android App
#[cfg(target_os = "android")]
{
    let msg = "Bevy must be setup with the #[bevy_main] macro on Android";
    event_loop_builder
        .with_android_app(bevy_android::ANDROID_APP.get().expect(msg).clone());
}
```

**功能：**
- 将 Android 应用实例传递给 winit 事件循环
- 启用 Android 特定的窗口管理和输入处理
- 处理 Android 生命周期事件

### 4.4 与 bevy_derive 的集成

**#[bevy_main] 宏展开：**
```rust
#[bevy_main]
fn main() {
    // 用户代码
}

// 展开为：
#[unsafe(no_mangle)]
#[cfg(target_os = "android")]
fn android_main(android_app: bevy::android::android_activity::AndroidApp) {
    let _ = bevy::android::ANDROID_APP.set(android_app);
    main();
}

#[allow(unused)]
fn main() {
    // 用户代码
}
```

## 5. 常见使用场景

### 5.1 基础 Android 游戏开发

```rust
use bevy::prelude::*;

#[bevy_main]
fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "My Android Game".into(),
                resolution: (800.0, 600.0).into(),
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup_game)
        .add_systems(Update, game_update)
        .run();
}

fn setup_game(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 设置摄像机
    commands.spawn(Camera2dBundle::default());

    // 加载 Android 资源
    let texture = asset_server.load("sprites/player.png");
    commands.spawn(SpriteBundle {
        texture,
        ..default()
    });
}

fn game_update() {
    // 游戏逻辑更新
}
```

### 5.2 处理 Android 特定功能

```rust
use bevy::prelude::*;

#[derive(Resource)]
struct AndroidInfo {
    screen_width: u32,
    screen_height: u32,
    orientation: String,
}

fn setup_android_info(mut commands: Commands) {
    #[cfg(target_os = "android")]
    {
        if let Some(android_app) = bevy::android::ANDROID_APP.get() {
            let config = android_app.config();
            let info = AndroidInfo {
                screen_width: config.screen_width(),
                screen_height: config.screen_height(),
                orientation: format!("{:?}", config.orientation()),
            };
            commands.insert_resource(info);
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        // 非 Android 平台的默认值
        let info = AndroidInfo {
            screen_width: 1920,
            screen_height: 1080,
            orientation: "Landscape".to_string(),
        };
        commands.insert_resource(info);
    }
}
```

### 5.3 Android 生命周期处理

```rust
use bevy::prelude::*;

#[derive(Event)]
struct AndroidLifecycleEvent {
    event_type: String,
}

fn monitor_android_lifecycle(
    mut lifecycle_events: EventWriter<AndroidLifecycleEvent>,
) {
    #[cfg(target_os = "android")]
    {
        if let Some(android_app) = bevy::android::ANDROID_APP.get() {
            // 检查应用状态变化
            // 注意：实际实现需要更复杂的事件处理机制

            // 发送生命周期事件
            lifecycle_events.send(AndroidLifecycleEvent {
                event_type: "resumed".to_string(),
            });
        }
    }
}

fn handle_lifecycle_events(mut events: EventReader<AndroidLifecycleEvent>) {
    for event in events.read() {
        match event.event_type.as_str() {
            "paused" => {
                // 处理应用暂停
                println!("应用已暂停");
            }
            "resumed" => {
                // 处理应用恢复
                println!("应用已恢复");
            }
            _ => {}
        }
    }
}
```

### 5.4 性能优化和调试

```rust
use bevy::prelude::*;
use bevy::diagnostic::{DiagnosticsStore, FrameTimeDiagnosticsPlugin};

fn setup_android_performance_monitoring(mut commands: Commands) {
    // 添加性能监控插件
    commands.spawn_empty(); // 占位符
}

fn android_performance_system(diagnostics: Res<DiagnosticsStore>) {
    #[cfg(target_os = "android")]
    {
        if let Some(fps) = diagnostics.get(&FrameTimeDiagnosticsPlugin::FPS) {
            if let Some(fps_value) = fps.smoothed() {
                // 在 Android 设备上输出性能信息到 logcat
                bevy::log::info!("当前 FPS: {:.2}", fps_value);

                // 当性能低于阈值时采取行动
                if fps_value < 30.0 {
                    bevy::log::warn!("性能警告：FPS 低于 30");
                }
            }
        }
    }
}
```

## 6. 最佳实践和注意事项

### 6.1 必须使用的宏

- **始终使用 `#[bevy_main]`**：在 Android 平台上这是必需的
- 确保 main 函数名称正确，宏只能应用于名为 `main` 的函数

### 6.2 条件编译

```rust
// 推荐的条件编译模式
#[cfg(target_os = "android")]
fn android_specific_function() {
    // Android 特定实现
}

#[cfg(not(target_os = "android"))]
fn android_specific_function() {
    // 其他平台的替代实现或空实现
}
```

### 6.3 错误处理

```rust
// 安全的 Android App 访问
fn safe_android_access() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "android")]
    {
        let android_app = bevy::android::ANDROID_APP
            .get()
            .ok_or("Android app not initialized")?;

        // 使用 android_app...
        Ok(())
    }

    #[cfg(not(target_os = "android"))]
    Ok(())
}
```

### 6.4 资源路径注意事项

- Android 资源文件应放在 `assets/` 目录下
- 路径使用 Unix 风格的斜杠 `/`
- 避免使用绝对路径，使用相对于 assets 目录的路径

### 6.5 调试技巧

```rust
// 使用 Android 日志进行调试
fn debug_on_android() {
    #[cfg(target_os = "android")]
    {
        bevy::log::info!("这条消息会出现在 Android logcat 中");
        bevy::log::error!("错误信息也会被正确记录");
    }
}
```

### 6.6 内存管理

- Android 设备内存有限，注意资源使用
- 及时释放不需要的资源
- 监控内存使用情况，避免 OOM

## 7. 故障排除

### 7.1 常见错误

**错误：** "Bevy must be setup with the #[bevy_main] macro on Android"
**解决：** 确保在 main 函数上添加 `#[bevy_main]` 宏

**错误：** 资源加载失败
**解决：** 检查资源文件是否正确放置在 assets 目录下

**错误：** 编译失败
**解决：** 确保 Android NDK 和相关工具链正确配置

### 7.2 调试步骤

1. 检查 logcat 输出：`adb logcat`
2. 验证资源文件路径和权限
3. 确认 Android 版本兼容性
4. 检查 Cargo.toml 中的依赖配置

通过遵循这些指南和最佳实践，您可以有效地使用 `bevy_android` 模块开发高质量的 Android 应用程序。