# Simple Replication

简单的网络复制插件，提供客户端-服务器状态同步功能。

## 概述

Simple Replication 插件为 Bevy Framework 提供基础的网络状态同步功能。它基于原项目中的复制系统代码，封装成易于使用的插件形式，适合开发时的快速原型开发和简单的多人游戏同步需求。

## 功能特性

- **自动状态同步**: 自动将服务器端的实体和组件状态同步到客户端
- **选择性复制**: 支持配置哪些组件需要同步到所有玩家，哪些只同步给特定玩家
- **调试支持**: 内置调试日志系统，方便开发时追踪同步问题
- **灵活配置**: 支持自定义更新率、包大小等参数

## 安装

```typescript
import { SimpleReplicationPlugin } from "./simple_replication";
```

## 基本用法

### 创建插件实例

```typescript
import { App } from "../bevy_app";
import { SimpleReplicationPlugin } from "./simple_replication";

// 定义需要同步的组件
const replicatedComponents = {
    toAllPlayers: new Set([PositionComponent, HealthComponent]),
    toSelfOnly: new Set([InputComponent, CameraComponent])
};

// 创建插件配置
const config = {
    debugEnabled: true,
    updateRate: 30,
    maxPacketSize: 4096
};

// 创建并添加插件
const app = App.create()
    .addPlugin(new SimpleReplicationPlugin(config, replicatedComponents))
    .run();
```

### 使用链式API配置组件

```typescript
const plugin = new SimpleReplicationPlugin({ debugEnabled: true })
    .addReplicatedToAll(PositionComponent)
    .addReplicatedToAll(HealthComponent)
    .addReplicatedToSelf(InputComponent);

app.addPlugin(plugin);
```

## 配置选项

### SimpleReplicationConfig

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `debugEnabled` | `boolean` | `false` | 启用调试日志输出 |
| `debugSignal` | `boolean` | `false` | 启用调试信号 |
| `updateRate` | `number` | `30` | 每秒更新次数 |
| `maxPacketSize` | `number` | `4096` | 最大网络包大小（字节） |

## 工作原理

### 服务器端

1. **初始同步**: 当新客户端连接时，服务器会发送所有相关实体的完整状态
2. **增量更新**: 监听组件变化，只发送变化的数据给客户端
3. **选择性发送**: 根据配置决定哪些组件发送给哪些客户端

### 客户端

1. **接收数据**: 监听服务器发送的复制数据包
2. **实体管理**: 自动创建、更新或删除本地实体
3. **组件同步**: 更新本地组件数据以匹配服务器状态

## 系统集成

插件会自动将以下系统添加到应用中：

- **服务器端**: `serverReplicationSystem` - 在 `POST_UPDATE` 阶段运行
- **客户端**: `clientReceiveSystem` - 在 `PRE_UPDATE` 阶段运行

## 注意事项

1. **网络实现**: 本插件依赖外部网络库（如 Zap）来实现实际的网络通信
2. **组件注册**: 需要确保所有要同步的组件都已在系统中正确注册
3. **性能考虑**: 大量实体同步时需要注意网络带宽和性能开销
4. **错误处理**: 生产环境中需要添加额外的错误处理和重连逻辑

## 调试

启用调试模式后，插件会在控制台输出详细的同步信息：

```typescript
const plugin = new SimpleReplicationPlugin({
    debugEnabled: true,
    debugSignal: true
});
```

调试信息包括：
- 实体创建/删除事件
- 组件更新详情
- 网络数据包内容
- 同步时序信息

## 扩展

如需自定义同步逻辑，可以：

1. 继承 `SimpleReplicationPlugin` 类
2. 重写 `setupServer` 或 `setupClient` 方法
3. 添加自定义的系统或处理逻辑

## 相关模块

- `bevy_app` - 应用框架
- `@rbxts/matter` - ECS系统
- 网络库（Zap/自定义）- 网络通信实现