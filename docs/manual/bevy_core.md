# bevy_core 模块操作手册

## 1. 模块概述

`bevy_core` 是框架的核心基础模块，提供类型反射和类型映射系统。该模块解决了 TypeScript/Lua 跨语言环境中的类型识别和管理问题。

### 核心功能
- **类型反射系统**：通过 Flamework 宏获取运行时类型信息
- **类型映射表**：基于 TypeDescriptor 的三层映射结构
- **类型标识符**：为泛型类型生成唯一标识

### 架构特点
- 利用 Flamework 编译时宏生成类型元数据
- 支持泛型类型的完整描述（外层/内层类型）
- 零运行时类型检查开销

---

## 2. 核心组件

### 2.1 TypeDescriptor (类型描述符)

类型描述符是框架中所有类型识别的基础数据结构。

```typescript
interface TypeDescriptor<T = never> {
	id: string;           // 类型唯一标识符
	text: string;         // 类型文本表示
	genericId?: string;   // 泛型外层类型ID（可选）
}
```

**字段说明**：
- `id`: 包路径和类型名的完整标识，如 `"@white-dragon-bevy/bevy_framework:reflect@Foo"`
- `text`: 人类可读的类型表示，如 `"Foo<number>"`
- `genericId`: 用于泛型类型，标识外层容器类型

### 2.2 TypeMap (类型映射表)

TypeMap 是基于 TypeDescriptor 的高性能映射数据结构。

**内部结构**：
- 三层 Map 嵌套：`id → text → genericId → value`
- 扁平化 Map 用于快速迭代
- 支持完整的 CRUD 操作

**特性**：
- 自动处理可选参数（空字符串作为默认值）
- 双映射同步（嵌套 + 扁平）
- 支持 forEach 和数组式迭代

---

## 3. API 详解

### 3.1 类型反射 API

#### getTypeDescriptor()

获取类型的运行时描述符（内部使用，通常不直接调用）。

```typescript
function getTypeDescriptor(
	id?: string,
	text?: string
): TypeDescriptor | undefined
```

**返回值**：
- 成功：包含 id 和 text 的 TypeDescriptor
- 失败：id 为 undefined 或 "$p:never" 时返回 undefined

#### getGenericTypeDescriptor()

获取泛型类型的完整描述符（支持宏展开）。

```typescript
function getGenericTypeDescriptor<Outer, Inner = any>(
	typeDescriptor?: TypeDescriptor,
	innerTypeId?: Modding.Generic<Inner, "id">,
	innerTypeText?: Modding.Generic<Inner, "text">,
	outerTypeId?: Modding.Generic<Outer, "id">,
	outerTypeText?: Modding.Generic<Outer, "text">
): TypeDescriptor
```

**使用场景**：
- 状态机：`State<GameState>`
- 事件系统：`EventReader<MyEvent>`
- 资源系统：`Res<MyResource>`

### 3.2 TypeMap API

#### 构造函数

```typescript
const map = new TypeMap<T>();
```

#### get() - 获取值

```typescript
// 方法签名
get(id: string): T | undefined
get(id: string, text: string): T | undefined
get(id: string, text: string, genericId: string): T | undefined
get(typeDescriptor: TypeDescriptor): T | undefined

// 使用示例
const value = map.get("MyType", "MyType<number>", "Container");
```

#### set() - 设置值

```typescript
// 方法签名
set(value: T, id: string, text?: string, genericId?: string): void
set(value: T, typeDescriptor: TypeDescriptor): void

// 使用示例
map.set(myValue, "MyType", "MyType<number>", "Container");
```

#### has() - 检查存在

```typescript
// 方法签名
has(id: string): boolean
has(id: string, text: string): boolean
has(id: string, text: string, genericId: string): boolean
has(typeDescriptor: TypeDescriptor): boolean

// 使用示例
if (map.has("MyType", "MyType<number>")) {
	// 类型已注册
}
```

#### delete() - 删除条目

```typescript
// 方法签名
delete(id: string): boolean
delete(id: string, text: string): boolean
delete(id: string, text: string, genericId: string): boolean
delete(typeDescriptor: TypeDescriptor): boolean

// 使用示例
const deleted = map.delete("MyType", "MyType<number>");
```

#### 迭代方法

```typescript
// forEach 迭代
map.forEach((value, key, map) => {
	print(`${key.text}: ${value}`);
});

// 获取所有条目
const entries = map.entries(); // Array<[TypeDescriptor, T]>

// 获取所有值
const values = map.values(); // T[]

// 获取所有键
const keys = map.keys(); // string[]

// 清空映射表
map.clear();
```

---

## 4. 实战示例

### 示例 1：组件 ID 管理系统

实现一个自增的组件标识符分配器，用于 ECS 系统。

```typescript
import { TypeDescriptor, TypeMap } from "../bevy_core";

const typeMap = new TypeMap<ComponentId>();
let componentIdCounter = 0;

export type ComponentId = number;

/**
 * 获取组件的唯一 ID
 */
export function getComponentIdByDescriptor<T>(
	descriptor: TypeDescriptor
): ComponentId {
	// 处理泛型类型
	if (descriptor.genericId) {
		const combinedId = `${descriptor.genericId}<${descriptor.id}>`;
		return getComponentId(combinedId, descriptor.text);
	}

	return getComponentId(descriptor.id, descriptor.text);
}

export function getComponentId(id: string, text: string): ComponentId {
	let componentId = typeMap.get(id, text);

	if (componentId === undefined) {
		componentId = componentIdCounter++;
		typeMap.set(componentId, id, text);
	}

	return componentId;
}

// 使用示例
interface Health {
	value: number;
}

const healthDescriptor = getTypeDescriptor("Health", "Health");
const healthId = getComponentIdByDescriptor(healthDescriptor); // 0

const health2Id = getComponentIdByDescriptor(healthDescriptor); // 0 (缓存命中)
```

**关键点**：
- TypeMap 作为缓存，避免重复分配 ID
- 泛型类型通过组合 ID 处理
- 自增计数器确保 ID 唯一性

### 示例 2：资源管理器类型系统

实现资源系统的类型安全存储和检索。

```typescript
import { TypeDescriptor, getTypeDescriptor } from "../bevy_core";
import { ComponentId, getComponentIdByDescriptor } from "./component-id";

export class ResourceManager {
	private readonly resources = new Map<ComponentId, object>();

	/**
	 * 插入资源（宏函数）
	 * @metadata macro
	 */
	public insertResource<T extends object>(
		resource: T,
		id?: Modding.Generic<T, "id">,
		text?: Modding.Generic<T, "text">
	): void {
		if (id === undefined || text === undefined) {
			error(`Can't get type descriptor for resource`);
		}

		const descriptor = getTypeDescriptor(id, text)!;
		this.insertResourceByTypeDescriptor(resource, descriptor);
	}

	/**
	 * 按描述符插入资源（普通函数）
	 */
	public insertResourceByTypeDescriptor(
		resource: object,
		typeDescriptor: TypeDescriptor
	): void {
		const componentId = getComponentIdByDescriptor(typeDescriptor);
		this.resources.set(componentId, resource);
	}

	/**
	 * 获取资源（宏函数）
	 * @metadata macro
	 */
	public getResource<T extends defined>(
		id?: Modding.Generic<T, "id">,
		text?: Modding.Generic<T, "text">
	): T | undefined {
		if (id === undefined || text === undefined) {
			return undefined;
		}

		const descriptor = getTypeDescriptor(id, text)!;
		const componentId = getComponentIdByDescriptor(descriptor);

		return this.resources.get(componentId) as T;
	}
}

// 使用示例
interface TimeConfig {
	deltaTime: number;
	timeScale: number;
}

const resourceManager = new ResourceManager();

// 插入资源（编译时自动注入 id 和 text）
const timeConfig: TimeConfig = {
	deltaTime: 0.016,
	timeScale: 1.0,
};
resourceManager.insertResource<TimeConfig>(timeConfig);

// 获取资源（编译时自动注入 id 和 text）
const config = resourceManager.getResource<TimeConfig>();
if (config) {
	print(`Delta time: ${config.deltaTime}`);
}
```

**关键点**：
- 宏函数通过 `@metadata macro` 标记
- `Modding.Generic<T, "id">` 参数在编译时自动填充
- 提供非宏版本 API（如 `ByTypeDescriptor`）用于动态调用
- ComponentId 作为内部键，TypeDescriptor 作为外部接口

---

## 5. 最佳实践

### 5.1 宏函数使用规范

**标记宏函数**：
```typescript
/**
 * @metadata macro
 */
export function myMacroFunction<T>(
	id?: Modding.Generic<T, "id">,
	text?: Modding.Generic<T, "text">
): void {
	// Modding.* 参数会在编译时自动注入，不需要用户提供
}
```

**提供非宏版本**：
```typescript
// 宏版本（用户友好）
public getResource<T>(id?: Modding.Generic<T, "id">, ...): T | undefined

// 非宏版本（内部使用）
public getResourceByTypeDescriptor<T>(descriptor: TypeDescriptor): T | undefined
```

### 5.2 TypeMap 使用模式

**场景 1：简单类型缓存**
```typescript
const typeIdMap = new TypeMap<number>();

// 使用 id 和 text 作为键
typeIdMap.set(100, "Player", "Player");
const playerId = typeIdMap.get("Player", "Player"); // 100
```

**场景 2：泛型类型支持**
```typescript
const eventMap = new TypeMap<EventHandler>();

// 泛型类型：EventReader<PlayerSpawnEvent>
const descriptor: TypeDescriptor = {
	id: "PlayerSpawnEvent",
	text: "EventReader<PlayerSpawnEvent>",
	genericId: "EventReader",
};

eventMap.set(handler, descriptor);
const retrievedHandler = eventMap.get(descriptor);
```

**场景 3：批量迭代**
```typescript
const componentMap = new TypeMap<ComponentInfo>();

// 添加多个组件
componentMap.set(healthInfo, "Health", "Health");
componentMap.set(positionInfo, "Position", "Position");

// 迭代所有组件
componentMap.forEach((info, descriptor) => {
	print(`Component: ${descriptor.text}, ID: ${descriptor.id}`);
});
```

### 5.3 性能优化建议

**1. 缓存 ComponentId**
```typescript
// ✅ 好：缓存 ID
const healthId = getComponentIdByDescriptor(healthDescriptor);
for (let index = 0; index < entities.size(); index++) {
	processComponent(healthId);
}

// ❌ 差：每次查询
for (let index = 0; index < entities.size(); index++) {
	const id = getComponentIdByDescriptor(healthDescriptor);
	processComponent(id);
}
```

**2. 使用批量操作**
```typescript
// ✅ 好：批量获取后处理
const allResources = resourceManager.getAllResources();
for (const [id, resource] of allResources) {
	processResource(resource);
}

// ❌ 差：逐个查询
for (const descriptor of descriptors) {
	const resource = resourceManager.getResourceByTypeDescriptor(descriptor);
	processResource(resource);
}
```

**3. 避免频繁创建 TypeDescriptor**
```typescript
// ✅ 好：复用描述符
const healthDescriptor: TypeDescriptor = {
	id: "Health",
	text: "Health",
};

for (let index = 0; index < 1000; index++) {
	const id = getComponentIdByDescriptor(healthDescriptor);
}

// ❌ 差：每次创建新对象
for (let index = 0; index < 1000; index++) {
	const id = getComponentIdByDescriptor({
		id: "Health",
		text: "Health",
	});
}
```

### 5.4 错误处理

**检查类型有效性**：
```typescript
const descriptor = getTypeDescriptor(id, text);
if (descriptor === undefined) {
	warn("无法获取类型描述符，可能是 never 类型");
	return;
}
```

**验证泛型类型**：
```typescript
export function setGenericResource<Outer, Inner>(
	typeDescriptor?: TypeDescriptor,
	// ... 其他宏参数
): void {
	assert(
		typeDescriptor?.genericId === undefined,
		`TypeDescriptor 应该在设置 genericId 前为空`
	);

	// 设置泛型 ID
	typeDescriptor.genericId = outerTypeId;
}
```

### 5.5 调试技巧

**打印类型信息**：
```typescript
function debugTypeDescriptor(descriptor: TypeDescriptor): void {
	print(`Type ID: ${descriptor.id}`);
	print(`Type Text: ${descriptor.text}`);

	if (descriptor.genericId) {
		print(`Generic Outer: ${descriptor.genericId}`);
	}
}
```

**监控 TypeMap 状态**：
```typescript
function debugTypeMap<T>(map: TypeMap<T>, name: string): void {
	const entries = map.entries();
	print(`=== ${name} (${entries.size()} entries) ===`);

	for (const [descriptor, value] of entries) {
		print(`  ${descriptor.text} => ${tostring(value)}`);
	}
}
```

---

## 总结

`bevy_core` 模块通过类型反射和映射系统，为整个框架提供了坚实的类型基础。其核心价值在于：

1. **编译时安全**：利用 Flamework 宏在编译时生成类型元数据
2. **运行时高效**：TypeMap 提供 O(1) 查询性能
3. **泛型支持**：完整支持复杂泛型类型的识别和管理
4. **双层 API**：宏函数简化使用，描述符函数提供灵活性

该模块是 `bevy_ecs` 和 `bevy_state` 等高级模块的基石，掌握其使用方法对深入理解框架至关重要。