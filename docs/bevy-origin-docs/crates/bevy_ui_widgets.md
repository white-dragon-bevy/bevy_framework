# Bevy UI Widgets 模块详细文档

## 1. 模块概述和主要功能

`bevy_ui_widgets` 是 Bevy 引擎提供的一个无样式 UI 小部件库，提供了一系列标准的用户界面组件。该模块的设计哲学是提供功能完整但无内置样式的组件，让开发者可以根据游戏需求自由设计外观。

### 主要特点

- **无样式设计**: 所有小部件都没有内置样式，由用户负责添加合适的视觉样式
- **外部状态管理**: 大多数小部件使用外部状态管理机制，避免双向数据绑定
- **事件驱动**: 通过回调和事件系统处理用户交互
- **可访问性支持**: 内置无障碍访问支持
- **实验性质**: 当前版本仍在开发中，API 可能会发生变化

### 包含的小部件

1. **Button** - 按钮组件
2. **Checkbox** - 复选框组件
3. **RadioButton/RadioGroup** - 单选按钮和单选按钮组
4. **Slider** - 滑块组件
5. **Scrollbar** - 滚动条组件

## 2. 核心结构体和枚举说明

### 2.1 回调系统 (Callback)

```rust
pub enum Callback<I: SystemInput = ()> {
    System(SystemId<I>),  // 调用一次性系统
    Ignore,               // 忽略通知
}
```

**功能**: 定义小部件状态变化时的通知方式，支持点对点通信。

**用途**: 用于处理跨实体层次结构的通信，可以在实体创建之前预先创建回调。

### 2.2 事件类型

```rust
// 按钮或菜单项激活通知
pub struct Activate(pub Entity);

// 编辑标量值的小部件通知
pub struct ValueChange<T> {
    pub source: Entity,  // 产生值的小部件 ID
    pub value: T,        // 新值
}
```

### 2.3 按钮组件 (Button)

```rust
#[derive(Component, Default, Debug)]
pub struct Button {
    pub on_activate: Callback<In<Activate>>,
}
```

**功能**: 无头按钮小部件，维护"按下"状态，支持鼠标点击和键盘操作。

**状态**: 通过 `Pressed` 组件表示按下状态。

### 2.4 复选框组件 (Checkbox)

```rust
#[derive(Component, Debug, Default)]
pub struct Checkbox {
    pub on_change: Callback<In<ValueChange<bool>>>,
}
```

**功能**: 无头复选框实现，支持切换状态，可用于实现开关等组件。

**状态**: 通过 `Checked` 组件表示选中状态。

### 2.5 单选按钮组件

```rust
// 单选按钮组
#[derive(Component, Debug)]
pub struct RadioGroup {
    pub on_change: Callback<In<Activate>>,
}

// 单选按钮
#[derive(Component, Debug)]
pub struct RadioButton;
```

**功能**: 单选按钮组实现互斥选择逻辑，支持键盘导航。

### 2.6 滑块组件 (Slider)

```rust
#[derive(Component, Debug, Default)]
pub struct Slider {
    pub on_change: Callback<In<ValueChange<f32>>>,
    pub track_click: TrackClick,
}

// 滑块值
#[derive(Component, Debug, Default, PartialEq, Clone, Copy)]
pub struct SliderValue(pub f32);

// 滑块范围
#[derive(Component, Debug, PartialEq, Clone, Copy)]
pub struct SliderRange {
    start: f32,
    end: f32,
}

// 滑块步长
#[derive(Component, Debug, PartialEq, Clone)]
pub struct SliderStep(pub f32);
```

**功能**: 可定制的滑块组件，支持拖动、点击轨道、键盘控制等多种交互方式。

**轨道点击行为**:
```rust
pub enum TrackClick {
    Drag,  // 拖动编辑
    Step,  // 步进调整
    Snap,  // 跳转到点击位置
}
```

### 2.7 滚动条组件 (Scrollbar)

```rust
#[derive(Component, Debug, Reflect)]
pub struct Scrollbar {
    pub target: Entity,                    // 被滚动的实体
    pub orientation: ControlOrientation,   // 方向
    pub min_thumb_length: f32,            // 最小滑块长度
}

// 方向枚举
#[derive(Debug, Default, Clone, Copy, PartialEq, Reflect)]
pub enum ControlOrientation {
    Horizontal,  // 水平
    #[default]
    Vertical,    // 垂直
}
```

**功能**: 无头滚动条实现，直接修改目标实体的滚动位置。

## 3. 主要 API 使用示例

### 3.1 创建按钮

```rust
use bevy_app::App;
use bevy_ecs::system::{Commands, IntoSystem};
use bevy_ui_widgets::{Button, Callback, Activate};

fn setup_button(mut commands: Commands, app: &mut App) {
    // 注册回调系统
    fn button_clicked() {
        println!("按钮被点击了!");
    }
    let system_id = app.world_mut().register_system(button_clicked);

    // 创建按钮
    commands.spawn((
        Button {
            on_activate: Callback::System(system_id),
        },
        // 添加其他组件如 Node, Style 等用于布局和样式
    ));
}
```

### 3.2 创建复选框

```rust
use bevy_ui_widgets::{Checkbox, ValueChange};

fn setup_checkbox(mut commands: Commands, app: &mut App) {
    // 注册状态变化回调
    fn checkbox_changed(change: ValueChange<bool>) {
        println!("复选框状态变为: {}", change.value);
    }
    let system_id = app.world_mut().register_system(checkbox_changed);

    // 创建复选框
    commands.spawn((
        Checkbox {
            on_change: Callback::System(system_id),
        },
        // 初始状态为未选中，可以添加 Checked 组件来设置为选中
    ));
}
```

### 3.3 创建单选按钮组

```rust
use bevy_ui_widgets::{RadioGroup, RadioButton, Activate};

fn setup_radio_group(mut commands: Commands, app: &mut App) {
    // 注册选择变化回调
    fn radio_selected(activate: Activate) {
        println!("单选按钮 {:?} 被选中", activate.0);
    }
    let system_id = app.world_mut().register_system(radio_selected);

    // 创建单选按钮组
    let group = commands.spawn(RadioGroup {
        on_change: Callback::System(system_id),
    }).id();

    // 添加单选按钮作为子实体
    commands.entity(group).with_children(|parent| {
        parent.spawn(RadioButton);
        parent.spawn(RadioButton);
        parent.spawn(RadioButton);
    });
}
```

### 3.4 创建滑块

```rust
use bevy_ui_widgets::{
    Slider, SliderValue, SliderRange, SliderStep,
    SliderThumb, TrackClick, ValueChange
};

fn setup_slider(mut commands: Commands, app: &mut App) {
    // 注册值变化回调
    fn slider_changed(change: ValueChange<f32>) {
        println!("滑块值变为: {}", change.value);
    }
    let system_id = app.world_mut().register_system(slider_changed);

    // 创建滑块
    let slider = commands.spawn((
        Slider {
            on_change: Callback::System(system_id),
            track_click: TrackClick::Snap,
        },
        SliderValue(0.5),                    // 初始值
        SliderRange::new(0.0, 100.0),       // 范围 0-100
        SliderStep(1.0),                     // 步长为 1
    )).id();

    // 添加滑块轨道和滑块(thumb)
    commands.entity(slider).with_children(|parent| {
        // 轨道
        parent.spawn((
            // Node, Style 等布局组件
        ));

        // 滑块 thumb
        parent.spawn((
            SliderThumb,
            // Node, Style 等布局组件
        ));
    });
}
```

### 3.5 创建滚动条

```rust
use bevy_ui_widgets::{
    Scrollbar, CoreScrollbarThumb, ControlOrientation
};

fn setup_scrollbar(mut commands: Commands) {
    // 假设已有一个可滚动的目标实体
    let target_entity = commands.spawn((
        // ScrollPosition, Node 等组件
    )).id();

    // 创建垂直滚动条
    let scrollbar = commands.spawn(Scrollbar::new(
        target_entity,
        ControlOrientation::Vertical,
        20.0,  // 最小滑块长度 20px
    )).id();

    // 添加滚动条滑块
    commands.entity(scrollbar).with_children(|parent| {
        parent.spawn((
            CoreScrollbarThumb,
            // Node, Style 等布局组件
        ));
    });
}
```

### 3.6 事件触发控制

```rust
use bevy_ui_widgets::{SetChecked, ToggleChecked, SetSliderValue, SliderValueChange};

fn control_widgets(mut commands: Commands) {
    let checkbox_entity = /* 复选框实体 ID */;
    let slider_entity = /* 滑块实体 ID */;

    // 通过事件设置复选框状态
    commands.trigger(SetChecked {
        entity: checkbox_entity,
        checked: true,
    });

    // 切换复选框状态
    commands.trigger(ToggleChecked {
        entity: checkbox_entity,
    });

    // 设置滑块值
    commands.trigger(SetSliderValue {
        entity: slider_entity,
        change: SliderValueChange::Absolute(75.0),
    });

    // 相对调整滑块值
    commands.trigger(SetSliderValue {
        entity: slider_entity,
        change: SliderValueChange::Relative(-10.0),
    });
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 插件系统集成

```rust
use bevy_app::{App, PluginGroup};
use bevy_ui_widgets::UiWidgetsPlugins;

fn main() {
    App::new()
        // 添加所有 UI 小部件插件
        .add_plugins(UiWidgetsPlugins)
        // 或者单独添加特定插件
        .add_plugins((
            ButtonPlugin,
            CheckboxPlugin,
            SliderPlugin,
        ))
        .run();
}
```

### 4.2 与 bevy_ui 集成

```rust
use bevy_ui::{Node, Style, Val, FlexDirection};
use bevy_ui_widgets::Button;

fn styled_button(mut commands: Commands) {
    commands.spawn((
        Button::default(),
        Node::default(),
        Style {
            width: Val::Px(200.0),
            height: Val::Px(50.0),
            // 其他样式属性
            ..default()
        },
        // 添加背景颜色、边框等样式组件
    ));
}
```

### 4.3 与输入系统集成

小部件自动处理以下输入:

- **鼠标**: 点击、拖动、释放事件
- **键盘**: Enter、Space、方向键等
- **焦点**: 与 `bevy_input_focus` 集成

### 4.4 与可访问性系统集成

```rust
use bevy_a11y::AccessibilityNode;
use accesskit::Role;

// 小部件自动添加适当的可访问性节点
// 例如按钮自动获得 Role::Button
// 可以手动覆盖:
commands.spawn((
    Checkbox::default(),
    AccessibilityNode(accesskit::Node::new(Role::Switch)), // 开关而非复选框
));
```

## 5. 常见使用场景

### 5.1 设置界面

```rust
fn create_settings_ui(mut commands: Commands, app: &mut App) {
    // 音量滑块
    let volume_callback = app.world_mut().register_system(|change: ValueChange<f32>| {
        // 更新音量设置
        println!("音量设置为: {}%", change.value);
    });

    commands.spawn((
        Slider {
            on_change: Callback::System(volume_callback),
            ..default()
        },
        SliderValue(50.0),
        SliderRange::new(0.0, 100.0),
        // 样式组件...
    ));

    // 全屏切换
    let fullscreen_callback = app.world_mut().register_system(|change: ValueChange<bool>| {
        // 切换全屏模式
        println!("全屏模式: {}", change.value);
    });

    commands.spawn((
        Checkbox {
            on_change: Callback::System(fullscreen_callback),
        },
        // 样式组件...
    ));
}
```

### 5.2 游戏内 UI

```rust
fn create_game_ui(mut commands: Commands, app: &mut App) {
    // 暂停按钮
    let pause_callback = app.world_mut().register_system(|_: Activate| {
        // 暂停游戏逻辑
        println!("游戏暂停");
    });

    commands.spawn((
        Button {
            on_activate: Callback::System(pause_callback),
        },
        // 样式组件...
    ));

    // 生命值滚动条(只读显示)
    commands.spawn((
        Slider {
            on_change: Callback::Ignore, // 只读，不处理用户输入
            ..default()
        },
        SliderValue(0.8), // 80% 生命值
        SliderRange::new(0.0, 1.0),
        // 添加 InteractionDisabled 组件禁用交互
        InteractionDisabled,
    ));
}
```

### 5.3 表单界面

```rust
fn create_form_ui(mut commands: Commands, app: &mut App) {
    // 选项单选组
    let option_callback = app.world_mut().register_system(|activate: Activate| {
        println!("选择了选项: {:?}", activate.0);
    });

    let radio_group = commands.spawn(RadioGroup {
        on_change: Callback::System(option_callback),
    }).id();

    // 添加选项
    commands.entity(radio_group).with_children(|parent| {
        for i in 0..3 {
            parent.spawn((
                RadioButton,
                // 可以添加自定义组件来标识选项值
                OptionValue(i),
            ));
        }
    });
}

#[derive(Component)]
struct OptionValue(i32);
```

### 5.4 可滚动内容

```rust
fn create_scrollable_content(mut commands: Commands) {
    // 创建可滚动容器
    let container = commands.spawn((
        Node::default(),
        Style {
            width: Val::Px(300.0),
            height: Val::Px(200.0),
            overflow: Overflow::clip(), // 启用滚动
            ..default()
        },
        ScrollPosition::default(),
    )).id();

    // 添加内容
    commands.entity(container).with_children(|parent| {
        parent.spawn((
            Node::default(),
            Style {
                width: Val::Px(300.0),
                height: Val::Px(800.0), // 内容高度超过容器
                ..default()
            },
        ));
    });

    // 创建垂直滚动条
    commands.spawn(Scrollbar::new(
        container,
        ControlOrientation::Vertical,
        20.0,
    )).with_children(|parent| {
        parent.spawn((
            CoreScrollbarThumb,
            Node::default(),
            Style {
                width: Val::Px(20.0),
                background_color: Color::GRAY.into(),
                ..default()
            },
        ));
    });
}
```

### 5.5 自定义样式主题

```rust
// 定义样式主题
#[derive(Resource)]
struct UITheme {
    button_style: Style,
    checkbox_style: Style,
    primary_color: Color,
    secondary_color: Color,
}

fn apply_theme_to_button(
    mut commands: Commands,
    theme: Res<UITheme>,
    app: &mut App,
) {
    let callback = app.world_mut().register_system(|_: Activate| {
        println!("主题化按钮被点击");
    });

    commands.spawn((
        Button {
            on_activate: Callback::System(callback),
        },
        Node::default(),
        theme.button_style.clone(),
        BackgroundColor(theme.primary_color),
        BorderColor(theme.secondary_color),
    ));
}
```

## 6. 最佳实践和注意事项

### 6.1 状态管理

- 对于需要数据绑定的场景，使用回调系统而不是 `Callback::Ignore`
- 保持小部件状态与游戏状态的同步
- 考虑使用资源或组件来管理全局 UI 状态

### 6.2 性能优化

- 避免在每帧都创建新的回调
- 使用 `InteractionDisabled` 组件来禁用不需要交互的小部件
- 合理使用滑块精度设置避免不必要的回调触发

### 6.3 可访问性

- 保持默认的可访问性节点设置
- 为自定义组件提供适当的语义角色
- 确保键盘导航的正确实现

### 6.4 样式设计

- 使用一致的样式系统
- 考虑不同状态下的视觉反馈 (悬停、按下、禁用等)
- 为触摸设备提供足够大的交互区域

这个模块为 Bevy 应用提供了强大而灵活的 UI 组件基础，通过合理的架构设计和外部状态管理，能够满足各种复杂的用户界面需求。