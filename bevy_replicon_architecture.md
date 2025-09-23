# Bevy Replicon 技术架构设计文档

## 目录

1. [执行摘要](#执行摘要)
2. [系统架构概览](#系统架构概览)
3. [核心设计理念](#核心设计理念)
4. [模块架构详解](#模块架构详解)
5. [网络通信机制](#网络通信机制)
6. [实体复制系统](#实体复制系统)
7. [组件同步机制](#组件同步机制)
8. [事件系统架构](#事件系统架构)
9. [可见性控制系统](#可见性控制系统)
10. [优先级与带宽优化](#优先级与带宽优化)
11. [最终一致性保证](#最终一致性保证)
12. [扩展点与自定义机制](#扩展点与自定义机制)

---

## 执行摘要

Bevy Replicon 是一个为 Bevy 游戏引擎设计的服务器权威网络复制框架。它提供了一个高级别的 API 来自动化服务器到客户端的状态同步，同时保持灵活性和可扩展性。核心特点包括：

- **服务器权威架构**：所有游戏状态由服务器控制，客户端只接收更新
- **基于变更检测的同步**：利用 Bevy ECS 的变更检测自动识别需要同步的数据
- **双通道传输策略**：可靠通道处理关键更新，不可靠通道处理频繁变化的数据
- **灵活的可见性控制**：支持黑名单和白名单策略控制实体可见性
- **事件系统**：双向事件传输支持 RPC 风格的通信
- **带宽优化**：通过优先级系统和增量更新减少网络流量

---

## 系统架构概览

### 架构层次图

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│                   (Game Logic & Systems)                     │
├─────────────────────────────────────────────────────────────┤
│                      Replicon Core                           │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │   Server     │    Shared    │   Client     │            │
│  │   Module     │   Modules    │   Module     │            │
│  └──────────────┴──────────────┴──────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                    Backend Abstraction                       │
│                 (Messaging Backend Interface)                │
├─────────────────────────────────────────────────────────────┤
│                     Network Transport                        │
│              (User-provided: Renet, WebRTC, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件关系

```
         Server                              Client
    ┌──────────────┐                   ┌──────────────┐
    │ ServerPlugin │                   │ ClientPlugin │
    └──────┬───────┘                   └──────┬───────┘
           │                                   │
    ┌──────▼───────┐                   ┌──────▼───────┐
    │ Replication  │     Network       │  Replication │
    │   System     ◄───────────────────►   Receiver   │
    └──────┬───────┘                   └──────┬───────┘
           │                                   │
    ┌──────▼───────┐                   ┌──────▼───────┐
    │   World      │                   │   World      │
    │  (Entities)  │                   │  (Entities)  │
    └──────────────┘                   └──────────────┘
```

---

## 核心设计理念

### 1. 服务器权威模型

系统采用严格的服务器权威模型，所有游戏状态的真实来源都在服务器端：

- **单向复制流**：状态变更只从服务器流向客户端
- **客户端输入验证**：客户端通过事件系统发送输入，服务器验证后更新状态
- **防作弊设计**：客户端无法直接修改游戏状态

### 2. 变更检测驱动

利用 Bevy ECS 的变更检测系统自动识别需要同步的数据：

```rust
// 服务器自动检测组件变更
fn collect_changes(
    world: &ServerWorld,
    change_tick: &SystemChangeTick,
    // ...
) {
    // 检查组件的 Added 和 Changed 标记
    if ticks.is_changed(last_system_tick, change_tick.this_run()) {
        // 收集变更用于复制
    }
}
```

### 3. 最终一致性

系统保证客户端状态最终与服务器一致，但不保证实时同步：

- **顺序保证**：事件、插入、删除按服务器执行顺序应用
- **原子更新**：实体的所有组件变更在同一帧内应用
- **延迟容忍**：设计允许网络延迟和丢包

---

## 模块架构详解

### Server 模块 (`server/`)

服务器模块负责管理复制发送和客户端连接：

#### 核心组件

1. **ServerPlugin**
   - 配置服务器行为（tick 调度、可见性策略、超时设置）
   - 管理系统执行顺序
   - 处理客户端连接生命周期

2. **ReplicationMessages** (`replication_messages/`)
   - `Updates`: 可靠传输的实体更新（映射、生成、删除、组件插入/删除）
   - `Mutations`: 不可靠传输的组件值变更
   - `SerializedData`: 序列化数据缓冲区管理

3. **ClientVisibility**
   - 控制每个客户端可见的实体集合
   - 支持黑名单/白名单两种策略
   - 动态更新可见性状态

4. **PriorityMap**
   - 控制实体更新频率
   - 基于优先级的带宽分配
   - 累积优先级机制确保低优先级实体最终被更新

### Client 模块 (`client/`)

客户端模块处理复制接收和状态应用：

#### 核心组件

1. **ClientPlugin**
   - 管理接收系统
   - 处理协议验证
   - 维护客户端统计信息

2. **ConfirmHistory**
   - 跟踪每个实体的确认状态
   - 支持客户端预测和回滚
   - 记录最后确认的服务器 tick

3. **ServerMutateTicks**
   - 跟踪接收到的变更消息
   - 支持乱序消息处理
   - 维护 64 tick 的历史窗口

### Shared 模块 (`shared/`)

共享模块包含服务器和客户端都使用的核心功能：

#### 1. Backend (`backend/`)

网络后端抽象层：

```rust
pub struct RepliconChannels {
    server: Vec<Channel>,  // 服务器到客户端通道
    client: Vec<Channel>,  // 客户端到服务器通道
}

pub enum Channel {
    Unreliable,  // 不可靠无序
    Unordered,   // 可靠无序
    Ordered,     // 可靠有序
}
```

#### 2. Replication (`replication/`)

复制核心机制：

- **ReplicationRegistry**: 管理组件序列化/反序列化函数
- **ReplicationRules**: 定义哪些组件如何复制
- **CommandMarkers**: 自定义组件写入行为的标记系统

#### 3. Event System (`event/`)

事件传输系统：

- **ClientEvent**: 客户端到服务器事件
- **ServerEvent**: 服务器到客户端事件
- **Triggers**: 基于观察者模式的事件系统

---

## 网络通信机制

### 双通道架构

系统使用两个独立的通道优化不同类型的数据传输：

#### Updates 通道（可靠有序）

传输关键的结构性变更：
- 实体映射
- 实体生成/删除
- 组件插入/删除
- 首次组件值

```rust
// Update 消息结构
UpdateMessage {
    tick: RepliconTick,
    mappings: Option<EntityMappings>,
    despawns: Vec<Entity>,
    removals: Vec<(Entity, Vec<ComponentId>)>,
    changes: Vec<(Entity, Vec<ComponentData>)>,
}
```

#### Mutations 通道（不可靠）

传输频繁变化的组件值：
- 位置、旋转等连续变化的数据
- 包含最小必需 tick 确保顺序
- 支持部分应用和重传

```rust
// Mutation 消息结构
MutationMessage {
    update_tick: RepliconTick,    // 必需的最小 update tick
    message_tick: RepliconTick,   // 此消息的 tick
    entities: Vec<(Entity, Vec<ComponentData>)>,
}
```

### 消息确认机制

客户端通过 ACK 消息确认收到的 mutations：

```rust
// 客户端发送确认
fn receive_mutations(message: MutationMessage) {
    // 处理消息
    apply_mutations(message);

    // 发送确认
    send_ack(message.mutate_index);
}

// 服务器处理确认
fn receive_acks(acks: Vec<MutateIndex>) {
    for ack in acks {
        // 停止重传已确认的数据
        client_ticks.ack_mutate_message(ack);
    }
}
```

---

## 实体复制系统

### 实体生命周期

#### 1. 服务器端生成

```rust
// 服务器创建可复制实体
commands.spawn((
    Replicated,        // 标记为可复制
    Transform::default(),
    Player { name: "Alice".into() },
));
```

#### 2. 实体映射

服务器和客户端的实体 ID 不同，系统维护映射关系：

```rust
pub struct ServerEntityMap {
    server_to_client: EntityHashMap<Entity>,
    client_to_server: EntityHashMap<Entity>,
}
```

#### 3. 客户端接收

客户端自动创建对应实体并应用组件：

```rust
fn apply_spawn(server_entity: Entity, components: Vec<ComponentData>) {
    // 创建客户端实体
    let client_entity = commands.spawn_empty();

    // 建立映射
    entity_map.insert(server_entity, client_entity);

    // 应用组件
    for component in components {
        apply_component(client_entity, component);
    }
}
```

### 预生成实体支持

客户端可以预先生成实体（如子弹），然后映射到服务器实体：

```rust
// 客户端预生成
let bullet = commands.spawn(BulletBundle::default());
client_entity_map.insert(predicted_server_id, bullet);

// 服务器确认后自动映射
```

---

## 组件同步机制

### 复制规则定义

#### 基础复制

```rust
app.replicate::<Health>();  // 默认序列化
```

#### 自定义序列化

```rust
// 量化位置以减少带宽
app.replicate_as::<Position, QuantizedPosition>();

impl From<Position> for QuantizedPosition {
    fn from(pos: Position) -> Self {
        // 量化逻辑
    }
}
```

#### 条件复制

```rust
// 只为特定实体复制组件
app.replicate_filtered::<Health, With<Player>>();
```

#### 捆绑复制

```rust
// 多个组件一起复制
app.replicate_bundle::<(Transform, Velocity, Health)>();
```

### 组件变更检测

系统自动检测并同步组件变更：

```rust
fn detect_changes(entity: Entity, component: &Component) {
    let ticks = component.get_change_ticks();

    if ticks.is_changed(last_run, this_run) {
        if component_existed_before {
            // 发送 Mutation（组件值变更）
            send_mutation(entity, component);
        } else {
            // 发送 Update（组件插入）
            send_insertion(entity, component);
        }
    }
}
```

### 组件可变性处理

根据组件的 `Mutability` 特性决定应用方式：

```rust
match component.mutability() {
    Mutable => {
        if entity.contains::<T>() {
            // 就地修改
            entity.get_mut::<T>().update(data);
        } else {
            // 插入新组件
            entity.insert(T::from(data));
        }
    }
    Immutable => {
        // 总是重新插入
        entity.insert(T::from(data));
    }
}
```

---

## 事件系统架构

### 双向事件通信

#### 客户端到服务器事件

```rust
// 注册事件
app.add_client_event::<PlayerInput>(Channel::Ordered);

// 客户端发送
fn send_input(mut events: EventWriter<PlayerInput>) {
    events.send(PlayerInput {
        movement: Vec2::new(1.0, 0.0)
    });
}

// 服务器接收
fn receive_input(mut events: EventReader<FromClient<PlayerInput>>) {
    for FromClient { client_id, event } in events.read() {
        // 处理来自 client_id 的输入
        process_player_input(client_id, event);
    }
}
```

#### 服务器到客户端事件

```rust
// 注册事件
app.add_server_event::<GameStateUpdate>(Channel::Reliable);

// 服务器发送
fn broadcast_update(mut events: EventWriter<ToClients<GameStateUpdate>>) {
    events.send(ToClients {
        mode: SendMode::Broadcast,
        event: GameStateUpdate { score: 100 },
    });
}

// 客户端接收
fn receive_update(mut events: EventReader<GameStateUpdate>) {
    for event in events.read() {
        update_ui(event.score);
    }
}
```

### 事件发送模式

```rust
pub enum SendMode {
    Broadcast,                    // 发送给所有客户端
    BroadcastExcept(ClientId),   // 发送给除指定客户端外的所有客户端
    Direct(ClientId),             // 发送给特定客户端
}
```

### 独立事件

不依赖于复制状态的事件可以标记为独立，立即发送：

```rust
// 标记聊天消息为独立事件
app.make_event_independent::<ChatMessage>();
```

---

## 可见性控制系统

### 可见性策略

#### 黑名单模式（默认）

所有实体默认可见，显式隐藏特定实体：

```rust
app.add_plugins(RepliconPlugins.set(ServerPlugin {
    visibility_policy: VisibilityPolicy::Blacklist,
    ..Default::default()
}));

// 隐藏特定实体
fn hide_entity(mut visibility: Query<&mut ClientVisibility>) {
    let mut client_vis = visibility.get_mut(client_entity).unwrap();
    client_vis.set_visibility(secret_entity, false);
}
```

#### 白名单模式

所有实体默认隐藏，显式显示特定实体：

```rust
app.add_plugins(RepliconPlugins.set(ServerPlugin {
    visibility_policy: VisibilityPolicy::Whitelist,
    ..Default::default()
}));

// 显示特定实体
fn show_entity(mut visibility: Query<&mut ClientVisibility>) {
    let mut client_vis = visibility.get_mut(client_entity).unwrap();
    client_vis.set_visibility(visible_entity, true);
}
```

### 动态可见性更新

基于游戏逻辑动态调整可见性：

```rust
fn update_visibility(
    mut clients: Query<(&Transform, &mut ClientVisibility)>,
    entities: Query<(Entity, &Transform)>,
) {
    for (client_pos, mut visibility) in &mut clients {
        for (entity, entity_pos) in &entities {
            let distance = client_pos.translation.distance(entity_pos.translation);
            let is_visible = distance < VIEW_DISTANCE;
            visibility.set_visibility(entity, is_visible);
        }
    }
}
```

### 可见性状态转换

```rust
pub enum Visibility {
    Hidden,   // 实体对客户端不可见
    Gained,   // 实体刚刚变为可见
    Visible,  // 实体持续可见
}
```

---

## 优先级与带宽优化

### 优先级系统

控制实体更新频率以优化带宽使用：

```rust
pub struct PriorityMap(EntityHashMap<f32>);

// 设置实体优先级
fn set_priorities(mut priorities: Query<&mut PriorityMap>) {
    let mut priority_map = priorities.single_mut();

    // 玩家角色：最高优先级
    priority_map.insert(player_entity, 1.0);

    // 附近敌人：中等优先级
    priority_map.insert(enemy_entity, 0.5);

    // 远处装饰物：低优先级
    priority_map.insert(decoration_entity, 0.1);
}
```

### 优先级累积机制

```rust
fn should_send_mutation(entity: Entity, priority: f32, ticks_since_last: u32) -> bool {
    // 优先级累积
    let accumulated = priority * ticks_since_last as f32;

    // 累积值 >= 1.0 时发送
    accumulated >= 1.0
}
```

### 带宽优化策略

1. **增量更新**：只发送变化的数据
2. **消息合并**：相同实体的多个组件变更合并发送
3. **数据压缩**：使用 postcard 二进制序列化
4. **视锥剔除**：只同步可见范围内的实体
5. **LOD 系统**：远处实体降低更新频率

---

## 最终一致性保证

### 消息顺序保证

1. **Updates 通道**：可靠有序，保证结构性变更顺序
2. **Mutations 通道**：可能乱序，但包含依赖信息

### Tick 同步机制

```rust
pub struct ServerTick(RepliconTick);
pub struct ServerUpdateTick(RepliconTick);

// 服务器端
fn increment_tick(mut server_tick: ResMut<ServerTick>) {
    server_tick.increment();
    // 触发复制系统
}

// 客户端
fn apply_update(message: UpdateMessage) {
    // 更新最后接收的 tick
    *update_tick = message.tick;

    // 应用所有等待此 tick 的 mutations
    apply_buffered_mutations(message.tick);
}
```

### 缓冲机制

客户端缓冲乱序到达的消息：

```rust
pub struct BufferedMutations(Vec<BufferedMutate>);

struct BufferedMutate {
    update_tick: RepliconTick,   // 依赖的 update tick
    message_tick: RepliconTick,  // 消息自身的 tick
    message: Bytes,               // 消息数据
}

// 只有当依赖的 update 到达后才应用 mutation
fn apply_buffered_mutations(current_update_tick: RepliconTick) {
    buffered.retain(|mutate| {
        if mutate.update_tick <= current_update_tick {
            apply_mutation(mutate);
            false  // 移除已应用的消息
        } else {
            true   // 保留等待的消息
        }
    });
}
```

### 原子性保证

实体的所有组件变更在同一帧内原子应用：

```rust
fn collect_entity_changes(entity: Entity) -> EntityUpdate {
    let mut update = EntityUpdate::new(entity);

    // 收集所有组件变更
    for component in entity.components() {
        if component.is_changed() {
            update.add_component(component);
        }
    }

    // 作为原子单元发送
    send_update(update);
}
```

---

## 扩展点与自定义机制

### 1. 自定义序列化

实现自定义序列化逻辑：

```rust
app.replicate_with(
    RuleFns::<Transform>::new(custom_serialize, custom_deserialize)
);

fn custom_serialize(
    ctx: &SerializeCtx,
    component: &Transform,
    message: &mut Vec<u8>,
) -> Result<()> {
    // 自定义序列化逻辑
    // 例如：只序列化位置，忽略旋转和缩放
    postcard::to_extend(&component.translation, message)?;
    Ok(())
}

fn custom_deserialize(
    ctx: &mut WriteCtx,
    message: &mut Bytes,
) -> Result<Transform> {
    let translation = postcard::from_bytes(message)?;
    Ok(Transform {
        translation,
        ..Default::default()
    })
}
```

### 2. 客户端标记系统

自定义组件在客户端的写入行为：

```rust
// 注册标记
app.register_marker::<PredictionMarker>();

// 设置标记函数
app.set_marker_fns::<PredictionMarker, Position>(
    write_predicted_position,
    remove_position,
);

fn write_predicted_position(
    ctx: &mut WriteCtx,
    entity: &mut EntityMut,
    component: Position,
) {
    // 自定义写入逻辑
    // 例如：存储历史用于回滚
    entity.insert((component, PositionHistory::new(component)));
}
```

### 3. 自定义后端集成

实现消息传输后端：

```rust
pub trait MessagingBackend {
    fn send(&mut self, client: Entity, channel: usize, message: Bytes);
    fn receive(&mut self, channel: usize) -> Vec<(Entity, Bytes)>;
    fn connect(&mut self, client_id: ClientId) -> Entity;
    fn disconnect(&mut self, client: Entity);
}

// 集成示例
impl Plugin for CustomBackendPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            PreUpdate,
            receive_packets.in_set(ServerSet::ReceivePackets),
        )
        .add_systems(
            PostUpdate,
            send_packets.in_set(ServerSet::SendPackets),
        );
    }
}
```

### 4. 自定义事件处理

实现特殊的事件序列化：

```rust
// 支持反射的事件
app.add_server_event_with(
    Channel::Ordered,
    serialize_reflect_event,
    deserialize_reflect_event,
);

fn serialize_reflect_event(
    ctx: &mut ServerSendCtx,
    event: &ReflectEvent,
    message: &mut Vec<u8>,
) -> Result<()> {
    let registry = ctx.type_registry.read();
    let serializer = ReflectSerializer::new(&*event.0, &registry);
    serializer.serialize(message)?;
    Ok(())
}
```

### 5. 实体关系同步

确保相关实体同步更新：

```rust
// 确保父子关系同步
app.sync_related_entities::<(Parent, Children)>();

// 自定义关系同步
app.sync_related_entities_with(
    track_physics_joints,
    apply_physics_constraints,
);
```

---

## 性能优化建议

### 1. 合理设置 Tick Rate

```rust
// 降低更新频率以节省带宽
app.insert_resource(Time::<Fixed>::from_hz(30.0));

// 或为不同系统设置不同频率
app.add_plugins(ServerPlugin {
    tick_schedule: MyCustomSchedule.intern(),
    ..Default::default()
});
```

### 2. 使用组件过滤

只复制必要的组件：

```rust
// 避免复制纯客户端组件
app.replicate_filtered::<Transform, Without<ClientOnly>>();
```

### 3. 实现 LOD 系统

```rust
fn update_lod(
    mut priorities: Query<&mut PriorityMap>,
    players: Query<&Transform, With<Player>>,
    entities: Query<(Entity, &Transform), Without<Player>>,
) {
    let mut priority_map = priorities.single_mut();
    let player_pos = players.single();

    for (entity, transform) in &entities {
        let distance = player_pos.translation.distance(transform.translation);

        // 基于距离设置优先级
        let priority = (1000.0 / (distance + 1.0)).clamp(0.01, 1.0);
        priority_map.insert(entity, priority);
    }
}
```

### 4. 批量操作

批量处理实体以减少开销：

```rust
// 批量生成实体
let entities: Vec<Entity> = (0..1000)
    .map(|i| {
        commands.spawn((
            Replicated,
            Transform::from_translation(Vec3::new(i as f32, 0.0, 0.0)),
        )).id()
    })
    .collect();

// 批量更新
for entity in entities {
    // 批量操作
}
```

---

## 调试与故障排除

### 启用调试日志

```bash
RUST_LOG=bevy_replicon=debug cargo run
```

### 常见问题诊断

1. **协议不匹配**
   - 确保服务器和客户端组件注册顺序一致
   - 检查 ProtocolHash 是否匹配

2. **实体未同步**
   - 验证实体有 `Replicated` 组件
   - 检查可见性设置
   - 确认客户端已授权

3. **组件未更新**
   - 检查复制规则是否正确注册
   - 验证组件变更检测是否触发
   - 检查优先级设置

4. **事件未接收**
   - 确认事件已正确注册
   - 检查通道设置
   - 验证发送模式是否包含目标客户端

### 性能分析

使用内置诊断插件：

```rust
#[cfg(feature = "client_diagnostics")]
app.add_plugins(ClientDiagnosticsPlugin);

// 访问统计信息
fn print_stats(stats: Res<ClientReplicationStats>) {
    info!("Messages: {}, Bytes: {}", stats.messages, stats.bytes);
    info!("Entities changed: {}", stats.entities_changed);
}
```

---

## 总结

Bevy Replicon 提供了一个强大而灵活的网络复制框架，通过以下关键设计实现了高效的多人游戏开发：

1. **服务器权威架构**确保游戏状态的一致性和安全性
2. **自动变更检测**简化了同步逻辑的实现
3. **双通道传输策略**优化了不同类型数据的传输
4. **灵活的可见性和优先级系统**支持大规模多人游戏
5. **丰富的扩展点**允许深度定制以满足特定需求

该框架成功地在易用性和灵活性之间取得了平衡，既提供了高级 API 快速实现基础功能，又保留了底层控制能力以应对复杂场景。通过模块化设计和清晰的抽象层次，Bevy Replicon 为构建可靠、高效的多人游戏提供了坚实的基础。