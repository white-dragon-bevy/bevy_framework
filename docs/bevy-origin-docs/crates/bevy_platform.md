# Bevy Platform 平台支持库操作文档

## 概述

`bevy_platform` 是 Bevy 游戏引擎的平台兼容性支持库，提供跨平台的通用 API 以及特定平台的功能。该库主要解决了 Rust 标准库在游戏引擎开发中的一些限制，并支持 `no_std` 环境下的开发。

### 核心设计目标

1. **跨平台兼容性**：为不同平台提供统一的 API 接口
2. **no_std 支持**：支持嵌入式和其他特殊平台的开发
3. **性能优化**：提供比标准库更适合游戏引擎的替代实现
4. **确定性**：在需要的场合提供确定性的行为（如哈希算法）

## 主要模块功能

### 1. 配置系统 (`cfg`)

配置系统提供了条件编译的高级宏，用于处理不同平台和功能的差异。

#### 核心宏定义

- `switch!`：类似 `match` 的条件编译表达式
- `define_alias!`：定义配置别名
- `enabled!` / `disabled!`：表示启用/禁用状态

#### 预定义别名

```rust
// 检查是否有 alloc 支持
cfg::alloc! {
    // 需要 alloc 的代码
}

// 检查是否有 std 支持
cfg::std! {
    // 需要 std 的代码
}

// 检查是否是 Web 平台
cfg::web! {
    // Web 特定代码
}

// 检查是否支持原生 Arc
cfg::arc! {
    // 使用原生 Arc 的代码
}
```

#### 使用示例

```rust
use bevy_platform::cfg;

// 条件编译示例
cfg::switch! {
    #[cfg(feature = "custom_feature")] => {
        // 自定义功能代码
    }
    cfg::std => {
        // 标准库代码
        extern crate std;
        std::println!("使用标准库");
    }
    _ => {
        // 默认情况
        log("使用默认实现");
    }
}

// 检查功能可用性
if cfg::std!() {
    // 标准库可用
} else {
    // 标准库不可用
}
```

### 2. 集合类型 (`collections`)

提供基于 `hashbrown` 的高性能集合类型，默认使用确定性哈希算法。

#### HashMap

```rust
use bevy_platform::collections::HashMap;

// 创建新的 HashMap（使用确定性哈希）
let mut map = HashMap::new();

// 带容量创建
let mut map = HashMap::with_capacity(10);

// 基本操作
map.insert("key1", "value1");
map.insert("key2", "value2");

// 查询操作
if let Some(value) = map.get("key1") {
    println!("找到值: {}", value);
}

// 迭代
for (key, value) in &map {
    println!("{}: {}", key, value);
}

// 批量获取可变引用
let keys = ["key1", "key2"];
let values = map.get_many_mut(keys);
```

#### HashSet

```rust
use bevy_platform::collections::HashSet;

let mut set = HashSet::new();
set.insert("item1");
set.insert("item2");

// 检查元素存在
if set.contains("item1") {
    println!("包含 item1");
}

// 集合操作
let other_set = HashSet::from(["item2", "item3"]);
let intersection: HashSet<_> = set.intersection(&other_set).collect();
```

### 3. 哈希系统 (`hash`)

提供多种哈希算法实现，适用于不同场景。

#### 主要哈希器类型

```rust
use bevy_platform::hash::{DefaultHasher, FixedHasher, PassHasher, NoOpHash};

// 确定性哈希器（游戏引擎推荐）
let hasher = FixedHasher;

// 随机哈希器（安全性更高）
let random_hasher = RandomState::new();

// 预哈希值类型
use bevy_platform::hash::Hashed;

let hashed_value = Hashed::<String, FixedHasher>::new("hello".to_string());
println!("哈希值: {}", hashed_value.hash());
```

#### 使用场景

- **FixedHasher**：游戏状态、确定性行为需要
- **RandomState**：防御哈希攻击、网络应用
- **PassHasher**：已预计算哈希值的场景
- **NoOpHash**：高质量哈希值直接使用

### 4. 同步原语 (`sync`)

提供跨平台的同步原语，支持 `std` 和 `no_std` 环境。

#### Mutex（互斥锁）

```rust
use bevy_platform::sync::Mutex;
use std::thread;

let mutex = Mutex::new(0);

// 锁定和修改
{
    let mut data = mutex.lock().unwrap();
    *data += 1;
}

// 尝试锁定
if let Ok(mut data) = mutex.try_lock() {
    *data += 1;
}
```

#### RwLock（读写锁）

```rust
use bevy_platform::sync::RwLock;

let lock = RwLock::new(5);

// 读锁（多个线程可同时持有）
{
    let data = lock.read().unwrap();
    println!("读取到: {}", *data);
}

// 写锁（独占访问）
{
    let mut data = lock.write().unwrap();
    *data += 1;
}
```

#### Arc（原子引用计数）

```rust
use bevy_platform::sync::Arc;
use std::thread;

let data = Arc::new(42);
let data_clone = Arc::clone(&data);

thread::spawn(move || {
    println!("线程中的值: {}", *data_clone);
});

println!("主线程中的值: {}", *data);
```

#### 其他同步原语

```rust
use bevy_platform::sync::{Barrier, Once, OnceState, LazyLock};

// 屏障同步
let barrier = Arc::new(Barrier::new(3));

// 一次性初始化
let mut once = Once::new();
once.call_once(|| {
    println!("只执行一次");
});

// 懒加载
static LAZY_VALUE: LazyLock<String> = LazyLock::new(|| {
    "懒加载的值".to_string()
});
```

### 5. 单元格原语 (`cell`)

提供线程安全的单元格类型。

```rust
use bevy_platform::cell::{SyncCell, SyncUnsafeCell};

// 同步单元格
let cell = SyncCell::new(42);
let value = cell.get();

// 同步不安全单元格（更高性能，需要手动保证安全性）
let unsafe_cell = SyncUnsafeCell::new(42);
unsafe {
    let ptr = unsafe_cell.get();
    *ptr = 43;
}
```

### 6. 线程支持 (`thread`)

提供跨平台的线程休眠功能。

```rust
use bevy_platform::thread::sleep;
use std::time::Duration;

// 让当前线程休眠
sleep(Duration::from_millis(100));
```

在 `no_std` 环境下，会使用自旋等待的回退实现。

### 7. 时间支持 (`time`)

提供跨平台的时间测量。

```rust
use bevy_platform::time::Instant;

let start = Instant::now();
// 执行一些操作
let duration = start.elapsed();
println!("操作耗时: {:?}", duration);
```

## 特性功能配置

### 默认特性

- `std`：启用标准库支持
- `alloc`：启用堆分配支持

### 可选特性

- `serialize`：启用序列化支持（通过 serde）
- `rayon`：启用并行处理支持
- `critical-section`：使用临界区作为同步后端
- `web`：启用浏览器 API 支持

### 配置示例

```toml
[dependencies]
bevy_platform = { version = "0.17.0", features = ["serialize", "rayon"] }

# no_std 配置
bevy_platform = { version = "0.17.0", default-features = false, features = ["alloc"] }

# 嵌入式配置
bevy_platform = { version = "0.17.0", default-features = false, features = ["critical-section"] }
```

## 与其他 Bevy 模块的集成

### 1. ECS 系统集成

```rust
use bevy_platform::collections::HashMap;
use bevy_platform::sync::{Arc, Mutex};

// 在 ECS 组件中使用
#[derive(Component)]
struct GameState {
    data: HashMap<String, i32>,
    shared_resource: Arc<Mutex<Vec<String>>>,
}
```

### 2. 资源管理集成

```rust
use bevy_platform::hash::Hashed;

// 预哈希的资源键
type ResourceKey = Hashed<String>;

let key = ResourceKey::new("texture/player.png".to_string());
// 可以高效地用作 HashMap 键
```

### 3. 插件系统集成

```rust
use bevy_platform::cfg;

pub struct PlatformSpecificPlugin;

impl Plugin for PlatformSpecificPlugin {
    fn build(&self, app: &mut App) {
        cfg::switch! {
            cfg::web => {
                app.add_systems(Update, web_specific_system);
            }
            cfg::std => {
                app.add_systems(Update, desktop_specific_system);
            }
            _ => {
                app.add_systems(Update, fallback_system);
            }
        }
    }
}
```

## 常见使用场景

### 1. 游戏状态管理

```rust
use bevy_platform::collections::HashMap;
use bevy_platform::sync::{RwLock, Arc};

#[derive(Resource)]
struct GameStateManager {
    states: Arc<RwLock<HashMap<String, GameStateData>>>,
}

impl GameStateManager {
    pub fn new() -> Self {
        Self {
            states: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn set_state(&self, key: String, data: GameStateData) {
        let mut states = self.states.write().unwrap();
        states.insert(key, data);
    }

    pub fn get_state(&self, key: &str) -> Option<GameStateData> {
        let states = self.states.read().unwrap();
        states.get(key).cloned()
    }
}
```

### 2. 缓存系统

```rust
use bevy_platform::hash::Hashed;
use bevy_platform::collections::HashMap;
use bevy_platform::sync::Mutex;

type CacheKey = Hashed<String>;

struct ResourceCache<T> {
    cache: Mutex<HashMap<CacheKey, T>>,
}

impl<T: Clone> ResourceCache<T> {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_or_insert<F>(&self, key: String, factory: F) -> T
    where
        F: FnOnce() -> T,
    {
        let cache_key = CacheKey::new(key);
        let mut cache = self.cache.lock().unwrap();

        cache.entry(cache_key)
            .or_insert_with(factory)
            .clone()
    }
}
```

### 3. 跨平台配置

```rust
use bevy_platform::cfg;

pub fn setup_platform_specific() {
    cfg::switch! {
        cfg::web => {
            // Web 平台配置
            setup_web_rendering();
            setup_web_input();
        }
        #[cfg(target_os = "android")] => {
            // Android 平台配置
            setup_android_lifecycle();
        }
        cfg::std => {
            // 桌面平台配置
            setup_desktop_window();
        }
        _ => {
            // 嵌入式或其他平台
            setup_minimal_systems();
        }
    }
}
```

### 4. 多线程任务调度

```rust
use bevy_platform::sync::{Arc, Mutex, Barrier};
use bevy_platform::collections::HashMap;

struct TaskScheduler {
    tasks: Arc<Mutex<HashMap<String, Task>>>,
    barrier: Arc<Barrier>,
}

impl TaskScheduler {
    pub fn new(worker_count: usize) -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            barrier: Arc::new(Barrier::new(worker_count)),
        }
    }

    pub fn schedule_task(&self, id: String, task: Task) {
        let mut tasks = self.tasks.lock().unwrap();
        tasks.insert(id, task);
    }

    pub fn wait_for_completion(&self) {
        self.barrier.wait();
    }
}
```

## 性能考虑

### 1. 哈希算法选择

- **确定性场景**：使用 `FixedHasher`
- **安全性要求**：使用 `RandomState`
- **已有高质量哈希**：使用 `NoOpHash`

### 2. 内存分配优化

```rust
use bevy_platform::collections::HashMap;

// 预分配容量避免频繁重新分配
let mut map = HashMap::with_capacity(1000);

// 使用 retain 而不是 clear + insert
map.retain(|_, v| v.is_valid());
```

### 3. 锁竞争最小化

```rust
use bevy_platform::sync::RwLock;

// 优先使用读锁
let data = shared_data.read().unwrap();
let result = data.compute_readonly_operation();
drop(data); // 尽早释放锁

// 必要时才使用写锁
if result.needs_update {
    let mut data = shared_data.write().unwrap();
    data.update();
}
```

## 错误处理和调试

### 1. 锁错误处理

```rust
use bevy_platform::sync::{Mutex, TryLockError};

let mutex = Mutex::new(42);

match mutex.try_lock() {
    Ok(guard) => {
        // 使用锁保护的数据
    }
    Err(TryLockError::Poisoned(err)) => {
        // 处理锁中毒
        eprintln!("锁已中毒: {:?}", err);
    }
    Err(TryLockError::WouldBlock) => {
        // 锁被其他线程持有
        eprintln!("锁暂时不可用");
    }
}
```

### 2. 调试辅助

```rust
use bevy_platform::collections::HashMap;

let map: HashMap<String, i32> = HashMap::new();
println!("HashMap 调试信息: {:?}", map);
println!("容量: {}", map.capacity());
println!("内存使用: {} 字节", map.allocation_size());
```

## 迁移指南

### 从 std 迁移到 bevy_platform

```rust
// 替换标准库导入
// 之前:
// use std::collections::HashMap;
// use std::sync::{Arc, Mutex};

// 之后:
use bevy_platform::collections::HashMap;
use bevy_platform::sync::{Arc, Mutex};

// 使用 prelude 简化导入
use bevy_platform::prelude::*;
```

### no_std 迁移

```rust
#![no_std]

// 使用 bevy_platform 的 prelude
use bevy_platform::prelude::*;

// 条件性地使用功能
use bevy_platform::cfg;

cfg::alloc! {
    // 需要堆分配的代码
    let vec = Vec::new();
}

cfg::std! {
    // 需要标准库的代码
    extern crate std;
}
```

这份文档涵盖了 bevy_platform 的主要功能和使用方法。该库是 Bevy 引擎实现跨平台兼容性的基础，提供了高性能、确定性的替代实现，特别适合游戏引擎的需求。