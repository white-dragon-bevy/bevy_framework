# 扩展系统使用指南

本文档详细说明 bevy_app 扩展系统的使用方法，包括插件注册、类型安全保证和最佳实践。

## 扩展系统架构

扩展系统通过 `AppContext` 提供类型安全的插件功能访问，核心组件包括：

- **`PluginExtensions`** - 全局扩展注册表接口，所有插件扩展都在此声明
- **`AppContext`** - 扩展管理器，负责注册、存储和验证扩展
- **`ExtensionConfig`** - 扩展配置结构，包含扩展实现和元数据
- **`ExtensionMetadata`** - 扩展元数据，包含依赖、描述、版本等信息

## 插件注册扩展

插件通过继承 `BasePlugin` 类并使用提供的注册方法来添加扩展：

### 方式一：批量注册（推荐）

```typescript
import { BasePlugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";

class MyPlugin extends BasePlugin {
	build(app: App): void {
		// 使用 registerExtensions 批量注册
		this.registerExtensions(app, {
			"myPlugin": {
				extension: {
					doSomething() {
						print("Doing something");
					},
					getValue() {
						return 42;
					}
				},
				metadata: {
					description: "主扩展功能",
					version: "1.0.0"
				}
			},
			"myPlugin.feature": {
				extension: {
					processData(data: string) {
						return data.upper();
					}
				},
				metadata: {
					dependencies: ["myPlugin"], // 声明依赖
					description: "子功能模块"
				}
			}
		});
	}

	name(): string {
		return "MyPlugin";
	}
}
```

### 方式二：单个注册

```typescript
class MyPlugin extends BasePlugin {
	build(app: App): void {
		// 使用 registerExtension 单个注册
		this.registerExtension(
			app,
			"myPlugin.advanced",
			{
				analyze() { /* ... */ }
			},
			{
				dependencies: ["myPlugin", "time"],
				description: "高级分析功能"
			}
		);
	}
}
```

## 类型安全和代码提示

通过 TypeScript 的模块扩展（Module Augmentation）实现完整的类型安全：

### 步骤 1：定义扩展接口

```typescript
// my-plugin/extensions.ts

// 定义扩展接口
export interface MyPluginExtension {
	doSomething(): void;
	getValue(): number;
}

export interface MyPluginFeatureExtension {
	processData(data: string): string;
}

// 声明到全局注册表
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		"myPlugin": MyPluginExtension;
		"myPlugin.feature": MyPluginFeatureExtension;
		"myPlugin.advanced": MyPluginAdvancedExtension;
	}
}
```

### 步骤 2：实现时使用 satisfies 确保类型正确

```typescript
import type { MyPluginExtension } from "./extensions";

class MyPlugin extends BasePlugin {
	build(app: App): void {
		this.registerExtensions(app, {
			"myPlugin": {
				extension: {
					doSomething() {
						print("Type-safe implementation");
					},
					getValue() {
						return 42;
					}
				} satisfies MyPluginExtension, // 使用 satisfies 验证类型
				metadata: { description: "类型安全的扩展" }
			}
		});
	}
}
```

## 使用扩展

在系统或其他代码中通过 `app.context` 访问扩展：

### 创建快捷访问方法

可以在 context 对象上添加自定义方法来简化扩展访问：

```typescript
// 方式1：直接在 context 上添加方法（roblox-ts 兼容）
function setupContextShortcuts(app: App): void {
	const context = app.context as any;

	// 添加快捷方法
	context.getPlayer = (userId: string) => {
		return context.get("player").getPlayer(userId);
	};

	context.addExperience = (userId: string, amount: number) => {
		return context.get("player.stats").addExperience(userId, amount);
	};

	// 添加获取扩展的快捷方法
	context.player = () => context.get("player");
	context.playerStats = () => context.get("player.stats");
}

// 使用快捷访问
function gameSystem(world: World, context: Context, app: App): void {
	const ctx = app.context as any;

	// 通过快捷方法访问
	const playerManager = ctx.player();
	playerManager.addPlayer({ userId: "123", name: "Hero", level: 1, experience: 0 });

	// 使用快捷方法
	ctx.addExperience("123", 100);
	const currentPlayer = ctx.getPlayer("123");
}

// 方式2：创建包装类（推荐）
class GameContext {
	constructor(private readonly context: AppContext) {}

	get player(): PlayerManagerExtension {
		return this.context.get("player");
	}

	get playerStats(): PlayerStatsExtension {
		return this.context.get("player.stats");
	}

	getPlayer(userId: string): Player | undefined {
		return this.player.getPlayer(userId);
	}

	addExperience(userId: string, amount: number): void {
		this.playerStats.addExperience(userId, amount);
	}

	// 保留原始 context 的访问能力
	get<K extends keyof PluginExtensions>(key: K): PluginExtensions[K] {
		return this.context.get(key);
	}

	tryGet<K extends keyof PluginExtensions>(key: K): PluginExtensions[K] | undefined {
		return this.context.tryGet(key);
	}
}

// 使用包装类
function gameSystemWithWrapper(world: World, context: Context, app: App): void {
	const gameContext = new GameContext(app.context);

	// 类型安全的访问
	gameContext.player.addPlayer({
		userId: "123",
		name: "Hero",
		level: 1,
		experience: 0
	});

	gameContext.addExperience("123", 100);
	const player = gameContext.getPlayer("123");

	// 仍然可以访问其他扩展
	const diagnostics = gameContext.get("diagnostics");
}

// 方式3：使用工厂函数创建快捷访问对象
interface PlayerHelpers {
	readonly player: PlayerManagerExtension;
	readonly stats: PlayerStatsExtension;
	getPlayer(userId: string): Player | undefined;
	addExperience(userId: string, amount: number): void;
}

function createPlayerHelpers(context: AppContext): PlayerHelpers {
	const playerExt = context.get("player");
	const statsExt = context.get("player.stats");

	return {
		player: playerExt,
		stats: statsExt,
		getPlayer: (userId) => playerExt.getPlayer(userId),
		addExperience: (userId, amount) => statsExt.addExperience(userId, amount)
	};
}

// 在插件中提供辅助方法
class PlayerPlugin extends BasePlugin {
	// ... 其他代码 ...

	/**
	 * 创建玩家系统的快捷访问助手
	 * @param app - 应用实例
	 * @returns 玩家系统助手对象
	 */
	static createHelpers(app: App): PlayerHelpers {
		return createPlayerHelpers(app.context);
	}
}

// 使用插件提供的助手
function systemWithHelpers(world: World, context: Context, app: App): void {
	const playerHelpers = PlayerPlugin.createHelpers(app);

	playerHelpers.player.addPlayer({
		userId: "456",
		name: "Warrior",
		level: 5,
		experience: 250
	});

	playerHelpers.addExperience("456", 50);
}
```

### 基本使用

```typescript
function mySystem(world: World, context: Context, app: App): void {
	// 获取扩展（如果不存在会抛出错误）
	const ext = app.context.get("myPlugin");
	ext.doSomething();  // 完整的类型提示和自动补全
	const value = ext.getValue();  // 返回类型自动推断为 number

	// 安全获取（可能返回 undefined）
	const maybeExt = app.context.tryGet("myPlugin");
	if (maybeExt) {
		maybeExt.doSomething();
	}

	// 检查扩展是否存在
	if (app.context.has("myPlugin.feature")) {
		const feature = app.context.get("myPlugin.feature");
		const result = feature.processData("hello");
	}
}
```

### 命名空间访问

```typescript
function namespaceExample(world: World, context: Context, app: App): void {
	// 获取整个命名空间下的所有扩展
	const myPluginNamespace = app.context.getNamespace("myPlugin");
	// 返回包含 "myPlugin"、"myPlugin.feature"、"myPlugin.advanced" 等所有扩展

	// 检查命名空间是否存在
	if (app.context.hasNamespace("myPlugin")) {
		// 列出该命名空间下的所有扩展
		for (const key of app.context.listExtensions()) {
			const keyStr = key as string;
			if (keyStr === "myPlugin" || keyStr.sub(1, 9) === "myPlugin.") {
				const metadata = app.context.getMetadata(key);
				print(`${keyStr}: ${metadata?.description ?? "无描述"}`);
			}
		}
	}
}
```

## 命名空间组织规范

使用点号分隔的命名空间来组织相关功能：

### 推荐的命名模式

```typescript
// 主扩展
"diagnostics"           // 诊断系统主扩展
"time"                  // 时间系统主扩展
"player"                // 玩家系统主扩展

// 子功能（使用点号分隔）
"diagnostics.store"     // 诊断存储功能
"diagnostics.renderer"  // 诊断渲染功能
"time.control"         // 时间控制功能
"time.stats"           // 时间统计功能
"player.inventory"     // 玩家背包功能
"player.stats"         // 玩家属性功能
```

### 命名规则

1. 使用小写字母开头
2. 使用驼峰命名法（camelCase）
3. 主扩展使用单个单词或简短名称
4. 子功能使用点号分隔，层级不宜过深（建议最多 2-3 层）

## 依赖管理

通过 `ExtensionMetadata.dependencies` 声明扩展之间的依赖关系：

### 声明依赖

```typescript
this.registerExtensions(app, {
	"myPlugin.advanced": {
		extension: { /* ... */ },
		metadata: {
			dependencies: ["myPlugin", "time", "diagnostics"],
			description: "需要多个依赖的高级功能"
		}
	}
});
```

### 依赖验证

访问扩展时会自动验证依赖：

```typescript
// 如果 myPlugin 或 time 未注册，下面的调用会抛出错误
const advanced = app.context.get("myPlugin.advanced");
// 错误信息：Extension 'myPlugin.advanced' requires 'myPlugin' which is not registered

// 使用 tryGet 可以避免错误
const maybeAdvanced = app.context.tryGet("myPlugin.advanced");
if (maybeAdvanced === undefined) {
	print("Advanced extension not available or dependencies not met");
}
```

## 完整示例：创建玩家管理插件

### 1. 定义扩展接口

```typescript
// player-plugin/extensions.ts

export interface Player {
	readonly userId: string;
	readonly name: string;
	readonly level: number;
	readonly experience: number;
}

export interface PlayerManagerExtension {
	getPlayer(userId: string): Player | undefined;
	addPlayer(player: Player): void;
	removePlayer(userId: string): boolean;
	getAllPlayers(): ReadonlyArray<Player>;
}

export interface PlayerStatsExtension {
	getPlayerLevel(userId: string): number;
	addExperience(userId: string, amount: number): void;
	calculateNextLevelExp(level: number): number;
}

// 声明到全局注册表
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		"player": PlayerManagerExtension;
		"player.stats": PlayerStatsExtension;
	}
}
```

### 2. 实现插件

```typescript
// player-plugin/plugin.ts

import { BasePlugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import type { Player, PlayerManagerExtension, PlayerStatsExtension } from "./extensions";

export class PlayerPlugin extends BasePlugin {
	build(app: App): void {
		// 内部状态
		const playerMap = new Map<string, Player>();

		// 注册扩展
		this.registerExtensions(app, {
			"player": {
				extension: {
					getPlayer(userId) {
						return playerMap.get(userId);
					},
					addPlayer(player) {
						playerMap.set(player.userId, player);
						print(`Player ${player.name} added`);
					},
					removePlayer(userId) {
						return playerMap.delete(userId);
					},
					getAllPlayers() {
						const players: Player[] = [];
						for (const [_, player] of playerMap) {
							players.push(player);
						}
						return players;
					}
				} satisfies PlayerManagerExtension,
				metadata: {
					description: "玩家管理核心功能",
					version: "1.0.0"
				}
			},
			"player.stats": {
				extension: {
					getPlayerLevel(userId) {
						const player = playerMap.get(userId);
						return player?.level ?? 1;
					},
					addExperience(userId, amount) {
						const player = playerMap.get(userId);
						if (player) {
							const newPlayer = {
								...player,
								experience: player.experience + amount
							};
							// 检查升级
							const nextLevelExp = this.calculateNextLevelExp(player.level);
							if (newPlayer.experience >= nextLevelExp) {
								newPlayer.level++;
								newPlayer.experience = 0;
								print(`${player.name} leveled up to ${newPlayer.level}!`);
							}
							playerMap.set(userId, newPlayer);
						}
					},
					calculateNextLevelExp(level) {
						return level * 100 + 50;
					}
				} satisfies PlayerStatsExtension,
				metadata: {
					description: "玩家等级和经验系统",
					dependencies: ["player"]
				}
			}
		});
	}

	name(): string {
		return "PlayerPlugin";
	}
}
```

### 3. 使用插件

```typescript
// main.ts

import { App } from "./bevy_app/app";
import { PlayerPlugin } from "./player-plugin/plugin";

// 创建应用并添加插件
const app = App.create()
	.addPlugin(new PlayerPlugin());

// 在系统中使用
function playerSystem(world: World, context: Context, app: App): void {
	const playerManager = app.context.get("player");
	const playerStats = app.context.get("player.stats");

	// 添加新玩家
	playerManager.addPlayer({
		userId: "user123",
		name: "Hero",
		level: 1,
		experience: 0
	});

	// 获取玩家并添加经验
	const player = playerManager.getPlayer("user123");
	if (player) {
		playerStats.addExperience("user123", 150);
		const newLevel = playerStats.getPlayerLevel("user123");
		print(`Player is now level ${newLevel}`);
	}

	// 列出所有玩家
	const allPlayers = playerManager.getAllPlayers();
	print(`Total players: ${allPlayers.size()}`);
}

app.addSystems(BuiltinSchedules.UPDATE, playerSystem);
```

## 最佳实践

### 1. 扩展设计原则

- **单一职责**：每个扩展应该只负责一个明确的功能领域
- **最小依赖**：只声明必要的依赖，避免循环依赖
- **清晰命名**：使用描述性的名称，让用户一眼就知道扩展的用途

### 2. 类型安全

- 始终定义扩展接口并声明到 `PluginExtensions`
- 使用 `satisfies` 操作符验证实现符合接口
- 避免使用 `any` 类型

### 3. 错误处理

- 对于可能不存在的扩展，使用 `tryGet` 而不是 `get`
- 在访问子功能前，先检查主扩展是否存在
- 提供有意义的错误信息

### 4. 性能考虑

- 缓存频繁使用的扩展引用
- 避免在每帧都调用 `get` 或 `tryGet`
- 使用命名空间功能批量获取相关扩展

## 调试工具

### 查看所有已注册的扩展

```typescript
// 列出所有扩展
const extensions = app.context.listExtensions();
for (const ext of extensions) {
	print(ext as string);
}

// 调试输出详细信息
app.context.debug();
// 输出格式：
// === AppContext Extensions ===
//   diagnostics:
//     Description: Core diagnostics API
//     Version: 0.1.0
//   diagnostics.store:
//     Description: Direct access to the diagnostics store
//     Dependencies: diagnostics
// =============================
```

### 获取扩展元数据

```typescript
const metadata = app.context.getMetadata("myPlugin");
if (metadata) {
	print(`Description: ${metadata.description}`);
	print(`Version: ${metadata.version}`);
	if (metadata.dependencies) {
		print(`Dependencies: ${metadata.dependencies.join(", ")}`);
	}
}
```

## 总结

扩展系统提供了一种类型安全、易于维护的插件间通信机制。通过模块扩展和 TypeScript 的类型系统，开发者可以：

1. 获得完整的代码提示和自动补全
2. 在编译时捕获类型错误
3. 清晰地组织和管理功能模块
4. 自动处理依赖关系
5. 轻松扩展和维护代码

遵循本指南的最佳实践，可以充分发挥扩展系统的优势，构建健壮的模块化应用。