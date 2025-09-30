# White Dragon Bevy 泛型类型处理策略

## 概述

TypeScript 的类型系统在编译后会完全擦除类型信息，无法在运行时通过泛型参数获取类型标识。White Dragon Bevy 通过 **Flamework 宏系统** 和 **TypeDescriptor 模式** 解决了这个问题，实现了类型安全的运行时类型识别。

本文档分析了 `bevy_ecs/resource.ts` 和 `bevy_state/plugin.ts` 中的泛型处理策略，总结规则和最佳实践。

---

## 核心问题

### TypeScript 类型擦除

```typescript
// 编译前
function getResource<T>(): T { ... }

// 编译后（类型信息丢失）
function getResource() { ... }
```

**问题**：
- 无法在运行时获取 `T` 的类型信息
- 无法生成类型的唯一标识符
- 无法基于类型进行动态查找

### 解决方案概览

White Dragon Bevy 采用三层解决方案：

1. **编译时**：Flamework transformer 注入类型信息
2. **运行时**：TypeDescriptor 作为类型标识
3. **接口设计**：宏方法 + 显式方法双接口

---

## 策略一：资源管理系统（ResourceManager）

### 设计模式

**文件**：`src/bevy_ecs/resource.ts`

**核心思想**：使用 Flamework 宏自动注入类型参数，提供类型安全的运行时查找。

### 实现细节

#### 1. 宏方法签名

```typescript
/**
 * 获取资源
 *
 * **注意**: @claudecode , @cursor , 这是一个宏方法, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro
 */
public getResource<T extends defined>(
    id?: Modding.Generic<T, "id">,      // 由宏自动注入
    text?: Modding.Generic<T,"text">    // 由宏自动注入
): T | undefined {
    if(id===undefined || text===undefined){
        return undefined
    }
    const componentId = getComponentId(id, text)
    return this.resources.get(componentId) as T
}
```

**关键点**：
- `@metadata macro` 注释标记此方法为宏方法
- `Modding.Generic<T, "id">` 和 `Modding.Generic<T, "text">` 由编译器自动填充
- 调用方**不需要**手动传递 `id` 和 `text` 参数

#### 2. 显式方法签名

```typescript
/**
 * 通过 TypeDescriptor 获取资源
 */
public getResourceByTypeDescriptor<T extends defined>(
    typeDescriptor: TypeDescriptor
): T | undefined {
    if(typeDescriptor===undefined){
        return undefined
    }
    const componentId = getComponentIdByDescriptor(typeDescriptor)
    return this.resources.get(componentId) as T
}
```

**关键点**：
- 不依赖宏系统
- 需要手动传递 TypeDescriptor
- 适用于动态场景或无法使用宏的情况

#### 3. 双接口模式

ResourceManager 为每个核心方法提供两个版本：

| 功能 | 宏方法 | 显式方法 |
|-----|--------|---------|
| **获取资源** | `getResource<T>()` | `getResourceByTypeDescriptor<T>(descriptor)` |
| **插入资源** | `insertResource<T>(resource)` | `insertResourceByTypeDescriptor(resource, descriptor)` |
| **移除资源** | `removeResource<T>()` | `removeResourceByTypeDescriptor(descriptor)` |
| **检查存在** | `hasResource<T>()` | `hasResourceByDescriptor(descriptor)` |

**优势**：
- 宏方法：简洁、类型安全、自动推导
- 显式方法：灵活、可控、适用于动态场景

### 使用示例

#### 宏方法（推荐）

```typescript
import { ResourceManager } from "@white-dragon-bevy/bevy_ecs";

class GameConfig {
    difficulty: number = 1;
}

const manager = new ResourceManager();

// ✅ 插入资源 - 自动推导类型
manager.insertResource(new GameConfig());

// ✅ 获取资源 - 自动推导类型
const config = manager.getResource<GameConfig>();
//    ^^^^^^ 类型: GameConfig | undefined

if (config) {
    print(config.difficulty); // 类型安全
}

// ✅ 检查资源
if (manager.hasResource<GameConfig>()) {
    // ...
}
```

#### 显式方法（动态场景）

```typescript
import { getTypeDescriptor } from "@white-dragon-bevy/bevy_core";

// 手动获取 TypeDescriptor
const configDescriptor = getTypeDescriptor("GameConfig_id", "GameConfig");

// 使用显式方法
manager.insertResourceByTypeDescriptor(new GameConfig(), configDescriptor);
const config = manager.getResourceByTypeDescriptor<GameConfig>(configDescriptor);
```

### 错误处理

ResourceManager 在宏参数缺失时会抛出清晰的错误：

```typescript
public insertResource<T extends object>(
    resource: T,
    id?: Modding.Generic<T, "id">,
    text?: Modding.Generic<T,"text">
) {
    if(id===undefined || text===undefined){
        error(`insertResource: can't get type descriptor for id=${id} text=${text}. This is likely a macro issue - make sure you're calling insertResource correctly.`)
    }
    // ...
}
```

**错误信息要点**：
- 明确指出是宏问题
- 显示实际的参数值
- 提供修复建议

---

## 策略二：状态插件系统（StatesPlugin）

### 设计模式

**文件**：`src/bevy_state/plugin.ts`

**核心思想**：使用静态 `create()` 工厂方法代替构造函数，在创建时获取并存储 TypeDescriptor。

### 实现细节

#### 1. 私有构造函数

```typescript
export class StatesPlugin<S extends States> implements Plugin {
    private config: StatePluginConfig<S>;
    public statsTypeDescriptor: TypeDescriptor = undefined as unknown as TypeDescriptor;

    /**
     * 私有构造函数 (公开调用 create())
     */
    private constructor(config: StatePluginConfig<S>) {
        this.config = config;
    }
}
```

**关键点**：
- 构造函数设为 `private`
- TypeDescriptor 存储为实例属性
- 延迟初始化，在 create() 中设置

#### 2. 静态工厂方法

```typescript
/**
 * 创建新的状态插件实例
 *
 * **注意**: @claudecode , @cursor , 这是一个宏方法, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro
 */
public static create<S extends States>(
    config: StatePluginConfig<S>,
    id?: Modding.Generic<S, "id">,
    text?: Modding.Generic<S,"text">
): StatesPlugin<S> {
    // 1. 获取 TypeDescriptor
    let typeDescriptor = getTypeDescriptor(id, text);
    assert(
        typeDescriptor,
        "Failed to get TypeDescriptor for StatesPlugin: type descriptor is required for plugin initialization"
    );

    // 2. 创建实例
    const result = new StatesPlugin(config);

    // 3. 存储 TypeDescriptor
    result.statsTypeDescriptor = typeDescriptor;

    return result;
}
```

**关键点**：
- 标记为 `@metadata macro`
- 使用 assert 验证 TypeDescriptor 获取成功
- 返回完全初始化的实例

#### 3. 使用 TypeDescriptor

插件在整个生命周期中使用存储的 TypeDescriptor：

```typescript
public build(app: App): void {
    // 使用存储的 TypeDescriptor
    this.transitionManager = StateTransitionManager.create(
        this.statsTypeDescriptor,  // ← 使用存储的 descriptor
        this.messageRegistry
    );

    const stateTransitionManagerTypeDescriptor =
        getGenericTypeDescriptor<StateTransitionManager<S>>(
            this.statsTypeDescriptor  // ← 生成泛型类型的 descriptor
        );

    app.world().world.resources.insertResourceByTypeDescriptor(
        this.transitionManager,
        stateTransitionManagerTypeDescriptor
    );
}

public name(): string {
    return this.statsTypeDescriptor.text;  // ← 使用 descriptor 生成名称
}
```

### 使用示例

```typescript
import { StatesPlugin } from "@white-dragon-bevy/bevy_state";

enum GameState {
    Menu,
    Playing,
    Paused
}

// ✅ 使用静态 create() 方法
app.addPlugin(StatesPlugin.create({
    defaultState: () => GameState.Menu
}));
// 宏系统自动注入 GameState 的类型信息

// ❌ 不要直接使用 new
// new StatesPlugin({ ... })  // 错误：构造函数是 private
```

---

## 策略三：多泛型参数处理（SubStatesPlugin）

### 设计模式

**复杂场景**：当插件需要多个泛型参数时，每个参数都需要独立的 TypeDescriptor。

### 实现细节

#### 1. 多参数宏方法

```typescript
public static create<TParent extends States, TSub extends SubStates<TParent>>(
    subStateClass: new () => TSub,
    // 父状态类型参数
    pid?: Modding.Generic<TParent, "id">,
    ptext?: Modding.Generic<TParent,"text">,
    // 子状态类型参数
    sid?: Modding.Generic<TSub, "id">,
    stext?: Modding.Generic<TSub,"text">,
): SubStatesPlugin<TParent, TSub> {
    // 1. 获取父状态 TypeDescriptor
    const parentType = getTypeDescriptor(pid, ptext);

    // 2. 为 State<TSub> 创建 TypeDescriptor（嵌套泛型）
    const stateType = getTypeDescriptor(
        sid ? `State_${sid}` : undefined,
        stext ? `State<${stext}>` : undefined
    );

    // 3. 为 NextState<TSub> 创建 TypeDescriptor（嵌套泛型）
    const nextStateType = getTypeDescriptor(
        sid ? `NextState_${sid}` : undefined,
        stext ? `NextState<${stext}>` : undefined
    );

    // 4. 验证所有 TypeDescriptor
    assert(parentType, "Failed to get TypeDescriptor for parent state");
    assert(stateType, "Failed to get TypeDescriptor for sub state");
    assert(nextStateType, "Failed to get TypeDescriptor for next sub state");

    // 5. 创建实例
    const result = new SubStatesPlugin(
        parentType,
        stateType,
        nextStateType,
        subStateClass
    );

    return result;
}
```

**关键点**：
1. **多个泛型参数**：每个泛型类型需要独立的 `id` 和 `text` 参数
2. **嵌套泛型类型**：为 `State<T>` 和 `NextState<T>` 生成独立的 TypeDescriptor
3. **命名约定**：使用前缀区分嵌套类型（`State_`, `NextState_`）
4. **完整验证**：每个 TypeDescriptor 都需要 assert 验证

#### 2. 嵌套泛型类型标识策略

```typescript
// 对于 TSub 类型，需要三个独立的 TypeDescriptor：

// 1. TSub 本身
const subType = getTypeDescriptor(sid, stext);

// 2. State<TSub>
const stateType = getTypeDescriptor(
    `State_${sid}`,        // ID 加前缀
    `State<${stext}>`      // Text 加泛型包装
);

// 3. NextState<TSub>
const nextStateType = getTypeDescriptor(
    `NextState_${sid}`,    // ID 加前缀
    `NextState<${stext}>`  // Text 加泛型包装
);
```

**为什么需要独立的 TypeDescriptor？**

运行时需要区分不同的泛型实例：
- `State<GameState>` 和 `State<MenuState>` 是不同的类型
- `NextState<GameState>` 和 `State<GameState>` 是不同的类型

### 使用示例

```typescript
// 定义父状态
enum GameState {
    Menu,
    Playing
}

// 定义子状态
class MenuSubState implements SubStates<GameState> {
    parentStates(): GameState[] {
        return [GameState.Menu];
    }
}

// ✅ 创建子状态插件
app.addPlugin(SubStatesPlugin.create(MenuSubState));
// 宏系统自动注入 GameState 和 MenuSubState 的类型信息
```

---

## 泛型处理规则总结

### 规则 1：宏方法标记

**必须**：所有使用 Modding.Generic 的方法必须标记 `@metadata macro`

```typescript
/**
 * @metadata macro
 */
public myMethod<T>(
    id?: Modding.Generic<T, "id">,
    text?: Modding.Generic<T, "text">
): void { }
```

**为什么**：编译器通过此标记识别需要处理的宏方法。

### 规则 2：双接口设计

**推荐**：为核心方法提供宏版本和显式版本

```typescript
// 宏版本 - 简洁易用
public getResource<T>(id?, text?): T | undefined { }

// 显式版本 - 灵活可控
public getResourceByTypeDescriptor<T>(descriptor: TypeDescriptor): T | undefined { }
```

**为什么**：宏方法覆盖常见场景，显式方法处理动态场景。

### 规则 3：参数验证

**必须**：验证宏参数不为 undefined

```typescript
public myMethod<T>(id?, text?) {
    if(id===undefined || text===undefined){
        error("Macro parameters are undefined. This is likely a macro issue.");
    }
    // ...
}
```

**为什么**：宏系统可能因配置问题导致参数注入失败。

### 规则 4：TypeDescriptor 存储

**插件类**：使用静态 create() 方法，存储 TypeDescriptor

```typescript
export class MyPlugin<T> {
    private typeDescriptor: TypeDescriptor;

    private constructor() { }

    public static create<T>(
        id?: Modding.Generic<T, "id">,
        text?: Modding.Generic<T, "text">
    ): MyPlugin<T> {
        const descriptor = getTypeDescriptor(id, text);
        assert(descriptor, "Failed to get TypeDescriptor");

        const plugin = new MyPlugin<T>();
        plugin.typeDescriptor = descriptor;
        return plugin;
    }
}
```

**为什么**：插件实例需要在整个生命周期中使用 TypeDescriptor。

### 规则 5：嵌套泛型处理

**多个泛型参数**：每个参数需要独立的 id/text 参数对

```typescript
public static create<T1, T2>(
    t1_id?: Modding.Generic<T1, "id">,
    t1_text?: Modding.Generic<T1, "text">,
    t2_id?: Modding.Generic<T2, "id">,
    t2_text?: Modding.Generic<T2, "text">
) { }
```

**嵌套类型**：使用前缀区分

```typescript
// 为 State<T> 创建 TypeDescriptor
const stateDescriptor = getTypeDescriptor(
    `State_${t_id}`,
    `State<${t_text}>`
);
```

### 规则 6：错误信息清晰化

**必须**：提供有用的错误信息

```typescript
assert(
    typeDescriptor,
    "Failed to get TypeDescriptor for MyPlugin: " +
    "type descriptor is required for plugin initialization. " +
    "Make sure you're calling create() method correctly."
);
```

**包含**：
- 失败的原因
- 需要的资源
- 修复建议

---

## 最佳实践

### 1. 优先使用宏方法

```typescript
// ✅ 推荐：简洁、类型安全
const config = app.getResource<GameConfig>();

// ❌ 避免：除非必要
const descriptor = getTypeDescriptor("id", "text");
const config = app.getResourceByTypeDescriptor<GameConfig>(descriptor);
```

### 2. 插件使用静态工厂

```typescript
// ✅ 推荐：类型信息自动注入
app.addPlugin(StatesPlugin.create({ defaultState: () => GameState.Menu }));

// ❌ 避免：构造函数无法获取类型信息
// new StatesPlugin({ ... })
```

### 3. 参数命名约定

多泛型参数使用清晰的前缀：

```typescript
public static create<TParent, TSub>(
    pid?: Modding.Generic<TParent, "id">,   // p = parent
    ptext?: Modding.Generic<TParent,"text">,
    sid?: Modding.Generic<TSub, "id">,      // s = sub
    stext?: Modding.Generic<TSub,"text">,
) { }
```

### 4. 文档注释规范

```typescript
/**
 * 获取资源
 *
 * **注意**: @claudecode , @cursor , 这是一个宏方法, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro
 *
 * @template T - 资源类型
 * @param id - 类型标识符（由宏自动提供）
 * @param text - 类型文本（由宏自动提供）
 * @returns 资源实例或 undefined
 */
```

**必须包含**：
- `@metadata macro` 标记
- AI 工具提示（@claudecode, @cursor）
- 参数说明（强调由宏提供）

### 5. TypeDescriptor 生命周期管理

**原则**：尽早获取，长期存储

```typescript
export class MyPlugin<T> {
    // ✅ 存储在实例属性
    private typeDescriptor: TypeDescriptor;

    public static create<T>(...): MyPlugin<T> {
        // ✅ 在 create 时获取
        const descriptor = getTypeDescriptor(id, text);
        const plugin = new MyPlugin<T>();
        plugin.typeDescriptor = descriptor;
        return plugin;
    }

    public build(app: App): void {
        // ✅ 直接使用存储的 descriptor
        app.insertResourceByTypeDescriptor(
            resource,
            this.typeDescriptor
        );
    }
}
```

---

## 常见陷阱

### 陷阱 1：忘记 @metadata macro 标记

```typescript
// ❌ 错误：宏系统无法识别
public getResource<T>(
    id?: Modding.Generic<T, "id">,
    text?: Modding.Generic<T, "text">
): T | undefined { }

// ✅ 正确
/**
 * @metadata macro
 */
public getResource<T>(
    id?: Modding.Generic<T, "id">,
    text?: Modding.Generic<T, "text">
): T | undefined { }
```

### 陷阱 2：直接使用泛型构造函数

```typescript
// ❌ 错误：无法获取类型信息
class MyPlugin<T> {
    constructor(config: Config<T>) { }
}
app.addPlugin(new MyPlugin({ ... }));

// ✅ 正确：使用静态工厂
class MyPlugin<T> {
    private constructor(config: Config<T>) { }

    public static create<T>(config: Config<T>, id?, text?): MyPlugin<T> {
        // 获取并存储 TypeDescriptor
    }
}
app.addPlugin(MyPlugin.create({ ... }));
```

### 陷阱 3：嵌套泛型使用相同 ID

```typescript
// ❌ 错误：State<T> 和 NextState<T> 使用相同 ID
const stateType = getTypeDescriptor(sid, `State<${stext}>`);
const nextStateType = getTypeDescriptor(sid, `NextState<${stext}>`);
// 导致类型冲突

// ✅ 正确：使用不同的 ID 前缀
const stateType = getTypeDescriptor(`State_${sid}`, `State<${stext}>`);
const nextStateType = getTypeDescriptor(`NextState_${sid}`, `NextState<${stext}>`);
```

### 陷阱 4：忽略参数验证

```typescript
// ❌ 错误：宏失败时静默失败
public myMethod<T>(id?, text?) {
    const descriptor = getTypeDescriptor(id, text);
    // descriptor 可能是 undefined
    return this.resources.get(descriptor);  // 运行时错误
}

// ✅ 正确：验证并提供清晰错误
public myMethod<T>(id?, text?) {
    if(id===undefined || text===undefined){
        error("Macro parameters missing. Check your Flamework configuration.");
    }
    const descriptor = getTypeDescriptor(id, text);
    assert(descriptor, "Failed to get TypeDescriptor");
    return this.resources.get(descriptor);
}
```

### 陷阱 5：混淆宏方法和普通方法

```typescript
// ❌ 错误：尝试手动传递宏参数
const config = app.getResource<GameConfig>("some_id", "some_text");

// ✅ 正确：宏方法不需要传参
const config = app.getResource<GameConfig>();

// ✅ 或使用显式方法
const descriptor = getTypeDescriptor("some_id", "some_text");
const config = app.getResourceByTypeDescriptor<GameConfig>(descriptor);
```

---

## 调试技巧

### 1. 检查 TypeDescriptor 生成

```typescript
const descriptor = getTypeDescriptor(id, text);
print(`TypeDescriptor: id=${descriptor?.id}, text=${descriptor?.text}`);
```

### 2. 验证宏系统配置

确保 `tsconfig.json` 正确配置 Flamework transformer：

```json
{
  "compilerOptions": {
    "plugins": [
      { "transform": "rbxts-transformer-flamework" }
    ]
  }
}
```

### 3. 使用显式方法测试

如果宏方法失败，尝试显式方法验证逻辑：

```typescript
// 宏方法失败
const config = app.getResource<GameConfig>();  // undefined

// 使用显式方法测试
const descriptor = getTypeDescriptor("GameConfig_id", "GameConfig");
const config2 = app.getResourceByTypeDescriptor<GameConfig>(descriptor);
// 如果成功，说明是宏系统问题；如果失败，说明是资源管理问题
```

---

## 总结

White Dragon Bevy 的泛型处理策略：

1. **Flamework 宏系统**：编译时注入类型信息
2. **TypeDescriptor**：运行时类型标识
3. **双接口设计**：宏方法 + 显式方法
4. **静态工厂模式**：插件类使用 create() 而非构造函数
5. **完整验证**：assert 确保类型信息获取成功

**核心原则**：
- 尽早获取 TypeDescriptor
- 长期存储避免重复获取
- 提供清晰的错误信息
- 为动态场景保留显式接口

通过遵循这些规则和最佳实践，可以在 TypeScript 中实现类型安全的运行时泛型处理，同时保持代码的简洁性和可维护性。