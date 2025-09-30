# bevy_camera 模块

## 模块概述

`bevy_camera` 是 Bevy 框架在 Roblox TypeScript 上的相机管理模块。该模块提供了 Roblox Camera 的 ECS 封装，允许通过实体-组件系统管理相机配置和行为。

**当前状态**：这是一个**占位实现**，提供基础的组件定义和扩展接口，为未来的相机功能预留空间。

### 主要特性

- **ECS 封装** - 将 Roblox Camera 封装为 Matter 组件
- **扩展接口** - 提供便捷的相机控制方法
- **客户端专用** - 自动适配 Roblox 客户端环境
- **类型安全** - 完整的 TypeScript 类型定义
- **可扩展** - 为未来功能（相机抖动、过渡等）预留接口

## 核心概念

### PrimaryCamera（主相机）

`PrimaryCamera` 组件标记实体为主相机，包含 Roblox Camera 实例的引用。

```typescript
interface PrimaryCameraData {
    readonly camera: Camera;
}
```

### CameraConfig（相机配置）

`CameraConfig` 组件存储相机的配置选项。

```typescript
interface CameraConfigData {
    cameraType: Enum.CameraType;
    fieldOfView: number;
    cameraSubject?: Humanoid | BasePart;
}
```

## 使用示例

### 基础使用

```typescript
import { App } from "bevy_app";
import { CameraPlugin } from "bevy_camera";
import { RobloxDefaultPlugins } from "bevy_app";

// 创建应用并添加 CameraPlugin
const app = App.create()
    .addPlugins(...RobloxDefaultPlugins.create().build())
    .addPlugin(new CameraPlugin())
    .run();
```

### 使用扩展方法

```typescript
import { getContextWithExtensions } from "bevy_app";
import type { CameraPlugin } from "bevy_camera";
import { World } from "@rbxts/matter";
import { Context } from "bevy_ecs";

function gameSystem(world: World, context: Context): void {
    const ctx = getContextWithExtensions<CameraPlugin>(context);

    // 获取相机
    const camera = ctx.getCamera();
    if (camera) {
        print(`Current camera: ${camera}`);
    }

    // 设置相机类型
    ctx.setCameraType(Enum.CameraType.Scriptable);

    // 设置视野角度
    ctx.setFieldOfView(90);

    // 设置跟随主体
    const player = Players.LocalPlayer;
    if (player.Character) {
        const humanoid = player.Character.FindFirstChildOfClass("Humanoid");
        if (humanoid) {
            ctx.setCameraSubject(humanoid);
        }
    }
}
```

### 使用组件（未来功能）

```typescript
import { World } from "@rbxts/matter";
import {
    PrimaryCamera,
    CameraConfig,
    createPrimaryCameraData,
    createCameraConfigData
} from "bevy_camera";
import { Workspace } from "@rbxts/services";

function setupCamera(world: World): void {
    const camera = Workspace.CurrentCamera;
    if (!camera) return;

    // 创建主相机实体
    const entity = world.spawn(
        PrimaryCamera(createPrimaryCameraData(camera)),
        CameraConfig(createCameraConfigData(camera))
    );

    print(`Camera entity created: ${entity}`);
}
```

## API 参考

### 组件

| 组件 | 描述 | 类型 |
|------|------|------|
| `PrimaryCamera` | 主相机标记组件 | `PrimaryCameraData` |
| `CameraConfig` | 相机配置组件 | `CameraConfigData` |

### 插件扩展方法

通过 `CameraPlugin` 提供的扩展方法：

| 方法 | 描述 | 签名 |
|------|------|------|
| `getCamera()` | 获取 Roblox Camera 实例 | `() => Camera \| undefined` |
| `setCameraType(type)` | 设置相机类型 | `(type: Enum.CameraType) => void` |
| `setCameraSubject(subject)` | 设置相机跟随主体 | `(subject: Humanoid \| BasePart) => void` |
| `setFieldOfView(fov)` | 设置视野角度 | `(fov: number) => void` |
| `getPrimaryCameraEntity()` | 获取主相机实体 ID | `() => number \| undefined` |

### 辅助函数

| 函数 | 描述 |
|------|------|
| `createPrimaryCameraData(camera)` | 创建 PrimaryCameraData |
| `createCameraConfigData(camera?)` | 创建 CameraConfigData |
| `applyCameraConfig(camera, config)` | 应用配置到 Roblox Camera |

## 与 Bevy 的对应关系

| Bevy (Rust) | bevy_camera (TypeScript/Roblox) | 说明 |
|-------------|----------------------------------|------|
| `Camera` 组件 | `PrimaryCamera` + `CameraConfig` | 分离标记和配置 |
| `CameraPlugin` | `CameraPlugin` | 主插件（占位实现） |
| `Projection` | `fieldOfView` 属性 | 简化为 FOV |
| `RenderTarget` | ❌ 不实现 | Roblox 自动管理 |
| `Viewport` | ❌ 不实现 | Roblox 自动管理 |

## 当前限制

### 占位实现

- ✅ 提供组件定义和类型
- ✅ 提供扩展接口
- ❌ 系统函数为占位，不执行实际逻辑
- ❌ 不支持相机动画和过渡
- ❌ 不支持多相机管理

### 仅客户端

- 插件仅在客户端运行
- 服务端调用扩展方法无效

## 未来计划

### 短期目标

1. **实现基础系统**
   - `initializeCameraSystem` - 创建主相机实体
   - `syncCameraConfigSystem` - 同步配置到 Roblox

2. **相机控制**
   - 相机位置和旋转控制
   - 相机缩放控制

### 中期目标

3. **高级功能**
   - 相机抖动效果
   - 相机平滑过渡
   - 多相机切换

4. **与 bevy_transform 集成**
   - 使用 Transform 组件控制相机
   - 支持相机跟随实体

### 长期目标

5. **完整渲染管线**
   - 视锥体裁剪
   - 可见性计算
   - LOD 管理

## 开发指南

### 添加新的相机系统

```typescript
// 在 systems.ts 中添加新系统
export function myCameraSystem(world: World): void {
    if (!RunService.IsClient()) return;

    for (const [entity, primaryCamera, config] of world.query(
        PrimaryCamera,
        CameraConfig
    )) {
        // 系统逻辑
    }
}

// 在 plugin.ts 中注册系统
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { myCameraSystem } from "./systems";

build(app: App): void {
    app.addSystems(BuiltinSchedules.UPDATE, myCameraSystem);
}
```

### 添加新的扩展方法

```typescript
// 在 plugin.ts 的 CameraPluginExtensionFactories 接口中添加
export interface CameraPluginExtensionFactories {
    // 现有方法...

    // 新方法
    myNewMethod: ExtensionFactory<(param: string) => void>;
}

// 在 constructor 的 extension 对象中实现
this.extension = {
    // 现有实现...

    myNewMethod: (world, context, plugin) => {
        return (param: string) => {
            // 实现逻辑
        };
    },
};
```

## 常见问题

**Q: 为什么是占位实现？**
A: 这是一个渐进式迁移策略。我们先建立基础结构和接口，然后逐步实现功能。这样可以确保架构正确，避免大规模重构。

**Q: 如何在服务端使用相机？**
A: 相机是客户端概念，服务端不应该直接控制相机。如果需要服务端控制，应该通过网络事件通知客户端。

**Q: 扩展方法为什么不生效？**
A: 确保：
1. 插件已正确添加到 App
2. 在客户端环境运行
3. 使用 `getContextWithExtensions<CameraPlugin>()` 获取上下文

**Q: 能否支持多个相机？**
A: 当前版本只支持单个主相机。未来版本将支持多相机管理。

## 相关模块

- `bevy_app` - 应用框架和插件系统
- `bevy_transform` - 变换系统（可与相机集成）
- `bevy_ecs` - 核心 ECS 功能

## 许可证

本模块遵循项目整体的许可证。