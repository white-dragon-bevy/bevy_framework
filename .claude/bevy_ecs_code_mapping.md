# Bevy ECS 代码映射索引

本文档提供 `bevy_ecs` crate 的详细代码映射,包含所有重要的设计概念及其文件位置。

## 目录
- [1. 核心概念层](#1-核心概念层)
- [2. 数据存储层](#2-数据存储层)
- [3. 查询与访问层](#3-查询与访问层)
- [4. 系统层](#4-系统层)
- [5. 调度层](#5-调度层)
- [6. 事件与观察者层](#6-事件与观察者层)
- [7. 高级特性层](#7-高级特性层)
- [8. 辅助系统层](#8-辅助系统层)
- [9. 宏导出](#9-宏导出)

---

## 1. 核心概念层

### 1.1 World (世界)
**职责**: ECS 的核心容器,管理所有实体、组件、资源和系统

| 类型/函数 | 文件位置 | 说明 |
|---------|---------|------|
| `World` | `src/world/mod.rs:90` | 主要结构体定义 |
| `WorldId` | `src/world/identifier.rs` | 唯一标识 World 实例 |
| `UnsafeWorldCell` | `src/world/unsafe_world_cell.rs` | 不安全的 World 访问视图 |
| `DeferredWorld` | `src/world/deferred_world.rs` | 延迟命令执行的 World 视图 |
| `CommandQueue` | `src/world/command_queue.rs` | 命令队列实现 |

**关键方法**:
- `spawn()` - 创建实体
- `despawn()` - 销毁实体
- `insert_resource()` / `remove_resource()` - 资源管理
- `query()` - 创建查询
- `run_schedule()` - 执行调度

### 1.2 Entity (实体)
**职责**: 实体标识符和生命周期管理

| 类型/函数 | 文件位置 | 说明 |
|---------|---------|------|
| `Entity` | `src/entity/mod.rs` | 实体 ID (索引 + 世代) |
| `EntityRow` | `src/entity/mod.rs:113` | 实体在表中的行索引 |
| `Entities` | `src/entity/mod.rs` | 实体分配器和元数据管理器 |
| `EntityMapper` | `src/entity/map_entities.rs` | 实体 ID 映射接口 |
| `EntityHashMap` | `src/entity/hash_map.rs` | 针对 Entity 优化的 HashMap |
| `EntityHashSet` | `src/entity/hash_set.rs` | 针对 Entity 优化的 HashSet |

**实体引用类型**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `EntityRef` | `src/world/entity_ref.rs` | 不可变实体引用 |
| `EntityMut` | `src/world/entity_ref.rs` | 可变实体引用 |
| `EntityWorldMut` | `src/world/entity_ref.rs` | 完整 World 访问的可变实体引用 |
| `FilteredEntityRef` | `src/world/entity_ref.rs` | 过滤后的实体引用 |
| `FilteredEntityMut` | `src/world/entity_ref.rs` | 过滤后的可变实体引用 |

### 1.3 Component (组件)
**职责**: 实体的数据载体

| 类型/函数 | 文件位置 | 说明 |
|---------|---------|------|
| `Component` trait | `src/component/mod.rs:24` | 组件标记 trait |
| `ComponentId` | `src/component/info.rs` | 组件类型的唯一标识符 |
| `ComponentInfo` | `src/component/info.rs` | 组件元数据 |
| `Components` | `src/component/register.rs` | 组件注册表 |
| `ComponentDescriptor` | `src/component/info.rs` | 组件描述符 |
| `StorageType` | `src/component/info.rs` | 存储类型枚举 (Table/SparseSet) |

**组件特性**:
| 特性 | 文件位置 | 说明 |
|-----|---------|------|
| `ComponentHooks` | `src/lifecycle.rs` | 组件生命周期钩子 |
| `RequiredComponents` | `src/component/required.rs` | 必需组件系统 |
| `ComponentClone` | `src/component/clone.rs` | 组件克隆行为 |
| `ComponentTicks` | `src/component/tick.rs` | 组件变更追踪 tick |

### 1.4 Bundle (组件包)
**职责**: 组件的集合,用于批量操作

| 类型/函数 | 文件位置 | 说明 |
|---------|---------|------|
| `Bundle` trait | `src/bundle/mod.rs:80` | Bundle trait 定义 |
| `BundleId` | `src/bundle/info.rs` | Bundle 类型标识符 |
| `BundleInfo` | `src/bundle/info.rs` | Bundle 元数据 |
| `Bundles` | `src/bundle/info.rs` | Bundle 注册表 |
| `BundleSpawner` | `src/bundle/spawner.rs` | Bundle 批量生成器 |
| `BundleInserter` | `src/bundle/insert.rs` | Bundle 插入器 |
| `BundleRemover` | `src/bundle/remove.rs` | Bundle 移除器 |

---

## 2. 数据存储层

### 2.1 Archetype (原型)
**职责**: 具有相同组件集合的实体的布局

| 类型/函数 | 文件位置 | 说明 |
|---------|---------|------|
| `Archetype` | `src/archetype.rs` | 原型定义 |
| `ArchetypeId` | `src/archetype.rs` | 原型标识符 |
| `Archetypes` | `src/archetype.rs` | 原型集合 |
| `ArchetypeRow` | `src/archetype.rs` | 实体在原型中的行索引 |
| `ArchetypeGeneration` | `src/archetype.rs` | 原型世代,用于检测新原型 |

### 2.2 Storage (存储)
**职责**: 底层数据存储实现

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Storages` | `src/storage/mod.rs:37` | 顶层存储容器 |
| `Tables` | `src/storage/table/mod.rs` | Table 存储集合 |
| `Table` | `src/storage/table/mod.rs` | 单个 Table (列式存储) |
| `TableRow` | `src/storage/table/mod.rs` | Table 中的行索引 |
| `TableId` | `src/storage/table/mod.rs` | Table 标识符 |
| `Column` | `src/storage/table/column.rs` | Table 的列 (单个组件类型) |
| `SparseSets` | `src/storage/sparse_set.rs` | SparseSet 存储集合 |
| `SparseSet` | `src/storage/sparse_set.rs` | 稀疏集存储 |

**底层数据结构**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `BlobVec` | `src/storage/blob_vec.rs` | 类型擦除的 Vec |
| `BlobArray` | `src/storage/blob_array.rs` | 类型擦除的数组 |
| `ThinArrayPtr` | `src/storage/thin_array_ptr.rs` | 瘦指针数组 |

### 2.3 Resource (资源)
**职责**: 全局单例数据

| 类型/函数 | 文件位置 | 说明 |
|---------|---------|------|
| `Resource` trait | `src/resource.rs` | 资源标记 trait |
| `Resources` | `src/storage/resource.rs` | 资源存储容器 |
| `ResourceData` | `src/storage/resource.rs` | 单个资源数据 |
| `FromWorld` trait | 使用 bevy_ecs_macros | 从 World 创建资源 |

---

## 3. 查询与访问层

### 3.1 Query (查询)
**职责**: 高效访问和迭代组件数据

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `QueryState` | `src/query/state.rs` | 查询状态 (可缓存) |
| `QueryBuilder` | `src/query/builder.rs` | 动态构建查询 |

**查询迭代器**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `QueryIter` | `src/query/iter.rs` | 不可变查询迭代器 |
| `QueryManyIter` | `src/query/iter.rs` | 多实体查询迭代器 |
| `QueryCombinationIter` | `src/query/iter.rs` | 组合查询迭代器 |
| `QueryParIter` | `src/query/par_iter.rs` | 并行查询迭代器 |

### 3.2 WorldQuery (世界查询)
**职责**: 查询 DSL 的底层实现

| Trait/类型 | 文件位置 | 说明 |
|-----------|---------|------|
| `WorldQuery` trait | `src/query/world_query.rs` | 查询项 trait |
| `QueryData` trait | `src/query/world_query.rs` | 查询数据 trait |
| `ReadOnlyQueryData` trait | `src/query/world_query.rs` | 只读查询数据标记 |

**内置查询类型**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `&T` / `&mut T` | `src/query/fetch.rs` | 组件引用 |
| `Option<T>` | `src/query/fetch.rs` | 可选组件 |
| `Entity` | `src/query/fetch.rs` | 实体 ID |
| `Ref<T>` | `src/query/fetch.rs` | 带变更检测的引用 |
| `Has<T>` | `src/query/filter.rs` | 检查是否有组件 |
| `AnyOf<(T, U, ...)>` | `src/query/fetch.rs` | 任意一个存在 |

### 3.3 QueryFilter (查询过滤器)
**职责**: 过滤查询结果

| 过滤器 | 文件位置 | 说明 |
|-------|---------|------|
| `With<T>` | `src/query/filter.rs` | 必须包含组件 |
| `Without<T>` | `src/query/filter.rs` | 必须不包含组件 |
| `Added<T>` | `src/query/filter.rs` | 新添加的组件 |
| `Changed<T>` | `src/query/filter.rs` | 已变更的组件 |
| `Or<(F1, F2)>` | `src/query/filter.rs` | 逻辑或 |

### 3.4 Access (访问控制)
**职责**: 跟踪系统的读写访问

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Access` | `src/query/access.rs` | 简单访问追踪 |
| `FilteredAccess` | `src/query/access.rs` | 带过滤器的访问追踪 |

---

## 4. 系统层

### 4.1 System (系统)
**职责**: 执行游戏逻辑的函数

| Trait/类型 | 文件位置 | 说明 |
|-----------|---------|------|
| `System` trait | `src/system/system.rs` | 系统 trait |
| `IntoSystem` trait | `src/system/mod.rs:185` | 转换为系统 |
| `FunctionSystem` | `src/system/function_system.rs` | 函数系统 |
| `ExclusiveFunctionSystem` | `src/system/exclusive_function_system.rs` | 独占函数系统 |
| `ObserverSystem` | `src/system/observer_system.rs` | 观察者系统 |

**系统组合器**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `IntoPipeSystem` | `src/system/combinator.rs` | 管道系统 |
| `CombinatorSystem` | `src/system/combinator.rs` | 组合系统 |
| `AdapterSystem` | `src/system/adapter_system.rs` | 适配器系统 |

### 4.2 SystemParam (系统参数)
**职责**: 系统从 World 获取数据的接口

| Trait/类型 | 文件位置 | 说明 |
|-----------|---------|------|
| `SystemParam` trait | `src/system/system_param.rs` | 系统参数 trait |
| `Query<D, F>` | `src/system/query.rs` | 查询参数 |
| `Res<T>` | `src/system/system_param.rs` | 不可变资源 |
| `ResMut<T>` | `src/system/system_param.rs` | 可变资源 |
| `Commands` | `src/system/commands/mod.rs` | 命令缓冲 |
| `Local<T>` | `src/system/system_param.rs` | 本地状态 |
| `ParamSet<T>` | `src/system/system_param.rs` | 参数集 (解决冲突访问) |
| `Deferred<T>` | `src/system/system_param.rs` | 延迟参数 |
| `Populated<T>` | `src/system/system_param.rs` | 已填充参数 |
| `NonSend<T>` | `src/system/system_param.rs` | 非 Send 资源 |
| `NonSendMut<T>` | `src/system/system_param.rs` | 可变非 Send 资源 |

**系统参数构建器**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `SystemParamBuilder` | `src/system/builder.rs` | 动态系统参数构建 |
| `DynSystemParam` | `src/system/builder.rs` | 动态系统参数 |

### 4.3 Commands (命令)
**职责**: 延迟 World 修改

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `Commands` | `src/system/commands/mod.rs` | 命令缓冲器 |
| `EntityCommands` | `src/system/commands/mod.rs` | 实体命令 |
| `Command` trait | `src/system/commands/command.rs` | 命令 trait |
| `EntityCommand` trait | `src/system/commands/entity_command.rs` | 实体命令 trait |
| `ParallelCommands` | `src/system/commands/parallel_scope.rs` | 并行命令作用域 |

---

## 5. 调度层

### 5.1 Schedule (调度)
**职责**: 管理和执行系统的调度器

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Schedule` | `src/schedule/schedule.rs` | 调度定义 |
| `Schedules` | `src/schedule/schedule.rs` | 调度集合资源 |
| `ScheduleLabel` trait | `src/schedule/set.rs` | 调度标签 |
| `IntoScheduleConfigs` | `src/schedule/config.rs` | 转换为调度配置 |

### 5.2 SystemSet (系统集)
**职责**: 系统分组和排序

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `SystemSet` trait | `src/schedule/set.rs` | 系统集 trait |
| `IntoSystemSet` trait | `src/schedule/set.rs` | 转换为系统集 |
| `SystemTypeSet` | `src/schedule/set.rs` | 基于类型的系统集 |
| `AnonymousSet` | `src/schedule/set.rs` | 匿名系统集 |

### 5.3 Executor (执行器)
**职责**: 执行调度中的系统

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `SystemExecutor` trait | `src/schedule/executor/mod.rs` | 执行器 trait |
| `SingleThreadedExecutor` | `src/schedule/executor/single_threaded.rs` | 单线程执行器 |
| `MultiThreadedExecutor` | `src/schedule/executor/multi_threaded.rs` | 多线程执行器 |

### 5.4 调度图和拓扑
**职责**: 系统依赖关系图

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `ScheduleGraph` | `src/schedule/graph/mod.rs` | 调度依赖图 |
| `GraphInfo` | `src/schedule/graph/mod.rs` | 图信息 |
| `NodeId` | `src/schedule/node.rs` | 节点 ID |
| `Node` trait | `src/schedule/node.rs` | 图节点 trait |

### 5.5 调度配置
**职责**: 系统排序和条件

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `SystemConfig` | `src/schedule/config.rs` | 系统配置 |
| `SystemCondition` | `src/schedule/condition.rs` | 系统条件 |
| `common_conditions` | `src/schedule/condition.rs` | 常用条件函数 |
| `ApplyDeferred` | - | 应用延迟命令的系统 |

---

## 6. 事件与观察者层

### 6.1 Event (事件)
**职责**: 事件定义和触发

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `Event` trait | `src/event/mod.rs` | 事件 trait |
| `EntityEvent` trait | `src/event/mod.rs` | 实体事件 trait |
| `EventReader` | `src/event/mod.rs` | 事件读取器 (已弃用) |
| `EventWriter` | `src/event/mod.rs` | 事件写入器 (已弃用) |
| `Events<E>` | `src/event/mod.rs` | 事件存储 (已弃用) |

**事件触发**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Trigger<'a>` | `src/event/trigger.rs` | 事件触发器 |
| `On<E, B>` | 系统参数 | 观察者系统参数 |

### 6.2 Observer (观察者)
**职责**: 响应事件的系统

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Observer` | `src/observer/mod.rs` | 观察者组件 |
| `ObserverDescriptor` | `src/observer/mod.rs` | 观察者描述符 |
| `Observers` | `src/observer/centralized_storage.rs` | 集中式观察者存储 |
| `ObservedBy` | `src/observer/distributed_storage.rs` | 分布式观察者引用 |
| `ObserverRunner` | `src/observer/runner.rs` | 观察者运行器函数指针 |

### 6.3 Lifecycle Events (生命周期事件)
**职责**: 组件生命周期事件

| 事件类型 | 文件位置 | 说明 |
|---------|---------|------|
| `Add` | `src/lifecycle.rs` | 组件首次添加 |
| `Insert` | `src/lifecycle.rs` | 组件插入 (覆盖) |
| `Replace` | `src/lifecycle.rs` | 组件替换 |
| `Remove` | `src/lifecycle.rs` | 组件移除 |
| `Despawn` | `src/lifecycle.rs` | 实体销毁 |
| `RemovedComponents<T>` | `src/lifecycle.rs` | 移除组件追踪器 |

### 6.4 Message (消息系统)
**职责**: 新的事件系统实现

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Message` trait | `src/message/mod.rs` | 消息 trait |
| `Messages<M>` | `src/message/messages.rs` | 消息存储 |
| `MessageReader<M>` | `src/message/message_reader.rs` | 消息读取器 |
| `MessageWriter<M>` | `src/message/message_writer.rs` | 消息写入器 |
| `MessageMutator<M>` | `src/message/message_mutator.rs` | 消息修改器 |
| `MessageRegistry` | `src/message/message_registry.rs` | 消息注册表 |
| `MessageCursor` | `src/message/message_cursor.rs` | 消息游标 |

---

## 7. 高级特性层

### 7.1 Change Detection (变更检测)
**职责**: 跟踪组件和资源的变更

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `DetectChanges` trait | `src/change_detection.rs` | 不可变变更检测 |
| `DetectChangesMut` trait | `src/change_detection.rs` | 可变变更检测 |
| `Ref<T>` | `src/change_detection.rs` | 带变更检测的不可变引用 |
| `Mut<T>` | `src/change_detection.rs` | 带变更检测的可变引用 |
| `MutUntyped` | `src/change_detection.rs` | 类型擦除的可变引用 |
| `Tick` | `src/component/tick.rs` | 变更 tick |

### 7.2 Hierarchy (层级关系)
**职责**: 父子关系管理

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `ChildOf<T>` | `src/hierarchy.rs` | 父子关系组件 |
| `Children` | `src/hierarchy.rs` | 子实体集合 |
| `ChildSpawner` | `src/hierarchy.rs` | 子实体生成器 |
| `children!` macro | `src/hierarchy.rs` | 子实体查询宏 |
| `ChildSpawnerCommands` | `src/hierarchy.rs` | 子实体命令扩展 |

### 7.3 Relationship (关系系统)
**职责**: 通用实体关系

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `RelationshipTarget` | `src/relationship/mod.rs` | 关系目标组件 |
| `RelationshipQuery` | `src/relationship/relationship_query.rs` | 关系查询扩展 |
| `related!` macro | `src/relationship/mod.rs` | 关系查询宏 |
| `RelationshipSourceCollection` | `src/relationship/relationship_source_collection.rs` | 关系源集合 |

### 7.4 Spawn API (高级生成 API)
**职责**: 便捷的实体生成接口

| Trait | 文件位置 | 说明 |
|------|---------|------|
| `Spawn<B>` | `src/spawn.rs` | 生成 Bundle |
| `SpawnWith<C>` | `src/spawn.rs` | 用闭包生成 |
| `SpawnIter<I>` | `src/spawn.rs` | 批量生成 |
| `SpawnRelated<R, S>` | `src/spawn.rs` | 生成关联实体 |
| `WithRelated<R, I>` | `src/spawn.rs` | 带关系生成 |
| `WithOneRelated<R, B>` | `src/spawn.rs` | 带单个关系生成 |

### 7.5 Reflect Integration (反射集成)
**职责**: 与 bevy_reflect 的集成

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `ReflectComponent` | `src/reflect/component.rs` | 组件反射数据 |
| `ReflectResource` | `src/reflect/resource.rs` | 资源反射数据 |
| `ReflectBundle` | `src/reflect/bundle.rs` | Bundle 反射数据 |
| `ReflectFromWorld` | `src/reflect/from_world.rs` | FromWorld 反射数据 |
| `AppTypeRegistry` | `src/reflect/mod.rs` | 类型注册表资源 |

### 7.6 Entity Disabling (实体禁用)
**职责**: 禁用实体而不销毁

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Disabled` | `src/entity_disabling.rs` | 禁用标记组件 |
| `DefaultQueryFilters` | `src/entity_disabling.rs` | 默认查询过滤器资源 |

---

## 8. 辅助系统层

### 8.1 Error Handling (错误处理)
**职责**: 统一错误处理

| 类型/Trait | 文件位置 | 说明 |
|-----------|---------|------|
| `BevyError` trait | `src/error/bevy_error.rs` | 统一错误 trait |
| `Result<T>` | `src/error/mod.rs` | 标准 Result 别名 |
| `ErrorHandler` | `src/error/handler.rs` | 错误处理器 trait |
| `DefaultErrorHandler` | `src/error/handler.rs` | 默认错误处理器 |

**具体错误类型**:
| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `QueryEntityError` | `src/query/error.rs` | 查询错误 |
| `EntityDespawnError` | `src/world/error.rs` | 销毁错误 |
| `TryRunScheduleError` | `src/world/error.rs` | 调度运行错误 |
| `ScheduleBuildError` | `src/schedule/error.rs` | 调度构建错误 |

### 8.2 Label System (标签系统)
**职责**: 类型安全的标签

| Trait | 文件位置 | 说明 |
|------|---------|------|
| `Label` trait | `src/label.rs` | 标签 trait |
| 各种 `*Label` | 各模块 | ScheduleLabel, SystemSet 等 |

### 8.3 Batching (批处理)
**职责**: 批量操作支持

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Batch` | `src/batching.rs` | 批处理迭代器 |
| `BatchingStrategy` | `src/batching.rs` | 批处理策略 |

### 8.4 Name (命名)
**职责**: 实体命名

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Name` | `src/name.rs` | 名称组件 |
| `NameOrEntity` | `src/name.rs` | 名称或实体显示 |

### 8.5 Traversal (遍历)
**职责**: 图遍历辅助

| Trait | 文件位置 | 说明 |
|------|---------|------|
| `Traversal` trait | `src/traversal.rs` | 遍历 trait |

### 8.6 Intern (字符串驻留)
**职责**: 高效字符串存储

| 类型 | 文件位置 | 说明 |
|-----|---------|------|
| `Interned<T>` | `src/intern.rs` | 驻留的值 |
| `Interner<T>` | `src/intern.rs` | 驻留器 |

---

## 9. 宏导出

### 9.1 派生宏 (bevy_ecs_macros crate)

| 宏 | 用途 | 相关文件 |
|----|-----|---------|
| `#[derive(Component)]` | 派生 Component trait | `src/component/mod.rs` |
| `#[derive(Bundle)]` | 派生 Bundle trait | `src/bundle/mod.rs` |
| `#[derive(Resource)]` | 派生 Resource trait | `src/resource.rs` |
| `#[derive(Event)]` | 派生 Event trait | `src/event/mod.rs` |
| `#[derive(Message)]` | 派生 Message trait | `src/message/mod.rs` |
| `#[derive(QueryData)]` | 派生 QueryData trait | `src/query/world_query.rs` |
| `#[derive(QueryFilter)]` | 派生 QueryFilter trait | `src/query/filter.rs` |
| `#[derive(SystemParam)]` | 派生 SystemParam trait | `src/system/system_param.rs` |

### 9.2 函数式宏

| 宏 | 用途 | 相关文件 |
|----|-----|---------|
| `children!` | 查询子实体 | `src/hierarchy.rs` |
| `related!` | 查询关联实体 | `src/relationship/mod.rs` |

---

## 10. 模块依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                          World                              │
│  (ECS 容器,协调所有子系统)                                   │
└────────────┬────────────────────────────────────────────────┘
             │
      ┌──────┴──────┬──────────┬─────────────┬────────────┐
      │             │          │             │            │
   ┌──▼──┐      ┌──▼──┐   ┌───▼───┐    ┌────▼────┐  ┌───▼────┐
   │Entity│      │Compo-│   │Bundle │    │Resource │  │Storages│
   │     │      │nent  │   │       │    │         │  │        │
   └──┬──┘      └──┬───┘   └───┬───┘    └─────────┘  └───┬────┘
      │            │           │                          │
      │     ┌──────┴───────┐   │                    ┌─────▼─────┐
      │     │              │   │                    │  Tables   │
      │  ┌──▼──────┐  ┌────▼───▼──┐               │SparseSets │
      │  │Archetype│  │BundleInfo │               └───────────┘
      │  └─────────┘  └───────────┘
      │
   ┌──▼───────────────────────────────────────┐
   │         Query & Access                   │
   │  (QueryState, WorldQuery, Filters)       │
   └──┬───────────────────────────────────────┘
      │
   ┌──▼───────────────────────────────────────┐
   │            System                        │
   │  (FunctionSystem, SystemParam)           │
   └──┬───────────────────────────────────────┘
      │
   ┌──▼───────────────────────────────────────┐
   │           Schedule                       │
   │  (SystemSet, Executor, Graph)            │
   └──────────────────────────────────────────┘

   ┌──────────────────────────────────────────┐
   │      Event & Observer (横切层)            │
   │  (Event, Observer, Lifecycle)            │
   └──────────────────────────────────────────┘
```

---

## 11. 设计模式索引

### 11.1 Builder 模式
- `QueryBuilder` - `src/query/builder.rs`
- `SystemParamBuilder` - `src/system/builder.rs`
- `ScheduleBuilder` - 隐式在 `Schedule` 中

### 11.2 Visitor 模式
- `EntityMapper` - `src/entity/map_entities.rs`
- 遍历实体时映射 Entity ID

### 11.3 Command 模式
- `Command` trait - `src/system/commands/command.rs`
- `EntityCommand` trait - `src/system/commands/entity_command.rs`
- 延迟执行 World 修改

### 11.4 Iterator 模式
- `QueryIter` 系列 - `src/query/iter.rs`
- `MessageCursor` - `src/message/message_cursor.rs`
- 高效遍历组件数据

### 11.5 Strategy 模式
- `BatchingStrategy` - `src/batching.rs`
- `SystemExecutor` - `src/schedule/executor/mod.rs`
- 不同的执行策略

### 11.6 Observer 模式
- `Observer` 组件 - `src/observer/mod.rs`
- `Event` + `Trigger` - `src/event/`
- 事件驱动架构

### 11.7 Flyweight 模式
- `ComponentId`, `BundleId`, `ArchetypeId` - 各自模块
- 共享组件/Bundle 元数据

### 11.8 Proxy 模式
- `EntityRef` / `EntityMut` - `src/world/entity_ref.rs`
- `UnsafeWorldCell` - `src/world/unsafe_world_cell.rs`
- 受控的 World 访问

### 11.9 Adapter 模式
- `AdapterSystem` - `src/system/adapter_system.rs`
- 转换系统输入输出

### 11.10 Composite 模式
- `Bundle` 嵌套 - `src/bundle/mod.rs`
- Tuple Bundle 实现

---

## 12. 关键性能优化点

### 12.1 内存布局
- **Archetype 存储**: 按组件类型布局实体,提高缓存局部性
  - `src/archetype.rs`
  - `src/storage/table/mod.rs`

- **SparseSet**: 稀疏组件高效随机访问
  - `src/storage/sparse_set.rs`

### 12.2 并行执行
- **系统并行**: 基于访问冲突分析
  - `src/schedule/executor/multi_threaded.rs`
  - `src/query/access.rs`

- **查询并行迭代**: 数据并行
  - `src/query/par_iter.rs`

### 12.3 变更检测
- **Tick-based**: 高效的变更追踪
  - `src/component/tick.rs`
  - `src/change_detection.rs`

### 12.4 批量操作
- **Batch API**: 减少开销
  - `src/world/spawn_batch.rs`
  - `src/batching.rs`

---

## 13. 迁移到 TypeScript/Matter 的注意事项

### 13.1 核心差异

| Bevy ECS 特性 | Matter 对应 | 迁移建议 |
|--------------|------------|---------|
| Archetype 存储 | 自动管理 | Matter 自动优化,无需手动管理 |
| SparseSet 存储 | 无区别 | 统一为 Matter 存储 |
| 系统并行 | 无内置 | 使用 Roblox `task.spawn` |
| 变更检测 | 手动实现 | 使用 `useChange` hook |
| Commands 延迟 | 无内置 | 实现 CommandBuffer 类 |
| Schedule 图 | 简单顺序 | 实现依赖排序系统 |

### 13.2 可直接映射的概念
- ✅ Entity → Matter Entity
- ✅ Component → Matter Component
- ✅ Query → Matter Query
- ✅ World → Matter World
- ✅ System → 系统函数

### 13.3 需要重新设计的部分
- ⚠️ Bundle → 自定义实现
- ⚠️ Resource → 单独的管理器
- ⚠️ Observer → 使用 Matter hooks
- ⚠️ Hierarchy → ChildOf 关系组件
- ⚠️ Schedule → 简化的调度系统

---

## 14. 常用代码路径

### 14.1 创建和查询实体
```
World::spawn()
  → EntityWorldMut::insert()
    → Bundles::register_info()
      → Archetypes::get_or_create()
        → Tables::get_or_create()

World::query()
  → QueryState::new()
    → QueryState::iter()
      → QueryIter::next()
```

### 14.2 运行系统
```
Schedule::run()
  → SystemExecutor::run()
    → System::run()
      → FunctionSystem::run_unsafe()
        → SystemParam::get_param()
```

### 14.3 触发事件
```
World::trigger()
  → World::trigger_ref_with()
    → Observers::get_observers()
      → ObserverRunner::run()
```

---

## 15. 参考资源

- **源码位置**: `bevy-origin/crates/bevy_ecs/`
- **文档**: `bevy-origin/crates/bevy_ecs/README.md`
- **示例**: `bevy-origin/crates/bevy_ecs/examples/`
- **测试**: 各模块的 `tests.rs` 和 `#[test]` 函数

---

**文档版本**: v0.17.0
**生成日期**: 2025-09-28
**维护者**: Claude (AI Assistant)