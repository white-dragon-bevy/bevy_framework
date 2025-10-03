# Big-Brain 单元测试

这个目录包含了 big-brain 模块的单元测试,用于验证 AI 系统的核心功能。

## 测试文件

### actions.spec.ts
测试 Action 系统的状态机转换和 ActionBuilder 机制:
- ActionBuilder 基础功能和标签系统
- ActionState 状态转换流程 (Init → Requested → Executing → Success/Failure)
- Action 取消流程 (Executing → Cancelled → Failure)
- 泛型 Action 支持
- Action 构建和初始化

### scorers.spec.ts
测试 Scorer 评分逻辑和 ScorerBuilder 机制:
- ScorerBuilder 基础功能和标签系统
- Score 值管理 (0.0 到 1.0 范围验证)
- FixedScore Scorer (固定分数评分器)
- 复合 Scorer 概念 (求和、求积、最高分)
- 阈值过滤逻辑

### thinker.spec.ts
测试 Thinker 决策逻辑和 Picker 选择机制:
- FirstToScore Picker (选择第一个达到阈值的选项)
- Highest Picker (选择得分最高的选项)
- HighestToScore Picker (选择达到阈值中得分最高的选项)
- Picker 行为对比和边界情况

### steps.spec.ts
测试复合 Action 的组合行为:
- Steps 顺序执行逻辑 (按顺序执行直到所有成功或某个失败)
- Steps 取消和清理逻辑
- Concurrently 并发执行逻辑
- ConcurrentMode.Join (所有成功才成功)
- ConcurrentMode.Race (任意成功就成功)
- 复合 Action 嵌套 (Steps 嵌套 Steps, Steps 包含 Concurrently 等)

## 当前状态

所有测试都设计为**故意失败**,因为 big-brain 的实现还未完成。

测试中的 `build()` 方法都会抛出 "Not implemented yet" 错误,这是预期行为。

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试 (使用测试名称过滤)
npm test "ActionBuilder"
npm test "Scorer"
npm test "Thinker"
npm test "Steps"
```

## 测试覆盖

这些测试覆盖了 Bevy big-brain 的核心概念:

1. **Action 系统**: 状态机、生命周期管理、取消机制
2. **Scorer 系统**: 评分逻辑、复合评分器、阈值过滤
3. **Thinker 系统**: 决策逻辑、Picker 选择策略
4. **复合 Action**: Steps 顺序执行、Concurrently 并发执行、嵌套组合

## 下一步

当 big-brain 的实现完成后,这些测试将用于验证:
- 核心 API 的正确性
- 状态转换的正确性
- 边界情况的处理
- TypeScript 类型安全

## 参考

原始 Rust 测试文件位于:
- `bevy-origin-packages/big-brain/tests/derive_action.rs`
- `bevy-origin-packages/big-brain/tests/derive_scorer.rs`
- `bevy-origin-packages/big-brain/tests/steps.rs`
