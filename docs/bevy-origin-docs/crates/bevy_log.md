# Bevy Log 模块文档

## 1. 模块概述和主要功能

`bevy_log` 是 Bevy 引擎的日志记录模块，提供了完整的日志记录功能和配置。该模块基于 Rust 的 `tracing` 生态系统构建，为不同平台提供了专门优化的日志处理器。

### 主要功能
- **跨平台日志记录**：支持桌面、Web（WASM）、Android 和 iOS 平台
- **结构化日志**：基于 `tracing` 提供结构化和可过滤的日志
- **性能监控集成**：支持 Tracy 和 Chrome tracing 进行性能分析
- **环境变量配置**：支持通过 `RUST_LOG` 环境变量动态配置日志级别
- **可定制日志层**：允许用户添加自定义日志处理层

### 平台特定实现
- **桌面平台**：使用 `tracing-subscriber` 输出到标准错误流
- **Android**：使用 `android_log-sys` 输出到 Android 系统日志
- **WASM**：使用 `tracing-wasm` 输出到浏览器控制台
- **iOS**：使用 `tracing-oslog` 输出到系统日志

## 2. 核心结构体和枚举说明

### LogPlugin 结构体
```rust
pub struct LogPlugin {
    pub filter: String,                                    // 日志过滤器字符串
    pub level: Level,                                      // 全局日志级别
    pub custom_layer: fn(app: &mut App) -> Option<BoxedLayer>,  // 自定义日志层
    pub fmt_layer: fn(app: &mut App) -> Option<BoxedFmtLayer>,  // 格式化日志层
}
```

#### 字段说明
- **filter**: 使用 `EnvFilter` 格式的日志过滤器，例如 `"wgpu=error,bevy_render=info"`
- **level**: 全局日志级别，可选值为 `TRACE`、`DEBUG`、`INFO`、`WARN`、`ERROR`
- **custom_layer**: 可选的自定义日志层函数，用于添加额外的日志处理逻辑
- **fmt_layer**: 可选的格式化层函数，用于覆盖默认的日志格式

### 日志级别 (Level)
```rust
pub use tracing::Level;
```
- **TRACE**: 最详细的日志级别，用于跟踪程序执行
- **DEBUG**: 调试信息，通常在开发时使用
- **INFO**: 一般信息，默认显示的有用信息
- **WARN**: 警告信息，表示潜在问题
- **ERROR**: 错误信息，表示程序出现问题

### 类型别名
```rust
pub type BoxedLayer = Box<dyn Layer<Registry> + Send + Sync + 'static>;
pub type BoxedFmtLayer = Box<dyn Layer<PreFmtSubscriber> + Send + Sync + 'static>;
```

## 3. 主要API使用示例

### 基本日志记录
```rust
use bevy_log::*;

fn my_system() {
    // 不同级别的日志记录
    trace!("详细的跟踪信息");
    debug!("调试信息: {:?}", some_value);
    info!("一般信息");
    warn!("警告信息");
    error!("错误信息");

    // 结构化日志记录
    info!(player_id = 123, health = 100, "玩家状态更新");

    // 使用 span 进行上下文跟踪
    let _span = info_span!("游戏循环").entered();
    debug!("在游戏循环上下文中的日志");
}
```

### 一次性日志记录（避免每帧重复）
```rust
use bevy_log::*;

fn frequent_system() {
    // 这些宏确保日志只在每个调用点记录一次
    trace_once!("这条跟踪日志只会显示一次");
    debug_once!("调试信息只显示一次");
    info_once!("信息只显示一次");
    warn_once!("警告只显示一次");
    error_once!("错误只显示一次");
}
```

### LogPlugin 基本配置
```rust
use bevy_app::{App, DefaultPlugins, PluginGroup};
use bevy_log::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(LogPlugin {
            level: Level::DEBUG,
            filter: "wgpu=error,bevy_render=info,bevy_ecs=trace".to_string(),
            ..Default::default()
        }))
        .run();
}
```

### 高级配置示例
```rust
use bevy_app::{App, DefaultPlugins, PluginGroup};
use bevy_log::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(LogPlugin {
            filter: "warn,my_game=trace".to_string(),
            level: Level::TRACE,
            custom_layer: |app| {
                // 添加自定义日志层
                Some(Box::new(MyCustomLayer::new()))
            },
            fmt_layer: |app| {
                // 自定义格式化层，移除时间戳
                Some(Box::new(
                    tracing_subscriber::fmt::Layer::default()
                        .without_time()
                        .with_writer(std::io::stderr)
                ))
            },
        }))
        .run();
}
```

### 环境变量配置
```bash
# 设置全局日志级别
export RUST_LOG=debug

# 设置特定模块的日志级别
export RUST_LOG="warn,my_game=trace,bevy_render=info"

# 禁用颜色输出
export NO_COLOR=1

# 启用 Chrome tracing（如果编译时启用了该功能）
export TRACE_CHROME=/path/to/trace.json
```

### 禁用默认日志插件
```rust
use bevy_app::{App, DefaultPlugins, PluginGroup};
use bevy_log::LogPlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.build().disable::<LogPlugin>())
        .run();
}
```

## 4. 与其他 Bevy 模块的集成方式

### 与 App 的集成
```rust
impl Plugin for LogPlugin {
    fn build(&self, app: &mut App) {
        // LogPlugin 作为插件集成到 Bevy 应用中
        // 设置全局日志订阅器和过滤器
    }
}
```

### 依赖的 Bevy 模块
- **bevy_app**: 提供插件系统和应用构建器
- **bevy_utils**: 提供实用工具，如 `once!` 宏
- **bevy_platform**: 提供平台特定的类型和功能
- **bevy_ecs**: 用于资源管理（如 Chrome tracing 的刷新守护）

### 在系统中使用日志
```rust
use bevy_ecs::prelude::*;
use bevy_log::*;

fn player_movement_system(
    mut query: Query<&mut Transform, With<Player>>,
) {
    for mut transform in query.iter_mut() {
        debug!("更新玩家位置: {:?}", transform.translation);

        // 移动逻辑...
        transform.translation.x += 1.0;

        info!(
            x = transform.translation.x,
            y = transform.translation.y,
            "玩家移动到新位置"
        );
    }
}
```

### 与性能分析工具集成
```rust
// 启用 Tracy 性能分析（需要在 Cargo.toml 中启用相关特性）
#[cfg(feature = "tracing-tracy")]
fn performance_critical_system() {
    let _span = debug_span!("性能关键系统").entered();

    // 系统逻辑...
    debug!("执行性能关键操作");
}
```

## 5. 常见使用场景

### 场景1：游戏开发调试
```rust
use bevy_log::*;

// 玩家系统调试
fn player_debug_system(
    query: Query<(Entity, &Transform, &Health), With<Player>>,
) {
    for (entity, transform, health) in query.iter() {
        debug_once!(
            "玩家 {:?} 位置: {:?}, 生命值: {}",
            entity,
            transform.translation,
            health.current
        );
    }
}

// 碰撞检测调试
fn collision_system() {
    let _span = trace_span!("碰撞检测").entered();

    // 碰撞检测逻辑...
    if collision_detected {
        warn!("检测到碰撞事件");
    }
}
```

### 场景2：性能监控
```rust
use bevy_log::*;

fn render_system() {
    let _span = debug_span!("渲染系统").entered();

    let start = std::time::Instant::now();

    // 渲染逻辑...

    let duration = start.elapsed();
    if duration.as_millis() > 16 {
        warn!("渲染帧时间过长: {:?}", duration);
    } else {
        trace!("渲染完成，耗时: {:?}", duration);
    }
}
```

### 场景3：错误处理和调试
```rust
use bevy_log::*;

fn asset_loading_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    match asset_server.load::<Image>("player.png") {
        Ok(handle) => {
            info!("成功加载资源: player.png");
            commands.spawn(ImageComponent(handle));
        }
        Err(e) => {
            error!("加载资源失败: {:?}", e);
        }
    }
}
```

### 场景4：模块特定的日志配置
```rust
// 为不同模块设置不同的日志级别
fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(LogPlugin {
            filter: concat!(
                "warn,",                    // 默认警告级别
                "my_game::player=debug,",   // 玩家模块详细日志
                "my_game::render=info,",    // 渲染模块一般信息
                "my_game::physics=trace,",  // 物理模块跟踪级别
                "wgpu=error"               // GPU 库只显示错误
            ).to_string(),
            level: Level::TRACE,
            ..Default::default()
        }))
        .run();
}
```

### 场景5：生产环境配置
```rust
fn main() {
    let log_config = if cfg!(debug_assertions) {
        // 开发环境：详细日志
        LogPlugin {
            filter: "debug,wgpu=warn".to_string(),
            level: Level::DEBUG,
            ..Default::default()
        }
    } else {
        // 生产环境：精简日志
        LogPlugin {
            filter: "warn,my_game=info".to_string(),
            level: Level::WARN,
            ..Default::default()
        }
    };

    App::new()
        .add_plugins(DefaultPlugins.set(log_config))
        .run();
}
```

## 重要注意事项

1. **避免重复初始化**: LogPlugin 不应在同一进程中多次添加，这会导致 panic
2. **性能考虑**: 运行时过滤器会有性能开销，考虑使用编译时过滤器优化性能
3. **平台特定行为**: 不同平台的日志输出位置和格式可能不同
4. **环境变量优先级**: `RUST_LOG` 环境变量会覆盖 LogPlugin 的配置
5. **线程安全**: 所有日志操作都是线程安全的，可以在多线程环境中安全使用

## 编译特性

在 `Cargo.toml` 中可以启用以下特性：

```toml
[dependencies]
bevy_log = { version = "0.17.0-dev", features = [
    "trace",              # 启用错误追踪
    "tracing-chrome",     # 启用 Chrome DevTools 性能分析
    "tracing-tracy",      # 启用 Tracy 性能分析器
    "trace_tracy_memory", # 启用 Tracy 内存分析
]}
```

这份文档涵盖了 `bevy_log` 模块的主要功能、API 使用方法和常见场景，帮助开发者有效地在 Bevy 项目中使用日志记录功能。