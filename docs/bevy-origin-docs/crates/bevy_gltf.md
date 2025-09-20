# Bevy GLTF 模块详细文档

## 模块概述

`bevy_gltf` 是 Bevy 引擎中负责加载和处理 glTF 2.0 格式 3D 资源的核心模块。glTF (Graphics Language Transmission Format) 是 Khronos Group 定义的标准 3D 场景描述格式，广泛用于 3D 图形应用中。

### 主要功能

- 加载 glTF 2.0 和 GLB 格式文件
- 支持 glTF 扩展（材质各向异性、清漆、镜面反射等）
- 处理网格、材质、动画、骨骼、相机和灯光
- 自定义顶点属性支持
- 坐标系转换
- 纹理和图像处理
- 场景层次结构管理

## 核心结构体和枚举

### 1. Gltf - 主要资产结构

```rust
#[derive(Asset, Debug, TypePath)]
pub struct Gltf {
    /// 从 glTF 文件加载的所有场景
    pub scenes: Vec<Handle<Scene>>,
    /// 从 glTF 文件加载的命名场景
    pub named_scenes: HashMap<Box<str>, Handle<Scene>>,
    /// 从 glTF 文件加载的所有网格
    pub meshes: Vec<Handle<GltfMesh>>,
    /// 从 glTF 文件加载的命名网格
    pub named_meshes: HashMap<Box<str>, Handle<GltfMesh>>,
    /// 从 glTF 文件加载的所有材质
    pub materials: Vec<Handle<StandardMaterial>>,
    /// 从 glTF 文件加载的命名材质
    pub named_materials: HashMap<Box<str>, Handle<StandardMaterial>>,
    /// 从 glTF 文件加载的所有节点
    pub nodes: Vec<Handle<GltfNode>>,
    /// 从 glTF 文件加载的命名节点
    pub named_nodes: HashMap<Box<str>, Handle<GltfNode>>,
    /// 从 glTF 文件加载的所有蒙皮
    pub skins: Vec<Handle<GltfSkin>>,
    /// 从 glTF 文件加载的命名蒙皮
    pub named_skins: HashMap<Box<str>, Handle<GltfSkin>>,
    /// 要显示的默认场景
    pub default_scene: Option<Handle<Scene>>,
    /// 从 glTF 文件加载的所有动画
    #[cfg(feature = "bevy_animation")]
    pub animations: Vec<Handle<AnimationClip>>,
    /// 从 glTF 文件加载的命名动画
    #[cfg(feature = "bevy_animation")]
    pub named_animations: HashMap<Box<str>, Handle<AnimationClip>>,
    /// glTF 资源的根结构
    pub source: Option<gltf::Gltf>,
}
```

### 2. GltfMesh - 网格结构

```rust
#[derive(Asset, Debug, Clone, TypePath)]
pub struct GltfMesh {
    /// 场景中网格的索引
    pub index: usize,
    /// 网格的计算名称
    pub name: String,
    /// glTF 网格的图元
    pub primitives: Vec<GltfPrimitive>,
    /// 附加数据
    pub extras: Option<GltfExtras>,
}
```

### 3. GltfNode - 节点结构

```rust
#[derive(Asset, Debug, Clone, TypePath)]
pub struct GltfNode {
    /// 场景中节点的索引
    pub index: usize,
    /// 节点的计算名称
    pub name: String,
    /// 节点的直接子节点
    pub children: Vec<Handle<GltfNode>>,
    /// 节点的网格
    pub mesh: Option<Handle<GltfMesh>>,
    /// 节点的蒙皮
    pub skin: Option<Handle<GltfSkin>>,
    /// 本地变换
    pub transform: Transform,
    /// 是否用作动画根
    #[cfg(feature = "bevy_animation")]
    pub is_animation_root: bool,
    /// 附加数据
    pub extras: Option<GltfExtras>,
}
```

### 4. GltfPrimitive - 图元结构

```rust
#[derive(Asset, Debug, Clone, TypePath)]
pub struct GltfPrimitive {
    /// 网格内图元的索引
    pub index: usize,
    /// 父 GltfMesh 的索引
    pub parent_mesh_index: usize,
    /// 图元的计算名称
    pub name: String,
    /// 要渲染的拓扑
    pub mesh: Handle<Mesh>,
    /// 应用到网格的材质
    pub material: Option<Handle<StandardMaterial>>,
    /// 附加数据
    pub extras: Option<GltfExtras>,
    /// 材质的附加数据
    pub material_extras: Option<GltfExtras>,
}
```

### 5. GltfSkin - 蒙皮结构

```rust
#[derive(Asset, Debug, Clone, TypePath)]
pub struct GltfSkin {
    /// 场景中蒙皮的索引
    pub index: usize,
    /// 蒙皮的计算名称
    pub name: String,
    /// 组成此蒙皮的所有节点
    pub joints: Vec<Handle<GltfNode>>,
    /// 此蒙皮的逆绑定矩阵
    pub inverse_bind_matrices: Handle<SkinnedMeshInverseBindposes>,
    /// 附加数据
    pub extras: Option<GltfExtras>,
}
```

### 6. GltfAssetLabel - 资产标签枚举

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GltfAssetLabel {
    /// Scene{}: glTF 场景作为 Bevy Scene
    Scene(usize),
    /// Node{}: glTF 节点作为 GltfNode
    Node(usize),
    /// Mesh{}: glTF 网格作为 GltfMesh
    Mesh(usize),
    /// Mesh{}/Primitive{}: glTF 图元作为 Bevy Mesh
    Primitive { mesh: usize, primitive: usize },
    /// Mesh{}/Primitive{}/MorphTargets: 图元的变形目标动画数据
    MorphTarget { mesh: usize, primitive: usize },
    /// Texture{}: glTF 纹理作为 Bevy Image
    Texture(usize),
    /// Material{}: glTF 材质作为 Bevy StandardMaterial
    Material { index: usize, is_scale_inverted: bool },
    /// DefaultMaterial: glTF 默认材质
    DefaultMaterial,
    /// Animation{}: glTF 动画作为 Bevy AnimationClip
    Animation(usize),
    /// Skin{}: glTF 蒙皮作为 GltfSkin
    Skin(usize),
    /// Skin{}/InverseBindMatrices: glTF 蒙皮矩阵
    InverseBindMatrices(usize),
}
```

### 7. GltfPlugin - 插件配置

```rust
pub struct GltfPlugin {
    /// 默认图像采样器
    pub default_sampler: ImageSamplerDescriptor,
    /// 是否使用模型正方向
    pub use_model_forward_direction: bool,
    /// 自定义顶点属性注册表
    pub custom_vertex_attributes: HashMap<Box<str>, MeshVertexAttribute>,
}
```

### 8. GltfLoaderSettings - 加载器设置

```rust
#[derive(Serialize, Deserialize)]
pub struct GltfLoaderSettings {
    /// 网格加载设置
    pub load_meshes: RenderAssetUsages,
    /// 材质加载设置
    pub load_materials: RenderAssetUsages,
    /// 是否加载相机
    pub load_cameras: bool,
    /// 是否加载灯光
    pub load_lights: bool,
    /// 是否加载动画
    pub load_animations: bool,
    /// 是否包含源
    pub include_source: bool,
}
```

## 主要 API 使用示例

### 1. 基本场景加载

```rust
use bevy::prelude::*;
use bevy_gltf::prelude::*;

fn spawn_gltf_scene(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 加载 glTF 文件的第一个场景
    commands.spawn((
        SceneRoot(asset_server.load(
            GltfAssetLabel::Scene(0).from_asset("models/helmet/helmet.gltf")
        )),
        Transform::from_xyz(0.0, 0.0, 0.0),
    ));
}
```

### 2. 完整 glTF 资产加载

```rust
use bevy::prelude::*;
use bevy_gltf::Gltf;

#[derive(Resource)]
struct GltfHandle(Handle<Gltf>);

fn load_gltf(mut commands: Commands, asset_server: Res<AssetServer>) {
    let gltf_handle = asset_server.load("models/helmet/helmet.gltf");
    commands.insert_resource(GltfHandle(gltf_handle));
}

fn access_gltf_data(
    gltf_handle: Res<GltfHandle>,
    gltf_assets: Res<Assets<Gltf>>,
    mut commands: Commands,
) {
    if let Some(gltf) = gltf_assets.get(&gltf_handle.0) {
        // 访问场景
        if let Some(default_scene) = &gltf.default_scene {
            commands.spawn(SceneRoot(default_scene.clone()));
        }

        // 访问命名场景
        if let Some(scene) = gltf.named_scenes.get("MainScene") {
            commands.spawn(SceneRoot(scene.clone()));
        }

        // 访问网格
        for (name, mesh_handle) in &gltf.named_meshes {
            println!("发现网格: {}", name);
        }

        // 访问材质
        for (name, material_handle) in &gltf.named_materials {
            println!("发现材质: {}", name);
        }
    }
}
```

### 3. 特定资产加载

```rust
use bevy::prelude::*;
use bevy_gltf::prelude::*;

fn load_specific_assets(asset_server: Res<AssetServer>) {
    // 加载特定网格
    let mesh_handle: Handle<GltfMesh> = asset_server.load(
        GltfAssetLabel::Mesh(0).from_asset("models/helmet/helmet.gltf")
    );

    // 加载特定材质
    let material_handle: Handle<StandardMaterial> = asset_server.load(
        GltfAssetLabel::Material { index: 0, is_scale_inverted: false }
            .from_asset("models/helmet/helmet.gltf")
    );

    // 加载特定图元
    let primitive_handle: Handle<Mesh> = asset_server.load(
        GltfAssetLabel::Primitive { mesh: 0, primitive: 0 }
            .from_asset("models/helmet/helmet.gltf")
    );

    // 加载纹理
    let texture_handle: Handle<Image> = asset_server.load(
        GltfAssetLabel::Texture(0).from_asset("models/helmet/helmet.gltf")
    );
}
```

### 4. 动画处理

```rust
#[cfg(feature = "bevy_animation")]
use bevy_animation::{AnimationClip, AnimationPlayer};

#[cfg(feature = "bevy_animation")]
fn load_animations(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    gltf_handle: Res<GltfHandle>,
    gltf_assets: Res<Assets<Gltf>>,
) {
    if let Some(gltf) = gltf_assets.get(&gltf_handle.0) {
        // 加载所有动画
        for (index, animation_handle) in gltf.animations.iter().enumerate() {
            println!("发现动画 {}: {:?}", index, animation_handle);
        }

        // 加载命名动画
        if let Some(walk_animation) = gltf.named_animations.get("Walk") {
            // 播放动画
            commands.spawn((
                AnimationPlayer::default(),
                // 其他必要的组件...
            ));
        }
    }
}
```

### 5. 自定义加载设置

```rust
use bevy_asset::RenderAssetUsages;

fn load_with_custom_settings(asset_server: Res<AssetServer>) {
    let gltf_handle: Handle<Gltf> = asset_server.load_with_settings(
        "models/helmet/helmet.gltf",
        |settings: &mut GltfLoaderSettings| {
            // 只加载网格，不加载材质
            settings.load_meshes = RenderAssetUsages::RENDER_WORLD;
            settings.load_materials = RenderAssetUsages::empty();
            // 不加载相机和灯光
            settings.load_cameras = false;
            settings.load_lights = false;
            // 不加载动画
            settings.load_animations = false;
        }
    );
}
```

### 6. 插件配置

```rust
use bevy::prelude::*;
use bevy_gltf::GltfPlugin;
use bevy_image::ImageSamplerDescriptor;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(GltfPlugin {
            default_sampler: ImageSamplerDescriptor::nearest(),
            use_model_forward_direction: true, // 使用模型正向方向
            custom_vertex_attributes: {
                let mut attrs = bevy_platform::collections::HashMap::default();
                // 添加自定义顶点属性
                attrs.insert(
                    "_CUSTOM_ATTR".into(),
                    bevy_mesh::MeshVertexAttribute::new("CustomAttr", 0, bevy_render::render_resource::VertexFormat::Float32x3)
                );
                attrs
            },
        }))
        .run();
}
```

### 7. 处理 glTF 扩展数据

```rust
use bevy_gltf::GltfExtras;

fn process_gltf_extras(
    query: Query<&GltfExtras>,
) {
    for extras in query.iter() {
        // 解析额外的 JSON 数据
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&extras.value) {
            println!("额外数据: {}", json_value);
        }
    }
}
```

## 与其他 Bevy 模块的集成方式

### 1. 与资产系统集成

```rust
use bevy_asset::{Asset, AssetApp, AssetLoader, Handle};

// bevy_gltf 注册的资产类型
fn setup_gltf_assets(app: &mut App) {
    app.init_asset::<Gltf>()
        .init_asset::<GltfNode>()
        .init_asset::<GltfPrimitive>()
        .init_asset::<GltfMesh>()
        .init_asset::<GltfSkin>();
}
```

### 2. 与渲染系统集成

```rust
use bevy_pbr::StandardMaterial;
use bevy_mesh::Mesh;
use bevy_render::mesh::Mesh3d;

fn spawn_rendered_gltf(
    mut commands: Commands,
    gltf_assets: Res<Assets<Gltf>>,
    gltf_handle: Res<GltfHandle>,
) {
    if let Some(gltf) = gltf_assets.get(&gltf_handle.0) {
        // 获取网格和材质
        for (mesh_handle, material_handle) in gltf.meshes.iter()
            .zip(gltf.materials.iter()) {
            commands.spawn((
                Mesh3d(mesh_handle.clone()),
                MeshMaterial3d(material_handle.clone()),
                Transform::default(),
            ));
        }
    }
}
```

### 3. 与动画系统集成

```rust
#[cfg(feature = "bevy_animation")]
use bevy_animation::{AnimationPlayer, AnimationTarget};

#[cfg(feature = "bevy_animation")]
fn setup_animation_system(
    mut commands: Commands,
    gltf_assets: Res<Assets<Gltf>>,
    gltf_handle: Res<GltfHandle>,
) {
    if let Some(gltf) = gltf_assets.get(&gltf_handle.0) {
        for animation_handle in &gltf.animations {
            commands.spawn((
                AnimationPlayer::default(),
                AnimationTarget::default(),
            ));
        }
    }
}
```

### 4. 与场景系统集成

```rust
use bevy_scene::{Scene, SceneRoot};

fn spawn_scene_hierarchy(
    mut commands: Commands,
    gltf_assets: Res<Assets<Gltf>>,
    gltf_handle: Res<GltfHandle>,
) {
    if let Some(gltf) = gltf_assets.get(&gltf_handle.0) {
        if let Some(default_scene) = &gltf.default_scene {
            // 生成完整的场景层次结构
            commands.spawn((
                SceneRoot(default_scene.clone()),
                Transform::default(),
                Visibility::default(),
            ));
        }
    }
}
```

### 5. 与物理系统集成

```rust
use bevy_transform::components::Transform;

fn add_physics_to_gltf(
    mut commands: Commands,
    gltf_query: Query<Entity, With<GltfMeshName>>,
) {
    for entity in gltf_query.iter() {
        // 为 glTF 实体添加物理组件
        commands.entity(entity).insert((
            // RigidBody::Dynamic, // 如果使用 bevy_rapier
            // Collider::from_bevy_mesh(...), // 从网格创建碰撞器
        ));
    }
}
```

## 常见使用场景

### 1. 游戏角色加载

```rust
#[derive(Component)]
struct Player;

fn load_player_character(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let player_scene = asset_server.load(
        GltfAssetLabel::Scene(0).from_asset("characters/player.gltf")
    );

    commands.spawn((
        Player,
        SceneRoot(player_scene),
        Transform::from_xyz(0.0, 0.0, 0.0),
        // 添加其他游戏逻辑组件
    ));
}
```

### 2. 环境和道具加载

```rust
fn load_level_environment(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 加载地形
    let terrain_scene = asset_server.load(
        GltfAssetLabel::Scene(0).from_asset("environment/terrain.gltf")
    );
    commands.spawn(SceneRoot(terrain_scene));

    // 加载建筑物
    let building_scene = asset_server.load(
        GltfAssetLabel::Scene(0).from_asset("environment/buildings.gltf")
    );
    commands.spawn(SceneRoot(building_scene));

    // 加载道具
    for i in 0..10 {
        let prop_scene = asset_server.load(
            GltfAssetLabel::Scene(0).from_asset("props/barrel.gltf")
        );
        commands.spawn((
            SceneRoot(prop_scene),
            Transform::from_xyz(i as f32 * 2.0, 0.0, 0.0),
        ));
    }
}
```

### 3. 动画角色控制

```rust
#[cfg(feature = "bevy_animation")]
#[derive(Component)]
struct CharacterAnimations {
    idle: Handle<AnimationClip>,
    walk: Handle<AnimationClip>,
    run: Handle<AnimationClip>,
}

#[cfg(feature = "bevy_animation")]
fn setup_character_animations(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let animations = CharacterAnimations {
        idle: asset_server.load(
            GltfAssetLabel::Animation(0).from_asset("characters/player.gltf")
        ),
        walk: asset_server.load(
            GltfAssetLabel::Animation(1).from_asset("characters/player.gltf")
        ),
        run: asset_server.load(
            GltfAssetLabel::Animation(2).from_asset("characters/player.gltf")
        ),
    };

    // 将动画句柄附加到角色实体
    commands.spawn((
        Player,
        animations,
        AnimationPlayer::default(),
    ));
}
```

### 4. 材质动态替换

```rust
fn dynamic_material_replacement(
    mut materials: ResMut<Assets<StandardMaterial>>,
    gltf_assets: Res<Assets<Gltf>>,
    gltf_handle: Res<GltfHandle>,
    mut material_query: Query<&mut MeshMaterial3d<StandardMaterial>>,
) {
    if let Some(gltf) = gltf_assets.get(&gltf_handle.0) {
        // 创建新材质
        let new_material = materials.add(StandardMaterial {
            base_color: Color::srgb(1.0, 0.0, 0.0), // 红色
            ..default()
        });

        // 替换所有材质
        for mut material in material_query.iter_mut() {
            *material = MeshMaterial3d(new_material.clone());
        }
    }
}
```

### 5. LOD（细节层次）管理

```rust
#[derive(Component)]
struct LodGroup {
    high_lod: Handle<Scene>,
    medium_lod: Handle<Scene>,
    low_lod: Handle<Scene>,
}

fn setup_lod_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let lod_group = LodGroup {
        high_lod: asset_server.load(
            GltfAssetLabel::Scene(0).from_asset("models/detailed.gltf")
        ),
        medium_lod: asset_server.load(
            GltfAssetLabel::Scene(0).from_asset("models/medium.gltf")
        ),
        low_lod: asset_server.load(
            GltfAssetLabel::Scene(0).from_asset("models/simple.gltf")
        ),
    };

    commands.spawn((
        lod_group,
        Transform::default(),
    ));
}

fn update_lod_system(
    camera_query: Query<&Transform, With<Camera>>,
    mut lod_query: Query<(&LodGroup, &Transform, &mut SceneRoot)>,
) {
    if let Ok(camera_transform) = camera_query.get_single() {
        for (lod_group, transform, mut scene_root) in lod_query.iter_mut() {
            let distance = camera_transform.translation.distance(transform.translation);

            let new_scene = if distance < 10.0 {
                lod_group.high_lod.clone()
            } else if distance < 50.0 {
                lod_group.medium_lod.clone()
            } else {
                lod_group.low_lod.clone()
            };

            scene_root.0 = new_scene;
        }
    }
}
```

### 6. 批量资产管理

```rust
#[derive(Resource)]
struct AssetCollection {
    models: Vec<Handle<Gltf>>,
    loading_complete: bool,
}

fn load_asset_collection(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let model_paths = vec![
        "models/tree1.gltf",
        "models/tree2.gltf",
        "models/rock1.gltf",
        "models/rock2.gltf",
    ];

    let models: Vec<Handle<Gltf>> = model_paths
        .iter()
        .map(|path| asset_server.load(*path))
        .collect();

    commands.insert_resource(AssetCollection {
        models,
        loading_complete: false,
    });
}

fn check_loading_progress(
    mut collection: ResMut<AssetCollection>,
    gltf_assets: Res<Assets<Gltf>>,
) {
    if !collection.loading_complete {
        let all_loaded = collection.models
            .iter()
            .all(|handle| gltf_assets.contains(handle));

        if all_loaded {
            collection.loading_complete = true;
            println!("所有 glTF 资产加载完成！");
        }
    }
}
```

## 最佳实践和注意事项

### 1. 性能优化

- 使用适当的 `RenderAssetUsages` 设置来控制内存使用
- 考虑使用 LOD 系统减少渲染负载
- 批量加载相关资产以减少 I/O 操作
- 使用纹理压缩格式以减少内存占用

### 2. 错误处理

```rust
fn handle_gltf_loading_errors(
    mut asset_events: EventReader<AssetEvent<Gltf>>,
) {
    for event in asset_events.read() {
        match event {
            AssetEvent::LoadedWithDependencies { id } => {
                println!("glTF 资产加载成功: {:?}", id);
            }
            AssetEvent::Failed { id, error } => {
                eprintln!("glTF 资产加载失败: {:?}, 错误: {}", id, error);
            }
            _ => {}
        }
    }
}
```

### 3. 内存管理

- 及时清理不再使用的资产句柄
- 使用弱引用避免循环引用
- 监控资产内存使用情况

### 4. 坐标系注意事项

- glTF 使用右手坐标系，Bevy 使用左手坐标系
- 设置 `use_model_forward_direction` 来控制坐标转换
- 注意纹理 UV 坐标的方向

这份文档涵盖了 `bevy_gltf` 模块的主要功能、API 使用方法和常见使用场景。它为开发者提供了全面的参考，帮助他们在 Bevy 项目中有效地使用 glTF 资产。