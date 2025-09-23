# bevy_transform 模块

## 模块概述

`bevy_transform` 是 Bevy ECS 框架中变换系统的 TypeScript/Roblox 实现。该模块提供了一个完整的 3D 空间变换系统，用于管理游戏对象的位置、旋转和缩放。它支持层级变换（父子关系），自动处理局部坐标到世界坐标的转换，是构建 3D 游戏和应用的基础模块。

### 主要特性

- **层级变换系统** - 支持父子关系的变换传播
- **自动同步** - Transform 和 GlobalTransform 的自动更新
- **优化的脏标记系统** - 只更新发生变化的变换树
- **Roblox 原生集成** - 使用 CFrame 和 Vector3 类型
- **插件化架构** - 通过 TransformPlugin 轻松集成到应用

## 核心概念

### Transform（局部变换）
`Transform` 组件描述实体相对于其父级（如果有）的局部变换。如果实体没有父级，Transform 就是相对于世界坐标系的变换。

```typescript
interface Transform {
    cframe: CFrame;  // 位置和旋转
    scale: Vector3;  // 缩放
}
```

### GlobalTransform（全局变换）
`GlobalTransform` 组件存储实体在世界坐标系中的最终变换。这个组件由系统自动计算和维护，通常不应该手动修改。

```typescript
interface GlobalTransform {
    cframe: CFrame;  // 世界坐标的位置和旋转
    scale: Vector3;  // 世界坐标的缩放
}
```

### 父子关系
通过 `Parent` 和 `Children` 组件建立实体之间的层级关系：

- **Parent** - 指向父实体的引用
- **Children** - 包含所有子实体的列表

当父实体的变换改变时，所有子实体的全局变换会自动更新。

### 变换传播
变换系统会自动处理从父级到子级的变换传播：

1. 检测 Transform 组件的变化
2. 标记受影响的实体树（使用 TransformTreeChanged）
3. 递归计算新的 GlobalTransform
4. 清除脏标记

## 主要组件

### 组件列表

| 组件 | 描述 | 用途 |
|------|------|------|
| `Transform` | 局部变换 | 存储实体的位置、旋转和缩放 |
| `GlobalTransform` | 全局变换 | 存储世界坐标系中的最终变换 |
| `TransformTreeChanged` | 脏标记 | 内部使用，标记需要更新的实体 |
| `Parent` | 父级引用 | 建立父子关系 |
| `Children` | 子级列表 | 存储所有子实体 |

### TransformBundle
`TransformBundle` 是一个便利的组件包，用于同时添加 Transform 和 GlobalTransform：

```typescript
const bundle = createTransformBundle();
// 或从位置创建
const bundle = transformBundleFromPosition(new Vector3(10, 0, 0));
// 或从 CFrame 创建
const bundle = transformBundleFromCFrame(cframe, scale);
```

## 使用示例

### 基础使用

```typescript
import { World } from "@rbxts/matter";
import {
    Transform,
    GlobalTransform,
    createTransform,
    TransformPlugin
} from "bevy_transform";
import { App } from "bevy_app";

// 创建应用并添加 Transform 插件
const app = new App();
app.addPlugin(new TransformPlugin());

// 创建实体并添加 Transform
const world = app.getWorld();
const entity = world.spawn();

// 方法1：直接添加组件
world.insert(entity, Transform(createTransform(
    new CFrame(10, 0, 0),  // 位置
    Vector3.one            // 缩放
)));
world.insert(entity, GlobalTransform(createGlobalTransform()));

// 方法2：使用 Bundle
import { spawnWithTransformBundle } from "bevy_transform";
const entity2 = spawnWithTransformBundle(world, {
    transform: transformFromPosition(new Vector3(5, 10, 0))
});
```

### 创建父子关系

```typescript
import { Parent, Children } from "bevy_transform";

// 创建父实体
const parent = spawnWithTransformBundle(world,
    transformBundleFromPosition(Vector3.zero)
);

// 创建子实体
const child = spawnWithTransformBundle(world,
    transformBundleFromPosition(new Vector3(0, 5, 0))
);

// 建立父子关系
world.insert(child, Parent({ entity: parent }));
world.insert(parent, Children({ entities: [child] }));

// 现在移动父实体会自动更新子实体的全局位置
```

### 使用 TransformHelper

```typescript
import { createTransformHelper } from "bevy_transform";

const helper = createTransformHelper(world);

// 获取世界坐标位置
const position = helper.getWorldPosition(entity);

// 设置世界坐标位置（自动处理父子关系）
helper.setWorldPosition(entity, new Vector3(10, 20, 30));

// 让实体朝向目标
helper.lookAt(entity, targetPosition);

// 移动实体
helper.translate(entity, new Vector3(1, 0, 0));

// 旋转实体
helper.rotate(entity, Vector3.yAxis, math.rad(45));

// 缩放实体
helper.scale(entity, 2);

// 管理父子关系
helper.setParent(child, parent);
const children = helper.getChildren(parent);
```

### 变换操作辅助函数

```typescript
// 从不同输入创建 Transform
const t1 = transformFromPosition(new Vector3(10, 0, 0));
const t2 = transformFromLookAt(position, target);
const t3 = createTransform(cframe, scale);

// 修改 Transform
const t4 = withPosition(transform, new Vector3(5, 0, 0));
const t5 = withScale(transform, new Vector3(2, 2, 2));

// 使用 GlobalTransform
const worldPos = getGlobalPosition(globalTransform);
const forward = getForward(globalTransform);
const right = getRight(globalTransform);
const up = getUp(globalTransform);

// 变换点和方向
const worldPoint = transformPoint(globalTransform, localPoint);
const worldDir = transformDirection(globalTransform, localDirection);
```

## API 参考

### Transform 组件函数

| 函数 | 描述 |
|------|------|
| `createTransform(cframe?, scale?)` | 创建 Transform 数据 |
| `transformFromPosition(position)` | 从位置创建 Transform |
| `transformFromLookAt(position, target)` | 创建朝向目标的 Transform |
| `withScale(transform, scale)` | 返回带新缩放的 Transform |
| `withPosition(transform, position)` | 返回带新位置的 Transform |

### GlobalTransform 组件函数

| 函数 | 描述 |
|------|------|
| `createGlobalTransform(cframe?, scale?)` | 创建 GlobalTransform 数据 |
| `computeGlobalTransform(local, parent?)` | 计算全局变换 |
| `getGlobalPosition(transform)` | 获取世界坐标位置 |
| `getForward/Right/Up(transform)` | 获取方向向量 |
| `transformPoint(transform, point)` | 变换点到世界空间 |
| `transformDirection(transform, dir)` | 变换方向到世界空间 |

### TransformBundle 函数

| 函数 | 描述 |
|------|------|
| `createTransformBundle()` | 创建默认 Bundle |
| `transformBundleFromPosition(pos)` | 从位置创建 Bundle |
| `transformBundleFromCFrame(cf, scale?)` | 从 CFrame 创建 Bundle |
| `insertTransformBundle(world, entity, bundle)` | 添加 Bundle 到实体 |
| `spawnWithTransformBundle(world, bundle?)` | 创建带 Bundle 的新实体 |

### TransformHelper 类

| 方法 | 描述 |
|------|------|
| `getWorldPosition(entity)` | 获取世界位置 |
| `setWorldPosition(entity, pos)` | 设置世界位置 |
| `lookAt(entity, target, up?)` | 朝向目标 |
| `getDistance(entity, target)` | 计算距离 |
| `translate(entity, delta)` | 移动实体 |
| `rotate(entity, axis, angle)` | 旋转实体 |
| `scale(entity, scale)` | 缩放实体 |
| `getChildren(entity)` | 获取子实体 |
| `getParent(entity)` | 获取父实体 |
| `setParent(child, parent?)` | 设置父级 |

### 系统函数

| 函数 | 描述 |
|------|------|
| `markDirtyTrees(world)` | 标记需要更新的变换树 |
| `propagateParentTransforms(world)` | 传播父级变换到子级 |
| `syncSimpleTransforms(world)` | 同步独立实体的变换 |
| `ensureGlobalTransforms(world)` | 确保所有实体有 GlobalTransform |

## 与 Bevy 的差异

### 类型系统差异

| Bevy (Rust) | bevy_transform (TypeScript/Roblox) | 说明 |
|-------------|-------------------------------------|------|
| `Vec3` | `Vector3` | Roblox 的向量类型 |
| `Quat` | `CFrame` (包含旋转) | CFrame 同时包含位置和旋转 |
| `Transform` | `{ cframe: CFrame, scale: Vector3 }` | 使用 CFrame 代替分离的位置/旋转 |
| `Mat4` | 无直接对应 | 使用 CFrame 处理变换矩阵 |

### 功能差异

1. **CFrame vs 分离的位置/旋转**
   - Bevy 使用分离的 `translation`、`rotation`、`scale`
   - 本实现使用 Roblox 的 `CFrame`（包含位置和旋转）+ `scale`

2. **变换计算**
   - Bevy 使用矩阵乘法进行变换组合
   - 本实现使用 CFrame 的内置方法

3. **组件存储**
   - Bevy 使用 Rust 的所有权系统
   - 本实现使用 Matter ECS 的组件系统

4. **系统调度**
   - Bevy 有复杂的并行调度系统
   - 本实现使用简化的顺序执行

## 注意事项

### 性能优化

1. **避免频繁修改 Transform**
   - 批量更新比频繁小更新更高效
   - 使用脏标记系统减少不必要的计算

2. **合理使用父子关系**
   - 深层嵌套会增加传播开销
   - 考虑扁平化不必要的层级

3. **GlobalTransform 是只读的**
   - 不要直接修改 GlobalTransform
   - 通过修改 Transform 来间接更新

### 最佳实践

1. **使用 Bundle 创建实体**
   ```typescript
   // 推荐
   const entity = spawnWithTransformBundle(world, bundle);

   // 而不是
   const entity = world.spawn();
   world.insert(entity, Transform(...));
   world.insert(entity, GlobalTransform(...));
   ```

2. **使用 Helper 类进行复杂操作**
   ```typescript
   const helper = createTransformHelper(world);
   // Helper 会自动处理父子关系和坐标转换
   helper.setWorldPosition(entity, position);
   ```

3. **正确管理父子关系**
   ```typescript
   // 使用 helper 方法，它会同时更新 Parent 和 Children
   helper.setParent(child, parent);

   // 而不是手动管理
   world.insert(child, Parent({ entity: parent }));
   // 可能忘记更新 Children...
   ```

4. **避免循环依赖**
   - 不要创建循环的父子关系
   - 系统不会检测循环，可能导致无限递归

### 常见问题

**Q: 为什么我的实体位置没有更新？**
A: 检查是否添加了 TransformPlugin，它负责自动更新 GlobalTransform。

**Q: 如何获取实体的世界坐标？**
A: 使用 `GlobalTransform` 组件或 `TransformHelper.getWorldPosition()`。

**Q: 父子关系如何影响缩放？**
A: 子实体的全局缩放 = 父级全局缩放 × 子实体局部缩放。

**Q: 能否直接修改 GlobalTransform？**
A: 不建议。GlobalTransform 应该由系统自动计算。直接修改可能导致不一致。

## 扩展开发

### 自定义变换系统

```typescript
function customTransformSystem(world: World, deltaTime: number) {
    // 查询所有带 Transform 的实体
    for (const [entity, transform] of world.query(Transform)) {
        // 自定义逻辑
        const newTransform = {
            ...transform,
            cframe: transform.cframe.mul(CFrame.Angles(0, deltaTime, 0))
        };
        world.insert(entity, Transform(newTransform));
    }
}

// 添加到应用
app.addSystem(customTransformSystem, "Update");
```

### 与其他系统集成

```typescript
// 与物理系统集成
function syncPhysicsTransform(world: World) {
    for (const [entity, transform, rigidBody] of world.query(Transform, RigidBody)) {
        // 同步物理位置到 Transform
        const physicsPosition = rigidBody.getPosition();
        world.insert(entity, Transform({
            ...transform,
            cframe: new CFrame(physicsPosition)
        }));
    }
}

// 与渲染系统集成
function syncRenderTransform(world: World) {
    for (const [entity, globalTransform, model] of world.query(GlobalTransform, Model)) {
        // 应用全局变换到渲染模型
        model.SetPrimaryPartCFrame(globalTransform.cframe);
    }
}
```

## 相关模块

- `bevy_hierarchy` - 提供完整的父子关系管理
- `bevy_math` - 数学工具和类型定义
- `bevy_app` - 应用框架和插件系统
- `bevy_ecs` - 核心 ECS 功能

## 许可证

本模块遵循项目整体的许可证。