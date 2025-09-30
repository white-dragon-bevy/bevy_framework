# Leafwing Abilities

一个强大的游戏技能系统，为 White Dragon Bevy 框架提供完整的技能、冷却、充能和资源管理功能。

## 概述

Leafwing Abilities 是从 Rust Bevy 引擎的 [leafwing-abilities](https://github.com/Leafwing-Studios/leafwing-abilities) 插件移植而来的技能系统，提供了：

- ✨ **冷却系统**: 限制技能使用频率，支持全局冷却
- ⚡ **充能系统**: 多次使用技能，灵活的充能策略
- 💧 **资源池**: 抽象的资源管理（生命值、法力值等）
- 🎯 **技能状态**: 便捷的技能就绪检查和触发
- 📦 **预制资源池**: 开箱即用的生命值和法力值实现

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

### 基础技能实现

```typescript
// 定义技能枚举
enum PlayerAbility {
    Fireball = "Fireball",
    Heal = "Heal",
    Dash = "Dash",
}

// 实现 Abilitylike
class Ability implements Abilitylike {
    constructor(private ability: PlayerAbility) {}

    hash(): string {
        return this.ability;
    }

    equals(other: Ability): boolean {
        return this.ability === other.ability;
    }

    toString(): string {
        return this.ability;
    }

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

// 创建技能实例
const fireball = new Ability(PlayerAbility.Fireball);
const heal = new Ability(PlayerAbility.Heal);
const dash = new Ability(PlayerAbility.Dash);
```

### 配置技能系统

```typescript
// 在组件中设置技能状态
function setupPlayer(world: BevyWorld, entity: number) {
    // 创建冷却状态
    const cooldowns = new CooldownState<Ability>();
    cooldowns.set(fireball, Cooldown.fromSecs(3));
    cooldowns.set(heal, Cooldown.fromSecs(10));
    cooldowns.set(dash, Cooldown.fromSecs(5));

    // 创建充能状态
    const charges = new ChargeState<Ability>();
    charges.set(dash, Charges.simple(2)); // Dash 有2个充能

    // 创建资源池
    const manaPool = ManaPool.simple(100, 100, 10);

    // 设置技能消耗
    const costs = new AbilityCosts<Ability, ManaPool>();
    costs.set(fireball, 30);
    costs.set(heal, 50);

    // 将这些保存到组件...
}
```

### 使用技能

```typescript
function playerInputSystem(world: BevyWorld, context: Context) {
    // 查询玩家实体
    for (const [entityId, cooldowns, charges, manaPool, costs] of world.query(
        CooldownStateComponent,
        ChargeStateComponent,
        ManaPoolComponent,
        AbilityCostsComponent
    )) {
        // 检查技能是否就绪
        const fireballReady = fireball.ready(charges, cooldowns, manaPool, costs);

        if (fireballReady === undefined) {
            // 技能就绪，可以使用
            if (playerPressedFireballButton()) {
                const result = fireball.trigger(charges, cooldowns, manaPool, costs);

                if (result === undefined) {
                    // 成功触发技能
                    castFireball(world, entityId);
                } else {
                    // 处理错误
                    print(`Cannot use fireball: ${result}`);
                }
            }
        }
    }
}
```

### 更新系统

```typescript
function cooldownTickSystem(world: BevyWorld, context: Context) {
    // 获取时间资源
    const timeResource = world.resources.getResource<VirtualTimeResource>();
    if (!timeResource) return;

    const deltaTime = timeResource.value.getDelta();

    // 更新所有冷却和充能
    for (const [_, cooldowns, charges] of world.query(
        CooldownStateComponent,
        ChargeStateComponent
    )) {
        cooldowns.tick(deltaTime, charges);
    }
}

function poolRegenerationSystem(world: BevyWorld, context: Context) {
    // 获取时间资源
    const timeResource = world.resources.getResource<VirtualTimeResource>();
    if (!timeResource) return;

    const deltaTime = timeResource.value.getDelta();

    // 恢复所有资源池
    for (const [_, manaPool, lifePool] of world.query(
        ManaPoolComponent,
        LifePoolComponent
    )) {
        manaPool.regenerate(deltaTime);
        lifePool.regenerate(deltaTime);
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

本模块采用与原 Rust 版本相同的设计模式：

- **泛型约束**: 使用 `Abilitylike` 约束确保类型安全
- **状态分离**: 冷却、充能、资源池独立管理
- **ECS 集成**: 设计为 ECS 组件和系统
- **Flamework 宏**: 使用 TypeScript 泛型的运行时类型信息

## 性能考虑

- 冷却和充能状态使用 Map 存储，查询效率为 O(1)
- 避免在每帧创建新对象，重用现有实例
- 资源池操作经过优化，避免不必要的计算
- 建议将频繁访问的数据缓存到组件中

## 与 Bevy 原版的差异

1. **语言差异**: TypeScript vs Rust
2. **ECS 框架**: Matter vs Bevy ECS
3. **类型系统**: 使用接口代替 trait
4. **宏系统**: Flamework transformer 代替 Rust 宏
5. **错误处理**: 枚举代替 Result<T, E>

## 测试

运行单元测试：

```bash
npm test
```

运行特定测试：

```bash
npm test leafwing_abilities
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

与 White Dragon Bevy 框架保持一致的许可协议。

## 致谢

本模块移植自 [Leafwing Studios](https://github.com/Leafwing-Studios) 的 [leafwing-abilities](https://github.com/Leafwing-Studios/leafwing-abilities) 插件。