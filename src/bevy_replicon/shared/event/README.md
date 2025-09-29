# Bevy Replicon 事件系统

事件系统实现了客户端和服务器之间的双向事件通信。

## 功能特性

- ✅ 客户端事件发送队列（客户端 → 服务器）
- ✅ 服务器端客户端事件接收队列
- ✅ 服务器事件发送队列（服务器 → 客户端）
- ✅ 客户端服务器事件接收队列
- ✅ 三种发送模式（广播、单播、排除广播）
- ✅ 自动序列化/反序列化
- ✅ 类型安全的事件包装器
- ✅ 多通道支持

## 基本使用

### 1. 定义事件类型

```typescript
interface PlayerMoveEvent {
	x: number;
	y: number;
	timestamp: number;
}
```

### 2. 注册客户端事件

```typescript
import { Channel } from "../backend/channels";
import { RemoteEventRegistry, addClientEventQueue, addFromClientEventQueue } from "./event";

// 在客户端和服务器都需要注册事件
const registry = world.resources.getResource<RemoteEventRegistry>()!;

registry.registerClientEvent<PlayerMoveEvent>(
	"PlayerMoveEvent",
	Channel.Ordered,
	(event) => HttpService.JSONEncode(event),  // 序列化函数
	(data) => HttpService.JSONDecode(data) as PlayerMoveEvent,  // 反序列化函数
);
```

### 3. 客户端：添加发送队列

```typescript
import { addClientEventQueue, getClientEventQueue } from "./client-event";

// 添加事件队列
addClientEventQueue<PlayerMoveEvent>(world, "PlayerMoveEvent");

// 发送事件
const queue = getClientEventQueue<PlayerMoveEvent>(world, "PlayerMoveEvent")!;
queue.send({
	x: 10,
	y: 20,
	timestamp: os.clock(),
});
```

### 4. 服务器：添加接收队列

```typescript
import { addFromClientEventQueue, getFromClientEventQueue } from "./server-receive-client-events";

// 添加接收队列
addFromClientEventQueue<PlayerMoveEvent>(world, "PlayerMoveEvent");

// 读取接收到的事件
function handlePlayerMove(world: BevyWorld, context: Context) {
	const queue = getFromClientEventQueue<PlayerMoveEvent>(world, "PlayerMoveEvent")!;

	for (const { clientId, event } of queue.read()) {
		print(`Client ${clientId} moved to (${event.x}, ${event.y}) at ${event.timestamp}`);
		// 处理玩家移动逻辑...
	}
}
```

### 5. 添加系统到调度

```typescript
import { sendClientEvents, receiveClientEvents, clearClientEventQueues } from "./event";

// 客户端：添加发送系统（PostUpdate 阶段）
app.addSystem("PostUpdate", sendClientEvents);

// 服务器：添加接收和清空系统
app.addSystem("PreUpdate", receiveClientEvents);  // 接收事件
app.addSystem("Update", handlePlayerMove);       // 处理事件
app.addSystem("Last", clearClientEventQueues);   // 清空队列
```

## 完整示例

```typescript
// === 共享代码（客户端和服务器） ===
interface PlayerActionEvent {
	action: "jump" | "attack" | "interact";
	targetPosition?: { x: number; y: number };
}

// 注册事件
function setupPlayerEvents(world: BevyWorld): void {
	const registry = world.resources.getResource<RemoteEventRegistry>()!;

	registry.registerClientEvent<PlayerActionEvent>(
		"PlayerActionEvent",
		Channel.Reliable,
		(event) => HttpService.JSONEncode(event),
		(data) => HttpService.JSONDecode(data) as PlayerActionEvent,
	);
}

// === 客户端代码 ===
import { RunService } from "@rbxts/services";

// 初始化
setupPlayerEvents(clientWorld);
addClientEventQueue<PlayerActionEvent>(clientWorld, "PlayerActionEvent");

// 使用
function onPlayerJump(): void {
	const queue = getClientEventQueue<PlayerActionEvent>(clientWorld, "PlayerActionEvent")!;
	queue.send({
		action: "jump",
	});
}

function onPlayerAttack(target: Vector3): void {
	const queue = getClientEventQueue<PlayerActionEvent>(clientWorld, "PlayerActionEvent")!;
	queue.send({
		action: "attack",
		targetPosition: { x: target.X, y: target.Y },
	});
}

// 添加发送系统
app.addSystem("PostUpdate", sendClientEvents);

// === 服务器代码 ===

// 初始化
setupPlayerEvents(serverWorld);
addFromClientEventQueue<PlayerActionEvent>(serverWorld, "PlayerActionEvent");

// 处理系统
function processPlayerActions(world: BevyWorld, context: Context): void {
	const queue = getFromClientEventQueue<PlayerActionEvent>(world, "PlayerActionEvent")!;

	for (const { clientId, event } of queue.read()) {
		switch (event.action) {
			case "jump":
				print(`Client ${clientId} jumped`);
				// 执行跳跃逻辑...
				break;
			case "attack":
				if (event.targetPosition) {
					print(`Client ${clientId} attacked at (${event.targetPosition.x}, ${event.targetPosition.y})`);
					// 执行攻击逻辑...
				}
				break;
			case "interact":
				print(`Client ${clientId} interacted`);
				// 执行交互逻辑...
				break;
		}
	}
}

// 添加系统
app.addSystem("PreUpdate", receiveClientEvents);
app.addSystem("Update", processPlayerActions);
app.addSystem("Last", clearClientEventQueues);
```

## API 参考

### ClientEventQueue<E>

客户端事件发送队列。

- `send(event: E)`: 添加事件到发送队列
- `drain()`: 清空并返回所有待发送事件
- `size()`: 获取队列大小
- `clear()`: 清空队列

### FromClientEventQueue<E>

服务器端客户端事件接收队列。

- `push(event: FromClient<E>)`: 添加接收到的事件
- `read()`: 读取所有接收到的事件
- `clear()`: 清空队列
- `size()`: 获取队列大小

### 系统函数

- `sendClientEvents(world, deltaTime)`: 发送客户端事件（客户端 PostUpdate 阶段）
- `receiveClientEvents(world, deltaTime)`: 接收客户端事件（服务器 PreUpdate 阶段）
- `clearClientEventQueues(world, deltaTime)`: 清空队列（服务器 Last 阶段）

### 辅助函数

- `addClientEventQueue<E>(world, typeName)`: 为指定事件类型添加发送队列
- `getClientEventQueue<E>(world, typeName)`: 获取客户端事件队列
- `addFromClientEventQueue<E>(world, typeName)`: 为指定事件类型添加接收队列
- `getFromClientEventQueue<E>(world, typeName)`: 获取服务器端接收队列

## 注意事项

1. **消息格式**: 消息使用 `"EventType|SerializedData"` 格式，确保序列化后的数据不包含 `|` 字符
2. **错误处理**: 序列化失败的事件会被跳过并输出警告，不会中断系统运行
3. **队列清空**: 服务器端的接收队列必须在每帧末尾清空，避免累积旧事件
4. **类型约束**: 事件类型 `E` 必须 extends `defined`，确保可以正确序列化
5. **客户端ID**: 服务器接收到的 `clientId` 实际上是客户端的 Matter Entity

## 服务器事件系统（服务器 → 客户端）

### 定义服务器事件

```typescript
interface EntitySpawnedEvent {
	entityId: number;
	position: { x: number; y: number };
	entityType: string;
}
```

### 注册服务器事件

```typescript
import { Channel } from "../backend/channels";
import { RemoteEventRegistry } from "./registry";

// 在服务器和客户端都需要注册
const registry = world.resources.getResource<RemoteEventRegistry>()!;

registry.registerServerEvent<EntitySpawnedEvent>(
	"EntitySpawnedEvent",
	Channel.Reliable,
	(event) => HttpService.JSONEncode(event),
	(data) => HttpService.JSONDecode(data) as EntitySpawnedEvent,
);
```

### 服务器：发送事件

```typescript
import { addServerEventQueue, getServerEventQueue } from "./server-event";
import { createClientId } from "../../types";

// 添加发送队列
addServerEventQueue<EntitySpawnedEvent>(world, "EntitySpawnedEvent");

// 获取队列并发送事件
const queue = getServerEventQueue<EntitySpawnedEvent>(world, "EntitySpawnedEvent")!;

// 方式 1: 广播给所有客户端
queue.broadcast({
	entityId: 123,
	position: { x: 10, y: 20 },
	entityType: "Enemy",
});

// 方式 2: 发送给特定客户端
const targetClientId = createClientId(5);
queue.direct(targetClientId, {
	entityId: 124,
	position: { x: 15, y: 25 },
	entityType: "Item",
});

// 方式 3: 广播给除指定客户端外的所有客户端
const excludeClientId = createClientId(3);
queue.broadcastExcept([excludeClientId], {
	entityId: 125,
	position: { x: 5, y: 10 },
	entityType: "NPC",
});
```

### 客户端：接收事件

```typescript
import { addReceivedServerEventQueue, getReceivedServerEventQueue } from "./client-receive-server-events";

// 添加接收队列
addReceivedServerEventQueue<EntitySpawnedEvent>(world, "EntitySpawnedEvent");

// 读取接收到的事件
function handleEntitySpawned(world: BevyWorld, context: Context): void {
	const queue = getReceivedServerEventQueue<EntitySpawnedEvent>(world, "EntitySpawnedEvent")!;

	for (const event of queue.read()) {
		print(`Entity ${event.entityId} spawned at (${event.position.x}, ${event.position.y})`);
		print(`Entity type: ${event.entityType}`);
		// 在客户端生成实体...
	}
}
```

### 添加系统到调度

```typescript
import { sendServerEvents, receiveServerEvents, clearServerEventQueues } from "./event";

// 服务器：添加发送系统（PostUpdate 阶段）
app.addSystem("PostUpdate", sendServerEvents);

// 客户端：添加接收和清空系统
app.addSystem("PreUpdate", receiveServerEvents);  // 接收事件
app.addSystem("Update", handleEntitySpawned);     // 处理事件
app.addSystem("Last", clearServerEventQueues);    // 清空队列
```

## 完整的双向通信示例

```typescript
// === 共享代码 ===
interface ChatMessageEvent {
	sender: string;
	message: string;
	timestamp: number;
}

function setupChatEvents(world: BevyWorld): void {
	const registry = world.resources.getResource<RemoteEventRegistry>()!;
	const HttpService = game.GetService("HttpService");

	// 客户端 → 服务器
	registry.registerClientEvent<ChatMessageEvent>(
		"ChatMessageEvent",
		Channel.Reliable,
		(event) => HttpService.JSONEncode(event),
		(data) => HttpService.JSONDecode(data) as ChatMessageEvent,
	);

	// 服务器 → 客户端
	registry.registerServerEvent<ChatMessageEvent>(
		"ChatMessageBroadcast",
		Channel.Reliable,
		(event) => HttpService.JSONEncode(event),
		(data) => HttpService.JSONDecode(data) as ChatMessageEvent,
	);
}

// === 客户端代码 ===
setupChatEvents(clientWorld);
addClientEventQueue<ChatMessageEvent>(clientWorld, "ChatMessageEvent");
addReceivedServerEventQueue<ChatMessageEvent>(clientWorld, "ChatMessageBroadcast");

// 发送聊天消息
function sendChatMessage(message: string): void {
	const queue = getClientEventQueue<ChatMessageEvent>(clientWorld, "ChatMessageEvent")!;
	queue.send({
		sender: player.Name,
		message: message,
		timestamp: os.clock(),
	});
}

// 接收广播的聊天消息
function displayChatMessages(world: BevyWorld, context: Context): void {
	const queue = getReceivedServerEventQueue<ChatMessageEvent>(world, "ChatMessageBroadcast")!;

	for (const event of queue.read()) {
		print(`[${event.timestamp}] ${event.sender}: ${event.message}`);
		// 显示聊天消息到 UI...
	}
}

// === 服务器代码 ===
setupChatEvents(serverWorld);
addFromClientEventQueue<ChatMessageEvent>(serverWorld, "ChatMessageEvent");
addServerEventQueue<ChatMessageEvent>(serverWorld, "ChatMessageBroadcast");

// 接收并广播聊天消息
function broadcastChatMessages(world: BevyWorld, context: Context): void {
	const receiveQueue = getFromClientEventQueue<ChatMessageEvent>(world, "ChatMessageEvent")!;
	const sendQueue = getServerEventQueue<ChatMessageEvent>(world, "ChatMessageBroadcast")!;

	for (const { clientId, event } of receiveQueue.read()) {
		// 验证消息（可选）
		if (event.message.size() > 0 && event.message.size() <= 200) {
			// 广播给所有客户端
			sendQueue.broadcast(event);
			print(`Broadcasting chat from client ${clientId}: ${event.message}`);
		}
	}
}
```

## API 参考（服务器事件）

### ServerEventQueue<E>

服务器事件发送队列。

- `broadcast(event: E)`: 广播事件给所有客户端
- `direct(clientId: ClientId, event: E)`: 发送事件给指定客户端
- `broadcastExcept(excludeIds: ClientId[], event: E)`: 广播给除指定客户端外的所有客户端
- `send(toClients: ToClients<E>)`: 通用发送方法
- `drain()`: 清空并返回所有待发送事件
- `size()`: 获取队列大小
- `clear()`: 清空队列

### ReceivedServerEventQueue<E>

客户端服务器事件接收队列。

- `push(event: E)`: 添加接收到的事件
- `read()`: 读取所有接收到的事件
- `clear()`: 清空队列
- `size()`: 获取队列大小

### 系统函数（服务器事件）

- `sendServerEvents(world, deltaTime)`: 发送服务器事件（服务器 PostUpdate 阶段）
- `receiveServerEvents(world, deltaTime)`: 接收服务器事件（客户端 PreUpdate 阶段）
- `clearServerEventQueues(world, deltaTime)`: 清空队列（客户端 Last 阶段）

### 辅助函数（服务器事件）

- `addServerEventQueue<E>(world, typeName)`: 为指定事件类型添加发送队列（服务器）
- `getServerEventQueue<E>(world, typeName)`: 获取服务器事件发送队列
- `addReceivedServerEventQueue<E>(world, typeName)`: 为指定事件类型添加接收队列（客户端）
- `getReceivedServerEventQueue<E>(world, typeName)`: 获取客户端接收队列

## SendMode 枚举

```typescript
enum SendMode {
	Broadcast = "Broadcast",           // 广播给所有客户端
	Direct = "Direct",                  // 发送给特定客户端
	BroadcastExcept = "BroadcastExcept", // 广播给除指定客户端外的所有客户端
}
```

## 注意事项

### 客户端事件（客户端 → 服务器）

1. **消息格式**: 消息使用 `"EventType|SerializedData"` 格式
2. **错误处理**: 序列化失败的事件会被跳过并输出警告
3. **队列清空**: 服务器端的接收队列必须在每帧末尾清空
4. **类型约束**: 事件类型 `E` 必须 extends `defined`
5. **客户端ID**: 服务器接收到的 `clientId` 实际上是客户端的 Matter Entity

### 服务器事件（服务器 → 客户端）

1. **三种发送模式**: 支持 Broadcast、Direct 和 BroadcastExcept
2. **客户端列表**: 当前从 `ServerMessages.getConnectedClients()` 获取，未来将从 ECS 组件查询
3. **消息格式**: 与客户端事件相同，使用 `"EventType|SerializedData"` 格式
4. **队列清空**: 客户端的接收队列必须在每帧末尾清空
5. **类型安全**: 使用 `ToClients<E>` 包装器确保类型安全

## 下一步

- ✅ 服务器事件系统已实现
- ⏳ 添加实体映射支持
- ⏳ 实现触发器 API（Trigger）
- ⏳ 添加独立事件模式支持