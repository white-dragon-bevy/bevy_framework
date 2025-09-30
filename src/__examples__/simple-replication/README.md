# Simple Replication Examples

简单复制系统示例集合，展示如何使用 `SimpleReplicationPlugin` 进行服务端-客户端实体同步。

## 📚 示例列表

### 1. basic-replication.ts - 基础网络同步

**功能:**
- 服务端创建和更新实体
- 客户端自动接收实体状态
- 演示 `ToAllPlayers` 和 `ToSelfOnly` 组件

**组件类型:**
- `Position`, `Velocity`, `DisplayName` - 所有玩家可见
- `PlayerPrivateData` - 仅自己可见

**运行方式:**
```typescript
import { main } from "./basic-replication";
const app = main();
app.run();
```

---

### 2. player-spawn-replication.ts - 玩家生成同步

**功能:**
- 真实多玩家场景模拟
- 玩家加入/离开时自动管理实体
- 游戏状态定期更新（位置、健康、任务）

**组件类型:**
- `Transform`, `Health`, `CharacterAppearance` - 所有玩家可见
- `Inventory`, `QuestProgress` - 仅自己可见

**更新频率:**
- 每2秒: 更新位置
- 每3秒: 更新生命值
- 每5秒: 更新任务进度

**运行方式:**
```typescript
import { main } from "./player-spawn-replication";
const app = main();
app.run();
```

---

## 🔧 核心概念

### 组件同步类型

#### ToAllPlayers（所有玩家可见）
适用于所有玩家都需要看到的数据:
- 位置和变换
- 健康值和状态
- 角色外观
- 公共游戏状态

```typescript
plugin.replicateToAllPlayers(Position);
plugin.replicateToAllPlayers(Health);
```

#### ToSelfOnly（仅自己可见）
适用于玩家私有数据:
- 背包物品
- 任务进度
- 金币/货币
- 技能冷却

```typescript
plugin.replicateToSelfOnly(Inventory);
plugin.replicateToSelfOnly(QuestProgress);
```

### 组件识别机制

组件通过**字符串名称**进行识别和同步:

```typescript
// 服务端发送
const name = tostring(component) as ComponentName;
entityChanges.set(name, { data: record.new });

// 客户端接收
const component = context.getComponent(name);
```

### 数据序列化

当前使用 **Roblox RemoteEvent 原生序列化**:
- 自动处理基础类型和 Roblox 类型
- 支持嵌套表结构
- 无需手动 JSON 编解码

```typescript
// 直接发送 Lua 表
networkAdapter.fire(player, changelog);
```

---

## 🎯 使用指南

### 1. 创建复制插件

```typescript
const plugin = new SimpleReplicationPlugin({
	debugEnabled: true,  // 启用调试输出
	forceMode: "server", // 强制模式（测试用）
});
```

### 2. 配置要同步的组件

```typescript
// 所有玩家可见
plugin.replicateToAllPlayers(Position);
plugin.replicateToAllPlayers(Health);

// 仅自己可见
plugin.replicateToSelfOnly(Inventory);
```

### 3. 添加到 App

```typescript
const app = App.create();
app.addPlugin(plugin);
```

### 4. 在系统中修改组件

```typescript
function updateSystem(world: World): void {
	for (const [entity, position] of world.query(Position)) {
		// 修改组件会自动触发同步
		world.insert(entity, Position({ x: position.x + 1, y: position.y, z: position.z }));
	}
}
```

---

## ⚠️ 注意事项

### 性能优化
- 避免每帧修改大量实体
- 使用节流/防抖减少更新频率
- 考虑使用 `ToSelfOnly` 减少网络传输

### 数据安全
- 敏感数据必须使用 `ToSelfOnly`
- 服务端应验证客户端输入
- 不要复制不必要的数据

### 组件设计
- 保持组件数据简单
- 避免复杂的嵌套结构
- 使用纯数据对象（避免函数/类实例）

---

## 📖 相关文档

- [SimpleReplicationPlugin API](../../simple_replication/README.md)
- [Matter ECS 文档](https://eryn.io/matter/)
- [Bevy App 架构](../../bevy_app/README.md)

---

## 🐛 调试技巧

### 启用调试输出
```typescript
const plugin = new SimpleReplicationPlugin({
	debugEnabled: true,
});
```

### 查看同步数据
```typescript
// 服务端
debugLog("Sending replication", currentChangelog);

// 客户端
debugPrint("Receiving replication", entities);
```

### 验证组件注册
```typescript
// 检查组件是否正确注册
print(context.Components); // 应包含所有组件名称
```