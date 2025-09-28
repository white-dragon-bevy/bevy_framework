# bevy_replicon 模块

`bevy_replicon` 是 Bevy 框架在 Roblox TypeScript 上的网络复制框架，提供完整的多人游戏状态同步、客户端预测和服务器权威系统。

## 模块概述

`bevy_replicon` 提供了一个强大而灵活的网络复制系统，专门为 Roblox 平台设计，支持：

- **服务器权威架构** - 服务器拥有游戏状态的最终决定权
- **自动状态同步** - 自动同步标记为可复制的组件
- **客户端预测** - 减少网络延迟对玩家体验的影响
- **回滚与重模拟** - 自动处理预测错误并修正
- **灵活的复制策略** - 支持完全复制、差异复制和按需复制
- **Roblox 原生集成** - 使用 RemoteEvent 和 UnreliableRemoteEvent

## 公共 API

### 核心插件

#### `RepliconPlugin`
自动根据运行环境选择合适的服务器或客户端插件。

```typescript
import { App } from "bevy_app";
import { RepliconPlugin, ReplicationStrategy } from "bevy_replicon";

const app = App.create()
    .addPlugin(new RepliconPlugin({
        enablePrediction: true,  // 启用客户端预测
        replicationConfig: {
            strategy: ReplicationStrategy.Delta,
            updateRate: 30,       // 每秒30次更新
            compression: false,
            maxPacketSize: 4096,
            reliable: true,
        },
    }))
    .run();
```

#### `RepliconServerPlugin`
服务器专用插件，管理所有客户端连接和状态广播。

```typescript
import { RepliconServerPlugin } from "bevy_replicon";

const serverPlugin = new RepliconServerPlugin({
    port: 7447,
    maxClients: 100,
    heartbeatInterval: 1,
    timeout: 10,
}, {
    strategy: ReplicationStrategy.Full,
    updateRate: 30,
});
```

#### `RepliconClientPlugin`
客户端专用插件，处理服务器同步和客户端预测。

```typescript
import { RepliconClientPlugin } from "bevy_replicon";

const clientPlugin = new RepliconClientPlugin({
    serverAddress: "localhost:7447",
    autoReconnect: true,
    reconnectDelay: 5,
    maxReconnectAttempts: 3,
}, {
    strategy: ReplicationStrategy.Full,
    updateRate: 30,
}, true); // 启用客户端预测
```

### 核心类型

#### `Replicated` 接口
所有需要网络复制的组件都必须实现此接口。

```typescript
import { Component } from "@rbxts/matter";
import { Replicated } from "bevy_replicon";

interface Position extends Replicated, Component {
    x: number;
    y: number;
    z: number;
    priority?: 1;      // 可选：复制优先级（越高越优先）
    reliable?: true;   // 可选：是否使用可靠传输
}
```

#### `ClientId` 类型
客户端标识符，用于标识连接的客户端。

```typescript
import { ClientId, createClientId } from "bevy_replicon";

const clientId: ClientId = createClientId(1);
```

#### `NetworkRole` 枚举
定义网络角色。

```typescript
export enum NetworkRole {
    Server = "Server",           // 服务端
    Client = "Client",          // 客户端
    ListenServer = "ListenServer", // 监听服务器
}
```

#### `ReplicationStrategy` 枚举
定义复制策略。

```typescript
export enum ReplicationStrategy {
    Full = "Full",       // 完全复制所有标记的组件
    Delta = "Delta",     // 仅复制变化的组件
    OnDemand = "OnDemand", // 根据客户端请求复制
}
```

#### `EntityAuthority` 组件
管理实体的权限和所有权。

```typescript
import { EntityAuthority, AuthorityLevel, createClientId } from "bevy_replicon";

const authority: EntityAuthority = {
    owner: createClientId(1),  // 拥有者客户端ID
    level: AuthorityLevel.Player, // 权限级别
    allowPrediction: true,      // 允许客户端预测
};
```

### 核心管理器

#### `ReplicationManager`
管理所有复制相关的状态和操作。

```typescript
import { ReplicationManager, NetworkRole, ReplicationStrategy } from "bevy_replicon";

const manager = new ReplicationManager(NetworkRole.Server, {
    strategy: ReplicationStrategy.Full,
    updateRate: 30,
    compression: false,
    maxPacketSize: 4096,
    reliable: true,
});

// 客户端管理
manager.addClient(clientId);
manager.removeClient(clientId);
const clients = manager.getConnectedClients();

// 可见性管理
manager.setEntityVisibility(entity, clientId, true);
const isVisible = manager.isEntityVisibleToClient(entity, clientId);

// 组件注册
manager.registerComponent("Position", {
    serialize: (component) => ({ ...component }),
    deserialize: (data) => data as Component,
});
```

#### `ClientPredictionManager`
管理客户端预测、回滚和重新模拟。

```typescript
import { ClientPredictionManager } from "bevy_replicon";

const predictionManager = new ClientPredictionManager(
    120,  // 最大历史帧数
    0.01  // 预测误差阈值
);

// 管理预测
predictionManager.setEnabled(true);
predictionManager.addPredictedEntity(entity);

// 记录输入和快照
predictionManager.recordInput(inputData);
predictionManager.savePredictionSnapshot(world, inputData);

// 处理服务器确认
predictionManager.handleServerConfirmation(world, confirmedFrame, serverState);

// 注册回滚回调
predictionManager.onRollback((rollback) => {
    print(`回滚实体 ${rollback.entity} 到帧 ${rollback.frame}`);
});
```

#### `RobloxNetworkAdapter`
Roblox 平台的网络适配器，处理 RemoteEvent 通信。

```typescript
import { RobloxNetworkAdapter, NetworkRole } from "bevy_replicon";

const networkAdapter = new RobloxNetworkAdapter();
networkAdapter.initialize(NetworkRole.Server);

// 注册消息处理器
networkAdapter.registerHandler("EntityUpdate", (message) => {
    // 处理实体更新
});

// 发送消息
networkAdapter.sendMessage({
    id: eventId,
    sender: clientId,
    receiver: targetClientId, // undefined 表示广播
    data: messageData,
    reliable: true,
});

// 获取网络统计
const stats = networkAdapter.getStats();
print(`延迟: ${stats.averageLatency}ms`);
```

## 使用示例

### 创建可复制的游戏

```typescript
import { App, BuiltinSchedules } from "bevy_app";
import { World } from "@rbxts/matter";
import {
    RepliconPlugin,
    Replicated,
    ReplicationStrategy,
    EntityAuthority,
    AuthorityLevel,
    createClientId
} from "bevy_replicon";

// 定义可复制的组件
interface PlayerPosition extends Replicated {
    x: number;
    y: number;
    z: number;
    priority?: 1;
}

interface PlayerHealth extends Replicated {
    current: number;
    max: number;
    reliable?: true; // 生命值使用可靠传输
}

// 创建游戏系统
function movementSystem(world: World, deltaTime: number): void {
    // 处理玩家移动
    for (const [entity, position] of world.query<PlayerPosition>()) {
        // 更新位置逻辑
    }
}

// 设置应用
const app = App.create()
    .addPlugin(new RepliconPlugin({
        enablePrediction: true,
        replicationConfig: {
            strategy: ReplicationStrategy.Delta,
            updateRate: 30,
        },
    }))
    .addSystems(BuiltinSchedules.UPDATE, movementSystem)
    .run();
```

### 服务器端实体生成

```typescript
function spawnPlayer(world: World, playerId: ClientId): void {
    const entity = world.spawn(
        // 位置组件
        {
            x: 0,
            y: 10,
            z: 0,
            priority: 1,
        } as PlayerPosition,

        // 生命值组件
        {
            current: 100,
            max: 100,
            reliable: true,
        } as PlayerHealth,

        // 权限组件
        {
            owner: playerId,
            level: AuthorityLevel.Player,
            allowPrediction: true,
        } as EntityAuthority,
    );

    // 设置对所有客户端可见
    const manager = getReplicationManager(world);
    for (const clientId of manager.getConnectedClients()) {
        manager.setEntityVisibility(entity, clientId, true);
    }
}
```

### 客户端预测示例

```typescript
import { ClientPredictionManager } from "bevy_replicon";

// 输入处理系统
function clientInputSystem(world: World, deltaTime: number): void {
    const context = world.context as { resources: Map<string, Resource> };
    const predictionManager = context.resources.get("ClientPredictionManager") as ClientPredictionManager;

    if (!predictionManager || !predictionManager.isEnabled()) {
        return;
    }

    // 捕获玩家输入
    const input = {
        moveX: UserInputService.GetMouseDelta().X,
        moveY: UserInputService.GetMouseDelta().Y,
        jump: UserInputService.IsKeyDown(Enum.KeyCode.Space),
        timestamp: os.clock(),
    };

    // 记录输入用于重模拟
    predictionManager.recordInput(input);

    // 保存预测快照
    predictionManager.savePredictionSnapshot(world, input);

    // 应用输入到本地实体（预测）
    applyInput(world, input);
}

// 处理服务器确认
function handleServerUpdate(world: World, frame: number, serverState: Map): void {
    const predictionManager = getPredictionManager(world);

    // 服务器确认会自动触发回滚和重模拟
    predictionManager.handleServerConfirmation(world, frame, serverState);
}
```

### 自定义复制策略

```typescript
import { ReplicationManager, ReplicationStrategy } from "bevy_replicon";

// 创建自定义可见性规则
function updateEntityVisibility(world: World, manager: ReplicationManager): void {
    const maxDistance = 1000; // 最大可见距离

    for (const [entity, position] of world.query<PlayerPosition>()) {
        for (const clientId of manager.getConnectedClients()) {
            const clientPosition = getClientPosition(world, clientId);
            const distance = calculateDistance(position, clientPosition);

            // 基于距离设置可见性
            const visible = distance <= maxDistance;
            manager.setEntityVisibility(entity, clientId, visible);
        }
    }
}
```

## 设计原则

### 1. 服务器权威架构
- 服务器拥有游戏状态的最终决定权
- 客户端只能发送输入，不能直接修改权威状态
- 所有游戏逻辑验证都在服务器端进行

### 2. 组件驱动复制
- 使用 `Replicated` 接口标记需要同步的组件
- 组件级别的复制粒度，而非实体级别
- 支持不同组件使用不同的复制策略

### 3. 灵活的复制策略
- **Full**: 每次更新发送完整状态，适合关键数据
- **Delta**: 只发送变化的部分，节省带宽
- **OnDemand**: 客户端请求时才发送，适合大量静态数据

### 4. 客户端预测与回滚
- 客户端立即响应输入，提供流畅体验
- 服务器验证后自动回滚错误预测
- 保存历史状态用于重新模拟

### 5. Roblox 平台优化
- 使用原生 RemoteEvent 和 UnreliableRemoteEvent
- 自动处理玩家连接和断开
- 集成 Roblox 的心跳系统

## 注意事项

### 性能优化
1. **合理设置更新频率**: 不是所有数据都需要 30Hz 更新
2. **使用优先级**: 为重要组件设置更高优先级
3. **控制可见性**: 只向需要的客户端发送数据
4. **选择合适的传输方式**: 位置用不可靠传输，重要事件用可靠传输

### 安全考虑
1. **永远不要信任客户端**: 所有输入都需要服务器验证
2. **权限检查**: 使用 `EntityAuthority` 控制谁能修改实体
3. **限制更新频率**: 防止客户端发送过多请求
4. **验证数据范围**: 检查所有数值是否在合理范围内

### 最佳实践
1. **组件设计**: 保持组件小而专注，便于复制
2. **预测范围**: 只预测玩家直接控制的实体
3. **错误处理**: 优雅处理网络断开和重连
4. **测试**: 在高延迟环境下测试预测和回滚
5. **监控**: 使用 `NetworkStats` 监控网络性能

### 常见问题

**Q: 如何处理不同的网络延迟？**
A: 使用客户端预测和插值技术，让每个客户端都有流畅体验。

**Q: 如何优化带宽使用？**
A: 使用 Delta 复制策略，设置合理的更新频率，控制实体可见性。

**Q: 如何处理作弊？**
A: 所有游戏逻辑在服务器验证，客户端只发送输入，使用权限系统限制操作。

**Q: 预测错误如何处理？**
A: 框架自动处理回滚和重模拟，你只需要实现确定性的游戏逻辑。

## 相关模块

- [`bevy_app`](../bevy_app/README.md) - 应用程序框架
- [`bevy_ecs`](../bevy_ecs/README.md) - ECS 系统
- [`bevy_input`](../bevy_input/README.md) - 输入系统
- [`bevy_transform`](../bevy_transform/README.md) - 变换系统