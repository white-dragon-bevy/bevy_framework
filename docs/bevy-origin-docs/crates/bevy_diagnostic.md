# Bevy 诊断模块 (bevy_diagnostic) 详细文档

## 1. 模块概述和主要功能

`bevy_diagnostic` 是 Bevy 引擎的诊断模块，提供了游戏性能监控和系统信息收集的功能。该模块允许开发者轻松地在 Bevy 应用程序中添加诊断功能，提高监控和优化游戏性能的能力。

### 主要功能特性：
- **性能指标监控**：帧率 (FPS)、帧时间、帧计数等
- **实体计数统计**：当前活跃的实体数量
- **系统信息收集**：CPU使用率、内存使用率、系统信息
- **历史数据记录**：支持时间序列数据存储和平滑计算
- **日志输出**：将诊断数据输出到控制台
- **可配置过滤**：选择性监控特定指标

### 支持的平台：
- Linux
- Windows
- macOS
- Android
- FreeBSD

注意：在使用 `bevy/dynamic` 特性时，部分系统信息功能不可用。

## 2. 核心结构体和枚举说明

### 2.1 DiagnosticPath - 诊断路径

```rust
pub struct DiagnosticPath {
    path: Cow<'static, str>,
    hash: u64,
}
```

**功能说明**：
- 唯一标识诊断指标的路径，使用 `/` 分隔
- 支持编译时常量创建，运行时哈希优化
- 用于快速查找和区分不同的诊断指标

**使用要求**：
- 不能为空
- 不能以 `/` 开头或结尾
- 不能包含空组件

**创建方法**：
```rust
// 编译时创建（推荐）
const MY_DIAGNOSTIC: DiagnosticPath = DiagnosticPath::const_new("my_app/custom_metric");

// 运行时创建
let path = DiagnosticPath::new("runtime/metric");

// 从组件创建
let path = DiagnosticPath::from_components(["app", "performance", "fps"]);
```

### 2.2 DiagnosticMeasurement - 诊断测量

```rust
pub struct DiagnosticMeasurement {
    pub time: Instant,  // 测量时间
    pub value: f64,     // 测量值
}
```

**功能说明**：
- 单次测量的数据点，包含时间戳和数值
- 所有诊断数据的基本单位

### 2.3 Diagnostic - 诊断指标

```rust
pub struct Diagnostic {
    path: DiagnosticPath,           // 诊断路径
    pub suffix: Cow<'static, str>,  // 单位后缀 (如 "ms", "%")
    history: VecDeque<DiagnosticMeasurement>, // 历史数据
    sum: f64,                       // 历史数据总和
    ema: f64,                       // 指数移动平均
    ema_smoothing_factor: f64,      // 平滑因子
    max_history_length: usize,      // 最大历史长度
    pub is_enabled: bool,           // 是否启用
}
```

**主要方法**：
- `new(path)` - 创建新的诊断指标
- `with_max_history_length(length)` - 设置历史长度
- `with_suffix(suffix)` - 设置单位后缀
- `with_smoothing_factor(factor)` - 设置平滑因子
- `add_measurement(measurement)` - 添加测量数据
- `value()` - 获取最新值
- `average()` - 获取平均值
- `smoothed()` - 获取平滑值
- `duration()` - 获取测量时间跨度

### 2.4 DiagnosticsStore - 诊断存储

```rust
#[derive(Debug, Default, Resource)]
pub struct DiagnosticsStore {
    diagnostics: HashMap<DiagnosticPath, Diagnostic, PassHash>,
}
```

**功能说明**：
- 全局诊断数据存储，作为 ECS 资源
- 管理所有注册的诊断指标
- 提供快速查找和更新功能

**主要方法**：
- `add(diagnostic)` - 添加诊断指标
- `get(path)` - 获取诊断指标
- `get_mut(path)` - 获取可变诊断指标
- `get_measurement(path)` - 获取最新测量值
- `iter()` - 迭代所有诊断指标

### 2.5 Diagnostics - 诊断系统参数

```rust
#[derive(SystemParam)]
pub struct Diagnostics<'w, 's> {
    store: Res<'w, DiagnosticsStore>,
    queue: Deferred<'s, DiagnosticsBuffer>,
}
```

**功能说明**：
- 用于系统中记录诊断数据的参数
- 支持延迟写入，提高性能
- 只有启用的诊断指标才会被记录

**使用方法**：
```rust
fn my_diagnostic_system(mut diagnostics: Diagnostics) {
    diagnostics.add_measurement(&MY_METRIC_PATH, || {
        // 计算指标值（仅在指标启用时执行）
        calculate_expensive_metric()
    });
}
```

### 2.6 FrameCount - 帧计数

```rust
#[derive(Debug, Default, Resource, Clone, Copy)]
pub struct FrameCount(pub u32);
```

**功能说明**：
- 记录应用启动以来的总帧数
- 在 `Last` 调度中更新，提供可预测的行为
- 支持溢出包装（u32::MAX 后回到 0）

### 2.7 SystemInfo - 系统信息

```rust
#[derive(Debug, Resource)]
pub struct SystemInfo {
    pub os: String,          // 操作系统名称和版本
    pub kernel: String,      // 内核版本
    pub cpu: String,         // CPU 型号
    pub core_count: String,  // 物理核心数
    pub memory: String,      // 系统内存 (GiB)
}
```

## 3. 主要 API 使用示例

### 3.1 基本设置

```rust
use bevy::prelude::*;
use bevy_diagnostic::{
    DiagnosticsPlugin, FrameTimeDiagnosticsPlugin, LogDiagnosticsPlugin,
    EntityCountDiagnosticsPlugin, SystemInformationDiagnosticsPlugin
};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        // 添加核心诊断插件
        .add_plugins(DiagnosticsPlugin)
        // 添加帧时间诊断
        .add_plugins(FrameTimeDiagnosticsPlugin::default())
        // 添加实体计数诊断
        .add_plugins(EntityCountDiagnosticsPlugin::default())
        // 添加系统信息诊断（需要 sysinfo_plugin 特性）
        .add_plugins(SystemInformationDiagnosticsPlugin)
        // 添加日志输出
        .add_plugins(LogDiagnosticsPlugin::default())
        .run();
}
```

### 3.2 自定义诊断指标

```rust
use bevy_diagnostic::{Diagnostic, DiagnosticPath, RegisterDiagnostic, Diagnostics};

// 定义自定义诊断路径
const PLAYER_HEALTH: DiagnosticPath = DiagnosticPath::const_new("game/player/health");
const ENEMY_COUNT: DiagnosticPath = DiagnosticPath::const_new("game/enemies/count");

fn setup_custom_diagnostics(app: &mut App) {
    app
        // 注册血量诊断，单位为 HP
        .register_diagnostic(
            Diagnostic::new(PLAYER_HEALTH)
                .with_suffix(" HP")
                .with_max_history_length(60)
        )
        // 注册敌人数量诊断
        .register_diagnostic(
            Diagnostic::new(ENEMY_COUNT)
                .with_max_history_length(120)
        )
        .add_systems(Update, (
            track_player_health,
            track_enemy_count,
        ));
}

fn track_player_health(
    mut diagnostics: Diagnostics,
    query: Query<&Health, With<Player>>,
) {
    if let Ok(health) = query.get_single() {
        diagnostics.add_measurement(&PLAYER_HEALTH, || health.current as f64);
    }
}

fn track_enemy_count(
    mut diagnostics: Diagnostics,
    query: Query<&Enemy>,
) {
    diagnostics.add_measurement(&ENEMY_COUNT, || query.iter().count() as f64);
}
```

### 3.3 配置日志输出

```rust
use bevy_diagnostic::{LogDiagnosticsPlugin, DiagnosticPath};
use bevy_platform::collections::HashSet;
use core::time::Duration;

fn setup_filtered_logging() -> LogDiagnosticsPlugin {
    // 创建过滤器，只输出特定诊断
    let mut filter = HashSet::new();
    filter.insert(FrameTimeDiagnosticsPlugin::FPS);
    filter.insert(FrameTimeDiagnosticsPlugin::FRAME_TIME);
    filter.insert(PLAYER_HEALTH);

    LogDiagnosticsPlugin {
        debug: false,                           // 不使用调试模式
        wait_duration: Duration::from_secs(2),  // 每2秒输出一次
        filter: Some(filter),                   // 应用过滤器
    }
}

// 运行时修改日志配置
fn modify_logging_at_runtime(
    mut log_state: ResMut<LogDiagnosticsState>,
) {
    // 修改输出间隔
    log_state.set_timer_duration(Duration::from_secs(5));

    // 添加新的过滤器
    log_state.add_filter(ENEMY_COUNT);

    // 移除过滤器
    log_state.remove_filter(&PLAYER_HEALTH);

    // 清空所有过滤器
    log_state.clear_filter();
}
```

### 3.4 读取诊断数据

```rust
fn read_diagnostics(diagnostics_store: Res<DiagnosticsStore>) {
    // 读取 FPS 数据
    if let Some(fps_diagnostic) = diagnostics_store.get(&FrameTimeDiagnosticsPlugin::FPS) {
        if let Some(fps) = fps_diagnostic.smoothed() {
            println!("平滑 FPS: {:.2}", fps);
        }

        if let Some(avg_fps) = fps_diagnostic.average() {
            println!("平均 FPS: {:.2}", avg_fps);
        }

        if let Some(current_fps) = fps_diagnostic.value() {
            println!("当前 FPS: {:.2}", current_fps);
        }
    }

    // 读取帧时间数据
    if let Some(frame_time) = diagnostics_store
        .get_measurement(&FrameTimeDiagnosticsPlugin::FRAME_TIME)
    {
        println!("帧时间: {:.2}ms", frame_time.value);
    }

    // 遍历所有诊断数据
    for diagnostic in diagnostics_store.iter() {
        if diagnostic.is_enabled && diagnostic.history_len() > 0 {
            println!(
                "{}: {:.2}{}",
                diagnostic.path(),
                diagnostic.value().unwrap_or(0.0),
                diagnostic.suffix
            );
        }
    }
}
```

### 3.5 性能优化建议

```rust
// 使用条件测量避免不必要的计算
fn optimized_diagnostic_system(
    mut diagnostics: Diagnostics,
    expensive_query: Query<&ExpensiveComponent>,
) {
    // 只有在诊断启用时才执行昂贵的计算
    diagnostics.add_measurement(&EXPENSIVE_METRIC, || {
        expensive_query.iter()
            .map(|comp| comp.calculate_expensive_value())
            .sum::<f64>()
    });
}

// 调整历史长度以平衡内存使用和数据精度
fn setup_memory_efficient_diagnostics(app: &mut App) {
    app.register_diagnostic(
        Diagnostic::new(HIGH_FREQUENCY_METRIC)
            .with_max_history_length(30)  // 减少内存使用
            .with_smoothing_factor(0.1)   // 增加平滑度
    );
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与 bevy_time 集成

```rust
use bevy_time::{Real, Time, Timer, TimerMode};

fn time_based_diagnostics(
    time: Res<Time<Real>>,
    mut diagnostics: Diagnostics,
    mut timer: Local<Timer>,
) {
    // 基于真实时间的测量
    diagnostics.add_measurement(&REAL_TIME_METRIC, || {
        time.delta_secs_f64() * 1000.0  // 转换为毫秒
    });

    // 定时测量
    if timer.tick(time.delta()).is_finished() {
        diagnostics.add_measurement(&PERIODIC_METRIC, || {
            calculate_periodic_value()
        });
    }
}
```

### 4.2 与 bevy_ecs 集成

```rust
use bevy_ecs::{entity::Entities, system::SystemParam};

fn ecs_diagnostics(
    entities: &Entities,
    mut diagnostics: Diagnostics,
    components: Query<&MyComponent>,
    changed_components: Query<&MyComponent, Changed<MyComponent>>,
) {
    // 实体计数
    diagnostics.add_measurement(&ENTITY_COUNT, || entities.len() as f64);

    // 组件计数
    diagnostics.add_measurement(&COMPONENT_COUNT, || components.iter().count() as f64);

    // 变化的组件计数
    diagnostics.add_measurement(&CHANGED_COMPONENTS, || {
        changed_components.iter().count() as f64
    });
}
```

### 4.3 与 bevy_app 集成

```rust
use bevy_app::{App, Plugin, Startup, Update, Last};

pub struct GameDiagnosticsPlugin;

impl Plugin for GameDiagnosticsPlugin {
    fn build(&self, app: &mut App) {
        // 在启动时注册诊断
        app.add_systems(Startup, setup_game_diagnostics)
           // 在更新时收集数据
           .add_systems(Update, collect_game_diagnostics)
           // 在最后处理诊断数据
           .add_systems(Last, process_diagnostics);
    }
}

fn setup_game_diagnostics(app: &mut App) {
    app.register_diagnostic(
        Diagnostic::new(GAME_SCORE)
            .with_suffix(" pts")
            .with_max_history_length(100)
    );
}
```

### 4.4 与 bevy_render 集成

```rust
// 渲染相关诊断（需要在渲染阶段）
fn render_diagnostics(
    mut diagnostics: Diagnostics,
    render_device: Res<RenderDevice>,
) {
    diagnostics.add_measurement(&GPU_MEMORY_USAGE, || {
        // 获取 GPU 内存使用情况（伪代码）
        get_gpu_memory_usage(&render_device)
    });
}
```

## 5. 常见使用场景

### 5.1 游戏性能监控

```rust
// 完整的性能监控设置
fn setup_performance_monitoring(app: &mut App) {
    app
        // 基础诊断
        .add_plugins(DiagnosticsPlugin)
        .add_plugins(FrameTimeDiagnosticsPlugin::default())
        .add_plugins(EntityCountDiagnosticsPlugin::default())

        // 自定义游戏性能指标
        .register_diagnostic(Diagnostic::new(DRAW_CALLS).with_suffix(" calls"))
        .register_diagnostic(Diagnostic::new(AUDIO_SOURCES).with_suffix(" sources"))
        .register_diagnostic(Diagnostic::new(PHYSICS_BODIES).with_suffix(" bodies"))

        // 性能监控系统
        .add_systems(Update, (
            monitor_rendering_performance,
            monitor_audio_performance,
            monitor_physics_performance,
        ))

        // 自定义日志输出
        .add_plugins(LogDiagnosticsPlugin {
            debug: false,
            wait_duration: Duration::from_secs(1),
            filter: None,  // 输出所有诊断
        });
}

const DRAW_CALLS: DiagnosticPath = DiagnosticPath::const_new("render/draw_calls");
const AUDIO_SOURCES: DiagnosticPath = DiagnosticPath::const_new("audio/active_sources");
const PHYSICS_BODIES: DiagnosticPath = DiagnosticPath::const_new("physics/rigid_bodies");
```

### 5.2 调试和分析

```rust
// 调试模式下的详细诊断
fn setup_debug_diagnostics(app: &mut App) {
    if cfg!(debug_assertions) {
        app
            .register_diagnostic(
                Diagnostic::new(MEMORY_ALLOCATIONS)
                    .with_suffix(" allocs")
                    .with_max_history_length(300)  // 更长的历史
            )
            .register_diagnostic(
                Diagnostic::new(SYSTEM_EXECUTION_TIME)
                    .with_suffix("μs")
                    .with_smoothing_factor(0.05)  // 更少的平滑
            )
            .add_systems(Update, (
                track_memory_allocations,
                track_system_performance,
            ));
    }
}

const MEMORY_ALLOCATIONS: DiagnosticPath = DiagnosticPath::const_new("debug/memory/allocations");
const SYSTEM_EXECUTION_TIME: DiagnosticPath = DiagnosticPath::const_new("debug/systems/execution_time");
```

### 5.3 资源使用监控

```rust
// 监控各种资源的使用情况
fn setup_resource_monitoring(app: &mut App) {
    app
        .register_diagnostic(Diagnostic::new(TEXTURE_MEMORY).with_suffix(" MB"))
        .register_diagnostic(Diagnostic::new(MESH_COUNT).with_suffix(" meshes"))
        .register_diagnostic(Diagnostic::new(MATERIAL_COUNT).with_suffix(" materials"))
        .add_systems(Update, (
            monitor_texture_memory,
            monitor_mesh_usage,
            monitor_material_usage,
        ));
}

fn monitor_texture_memory(
    mut diagnostics: Diagnostics,
    textures: Res<Assets<Image>>,
) {
    diagnostics.add_measurement(&TEXTURE_MEMORY, || {
        textures.iter()
            .map(|(_, texture)| texture.data.len() as f64 / 1024.0 / 1024.0)
            .sum::<f64>()
    });
}
```

### 5.4 网络性能监控

```rust
// 网络相关诊断
const NETWORK_LATENCY: DiagnosticPath = DiagnosticPath::const_new("network/latency");
const PACKET_LOSS: DiagnosticPath = DiagnosticPath::const_new("network/packet_loss");
const BANDWIDTH_USAGE: DiagnosticPath = DiagnosticPath::const_new("network/bandwidth");

fn setup_network_monitoring(app: &mut App) {
    app
        .register_diagnostic(Diagnostic::new(NETWORK_LATENCY).with_suffix("ms"))
        .register_diagnostic(Diagnostic::new(PACKET_LOSS).with_suffix("%"))
        .register_diagnostic(Diagnostic::new(BANDWIDTH_USAGE).with_suffix(" KB/s"))
        .add_systems(Update, monitor_network_performance);
}

fn monitor_network_performance(
    mut diagnostics: Diagnostics,
    network_stats: Res<NetworkStats>,  // 假设的网络统计资源
) {
    diagnostics.add_measurement(&NETWORK_LATENCY, || network_stats.latency_ms);
    diagnostics.add_measurement(&PACKET_LOSS, || network_stats.packet_loss_percent);
    diagnostics.add_measurement(&BANDWIDTH_USAGE, || network_stats.bandwidth_kb_per_sec);
}
```

### 5.5 条件性诊断

```rust
// 根据游戏状态启用/禁用诊断
fn conditional_diagnostics(
    mut diagnostics_store: ResMut<DiagnosticsStore>,
    game_state: Res<GameState>,
) {
    match game_state.current() {
        GameState::Menu => {
            // 在菜单中禁用游戏相关诊断
            if let Some(diagnostic) = diagnostics_store.get_mut(&PLAYER_HEALTH) {
                diagnostic.is_enabled = false;
            }
        },
        GameState::Playing => {
            // 在游戏中启用所有诊断
            for diagnostic in diagnostics_store.iter_mut() {
                diagnostic.is_enabled = true;
            }
        },
        GameState::Paused => {
            // 暂停时只保留基础性能诊断
            for diagnostic in diagnostics_store.iter_mut() {
                diagnostic.is_enabled = diagnostic.path().as_str().starts_with("fps") ||
                                       diagnostic.path().as_str().starts_with("frame_time");
            }
        },
    }
}
```

## 6. 最佳实践和注意事项

### 6.1 性能考虑
- 使用延迟函数避免不必要的计算
- 适当设置历史长度平衡内存和精度
- 在发布版本中禁用或减少诊断数据收集

### 6.2 数据精度
- 选择合适的平滑因子
- 考虑测量频率对平均值的影响
- 使用适当的单位和后缀提高可读性

### 6.3 调试友好
- 使用描述性的诊断路径名称
- 在开发阶段使用调试模式查看完整信息
- 合理使用过滤器避免信息过载

这个诊断模块为 Bevy 应用程序提供了强大的性能监控和分析能力，是优化游戏性能的重要工具。