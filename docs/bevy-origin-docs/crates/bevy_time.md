# Bevy Time 模块详细文档

## 概述

`bevy_time` 是 Bevy 游戏引擎的内置时间管理模块，提供了强大而灵活的时间跟踪功能。该模块为游戏开发提供了多种时间上下文，包括真实时间、虚拟游戏时间和固定时间步长，能够满足不同类型游戏逻辑的时间需求。

## 主要功能

- **多时间上下文**：提供真实时间、虚拟时间和固定时间步长
- **时间暂停和缩放**：支持游戏暂停和时间速度调节
- **精确计时器**：包含计时器和秒表功能
- **系统条件**：提供基于时间的运行条件
- **固定时间步长**：支持物理和游戏逻辑的固定更新频率

## 核心结构体和枚举

### 1. Time<T> - 通用时间结构

`Time<T>` 是核心的泛型时间结构，用于跟踪时间流逝。

```rust
pub struct Time<T: Default = ()> {
    context: T,
    wrap_period: Duration,
    delta: Duration,
    elapsed: Duration,
    // ... 其他内部字段
}
```

#### 主要方法

- `delta()` - 获取自上次更新以来的时间增量
- `elapsed()` - 获取自启动以来的总时间
- `delta_secs()` / `elapsed_secs()` - 以秒为单位的时间值
- `advance_by(duration)` - 手动推进时间
- `set_wrap_period(period)` - 设置时间包装周期

#### 使用示例

```rust
use bevy_time::Time;
use bevy_ecs::system::Res;

fn time_system(time: Res<Time>) {
    println!("帧时间: {:.3}秒", time.delta_secs());
    println!("总时间: {:.3}秒", time.elapsed_secs());
}
```

### 2. Real - 真实时间上下文

`Real` 结构体表示真实的墙钟时间，不受游戏暂停或时间缩放影响。

```rust
pub struct Real {
    startup: Instant,
    first_update: Option<Instant>,
    last_update: Option<Instant>,
}
```

#### 主要方法

- `startup()` - 获取应用启动时的时间点
- `first_update()` - 获取首次更新的时间点
- `last_update()` - 获取最后更新的时间点
- `update_with_instant(instant)` - 用指定时间点更新

#### 使用示例

```rust
use bevy_time::{Time, Real};
use bevy_ecs::system::Res;

fn real_time_system(real_time: Res<Time<Real>>) {
    println!("真实时间增量: {:.3}秒", real_time.delta_secs());
    println!("应用启动时间: {:?}", real_time.startup());
}
```

### 3. Virtual - 虚拟游戏时间上下文

`Virtual` 结构体表示可控制的虚拟游戏时间，支持暂停、缩放和最大增量限制。

```rust
pub struct Virtual {
    max_delta: Duration,
    paused: bool,
    relative_speed: f64,
    effective_speed: f64,
}
```

#### 主要方法

- `pause()` / `unpause()` - 暂停/恢复时间
- `is_paused()` / `was_paused()` - 检查暂停状态
- `set_relative_speed(speed)` - 设置相对速度
- `relative_speed()` / `effective_speed()` - 获取速度信息
- `set_max_delta(duration)` - 设置最大时间增量

#### 使用示例

```rust
use bevy_time::{Time, Virtual};
use bevy_ecs::system::{Res, ResMut};

fn game_time_control(mut virtual_time: ResMut<Time<Virtual>>) {
    // 暂停游戏
    virtual_time.pause();

    // 设置慢动作效果（半速）
    virtual_time.set_relative_speed(0.5);

    // 设置最大帧时间为100毫秒
    virtual_time.set_max_delta(Duration::from_millis(100));
}

fn game_logic_system(time: Res<Time<Virtual>>) {
    if !time.is_paused() {
        println!("游戏运行中，速度: {}", time.effective_speed());
    }
}
```

### 4. Fixed - 固定时间步长上下文

`Fixed` 结构体提供固定时间步长，适用于物理计算和需要固定更新频率的游戏逻辑。

```rust
pub struct Fixed {
    timestep: Duration,
    overstep: Duration,
}
```

#### 主要方法

- `timestep()` - 获取时间步长
- `set_timestep(duration)` - 设置时间步长
- `set_timestep_hz(hz)` - 按频率设置时间步长
- `overstep()` - 获取累积的超时
- `overstep_fraction()` - 获取超时的分数表示

#### 使用示例

```rust
use bevy_time::{Time, Fixed};
use bevy_ecs::system::{Res, ResMut};

fn setup_fixed_timestep(mut fixed_time: ResMut<Time<Fixed>>) {
    // 设置为60Hz
    fixed_time.set_timestep_hz(60.0);
}

fn physics_system(time: Res<Time<Fixed>>) {
    // 物理更新总是以固定时间步长运行
    println!("物理时间步长: {:.6}秒", time.delta_secs());
    println!("累积超时: {:.3}%", time.overstep_fraction() * 100.0);
}
```

### 5. Timer - 计时器

`Timer` 结构体提供精确的计时功能，支持一次性和重复模式。

```rust
pub struct Timer {
    stopwatch: Stopwatch,
    duration: Duration,
    mode: TimerMode,
    finished: bool,
    times_finished_this_tick: u32,
}

pub enum TimerMode {
    Once,      // 一次性
    Repeating, // 重复
}
```

#### 主要方法

- `new(duration, mode)` - 创建新计时器
- `from_seconds(seconds, mode)` - 从秒数创建
- `tick(delta)` - 推进计时器
- `is_finished()` / `just_finished()` - 检查完成状态
- `times_finished_this_tick()` - 获取本次tick完成次数
- `pause()` / `unpause()` - 暂停/恢复
- `reset()` - 重置计时器

#### 使用示例

```rust
use bevy_time::{Timer, TimerMode, Time};
use bevy_ecs::system::{Res, Local};
use core::time::Duration;

fn timer_system(time: Res<Time>, mut timer: Local<Timer>) {
    // 初始化计时器（仅第一次）
    if timer.duration() == Duration::ZERO {
        *timer = Timer::from_seconds(3.0, TimerMode::Repeating);
    }

    // 更新计时器
    timer.tick(time.delta());

    if timer.just_finished() {
        println!("计时器触发！已运行 {:.1} 秒", timer.elapsed_secs());
    }
}

// 延迟执行示例
fn delayed_action_system(time: Res<Time>, mut timer: Local<Timer>) {
    if timer.duration() == Duration::ZERO {
        *timer = Timer::from_seconds(5.0, TimerMode::Once);
    }

    timer.tick(time.delta());

    if timer.just_finished() {
        println!("延迟5秒后执行！");
    }
}
```

### 6. Stopwatch - 秒表

`Stopwatch` 结构体提供简单的时间测量功能。

```rust
pub struct Stopwatch {
    elapsed: Duration,
    is_paused: bool,
}
```

#### 主要方法

- `new()` - 创建新秒表
- `tick(delta)` - 推进秒表
- `elapsed()` / `elapsed_secs()` - 获取经过时间
- `pause()` / `unpause()` - 暂停/恢复
- `reset()` - 重置
- `set_elapsed(time)` - 设置经过时间

#### 使用示例

```rust
use bevy_time::{Stopwatch, Time};
use bevy_ecs::system::{Res, Local};

fn performance_monitor(time: Res<Time>, mut stopwatch: Local<Stopwatch>) {
    // 更新秒表
    stopwatch.tick(time.delta());

    // 每5秒报告一次
    if stopwatch.elapsed_secs() >= 5.0 {
        println!("已运行 {:.1} 秒", stopwatch.elapsed_secs());
        stopwatch.reset();
    }
}
```

## 常用运行条件

`bevy_time` 提供了多个方便的运行条件函数：

### 定时运行条件

```rust
use bevy_time::common_conditions::*;
use bevy_ecs::schedule::IntoScheduleConfigs;
use core::time::Duration;

fn setup_scheduled_systems(mut app: App) {
    app.add_systems(Update, (
        // 每秒运行一次
        auto_save.run_if(on_timer(Duration::from_secs(1))),

        // 使用真实时间，每2秒运行一次
        heartbeat.run_if(on_real_timer(Duration::from_secs(2))),

        // 延迟3秒后运行一次
        startup_complete.run_if(once_after_delay(Duration::from_secs(3))),

        // 延迟5秒后持续运行
        late_game_logic.run_if(repeating_after_delay(Duration::from_secs(5))),

        // 仅在游戏暂停时运行
        pause_menu.run_if(paused),
    ));
}

fn auto_save() {
    println!("自动保存游戏...");
}

fn heartbeat() {
    println!("心跳检测");
}

fn startup_complete() {
    println!("启动完成！");
}

fn late_game_logic() {
    println!("后期游戏逻辑");
}

fn pause_menu() {
    println!("显示暂停菜单");
}
```

## 时间更新策略

`TimePlugin` 支持多种时间更新策略：

```rust
use bevy_time::{TimeUpdateStrategy, TimePlugin};
use bevy_app::App;
use core::time::Duration;

fn setup_time_strategy(mut app: App) {
    app.add_plugins(TimePlugin)
       .insert_resource(TimeUpdateStrategy::Automatic); // 默认：自动更新

    // 或者手动控制
    // app.insert_resource(TimeUpdateStrategy::ManualDuration(Duration::from_millis(16)));
    // app.insert_resource(TimeUpdateStrategy::ManualInstant(specific_instant));
}
```

## 与其他Bevy模块的集成

### 1. 与ECS系统集成

```rust
use bevy_ecs::system::{Query, Res, ResMut};
use bevy_time::Time;

// 基本系统参数
fn movement_system(time: Res<Time>, mut query: Query<&mut Transform>) {
    for mut transform in query.iter_mut() {
        transform.translation.x += 100.0 * time.delta_secs();
    }
}

// 与组件交互
#[derive(Component)]
struct MovementSpeed(f32);

fn speed_based_movement(
    time: Res<Time>,
    mut query: Query<(&mut Transform, &MovementSpeed)>
) {
    for (mut transform, speed) in query.iter_mut() {
        transform.translation.x += speed.0 * time.delta_secs();
    }
}
```

### 2. 与应用调度集成

```rust
use bevy_app::{App, Update, FixedUpdate};
use bevy_time::{Time, Fixed};

fn setup_app_with_time() {
    App::new()
        .add_plugins(TimePlugin)
        .add_systems(Update, (
            // 这些系统使用虚拟时间
            game_logic,
            ui_updates,
        ))
        .add_systems(FixedUpdate, (
            // 这些系统使用固定时间步长
            physics_update,
            collision_detection,
        ))
        .run();
}

fn game_logic(time: Res<Time>) {
    // 使用默认时间（Update中为虚拟时间）
    println!("游戏逻辑 delta: {:.3}", time.delta_secs());
}

fn physics_update(time: Res<Time>) {
    // 使用默认时间（FixedUpdate中为固定时间）
    println!("物理更新 delta: {:.3}", time.delta_secs());
}
```

### 3. 与事件系统集成

```rust
use bevy_ecs::{event::*, system::*};
use bevy_time::*;

#[derive(Event)]
struct TimedEvent {
    message: String,
    timestamp: f64,
}

fn event_producer(time: Res<Time>, mut events: EventWriter<TimedEvent>) {
    events.send(TimedEvent {
        message: "定时事件".to_string(),
        timestamp: time.elapsed_secs_f64(),
    });
}

fn event_consumer(mut events: EventReader<TimedEvent>) {
    for event in events.read() {
        println!("收到事件: {} (时间: {:.3})", event.message, event.timestamp);
    }
}
```

## 常见使用场景

### 1. 游戏暂停系统

```rust
use bevy_time::{Time, Virtual};
use bevy_ecs::system::{ResMut, Res};
use bevy_input::{Input, KeyCode};

fn pause_system(
    keyboard: Res<Input<KeyCode>>,
    mut time: ResMut<Time<Virtual>>,
) {
    if keyboard.just_pressed(KeyCode::Space) {
        if time.is_paused() {
            time.unpause();
            println!("游戏恢复");
        } else {
            time.pause();
            println!("游戏暂停");
        }
    }
}
```

### 2. 慢动作效果

```rust
fn bullet_time_system(
    keyboard: Res<Input<KeyCode>>,
    mut time: ResMut<Time<Virtual>>,
) {
    if keyboard.pressed(KeyCode::Tab) {
        time.set_relative_speed(0.2); // 20%速度
    } else {
        time.set_relative_speed(1.0); // 正常速度
    }
}
```

### 3. 动画系统

```rust
#[derive(Component)]
struct AnimationTimer(Timer);

fn animation_system(
    time: Res<Time>,
    mut query: Query<(&mut AnimationTimer, &mut Sprite)>,
) {
    for (mut timer, mut sprite) in query.iter_mut() {
        timer.0.tick(time.delta());

        if timer.0.just_finished() {
            // 切换动画帧
            sprite.texture_atlas.index = (sprite.texture_atlas.index + 1) % 4;
        }
    }
}
```

### 4. 冷却系统

```rust
#[derive(Component)]
struct Weapon {
    cooldown: Timer,
    damage: f32,
}

fn weapon_system(
    time: Res<Time>,
    keyboard: Res<Input<KeyCode>>,
    mut query: Query<&mut Weapon>,
) {
    for mut weapon in query.iter_mut() {
        weapon.cooldown.tick(time.delta());

        if keyboard.just_pressed(KeyCode::Space) && weapon.cooldown.finished() {
            // 发射武器
            println!("发射！造成 {} 伤害", weapon.damage);
            weapon.cooldown.reset();
        }
    }
}
```

### 5. 性能监控

```rust
use bevy_time::{Stopwatch, Time};

struct PerformanceMonitor {
    frame_timer: Stopwatch,
    frame_count: u32,
}

fn performance_monitor_system(
    time: Res<Time>,
    mut monitor: Local<Option<PerformanceMonitor>>,
) {
    // 初始化
    if monitor.is_none() {
        *monitor = Some(PerformanceMonitor {
            frame_timer: Stopwatch::new(),
            frame_count: 0,
        });
    }

    let monitor = monitor.as_mut().unwrap();
    monitor.frame_timer.tick(time.delta());
    monitor.frame_count += 1;

    // 每秒报告FPS
    if monitor.frame_timer.elapsed_secs() >= 1.0 {
        println!("FPS: {}", monitor.frame_count);
        monitor.frame_timer.reset();
        monitor.frame_count = 0;
    }
}
```

### 6. 定时生成系统

```rust
#[derive(Component)]
struct Spawner {
    timer: Timer,
    spawn_rate: f32,
}

fn spawner_system(
    time: Res<Time>,
    mut commands: Commands,
    mut query: Query<(&mut Spawner, &Transform)>,
) {
    for (mut spawner, transform) in query.iter_mut() {
        spawner.timer.tick(time.delta());

        if spawner.timer.just_finished() {
            // 生成实体
            commands.spawn((
                Transform::from_translation(transform.translation),
                // 其他组件...
            ));

            // 重置计时器，基于生成速率
            spawner.timer = Timer::from_seconds(1.0 / spawner.spawn_rate, TimerMode::Once);
        }
    }
}
```

## 最佳实践

### 1. 时间类型选择

- **Time（默认）**：大多数游戏逻辑使用
- **Time<Real>**：UI、调试信息、与真实时间相关的功能
- **Time<Virtual>**：需要明确虚拟时间语义的系统
- **Time<Fixed>**：物理、网络同步、需要固定时间步长的逻辑

### 2. 性能考虑

```rust
// 好：缓存频繁计算的值
fn optimized_system(time: Res<Time>, mut cache: Local<f32>) {
    if *cache == 0.0 {
        *cache = time.delta_secs();
    }
    // 使用缓存的值...
}

// 避免：重复获取相同的时间值
fn inefficient_system(time: Res<Time>) {
    let dt = time.delta_secs();
    // 多次使用 dt 而不是重复调用 time.delta_secs()
}
```

### 3. 调试和测试

```rust
// 使用手动时间更新进行测试
fn test_time_dependent_logic() {
    let mut app = App::new();
    app.add_plugins(TimePlugin)
       .insert_resource(TimeUpdateStrategy::ManualDuration(Duration::from_millis(16)))
       .add_systems(Update, test_system);

    // 手动推进时间
    app.update();
}
```

## 注意事项

1. **时间精度**：`f32` 类型在长时间运行后会失去精度，考虑使用 `elapsed_secs_wrapped()` 或 `f64` 版本
2. **固定时间步长**：避免在固定更新中执行变长操作
3. **暂停处理**：确保所有时间相关逻辑正确处理暂停状态
4. **时间缩放**：记住时间缩放会影响所有基于虚拟时间的计算
5. **最大增量**：合理设置虚拟时间的最大增量以避免"死亡螺旋"

## 总结

`bevy_time` 模块为Bevy应用提供了完整的时间管理解决方案。通过理解不同时间上下文的用途和特性，开发者可以构建出响应式、可控制且性能良好的游戏时间系统。无论是简单的动画、复杂的物理模拟，还是高级的时间控制功能，这个模块都能提供所需的工具和抽象。