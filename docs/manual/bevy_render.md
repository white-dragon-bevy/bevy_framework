# bevy_render 模块操作手册

## 目录

- [模块概述](#模块概述)
- [核心组件](#核心组件)
  - [Visibility 组件](#visibility-组件)
  - [ViewVisibility 组件](#viewvisibility-组件)
  - [RobloxInstance 组件](#robloxinstance-组件)
  - [RenderLayers 组件](#renderlayers-组件)
- [渲染系统](#渲染系统)
  - [可见性系统 (visibilitySystem)](#可见性系统-visibilitysystem)
  - [Roblox 同步系统 (robloxSyncSystem)](#roblox-同步系统-robloxsyncsystem)
  - [清理系统 (cleanupRemovedEntities)](#清理系统-cleanupremovedentities)
- [RenderPlugin 插件](#renderplugin-插件)
- [渲染调度](#渲染调度)
- [实战示例](#实战示例)
  - [基础可见性控制](#基础可见性控制)
  - [同步 ECS 实体到 Roblox](#同步-ecs-实体到-roblox)
  - [层级可见性继承](#层级可见性继承)
  - [渲染层级管理](#渲染层级管理)
  - [动态显示隐藏](#动态显示隐藏)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 模块概述

`bevy_render` 模块是 Bevy 框架在 Roblox 平台上的渲染系统实现。它负责管理实体的可见性、将 ECS 实体与 Roblox 实例进行同步，以及提供分层渲染功能。

### 核心功能

- **可见性管理**：控制实体的显示/隐藏状态
- **层级可见性继承**：支持从父级继承可见性
- **Roblox 实例同步**：将 GlobalTransform 自动同步到 Roblox Part/Model
- **渲染层级**：支持多层渲染（UI、世界、特效等）
- **高效隐藏机制**：使用专用容器而非 Destroy 来隐藏对象

### 设计理念

1. **分离关注点**：Visibility（用户控制）和 ViewVisibility（计算结果）分离
2. **层级继承**：自动计算父子层级的可见性
3. **非破坏性隐藏**：隐藏对象移到 ReplicatedStorage，可快速恢复
4. **Transform 同步**：自动将 GlobalTransform 应用到 Roblox 实例

---

## 核心组件

### Visibility 组件

Visibility 组件控制实体的**期望可见性状态**，是用户直接控制的接口。

#### 组件定义

```typescript
export enum VisibilityState {
	/** 可见 */
	Visible = "Visible",
	/** 隐藏 */
	Hidden = "Hidden",
	/** 继承父级可见性 */
	Inherited = "Inherited",
}

export const Visibility = component<{
	/** 可见性状态 */
	state: VisibilityState;
}>("Visibility");
```

#### 创建 Visibility

```typescript
import { Visibility, VisibilityState, createDefaultVisibility } from "bevy_render";

// 1. 默认可见
const visibleEntity = world.spawn(
	createDefaultVisibility() // state = Visible
);

// 2. 显式设置为可见
const explicitVisible = world.spawn(
	Visibility({ state: VisibilityState.Visible })
);

// 3. 设置为隐藏
const hidden = world.spawn(
	Visibility({ state: VisibilityState.Hidden })
);

// 4. 继承父级可见性
const inherited = world.spawn(
	Visibility({ state: VisibilityState.Inherited })
);
```

#### 可见性状态说明

| 状态 | 说明 | 使用场景 |
|------|------|----------|
| `Visible` | 强制可见，不管父级状态 | 始终显示的 UI 元素 |
| `Hidden` | 强制隐藏，不管父级状态 | 临时禁用的对象 |
| `Inherited` | 跟随父级的 ViewVisibility | 大部分子对象的默认选择 |

---

### ViewVisibility 组件

ViewVisibility 组件表示**计算后的实际可见性**，由渲染系统自动维护，**不应手动修改**。

#### 组件定义

```typescript
export const ViewVisibility = component<{
	/** 是否可见 */
	visible: boolean;
}>("ViewVisibility");
```

#### 计算规则

ViewVisibility 的计算遵循以下规则：

1. 如果 `Visibility.state === Visible`，则 `ViewVisibility.visible = true`
2. 如果 `Visibility.state === Hidden`，则 `ViewVisibility.visible = false`
3. 如果 `Visibility.state === Inherited`：
   - 有父级：继承父级的 `ViewVisibility.visible`
   - 无父级：默认为 `true`

```typescript
// 自动创建，无需手动添加
// 渲染系统会自动为所有有 Visibility 的实体创建 ViewVisibility
```

---

### RobloxInstance 组件

RobloxInstance 组件将 ECS 实体与 Roblox 的 Part 或 Model 实例关联。

#### 组件定义

```typescript
export const RobloxInstance = component<{
	/** Roblox Part 或 Model 实例 */
	instance: BasePart | Model;
	/** 原始父容器（用于隐藏时缓存） */
	originalParent?: Instance;
	/** 隐藏容器（用于存放隐藏的对象） */
	hiddenContainer?: Folder;
}>("RobloxInstance");
```

#### 创建 RobloxInstance

```typescript
import { RobloxInstance } from "bevy_render";
import { Workspace } from "@rbxts/services";

// 1. 关联 BasePart
const part = new Instance("Part");
part.Parent = Workspace;

const entity = world.spawn(
	RobloxInstance({ instance: part })
);

// 2. 关联 Model
const model = new Instance("Model");
model.Parent = Workspace;

const modelEntity = world.spawn(
	RobloxInstance({ instance: model })
);
```

#### 字段说明

- **instance**: 关联的 Roblox 对象，可以是 Part 或 Model
- **originalParent**: 系统自动维护，记录对象隐藏前的父级
- **hiddenContainer**: 系统自动维护，指向隐藏容器（通常不需要手动设置）

---

### RenderLayers 组件

RenderLayers 组件用于实现分层渲染，将对象分配到不同的渲染层级。

#### 组件定义

```typescript
export const RenderLayers = component<{
	/** 层级掩码（位标志） */
	layers: number;
}>("RenderLayers");

export const DefaultRenderLayers = {
	/** 默认层（所有对象） */
	Default: 0b0001,
	/** UI 层 */
	UI: 0b0010,
	/** 世界层 */
	World: 0b0100,
	/** 特效层 */
	Effects: 0b1000,
} as const;
```

#### 使用渲染层级

```typescript
import { RenderLayers, DefaultRenderLayers, isInRenderLayer } from "bevy_render";

// 1. 分配到单一层级
const uiEntity = world.spawn(
	RenderLayers({ layers: DefaultRenderLayers.UI })
);

// 2. 分配到多个层级（位或运算）
const multiLayerEntity = world.spawn(
	RenderLayers({
		layers: DefaultRenderLayers.World | DefaultRenderLayers.Effects
	})
);

// 3. 检查实体是否在指定层级
const renderLayers = world.get(entity, RenderLayers);
if (renderLayers && isInRenderLayer(renderLayers.layers, DefaultRenderLayers.UI)) {
	print("实体在 UI 层");
}

// 4. 动态添加层级
if (renderLayers) {
	world.insert(entity, RenderLayers({
		layers: renderLayers.layers | DefaultRenderLayers.Effects
	}));
}

// 5. 移除层级
if (renderLayers) {
	world.insert(entity, RenderLayers({
		layers: renderLayers.layers & ~DefaultRenderLayers.Effects
	}));
}
```

---

## 渲染系统

### 可见性系统 (visibilitySystem)

可见性系统负责计算 ViewVisibility 并应用到 Roblox 实例。

#### 系统流程

1. **计算阶段**：遍历所有 Visibility 组件，根据状态和父级关系计算 ViewVisibility
2. **应用阶段**：遍历所有 RobloxInstance + ViewVisibility，设置 Roblox 对象的显示/隐藏

```typescript
// 系统由 RenderPlugin 自动添加，无需手动调用
export function visibilitySystem(world: BevyWorld): void {
	// 第一步：计算 ViewVisibility
	for (const [entity, visibility] of world.query(Visibility)) {
		let isVisible = false;

		if (visibility.state === VisibilityState.Visible) {
			isVisible = true;
		} else if (visibility.state === VisibilityState.Inherited) {
			// 检查父级的可见性
			const parent = world.get(entity, Parent);
			if (parent) {
				const parentViewVisibility = world.get(parent.entity, ViewVisibility);
				isVisible = parentViewVisibility?.visible ?? true;
			} else {
				isVisible = true;
			}
		}

		world.insert(entity, ViewVisibility({ visible: isVisible }));
	}

	// 第二步：应用可见性到 Roblox 实例
	for (const [entity, robloxInstance, viewVisibility] of world.query(
		RobloxInstance,
		ViewVisibility
	)) {
		const instance = robloxInstance.instance;
		const isVisible = viewVisibility.visible;

		if (isVisible) {
			// 恢复到原始父级
			if (instance.Parent === hiddenContainer) {
				instance.Parent = robloxInstance.originalParent ?? Workspace;
			}
		} else {
			// 移到隐藏容器
			if (instance.Parent !== hiddenContainer) {
				const updatedRobloxInstance = {
					...robloxInstance,
					originalParent: instance.Parent ?? Workspace,
				};
				world.insert(entity, RobloxInstance(updatedRobloxInstance));
				instance.Parent = hiddenContainer;
			}
		}
	}
}
```

---

### Roblox 同步系统 (robloxSyncSystem)

Roblox 同步系统将 GlobalTransform 自动应用到 Roblox 实例的 CFrame。

#### 系统功能

- 同步位置和旋转（通过 CFrame）
- 同步缩放（通过 Size，需要设置 BaseSize 属性）
- 支持 BasePart 和 Model 两种类型

```typescript
export function robloxSyncSystem(world: BevyWorld): void {
	for (const [entity, globalTransform, robloxInstance] of world.query(
		GlobalTransform,
		RobloxInstance
	)) {
		const instance = robloxInstance.instance;

		if (instance.IsA("BasePart")) {
			// 同步 CFrame
			instance.CFrame = globalTransform.cframe;

			// 同步缩放
			if (instance.Size) {
				const baseSize = instance.GetAttribute("BaseSize") as Vector3 | undefined;
				if (baseSize) {
					instance.Size = baseSize.mul(globalTransform.scale);
				}
			}
		} else if (instance.IsA("Model")) {
			// 使用 PivotTo 同步 Model
			instance.PivotTo(globalTransform.cframe);
		}
	}
}
```

#### 缩放同步说明

Roblox 的 Part 使用 `Size` 表示大小，与 Bevy 的 `scale` 概念不同：

1. 在 Part 上设置 `BaseSize` 属性（Vector3）
2. 系统会自动计算 `Size = BaseSize * GlobalTransform.scale`

```typescript
// 设置 BaseSize 以启用缩放同步
const part = new Instance("Part");
part.SetAttribute("BaseSize", new Vector3(4, 1, 2));
part.Parent = Workspace;

const entity = world.spawn(
	RobloxInstance({ instance: part }),
	Transform({
		cframe: CFrame.identity,
		scale: new Vector3(2, 2, 2), // 最终 Size = (8, 2, 4)
	})
);
```

---

### 清理系统 (cleanupRemovedEntities)

清理系统负责移除无效的 RobloxInstance 组件。

```typescript
export function cleanupRemovedEntities(world: BevyWorld): void {
	for (const [entity, robloxInstance] of world.query(RobloxInstance)) {
		const instance = robloxInstance.instance;

		// 如果实例已经被销毁，移除组件
		if (!instance.Parent) {
			world.remove(entity, RobloxInstance);
		}
	}
}
```

---

## RenderPlugin 插件

RenderPlugin 是渲染系统的入口点，负责注册所有渲染相关的系统。

### 插件配置

```typescript
import { App } from "bevy_app";
import { createRenderPlugin } from "bevy_render";

const app = new App();

// 添加渲染插件
app.addPlugin(createRenderPlugin());
```

### 系统执行时机

RenderPlugin 在以下调度阶段注册系统：

1. **Startup**：初始化可见性和同步
   ```typescript
   renderStartupSystem: visibilitySystem + robloxSyncSystem
   ```

2. **PostUpdate**：每帧更新（在 Transform 系统之后）
   ```typescript
   renderUpdateSystem: visibilitySystem + robloxSyncSystem + cleanupRemovedEntities
   ```

### 系统依赖关系

```
TransformPlugin (Transform 传播)
       ↓
RenderPlugin (可见性计算 → Roblox 同步 → 清理)
```

---

## 渲染调度

### 内置调度阶段

渲染系统在以下阶段运行：

| 阶段 | 系统 | 说明 |
|------|------|------|
| Startup | RenderStartupSystem | 初始化可见性和同步 |
| PostUpdate | RenderUpdateSystem | 每帧更新可见性和 Transform |

### 自定义调度

如果需要自定义渲染时机，可以手动调用渲染系统：

```typescript
import { visibilitySystem, robloxSyncSystem } from "bevy_render";

function customRenderSystem(world: BevyWorld): void {
	// 先运行自定义逻辑
	customLogic(world);

	// 再运行渲染系统
	visibilitySystem(world);
	robloxSyncSystem(world);
}

app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
	schedule.addSystem({
		system: customRenderSystem,
		name: "CustomRenderSystem",
	});
});
```

---

## 实战示例

### 基础可见性控制

```typescript
import { Visibility, VisibilityState } from "bevy_render";

// 创建可见的实体
const entity = world.spawn(
	Visibility({ state: VisibilityState.Visible })
);

// 隐藏实体
world.insert(entity, Visibility({ state: VisibilityState.Hidden }));

// 恢复可见
world.insert(entity, Visibility({ state: VisibilityState.Visible }));

// 检查可见性
const visibility = world.get(entity, Visibility);
if (visibility && visibility.state === VisibilityState.Hidden) {
	print("实体已隐藏");
}
```

---

### 同步 ECS 实体到 Roblox

```typescript
import { RobloxInstance } from "bevy_render";
import { Transform, GlobalTransform } from "bevy_transform";
import { Workspace } from "@rbxts/services";

// 1. 创建 Roblox Part
const part = new Instance("Part");
part.Size = new Vector3(4, 1, 2);
part.BrickColor = BrickColor.Red();
part.SetAttribute("BaseSize", part.Size); // 启用缩放同步
part.Parent = Workspace;

// 2. 创建 ECS 实体并关联
const entity = world.spawn(
	RobloxInstance({ instance: part }),
	Transform({
		cframe: new CFrame(new Vector3(0, 10, 0)),
		scale: new Vector3(1, 1, 1),
	}),
	Visibility({ state: VisibilityState.Visible })
);

// 3. 修改 Transform，Roblox 实例会自动同步
world.insert(entity, Transform({
	cframe: new CFrame(new Vector3(10, 10, 0)),
	scale: new Vector3(2, 2, 2), // Part.Size 会变为 (8, 2, 4)
}));
```

---

### 层级可见性继承

```typescript
import { Visibility, VisibilityState } from "bevy_render";
import { Parent } from "bevy_ecs";

// 创建父实体（隐藏）
const parentEntity = world.spawn(
	Visibility({ state: VisibilityState.Hidden })
);

// 创建子实体（继承父级可见性）
const childEntity = world.spawn(
	Visibility({ state: VisibilityState.Inherited }),
	Parent({ entity: parentEntity })
);

// 此时子实体也是隐藏的（继承父级）
const childView = world.get(childEntity, ViewVisibility);
print(childView?.visible); // false

// 显示父实体，子实体也会自动显示
world.insert(parentEntity, Visibility({ state: VisibilityState.Visible }));

// 下一帧后，子实体会自动变为可见
```

---

### 渲染层级管理

```typescript
import { RenderLayers, DefaultRenderLayers, isInRenderLayer } from "bevy_render";

// 创建 UI 元素
const uiButton = world.spawn(
	RenderLayers({ layers: DefaultRenderLayers.UI })
);

// 创建世界对象（多层）
const worldObject = world.spawn(
	RenderLayers({
		layers: DefaultRenderLayers.World | DefaultRenderLayers.Effects
	})
);

// 查询所有 UI 层对象
for (const [entity, renderLayers] of world.query(RenderLayers)) {
	if (isInRenderLayer(renderLayers.layers, DefaultRenderLayers.UI)) {
		print(`实体 ${entity} 在 UI 层`);
	}
}

// 动态切换层级
const currentLayers = world.get(worldObject, RenderLayers);
if (currentLayers) {
	// 移除特效层
	world.insert(worldObject, RenderLayers({
		layers: currentLayers.layers & ~DefaultRenderLayers.Effects
	}));
}
```

---

### 动态显示隐藏

```typescript
import { Visibility, VisibilityState, ViewVisibility } from "bevy_render";

// 创建一组可切换显示的实体
const entities = [1, 2, 3, 4, 5].map((index) => {
	return world.spawn(
		Visibility({ state: VisibilityState.Visible }),
		RobloxInstance({ instance: createPart(index) })
	);
});

// 切换显示状态
function toggleVisibility(entity: number): void {
	const visibility = world.get(entity, Visibility);
	if (!visibility) return;

	const newState = visibility.state === VisibilityState.Visible
		? VisibilityState.Hidden
		: VisibilityState.Visible;

	world.insert(entity, Visibility({ state: newState }));
}

// 批量隐藏
function hideAll(): void {
	for (const entity of entities) {
		world.insert(entity, Visibility({ state: VisibilityState.Hidden }));
	}
}

// 批量显示
function showAll(): void {
	for (const entity of entities) {
		world.insert(entity, Visibility({ state: VisibilityState.Visible }));
	}
}

// 条件性显示（根据 ViewVisibility）
function showOnlyVisible(): void {
	for (const [entity, viewVisibility] of world.query(ViewVisibility)) {
		if (viewVisibility.visible) {
			print(`实体 ${entity} 当前可见`);
		}
	}
}
```

---

## 最佳实践

### 1. 可见性状态选择

```typescript
// ✅ 推荐：大部分子对象使用 Inherited
const child = world.spawn(
	Visibility({ state: VisibilityState.Inherited }),
	Parent({ entity: parentEntity })
);

// ❌ 避免：子对象强制可见会破坏层级逻辑
const badChild = world.spawn(
	Visibility({ state: VisibilityState.Visible }), // 父级隐藏时仍可见
	Parent({ entity: parentEntity })
);
```

### 2. 不要手动修改 ViewVisibility

```typescript
// ❌ 错误：手动修改 ViewVisibility
world.insert(entity, ViewVisibility({ visible: false }));

// ✅ 正确：修改 Visibility，让系统自动计算 ViewVisibility
world.insert(entity, Visibility({ state: VisibilityState.Hidden }));
```

### 3. RobloxInstance 缩放同步

```typescript
// ✅ 推荐：设置 BaseSize 属性
const part = new Instance("Part");
part.Size = new Vector3(4, 1, 2);
part.SetAttribute("BaseSize", part.Size);

// ❌ 避免：不设置 BaseSize，缩放不会同步
const badPart = new Instance("Part");
badPart.Size = new Vector3(4, 1, 2);
// 缺少 SetAttribute("BaseSize")
```

### 4. 性能优化：批量操作

```typescript
// ✅ 推荐：批量修改后统一提交
const updates = new Map<number, Visibility>();
for (const entity of entities) {
	updates.set(entity, Visibility({ state: VisibilityState.Hidden }));
}
for (const [entity, visibility] of updates) {
	world.insert(entity, visibility);
}

// ❌ 避免：逐个修改，触发多次系统运行
for (const entity of entities) {
	world.insert(entity, Visibility({ state: VisibilityState.Hidden }));
	// 每次插入都可能触发系统更新（取决于调度）
}
```

### 5. 清理资源

```typescript
// ✅ 推荐：移除实体时，Roblox 实例会自动清理
world.despawn(entity);

// ❌ 避免：手动销毁 Roblox 实例可能导致不一致
const robloxInstance = world.get(entity, RobloxInstance);
if (robloxInstance) {
	robloxInstance.instance.Destroy(); // 不推荐
}
```

### 6. 渲染层级的合理使用

```typescript
// ✅ 推荐：使用预定义常量
const entity = world.spawn(
	RenderLayers({ layers: DefaultRenderLayers.UI })
);

// ✅ 推荐：自定义层级使用位移操作
const CustomLayers = {
	Player: 1 << 4,  // 0b10000
	Enemy: 1 << 5,   // 0b100000
	Projectile: 1 << 6, // 0b1000000
};

// ❌ 避免：使用魔法数字
const badEntity = world.spawn(
	RenderLayers({ layers: 42 }) // 什么意思？
);
```

### 7. 调试可见性问题

```typescript
// 调试系统：打印所有实体的可见性状态
function debugVisibility(world: BevyWorld): void {
	print("=== Visibility Debug ===");
	for (const [entity, visibility, viewVisibility] of world.query(
		Visibility,
		ViewVisibility
	)) {
		print(`Entity ${entity}:`);
		print(`  Visibility.state = ${visibility.state}`);
		print(`  ViewVisibility.visible = ${viewVisibility.visible}`);

		const parent = world.get(entity, Parent);
		if (parent) {
			print(`  Parent = ${parent.entity}`);
		}
	}
}

// 在系统中调用
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
	schedule.addSystem({
		system: debugVisibility,
		name: "DebugVisibility",
	});
});
```

---

## 常见问题

### Q1: 为什么修改 Visibility 后对象没有立即隐藏？

**A**: 可见性系统在 PostUpdate 阶段运行，修改会在下一帧生效。如果需要立即生效，可以手动调用：

```typescript
import { visibilitySystem } from "bevy_render";

world.insert(entity, Visibility({ state: VisibilityState.Hidden }));
visibilitySystem(world); // 立即应用
```

### Q2: 子对象设置为 Inherited，但父级隐藏后子对象仍然可见？

**A**: 检查以下几点：

1. 确保子对象有 `Parent` 组件
2. 确保父对象有 `ViewVisibility` 组件（由系统自动创建）
3. 确保渲染系统正在运行（RenderPlugin 已添加）

```typescript
// 正确的层级设置
const parent = world.spawn(
	Visibility({ state: VisibilityState.Hidden })
);

const child = world.spawn(
	Visibility({ state: VisibilityState.Inherited }),
	Parent({ entity: parent }) // 必须有 Parent 组件
);
```

### Q3: Transform 修改后，Roblox 实例没有移动？

**A**: 检查以下几点：

1. 确保实体有 `RobloxInstance` 组件
2. 确保 `Transform` 修改后传播到 `GlobalTransform`（由 TransformPlugin 处理）
3. 确保 RenderPlugin 在 TransformPlugin 之后运行

```typescript
// 完整的实体设置
const entity = world.spawn(
	Transform({ cframe: CFrame.identity, scale: Vector3.one }),
	GlobalTransform({ cframe: CFrame.identity, scale: Vector3.one }),
	RobloxInstance({ instance: part })
);
```

### Q4: 如何实现渐变显示/隐藏效果？

**A**: 渲染系统只处理布尔可见性。渐变效果需要自定义系统：

```typescript
import { TweenService } from "@rbxts/services";

function fadeOut(entity: number, duration: number): void {
	const robloxInstance = world.get(entity, RobloxInstance);
	if (!robloxInstance) return;

	const instance = robloxInstance.instance;
	if (instance.IsA("BasePart")) {
		const tween = TweenService.Create(
			instance,
			new TweenInfo(duration),
			{ Transparency: 1 }
		);
		tween.Play();

		tween.Completed.Connect(() => {
			// 完全透明后隐藏
			world.insert(entity, Visibility({ state: VisibilityState.Hidden }));
		});
	}
}
```

### Q5: RenderLayers 如何与 Roblox 的 CollisionGroup 结合？

**A**: RenderLayers 只影响渲染逻辑，不影响物理。需要单独设置 CollisionGroup：

```typescript
const entity = world.spawn(
	RenderLayers({ layers: DefaultRenderLayers.UI }),
	RobloxInstance({ instance: part })
);

// 单独设置 CollisionGroup
const robloxInstance = world.get(entity, RobloxInstance);
if (robloxInstance && robloxInstance.instance.IsA("BasePart")) {
	robloxInstance.instance.CollisionGroup = "UILayer";
}
```

### Q6: 如何实现 LOD (Level of Detail)？

**A**: 可以使用渲染层级结合距离检测：

```typescript
const LODLayers = {
	High: 1 << 0,
	Medium: 1 << 1,
	Low: 1 << 2,
};

function updateLOD(world: BevyWorld, cameraPosition: Vector3): void {
	for (const [entity, globalTransform, renderLayers] of world.query(
		GlobalTransform,
		RenderLayers
	)) {
		const distance = cameraPosition.sub(globalTransform.cframe.Position).Magnitude;

		let newLayer: number;
		if (distance < 50) {
			newLayer = LODLayers.High;
		} else if (distance < 100) {
			newLayer = LODLayers.Medium;
		} else {
			newLayer = LODLayers.Low;
		}

		if (renderLayers.layers !== newLayer) {
			world.insert(entity, RenderLayers({ layers: newLayer }));
		}
	}
}
```

### Q7: 性能问题：大量实体导致卡顿？

**A**: 优化建议：

1. **使用渲染层级过滤**：只更新当前激活的层
2. **空间分区**：使用八叉树或网格分区，只更新可见区域
3. **批量更新**：合并多个修改，减少系统调用次数
4. **条件更新**：使用脏标记，只更新改变的实体

```typescript
// 条件更新示例
const Dirty = component<{ dirty: boolean }>("Dirty");

function optimizedRobloxSync(world: BevyWorld): void {
	for (const [entity, globalTransform, robloxInstance, dirty] of world.query(
		GlobalTransform,
		RobloxInstance,
		Dirty
	)) {
		if (!dirty.dirty) continue;

		const instance = robloxInstance.instance;
		if (instance.IsA("BasePart")) {
			instance.CFrame = globalTransform.cframe;
		}

		// 清除脏标记
		world.insert(entity, Dirty({ dirty: false }));
	}
}
```

---

## 总结

`bevy_render` 模块提供了一套完整的渲染解决方案，核心特性包括：

1. **自动可见性管理**：通过 Visibility 和 ViewVisibility 组件
2. **层级继承**：子对象自动继承父级的可见性
3. **Transform 同步**：自动将 GlobalTransform 应用到 Roblox 实例
4. **高效隐藏机制**：使用容器而非销毁，快速恢复
5. **分层渲染**：支持多层渲染管理

通过合理使用这些功能，可以构建高效、可维护的 Roblox 游戏渲染系统。