# Bevy ECS 中文文档

## 概述

Bevy ECS 是为 [Bevy](https://bevy.org/) 游戏引擎定制构建的实体组件系统（Entity Component System）。它旨在简单易用、人体工程学、快速、大规模并行、有主见且功能丰富。虽然专为 Bevy 的需求而创建，但它也可以轻松用作其他项目中的独立 crate。

## 模块概述

### 核心模块功能

- **entity**: 实体处理类型，管理游戏世界中的唯一标识符
- **component**: 组件类型声明和存储，包含实体的数据
- **system**: 控制 ECS 应用程序行为的工具
- **world**: 存储实体、组件和资源的容器
- **query**: 从世界中检索组件数据的 API
- **bundle**: 处理组件集合的类型
- **resource**: 全局唯一资源管理
- **schedule**: 系统执行调度
- **observer**: 事件响应系统
- **archetype**: 实体原型管理
- **storage**: 组件存储策略

## 核心概念

### 1. 实体 (Entity)

实体是游戏世界中的唯一标识符，使用生成式索引实现：索引 ([`EntityRow`]) 和生成 ([`EntityGeneration`]) 的组合。

```rust
use bevy_ecs::prelude::*;

let mut world = World::new();

// 创建一个空实体
let empty_entity = world.spawn_empty().id();

// 创建带组件的实体
let entity = world.spawn((Position { x: 0.0, y: 0.0 }, Velocity { x: 1.0, y: 0.0 })).id();

// 获取实体引用并访问组件
let entity_ref = world.entity(entity);
let position = entity_ref.get::<Position>().unwrap();
let velocity = entity_ref.get::<Velocity>().unwrap();
```

#### 实体特性
- **轻量级标识符**: 使用生成式索引，快速插入和删除
- **唯一性**: 每个实体在其生命周期内都是唯一的
- **世界特定**: 实体 ID 仅在创建它的世界中有效
- **别名警告**: 实体销毁后 ID 可能被重用，可能导致别名问题

### 2. 组件 (Component)

组件是可以用于存储实体数据的数据类型。组件必须满足 `Send + Sync + 'static` 特征约束。

```rust
use bevy_ecs::prelude::*;

// 基础组件
#[derive(Component)]
struct Position { x: f32, y: f32 }

// 标记组件
#[derive(Component)]
struct Player;

// 枚举组件
#[derive(Component)]
enum WheelCount {
    Two,
    Three,
    Four,
}

// 复杂结构组件
#[derive(Component)]
struct VehiclePerformance {
    acceleration: f32,
    top_speed: f32,
    handling: f32,
}
```

#### 组件存储类型
- **Table**: 快速且缓存友好的迭代，但添加和删除组件较慢（默认）
- **SparseSet**: 快速添加和删除组件，但迭代较慢

```rust
// 使用 SparseSet 存储
#[derive(Component)]
#[component(storage = "SparseSet")]
struct FastAddRemove;
```

#### 必需组件
组件可以指定必需组件。当插入组件 A 时，如果组件 A 需要组件 B，则 B 也会被自动初始化和插入。

```rust
#[derive(Component)]
#[require(B)]
struct A;

#[derive(Component, Default, PartialEq, Eq, Debug)]
struct B(usize);

// 这将隐式插入带有默认构造函数的 B
let id = world.spawn(A).id();
assert_eq!(&B(0), world.entity(id).get::<B>().unwrap());
```

#### 组件可变性
组件可以标记为不可变，保证永远不会创建独占引用：

```rust
#[derive(Component)]
#[component(immutable)]
struct ImmutableComponent;
```

### 3. 系统 (System)

系统是控制 ECS 应用程序行为的工具。系统通常写成普通函数，会自动转换为系统。

```rust
use bevy_ecs::prelude::*;

#[derive(Component)]
struct Position { x: f32, y: f32 }

#[derive(Component)]
struct Velocity { x: f32, y: f32 }

// 移动系统
fn movement_system(mut query: Query<(&mut Position, &Velocity)>) {
    for (mut position, velocity) in &mut query {
        position.x += velocity.x;
        position.y += velocity.y;
    }
}

// 打印位置系统
fn print_position(query: Query<(Entity, &Position)>) {
    for (entity, position) in &query {
        println!("Entity {} is at position: x {}, y {}", entity, position.x, position.y);
    }
}
```

#### 系统参数类型
系统函数可以有参数，通过这些参数可以查询和修改 Bevy ECS 状态。只有实现 `SystemParam` 的类型才能使用：

- `Query<T>`: 查询实体和组件
- `Res<T>` 和 `ResMut<T>`: 访问资源
- `Commands`: 延迟命令
- `Local<T>`: 本地状态
- `MessageReader<T>` 和 `MessageWriter<T>`: 消息通信
- `NonSend<T>` 和 `NonSendMut<T>`: 非 Send 资源

#### 系统排序
默认情况下，系统的执行是并行且不确定的。您可以明确排序系统：

```rust
// 使用 chain() 配置系统按顺序运行
schedule.add_systems((print_first, print_last).chain());

// 使用明确依赖
schedule.add_systems(print_mid.after(print_first).before(print_last));
```

### 4. 查询 (Query)

查询用于从世界中检索组件数据。

```rust
use bevy_ecs::prelude::*;

// 基础查询
fn basic_query(query: Query<&Position>) {
    for position in &query {
        println!("Position: ({}, {})", position.x, position.y);
    }
}

// 可变查询
fn mutable_query(mut query: Query<&mut Position>) {
    for mut position in &mut query {
        position.x += 1.0;
    }
}

// 多组件查询
fn multi_component_query(query: Query<(&Position, &Velocity)>) {
    for (position, velocity) in &query {
        println!("Entity at ({}, {}) moving at ({}, {})",
                 position.x, position.y, velocity.x, velocity.y);
    }
}
```

#### 查询过滤器
查询可以使用过滤器来限制结果：

```rust
// With 过滤器：仅匹配有 Player 组件的实体
fn player_query(query: Query<&Position, With<Player>>) {
    for position in &query {
        println!("Player position: ({}, {})", position.x, position.y);
    }
}

// Without 过滤器：仅匹配没有 Alive 组件的实体
fn dead_query(query: Query<&Position, (With<Player>, Without<Alive>)>) {
    for position in &query {
        println!("Dead player position: ({}, {})", position.x, position.y);
    }
}

// 可选组件
fn optional_query(query: Query<(Entity, Option<&Health>, &Position)>) {
    for (entity, health, position) in &query {
        if let Some(health) = health {
            println!("Entity {} at ({}, {}) has {} health",
                     entity, position.x, position.y, health.value);
        } else {
            println!("Entity {} at ({}, {}) has no health component",
                     entity, position.x, position.y);
        }
    }
}
```

#### 变更检测
Bevy ECS 跟踪对组件和资源的所有更改：

```rust
// 查询自上次运行以来更改的组件
fn changed_query(query: Query<&Position, Changed<Velocity>>) {
    for position in &query {
        println!("Entity with changed velocity at: ({}, {})", position.x, position.y);
    }
}

// 查询自上次运行以来添加的组件
fn added_query(query: Query<&Position, Added<Velocity>>) {
    for position in &query {
        println!("Entity with newly added velocity at: ({}, {})", position.x, position.y);
    }
}
```

### 5. 束 (Bundle)

束允许您将多个组件组合在一起，以便一起插入或移除。

```rust
use bevy_ecs::prelude::*;

#[derive(Component, Default)]
struct Player;

#[derive(Component, Default)]
struct Position { x: f32, y: f32 }

#[derive(Component, Default)]
struct Velocity { x: f32, y: f32 }

// 定义束
#[derive(Bundle, Default)]
struct PlayerBundle {
    player: Player,
    position: Position,
    velocity: Velocity,
}

// 使用束
let mut world = World::new();

// 生成带有默认 PlayerBundle 的新实体
world.spawn(PlayerBundle::default());

// 束与 Rust 的结构更新语法配合得很好
world.spawn(PlayerBundle {
    position: Position { x: 1.0, y: 1.0 },
    ..Default::default()
});
```

#### 束忽略字段
有时束的部分不应该被插入，可以用 `#[bundle(ignore)]` 标记：

```rust
#[derive(Bundle)]
struct MyBundle {
    component: MyComponent,

    #[bundle(ignore)]
    ignored_field: Option<String>, // 需要实现 Default
}
```

### 6. 资源 (Resource)

资源是应用程序通常需要的唯一资源，如资产集合、渲染器、音频服务器、时间等。

```rust
use bevy_ecs::prelude::*;

#[derive(Resource, Default)]
struct Time {
    seconds: f32,
}

#[derive(Resource)]
struct GameSettings {
    volume: f32,
    difficulty: u32,
}

let mut world = World::new();

// 插入资源
world.insert_resource(Time::default());
world.insert_resource(GameSettings { volume: 0.8, difficulty: 2 });

// 从系统访问资源
fn update_time(mut time: ResMut<Time>) {
    time.seconds += 1.0;
}

fn read_settings(settings: Res<GameSettings>) {
    println!("Volume: {}, Difficulty: {}", settings.volume, settings.difficulty);
}
```

#### 资源变更检测
资源也公开变更状态：

```rust
fn time_changed_system(time: Res<Time>) {
    if time.is_changed() {
        println!("Time changed to: {}", time.seconds);
    }
}
```

### 7. 调度 (Schedule)

调度根据某种执行策略运行一组系统：

```rust
use bevy_ecs::prelude::*;

fn main() {
    let mut world = World::new();

    // 创建新调度
    let mut schedule = Schedule::default();

    // 添加系统到调度
    schedule.add_systems((movement_system, print_position_system));

    // 运行调度
    schedule.run(&mut world);
}
```

#### 内置并行执行器
内置的"并行执行器"考虑系统之间的依赖关系，默认情况下尽可能并行运行多个系统。这最大化了性能，同时保持系统执行的安全性。

### 8. 观察者 (Observer)

观察者是监视特定事件"触发器"的系统：

```rust
use bevy_ecs::prelude::*;

#[derive(Event)]
struct Speak {
    message: String,
}

let mut world = World::new();

// 添加观察者
world.add_observer(|event: On<Speak>| {
    println!("{}", event.message);
});

// 触发事件
world.trigger(Speak {
    message: "Hello!".to_string(),
});
```

#### 实体事件
如果事件是 `EntityEvent`，它也可以被触发以针对特定实体：

```rust
#[derive(EntityEvent)]
struct Explode {
    entity: Entity,
}

let mut world = World::new();
let entity = world.spawn_empty().id();

world.add_observer(|explode: On<Explode>, mut commands: Commands| {
    println!("Entity {} goes BOOM!", explode.entity);
    commands.entity(explode.entity).despawn();
});

world.trigger(Explode { entity });
```

### 9. 消息 (Message)

消息在一个或多个系统之间提供通信通道：

```rust
use bevy_ecs::prelude::*;

#[derive(Message)]
struct ChatMessage(String);

fn writer_system(mut writer: MessageWriter<ChatMessage>) {
    writer.write(ChatMessage("Hello!".to_string()));
}

fn reader_system(mut reader: MessageReader<ChatMessage>) {
    for ChatMessage(message) in reader.read() {
        println!("Received: {}", message);
    }
}
```

## 主要 API 使用示例

### 基础实体生命周期管理

```rust
use bevy_ecs::prelude::*;

#[derive(Component)]
struct Health(u32);

#[derive(Component)]
struct Name(String);

fn main() {
    let mut world = World::new();

    // 创建实体
    let entity = world.spawn((
        Health(100),
        Name("Player".to_string()),
    )).id();

    // 添加组件
    world.entity_mut(entity).insert(Position { x: 0.0, y: 0.0 });

    // 移除组件
    world.entity_mut(entity).remove::<Health>();

    // 销毁实体
    world.despawn(entity);
}
```

### 复杂查询示例

```rust
// 复合过滤器查询
fn complex_query(
    // 查询有 Position 和 Velocity，但没有 Dead 标记的实体
    mut moving_entities: Query<(Entity, &mut Position, &Velocity), Without<Dead>>,
    // 查询所有玩家实体
    players: Query<Entity, With<Player>>,
    // 查询刚刚受伤的实体
    recently_damaged: Query<&Health, Changed<Health>>,
) {
    // 移动所有活动实体
    for (entity, mut position, velocity) in &mut moving_entities {
        position.x += velocity.x;
        position.y += velocity.y;
    }

    // 处理玩家
    for player_entity in &players {
        println!("Processing player: {}", player_entity);
    }

    // 检查受损实体
    for health in &recently_damaged {
        if health.0 <= 10 {
            println!("Entity critically damaged!");
        }
    }
}
```

### 系统间通信

```rust
#[derive(Resource, Default)]
struct Score(u32);

#[derive(Message)]
struct PlayerScored {
    points: u32,
}

fn gameplay_system(
    query: Query<&Position, With<Player>>,
    mut writer: MessageWriter<PlayerScored>,
) {
    for position in &query {
        // 检查玩家是否得分
        if position.y > 100.0 {
            writer.write(PlayerScored { points: 10 });
        }
    }
}

fn score_system(
    mut reader: MessageReader<PlayerScored>,
    mut score: ResMut<Score>,
) {
    for scored in reader.read() {
        score.0 += scored.points;
        println!("Score: {}", score.0);
    }
}
```

## 与其他 Bevy 模块的集成

### 1. 与 bevy_app 集成
```rust
// 系统通常通过 App 添加到调度中
app.add_systems(Update, (movement_system, collision_system));
```

### 2. 与 bevy_reflect 集成
```rust
#[derive(Component, Reflect)]
#[reflect(Component)]
struct ReflectableComponent {
    value: f32,
}
```

### 3. 与 bevy_scene 集成
```rust
// 组件可以通过场景系统序列化和反序列化
#[derive(Component, Serialize, Deserialize)]
struct SerializableComponent;
```

## 常见使用场景

### 1. 游戏对象管理
```rust
// 创建游戏对象层次结构
let parent = world.spawn((
    Transform::default(),
    GlobalTransform::default(),
    Name("Parent".to_string()),
)).id();

let child = world.spawn((
    Transform::from_translation(Vec3::new(1.0, 0.0, 0.0)),
    GlobalTransform::default(),
    Name("Child".to_string()),
)).set_parent(parent).id();
```

### 2. 状态机实现
```rust
#[derive(Component)]
enum AIState {
    Idle,
    Patrolling,
    Chasing,
    Attacking,
}

fn ai_system(
    mut query: Query<(&mut AIState, &Position, &mut Velocity)>,
    player_query: Query<&Position, (With<Player>, Without<AIState>)>,
) {
    let player_pos = player_query.single();

    for (mut state, position, mut velocity) in &mut query {
        match *state {
            AIState::Idle => {
                // 检查是否应该开始巡逻
                *state = AIState::Patrolling;
            }
            AIState::Patrolling => {
                // 巡逻逻辑
                let distance_to_player = player_pos.distance(position);
                if distance_to_player < 5.0 {
                    *state = AIState::Chasing;
                }
            }
            AIState::Chasing => {
                // 追逐逻辑
                let direction = (*player_pos - *position).normalize();
                velocity.0 = direction * 2.0;
            }
            AIState::Attacking => {
                // 攻击逻辑
            }
        }
    }
}
```

### 3. 事件驱动架构
```rust
#[derive(Event)]
struct CollisionEvent {
    entity_a: Entity,
    entity_b: Entity,
}

fn collision_detection_system(
    query: Query<(Entity, &Position, &Collider)>,
    mut collision_events: EventWriter<CollisionEvent>,
) {
    let entities: Vec<_> = query.iter().collect();

    for i in 0..entities.len() {
        for j in (i + 1)..entities.len() {
            let (entity_a, pos_a, collider_a) = entities[i];
            let (entity_b, pos_b, collider_b) = entities[j];

            if check_collision(pos_a, collider_a, pos_b, collider_b) {
                collision_events.send(CollisionEvent { entity_a, entity_b });
            }
        }
    }
}

fn collision_response_system(
    mut collision_events: EventReader<CollisionEvent>,
    mut query: Query<&mut Health>,
) {
    for collision in collision_events.read() {
        if let Ok(mut health) = query.get_mut(collision.entity_a) {
            health.0 = health.0.saturating_sub(10);
        }
    }
}
```

### 4. 组件生命周期管理
```rust
#[derive(Component)]
struct Lifetime {
    remaining: f32,
}

fn lifetime_system(
    mut commands: Commands,
    mut query: Query<(Entity, &mut Lifetime)>,
    time: Res<Time>,
) {
    for (entity, mut lifetime) in &mut query {
        lifetime.remaining -= time.delta_seconds();

        if lifetime.remaining <= 0.0 {
            commands.entity(entity).despawn();
        }
    }
}
```

## 性能优化技巧

### 1. 选择合适的组件存储类型
- 频繁查询的组件使用 Table 存储（默认）
- 频繁添加/移除的组件使用 SparseSet 存储

### 2. 系统排序优化
- 将修改数据的系统放在读取数据的系统之前
- 使用并行安全的系统设计

### 3. 查询优化
- 使用具体的过滤器而不是在系统内部过滤
- 避免在热路径上进行不必要的组件访问

### 4. 内存布局优化
- 将经常一起访问的组件放在同一个束中
- 考虑组件大小对缓存性能的影响

## 错误处理

### 常见错误类型
```rust
// 实体不存在错误
fn safe_entity_access(
    world: &World,
    entity: Entity,
) -> Result<&Position, EntityDoesNotExistError> {
    world.entity(entity).get::<Position>()
        .ok_or_else(|| EntityDoesNotExistError::new(entity, world.entities()))
}

// 查询错误处理
fn safe_query_get(
    query: &Query<&Position>,
    entity: Entity,
) -> Result<&Position, QueryEntityError> {
    query.get(entity)
}
```

## 最佳实践

### 1. 组件设计
- 保持组件小且专注
- 优先使用数据而不是行为
- 避免在组件中存储实体引用，除非必要

### 2. 系统设计
- 每个系统应该有单一职责
- 使用清晰的命名约定
- 考虑系统的执行频率

### 3. 架构模式
- 使用事件进行松耦合通信
- 通过束组织相关组件
- 利用资源存储全局状态

### 4. 调试和测试
- 使用 `#[cfg(feature = "track_location")]` 进行调试
- 编写针对系统的单元测试
- 使用 `World::clear_trackers()` 重置变更检测

这个文档涵盖了 Bevy ECS 的主要概念、API 和使用模式。Bevy ECS 是一个强大而灵活的系统，通过遵循这些模式和最佳实践，您可以构建高性能、可维护的游戏和应用程序。