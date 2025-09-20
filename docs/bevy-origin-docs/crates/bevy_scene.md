# Bevy Scene 模块中文操作文档

## 1. 模块概述和主要功能

`bevy_scene` 模块提供了 Bevy 引擎中的场景定义、实例化、序列化和反序列化功能。场景是实体及其相关组件的集合，可以从世界中实例化或移除，以实现组合式设计。场景可以序列化/反序列化，例如将世界状态的一部分保存到文件中。

### 主要功能特性

1. **场景定义和管理**: 定义和管理包含实体和组件的场景
2. **动态场景构建**: 从现有世界构建动态场景
3. **场景实例化**: 将场景实例化到世界中
4. **序列化支持**: 支持场景的序列化和反序列化（RON 格式）
5. **场景过滤**: 控制哪些组件和资源包含在场景中
6. **热重载**: 支持场景资源的热重载

## 2. 核心结构体和枚举说明

### 2.1 核心场景类型

#### Scene
```rust
#[derive(Asset, TypePath, Debug)]
pub struct Scene {
    pub world: World,
}
```
- **描述**: 静态场景，包含一个完整的世界
- **用途**: 存储预定义的场景数据，包括实体、组件和资源
- **特点**:
  - 包含完整的 ECS 世界
  - 支持从 `DynamicScene` 构建
  - 可以克隆和序列化

#### DynamicScene
```rust
#[derive(Asset, TypePath, Default)]
pub struct DynamicScene {
    pub resources: Vec<Box<dyn PartialReflect>>,
    pub entities: Vec<DynamicEntity>,
}
```
- **描述**: 动态场景，使用反射系统的可序列化场景表示
- **用途**: 用于运行时构建和序列化场景
- **特点**:
  - 基于反射的组件表示
  - 支持序列化为 RON 格式
  - 可以从世界动态构建

#### DynamicEntity
```rust
pub struct DynamicEntity {
    pub entity: Entity,
    pub components: Vec<Box<dyn PartialReflect>>,
}
```
- **描述**: 动态实体表示，包含实体ID和其组件
- **用途**: 在动态场景中表示单个实体

### 2.2 场景组件

#### SceneRoot
```rust
#[derive(Component, Clone, Debug, Default, Deref, DerefMut, Reflect, PartialEq, Eq, From)]
#[require(Transform)]
#[require(Visibility)]
pub struct SceneRoot(pub Handle<Scene>);
```
- **描述**: 场景根组件，将场景作为子实体生成
- **用途**: 添加到实体上以实例化静态场景
- **要求**: 自动添加 `Transform` 和 `Visibility` 组件

#### DynamicSceneRoot
```rust
#[derive(Component, Clone, Debug, Default, Deref, DerefMut, Reflect, PartialEq, Eq, From)]
#[require(Transform)]
#[require(Visibility)]
pub struct DynamicSceneRoot(pub Handle<DynamicScene>);
```
- **描述**: 动态场景根组件
- **用途**: 添加到实体上以实例化动态场景

#### SceneInstance
```rust
#[derive(Component, Deref, DerefMut)]
pub struct SceneInstance(pub(crate) InstanceId);
```
- **描述**: 场景实例组件，标识生成的场景实例
- **用途**: 跟踪场景实例的ID

### 2.3 场景管理器

#### SceneSpawner
```rust
#[derive(Default, Resource)]
pub struct SceneSpawner {
    // 内部字段...
}
```
- **描述**: 场景生成器资源，管理场景的生成和销毁
- **功能**:
  - 同步和异步场景生成
  - 场景实例管理
  - 场景热重载
  - 实例生命周期跟踪

### 2.4 场景构建器

#### DynamicSceneBuilder
```rust
pub struct DynamicSceneBuilder<'w> {
    // 内部字段...
}
```
- **描述**: 动态场景构建器，从世界提取实体和资源构建场景
- **功能**:
  - 选择性实体提取
  - 组件和资源过滤
  - 批量实体提取

### 2.5 场景过滤器

#### SceneFilter
```rust
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub enum SceneFilter {
    Unset,
    Allowlist(HashSet<TypeId>),
    Denylist(HashSet<TypeId>),
}
```
- **描述**: 场景过滤器，控制哪些类型包含在场景中
- **变体**:
  - `Unset`: 未设置（允许所有类型）
  - `Allowlist`: 白名单模式
  - `Denylist`: 黑名单模式

### 2.6 错误类型

#### SceneSpawnError
```rust
#[derive(Error, Debug)]
pub enum SceneSpawnError {
    UnregisteredComponent { type_path: String },
    UnregisteredResource { type_path: String },
    UnregisteredType { std_type_name: DebugName },
    // ... 其他错误变体
}
```
- **描述**: 场景生成过程中可能发生的错误

## 3. 主要API使用示例

### 3.1 基础场景操作

#### 创建和使用静态场景
```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component, Reflect)]
#[reflect(Component)]
struct Health(f32);

#[derive(Component, Reflect)]
#[reflect(Component)]
struct Position { x: f32, y: f32 }

fn setup_scene() {
    let mut app = App::new();
    app.add_plugins(DefaultPlugins)
       .add_plugins(ScenePlugin)
       .register_type::<Health>()
       .register_type::<Position>();

    // 创建场景世界
    let mut scene_world = World::new();
    scene_world.spawn((
        Health(100.0),
        Position { x: 0.0, y: 0.0 }
    ));

    // 创建场景
    let scene = Scene::new(scene_world);

    // 注册场景资源
    let scene_handle = app.world_mut()
        .resource_mut::<Assets<Scene>>()
        .add(scene);

    // 生成场景根实体
    app.world_mut().spawn(SceneRoot(scene_handle));
}
```

#### 使用动态场景
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn create_dynamic_scene() {
    let mut app = App::new();
    app.add_plugins(DefaultPlugins)
       .add_plugins(ScenePlugin)
       .register_type::<Health>()
       .register_type::<Position>();

    // 创建动态场景
    let mut world = World::new();
    world.insert_resource(app.world().resource::<AppTypeRegistry>().clone());

    world.spawn((
        Health(75.0),
        Position { x: 10.0, y: 5.0 }
    ));

    let dynamic_scene = DynamicScene::from_world(&world);

    // 注册动态场景
    let scene_handle = app.world_mut()
        .resource_mut::<Assets<DynamicScene>>()
        .add(dynamic_scene);

    // 生成动态场景根实体
    app.world_mut().spawn(DynamicSceneRoot(scene_handle));
}
```

### 3.2 使用SceneSpawner手动管理场景

#### 同步场景生成
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn spawn_scene_manually(
    mut scene_spawner: ResMut<SceneSpawner>,
    scene_assets: Res<Assets<Scene>>,
    mut world: &mut World,
) {
    // 假设已有场景句柄
    let scene_handle: Handle<Scene> = // ... 获取场景句柄

    // 同步生成场景
    match scene_spawner.spawn_sync(world, scene_handle.id()) {
        Ok(instance_id) => {
            println!("场景生成成功，实例ID: {:?}", instance_id);
        }
        Err(err) => {
            eprintln!("场景生成失败: {:?}", err);
        }
    }
}
```

#### 异步场景生成
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn spawn_scene_async(
    mut scene_spawner: ResMut<SceneSpawner>,
    scene_handle: Handle<Scene>,
) {
    // 安排场景生成（将在下一帧处理）
    let instance_id = scene_spawner.spawn(scene_handle);
    println!("已安排场景生成，实例ID: {:?}", instance_id);
}

fn spawn_scene_as_child(
    mut scene_spawner: ResMut<SceneSpawner>,
    scene_handle: Handle<Scene>,
    parent_entity: Entity,
) {
    // 作为指定实体的子实体生成场景
    let instance_id = scene_spawner.spawn_as_child(scene_handle, parent_entity);
    println!("已安排场景作为子实体生成，实例ID: {:?}", instance_id);
}
```

### 3.3 使用DynamicSceneBuilder构建场景

#### 基础场景构建
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn build_scene_from_world(world: &World) -> DynamicScene {
    // 从世界构建包含所有实体的场景
    DynamicSceneBuilder::from_world(world)
        .extract_entities(
            world.query::<Entity>()
                .iter(world)
        )
        .extract_resources()
        .build()
}
```

#### 选择性实体提取
```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component)]
struct Saveable;

fn build_filtered_scene(world: &World) -> DynamicScene {
    // 只提取标记为Saveable的实体
    let saveable_entities: Vec<Entity> = world
        .query_filtered::<Entity, With<Saveable>>()
        .iter(world)
        .collect();

    DynamicSceneBuilder::from_world(world)
        .extract_entities(saveable_entities.into_iter())
        .build()
}
```

#### 使用组件过滤器
```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component, Reflect)]
#[reflect(Component)]
struct PlayerData { name: String }

#[derive(Component, Reflect)]
#[reflect(Component)]
struct TempData { value: i32 }

fn build_scene_with_filter(world: &World) -> DynamicScene {
    DynamicSceneBuilder::from_world(world)
        // 只允许PlayerData组件
        .deny_all_components()
        .allow_component::<PlayerData>()
        // 提取所有实体
        .extract_entities(
            world.query::<Entity>().iter(world)
        )
        .build()
}
```

### 3.4 场景序列化和反序列化

#### 序列化场景为RON格式
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn serialize_scene(
    dynamic_scene: &DynamicScene,
    type_registry: &TypeRegistry,
) -> Result<String, ron::Error> {
    dynamic_scene.serialize(type_registry)
}

// 使用示例
fn save_scene_to_file(
    dynamic_scene: DynamicScene,
    type_registry: Res<AppTypeRegistry>,
) {
    let serialized = dynamic_scene
        .serialize(&type_registry.read())
        .expect("场景序列化失败");

    // 保存到文件
    std::fs::write("scene.scn", serialized)
        .expect("文件写入失败");
}
```

#### 从文件加载场景
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn load_scene_system(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    // 从文件加载场景
    let scene_handle: Handle<DynamicScene> = asset_server.load("scenes/level1.scn");

    // 生成场景根实体
    commands.spawn(DynamicSceneRoot(scene_handle));
}
```

### 3.5 场景事件处理

#### 监听场景实例就绪事件
```rust
use bevy::prelude::*;
use bevy_scene::*;

fn setup_scene_observer(mut commands: Commands) {
    commands.add_observer(on_scene_ready);
}

fn on_scene_ready(
    event: On<SceneInstanceReady>,
    scene_spawner: Res<SceneSpawner>,
) {
    let instance_id = event.event().instance_id;
    let entity = event.event().entity;

    println!("场景实例 {:?} 在实体 {:?} 上已就绪", instance_id, entity);

    // 检查实例是否真的就绪
    if scene_spawner.instance_is_ready(instance_id) {
        println!("实例确认就绪");

        // 遍历实例中的所有实体
        for entity in scene_spawner.iter_instance_entities(instance_id) {
            println!("实例包含实体: {:?}", entity);
        }
    }
}
```

### 3.6 场景过滤器使用

#### 创建和使用过滤器
```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component)]
struct PublicComponent;

#[derive(Component)]
struct PrivateComponent;

fn create_filtered_scene_builder(world: &World) -> DynamicSceneBuilder {
    // 创建白名单过滤器
    let component_filter = SceneFilter::deny_all()
        .allow::<PublicComponent>()
        .allow::<Transform>();

    // 创建黑名单过滤器
    let resource_filter = SceneFilter::allow_all()
        .deny::<PrivateComponent>();

    DynamicSceneBuilder::from_world(world)
        .with_component_filter(component_filter)
        .with_resource_filter(resource_filter)
}
```

## 4. 与其他Bevy模块的集成方式

### 4.1 与Asset系统集成

```rust
use bevy::prelude::*;
use bevy_scene::*;

// 场景作为资源自动集成到asset系统
fn setup_scene_assets() {
    let mut app = App::new();
    app.add_plugins(DefaultPlugins)
       .add_plugins(ScenePlugin); // 自动注册场景资源类型

    // 场景现在可以通过AssetServer加载
    let asset_server = app.world().resource::<AssetServer>();
    let scene: Handle<DynamicScene> = asset_server.load("scenes/level.scn");
}
```

### 4.2 与ECS系统集成

```rust
use bevy::prelude::*;
use bevy_scene::*;

// 场景与ECS组件系统完全集成
fn scene_management_system(
    mut scene_spawner: ResMut<SceneSpawner>,
    scene_roots: Query<(Entity, &SceneRoot), Changed<SceneRoot>>,
    mut commands: Commands,
) {
    for (entity, scene_root) in scene_roots.iter() {
        // 场景根组件改变时重新生成场景
        let instance_id = scene_spawner.spawn_as_child(scene_root.clone(), entity);
        commands.entity(entity).insert(SceneInstance(instance_id));
    }
}
```

### 4.3 与反射系统集成

```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component, Reflect)]
#[reflect(Component)] // 必须注册反射信息才能在场景中使用
struct GameData {
    score: i32,
    level: u32,
}

fn setup_reflection() {
    let mut app = App::new();
    app.add_plugins(DefaultPlugins)
       .register_type::<GameData>(); // 注册类型以在场景中使用
}
```

### 4.4 与Transform层次结构集成

```rust
use bevy::prelude::*;
use bevy_scene::*;

// 场景自动支持父子关系
fn create_hierarchical_scene() {
    let mut scene_world = World::new();

    // 创建父实体
    let parent = scene_world.spawn(Transform::default()).id();

    // 创建子实体
    scene_world.spawn((
        Transform::from_translation(Vec3::new(1.0, 0.0, 0.0)),
        Parent(parent), // 场景将保持这种层次关系
    ));

    let scene = Scene::new(scene_world);
}
```

## 5. 常见使用场景

### 5.1 游戏关卡保存和加载

```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component, Reflect)]
#[reflect(Component)]
struct LevelObject {
    object_type: String,
    health: f32,
}

// 保存关卡
fn save_level(
    world: &World,
    level_objects: Query<Entity, With<LevelObject>>,
) {
    let scene = DynamicSceneBuilder::from_world(world)
        .extract_entities(level_objects.iter())
        .allow_component::<LevelObject>()
        .allow_component::<Transform>()
        .build();

    let type_registry = world.resource::<AppTypeRegistry>();
    let serialized = scene.serialize(&type_registry.read()).unwrap();
    std::fs::write("level_save.scn", serialized).unwrap();
}

// 加载关卡
fn load_level(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    let scene_handle: Handle<DynamicScene> = asset_server.load("level_save.scn");
    commands.spawn(DynamicSceneRoot(scene_handle));
}
```

### 5.2 预制体系统

```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Resource)]
struct PrefabRegistry {
    enemy_basic: Handle<DynamicScene>,
    enemy_boss: Handle<DynamicScene>,
    powerup: Handle<DynamicScene>,
}

fn setup_prefabs(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    let registry = PrefabRegistry {
        enemy_basic: asset_server.load("prefabs/enemy_basic.scn"),
        enemy_boss: asset_server.load("prefabs/enemy_boss.scn"),
        powerup: asset_server.load("prefabs/powerup.scn"),
    };
    commands.insert_resource(registry);
}

fn spawn_enemy(
    prefabs: Res<PrefabRegistry>,
    mut scene_spawner: ResMut<SceneSpawner>,
    position: Vec3,
) {
    let instance_id = scene_spawner.spawn(prefabs.enemy_basic.clone());
    // 可以在生成后修改位置等属性
}
```

### 5.3 场景切换和管理

```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Resource)]
struct SceneManager {
    current_scene: Option<InstanceId>,
    loading_scene: Option<Handle<DynamicScene>>,
}

fn switch_scene(
    mut scene_manager: ResMut<SceneManager>,
    mut scene_spawner: ResMut<SceneSpawner>,
    new_scene: Handle<DynamicScene>,
) {
    // 销毁当前场景
    if let Some(current_id) = scene_manager.current_scene {
        scene_spawner.despawn_instance(current_id);
    }

    // 加载新场景
    let instance_id = scene_spawner.spawn(new_scene.clone());
    scene_manager.current_scene = Some(instance_id);
    scene_manager.loading_scene = Some(new_scene);
}
```

### 5.4 运行时场景编辑

```rust
use bevy::prelude::*;
use bevy_scene::*;

// 在运行时构建和修改场景
fn runtime_scene_editing(
    world: &World,
    selected_entities: Vec<Entity>,
) -> DynamicScene {
    DynamicSceneBuilder::from_world(world)
        .extract_entities(selected_entities.into_iter())
        // 只保存可编辑的组件
        .allow_component::<Transform>()
        .allow_component::<Mesh3d>()
        .allow_component::<MeshMaterial3d<StandardMaterial>>()
        .deny_component::<Camera>() // 排除相机
        .build()
}
```

### 5.5 多人游戏状态同步

```rust
use bevy::prelude::*;
use bevy_scene::*;

#[derive(Component, Reflect)]
#[reflect(Component)]
struct NetworkSyncable;

// 创建用于网络同步的场景快照
fn create_sync_snapshot(
    world: &World,
    syncable_entities: Query<Entity, With<NetworkSyncable>>,
) -> String {
    let scene = DynamicSceneBuilder::from_world(world)
        .extract_entities(syncable_entities.iter())
        .allow_component::<Transform>()
        .allow_component::<NetworkSyncable>()
        .build();

    let type_registry = world.resource::<AppTypeRegistry>();
    scene.serialize(&type_registry.read()).unwrap()
}
```

### 5.6 场景热重载开发工具

```rust
use bevy::prelude::*;
use bevy_scene::*;

// 监听场景文件变化并重新加载
fn hot_reload_system(
    mut scene_spawner: ResMut<SceneSpawner>,
    scene_assets: Res<Assets<DynamicScene>>,
    scene_roots: Query<(Entity, &DynamicSceneRoot)>,
) {
    // SceneSpawner 自动处理资源变化事件
    // 当场景文件在磁盘上更改时，会自动重新加载

    for (entity, scene_root) in scene_roots.iter() {
        if scene_assets.get(&scene_root.0).is_some() {
            // 场景已加载并准备就绪
            println!("场景 {:?} 已就绪", scene_root.0);
        }
    }
}
```

## 6. 最佳实践和注意事项

### 6.1 性能优化
- 使用场景过滤器只包含必要的组件和资源
- 避免频繁的场景序列化/反序列化
- 对大型场景考虑分块加载

### 6.2 内存管理
- 及时销毁不需要的场景实例
- 使用弱引用避免循环引用
- 合理管理场景资源的生命周期

### 6.3 错误处理
- 始终处理 `SceneSpawnError`
- 确保所有组件都注册了反射信息
- 验证场景文件的完整性

### 6.4 调试建议
- 使用 `SceneInstanceReady` 事件确认场景加载完成
- 检查 `instance_is_ready()` 确认实例状态
- 使用 `iter_instance_entities()` 遍历实例中的实体

这份文档涵盖了 `bevy_scene` 模块的主要功能和使用方法，为开发者提供了全面的参考指南。