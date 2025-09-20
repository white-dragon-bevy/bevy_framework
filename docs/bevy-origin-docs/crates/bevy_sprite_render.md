# Bevy Sprite Render 模块文档

## 模块概述

`bevy_sprite_render` 是 Bevy 引擎中负责 2D 精灵渲染的核心模块。该模块提供了高性能的 2D 图形渲染能力，包括精灵渲染、材质系统、瓦片地图、文本渲染等功能。

### 主要功能

1. **精灵渲染**：支持基础的 2D 精灵渲染，包括颜色调色、翻转、缩放等
2. **材质系统**：为 2D 网格提供材质支持，包括颜色材质和自定义材质
3. **瓦片地图**：支持瓦片地图块渲染，适用于游戏地图系统
4. **文本渲染**：将文本作为 2D 精灵进行渲染
5. **纹理切片**：支持九宫格和其他复杂的纹理切片
6. **批量渲染**：自动批量处理相似的渲染对象以提高性能

## 核心结构体和枚举

### 1. SpriteRenderPlugin

主插件，负责整个精灵渲染系统的初始化。

```rust
#[derive(Default)]
pub struct SpriteRenderPlugin;
```

**功能**：
- 加载着色器资源
- 初始化渲染管线
- 注册渲染系统

### 2. ExtractedSprite

从主世界提取到渲染世界的精灵数据。

```rust
pub struct ExtractedSprite {
    pub main_entity: Entity,
    pub render_entity: Entity,
    pub transform: GlobalTransform,
    pub color: LinearRgba,
    pub image_handle_id: AssetId<Image>,
    pub flip_x: bool,
    pub flip_y: bool,
    pub kind: ExtractedSpriteKind,
}
```

**字段说明**：
- `main_entity`：主世界中的实体
- `render_entity`：渲染世界中的实体
- `transform`：全局变换
- `color`：颜色调色
- `image_handle_id`：图像资源 ID
- `flip_x/flip_y`：水平/垂直翻转标志
- `kind`：精灵类型（单个或切片）

### 3. ExtractedSpriteKind

定义精灵的渲染类型。

```rust
pub enum ExtractedSpriteKind {
    Single {
        anchor: Vec2,
        rect: Option<Rect>,
        scaling_mode: Option<SpriteScalingMode>,
        custom_size: Option<Vec2>,
    },
    Slices {
        indices: Range<usize>
    },
}
```

### 4. Material2d Trait

2D 材质的核心特征。

```rust
pub trait Material2d: AsBindGroup + Asset + Clone + Sized {
    fn vertex_shader() -> ShaderRef;
    fn fragment_shader() -> ShaderRef;
    fn depth_bias(&self) -> f32;
    fn alpha_mode(&self) -> AlphaMode2d;
    fn specialize(
        descriptor: &mut RenderPipelineDescriptor,
        layout: &MeshVertexBufferLayoutRef,
        key: Material2dKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError>;
}
```

### 5. ColorMaterial

内置的颜色材质。

```rust
#[derive(Asset, AsBindGroup, Reflect, Debug, Clone)]
pub struct ColorMaterial {
    pub color: Color,
    pub alpha_mode: AlphaMode2d,
    pub uv_transform: Affine2,
    pub texture: Option<Handle<Image>>,
}
```

### 6. AlphaMode2d

2D 透明度模式。

```rust
#[derive(Debug, Default, Reflect, Copy, Clone, PartialEq)]
pub enum AlphaMode2d {
    #[default]
    Opaque,         // 不透明
    Mask(f32),      // 阈值遮罩
    Blend,          // 透明混合
}
```

### 7. TilemapChunk

瓦片地图块组件。

```rust
#[derive(Component, Clone, Debug, Default, Reflect)]
pub struct TilemapChunk {
    pub chunk_size: UVec2,          // 块大小（以瓦片为单位）
    pub tile_display_size: UVec2,   // 瓦片显示大小
    pub tileset: Handle<Image>,     // 瓦片集图像
    pub alpha_mode: AlphaMode2d,    // 透明度模式
}
```

## 主要 API 使用示例

### 1. 基础精灵渲染

```rust
use bevy::prelude::*;
use bevy_sprite_render::*;

fn setup(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 生成基础精灵
    commands.spawn((
        Sprite {
            image: asset_server.load("sprite.png"),
            color: Color::WHITE,
            flip_x: false,
            flip_y: false,
            custom_size: Some(Vec2::new(100.0, 100.0)),
            ..default()
        },
        Transform::from_translation(Vec3::new(0.0, 0.0, 0.0)),
        GlobalTransform::default(),
    ));
}
```

### 2. 使用 ColorMaterial

```rust
fn setup_mesh2d(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    // 创建四边形网格和颜色材质
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(100.0, 100.0))),
        MeshMaterial2d(materials.add(ColorMaterial {
            color: Color::srgb(1.0, 0.0, 0.0),
            alpha_mode: AlphaMode2d::Blend,
            ..default()
        })),
        Transform::from_translation(Vec3::new(0.0, 0.0, 0.0)),
    ));
}
```

### 3. 自定义材质

```rust
use bevy_render::render_resource::{AsBindGroup, ShaderRef};

#[derive(AsBindGroup, Debug, Clone, Asset, TypePath)]
pub struct CustomMaterial {
    #[uniform(0)]
    color: LinearRgba,
    #[texture(1)]
    #[sampler(2)]
    texture: Handle<Image>,
}

impl Material2d for CustomMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/custom_material.wgsl".into()
    }

    fn alpha_mode(&self) -> AlphaMode2d {
        AlphaMode2d::Blend
    }
}

fn setup_custom_material(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<CustomMaterial>>,
    asset_server: Res<AssetServer>,
) {
    commands.spawn((
        Mesh2d(meshes.add(Circle::new(50.0))),
        MeshMaterial2d(materials.add(CustomMaterial {
            color: LinearRgba::RED,
            texture: asset_server.load("texture.png"),
        })),
    ));
}
```

### 4. 瓦片地图

```rust
fn setup_tilemap(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let chunk_size = UVec2::new(16, 16);
    let tile_data: Vec<Option<TileData>> = (0..256)
        .map(|i| Some(TileData::from_tileset_index(i % 64)))
        .collect();

    commands.spawn((
        TilemapChunk {
            chunk_size,
            tile_display_size: UVec2::new(32, 32),
            tileset: asset_server.load("tileset.png"),
            alpha_mode: AlphaMode2d::Blend,
        },
        TilemapChunkTileData(tile_data),
        Transform::default(),
    ));
}
```

### 5. 文本渲染（需要 bevy_text 特性）

```rust
#[cfg(feature = "bevy_text")]
fn setup_text2d(mut commands: Commands) {
    commands.spawn((
        Text2d::new("Hello, World!"),
        TextFont {
            font_size: 24.0,
            ..default()
        },
        TextColor(Color::WHITE),
        Transform::from_translation(Vec3::new(0.0, 0.0, 0.0)),
    ));
}
```

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_asset 集成

```rust
// 资源加载
fn load_assets(asset_server: Res<AssetServer>) {
    let image_handle: Handle<Image> = asset_server.load("sprite.png");
    let shader_handle: Handle<Shader> = asset_server.load("custom.wgsl");
}
```

### 2. 与 bevy_transform 集成

```rust
// 变换组件自动参与渲染
fn move_sprite(mut query: Query<&mut Transform, With<Sprite>>) {
    for mut transform in &mut query {
        transform.translation.x += 1.0;
    }
}
```

### 3. 与 bevy_render 集成

```rust
// 自定义渲染管线
impl SpecializedRenderPipeline for CustomPipeline {
    type Key = CustomPipelineKey;

    fn specialize(&self, key: Self::Key) -> RenderPipelineDescriptor {
        // 自定义管线专化逻辑
        RenderPipelineDescriptor {
            // 管线配置
            ..default()
        }
    }
}
```

### 4. 与 bevy_camera 集成

```rust
// 相机和可见性查询
fn camera_culling(
    query: Query<(&Transform, &ViewVisibility), With<Sprite>>,
) {
    for (transform, visibility) in &query {
        if visibility.get() {
            // 精灵在相机视野中
        }
    }
}
```

## 常见使用场景

### 1. 2D 游戏精灵

```rust
// 游戏角色精灵
#[derive(Component)]
struct Player;

fn spawn_player(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    commands.spawn((
        Player,
        Sprite {
            image: asset_server.load("player.png"),
            ..default()
        },
        Transform::from_translation(Vec3::new(0.0, 0.0, 1.0)),
    ));
}

// 精灵动画
fn animate_sprite(
    time: Res<Time>,
    mut query: Query<&mut Transform, With<Player>>,
) {
    for mut transform in &mut query {
        transform.rotation = Quat::from_rotation_z(time.elapsed_seconds());
    }
}
```

### 2. UI 背景

```rust
fn setup_ui_background(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    commands.spawn((
        Mesh2d(meshes.add(Rectangle::new(800.0, 600.0))),
        MeshMaterial2d(materials.add(ColorMaterial {
            color: Color::srgba(0.1, 0.1, 0.2, 0.8),
            alpha_mode: AlphaMode2d::Blend,
            ..default()
        })),
        Transform::from_translation(Vec3::new(0.0, 0.0, -1.0)),
    ));
}
```

### 3. 粒子效果

```rust
#[derive(Component)]
struct Particle {
    velocity: Vec3,
    lifetime: f32,
}

fn spawn_particles(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    for i in 0..100 {
        let angle = i as f32 * 0.063; // 约 2*PI/100
        commands.spawn((
            Particle {
                velocity: Vec3::new(angle.cos(), angle.sin(), 0.0) * 100.0,
                lifetime: 2.0,
            },
            Sprite {
                image: asset_server.load("particle.png"),
                color: Color::srgba(1.0, 1.0, 1.0, 0.8),
                custom_size: Some(Vec2::new(4.0, 4.0)),
                ..default()
            },
            Transform::from_translation(Vec3::ZERO),
        ));
    }
}

fn update_particles(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(Entity, &mut Particle, &mut Transform, &mut Sprite)>,
) {
    for (entity, mut particle, mut transform, mut sprite) in &mut query {
        particle.lifetime -= time.delta_seconds();

        if particle.lifetime <= 0.0 {
            commands.entity(entity).despawn();
            continue;
        }

        transform.translation += particle.velocity * time.delta_seconds();
        sprite.color.set_alpha(particle.lifetime / 2.0);
    }
}
```

### 4. 地图系统

```rust
#[derive(Component)]
struct GameMap;

fn setup_map(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 创建多个瓦片地图块
    for x in 0..4 {
        for y in 0..4 {
            let chunk_size = UVec2::new(16, 16);
            let tile_data: Vec<Option<TileData>> = generate_chunk_data(x, y);

            commands.spawn((
                GameMap,
                TilemapChunk {
                    chunk_size,
                    tile_display_size: UVec2::new(32, 32),
                    tileset: asset_server.load("tileset.png"),
                    alpha_mode: AlphaMode2d::Opaque,
                },
                TilemapChunkTileData(tile_data),
                Transform::from_translation(Vec3::new(
                    x as f32 * 512.0, // 16 * 32
                    y as f32 * 512.0,
                    0.0,
                )),
            ));
        }
    }
}

fn generate_chunk_data(chunk_x: u32, chunk_y: u32) -> Vec<Option<TileData>> {
    (0..256).map(|i| {
        // 基于位置生成不同的瓦片
        let tile_index = ((chunk_x + chunk_y + i) % 64) as u16;
        Some(TileData::from_tileset_index(tile_index))
    }).collect()
}
```

### 5. 批量精灵渲染

```rust
fn spawn_many_sprites(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let image = asset_server.load("sprite.png");

    // 批量生成大量精灵，引擎会自动进行批量渲染优化
    for x in -50..50 {
        for y in -50..50 {
            commands.spawn((
                Sprite {
                    image: image.clone(),
                    color: Color::hsl(
                        (x + y) as f32 * 3.6, // 色相
                        0.8, // 饱和度
                        0.6, // 亮度
                    ),
                    ..default()
                },
                Transform::from_translation(Vec3::new(
                    x as f32 * 20.0,
                    y as f32 * 20.0,
                    0.0,
                )),
            ));
        }
    }
}
```

## 性能优化建议

### 1. 批量渲染优化

```rust
// 使用相同材质的对象会自动批量渲染
// 避免不必要的材质变换
fn optimize_batching(
    image_handle: Handle<Image>,
    mut commands: Commands,
) {
    // 好的做法：使用相同的图像句柄
    for i in 0..1000 {
        commands.spawn((
            Sprite {
                image: image_handle.clone(),
                color: Color::WHITE,
                ..default()
            },
            Transform::from_translation(Vec3::new(i as f32, 0.0, 0.0)),
        ));
    }
}
```

### 2. 避免频繁的颜色变换

```rust
// 使用组件标记而不是实时颜色计算
#[derive(Component)]
struct HealthBar {
    max_health: f32,
    current_health: f32,
}

fn update_health_bars(
    mut query: Query<(&HealthBar, &mut Sprite)>
) {
    for (health_bar, mut sprite) in &mut query {
        let health_ratio = health_bar.current_health / health_bar.max_health;
        sprite.color = Color::srgb(1.0 - health_ratio, health_ratio, 0.0);
    }
}
```

### 3. LOD (细节层次) 系统

```rust
#[derive(Component)]
struct LevelOfDetail {
    high_detail: Handle<Image>,
    low_detail: Handle<Image>,
    switch_distance: f32,
}

fn update_lod(
    camera_query: Query<&Transform, (With<Camera>, Without<Sprite>)>,
    mut sprite_query: Query<(&Transform, &LevelOfDetail, &mut Sprite)>,
) {
    let camera_pos = camera_query.single().translation;

    for (transform, lod, mut sprite) in &mut sprite_query {
        let distance = camera_pos.distance(transform.translation);

        sprite.image = if distance > lod.switch_distance {
            lod.low_detail.clone()
        } else {
            lod.high_detail.clone()
        };
    }
}
```

## 注意事项

1. **坐标系统**：Bevy 使用右手坐标系，Y 轴向上为正
2. **深度排序**：Z 值较大的对象会渲染在前面
3. **透明度混合**：使用 `AlphaMode2d::Blend` 时注意渲染顺序
4. **批量渲染**：相同材质的对象会自动批量渲染以提高性能
5. **资源管理**：合理使用资源句柄，避免重复加载

## 调试技巧

```rust
// 启用精灵渲染调试信息
fn debug_sprite_info(
    query: Query<(Entity, &Sprite, &Transform)>,
) {
    for (entity, sprite, transform) in &query {
        println!(
            "Entity: {:?}, Color: {:?}, Position: {:?}",
            entity,
            sprite.color,
            transform.translation
        );
    }
}

// 可视化边界框
#[cfg(feature = "bevy_dev_tools")]
fn debug_sprite_bounds(
    mut gizmos: Gizmos,
    query: Query<(&Transform, &Sprite)>,
) {
    for (transform, sprite) in &query {
        if let Some(size) = sprite.custom_size {
            gizmos.rect_2d(
                transform.translation.truncate(),
                transform.rotation.to_euler(EulerRot::ZYX).0,
                size,
                Color::GREEN,
            );
        }
    }
}
```

这个文档涵盖了 `bevy_sprite_render` 模块的主要功能、API 使用方法和最佳实践，为开发者提供了全面的参考资料。