# Bevy App 模块详细操作文档

## 模块概述

`bevy_app` 是 Bevy 引擎的核心应用层模块，提供了应用程序的基础架构和生命周期管理功能。该模块主要负责：

- **应用程序结构**：提供 `App` 主结构体来组织和管理整个应用
- **插件系统**：支持模块化的插件架构，便于功能扩展
- **调度系统**：管理系统的执行顺序和时机
- **子应用管理**：支持多个独立的子应用程序
- **资源管理**：提供资源的注册和访问机制
- **事件系统**：支持消息和事件的处理

### 模块特性

根据 `Cargo.toml` 配置，该模块支持以下功能特性：

- `bevy_reflect`：运行时反射支持
- `reflect_functions`：函数反射扩展
- `trace`：追踪和调试支持
- `bevy_debug_stepping`：系统步进调试
- `error_panic_hook`：错误恐慌钩子
- `hotpatching`：热补丁功能
- `web`：Web 平台支持

## 核心结构体和枚举

### 1. App - 主应用结构体

`App` 是整个应用程序的核心结构体，负责管理应用的生命周期和资源。

```rust
pub struct App {
    pub(crate) sub_apps: SubApps,
    pub(crate) runner: RunnerFn,
    default_error_handler: Option<ErrorHandler>,
}
```

**主要功能：**
- 管理多个子应用 (`SubApps`)
- 控制应用运行器 (`RunnerFn`)
- 处理错误和异常

**构造方法：**
```rust
// 创建带有默认配置的新应用
let mut app = App::new();

// 创建空应用（最小配置）
let mut app = App::empty();
```

### 2. SubApp - 子应用结构体

`SubApp` 表示一个独立的子应用程序，拥有自己的 `World` 和调度系统。

```rust
pub struct SubApp {
    world: World,
    plugin_registry: Vec<Box<dyn Plugin>>,
    plugin_names: HashSet<String>,
    plugin_build_depth: usize,
    plugins_state: PluginsState,
    update_schedule: Option<InternedScheduleLabel>,
    extract: Option<ExtractFn>,
}
```

**主要功能：**
- 独立的世界状态管理
- 插件注册和管理
- 调度执行控制
- 数据提取机制

### 3. Plugin - 插件特征

`Plugin` 是模块化功能的核心特征，所有功能扩展都通过插件实现。

```rust
pub trait Plugin: Downcast + Any + Send + Sync {
    fn build(&self, app: &mut App);
    fn ready(&self, _app: &App) -> bool { true }
    fn finish(&self, _app: &mut App) {}
    fn cleanup(&self, _app: &mut App) {}
    fn name(&self) -> &str { core::any::type_name::<Self>() }
    fn is_unique(&self) -> bool { true }
}
```

**生命周期方法：**
- `build()`: 配置插件功能
- `ready()`: 检查插件是否准备就绪
- `finish()`: 完成插件设置
- `cleanup()`: 清理插件资源

### 4. PluginGroup - 插件组

`PluginGroup` 用于将多个相关插件组织在一起，便于批量管理。

### 5. PluginsState - 插件状态枚举

```rust
pub enum PluginsState {
    Adding,    // 正在添加插件
    Ready,     // 所有插件已准备就绪
    Finished,  // 插件完成初始化
    Cleaned,   // 插件已清理
}
```

### 6. RunMode - 运行模式枚举

```rust
pub enum RunMode {
    Loop { wait: Option<Duration> }, // 循环运行
    Once,                           // 运行一次
}
```

### 7. 调度标签 (Schedule Labels)

主要的调度标签包括：
- `First`: 第一个执行的调度
- `PreStartup`: 启动前调度
- `Startup`: 启动调度
- `PostStartup`: 启动后调度
- `PreUpdate`: 更新前调度
- `Update`: 主更新调度
- `PostUpdate`: 更新后调度
- `Last`: 最后执行的调度
- `FixedUpdate`: 固定时间步更新

## 主要API使用示例

### 1. 创建基本应用

```rust
use bevy_app::prelude::*;
use bevy_ecs::prelude::*;

fn main() {
    App::new()
        .add_systems(Update, hello_world_system)
        .run();
}

fn hello_world_system() {
    println!("Hello, World!");
}
```

### 2. 添加插件

```rust
// 添加单个插件
app.add_plugins(MyPlugin);

// 添加多个插件
app.add_plugins((PluginA, PluginB, PluginC));

// 添加插件组
app.add_plugins(MyPluginGroup);
```

### 3. 自定义插件实现

```rust
pub struct MyPlugin {
    pub enabled: bool,
}

impl Plugin for MyPlugin {
    fn build(&self, app: &mut App) {
        if self.enabled {
            app.add_systems(Update, my_system);
        }
    }

    fn name(&self) -> &str {
        "MyPlugin"
    }
}

fn my_system() {
    println!("My plugin system is running!");
}
```

### 4. 资源管理

```rust
#[derive(Resource)]
struct MyResource {
    value: i32,
}

// 插入资源
app.insert_resource(MyResource { value: 42 });

// 初始化资源（使用 Default 或 FromWorld）
app.init_resource::<MyResource>();

// 在系统中使用资源
fn my_system(mut resource: ResMut<MyResource>) {
    resource.value += 1;
}
```

### 5. 消息和事件处理

```rust
#[derive(Message)]
struct MyMessage {
    data: String,
}

// 添加消息类型
app.add_message::<MyMessage>();

// 发送消息的系统
fn sender_system(mut messages: MessageWriter<MyMessage>) {
    messages.send(MyMessage {
        data: "Hello".to_string(),
    });
}

// 接收消息的系统
fn receiver_system(mut messages: MessageReader<MyMessage>) {
    for message in messages.read() {
        println!("Received: {}", message.data);
    }
}
```

### 6. 子应用创建和管理

```rust
#[derive(AppLabel)]
struct RenderApp;

// 创建子应用
let mut render_app = SubApp::new();
render_app.add_systems(Update, render_system);

// 设置数据提取函数
render_app.set_extract(|main_world, render_world| {
    // 从主世界提取数据到渲染世界
});

// 添加子应用到主应用
app.insert_sub_app(RenderApp, render_app);
```

### 7. 调度配置

```rust
// 添加系统到特定调度
app.add_systems(Startup, setup_system);
app.add_systems(Update, (
    physics_system,
    render_system,
));

// 配置系统集
app.configure_sets(Update, (
    PhysicsSet,
    RenderSet.after(PhysicsSet),
));
```

### 8. 自定义运行器

```rust
fn my_runner(mut app: App) -> AppExit {
    loop {
        app.update();

        // 检查是否应该退出
        if let Some(exit) = app.should_exit() {
            return exit;
        }

        // 自定义逻辑
        std::thread::sleep(Duration::from_millis(16));
    }
}

app.set_runner(my_runner);
```

### 9. 任务池配置

```rust
app.add_plugins(TaskPoolPlugin {
    task_pool_options: TaskPoolOptions {
        compute: TaskPoolThreadAssignmentPolicy {
            min_threads: 1,
            max_threads: 4,
            percent: 0.25,
        },
        ..Default::default()
    },
});
```

## 与其他Bevy模块的集成方式

### 1. 与 bevy_ecs 集成

`bevy_app` 深度集成了 `bevy_ecs` 模块：

- **World 管理**：每个 `App` 和 `SubApp` 都拥有一个 `World` 实例
- **系统调度**：通过 `Schedules` 管理系统的执行
- **资源注册**：提供资源的注册和访问接口
- **组件注册**：支持组件类型的注册和管理

```rust
// ECS 集成示例
app.world_mut().spawn((
    Transform::default(),
    Mesh::default(),
));
```

### 2. 与 bevy_tasks 集成

通过 `TaskPoolPlugin` 集成任务执行框架：

- **ComputeTaskPool**：计算任务池
- **AsyncComputeTaskPool**：异步计算任务池
- **IoTaskPool**：IO 任务池

### 3. 与 bevy_reflect 集成

支持运行时类型反射：

```rust
#[cfg(feature = "bevy_reflect")]
app.init_resource::<AppTypeRegistry>();

#[cfg(feature = "reflect_functions")]
app.init_resource::<AppFunctionRegistry>();
```

### 4. 与渲染模块集成

通过子应用机制与渲染系统集成：

- 主应用处理游戏逻辑
- 渲染子应用处理渲染管线
- 通过提取函数在两者间传递数据

### 5. 与 bevy_platform 集成

平台特定功能的集成：

- 集合类型 (`HashMap`, `HashSet`)
- 时间类型
- 平台检测

## 常见使用场景

### 1. 游戏应用开发

```rust
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup)
        .add_systems(Update, (
            player_movement,
            enemy_ai,
            collision_detection,
        ))
        .run();
}
```

### 2. 无头应用（服务器）

```rust
fn main() {
    App::new()
        .add_plugins(MinimalPlugins)
        .add_plugins(ScheduleRunnerPlugin::run_loop(
            Duration::from_secs_f64(1.0 / 60.0)
        ))
        .add_systems(Update, server_logic)
        .run();
}
```

### 3. 工具应用

```rust
fn main() {
    App::new()
        .add_plugins(MinimalPlugins)
        .add_plugins(ScheduleRunnerPlugin::run_once())
        .add_systems(Startup, process_data)
        .run();
}
```

### 4. 插件开发

```rust
pub struct NetworkPlugin {
    pub server_address: String,
}

impl Plugin for NetworkPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(ServerConfig {
            address: self.server_address.clone(),
        })
        .add_message::<NetworkMessage>()
        .add_systems(Update, (
            handle_connections,
            process_messages,
        ));
    }
}
```

### 5. 状态管理

```rust
#[derive(States, Default, Debug, Clone, PartialEq, Eq, Hash)]
enum GameState {
    #[default]
    MainMenu,
    InGame,
    Paused,
}

app.init_state::<GameState>()
    .add_systems(OnEnter(GameState::InGame), setup_game)
    .add_systems(Update, game_logic.run_if(in_state(GameState::InGame)))
    .add_systems(OnExit(GameState::InGame), cleanup_game);
```

### 6. 错误处理

```rust
fn error_system() -> Result<(), Box<dyn std::error::Error>> {
    // 可能出错的逻辑
    Ok(())
}

app.add_systems(Update, error_system);
```

### 7. 多平台支持

```rust
#[cfg(not(target_arch = "wasm32"))]
fn desktop_system() {
    // 桌面平台特有逻辑
}

#[cfg(target_arch = "wasm32")]
fn web_system() {
    // Web 平台特有逻辑
}

#[cfg(not(target_arch = "wasm32"))]
app.add_systems(Update, desktop_system);

#[cfg(target_arch = "wasm32")]
app.add_systems(Update, web_system);
```

## 最佳实践

### 1. 插件组织

- 将相关功能组织到插件中
- 使用插件组管理多个相关插件
- 保持插件的单一职责原则

### 2. 系统设计

- 合理安排系统的执行顺序
- 使用系统集组织相关系统
- 避免系统间的强耦合

### 3. 资源管理

- 使用 `init_resource` 而不是 `insert_resource` 当资源有默认值时
- 及时清理不再需要的资源
- 使用合适的资源类型（`Res`、`ResMut`、`Local`）

### 4. 错误处理

- 实现适当的错误处理机制
- 使用 `AppExit` 优雅地退出应用
- 设置错误钩子处理意外情况

### 5. 性能优化

- 合理配置任务池
- 避免在热路径上进行昂贵操作
- 使用子应用分离不同类型的工作负载

这个文档提供了 `bevy_app` 模块的全面指南，涵盖了从基础概念到高级用法的所有重要内容。通过这些示例和最佳实践，开发者可以有效地使用 Bevy 的应用层功能构建各种类型的应用程序。