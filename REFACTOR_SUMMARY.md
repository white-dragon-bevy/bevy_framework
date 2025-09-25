# NextState 重构总结

## 重构目标
将 `NextState` 类重构为符合 Rust 枚举模式的实现，提供更明确的状态管理语义。

## 主要改变

### 1. 添加枚举变体标识
```typescript
export enum NextStateVariant {
    Unchanged = "Unchanged",
    Pending = "Pending",
}
```

### 2. 重构 NextState 类
- 添加 `variant` 属性来跟踪当前变体
- 重命名 `pending` 属性为 `pendingState`
- 添加明确的变体检查方法：`isUnchanged()` 和 `isPending()`

### 3. 新的静态工厂方法
- `NextState.unchanged<S>()`: 创建 Unchanged 变体
- `NextState.pending<S>(state: S)`: 创建 Pending 变体

### 4. 改进的方法语义
- `set(state: S)`: 设置状态并转换为 Pending 变体
- `reset()`: 重置为 Unchanged 变体
- `take()`: 取出并重置状态（对应 Rust 的 take_next_state）
- `pending()`: 获取待处理状态（不清除）

### 5. 兼容性支持
保留了原有方法作为废弃方法，确保向后兼容：
- `getPending()` -> 使用 `pending()`
- `hasPending()` -> 使用 `isPending()`
- `withPending()` -> 使用 `pending()` 静态方法

### 6. 添加 FreelyMutableState 接口
```typescript
export interface FreelyMutableState extends States {}
```

## 更新的文件
- `src/bevy_state/resources.ts` - 主要重构
- `src/bevy_state/index.ts` - 添加新导出
- `src/bevy_state/prelude.ts` - 添加 NextStateVariant 导出
- `src/bevy_state/__tests__/resources.spec.ts` - 更新测试用例

## 使用示例

### 新的推荐用法
```typescript
// 创建 unchanged 状态
const nextState = NextState.unchanged<GameState>();

// 创建 pending 状态
const pendingNextState = NextState.pending(new GameState("menu"));

// 检查变体
if (nextState.isUnchanged()) {
    // 处理 unchanged 情况
}

if (nextState.isPending()) {
    // 处理 pending 情况
    const state = nextState.pending(); // 获取但不清除
    const takenState = nextState.take(); // 获取并清除
}
```

### 向后兼容用法（已废弃）
```typescript
// 仍然支持但已标记为废弃
const nextState = NextState.withPending(state);
if (nextState.hasPending()) {
    const state = nextState.getPending();
}
```

## 符合规范
- 所有文件以换行符结尾
- JSDoc 注释使用 `@param name - description` 格式
- Tab 缩进
- 明确的返回类型声明
- 符合 roblox-ts 编码标准