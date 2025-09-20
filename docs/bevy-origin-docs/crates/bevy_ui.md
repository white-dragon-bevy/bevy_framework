# Bevy UI 中文操作文档

## 1. 模块概述和主要功能

Bevy UI 是 Bevy 引擎的用户界面系统，基于 ECS（实体组件系统）构建，专门为 2D 和 3D 游戏开发设计。它使用现代的 Flexbox 和 CSS Grid 布局模型，为游戏开发者提供了强大而灵活的 UI 构建能力。

### 1.1 核心特性

- **ECS 驱动**: 完全基于 Bevy 的 ECS 架构，支持组件化 UI 开发
- **现代布局**: 支持 Flexbox 和 CSS Grid 布局系统
- **响应式设计**: 支持不同屏幕尺寸和缩放因子
- **交互支持**: 内置鼠标和触摸交互处理
- **样式系统**: 完整的颜色、渐变、边框、阴影等样式支持
- **可访问性**: 内置无障碍访问支持
- **多媒体集成**: 与 Bevy 的资源系统无缝集成

### 1.2 架构设计

```
bevy_ui/
├── accessibility.rs      # 无障碍访问支持
├── focus.rs             # 焦点和交互管理
├── geometry.rs          # 几何和尺寸定义
├── gradients.rs         # 渐变效果系统
├── interaction_states.rs # 交互状态管理
├── layout/              # 布局系统
├── measurement.rs       # 尺寸测量系统
├── picking_backend.rs   # 拾取后端
├── stack.rs            # UI 层级堆栈
├── ui_node.rs          # UI 节点核心定义
├── ui_transform.rs     # UI 变换系统
├── update.rs           # 更新系统
└── widget/             # 内置组件
    ├── button.rs       # 按钮组件
    ├── image.rs        # 图像组件
    ├── label.rs        # 标签组件
    ├── text.rs         # 文本组件
    └── viewport.rs     # 视口组件
```

## 2. 核心结构体和枚举的说明

### 2.1 基础节点组件

#### Node
```rust
pub struct Node {
    // 布局属性
    pub display: Display,
    pub position_type: PositionType,
    pub flex_direction: FlexDirection,
    pub flex_wrap: FlexWrap,
    pub align_items: AlignItems,
    pub align_self: AlignSelf,
    pub align_content: AlignContent,
    pub justify_content: JustifyContent,
    pub justify_items: JustifyItems,
    pub justify_self: JustifySelf,

    // 尺寸属性
    pub width: Val,
    pub height: Val,
    pub min_width: Val,
    pub min_height: Val,
    pub max_width: Val,
    pub max_height: Val,

    // 间距属性
    pub left: Val,
    pub right: Val,
    pub top: Val,
    pub bottom: Val,
    pub padding: UiRect,
    pub margin: UiRect,
    pub border: UiRect,

    // 其他属性
    pub flex_grow: f32,
    pub flex_shrink: f32,
    pub flex_basis: Val,
    pub aspect_ratio: Option<f32>,
    pub overflow: Overflow,
    pub box_sizing: BoxSizing,
}
```

Node 是所有 UI 元素的基础组件，定义了布局、尺寸和位置属性。

#### ComputedNode
```rust
pub struct ComputedNode {
    pub stack_index: u32,        // UI 层级索引
    pub size: Vec2,              // 计算后的尺寸
    pub content_size: Vec2,      // 内容尺寸
    pub scrollbar_size: Vec2,    // 滚动条尺寸
    pub scroll_position: Vec2,   // 滚动位置
    pub outline_width: f32,      // 轮廓宽度
    pub outline_offset: f32,     // 轮廓偏移
    pub unrounded_size: Vec2,    // 未舍入的尺寸
    pub border: BorderRect,      // 边框值
    pub border_radius: ResolvedBorderRadius, // 边框圆角
    pub padding: BorderRect,     // 内边距
    pub inverse_scale_factor: f32, // 逆缩放因子
}
```

ComputedNode 包含布局系统计算后的实际值，通常只读。

### 2.2 尺寸和值类型

#### Val
```rust
pub enum Val {
    Auto,           // 自动计算
    Px(f32),        // 像素值
    Percent(f32),   // 百分比值
    Vw(f32),        // 视口宽度百分比
    Vh(f32),        // 视口高度百分比
    VMin(f32),      // 视口最小尺寸百分比
    VMax(f32),      // 视口最大尺寸百分比
}
```

Val 是 UI 系统中表示尺寸值的核心枚举，支持多种单位类型。

#### UiRect
```rust
pub struct UiRect {
    pub left: Val,
    pub right: Val,
    pub top: Val,
    pub bottom: Val,
}
```

UiRect 用于表示四个方向的值，如边距、内边距、边框等。

### 2.3 交互和焦点

#### Interaction
```rust
pub enum Interaction {
    Pressed,  // 被按下
    Hovered,  // 悬停状态
    None,     // 无交互
}
```

Interaction 描述 UI 节点的交互状态。

#### FocusPolicy
```rust
pub enum FocusPolicy {
    Block,  // 阻止交互穿透
    Pass,   // 允许交互穿透
}
```

FocusPolicy 控制节点是否阻止下层节点的交互。

### 2.4 布局枚举

#### Display
```rust
pub enum Display {
    Flex,    // Flexbox 布局
    Grid,    // Grid 布局
    None,    // 不显示
}
```

#### FlexDirection
```rust
pub enum FlexDirection {
    Row,           // 水平排列
    Column,        // 垂直排列
    RowReverse,    // 水平反向排列
    ColumnReverse, // 垂直反向排列
}
```

#### AlignItems
```rust
pub enum AlignItems {
    Default,    // 默认对齐
    Start,      // 起始对齐
    End,        // 结束对齐
    FlexStart,  // Flex 起始对齐
    FlexEnd,    // Flex 结束对齐
    Center,     // 居中对齐
    Baseline,   // 基线对齐
    Stretch,    // 拉伸对齐
}
```

### 2.5 颜色和样式

#### BackgroundColor
```rust
pub struct BackgroundColor(pub Color);
```

#### BorderColor
```rust
pub struct BorderColor {
    pub left: Color,
    pub right: Color,
    pub top: Color,
    pub bottom: Color,
}
```

#### BorderRadius
```rust
pub struct BorderRadius {
    pub top_left: Val,
    pub top_right: Val,
    pub bottom_right: Val,
    pub bottom_left: Val,
}
```

### 2.6 内置组件

#### Button
```rust
#[derive(Component)]
#[require(Node, FocusPolicy::Block, Interaction)]
pub struct Button;
```

按钮组件，自动包含 Node、FocusPolicy 和 Interaction 组件。

#### Text
```rust
#[derive(Component)]
#[require(Node, TextLayout, TextFont, TextColor, TextNodeFlags, ContentSize)]
pub struct Text(pub String);
```

文本组件，包含字符串内容和所需的文本相关组件。

#### ImageNode
```rust
pub struct ImageNode {
    pub image: Handle<Image>,
    pub color: Color,
    pub flip_x: bool,
    pub flip_y: bool,
    pub rect: Option<Rect>,
    pub image_mode: NodeImageMode,
}
```

图像节点组件，用于显示图片。

## 3. 主要 API 使用示例

### 3.1 基本 UI 创建

```rust
use bevy::prelude::*;
use bevy_ui::prelude::*;

fn setup_ui(mut commands: Commands) {
    // 创建根容器
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgb(0.2, 0.2, 0.2)),
    ));
}
```

### 3.2 按钮创建和交互

```rust
fn create_button(mut commands: Commands) {
    commands.spawn((
        Button,
        Node {
            width: Val::Px(200.0),
            height: Val::Px(50.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgb(0.3, 0.6, 0.9)),
        BorderRadius::all(Val::Px(10.0)),
    )).with_children(|parent| {
        parent.spawn(Text::new("点击我"));
    });
}

// 按钮交互处理
fn handle_button_interaction(
    mut interaction_query: Query<
        (&Interaction, &mut BackgroundColor),
        (Changed<Interaction>, With<Button>)
    >,
) {
    for (interaction, mut color) in &mut interaction_query {
        match *interaction {
            Interaction::Pressed => {
                *color = BackgroundColor(Color::srgb(0.2, 0.5, 0.8));
            }
            Interaction::Hovered => {
                *color = BackgroundColor(Color::srgb(0.4, 0.7, 1.0));
            }
            Interaction::None => {
                *color = BackgroundColor(Color::srgb(0.3, 0.6, 0.9));
            }
        }
    }
}
```

### 3.3 文本样式和布局

```rust
use bevy_text::*;

fn create_styled_text(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        Text::new("样式化文本"),
        Node {
            position_type: PositionType::Absolute,
            top: Val::Px(50.0),
            left: Val::Px(50.0),
            ..default()
        },
        TextFont {
            font: asset_server.load("fonts/FiraSans-Bold.ttf"),
            font_size: 24.0,
            ..default()
        },
        TextColor(Color::srgb(1.0, 0.8, 0.2)),
        TextLayout::new_with_justify(Justify::Center),
    ));
}
```

### 3.4 图像显示

```rust
fn create_image(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        ImageNode::new(asset_server.load("ui/logo.png")),
        Node {
            width: Val::Px(100.0),
            height: Val::Px(100.0),
            ..default()
        },
    ));
}
```

### 3.5 复杂布局示例

```rust
fn create_complex_layout(mut commands: Commands) {
    // 主容器
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            ..default()
        },
        BackgroundColor(Color::srgb(0.1, 0.1, 0.1)),
    )).with_children(|parent| {
        // 顶部导航栏
        parent.spawn((
            Node {
                width: Val::Percent(100.0),
                height: Val::Px(60.0),
                flex_direction: FlexDirection::Row,
                justify_content: JustifyContent::SpaceBetween,
                align_items: AlignItems::Center,
                padding: UiRect::all(Val::Px(10.0)),
                ..default()
            },
            BackgroundColor(Color::srgb(0.2, 0.2, 0.3)),
        )).with_children(|nav| {
            nav.spawn(Text::new("应用标题"));

            nav.spawn((
                Button,
                Node {
                    width: Val::Px(80.0),
                    height: Val::Px(40.0),
                    justify_content: JustifyContent::Center,
                    align_items: AlignItems::Center,
                    ..default()
                },
                BackgroundColor(Color::srgb(0.6, 0.3, 0.3)),
            )).with_children(|btn| {
                btn.spawn(Text::new("菜单"));
            });
        });

        // 主内容区域
        parent.spawn((
            Node {
                width: Val::Percent(100.0),
                flex_grow: 1.0,
                flex_direction: FlexDirection::Row,
                ..default()
            },
        )).with_children(|content| {
            // 侧边栏
            content.spawn((
                Node {
                    width: Val::Px(200.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    padding: UiRect::all(Val::Px(10.0)),
                    ..default()
                },
                BackgroundColor(Color::srgb(0.15, 0.15, 0.2)),
            ));

            // 主内容
            content.spawn((
                Node {
                    flex_grow: 1.0,
                    height: Val::Percent(100.0),
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                BackgroundColor(Color::srgb(0.25, 0.25, 0.25)),
            ));
        });
    });
}
```

### 3.6 滚动容器

```rust
fn create_scrollable_content(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(300.0),
            height: Val::Px(200.0),
            flex_direction: FlexDirection::Column,
            overflow: Overflow::clip_y(),
            ..default()
        },
        BackgroundColor(Color::srgb(0.2, 0.2, 0.2)),
        ScrollPosition::default(),
    )).with_children(|parent| {
        for i in 0..20 {
            parent.spawn((
                Node {
                    width: Val::Percent(100.0),
                    height: Val::Px(30.0),
                    padding: UiRect::all(Val::Px(5.0)),
                    margin: UiRect::bottom(Val::Px(2.0)),
                    ..default()
                },
                BackgroundColor(Color::srgb(0.3, 0.3, 0.4)),
            )).with_children(|item| {
                item.spawn(Text::new(format!("项目 {}", i + 1)));
            });
        }
    });
}
```

### 3.7 渐变背景

```rust
use bevy_ui::gradients::*;

fn create_gradient_background(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(200.0),
            height: Val::Px(100.0),
            ..default()
        },
        BackgroundGradient::from(LinearGradient::new(
            Direction::Top,
            vec![
                ColorStop::new(Color::srgb(1.0, 0.0, 0.0), 0.0),
                ColorStop::new(Color::srgb(0.0, 0.0, 1.0), 1.0),
            ],
        )),
    ));
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与资源系统集成

Bevy UI 与 Bevy 的资源系统无缝集成，可以使用资源加载器加载字体、图片等资源：

```rust
fn load_ui_assets(mut commands: Commands, asset_server: Res<AssetServer>) {
    let font_handle = asset_server.load("fonts/FiraSans-Regular.ttf");
    let image_handle = asset_server.load("textures/ui_background.png");

    commands.spawn((
        Text::new("使用自定义字体"),
        TextFont {
            font: font_handle,
            font_size: 20.0,
            ..default()
        },
    ));

    commands.spawn((
        ImageNode::new(image_handle),
        Node {
            width: Val::Px(100.0),
            height: Val::Px(100.0),
            ..default()
        },
    ));
}
```

### 4.2 与输入系统集成

UI 系统自动处理鼠标和触摸输入，并更新 Interaction 组件：

```rust
fn handle_ui_input(
    mut query: Query<&Interaction, Changed<Interaction>>,
    mouse_input: Res<ButtonInput<MouseButton>>,
) {
    for interaction in &mut query {
        match *interaction {
            Interaction::Pressed => {
                if mouse_input.just_released(MouseButton::Left) {
                    println!("UI 元素被点击!");
                }
            }
            _ => {}
        }
    }
}
```

### 4.3 与摄像机系统集成

UI 可以指定渲染到特定的摄像机：

```rust
fn setup_ui_camera(mut commands: Commands) {
    // 创建 UI 摄像机
    let camera_entity = commands.spawn((
        Camera2d,
        UiPickingCamera::default(),
    )).id();

    // 指定 UI 元素使用特定摄像机
    commands.spawn((
        Node::default(),
        UiTargetCamera(camera_entity),
    ));
}
```

### 4.4 与动画系统集成

UI 属性可以通过 Bevy 的动画系统进行动画化：

```rust
use bevy_animation::*;

fn animate_ui_element(
    mut commands: Commands,
    mut query: Query<(Entity, &mut Node), With<AnimationTarget>>,
) {
    for (entity, mut node) in &mut query {
        // 创建动画剪辑
        let mut animation = AnimationClip::default();

        // 添加属性动画轨道
        animation.add_curve_to_path(
            EntityPath {
                parts: vec![entity.into()],
            },
            VariableCurve {
                keyframes: vec![
                    Keyframe {
                        timestamp: 0.0,
                        value: node.width,
                    },
                    Keyframe {
                        timestamp: 1.0,
                        value: Val::Px(200.0),
                    },
                ],
            },
        );

        commands.entity(entity).insert(AnimationTarget::default());
    }
}
```

### 4.5 与状态管理集成

UI 可以与 Bevy 的状态系统结合使用：

```rust
#[derive(States, Default, Debug, Clone, PartialEq, Eq, Hash)]
enum GameState {
    #[default]
    Menu,
    Playing,
    Paused,
}

fn setup_menu_ui(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        StateScoped(GameState::Menu), // 只在菜单状态显示
    ));
}

fn transition_state(
    mut next_state: ResMut<NextState<GameState>>,
    query: Query<&Interaction, (Changed<Interaction>, With<Button>)>,
) {
    for interaction in &query {
        if *interaction == Interaction::Pressed {
            next_state.set(GameState::Playing);
        }
    }
}
```

## 5. 常见使用场景

### 5.1 游戏主菜单

```rust
fn create_main_menu(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.8)),
    )).with_children(|parent| {
        // 游戏标题
        parent.spawn((
            Text::new("我的游戏"),
            Node {
                margin: UiRect::bottom(Val::Px(50.0)),
                ..default()
            },
            TextFont {
                font: asset_server.load("fonts/title.ttf"),
                font_size: 48.0,
                ..default()
            },
            TextColor(Color::srgb(1.0, 1.0, 1.0)),
        ));

        // 菜单按钮
        let button_style = Node {
            width: Val::Px(200.0),
            height: Val::Px(50.0),
            margin: UiRect::all(Val::Px(10.0)),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        };

        parent.spawn((
            Button,
            button_style.clone(),
            BackgroundColor(Color::srgb(0.2, 0.6, 0.2)),
            MenuAction::StartGame,
        )).with_children(|btn| {
            btn.spawn(Text::new("开始游戏"));
        });

        parent.spawn((
            Button,
            button_style.clone(),
            BackgroundColor(Color::srgb(0.6, 0.6, 0.2)),
            MenuAction::Settings,
        )).with_children(|btn| {
            btn.spawn(Text::new("设置"));
        });

        parent.spawn((
            Button,
            button_style,
            BackgroundColor(Color::srgb(0.6, 0.2, 0.2)),
            MenuAction::Quit,
        )).with_children(|btn| {
            btn.spawn(Text::new("退出游戏"));
        });
    });
}

#[derive(Component)]
enum MenuAction {
    StartGame,
    Settings,
    Quit,
}
```

### 5.2 游戏内 HUD

```rust
fn create_game_hud(mut commands: Commands) {
    // HUD 根容器
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::SpaceBetween,
            ..default()
        },
        PickingBehavior::IGNORE, // 不阻止游戏交互
    )).with_children(|parent| {
        // 顶部信息栏
        parent.spawn((
            Node {
                width: Val::Percent(100.0),
                height: Val::Px(60.0),
                flex_direction: FlexDirection::Row,
                justify_content: JustifyContent::SpaceBetween,
                align_items: AlignItems::Center,
                padding: UiRect::all(Val::Px(20.0)),
                ..default()
            },
            BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.5)),
        )).with_children(|top_bar| {
            // 生命值
            top_bar.spawn((
                Text::new("生命值: 100"),
                HealthDisplay,
                TextColor(Color::srgb(0.8, 0.2, 0.2)),
            ));

            // 分数
            top_bar.spawn((
                Text::new("分数: 0"),
                ScoreDisplay,
                TextColor(Color::srgb(1.0, 1.0, 0.0)),
            ));
        });

        // 底部控制按钮
        parent.spawn((
            Node {
                width: Val::Percent(100.0),
                height: Val::Px(80.0),
                flex_direction: FlexDirection::Row,
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
        )).with_children(|bottom_bar| {
            bottom_bar.spawn((
                Button,
                Node {
                    width: Val::Px(60.0),
                    height: Val::Px(60.0),
                    border_radius: BorderRadius::all(Val::Px(30.0)),
                    justify_content: JustifyContent::Center,
                    align_items: AlignItems::Center,
                    ..default()
                },
                BackgroundColor(Color::srgba(1.0, 1.0, 1.0, 0.2)),
                GameAction::Pause,
            )).with_children(|btn| {
                btn.spawn(Text::new("⏸"));
            });
        });
    });
}

#[derive(Component)]
struct HealthDisplay;

#[derive(Component)]
struct ScoreDisplay;

#[derive(Component)]
enum GameAction {
    Pause,
}
```

### 5.3 设置界面

```rust
fn create_settings_ui(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.9)),
    )).with_children(|parent| {
        // 设置面板
        parent.spawn((
            Node {
                width: Val::Px(400.0),
                height: Val::Px(500.0),
                flex_direction: FlexDirection::Column,
                padding: UiRect::all(Val::Px(20.0)),
                ..default()
            },
            BackgroundColor(Color::srgb(0.2, 0.2, 0.2)),
            BorderRadius::all(Val::Px(10.0)),
        )).with_children(|panel| {
            // 标题
            panel.spawn((
                Text::new("设置"),
                Node {
                    margin: UiRect::bottom(Val::Px(30.0)),
                    ..default()
                },
                TextFont {
                    font_size: 32.0,
                    ..default()
                },
                TextColor(Color::srgb(1.0, 1.0, 1.0)),
            ));

            // 音量设置
            create_setting_item(panel, "主音量", 0.8);
            create_setting_item(panel, "音效音量", 0.6);
            create_setting_item(panel, "音乐音量", 0.7);

            // 返回按钮
            panel.spawn((
                Button,
                Node {
                    width: Val::Percent(100.0),
                    height: Val::Px(50.0),
                    margin: UiRect::top(Val::Px(30.0)),
                    justify_content: JustifyContent::Center,
                    align_items: AlignItems::Center,
                    ..default()
                },
                BackgroundColor(Color::srgb(0.4, 0.4, 0.6)),
                SettingsAction::Back,
            )).with_children(|btn| {
                btn.spawn(Text::new("返回"));
            });
        });
    });
}

fn create_setting_item(parent: &mut ChildBuilder, label: &str, value: f32) {
    parent.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Px(40.0),
            flex_direction: FlexDirection::Row,
            justify_content: JustifyContent::SpaceBetween,
            align_items: AlignItems::Center,
            margin: UiRect::bottom(Val::Px(15.0)),
            ..default()
        },
    )).with_children(|item| {
        item.spawn((
            Text::new(label),
            TextColor(Color::srgb(0.9, 0.9, 0.9)),
        ));

        // 简单的滑块（实际实现会更复杂）
        item.spawn((
            Node {
                width: Val::Px(150.0),
                height: Val::Px(20.0),
                ..default()
            },
            BackgroundColor(Color::srgb(0.3, 0.3, 0.3)),
        )).with_children(|slider| {
            slider.spawn((
                Node {
                    width: Val::Percent(value * 100.0),
                    height: Val::Percent(100.0),
                    ..default()
                },
                BackgroundColor(Color::srgb(0.2, 0.6, 0.9)),
            ));
        });
    });
}

#[derive(Component)]
enum SettingsAction {
    Back,
}
```

### 5.4 对话框系统

```rust
fn create_dialog_system(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.7)),
        DialogOverlay,
    )).with_children(|parent| {
        parent.spawn((
            Node {
                width: Val::Px(600.0),
                max_height: Val::Px(400.0),
                flex_direction: FlexDirection::Column,
                padding: UiRect::all(Val::Px(30.0)),
                ..default()
            },
            BackgroundColor(Color::srgb(0.9, 0.9, 0.9)),
            BorderRadius::all(Val::Px(15.0)),
            BoxShadow::from([ShadowStyle {
                color: Color::srgba(0.0, 0.0, 0.0, 0.5),
                x_offset: Val::Px(0.0),
                y_offset: Val::Px(10.0),
                blur_radius: Val::Px(20.0),
                spread_radius: Val::Px(0.0),
            }]),
        )).with_children(|dialog| {
            // 对话框标题
            dialog.spawn((
                Text::new("确认操作"),
                Node {
                    margin: UiRect::bottom(Val::Px(20.0)),
                    ..default()
                },
                TextFont {
                    font_size: 24.0,
                    ..default()
                },
                TextColor(Color::srgb(0.2, 0.2, 0.2)),
            ));

            // 对话框内容
            dialog.spawn((
                Text::new("您确定要执行此操作吗？此操作无法撤销。"),
                Node {
                    margin: UiRect::bottom(Val::Px(30.0)),
                    flex_grow: 1.0,
                    ..default()
                },
                TextColor(Color::srgb(0.4, 0.4, 0.4)),
            ));

            // 按钮组
            dialog.spawn((
                Node {
                    width: Val::Percent(100.0),
                    flex_direction: FlexDirection::Row,
                    justify_content: JustifyContent::FlexEnd,
                    column_gap: Val::Px(10.0),
                    ..default()
                },
            )).with_children(|buttons| {
                buttons.spawn((
                    Button,
                    Node {
                        width: Val::Px(80.0),
                        height: Val::Px(40.0),
                        justify_content: JustifyContent::Center,
                        align_items: AlignItems::Center,
                        ..default()
                    },
                    BackgroundColor(Color::srgb(0.7, 0.7, 0.7)),
                    BorderRadius::all(Val::Px(5.0)),
                    DialogAction::Cancel,
                )).with_children(|btn| {
                    btn.spawn((
                        Text::new("取消"),
                        TextColor(Color::srgb(0.3, 0.3, 0.3)),
                    ));
                });

                buttons.spawn((
                    Button,
                    Node {
                        width: Val::Px(80.0),
                        height: Val::Px(40.0),
                        justify_content: JustifyContent::Center,
                        align_items: AlignItems::Center,
                        ..default()
                    },
                    BackgroundColor(Color::srgb(0.8, 0.2, 0.2)),
                    BorderRadius::all(Val::Px(5.0)),
                    DialogAction::Confirm,
                )).with_children(|btn| {
                    btn.spawn((
                        Text::new("确认"),
                        TextColor(Color::srgb(1.0, 1.0, 1.0)),
                    ));
                });
            });
        });
    });
}

#[derive(Component)]
struct DialogOverlay;

#[derive(Component)]
enum DialogAction {
    Confirm,
    Cancel,
}
```

### 5.5 响应式布局

```rust
fn create_responsive_layout(mut commands: Commands, window_query: Query<&Window>) {
    let window = window_query.single();
    let is_mobile = window.width() < 768.0;

    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: if is_mobile {
                FlexDirection::Column
            } else {
                FlexDirection::Row
            },
            ..default()
        },
    )).with_children(|parent| {
        // 侧边栏/顶部栏
        parent.spawn((
            Node {
                width: if is_mobile { Val::Percent(100.0) } else { Val::Px(250.0) },
                height: if is_mobile { Val::Px(60.0) } else { Val::Percent(100.0) },
                flex_direction: if is_mobile {
                    FlexDirection::Row
                } else {
                    FlexDirection::Column
                },
                ..default()
            },
            BackgroundColor(Color::srgb(0.2, 0.2, 0.3)),
        ));

        // 主内容区
        parent.spawn((
            Node {
                flex_grow: 1.0,
                height: if is_mobile {
                    Val::Auto
                } else {
                    Val::Percent(100.0)
                },
                padding: UiRect::all(if is_mobile {
                    Val::Px(10.0)
                } else {
                    Val::Px(20.0)
                }),
                ..default()
            },
            BackgroundColor(Color::srgb(0.25, 0.25, 0.25)),
        ));
    });
}
```

## 6. 性能优化建议

### 6.1 减少 UI 更新频率

```rust
// 使用变更检测避免不必要的更新
fn update_health_display(
    mut health_query: Query<&mut Text, With<HealthDisplay>>,
    player_query: Query<&Health, (With<Player>, Changed<Health>)>,
) {
    if let Ok(health) = player_query.get_single() {
        for mut text in &mut health_query {
            **text = format!("生命值: {}", health.current);
        }
    }
}
```

### 6.2 合理使用层级

```rust
// 避免过深的 UI 层级
fn efficient_ui_structure(mut commands: Commands) {
    // 好的做法：扁平化结构
    commands.spawn((
        Node {
            position_type: PositionType::Absolute,
            top: Val::Px(10.0),
            left: Val::Px(10.0),
            ..default()
        },
        Text::new("直接定位"),
    ));

    // 避免：过多嵌套容器
    // commands.spawn(container1).with_children(|p1| {
    //     p1.spawn(container2).with_children(|p2| {
    //         p2.spawn(container3).with_children(|p3| {
    //             p3.spawn(actual_content);
    //         });
    //     });
    // });
}
```

### 6.3 条件渲染

```rust
fn conditional_ui_rendering(
    mut commands: Commands,
    ui_entities: Query<Entity, With<ConditionalUI>>,
    game_state: Res<State<GameState>>,
) {
    match game_state.get() {
        GameState::Menu => {
            // 只在需要时创建 UI
            if ui_entities.is_empty() {
                commands.spawn((
                    Node::default(),
                    ConditionalUI,
                ));
            }
        }
        _ => {
            // 不需要时移除 UI
            for entity in &ui_entities {
                commands.entity(entity).despawn_recursive();
            }
        }
    }
}

#[derive(Component)]
struct ConditionalUI;
```

## 7. 最佳实践

### 7.1 组件组织

```rust
// 将相关的 UI 组件组合成束
#[derive(Bundle)]
struct ButtonBundle {
    button: Button,
    node: Node,
    background_color: BackgroundColor,
    border_radius: BorderRadius,
    interaction: Interaction,
    focus_policy: FocusPolicy,
}

impl Default for ButtonBundle {
    fn default() -> Self {
        Self {
            button: Button,
            node: Node {
                width: Val::Px(150.0),
                height: Val::Px(40.0),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
            background_color: BackgroundColor(Color::srgb(0.3, 0.6, 0.9)),
            border_radius: BorderRadius::all(Val::Px(5.0)),
            interaction: Interaction::default(),
            focus_policy: FocusPolicy::Block,
        }
    }
}
```

### 7.2 事件驱动设计

```rust
#[derive(Event)]
struct UIEvent {
    action: UIAction,
    entity: Entity,
}

#[derive(Debug)]
enum UIAction {
    ButtonClicked,
    ValueChanged(f32),
    DialogClosed,
}

fn ui_event_handler(
    mut ui_events: EventWriter<UIEvent>,
    mut interaction_query: Query<(Entity, &Interaction), Changed<Interaction>>,
) {
    for (entity, interaction) in &mut interaction_query {
        if *interaction == Interaction::Pressed {
            ui_events.send(UIEvent {
                action: UIAction::ButtonClicked,
                entity,
            });
        }
    }
}
```

### 7.3 样式复用

```rust
// 定义通用样式
pub struct UIStyles {
    pub button_primary: ButtonBundle,
    pub button_secondary: ButtonBundle,
    pub text_heading: (TextFont, TextColor),
    pub text_body: (TextFont, TextColor),
}

impl UIStyles {
    pub fn new(asset_server: &AssetServer) -> Self {
        let font_bold = asset_server.load("fonts/FiraSans-Bold.ttf");
        let font_regular = asset_server.load("fonts/FiraSans-Regular.ttf");

        Self {
            button_primary: ButtonBundle {
                background_color: BackgroundColor(Color::srgb(0.2, 0.6, 0.9)),
                ..default()
            },
            button_secondary: ButtonBundle {
                background_color: BackgroundColor(Color::srgb(0.6, 0.6, 0.6)),
                ..default()
            },
            text_heading: (
                TextFont {
                    font: font_bold,
                    font_size: 24.0,
                    ..default()
                },
                TextColor(Color::srgb(0.9, 0.9, 0.9)),
            ),
            text_body: (
                TextFont {
                    font: font_regular,
                    font_size: 16.0,
                    ..default()
                },
                TextColor(Color::srgb(0.7, 0.7, 0.7)),
            ),
        }
    }
}

// 使用样式
fn create_styled_ui(mut commands: Commands, styles: Res<UIStyles>) {
    commands.spawn((
        styles.button_primary.clone(),
        SomeAction::Primary,
    ));
}
```

这份文档涵盖了 Bevy UI 系统的核心概念、API 使用、集成方式和常见使用场景。通过这些示例和最佳实践，你可以构建出功能丰富、性能良好的游戏用户界面。