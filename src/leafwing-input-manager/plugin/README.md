# InputManagerPlugin 扩展系统

## 概述

`InputManagerPlugin` 是一个**泛型插件**,支持通过扩展系统提供类型安全的上下文访问。

## 两种插件模式

### 1. 普通插件(如 bevy_log)

**特点**:
- 单例或全局功能
- 不需要多个实例
- 直接通过 World 资源访问

**示例**: `LogPlugin`, `TimePlugin`, `DiagnosticsPlugin`

### 2. 泛型插件(如 InputManagerPlugin)

**特点**:
- 需要多个实例(不同的 Action 类型)
- 使用泛型参数 `<A, TNamespace>`
- 通过扩展系统提供类型安全访问

## 使用方式

### 方式1: 使用辅助函数(推荐)

#### 步骤1: 定义 Action 类型

```typescript
export class PlayerAction implements Actionlike {
    static readonly Jump = new PlayerAction("Jump");
    static readonly Attack = new PlayerAction("Attack");

    private constructor(private readonly value: string) {}

    hash(): string {
        return `PlayerAction:${this.value}`;
    }

    equals(other: Actionlike): boolean {
        return this.hash() === other.hash();
    }

    toString(): string {
        return this.value;
    }
}
```

#### 步骤2: 定义辅助函数

```typescript
/**
 * 获取输入管理器扩展 - 提供完整的类型提示
 */
export function getInputExtension<A extends Actionlike>(
    context: Context,
    namespace: string,
): InputManagerExtension<A> {
    return (context as unknown as Record<string, unknown>)[namespace] as InputManagerExtension<A>;
}

// 定义命名空间常量
const PLAYER_INPUT_NS = "playerInput";
```

#### 步骤3: 注册插件

```typescript
const app = new App();

app.addPlugin(
    new InputManagerPlugin<PlayerAction, typeof PLAYER_INPUT_NS>(
        { actionTypeName: "PlayerAction" },
        PLAYER_INPUT_NS
    )
);
```

#### 步骤4: 在系统中使用

```typescript
function gameSystem(world: BevyWorld, context: Context): void {
    // ✅ 使用辅助函数,获得完整的类型提示!
    const playerInput = getInputExtension<PlayerAction>(context, PLAYER_INPUT_NS);
    //    ^^^^^^^^^^^ 完整的 IDE 智能提示

    // 查询实体
    for (const [entityId, data] of playerInput.queryInputEntities(world)) {
        //                          ^^^^^^^^^^^^^^^^^^^ 完整的类型提示
        if (data.actionState?.pressed(PlayerAction.Jump)) {
            print("Jumping!");
        }
    }

    // 其他方法也都有完整的类型提示
    const inputMap = new InputMap<PlayerAction>()
        .insert(PlayerAction.Jump, new KeyCode(Enum.KeyCode.Space));
    playerInput.spawnWithInput(world, inputMap);
}
```

### 方式2: 使用自定义上下文类型

#### 步骤1: 定义 Action 类型(同上)

#### 步骤2: 定义上下文类型

```typescript
interface GameAppContext extends Context {
    playerInput: InputManagerExtension<PlayerAction>;
    enemyInput: InputManagerExtension<EnemyAction>;
}
```

### 步骤3: 注册插件

```typescript
const app = new App();

// 注册玩家输入插件
app.addPlugin(
    new InputManagerPlugin<PlayerAction, "playerInput">(
        { actionTypeName: "PlayerAction" },
        "playerInput"  // ← 命名空间
    )
);

// 注册敌人输入插件
app.addPlugin(
    new InputManagerPlugin<EnemyAction, "enemyInput">(
        { actionTypeName: "EnemyAction" },
        "enemyInput"  // ← 命名空间
    )
);
```

### 步骤4: 在系统中使用

```typescript
function gameSystem(world: BevyWorld, context: GameAppContext): void {
    // ✅ 完整的类型提示和智能补全
    const playerInput = context.playerInput;

    // 查询实体
    for (const [entityId, data] of playerInput.queryInputEntities(world)) {
        if (data.actionState?.pressed(PlayerAction.Jump)) {
            print("Jumping!");
        }
    }

    // 创建实体
    const inputMap = new InputMap<PlayerAction>()
        .insert(PlayerAction.Jump, Enum.KeyCode.Space);
    const playerId = playerInput.spawnWithInput(world, inputMap);

    // 操作实体
    const inputData = playerInput.getEntityInputData(world, playerId);
    playerInput.addInputToEntity(world, entityId, inputMap);
    playerInput.removeInputFromEntity(world, entityId);
}
```

## 扩展接口

### InputManagerExtension\<A\>

```typescript
interface InputManagerExtension<A extends Actionlike> {
    /**
     * 获取组件定义
     */
    getComponents(): ComponentDefinition<A>;

    /**
     * 创建带有输入组件的实体
     */
    spawnWithInput(
        world: BevyWorld,
        inputMap: InputMap<A>,
        actionState?: ActionState<A>
    ): number;

    /**
     * 获取实体的输入数据
     */
    getEntityInputData(
        world: BevyWorld,
        entityId: number
    ): InputSystemData<A> | undefined;

    /**
     * 为现有实体添加输入组件
     */
    addInputToEntity(
        world: BevyWorld,
        entityId: number,
        inputMap: InputMap<A>,
        actionState?: ActionState<A>
    ): void;

    /**
     * 从实体移除输入组件
     */
    removeInputFromEntity(
        world: BevyWorld,
        entityId: number
    ): void;

    /**
     * 查询所有具有特定动作类型组件的实体
     */
    queryInputEntities(
        world: BevyWorld
    ): IterableFunction<LuaTuple<[number, InputSystemData<A>]>>;
}
```

## 优势

### ✅ 完全类型安全
- 编译时检查命名空间和类型
- 自动推断返回类型

### ✅ IDE 智能提示
- `context.playerInput.` 显示所有可用方法
- 参数类型自动补全

### ✅ 避免命名冲突
- 使用命名空间隔离不同的插件实例
- 支持多个相同类型的插件

### ✅ 无需保存插件实例
- 直接通过 context 访问
- 简化系统函数参数

## 对比:旧方式 vs 新方式

### ❌ 旧方式(已弃用)

```typescript
// 需要保存插件实例
const plugin = new InputManagerPlugin<PlayerAction>(...);
app.addPlugin(plugin);

// 在系统中使用
function system(world: BevyWorld, context: Context): void {
    // ❌ 需要从外部传入插件实例
    const data = getEntityInputData(context, plugin, entityId);

    // ❌ 没有类型提示
    // ❌ 需要导入辅助函数
}
```

### ✅ 新方式(推荐)

```typescript
// 注册插件时指定命名空间
app.addPlugin(
    new InputManagerPlugin<PlayerAction, "playerInput">(
        { actionTypeName: "PlayerAction" },
        "playerInput"
    )
);

// 在系统中使用
function system(world: BevyWorld, context: GameAppContext): void {
    // ✅ 直接通过 context 访问
    const data = context.playerInput.getEntityInputData(world, entityId);

    // ✅ 完整的 IDE 智能提示
    // ✅ 类型安全
    // ✅ 语法简洁
}
```

## 完整示例

查看 `__examples__/extension-usage-example.ts` 获取完整的使用示例。

## 技术细节

### 扩展工厂模式

插件使用扩展工厂模式:

```typescript
this.extension = {
    [namespace]: (world, context, plugin) => ({
        getComponents: () => plugin.components,
        spawnWithInput: (world, inputMap, actionState) => { ... },
        // ... 其他方法
    })
};
```

当 `App.addPlugin()` 被调用时:
1. App 检测到 `plugin.extension` 存在
2. 调用工厂函数,传入 `world`, `context`, `plugin` 实例
3. 将返回的扩展对象注册到 `context[namespace]`
4. 系统可以通过 `context[namespace]` 访问扩展

### 类型推断

通过 TypeScript 的字符串字面量类型和泛型约束:

```typescript
class InputManagerPlugin<A extends Actionlike, TNamespace extends string>
```

确保:
- `TNamespace` 必须是字符串字面量类型
- 扩展注册到 `context[TNamespace]`
- 类型安全地访问扩展方法