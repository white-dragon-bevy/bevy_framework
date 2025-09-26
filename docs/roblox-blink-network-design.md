# Roblox Blink Network - 基于 IDL 的网络层设计文档

## 概述

`roblox_blink_network` 是一个基于 [Blink IDL 编译器](https://github.com/1Axen/blink) 的网络层解决方案。Blink 是一个专为 Roblox 设计的 IDL（接口定义语言）编译器，通过生成高性能的 buffer 网络代码，提供类型安全和带宽优化的通信方案。

## Blink 核心概念

### 什么是 Blink？

Blink **不是一个运行时库**，而是一个**编译器**：
- 输入：`.blink` IDL 文件（定义网络协议）
- 输出：Luau 代码（处理序列化、验证和网络传输）
- 可选输出：TypeScript 类型定义

### 为什么使用 Blink？

1. **性能提升**: 比原生 RemoteEvent 快 1.6-3.7 倍
2. **带宽优化**: 减少高达 1000 倍的网络流量
3. **类型安全**: 编译时类型检查，运行时数据验证
4. **安全性**: 自动验证客户端数据，防止恶意输入
5. **开发效率**: 自动生成网络代码，减少样板代码

## 架构设计

```
roblox_blink_network/
├── 协议定义层 (IDL)
│   ├── .blink 文件定义网络协议
│   ├── 编译时生成 Luau 代码
│   └── 可选生成 TypeScript 类型
├── 生成代码层 (Generated)
│   ├── 服务端网络代码
│   ├── 客户端网络代码
│   └── 共享类型定义
├── 抽象封装层 (Wrapper)
│   ├── 事件系统封装
│   ├── 连接管理
│   └── 错误处理
└── 应用集成层 (Integration)
    ├── Bevy 插件接口
    ├── 事件资源
    └── 系统集成
```

## 项目结构

```
src/
├── protocols/                      # IDL 协议定义
│   ├── manifest.json              # 协议清单（集中管理）
│   ├── core/                      # 核心协议
│   │   └── core.blink
│   ├── replicon/                  # Replicon 插件协议
│   │   └── replicon.blink
│   ├── combat/                    # 战斗插件协议
│   │   └── combat.blink
│   └── ui/                        # UI 插件协议
│       └── ui.blink
├── generated/                      # Blink 生成的代码
│   ├── index.ts                   # 统一导出
│   ├── registry.ts                # 协议注册表
│   ├── core/
│   │   ├── server.luau
│   │   ├── client.luau
│   │   └── types.d.ts
│   ├── replicon/
│   ├── combat/
│   └── ui/
├── build/                          # 构建脚本
│   ├── compile-protocols.ts       # 编译所有协议
│   ├── add-protocol.ts           # 添加新协议工具
│   └── protocol-registry.ts      # 生成注册表
├── roblox_blink_network/          # 网络层封装
│   ├── index.ts                  # 主入口
│   ├── plugin.ts                 # BlinkNetworkPlugin
│   ├── protocol-manager.ts       # 协议管理器（新）
│   ├── network-manager.ts        # 网络管理器
│   ├── event-system.ts          # 事件系统
│   ├── connection.ts            # 连接管理
│   └── diagnostics.ts           # 诊断工具
└── __tests__/
    └── network.spec.ts
```

## IDL 协议定义

### 基础语法

```blink
// protocols/core/core.blink

// 配置生成路径
option TypesOutput = "../../generated/core/types.luau"
option ServerOutput = "../../generated/core/server.luau"
option ClientOutput = "../../generated/core/client.luau"
option GenerateTypeScriptDefinitions = true

// 使用命名空间避免冲突
namespace Core

// 定义数据结构
struct Vector3 {
    x: f32,
    y: f32,
    z: f32
}

// 定义枚举
enum GameState: u8 {
    Waiting,
    Starting,
    InProgress,
    Finished
}

// 客户端到服务端事件
event PlayerInput {
    From: Client,
    Type: Reliable,
    Call: SingleSync,
    Data: {
        moveDirection: Vector3,
        jump: boolean,
        attack: boolean,
        timestamp: f64
    }
}

// 服务端到客户端事件
event WorldSnapshot {
    From: Server,
    Type: Unreliable,
    Call: MultiSync,
    Data: {
        entities: map<u32, EntityState>,
        timestamp: f64,
        tickNumber: u32
    }
}

// 双向事件（函数调用）
function GetPlayerStats {
    Yield: Coroutine,
    Data: {
        playerId: u32
    },
    Return: {
        kills: u16,
        deaths: u16,
        score: i32
    }
}
```

### 数据类型

Blink 支持的基础类型：
- 数字类型: `u8`, `u16`, `u32`, `i8`, `i16`, `i32`, `f32`, `f64`
- 布尔类型: `boolean`
- 字符串: `string`
- 向量: `vec2`, `vec3`
- CFrame: `cframe`
- 数组: `type[]` 或 `type[size]`
- 映射: `map<K, V>`
- 可选类型: `type?`

### 事件类型

1. **可靠事件 (Reliable)**
   - 保证送达
   - 有序处理
   - 适用于关键状态更新

2. **不可靠事件 (Unreliable)**
   - 低延迟
   - 不保证送达
   - 适用于高频更新（如位置同步）

## 多插件协议集中管理

### 问题分析

当多个插件都需要网络通信时，会面临以下挑战：

1. **协议冲突** - 不同插件可能定义相同名称的事件
2. **构建复杂** - 每个插件单独编译 IDL 文件
3. **代码分散** - 生成的代码分布在各处
4. **版本管理** - 协议更新需要协调多个插件

### 解决方案：协议清单系统

**重要说明**：manifest.json 不是 Blink 的功能，而是我们在 Blink 之上构建的编排层，用于管理多个独立的 .blink 协议文件。

#### 编排架构

```
[manifest.json]     我们的编排层
       ↓
[编译脚本]          调用 Blink CLI
       ↓
[Blink 编译器]      处理每个 .blink 文件
       ↓
[生成代码]          Luau/TypeScript 代码
```

使用清单文件集中管理所有协议：

```json
// protocols/manifest.json - 我们自定义的配置文件
{
  "protocols": [
    {
      "name": "core",
      "namespace": "Core",          // 映射到 Blink 的 namespace 特性
      "path": "core/core.blink",
      "description": "核心网络协议"
    },
    {
      "name": "replicon",
      "namespace": "Replicon",      // 每个协议独立的命名空间
      "path": "replicon/replicon.blink",
      "description": "实体复制协议",
      "dependencies": ["core"]      // 依赖管理（我们的功能）
    },
    {
      "name": "combat",
      "namespace": "Combat",
      "path": "combat/combat.blink",
      "description": "战斗系统协议",
      "dependencies": ["core", "replicon"]
    },
    {
      "name": "ui",
      "namespace": "UI",
      "path": "ui/ui.blink",
      "description": "UI通信协议",
      "dependencies": ["core"]
    }
  ],
  "options": {
    "outputDir": "../generated",    // 统一输出目录
    "generateTypeScript": true,     // 传递给 Blink 的选项
    "generateLuau": true
  }
}
```

#### manifest.json 如何利用 Blink 特性

1. **利用 Blink 的 namespace 特性**
```blink
// 每个 .blink 文件使用独立的命名空间
namespace Replicon

event EntitySpawn { ... }  // 自动成为 Replicon.EntitySpawn
```

2. **利用 Blink 的编译选项**
```blink
// Blink 原生支持的选项
option TypesOutput = "path/to/types.luau"
option ServerOutput = "path/to/server.luau"
option ClientOutput = "path/to/client.luau"
```

3. **我们的编译脚本动态注入这些选项**
```typescript
// 为每个协议生成独立的输出配置
const config = `
  option TypesOutput = "${outputDir}/${protocol.name}/types.luau"
  option ServerOutput = "${outputDir}/${protocol.name}/server.luau"
  option ClientOutput = "${outputDir}/${protocol.name}/client.luau"
`;
// 然后调用: blink compile ${protocol.path} --config "${config}"
```

### 统一编译脚本（我们的编排层实现）

```typescript
// build/compile-protocols.ts
// 这是我们自己实现的编排脚本，不是 Blink 的一部分
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface ProtocolManifest {
	protocols: Array<{
		name: string;
		namespace: string;        // 对应 Blink 的 namespace
		path: string;
		dependencies?: string[];  // 我们自己的依赖管理
	}>;
	options: {
		outputDir: string;
		generateTypeScript: boolean;
		generateLuau: boolean;
	};
}

export class ProtocolCompiler {
	private manifest: ProtocolManifest;

	constructor(manifestPath: string) {
		// 读取我们的 manifest.json
		this.manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	}

	compileAll(): void {
		// 1. 按依赖顺序编译（我们的逻辑）
		const sorted = this.topologicalSort();

		// 2. 逐个调用 Blink 编译器
		for (const protocol of sorted) {
			this.compileProtocol(protocol);
		}

		// 3. 生成统一导出文件（我们的功能）
		this.generateIndex();
		// 4. 生成注册表（我们的功能）
		this.generateRegistry();
	}

	private compileProtocol(protocol: any): void {
		const inputPath = path.join("protocols", protocol.path);
		const outputDir = path.join(this.manifest.options.outputDir, protocol.name);

		// 创建输出目录
		fs.mkdirSync(outputDir, { recursive: true });

		// 动态生成 Blink 配置（将 manifest 的配置转换为 Blink options）
		const config = `
			option TypesOutput = "${outputDir}/types.luau"
			option ServerOutput = "${outputDir}/server.luau"
			option ClientOutput = "${outputDir}/client.luau"
			option GenerateTypeScriptDefinitions = ${this.manifest.options.generateTypeScript}
		`;

		// 调用 Blink CLI 编译单个协议文件
		execSync(`blink compile ${inputPath} --config "${config}"`);
		console.log(`✓ Compiled ${protocol.name}`);
	}

	private generateIndex(): void {
		// 生成 TypeScript 导出文件
		const exports: string[] = [];

		for (const protocol of this.manifest.protocols) {
			exports.push(`export * as ${protocol.namespace} from "./${protocol.name}";`);
		}

		const indexContent = `// Auto-generated protocol exports
${exports.join("\n")}

// Protocol registry
export { ProtocolRegistry } from "./registry";
`;

		fs.writeFileSync(
			path.join(this.manifest.options.outputDir, "index.ts"),
			indexContent
		);
	}

	private generateRegistry(): void {
		// 生成协议注册表（我们的功能，用于运行时管理）
		const registryContent = `// Auto-generated protocol registry
// 这是我们生成的注册表，用于运行时动态查找协议
export class ProtocolRegistry {
	private static protocols = new Map<string, any>();

	static register(namespace: string, protocol: any): void {
		this.protocols.set(namespace, protocol);
	}

	static get(namespace: string): any {
		return this.protocols.get(namespace);
	}

	static getAll(): Map<string, any> {
		return new Map(this.protocols);
	}
}

// Auto-register all protocols
// 导入 Blink 生成的代码，并注册到我们的系统中
${this.manifest.protocols.map(p =>
	`import * as ${p.namespace} from "./${p.name}";
ProtocolRegistry.register("${p.namespace}", ${p.namespace});`
).join("\n")}
`;

		fs.writeFileSync(
			path.join(this.manifest.options.outputDir, "registry.ts"),
			registryContent
		);
	}

	private topologicalSort(): any[] {
		// 拓扑排序处理依赖（我们的功能）
		// 确保 core 在 replicon 之前编译
		// ... 实现略
		return this.manifest.protocols;
	}
}

// 执行编译
// 这整个流程是我们的编排，Blink 只负责编译单个 .blink 文件
```

### 编排机制总结

**关键理解**：
1. **Blink 的职责**：编译 `.blink` 文件 → Luau/TypeScript 代码
2. **manifest.json 的职责**：组织多个协议、管理依赖、统一配置
3. **编译脚本的职责**：读取 manifest、调用 Blink、生成注册表
4. **ProtocolManager 的职责**：运行时统一接口、事件路由

**这种分层设计的优势**：
- Blink 专注于单个协议的编译优化
- manifest.json 解决多协议管理问题
- 编译脚本自动化整个流程
- ProtocolManager 提供简洁的运行时 API

## TypeScript 封装层

### 协议管理器（统一的运行时接口）

```typescript
// src/roblox_blink_network/protocol-manager.ts
// 这是我们的运行时管理器，不是 Blink 的一部分
import { ProtocolRegistry } from "../generated";

export class ProtocolManager {
	private handlers = new Map<string, Set<Function>>();
	private connections = new Map<Player, Connection>();

	constructor() {
		this.initializeProtocols();
	}

	private initializeProtocols(): void {
		// 从我们的注册表获取所有协议
		// 这些协议是 Blink 生成的代码
		for (const [namespace, protocol] of ProtocolRegistry.getAll()) {
			this.bindProtocol(namespace, protocol);
		}
	}

	private bindProtocol(namespace: string, protocol: any): void {
		// 绑定 Blink 生成的事件处理器
		for (const eventName in protocol.events) {
			const fullEventName = `${namespace}.${eventName}`;

			// 使用 Blink 生成的 API
			if (RunService.IsServer()) {
				protocol.events[eventName].onServerReceive((player: Player, data: any) => {
					this.handleEvent(fullEventName, data, player);
				});
			} else {
				protocol.events[eventName].onClientReceive((data: any) => {
					this.handleEvent(fullEventName, data);
				});
			}
		}
	}

	// 统一的事件发送接口
	// 将 "Namespace.EventName" 格式路由到对应的 Blink 生成代码
	send(eventPath: string, data: any, target?: Player): void {
		const [namespace, eventName] = eventPath.split(".");
		const protocol = ProtocolRegistry.get(namespace);  // 从我们的注册表查找

		if (!protocol) {
			error(`Protocol namespace '${namespace}' not found`);
		}

		const event = protocol.events[eventName];  // 访问 Blink 生成的事件
		if (!event) {
			error(`Event '${eventName}' not found in namespace '${namespace}'`);
		}

		// 调用 Blink 生成的发送方法
		if (RunService.IsServer() && target) {
			event.sendToClient(target, data);
		} else if (!RunService.IsServer()) {
			event.sendToServer(data);
		}
	}

	// 统一的事件监听接口
	on(eventPath: string, handler: (data: any, sender?: Player) => void): void {
		if (!this.handlers.has(eventPath)) {
			this.handlers.set(eventPath, new Set());
		}
		this.handlers.get(eventPath)!.add(handler);
	}

	// 批量发送
	broadcast(eventPath: string, data: any): void {
		const [namespace, eventName] = eventPath.split(".");
		const protocol = ProtocolRegistry.get(namespace);

		if (RunService.IsServer()) {
			const players = Players.GetPlayers();
			for (const player of players) {
				this.send(eventPath, data, player);
			}
		}
	}

	private handleEvent(eventPath: string, data: any, sender?: Player): void {
		const handlers = this.handlers.get(eventPath);
		if (handlers) {
			for (const handler of handlers) {
				handler(data, sender);
			}
		}
	}
}
```

### 事件资源

```typescript
// src/roblox_blink_network/event-system.ts
export class NetworkEvent<T> {
	private queue: Array<EventData<T>> = [];

	push(data: T, sender?: Player): void {
		this.queue.push({ data, sender, timestamp: os.clock() });
	}

	drain(): Array<EventData<T>> {
		const events = [...this.queue];
		this.queue = [];
		return events;
	}

	iter(): IterableIterator<EventData<T>> {
		return this.queue[Symbol.iterator]();
	}
}

interface EventData<T> {
	data: T;
	sender?: Player;
	timestamp: number;
}
```

### Bevy 插件集成

```typescript
// src/roblox_blink_network/plugin.ts
import { Plugin, App } from "../bevy_app";
import { ProtocolManager } from "./protocol-manager";
import { NetworkDiagnostics } from "./diagnostics";

export interface BlinkNetworkConfig {
	enableDiagnostics?: boolean;
	isServer?: boolean;
}

export class BlinkNetworkPlugin extends Plugin {
	constructor(private config: BlinkNetworkConfig = {}) {
		super();
	}

	build(app: App): void {
		const isServer = this.config.isServer ?? RunService.IsServer();

		// 创建协议管理器（统一管理所有协议）
		const protocolManager = new ProtocolManager();
		app.insertResource(protocolManager);

		// 注册事件资源
		this.registerEventResources(app);

		// 添加网络系统
		app.addSystems(BuiltinSchedules.PreUpdate, [
			receiveNetworkEvents,
			processIncomingData
		]);

		app.addSystems(BuiltinSchedules.PostUpdate, [
			sendQueuedEvents,
			flushNetworkBuffers
		]);

		// 诊断插件
		if (this.config.enableDiagnostics) {
			app.addPlugin(new NetworkDiagnosticsPlugin());
		}
	}

	private registerEventResources(app: App): void {
		// 从注册表自动创建事件资源
		for (const [namespace, protocol] of ProtocolRegistry.getAll()) {
			for (const eventName in protocol.events) {
				const fullEventName = `${namespace}.${eventName}`;
				app.insertResource(new NetworkEvent(fullEventName));
			}
		}
	}
}
```

## 使用示例

### 1. 定义协议

每个插件定义自己的协议，使用独立命名空间：

```blink
// protocols/replicon/replicon.blink
namespace Replicon

struct ComponentData {
    componentId: string,
    data: buffer
}

event EntitySpawn {
    From: Server,
    Type: Reliable,
    Call: SingleSync,
    Data: {
        entityId: u32,
        components: ComponentData[]
    }
}

event EntityDespawn {
    From: Server,
    Type: Reliable,
    Call: SingleSync,
    Data: {
        entityId: u32
    }
}
```

```blink
// protocols/combat/combat.blink
namespace Combat

event DamageDealt {
    From: Server,
    Type: Reliable,
    Call: SingleSync,
    Data: {
        attackerId: u32,
        targetId: u32,
        damage: f32,
        damageType: string
    }
}

event AbilityUsed {
    From: Client,
    Type: Reliable,
    Call: SingleSync,
    Data: {
        abilityId: string,
        targetPosition: vec3
    }
}
```

### 2. 编译生成代码

```bash
# 使用统一编译命令
npm run protocol:compile

# 或使用 watch 模式
npm run protocol:watch
```

### 3. 在插件中使用

插件不再需要直接处理 Blink，只需使用 ProtocolManager：

```typescript
// Replicon 插件
export class RepliconPlugin extends Plugin {
	build(app: App): void {
		const protocolManager = app.getResource<ProtocolManager>();

		// 使用命名空间.事件名 格式
		protocolManager.on("Replicon.EntitySpawn", (data, sender) => {
			this.handleEntitySpawn(app.world, data);
		});

		protocolManager.on("Replicon.EntityDespawn", (data) => {
			this.handleEntityDespawn(app.world, data);
		});

		// 添加复制系统
		app.addSystem(BuiltinSchedules.PostUpdate, (world: World) => {
			const changes = this.collectChanges(world);
			for (const change of changes) {
				protocolManager.send("Replicon.ComponentUpdate", change);
			}
		});
	}
}

// Combat 插件
export class CombatPlugin extends Plugin {
	build(app: App): void {
		const protocolManager = app.getResource<ProtocolManager>();

		// 使用 Combat 命名空间的协议
		protocolManager.on("Combat.DamageDealt", (data) => {
			this.processDamage(app.world, data);
		});

		protocolManager.on("Combat.AbilityUsed", (data, player) => {
			if (this.validateAbility(player!, data)) {
				this.executeAbility(app.world, player!, data);
			}
		});

		// 服务端广播伤害事件
		app.addSystem(BuiltinSchedules.Update, (world: World) => {
			const damageEvents = this.collectDamageEvents(world);
			for (const event of damageEvents) {
				protocolManager.broadcast("Combat.DamageDealt", event);
			}
		});
	}
}
```

### 4. 主应用配置

```typescript
import { App } from "./bevy_app";
import { BlinkNetworkPlugin } from "./roblox_blink_network";
import { RepliconPlugin } from "./bevy_replicon";
import { CombatPlugin } from "./combat_plugin";

const app = App.new()
	// 网络插件只需要添加一次
	.addPlugin(new BlinkNetworkPlugin({
		enableDiagnostics: true,
		isServer: RunService.IsServer()
	}))
	// 各功能插件使用网络功能
	.addPlugin(new RepliconPlugin())
	.addPlugin(new CombatPlugin())
	.addPlugin(new GamePlugin())
	.run();
```

## 构建工具

### package.json 脚本

```json
{
  "scripts": {
    "protocol:compile": "ts-node build/compile-protocols.ts",
    "protocol:watch": "ts-node build/compile-protocols.ts --watch",
    "protocol:add": "ts-node build/add-protocol.ts",
    "build": "npm run protocol:compile && rbxtsc",
    "dev": "concurrently \"npm run protocol:watch\" \"rbxtsc -w\""
  }
}
```

### 添加新协议的工具

```typescript
// build/add-protocol.ts
import prompts from "prompts";
import fs from "fs";
import path from "path";

async function addProtocol() {
	const response = await prompts([
		{
			type: "text",
			name: "name",
			message: "Protocol name (lowercase):"
		},
		{
			type: "text",
			name: "namespace",
			message: "Namespace (PascalCase):"
		},
		{
			type: "text",
			name: "description",
			message: "Description:"
		}
	]);

	// 创建协议目录
	const protocolDir = path.join("protocols", response.name);
	fs.mkdirSync(protocolDir, { recursive: true });

	// 创建初始 .blink 文件
	const blinkContent = `namespace ${response.namespace}

// ${response.description}

event Example {
    From: Client,
    Type: Reliable,
    Call: SingleSync,
    Data: {
        message: string
    }
}
`;

	fs.writeFileSync(
		path.join(protocolDir, `${response.name}.blink`),
		blinkContent
	);

	// 更新 manifest.json
	const manifest = JSON.parse(
		fs.readFileSync("protocols/manifest.json", "utf8")
	);

	manifest.protocols.push({
		name: response.name,
		namespace: response.namespace,
		path: `${response.name}/${response.name}.blink`,
		description: response.description
	});

	fs.writeFileSync(
		"protocols/manifest.json",
		JSON.stringify(manifest, null, 2)
	);

	console.log(`✓ Protocol '${response.name}' created successfully`);
	console.log(`  Edit: protocols/${response.name}/${response.name}.blink`);
}

addProtocol();
```

## 性能优化

### Blink 自动优化

1. **Buffer 序列化**: 使用 Roblox 原生 buffer API，性能最优
2. **带宽压缩**: 智能字段压缩，减少网络流量
3. **类型验证**: 编译时生成验证代码，零运行时开销
4. **批处理**: 自动合并小消息，减少网络调用

### 最佳实践

1. **选择合适的事件类型**
   - 关键数据用 Reliable
   - 高频更新用 Unreliable

2. **优化数据结构**
   - 使用定长数组而非动态数组
   - 选择合适的数字类型（u8 vs u32）
   - 避免深层嵌套结构

3. **批量处理**
   - 合并多个小更新为一个大更新
   - 使用 tick-based 同步而非即时同步

4. **命名规范**
   - 命名空间使用 PascalCase
   - 事件名使用 PascalCase
   - 完整路径：`Namespace.EventName`

## 调试工具

```typescript
export class NetworkDiagnosticsPlugin extends Plugin {
	build(app: App): void {
		const diagnostics = new NetworkDiagnostics();
		app.insertResource(diagnostics);

		app.addSystems(BuiltinSchedules.Last, [
			updateNetworkStats,
			renderNetworkDebugUI
		]);
	}
}

export class NetworkDiagnostics {
	bytesSent: number = 0;
	bytesReceived: number = 0;
	messagesSent: number = 0;
	messagesReceived: number = 0;
	averageLatency: number = 0;

	getStats(): NetworkStats {
		return {
			bandwidth: {
				sent: this.bytesSent,
				received: this.bytesReceived
			},
			messages: {
				sent: this.messagesSent,
				received: this.messagesReceived
			},
			latency: this.averageLatency
		};
	}
}
```

## 错误处理

```typescript
// 使用 Result 模式处理网络错误
interface NetworkResult<T> {
	success: boolean;
	value?: T;
	error?: string;
}

export function safeSend<T>(
	protocolManager: ProtocolManager,
	event: string,
	data: T
): NetworkResult<void> {
	try {
		protocolManager.send(event, data);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: tostring(error)
		};
	}
}
```

## 迁移指南

### 从 RemoteEvent 迁移到 Blink

1. **定义 IDL 协议** 替代手动创建 RemoteEvent
2. **使用生成的代码** 替代手动序列化
3. **类型安全** - 自动生成 TypeScript 类型
4. **性能提升** - 自动获得 buffer 优化

### 示例对比

```typescript
// 传统 RemoteEvent 方式
const remoteEvent = new Instance("RemoteEvent");
remoteEvent.OnServerEvent.Connect((player, ...args) => {
	const data = args[0] as unknown;
	// 手动验证和类型转换
});

// Blink 方式
// 1. 定义协议
event PlayerAction {
	From: Client,
	Type: Reliable,
	Data: {
		action: string,
		target: u32?
	}
}

// 2. 使用 ProtocolManager
protocolManager.on("Game.PlayerAction", (data, player) => {
	// 类型安全，自动验证
	processAction(data.action, data.target);
});
```

## 使用流程总结

1. **初始化项目**
```bash
npm run protocol:compile
```

2. **添加新协议**
```bash
npm run protocol:add
# 按提示输入协议信息
```

3. **开发模式**
```bash
npm run dev
# 自动监视协议文件变化并重编译
```

4. **在插件中使用**
```typescript
// 直接使用命名空间.事件名
protocolManager.on("Combat.DamageDealt", handler);
protocolManager.send("Replicon.EntityUpdate", data);
protocolManager.broadcast("Core.GameStateChange", state);
```

## 优势总结

1. **集中管理** - 所有协议定义在一个地方，通过 manifest.json 管理
2. **命名空间隔离** - 每个插件独立命名空间，避免冲突
3. **自动化** - 统一编译流程，自动生成注册表
4. **类型安全** - 编译时类型检查，运行时验证
5. **高性能** - Buffer 序列化，带宽优化
6. **开发效率** - 自动代码生成，减少样板代码
7. **易于扩展** - 添加新协议只需运行命令
8. **插件友好** - 插件无需关心 Blink 细节，使用统一接口

## 限制和注意事项

1. **编译步骤** - 需要额外的构建步骤编译 IDL
2. **学习曲线** - 需要学习 Blink IDL 语法
3. **文件管理** - 需要管理生成的代码文件
4. **版本兼容** - 协议更改需要重新编译和部署

## 总结

基于 Blink IDL 编译器的集中式网络层设计提供了一个高性能、类型安全、易于维护的网络通信方案。通过协议清单系统和 ProtocolManager 统一接口，成功解决了多插件协议管理的核心问题，让插件开发者能专注于业务逻辑而非网络细节。

这种方案特别适合：
- 需要高性能网络通信的 Roblox 游戏
- 多团队协作的大型项目
- 需要严格类型安全的企业级应用
- 追求开发效率的快速迭代项目

---

**文档版本**: 3.0.0
**更新日期**: 2025-01-24
**作者**: Claude Code Assistant
**状态**: 完整设计方案（合并版）