# Bevy Derive 模块文档

## 模块概述

`bevy_derive` 是 Bevy 引擎的核心过程宏（procedural macro）库，提供了一系列自动代码生成功能。该模块的主要职责是简化常见的 Rust trait 实现，减少样板代码，并为 Bevy 应用程序提供特定的宏功能。

### 主要功能

1. **Deref/DerefMut 派生宏**：自动实现智能指针行为，特别适用于新类型模式（newtype pattern）
2. **Android 主函数生成器**：为 Android 平台生成必要的入口点代码
3. **枚举变体元信息**：为枚举类型添加获取变体索引和名称的方法
4. **应用标签**：生成 `AppLabel` trait 的实现

## 核心结构体和枚举

### 过程宏列表

该模块导出以下过程宏：

- `#[derive(Deref)]` - 自动实现 `std::ops::Deref` trait
- `#[derive(DerefMut)]` - 自动实现 `std::ops::DerefMut` trait
- `#[bevy_main]` - 生成 Android 平台的主函数样板代码
- `#[derive(EnumVariantMeta)]` - 为枚举添加变体元信息方法
- `#[derive(AppLabel)]` - 实现 `AppLabel` trait

## 主要 API 使用示例

### 1. Deref 派生宏

#### 单字段结构体（自动推导）

```rust
use bevy_derive::Deref;

// 元组结构体
#[derive(Deref)]
struct MyNewtype(String);

let foo = MyNewtype(String::from("Hello"));
assert_eq!("Hello", *foo);

// 命名字段结构体
#[derive(Deref)]
struct MyStruct {
    value: String,
}

let foo = MyStruct {
    value: String::from("Hello")
};
assert_eq!("Hello", *foo);
```

#### 多字段结构体（需要 #[deref] 属性）

```rust
use bevy_derive::Deref;
use std::marker::PhantomData;

// 元组结构体 - 指定第二个字段
#[derive(Deref)]
struct MyStruct<T>(usize, #[deref] String, PhantomData<T>);

let foo = MyStruct(123, String::from("Hello"), PhantomData::<i32>);
assert_eq!("Hello", *foo);
assert_eq!(123, foo.0); // 仍可访问其他字段

// 命名字段结构体 - 指定特定字段
#[derive(Deref)]
struct MyData<T> {
    id: usize,
    #[deref]
    content: String,
    _phantom: PhantomData<T>,
}

let data = MyData {
    id: 42,
    content: String::from("Hello"),
    _phantom: PhantomData::<f64>,
};
assert_eq!("Hello", *data);
assert_eq!(42, data.id);
```

### 2. DerefMut 派生宏

```rust
use bevy_derive::{Deref, DerefMut};

#[derive(Deref, DerefMut)]
struct MyNewtype(String);

let mut foo = MyNewtype(String::from("Hello"));
foo.push_str(" World!");
assert_eq!("Hello World!", *foo);

// 多字段示例
#[derive(Deref, DerefMut)]
struct MyStruct<T> {
    #[deref]
    value: String,
    _phantom: PhantomData<T>,
}

let mut foo = MyStruct {
    value: String::from("Hello"),
    _phantom: PhantomData::<usize>
};
foo.push_str(" World!");
assert_eq!("Hello World!", *foo);
```

### 3. Android 主函数宏

```rust
use bevy::prelude::*;

#[bevy_main]
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .run();
}
```

该宏会自动生成：
- Android 平台的 `android_main` 函数
- 正确的 Android 应用程序初始化代码
- 原始 `main` 函数的保留

### 4. 枚举变体元信息

```rust
use bevy_derive::EnumVariantMeta;

#[derive(EnumVariantMeta)]
enum GameState {
    Menu,
    Playing,
    Paused,
    GameOver,
}

let state = GameState::Playing;
assert_eq!(1, state.enum_variant_index());
assert_eq!("Playing", state.enum_variant_name());

let menu = GameState::Menu;
assert_eq!(0, menu.enum_variant_index());
assert_eq!("Menu", menu.enum_variant_name());
```

支持带数据的枚举变体：

```rust
#[derive(EnumVariantMeta)]
enum Message {
    Text(String),
    Number(i32),
    Quit,
}

let msg = Message::Text("Hello".to_string());
assert_eq!(0, msg.enum_variant_index());
assert_eq!("Text", msg.enum_variant_name());

let num = Message::Number(42);
assert_eq!(1, num.enum_variant_index());
assert_eq!("Number", num.enum_variant_name());
```

### 5. 应用标签派生

```rust
use bevy_derive::AppLabel;

#[derive(AppLabel)]
struct MyAppLabel;

// 现在 MyAppLabel 实现了 AppLabel trait
// 可以用于 Bevy 的应用程序标识和组织
```

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_app 的集成

- `#[derive(AppLabel)]` 直接与 `bevy_app` 模块集成
- `#[bevy_main]` 为 Android 应用提供正确的入口点

### 2. 与资源和组件系统的集成

Deref 宏常用于包装 Bevy 资源和组件：

```rust
use bevy::prelude::*;
use bevy_derive::{Deref, DerefMut};

#[derive(Resource, Deref, DerefMut)]
struct GameScore(i32);

#[derive(Component, Deref)]
struct Health(f32);

fn setup(mut commands: Commands) {
    commands.insert_resource(GameScore(0));
    commands.spawn(Health(100.0));
}

fn update_score(mut score: ResMut<GameScore>) {
    **score += 10; // 使用 DerefMut
}

fn check_health(query: Query<&Health>) {
    for health in query.iter() {
        if **health <= 0.0 { // 使用 Deref
            println!("Player is dead!");
        }
    }
}
```

### 3. 与状态管理的集成

```rust
use bevy::prelude::*;
use bevy_derive::EnumVariantMeta;

#[derive(States, Default, Clone, Eq, PartialEq, Debug, Hash, EnumVariantMeta)]
enum AppState {
    #[default]
    MainMenu,
    InGame,
    Paused,
}

fn debug_state_system(state: Res<State<AppState>>) {
    let current = state.get();
    println!("Current state: {} (index: {})",
             current.enum_variant_name(),
             current.enum_variant_index());
}
```

## 常见使用场景

### 1. 新类型模式（Newtype Pattern）

创建类型安全的包装器：

```rust
use bevy_derive::{Deref, DerefMut};

#[derive(Deref, DerefMut)]
struct PlayerId(u32);

#[derive(Deref, DerefMut)]
struct Score(i32);

// 防止意外的类型混淆
fn update_player_score(player_id: PlayerId, score: Score) {
    println!("Player {} has score {}", *player_id, *score);
}
```

### 2. 智能指针和容器包装

```rust
use bevy_derive::{Deref, DerefMut};
use std::collections::HashMap;

#[derive(Deref, DerefMut)]
struct PlayerInventory(HashMap<String, i32>);

impl PlayerInventory {
    fn new() -> Self {
        Self(HashMap::new())
    }

    fn add_item(&mut self, item: String, count: i32) {
        *self.entry(item).or_insert(0) += count;
    }
}
```

### 3. 配置和设置包装

```rust
use bevy_derive::Deref;
use serde::{Deserialize, Serialize};

#[derive(Deref, Serialize, Deserialize)]
struct GameConfig {
    #[deref]
    settings: GameSettings,
    version: String,
}

#[derive(Serialize, Deserialize)]
struct GameSettings {
    volume: f32,
    difficulty: String,
}
```

### 4. 跨平台应用入口

```rust
use bevy::prelude::*;

#[bevy_main]
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup)
        .add_systems(Update, game_loop)
        .run();
}

fn setup(mut commands: Commands) {
    // 游戏初始化
}

fn game_loop() {
    // 主游戏循环
}
```

### 5. 调试和开发工具

```rust
use bevy_derive::EnumVariantMeta;

#[derive(EnumVariantMeta)]
enum LogLevel {
    Debug,
    Info,
    Warning,
    Error,
}

impl LogLevel {
    fn log(&self, message: &str) {
        println!("[{}:{}] {}",
                 self.enum_variant_name(),
                 self.enum_variant_index(),
                 message);
    }
}
```

## 使用注意事项

### Deref/DerefMut 限制

1. **单字段自动推导**：只有单字段结构体才能自动推导 deref 目标
2. **多字段必须标注**：多字段结构体必须使用 `#[deref]` 属性标记目标字段
3. **只能标记一个字段**：每个结构体只能有一个字段被标记为 deref 目标
4. **DerefMut 需要 Deref**：使用 `DerefMut` 派生必须同时实现 `Deref`

### bevy_main 限制

1. **只能用于 main 函数**：该属性只能应用于名为 `main` 的函数
2. **Android 特定**：生成的代码主要用于 Android 平台支持

### EnumVariantMeta 限制

1. **仅支持枚举**：该派生宏只能用于枚举类型
2. **索引基于定义顺序**：变体索引基于在枚举中的定义顺序

## 错误处理和常见问题

### 编译错误示例

```rust
// ❌ 错误：多字段结构体缺少 #[deref] 属性
#[derive(Deref)]
struct BadStruct {
    field1: String,
    field2: i32,
}
// 编译错误：requires one field to have the `#[deref]` attribute

// ❌ 错误：多个字段被标记为 deref
#[derive(Deref)]
struct BadStruct2 {
    #[deref]
    field1: String,
    #[deref]  // 编译错误：只能有一个字段被标记
    field2: String,
}

// ✅ 正确：单字段自动推导
#[derive(Deref)]
struct GoodStruct(String);

// ✅ 正确：多字段指定目标
#[derive(Deref)]
struct GoodStruct2 {
    #[deref]
    content: String,
    metadata: i32,
}
```

### 最佳实践

1. **优先使用单字段结构体**：如果可能，设计为单字段以避免额外的属性标记
2. **组合使用 Deref 和 DerefMut**：通常一起派生以获得完整的智能指针行为
3. **明确字段用途**：在多字段结构体中，选择最重要或最常访问的字段作为 deref 目标
4. **文档化 deref 行为**：在复杂类型中，明确文档化哪个字段是 deref 目标

这个模块是 Bevy 生态系统中的基础组件，大大简化了常见的 Rust 编程模式，让开发者能够专注于游戏逻辑而不是样板代码。