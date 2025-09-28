# bevy_state 模块操作手册

## 目录
- [模块概述](#模块概述)
- [核心概念](#核心概念)
- [API详解](#api详解)
- [实战示例](#实战示例)
- [最佳实践](#最佳实践)

---

## 模块概述

`bevy_state` 是一个强大的状态管理系统,移植自 Rust Bevy 框架的 `bevy_state` crate。它提供了完整的有限状态机(FSM)实现,支持状态转换、计算状态、子状态等高级功能。

### 主要特性

- **标准状态管理**: 定义和管理应用程序状态
- **状态转换系统**: OnEnter/OnExit/OnTransition 调度钩子
- **计算状态**: 从其他状态派生的只读状态
- **子状态**: 依赖于父状态存在的状态
- **状态作用域**: 自动管理实体生命周期
- **运行条件**: 基于状态的系统执行控制
- **事件系统**: 监听状态转换事件

### 核心组件

```
bevy_state/
├── states.ts           # 状态接口定义
├── resources.ts        # State 和 NextState 资源
├── transitions.ts      # 状态转换系统
├── computed-states.ts  # 计算状态
├── sub-states.ts       # 子状态
├── condition.ts        # 运行条件
├── state-scoped.ts     # 状态作用域实体管理
└── plugin.ts           # 插件集成
```

---

## 核心概念

### 1. States (状态)

状态是有限状态机中的基本单元,表示应用程序在某个时刻的特定模式。

#### 状态接口

```typescript
interface States {
	getStateId(): string | number;  // 获取唯一标识
	equals(other: States): boolean;  // 比较相等性
	clone(): States;                 // 克隆状态
}
```

#### 创建简单状态

```typescript
import { createStates } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 使用辅助函数创建枚举状态
const GameState = createStates({
	MENU: "menu",
	LOADING: "loading",
	PLAYING: "playing",
	PAUSED: "paused",
	GAME_OVER: "game_over"
});

// 使用状态
const currentState = GameState.PLAYING;
print(currentState.getStateId()); // "playing"
```

#### 创建自定义状态类

```typescript
import { BaseStates } from "@white-dragon-bevy/bevy-framework/bevy_state";

class CustomGameState extends BaseStates {
	public static readonly DEPENDENCY_DEPTH = 1;

	private constructor(private readonly id: string) {
		super();
	}

	public static readonly MENU = new CustomGameState("menu");
	public static readonly PLAYING = new CustomGameState("playing");

	public getStateId(): string {
		return this.id;
	}

	public clone(): States {
		return this;
	}
}
```

### 2. State Transitions (状态转换)

状态转换是从一个状态切换到另一个状态的过程,伴随着三个关键阶段:

```
OnExit(旧状态) → OnTransition(旧 → 新) → 更新状态 → OnEnter(新状态)
```

#### 转换调度标签

```typescript
import { OnEnter, OnExit, OnTransition } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 进入某状态时执行
OnEnter(GameState.PLAYING)

// 退出某状态时执行
OnExit(GameState.MENU)

// 特定转换时执行
OnTransition(GameState.LOADING, GameState.PLAYING)
```

#### 触发状态转换

```typescript
import { NextState } from "@white-dragon-bevy/bevy-framework/bevy_state";

function loadingCompleteSystem(world: World, context: Context): void {
	const nextState = world.resources.getResource<NextState<typeof GameState.PLAYING>>();

	if (nextState && isLoadingComplete()) {
		// 设置下一个状态,将在 StateTransition 调度中处理
		nextState.set(GameState.PLAYING);
	}
}
```

### 3. Computed States (计算状态)

计算状态是从一个或多个源状态自动派生的只读状态,无法直接修改。

#### 单源计算状态

```typescript
import { BaseComputedStates, SingleStateSet } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 从游戏状态计算是否可以暂停
class CanPauseState extends BaseComputedStates<typeof GameState> {
	public static readonly TRUE = new CanPauseState(true);
	public static readonly FALSE = new CanPauseState(false);

	constructor(private readonly value: boolean) {
		super(new SingleStateSet(GameState));
	}

	public getStateId(): string {
		return this.value ? "can_pause" : "cannot_pause";
	}

	public compute(source: typeof GameState | undefined): CanPauseState | undefined {
		if (!source) return undefined;

		// 只有在 PLAYING 或 PAUSED 状态才能暂停
		if (source.equals(GameState.PLAYING) || source.equals(GameState.PAUSED)) {
			return CanPauseState.TRUE;
		}
		return CanPauseState.FALSE;
	}

	public clone(): States {
		return this;
	}
}
```

#### 多源计算状态

```typescript
import { createMultiSourceComputedState } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 从多个状态源计算
const CombinedState = createMultiSourceComputedState(
	[GameState, NetworkState],  // 源状态数组
	(sources) => {
		const [gameState, networkState] = sources;

		if (gameState.equals(GameState.PLAYING) && networkState.equals(NetworkState.CONNECTED)) {
			return OnlinePlayingState.ACTIVE;
		}
		return OnlinePlayingState.INACTIVE;
	}
);
```

### 4. Sub States (子状态)

子状态依赖于父状态,只在特定父状态下存在。当父状态不满足条件时,子状态自动被移除。

```typescript
import { BaseSubStates, SubStateConfig } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 定义子状态配置
const menuConfig: SubStateConfig<typeof GameState> = {
	parentType: GameState,
	allowedParentStates: new Set(["menu"])  // 仅在 MENU 状态下存在
};

// 创建菜单子状态
class MenuSubState extends BaseSubStates<typeof GameState> {
	public static readonly MAIN_MENU = new MenuSubState("main", menuConfig);
	public static readonly OPTIONS = new MenuSubState("options", menuConfig);
	public static readonly CREDITS = new MenuSubState("credits", menuConfig);

	constructor(private readonly id: string, config: SubStateConfig<typeof GameState>) {
		super(config);
	}

	public getStateId(): string {
		return `menu_${this.id}`;
	}

	public clone(): States {
		return this;
	}

	public shouldExist(parentState: typeof GameState | undefined): this | undefined {
		// 检查父状态是否允许此子状态存在
		if (!parentState) return undefined;

		if (this.config.allowedParentStates.has(parentState.getStateId())) {
			return this;  // 返回初始状态
		}
		return undefined;  // 不应存在
	}
}
```

### 5. State Scoped Entities (状态作用域实体)

状态作用域允许实体在状态转换时自动清理,避免手动管理实体生命周期。

```typescript
import {
	markForDespawnOnExit,
	markForDespawnOnEnter,
	DespawnStrategy
} from "@white-dragon-bevy/bevy-framework/bevy_state";

function spawnMenuUISystem(world: World, context: Context): void {
	// 创建菜单UI实体
	const menuEntity = world.spawn(
		MenuUI({ title: "Main Menu" }),
		Transform()
	);

	// 标记为在退出 MENU 状态时自动清理
	markForDespawnOnExit(world, menuEntity, GameState.MENU);
}
```

---

## API详解

### 核心资源

#### State<S>

当前状态的资源容器。

```typescript
import { State } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 创建状态资源
const state = State.create(GameState.MENU);

// 获取当前状态
const current = state.get();

// 检查是否为特定状态
if (state.is(GameState.PLAYING)) {
	// 处理游戏逻辑
}

// 克隆状态资源
const cloned = state.clone();
```

#### NextState<S>

待处理的下一个状态。

```typescript
import { NextState, NextStateVariant } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 创建 NextState 资源
const nextState = NextState.create();

// 设置待处理状态
nextState.set(GameState.PLAYING);

// 检查状态
if (nextState.isPending()) {
	const pending = nextState.pending();
	print(`待转换到: ${pending?.getStateId()}`);
}

// 取出并重置
const state = nextState.take();  // 取出后变为 Unchanged
```

### 转换事件

#### StateTransitionMessage<S>

状态转换事件,包含退出和进入的状态信息。

```typescript
import {
	StateTransitionMessage,
	getStateTransitionReader
} from "@white-dragon-bevy/bevy-framework/bevy_state";

function stateChangeListenerSystem(world: World, context: Context): void {
	const reader = getStateTransitionReader<typeof GameState>(context.messages);

	for (const event of reader.read()) {
		if (event.exited) {
			print(`退出状态: ${event.exited.getStateId()}`);
		}
		if (event.entered) {
			print(`进入状态: ${event.entered.getStateId()}`);
		}

		// 检查特定转换
		if (event.isTransition(GameState.LOADING, GameState.PLAYING)) {
			print("加载完成,开始游戏!");
		}
	}
}
```

### 运行条件

运行条件控制系统是否执行,基于当前状态。

```typescript
import {
	inState,
	stateExists,
	stateChanged,
	enteringState,
	exitingState,
	andCondition,
	orCondition,
	notCondition
} from "@white-dragon-bevy/bevy-framework/bevy_state";

// 仅在特定状态运行
app.addSystems(
	BuiltinSchedules.UPDATE,
	gameplaySystem.runIf(inState(GameState, GameState.PLAYING))
);

// 状态改变时运行
app.addSystems(
	BuiltinSchedules.UPDATE,
	uiUpdateSystem.runIf(stateChanged(GameState))
);

// 进入状态时运行一次
app.addSystems(
	BuiltinSchedules.UPDATE,
	initializeGameSystem.runIf(enteringState(GameState, GameState.PLAYING))
);

// 组合条件
app.addSystems(
	BuiltinSchedules.UPDATE,
	networkSystem.runIf(
		andCondition(
			inState(GameState, GameState.PLAYING),
			inState(NetworkState, NetworkState.CONNECTED)
		)
	)
);
```

### 状态作用域API

```typescript
import {
	markForDespawnOnExit,
	markForDespawnOnEnter,
	markEntitiesForDespawnOnExit,
	getEntitiesInState,
	despawnAllInState,
	getStateScopedData,
	removeStateScopedMarker,
	DespawnStrategy
} from "@white-dragon-bevy/bevy-framework/bevy_state";

// 单个实体标记
markForDespawnOnExit(world, entity, GameState.PLAYING);
markForDespawnOnEnter(world, entity, GameState.LOADING, true);  // recursive=true

// 批量标记(性能更好)
const entities = [entity1, entity2, entity3];
markEntitiesForDespawnOnExit(world, entities, GameState.PLAYING);

// 查询状态关联的实体
const playingEntities = getEntitiesInState(
	world,
	GameState.PLAYING,
	DespawnStrategy.OnExit
);

// 立即清理所有关联实体
despawnAllInState(world, GameState.PLAYING);

// 检查实体的状态作用域数据
const scopedData = getStateScopedData(world, entity);
if (scopedData) {
	print(`状态ID: ${scopedData.stateId}`);
	print(`策略: ${scopedData.strategy}`);
	print(`递归: ${scopedData.recursive}`);
}

// 移除标记
removeStateScopedMarker(world, entity);
```

---

## 实战示例

### 示例 1: 基础游戏状态管理

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import {
	createStates,
	StatesPlugin,
	OnEnter,
	OnExit,
	NextState
} from "@white-dragon-bevy/bevy-framework/bevy_state";

// 1. 定义游戏状态
const GameState = createStates({
	SPLASH: "splash",
	MENU: "menu",
	LOADING: "loading",
	PLAYING: "playing",
	PAUSED: "paused",
	GAME_OVER: "game_over"
});

// 2. 创建应用并安装状态插件
const app = new App();

app.addPlugin(
	StatesPlugin.create({
		defaultState: () => GameState.SPLASH,  // 初始状态
		initOnStartup: true
	})
);

// 3. 添加状态进入/退出系统
app.addSystems(OnEnter(GameState.SPLASH), (world: World, context: Context) => {
	print("显示启动画面");
	// 3秒后自动进入菜单
	task.delay(3, () => {
		const nextState = world.resources.getResource<NextState<typeof GameState>>();
		nextState?.set(GameState.MENU);
	});
});

app.addSystems(OnExit(GameState.SPLASH), (world: World, context: Context) => {
	print("启动画面结束");
});

app.addSystems(OnEnter(GameState.MENU), (world: World, context: Context) => {
	print("显示主菜单");
	// 创建菜单UI
	const menuEntity = world.spawn(MenuUI({ title: "Main Menu" }));
	markForDespawnOnExit(world, menuEntity, GameState.MENU);
});

app.addSystems(OnEnter(GameState.LOADING), (world: World, context: Context) => {
	print("开始加载资源");
	// 模拟资源加载
	loadGameAssets().then(() => {
		const nextState = world.resources.getResource<NextState<typeof GameState>>();
		nextState?.set(GameState.PLAYING);
	});
});

app.addSystems(OnEnter(GameState.PLAYING), (world: World, context: Context) => {
	print("游戏开始!");
	// 初始化游戏世界
	spawnPlayer(world);
	spawnEnemies(world);
});

app.addSystems(OnExit(GameState.PLAYING), (world: World, context: Context) => {
	print("游戏结束,清理资源");
	// 状态作用域实体会自动清理
});

// 4. 添加暂停切换系统
app.addSystems(BuiltinSchedules.UPDATE, (world: World, context: Context) => {
	const state = world.resources.getResource<State<typeof GameState>>();
	const nextState = world.resources.getResource<NextState<typeof GameState>>();

	if (UserInputService.IsKeyDown(Enum.KeyCode.Escape)) {
		if (state?.is(GameState.PLAYING)) {
			nextState?.set(GameState.PAUSED);
		} else if (state?.is(GameState.PAUSED)) {
			nextState?.set(GameState.PLAYING);
		}
	}
});

app.run();
```

### 示例 2: 计算状态 - 网络可用性

```typescript
import { BaseComputedStates, SingleStateSet } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 定义网络状态
const NetworkState = createStates({
	DISCONNECTED: "disconnected",
	CONNECTING: "connecting",
	CONNECTED: "connected",
	ERROR: "error"
});

// 定义计算状态 - 网络是否可用
class NetworkAvailableState extends BaseComputedStates<typeof NetworkState> {
	public static readonly AVAILABLE = new NetworkAvailableState(true);
	public static readonly UNAVAILABLE = new NetworkAvailableState(false);

	constructor(private readonly available: boolean) {
		super(new SingleStateSet(NetworkState));
	}

	public getStateId(): string {
		return this.available ? "available" : "unavailable";
	}

	public compute(source: typeof NetworkState | undefined): NetworkAvailableState | undefined {
		if (!source) return NetworkAvailableState.UNAVAILABLE;

		// 仅在连接状态时可用
		return source.equals(NetworkState.CONNECTED)
			? NetworkAvailableState.AVAILABLE
			: NetworkAvailableState.UNAVAILABLE;
	}

	public clone(): States {
		return this;
	}
}

// 注册计算状态
app.addPlugin(
	new ComputedStatesPlugin(NetworkState, NetworkAvailableState)
);

// 使用计算状态作为运行条件
app.addSystems(
	BuiltinSchedules.UPDATE,
	multiplayerSystem.runIf(
		inState(NetworkAvailableState, NetworkAvailableState.AVAILABLE)
	)
);
```

### 示例 3: 子状态 - 菜单导航

```typescript
import { createEnumSubState } from "@white-dragon-bevy/bevy-framework/bevy_state";

// 父状态
const AppState = createStates({
	MENU: "menu",
	GAME: "game"
});

// 子状态配置 - 仅在 MENU 状态下存在
const menuSubConfig: SubStateConfig<typeof AppState> = {
	parentType: AppState,
	allowedParentStates: new Set(["menu"])
};

// 创建菜单子状态
const MenuSubState = createEnumSubState(
	menuSubConfig,
	{
		MAIN: "main",
		OPTIONS: "options",
		CREDITS: "credits"
	},
	"main"  // 默认值
);

// 注册插件
app.addPlugin(StatesPlugin.create({ defaultState: () => AppState.MENU }));
app.addPlugin(SubStatesPlugin.create(MenuSubState.type));

// 添加子状态系统
app.addSystems(OnEnter(MenuSubState.states.MAIN), (world, context) => {
	print("显示主菜单");
});

app.addSystems(OnEnter(MenuSubState.states.OPTIONS), (world, context) => {
	print("显示选项菜单");
});

// 在菜单间切换
function navigateToOptions(context: Context): void {
	const nextSubState = world.resources.getResource<NextState<typeof MenuSubState>>();
	nextSubState?.set(MenuSubState.states.OPTIONS);
}

// 退出菜单(子状态自动被移除)
function exitMenu(context: Context): void {
	const nextState = world.resources.getResource<NextState<typeof AppState>>();
	nextState?.set(AppState.GAME);
	// MenuSubState 会自动被清理,因为父状态不再是 MENU
}
```

### 示例 4: 复杂状态机 - 战斗系统

```typescript
// 战斗状态
const BattleState = createStates({
	IDLE: "idle",
	SELECTING_TARGET: "selecting_target",
	ATTACKING: "attacking",
	DEFENDING: "defending",
	USING_SKILL: "using_skill",
	VICTORY: "victory",
	DEFEAT: "defeat"
});

// 战斗阶段(计算状态)
class BattlePhaseState extends BaseComputedStates<typeof BattleState> {
	public static readonly SETUP = new BattlePhaseState("setup");
	public static readonly PLAYER_TURN = new BattlePhaseState("player_turn");
	public static readonly ENEMY_TURN = new BattlePhaseState("enemy_turn");
	public static readonly RESOLUTION = new BattlePhaseState("resolution");
	public static readonly ENDED = new BattlePhaseState("ended");

	constructor(private readonly phase: string) {
		super(new SingleStateSet(BattleState));
	}

	public getStateId(): string {
		return this.phase;
	}

	public compute(source: typeof BattleState | undefined): BattlePhaseState | undefined {
		if (!source) return undefined;

		if (source.equals(BattleState.IDLE)) {
			return BattlePhaseState.SETUP;
		} else if (
			source.equals(BattleState.SELECTING_TARGET) ||
			source.equals(BattleState.ATTACKING) ||
			source.equals(BattleState.USING_SKILL)
		) {
			return BattlePhaseState.PLAYER_TURN;
		} else if (source.equals(BattleState.DEFENDING)) {
			return BattlePhaseState.ENEMY_TURN;
		} else if (
			source.equals(BattleState.VICTORY) ||
			source.equals(BattleState.DEFEAT)
		) {
			return BattlePhaseState.ENDED;
		}

		return BattlePhaseState.RESOLUTION;
	}

	public clone(): States {
		return this;
	}
}

// 注册状态
app.addPlugin(StatesPlugin.create({ defaultState: () => BattleState.IDLE }));
app.addPlugin(new ComputedStatesPlugin(BattleState, BattlePhaseState));

// 战斗逻辑系统
app.addSystems(
	OnEnter(BattlePhaseState.PLAYER_TURN),
	(world: World, context: Context) => {
		print("玩家回合开始");
		showActionMenu(world);
	}
);

app.addSystems(
	OnEnter(BattlePhaseState.ENEMY_TURN),
	(world: World, context: Context) => {
		print("敌人回合开始");
		executeEnemyAI(world, context);
	}
);

app.addSystems(
	OnExit(BattlePhaseState.PLAYER_TURN),
	(world: World, context: Context) => {
		hideActionMenu(world);
	}
);

// 使用运行条件控制系统执行
app.addSystems(
	BuiltinSchedules.UPDATE,
	updateTargetSelectionSystem.runIf(
		inState(BattleState, BattleState.SELECTING_TARGET)
	)
);

app.addSystems(
	BuiltinSchedules.UPDATE,
	processAttackAnimationSystem.runIf(
		inState(BattleState, BattleState.ATTACKING)
	)
);
```

### 示例 5: 状态转换监听

```typescript
import {
	StateTransitionMessage,
	getStateTransitionReader,
	lastTransition
} from "@white-dragon-bevy/bevy-framework/bevy_state";

// 方式1: 使用事件读取器
app.addSystems(BuiltinSchedules.UPDATE, (world: World, context: Context) => {
	const reader = getStateTransitionReader<typeof GameState>(context.messages);

	for (const event of reader.read()) {
		// 记录所有状态转换
		logStateTransition(event);

		// 检查特定转换
		if (event.isTransition(GameState.LOADING, GameState.PLAYING)) {
			// 加载完成,显示欢迎消息
			showWelcomeMessage(world);
		}

		// 检查是否进入某状态
		if (event.isEnteringTo(GameState.GAME_OVER)) {
			// 保存游戏统计数据
			saveGameStats(context);
		}

		// 检查是否退出某状态
		if (event.isExitingFrom(GameState.PLAYING)) {
			// 暂停游戏音乐
			pauseMusic();
		}
	}
});

// 方式2: 获取最后一次转换
function checkLastTransition(context: Context): void {
	const lastTrans = lastTransition<typeof GameState>(world.resources);

	if (lastTrans) {
		print(`最后转换: ${lastTrans.exited?.getStateId()} → ${lastTrans.entered?.getStateId()}`);
	}
}
```

---

## 最佳实践

### 1. 状态设计原则

#### ✅ 好的做法

```typescript
// 使用清晰的状态命名
const GameState = createStates({
	MAIN_MENU: "main_menu",
	CHARACTER_SELECT: "character_select",
	IN_GAME: "in_game",
	PAUSED: "paused",
	GAME_OVER: "game_over"
});

// 使用计算状态避免重复逻辑
class CanSaveState extends BaseComputedStates<typeof GameState> {
	// 封装"是否可以保存"的逻辑
	public compute(source: typeof GameState | undefined): CanSaveState | undefined {
		if (!source) return undefined;

		const canSave = source.equals(GameState.IN_GAME) ||
		                source.equals(GameState.PAUSED);
		return canSave ? CanSaveState.YES : CanSaveState.NO;
	}
}
```

#### ❌ 避免的做法

```typescript
// 避免过于细粒度的状态
const BadGameState = createStates({
	MENU_FADE_IN: "menu_fade_in",
	MENU_VISIBLE: "menu_visible",
	MENU_FADE_OUT: "menu_fade_out",
	// ... 过多的动画状态
});

// 避免在多个地方重复相同的状态检查
function canSaveGame(state: State<typeof GameState>): boolean {
	return state.is(GameState.IN_GAME) || state.is(GameState.PAUSED);
}
// 这应该是计算状态!
```

### 2. 状态转换最佳实践

```typescript
// ✅ 使用 OnEnter/OnExit 进行资源管理
app.addSystems(OnEnter(GameState.PLAYING), (world, context) => {
	// 初始化游戏资源
	loadGameLevel(world);
	spawnPlayer(world);
});

app.addSystems(OnExit(GameState.PLAYING), (world, context) => {
	// 清理游戏资源
	saveProgress(context);
	// 状态作用域实体自动清理
});

// ✅ 使用 OnTransition 处理特定转换
app.addSystems(
	OnTransition(GameState.PLAYING, GameState.PAUSED),
	(world, context) => {
		// 暂停游戏时保存快照
		saveGameSnapshot(context);
	}
);

// ❌ 避免在 Update 中手动检查状态转换
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	// 不好的做法
	if (lastState === GameState.LOADING && currentState === GameState.PLAYING) {
		// 应该使用 OnTransition
	}
});
```

### 3. 状态作用域实体管理

```typescript
// ✅ 使用状态作用域自动管理UI生命周期
app.addSystems(OnEnter(GameState.MENU), (world, context) => {
	const titleEntity = world.spawn(TitleText({ text: "My Game" }));
	const playButton = world.spawn(Button({ label: "Play" }));
	const optionsButton = world.spawn(Button({ label: "Options" }));

	// 标记为在退出菜单时自动清理
	markForDespawnOnExit(world, titleEntity, GameState.MENU);
	markForDespawnOnExit(world, playButton, GameState.MENU);
	markForDespawnOnExit(world, optionsButton, GameState.MENU);

	// 或使用批量标记(更高效)
	markEntitiesForDespawnOnExit(
		world,
		[titleEntity, playButton, optionsButton],
		GameState.MENU
	);
});

// ❌ 避免手动管理实体清理
app.addSystems(OnExit(GameState.MENU), (world, context) => {
	// 不需要这样做!状态作用域会自动处理
	for (const [entity, ui] of world.query(UIComponent)) {
		world.despawn(entity);
	}
});
```

### 4. 运行条件最佳实践

```typescript
// ✅ 使用运行条件控制系统执行
app.addSystems(
	BuiltinSchedules.UPDATE,
	gameplayUpdateSystem.runIf(inState(GameState, GameState.PLAYING))
);

// ✅ 组合复杂条件
app.addSystems(
	BuiltinSchedules.UPDATE,
	multiplayerSyncSystem.runIf(
		andCondition(
			inState(GameState, GameState.PLAYING),
			inState(NetworkState, NetworkState.CONNECTED),
			customCondition((world, resources) => {
				// 自定义条件逻辑
				return resources.getResource<PlayerCount>()?.count > 1;
			})
		)
	)
);

// ✅ 使用 stateChanged 优化性能
// 仅在状态改变时更新UI
app.addSystems(
	BuiltinSchedules.UPDATE,
	updateStateIndicatorUI.runIf(stateChanged(GameState))
);

// ❌ 避免在系统内部重复检查状态
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	// 不好的做法
	const state = world.resources.getResource<State<typeof GameState>>();
	if (state?.is(GameState.PLAYING)) {
		// 应该使用 runIf
	}
});
```

### 5. 依赖深度管理

```typescript
// ✅ 正确设置依赖深度确保转换顺序
class ParentState extends BaseStates {
	public static readonly DEPENDENCY_DEPTH = 1;  // 根状态
	// ...
}

class ChildSubState extends BaseSubStates<ParentState> {
	public static readonly DEPENDENCY_DEPTH = 2;  // 依赖父状态
	// ...
}

class ComputedFromParent extends BaseComputedStates<ParentState> {
	constructor() {
		super(new SingleStateSet(ParentState));
		// 依赖深度自动计算为 2
	}
	// ...
}

// 转换顺序: Parent → Child → Computed (按依赖深度排序)
```

### 6. 性能优化技巧

```typescript
// ✅ 批量操作实体
const entities = collectAllUIEntities(world);
markEntitiesForDespawnOnExit(world, entities, GameState.MENU);

// ✅ 使用计算状态缓存复杂逻辑
class ExpensiveComputedState extends BaseComputedStates<typeof GameState> {
	public compute(source: typeof GameState | undefined): this | undefined {
		// 计算仅在源状态改变时执行
		return this.performExpensiveCalculation(source);
	}
}

// ✅ 使用 stateChanged 条件避免不必要的更新
app.addSystems(
	BuiltinSchedules.UPDATE,
	expensiveUIUpdateSystem.runIf(stateChanged(GameState))
);

// ❌ 避免每帧都检查状态
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	// 不好的做法 - 每帧都检查
	const state = world.resources.getResource<State<typeof GameState>>();
	if (state) {
		// ...
	}
});
```

### 7. 调试技巧

```typescript
// 添加状态转换日志系统
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	const reader = getStateTransitionReader<typeof GameState>(context.messages);

	for (const event of reader.read()) {
		const exitedId = event.exited?.getStateId();
		const enteredId = event.entered?.getStateId();
		print(`[State] ${exitedId} → ${enteredId}`);

		// 记录转换堆栈
		warn(debug.traceback());
	}
});

// 监控状态作用域实体
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
	const state = world.resources.getResource<State<typeof GameState>>();
	if (state) {
		const entities = getEntitiesInState(world, state.get());
		print(`[StateScoped] ${state.get().getStateId()}: ${entities.size()} entities`);
	}
});
```

### 8. 常见陷阱与解决方案

#### 陷阱 1: 忘记设置 NextState

```typescript
// ❌ 错误: 直接修改 State 资源
function startGame(context: Context): void {
	const state = world.resources.getResource<State<typeof GameState>>();
	state?.setInternal(GameState.PLAYING);  // 不会触发 OnEnter/OnExit!
}

// ✅ 正确: 使用 NextState
function startGame(context: Context): void {
	const nextState = world.resources.getResource<NextState<typeof GameState>>();
	nextState?.set(GameState.PLAYING);
}
```

#### 陷阱 2: 计算状态的源状态循环依赖

```typescript
// ❌ 错误: 循环依赖
class StateA extends BaseComputedStates<StateB> { ... }
class StateB extends BaseComputedStates<StateA> { ... }

// ✅ 正确: 避免循环依赖
class StateA extends BaseStates { ... }
class StateB extends BaseComputedStates<StateA> { ... }
```

#### 陷阱 3: 子状态配置错误

```typescript
// ❌ 错误: allowedParentStates 为空
const config: SubStateConfig<typeof GameState> = {
	parentType: GameState,
	allowedParentStates: new Set()  // 子状态永远不会存在!
};

// ✅ 正确: 指定允许的父状态
const config: SubStateConfig<typeof GameState> = {
	parentType: GameState,
	allowedParentStates: new Set(["menu", "options"])
};
```

---

## 总结

`bevy_state` 模块提供了完整的状态管理解决方案,适用于各种复杂的游戏和应用场景:

1. **标准状态**: 使用 `States` 和 `State<S>` 管理基本状态
2. **状态转换**: 利用 `OnEnter`/`OnExit`/`OnTransition` 调度钩子
3. **计算状态**: 使用 `ComputedStates` 自动派生状态
4. **子状态**: 使用 `SubStates` 创建层级状态结构
5. **状态作用域**: 使用 `StateScoped` 自动管理实体生命周期
6. **运行条件**: 使用 `inState` 等条件控制系统执行
7. **事件系统**: 使用 `StateTransitionMessage` 监听状态变化

遵循最佳实践,合理设计状态机架构,可以创建清晰、可维护的游戏逻辑。

---

## 参考资源

- [Bevy 官方文档 - States](https://docs.rs/bevy_state)
- [项目源码](../src/bevy_state/)
- [单元测试示例](../src/bevy_state/__tests__/)