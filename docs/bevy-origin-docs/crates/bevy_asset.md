# Bevy Asset 系统详细文档

## 1. 模块概述和主要功能

### 1.1 核心概念

Bevy Asset 系统是一个强大的资产管理框架，用于处理游戏开发中的各种资产（如纹理、模型、音频、脚本等）。该系统解决了游戏开发中的两个主要挑战：

1. **内存管理**：资产通常占用大量内存，为每个实例存储副本成本过高
2. **加载性能**：从磁盘加载资产很慢，可能导致长时间的加载和延迟

### 1.2 主要特性

- **异步加载**：使用 Rust 的 `async/await` 机制进行非阻塞资产加载
- **引用计数**：自动管理资产生命周期，避免内存泄漏
- **热重载**：开发期间支持资产文件的实时更新
- **依赖管理**：自动处理资产间的依赖关系
- **类型安全**：强类型系统确保资产使用的安全性
- **可扩展性**：支持自定义资产类型和加载器

### 1.3 工作原理

```
资产文件 → AssetLoader → AssetServer → Assets<T> → Handle<T>
    ↓                                       ↑
AssetReader                          Components/Systems
```

## 2. 核心结构体和枚举说明

### 2.1 Asset Trait

```rust
pub trait Asset: VisitAssetDependencies + TypePath + Send + Sync + 'static {}
```

**作用**：定义一个类型为资产的标记 trait
**特点**：
- 自动派生：`#[derive(Asset)]`
- 需要实现 `VisitAssetDependencies` 来追踪依赖
- 需要 `TypePath` 用于反射和诊断

### 2.2 AssetServer

```rust
#[derive(Resource, Clone)]
pub struct AssetServer {
    pub(crate) data: Arc<AssetServerData>,
}
```

**作用**：资产加载和管理的主要入口点
**核心功能**：
- 加载资产：`load()`, `load_folder()`
- 检查加载状态：`is_loaded()`, `load_state()`
- 管理资产生命周期
- 处理资产依赖关系

**主要方法**：
```rust
// 加载资产
fn load<A: Asset>(&self, path: impl Into<AssetPath<'static>>) -> Handle<A>

// 检查是否已加载
fn is_loaded<A: Asset>(&self, id: impl Into<AssetId<A>>) -> bool

// 获取加载状态
fn load_state<A: Asset>(&self, id: impl Into<AssetId<A>>) -> LoadState
```

### 2.3 Assets<T>

```rust
#[derive(Resource)]
pub struct Assets<A: Asset> {
    dense_storage: DenseAssetStorage<A>,
    hash_map: HashMap<Uuid, A>,
    handle_provider: AssetHandleProvider,
    queued_events: Vec<AssetEvent<A>>,
    duplicate_handles: HashMap<AssetId<A>, u16>,
}
```

**作用**：存储特定类型资产的集合
**存储方式**：
- **密集存储**：使用 `Vec` 存储运行时标识的资产（高效）
- **哈希映射**：使用 `HashMap` 存储 UUID 标识的资产（稳定）

**主要方法**：
```rust
// 添加资产
fn add(&mut self, asset: impl Into<A>) -> Handle<A>

// 获取资产
fn get(&self, id: impl Into<AssetId<A>>) -> Option<&A>
fn get_mut(&mut self, id: impl Into<AssetId<A>>) -> Option<&mut A>

// 移除资产
fn remove(&mut self, id: impl Into<AssetId<A>>) -> Option<A>

// 迭代器
fn iter(&self) -> impl Iterator<Item = (AssetId<A>, &A)>
```

### 2.4 Handle<A>

```rust
#[derive(Reflect)]
pub enum Handle<A: Asset> {
    Strong(Arc<StrongHandle>),
    Uuid(Uuid, PhantomData<fn() -> A>),
}
```

**作用**：资产的引用/句柄，避免直接存储资产数据
**类型**：
- **Strong Handle**：强引用，保持资产活跃直到句柄被丢弃
- **UUID Handle**：弱引用，不影响资产生命周期

**特性**：
- 可克隆：`clone()` 会增加引用计数
- 类型安全：编译时检查资产类型
- 轻量级：只存储 ID 和元数据

### 2.5 AssetId<A>

```rust
#[derive(Reflect, Serialize, Deserialize, From)]
pub enum AssetId<A: Asset> {
    Index {
        index: AssetIndex,
        marker: PhantomData<fn() -> A>,
    },
    Uuid {
        uuid: Uuid,
    },
}
```

**作用**：资产的唯一标识符
**类型**：
- **Index**：运行时生成的高效标识符
- **UUID**：跨运行稳定的标识符

### 2.6 AssetPath

```rust
pub struct AssetPath<'a> {
    source: AssetSourceId<'a>,
    path: CowArc<'a, Path>,
    label: Option<CowArc<'a, str>>,
}
```

**作用**：虚拟文件系统中资产的路径
**组成部分**：
- **source**：资产源名称（可选，默认为 "assets" 文件夹）
- **path**：指向资产文件的虚拟路径
- **label**：可选的命名子资产标识符

**示例路径**：
```rust
"my_scene.scn"                    // 基础资产
"my_scene.scn#PlayerMesh"         // 带标签的子资产
"remote://my_scene.scn"           // 自定义源的资产
```

### 2.7 AssetEvent<A>

```rust
#[derive(Message, Reflect)]
pub enum AssetEvent<A: Asset> {
    Added { id: AssetId<A> },
    Modified { id: AssetId<A> },
    Removed { id: AssetId<A> },
    Unused { id: AssetId<A> },
    LoadedWithDependencies { id: AssetId<A> },
}
```

**作用**：资产状态变化的事件通知
**事件类型**：
- **Added**：资产被添加
- **Modified**：资产被修改
- **Removed**：资产被移除
- **Unused**：最后一个强句柄被丢弃
- **LoadedWithDependencies**：资产及其依赖完全加载

### 2.8 AssetLoader Trait

```rust
pub trait AssetLoader: Send + Sync + 'static {
    type Asset: Asset;
    type Settings: Settings + Default + Serialize + for<'a> Deserialize<'a>;
    type Error: Into<BevyError>;

    fn load(
        &self,
        reader: &mut dyn Reader,
        settings: &Self::Settings,
        load_context: &mut LoadContext,
    ) -> impl ConditionalSendFuture<Output = Result<Self::Asset, Self::Error>>;

    fn extensions(&self) -> &[&str] {
        &[]
    }
}
```

**作用**：定义如何从字节数据加载特定资产类型
**关键方法**：
- `load()`：异步加载资产的核心方法
- `extensions()`：支持的文件扩展名

## 3. 主要 API 使用示例

### 3.1 基础资产加载

```rust
use bevy::prelude::*;

fn setup(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 加载纹理
    let texture_handle: Handle<Image> = asset_server.load("player.png");

    // 加载网格
    let mesh_handle: Handle<Mesh> = asset_server.load("models/character.glb#Mesh0");

    // 使用句柄创建实体
    commands.spawn(SpriteBundle {
        texture: texture_handle,
        ..default()
    });
}
```

### 3.2 检查加载状态

```rust
fn check_loading_system(
    asset_server: Res<AssetServer>,
    handles: Res<MyAssetHandles>,
) {
    // 检查单个资产
    if asset_server.is_loaded(&handles.texture) {
        println!("纹理已加载完成");
    }

    // 检查加载状态
    match asset_server.load_state(&handles.mesh) {
        LoadState::Loaded => println!("网格已加载"),
        LoadState::Loading => println!("网格正在加载中..."),
        LoadState::Failed => println!("网格加载失败"),
        LoadState::NotLoaded => println!("网格未开始加载"),
    }

    // 检查包含依赖的加载状态
    if asset_server.is_loaded_with_dependencies(&handles.scene) {
        println!("场景及其所有依赖都已加载完成");
    }
}
```

### 3.3 监听资产事件

```rust
fn asset_event_system(
    mut events: EventReader<AssetEvent<Image>>,
    mut images: ResMut<Assets<Image>>,
) {
    for event in events.read() {
        match event {
            AssetEvent::Added { id } => {
                println!("图像资产 {:?} 已添加", id);
            }
            AssetEvent::Modified { id } => {
                println!("图像资产 {:?} 已修改", id);
                if let Some(image) = images.get_mut(*id) {
                    // 处理修改后的图像
                }
            }
            AssetEvent::Removed { id } => {
                println!("图像资产 {:?} 已移除", id);
            }
            AssetEvent::LoadedWithDependencies { id } => {
                println!("图像资产 {:?} 及其依赖已完全加载", id);
            }
            _ => {}
        }
    }
}
```

### 3.4 手动管理资产

```rust
fn manual_asset_management(
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 创建程序化资产
    let image = Image::new_fill(
        Extent3d { width: 64, height: 64, depth_or_array_layers: 1 },
        TextureDimension::D2,
        &[255, 0, 0, 255], // 红色像素
        TextureFormat::Rgba8UnormSrgb,
    );

    // 添加到资产集合
    let image_handle = images.add(image);

    // 创建材质使用该图像
    let material = StandardMaterial {
        base_color_texture: Some(image_handle),
        ..default()
    };

    let material_handle = materials.add(material);

    // 直接访问和修改资产
    if let Some(material) = materials.get_mut(&material_handle) {
        material.base_color = Color::rgb(0.8, 0.8, 0.8);
    }
}
```

### 3.5 自定义资产类型

```rust
use bevy::prelude::*;
use serde::{Deserialize, Serialize};

// 定义自定义资产类型
#[derive(Asset, TypePath, Serialize, Deserialize)]
pub struct CustomConfig {
    pub player_speed: f32,
    pub enemy_count: u32,
    pub level_name: String,
    #[dependency] // 标记依赖的资产
    pub background_music: Handle<AudioSource>,
}

// 自定义加载器
#[derive(Default)]
pub struct CustomConfigLoader;

impl AssetLoader for CustomConfigLoader {
    type Asset = CustomConfig;
    type Settings = ();
    type Error = ron::error::SpannedError;

    async fn load(
        &self,
        reader: &mut dyn Reader,
        _settings: &Self::Settings,
        load_context: &mut LoadContext<'_>,
    ) -> Result<Self::Asset, Self::Error> {
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes).await?;
        let mut config: CustomConfig = ron::de::from_bytes(&bytes)?;

        // 加载依赖的音频资产
        config.background_music = load_context.load("audio/background.ogg");

        Ok(config)
    }

    fn extensions(&self) -> &[&str] {
        &["config.ron"]
    }
}

// 注册自定义资产
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .init_asset::<CustomConfig>()
        .register_asset_loader(CustomConfigLoader)
        .run();
}
```

### 3.6 文件夹加载

```rust
fn load_folder_system(
    asset_server: Res<AssetServer>,
    mut folder_events: EventReader<AssetEvent<LoadedFolder>>,
    loaded_folders: Res<Assets<LoadedFolder>>,
) {
    // 加载整个文件夹
    let folder_handle: Handle<LoadedFolder> = asset_server.load_folder("textures");

    // 监听文件夹加载完成事件
    for event in folder_events.read() {
        if let AssetEvent::LoadedWithDependencies { id } = event {
            if let Some(loaded_folder) = loaded_folders.get(*id) {
                println!("文件夹已加载，包含 {} 个资产", loaded_folder.handles.len());

                // 遍历文件夹中的所有句柄
                for handle in &loaded_folder.handles {
                    println!("加载的资产: {:?}", handle);
                }
            }
        }
    }
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与 ECS 系统的集成

```rust
use bevy::prelude::*;

#[derive(Component)]
struct PlayerTexture(Handle<Image>);

#[derive(Component)]
struct ModelHandle(Handle<Scene>);

// 资产作为组件
fn spawn_entities(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    commands.spawn((
        PlayerTexture(asset_server.load("player.png")),
        Transform::default(),
    ));

    commands.spawn((
        ModelHandle(asset_server.load("models/house.glb")),
        Transform::from_translation(Vec3::new(5.0, 0.0, 0.0)),
    ));
}

// 系统中使用资产
fn update_sprites(
    mut query: Query<(&PlayerTexture, &mut Sprite)>,
    images: Res<Assets<Image>>,
) {
    for (texture_handle, mut sprite) in query.iter_mut() {
        if let Some(image) = images.get(&texture_handle.0) {
            // 基于图像尺寸调整精灵
            sprite.custom_size = Some(Vec2::new(
                image.width() as f32,
                image.height() as f32,
            ));
        }
    }
}
```

### 4.2 与渲染系统的集成

```rust
use bevy::prelude::*;

fn setup_scene(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    asset_server: Res<AssetServer>,
) {
    // 使用内置网格
    let cube_mesh = meshes.add(Cuboid::new(1.0, 1.0, 1.0));

    // 加载纹理
    let texture = asset_server.load("textures/crate.png");

    // 创建材质
    let material = materials.add(StandardMaterial {
        base_color_texture: Some(texture),
        ..default()
    });

    // 生成实体
    commands.spawn(PbrBundle {
        mesh: cube_mesh,
        material,
        transform: Transform::from_translation(Vec3::new(0.0, 0.5, 0.0)),
        ..default()
    });
}
```

### 4.3 与音频系统的集成

```rust
use bevy::prelude::*;

fn play_sound_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    keyboard: Res<ButtonInput<KeyCode>>,
) {
    if keyboard.just_pressed(KeyCode::Space) {
        let sound = asset_server.load("sounds/jump.ogg");
        commands.spawn(AudioBundle {
            source: sound,
            settings: PlaybackSettings::DESPAWN,
        });
    }
}
```

### 4.4 与场景系统的集成

```rust
use bevy::prelude::*;

fn load_scene_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    input: Res<ButtonInput<KeyCode>>,
) {
    if input.just_pressed(KeyCode::KeyL) {
        // 加载整个场景
        let scene = asset_server.load("scenes/level1.scn.ron");
        commands.spawn(SceneBundle {
            scene,
            ..default()
        });
    }
}
```

## 5. 常见使用场景

### 5.1 游戏启动时预加载资产

```rust
use bevy::prelude::*;

#[derive(Resource)]
struct GameAssets {
    player_texture: Handle<Image>,
    enemy_textures: Vec<Handle<Image>>,
    background_music: Handle<AudioSource>,
    ui_font: Handle<Font>,
}

fn preload_assets(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let game_assets = GameAssets {
        player_texture: asset_server.load("sprites/player.png"),
        enemy_textures: vec![
            asset_server.load("sprites/enemy1.png"),
            asset_server.load("sprites/enemy2.png"),
            asset_server.load("sprites/enemy3.png"),
        ],
        background_music: asset_server.load("audio/background.ogg"),
        ui_font: asset_server.load("fonts/main.ttf"),
    };

    commands.insert_resource(game_assets);
}

fn check_assets_loaded(
    asset_server: Res<AssetServer>,
    game_assets: Res<GameAssets>,
    mut next_state: ResMut<NextState<GameState>>,
) {
    let mut all_loaded = true;

    // 检查所有资产是否加载完成
    all_loaded &= asset_server.is_loaded(&game_assets.player_texture);
    all_loaded &= asset_server.is_loaded(&game_assets.background_music);
    all_loaded &= asset_server.is_loaded(&game_assets.ui_font);

    for enemy_texture in &game_assets.enemy_textures {
        all_loaded &= asset_server.is_loaded(enemy_texture);
    }

    if all_loaded {
        next_state.set(GameState::MainMenu);
    }
}
```

### 5.2 关卡动态加载

```rust
use bevy::prelude::*;

#[derive(Component)]
struct Level {
    id: u32,
    assets_loaded: bool,
}

#[derive(Component)]
struct LevelAssets {
    background: Handle<Image>,
    enemies: Vec<Handle<Scene>>,
    pickups: Vec<Handle<Scene>>,
}

fn load_level(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    level_query: Query<&Level, Without<LevelAssets>>,
) {
    for level in level_query.iter() {
        if !level.assets_loaded {
            let level_assets = LevelAssets {
                background: asset_server.load(&format!("levels/level_{}/background.png", level.id)),
                enemies: vec![
                    asset_server.load(&format!("levels/level_{}/enemy1.glb", level.id)),
                    asset_server.load(&format!("levels/level_{}/enemy2.glb", level.id)),
                ],
                pickups: vec![
                    asset_server.load(&format!("levels/level_{}/coin.glb", level.id)),
                    asset_server.load(&format!("levels/level_{}/powerup.glb", level.id)),
                ],
            };

            commands.entity(entity).insert(level_assets);
        }
    }
}

fn check_level_loaded(
    mut level_query: Query<(Entity, &mut Level, &LevelAssets)>,
    asset_server: Res<AssetServer>,
) {
    for (entity, mut level, assets) in level_query.iter_mut() {
        if !level.assets_loaded {
            let mut all_loaded = true;

            all_loaded &= asset_server.is_loaded(&assets.background);

            for enemy in &assets.enemies {
                all_loaded &= asset_server.is_loaded(enemy);
            }

            for pickup in &assets.pickups {
                all_loaded &= asset_server.is_loaded(pickup);
            }

            if all_loaded {
                level.assets_loaded = true;
                println!("关卡 {} 资产加载完成", level.id);
            }
        }
    }
}
```

### 5.3 热重载开发工作流

```rust
use bevy::prelude::*;

// 开发时启用热重载
fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(AssetPlugin {
            // 启用文件监视
            watch_for_changes_override: Some(true),
            ..default()
        }))
        .add_systems(Update, hot_reload_handler)
        .run();
}

fn hot_reload_handler(
    mut asset_events: EventReader<AssetEvent<Image>>,
    mut material_events: EventReader<AssetEvent<StandardMaterial>>,
) {
    // 监听纹理热重载
    for event in asset_events.read() {
        match event {
            AssetEvent::Modified { id } => {
                println!("纹理 {:?} 已热重载", id);
            }
            _ => {}
        }
    }

    // 监听材质热重载
    for event in material_events.read() {
        match event {
            AssetEvent::Modified { id } => {
                println!("材质 {:?} 已热重载", id);
            }
            _ => {}
        }
    }
}
```

### 5.4 错误处理和重试机制

```rust
use bevy::prelude::*;

#[derive(Resource, Default)]
struct AssetLoadTracker {
    failed_assets: Vec<(String, u32)>, // (路径, 重试次数)
    max_retries: u32,
}

fn handle_asset_load_failures(
    mut events: EventReader<AssetLoadFailedEvent<Image>>,
    mut tracker: ResMut<AssetLoadTracker>,
    asset_server: Res<AssetServer>,
) {
    for event in events.read() {
        println!("资产加载失败: {} - {}", event.path, event.error);

        // 记录失败的资产
        let path = event.path.to_string();
        if let Some((_, ref mut retries)) = tracker
            .failed_assets
            .iter_mut()
            .find(|(p, _)| p == &path)
        {
            *retries += 1;

            if *retries < tracker.max_retries {
                println!("重试加载资产: {} (第 {} 次重试)", path, retries);
                // 重新尝试加载
                let _: Handle<Image> = asset_server.load(&path);
            } else {
                println!("资产 {} 重试次数已达上限，放弃加载", path);
            }
        } else {
            tracker.failed_assets.push((path.clone(), 1));
            println!("首次加载失败，稍后重试: {}", path);
        }
    }
}
```

### 5.5 资产依赖管理

```rust
use bevy::prelude::*;

#[derive(Asset, TypePath)]
struct ComplexAsset {
    pub name: String,
    #[dependency]
    pub texture: Handle<Image>,
    #[dependency]
    pub mesh: Handle<Mesh>,
    #[dependency]
    pub material: Handle<StandardMaterial>,
    #[dependency]
    pub sub_assets: Vec<Handle<ComplexAsset>>,
}

// 实现自定义加载器处理复杂依赖
#[derive(Default)]
struct ComplexAssetLoader;

impl AssetLoader for ComplexAssetLoader {
    type Asset = ComplexAsset;
    type Settings = ();
    type Error = Box<dyn std::error::Error>;

    async fn load(
        &self,
        reader: &mut dyn Reader,
        _settings: &Self::Settings,
        load_context: &mut LoadContext<'_>,
    ) -> Result<Self::Asset, Self::Error> {
        // 读取配置文件
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes).await?;
        let config: serde_json::Value = serde_json::from_slice(&bytes)?;

        // 加载依赖资产
        let texture = load_context.load(config["texture"].as_str().unwrap());
        let mesh = load_context.load(config["mesh"].as_str().unwrap());
        let material = load_context.load(config["material"].as_str().unwrap());

        // 加载子资产
        let mut sub_assets = Vec::new();
        if let Some(subs) = config["sub_assets"].as_array() {
            for sub in subs {
                sub_assets.push(load_context.load(sub.as_str().unwrap()));
            }
        }

        Ok(ComplexAsset {
            name: config["name"].as_str().unwrap().to_string(),
            texture,
            mesh,
            material,
            sub_assets,
        })
    }

    fn extensions(&self) -> &[&str] {
        &["complex.json"]
    }
}
```

## 6. 最佳实践和性能优化

### 6.1 内存管理最佳实践

```rust
use bevy::prelude::*;

// 使用弱引用避免循环依赖
#[derive(Component)]
struct OptimizedComponent {
    essential_texture: Handle<Image>,        // 强引用，保持资产活跃
    optional_texture: WeakHandle<Image>,     // 弱引用，不影响生命周期
}

// 批量释放不需要的资产
fn cleanup_unused_assets(
    mut images: ResMut<Assets<Image>>,
    mut meshes: ResMut<Assets<Mesh>>,
    query: Query<Entity, With<ToCleanup>>,
) {
    // 移除标记为清理的资产
    for entity in query.iter() {
        // 实体被删除时，相关的强句柄也会被删除
        // 资产将在下一帧自动清理
    }
}
```

### 6.2 加载性能优化

```rust
use bevy::prelude::*;

// 异步批量加载
fn batch_load_assets(
    asset_server: Res<AssetServer>,
) {
    let asset_paths = vec![
        "textures/grass.png",
        "textures/stone.png",
        "textures/water.png",
        "models/tree.glb",
        "models/rock.glb",
    ];

    // 并行加载多个资产
    for path in asset_paths {
        asset_server.load::<Image>(path); // 异步执行
    }
}

// 分帧加载避免帧率下降
#[derive(Resource)]
struct FramedLoader {
    pending_assets: Vec<String>,
    assets_per_frame: usize,
}

fn load_assets_gradually(
    mut loader: ResMut<FramedLoader>,
    asset_server: Res<AssetServer>,
) {
    let count = loader.assets_per_frame.min(loader.pending_assets.len());

    for _ in 0..count {
        if let Some(path) = loader.pending_assets.pop() {
            asset_server.load::<Image>(&path);
        }
    }
}
```

这个详细的文档涵盖了 Bevy Asset 系统的所有核心概念、API 使用方法、集成方式和常见使用场景。开发者可以根据这个文档快速理解和使用 Bevy 的资产管理系统，并应用到实际的游戏开发项目中。