# Bevy A11Y (无障碍访问) 模块文档

## 1. 模块概述和主要功能

`bevy_a11y` 是 Bevy 引擎的无障碍访问集成模块，为游戏和应用程序提供可访问性支持。该模块主要集成了 `AccessKit`（一个提供跨平台无障碍原语的 Rust crate）与 Bevy 的 ECS 系统。

### 主要功能特性

- **跨平台无障碍支持**：通过 AccessKit 提供与操作系统无关的无障碍功能
- **ECS 集成**：与 Bevy 的实体组件系统深度集成
- **UI 元素描述**：支持按钮、复选框、文本框等常见 UI 概念的无障碍描述
- **动态请求管理**：可以动态启用或禁用无障碍功能
- **事件驱动**：支持无障碍操作请求的事件处理

### 设计理念

该模块本身不直接提供无障碍功能的实现，而是作为协调工具，帮助其他接口统一无障碍访问方式。二进制应用开发者应添加 `AccessibilityPlugin`，而库维护者可以使用 `AccessibilityRequested` 和 `ManageAccessibilityUpdates` 资源。

## 2. 核心结构体和枚举

### 2.1 AccessibilityNode

```rust
#[derive(Component, Clone, Deref, DerefMut)]
pub struct AccessibilityNode(pub Node);
```

**功能描述**：
- 将 Bevy 实体表示为 AccessKit 节点的组件
- 作为"Bevy 实体"与"平台无关的无障碍元素"之间的转换桥梁
- 支持在 AccessKit 无障碍树中形成层次结构

**组织方式**：
- **父子关系**：如果实体及其父实体都有 `AccessibilityNode` 组件，则在 AccessKit 树中维持父子关系
- **窗口直接子级**：如果实体没有父实体或父实体没有 `AccessibilityNode`，则成为主窗口的直接子级

### 2.2 AccessibilityRequested

```rust
#[derive(Resource, Default, Clone, Debug, Deref, DerefMut)]
pub struct AccessibilityRequested(Arc<AtomicBool>);
```

**功能描述**：
- 跟踪是否有辅助技术请求了无障碍信息
- 作为资源存在于整个 Bevy 应用中
- 默认值为 `false`，表示尚未有任何请求

**主要方法**：
- `get() -> bool`：检查是否有辅助技术请求了无障碍信息
- `set(value: bool)`：设置应用是否应提供无障碍更新

### 2.3 ManageAccessibilityUpdates

```rust
#[derive(Resource, Clone, Debug, Deref, DerefMut)]
pub struct ManageAccessibilityUpdates(bool);
```

**功能描述**：
- 决定 Bevy 的 ECS 是否更新无障碍树
- 告诉 Bevy 内部是否应处理 AccessKit 更新
- 默认值为 `true`，即 Bevy 默认管理 AccessKit 树

**使用场景**：
- 当外部 GUI 库发送无障碍更新时，设置为 `false`
- 避免 ECS 和外部库产生冲突的更新

### 2.4 ActionRequest

```rust
#[derive(Message, Deref, DerefMut)]
pub struct ActionRequest(pub accesskit::ActionRequest);
```

**功能描述**：
- `accesskit::ActionRequest` 的包装结构体
- 允许将 `ActionRequest` 作为 Bevy 事件使用

### 2.5 AccessibilitySystems

```rust
pub enum AccessibilitySystems {
    Update,
}
```

**功能描述**：
- 与无障碍相关的系统集合
- 帮助统一运行无障碍更新

### 2.6 AccessibilityPlugin

```rust
#[derive(Default)]
pub struct AccessibilityPlugin;
```

**功能描述**：
- 管理与无障碍 API 集成的插件
- 初始化必要的资源并配置默认值

## 3. 主要 API 使用示例

### 3.1 基础设置

```rust
use bevy::prelude::*;
use bevy_a11y::{AccessibilityPlugin, AccessibilityNode};
use accesskit::{Node, Role};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(AccessibilityPlugin)  // 添加无障碍插件
        .add_systems(Startup, setup_ui)
        .run();
}

fn setup_ui(mut commands: Commands) {
    // 创建一个按钮实体并添加无障碍节点
    commands.spawn((
        // UI 组件
        ButtonBundle {
            style: Style {
                width: Val::Px(200.0),
                height: Val::Px(50.0),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
            background_color: Color::rgb(0.15, 0.15, 0.15).into(),
            ..default()
        },
        // 无障碍节点
        AccessibilityNode::from({
            let mut node = Node::new(Role::Button);
            node.set_label("点击我".into());
            node
        }),
    ));
}
```

### 3.2 动态更新无障碍节点

```rust
use bevy::prelude::*;
use bevy_a11y::AccessibilityNode;
use accesskit::Role;

fn update_button_accessibility(
    mut query: Query<&mut AccessibilityNode, With<Button>>,
    // 其他查询参数...
) {
    for mut accessibility_node in query.iter_mut() {
        // 更新角色
        accessibility_node.set_role(Role::Button);

        // 更新标签
        accessibility_node.set_label("新的按钮标签".into());

        // 设置描述
        accessibility_node.set_description("这是一个重要的按钮".into());

        // 设置状态
        accessibility_node.set_disabled(false);
    }
}
```

### 3.3 处理无障碍动作请求

```rust
use bevy::prelude::*;
use bevy_a11y::ActionRequest;

fn handle_accessibility_actions(
    mut action_events: MessageReader<ActionRequest>,
) {
    for action in action_events.read() {
        match action.action {
            accesskit::Action::Click => {
                println!("收到点击动作，目标节点: {:?}", action.target);
                // 处理点击逻辑
            }
            accesskit::Action::SetValue => {
                println!("收到设置值动作: {:?}", action.data);
                // 处理设置值逻辑
            }
            _ => {}
        }
    }
}
```

### 3.4 条件性启用无障碍功能

```rust
use bevy::prelude::*;
use bevy_a11y::{AccessibilityRequested, ManageAccessibilityUpdates};

fn conditional_accessibility_system(
    accessibility_requested: Res<AccessibilityRequested>,
    manage_updates: Res<ManageAccessibilityUpdates>,
) {
    // 仅在请求无障碍且 Bevy 管理更新时执行
    if accessibility_requested.get() && manage_updates.get() {
        // 执行无障碍相关更新
        println!("执行无障碍更新");
    }
}

fn toggle_accessibility_management(
    mut manage_updates: ResMut<ManageAccessibilityUpdates>,
    keyboard: Res<Input<KeyCode>>,
) {
    if keyboard.just_pressed(KeyCode::F12) {
        // 切换 Bevy 是否管理无障碍更新
        let current = manage_updates.get();
        manage_updates.set(!current);
        println!("无障碍管理状态: {}", !current);
    }
}
```

### 3.5 复杂 UI 元素的无障碍支持

```rust
use bevy::prelude::*;
use bevy_a11y::AccessibilityNode;
use accesskit::{Node, Role, Property};

fn setup_complex_ui(mut commands: Commands) {
    // 创建一个复选框
    commands.spawn((
        // UI 组件
        CheckboxBundle::default(),
        // 无障碍节点
        AccessibilityNode::from({
            let mut node = Node::new(Role::CheckBox);
            node.set_label("启用通知".into());
            node.set_checked(Some(false));
            node
        }),
    ));

    // 创建一个滑块
    commands.spawn((
        SliderBundle::default(),
        AccessibilityNode::from({
            let mut node = Node::new(Role::Slider);
            node.set_label("音量".into());
            node.set_numeric_value(Some(50.0));
            node.set_min_numeric_value(Some(0.0));
            node.set_max_numeric_value(Some(100.0));
            node
        }),
    ));

    // 创建一个文本输入框
    commands.spawn((
        TextInputBundle::default(),
        AccessibilityNode::from({
            let mut node = Node::new(Role::TextInput);
            node.set_label("用户名".into());
            node.set_placeholder("请输入您的用户名".into());
            node
        }),
    ));
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与 bevy_ui 的集成

`bevy_a11y` 与 `bevy_ui` 模块紧密集成，自动为 UI 组件提供无障碍支持：

```rust
// bevy_ui 中的自动集成示例
fn button_changed(
    mut commands: Commands,
    mut query: Query<(Entity, Option<&mut AccessibilityNode>), Changed<Button>>,
    ui_children: UiChildren,
    mut text_reader: TextUiReader,
) {
    for (entity, accessible) in &mut query {
        // 自动计算按钮的标签
        let label = calc_label(&mut text_reader, ui_children.iter_ui_children(entity));

        if let Some(mut accessible) = accessible {
            // 更新现有无障碍节点
            accessible.set_role(Role::Button);
            if let Some(name) = label {
                accessible.set_label(name);
            }
        } else {
            // 自动创建无障碍节点
            let mut node = Node::new(Role::Button);
            if let Some(label) = label {
                node.set_label(label);
            }
            commands.entity(entity).try_insert(AccessibilityNode::from(node));
        }
    }
}
```

### 4.2 与 bevy_winit 的集成

`bevy_winit` 模块提供了与平台窗口系统的集成：

```rust
// 在 bevy_winit 中的集成
use bevy_a11y::{AccessibilityRequested, AccessibilitySystems};

pub struct AccessKitPlugin;

impl Plugin for AccessKitPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<WinitActionRequestHandlers>()
            .add_message::<ActionRequestWrapper>()
            .add_systems(
                PostUpdate,
                (
                    poll_receivers,
                    update_accessibility_nodes.run_if(should_update_accessibility_nodes),
                    window_closed,
                )
                .in_set(AccessibilitySystems::Update),
            );
    }
}
```

### 4.3 与自定义插件的集成

```rust
use bevy::prelude::*;
use bevy_a11y::{AccessibilityRequested, ManageAccessibilityUpdates, AccessibilityNode};

pub struct MyAccessibilityPlugin;

impl Plugin for MyAccessibilityPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            Update,
            my_accessibility_system.run_if(
                |accessibility_requested: Res<AccessibilityRequested>,
                 manage_updates: Res<ManageAccessibilityUpdates>| {
                    accessibility_requested.get() && manage_updates.get()
                }
            ),
        );
    }
}

fn my_accessibility_system(
    // 您的自定义系统逻辑
) {
    // 仅在需要无障碍支持时运行
}
```

## 5. 常见使用场景

### 5.1 游戏 UI 无障碍化

为游戏菜单、HUD 元素和交互界面添加无障碍支持：

```rust
fn setup_game_menu(mut commands: Commands) {
    // 主菜单
    commands.spawn((
        MenuBundle::default(),
        AccessibilityNode::from({
            let mut node = Node::new(Role::Menu);
            node.set_label("主菜单".into());
            node
        }),
    )).with_children(|parent| {
        // 开始游戏按钮
        parent.spawn((
            ButtonBundle::default(),
            AccessibilityNode::from({
                let mut node = Node::new(Role::MenuItem);
                node.set_label("开始游戏".into());
                node
            }),
        ));

        // 设置按钮
        parent.spawn((
            ButtonBundle::default(),
            AccessibilityNode::from({
                let mut node = Node::new(Role::MenuItem);
                node.set_label("设置".into());
                node
            }),
        ));
    });
}
```

### 5.2 表单和输入控件

为复杂表单提供完整的无障碍支持：

```rust
fn setup_settings_form(mut commands: Commands) {
    commands.spawn((
        FormBundle::default(),
        AccessibilityNode::from({
            let mut node = Node::new(Role::Form);
            node.set_label("游戏设置".into());
            node
        }),
    )).with_children(|parent| {
        // 音量滑块
        parent.spawn((
            SliderBundle::default(),
            VolumeSlider,
            AccessibilityNode::from({
                let mut node = Node::new(Role::Slider);
                node.set_label("主音量".into());
                node.set_numeric_value(Some(75.0));
                node.set_min_numeric_value(Some(0.0));
                node.set_max_numeric_value(Some(100.0));
                node
            }),
        ));

        // 全屏复选框
        parent.spawn((
            CheckboxBundle::default(),
            FullscreenToggle,
            AccessibilityNode::from({
                let mut node = Node::new(Role::CheckBox);
                node.set_label("全屏模式".into());
                node.set_checked(Some(true));
                node
            }),
        ));
    });
}

// 更新滑块值的系统
fn update_volume_slider(
    mut query: Query<(&mut AccessibilityNode, &VolumeSlider), Changed<VolumeSlider>>,
) {
    for (mut accessibility_node, slider) in query.iter_mut() {
        accessibility_node.set_numeric_value(Some(slider.value));
    }
}
```

### 5.3 动态内容更新

为动态变化的内容提供无障碍支持：

```rust
#[derive(Component)]
struct GameScore(u32);

#[derive(Component)]
struct HealthBar(f32);

fn update_dynamic_accessibility(
    mut score_query: Query<(&mut AccessibilityNode, &GameScore), Changed<GameScore>>,
    mut health_query: Query<(&mut AccessibilityNode, &HealthBar), (Changed<HealthBar>, Without<GameScore>)>,
) {
    // 更新分数显示
    for (mut accessibility_node, score) in score_query.iter_mut() {
        accessibility_node.set_value(format!("当前分数: {}", score.0).into());
        accessibility_node.set_role(Role::Status);
    }

    // 更新生命值显示
    for (mut accessibility_node, health) in health_query.iter_mut() {
        accessibility_node.set_value(format!("生命值: {}%", (health.0 * 100.0) as u32).into());
        accessibility_node.set_role(Role::ProgressIndicator);
        accessibility_node.set_numeric_value(Some(health.0 as f64));
        accessibility_node.set_min_numeric_value(Some(0.0));
        accessibility_node.set_max_numeric_value(Some(1.0));
    }
}
```

### 5.4 外部库集成

当使用外部 GUI 库时，正确配置无障碍管理：

```rust
use bevy::prelude::*;
use bevy_a11y::{AccessibilityPlugin, ManageAccessibilityUpdates};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(AccessibilityPlugin)
        .add_systems(Startup, setup_external_gui)
        .run();
}

fn setup_external_gui(
    mut manage_updates: ResMut<ManageAccessibilityUpdates>,
) {
    // 如果使用外部 GUI 库处理无障碍，禁用 Bevy 的管理
    if using_external_gui_library() {
        manage_updates.set(false);
        println!("已禁用 Bevy 无障碍管理，外部库将接管");
    }
}

fn using_external_gui_library() -> bool {
    // 检查是否使用外部 GUI 库的逻辑
    false
}
```

### 5.5 调试和测试

添加调试功能来监控无障碍状态：

```rust
fn accessibility_debug_system(
    accessibility_requested: Res<AccessibilityRequested>,
    manage_updates: Res<ManageAccessibilityUpdates>,
    query: Query<(Entity, &AccessibilityNode)>,
    keyboard: Res<Input<KeyCode>>,
) {
    if keyboard.just_pressed(KeyCode::F11) {
        println!("=== 无障碍调试信息 ===");
        println!("请求状态: {}", accessibility_requested.get());
        println!("管理更新: {}", manage_updates.get());
        println!("无障碍节点数量: {}", query.iter().count());

        for (entity, node) in query.iter() {
            println!("实体 {:?}: 角色 {:?}", entity, node.role());
        }
    }
}
```

## 注意事项

1. **版本兼容性**：从 Bevy 0.15 开始，`accesskit` crate 不再从 `bevy_a11y` 重新导出。如需使用 AccessKit 类型，需要在项目的 `Cargo.toml` 中单独添加依赖。

2. **性能考虑**：无障碍更新仅在有辅助技术请求时才执行，避免不必要的性能开销。

3. **层次结构**：确保正确设置 AccessKit 树的父子关系，避免意外的扁平结构。

4. **外部库集成**：使用外部 GUI 库时，记得设置 `ManageAccessibilityUpdates` 为 `false` 以避免冲突。

这份文档涵盖了 `bevy_a11y` 模块的主要功能和使用方法，可以帮助开发者为 Bevy 应用程序添加完整的无障碍支持。