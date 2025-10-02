# Leafwing Abilities

一个强大的游戏技能系统，为 White Dragon Bevy 框架提供完整的技能、冷却、充能和资源管理功能。

## 概述

Leafwing Abilities 是从 Rust Bevy 引擎的 [leafwing-abilities](https://github.com/Leafwing-Studios/leafwing-abilities) 插件移植而来的技能系统，提供了：

- ✨ **冷却系统**: 限制技能使用频率，支持全局冷却
- ⚡ **充能系统**: 多次使用技能，灵活的充能策略
- 💧 **资源池**: 抽象的资源管理（生命值、法力值等）
- 🎯 **技能状态**: 便捷的技能就绪检查和触发
- 📦 **预制资源池**: 开箱即用的生命值和法力值实现

## 架构差异与限制

### 与 Rust Bevy 原版的主要差异

本 TypeScript 移植版本在架构上有以下关键差异：

| 特性 | Rust Bevy 原版 | TypeScript 移植版 | 影响 |
|------|---------------|------------------|------|
| **ECS 框架** | Bevy ECS | Matter ECS | 查询语法和组件系统不同 |
| **类型系统** | Rust trait | TypeScript interface | 使用接口代替 trait |
| **宏系统** | Rust 派生宏 | Flamework transformer | 需要 Modding.* 参数注入 |
| **错误处理** | Result<T, E> | 枚举返回值 | 使用 CannotUseAbility 枚举 |
| **存储方式** | 资源和组件均支持 | 仅资源形式完整支持 | 组件形式需要手动处理 |

### Resource vs Component 使用差异

#### 资源形式（完整支持）✅

当前版本**完整支持资源形式**的能力系统：

```typescript
// ✅ 推荐：使用资源形式
app.insertResource(new CooldownState<PlayerAbility>());
app.insertResource(new ChargeState<PlayerAbility>());
app.insertResource(new ManaPool());

// 插件会自动处理资源的更新
app.addPlugins(AbilityPlugin.create<PlayerAbility>());
```

**优势**：
- 自动 tick 更新
- 全局访问
- 简单易用
- 适合单人游戏或玩家共享的能力系统

#### 组件形式（有限支持）⚠️

组件形式当前需要**手动实现更新逻辑**：

```typescript
// ⚠️ 注意：组件形式需要手动更新
// 目前 AbilityPlugin 不会自动查询和更新组件

// 需要手动创建更新系统
function manualTickCooldownsSystem(world: BevyWorld, context: Context) {
    const timeResource = world.resources.getResource<VirtualTimeResource>();
    if (!timeResource) return;

    const deltaTime = timeResource.value.getDelta();

    // 手动查询每个实体的冷却组件
    for (const [entityId, cooldowns, charges] of world.query(
        CooldownStateComponent,  // 需要自定义组件包装器
        ChargeStateComponent     // 需要自定义组件包装器
    )) {
        cooldowns.tick(deltaTime, charges);
    }
}

// 手动注册系统
app.addSystems(BuiltinSchedules.PRE_UPDATE, manualTickCooldownsSystem);
```

**限制原因**：
- Matter ECS 的泛型组件查询支持有限
- TypeDescriptor 系统主要针对资源设计
- 需要额外的组件包装器实现

### 选择建议

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 单人游戏 | 资源 | 简单直接，自动更新 |
| 玩家共享能力 | 资源 | 全局访问，统一管理 |
| 多个独立单位 | 组件（手动） | 每个实体独立状态 |
| MMO/大量实体 | 组件（手动） | 更好的内存局部性 |

### 迁移注意事项

从 Rust Bevy 迁移时需要注意：

1. **类型系统差异**：
   ```typescript
   // Rust: impl Abilitylike for MyAbility
   // TypeScript: class MyAbility implements Abilitylike
   ```

2. **查询语法差异**：
   ```typescript
   // Rust: Query<&mut CooldownState<A>>
   // TypeScript: world.query(CooldownStateComponent)
   ```

3. **插件注册差异**：
   ```typescript
   // Rust: app.add_plugin(AbilityPlugin::<MyAbility>::default())
   // TypeScript: app.addPlugins(AbilityPlugin.create<MyAbility>())
   ```

4. **错误处理差异**：
   ```typescript
   // Rust: ability.ready().is_ok()
   // TypeScript: ability.ready() === undefined
   ```

## 快速开始

### 1. 安装和导入

```typescript
import {
    AbilityPlugin,
    Abilitylike,
    CooldownState,
    ChargeState,
    Cooldown,
    Charges,
    ManaPool,
    LifePool,
    AbilityCosts,
    abilityReady,
    triggerAbility,
    CannotUseAbility
} from "./leafwing_abilities";
```

### 2. 定义你的技能

```typescript
// 定义技能枚举
enum MyAbility {
    Fireball = "Fireball",
    Heal = "Heal",
    Dash = "Dash",
}

// 实现 Abilitylike 接口
class PlayerAbility implements Abilitylike {
    constructor(private ability: MyAbility) {}

    hash(): string { return this.ability; }
    equals(other: PlayerAbility): boolean {
        return this.ability === other.ability;
    }
    toString(): string { return this.ability; }

    ready<P extends Pool>(
        charges: ChargeState<this>,
        cooldowns: CooldownState<this>,
        pool?: P,
        costs?: AbilityCosts<this, P>
    ): CannotUseAbility | undefined {
        return abilityReady(this, charges, cooldowns, pool, costs);
    }

    trigger<P extends Pool>(
        charges: ChargeState<this>,
        cooldowns: CooldownState<this>,
        pool?: P,
        costs?: AbilityCosts<this, P>
    ): CannotUseAbility | undefined {
        return triggerAbility(this, charges, cooldowns, pool, costs);
    }
}
```

### 3. 初始化技能系统（资源形式）

```typescript
function setupAbilitySystem(app: App) {
    // 创建技能实例
    const fireball = new PlayerAbility(MyAbility.Fireball);
    const heal = new PlayerAbility(MyAbility.Heal);
    const dash = new PlayerAbility(MyAbility.Dash);

    // 初始化冷却状态
    const cooldowns = new CooldownState<PlayerAbility>();
    cooldowns.set(fireball, Cooldown.fromSecs(3));  // 3秒冷却
    cooldowns.set(heal, Cooldown.fromSecs(10));     // 10秒冷却
    cooldowns.set(dash, Cooldown.fromSecs(5));      // 5秒冷却

    // 初始化充能状态
    const charges = new ChargeState<PlayerAbility>();
    charges.set(dash, Charges.simple(2));  // Dash有2个充能

    // 初始化资源池
    const manaPool = ManaPool.simple(100, 100, 10);  // 当前100，最大100，每秒恢复10

    // 设置技能消耗
    const costs = new AbilityCosts<PlayerAbility, ManaPool>();
    costs.set(fireball, new Mana(30));  // 火球消耗30法力
    costs.set(heal, new Mana(50));      // 治疗消耗50法力

    // 将状态作为资源插入
    app.insertResource(cooldowns);
    app.insertResource(charges);
    app.insertResource(manaPool);
    app.insertResource(costs);

    // 添加技能插件（自动处理冷却和充能更新）
    app.addPlugins(AbilityPlugin.create<PlayerAbility>());
}
```

### 4. 使用技能系统

```typescript
function playerAbilitySystem(world: BevyWorld, context: Context) {
    // 从资源中获取技能状态
    const cooldowns = world.resources.getResource<CooldownState<PlayerAbility>>();
    const charges = world.resources.getResource<ChargeState<PlayerAbility>>();
    const manaPool = world.resources.getResource<ManaPool>();
    const costs = world.resources.getResource<AbilityCosts<PlayerAbility, ManaPool>>();

    if (!cooldowns || !charges || !manaPool || !costs) return;

    const fireball = new PlayerAbility(MyAbility.Fireball);

    // 检查技能是否就绪
    const readyStatus = fireball.ready(charges, cooldowns, manaPool, costs);

    if (readyStatus === undefined) {
        // 技能就绪，检查输入
        if (playerPressedFireballKey()) {
            // 触发技能
            const result = fireball.trigger(charges, cooldowns, manaPool, costs);

            if (result === undefined) {
                // 成功触发
                print("火球术释放成功！");
                // 执行火球逻辑...
            }
        }
    } else {
        // 技能不可用，显示原因
        if (playerPressedFireballKey()) {
            switch (readyStatus) {
                case CannotUseAbility.OnCooldown:
                    print("技能冷却中...");
                    break;
                case CannotUseAbility.NoCharges:
                    print("没有可用充能");
                    break;
                case CannotUseAbility.PoolInsufficient:
                    print("法力值不足");
                    break;
            }
        }
    }
}

// 注册系统
app.addSystems(BuiltinSchedules.UPDATE, playerAbilitySystem);
```

## 核心概念

### Abilitylike

`Abilitylike` 接口扩展自 `leafwing-input-manager` 的 `Actionlike`，添加了技能特定的方法：

```typescript
interface Abilitylike extends Actionlike {
    ready<P extends Pool>(
        charges: ChargeState<this>,
        cooldowns: CooldownState<this>,
        pool?: P,
        costs?: AbilityCosts<this, P>
    ): CannotUseAbility | undefined;

    trigger<P extends Pool>(
        charges: ChargeState<this>,
        cooldowns: CooldownState<this>,
        pool?: P,
        costs?: AbilityCosts<this, P>
    ): CannotUseAbility | undefined;
}
```

### 冷却系统 (Cooldown)

冷却系统用于限制技能使用频率：

```typescript
// 创建一个5秒冷却
const cooldown = Cooldown.fromSecs(5);

// 触发冷却
cooldown.trigger();

// 在系统中更新
cooldown.tick(deltaTime);

// 检查是否就绪
if (cooldown.ready() === undefined) {
    // 技能已就绪
}
```

### 充能系统 (Charges)

允许技能在冷却前使用多次：

```typescript
// 创建3个独立充能的技能
const charges = Charges.simple(3);

// 使用一次充能
charges.expend();

// 恢复一个充能
charges.replenish();

// 检查是否有充能可用
if (charges.available()) {
    // 可以使用技能
}
```

**充能策略**:
- `OneAtATime`: 一次恢复一个充能
- `AllAtOnce`: 一次恢复所有充能

### 资源池 (Pool)

抽象的资源管理接口，用于处理各种游戏资源：

```typescript
interface Pool {
    current(): number;
    max(): number;
    available(amount: number): CannotUseAbility | undefined;
    expend(amount: number): CannotUseAbility | undefined;
    replenish(amount: number): void;
    isFull(): boolean;
    isEmpty(): boolean;
}
```

### 预制资源池

#### 生命值池 (LifePool)

```typescript
// 创建一个生命值池: 当前100, 最大150, 每秒恢复5
const lifePool = LifePool.simple(100, 150, 5);

// 受到伤害
lifePool.takeDamage(new Life(30));

// 治疗
lifePool.heal(new Life(20));

// 随时间恢复
lifePool.regenerate(deltaTime);

// 获取百分比
const percentage = lifePool.getPercentage(); // 0.0 - 1.0
```

#### 法力值池 (ManaPool)

```typescript
// 创建一个法力值池: 当前50, 最大100, 每秒恢复5
const manaPool = ManaPool.simple(50, 100, 5);

// 施法
const success = manaPool.cast(new Mana(30));
if (success) {
    // 施法成功
}

// 恢复法力
manaPool.restore(new Mana(20));

// 随时间恢复
manaPool.regenerate(deltaTime);
```

## 使用示例

### 完整示例：构建一个技能系统

这个例子展示如何构建一个完整的技能系统，使用资源形式存储技能状态：

```typescript
import { App, BuiltinSchedules } from "../bevy_app";
import { BevyWorld, Context } from "../bevy_ecs";
import { VirtualTimeResource } from "../bevy_time";
import {
    AbilityPlugin,
    Abilitylike,
    CooldownState,
    ChargeState,
    Cooldown,
    Charges,
    ManaPool,
    LifePool,
    AbilityCosts,
    abilityReady,
    triggerAbility,
    CannotUseAbility,
    Mana,
    Life
} from "./leafwing_abilities";

// 步骤 1: 定义技能枚举
enum PlayerAbility {
    Fireball = "Fireball",
    Heal = "Heal",
    Dash = "Dash",
    UltimateStrike = "UltimateStrike"
}

// 步骤 2: 实现 Abilitylike 接口
class Ability implements Abilitylike {
    constructor(private ability: PlayerAbility) {}

    hash(): string { return this.ability; }
    equals(other: Ability): boolean { return this.ability === other.ability; }
    toString(): string { return this.ability; }

    ready<P extends Pool>(
        charges: ChargeState<this>,
        cooldowns: CooldownState<this>,
        pool?: P,
        costs?: AbilityCosts<this, P>
    ): CannotUseAbility | undefined {
        return abilityReady(this, charges, cooldowns, pool, costs);
    }

    trigger<P extends Pool>(
        charges: ChargeState<this>,
        cooldowns: CooldownState<this>,
        pool?: P,
        costs?: AbilityCosts<this, P>
    ): CannotUseAbility | undefined {
        return triggerAbility(this, charges, cooldowns, pool, costs);
    }
}

// 步骤 3: 初始化技能系统
function initializeAbilitySystem(app: App): void {
    // 创建技能实例
    const fireball = new Ability(PlayerAbility.Fireball);
    const heal = new Ability(PlayerAbility.Heal);
    const dash = new Ability(PlayerAbility.Dash);
    const ultimate = new Ability(PlayerAbility.UltimateStrike);

    // 配置冷却时间
    const cooldowns = new CooldownState<Ability>();
    cooldowns.set(fireball, Cooldown.fromSecs(2));      // 2秒冷却
    cooldowns.set(heal, Cooldown.fromSecs(8));          // 8秒冷却
    cooldowns.set(dash, Cooldown.fromSecs(4));          // 4秒冷却
    cooldowns.set(ultimate, Cooldown.fromSecs(60));     // 60秒冷却
    cooldowns.globalCooldown = Cooldown.fromSecs(1);    // 1秒全局冷却

    // 配置充能（某些技能可以连续使用）
    const charges = new ChargeState<Ability>();
    charges.set(dash, Charges.simple(3));               // Dash 有3个充能
    charges.set(fireball, Charges.replenishOne(2));     // 火球有2个充能，逐个恢复

    // 配置资源池
    const manaPool = ManaPool.simple(100, 150, 5);      // 当前100，最大150，每秒恢复5
    const lifePool = LifePool.simple(100, 100, 2);      // 当前100，最大100，每秒恢复2

    // 配置技能消耗
    const manaCosts = new AbilityCosts<Ability, ManaPool>();
    manaCosts.set(fireball, new Mana(20));              // 火球消耗20法力
    manaCosts.set(heal, new Mana(40));                  // 治疗消耗40法力
    manaCosts.set(dash, new Mana(10));                  // 冲刺消耗10法力
    manaCosts.set(ultimate, new Mana(80));              // 大招消耗80法力

    // 插入资源
    app.insertResource(cooldowns);
    app.insertResource(charges);
    app.insertResource(manaPool);
    app.insertResource(lifePool);
    app.insertResource(manaCosts);

    // 添加技能插件（自动处理冷却和充能更新）
    app.addPlugins(AbilityPlugin.create<Ability>());

    // 添加资源池恢复系统
    app.addSystems(BuiltinSchedules.UPDATE, regeneratePoolsSystem);
    app.addSystems(BuiltinSchedules.UPDATE, handlePlayerInputSystem);
}

// 步骤 4: 资源池恢复系统
function regeneratePoolsSystem(world: BevyWorld, context: Context): void {
    const timeResource = world.resources.getResource<VirtualTimeResource>();
    if (!timeResource) return;

    const deltaTime = timeResource.value.getDelta();

    // 恢复法力值
    const manaPool = world.resources.getResource<ManaPool>();
    if (manaPool) {
        manaPool.regenerate(deltaTime);
    }

    // 恢复生命值
    const lifePool = world.resources.getResource<LifePool>();
    if (lifePool) {
        lifePool.regenerate(deltaTime);
    }
}

// 步骤 5: 处理玩家输入和技能释放
function handlePlayerInputSystem(world: BevyWorld, context: Context): void {
    // 获取所有必要的资源
    const cooldowns = world.resources.getResource<CooldownState<Ability>>();
    const charges = world.resources.getResource<ChargeState<Ability>>();
    const manaPool = world.resources.getResource<ManaPool>();
    const manaCosts = world.resources.getResource<AbilityCosts<Ability, ManaPool>>();

    if (!cooldowns || !charges || !manaPool || !manaCosts) return;

    // 处理火球术
    const fireball = new Ability(PlayerAbility.Fireball);
    handleAbilityInput(
        fireball,
        "Q",  // 按键
        charges,
        cooldowns,
        manaPool,
        manaCosts,
        () => {
            print("🔥 释放火球术！");
            // 在这里添加火球的实际效果
        }
    );

    // 处理治疗
    const heal = new Ability(PlayerAbility.Heal);
    const lifePool = world.resources.getResource<LifePool>();
    if (lifePool) {
        handleAbilityInput(
            heal,
            "E",  // 按键
            charges,
            cooldowns,
            manaPool,
            manaCosts,
            () => {
                print("💚 使用治疗术！");
                lifePool.heal(new Life(30));  // 恢复30点生命
            }
        );
    }

    // 处理冲刺（有充能）
    const dash = new Ability(PlayerAbility.Dash);
    handleAbilityInput(
        dash,
        "Shift",  // 按键
        charges,
        cooldowns,
        manaPool,
        manaCosts,
        () => {
            print("💨 使用冲刺！");
            // 在这里添加冲刺效果
        }
    );
}

// 辅助函数：处理技能输入
function handleAbilityInput<A extends Abilitylike, P extends Pool>(
    ability: A,
    key: string,
    charges: ChargeState<A>,
    cooldowns: CooldownState<A>,
    pool: P,
    costs: AbilityCosts<A, P>,
    onSuccess: () => void
): void {
    if (isKeyPressed(key)) {
        const readyStatus = ability.ready(charges, cooldowns, pool, costs);

        if (readyStatus === undefined) {
            // 技能可用，尝试触发
            const triggerResult = ability.trigger(charges, cooldowns, pool, costs);

            if (triggerResult === undefined) {
                onSuccess();
            }
        } else {
            // 显示为什么技能不可用
            displayAbilityError(ability.toString(), readyStatus);
        }
    }
}

// 显示技能错误信息
function displayAbilityError(abilityName: string, error: CannotUseAbility): void {
    switch (error) {
        case CannotUseAbility.OnCooldown:
            print(`${abilityName} 冷却中...`);
            break;
        case CannotUseAbility.OnGlobalCooldown:
            print(`全局冷却中...`);
            break;
        case CannotUseAbility.NoCharges:
            print(`${abilityName} 没有可用充能`);
            break;
        case CannotUseAbility.PoolInsufficient:
            print(`法力值不足`);
            break;
    }
}
```

## 插件配置

使用 `AbilityPlugin` 自动注册类型特定的系统：

```typescript
import { AbilityPlugin } from "./leafwing_abilities";

// 在应用初始化时
// 重要：泛型参数 <Ability> 会被用于创建该类型专用的 tick cooldowns 系统
app.addPlugins(AbilityPlugin.create<Ability>());
```

### 插件的作用

`AbilityPlugin<A>` 会：
1. 使用 `A` 的 TypeDescriptor 创建类型特定的 `tickCooldowns` 系统
2. 该系统只会查询和更新 `CooldownState<A>` 和 `ChargeState<A>` 资源
3. 自动注册到 `PreUpdate` 调度，确保在技能系统运行前更新

### 多种技能类型

如果你有多种技能类型（例如：玩家技能、怪物技能、NPC技能），可以为每种类型注册独立的插件：

```typescript
enum PlayerAbility { ... }
enum MonsterAbility { ... }
enum NPCAbility { ... }

// 每个插件会创建独立的系统，互不干扰
app.addPlugins(AbilityPlugin.create<PlayerAbility>());
app.addPlugins(AbilityPlugin.create<MonsterAbility>());
app.addPlugins(AbilityPlugin.create<NPCAbility>());
```

### 手动创建类型特定系统

如果你需要更细粒度的控制，可以手动使用工厂函数：

```typescript
import { createTickCooldownsSystem } from "./leafwing_abilities";
import { getTypeDescriptor } from "../bevy_core";

// 获取类型描述符
const abilityTypeDescriptor = getTypeDescriptor(/* Ability type info */);

// 创建类型特定的系统
const tickPlayerAbilityCooldowns = createTickCooldownsSystem<PlayerAbility>(
    abilityTypeDescriptor
);

// 手动注册
app.addSystems(BuiltinSchedules.PRE_UPDATE, tickPlayerAbilityCooldowns);
```

## 错误处理

`CannotUseAbility` 枚举定义了所有可能的技能使用失败原因：

```typescript
enum CannotUseAbility {
    NotPressed = "NotPressed",           // 按键未按下
    NoCharges = "NoCharges",             // 没有充能
    OnCooldown = "OnCooldown",           // 技能冷却中
    OnGlobalCooldown = "OnGlobalCooldown", // 全局冷却中
    PoolInsufficient = "PoolInsufficient"  // 资源不足
}
```

## 高级特性

### 全局冷却 (GCD)

```typescript
const cooldowns = new CooldownState<Ability>();

// 设置1.5秒的全局冷却
cooldowns.globalCooldown = Cooldown.fromSecs(1.5);

// 触发任何技能都会启动全局冷却
fireball.trigger(charges, cooldowns);
```

### 自定义资源池

实现 `Pool` 或 `RegeneratingPool` 接口：

```typescript
class StaminaPool implements RegeneratingPool {
    private currentStamina: number;
    private maxStamina: number;
    private regenRate: number;

    current(): number {
        return this.currentStamina;
    }

    max(): number {
        return this.maxStamina;
    }

    regenerate(deltaTime: Duration): void {
        const regenAmount = this.regenRate * deltaTime.asSecsF32();
        this.replenish(regenAmount);
    }

    // 实现其他必需方法...
}
```

### 工厂函数创建系统

为特定资源池创建专用的恢复系统：

```typescript
const regenerateManaSystem = createRegeneratePoolSystem<ManaPool>(
    (world) => world.resources.getResource<ManaPool>()
);

app.addSystems(BuiltinSchedules.UPDATE, regenerateManaSystem);
```

## API 文档

### 核心类

- **Cooldown**: 单个冷却计时器
  - `fromSecs(seconds)`: 创建冷却
  - `tick(deltaTime, charges?)`: 更新计时器
  - `trigger()`: 触发冷却
  - `ready()`: 检查是否就绪
  - `refresh()`: 重置冷却

- **CooldownState**: 管理多个技能的冷却
  - `set(ability, cooldown)`: 设置技能冷却
  - `get(ability)`: 获取技能冷却
  - `trigger(ability)`: 触发技能冷却
  - `ready(ability)`: 检查技能冷却
  - `tick(deltaTime, charges?)`: 更新所有冷却

- **Charges**: 充能管理
  - `simple(max)`: 独立充能
  - `replenishOne(max)`: 逐个恢复
  - `replenishAll(max)`: 全部恢复
  - `expend()`: 使用充能
  - `replenish()`: 恢复充能
  - `available()`: 检查可用性

- **ChargeState**: 管理多个技能的充能
  - `set(ability, charges)`: 设置技能充能
  - `get(ability)`: 获取技能充能
  - `expend(ability)`: 使用充能
  - `replenish(ability)`: 恢复充能
  - `available(ability)`: 检查可用性

### 预制资源池

- **LifePool**: 生命值管理
  - `simple(current, max, regenPerSecond)`: 创建生命值池
  - `takeDamage(damage)`: 受到伤害
  - `heal(healing)`: 恢复生命
  - `regenerate(deltaTime)`: 自动恢复
  - `getPercentage()`: 获取百分比

- **ManaPool**: 法力值管理
  - `simple(current, max, regenPerSecond)`: 创建法力值池
  - `cast(cost)`: 施法消耗
  - `restore(restoration)`: 恢复法力
  - `regenerate(deltaTime)`: 自动恢复
  - `getPercentage()`: 获取百分比

## 架构说明

### 设计原则

本模块采用与原 Rust 版本相同的设计模式，但适配了 TypeScript 和 Matter ECS 的特性：

- **泛型约束**: 使用 `Abilitylike` 约束确保类型安全
- **状态分离**: 冷却、充能、资源池独立管理，便于组合和重用
- **资源优先**: 优先支持资源形式存储，简化状态管理
- **类型安全**: 使用 TypeScript 接口和泛型保证编译时类型检查
- **Flamework 宏**: 使用 TypeDescriptor 系统实现运行时类型信息

### 系统架构

```
┌─────────────────────────────────────────────────┐
│                   Application                    │
├─────────────────────────────────────────────────┤
│                 AbilityPlugin<A>                 │
│  - 创建类型特定的 tickCooldowns 系统              │
│  - 自动注册到 PreUpdate 调度                     │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│                World Resources                   │
├─────────────────────────────────────────────────┤
│  CooldownState<A>  │  ChargeState<A>            │
│  ManaPool          │  LifePool                  │
│  AbilityCosts<A,P> │  其他资源池...              │
└─────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│                  Game Systems                    │
├─────────────────────────────────────────────────┤
│  tickCooldownsSystem  - 更新冷却和充能           │
│  regeneratePoolSystem - 恢复资源池               │
│  playerInputSystem    - 处理玩家输入             │
│  abilityEffectSystem  - 执行技能效果             │
└─────────────────────────────────────────────────┘
```

### 数据流

1. **初始化阶段**：创建状态对象 → 插入资源 → 注册插件
2. **更新循环**：
   - PreUpdate: 更新冷却和充能（自动）
   - Update: 检查输入 → 验证技能可用性 → 触发技能
   - PostUpdate: 应用技能效果 → 更新UI

### TypeDescriptor 系统

TypeDescriptor 是实现泛型系统的关键：

```typescript
// AbilityPlugin 使用 TypeDescriptor 创建类型特定的系统
const plugin = AbilityPlugin.create<PlayerAbility>();

// 内部实现：
// 1. Flamework transformer 注入 Modding.Generic 参数
// 2. getTypeDescriptor() 创建类型描述符
// 3. createTickCooldownsSystem() 使用描述符查询特定类型的资源
```

## 性能考虑

- 冷却和充能状态使用 Map 存储，查询效率为 O(1)
- 避免在每帧创建新对象，重用现有实例
- 资源池操作经过优化，避免不必要的计算
- 建议将频繁访问的数据缓存到组件中

## 已知限制

### 当前限制

1. **组件形式支持不完整**
   - 问题：AbilityPlugin 只自动更新资源形式的状态
   - 影响：使用组件形式需要手动实现更新逻辑
   - 状态：待修复（需要验证 Matter ECS 泛型组件查询能力）

2. **系统调度顺序**
   - 问题：缺少 Rust 版本的 `AbilitySystem::TickCooldowns` 系统集
   - 影响：可能导致系统执行顺序问题
   - 解决方案：手动配置系统顺序或使用 schedule API

3. **泛型组件查询**
   - 问题：Matter ECS 对泛型组件查询支持有限
   - 影响：难以实现组件形式的自动更新
   - 解决方案：使用资源形式或创建具体类型的组件包装器

### 功能差异对比

| 功能 | Rust Bevy | TypeScript 移植 | 备注 |
|------|-----------|-----------------|------|
| 资源形式冷却 | ✅ 完整支持 | ✅ 完整支持 | 功能一致 |
| 组件形式冷却 | ✅ 完整支持 | ⚠️ 手动更新 | 需要自定义系统 |
| 系统调度集 | ✅ SystemSet | ⚠️ 手动配置 | 使用 schedule API |
| 派生宏 | ✅ #[derive] | ✅ Flamework | 不同实现方式 |
| 错误处理 | ✅ Result<T,E> | ✅ 枚举 | 语义等价 |
| 性能优化 | ✅ 零开销抽象 | ⚠️ 运行时开销 | TypeScript 限制 |

## 与 Bevy 原版的差异

### 语言层面差异

1. **类型系统**
   - Rust: 使用 trait 和关联类型
   - TypeScript: 使用 interface 和泛型
   - 影响：某些高级类型特性需要变通实现

2. **内存管理**
   - Rust: 零开销抽象，编译时优化
   - TypeScript: 运行时垃圾回收
   - 影响：性能特性不同，需要注意对象创建

3. **错误处理**
   - Rust: `Result<T, E>` 类型
   - TypeScript: 枚举返回值或 undefined
   - 影响：错误处理模式不同但语义等价

### 框架层面差异

1. **ECS 实现**
   - Bevy ECS: 原生 Rust 实现，archetype-based
   - Matter ECS: Lua/TypeScript 实现，sparse-set based
   - 影响：查询语法和性能特性不同

2. **宏系统**
   - Rust: 过程宏和派生宏
   - TypeScript: Flamework transformer
   - 影响：需要 Modding.* 参数注入

3. **插件系统**
   - Rust: 完整的插件生命周期
   - TypeScript: 简化的插件接口
   - 影响：某些高级功能需要手动实现

## 故障排除

### 常见问题

#### 1. 冷却时间不更新

**问题**：技能冷却时间似乎不会自动减少

**原因**：可能未添加 AbilityPlugin 或未正确设置 TypeDescriptor

**解决方案**：
```typescript
// 确保添加了插件
app.addPlugins(AbilityPlugin.create<YourAbilityType>());

// 确保有时间资源
app.insertResource(new VirtualTimeResource());
```

#### 2. 技能总是返回 NotPressed

**问题**：即使满足所有条件，技能仍返回 NotPressed

**原因**：这个错误来自 leafwing-input-manager，表示输入未触发

**解决方案**：
```typescript
// 不要依赖 NotPressed，直接检查 ready() 结果
const status = ability.ready(charges, cooldowns, pool, costs);
if (status === undefined || status === CannotUseAbility.NotPressed) {
    // 技能可用，检查你的输入逻辑
}
```

#### 3. 组件形式的状态不更新

**问题**：将 CooldownState 作为组件添加到实体，但不会自动更新

**原因**：当前版本只自动更新资源形式

**解决方案**：使用资源形式或手动创建更新系统（见架构差异章节）

#### 4. TypeDescriptor 相关错误

**问题**：`Failed to get TypeDescriptor` 错误

**原因**：Flamework transformer 未正确处理泛型

**解决方案**：
```typescript
// 确保使用 create() 静态方法
const plugin = AbilityPlugin.create<YourType>();  // ✅ 正确

// 不要直接 new
const plugin = new AbilityPlugin<YourType>();  // ❌ 错误
```

#### 5. 充能恢复问题

**问题**：充能不会自动恢复

**原因**：充能恢复依赖冷却系统的 tick

**解决方案**：
```typescript
// 确保冷却系统正在运行
cooldowns.tick(deltaTime, charges);  // charges 参数很重要！

// 或使用 AbilityPlugin 自动处理
```

### 调试技巧

1. **启用详细日志**：
```typescript
function debugAbilitySystem(world: BevyWorld) {
    const cooldowns = world.resources.getResource<CooldownState<Ability>>();
    if (cooldowns) {
        for (const [ability, cooldown] of cooldowns.entries()) {
            print(`${ability}: ${cooldown.elapsed()}/${cooldown.duration()}`);
        }
    }
}
```

2. **检查资源状态**：
```typescript
// 列出所有资源
const resources = world.resources.getAllResources();
for (const [id, resource] of resources) {
    print(`Resource: ${id}`);
}
```

3. **验证系统执行顺序**：
```typescript
// 在系统开始时打印
function mySystem(world: BevyWorld, context: Context) {
    print(`[${os.clock()}] mySystem executing`);
    // ...
}
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test leafwing_abilities

# 运行单个测试文件
npm test ability-state
```

### 测试覆盖

当前测试覆盖情况：

| 模块 | 测试数 | 覆盖率 | 状态 |
|------|--------|--------|------|
| abilitylike | 8 | 100% | ✅ |
| charges | 12 | 100% | ✅ |
| cooldown | 10 | 100% | ✅ |
| pool | 22 | 100% | ✅ |
| ability-state | 14 | 95% | ✅ |
| life-pool | 24 | 100% | ✅ |
| mana-pool | 18 | 100% | ✅ |
| **总计** | **108** | **99%** | ✅ |

## 路线图

### 短期目标（1-2周）

- [ ] 修复组件形式支持
- [ ] 添加系统调度集 API
- [ ] 完善 regenerateResourcePoolSystem
- [ ] 添加更多预制资源池（耐力、怒气等）

### 中期目标（1-2月）

- [ ] 性能优化（对象池、缓存）
- [ ] 添加技能组合系统
- [ ] 实现技能树功能
- [ ] 创建可视化调试工具

### 长期目标

- [ ] 与 leafwing-input-manager 深度集成
- [ ] 支持网络同步
- [ ] 添加技能编辑器
- [ ] 移植更多 Bevy 生态系统插件

## 贡献指南

欢迎贡献代码！请遵循以下准则：

1. **代码风格**：遵循项目的 ESLint 配置
2. **测试**：为新功能添加测试
3. **文档**：更新相关文档和示例
4. **提交信息**：使用清晰的提交信息

提交 PR 前请确保：
- `npm run build` 无错误
- `npm test` 全部通过
- 代码有适当的 JSDoc 注释

## 相关资源

- [原版 Rust 文档](https://github.com/Leafwing-Studios/leafwing-abilities)
- [Matter ECS 文档](https://github.com/evaera/matter)
- [Flamework 文档](https://flamework.fireboltofdeath.dev/)
- [审计报告](.audit/leafwing_abilities_FINAL_AUDIT_REPORT.md)

## 许可

与 White Dragon Bevy 框架保持一致的许可协议。

## 致谢

本模块移植自 [Leafwing Studios](https://github.com/Leafwing-Studios) 的 [leafwing-abilities](https://github.com/Leafwing-Studios/leafwing-abilities) 插件。

感谢原作者的优秀设计和实现！