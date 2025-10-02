# Bevy 设计理念与架构原则

本文档记录了 Rust Bevy 框架的核心设计理念，用于指导 TypeScript 移植版本的开发。

## 目录

1. [核心架构](#核心架构)
2. [World 与资源系统](#world-与资源系统)
3. [插件系统设计](#插件系统设计)
4. [变更检测机制](#变更检测机制)
5. [系统访问原则](#系统访问原则)
6. [设计决策指南](#设计决策指南)

## 核心架构

### ECS (Entity Component System) 基础

Bevy 采用 ECS 架构，其中：

- **Entity（实体）**: 唯一标识符，本身不包含数据
- **Component（组件）**: 纯数据，附加到实体上
- **System（系统）**: 处理逻辑，操作组件数据
- **Resource（资源）**: 全局单例数据

### 数据中心化原则

所有数据都存储在 `World` 中，这是 Bevy 的核心设计：

```
World
 ├── Entities (实体索引)
 ├── Components (组件数据)
 └── Resources (全局资源)
```

**关键理念**：World 是唯一的真相源（Single Source of Truth）。

## World 与资源系统

### World 的角色

World 是整个 ECS 系统的容器，负责：

1. **数据存储**: 所有实体、组件和资源的存储
2. **生命周期管理**: 创建、更新、删除数据
3. **变更追踪**: 通过 tick 系统追踪所有变更

### 资源 (Resources) 的本质

Resources 是存储在 World 中的全局单例数据：

```rust
// Rust 中的资源存储结构
World
 └── storages: Storages
      └── resources: Resources<true>  // Send 资源
      └── non_send_resources: Resources<false>  // 非 Send 资源
```

**重要原则**：
- Resources 是 World 的一部分，不是独立存在的
- 通过类型系统保证唯一性（每种类型只有一个实例）
- 支持变更检测，无需手动发送事件

### Events 的定位

Events 本质上是特殊的 Resource：

```rust
pub type Events<E> = Messages<E>;  // Events 是 Resource

#[derive(Resource)]
pub struct Messages<E> {
    // 双缓冲实现，自动管理生命周期
}
```

**设计智慧**：将 Events 作为 Resource 的特殊形式，统一了数据管理模型。

## 插件系统设计

### 插件的职责

插件只在构建阶段（`build` 方法）配置 App：

```rust
impl Plugin for MyPlugin {
    fn build(&self, app: &mut App) {
        // 插件只能在这里配置 App
        app.insert_resource(...);
        app.add_systems(...);
    }
}
```

**TypeScript 函数式实现**：

```typescript
import { plugin } from "../bevy_app/plugin";

export function createMyPlugin(config?: MyPluginConfig) {
    return plugin({
        name: "MyPlugin",
        build: (app) => {
            // 插件只能在这里配置 App
            app.insertResource(...);
            app.addSystems(...);
        },
    });
}
```

### 统一注入，不同访问

**核心原则**：插件提供的所有功能都注入到 World，通过不同机制访问。

| 访问者 | 访问方式 | 示例 |
|--------|----------|------|
| 系统 | 参数注入 | `Res<T>`, `ResMut<T>` |
| App | World 方法 | `app.world.resource::<T>()` |
| 插件构建 | Trait 扩展 | `app.register_diagnostic()` |

**关键理解**：
- 不需要为不同访问者准备不同的扩展
- 同一份数据，多种访问接口
- 系统不应该访问 App 实例

### Context vs Resources

在 TypeScript 移植中的权衡：

| 特性 | Resources | Context |
|------|-----------|---------|
| 用途 | 数据存储 | API 协调 |
| 访问 | `world.resource()` | `context.get()` |
| 适用场景 | 游戏状态、配置 | 插件间 API |

**建议原则**：
1. 优先使用 Resources 存储数据
2. Context 仅用于轻量级 API 协调
3. 避免在 Context 中存储大量状态

## 变更检测机制

### Tick 系统

Bevy 使用 Tick（时钟标记）系统自动追踪变更：

```rust
// 每个资源都有变更信息
ResourceData {
    data: 实际数据,
    added_ticks: 添加时的 tick,
    changed_ticks: 最后修改的 tick
}

// World 维护全局 tick
World {
    change_tick: 全局计数器
}
```

### 工作原理

1. **自动标记**: 通过 `ResMut` 修改时自动更新 tick
2. **独立检测**: 每个系统独立判断"对我来说"是否变化
3. **零开销**: 只需比较两个数字

### 对比事件系统

| 特性 | Change Detection | Events |
|------|------------------|---------|
| 触发方式 | 自动（修改时） | 手动发送 |
| 信息量 | 只知道"变了" | 携带详细数据 |
| 生命周期 | 永久 | 2帧后清除 |
| 开销 | 极低 | 需要队列管理 |

**设计智慧**：Change Detection 适合状态变化检测，Events 适合消息传递。

## 系统访问原则

### 系统签名

系统只应该声明它需要的数据：

```rust
// ✅ 正确：只访问需要的资源
fn my_system(
    players: Res<PlayerManager>,
    time: Res<Time>
) { }

// ❌ 错误：不应访问 App
fn bad_system(app: &mut App) { }
```

### 关注点分离

| 组件 | 职责 | 访问时机 |
|------|------|----------|
| App | 构建和配置 | 初始化阶段 |
| World | 数据存储 | 运行时 |
| System | 游戏逻辑 | 每帧执行 |

**核心原则**：
- App 负责构建，World 负责运行
- 系统不应修改 App 结构
- 保持系统函数纯净

### 数据访问模式

```rust
// 1. 资源访问
let config = world.resource::<GameConfig>();

// 2. 组件查询
let players = world.query::<&Player>();

// 3. 事件读写
events.send(PlayerJoined);
for event in events.read() { }
```

## 设计决策指南

### 选择 Resource 还是 Component？

| 使用 Resource | 使用 Component |
|---------------|----------------|
| 全局唯一数据 | 实体特定数据 |
| 游戏配置 | 位置、速度等属性 |
| 管理器、服务 | 可视化组件 |

### 选择 Change Detection 还是 Events？

| 使用 Change Detection | 使用 Events |
|----------------------|-------------|
| 状态变化监测 | 离散事件通知 |
| "某值是否变了" | "发生了什么" |
| 自动追踪 | 需要详细信息 |

### TypeScript 移植原则

1. **保持概念一致性**
   - 使用相同的术语（World, Resource, System）
   - 遵循相同的数据流向

2. **适应语言特性**
   - 利用 TypeScript 的类型系统
   - 使用接口而非 Rust 的 trait

3. **性能权衡**
   - TypeScript 没有 Rust 的零成本抽象
   - 可以牺牲一些性能换取开发体验

4. **Context 的定位**
   - 作为 Resources 的补充，不是替代
   - 主要用于 API 扩展，而非数据存储

## 最佳实践

### 1. 数据管理

```typescript
// ✅ 推荐：使用 Resource 管理状态
app.insertResource(PlayerManager, new PlayerManager());
const manager = world.resource(PlayerManager);

// ⚠️ 避免：在 Context 中存储大量数据
context.register("player", {
    // 应该只有 API 方法，不是数据存储
});
```

### 2. 系统设计

```typescript
// ✅ 推荐：系统只访问 World
function playerSystem(world: World): void {
    const players = world.resource(PlayerManager);
    // 处理逻辑
}

// ❌ 避免：系统访问 App
function badSystem(world: World, app: App): void {
    app.addPlugin(...);  // 错误！
}
```

### 3. 插件架构

```typescript
import { plugin } from "../bevy_app/plugin";

// ✅ 推荐：插件在 build 中配置一切
export function createMyPlugin(config?: MyPluginConfig) {
    return plugin({
        name: "MyPlugin",
        build: (app) => {
            // 所有配置都在这里
            app.insertResource(...);
            app.addSystems(...);
        },
    });
}

// ❌ 避免：插件提供多种初始化方式
export function createBadPlugin() {
    return {
        initForApp() { },
        initForSystem() { }  // 不需要！
    };
}
```

> **注意**：class plugin 已完全弃用，请使用 `plugin()` 函数创建插件。

## 总结

Bevy 的设计理念体现了几个核心思想：

1. **简单性**: 统一的数据模型（Everything is in World）
2. **高效性**: 自动变更检测，零成本抽象
3. **模块化**: 插件系统提供清晰的扩展点
4. **类型安全**: 利用类型系统防止错误

在 TypeScript 移植中，我们应该：
- **保持这些核心理念**
- **适应 JavaScript 生态**
- **优先考虑开发体验**
- **在性能和易用性之间找到平衡**

记住：**World 是中心，Resource 是内容，System 是逻辑，Plugin 是组织方式**。