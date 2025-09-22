# 迁移 Bevy 示例到 Roblox TypeScript

## 任务描述

将 Bevy 引擎的 Rust 示例代码迁移到 Roblox TypeScript 环境。这是示例代码的迁移，不是框架迁移。示例应当使用项目中已经实现的 bevy_* 模块。

**重要**: 如果依赖缺失，应拒绝迁移并说明原因


## 参数

- `#ARGUMENTS` - 待迁移示例的路径（相对于 examples 目录），例如：`app/empty`、`ecs/component_hooks`

## 前置条件检查

在开始迁移前，`必须读取 rust 源代码和依赖插件`, 验证：
1. 示例所需的 bevy 模块是否已在 `src/` 目录中实现
2. 相关依赖插件是否可用（如 bevy_app、bevy_ecs、bevy_time 等）
3. **重要**: 如果依赖缺失，应拒绝迁移并说明原因

## 输入路径

- 源文件：`bevy-origin/examples/#ARGUMENTS.rs`
- 参考文档：`docs/migrate-overview.md`
- 已实现模块：`src/bevy_*/`

## 输出路径

- 目标文件：`src/__examples__/#ARGUMENTS/index.ts`

## 任务要求

### 1. 架构迁移原则

基于 `docs/migrate-overview.md` 中的指导原则：

- **思想迁移而非代码移植**：迁移 Bevy 的核心架构哲学，而非逐行翻译代码
- **数据导向设计**：保持组件（数据）和系统（逻辑）的严格分离
- **单线程优化**：利用 Roblox 的单线程模型简化并发问题
- **模块化架构**：采用插件化思想组织代码
- **使用roblox内置接口**: 指导原则中,`架构参考`的部分, 不再提供 bevy插件, 直接使用 roblox对应接口即可.

### 2. 核心迁移模式

#### 2.1 ECS 基础迁移
```rust
// Rust Bevy
#[derive(Component)]
struct Position { x: f32, y: f32 }

fn movement_system(mut query: Query<&mut Position>) {
    for mut pos in &mut query {
        pos.x += 1.0;
    }
}
```

```typescript
// Roblox TypeScript
import { component } from "@rbxts/matter";

const Position = component<{ x: number; y: number }>("Position");

function movementSystem(world: World): void {
    for (const [id, position] of world.query(Position)) {
        world.insert(id, Position.patch({ x: position.x + 1 }));
    }
}
```

#### 2.2 插件系统迁移
```rust
// Rust Bevy
pub struct MyPlugin;
impl Plugin for MyPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, my_system);
    }
}
```

```typescript
// Roblox TypeScript
export class MyPlugin implements Plugin {
    build(app: App): void {
        app.addSystem(MainSchedule.Update, mySystem);
    }
}
```

#### 2.3 资源管理迁移
```rust
// Rust Bevy
#[derive(Resource)]
struct GameTimer { time: f32 }
```

```typescript
// Roblox TypeScript - 使用单例组件模式
const GameTimer = component<{ time: number }>("GameTimer");
// 在全局实体上附加
world.spawn(GameTimer({ time: 0 }), Name("GlobalResources"));
```

#### 2.4 事件系统迁移
```rust
// Rust Bevy
#[derive(Event)]
struct CollisionEvent { entity: Entity }
```

```typescript
// Roblox TypeScript - 使用指令组件模式
const CollisionEvent = component<{ entity: Entity }>("CollisionEvent");
// 事件通过添加/移除组件来触发
```

### 3. 特殊考虑事项

#### 3.1 Roblox 平台特性
- **渲染系统**：使用 Roblox Instance 而非 Bevy 的渲染组件
- **物理系统**：集成 Roblox 的内置物理引擎
- **输入处理**：使用 UserInputService 替代 Bevy 输入系统
- **音频系统**：使用 SoundService 替代 Bevy 音频

#### 3.2 类型系统差异
- 使用 TypeScript 的类型系统替代 Rust 的所有权系统
- 利用 roblox-ts 的类型安全特性
- 遵循严格的 TypeScript 编码规范

#### 3.3 异步处理
- Bevy 的并行系统 → Matter 的顺序执行
- 使用 Promise 和协程处理异步操作
- 实现指令缓冲模式确保状态一致性

### 4. 代码规范

严格遵循 roblox-ts 编码标准：

- **类型安全**：所有函数必须有显式返回类型
- **文档注释**：导出函数必须有 JSDoc 注释
- **格式规范**：
  - 使用 Tab 缩进
  - 文件末尾必须有换行符
  - 接口属性按字母顺序排列
- **命名规范**：
  - 组件使用 PascalCase
  - 系统函数使用 camelCase
  - 常量使用 UPPER_SNAKE_CASE

### 5. 实现步骤

1. **分析源代码**
   - 理解 Rust 示例的核心逻辑
   - 识别使用的 Bevy 功能和模式
   - 确定需要的组件和系统

2. **设计架构**
   - 定义组件结构
   - 设计系统执行顺序
   - 规划插件依赖关系

3. **实现迁移**
   - 创建组件定义
   - 实现系统逻辑
   - 集成到 App 框架

4. **平台适配**
   - 替换 Bevy 特有功能为 Roblox 等效实现
   - 处理客户端/服务端差异
   - 优化性能

5. **测试验证**
   - 确保功能正确性
   - 验证性能表现
   - 检查类型安全

### 6. 示例结构

```typescript
// src/__examples__/#ARGUMENTS/index.ts

// 导入已实现的 bevy 模块
import { App } from "../../../bevy_app";
import { MainSchedule } from "../../../bevy_app";
import { Plugin } from "../../../bevy_app";
import { component } from "@rbxts/matter";
import type { World } from "@rbxts/matter";

// 示例特定的组件定义
const ExampleComponent = component<{ value: number }>("ExampleComponent");

// 示例特定的系统定义
function exampleSystem(world: World): void {
    // 系统逻辑实现
}

// 示例插件（可选）
class ExamplePlugin implements Plugin {
    build(app: App): void {
        app.addSystem(MainSchedule.Update, exampleSystem);
    }
}

// 主入口 - 使用已实现的 App 类
const app = App.create();
app.addPlugin(new ExamplePlugin());
// 注意：某些示例可能不需要 run()，取决于具体实现
```

### 7. 常见迁移映射

| Bevy Rust | Roblox TypeScript (使用已实现模块) |
|-----------|-------------------------------------|
| `App::new()` | `App.create()` (from bevy_app) |
| `Query<&Component>` | `world.query(Component)` (from @rbxts/matter) |
| `Commands` | 使用 bevy_ecs 中的命令缓冲实现 |
| `EventWriter/Reader` | 使用 bevy_ecs 的事件系统 |
| `Resource` | 使用 bevy_ecs 的资源系统 |
| `SystemSet` | 使用 bevy_app 的调度系统 |
| `Timer/Time` | 使用 bevy_time 模块 |
| `Transform` | Roblox CFrame (原生) |
| `DefaultPlugins` | 检查项目中已实现的默认插件集 |

### 8. 重要注意事项

- **依赖检查**：必须先验证示例所需的所有 bevy 模块都已实现
- **使用现有实现**：不要重新实现已有的 bevy 模块功能
- **示例专注性**：只实现示例特有的逻辑，框架功能使用现有模块
- **导入路径**：正确使用相对路径导入已实现的模块
- **API 一致性**：遵循已实现模块的 API 接口

### 9. 迁移失败条件

以下情况应拒绝迁移：
- 示例依赖的 bevy 模块尚未实现（如需要 bevy_render 但项目中没有）
- 示例使用了 Roblox 平台无法支持的功能（如多线程、GPU 计算等）
- 示例依赖外部资源文件但无法在 Roblox 中使用

## 执行指令

使用 `roblox-ts-pro` agent 执行此任务：

1. **先检查依赖**：验证示例所需的所有 bevy 模块是否已在 src/ 中实现
2. **分析示例代码**：理解 Rust 示例的核心功能和依赖
3. **使用现有模块**：基于已实现的 bevy_* 模块编写示例
4. **测试验证**：确保示例能正确运行

## 验证标准

- 所有依赖的 bevy 模块都已实现
- TypeScript 编译无错误
- 正确导入和使用现有模块
- 示例功能与原 Rust 版本一致
- 代码简洁且易于理解