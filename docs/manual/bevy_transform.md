# bevy_transform 模块操作手册

## 目录[模块概述](#模块概述)

- [核心组件](#核心组件)
  - [Transform 组件](#transform-组件)
  - [GlobalTransform 组件](#globaltransform-组件)
- [层级系统](#层级系统)
  - [Parent 组件](#parent-组件)
  - [Children 组件](#children-组件)
  - [变换传播机制](#变换传播机制)
- [TransformPlugin 插件](#transformplugin-插件)
- [辅助工具](#辅助工具)
  - [TransformHelper 工具类](#transformhelper-工具类)
  - [TransformBundle](#transformbundle)
- [实战示例](#实战示例)
  - [基础变换操作](#基础变换操作)
  - [构建对象层级](#构建对象层级)
  - [动态变换更新](#动态变换更新)
  - [层级查询与操作](#层级查询与操作)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 模块概述

`bevy_transform` 模块是 Bevy 框架在 Roblox 平台上的变换系统实现。它提供了一套完整的解决方案来管理实体的位置、旋转和缩放，并支持父子层级关系的自动变换传播。

### 核心功能

- **局部变换 (Transform)**：管理实体相对于父级的位置、旋转和缩放
- **全局变换 (GlobalTransform)**：自动计算实体在世界坐标系中的变换
- **层级系统**：支持父子关系，自动传播变换
- **高性能**：增量更新，只计算变化的部分
- **Roblox 原生**：使用 CFrame 和 Vector3，完美集成 Roblox 生态

### 设计理念

1. **组件分离**：Transform（可修改）和 GlobalTransform（自动计算）分离
2. **自动传播**：父级变换改变时，自动更新所有子级
3. **延迟计算**：使用脏标记优化，避免不必要的计算
4. **类型安全**：TypeScript 类型系统保证代码正确性

---

## 核心组件

### Transform 组件

Transform 组件描述实体的**局部变换**，即相对于父级（或世界坐标系）的位置、旋转和缩放。

#### 组件定义

```typescript
export const Transform = component<{
	/** 位置和旋转，使用 CFrame 存储 */
	cframe: CFrame;
	/** 缩放，使用 Vector3 存储 */
	scale: Vector3;
}>("Transform");
```

#### 创建 Transform

```typescript
import {
	createTransform,
	transformFromPosition,
	transformFromLookAt,
	withScale,
	withPosition
} from "bevy_transform";

// 1. 默认 Transform（原点，无旋转，单位缩放）
const defaultTransform = createTransform();

// 2. 从 CFrame 创建
const transform = createTransform(
	new CFrame(new Vector3(10, 0, 5)),
	new Vector3(2, 2, 2)
);

// 3. 从位置创建
const posTransform = transformFromPosition(new Vector3(10, 20, 30));

// 4. 从朝向创建
const lookAtTransform = transformFromLookAt(
	new Vector3(0, 0, 0),  // 位置
	new Vector3(10, 0, 0)  // 朝向目标
);

// 5. 应用缩放
const scaledTransform = withScale(transform, new Vector3(3, 3, 3));

// 6. 应用位置
const movedTransform = withPosition(transform, new Vector3(5, 10, 15));
```

#### 添加到实体

```typescript
import { World } from "@rbxts/matter";
import { Transform, createTransform } from "bevy_transform";

const world = new World();
const entity = world.spawn();

// 添加 Transform 组件
world.insert(
	entity,
	Transform({
		cframe: new CFrame(new Vector3(10, 0, 0)),
		scale: Vector3.one,
	})
);
```

#### 修改 Transform

```typescript
// 获取当前 Transform
const [transform] = world.get(entity, Transform);

if (transform) {
	// 修改位置
	const newCFrame = new CFrame(new Vector3(20, 0, 0));
	world.insert(entity, Transform({
		cframe: newCFrame,
		scale: transform.scale,
	}));

	// 修改缩放
	world.insert(entity, Transform({
		cframe: transform.cframe,
		scale: new Vector3(2, 2, 2),
	}));
}
```

---

### GlobalTransform 组件

GlobalTransform 组件描述实体的**全局变换**，即在世界坐标系中的最终位置、旋转和缩放。

#### 重要特性

- **自动计算**：由系统自动维护，不应手动修改
- **层级感知**：考虑所有父级的变换
- **只读性质**：仅用于查询世界坐标

#### 组件定义

```typescript
export const GlobalTransform = component<{
	/** 全局变换，包含位置、旋转和缩放 */
	cframe: CFrame;
	/** 全局缩放 */
	scale: Vector3;
}>("GlobalTransform");
```

#### 查询 GlobalTransform

```typescript
import { GlobalTransform, getGlobalPosition, getForward } from "bevy_transform";

// 获取世界坐标位置
const [globalTransform] = world.get(entity, GlobalTransform);
if (globalTransform) {
	const worldPosition = globalTransform.cframe.Position;
	print(`实体世界坐标: ${worldPosition}`);

	// 使用辅助函数
	const position = getGlobalPosition(globalTransform);
	const forward = getForward(globalTransform);
	const right = getRight(globalTransform);
	const up = getUp(globalTransform);
}
```

#### GlobalTransform 辅助函数

```typescript
import {
	getGlobalPosition,
	getGlobalRotation,
	getForward,
	getRight,
	getUp,
	transformPoint,
	transformDirection,
} from "bevy_transform";

const [globalTransform] = world.get(entity, GlobalTransform);
if (globalTransform) {
	// 获取位置
	const position = getGlobalPosition(globalTransform);

	// 获取旋转（作为 CFrame）
	const rotation = getGlobalRotation(globalTransform);

	// 获取方向向量
	const forward = getForward(globalTransform);  // -Z 轴
	const right = getRight(globalTransform);      // X 轴
	const up = getUp(globalTransform);            // Y 轴

	// 变换点（局部 -> 世界）
	const localPoint = new Vector3(1, 0, 0);
	const worldPoint = transformPoint(globalTransform, localPoint);

	// 变换方向（局部 -> 世界）
	const localDir = new Vector3(0, 1, 0);
	const worldDir = transformDirection(globalTransform, localDir);
}
```

---

## 层级系统

层级系统允许实体之间建立父子关系，子实体的变换会相对于父实体计算。

### Parent 组件

标记实体的父级。

```typescript
export const Parent = component<{
	entity: number;  // 父实体 ID
}>("Parent");
```

### Children 组件

存储实体的所有子实体。

```typescript
export const Children = component<{
	entities: number[];  // 子实体 ID 数组
}>("Children");
```

### 建立父子关系

```typescript
import { Parent, Children } from "bevy_transform";

const parentEntity = world.spawn();
const childEntity = world.spawn();

// 设置父级
world.insert(childEntity, Parent({ entity: parentEntity }));

// 更新父级的子列表
world.insert(parentEntity, Children({ entities: [childEntity] }));

// 添加多个子实体
const child2 = world.spawn();
const child3 = world.spawn();

world.insert(child2, Parent({ entity: parentEntity }));
world.insert(child3, Parent({ entity: parentEntity }));

world.insert(parentEntity, Children({
	entities: [childEntity, child2, child3]
}));
```

### 变换传播机制

变换传播是自动进行的，由以下系统协同工作：

#### 1. ensureGlobalTransforms

为所有拥有 Transform 但缺少 GlobalTransform 的实体添加 GlobalTransform。

```typescript
export function ensureGlobalTransforms(world: World): void;
```

#### 2. markDirtyTrees

标记需要更新的变换树，当 Transform 改变时触发。

```typescript
export function markDirtyTrees(world: World): void;
```

#### 3. propagateParentTransforms

从父级向子级传播变换，递归计算全局变换。

```typescript
export function propagateParentTransforms(world: World): void;
```

#### 4. syncSimpleTransforms

同步没有父级的实体的 Transform 和 GlobalTransform。

```typescript
export function syncSimpleTransforms(world: World): void;
```

#### 传播流程

```
1. 检测 Transform 变化
   ↓
2. 标记脏树 (markDirtyTrees)
   ↓
3. 传播父级变换 (propagateParentTransforms)
   - 查找根实体（无父级）
   - 更新根实体的 GlobalTransform
   - 递归更新所有子实体
   ↓
4. 同步简单变换 (syncSimpleTransforms)
   - 同步无父级实体的 Transform 到 GlobalTransform
   ↓
5. GlobalTransform 更新完成
```

#### 变换计算公式

```typescript
// 全局 CFrame = 父级全局 CFrame × 局部 CFrame
globalCFrame = parentGlobalTransform.cframe.mul(localTransform.cframe);

// 全局缩放 = 父级全局缩放 × 局部缩放
globalScale = parentGlobalTransform.scale.mul(localTransform.scale);
```

---

## TransformPlugin 插件

TransformPlugin 负责自动注册和调度所有变换系统。

### 插件注册

```typescript
import { App } from "bevy_app";
import { TransformPlugin } from "bevy_transform";

const app = new App();
app.addPlugin(new TransformPlugin());
```

### 系统调度

TransformPlugin 在以下调度阶段注册系统：

#### PostStartup（启动后）

```typescript
// 执行顺序：
// 1. ensureGlobalTransforms  - 确保所有实体有 GlobalTransform
// 2. markDirtyTrees          - 标记需要更新的树
// 3. propagateParentTransforms - 传播父级变换
// 4. syncSimpleTransforms     - 同步简单变换
```

#### PostUpdate（每帧更新后）

```typescript
// 执行顺序：
// 1. markDirtyTrees          - 标记需要更新的树
// 2. propagateParentTransforms - 传播父级变换
// 3. syncSimpleTransforms     - 同步简单变换
```

### 系统集

```typescript
export enum TransformSystems {
	/** 传播变换的系统集 */
	Propagate = "TransformPropagate",
}
```

---

## 辅助工具

### TransformHelper 工具类

TransformHelper 提供了一套方便的 API 来操作实体的变换和层级关系。

#### 创建 Helper

```typescript
import { createTransformHelper } from "bevy_transform";

const helper = createTransformHelper(world);
```

#### API 参考

##### 位置操作

```typescript
// 获取世界坐标位置
const worldPos = helper.getWorldPosition(entity);

// 设置世界坐标位置
helper.setWorldPosition(entity, new Vector3(10, 20, 30));

// 移动实体（世界坐标）
helper.translate(entity, new Vector3(5, 0, 0));
```

##### 旋转操作

```typescript
// 让实体朝向目标
helper.lookAt(entity, targetPosition);

// 让实体朝向目标（自定义上方向）
helper.lookAt(entity, targetPosition, Vector3.yAxis);

// 旋转实体
helper.rotate(entity, Vector3.yAxis, math.rad(45));  // 绕 Y 轴旋转 45 度
```

##### 缩放操作

```typescript
// 统一缩放
helper.scale(entity, 2);  // 缩放到 2 倍

// 非统一缩放
helper.scale(entity, new Vector3(2, 1, 3));
```

##### 层级操作

```typescript
// 获取父实体
const parent = helper.getParent(childEntity);

// 获取所有子实体
const children = helper.getChildren(parentEntity);

// 设置父级
helper.setParent(childEntity, parentEntity);

// 移除父级
helper.setParent(childEntity, undefined);
```

##### 距离计算

```typescript
// 计算到另一个实体的距离
const distance = helper.getDistance(entity1, entity2);

// 计算到某个位置的距离
const distanceToPos = helper.getDistance(entity, new Vector3(0, 0, 0));
```

---

### TransformBundle

TransformBundle 是一个便捷的方式来同时添加 Transform 和 GlobalTransform 组件。

#### 创建 Bundle

```typescript
import {
	createTransformBundle,
	transformBundleFromPosition,
	transformBundleFromCFrame,
	insertTransformBundle,
	spawnWithTransformBundle,
} from "bevy_transform";

// 1. 创建默认 Bundle
const bundle = createTransformBundle();

// 2. 从位置创建
const posBundle = transformBundleFromPosition(new Vector3(10, 0, 5));

// 3. 从 CFrame 创建
const cframeBundle = transformBundleFromCFrame(
	new CFrame(new Vector3(10, 20, 30)),
	new Vector3(2, 2, 2)
);
```

#### 使用 Bundle

```typescript
// 方式 1：添加到现有实体
const entity = world.spawn();
insertTransformBundle(world, entity, bundle);

// 方式 2：生成新实体并添加 Bundle
const newEntity = spawnWithTransformBundle(world, bundle);

// 方式 3：生成带默认 Bundle 的实体
const defaultEntity = spawnWithTransformBundle(world);
```

---

## 实战示例

### 基础变换操作

#### 示例 1：创建和移动实体

```typescript
import { App } from "bevy_app";
import {
	TransformPlugin,
	Transform,
	GlobalTransform,
	createTransformHelper
} from "bevy_transform";

const app = new App();
app.addPlugin(new TransformPlugin());

// 在系统中操作
app.addSystem((world, context) => {
	const helper = createTransformHelper(world);

	// 创建实体
	const entity = world.spawn();
	world.insert(entity, Transform({
		cframe: CFrame.identity,
		scale: Vector3.one,
	}));
	world.insert(entity, GlobalTransform({
		cframe: CFrame.identity,
		scale: Vector3.one,
	}));

	// 每帧移动
	helper.translate(entity, new Vector3(0.1, 0, 0));

	// 获取当前位置
	const pos = helper.getWorldPosition(entity);
	if (pos) {
		print(`实体位置: ${pos}`);
	}
});

app.run();
```

#### 示例 2：旋转和缩放

```typescript
import { createTransformHelper } from "bevy_transform";

const helper = createTransformHelper(world);
const entity = world.spawn();
// ... 添加 Transform 和 GlobalTransform

// 旋转实体（绕 Y 轴旋转 90 度）
helper.rotate(entity, Vector3.yAxis, math.rad(90));

// 缩放实体
helper.scale(entity, new Vector3(2, 1, 2));

// 让实体朝向某个点
const targetPosition = new Vector3(100, 0, 100);
helper.lookAt(entity, targetPosition);
```

---

### 构建对象层级

#### 示例 3：简单父子关系

```typescript
import {
	spawnWithTransformBundle,
	transformBundleFromPosition,
	Parent,
	Children,
} from "bevy_transform";

// 创建父实体
const parentEntity = spawnWithTransformBundle(
	world,
	transformBundleFromPosition(new Vector3(10, 0, 10))
);

// 创建子实体（相对于父级的位置）
const childEntity = spawnWithTransformBundle(
	world,
	transformBundleFromPosition(new Vector3(5, 0, 0))
);

// 建立父子关系
world.insert(childEntity, Parent({ entity: parentEntity }));
world.insert(parentEntity, Children({ entities: [childEntity] }));

// 现在移动父实体，子实体会自动跟随
const helper = createTransformHelper(world);
helper.setWorldPosition(parentEntity, new Vector3(20, 0, 20));

// 子实体的世界坐标会自动更新为 (25, 0, 20)
const childWorldPos = helper.getWorldPosition(childEntity);
print(`子实体世界坐标: ${childWorldPos}`);
```

#### 示例 4：多层级结构

```typescript
import { spawnWithTransformBundle, transformBundleFromPosition } from "bevy_transform";

// 创建三层层级：Root -> Arm -> Hand
const root = spawnWithTransformBundle(
	world,
	transformBundleFromPosition(new Vector3(0, 0, 0))
);

const arm = spawnWithTransformBundle(
	world,
	transformBundleFromPosition(new Vector3(2, 0, 0))
);

const hand = spawnWithTransformBundle(
	world,
	transformBundleFromPosition(new Vector3(1, 0, 0))
);

// 建立层级关系
const helper = createTransformHelper(world);
helper.setParent(arm, root);
helper.setParent(hand, arm);

// 现在 hand 的世界坐标是 (3, 0, 0)
// Root(0,0,0) + Arm(2,0,0) + Hand(1,0,0) = (3,0,0)

// 旋转 arm，hand 会跟随旋转
helper.rotate(arm, Vector3.yAxis, math.rad(90));
```

#### 示例 5：动态添加/移除子对象

```typescript
const helper = createTransformHelper(world);

// 创建父实体和多个子实体
const parent = spawnWithTransformBundle(world);
const child1 = spawnWithTransformBundle(world);
const child2 = spawnWithTransformBundle(world);
const child3 = spawnWithTransformBundle(world);

// 添加子实体
helper.setParent(child1, parent);
helper.setParent(child2, parent);
helper.setParent(child3, parent);

// 查询所有子实体
const children = helper.getChildren(parent);
print(`父实体有 ${children.size()} 个子实体`);

// 移除某个子实体的父级关系
helper.setParent(child2, undefined);

// 现在父实体只有 2 个子实体了
const updatedChildren = helper.getChildren(parent);
print(`更新后父实体有 ${updatedChildren.size()} 个子实体`);
```

---

### 动态变换更新

#### 示例 6：跟随目标

```typescript
function createFollowSystem(targetEntity: number) {
	return (world: BevyWorld, context: Context) => {
		const helper = createTransformHelper(world);
		const deltaTime = context.deltaTime;

		for (const [followerEntity, follower] of world.query(FollowerComponent)) {
			const followerPos = helper.getWorldPosition(followerEntity);
			const targetPos = helper.getWorldPosition(targetEntity);

			if (followerPos && targetPos) {
				// 计算方向
				const direction = targetPos.sub(followerPos).Unit;

				// 移动（带速度限制）
				const speed = 10;
				const movement = direction.mul(speed * deltaTime);
				helper.translate(followerEntity, movement);

				// 朝向目标
				helper.lookAt(followerEntity, targetPos);
			}
		}
	};
}
```

#### 示例 7：轨道旋转

```typescript
function createOrbitSystem(centerPosition: Vector3) {
	let angle = 0;
	const radius = 10;
	const speed = math.rad(45); // 45度/秒

	return (world: BevyWorld, context: Context) => {
		const helper = createTransformHelper(world);
		angle += speed * context.deltaTime;

		for (const [entity, orbiter] of world.query(OrbiterComponent)) {
			// 计算轨道位置
			const x = centerPosition.X + math.cos(angle) * radius;
			const z = centerPosition.Z + math.sin(angle) * radius;
			const position = new Vector3(x, centerPosition.Y, z);

			// 更新位置
			helper.setWorldPosition(entity, position);

			// 朝向中心
			helper.lookAt(entity, centerPosition);
		}
	};
}
```

#### 示例 8：缩放动画

```typescript
function createPulseSystem() {
	let time = 0;

	return (world: BevyWorld, context: Context) => {
		const helper = createTransformHelper(world);
		time += context.deltaTime;

		for (const [entity, pulser] of world.query(PulserComponent)) {
			// 使用正弦波创建脉冲效果
			const scale = 1 + math.sin(time * 2) * 0.2;
			helper.scale(entity, scale);
		}
	};
}
```

---

### 层级查询与操作

#### 示例 9：查找特定深度的子对象

```typescript
function getChildrenAtDepth(
	world: World,
	rootEntity: number,
	depth: number
): number[] {
	const helper = createTransformHelper(world);

	if (depth === 0) {
		return [rootEntity];
	}

	let currentLevel = [rootEntity];

	for (let level = 0; level < depth; level++) {
		const nextLevel: number[] = [];

		for (const entity of currentLevel) {
			const children = helper.getChildren(entity);
			nextLevel.push(...children);
		}

		currentLevel = nextLevel;
	}

	return currentLevel;
}

// 使用
const level2Children = getChildrenAtDepth(world, rootEntity, 2);
print(`第2层有 ${level2Children.size()} 个子对象`);
```

#### 示例 10：遍历整个层级树

```typescript
function traverseHierarchy(
	world: World,
	rootEntity: number,
	callback: (entity: number, depth: number) => void,
	depth = 0
): void {
	const helper = createTransformHelper(world);

	// 处理当前节点
	callback(rootEntity, depth);

	// 递归处理所有子节点
	const children = helper.getChildren(rootEntity);
	for (const child of children) {
		traverseHierarchy(world, child, callback, depth + 1);
	}
}

// 使用
traverseHierarchy(world, rootEntity, (entity, depth) => {
	const indent = "  ".rep(depth);
	const pos = helper.getWorldPosition(entity);
	print(`${indent}实体 ${entity}: 位置 ${pos}`);
});
```

#### 示例 11：批量操作层级

```typescript
function applyToHierarchy(
	world: World,
	rootEntity: number,
	operation: (entity: number) => void
): void {
	const helper = createTransformHelper(world);
	const visited = new Set<number>();
	const queue = [rootEntity];

	while (queue.size() > 0) {
		const entity = queue.shift()!;

		if (visited.has(entity)) {
			continue;
		}

		visited.add(entity);
		operation(entity);

		const children = helper.getChildren(entity);
		queue.push(...children);
	}
}

// 使用：缩放整个层级
applyToHierarchy(world, rootEntity, (entity) => {
	const helper = createTransformHelper(world);
	helper.scale(entity, 2);  // 所有对象缩放到 2 倍
});
```

---

## 最佳实践

### 1. 组件使用

#### ✅ 推荐

```typescript
// 总是使用 TransformBundle
const entity = spawnWithTransformBundle(world, bundle);

// 使用 Helper 类操作变换
const helper = createTransformHelper(world);
helper.setWorldPosition(entity, position);

// 只修改 Transform，不要修改 GlobalTransform
world.insert(entity, Transform({ cframe, scale }));
```

#### ❌ 避免

```typescript
// 不要手动修改 GlobalTransform
world.insert(entity, GlobalTransform({ cframe, scale })); // 错误！

// 不要直接操作组件进行复杂的父子关系管理
world.insert(child, Parent({ entity: parent }));
// 还要手动更新 Children... 容易出错！

// 应该使用 Helper
helper.setParent(child, parent); // 自动管理双向关系
```

### 2. 性能优化

#### 批量操作

```typescript
// ✅ 推荐：批量修改后只触发一次传播
for (const entity of entities) {
	world.insert(entity, Transform({ cframe, scale }));
}
// 系统会在下一帧统一处理所有变化

// ❌ 避免：在循环中频繁查询 GlobalTransform
for (const entity of entities) {
	const pos = helper.getWorldPosition(entity);
	// 可能触发多次传播
}
```

#### 减少层级深度

```typescript
// ✅ 推荐：保持层级树较平坦
// Root -> Child1, Child2, Child3 (深度 1)

// ❌ 避免：过深的层级
// Root -> A -> B -> C -> D -> E (深度 5)
// 每次 Root 变化都要传播 5 层
```

#### 使用局部坐标

```typescript
// ✅ 推荐：在父级空间内操作
helper.setParent(child, parent);
// 子对象的 Transform 保持为局部坐标

// ❌ 避免：频繁在世界空间和局部空间转换
const worldPos = helper.getWorldPosition(child);
helper.setWorldPosition(child, worldPos.add(delta));
// 如果有父级，这会触发额外的坐标转换
```

### 3. 层级管理

#### 组织结构

```typescript
// ✅ 推荐：清晰的层级结构
// Player
//   ├── Body
//   │   ├── Head
//   │   ├── Torso
//   │   └── Legs
//   └── Equipment
//       ├── Weapon
//       └── Shield

// 易于管理和理解
```

#### 父子关系一致性

```typescript
// ✅ 推荐：使用 Helper 确保一致性
helper.setParent(child, parent);  // 自动管理 Parent 和 Children

// ❌ 避免：手动管理（容易不一致）
world.insert(child, Parent({ entity: parent }));
// 忘记更新 parent 的 Children 列表！
```

### 4. 调试技巧

#### 可视化层级

```typescript
function debugPrintHierarchy(world: World, rootEntity: number): void {
	const helper = createTransformHelper(world);

	function printNode(entity: number, depth: number): void {
		const indent = "│ ".rep(depth);
		const pos = helper.getWorldPosition(entity) ?? Vector3.zero;
		const children = helper.getChildren(entity);

		print(`${indent}├─ 实体 ${entity}: pos=${pos}, children=${children.size()}`);

		for (const child of children) {
			printNode(child, depth + 1);
		}
	}

	printNode(rootEntity, 0);
}
```

#### 验证变换传播

```typescript
function verifyTransformPropagation(world: World, entity: number): boolean {
	const [transform] = world.get(entity, Transform);
	const [globalTransform] = world.get(entity, GlobalTransform);
	const [parent] = world.get(entity, Parent);

	if (!transform || !globalTransform) {
		print(`实体 ${entity} 缺少 Transform 或 GlobalTransform`);
		return false;
	}

	if (parent) {
		const [parentGlobal] = world.get(parent.entity, GlobalTransform);
		if (!parentGlobal) {
			print(`父实体 ${parent.entity} 缺少 GlobalTransform`);
			return false;
		}

		// 验证计算是否正确
		const expected = computeGlobalTransform(transform, parentGlobal);
		const matches = expected.cframe === globalTransform.cframe;

		if (!matches) {
			print(`实体 ${entity} 的 GlobalTransform 计算不正确`);
		}

		return matches;
	}

	return true;
}
```

### 5. 常见模式

#### 相机跟随

```typescript
function createCameraFollowSystem(cameraEntity: number, targetEntity: number) {
	const offset = new Vector3(0, 5, -10);

	return (world: BevyWorld, context: Context) => {
		const helper = createTransformHelper(world);
		const targetPos = helper.getWorldPosition(targetEntity);

		if (targetPos) {
			const cameraPos = targetPos.add(offset);
			helper.setWorldPosition(cameraEntity, cameraPos);
			helper.lookAt(cameraEntity, targetPos);
		}
	};
}
```

#### 物理同步

```typescript
// 从 Roblox Part 同步到 ECS
function syncPartToEntity(world: World, part: Part, entity: number): void {
	const helper = createTransformHelper(world);
	helper.setWorldPosition(entity, part.Position);

	world.insert(entity, Transform({
		cframe: part.CFrame,
		scale: part.Size.div(2), // Roblox Part 的 Size 是整体大小
	}));
}

// 从 ECS 同步到 Roblox Part
function syncEntityToPart(world: World, entity: number, part: Part): void {
	const [globalTransform] = world.get(entity, GlobalTransform);

	if (globalTransform) {
		part.CFrame = globalTransform.cframe;
		part.Size = globalTransform.scale.mul(2);
	}
}
```

#### 绑定到 Roblox Instance

```typescript
import { component } from "@rbxts/matter";

const RobloxInstance = component<{
	instance: Instance;
}>("RobloxInstance");

function createSyncSystem() {
	return (world: BevyWorld, context: Context) => {
		for (const [entity, instance, globalTransform] of world.query(
			RobloxInstance,
			GlobalTransform
		)) {
			if (instance.instance.IsA("BasePart")) {
				instance.instance.CFrame = globalTransform.cframe;
			}
		}
	};
}
```

---

## 常见问题

### Q1: 为什么修改 Transform 后 GlobalTransform 没有立即更新？

**A**: GlobalTransform 的更新是在系统调度的 PostUpdate 阶段进行的。如果你在同一帧内修改了 Transform，需要等到 PostUpdate 阶段才能看到 GlobalTransform 的更新。

```typescript
// 当前帧
world.insert(entity, Transform({ cframe, scale }));

// GlobalTransform 会在 PostUpdate 阶段自动更新
// 不要在同一帧内立即查询 GlobalTransform
```

### Q2: 如何让子对象保持相对位置但不继承旋转？

**A**: 这需要自定义逻辑，因为标准的层级系统会继承所有变换。你可以：

```typescript
// 方案 1：使用系统手动计算
function createCustomParentSystem() {
	return (world: BevyWorld, context: Context) => {
		for (const [childEntity, customParent] of world.query(CustomParentComponent)) {
			const parentPos = helper.getWorldPosition(customParent.parent);
			const childLocalPos = customParent.localPosition;

			if (parentPos) {
				// 只继承位置，不继承旋转
				helper.setWorldPosition(childEntity, parentPos.add(childLocalPos));
			}
		}
	};
}

// 方案 2：不使用父子关系，手动管理
```

### Q3: 性能问题：层级树很大时更新很慢

**A**: 优化策略：

1. **减少层级深度**：尽量保持扁平结构
2. **使用局部更新**：只更新变化的部分
3. **批量操作**：避免频繁的单个修改
4. **缓存查询结果**：避免重复查询

```typescript
// ❌ 慢：深层级 + 频繁更新
for (let i = 0; i < 1000; i++) {
	const pos = helper.getWorldPosition(entity);
	helper.setWorldPosition(entity, pos.add(delta));
}

// ✅ 快：批量更新
const [transform] = world.get(entity, Transform);
if (transform) {
	const newCFrame = transform.cframe.mul(new CFrame(totalDelta));
	world.insert(entity, Transform({ cframe: newCFrame, scale: transform.scale }));
}
```

### Q4: 如何检测变换是否改变？

**A**: 使用 TransformTreeChanged 组件：

```typescript
function createTransformChangeDetectionSystem() {
	return (world: BevyWorld, context: Context) => {
		for (const [entity, _changed] of world.query(TransformTreeChanged)) {
			print(`实体 ${entity} 的变换已改变`);

			// 处理变化
			// ...

			// 注意：TransformTreeChanged 会被系统自动清除
		}
	};
}
```

### Q5: 如何实现"看向"功能但限制某个轴？

**A**: 手动计算受限的 LookAt：

```typescript
function lookAtWithAxisLock(
	helper: TransformHelper,
	entity: number,
	target: Vector3,
	lockAxis: "X" | "Y" | "Z"
): void {
	const currentPos = helper.getWorldPosition(entity);

	if (!currentPos) {
		return;
	}

	// 根据锁定的轴调整目标位置
	let adjustedTarget = target;
	if (lockAxis === "Y") {
		adjustedTarget = new Vector3(target.X, currentPos.Y, target.Z);
	}
	// 其他轴类似...

	helper.lookAt(entity, adjustedTarget);
}
```

### Q6: 可以动态改变父子关系吗？

**A**: 可以，使用 Helper 的 setParent 方法：

```typescript
const helper = createTransformHelper(world);

// 设置新的父级
helper.setParent(childEntity, newParentEntity);

// 移除父级（变成根对象）
helper.setParent(childEntity, undefined);

// 注意：改变父级后，子对象的世界坐标会保持不变
// 但局部坐标（Transform）会自动调整
```

### Q7: 如何获取实体的前向、右向、上向量？

**A**: 使用 GlobalTransform 的辅助函数：

```typescript
import { getForward, getRight, getUp } from "bevy_transform";

const [globalTransform] = world.get(entity, GlobalTransform);
if (globalTransform) {
	const forward = getForward(globalTransform);  // -Z
	const right = getRight(globalTransform);      // X
	const up = getUp(globalTransform);            // Y

	// 使用方向向量
	const movement = forward.mul(speed * deltaTime);
	helper.translate(entity, movement);
}
```

### Q8: 缩放会影响子对象吗？

**A**: 会。子对象的全局缩放是父级缩放和自身缩放的乘积：

```typescript
// 父级缩放 (2, 2, 2)
helper.scale(parentEntity, 2);

// 子级局部缩放 (1, 1, 1)
// 子级全局缩放 = (2, 2, 2) × (1, 1, 1) = (2, 2, 2)

// 如果子级局部缩放为 (2, 1, 2)
// 子级全局缩放 = (2, 2, 2) × (2, 1, 2) = (4, 2, 4)
```

---

## 总结

`bevy_transform` 模块提供了一套完整、高效、易用的变换系统：

- **自动化**：变换传播自动进行，无需手动管理
- **高性能**：增量更新，只计算变化的部分
- **类型安全**：TypeScript 类型系统保证代码正确性
- **Roblox 原生**：使用 CFrame 和 Vector3，完美集成
- **功能丰富**：提供 Helper 类和 Bundle 简化常见操作

关键点：

1. 只修改 Transform，不要修改 GlobalTransform
2. 使用 TransformHelper 简化操作
3. 使用 TransformBundle 确保组件完整性
4. 理解层级传播机制
5. 注意性能优化（批量操作、扁平结构）

通过遵循最佳实践，你可以构建高效、可维护的变换系统！
