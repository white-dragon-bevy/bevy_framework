# Bevy State 模块详细操作文档

## 概述

`bevy_state` 是 Bevy 引擎中用于管理应用程序状态的核心模块。它提供了一套完整的有限状态机（FSM）系统，用于建模应用程序的大规模结构，如游戏是否暂停、玩家是否在战斗中、资源是否已加载等场景。

### 主要特性

- **应用程序级状态管理**：跨组件的相互依赖状态机
- **三种状态类型**：标准状态、子状态和计算状态
- **自动状态转换**：支持状态进入、退出和转换调度
- **状态作用域实体**：基于状态转换自动管理实体生命周期

## 核心概念和结构体

### 1. States 特质 (Trait)

```rust
pub trait States: 'static + Send + Sync + Clone + PartialEq + Eq + Hash + Debug {
    const DEPENDENCY_DEPTH: usize = 1;
}
```

**说明**：
- 定义世界级状态的基础特质
- 状态必须实现 `Clone`、`PartialEq`、`Eq`、`Hash`、`Debug` 等特质
- `DEPENDENCY_DEPTH` 用于排序转换和去重计算状态

**使用示例**：
```rust
use bevy_state::prelude::*;

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug, Default, States)]
enum GameState {
    #[default]
    MainMenu,
    SettingsMenu,
    InGame,
}
```

### 2. State<S> 资源

```rust
#[derive(Resource, Debug)]
pub struct State<S: States>(pub(crate) S);
```

**说明**：
- 存储当前状态值的资源
- 只读访问，不能直接修改
- 通过 `NextState<S>` 来触发状态转换

**API 方法**：
- `State::new(state: S)` - 创建新状态
- `State::get(&self) -> &S` - 获取当前状态

**使用示例**：
```rust
fn game_logic(game_state: Res<State<GameState>>) {
    match game_state.get() {
        GameState::InGame => {
            // 游戏逻辑...
        },
        GameState::MainMenu => {
            // 主菜单逻辑...
        },
        _ => {},
    }
}
```

### 3. NextState<S> 资源

```rust
#[derive(Resource, Debug, Default, Clone)]
pub enum NextState<S: FreelyMutableState> {
    #[default]
    Unchanged,
    Pending(S),
}
```

**说明**：
- 用于排队状态转换的资源
- 在 `StateTransition` 调度期间应用转换

**API 方法**：
- `NextState::set(&mut self, state: S)` - 设置待转换状态
- `NextState::reset(&mut self)` - 移除待转换状态

**使用示例**：
```rust
fn start_game(mut next_game_state: ResMut<NextState<GameState>>) {
    next_game_state.set(GameState::InGame);
}

fn handle_escape(
    input: Res<ButtonInput<KeyCode>>,
    mut next_state: ResMut<NextState<GameState>>
) {
    if input.just_pressed(KeyCode::Escape) {
        next_state.set(GameState::MainMenu);
    }
}
```

### 4. 计算状态 (ComputedStates)

```rust
pub trait ComputedStates: 'static + Send + Sync + Clone + PartialEq + Eq + Hash + Debug {
    type SourceStates: StateSet;

    fn compute(sources: Self::SourceStates) -> Option<Self>;
    fn register_computed_state_systems(schedule: &mut Schedule);
}
```

**说明**：
- 根据其他状态的值自动计算的状态
- 当源状态变化时自动重新计算
- 返回 `None` 时会从世界中移除状态资源

**使用示例**：
```rust
#[derive(States, Clone, PartialEq, Eq, Hash, Debug, Default)]
enum AppState {
    #[default]
    Menu,
    InGame { paused: bool }
}

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
struct InGame;

impl ComputedStates for InGame {
    type SourceStates = AppState;

    fn compute(sources: AppState) -> Option<Self> {
        match sources {
            AppState::InGame { .. } => Some(InGame),
            _ => None
        }
    }
}
```

### 5. 子状态 (SubStates)

```rust
pub trait SubStates: States + FreelyMutableState {
    type SourceStates: StateSet;

    fn should_exist(sources: Self::SourceStates) -> Option<Self>;
    fn register_sub_state_systems(schedule: &mut Schedule);
}
```

**说明**：
- 只有在源状态满足特定条件时才存在的状态
- 存在时可以手动修改，类似标准状态
- 使用 derive 宏简化定义

**使用示例**：
```rust
#[derive(States, Clone, PartialEq, Eq, Hash, Debug, Default)]
enum AppState {
    #[default]
    Menu,
    InGame
}

#[derive(SubStates, Clone, PartialEq, Eq, Hash, Debug, Default)]
#[source(AppState = AppState::InGame)]
enum GamePhase {
    #[default]
    Setup,
    Battle,
    Conclusion
}
```

## 状态转换调度

### 转换调度类型

1. **OnEnter<S>** - 进入特定状态时运行
2. **OnExit<S>** - 退出特定状态时运行
3. **OnTransition<S>** - 状态转换时运行（包括相同状态转换）

### 转换系统集

```rust
#[derive(SystemSet, Clone, Debug, PartialEq, Eq, Hash)]
pub enum StateTransitionSystems {
    DependentTransitions,  // 应用依赖状态转换
    ExitSchedules,         // 退出调度（叶节点到根节点）
    TransitionSchedules,   // 转换调度（任意顺序）
    EnterSchedules,        // 进入调度（根节点到叶节点）
}
```

### 状态转换事件

```rust
#[derive(Debug, Copy, Clone, PartialEq, Eq, Message)]
pub struct StateTransitionEvent<S: States> {
    pub exited: Option<S>,
    pub entered: Option<S>,
}
```

**使用示例**：
```rust
fn setup_game_systems(mut commands: Commands) {
    commands.spawn(Camera2dBundle::default());
}

fn cleanup_game_systems(mut commands: Commands, entities: Query<Entity, Without<Camera>>) {
    for entity in entities.iter() {
        commands.entity(entity).despawn();
    }
}

fn on_game_transition(
    mut transition_reader: MessageReader<StateTransitionEvent<GameState>>
) {
    for transition in transition_reader.read() {
        if transition.exited == Some(GameState::MainMenu) &&
           transition.entered == Some(GameState::InGame) {
            println!("从主菜单进入游戏！");
        }
    }
}

// 在 App 构建时添加系统
app.add_systems(OnEnter(GameState::InGame), setup_game_systems)
   .add_systems(OnExit(GameState::InGame), cleanup_game_systems)
   .add_systems(Update, on_game_transition);
```

## 运行条件

### 状态相关条件

```rust
// 检查状态是否存在
pub fn state_exists<S: States>(current_state: Option<Res<State<S>>>) -> bool;

// 检查是否在特定状态
pub fn in_state<S: States>(state: S) -> impl FnMut(Option<Res<State<S>>>) -> bool + Clone;

// 检查状态是否发生变化
pub fn state_changed<S: States>(current_state: Option<Res<State<S>>>) -> bool;
```

**使用示例**：
```rust
app.add_systems(Update, (
    // 只在游戏状态下运行
    game_update_system.run_if(in_state(GameState::InGame)),
    // 只在菜单状态下运行
    menu_update_system.run_if(in_state(GameState::MainMenu)),
    // 状态变化时运行
    state_change_logger.run_if(state_changed::<GameState>),
    // 状态存在时运行
    conditional_system.run_if(state_exists::<GameState>),
));
```

## App 扩展方法

### AppExtStates 特质

```rust
pub trait AppExtStates {
    fn init_state<S: FreelyMutableState + FromWorld>(&mut self) -> &mut Self;
    fn insert_state<S: FreelyMutableState>(&mut self, state: S) -> &mut Self;
    fn add_computed_state<S: ComputedStates>(&mut self) -> &mut Self;
    fn add_sub_state<S: SubStates>(&mut self) -> &mut Self;
}
```

**使用示例**：
```rust
use bevy::prelude::*;
use bevy_state::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        // 初始化标准状态
        .init_state::<GameState>()
        // 或直接插入特定状态
        .insert_state(GameState::MainMenu)
        // 添加计算状态
        .add_computed_state::<InGame>()
        // 添加子状态
        .add_sub_state::<GamePhase>()
        .run();
}
```

## Commands 扩展

### CommandsStatesExt 特质

```rust
pub trait CommandsStatesExt {
    fn set_state<S: FreelyMutableState>(&mut self, state: S);
}
```

**使用示例**：
```rust
fn button_system(
    mut commands: Commands,
    interaction_query: Query<(&Interaction, &ButtonAction), (Changed<Interaction>, With<Button>)>
) {
    for (interaction, button_action) in interaction_query.iter() {
        if *interaction == Interaction::Pressed {
            match button_action {
                ButtonAction::StartGame => {
                    commands.set_state(GameState::InGame);
                },
                ButtonAction::ShowSettings => {
                    commands.set_state(GameState::SettingsMenu);
                },
            }
        }
    }
}
```

## 状态作用域实体管理

### 自动实体管理

状态模块提供了两个组件用于自动管理实体生命周期：

```rust
#[derive(Component)]
pub struct DespawnOnEnter<S: States>(pub S);

#[derive(Component)]
pub struct DespawnOnExit<S: States>(pub S);
```

**使用示例**：
```rust
fn spawn_game_ui(mut commands: Commands) {
    // 进入 MainMenu 状态时自动销毁
    commands.spawn((
        DespawnOnEnter(GameState::MainMenu),
        NodeBundle {
            style: Style {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                ..default()
            },
            ..default()
        }
    ));

    // 退出 InGame 状态时自动销毁
    commands.spawn((
        DespawnOnExit(GameState::InGame),
        SpriteBundle {
            texture: asset_server.load("player.png"),
            ..default()
        }
    ));
}
```

## 与其他模块的集成

### 与 bevy_app 集成

状态系统与 Bevy 的应用程序生命周期深度集成：

1. **插件支持**：通过 `StatesPlugin` 注册状态转换调度
2. **调度集成**：`StateTransition` 在 `PreUpdate` 之后和启动时自动运行
3. **反射支持**：可选的状态反射，便于调试和运行时修改

### 与 bevy_ecs 集成

1. **资源系统**：状态作为 ECS 资源存储和访问
2. **消息系统**：状态转换事件通过消息系统分发
3. **系统调度**：状态转换与系统调度紧密集成

### 与 bevy_reflect 集成（可选）

```rust
// 启用反射支持
app.register_type_state::<GameState>()
   .register_type_mutable_state::<GamePhase>();
```

## 常见使用场景

### 1. 游戏状态管理

```rust
#[derive(States, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
enum GameState {
    #[default]
    Loading,
    MainMenu,
    Playing,
    Paused,
    GameOver,
}

#[derive(SubStates, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
#[source(GameState = GameState::Playing)]
enum PlayingState {
    #[default]
    Combat,
    Inventory,
    Dialog,
}

fn setup_game_states(mut app: App) {
    app.init_state::<GameState>()
       .add_sub_state::<PlayingState>()
       .add_systems(OnEnter(GameState::Loading), load_assets)
       .add_systems(OnEnter(GameState::Playing), setup_game_world)
       .add_systems(OnExit(GameState::Playing), cleanup_game_world)
       .add_systems(Update, (
           combat_system.run_if(in_state(PlayingState::Combat)),
           inventory_system.run_if(in_state(PlayingState::Inventory)),
           dialog_system.run_if(in_state(PlayingState::Dialog)),
       ));
}
```

### 2. 加载状态管理

```rust
#[derive(States, Clone, PartialEq, Eq, Hash, Debug, Default)]
enum LoadingState {
    #[default]
    None,
    Assets,
    World,
    Complete,
}

#[derive(Clone, PartialEq, Eq, Hash, Debug)]
struct AllLoaded;

impl ComputedStates for AllLoaded {
    type SourceStates = LoadingState;

    fn compute(sources: LoadingState) -> Option<Self> {
        match sources {
            LoadingState::Complete => Some(AllLoaded),
            _ => None,
        }
    }
}

fn setup_loading(mut app: App) {
    app.init_state::<LoadingState>()
       .add_computed_state::<AllLoaded>()
       .add_systems(Update, (
           load_assets.run_if(in_state(LoadingState::Assets)),
           load_world.run_if(in_state(LoadingState::World)),
           start_game.run_if(state_exists::<AllLoaded>),
       ));
}
```

### 3. 网络连接状态

```rust
#[derive(States, Clone, PartialEq, Eq, Hash, Debug, Default)]
enum NetworkState {
    #[default]
    Offline,
    Connecting,
    Connected,
    Reconnecting,
}

#[derive(SubStates, Clone, PartialEq, Eq, Hash, Debug, Default)]
#[source(NetworkState = NetworkState::Connected)]
enum OnlineMode {
    #[default]
    Lobby,
    InMatch,
}

fn handle_network_events(
    mut next_state: ResMut<NextState<NetworkState>>,
    network_events: EventReader<NetworkEvent>
) {
    for event in network_events.read() {
        match event {
            NetworkEvent::Connected => next_state.set(NetworkState::Connected),
            NetworkEvent::Disconnected => next_state.set(NetworkState::Offline),
            NetworkEvent::ConnectionLost => next_state.set(NetworkState::Reconnecting),
        }
    }
}
```

## 最佳实践

### 1. 状态设计原则

- **单一职责**：每个状态类型专注于一个特定的应用程序方面
- **最小依赖**：避免创建过多的状态依赖关系
- **清晰层次**：使用子状态和计算状态建立清晰的状态层次结构

### 2. 性能考虑

- **避免频繁转换**：状态转换有开销，避免每帧多次转换
- **合理使用计算状态**：计算状态会在源状态变化时重新计算
- **批量操作**：在单个系统中处理多个相关的状态变化

### 3. 调试技巧

```rust
// 状态转换日志记录
fn log_state_transitions(
    mut reader: MessageReader<StateTransitionEvent<GameState>>
) {
    for transition in reader.read() {
        println!("状态转换: {:?} -> {:?}", transition.exited, transition.entered);
    }
}

// 添加到 App
app.add_systems(Update, log_state_transitions);
```

### 4. 错误处理

```rust
fn safe_state_transition(
    mut next_state: ResMut<NextState<GameState>>,
    current_state: Res<State<GameState>>,
) {
    // 检查状态转换的有效性
    match (current_state.get(), next_target) {
        (GameState::Loading, GameState::Playing) => {
            // 只有加载完成才能进入游戏
            if !assets_loaded {
                println!("警告：资源未加载完成，无法进入游戏");
                return;
            }
        },
        _ => {}
    }

    next_state.set(next_target);
}
```

## 总结

`bevy_state` 模块为 Bevy 应用程序提供了强大而灵活的状态管理系统。通过标准状态、子状态和计算状态的组合，可以建模复杂的应用程序逻辑。结合状态转换调度和运行条件，能够创建响应式和可维护的游戏系统。

关键要点：
- 使用 `States` derive 宏快速定义状态类型
- 通过 `NextState<S>` 资源触发状态转换
- 利用 `OnEnter`、`OnExit` 和 `OnTransition` 调度处理状态变化
- 使用运行条件基于状态控制系统执行
- 结合状态作用域实体管理自动化实体生命周期
- 通过子状态和计算状态构建状态层次结构

这套状态系统能够有效支持从简单的菜单导航到复杂的游戏状态管理的各种场景。