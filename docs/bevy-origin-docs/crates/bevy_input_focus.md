# Bevy Input Focus 模块详细使用指南

## 模块概述

`bevy_input_focus` 是 Bevy 引擎中专门用于管理用户界面输入焦点的系统性模块。这个模块提供了一套完整的焦点管理框架，支持键盘导航、方向导航以及自动焦点管理等功能。

### 主要功能特点

- **输入焦点管理**: 追踪当前具有输入焦点的实体
- **事件分发**: 将输入事件分发到聚焦的实体或主窗口
- **Tab 导航**: 基于 HTML 规范的线性 Tab 键导航
- **方向导航**: 基于方位的实体间导航（上下左右等8个方向）
- **自动焦点**: 组件级别的自动焦点获取
- **焦点可见性**: 控制焦点指示器的显示状态

## 核心结构体和枚举

### 1. InputFocus 资源

```rust
#[derive(Clone, Debug, Default, Resource)]
pub struct InputFocus(pub Option<Entity>);
```

**功能**: 跟踪当前拥有输入焦点的实体的核心资源。

**主要方法**:
- `set(entity: Entity)`: 设置焦点到指定实体
- `get() -> Option<Entity>`: 获取当前焦点实体
- `clear()`: 清除焦点
- `from_entity(entity: Entity) -> Self`: 创建包含指定实体的焦点资源

### 2. InputFocusVisible 资源

```rust
#[derive(Clone, Debug, Resource, Default)]
pub struct InputFocusVisible(pub bool);
```

**功能**: 控制焦点指示器是否应该可见。在桌面/Web 环境中，通常在用户按下 Tab 键时设为 true，在用户点击时设为 false。

### 3. FocusedInput 事件

```rust
#[derive(EntityEvent, Clone, Debug, Component)]
pub struct FocusedInput<M: Message + Clone> {
    pub focused_entity: Entity,
    pub input: M,
    window: Entity,
}
```

**功能**: 可冒泡的用户输入事件，从当前聚焦实体开始传播。

### 4. AutoFocus 组件

```rust
#[derive(Debug, Default, Component, Copy, Clone)]
pub struct AutoFocus;
```

**功能**: 标记组件，添加到实体后会自动获得输入焦点。适用于对话框、表单的第一个输入框或游戏菜单的第一个按钮。

### 5. Tab 导航相关组件

#### TabIndex 组件
```rust
#[derive(Debug, Default, Component, Copy, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct TabIndex(pub i32);
```

**功能**: 标识实体参与 Tab 导航的索引。
- `>= 0`: 可通过顺序导航到达，数值越小优先级越高
- `< 0`: 不能通过顺序导航到达，但可以直接选择

#### TabGroup 组件
```rust
#[derive(Debug, Default, Component, Copy, Clone)]
pub struct TabGroup {
    pub order: i32,
    pub modal: bool,
}
```

**功能**: 标记包含可 Tab 导航元素的实体树。
- `order`: 组的排序优先级
- `modal`: 是否为模态组（如对话框）

### 6. 方向导航相关

#### DirectionalNavigationMap 资源
```rust
#[derive(Resource, Debug, Default, Clone, PartialEq)]
pub struct DirectionalNavigationMap {
    pub neighbors: EntityHashMap<NavNeighbors>,
}
```

**功能**: 存储可聚焦实体的可遍历图，每个实体最多可有8个邻居（对应8个方位）。

#### NavNeighbors 结构
```rust
#[derive(Default, Debug, Clone, PartialEq)]
pub struct NavNeighbors {
    pub neighbors: [Option<Entity>; 8],
}
```

**功能**: 实体的最多8个邻居，对应每个 CompassOctant 方向。

## 主要 API 使用示例

### 1. 基础焦点管理

```rust
use bevy::prelude::*;
use bevy_input_focus::{InputFocus, InputDispatchPlugin};

fn setup_focus_system() -> App {
    let mut app = App::new();
    app.add_plugins(InputDispatchPlugin);
    app
}

// 设置焦点
fn set_focus_system(mut input_focus: ResMut<InputFocus>, query: Query<Entity>) {
    if let Ok(entity) = query.single() {
        input_focus.set(entity);
    }
}

// 清除焦点
fn clear_focus_system(mut input_focus: ResMut<InputFocus>) {
    input_focus.clear();
}

// 检查焦点状态
fn check_focus_system(input_focus: Res<InputFocus>) {
    if let Some(focused_entity) = input_focus.get() {
        println!("当前焦点在: {:?}", focused_entity);
    } else {
        println!("没有实体拥有焦点");
    }
}
```

### 2. 自动焦点使用

```rust
use bevy_input_focus::AutoFocus;

// 生成自动获得焦点的实体
fn spawn_autofocus_entity(mut commands: Commands) {
    commands.spawn((
        AutoFocus,
        // 其他组件...
    ));
}
```

### 3. Tab 导航设置

```rust
use bevy_input_focus::{
    TabNavigationPlugin, TabGroup, TabIndex, NavAction, TabNavigation
};

fn setup_tab_navigation(mut app: App) {
    app.add_plugins(TabNavigationPlugin);
}

// 创建 Tab 组和元素
fn create_tab_elements(mut commands: Commands) {
    // 创建 Tab 组
    let tab_group = commands.spawn(TabGroup::new(0)).id();

    // 创建可 Tab 的子元素
    commands.spawn((
        TabIndex(0),
        ChildOf(tab_group),
    ));

    commands.spawn((
        TabIndex(1),
        ChildOf(tab_group),
    ));

    // 创建模态 Tab 组（如对话框）
    let modal_group = commands.spawn(TabGroup::modal()).id();
}

// 手动导航
fn manual_tab_navigation(
    nav: TabNavigation,
    mut focus: ResMut<InputFocus>
) {
    match nav.navigate(&focus, NavAction::Next) {
        Ok(next_entity) => {
            focus.set(next_entity);
        },
        Err(e) => {
            eprintln!("导航失败: {}", e);
        }
    }
}
```

### 4. 方向导航设置

```rust
use bevy_input_focus::{
    DirectionalNavigationPlugin, DirectionalNavigationMap, DirectionalNavigation
};
use bevy_math::CompassOctant;

fn setup_directional_navigation(mut app: App) {
    app.add_plugins(DirectionalNavigationPlugin);
}

// 构建导航图
fn build_navigation_map(
    mut nav_map: ResMut<DirectionalNavigationMap>,
    query: Query<Entity>
) {
    let entities: Vec<Entity> = query.iter().collect();

    if entities.len() >= 3 {
        // 添加水平连接
        nav_map.add_edges(&entities, CompassOctant::East);

        // 添加循环连接
        nav_map.add_looping_edges(&entities, CompassOctant::South);

        // 添加单向连接
        nav_map.add_edge(entities[0], entities[2], CompassOctant::NorthEast);

        // 添加对称连接
        nav_map.add_symmetrical_edge(entities[0], entities[1], CompassOctant::North);
    }
}

// 方向导航
fn directional_navigate(mut nav: DirectionalNavigation) {
    match nav.navigate(CompassOctant::East) {
        Ok(new_focus) => {
            println!("导航到实体: {:?}", new_focus);
        },
        Err(e) => {
            eprintln!("方向导航失败: {}", e);
        }
    }
}
```

### 5. 焦点事件处理

```rust
use bevy_input_focus::{FocusedInput, IsFocused, IsFocusedHelper};
use bevy_input::keyboard::KeyboardInput;

// 处理聚焦的键盘输入
fn handle_focused_keyboard_input(
    mut event: On<FocusedInput<KeyboardInput>>,
    mut query: Query<&mut SomeComponent>
) {
    if let Ok(mut component) = query.get_mut(event.focused_entity) {
        // 处理键盘输入
        println!("实体 {:?} 收到键盘输入: {:?}",
                event.focused_entity, event.input);
    }
}

// 检查焦点状态
fn check_entity_focus(
    entity: Entity,
    focus_helper: IsFocusedHelper
) {
    if focus_helper.is_focused(entity) {
        println!("实体拥有焦点");
    }

    if focus_helper.is_focus_within(entity) {
        println!("实体或其子代拥有焦点");
    }

    if focus_helper.is_focus_visible(entity) {
        println!("实体拥有焦点且应显示焦点指示器");
    }
}
```

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_ui 集成

```rust
use bevy::prelude::*;
use bevy_input_focus::*;

fn setup_ui_with_focus(mut commands: Commands) {
    commands
        .spawn(NodeBundle {
            style: Style {
                width: Val::Percent(100.0),
                height: Val::Percent(100.0),
                flex_direction: FlexDirection::Column,
                ..default()
            },
            ..default()
        })
        .with_children(|parent| {
            // 第一个按钮自动获得焦点
            parent.spawn((
                ButtonBundle::default(),
                TabIndex(0),
                AutoFocus,
            ));

            // 第二个按钮
            parent.spawn((
                ButtonBundle::default(),
                TabIndex(1),
            ));
        })
        .insert(TabGroup::new(0));
}
```

### 2. 与输入系统集成

```rust
use bevy_input::{keyboard::KeyCode, ButtonInput};

fn custom_input_handler(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut focus: ResMut<InputFocus>,
    mut nav: DirectionalNavigation
) {
    // 方向键导航
    if keyboard.just_pressed(KeyCode::ArrowUp) {
        let _ = nav.navigate(CompassOctant::North);
    }
    if keyboard.just_pressed(KeyCode::ArrowDown) {
        let _ = nav.navigate(CompassOctant::South);
    }
    if keyboard.just_pressed(KeyCode::ArrowLeft) {
        let _ = nav.navigate(CompassOctant::West);
    }
    if keyboard.just_pressed(KeyCode::ArrowRight) {
        let _ = nav.navigate(CompassOctant::East);
    }

    // Escape 键清除焦点
    if keyboard.just_pressed(KeyCode::Escape) {
        focus.clear();
    }
}
```

### 3. 与场景系统集成

```rust
// 场景加载时设置焦点
fn setup_scene_focus(
    mut commands: Commands,
    scene_query: Query<Entity, Added<SceneInstance>>
) {
    for scene_entity in scene_query.iter() {
        // 为场景添加自动焦点
        commands.entity(scene_entity).insert(AutoFocus);
    }
}
```

## 常见使用场景

### 1. 游戏菜单系统

```rust
#[derive(Component)]
struct MenuItem {
    text: String,
    action: MenuAction,
}

#[derive(Clone)]
enum MenuAction {
    StartGame,
    Settings,
    Quit,
}

fn setup_main_menu(mut commands: Commands) {
    // 主菜单容器
    let menu_group = commands.spawn((
        TabGroup::new(0),
        NodeBundle {
            style: Style {
                flex_direction: FlexDirection::Column,
                align_items: AlignItems::Center,
                justify_content: JustifyContent::Center,
                ..default()
            },
            ..default()
        }
    )).id();

    // 菜单项
    let menu_items = [
        ("开始游戏", MenuAction::StartGame),
        ("设置", MenuAction::Settings),
        ("退出", MenuAction::Quit),
    ];

    for (i, (text, action)) in menu_items.iter().enumerate() {
        let entity = commands.spawn((
            ButtonBundle::default(),
            MenuItem {
                text: text.to_string(),
                action: action.clone(),
            },
            TabIndex(i as i32),
            ChildOf(menu_group),
        )).id();

        // 第一个菜单项自动获得焦点
        if i == 0 {
            commands.entity(entity).insert(AutoFocus);
        }
    }
}

// 处理菜单选择
fn handle_menu_selection(
    mut event: On<FocusedInput<KeyboardInput>>,
    menu_items: Query<&MenuItem>,
) {
    if event.input.key_code == KeyCode::Enter {
        if let Ok(item) = menu_items.get(event.focused_entity) {
            match item.action {
                MenuAction::StartGame => {
                    println!("开始游戏!");
                },
                MenuAction::Settings => {
                    println!("打开设置!");
                },
                MenuAction::Quit => {
                    println!("退出游戏!");
                },
            }
        }
    }
}
```

### 2. 表单输入系统

```rust
#[derive(Component)]
struct TextInput {
    placeholder: String,
    value: String,
}

fn setup_form(mut commands: Commands) {
    let form_group = commands.spawn((
        TabGroup::new(0),
        NodeBundle::default(),
    )).id();

    // 用户名输入框
    commands.spawn((
        NodeBundle::default(),
        TextInput {
            placeholder: "用户名".to_string(),
            value: String::new(),
        },
        TabIndex(0),
        AutoFocus, // 自动焦点到第一个输入框
        ChildOf(form_group),
    ));

    // 密码输入框
    commands.spawn((
        NodeBundle::default(),
        TextInput {
            placeholder: "密码".to_string(),
            value: String::new(),
        },
        TabIndex(1),
        ChildOf(form_group),
    ));

    // 提交按钮
    commands.spawn((
        ButtonBundle::default(),
        TabIndex(2),
        ChildOf(form_group),
    ));
}

fn handle_text_input(
    mut event: On<FocusedInput<KeyboardInput>>,
    mut inputs: Query<&mut TextInput>,
) {
    if let Ok(mut input) = inputs.get_mut(event.focused_entity) {
        // 处理文本输入
        if let Some(text) = &event.input.text {
            input.value.push_str(text);
        }
    }
}
```

### 3. 对话框系统

```rust
fn spawn_modal_dialog(mut commands: Commands) {
    // 模态对话框
    let dialog = commands.spawn((
        TabGroup::modal(), // 模态组，Tab 只在内部循环
        NodeBundle {
            style: Style {
                position_type: PositionType::Absolute,
                left: Val::Percent(25.0),
                top: Val::Percent(25.0),
                width: Val::Percent(50.0),
                height: Val::Percent(50.0),
                flex_direction: FlexDirection::Column,
                ..default()
            },
            background_color: Color::rgba(0.0, 0.0, 0.0, 0.8).into(),
            ..default()
        }
    )).id();

    // 确认按钮
    commands.spawn((
        ButtonBundle::default(),
        TabIndex(0),
        AutoFocus, // 对话框打开时自动获得焦点
        ChildOf(dialog),
    ));

    // 取消按钮
    commands.spawn((
        ButtonBundle::default(),
        TabIndex(1),
        ChildOf(dialog),
    ));
}
```

### 4. 游戏内 HUD 导航

```rust
fn setup_hud_navigation(
    mut nav_map: ResMut<DirectionalNavigationMap>,
    hud_elements: Query<Entity, With<HudElement>>,
) {
    let elements: Vec<Entity> = hud_elements.iter().collect();

    if elements.len() >= 4 {
        // 假设 HUD 元素是 2x2 网格布局
        let top_left = elements[0];
        let top_right = elements[1];
        let bottom_left = elements[2];
        let bottom_right = elements[3];

        // 水平连接
        nav_map.add_symmetrical_edge(top_left, top_right, CompassOctant::East);
        nav_map.add_symmetrical_edge(bottom_left, bottom_right, CompassOctant::East);

        // 垂直连接
        nav_map.add_symmetrical_edge(top_left, bottom_left, CompassOctant::South);
        nav_map.add_symmetrical_edge(top_right, bottom_right, CompassOctant::South);
    }
}
```

### 5. 自定义输入事件分发

```rust
// 自定义输入事件
#[derive(Clone, Debug)]
struct CustomInputEvent {
    action: String,
    data: Vec<u8>,
}

// 注册自定义事件分发
fn setup_custom_input_dispatch(mut app: App) {
    app.add_systems(
        PreUpdate,
        dispatch_focused_input::<CustomInputEvent>
            .in_set(InputFocusSystems::Dispatch),
    );
}

// 处理自定义输入事件
fn handle_custom_input(
    mut event: On<FocusedInput<CustomInputEvent>>,
    query: Query<&SomeComponent>,
) {
    println!("自定义输入事件: {}", event.input.action);
    // 处理自定义输入逻辑
}
```

## 高级使用技巧

### 1. 动态焦点管理

```rust
// 基于游戏状态动态设置焦点
fn dynamic_focus_management(
    game_state: Res<GameState>,
    mut focus: ResMut<InputFocus>,
    ui_query: Query<Entity, With<UIElement>>,
    game_query: Query<Entity, With<GameElement>>,
) {
    match game_state.current {
        State::Menu => {
            if let Ok(ui_entity) = ui_query.single() {
                focus.set(ui_entity);
            }
        },
        State::InGame => {
            if let Ok(game_entity) = game_query.single() {
                focus.set(game_entity);
            }
        },
        State::Paused => {
            focus.clear();
        },
    }
}
```

### 2. 条件性导航

```rust
// 基于实体状态的条件性导航
fn conditional_navigation(
    mut nav: DirectionalNavigation,
    entity_states: Query<&EntityState>,
) {
    if let Some(current_focus) = nav.focus.get() {
        if let Ok(state) = entity_states.get(current_focus) {
            if state.is_disabled {
                // 跳过禁用的实体
                let _ = nav.navigate(CompassOctant::East);
            }
        }
    }
}
```

### 3. 性能优化

```rust
// 批量更新导航图
fn batch_update_navigation_map(
    mut nav_map: ResMut<DirectionalNavigationMap>,
    removed_entities: RemovedComponents<Focusable>,
) {
    if !removed_entities.is_empty() {
        let to_remove: EntityHashSet = removed_entities.read().collect();
        nav_map.remove_multiple(to_remove);
    }
}
```

## 总结

`bevy_input_focus` 模块提供了一个强大而灵活的焦点管理系统，支持多种导航模式和使用场景。通过合理使用其 API，可以创建直观且易于访问的用户界面，提升用户体验。该模块的设计遵循了现代 Web 标准，同时也适应了游戏开发的特殊需求。

主要优势：
- **标准化**: 基于 HTML 规范的 Tab 导航
- **灵活性**: 支持多种导航模式
- **性能**: 高效的事件分发和导航图管理
- **扩展性**: 易于集成自定义输入事件和导航逻辑
- **可访问性**: 提供完整的焦点状态查询接口

建议在实际项目中根据具体需求选择合适的导航模式，并合理设计焦点层次结构以提供最佳的用户体验。