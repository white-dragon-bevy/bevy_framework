# Bevy Logs 示例

## 概述

这是 Bevy 引擎的 `logs` 示例迁移到 Roblox TypeScript 的版本，演示了日志系统的使用方法。

对应原始 Rust 示例：`bevy-origin/examples/app/logs.rs`

## 功能展示

### 1. 日志级别
- **trace**: 最详细的日志信息（默认禁用）
- **debug**: 调试信息（默认禁用）
- **info**: 重要信息（默认启用）
- **warn**: 警告信息（默认启用）
- **error**: 错误信息（默认启用）

### 2. 一次性日志
使用 `xxxOnce()` 函数可以确保某条日志只输出一次，避免在每帧循环中产生垃圾日志：
- `traceOnce()`
- `debugOnce()`
- `infoOnce()`
- `warnOnce()`
- `errorOnce()`

### 3. 昂贵操作的一次性执行
使用 `once()` 函数可以确保某段代码只执行一次，适用于在连续系统中执行昂贵的操作。

### 4. 交互功能
- 按键 `P` 触发 panic（在 TypeScript 中使用 `throw` 实现）

## 迁移说明

### 主要适配

1. **UI 系统**
   - Rust 版本使用 Bevy 的 `Text` 和 `Node` 组件
   - TypeScript 版本使用 Roblox 原生 UI（`ScreenGui` 和 `TextLabel`）

2. **相机系统**
   - Rust 版本使用 `Camera2d`
   - TypeScript 版本不需要（Roblox 自带相机系统）

3. **错误处理**
   - Rust 版本使用 `panic!` 宏
   - TypeScript 版本使用 `throw` 语句

4. **保留标识符**
   - 由于 `error` 在 roblox-ts 中是保留标识符，导入时重命名为 `logError`

### 依赖模块

- `bevy_app`: 应用框架和调度系统
- `bevy_log`: 日志系统
- `bevy_input`: 输入处理
- `bevy_internal`: 默认插件集
- `@rbxts/matter`: ECS 框架
- `@rbxts/services`: Roblox 服务

## 如何运行

1. 修改 `src/__examples__/index.ts` 中的配置：
```typescript
const exampleFolder: string = "app";
const exampleName: string = "logs";  // 改为 logs
```

2. 编译项目：
```bash
npm run build
```

3. 在 Roblox Studio 中运行

## 自定义日志设置

如需自定义日志级别和过滤器，可以修改 `main()` 函数中的配置：

```typescript
import { DefaultPluginsBuilder } from "../../../bevy_internal";

const app = App.create()
    .addPlugins(
        new DefaultPluginsBuilder()
            .disable(LogPlugin)
            .add(new LogPlugin({
                level: Level.TRACE,  // 设置日志级别
                filter: "wgpu=warn,bevy_ecs=info",  // 设置过滤器
            }))
            .getPlugins()
    )
    // ... 其他配置
```

## 注意事项

- 默认情况下，`trace` 和 `debug` 级别的日志会被忽略
- 日志输出会显示在 Roblox 的控制台中
- UI 只在客户端创建（需要 `Players.LocalPlayer`）