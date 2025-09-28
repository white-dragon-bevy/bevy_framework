# Bevy ECS 模块操作手册

## 模块概述

`bevy_ecs` 是 Bevy ECS 系统在 Roblox 平台上的 TypeScript 实现，基于 `@rbxts/matter` 框架。提供类 Bevy 的 ECS API，支持实体、组件、系统、资源和消息处理。

**核心特性**：
- 命令缓冲系统 (CommandBuffer)
- 资源管理系统 (ResourceManager)
- 事件系统 (Event) - 推送式即时响应
- 消息系统 (Message) - 拉取式批量处理
- 系统调度器 (Schedule)

---

## 核心概念

### 1. 命令缓冲 (CommandBuffer)

延迟执行的命令队列，用于安全地批量修改 ECS 世界状态。

```typescript
import { CommandBuffer } from "bevy_ecs";

const commands = new CommandBuffer();

// 生成实体
const entityId = commands.spawn([
	HealthComponent({ value: 100 }),
	NameComponent({ name: new Name("Player") })
]);

// 添加/移除组件
commands.addComponent(entityId, SpeedComponent({ value: 5 }));
commands.removeComponent(entityId, HealthComponent);

// 销毁实体
commands.despawn(entityId);

// 执行所有命令
commands.flush(world, resourceManager);
```

**关键点**：
- 命令不会立即执行，需要调用 `flush()`
- `spawn()` 返回临时 ID，flush 后映射为真实 ID
- 支持自定义命令扩展

### 2. 资源管理 (ResourceManager)

全局唯一的资源存储系统，独立于 ECS 组件。

```typescript
import { ResourceManager } from "bevy_ecs";

// 定义资源类
class GameConfig {
	maxPlayers = 4;
	gameDuration = 300;
}

const resources = new ResourceManager();

// 插入资源（宏函数，自动提供 id 和 text）
resources.insertResource(new GameConfig());

// 获取资源
const config = resources.getResource<GameConfig>();
if (config) {
	print(`Max players: ${config.maxPlayers}`);
}

// 获取或插入默认值
const ensured = resources.getOrInsertDefaultResource(GameConfig);

// 修改资源
resources.withResourceMut<GameConfig>((config) => {
	config.maxPlayers = 8;
});

// 移除资源
resources.removeResource<GameConfig>();
```

**宏函数说明**：
```typescript
// 这些方法的 id 和 text 参数由 Flamework 宏自动注入
getResource<T>(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T, "text">)
insertResource<T>(resource: T, id?, text?)
removeResource<T>(id?, text?)
```

### 3. 事件系统 (Event)

基于 `rbx-better-signal` 的推送式事件系统，适合低频即时响应。

```typescript
import { EventManager, Event, EntityEvent } from "bevy_ecs";

// 定义全局事件
class DamageEvent implements Event {
	readonly eventType = "DamageEvent";
	constructor(public amount: number) {}
}

// 定义实体事件
class EntityDamageEvent implements EntityEvent {
	readonly eventType = "EntityDamageEvent";
	constructor(public entity: Entity, public damage: number) {}

	getEventTarget(): Entity { return this.entity; }
	setEventTarget(entity: Entity): void { this.entity = entity; }
}

// 使用事件管理器
const eventManager = new EventManager(world);

// 注册并添加观察者
eventManager.registerEventType(DamageEvent);
const connection = eventManager.addObserver(DamageEvent, (event, world) => {
	print(`Damage received: ${event.amount}`);
});

// 触发事件（立即执行所有观察者）
eventManager.trigger(new DamageEvent(50));

// 实体特定观察者
const entity = world.spawn();
eventManager.addEntityObserver(entity, EntityDamageEvent, (event, world) => {
	print(`Entity ${event.entity} damaged!`);
});

// 清理
connection.disconnect();
eventManager.cleanupEntity(entity);
```

### 4. 消息系统 (Message)

拉取式消息队列，适合高频批量处理（如输入、网络数据）。

```typescript
import { MessageRegistry, Message, MessageWriter, MessageReader } from "bevy_ecs";

// 定义消息类
class InputMessage implements Message {
	constructor(
		public readonly key: string,
		public readonly pressed: boolean,
		public readonly timestamp?: number
	) {}
}

const messageRegistry = new MessageRegistry(world);

// 创建写入器和读取器
const writer = messageRegistry.createWriter<InputMessage>();
const reader = messageRegistry.createReader<InputMessage>();

// 写入消息（不会立即处理）
writer.send(new InputMessage("W", true));
writer.send(new InputMessage("A", false));

// 批量写入
const batch = [
	new InputMessage("W", true),
	new InputMessage("D", true)
];
writer.sendBatch(batch);

// 系统中读取消息
function inputSystem() {
	const messages = reader.read();
	for (const msg of messages) {
		print(`Key ${msg.key}: ${msg.pressed}`);
	}

	// 检查是否有新消息
	if (!reader.isEmpty()) {
		// 处理逻辑
	}
}

// 双缓冲更新（通常在调度系统中调用）
messageRegistry.updateAll();

// 清理
messageRegistry.cleanup();
```

**Event vs Message**：

| 特性 | Event (推送) | Message (拉取) |
|------|-------------|---------------|
| 触发方式 | 立即执行观察者 | 延迟读取处理 |
| 适用场景 | UI交互、碰撞检测 | 输入处理、网络同步 |
| 性能特点 | 低延迟 | 高吞吐 |
| 执行时机 | 触发时立即 | 系统调度时 |

### 5. 系统调度 (Schedule)

控制系统执行顺序和依赖关系。

```typescript
import { Schedule, system, after, before, chain } from "bevy_ecs";

// 定义系统函数
function movementSystem(world: World, deltaTime: number) {
	// 移动逻辑
}

function collisionSystem(world: World, deltaTime: number) {
	// 碰撞检测
}

function renderSystem(world: World, deltaTime: number) {
	// 渲染逻辑
}

// 创建调度
const schedule = new Schedule("Update");

// 添加系统并定义执行顺序
schedule.addSystems([
	system(movementSystem),
	system(collisionSystem).after(movementSystem),
	system(renderSystem).after(collisionSystem)
]);

// 链式系统（保证顺序执行）
schedule.addSystems(
	chain([
		movementSystem,
		collisionSystem,
		renderSystem
	])
);

// 条件执行
function shouldUpdate(): boolean {
	return true;
}

schedule.addSystems(
	system(movementSystem).when(shouldUpdate)
);

// 运行调度
schedule.run(world, deltaTime);
```

---

## API 详解

### CommandBuffer

| 方法 | 说明 |
|------|------|
| `spawn(components: Component[]): EntityId` | 生成实体，返回临时 ID |
| `despawn(entityId: EntityId): void` | 销毁实体 |
| `addComponent(entity, component): void` | 添加组件 |
| `removeComponent(entity, type): void` | 移除组件 |
| `insertResource(resource): void` | 插入资源 |
| `removeResource(type): void` | 移除资源 |
| `flush(world, resourceManager?): CommandResult[]` | 执行所有命令 |
| `clear(): void` | 清空命令队列 |
| `isEmpty(): boolean` | 检查是否为空 |
| `getCommandCount(): number` | 获取命令数量 |

### ResourceManager

| 方法 | 说明 |
|------|------|
| `getResource<T>(): T \| undefined` | 获取资源 |
| `insertResource<T>(resource: T): void` | 插入资源 |
| `removeResource<T>(): T \| undefined` | 移除并返回资源 |
| `hasResource<T>(): boolean` | 检查资源是否存在 |
| `getOrInsertDefaultResource<T>(ctor): T` | 获取或插入默认实例 |
| `withResource<T>(callback): ResourceManager` | 只读访问资源 |
| `withResourceMut<T>(callback): ResourceManager` | 可变访问资源 |
| `clear(): void` | 清空所有资源 |
| `getResourceCount(): number` | 获取资源数量 |

### EventManager

| 方法 | 说明 |
|------|------|
| `registerEventType<E>(eventType): EventKey` | 注册事件类型 |
| `trigger<E>(event): void` | 触发事件 |
| `addObserver<E>(type, callback): ObserverConnection` | 添加全局观察者 |
| `addEntityObserver<E>(entity, type, callback)` | 添加实体观察者 |
| `cleanupEntity(entity): void` | 清理实体观察者 |
| `cleanup(): void` | 清理所有观察者 |

### MessageRegistry

| 方法 | 说明 |
|------|------|
| `createWriter<M>(): MessageWriter<M>` | 创建消息写入器 |
| `createReader<M>(): MessageReader<M>` | 创建消息读取器 |
| `send<M>(message): void` | 直接发送消息 |
| `updateAll(): void` | 更新双缓冲区 |
| `cleanup(): void` | 清理消息存储 |
| `clearAll(): void` | 清空所有消息 |
| `getStats(): Record<string, Stats>` | 获取统计信息 |

---

## 实战示例

### 示例 1：玩家生命系统

```typescript
import { CommandBuffer, ResourceManager, EventManager, Event } from "bevy_ecs";

// 定义组件
class Health {
	constructor(public current: number, public max: number) {}
}

class Player {
	constructor(public name: string) {}
}

// 定义事件
class PlayerDeathEvent implements Event {
	readonly eventType = "PlayerDeathEvent";
	constructor(public playerEntity: Entity, public playerName: string) {}
}

// 资源
class GameStats {
	playerDeaths = 0;
}

// 系统实现
function damageSystem(
	world: World,
	deltaTime: number,
	commands: CommandBuffer,
	eventManager: EventManager
) {
	// 查询所有有生命值的实体
	for (const [entity, health, player] of world.query(Health, Player)) {
		health.current -= 10 * deltaTime;

		if (health.current <= 0) {
			// 触发死亡事件
			eventManager.trigger(new PlayerDeathEvent(entity, player.name));

			// 延迟销毁实体
			commands.despawn(entity);
		}
	}

	// 执行命令
	commands.flush(world);
}

// 事件处理
function setupEventHandlers(
	eventManager: EventManager,
	resources: ResourceManager
) {
	eventManager.registerEventType(PlayerDeathEvent);

	eventManager.addObserver(PlayerDeathEvent, (event, world) => {
		print(`Player ${event.playerName} died!`);

		// 更新统计
		resources.withResourceMut<GameStats>((stats) => {
			stats.playerDeaths += 1;
		});
	});
}

// 初始化
const world = new BevyWorld();
const commands = new CommandBuffer();
const resources = new ResourceManager();
const eventManager = new EventManager(world);

resources.insertResource(new GameStats());
setupEventHandlers(eventManager, resources);

// 生成玩家
const player = commands.spawn([
	new Health(100, 100),
	new Player("Alice")
]);
commands.flush(world);
```

### 示例 2：输入处理系统

```typescript
import { MessageRegistry, MessageWriter, MessageReader, Message } from "bevy_ecs";

// 输入消息
class InputMessage implements Message {
	constructor(
		public readonly key: Enum.KeyCode,
		public readonly state: "press" | "release",
		public readonly timestamp?: number
	) {}
}

// 移动组件
class Velocity {
	constructor(public x: number, public y: number) {}
}

class Speed {
	constructor(public value: number) {}
}

// 输入采集（客户端）
function collectInputSystem(writer: MessageWriter<InputMessage>) {
	const UserInputService = game.GetService("UserInputService");

	UserInputService.InputBegan.Connect((input) => {
		writer.send(new InputMessage(input.KeyCode, "press"));
	});

	UserInputService.InputEnded.Connect((input) => {
		writer.send(new InputMessage(input.KeyCode, "release"));
	});
}

// 输入处理系统
function processInputSystem(
	world: World,
	deltaTime: number,
	reader: MessageReader<InputMessage>
) {
	const messages = reader.read();

	// 处理所有输入消息
	for (const msg of messages) {
		// 查询玩家实体
		for (const [entity, velocity, speed] of world.query(Velocity, Speed)) {
			if (msg.key === Enum.KeyCode.W && msg.state === "press") {
				velocity.y = speed.value;
			}

			if (msg.key === Enum.KeyCode.S && msg.state === "press") {
				velocity.y = -speed.value;
			}

			if (msg.state === "release") {
				velocity.y = 0;
			}
		}
	}
}

// 移动系统
function movementSystem(world: World, deltaTime: number) {
	for (const [entity, velocity] of world.query(Velocity)) {
		// 实际移动逻辑
		const instance = getEntityInstance(entity);
		if (instance) {
			instance.CFrame = instance.CFrame.add(
				new Vector3(velocity.x, velocity.y, 0).mul(deltaTime)
			);
		}
	}
}

// 初始化
const messageRegistry = new MessageRegistry(world);
const inputWriter = messageRegistry.createWriter<InputMessage>();
const inputReader = messageRegistry.createReader<InputMessage>();

collectInputSystem(inputWriter);

// 主循环
RunService.Heartbeat.Connect((deltaTime) => {
	processInputSystem(world, deltaTime, inputReader);
	movementSystem(world, deltaTime);
	messageRegistry.updateAll(); // 更新双缓冲
});
```

### 示例 3：完整的游戏系统调度

```typescript
import {
	Schedule, system, chain, after,
	CommandBuffer, ResourceManager, MessageRegistry
} from "bevy_ecs";

// 游戏状态资源
class GameState {
	isPaused = false;
	score = 0;
}

// 系统定义
function inputSystem(world: World, dt: number, context: SystemContext) {
	const reader = context.messageReader;
	// 处理输入
}

function physicsSystem(world: World, dt: number) {
	// 物理更新
}

function collisionSystem(world: World, dt: number, context: SystemContext) {
	const commands = context.commands;
	// 碰撞检测和处理
	commands.flush(world, context.resources);
}

function aiSystem(world: World, dt: number) {
	// AI 逻辑
}

function renderSystem(world: World, dt: number) {
	// 渲染更新
}

function uiSystem(world: World, dt: number, context: SystemContext) {
	const resources = context.resources;
	resources.withResource<GameState>((state) => {
		// 更新 UI 显示分数
	});
}

// 运行条件
function isNotPaused(resources: ResourceManager): boolean {
	const state = resources.getResource<GameState>();
	return state ? !state.isPaused : true;
}

// 构建调度系统
class GameScheduler {
	private updateSchedule: Schedule;
	private fixedUpdateSchedule: Schedule;

	constructor(
		private world: World,
		private commands: CommandBuffer,
		private resources: ResourceManager,
		private messageRegistry: MessageRegistry
	) {
		this.updateSchedule = new Schedule("Update");
		this.fixedUpdateSchedule = new Schedule("FixedUpdate");

		this.setupSchedules();
	}

	private setupSchedules() {
		// 主更新循环
		this.updateSchedule.addSystems([
			system(inputSystem),
			chain([
				physicsSystem,
				collisionSystem,
				aiSystem
			]).when(() => isNotPaused(this.resources)),
			system(renderSystem),
			system(uiSystem)
		]);

		// 固定更新循环
		this.fixedUpdateSchedule.addSystems([
			system(physicsSystem)
		]);
	}

	public runUpdate(deltaTime: number) {
		const context = {
			commands: this.commands,
			resources: this.resources,
			messageReader: this.messageRegistry.createReader<InputMessage>()
		};

		this.updateSchedule.run(this.world, deltaTime, context);
		this.messageRegistry.updateAll();
	}

	public runFixedUpdate(deltaTime: number) {
		this.fixedUpdateSchedule.run(this.world, deltaTime);
	}
}

// 使用
const world = new BevyWorld();
const commands = new CommandBuffer();
const resources = new ResourceManager();
const messageRegistry = new MessageRegistry(world);

resources.insertResource(new GameState());

const scheduler = new GameScheduler(world, commands, resources, messageRegistry);

// 主循环
RunService.Heartbeat.Connect((dt) => {
	scheduler.runUpdate(dt);
});

RunService.Stepped.Connect((_, dt) => {
	scheduler.runFixedUpdate(dt);
});
```

---

## 最佳实践

### 1. 资源管理

```typescript
// ✅ 使用 getOrInsertDefaultResource 避免 undefined 检查
const config = resources.getOrInsertDefaultResource(GameConfig);
config.maxPlayers = 8;

// ✅ 使用 withResourceMut 保证资源修改被保存
resources.withResourceMut<GameStats>((stats) => {
	stats.score += 10;
});

// ❌ 避免直接修改获取的资源
const stats = resources.getResource<GameStats>();
stats.score += 10; // 可能不会保存
```

### 2. 命令缓冲使用

```typescript
// ✅ 在系统末尾统一 flush
function mySystem(world: World, commands: CommandBuffer) {
	// 收集所有修改
	commands.spawn([...]);
	commands.despawn(entity);

	// 统一执行
	commands.flush(world);
}

// ❌ 避免多次 flush
commands.spawn([...]);
commands.flush(world); // 不推荐
commands.despawn(entity);
commands.flush(world); // 不推荐
```

### 3. 事件 vs 消息选择

```typescript
// ✅ 低频即时响应使用事件
class PlayerConnectedEvent implements Event {
	constructor(public player: Player) {}
}
eventManager.trigger(new PlayerConnectedEvent(player));

// ✅ 高频批量处理使用消息
class NetworkPacketMessage implements Message {
	constructor(public data: Buffer) {}
}
writer.sendBatch(packets);
```

### 4. 系统调度优化

```typescript
// ✅ 使用 chain 保证严格顺序
schedule.addSystems(
	chain([
		physicsSystem,
		collisionSystem, // 必须在 physics 后
		renderSystem     // 必须在 collision 后
	])
);

// ✅ 使用条件避免不必要的执行
schedule.addSystems(
	system(expensiveSystem).when(() => shouldRun())
);

// ✅ 使用 after/before 定义松散依赖
schedule.addSystems([
	system(aiSystem).after(physicsSystem),
	system(audioSystem).before(renderSystem)
]);
```

### 5. 内存管理

```typescript
// ✅ 及时清理事件观察者
const connection = eventManager.addObserver(MyEvent, handler);
// 不再需要时
connection.disconnect();

// ✅ 清理实体观察者
eventManager.cleanupEntity(entity);

// ✅ 定期清理消息
messageRegistry.cleanup();

// ✅ 读取器清理
reader.cleanup();
```

### 6. 类型安全

```typescript
// ✅ 使用泛型保证类型安全
const config = resources.getResource<GameConfig>();
if (config !== undefined) {
	// TypeScript 知道 config 的类型
	config.maxPlayers = 8;
}

// ✅ 使用宏自动推断类型
resources.insertResource(new GameConfig()); // 自动类型推断

// ❌ 避免类型断言
const config = resources.getResource() as GameConfig; // 不推荐
```

---

## API 参考表

### 核心类型

| 类型 | 说明 |
|------|------|
| `Entity` | Matter 的实体类型 (AnyEntity) |
| `Component` | Matter 的组件类型 (AnyComponent) |
| `World` | Matter 的世界类型 |
| `Resource` | 资源基础接口 |
| `Event` | 事件基础接口 |
| `Message` | 消息基础接口 |
| `SystemFunction` | 系统函数类型 `(world, dt) => void` |

### 命令类型

| 命令类型 | 说明 |
|---------|------|
| `CommandType.Spawn` | 生成实体 |
| `CommandType.Despawn` | 销毁实体 |
| `CommandType.AddComponent` | 添加组件 |
| `CommandType.RemoveComponent` | 移除组件 |
| `CommandType.InsertResource` | 插入资源 |
| `CommandType.RemoveResource` | 移除资源 |

### 调度相关

| 函数/类 | 说明 |
|--------|------|
| `system(fn)` | 包装系统函数 |
| `systemArray([...])` | 包装系统数组 |
| `chain([...])` | 链式系统 |
| `after(system)` | 在某系统之后 |
| `before(system)` | 在某系统之前 |
| `when(condition)` | 条件执行 |
| `inSet(set)` | 加入系统集 |

---

## 性能提示

1. **批量操作**：使用 `writeBatch()` 代替多次 `send()`
2. **命令缓冲**：尽量减少 `flush()` 调用次数
3. **事件清理**：及时断开不需要的观察者连接
4. **消息更新**：在合适的时机调用 `updateAll()`，不要过于频繁
5. **资源访问**：频繁访问的资源可以缓存引用（只读）

---

## 常见陷阱

1. **忘记 flush**：命令不会自动执行
2. **宏参数混淆**：不要手动提供 `id` 和 `text` 参数
3. **事件内存泄漏**：未断开的观察者连接会保持引用
4. **消息时序**：理解双缓冲机制，避免读取时序问题
5. **资源修改**：直接修改获取的资源可能不会保存，使用 `withResourceMut`

---

## 调试技巧

```typescript
// 查看命令队列状态
print(`Pending commands: ${commands.getCommandCount()}`);

// 查看资源列表
print(`Resource count: ${resources.getResourceCount()}`);
for (const id of resources.getResourceIds()) {
	print(`Resource ID: ${id}`);
}

// 查看消息统计
const stats = messageRegistry.getStats();
print(stats);

// 检查观察者连接
if (connection.isConnected()) {
	print("Observer is active");
}
```

---

## 相关文档

- [Matter ECS 文档](https://eryn.io/matter/)
- [Bevy ECS 官方文档](https://bevyengine.org/learn/book/getting-started/ecs/)
- `src/bevy_ecs/README.md` - 模块技术文档
- `src/bevy_ecs/README_EVENTS.md` - 事件系统详细说明