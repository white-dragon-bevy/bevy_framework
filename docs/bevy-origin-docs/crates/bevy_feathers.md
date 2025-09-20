# Bevy Feathers UI 组件库详细文档

## 1. 模块概述

`bevy_feathers` 是一个为 Bevy 游戏引擎设计的样式化 UI 组件库，专门用于构建编辑器、检视器和开发工具。该库提供了一套完整的 UI 控件，具有统一的主题系统和现代化的设计语言。

### 1.1 主要特性

- **主题化设计系统**：基于设计令牌（Design Tokens）的主题框架
- **丰富的控件集合**：按钮、复选框、滑块、单选按钮、开关等
- **响应式交互**：支持悬停、按下、禁用等状态
- **可访问性支持**：集成键盘导航和焦点管理
- **自定义光标**：根据悬停实体自动切换光标
- **嵌入式资源**：内置字体和着色器资源

### 1.2 设计理念

该库专为 Bevy 编辑器而设计，优先考虑功能性和一致性而非自定义性。采用现代化的深色主题风格，适合开发工具界面。

## 2. 核心结构体和枚举

### 2.1 主题系统

#### ThemeToken
```rust
pub struct ThemeToken(SmolStr);
```
设计令牌，作为主题属性的查找键。

**主要方法：**
- `new(text: SmolStr)` - 从 SmolStr 创建新令牌
- `new_static(text: &'static str)` - 从静态字符串创建令牌

#### UiTheme
```rust
#[derive(Resource)]
pub struct UiTheme(pub ThemeProps);
```
当前选择的用户界面主题资源。

**主要方法：**
- `color(&self, token: &ThemeToken) -> Color` - 根据设计令牌查找颜色
- `set_color(&mut self, token: &str, color: Color)` - 设置设计令牌对应的颜色

#### ThemeProps
```rust
pub struct ThemeProps {
    pub color: HashMap<ThemeToken, Color>,
}
```
主题属性集合，包含设计令牌到颜色的映射。

### 2.2 主题组件

#### ThemeBackgroundColor
```rust
#[derive(Component)]
pub struct ThemeBackgroundColor(pub ThemeToken);
```
使实体的背景色基于主题颜色设置的组件。

#### ThemeBorderColor
```rust
#[derive(Component)]
pub struct ThemeBorderColor(pub ThemeToken);
```
使实体的边框色基于主题颜色设置的组件。

#### ThemeFontColor
```rust
#[derive(Component)]
pub struct ThemeFontColor(pub ThemeToken);
```
使实体的继承文本颜色基于主题颜色设置的组件。

#### ThemedText
```rust
#[derive(Component)]
pub struct ThemedText;
```
标记组件，表示文本实体选择使用继承的文本样式。

### 2.3 控件相关结构体

#### ButtonVariant
```rust
#[derive(Component)]
pub enum ButtonVariant {
    Normal,    // 标准按钮外观
    Primary,   // 主要按钮外观（行动号召按钮）
}
```

#### ButtonProps
```rust
pub struct ButtonProps {
    pub variant: ButtonVariant,         // 按钮颜色变体
    pub corners: RoundedCorners,        // 圆角选项
    pub on_click: Callback<In<Activate>>, // 点击处理器
}
```

#### CheckboxProps
```rust
pub struct CheckboxProps {
    pub on_change: Callback<In<ValueChange<bool>>>, // 变更处理器
}
```

#### SliderProps
```rust
pub struct SliderProps {
    pub value: f32,                           // 当前值
    pub min: f32,                            // 最小值
    pub max: f32,                            // 最大值
    pub on_change: Callback<In<ValueChange<f32>>>, // 变更处理器
}
```

### 2.4 光标系统

#### EntityCursor
```rust
#[derive(Component)]
pub enum EntityCursor {
    #[cfg(feature = "custom_cursor")]
    Custom(CustomCursor),       // 自定义光标图像
    System(SystemCursorIcon),   // 系统提供的光标图标
}
```

#### DefaultCursor
```rust
#[derive(Resource)]
pub struct DefaultCursor(pub EntityCursor);
```
指定鼠标未悬停在任何实体上时使用的默认光标图标。

### 2.5 字体系统

#### InheritableFont
```rust
#[derive(Component)]
pub struct InheritableFont {
    pub font: HandleOrPath<Font>,  // 字体句柄或路径
    pub font_size: f32,           // 字体大小
}
```

## 3. 主要API使用示例

### 3.1 基础设置

```rust
use bevy::prelude::*;
use bevy_feathers::{FeathersPlugins, dark_theme::create_dark_theme, theme::UiTheme};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(FeathersPlugins)
        .add_systems(Startup, setup_ui)
        .run();
}

fn setup_ui(mut commands: Commands, mut theme: ResMut<UiTheme>) {
    // 应用深色主题
    theme.0 = create_dark_theme();

    // 创建UI根节点
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            align_items: AlignItems::Center,
            justify_content: JustifyContent::Center,
            ..default()
        },
        BackgroundColor(Color::BLACK),
    ));
}
```

### 3.2 按钮创建和使用

```rust
use bevy_feathers::controls::{button, ButtonProps, ButtonVariant};
use bevy_ui_widgets::{Callback, Activate};

fn create_button_system(mut commands: Commands) {
    commands.spawn(button(
        ButtonProps {
            variant: ButtonVariant::Primary,
            corners: RoundedCorners::All,
            on_click: Callback::new(|trigger: In<Activate>| {
                info!("按钮被点击了！");
            }),
        },
        (), // 无额外覆盖组件
        Text::new("点击我") // 按钮标签
    ));
}
```

### 3.3 复选框创建

```rust
use bevy_feathers::controls::{checkbox, CheckboxProps};
use bevy_ui_widgets::{Callback, ValueChange};

fn create_checkbox_system(mut commands: Commands) {
    commands.spawn(checkbox(
        CheckboxProps {
            on_change: Callback::new(|trigger: In<ValueChange<bool>>| {
                info!("复选框状态变更为: {}", trigger.new_value);
            }),
        },
        (), // 无额外覆盖组件
        Text::new("启用此选项") // 复选框标签
    ));
}
```

### 3.4 滑块创建

```rust
use bevy_feathers::controls::{slider, SliderProps};
use bevy_ui_widgets::{Callback, ValueChange};

fn create_slider_system(mut commands: Commands) {
    commands.spawn(slider(
        SliderProps {
            value: 0.5,
            min: 0.0,
            max: 1.0,
            on_change: Callback::new(|trigger: In<ValueChange<f32>>| {
                info!("滑块值变更为: {}", trigger.new_value);
            }),
        },
        (), // 无额外覆盖组件
    ));
}
```

### 3.5 自定义主题

```rust
use bevy_feathers::{theme::UiTheme, tokens, palette};
use bevy_color::Color;

fn setup_custom_theme(mut theme: ResMut<UiTheme>) {
    // 设置自定义按钮颜色
    theme.set_color("feathers.button.bg", Color::srgb(0.2, 0.4, 0.8));
    theme.set_color("feathers.button.bg.hover", Color::srgb(0.3, 0.5, 0.9));

    // 使用预定义调色板
    theme.set_color("feathers.window.bg", palette::GRAY_1);
    theme.set_color("feathers.text.main", palette::WHITE);
}
```

### 3.6 光标自定义

```rust
use bevy_feathers::cursor::{EntityCursor, DefaultCursor};
use bevy_window::SystemCursorIcon;

fn setup_custom_cursor(mut commands: Commands) {
    commands.insert_resource(DefaultCursor(
        EntityCursor::System(SystemCursorIcon::Crosshair)
    ));

    // 为特定实体设置光标
    commands.spawn((
        Node::default(),
        EntityCursor::System(SystemCursorIcon::Pointer),
    ));
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 依赖的核心模块

- **bevy_ui**: 提供基础UI系统和布局
- **bevy_ui_widgets**: 提供基础交互组件
- **bevy_picking**: 处理鼠标交互和悬停检测
- **bevy_input_focus**: 管理输入焦点和键盘导航
- **bevy_text**: 文本渲染和字体管理
- **bevy_color**: 颜色处理和主题系统

### 4.2 插件注册

```rust
// 完整插件组（推荐）
app.add_plugins(FeathersPlugins);

// 或者只添加核心插件
app.add_plugins(FeathersPlugin);
```

### 4.3 与输入系统集成

```rust
use bevy_input_focus::tab_navigation::TabIndex;

fn create_focusable_ui(mut commands: Commands) {
    commands.spawn((
        button(ButtonProps::default(), (), Text::new("按钮1")),
        TabIndex(0), // 设置Tab导航顺序
    ));

    commands.spawn((
        button(ButtonProps::default(), (), Text::new("按钮2")),
        TabIndex(1),
    ));
}
```

### 4.4 与渲染系统集成

```rust
use bevy_feathers::alpha_pattern::{AlphaPatternMaterial, AlphaPatternResource};

fn setup_alpha_pattern(
    mut commands: Commands,
    mut materials: ResMut<Assets<AlphaPatternMaterial>>,
    alpha_pattern: Res<AlphaPatternResource>,
) {
    // 使用 alpha 模式材质（用于透明度显示）
    let material = materials.add(AlphaPatternMaterial {
        color: Color::WHITE,
        alpha_pattern: alpha_pattern.texture.clone(),
    });
}
```

## 5. 常见使用场景

### 5.1 编辑器工具栏

```rust
fn create_toolbar(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Percent(100.0),
            height: Val::Px(40.0),
            flex_direction: FlexDirection::Row,
            align_items: AlignItems::Center,
            padding: UiRect::all(Val::Px(8.0)),
            ..default()
        },
        ThemeBackgroundColor(tokens::WINDOW_BG),
    ))
    .with_children(|parent| {
        // 保存按钮
        parent.spawn(button(
            ButtonProps {
                variant: ButtonVariant::Primary,
                on_click: Callback::new(save_file),
                ..default()
            },
            (),
            Text::new("保存")
        ));

        // 打开按钮
        parent.spawn(button(
            ButtonProps {
                variant: ButtonVariant::Normal,
                on_click: Callback::new(open_file),
                ..default()
            },
            (),
            Text::new("打开")
        ));
    });
}

fn save_file(_trigger: In<Activate>) {
    info!("保存文件");
}

fn open_file(_trigger: In<Activate>) {
    info!("打开文件");
}
```

### 5.2 属性检视器

```rust
fn create_inspector(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(300.0),
            height: Val::Percent(100.0),
            flex_direction: FlexDirection::Column,
            padding: UiRect::all(Val::Px(16.0)),
            ..default()
        },
        ThemeBackgroundColor(tokens::WINDOW_BG),
    ))
    .with_children(|parent| {
        // 标题
        parent.spawn((
            Text::new("属性"),
            ThemeFontColor(tokens::TEXT_MAIN),
            InheritableFont::from_path(fonts::BOLD),
        ));

        // 可见性开关
        parent.spawn(checkbox(
            CheckboxProps {
                on_change: Callback::new(|trigger: In<ValueChange<bool>>| {
                    info!("可见性: {}", trigger.new_value);
                }),
            },
            (),
            Text::new("可见")
        ));

        // 不透明度滑块
        parent.spawn((
            Text::new("不透明度"),
            ThemeFontColor(tokens::TEXT_MAIN),
        ));
        parent.spawn(slider(
            SliderProps {
                value: 1.0,
                min: 0.0,
                max: 1.0,
                on_change: Callback::new(|trigger: In<ValueChange<f32>>| {
                    info!("不透明度: {}", trigger.new_value);
                }),
            },
            (),
        ));
    });
}
```

### 5.3 设置对话框

```rust
fn create_settings_dialog(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(400.0),
            height: Val::Px(300.0),
            flex_direction: FlexDirection::Column,
            padding: UiRect::all(Val::Px(20.0)),
            border: UiRect::all(Val::Px(1.0)),
            ..default()
        },
        ThemeBackgroundColor(tokens::WINDOW_BG),
        ThemeBorderColor(tokens::FOCUS_RING),
        BorderRadius::all(Val::Px(8.0)),
    ))
    .with_children(|parent| {
        // 标题
        parent.spawn((
            Text::new("设置"),
            ThemeFontColor(tokens::TEXT_MAIN),
            InheritableFont {
                font: HandleOrPath::Path(fonts::BOLD.to_owned()),
                font_size: 18.0,
            },
        ));

        // 设置项
        parent.spawn((
            Node {
                flex_direction: FlexDirection::Column,
                row_gap: Val::Px(12.0),
                flex_grow: 1.0,
                ..default()
            },
        ))
        .with_children(|parent| {
            // 自动保存
            parent.spawn(checkbox(
                CheckboxProps {
                    on_change: Callback::new(toggle_auto_save),
                },
                (),
                Text::new("自动保存")
            ));

            // 主题选择
            parent.spawn((
                Text::new("主题"),
                ThemeFontColor(tokens::TEXT_MAIN),
            ));
            // 这里可以添加单选按钮组来选择主题
        });

        // 按钮行
        parent.spawn((
            Node {
                flex_direction: FlexDirection::Row,
                justify_content: JustifyContent::End,
                column_gap: Val::Px(8.0),
                ..default()
            },
        ))
        .with_children(|parent| {
            parent.spawn(button(
                ButtonProps {
                    variant: ButtonVariant::Normal,
                    on_click: Callback::new(cancel_settings),
                    ..default()
                },
                (),
                Text::new("取消")
            ));

            parent.spawn(button(
                ButtonProps {
                    variant: ButtonVariant::Primary,
                    on_click: Callback::new(apply_settings),
                    ..default()
                },
                (),
                Text::new("应用")
            ));
        });
    });
}

fn toggle_auto_save(_trigger: In<ValueChange<bool>>) {
    info!("切换自动保存");
}

fn cancel_settings(_trigger: In<Activate>) {
    info!("取消设置");
}

fn apply_settings(_trigger: In<Activate>) {
    info!("应用设置");
}
```

### 5.4 调色板选择器

```rust
use bevy_feathers::controls::{color_swatch, ColorSwatch};

fn create_color_palette(mut commands: Commands) {
    commands.spawn((
        Node {
            flex_direction: FlexDirection::Row,
            flex_wrap: FlexWrap::Wrap,
            column_gap: Val::Px(4.0),
            row_gap: Val::Px(4.0),
            ..default()
        },
    ))
    .with_children(|parent| {
        let colors = [
            palette::ACCENT,
            palette::X_AXIS,
            palette::Y_AXIS,
            palette::Z_AXIS,
            palette::WHITE,
            palette::GRAY_3,
        ];

        for color in colors {
            parent.spawn(color_swatch(
                color,
                Callback::new(move |_trigger: In<Activate>| {
                    info!("选择了颜色: {:?}", color);
                }),
            ));
        }
    });
}
```

## 6. 设计令牌参考

### 6.1 通用令牌
- `feathers.window.bg` - 窗口背景
- `feathers.focus` - 焦点环
- `feathers.text.main` - 主要文本
- `feathers.text.dim` - 暗淡文本

### 6.2 按钮令牌
- `feathers.button.bg` - 普通按钮背景
- `feathers.button.bg.hover` - 悬停状态
- `feathers.button.bg.pressed` - 按下状态
- `feathers.button.bg.disabled` - 禁用状态
- `feathers.button.txt` - 按钮文本
- `feathers.button.primary.*` - 主要按钮变体

### 6.3 复选框令牌
- `feathers.checkbox.bg` - 复选框背景
- `feathers.checkbox.border` - 复选框边框
- `feathers.checkbox.mark` - 复选框标记
- `feathers.checkbox.text` - 复选框文本

### 6.4 滑块令牌
- `feathers.slider.bg` - 滑块背景
- `feathers.slider.bar` - 滑块条
- `feathers.slider.text` - 滑块文本

## 7. 最佳实践

### 7.1 主题一致性
- 始终使用设计令牌而不是硬编码颜色
- 保持整个应用的主题一致性
- 合理利用主题继承系统

### 7.2 响应式设计
- 为所有交互元素提供适当的反馈
- 正确处理禁用状态
- 实现键盘导航支持

### 7.3 性能优化
- 合理使用事件回调，避免过度计算
- 利用 Bevy 的变更检测系统
- 避免不必要的主题更新

### 7.4 可访问性
- 为所有交互元素设置 TabIndex
- 使用语义化的文本标签
- 提供适当的视觉反馈

这个文档涵盖了 `bevy_feathers` 的主要功能和使用方法，可以作为开发者的参考指南。该库专为编辑器开发设计，提供了现代化的UI组件和完善的主题系统。