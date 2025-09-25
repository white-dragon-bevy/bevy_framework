# API 参考

## App 类

### 构造方法

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `App.create()` | 创建带默认配置的应用 | `App` |
| `App.empty()` | 创建空应用（无默认调度） | `App` |

### 核心方法

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `run()` | 运行应用 | `AppExit` |
| `update()` | 执行一次更新 | `void` |
| `setRunner(runner)` | 设置自定义运行器 | `this` |
| `finish()` | 完成所有插件设置 | `void` |
| `cleanup()` | 清理所有插件 | `void` |
| `shouldExit()` | 检查是否应退出 | `AppExit \| undefined` |

### 插件管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `addPlugin(plugin)` | 添加单个插件 | `this` |
| `addPlugins(...plugins)` | 添加多个插件 | `this` |
| `isPluginAdded(pluginType)` | 检查插件是否已添加 | `boolean` |
| `getAddedPlugins(pluginType)` | 获取已添加的插件实例 | `T[]` |
| `getPluginState()` | 获取插件状态 | `PluginState` |

### 系统管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `addSystems(schedule, ...systems)` | 添加系统到调度 | `this` |
| `addServerSystems(schedule, ...systems)` | 添加服务端系统 | `this` |
| `addClientSystems(schedule, ...systems)` | 添加客户端系统 | `this` |

### 资源管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `insertResource(resource)` | 插入资源 | `this` |
| `insertResource(type, resource)` | 使用类型插入资源 | `this` |
| `initResource(factory)` | 使用工厂初始化资源 | `this` |
| `getResource(type)` | 获取资源 | `T \| undefined` |

### 调度管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `addSchedule(schedule)` | 添加调度 | `this` |
| `initSchedule(label)` | 初始化调度 | `this` |
| `getSchedule(label)` | 获取调度 | `Schedule \| undefined` |
| `editSchedule(label, editor)` | 编辑调度 | `this` |
| `runSchedule(label)` | 运行指定调度 | `void` |

### 子应用管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `main()` | 获取主子应用 | `SubApp` |
| `subApp(label)` | 获取子应用（必须存在） | `SubApp` |
| `getSubApp(label)` | 安全获取子应用 | `SubApp \| undefined` |
| `insertSubApp(label, subApp)` | 插入子应用 | `void` |
| `removeSubApp(label)` | 移除子应用 | `SubApp \| undefined` |

### 其他方法

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `world()` | 获取 WorldContainer | `WorldContainer` |
| `getWorld()` | 获取 BevyWorld | `BevyWorld` |
| `getContext()` | 获取应用上下文 | `AppContext` |
| `setErrorHandler(handler)` | 设置错误处理器 | `this` |
| `getErrorHandler()` | 获取错误处理器 | `ErrorHandler \| undefined` |

---

## Plugin 接口

### 必需方法

| 方法 | 描述 | 参数 | 返回值 |
|-----|------|------|--------|
| `build(app)` | 配置应用 | `App` | `void` |
| `name()` | 返回插件名称 | - | `string` |
| `isUnique()` | 是否只能添加一次 | - | `boolean` |

### 可选方法

| 方法 | 描述 | 参数 | 返回值 |
|-----|------|------|--------|
| `ready?(app)` | 检查是否就绪 | `App` | `boolean` |
| `finish?(app)` | 完成设置 | `App` | `void` |
| `cleanup?(app)` | 清理资源 | `App` | `void` |

### 属性

| 属性 | 类型 | 描述 |
|-----|------|------|
| `robloxContext?` | `RobloxContext` | 运行环境限制 |

---

## SubApp 类

### 主要方法

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `update()` | 更新子应用 | `void` |
| `world()` | 获取 World 容器 | `WorldContainer` |
| `setUpdateSchedule(schedule)` | 设置更新调度 | `void` |
| `getUpdateSchedule()` | 获取更新调度 | `ScheduleLabel \| undefined` |
| `setExtract(extractFn)` | 设置数据提取函数 | `void` |
| `extract(mainWorld)` | 执行数据提取 | `void` |
| `runStartupSchedule()` | 运行启动调度 | `void` |

### 系统和资源管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `addSystems(schedule, ...systems)` | 添加系统 | `void` |
| `insertResource(resource)` | 插入资源 | `void` |
| `getResource(type)` | 获取资源 | `T \| undefined` |
| `removeResource(type)` | 移除资源 | `T \| undefined` |

### 调度管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `configureScheduleOrder(target, newSchedule)` | 配置调度顺序 | `void` |
| `getScheduleOrder()` | 获取调度顺序 | `Array<ScheduleLabel>` |
| `startLoop(events)` | 启动 Loop 执行 | `void` |
| `stopLoop()` | 停止 Loop 执行 | `void` |

---

## Context 类

### 资源访问

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `getResource(type)` | 获取资源 | `T \| undefined` |
| `insertResource(type, resource)` | 插入资源 | `void` |

### 事件管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `sendEvent(type, event)` | 发送事件 | `void` |

### 扩展管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `registerExtension(key, extension, metadata?)` | 注册扩展 | `void` |
| `get(key)` | 获取扩展 | `T` |
| `tryGet(key)` | 安全获取扩展 | `T \| undefined` |
| `has(key)` | 检查扩展是否存在 | `boolean` |
| `getNamespace(namespace)` | 获取命名空间扩展 | `NamespaceExtensions<T>` |

### 属性

| 属性 | 类型 | 描述 |
|-----|------|------|
| `resources` | `ResourceManager` | 资源管理器 |
| `commands` | `CommandBuffer` | 命令缓冲 |
| `events` | `EventManager` | 事件管理器 |

---

## Schedule 类

### 构造和基础方法

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `constructor(label)` | 创建调度 | - |
| `getLabel()` | 获取调度标签 | `ScheduleLabel` |
| `getState()` | 获取调度状态 | `ScheduleState` |
| `reset()` | 重置调度 | `void` |

### 系统管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `addSystem(config)` | 添加系统 | `string` |
| `removeSystem(id)` | 移除系统 | `boolean` |
| `compile()` | 编译系统执行顺序 | `SystemConfig[]` |

### 系统集管理

| 方法 | 描述 | 返回值 |
|-----|------|--------|
| `configureSet(config)` | 配置系统集 | `void` |
| `addSystemToSet(system, set)` | 添加系统到集合 | `void` |
| `getGraph()` | 获取调度图 | `ScheduleGraph` |

---

## 类型定义

### PluginState 枚举

```typescript
enum PluginState {
    Adding = "Adding",     // 正在添加
    Ready = "Ready",       // 准备就绪
    Finished = "Finished", // 已完成
    Cleaned = "Cleaned"    // 已清理
}
```

### ScheduleLabel 类型

```typescript
type ScheduleLabel = string;
```

### SystemSet 类型

```typescript
type SystemSet = string;
```

### RobloxContext 枚举

```typescript
enum RobloxContext {
    Server = "Server",
    Client = "Client"
}
```

### AppExit 接口

```typescript
interface AppExit {
    code: number;

    static success(): AppExit;
    static error(code: number): AppExit;
}
```

### Resource 接口

```typescript
interface Resource {
    // 资源标记接口
}
```

### SystemFunction 类型

```typescript
type SystemFunction = (world: World, context: Context) => void;
```

### SystemConfig 接口

```typescript
interface SystemConfig {
    system: SystemFunction;
    name?: string;
    priority?: number;
    before?: string[];
    after?: string[];
    runIf?: (world: World, context: Context) => boolean;
}
```

---

## 内置常量

### BuiltinSchedules

```typescript
const BuiltinSchedules = {
    // 启动调度
    PRE_STARTUP: "PreStartup",
    STARTUP: "Startup",
    POST_STARTUP: "PostStartup",

    // 主循环调度
    FIRST: "First",
    PRE_UPDATE: "PreUpdate",
    UPDATE: "Update",
    POST_UPDATE: "PostUpdate",
    LAST: "Last",

    // 特殊调度
    MAIN: "Main",

    // 固定更新（未来版本）
    FIXED_UPDATE: "FixedUpdate",
    // ...
};
```

### CoreSystemSet

```typescript
const CoreSystemSet = {
    CORE: "Core",
    INPUT: "Input",
    PHYSICS: "Physics",
    TRANSFORM: "Transform",
    ANIMATION: "Animation",
    AUDIO: "Audio",
    NETWORKING: "Networking",
    UI: "UI",
    RENDERING: "Rendering",
    DIAGNOSTICS: "Diagnostics",
    EVENTS: "Events",
    TIME: "Time",
    APP: "App"
};
```

---

## 工具函数

### createPlugin

```typescript
function createPlugin(
    buildFn: (app: App) => void,
    name?: string,
    unique?: boolean
): Plugin
```

创建函数式插件。

### 示例

```typescript
const myPlugin = createPlugin((app) => {
    app.addSystems(BuiltinSchedules.UPDATE, mySystem);
}, "MyPlugin", true);
```