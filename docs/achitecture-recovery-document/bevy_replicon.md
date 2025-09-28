# 源代码分析与设计文档

**分析代码路径:** bevy-origin-packages\bevy_replicon

**版本信息:** v0.34.4
**目标引擎:** Bevy 0.16.0
**开发语言:** Rust
**设计模式:** 服务器权威型网络复制

---

## 前言:代码映射索引

本节提供设计概念与源文件位置的精确映射关系,便于快速定位特定功能的实现位置。

| 设计概念 | 源文件路径 | 说明 |
|---------|-----------|------|
| **核心入口与插件系统** |
| 主库入口 | `src/lib.rs` | 插件组注册、预导出模块定义 |
| 共享插件 | `src/shared.rs` | 客户端和服务器共享的基础设施 |
| 服务器插件 | `src/server.rs` | 服务器端复制发送逻辑 |
| 客户端插件 | `src/client.rs` | 客户端复制接收和应用逻辑 |
| **复制注册与规则** |
| 复制注册表 | `src/shared/replication/registry.rs` | 组件序列化/反序列化函数存储 |
| 复制规则 | `src/shared/replication/rules.rs` | 组件复制规则定义和匹配 |
| 规则函数 | `src/shared/replication/registry/rule_fns.rs` | 序列化和反序列化函数类型 |
| 组件函数 | `src/shared/replication/registry/component_fns.rs` | 组件写入和移除的命令函数 |
| **服务器端复制** |
| 复制消息 | `src/server/replication_messages.rs` | 更新和变更消息的组织 |
| 更新消息 | `src/server/replication_messages/updates.rs` | 实体生成、删除、插入消息 |
| 变更消息 | `src/server/replication_messages/mutations.rs` | 组件突变消息,带优先级 |
| 序列化数据 | `src/server/replication_messages/serialized_data.rs` | 消息序列化缓冲管理 |
| 客户端可见性 | `src/server/client_visibility.rs` | 每客户端实体可见性控制 |
| 关联实体 | `src/server/related_entities.rs` | 实体依赖关系图管理 |
| 服务器Tick | `src/server/server_tick.rs` | 复制时钟计数器 |
| **客户端端接收** |
| 确认历史 | `src/client/confirm_history.rs` | 每实体接收确认的Tick追踪 |
| 变更Tick追踪 | `src/client/server_mutate_ticks.rs` | 变更消息接收的Tick记录 |
| **事件系统** |
| 事件注册表 | `src/shared/event/remote_event_registry.rs` | 网络事件类型注册中心 |
| 客户端事件 | `src/shared/event/client_event.rs` | 客户端到服务器事件定义 |
| 服务器事件 | `src/shared/event/server_event.rs` | 服务器到客户端事件定义 |
| 客户端触发器 | `src/shared/event/client_trigger.rs` | 基于触发器的客户端事件 |
| 服务器触发器 | `src/shared/event/server_trigger.rs` | 基于触发器的服务器事件 |
| **通信后端接口** |
| 后端抽象 | `src/shared/backend.rs` | 消息传递后端接口定义 |
| 通道定义 | `src/shared/backend/channels.rs` | 可靠性和顺序保证的通道 |
| 服务器消息 | `src/shared/backend/server_messages.rs` | 服务器消息缓冲区 |
| 客户端消息 | `src/shared/backend/client_messages.rs` | 客户端消息缓冲区 |
| 连接客户端 | `src/shared/backend/connected_client.rs` | 已连接客户端表示 |
| **实体映射** |
| 服务器实体映射 | `src/shared/server_entity_map.rs` | 服务器实体到客户端实体的双向映射 |
| 客户端实体映射 | `src/server/client_entity_map.rs` | 预生成实体的映射关系 |
| 紧凑实体 | `src/compact_entity.rs` | 实体ID的网络优化序列化 |
| **协议与身份验证** |
| 协议哈希 | `src/shared/protocol.rs` | 客户端和服务器协议版本验证 |
| 客户端ID | `src/shared/client_id.rs` | 唯一客户端标识符 |
| **其他实用工具** |
| Postcard工具 | `src/postcard_utils.rs` | 序列化辅助函数 |
| Tick计数器 | `src/shared/replicon_tick.rs` | 复制计数器抽象 |
| 场景复制 | `src/scene.rs` | 将复制状态导出为Bevy场景 |
| 测试工具 | `src/test_app.rs` | 测试辅助应用程序 |

---

## 1. 系统概述

### 1.1. 核心功能与目的

Bevy Replicon是一个专为Bevy游戏引擎设计的**服务器权威型网络复制框架**。它的核心目标是:

- **自动化世界状态同步**: 将服务器ECS世界的实体和组件变更自动传输到所有连接的客户端
- **防作弊架构**: 采用服务器权威模型,服务器是游戏状态的唯一真实来源
- **网络事件系统**: 提供双向RPC替代方案,支持客户端到服务器和服务器到客户端的事件传输
- **灵活可扩展**: 支持自定义序列化、可见性控制、优先级调度等高级功能
- **抽象I/O层**: 不包含内置网络传输,可与任意消息传递库集成

该框架解决的核心问题是:在分布式游戏架构中,如何高效、安全地将服务器的游戏状态同步到所有客户端,同时保持扩展性和性能优化空间。

### 1.2. 技术栈

**语言与平台支持**:
- Rust语言,基于Bevy ECS框架
- 支持`no_std`环境和无原子CAS操作的平台(如thumbv6m)
- 跨平台:服务器、客户端、监听服务器、单机模式

**核心依赖**:
- `bevy (0.16.0)`: 游戏引擎核心,提供ECS、状态管理、类型注册
- `serde (1.0)`: 序列化框架基础
- `postcard (1.1)`: 高效的二进制序列化格式(默认)
- `bytes (1.10)`: 零拷贝字节缓冲区操作
- `petgraph (0.8)`: 实体依赖关系图构建
- `bitflags (2.6)`: 消息标志位管理
- `fnv (1.0)`: 快速哈希算法

**可选特性**:
- `client`: 客户端功能模块
- `server`: 服务器功能模块
- `client_diagnostics`: 客户端诊断集成
- `scene`: Bevy场景导入导出支持

### 1.3. 关键依赖

**对外依赖**:
- **消息传递后端**: 框架本身不提供I/O,需要集成第三方传输库(如renet2、quinnet、matchbox等)
- **Bevy状态插件**: 需要`StatesPlugin`来管理`ClientState`和`ServerState`

**内部依赖层次**:
```
shared (共享基础设施)
  ├── protocol (协议哈希验证)
  ├── replication (复制规则和注册表)
  ├── event (网络事件系统)
  └── backend (消息后端抽象)
     ↓
server (服务器端发送)
  ├── replication_messages (消息组织)
  ├── client_visibility (可见性过滤)
  └── related_entities (依赖图)
     ↓
client (客户端接收)
  ├── confirm_history (确认追踪)
  └── server_mutate_ticks (变更追踪)
```

---

## 2. 架构分析

### 2.1. 代码库结构

```
bevy_replicon/
├── src/
│   ├── lib.rs                    # 主入口,插件组定义
│   ├── client.rs                 # 客户端复制接收主逻辑
│   │   ├── confirm_history.rs    # 实体级Tick确认历史
│   │   ├── diagnostics.rs        # 诊断指标集成
│   │   ├── event.rs              # 客户端事件插件
│   │   └── server_mutate_ticks.rs # 变更消息Tick追踪
│   ├── server.rs                 # 服务器复制发送主逻辑
│   │   ├── client_entity_map.rs  # 预生成实体映射
│   │   ├── client_visibility.rs  # 每客户端可见性
│   │   ├── event.rs              # 服务器事件插件
│   │   ├── related_entities.rs   # 实体依赖图
│   │   ├── removal_buffer.rs     # 组件移除缓冲
│   │   ├── replication_messages/ # 消息组织模块
│   │   │   ├── updates.rs        # 更新消息(生成/删除/插入)
│   │   │   ├── mutations.rs      # 变更消息(组件突变)
│   │   │   ├── serialized_data.rs # 序列化缓冲区
│   │   │   └── change_ranges.rs  # 变更范围追踪
│   │   ├── server_tick.rs        # 服务器Tick计数器
│   │   └── server_world.rs       # 服务器世界包装器
│   ├── shared/                   # 客户端和服务器共享
│   │   ├── backend/              # 消息后端抽象
│   │   │   ├── channels.rs       # 通道定义
│   │   │   ├── client_messages.rs # 客户端消息缓冲
│   │   │   ├── server_messages.rs # 服务器消息缓冲
│   │   │   └── connected_client.rs # 连接客户端组件
│   │   ├── event/                # 网络事件系统
│   │   │   ├── remote_event_registry.rs # 事件注册表
│   │   │   ├── client_event.rs   # 客户端事件
│   │   │   ├── server_event.rs   # 服务器事件
│   │   │   ├── client_trigger.rs # 客户端触发器
│   │   │   ├── server_trigger.rs # 服务器触发器
│   │   │   └── ctx.rs            # 事件上下文
│   │   ├── replication/          # 复制核心
│   │   │   ├── registry.rs       # 复制注册表
│   │   │   │   ├── component_fns.rs # 组件写入函数
│   │   │   │   ├── command_fns.rs   # 命令函数抽象
│   │   │   │   ├── rule_fns.rs      # 序列化规则函数
│   │   │   │   ├── ctx.rs           # 序列化上下文
│   │   │   │   └── test_fns.rs      # 测试函数
│   │   │   ├── rules.rs          # 复制规则定义
│   │   │   │   ├── component.rs  # 组件规则
│   │   │   │   └── filter.rs     # 过滤器规则
│   │   │   ├── command_markers.rs # 客户端标记系统
│   │   │   ├── client_ticks.rs    # 客户端Tick追踪
│   │   │   ├── deferred_entity.rs # 延迟实体修改
│   │   │   ├── mutate_index.rs    # 变更索引
│   │   │   ├── track_mutate_messages.rs # 变更追踪标志
│   │   │   └── update_message_flags.rs  # 更新消息标志
│   │   ├── protocol.rs           # 协议哈希验证
│   │   ├── replicon_tick.rs      # Tick抽象
│   │   ├── server_entity_map.rs  # 实体映射双向表
│   │   └── client_id.rs          # 客户端标识符
│   ├── compact_entity.rs         # 实体紧凑序列化
│   ├── postcard_utils.rs         # 序列化辅助工具
│   ├── scene.rs                  # 场景导出支持
│   └── test_app.rs               # 测试辅助
├── tests/                        # 集成测试
├── benches/                      # 性能基准测试
├── bevy_replicon_example_backend/ # 示例后端实现
└── Cargo.toml                    # 项目配置
```

**模块职责划分**:
- **`shared`模块**: 提供协议定义、事件系统、复制规则注册等客户端和服务器共用的基础设施
- **`server`模块**: 负责检测服务器世界的变更,序列化变更,组织消息,管理每个客户端的可见性和Tick状态
- **`client`模块**: 负责接收消息,反序列化,应用到本地世界,维护确认历史
- **`backend`子模块**: 定义消息后端需要实现的接口,但不提供具体传输实现

### 2.2. 运行时架构

**部署模式**:

该框架支持四种运行配置:

1. **专用服务器**: 只运行服务器插件和游戏逻辑,无渲染
2. **纯客户端**: 只运行客户端插件,连接到远程服务器
3. **监听服务器**: 服务器和客户端在同一进程,但通过状态系统分离逻辑
4. **单机模式**: 不启动网络,但通过状态模拟服务器权威逻辑

**进程内组件图**:
```
┌─────────────────────────────────────────────┐
│          Bevy App 主进程                     │
│                                             │
│  ┌──────────────┐      ┌──────────────┐   │
│  │  ClientState  │      │ ServerState  │   │
│  │  (Disconnected│      │  (Running)   │   │
│  │  /Connected)  │      │              │   │
│  └───────┬───────┘      └───────┬──────┘   │
│          │                      │          │
│  ┌───────▼───────────┐  ┌───────▼──────┐  │
│  │   ClientPlugin    │  │ ServerPlugin │  │
│  │ ┌───────────────┐ │  │┌────────────┐│  │
│  │ │ReceiveReplication││ ││SendReplication││
│  │ └───────────────┘ │  │└────────────┘│  │
│  │ ┌───────────────┐ │  │┌────────────┐│  │
│  │ │ClientMessages │ │  │││ServerMessages││
│  │ └───────────────┘ │  │└────────────┘│  │
│  └───────┬───────────┘  └────────┬─────┘  │
│          │                       │         │
│  ┌───────▼───────────────────────▼─────┐  │
│  │      消息后端(第三方插件)            │  │
│  │  (例如: bevy_renet, quinnet)        │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
└─────────────────┼───────────────────────────┘
                  │
                  ▼
            网络传输层
         (UDP/TCP/WebRTC等)
```

**关键特性**:
- 客户端和服务器共享同一个ECS世界(在监听服务器模式下)
- 通过状态系统(`ClientState`和`ServerState`)控制系统执行
- 消息通过资源(`ClientMessages`/`ServerMessages`)在Replicon和后端之间传递
- 后端负责实际的网络I/O和连接管理

### 2.3. 核心设计模式

**1. 插件模式(Plugin Pattern)**
- 每个功能模块封装为Bevy插件,支持模块化组合
- `RepliconPlugins`作为插件组,聚合所有子插件
- 支持通过特性标志条件编译客户端/服务器插件

**2. 注册表模式(Registry Pattern)**
- `ReplicationRegistry`: 集中管理所有组件的序列化/反序列化函数
- `RemoteEventRegistry`: 集中管理所有网络事件的发送/接收函数
- 通过ID索引快速查找函数指针,避免运行时类型反射

**3. 规则引擎模式(Rule Engine Pattern)**
- `ReplicationRules`: 存储多个`ReplicationRule`,每个规则定义哪些原型需要复制哪些组件
- 规则有优先级,高优先级规则可以覆盖低优先级规则的序列化函数
- 支持过滤器规则,只复制满足特定条件的实体

**4. 缓冲区模式(Buffer Pattern)**
- `DespawnBuffer`: 缓冲实体删除,统一处理
- `RemovalBuffer`: 缓冲组件移除,避免在迭代中修改
- `BufferedMutations`: 客户端缓冲乱序到达的变更消息

**5. 双重缓冲(Double Buffering)**
- `SerializedData`: 维护序列化缓冲区,所有客户端共享相同的序列化数据,通过范围(Range)引用

**6. 观察者模式(Observer Pattern)**
- 使用Bevy的`Trigger`和`Observer`系统响应实体/组件变更
- 例如:`Trigger<OnRemove, Replicated>`用于检测实体停止复制

**7. 策略模式(Strategy Pattern)**
- `VisibilityPolicy`: 可配置黑名单或白名单策略
- `AuthMethod`: 可配置协议检查、无验证或自定义验证
- 通过函数指针实现序列化/反序列化策略的运行时选择

**8. 享元模式(Flyweight Pattern)**
- 序列化数据通过范围共享,多个客户端引用同一份序列化数据
- 实体ID压缩为紧凑格式,减少重复传输

**9. 命令模式(Command Pattern)**
- `DeferredEntity`: 累积对实体的修改,延迟执行,保证原子性
- `CommandMarkers`: 客户端标记系统允许拦截和自定义组件应用方式

---

## 3. 执行流与生命周期

### 3.1. 应用入口与启动流程

**初始化序列**:

1. **用户添加Replicon插件组**:
   ```
   App::add_plugins(RepliconPlugins)
   ```

2. **`RepliconSharedPlugin::build`阶段**:
   - 注册`ClientState`和`ServerState`状态
   - 初始化`ProtocolHasher`资源
   - 初始化`ReplicationRegistry`和`ReplicationRules`
   - 初始化`RemoteEventRegistry`
   - 注册`DisconnectRequest`事件
   - 根据`auth_method`配置,可能注册`ProtocolHash`和`ProtocolMismatch`触发器

3. **`ServerPlugin::build`阶段**(如果启用):
   - 初始化资源:`ServerMessages`, `ServerTick`, `DespawnBuffer`, `RemovalBuffer`等
   - 配置系统集:`ServerSet::ReceivePackets`, `ServerSet::Receive`, `ServerSet::Send`等
   - 注册观察者:`handle_connects`, `handle_disconnects`, `buffer_despawns`
   - 在`tick_schedule`中添加`increment_tick`系统(默认`FixedPostUpdate`)
   - 在`PostUpdate`中添加`send_replication`系统,只在`ServerTick`变化时运行
   - 根据`visibility_policy`配置`ClientVisibility`为必需组件

4. **`ClientPlugin::build`阶段**(如果启用):
   - 初始化资源:`ClientMessages`, `ServerEntityMap`, `ServerUpdateTick`, `BufferedMutations`
   - 注册事件:`EntityReplicated`, `MutateTickReceived`
   - 配置系统集:`ClientSet::ReceivePackets`, `ClientSet::Receive`, `ClientSet::Send`
   - 在`PreUpdate`中添加`receive_replication`系统,在`ClientState::Connected`时运行
   - 在`OnEnter(ClientState::Connected)`中也添加`receive_replication`以避免一帧延迟
   - 在`OnExit(ClientState::Connected)`中添加`reset`系统清理状态

5. **事件插件注册**(如果启用):
   - `ServerEventPlugin`: 初始化`BufferedServerEvents`
   - `ClientEventPlugin`: 配置客户端事件系统集

6. **`RepliconSharedPlugin::finish`阶段**:
   - 计算并存储最终的`ProtocolHash`

7. **消息后端插件初始化**(用户添加):
   - 设置通道数量:调用`ServerMessages::setup_client_channels`和`ClientMessages::setup_server_channels`
   - 后端开始管理`ClientState`和`ServerState`转换

8. **用户注册复制规则**:
   ```
   app.replicate::<Position>()
      .replicate::<Health>()
      .add_client_event::<ActionEvent>()
      .add_server_event::<DamageEvent>()
   ```

### 3.2. 请求的生命周期

由于Replicon是推送式复制框架,这里描述**复制消息的生命周期**而非请求响应。

**服务器端发送流程**(每个复制Tick):

```
1. [FixedPostUpdate] increment_tick
   ↓
   ServerTick递增,触发复制

2. [PostUpdate::ServerSet::Send] send_replication
   ↓
   2.1 collect_mappings (收集客户端预生成实体映射)
       → 写入到Updates消息的MAPPINGS段

   2.2 collect_despawns (收集实体删除)
       → 从DespawnBuffer读取
       → 写入到Updates消息的DESPAWNS段
       → 更新ClientVisibility和ClientTicks

   2.3 collect_removals (收集组件移除)
       → 从RemovalBuffer读取
       → 写入到Updates消息的REMOVALS段

   2.4 collect_changes (收集组件变更)
       → 遍历所有复制的原型
       → 对每个实体:
         a. 检查可见性(ClientVisibility)
         b. 检查变更检测(ComponentTicks)
         c. 根据优先级(PriorityMap)决定是写入Updates还是Mutations
         d. 序列化组件数据到SerializedData
         e. 记录范围到Updates或Mutations

   2.5 send_messages
       → 将Updates消息按标志位分段写入ServerMessages
       → 将Mutations消息按图索引分组,拆分为多个包(如果超过MTU)
       → 为每个变更包生成MutateIndex
       → 记录到ClientTicks以追踪确认

3. [PostUpdate::ServerSet::SendPackets] (消息后端)
   ↓
   从ServerMessages::drain_sent()读取消息
   通过网络传输到客户端
```

**客户端接收流程**(每帧或在连接时):

```
1. [PreUpdate::ClientSet::ReceivePackets] (消息后端)
   ↓
   从网络接收数据包
   写入ClientMessages::insert_received()

2. [PreUpdate::ClientSet::Receive] receive_replication
   ↓
   2.1 apply_update_message (处理更新消息)
       → 读取UpdateMessageFlags确定包含的段
       → 按顺序处理:
         a. MAPPINGS: apply_entity_mapping
            - 插入Replicated组件
            - 更新ServerEntityMap

         b. DESPAWNS: apply_despawn
            - 从ServerEntityMap查找本地实体
            - 调用despawn函数

         c. REMOVALS: apply_removals
            - 可能生成新实体(如果实体在同一Tick生成并移除组件)
            - 对每个组件调用remove函数
            - 更新ConfirmHistory

         d. CHANGES: apply_changes
            - 可能生成新实体
            - 对每个组件调用write函数(插入或变更)
            - 更新ConfirmHistory
       → 更新ServerUpdateTick

   2.2 buffer_mutate_message (缓冲变更消息)
       → 读取update_tick, message_tick, mutate_index
       → 插入BufferedMutations(按Tick排序)
       → 发送确认(mutate_index)到ClientChannel::MutationAcks

   2.3 apply_mutate_messages (应用缓冲的变更)
       → 只处理update_tick <= ServerUpdateTick的消息
       → 对每个实体:
         a. 检查ConfirmHistory,忽略过时的变更
         b. 对每个组件调用write或consume_or_write
         c. 更新ConfirmHistory
       → 清除已处理的消息
       → 触发MutateTickReceived事件

3. [PostUpdate::ClientSet::Send] (客户端事件发送)
   ↓
   将确认消息写入ClientMessages

4. [PostUpdate::ClientSet::SendPackets] (消息后端)
   ↓
   从ClientMessages::drain_sent()读取确认
   发送回服务器
```

**确认与清理流程**(服务器端):

```
1. [PreUpdate::ServerSet::ReceivePackets] (消息后端)
   ↓
   接收来自客户端的确认消息

2. [PreUpdate::ServerSet::Receive] receive_acks
   ↓
   解析MutateIndex
   调用ClientTicks::ack_mutate_message
   标记对应变更已确认

3. [PreUpdate::ServerSet::Receive] cleanup_acks (定时运行)
   ↓
   遍历所有ClientTicks
   删除超过mutations_timeout的未确认变更
```

**关键时序约束**:
- 更新消息总是先于变更消息处理
- 变更消息只有在对应的update_tick出现后才会应用
- 客户端维护最近64个Tick的变更接收状态
- 服务器维护未确认变更直到确认或超时

---

## 4. 核心模块/组件深度剖析

### 4.1. 复制注册表模块 (`shared/replication/registry`)

**职责与边界**:
- 集中存储所有组件的序列化、反序列化和写入函数
- 将组件类型映射到函数ID,实现运行时函数查找
- 支持同一组件注册多个序列化函数(用于不同的复制规则)
- 管理客户端标记(Marker)系统的函数槽位

**关键抽象与数据结构**:

- **`ReplicationRegistry`**: 核心注册表资源
  - `components: Vec<(ComponentId, ComponentFns)>`: 每个唯一组件的命令函数集合
  - `rules: Vec<(UntypedRuleFns, usize)>`: 序列化规则及其对应的组件索引
  - `despawn: DespawnFn`: 全局实体删除函数(可覆盖)
  - `marker_slots: usize`: 已注册标记的数量

- **`FnsId`**: 规则函数的唯一标识符,本质是`rules`数组的索引

- **`ComponentFns`**: 存储单个组件的所有写入和移除函数
  - 默认函数:无标记时使用的`UntypedCommandFns`
  - 标记函数:按`CommandMarkerIndex`索引的标记专用函数

- **`UntypedRuleFns`**: 类型擦除的序列化/反序列化函数对
  - `serialize: SerializeFn`: 组件到字节的转换
  - `deserialize: DeserializeFn`: 字节到组件的转换
  - `deserialize_in_place: DeserializeInPlaceFn`: 原地反序列化(用于突变)

- **`UntypedCommandFns`**: 类型擦除的写入/移除函数
  - `write: WriteFn`: 插入或变更组件
  - `remove: RemoveFn`: 移除组件

**内部交互逻辑**:

注册流程:
```
1. 用户调用app.replicate::<Transform>()
   ↓
2. AppRuleExt::replicate_with_priority_filtered
   ↓
3. R::into_rules(&mut ReplicationRegistry)
   ↓
4. ReplicationRegistry::register_rule_fns
   ↓
   a. init_component_fns::<Transform>
      - 检查是否已存在ComponentFns
      - 如果不存在,创建并添加到components数组
   b. 将RuleFns<Transform>转换为UntypedRuleFns
   c. 添加到rules数组,返回FnsId
   ↓
5. 将ComponentRule(包含FnsId)添加到ReplicationRules
```

查询流程:
```
服务器序列化时:
registry.get(fns_id)
  ↓
  返回(ComponentId, &ComponentFns, &UntypedRuleFns)
  ↓
  调用UntypedRuleFns.serialize()

客户端反序列化时:
registry.get(fns_id)
  ↓
  返回(ComponentId, &ComponentFns, &UntypedRuleFns)
  ↓
  调用UntypedRuleFns.deserialize()
  ↓
  调用ComponentFns的write或remove
```

**观察到的设计模式**:
- **分离关注点**: 序列化逻辑(RuleFns)与ECS写入逻辑(CommandFns)分离
- **类型擦除**: 使用函数指针和`Ptr`实现泛型组件的统一处理
- **索引查找**: 通过FnsId快速查找,避免TypeId哈希查找的开销

### 4.2. 复制规则引擎 (`shared/replication/rules`)

**职责与边界**:
- 定义哪些实体原型的哪些组件需要复制
- 支持基于优先级的规则覆盖
- 支持原型过滤器(With/Without/Or)
- 在服务器端匹配实体原型到规则

**关键抽象与数据结构**:

- **`ReplicationRules`**: 按优先级降序排序的规则集合
  - 使用`Vec<ReplicationRule>`,内部按优先级排序

- **`ReplicationRule`**: 单条复制规则
  - `priority: usize`: 规则优先级(越大越优先)
  - `components: Vec<ComponentRule>`: 要复制的组件列表
  - `filters: Vec<FilterRule>`: 原型必须满足的过滤器

- **`ComponentRule`**: 单个组件的复制配置
  - `id: ComponentId`: 组件类型ID
  - `fns_id: FnsId`: 关联的序列化函数ID
  - `mode: ReplicationMode`: `OnChange`(变更时)或`Once`(仅首次)

- **`FilterRule`**: 原型过滤条件
  - `include: Vec<ComponentId>`: 必须包含的组件(With)
  - `exclude: Vec<ComponentId>`: 必须不包含的组件(Without)

- **`ReplicationMode`**:
  - `OnChange`: 每次变更都复制
  - `Once`: 只在实体首次出现时复制一次

**内部交互逻辑**:

规则匹配过程(服务器端`collect_changes`):
```
1. 遍历世界中的所有原型(Archetype)
   ↓
2. 检查原型是否包含Replicated组件
   ↓
3. 在ReplicationRules中查找匹配的规则:
   for rule in rules.iter() (按优先级降序):
     if rule.matches(archetype):
       记录匹配的规则
       break (使用第一个匹配的高优先级规则)
   ↓
4. 将原型和匹配的ComponentRules关联
   ↓
5. 在复制循环中,使用ComponentRules确定要序列化的组件
```

规则插入排序:
```
ReplicationRules::insert(rule):
  ↓
  使用binary_search_by_key找到插入位置
  ↓
  如果优先级相同,插入到同优先级的最后
  ↓
  维持降序排列
```

**观察到的设计模式**:
- **责任链模式**: 按优先级顺序尝试匹配规则,找到第一个匹配即停止
- **组合模式**: 规则由多个组件规则和过滤器组合而成
- **策略模式**: 不同的ReplicationMode代表不同的复制策略

### 4.3. 服务器复制消息模块 (`server/replication_messages`)

**职责与边界**:
- 组织和序列化所有类型的复制消息
- 管理每个客户端的两种消息类型:更新消息和变更消息
- 实现消息分段和MTU分包
- 维护共享的序列化缓冲区以避免重复序列化

**关键抽象与数据结构**:

- **`Updates`**: 更新消息构建器(每客户端)
  - `mappings: Option<ChangeRanges>`: 实体映射范围
  - `despawns: ChangeRanges`: 实体删除范围
  - `removals: ChangeRanges`: 组件移除范围
  - `changes: ChangeRanges`: 组件插入/变更范围

- **`Mutations`**: 变更消息构建器(每客户端)
  - `graphs: Vec<MutationGraph>`: 按关系图索引分组的变更
  - 每个`MutationGraph`包含实体及其组件变更的范围

- **`SerializedData`**: 共享序列化缓冲区
  - `message: Vec<u8>`: 所有序列化数据的连续存储
  - 客户端通过`Range<usize>`引用数据段

- **`ChangeRanges`**: 变更范围集合
  - `entity_ranges: Vec<Range<usize>>`: 每个实体在缓冲区中的范围
  - `data_ranges: Vec<Range<usize>>`: 每个实体的数据在缓冲区中的范围

**内部交互逻辑**:

更新消息发送流程:
```
1. collect_* 函数向Updates写入各种变更
   ↓
2. Updates::send(messages, client_entity, serialized, server_tick_range)
   ↓
   a. 计算UpdateMessageFlags(MAPPINGS|DESPAWNS|REMOVALS|CHANGES)
   b. 序列化标志位到消息
   c. 序列化server_tick
   d. 对每个段:
      - 如果不是最后一个段,序列化长度
      - 从SerializedData复制范围到消息
   e. 调用messages.send(client_entity, ServerChannel::Updates, data)
```

变更消息发送流程:
```
1. collect_changes向Mutations写入组件突变
   ↓
2. Mutations::send(...)
   ↓
   遍历每个MutationGraph:
     a. 按MTU拆分为多个包
     b. 对每个包:
        - 分配新的MutateIndex
        - 序列化:update_tick, message_tick, messages_count, mutate_index
        - 序列化实体和组件数据
        - 调用ticks.add_mutate_message记录
        - 调用messages.send(client_entity, ServerChannel::Mutations, data)
```

序列化缓冲区管理:
```
SerializedData::write_component(...):
  ↓
  记录起始位置
  ↓
  调用rule_fns.serialize(&ctx, component, &mut self.message)
  ↓
  返回Range<usize>{start..end}
  ↓
  多个客户端可以引用同一个范围
```

**观察到的设计模式**:
- **建造者模式**: Updates和Mutations作为消息构建器,逐步添加段
- **享元模式**: SerializedData共享,多个客户端引用相同数据
- **分段传输**: 变更消息根据MTU拆分,确保不超过网络包大小限制

### 4.4. 客户端可见性模块 (`server/client_visibility`)

**职责与边界**:
- 控制每个客户端能看到哪些实体
- 支持黑名单和白名单两种策略
- 追踪可见性变化(获得/失去)
- 在实体删除时自动清理

**关键抽象与数据结构**:

- **`ClientVisibility`**: 每个授权客户端的组件
  - `list: VisibilityList`: 黑名单或白名单
  - `added: EntityHashSet`: 本Tick新增到列表的实体
  - `removed: EntityHashSet`: 本Tick从列表移除的实体

- **`VisibilityList`**:
  - `Blacklist(EntityHashMap<BlacklistInfo>)`: 黑名单,列表中的实体不可见
  - `Whitelist(EntityHashMap<WhitelistInfo>)`: 白名单,只有列表中的实体可见

- **`Visibility`**: 实体当前可见性状态
  - `Hidden`: 不可见
  - `Gained`: 本Tick获得可见性
  - `Visible`: 可见且上一Tick也可见

**内部交互逻辑**:

设置可见性:
```
ClientVisibility::set_visibility(entity, visible):
  ↓
  match (list, visible):
    (Blacklist, true):  # 设为可见
      如果实体在列表中:
        标记为QueuedForRemoval
        添加到removed集合

    (Blacklist, false): # 设为不可见
      如果实体不在列表中:
        添加到列表,标记为Hidden
        添加到added集合

    (Whitelist, true):  # 设为可见
      如果实体不在列表中:
        添加到列表,标记为JustAdded
        添加到added集合

    (Whitelist, false): # 设为不可见
      如果实体在列表中:
        从列表移除
        添加到removed集合
```

Tick更新:
```
ClientVisibility::update() (每个Tick结束时):
  ↓
  match list:
    Blacklist:
      清空added集合
      遍历removed集合,从列表中移除实体
      清空removed集合

    Whitelist:
      遍历added集合,将JustAdded改为Visible
      清空added集合
      清空removed集合
```

可见性查询:
```
ClientVisibility::state(entity):
  ↓
  match list:
    Blacklist:
      if entity in list && status == QueuedForRemoval:
        return Gained  # 即将可见
      if entity in list && status == Hidden:
        return Hidden
      return Visible   # 不在黑名单中

    Whitelist:
      if entity in list && status == JustAdded:
        return Gained  # 刚获得可见
      if entity in list && status == Visible:
        return Visible
      return Hidden    # 不在白名单中
```

在复制中的使用:
```
collect_changes:
  for entity in archetype:
    visibility = client_visibility.state(entity)
    match visibility:
      Hidden:
        跳过此实体
      Gained:
        强制发送所有组件(即使未变更)
        使用Updates消息
      Visible:
        根据变更检测决定是否发送
        可能使用Mutations消息
```

**观察到的设计模式**:
- **状态模式**: Gained/Visible/Hidden三种状态的转换
- **策略模式**: 黑名单和白名单两种不同的可见性策略
- **延迟更新**: 在Tick内累积变更,Tick结束时统一处理

### 4.5. 客户端接收与应用模块 (`client`)

**职责与边界**:
- 接收和解析服务器的复制消息
- 将变更应用到本地ECS世界
- 维护实体映射(服务器实体↔客户端实体)
- 追踪每个实体的确认Tick历史
- 缓冲乱序到达的变更消息

**关键抽象与数据结构**:

- **`ServerEntityMap`**: 服务器实体到客户端实体的双向映射
  - `to_client: HashMap<Entity, Entity>`: 服务器实体→客户端实体
  - `to_server: HashMap<Entity, Entity>`: 客户端实体→服务器实体

- **`ConfirmHistory`**: 每个复制实体的组件
  - `last_tick: RepliconTick`: 最后接收到的Tick
  - `received_ticks: u64`: 位掩码,记录最近64个Tick的接收状态

- **`BufferedMutations`**: 等待应用的变更消息队列
  - 按`message_tick`降序排序
  - 只有当`update_tick`出现后才会应用

- **`ServerUpdateTick`**: 资源,最后接收到的更新消息Tick

- **`ServerMutateTicks`**: 资源,记录最近64个Tick的变更消息接收状态

**内部交互逻辑**:

消息接收主流程:
```
receive_replication:
  ↓
  1. 处理所有更新消息(ServerChannel::Updates):
     for message in messages.receive(Updates):
       apply_update_message(world, params, message)

  2. 缓冲所有变更消息(ServerChannel::Mutations):
     for message in messages.receive(Mutations):
       buffer_mutate_message(params, buffered_mutations, message, acks)
     messages.send(ClientChannel::MutationAcks, acks)

  3. 应用缓冲的变更消息:
     apply_mutate_messages(world, params, buffered_mutations, update_tick)
```

更新消息应用:
```
apply_update_message:
  ↓
  读取UpdateMessageFlags
  ↓
  读取message_tick,更新ServerUpdateTick
  ↓
  按标志位顺序处理:
    MAPPINGS → apply_entity_mapping:
      插入Replicated组件
      更新ServerEntityMap

    DESPAWNS → apply_despawn:
      从映射查找客户端实体
      调用registry.despawn
      从映射移除

    REMOVALS → apply_removals:
      可能生成新实体
      对每个组件:
        调用component_fns.remove(entity_markers, entity)
      更新ConfirmHistory

    CHANGES → apply_changes:
      可能生成新实体
      对每个组件:
        调用component_fns.write(rule_fns, entity_markers, entity, message)
      更新ConfirmHistory
```

变更消息应用:
```
apply_mutations:
  ↓
  对每个实体:
    获取ConfirmHistory
    ↓
    检查message_tick > last_tick:
      如果是新Tick:
        更新last_tick
        对每个组件调用write
      否则:
        检查是否有标记需要历史
        调用consume_or_write(可能跳过或应用)
```

确认历史追踪:
```
confirm_tick(entity, tick):
  ↓
  if entity has ConfirmHistory:
    history.set_last_tick(tick)
  else:
    entity.insert(ConfirmHistory::new(tick))
  ↓
  发送EntityReplicated事件
```

**观察到的设计模式**:
- **消息队列模式**: BufferedMutations作为优先队列,处理乱序消息
- **映射表模式**: ServerEntityMap维护实体ID的双向映射
- **版本控制**: ConfirmHistory追踪实体的版本历史,拒绝过时的变更

### 4.6. 网络事件系统 (`shared/event`)

**职责与边界**:
- 提供客户端到服务器和服务器到客户端的事件传输
- 支持事件(Events)和触发器(Triggers)两种API
- 实现实体映射和类型安全的序列化
- 支持可靠性和顺序保证的通道配置

**关键抽象与数据结构**:

- **`RemoteEventRegistry`**: 所有网络事件的注册表
  - `server_events: Vec<ServerEvent>`: 服务器到客户端的事件
  - `client_events: Vec<ClientEvent>`: 客户端到服务器的事件
  - `server_triggers: Vec<ServerTrigger>`: 服务器到客户端的触发器
  - `client_triggers: Vec<ClientTrigger>`: 客户端到服务器的触发器

- **`FromClient<E>`**: 服务器接收的客户端事件包装器
  - `client_id: ClientId`: 发送者ID
  - `event: E`: 实际事件数据

- **`ToClients<E>`**: 服务器发送的事件包装器
  - `mode: SendMode`: 广播/单播/排除某些客户端
  - `event: E`: 实际事件数据

- **`ServerEvent`/`ClientEvent`**: 事件元数据
  - `type_id: TypeId`: 事件类型标识
  - `channel_id: usize`: 使用的通道索引
  - `send_fn: SendFn`: 序列化和发送函数
  - `receive_fn: ReceiveFn`: 接收和反序列化函数

**内部交互逻辑**:

客户端事件发送流程:
```
1. 用户在客户端调用:
   events.write(MyEvent { data })
   ↓
2. ClientEventPlugin系统(PostUpdate::ClientSet::Send):
   drain events<MyEvent>
   ↓
   for event in events.read():
     (registered_event.send_fn)(event, messages)
   ↓
   序列化event到消息缓冲区
   messages.send(channel_id, data)
   ↓
3. 消息后端发送到网络

4. 服务器接收(PreUpdate::ServerSet::Receive):
   for (client_entity, message) in messages.receive(channel_id):
     (registered_event.receive_fn)(client_entity, message, world)
   ↓
   反序列化event
   如果包含实体,映射到服务器实体
   ↓
   发送FromClient { client_id, event }事件
   ↓
5. 用户系统读取:
   for FromClient { client_id, event } in events.read():
     处理来自客户端的事件
```

服务器事件发送流程:
```
1. 用户在服务器调用:
   events.write(ToClients { mode: Broadcast, event: MyEvent { } })
   ↓
2. ServerEventPlugin系统(PostUpdate::ServerSet::Send):
   drain events<ToClients<MyEvent>>
   ↓
   根据mode决定接收者:
     Broadcast: 所有授权客户端
     Direct(client_id): 特定客户端
     Exclude(ids): 除了指定客户端的所有客户端
   ↓
   for client in clients:
     (registered_event.send_fn)(event, messages, client)
   ↓
   序列化event到消息缓冲区
   messages.send(client_entity, channel_id, data)
   ↓
3. 消息后端发送到网络

4. 客户端接收(PreUpdate::ClientSet::Receive):
   for message in messages.receive(channel_id):
     (registered_event.receive_fn)(message, world)
   ↓
   反序列化event
   如果包含实体,映射到客户端实体
   ↓
   发送MyEvent事件
   ↓
5. 用户系统读取:
   for event in events.read():
     处理来自服务器的事件
```

触发器API:
```
客户端触发器发送:
commands.client_trigger(MyEvent { })
  ↓
  立即序列化并发送,无需等待事件系统

服务器触发器发送:
commands.server_trigger(ToClients { mode, event })
  ↓
  立即序列化并发送

触发器接收:
app.add_observer(my_handler)

fn my_handler(trigger: Trigger<FromClient<MyEvent>>) {
  let client_id = trigger.client_id;
  let event = trigger.event();
  // 处理
}
```

独立事件:
```
app.make_event_independent::<MyEvent>()
  ↓
  标记事件可以在授权前接收
  ↓
  用于协议握手、身份验证等
```

**观察到的设计模式**:
- **包装器模式**: FromClient和ToClients包装实际事件,添加路由信息
- **注册表模式**: 集中管理所有事件的序列化函数
- **发布订阅模式**: 事件发送者和接收者解耦
- **命令模式**: 触发器作为即时执行的命令

---

## 5. 横切关注点

### 5.1. 数据持久化

Replicon本身不直接处理数据库或文件系统持久化,但提供了场景导出功能作为持久化的桥梁。

**场景导出机制** (`scene.rs`):

- **`replicate_into`函数**:
  - 遍历所有带有`Replicated`组件的实体
  - 根据`ReplicationRegistry`确定哪些组件应该序列化
  - 将实体和组件写入Bevy的`DynamicScene`
  - 场景可保存为RON格式文件

**持久化模式**:
```
服务器状态 → DynamicScene → RON文件 → 磁盘
     ↓                            ↓
  复制到客户端              重启后加载
     ↓                            ↓
  客户端状态          服务器恢复状态
```

**ER图(逻辑层面)**:
```
Entity (游戏实体)
  ├── id: Entity (Bevy内部ID)
  ├── Replicated (标记组件)
  └── Components[] (动态组件列表)
        ├── Transform
        ├── Health
        └── ...

ReplicationRule (复制规则)
  ├── priority: usize
  ├── components[] → ComponentRule
  └── filters[] → FilterRule

ComponentRule (组件规则)
  ├── id: ComponentId
  ├── fns_id: FnsId → RuleFns
  └── mode: ReplicationMode

RuleFns (序列化函数)
  ├── serialize: fn
  └── deserialize: fn
```

**缓存策略**:
- 复制过程中,所有客户端共享同一份序列化数据(`SerializedData`)
- 客户端维护`ServerEntityMap`,避免重复映射查找
- 服务器维护`ClientTicks`,缓存每个客户端的确认状态

**访问模式**:
- **写路径**(服务器): ECS World → 变更检测 → 序列化 → 网络发送
- **读路径**(客户端): 网络接收 → 反序列化 → 实体映射 → ECS World应用

### 5.2. 状态管理

Replicon使用Bevy的状态系统(`States`)来管理客户端和服务器的生命周期。

**状态定义**:

- **`ClientState`**:
  - `Disconnected`: 未连接或连接已断开
  - `Connecting`: 正在连接到服务器
  - `Connected`: 已连接到服务器

- **`ServerState`**:
  - `Stopped`: 服务器未运行
  - `Running`: 服务器正在运行,接受连接

**状态转换**:
```
客户端状态机:
Disconnected → Connecting → Connected
     ↑                          ↓
     └──────────────────────────┘
      (断开连接或超时)

服务器状态机:
Stopped ⇄ Running
  (启动/关闭)
```

**状态控制的系统执行**:
- 复制接收系统只在`ClientState::Connected`时运行
- 复制发送系统只在`ServerState::Running`时运行
- 使用`run_if(in_state(...))`条件控制

**跨配置支持**:
- **单机模式**: `ClientState::Disconnected` + `ServerState::Stopped`,所有逻辑本地运行
- **监听服务器**: `ClientState::Disconnected` + `ServerState::Running`,使用服务器逻辑
- **纯客户端**: `ClientState::Connected`,无服务器逻辑
- **专用服务器**: `ServerState::Running`,无客户端逻辑

**状态相关的资源初始化**:
```
OnEnter(ClientState::Connected):
  - 触发receive_replication(避免一帧延迟)
  - 发送ProtocolHash(如果使用协议检查)

OnExit(ClientState::Connected):
  - 清空ClientMessages
  - 清空ServerEntityMap
  - 重置BufferedMutations
  - 重置统计信息

OnExit(ServerState::Running):
  - 清空ServerMessages
  - 重置ServerTick
  - 删除所有ConnectedClient实体
  - 清空事件缓冲
```

### 5.3. 错误处理与弹性设计

**错误类型**:
- **网络错误**: 由消息后端处理,Replicon不直接处理
- **序列化错误**: 在序列化函数中返回`Result`,记录错误但不中断
- **协议错误**: 协议哈希不匹配时断开连接

**容错机制**:

1. **协议版本检查**:
   ```
   客户端连接 → 发送ProtocolHash
         ↓
   服务器验证
         ↓
   匹配 → 插入AuthorizedClient
   不匹配 → 发送ProtocolMismatch → 断开连接
   ```

2. **消息缓冲与重试**:
   - 客户端缓冲乱序到达的变更消息
   - 服务器维护未确认的变更,定期重发(通过不确认机制)

3. **实体不存在处理**:
   - 客户端收到未知实体的变更 → 忽略并记录警告
   - 客户端收到已删除实体的变更 → 忽略
   - 服务器检测到实体已删除 → 停止发送其变更

4. **组件缺失处理**:
   - 反序列化时发现组件不存在 → 跳过并记录错误
   - 使用必需组件(Required Components)机制自动插入依赖

**日志级别策略**:
- **服务器**: 客户端发送的错误数据使用`debug`级别(避免日志泛滥)
- **客户端**: 反序列化错误使用`error`级别(用户需要知道)
- **追踪**: 正常操作使用`trace`级别(开发调试)

**弹性设计**:
- **无原子CAS支持**: 使用条件编译选择`bytes`的`extra-platforms`特性
- **no_std环境**: 使用`alloc`代替`std`,避免标准库依赖
- **实体ID溢出**: 使用紧凑表示,支持大规模实体

### 5.4. 并发模型

Bevy ECS本身是单线程执行(或通过`ParallelExecutor`多线程),Replicon遵循Bevy的并发模型。

**系统执行模型**:
- 系统在特定的`SystemSet`中按依赖顺序执行
- 使用`Mut`和`Res`访问控制确保数据竞争安全
- 消息接收和发送系统独占访问消息缓冲区

**关键并发约束**:
- `receive_replication`系统独占访问`ClientMessages`和`ServerEntityMap`
- `send_replication`系统独占访问`ServerMessages`和所有客户端状态
- 序列化缓冲区(`SerializedData`)在单次`send_replication`调用内共享,无并发

**潜在并发优化点**(当前未实现):
- 多个客户端的消息序列化可以并行
- 不同实体原型的变更检测可以并行
- 但实际收益取决于实体数量和客户端数量

**资源作用域模式**:
```rust
world.resource_scope(|world, mut messages: Mut<ClientMessages>| {
  world.resource_scope(|world, mut entity_map: Mut<ServerEntityMap>| {
    // 嵌套资源作用域,确保借用规则
    apply_replication(world, &mut params, &mut messages, &mut entity_map);
  })
})
```
这种模式避免同时多次可变借用同一资源。

---

## 6. 接口与通信

### 6.1. API 契约

**用户面API**:

1. **插件注册API**:
   ```
   app.add_plugins(RepliconPlugins)
   ```
   - 必须添加`MinimalPlugins`或`DefaultPlugins`
   - 必须添加`StatesPlugin`(如果使用`MinimalPlugins`)

2. **复制规则注册API**:
   ```
   app.replicate::<Component>()
   app.replicate_as::<Component, SerializedForm>()
   app.replicate_with(RuleFns::new(serialize, deserialize))
   app.replicate_filtered::<Component, With<Marker>>()
   app.replicate_bundle::<MyBundle>()
   ```
   - 必须在`RepliconSharedPlugin::finish`前调用
   - 组件必须实现相应的trait(Serialize, DeserializeOwned或自定义)

3. **事件注册API**:
   ```
   app.add_client_event::<Event>(Channel::Ordered)
   app.add_server_event::<Event>(Channel::Reliable)
   app.add_client_trigger::<Event>(Channel::Ordered)
   app.add_server_trigger::<Event>(Channel::Unreliable)
   ```
   - 必须指定通道类型
   - 事件类型必须实现`Event` + `Serialize` + `DeserializeOwned`

4. **可见性控制API**:
   ```
   client_visibility.set_visibility(entity, true/false)
   client_visibility.is_visible(entity)
   ```
   - 只在服务器端可用
   - 只对授权客户端有效

5. **实体映射API**:
   ```
   entity_map.insert(server_entity, client_entity)
   entity_map.to_client().get(&server_entity)
   entity_map.to_server().get(&client_entity)
   ```
   - 客户端使用`ServerEntityMap`读取
   - 服务器使用`ClientEntityMap`写入

**消息后端API契约**:

消息后端需要实现以下职责:

1. **管理状态转换**:
   - 在`ClientSet::ReceivePackets`中更新`ClientState`
   - 在`ServerSet::ReceivePackets`中更新`ServerState`

2. **管理连接实体**:
   - 客户端连接时生成带有`ConnectedClient`组件的实体
   - 客户端断开时删除该实体
   - 响应`DisconnectRequest`事件

3. **传输消息**:
   - 从`ServerMessages::drain_sent()`读取并发送
   - 接收后调用`ClientMessages::insert_received()`
   - 从`ClientMessages::drain_sent()`读取并发送
   - 接收后调用`ServerMessages::insert_received()`

4. **创建通道**:
   - 根据`RepliconChannels`资源创建对应数量的通道
   - 实现可靠性和顺序保证

5. **更新统计**(可选):
   - 更新`ClientStats`资源和组件

### 6.2. 内部通信协议

**消息格式**(二进制,使用postcard序列化):

**1. 更新消息** (ServerChannel::Updates):
```
[UpdateMessageFlags: bitflags(u8)]
[server_tick: RepliconTick(u64)]

-- 如果包含MAPPINGS --
[mappings_count: varint]
for each mapping:
  [server_entity: CompactEntity(2 bytes)]
  [client_entity: CompactEntity(2 bytes)]

-- 如果包含DESPAWNS --
[despawns_count: varint]
for each despawn:
  [entity: CompactEntity(2 bytes)]

-- 如果包含REMOVALS --
[removals_count: varint]
for each removal:
  [entity: CompactEntity(2 bytes)]
  [components_count: varint]
  for each component:
    [fns_id: FnsId(varint)]

-- 如果包含CHANGES (没有count,读到末尾) --
for each entity:
  [entity: CompactEntity(2 bytes)]
  [components_count: varint]
  for each component:
    [fns_id: FnsId(varint)]
    [component_data: bytes(由serialize函数决定)]
```

**2. 变更消息** (ServerChannel::Mutations):
```
[update_tick: RepliconTick(u64)]
[message_tick: RepliconTick(u64)]
[messages_count: varint] (仅在启用TrackMutateMessages时)
[mutate_index: MutateIndex { message: u16, tick: u16 }]

for each entity (读到末尾):
  [entity: CompactEntity(2 bytes)]
  [data_size: varint]
  for each component:
    [fns_id: FnsId(varint)]
    [component_data: bytes(由serialize函数决定)]
```

**3. 确认消息** (ClientChannel::MutationAcks):
```
for each ack (读到末尾):
  [mutate_index: MutateIndex { message: u16, tick: u16 }]
```

**4. 客户端事件** (ClientChannel::Events + channel_id):
```
for each event:
  [event_data: bytes(由EventFns序列化)]
```

**5. 服务器事件** (ServerChannel::Events + channel_id):
```
for each event:
  [event_data: bytes(由EventFns序列化)]
```

**通道类型**:

- **`ServerChannel`**:
  - `Updates`: 可靠有序,用于实体生成/删除/插入/移除
  - `Mutations`: 可靠无序,用于组件变更
  - `Events`: 根据事件注册时指定的通道

- **`ClientChannel`**:
  - `MutationAcks`: 可靠有序,用于确认
  - `Events`: 根据事件注册时指定的通道

**协议版本控制**:
- 使用`ProtocolHash`(128位哈希)验证客户端和服务器的协议一致性
- 哈希计算基于所有注册的复制规则和事件的顺序和类型
- 任何注册顺序或类型的变化都会导致哈希不同

**实体ID压缩**:
```
标准Entity(64位) → CompactEntity(16位)
  - 使用场景内的局部索引
  - 在实体映射时重新映射
  - 节省50%的实体ID传输开销
```

---

## 结语

本文档通过逆向工程的方式,从`bevy_replicon`的源代码中恢复了其完整的架构设计。这是一个精心设计的服务器权威型网络复制框架,展示了以下核心优势:

**设计优势**:
1. **模块化与可扩展性**: 通过插件系统和注册表模式,实现高度可配置的复制策略
2. **性能优化**: 享元模式、缓冲区管理、紧凑序列化等多种优化技术
3. **类型安全**: 利用Rust类型系统和Bevy ECS保证编译期安全
4. **协议无关**: 抽象的消息后端接口支持任意传输层

**技术特色**:
- 规则引擎实现灵活的组件复制策略
- 双消息类型(更新+变更)平衡原子性和带宽
- 每客户端可见性控制支持大规模多人游戏
- 确认机制和缓冲机制处理网络不可靠性

**适用场景**:
- 需要服务器权威的多人游戏(防作弊)
- 需要灵活序列化策略的复杂游戏
- 需要支持多种运行配置(单机/监听服务器/专用服务器)
- 需要高性能网络复制的实时游戏

该框架为Bevy游戏引擎提供了一个生产级的网络复制解决方案,其架构设计值得其他网络游戏框架借鉴。