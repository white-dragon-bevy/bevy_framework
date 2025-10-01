# 热更新系统示例

本示例展示如何使用 `HotReloadPlugin` 实现系统热更新功能。

## 功能特性

- ✅ **零侵入性**：不修改核心框架代码
- ✅ **具名导出**：一个模块可以导出多个系统
- ✅ **灵活配置**：支持纯函数和配置对象两种方式
- ✅ **依赖管理**：使用 SystemSet 处理系统依赖关系
- ✅ **环境自适应**：Studio 热更新 / 生产一次性加载
- ✅ **完整生命周期**：支持新增、删除、修改系统

## 文件说明

- **index.ts** - 主示例程序，展示如何使用 HotReloadPlugin
- **example-systems.ts** - 系统模块示例，展示各种系统定义方式
- **README.md** - 本说明文档

## 使用步骤

### 1. 在 Roblox Studio 中创建结构

```
ReplicatedStorage/
└── HotSystems/        ← 热更新系统容器
    ├── PlayerSystem   (ModuleScript)
    ├── MovementSystem (ModuleScript)
    └── ...
```

### 2. 编写启动代码

```typescript
import { App } from "../../bevy_app/app";
import { HotReloadPlugin } from "../../bevy_dev/hot_reload";
import { GameplayPlugin } from "./gameplay-plugin";

const app = new App();

// 添加热更新插件
app.addPlugin(new HotReloadPlugin());

// 添加游戏插件
app.addPlugin(new GameplayPlugin());

app.run();
```

### 3. 在插件中注册容器

```typescript
class GameplayPlugin implements Plugin {
  build(app: App): void {
    const hotReload = app.getResource<HotReloadService>();
    assert(hotReload);

    hotReload.registerContainers({
      container: ReplicatedStorage.WaitForChild("HotSystems"),
      schedule: BuiltinSchedules.UPDATE,
      defaultSet: "Gameplay",
    });
  }
}
```

### 4. 编写系统模块

#### 方式 A：纯函数（简单）

```typescript
// HotSystems/PlayerInput.ts
export function playerInput(world: World, context: Context) {
  // 使用容器的默认配置
  print("处理玩家输入");
}
```

#### 方式 B：配置对象（灵活）

```typescript
// HotSystems/PlayerMovement.ts
export const playerMovement = {
  system: (world: World, context: Context) => {
    print("处理玩家移动");
  },
  after: ["PlayerInput"],  // 在 PlayerInput 之后执行
  inSet: "Movement",       // 加入 Movement 系统集
};
```

#### 方式 C：混合导出

```typescript
// HotSystems/GameSystems.ts

// 简单系统
export function spawnEnemies(world: World, context: Context) {
  print("生成敌人");
}

// 复杂系统
export const updateAI = {
  system: (world, context) => print("更新AI"),
  after: ["SpawnEnemies"],
  runIf: (world) => world.getResource<GameState>()?.started ?? false,
};
```

### 5. 热更新工作流

1. **首次加载**：系统自动注册到 Schedule
2. **修改代码**：在 Studio 中修改系统代码
3. **自动热更新**：保存后系统自动重载
4. **新增系统**：导出新函数，自动注册
5. **删除系统**：移除导出，自动清理

## 系统配置选项

### 完整配置示例

```typescript
export const complexSystem = {
  // 必填：系统函数
  system: (world: World, context: Context) => {
    print("复杂系统");
  },

  // 可选：调度标签（覆盖容器默认）
  schedule: BuiltinSchedules.POST_UPDATE,

  // 可选：系统集
  inSet: "Complex",

  // 可选：依赖关系
  after: ["SystemA", "SystemB"],
  before: ["SystemC"],

  // 可选：条件执行
  runIf: (world: World) => {
    return world.getResource<Config>()?.enabled ?? false;
  },

  // 可选：环境配置
  env: {
    production: {
      disableClient: false,  // 是否禁用客户端
      disableServer: false,  // 是否禁用服务端
    },
  },
};
```

## 注意事项

### 1. 安装依赖

热更新功能需要 `@rbxts/rewire` 依赖：

```bash
pnpm add @rbxts/rewire
```

如果不安装，Studio 环境的热更新功能不可用（生产环境不受影响）。

### 2. 系统命名

系统名称格式：`ModuleName::ExportName`

例如：
- `PlayerSystem::handleInput`
- `GameSystems::updateAI`

### 3. 依赖关系

使用 SystemSet（字符串）处理依赖：

```typescript
// ✅ 正确
after: ["InputSet", "PhysicsSet"]

// ❌ 错误（不支持直接引用函数）
after: [otherSystemFunction]
```

### 4. 调度配置热更新

**热更新只更新系统逻辑，调度配置不会热更新。**

如果需要修改 `after`/`before`/`inSet` 等配置，需要重启应用。

### 5. 包装器性能

热更新使用包装器模式，每次调用多一层函数查找：

```typescript
wrapper -> registry.get() -> 真实系统函数
```

性能影响极小（单次 Map 查找），可忽略。

## 高级用法

### 多容器注册

```typescript
hotReload.registerContainers(
  {
    container: ReplicatedStorage.WaitForChild("GameplaySystems"),
    schedule: BuiltinSchedules.UPDATE,
    defaultSet: "Gameplay",
  },
  {
    container: ReplicatedStorage.WaitForChild("RenderSystems"),
    schedule: BuiltinSchedules.POST_UPDATE,
    defaultSet: "Render",
  },
);
```

### 自定义验证

```typescript
hotReload.registerContainers({
  container: ReplicatedStorage.WaitForChild("HotSystems"),
  schedule: BuiltinSchedules.UPDATE,
  validate: (name, module) => {
    // 跳过以下划线开头的系统
    if (name.sub(1, 1) === "_") {
      return false;
    }
    return true;
  },
});
```

### 生产环境禁用热更新

```typescript
// 总是添加 HotReloadPlugin，但禁用热更新
app.addPlugin(new HotReloadPlugin({
  enabled: false,  // 生产环境禁用
}));
```

此时系统会一次性加载，不监听文件变化。

## 故障排查

### 问题 1：热更新不生效

**可能原因**：
- 未安装 `@rbxts/rewire`
- 不在 Studio 环境
- 容器路径错误

**解决方法**：
```bash
pnpm add @rbxts/rewire
```

### 问题 2：系统未加载

**可能原因**：
- 导出格式错误
- 验证函数返回 false
- 环境配置禁用

**解决方法**：
检查导出格式和配置。

### 问题 3：依赖顺序错误

**可能原因**：
- SystemSet 名称错误
- 依赖的系统未加载

**解决方法**：
确保依赖的系统已加载，SystemSet 名称正确。

## 相关文档

- [HotReloadPlugin API](../../bevy_dev/hot_reload/index.ts)
- [系统配置 API](../../bevy_ecs/schedule/system-configs.ts)
- [@rbxts/rewire 文档](https://github.com/roblox-ts/rbxts-rewire)
