# Bevy ECS 模块

## 概述

`bevy_ecs` 模块是 Bevy ECS 系统在 Roblox 平台上的 TypeScript 实现，基于 `@rbxts/matter` ECS 框架。该模块提供了与 Rust Bevy 框架类似的 API 接口，使开发者能够在 Roblox 平台上使用熟悉的 Bevy 风格进行游戏开发。

## 公共 API

### 1. 核心世界（World）

#### BevyWorld
扩展的 Matter World 类，提供 Bevy 风格的查询方法。

```typescript
export class BevyWorld extends World {
    constructor()
}
```

#### WorldContainer
用于管理 World 实例的容器接口。

```typescript
export interface WorldContainer {
    world: BevyWorld;
    getWorld(): BevyWorld;
}

export function createWorldContainer(): WorldContainer
```

### 2. 命令缓冲（Command Buffer）

提供延迟执行的命令系统，允许在系统中排队结构性变更。

#### CommandBuffer
主要的命令缓冲器类，用于批量执行 ECS 操作。

```typescript
export class CommandBuffer {
    spawn(components: Component[]): EntityId
    despawn(entityId: EntityId): void
    addComponent(entityId: EntityId, component: Component): void
    removeComponent(entityId: EntityId, componentType: ComponentConstructor): void
    insertResource(resource: Component): void
    removeResource(resourceType: ComponentConstructor): void
    flush(world: World, resourceManager?: ResourceManagerLike): CommandResult[]
    clear(): void
    getCommandCount(): number
    isEmpty(): boolean
}
```

#### 命令类型
```typescript
export enum CommandType {
    Spawn = "spawn",
    Despawn = "despawn",
    AddComponent = "add_component",
    RemoveComponent = "remove_component",
    InsertResource = "insert_resource",
    RemoveResource = "remove_resource",
}
```

### 3. 资源管理（Resources）

独立于 ECS 组件系统的全局资源管理。

#### ResourceManager
管理全局唯一的资源实例。

```typescript
export class ResourceManager {
    getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined
    insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void
    removeResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined
    hasResource<T extends Resource>(resourceType: ResourceConstructor<T>): boolean
    withResource<T extends Resource, R>(
        resourceType: ResourceConstructor<T>,
        callback: (resource: T) => R
    ): R | undefined
    withResourceMut<T extends Resource, R>(
        resourceType: ResourceConstructor<T>,
        callback: (resource: T) => R
    ): R | undefined
    clear(): void
    getResourceCount(): number
}
```

#### Resource 装饰器
```typescript
export function Resource<T extends ResourceConstructor>(target: T): T
export function isResourceType(resourceType: ResourceConstructor): boolean
```

### 4. 事件系统（Events）

提供类似 Bevy 的事件读写机制。

#### EventWriter
用于发送事件。

```typescript
export class EventWriter<T extends Event> {
    send(event: T): void
}
```

#### EventReader
用于读取事件。

```typescript
export class EventReader<T extends Event> {
    read(): T[]
    isEmpty(): boolean
    cleanup(): void
}
```

#### EventManager
管理所有事件类型。

```typescript
export class EventManager {
    createWriter<T extends Event>(eventType: EventConstructor<T>): EventWriter<T>
    createReader<T extends Event>(eventType: EventConstructor<T>): EventReader<T>
    send<T extends Event>(eventType: EventConstructor<T>, event: T): void
    cleanup(): void
}
```

#### 内置事件类型
```typescript
export class EntitySpawnedEvent implements Event
export class EntityDespawnedEvent implements Event
export class ComponentAddedEvent implements Event
export class ComponentRemovedEvent implements Event
```

### 5. 名称组件（Name）

用于标识实体的组件。

#### Name 类
```typescript
export class Name {
    constructor(name: string)
    static create(name: string): Name
    set(name: string): void
    mutate(f: (name: string) => string): void
    asStr(): string
    getName(): string
    getHash(): number
    equals(other: Name): boolean
    clone(): Name
    static default(): Name
}
```

#### 辅助函数
```typescript
export const NameComponent: ComponentCtor<{ name: Name }>
export function withName(world: World, entity: Entity, name: string): void
export function getEntityName(world: World, entity: Entity): string | undefined
export function getNameOrEntity(world: World, entity: Entity): string
```

### 6. 调度系统（Schedule）

提供系统执行的调度和排序功能。

#### 核心类
```typescript
export { Loop } from "./schedule/loop"
export { Schedule } from "./schedule/schedule"
export { Schedules } from "./schedule/schedules"
export { SystemConfigs } from "./schedule/system-configs"
```

#### 系统构建器
```typescript
export {
    system,
    systemArray,
    chain,
    when,
    after,
    before,
    inSet
} from "./schedule/system-builder"
```

#### 类型定义
```typescript
export type {
    SystemFunction,
    RunCondition,
    SystemSet,
    ScheduleLabel,
    SystemConfig,
    SystemSetConfig,
    InternalSystemStruct,
    SchedulerState,
    ScheduleGraph,
    ScheduleStats,
} from "./schedule/types"
```

## 使用示例

### 创建世界和基本操作

```typescript
import { BevyWorld, CommandBuffer } from "bevy_ecs";

// 创建世界
const world = new BevyWorld();

// 创建命令缓冲器
const commands = new CommandBuffer();

// 生成实体
const entityId = commands.spawn([
    NameComponent({ name: new Name("Player") }),
    // 其他组件...
]);

// 执行命令
commands.flush(world);
```

### 资源管理

```typescript
import { ResourceManager, Resource } from "bevy_ecs";


class GameConfig {
    maxPlayers = 4;
    gameDuration = 300;
}

const resourceManager = new ResourceManager();

// 插入资源
resourceManager.insertResource(GameConfig, new GameConfig());

// 获取资源
const config = resourceManager.getResource<GameConfig>();
if (config) {
    print(`Max players: ${config.maxPlayers}`);
}

// 修改资源
resourceManager.withResourceMut(GameConfig, (config) => {
    config.maxPlayers = 8;
    return config;
});
```

### 事件系统

```typescript
import { EventManager, Event } from "bevy_ecs";

class PlayerJoinedEvent implements Event {
    constructor(public playerName: string) {}
}

const eventManager = new EventManager(world);

// 创建写入器和读取器
const writer = eventManager.createWriter<PlayerJoinedEvent>();
const reader = eventManager.createReader<PlayerJoinedEvent>();

// 发送事件
writer.write(new PlayerJoinedEvent("Alice"));

// 读取事件
const events = reader.read();
for (const event of events) {
    print(`Player joined: ${event.playerName}`);
}
```

## 设计理念

1. **兼容性优先**：尽可能保持与 Rust Bevy 相似的 API，降低迁移成本。

2. **类型安全**：充分利用 TypeScript 的类型系统，提供类型安全的接口。

3. **性能优化**：
   - 使用哈希优化名称比较
   - 批量执行命令减少操作开销
   - 事件系统自动清理避免内存泄漏

4. **模块化设计**：各个子系统独立且可组合，便于扩展和维护。

## 注意事项

1. **实体 ID**：使用 Matter 的 `AnyEntity` 类型作为实体 ID。

2. **组件定义**：组件需要使用 `@rbxts/matter` 的 `component` 函数创建。

3. **资源生命周期**：资源独立于 ECS 系统管理，需要手动清理。

4. **事件清理**：事件系统会自动清理旧事件，但读取器需要手动调用 `cleanup()`。

5. **命令缓冲**：命令不会立即执行，需要调用 `flush()` 方法。

## 版本信息

- 版本：0.2.0
- 基于：@rbxts/matter ECS 框架
- 目标平台：Roblox

## 贡献指南

欢迎提交 Issue 和 Pull Request。请确保：

1. 代码符合项目的 TypeScript 编码规范
2. 通过所有单元测试（`npm test`）
3. 更新相关文档
4. 保持与 Bevy API 的兼容性

## 许可证

请参考项目根目录的 LICENSE 文件。