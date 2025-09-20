# Bevy UI 渲染模块文档

## 1. 模块概述和主要功能

`bevy_ui_render` 是 Bevy 引擎中负责 UI 渲染的核心模块，提供了完整的 UI 渲染管线和相关功能。该模块专门处理 2D 用户界面元素的渲染，包括背景、边框、文本、图像、阴影和渐变等。

### 主要功能特性

- **UI 元素渲染**：支持基本的矩形UI节点渲染，包括背景色、图像和边框
- **文本渲染**：处理文本字形的渲染和排版
- **阴影效果**：提供盒阴影（Box Shadow）渲染功能
- **渐变效果**：支持线性、径向和圆锥渐变背景
- **材质系统**：允许自定义UI材质用于高级渲染效果
- **纹理切片**：支持9-slice纹理渲染，用于可缩放的UI元素
- **抗锯齿**：提供UI渲染的抗锯齿选项
- **调试功能**：包含UI调试叠加层功能

## 2. 核心结构体和枚举

### 2.1 主要插件结构体

#### `UiRenderPlugin`
主要的UI渲染插件，负责初始化整个UI渲染系统。

```rust
#[derive(Default)]
pub struct UiRenderPlugin;
```

#### `BoxShadowPlugin`
专门处理盒阴影渲染的插件。

```rust
pub struct BoxShadowPlugin;
```

#### `GradientPlugin`
处理渐变效果渲染的插件。

```rust
pub struct GradientPlugin;
```

#### `UiMaterialPlugin<M: UiMaterial>`
用于自定义UI材质的泛型插件。

```rust
pub struct UiMaterialPlugin<M: UiMaterial>(PhantomData<M>);
```

#### `UiTextureSlicerPlugin`
处理纹理切片渲染的插件。

```rust
pub struct UiTextureSlicerPlugin;
```

### 2.2 渲染相关结构体

#### `ExtractedUiNode`
从主世界提取的UI节点数据，用于渲染阶段。

```rust
pub struct ExtractedUiNode {
    pub z_order: f32,                    // Z轴顺序
    pub image: AssetId<Image>,           // 图像资产ID
    pub clip: Option<Rect>,              // 裁剪区域
    pub extracted_camera_entity: Entity, // 提取的相机实体
    pub item: ExtractedUiItem,           // UI项目数据
    pub main_entity: MainEntity,         // 主实体
    pub render_entity: Entity,           // 渲染实体
    pub transform: Affine2,              // 变换矩阵
}
```

#### `ExtractedUiItem`
UI项目的具体数据，包含节点和字形两种类型。

```rust
pub enum ExtractedUiItem {
    Node {
        color: LinearRgba,                    // 颜色
        rect: Rect,                           // 矩形区域
        atlas_scaling: Option<Vec2>,          // 图集缩放
        flip_x: bool,                         // X轴翻转
        flip_y: bool,                         // Y轴翻转
        border_radius: ResolvedBorderRadius,  // 边框圆角
        border: BorderRect,                   // 边框
        node_type: NodeType,                  // 节点类型
    },
    Glyphs {
        range: Range<usize>,                  // 字形范围
    },
}
```

#### `NodeType`
UI节点的类型枚举。

```rust
pub enum NodeType {
    Rect,           // 矩形节点
    Border(u32),    // 边框节点（包含着色器标志）
}
```

### 2.3 渲染管线结构体

#### `UiPipeline`
UI渲染管线的核心结构体。

```rust
pub struct UiPipeline {
    pub view_layout: BindGroupLayout,   // 视图绑定组布局
    pub image_layout: BindGroupLayout,  // 图像绑定组布局
    pub shader: Handle<Shader>,         // 着色器句柄
}
```

#### `UiPipelineKey`
用于特化UI渲染管线的键值。

```rust
pub struct UiPipelineKey {
    pub hdr: bool,          // 是否启用HDR
    pub anti_alias: bool,   // 是否启用抗锯齿
}
```

### 2.4 配置和选项

#### `UiAntiAlias`
UI抗锯齿配置枚举。

```rust
pub enum UiAntiAlias {
    #[default]
    On,   // 启用抗锯齿
    Off,  // 禁用抗锯齿
}
```

#### `BoxShadowSamples`
盒阴影采样数量配置。

```rust
#[derive(Component, Clone, Copy, Debug, Reflect, Eq, PartialEq)]
pub struct BoxShadowSamples(pub u32);
```

### 2.5 UI材质系统

#### `UiMaterial` Trait
自定义UI材质必须实现的trait。

```rust
pub trait UiMaterial: AsBindGroup + Asset + Clone + Sized {
    /// 返回顶点着色器引用
    fn vertex_shader() -> ShaderRef {
        ShaderRef::Default
    }

    /// 返回片段着色器引用
    fn fragment_shader() -> ShaderRef {
        ShaderRef::Default
    }

    /// 特化渲染管线描述符
    fn specialize(descriptor: &mut RenderPipelineDescriptor, key: UiMaterialKey<Self>) {}
}
```

#### `MaterialNode<M: UiMaterial>`
用于将自定义材质附加到UI实体的组件。

```rust
#[derive(Component, Clone, Debug, Reflect)]
pub struct MaterialNode<M: UiMaterial>(pub Handle<M>);
```

## 3. 主要API使用示例

### 3.1 基本UI渲染插件配置

```rust
use bevy::prelude::*;
use bevy_ui_render::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(UiRenderPlugin)  // 添加UI渲染插件
        .run();
}
```

### 3.2 配置盒阴影采样

```rust
use bevy::prelude::*;
use bevy_ui_render::prelude::*;

fn setup_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        BoxShadowSamples(6),  // 设置阴影采样数为6
    ));
}
```

### 3.3 配置UI抗锯齿

```rust
use bevy::prelude::*;
use bevy_ui_render::prelude::*;

fn setup_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        UiAntiAlias::On,   // 启用抗锯齿
    ));
}
```

### 3.4 自定义UI材质示例

```rust
use bevy::prelude::*;
use bevy_ui_render::prelude::*;
use bevy_render::render_resource::*;

// 定义自定义材质
#[derive(AsBindGroup, Asset, TypePath, Debug, Clone)]
pub struct CustomUiMaterial {
    #[uniform(0)]
    color: LinearRgba,
    #[texture(1)]
    #[sampler(2)]
    color_texture: Option<Handle<Image>>,
}

impl UiMaterial for CustomUiMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/custom_ui_material.wgsl".into()
    }
}

fn setup_custom_material(
    mut commands: Commands,
    mut materials: ResMut<Assets<CustomUiMaterial>>,
) {
    let custom_material = materials.add(CustomUiMaterial {
        color: LinearRgba::RED,
        color_texture: None,
    });

    commands.spawn((
        Node::default(),
        MaterialNode(custom_material),
    ));
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(UiMaterialPlugin::<CustomUiMaterial>::default())
        .add_systems(Startup, setup_custom_material)
        .run();
}
```

### 3.5 使用渐变背景

```rust
use bevy::prelude::*;
use bevy_ui::prelude::*;

fn setup_gradient_ui(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(200.0),
            height: Val::Px(100.0),
            ..default()
        },
        BackgroundGradient::linear(
            LinearGradient::new()
                .direction(Vec2::new(1.0, 0.0))
                .add_stop(0.0, Color::srgb(1.0, 0.0, 0.0))
                .add_stop(1.0, Color::srgb(0.0, 0.0, 1.0))
        ),
    ));
}
```

### 3.6 添加盒阴影效果

```rust
use bevy::prelude::*;
use bevy_ui::prelude::*;

fn setup_shadow_ui(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(200.0),
            height: Val::Px(100.0),
            ..default()
        },
        BackgroundColor(Color::WHITE),
        BoxShadow {
            color: Color::srgba(0.0, 0.0, 0.0, 0.5),
            x_offset: Val::Px(5.0),
            y_offset: Val::Px(5.0),
            blur_radius: Val::Px(10.0),
            spread_radius: Val::Px(2.0),
        },
    ));
}
```

## 4. 与其他bevy模块的集成方式

### 4.1 与 `bevy_ui` 的集成

`bevy_ui_render` 是 `bevy_ui` 的渲染后端，负责将UI布局和样式信息转换为实际的渲染指令。

```rust
// bevy_ui提供布局和组件
use bevy_ui::prelude::*;
// bevy_ui_render提供渲染功能
use bevy_ui_render::prelude::*;

fn create_ui_system(mut commands: Commands) {
    commands.spawn((
        // bevy_ui的布局组件
        Node {
            width: Val::Px(100.0),
            height: Val::Px(100.0),
            ..default()
        },
        // bevy_ui的样式组件
        BackgroundColor(Color::RED),
        // bevy_ui_render会自动处理渲染
    ));
}
```

### 4.2 与 `bevy_render` 的集成

`bevy_ui_render` 扩展了 `bevy_render` 的渲染管线，添加了UI特定的渲染阶段和资源。

```rust
use bevy_render::prelude::*;
use bevy_ui_render::prelude::*;

// UI渲染使用TransparentUi渲染阶段
// 这与bevy_render的渲染图系统集成
```

### 4.3 与 `bevy_text` 的集成

文本渲染依赖于 `bevy_text` 模块提供的字形信息。

```rust
use bevy_text::prelude::*;
use bevy_ui_render::*;

// ExtractedGlyph结构体使用bevy_text的字形数据
// 进行文本渲染
```

### 4.4 与 `bevy_image` 的集成

UI图像渲染使用 `bevy_image` 模块的图像资产。

```rust
use bevy_image::prelude::*;
use bevy_ui_render::*;

// UI节点可以引用Image资产进行纹理渲染
```

### 4.5 与 `bevy_camera` 的集成

UI渲染需要相机信息来确定渲染目标和视口。

```rust
use bevy_camera::prelude::*;
use bevy_ui_render::prelude::*;

fn setup_ui_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d,                    // bevy_camera的2D相机
        UiAntiAlias::On,            // bevy_ui_render的UI配置
        BoxShadowSamples(4),        // bevy_ui_render的阴影配置
    ));
}
```

## 5. 常见使用场景

### 5.1 基础UI界面创建

最常见的使用场景是创建基本的UI界面，包括按钮、面板和文本。

```rust
use bevy::prelude::*;
use bevy_ui_render::prelude::*;

fn setup_basic_ui(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 创建根节点
    commands
        .spawn((
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                ..default()
            },
            BackgroundColor(Color::srgb(0.1, 0.1, 0.1)),
        ))
        .with_children(|parent| {
            // 创建按钮
            parent.spawn((
                Node {
                    width: Val::Px(200.0),
                    height: Val::Px(60.0),
                    border: UiRect::all(Val::Px(2.0)),
                    justify_content: JustifyContent::Center,
                    align_items: AlignItems::Center,
                    ..default()
                },
                BackgroundColor(Color::srgb(0.2, 0.3, 0.8)),
                BorderColor(Color::WHITE),
                BorderRadius::all(Val::Px(10.0)),
            ))
            .with_children(|parent| {
                parent.spawn((
                    Text::new("Click Me!"),
                    TextColor(Color::WHITE),
                ));
            });
        });
}
```

### 5.2 响应式UI设计

创建能够适应不同屏幕尺寸的响应式UI。

```rust
fn setup_responsive_ui(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Row,
            ..default()
        },
        BackgroundColor(Color::NONE),
    ))
    .with_children(|parent| {
        // 侧边栏 - 固定宽度
        parent.spawn((
            Node {
                width: Val::Px(250.0),
                height: Val::Percent(100.0),
                ..default()
            },
            BackgroundColor(Color::srgb(0.2, 0.2, 0.2)),
        ));

        // 主内容区 - 自适应宽度
        parent.spawn((
            Node {
                flex_grow: 1.0,
                height: Val::Percent(100.0),
                padding: UiRect::all(Val::Px(20.0)),
                ..default()
            },
            BackgroundColor(Color::WHITE),
        ));
    });
}
```

### 5.3 游戏HUD界面

创建游戏中的抬头显示界面，包括生命值、分数等信息。

```rust
#[derive(Component)]
struct HealthBar;

#[derive(Component)]
struct ScoreText;

fn setup_game_hud(mut commands: Commands) {
    // HUD容器
    commands
        .spawn((
            Node {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                ..default()
            },
            BackgroundColor(Color::NONE),
        ))
        .with_children(|parent| {
            // 顶部状态栏
            parent
                .spawn((
                    Node {
                        width: Val::Percent(100.0),
                        height: Val::Px(80.0),
                        flex_direction: FlexDirection::Row,
                        align_items: AlignItems::Center,
                        padding: UiRect::all(Val::Px(20.0)),
                        ..default()
                    },
                    BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.7)),
                ))
                .with_children(|parent| {
                    // 生命值条
                    parent
                        .spawn((
                            Node {
                                width: Val::Px(200.0),
                                height: Val::Px(20.0),
                                border: UiRect::all(Val::Px(2.0)),
                                ..default()
                            },
                            BackgroundColor(Color::srgb(0.8, 0.2, 0.2)),
                            BorderColor(Color::WHITE),
                            HealthBar,
                        ));

                    // 分数文本
                    parent.spawn((
                        Text::new("Score: 0"),
                        TextColor(Color::WHITE),
                        Node {
                            margin: UiRect::left(Val::Px(20.0)),
                            ..default()
                        },
                        ScoreText,
                    ));
                });
        });
}

fn update_hud(
    mut health_query: Query<&mut BackgroundColor, (With<HealthBar>, Without<ScoreText>)>,
    mut score_query: Query<&mut Text, With<ScoreText>>,
    // 假设有健康和分数资源
    // health: Res<Health>,
    // score: Res<Score>,
) {
    // 更新生命值条颜色
    if let Ok(mut bg_color) = health_query.get_single_mut() {
        // let health_percent = health.current as f32 / health.max as f32;
        // bg_color.0 = Color::srgb(1.0 - health_percent, health_percent, 0.0);
    }

    // 更新分数文本
    if let Ok(mut text) = score_query.get_single_mut() {
        // text.0 = format!("Score: {}", score.value);
    }
}
```

### 5.4 动画UI效果

创建带有动画效果的UI元素。

```rust
#[derive(Component)]
struct AnimatedButton;

fn setup_animated_ui(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(200.0),
            height: Val::Px(60.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgb(0.3, 0.3, 0.8)),
        BorderRadius::all(Val::Px(10.0)),
        BoxShadow {
            color: Color::srgba(0.0, 0.0, 0.0, 0.3),
            x_offset: Val::Px(0.0),
            y_offset: Val::Px(4.0),
            blur_radius: Val::Px(8.0),
            spread_radius: Val::Px(0.0),
        },
        AnimatedButton,
    ))
    .with_children(|parent| {
        parent.spawn((
            Text::new("Hover Me!"),
            TextColor(Color::WHITE),
        ));
    });
}

fn animate_button_hover(
    mut button_query: Query<(&mut BackgroundColor, &mut BoxShadow), With<AnimatedButton>>,
    time: Res<Time>,
) {
    for (mut bg_color, mut shadow) in button_query.iter_mut() {
        let pulse = (time.elapsed_seconds() * 2.0).sin() * 0.1 + 0.9;
        bg_color.0 = Color::srgb(0.3 * pulse, 0.3 * pulse, 0.8);

        // 动画阴影效果
        if let Val::Px(ref mut y_offset) = shadow.y_offset {
            *y_offset = 4.0 + pulse * 2.0;
        }
        if let Val::Px(ref mut blur) = shadow.blur_radius {
            *blur = 8.0 + pulse * 4.0;
        }
    }
}
```

### 5.5 自定义UI材质效果

使用自定义材质创建特殊的视觉效果。

```rust
use bevy_render::render_resource::*;

#[derive(AsBindGroup, Asset, TypePath, Debug, Clone)]
pub struct GlowMaterial {
    #[uniform(0)]
    pub color: LinearRgba,
    #[uniform(0)]
    pub intensity: f32,
    #[uniform(0)]
    pub time: f32,
}

impl UiMaterial for GlowMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/glow_ui.wgsl".into()
    }
}

fn setup_glow_ui(
    mut commands: Commands,
    mut materials: ResMut<Assets<GlowMaterial>>,
) {
    let glow_material = materials.add(GlowMaterial {
        color: LinearRgba::BLUE,
        intensity: 2.0,
        time: 0.0,
    });

    commands.spawn((
        Node {
            width: Val::Px(300.0),
            height: Val::Px(100.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        MaterialNode(glow_material),
    ))
    .with_children(|parent| {
        parent.spawn((
            Text::new("Glowing Text"),
            TextColor(Color::WHITE),
        ));
    });
}

fn update_glow_material(
    mut materials: ResMut<Assets<GlowMaterial>>,
    time: Res<Time>,
) {
    for (_, material) in materials.iter_mut() {
        material.time = time.elapsed_seconds();
    }
}
```

这些使用场景涵盖了从基础UI创建到高级特效的各种需求，展示了 `bevy_ui_render` 模块的强大功能和灵活性。开发者可以根据具体需求组合使用这些功能来创建丰富的用户界面。