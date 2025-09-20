# 白龙 Bevy 风格游戏框架

基于 roblox-ts 和 matter-ts 的插件化游戏框架，灵感来源于 Rust Bevy 引擎的插件系统。

## 特性

- 🔌 **插件化架构**: 使用插件组织代码，模块化开发
- 🎯 **ECS 集成**: 与 matter-ts 深度集成，提供完整的 ECS 支持
- 🚀 **TypeScript 原生**: 完整的类型安全和 IDE 支持
- 🎮 **Roblox 优化**: 针对 Roblox 环境特别优化
- 🔧 **易于扩展**: 简单的插件接口，支持自定义插件开发

## 快速开始

### 安装

```bash
npm install @rbxts/matter
# 或将框架文件复制到你的项目中
```

### 基础使用

```typescript
import { createApp, CorePluginGroup, PhysicsPlugin, InputPlugin } from "./framework";

// 创建并启动游戏应用
const app = createApp()
    .addPluginGroup(new CorePluginGroup())
    .addPlugin(new PhysicsPlugin())
    .addPlugin(new InputPlugin())
    .run();
```

### 创建自定义插件

```typescript
import { Plugin, GameApp, SystemStage } from "./framework";

class MyGamePlugin implements Plugin {
    readonly name = "MyGamePlugin";
    readonly isUnique = true;

    build(app: GameApp): void {
        // 添加系统
        app.scheduler.addSystem(SystemStage.Update, this.myGameSystem);

        // 注册资源
        app.resources.insert(new MyResource());
    }

    private myGameSystem = (world: World, dt: number) => {
        // 游戏逻辑
    };
}
```

## 核心概念

### 插件 (Plugin)

插件是框架的核心组织单位，每个插件负责一个特定的功能领域：

```typescript
interface Plugin {
    readonly name: string;        // 插件名称
    readonly isUnique: boolean;   // 是否唯一

    build(app: GameApp): void;    // 构建阶段
    ready?(app: GameApp): boolean; // 就绪检查
    finish?(app: GameApp): void;  // 完成阶段
    cleanup?(app: GameApp): void; // 清理阶段
}
```

### 插件生命周期

1. **Adding**: 调用所有插件的 `build()` 方法
2. **Ready**: 检查所有插件的 `ready()` 方法
3. **Finished**: 调用所有插件的 `finish()` 方法
4. **Cleaned**: 调用所有插件的 `cleanup()` 方法
5. **Running**: 开始系统调度循环

### 系统调度 (System Scheduling)

框架提供多个调度阶段：

- `PreUpdate`: 更新前准备
- `Update`: 主要游戏逻辑
- `PostUpdate`: 更新后处理
- `PreRender`: 渲染前准备
- `Render`: 渲染逻辑
- `PostRender`: 渲染后清理

```typescript
// 添加系统到特定阶段
app.scheduler.addSystem(SystemStage.Update, mySystem);

// 添加带标签的系统
app.scheduler.addSystemWithLabel(SystemStage.Update, "movement", movementSystem);

// 在特定系统前后添加系统
app.scheduler.addSystemBefore("movement", inputSystem);
app.scheduler.addSystemAfter("movement", animationSystem);
```

### 资源管理 (Resources)

全局共享的数据可以作为资源管理：

```typescript
// 插入资源
app.resources.insert(new GameSettings());

// 获取资源
const settings = app.resources.get(GameSettings);

// 获取必需资源（不存在会抛出错误）
const time = app.resources.getRequired(Time);
```

## 内置插件

### CorePluginGroup

包含基础功能的插件组：

- `TimePlugin`: 时间管理和 delta time
- `LogPlugin`: 日志系统
- `RunServicePlugin`: RunService 集成和主循环

### PhysicsPlugin

基于 Matter ECS 的物理系统：

- `Transform`: 位置、旋转、缩放组件
- `Velocity`: 线性和角速度组件
- `RigidBody`: 刚体属性组件
- 重力、阻力、运动系统

```typescript
// 创建物理实体
const entityId = PhysicsEntityFactory.createPhysicsEntity(
    world,
    new Vector3(0, 10, 0),
    { mass: 1, useGravity: true }
);
```

### InputPlugin

输入处理系统（仅客户端）：

```typescript
const inputState = app.resources.getRequired(InputState);

// 检查按键状态
if (inputState.isKeyPressed(Enum.KeyCode.W)) {
    // 处理移动
}

// 使用工具函数
const movement = InputUtil.getMovementInput(inputState);
const isJumping = InputUtil.isJumpPressed(inputState);
```

## 示例项目

查看 `src/example/simple_game.ts` 了解完整的游戏示例，包括：

- 玩家移动和跳跃
- 物理模拟
- 输入处理
- 对象生成
- 调试信息

## 高级用法

### 插件组 (Plugin Groups)

组织相关插件：

```typescript
class MyGamePluginGroup implements PluginGroup {
    readonly name = "MyGamePluginGroup";

    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            .add(new PlayerPlugin())
            .add(new WeaponPlugin())
            .add(new UIPlugin())
            .disable("WeaponPlugin"); // 可选择性禁用
    }
}
```

### 函数式插件

简单的功能可以用函数式插件：

```typescript
app.addSystem((app) => {
    app.scheduler.addSystem(SystemStage.Update, (world, dt) => {
        // 简单的游戏逻辑
    });
});
```

### 条件插件

根据环境动态添加插件：

```typescript
const app = createApp()
    .addPluginGroup(new CorePluginGroup());

if (runService.IsClient()) {
    app.addPlugin(new InputPlugin())
       .addPlugin(new RenderPlugin());
} else {
    app.addPlugin(new NetworkPlugin())
       .addPlugin(new AIPlugin());
}
```

## 最佳实践

1. **单一职责**: 每个插件只负责一个功能领域
2. **依赖管理**: 使用 `ready()` 方法处理异步依赖
3. **系统排序**: 使用标签和依赖关系合理排序系统
4. **资源共享**: 使用资源系统共享全局状态
5. **错误处理**: 在系统中适当处理错误，避免崩溃

## 架构对比

| 特性 | Bevy (Rust) | 白龙框架 (roblox-ts) |
|------|-------------|---------------------|
| 插件系统 | ✅ | ✅ |
| ECS 架构 | ✅ | ✅ (matter-ts) |
| 系统调度 | ✅ | ✅ |
| 资源管理 | ✅ | ✅ |
| 生命周期 | ✅ | ✅ |
| 类型安全 | ✅ | ✅ |
| 热重载 | ✅ | 🚧 (计划中) |

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个框架！

## 许可

MIT License