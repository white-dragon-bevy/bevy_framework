# Big Brain 示例

这个目录包含了 Big Brain AI 系统的示例代码，从简单到复杂逐步展示核心功能。

## 📚 示例列表

### 1. thirst.ts - 基础示例

**难度**: ⭐ 入门

**展示概念**:
- Thinker（思考者）- AI 的"大脑"
- Scorer（评分器）- 评估世界状态并生成分数
- Action（动作）- 基于分数执行的行为
- Picker（选择器）- FirstToScore 决策模式

**场景说明**:

一个实体有"口渴"属性，随时间增加。当口渴值达到阈值（>= 0.8）时，AI 会执行"喝水"动作。

**核心代码**:
```typescript
// 创建 Thinker
new ThinkerBuilder()
    .withLabel("ThirstThinker")
    .picker(new FirstToScore(0.8))  // 分数 >= 0.8 时执行
    .when(
        new ThirstyScorerBuilder(),  // 评分器：口渴值 / 100
        new DrinkActionBuilder(70.0, 5.0)  // 动作：喝到 70
    )
```

**学习要点**:
- 如何创建自定义 Scorer 和 Action
- 理解 ActionState 状态机（Requested → Executing → Success/Failure）
- 使用 FirstToScore Picker 进行阈值决策

---

### 2. sequence.ts - 顺序动作

**难度**: ⭐⭐ 进阶

**展示概念**:
- Steps（顺序执行器）- 多步骤动作链
- 前置条件处理
- 动作组合模式

**场景说明**:

实体会口渴，但不能直接喝水。必须先移动到水源附近，然后才能喝水。

**核心代码**:
```typescript
// 使用 Steps 构建复合动作
const moveAndDrink = new StepsBuilder()
    .withLabel("MoveAndDrink")
    .step(new MoveToWaterSourceBuilder(1.0))  // 第一步：移动
    .step(new DrinkActionBuilder(10.0))       // 第二步：喝水
```

**学习要点**:
- 如何使用 Steps 顺序执行多个动作
- 动作失败处理（任一步失败则整个序列失败）
- 前置条件的解耦设计（喝水动作不关心如何到达水源）

---

### 3. concurrent.ts - 并发动作

**难度**: ⭐⭐⭐ 高级

**展示概念**:
- Concurrently（并发执行器）
- ConcurrentMode.Race - 任意成功即成功
- ConcurrentMode.Join - 全部成功才成功
- 复杂动作组合

**场景说明**:

AI 需要猜测一个神秘数字（0-10）：
1. Race 模式：两个猜测者竞速，任意一个猜对就成功
2. Join 模式：两个猜测者同时猜，全部猜对才成功

**核心代码**:
```typescript
// Race 模式：任意一个成功即成功
const race = new ConcurrentlyBuilder()
    .mode(ConcurrentMode.Race)
    .push(new GuessNumberBuilder(5, 12345))
    .push(new GuessNumberBuilder(5, 67890))

// Join 模式：所有都成功才成功
const join = new ConcurrentlyBuilder()
    .mode(ConcurrentMode.Join)
    .push(new GuessNumberBuilder(5, 11111))
    .push(new GuessNumberBuilder(5, 22222))

// 组合：先 Race，后 Join
const sequence = new StepsBuilder()
    .step(race)
    .step(join)
```

**学习要点**:
- Race vs Join 的区别和应用场景
- 如何组合多种复合动作（Steps + Concurrently）
- 并发动作的取消机制

---

## 🎯 核心概念总结

### Thinker（思考者）

AI 的"大脑"，负责：
- 评估所有 Scorer 的分数
- 使用 Picker 选择要执行的 Action
- 管理当前 Action 的生命周期

```typescript
new ThinkerBuilder()
    .picker(picker)           // 设置选择策略
    .when(scorer, action)     // 添加 条件→动作 对
    .otherwise(fallback)      // 设置默认动作（可选）
```

### Scorer（评分器）

评估世界状态，输出 0.0-1.0 的分数：

```typescript
class MyScorerBuilder implements ScorerBuilder {
    build(world, scorerEntityId, actorEntityId) {
        // 添加标识组件
    }
}

function myScorerSystem(world, context) {
    for (const [scorerId, myScorer, actor] of world.query(MyScorer, Actor)) {
        // 计算分数
        setScore(world, scorerId, score);
    }
}
```

### Action（动作）

执行具体行为，遵循状态机：

```typescript
enum ActionState {
    Init,        // 初始状态
    Requested,   // 请求执行
    Executing,   // 正在执行
    Cancelled,   // 已取消
    Success,     // 成功完成
    Failure      // 执行失败
}
```

### Picker（选择器）

决定执行哪个动作：

| Picker | 策略 | 适用场景 |
|--------|------|---------|
| FirstToScore(threshold) | 第一个 >= 阈值的 | 优先级决策 |
| Highest | 分数最高的 | 最优选择 |
| HighestToScore(threshold) | 最高且 >= 阈值的 | 有条件的最优 |

### 复合动作

| 类型 | 执行模式 | 成功条件 | 失败条件 |
|------|---------|---------|---------|
| Steps | 顺序执行 | 所有步骤成功 | 任一步骤失败 |
| Concurrently.Race | 并发执行 | 任一动作成功 | 全部动作失败 |
| Concurrently.Join | 并发执行 | 全部动作成功 | 任一动作失败 |

---

## 🚀 运行示例

### 方式 1: 直接运行

```bash
# 编译项目
npm run build

# 在 Roblox Studio 中运行编译后的代码
```

### 方式 2: 集成到项目

```typescript
import thirstExample from "./path/to/thirst";

// 在合适的地方调用
thirstExample();
```

---

## 📝 开发自己的 AI

### 步骤 1: 定义组件

```typescript
// 定义领域组件（非 AI 组件）
const Health = component<{ value: number }>("Health");
```

### 步骤 2: 创建 Scorer

```typescript
const LowHealthScorer = component("LowHealthScorer");

class LowHealthScorerBuilder implements ScorerBuilder {
    build(world, scorerEntityId, actorEntityId) {
        world.insert(scorerEntityId, LowHealthScorer());
    }
}

function lowHealthScorerSystem(world, context) {
    for (const [scorerId, _, actor] of world.query(LowHealthScorer, Actor)) {
        const health = world.get(actor.entityId, Health);
        if (health) {
            // 健康值越低，分数越高
            setScore(world, scorerId, 1.0 - health.value / 100.0);
        }
    }
}
```

### 步骤 3: 创建 Action

```typescript
const HealAction = component<{ amount: number }>("HealAction");

class HealActionBuilder implements ActionBuilder {
    build(world, actionEntityId, actorEntityId) {
        world.insert(actionEntityId, HealAction({ amount: 50 }));
    }
}

function healActionSystem(world, context) {
    for (const [actionId, heal, state, actor] of world.query(
        HealAction, ActionStateComponent, Actor
    )) {
        if (state.state === ActionState.Requested) {
            // 开始治疗
            world.insert(actionId, ActionStateComponent({
                state: ActionState.Executing
            }));
        } else if (state.state === ActionState.Executing) {
            // 执行治疗
            const health = world.get(actor.entityId, Health);
            if (health) {
                const newHealth = math.min(health.value + heal.amount, 100);
                world.insert(actor.entityId, Health({ value: newHealth }));
                world.insert(actionId, ActionStateComponent({
                    state: ActionState.Success
                }));
            }
        }
    }
}
```

### 步骤 4: 组装 Thinker

```typescript
world.spawn(
    Health({ value: 30 }),
    ThinkerBuilderComponent({
        builder: new ThinkerBuilder()
            .picker(new FirstToScore(0.7))  // 健康 < 30% 时触发
            .when(
                new LowHealthScorerBuilder(),
                new HealActionBuilder()
            )
    })
);
```

### 步骤 5: 注册系统

```typescript
app.addPlugin(new BigBrainPlugin());
app.addSystems(BuiltinSchedules.PRE_UPDATE, [
    lowHealthScorerSystem,
    healActionSystem
]);
```

---

## 🔧 调试技巧

### 1. 使用 Label 标记

```typescript
new ThinkerBuilder()
    .withLabel("MyThinker")  // 便于日志追踪
```

### 2. 防抖打印

```typescript
import { hookDebugPrint } from "../../utils/hook-debug-print";

// 自动防抖，避免每帧刷屏
hookDebugPrint("Debug message");
```

### 3. 检查分数

```typescript
const score = getScore(world, scorerEntityId);
print(`Scorer score: ${score}`);
```

### 4. 跟踪状态

```typescript
const state = getActionState(world, actionEntityId);
print(`Action state: ${state}`);
```

---

## 📖 进阶主题

### 组合评分器

使用内置的复合 Scorer：

```typescript
import {
    AllOrNothingBuilder,    // 所有 >= 阈值时返回总和
    SumOfScorersBuilder,    // 总和 >= 阈值时返回总和
    ProductOfScorersBuilder, // 乘积 >= 阈值时返回乘积
    WinningScorerBuilder    // 最高 >= 阈值时返回最高
} from "../../big-brain";

const composite = new AllOrNothingBuilder(0.5)
    .push(new ThirstyScorerBuilder())
    .push(new HungryScorerBuilder());
```

### 使用 Evaluator

转换分数曲线：

```typescript
import {
    LinearEvaluator,   // 线性转换
    PowerEvaluator,    // 幂次转换
    SigmoidEvaluator   // S 型曲线
} from "../../big-brain";

const evaluated = new EvaluatingScorerBuilder(
    scorer,
    new PowerEvaluator(2.0)  // 平方转换，放大差异
);
```

### 加权度量

使用 Measure 组合多个分数：

```typescript
import { WeightedSum } from "../../big-brain";

const measured = new MeasuredScorerBuilder(0.7)
    .measure(new WeightedSum())
    .push(thirstScorer, 2.0)   // 权重 2.0
    .push(hungerScorer, 1.0);  // 权重 1.0
```

---

## 🎨 设计模式

### 1. 分层 AI

```typescript
// 战术层 Thinker
const tacticThinker = new ThinkerBuilder()
    .picker(new Highest())
    .when(enemyNearby, attack)
    .when(lowHealth, retreat);

// 战略层 Thinker
const strategyThinker = new ThinkerBuilder()
    .picker(new FirstToScore(0.8))
    .when(objectiveAvailable, moveToObjective)
    .otherwise(patrol);
```

### 2. 状态机 + AI

```typescript
// 使用 State 控制 AI 行为
enum BossPhase {
    Phase1,
    Phase2,
    Phase3
}

// 不同阶段使用不同的 Thinker
```

### 3. 协作 AI

```typescript
// 多个 AI 实体协同工作
const leader = world.spawn(LeaderThinker);
const follower1 = world.spawn(FollowerThinker(leader));
const follower2 = world.spawn(FollowerThinker(leader));
```

---

## 📚 参考资料

- [Big Brain 源码](../../big-brain/)
- [原始 Rust 版本](../../../bevy-origin-packages/big-brain/)
- [White Dragon Bevy 文档](../../../docs/)

---

## 🤝 贡献

欢迎贡献更多示例！请确保：
- 代码清晰易懂
- 有完整的中文注释
- 能够独立运行
- 展示特定的 Big Brain 功能

---

## 📜 许可证

MIT License - 与 White Dragon Bevy 框架相同
