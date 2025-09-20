# Bevy Sprite 模块详细文档

## 模块概述

`bevy_sprite` 是 Bevy 引擎中专门处理 2D 精灵（Sprite）渲染的核心模块。该模块提供了完整的 2D 图像显示、文本渲染、纹理切片和交互功能，是构建 2D 游戏和应用程序的基础组件。

### 主要功能特性

- **基础精灵渲染**：支持静态图像和动画精灵的显示
- **纹理图集支持**：高效的精灵批处理和动画管理
- **2D 文本渲染**：完整的文本显示和布局系统
- **九宫格切片**：智能的图像缩放和重复技术
- **精灵交互**：基于像素精度的拾取和碰撞检测
- **灵活的锚点系统**：精确的精灵定位和对齐
- **多种缩放模式**：适应不同场景的图像缩放需求

## 核心结构体和枚举

### 1. Sprite 结构体

`Sprite` 是模块的核心组件，描述了要渲染到 2D 摄像机的精灵。

```rust
#[derive(Component, Debug, Default, Clone, Reflect)]
#[require(Transform, Visibility, VisibilityClass, Anchor)]
pub struct Sprite {
    /// 用于渲染精灵的图像句柄
    pub image: Handle<Image>,
    /// 可选的纹理图集
    pub texture_atlas: Option<TextureAtlas>,
    /// 精灵的颜色调色
    pub color: Color,
    /// 沿 X 轴翻转精灵
    pub flip_x: bool,
    /// 沿 Y 轴翻转精灵
    pub flip_y: bool,
    /// 自定义精灵尺寸（覆盖图像原始尺寸）
    pub custom_size: Option<Vec2>,
    /// 渲染区域（图像的子区域）
    pub rect: Option<Rect>,
    /// 图像缩放模式
    pub image_mode: SpriteImageMode,
}
```

**关键方法：**

- `Sprite::from_image(image)` - 从图像创建精灵
- `Sprite::from_atlas_image(image, atlas)` - 从图集创建精灵
- `Sprite::from_color(color, size)` - 创建纯色精灵
- `Sprite::sized(size)` - 创建指定尺寸的精灵

### 2. SpriteImageMode 枚举

控制图像在缩放时的处理方式：

```rust
pub enum SpriteImageMode {
    /// 自动模式：保持原始尺寸或按 custom_size 缩放
    Auto,
    /// 按指定模式缩放
    Scale(SpriteScalingMode),
    /// 九宫格切片
    Sliced(TextureSlicer),
    /// 平铺重复
    Tiled {
        tile_x: bool,      // 水平重复
        tile_y: bool,      // 垂直重复
        stretch_value: f32, // 重复阈值
    },
}
```

### 3. SpriteScalingMode 枚举

定义纹理的比例缩放模式：

```rust
pub enum SpriteScalingMode {
    /// 居中填充：保持宽高比，确保两个维度都不小于目标尺寸
    FillCenter,
    /// 起始对齐填充：左对齐或顶部对齐
    FillStart,
    /// 结束对齐填充：右对齐或底部对齐
    FillEnd,
    /// 居中适配：保持宽高比，完全适配到目标区域
    FitCenter,
    /// 起始对齐适配
    FitStart,
    /// 结束对齐适配
    FitEnd,
}
```

### 4. Anchor 结构体

定义精灵相对于其 Transform 的偏移锚点：

```rust
#[derive(Component, Debug, Clone, Copy, PartialEq, Deref, DerefMut, Reflect)]
pub struct Anchor(pub Vec2);
```

**预定义常量：**

```rust
impl Anchor {
    pub const BOTTOM_LEFT: Self = Self(Vec2::new(-0.5, -0.5));
    pub const BOTTOM_CENTER: Self = Self(Vec2::new(0.0, -0.5));
    pub const BOTTOM_RIGHT: Self = Self(Vec2::new(0.5, -0.5));
    pub const CENTER_LEFT: Self = Self(Vec2::new(-0.5, 0.0));
    pub const CENTER: Self = Self(Vec2::ZERO);  // 默认值
    pub const CENTER_RIGHT: Self = Self(Vec2::new(0.5, 0.0));
    pub const TOP_LEFT: Self = Self(Vec2::new(-0.5, 0.5));
    pub const TOP_CENTER: Self = Self(Vec2::new(0.0, 0.5));
    pub const TOP_RIGHT: Self = Self(Vec2::new(0.5, 0.5));
}
```

### 5. Text2d 结构体

2D 文本渲染的顶级组件：

```rust
#[derive(Component, Clone, Debug, Default, Deref, DerefMut, Reflect)]
#[require(TextLayout, TextFont, TextColor, TextBounds, Anchor, Visibility, VisibilityClass, Transform)]
pub struct Text2d(pub String);
```

**创建方法：**
```rust
impl Text2d {
    pub fn new(text: impl Into<String>) -> Self
}
```

### 6. TextureSlicer 结构体

实现九宫格切片技术的核心结构：

```rust
pub struct TextureSlicer {
    /// 边框矩形定义切片线
    pub border: BorderRect,
    /// 中心部分的缩放模式
    pub center_scale_mode: SliceScaleMode,
    /// 边缘部分的缩放模式
    pub sides_scale_mode: SliceScaleMode,
    /// 角落部分的最大缩放比例
    pub max_corner_scale: f32,
}
```

## 主要 API 使用示例

### 1. 基础精灵创建和显示

```rust
use bevy::prelude::*;
use bevy_sprite::*;

fn setup_sprite(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 基础精灵
    commands.spawn(Sprite::from_image(asset_server.load("player.png")));

    // 带变换的精灵
    commands.spawn((
        Sprite::from_image(asset_server.load("enemy.png")),
        Transform::from_translation(Vec3::new(100.0, 50.0, 0.0)),
    ));

    // 自定义尺寸的精灵
    commands.spawn(Sprite {
        image: asset_server.load("background.png"),
        custom_size: Some(Vec2::new(800.0, 600.0)),
        ..Default::default()
    });

    // 纯色精灵
    commands.spawn(Sprite::from_color(Color::RED, Vec2::new(50.0, 50.0)));
}
```

### 2. 纹理图集使用

```rust
use bevy::prelude::*;
use bevy_sprite::*;

fn setup_atlas_sprite(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut texture_atlases: ResMut<Assets<TextureAtlasLayout>>,
) {
    let texture_handle = asset_server.load("spritesheet.png");

    // 创建纹理图集布局
    let layout = TextureAtlasLayout::from_grid(
        UVec2::new(32, 32), // 每个精灵的尺寸
        4, 4,               // 行列数
        None,               // 无间距
        None                // 无偏移
    );
    let atlas_layout = texture_atlases.add(layout);

    // 创建图集精灵
    commands.spawn(Sprite::from_atlas_image(
        texture_handle,
        TextureAtlas {
            layout: atlas_layout,
            index: 0, // 使用第一个精灵
        }
    ));
}
```

### 3. 精灵动画

```rust
use bevy::prelude::*;
use bevy_sprite::*;

#[derive(Component)]
struct AnimationTimer(Timer);

fn animate_sprite(
    time: Res<Time>,
    mut query: Query<(&mut AnimationTimer, &mut Sprite)>,
) {
    for (mut timer, mut sprite) in &mut query {
        timer.0.tick(time.delta());

        if timer.0.just_finished() {
            if let Some(ref mut atlas) = sprite.texture_atlas {
                atlas.index = (atlas.index + 1) % 4; // 循环 4 帧动画
            }
        }
    }
}

fn setup_animated_sprite(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        Sprite::from_image(asset_server.load("character.png")),
        AnimationTimer(Timer::from_seconds(0.1, TimerMode::Repeating)),
    ));
}
```

### 4. 2D 文本渲染

```rust
use bevy::prelude::*;
use bevy_sprite::*;

fn setup_text2d(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 基础文本
    commands.spawn(Text2d::new("Hello, Bevy!"));

    // 自定义样式的文本
    commands.spawn((
        Text2d::new("Styled Text"),
        TextFont {
            font: asset_server.load("fonts/FiraSans-Bold.ttf"),
            font_size: 60.0,
            ..Default::default()
        },
        TextColor(Color::BLUE),
        Transform::from_translation(Vec3::new(0.0, 100.0, 0.0)),
    ));

    // 多行文本with对齐
    commands.spawn((
        Text2d::new("Line 1\nLine 2\nLine 3"),
        TextLayout::new_with_justify(JustifyText::Center),
        Anchor::TOP_CENTER,
    ));

    // 带阴影的文本
    commands.spawn((
        Text2d::new("Shadow Text"),
        Text2dShadow {
            offset: Vec2::new(2.0, -2.0),
            color: Color::BLACK,
        },
    ));
}
```

### 5. 九宫格切片

```rust
use bevy::prelude::*;
use bevy_sprite::*;

fn setup_sliced_sprite(mut commands: Commands, asset_server: Res<AssetServer>) {
    let slicer = TextureSlicer {
        border: BorderRect {
            left: 10.0,
            right: 10.0,
            top: 10.0,
            bottom: 10.0,
        },
        center_scale_mode: SliceScaleMode::Stretch,
        sides_scale_mode: SliceScaleMode::Stretch,
        max_corner_scale: 1.0,
    };

    commands.spawn(Sprite {
        image: asset_server.load("panel.png"),
        image_mode: SpriteImageMode::Sliced(slicer),
        custom_size: Some(Vec2::new(200.0, 150.0)),
        ..Default::default()
    });
}
```

### 6. 精灵拾取（交互）

```rust
use bevy::prelude::*;
use bevy_sprite::*;

fn setup_picking(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 启用精灵拾取插件
    commands.spawn(SpritePickingPlugin);

    // 可拾取的精灵
    commands.spawn((
        Sprite::from_image(asset_server.load("button.png")),
        PickableBundle::default(),
        On::<Pointer<Click>>::run(handle_sprite_click),
    ));
}

fn handle_sprite_click(event: Listener<Pointer<Click>>) {
    println!("精灵被点击了！实体: {:?}", event.target());
}
```

## 与其他 Bevy 模块的集成方式

### 1. 与 Transform 系统集成

```rust
// 精灵自动继承 Transform 组件
commands.spawn((
    Sprite::from_image(asset_server.load("sprite.png")),
    Transform {
        translation: Vec3::new(100.0, 50.0, 1.0),
        rotation: Quat::from_rotation_z(45.0_f32.to_radians()),
        scale: Vec3::new(2.0, 1.5, 1.0),
    },
));
```

### 2. 与 Camera 系统集成

```rust
fn setup_camera(mut commands: Commands) {
    // 2D 摄像机用于渲染精灵
    commands.spawn(Camera2dBundle::default());

    // 或者使用正交投影的 3D 摄像机
    commands.spawn(Camera3dBundle {
        projection: Projection::Orthographic(OrthographicProjection {
            scale: 0.01,
            ..Default::default()
        }),
        ..Default::default()
    });
}
```

### 3. 与 Asset 系统集成

```rust
// 资产加载和管理
fn load_sprite_assets(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut events: EventReader<AssetEvent<Image>>,
) {
    for event in events.read() {
        match event {
            AssetEvent::Added { id } => {
                println!("图像资产已加载: {:?}", id);
            }
            AssetEvent::Modified { id } => {
                println!("图像资产已修改: {:?}", id);
            }
            _ => {}
        }
    }
}
```

### 4. 与 Visibility 系统集成

```rust
// 精灵可见性控制
fn toggle_visibility(
    input: Res<ButtonInput<KeyCode>>,
    mut query: Query<&mut Visibility, With<Sprite>>,
) {
    if input.just_pressed(KeyCode::Space) {
        for mut visibility in &mut query {
            *visibility = match *visibility {
                Visibility::Visible => Visibility::Hidden,
                _ => Visibility::Visible,
            };
        }
    }
}
```

## 常见使用场景

### 1. 2D 游戏角色

```rust
#[derive(Component)]
struct Player {
    speed: f32,
    health: i32,
}

fn setup_player(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        // 精灵组件
        Sprite::from_image(asset_server.load("player/idle.png")),
        // 游戏逻辑组件
        Player { speed: 200.0, health: 100 },
        // 变换组件
        Transform::from_translation(Vec3::new(0.0, 0.0, 1.0)),
        // 锚点设置为底部中心
        Anchor::BOTTOM_CENTER,
    ));
}

fn move_player(
    input: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
    mut query: Query<(&mut Transform, &Player)>,
) {
    for (mut transform, player) in &mut query {
        let mut direction = Vec3::ZERO;

        if input.pressed(KeyCode::ArrowLeft) {
            direction.x -= 1.0;
        }
        if input.pressed(KeyCode::ArrowRight) {
            direction.x += 1.0;
        }
        if input.pressed(KeyCode::ArrowUp) {
            direction.y += 1.0;
        }
        if input.pressed(KeyCode::ArrowDown) {
            direction.y -= 1.0;
        }

        if direction != Vec3::ZERO {
            transform.translation += direction.normalize() * player.speed * time.delta_seconds();
        }
    }
}
```

### 2. UI 元素（按钮、面板）

```rust
fn setup_ui_panel(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 九宫格面板
    let panel_slicer = TextureSlicer {
        border: BorderRect::all(16.0),
        center_scale_mode: SliceScaleMode::Stretch,
        sides_scale_mode: SliceScaleMode::Stretch,
        max_corner_scale: 1.0,
    };

    commands.spawn((
        Sprite {
            image: asset_server.load("ui/panel.png"),
            image_mode: SpriteImageMode::Sliced(panel_slicer),
            custom_size: Some(Vec2::new(300.0, 200.0)),
            ..Default::default()
        },
        Transform::from_translation(Vec3::new(0.0, 0.0, 0.0)),
    ));

    // 按钮
    commands.spawn((
        Sprite::from_image(asset_server.load("ui/button.png")),
        Transform::from_translation(Vec3::new(0.0, -50.0, 1.0)),
        PickableBundle::default(),
        On::<Pointer<Click>>::run(|_| println!("按钮被点击")),
    ));
}
```

### 3. 背景和地形

```rust
fn setup_background(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 静态背景
    commands.spawn((
        Sprite {
            image: asset_server.load("backgrounds/sky.png"),
            custom_size: Some(Vec2::new(1920.0, 1080.0)),
            ..Default::default()
        },
        Transform::from_translation(Vec3::new(0.0, 0.0, -10.0)),
    ));

    // 平铺地面
    commands.spawn((
        Sprite {
            image: asset_server.load("terrain/grass.png"),
            image_mode: SpriteImageMode::Tiled {
                tile_x: true,
                tile_y: false,
                stretch_value: 1.0,
            },
            custom_size: Some(Vec2::new(2000.0, 100.0)),
            ..Default::default()
        },
        Transform::from_translation(Vec3::new(0.0, -400.0, -5.0)),
        Anchor::BOTTOM_CENTER,
    ));
}
```

### 4. 粒子效果和特效

```rust
#[derive(Component)]
struct Particle {
    velocity: Vec3,
    lifetime: Timer,
}

fn spawn_particles(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    input: Res<ButtonInput<KeyCode>>,
) {
    if input.just_pressed(KeyCode::Space) {
        for _ in 0..50 {
            let velocity = Vec3::new(
                (rand::random::<f32>() - 0.5) * 500.0,
                rand::random::<f32>() * 300.0 + 100.0,
                0.0,
            );

            commands.spawn((
                Sprite {
                    image: asset_server.load("effects/particle.png"),
                    color: Color::rgba(1.0, 1.0, 1.0, 0.8),
                    custom_size: Some(Vec2::splat(4.0)),
                    ..Default::default()
                },
                Transform::from_translation(Vec3::ZERO),
                Particle {
                    velocity,
                    lifetime: Timer::from_seconds(2.0, TimerMode::Once),
                },
            ));
        }
    }
}

fn update_particles(
    mut commands: Commands,
    time: Res<Time>,
    mut query: Query<(Entity, &mut Transform, &mut Particle, &mut Sprite)>,
) {
    for (entity, mut transform, mut particle, mut sprite) in &mut query {
        particle.lifetime.tick(time.delta());

        if particle.lifetime.finished() {
            commands.entity(entity).despawn();
            continue;
        }

        // 更新位置
        transform.translation += particle.velocity * time.delta_seconds();

        // 重力效果
        particle.velocity.y -= 600.0 * time.delta_seconds();

        // 淡出效果
        let alpha = particle.lifetime.fraction_remaining();
        sprite.color.set_alpha(alpha);
    }
}
```

### 5. 文本显示和对话系统

```rust
#[derive(Component)]
struct DialogueText {
    full_text: String,
    current_length: usize,
    timer: Timer,
}

fn setup_dialogue(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        Text2d::new(""),
        TextFont {
            font: asset_server.load("fonts/dialog.ttf"),
            font_size: 24.0,
            ..Default::default()
        },
        TextColor(Color::WHITE),
        Transform::from_translation(Vec3::new(0.0, -200.0, 10.0)),
        Anchor::CENTER,
        DialogueText {
            full_text: "这是一段对话文本，会逐字显示...".to_string(),
            current_length: 0,
            timer: Timer::from_seconds(0.05, TimerMode::Repeating),
        },
    ));
}

fn update_dialogue(
    time: Res<Time>,
    mut query: Query<(&mut Text2d, &mut DialogueText)>,
) {
    for (mut text, mut dialogue) in &mut query {
        dialogue.timer.tick(time.delta());

        if dialogue.timer.just_finished() && dialogue.current_length < dialogue.full_text.len() {
            dialogue.current_length += 1;
            text.0 = dialogue.full_text[..dialogue.current_length].to_string();
        }
    }
}
```

## 性能优化建议

### 1. 批处理优化

```rust
// 使用纹理图集减少绘制调用
fn setup_optimized_sprites(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut texture_atlases: ResMut<Assets<TextureAtlasLayout>>,
) {
    let atlas_handle = asset_server.load("sprites_atlas.png");
    let layout = TextureAtlasLayout::from_grid(UVec2::new(32, 32), 8, 8, None, None);
    let atlas_layout = texture_atlases.add(layout);

    // 大量精灵使用相同的图集
    for i in 0..1000 {
        commands.spawn(Sprite::from_atlas_image(
            atlas_handle.clone(),
            TextureAtlas {
                layout: atlas_layout.clone(),
                index: i % 64,
            }
        ));
    }
}
```

### 2. 视锥剔除

```rust
// bevy_sprite 自动计算 AABB 用于视锥剔除
// 对于不需要剔除的精灵，可以添加 NoFrustumCulling 组件
use bevy_camera::visibility::NoFrustumCulling;

commands.spawn((
    Sprite::from_image(asset_server.load("always_visible.png")),
    NoFrustumCulling, // 总是渲染，不进行视锥剔除
));
```

这份文档涵盖了 `bevy_sprite` 模块的核心功能、API 使用方法和实际应用场景。通过这些示例和说明，开发者可以充分利用 Bevy 的 2D 渲染能力来构建各种类型的游戏和应用程序。