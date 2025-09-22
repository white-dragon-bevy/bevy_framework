# Bevy ECS Debugger

一个为 Bevy TypeScript 项目提供 Matter ECS 调试功能的插件。该插件提供了可视化界面，用于实时检查和调试 ECS 世界中的实体、组件和系统。

## 功能特性

- 🔍 **实时调试界面** - 使用 Plasma UI 库提供的可视化调试界面
- 🎮 **快捷键切换** - 通过快捷键快速开关调试器（默认 F4）
- 💬 **聊天命令支持** - 支持通过聊天命令 `/matter` 或 `/matterdebug` 打开调试器
- 🔐 **权限管理** - 支持基于 Roblox 群组角色的权限验证
- 🔥 **热重载支持** - 支持系统的热重载替换
- 🎯 **实体模型关联** - 支持将 ECS 实体与 3D 模型关联以进行可视化调试

## 安装

```typescript
import { App } from "../bevy_app/app";
import { DebuggerPlugin } from "../bevy_ecs_debugger";

const app = new App();
app.addPlugin(new DebuggerPlugin());
```

## 公共 API

### 1. 插件结构体 (Plugin Struct)

#### `DebuggerPlugin`

主要的插件类，用于向 Bevy App 添加调试功能。

```typescript
export class DebuggerPlugin implements Plugin {
    constructor(
        options?: DebuggerOptions,
        getRenderableComponent?: (entityId: number) => { model: Model } | undefined
    )

    // 获取调试器实例
    getDebugger(): IDebugger | undefined

    // 获取 UI 控件
    getWidgets(): Plasma.Widgets | undefined

    // 设置 Matter Loop（用于自动初始化）
    setLoop(loop: Loop<unknown[]>): void

    // 设置状态对象
    setState(state: DebuggerState): void

    // 替换系统（热重载）
    replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void
}
```

### 2. 公共组件 (Public Components)

本插件不导出组件，而是使用 Matter ECS 的内置组件系统。

### 3. 公共资源 (Public Resources)

#### `debuggerWidgets`

调试器的 UI 控件资源，自动注入到 App 中。

```typescript
app.insertResource({ debuggerWidgets: widgets });
```

### 4. 公共系统 (Public Systems)

本插件不导出系统，而是通过 Matter Debugger 内部管理系统调试。

### 5. 公共事件 (Public Events)

本插件不定义自定义事件，使用 Roblox 的输入事件和聊天命令。

### 6. 公共状态 (Public States)

#### `DebuggerState`

用于跟踪调试器状态的接口。

```typescript
export interface DebuggerState {
    debugEnabled?: boolean;
}
```

### 7. 公共类型和接口

#### `DebuggerOptions`

配置调试器的选项接口。

```typescript
export interface DebuggerOptions {
    /** 切换调试器的按键，默认 F4 */
    toggleKey?: Enum.KeyCode;

    /** 权限组ID，用于验证调试权限 */
    groupId?: number;
}
```

#### `IDebugger`

调试器实例的接口定义。

```typescript
export interface IDebugger {
    enabled: boolean;
    toggle(): void;
    findInstanceFromEntity: (id: AnyEntity) => Model | undefined;
    authorize: (player: Player) => boolean;
    replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void;
    autoInitialize(loop: Loop<unknown[]>): void;
    getWidgets(): Plasma.Widgets;
}
```

#### `DefaultDebuggerOptions`

提供默认配置值。

```typescript
export const DefaultDebuggerOptions: DebuggerOptions = {
    toggleKey: Enum.KeyCode.F4,
    groupId: 9999999,
};
```

### 8. 工厂函数

#### `createDebugger`

创建调试器实例的工厂函数。

```typescript
export function createDebugger(
    world: World,
    options: DebuggerOptions,
    getRenderableComponent?: (entityId: number) => { model: Model } | undefined
): IDebugger
```

## 使用示例

### 基础使用

```typescript
import { App } from "../bevy_app/app";
import { DebuggerPlugin } from "../bevy_ecs_debugger";

const app = new App();

// 使用默认配置
app.addPlugin(new DebuggerPlugin());

// 或自定义配置
app.addPlugin(new DebuggerPlugin({
    toggleKey: Enum.KeyCode.F5,
    groupId: 123456
}));
```

### 提供实体-模型关联

```typescript
// 定义获取 Renderable 组件的函数
function getRenderableComponent(entityId: number): { model: Model } | undefined {
    // 你的实现逻辑
    const entity = world.get(entityId);
    return entity?.Renderable;
}

// 创建插件时提供该函数
const debuggerPlugin = new DebuggerPlugin(
    { toggleKey: Enum.KeyCode.F4 },
    getRenderableComponent
);

app.addPlugin(debuggerPlugin);
```

### 集成 Matter Loop

```typescript
import { Loop } from "@rbxts/matter";

const loop = new Loop(world);
const debuggerPlugin = new DebuggerPlugin();

app.addPlugin(debuggerPlugin);

// 设置 Loop 以启用自动初始化
debuggerPlugin.setLoop(loop);
```

### 热重载支持

```typescript
// 在热重载时替换系统
const debuggerPlugin = app.getPlugin(DebuggerPlugin);
if (debuggerPlugin) {
    debuggerPlugin.replaceSystem(oldSystem, newSystem);
}
```

### 状态管理

```typescript
const state: DebuggerState = {
    debugEnabled: false
};

const debuggerPlugin = new DebuggerPlugin();
app.addPlugin(debuggerPlugin);

// 设置状态对象
debuggerPlugin.setState(state);

// 状态会自动更新
print(state.debugEnabled); // 输出当前调试器状态
```

## 权限控制

调试器支持基于 Roblox 群组角色的权限验证：

1. **Studio 环境** - 在 Roblox Studio 中始终可用
2. **群组权限** - 配置 `groupId` 后，只有该群组的 Admin 或 Owner 可以使用
3. **默认行为** - 如果未配置 `groupId`，仅在 Studio 中可用

```typescript
// 配置群组权限
const debuggerPlugin = new DebuggerPlugin({
    groupId: 123456 // 你的 Roblox 群组 ID
});
```

## 快捷键和命令

### 快捷键

- **默认**: `F4` - 切换调试器显示（仅在 Studio 中）
- 可通过 `DebuggerOptions.toggleKey` 自定义

### 聊天命令

- `/matter` - 主要命令
- `/matterdebug` - 备用命令

这些命令会自动注册到 Roblox 的 TextChatService 中。

## 依赖

- `@rbxts/matter` - ECS 框架
- `@rbxts/plasma` - UI 库
- `@rbxts/services` - Roblox 服务访问

## 注意事项

1. 调试器仅在客户端设置输入处理和聊天命令
2. 调试器界面使用 Plasma UI 库渲染
3. 权限验证在服务器端进行
4. 调试器状态不会在客户端和服务器之间同步

## 许可

该插件是 white-dragon-bevy 项目的一部分。