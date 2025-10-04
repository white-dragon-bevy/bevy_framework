# Bevy ECS Event System (基于 rbx-better-signal)

## 概述

本事件系统是 Rust Bevy ECS Event System 的 TypeScript/Roblox 移植版本，使用 `rbx-better-signal` 库实现推送式事件处理机制。

## 核心特性

- ✅ **推送式事件处理**：事件触发时立即执行观察者
- ✅ **全局和实体事件**：支持全局事件和针对特定实体的事件
- ✅ **事件传播**：支持事件在实体层级结构中传播
- ✅ **类型安全**：完整的 TypeScript 类型支持
- ✅ **观察者管理**：提供连接生命周期管理

## 与 Message 系统的区别

| 特性 | Event System (Signal-based) | Message System |
|------|---------------------------|----------------|
| 触发模式 | 推送（立即执行） | 拉取（延迟读取） |
| 执行时机 | 触发时立即 | 调度阶段执行 |
| 适用场景 | 响应式逻辑、UI交互 | 批量处理、输入处理 |
| 性能特性 | 低延迟、即时响应 | 高吞吐、批量处理 |

## 使用示例

### 1. 创建简单事件

```typescript
// 定义事件类
class DamageEvent implements Event {
    readonly eventType = "DamageEvent";
    constructor(public amount: number) {}
}

// 或使用工厂函数
const DamageEvent = createEvent("DamageEvent", { amount: 0 });
```

### 2. 创建实体事件

```typescript
// 定义实体事件类
class EntityDamageEvent implements EntityEvent {
    readonly eventType = "EntityDamageEvent";
    constructor(
        public entity: Entity,
        public damage: number
    ) {}

    getEventTarget(): Entity {
        return this.entity;
    }

    setEventTarget(entity: Entity): void {
        this.entity = entity;
    }
}

// 或使用工厂函数
const EntityDamageEvent = createEntityEvent("EntityDamageEvent", {
    entity: 0 as Entity,
    damage: 0
});
```

### 3. 在 Context 中使用

```typescript
const app = new App();
const context = app.context;

// 注册事件类型
const eventKey = context.registerEvent(DamageEvent);

// 添加全局观察者
const connection = context.addObserver(DamageEvent, (event, world) => {
    print(`Received damage: ${event.amount}`);
});

// 触发事件
context.trigger(new DamageEvent(50));

// 断开观察者
connection.disconnect();
```

### 4. 实体特定观察者

```typescript
const entity = world.spawn();

// 为特定实体添加观察者
const entityConnection = context.addEntityObserver(
    entity,
    EntityDamageEvent,
    (event, world) => {
        print(`Entity ${event.entity} took ${event.damage} damage`);
    }
);

// 触发实体事件
context.trigger(new EntityDamageEvent(entity, 100));
```

### 5. 事件传播

```typescript
// 配置事件传播
const propagationConfig: PropagationConfig = {
    enabled: true,
    autoProppagate: true,
    getPath: (entity, world) => {
        // 返回传播路径（例如：从子到父）
        return getParentChain(entity, world);
    }
};

// 触发并传播事件
context.triggerWithPropagation(
    new EntityDamageEvent(entity, 50),
    propagationConfig
);
```

### 6. 使用观察者构建器

```typescript
const observerConfig = context.observerBuilder<DamageEvent>()
    .event(DamageEvent)
    .on((event) => print(`Damage: ${event.amount}`))
    .watchEntities(entity1, entity2)
    .build();
```

## API 参考

### Context 扩展

```typescript
class Context {
    // 事件管理器
    events: EventManager;

    // 事件传播器
    eventPropagator: EventPropagator;

    // 触发事件
    trigger<E extends object>(event: E): void;

    // 触发并传播实体事件
    triggerWithPropagation<E extends EntityEvent>(
        event: E,
        config?: PropagationConfig
    ): void;

    // 添加全局观察者
    addObserver<E>(
        eventType: new (...args: never[]) => E,
        callback: ObserverCallback<E>
    ): ObserverConnection;

    // 添加实体观察者
    addEntityObserver<E>(
        entity: Entity,
        eventType: new (...args: never[]) => E,
        callback: ObserverCallback<E>
    ): ObserverConnection;

    // 注册事件类型
    registerEvent<E>(eventType: new (...args: never[]) => E): EventKey;

    // 清理实体观察者
    cleanupEntityObservers(entity: Entity): void;
}
```

### ObserverConnection

```typescript
class ObserverConnection {
    // 断开连接
    disconnect(): void;

    // 检查连接状态
    isConnected(): boolean;
}
```

## 设计理念

1. **即时响应**：适合需要立即响应的游戏逻辑
2. **类型安全**：充分利用 TypeScript 类型系统
3. **性能优化**：使用 Signal 实现高效的事件分发
4. **灵活性**：支持全局、实体特定和传播等多种模式

## 注意事项

- Event System 适合低频率、需要即时响应的场景
- 对于高频率事件（如输入），建议使用 Message System
- 记得在实体销毁时调用 `cleanupEntityObservers`
- 事件传播时注意避免无限循环

## 测试

测试文件位于 `src/bevy_ecs/__tests__/events-signal.spec.ts`，包含：
- EventManager 基础功能测试
- 全局和实体事件测试
- 观察者连接管理测试
- 事件传播测试
- 工厂函数测试

运行测试：
```bash
npm test -- -p ReplicatedStorage/rbxts_include/node_modules/@white-dragon-bevy/bevy_framework/bevy_ecs/__tests__/events-signal.spec
```