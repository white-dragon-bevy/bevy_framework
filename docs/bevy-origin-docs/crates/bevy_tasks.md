# Bevy Tasks 中文操作文档

## 模块概述

Bevy Tasks 是 Bevy 引擎的异步任务执行系统，提供了一个轻量级、高效的线程池实现。该模块专为游戏开发场景设计，支持 fork-join 模式的并行计算，并针对性能进行了优化。

### 主要功能

- **多线程任务执行**：基于 `async-executor` 提供高效的异步任务调度
- **作用域任务**：支持 scoped tasks，允许借用局部变量
- **全局任务池**：提供三种预定义的全局任务池，用于不同类型的工作负载
- **并行迭代器**：提供类似 `rayon` 的并行处理接口
- **切片并行处理**：支持并行处理数组和切片数据
- **跨平台支持**：支持多线程和单线程环境（包括 WASM）

## 核心结构体和枚举

### 1. TaskPool

任务池是执行异步任务的核心组件。

```rust
pub struct TaskPool {
    executor: Arc<crate::executor::Executor<'static>>,
    threads: Vec<JoinHandle<()>>,
    shutdown_tx: async_channel::Sender<()>,
}
```

**主要方法：**
- `new()` - 创建默认配置的任务池
- `spawn<T>()` - spawning 静态生命周期的异步任务
- `spawn_local<T>()` - 在当前线程上执行非 Send 任务
- `scope<F, T>()` - 创建作用域，支持借用局部变量
- `thread_num()` - 获取线程池中的线程数量

### 2. TaskPoolBuilder

用于构建自定义配置的任务池。

```rust
pub struct TaskPoolBuilder {
    num_threads: Option<usize>,
    stack_size: Option<usize>,
    thread_name: Option<String>,
    on_thread_spawn: Option<Arc<dyn Fn() + Send + Sync + 'static>>,
    on_thread_destroy: Option<Arc<dyn Fn() + Send + Sync + 'static>>,
}
```

**主要方法：**
- `new()` - 创建构建器
- `num_threads(usize)` - 设置线程数
- `stack_size(usize)` - 设置线程栈大小
- `thread_name(String)` - 设置线程名称
- `on_thread_spawn()` - 设置线程启动回调
- `on_thread_destroy()` - 设置线程销毁回调
- `build()` - 构建任务池

### 3. Task

封装异步任务的执行句柄。

```rust
pub struct Task<T>(/* 平台相关的内部实现 */);
```

**主要方法：**
- `detach()` - 分离任务，让其在后台继续运行
- `cancel()` - 取消任务并等待其停止
- `is_finished()` - 检查任务是否已完成

### 4. Scope

作用域对象，允许在任务中借用局部变量。

```rust
pub struct Scope<'scope, 'env: 'scope, T> {
    executor: &'scope crate::executor::Executor<'scope>,
    external_executor: &'scope ThreadExecutor<'scope>,
    scope_executor: &'scope ThreadExecutor<'scope>,
    spawned: &'scope ConcurrentQueue<FallibleTask<Result<T, Box<dyn core::any::Any + Send>>>>,
    // 生命周期标记
}
```

**主要方法：**
- `spawn<Fut>()` - 在任务池中执行任务
- `spawn_on_scope<Fut>()` - 在作用域线程上执行任务
- `spawn_on_external<Fut>()` - 在外部线程上执行任务

### 5. 全局任务池类型

```rust
// CPU 密集型任务池（必须在下一帧前完成）
pub struct ComputeTaskPool(TaskPool);

// CPU 密集型任务池（可跨多帧执行）
pub struct AsyncComputeTaskPool(TaskPool);

// IO 密集型任务池
pub struct IoTaskPool(TaskPool);
```

### 6. ThreadExecutor

单线程执行器，只能在创建它的线程上执行。

```rust
pub struct ThreadExecutor<'task> {
    executor: Executor<'task>,
    thread_id: ThreadId,
}
```

## 主要 API 使用示例

### 1. 基本任务执行

```rust
use bevy_tasks::TaskPool;

// 创建任务池
let pool = TaskPool::new();

// 执行简单任务
let task = pool.spawn(async {
    // 执行一些计算
    42
});

// 等待结果
let result = futures_lite::future::block_on(task);
assert_eq!(result, 42);
```

### 2. 使用作用域任务

```rust
use bevy_tasks::TaskPool;

let pool = TaskPool::new();
let mut data = vec![1, 2, 3, 4, 5];

// 使用 scope 可以借用局部变量
let results = pool.scope(|s| {
    for (i, item) in data.iter_mut().enumerate() {
        s.spawn(async move {
            *item *= 2;  // 修改借用的数据
            i
        });
    }
});

assert_eq!(data, vec![2, 4, 6, 8, 10]);
```

### 3. 自定义任务池配置

```rust
use bevy_tasks::TaskPoolBuilder;

let pool = TaskPoolBuilder::new()
    .num_threads(4)
    .stack_size(1024 * 1024)  // 1MB 栈
    .thread_name("CustomPool".to_string())
    .on_thread_spawn(|| {
        println!("Thread started!");
    })
    .on_thread_destroy(|| {
        println!("Thread ended!");
    })
    .build();
```

### 4. 全局任务池使用

```rust
use bevy_tasks::{ComputeTaskPool, AsyncComputeTaskPool, IoTaskPool};
use bevy_tasks::TaskPoolBuilder;

// 初始化全局任务池
let compute_pool = ComputeTaskPool::get_or_init(|| {
    TaskPoolBuilder::new()
        .num_threads(4)
        .thread_name("Compute".to_string())
        .build()
});

// 使用全局任务池
let task = compute_pool.spawn(async {
    // 执行 CPU 密集型计算
    heavy_computation()
});

async fn heavy_computation() -> i32 {
    // 模拟复杂计算
    std::thread::sleep(std::time::Duration::from_millis(100));
    42
}
```

### 5. 并行切片处理

```rust
use bevy_tasks::{TaskPool, ParallelSlice, ParallelSliceMut};

let pool = TaskPool::new();
let data = (0..10000).collect::<Vec<u32>>();

// 并行处理只读切片
let results = data.par_chunk_map(&pool, 100, |_index, chunk| {
    chunk.iter().sum::<u32>()
});

// 并行处理可变切片
let mut data = (0..10000).collect::<Vec<u32>>();
let results = data.par_chunk_map_mut(&pool, 100, |_index, chunk| {
    for item in chunk {
        *item *= 2;
    }
    chunk.len()
});
```

### 6. 并行迭代器

```rust
use bevy_tasks::{TaskPool, ParallelIterator};

let pool = TaskPool::new();
let data = (0..1000).collect::<Vec<i32>>();

// 使用并行迭代器
let sum = data
    .par_splat_map(&pool, None, |_index, chunk| {
        chunk.iter().sum::<i32>()
    })
    .iter()
    .sum::<i32>();
```

### 7. ThreadExecutor 使用

```rust
use bevy_tasks::ThreadExecutor;
use std::sync::{Arc, atomic::{AtomicI32, Ordering}};

let executor = ThreadExecutor::new();
let counter = Arc::new(AtomicI32::new(0));

// 从其他线程 spawn 任务
let counter_clone = counter.clone();
std::thread::scope(|scope| {
    scope.spawn(|| {
        // 无法获取 ticker（不在原始线程上）
        assert!(executor.ticker().is_none());

        // 但可以 spawn 任务
        executor.spawn(async move {
            counter_clone.fetch_add(1, Ordering::Relaxed);
        }).detach();
    });
});

// 在原始线程上执行任务
let ticker = executor.ticker().unwrap();
ticker.try_tick();
assert_eq!(counter.load(Ordering::Relaxed), 1);
```

## 与其他 Bevy 模块的集成方式

### 1. ECS 系统中的使用

```rust
use bevy_ecs::prelude::*;
use bevy_tasks::ComputeTaskPool;

fn parallel_system(
    compute_pool: Res<ComputeTaskPool>,
    mut query: Query<&mut Transform>,
) {
    let entities: Vec<_> = query.iter_mut().collect();

    // 将实体分批并行处理
    entities.par_chunk_map_mut(&compute_pool, 100, |_index, chunk| {
        for mut transform in chunk {
            // 并行更新变换
            transform.translation.x += 1.0;
        }
    });
}
```

### 2. 资产加载中的使用

```rust
use bevy_tasks::IoTaskPool;
use bevy_asset::prelude::*;

fn async_load_asset() {
    let io_pool = IoTaskPool::get();

    let task = io_pool.spawn(async {
        // 异步加载文件
        std::fs::read_to_string("asset.json").unwrap()
    });

    // 任务会在 IO 线程池中执行
}
```

### 3. 渲染管线中的使用

```rust
use bevy_tasks::AsyncComputeTaskPool;
use bevy_render::prelude::*;

fn prepare_render_data() {
    let async_pool = AsyncComputeTaskPool::get();

    let task = async_pool.spawn(async {
        // 异步准备渲染数据
        prepare_mesh_data()
    });

    // 这个任务可以跨多帧执行
}

fn prepare_mesh_data() -> Vec<f32> {
    // 生成顶点数据
    vec![0.0; 1000]
}
```

## 常见使用场景

### 1. 大量实体的并行处理

```rust
use bevy_tasks::{ComputeTaskPool, ParallelSliceMut};

fn update_physics(
    pool: Res<ComputeTaskPool>,
    mut entities: Query<(&mut Transform, &Velocity)>,
) {
    let mut transforms: Vec<_> = entities.iter_mut().collect();

    transforms.par_splat_map_mut(&pool, None, |_index, chunk| {
        for (mut transform, velocity) in chunk {
            transform.translation += velocity.0 * 0.016; // 60 FPS
        }
    });
}
```

### 2. 异步资源加载

```rust
use bevy_tasks::IoTaskPool;

#[derive(Component)]
struct AsyncTexture {
    task: Option<Task<Vec<u8>>>,
}

fn start_texture_loading(
    mut commands: Commands,
    io_pool: Res<IoTaskPool>,
) {
    let task = io_pool.spawn(async {
        // 异步加载纹理数据
        std::fs::read("texture.png").unwrap()
    });

    commands.spawn(AsyncTexture {
        task: Some(task)
    });
}

fn check_texture_loading(
    mut query: Query<&mut AsyncTexture>,
) {
    for mut async_texture in query.iter_mut() {
        if let Some(task) = &async_texture.task {
            if task.is_finished() {
                // 纹理加载完成，处理数据
                let data = async_texture.task.take().unwrap();
                // 处理纹理数据...
            }
        }
    }
}
```

### 3. 复杂计算的异步执行

```rust
use bevy_tasks::AsyncComputeTaskPool;

#[derive(Component)]
struct PathfindingTask {
    task: Option<Task<Vec<Vec2>>>,
}

fn start_pathfinding(
    mut commands: Commands,
    async_pool: Res<AsyncComputeTaskPool>,
    query: Query<(Entity, &Transform), With<NeedPathfinding>>,
) {
    for (entity, transform) in query.iter() {
        let start = transform.translation.truncate();
        let goal = Vec2::new(100.0, 100.0);

        let task = async_pool.spawn(async move {
            // 复杂的路径搜索算法
            a_star_pathfinding(start, goal)
        });

        commands.entity(entity).insert(PathfindingTask {
            task: Some(task)
        });
    }
}

fn a_star_pathfinding(start: Vec2, goal: Vec2) -> Vec<Vec2> {
    // 实现 A* 算法
    vec![start, goal]
}
```

### 4. 批量数据处理

```rust
use bevy_tasks::{ComputeTaskPool, ParallelSlice};

fn process_simulation_data(
    pool: Res<ComputeTaskPool>,
    mut simulation: ResMut<SimulationData>,
) {
    let results = simulation.particles.par_chunk_map(
        &pool,
        1000,  // 每个任务处理 1000 个粒子
        |_index, particles| {
            // 并行计算粒子物理
            let mut new_positions = Vec::new();
            for particle in particles {
                let new_pos = calculate_particle_physics(particle);
                new_positions.push(new_pos);
            }
            new_positions
        }
    );

    // 合并结果
    simulation.particles = results.into_iter().flatten().collect();
}

fn calculate_particle_physics(particle: &Particle) -> Vec3 {
    // 复杂的物理计算
    particle.position + particle.velocity * 0.016
}
```

### 5. 多阶段渲染准备

```rust
use bevy_tasks::{ComputeTaskPool, AsyncComputeTaskPool};

fn prepare_render_pipeline(
    compute_pool: Res<ComputeTaskPool>,
    async_pool: Res<AsyncComputeTaskPool>,
    meshes: Query<&Mesh>,
) {
    // 第一阶段：必须在当前帧完成的计算
    let frustum_culling_results = compute_pool.scope(|s| {
        for mesh in meshes.iter() {
            s.spawn(async move {
                perform_frustum_culling(mesh)
            });
        }
    });

    // 第二阶段：可以跨帧的异步计算
    for result in frustum_culling_results {
        if result.visible {
            async_pool.spawn(async move {
                prepare_render_commands(result.mesh_id)
            }).detach();
        }
    }
}

struct CullingResult {
    visible: bool,
    mesh_id: u32,
}

fn perform_frustum_culling(mesh: &Mesh) -> CullingResult {
    // 视锥体裁剪计算
    CullingResult { visible: true, mesh_id: 0 }
}

fn prepare_render_commands(mesh_id: u32) {
    // 准备渲染命令
}
```

## 性能注意事项

1. **任务开销**：创建任务有一定开销，避免创建过多小任务
2. **批次大小**：合理设置批次大小，平衡并行度和开销
3. **内存分配**：避免在高频任务中进行大量内存分配
4. **线程数量**：根据目标硬件合理配置线程数量
5. **任务依赖**：避免复杂的任务依赖关系，优先使用简单的 fork-join 模式

## 最佳实践

1. **使用适当的任务池**：根据工作负载特性选择合适的全局任务池
2. **避免长时间运行的任务**：将长任务拆分为多个小任务
3. **合理使用 scope**：当需要借用局部变量时使用 scope
4. **异常处理**：任务中的 panic 会导致任务被取消
5. **生命周期管理**：注意 Task 的生命周期，避免内存泄漏

这个文档涵盖了 Bevy Tasks 的所有核心概念和使用方法，为开发者提供了完整的参考指南。