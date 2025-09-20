# Bevy Text 模块文档

## 模块概述

`bevy_text` 是 Bevy 引擎中负责文本渲染和布局的核心模块。该模块提供了完整的文本处理功能，包括字体加载、文本布局、字形渲染和文本样式管理。

### 主要功能

- **字体管理**: 支持 TTF 和 OTF 格式字体的加载和管理
- **文本布局**: 提供灵活的文本布局算法，支持换行、对齐和边界约束
- **字形渲染**: 高效的字形栅格化和纹理图集管理
- **富文本支持**: 支持多样式文本块，包括不同字体、大小、颜色的文本片段
- **性能优化**: 字形缓存、形状缓存等多种性能优化机制

### 依赖关系

`bevy_text` 依赖以下 Bevy 模块：
- `bevy_app`: 应用程序框架
- `bevy_asset`: 资源管理系统
- `bevy_ecs`: 实体组件系统
- `bevy_image`: 图像处理
- `bevy_math`: 数学运算
- `bevy_color`: 颜色系统

外部依赖：
- `cosmic-text`: 核心文本布局引擎
- `wgpu-types`: GPU 类型定义

## 核心结构体和枚举

### 字体相关

#### Font
```rust
pub struct Font {
    pub data: Arc<Vec<u8>>,
}
```
表示一个字体资源，包含字体文件的二进制数据。

**主要方法**：
- `try_from_bytes(font_data: Vec<u8>) -> Result<Self, cosmic_text::ttf_parser::FaceParsingError>`
  从字节数据创建字体实例

#### FontLoader
```rust
pub struct FontLoader;
```
实现了 `AssetLoader` trait 的字体加载器，支持加载 `.ttf` 和 `.otf` 格式的字体文件。

### 文本组件

#### TextLayout
```rust
pub struct TextLayout {
    pub justify: Justify,     // 文本对齐方式
    pub linebreak: LineBreak, // 换行策略
}
```
控制文本块的布局设置。

**主要方法**：
- `new(justify: Justify, linebreak: LineBreak) -> Self`
- `new_with_justify(justify: Justify) -> Self`
- `new_with_linebreak(linebreak: LineBreak) -> Self`
- `new_with_no_wrap() -> Self`

#### TextFont
```rust
pub struct TextFont {
    pub font: Handle<Font>,           // 字体句柄
    pub font_size: f32,              // 字体大小
    pub line_height: LineHeight,     // 行高
    pub font_smoothing: FontSmoothing, // 字体平滑
}
```
定义文本的字体样式。

**主要方法**：
- `from_font_size(font_size: f32) -> Self`
- `with_font(font: Handle<Font>) -> Self`
- `with_font_size(font_size: f32) -> Self`
- `with_font_smoothing(font_smoothing: FontSmoothing) -> Self`

#### TextColor
```rust
pub struct TextColor(pub Color);
```
文本颜色组件。

**预定义常量**：
- `TextColor::BLACK`
- `TextColor::WHITE`

#### TextSpan
```rust
pub struct TextSpan(pub String);
```
表示文本块中的一个文本片段，支持不同的样式。

### 枚举类型

#### Justify (文本对齐)
```rust
pub enum Justify {
    Left,       // 左对齐
    Center,     // 居中对齐
    Right,      // 右对齐
    Justified,  // 两端对齐
}
```

#### LineBreak (换行策略)
```rust
pub enum LineBreak {
    WordBoundary,     // 按单词边界换行
    AnyCharacter,     // 按字符换行
    WordOrCharacter,  // 单词优先，必要时按字符换行
    NoWrap,          // 不自动换行
}
```

#### FontSmoothing (字体平滑)
```rust
pub enum FontSmoothing {
    None,        // 无抗锯齿，适用于像素艺术
    AntiAliased, // 灰度抗锯齿
}
```

#### LineHeight (行高)
```rust
pub enum LineHeight {
    Px(f32),                // 固定像素值
    RelativeToFont(f32),    // 相对于字体大小的倍数
}
```

### 文本处理管线

#### TextPipeline
```rust
pub struct TextPipeline {
    pub map_handle_to_font_id: HashMap<AssetId<Font>, (cosmic_text::fontdb::ID, Arc<str>)>,
    // 内部缓冲区...
}
```
文本处理的核心管线，负责文本布局和渲染。

**主要方法**：
- `update_buffer()`: 更新文本缓冲区
- `queue_text()`: 将文本加入渲染队列
- `create_text_measure()`: 创建文本测量信息

#### ComputedTextBlock
```rust
pub struct ComputedTextBlock {
    buffer: CosmicBuffer,
    entities: SmallVec<[TextEntity; 1]>,
    needs_rerender: bool,
}
```
计算后的文本块，包含布局缓冲区和实体信息。

#### TextLayoutInfo
```rust
pub struct TextLayoutInfo {
    pub scale_factor: f32,
    pub glyphs: Vec<PositionedGlyph>,
    pub section_rects: Vec<(Entity, Rect)>,
    pub size: Vec2,
}
```
文本布局的结果信息，包含定位的字形数据。

### 字形和图集管理

#### PositionedGlyph
```rust
pub struct PositionedGlyph {
    pub position: Vec2,
    pub size: Vec2,
    pub atlas_info: GlyphAtlasInfo,
    pub span_index: usize,
    pub line_index: usize,
    pub byte_index: usize,
    pub byte_length: usize,
}
```
定位后的字形，包含渲染所需的所有信息。

#### FontAtlas
```rust
pub struct FontAtlas {
    pub dynamic_texture_atlas_builder: DynamicTextureAtlasBuilder,
    pub glyph_to_atlas_index: HashMap<cosmic_text::CacheKey, GlyphAtlasLocation>,
    pub texture_atlas: Handle<TextureAtlasLayout>,
    pub texture: Handle<Image>,
}
```
字体图集，用于存储栅格化的字形。

### 边界和约束

#### TextBounds
```rust
pub struct TextBounds {
    pub width: Option<f32>,
    pub height: Option<f32>,
}
```
文本边界约束。

**预定义常量**：
- `TextBounds::UNBOUNDED`: 无边界限制

**主要方法**：
- `new(width: f32, height: f32) -> Self`
- `new_horizontal(width: f32) -> Self`
- `new_vertical(height: f32) -> Self`

## 主要 API 使用示例

### 1. 基本文本创建

```rust
use bevy::prelude::*;
use bevy_text::prelude::*;

fn setup_text(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 创建基本文本实体
    commands.spawn((
        // Text2d 或 Text 组件 (根据2D/UI上下文)
        TextLayout::default(),
        TextFont {
            font: asset_server.load("fonts/FiraMono.ttf"),
            font_size: 24.0,
            ..default()
        },
        TextColor::WHITE,
        // 文本内容通过 Text2d 或 Text 组件提供
    ));
}
```

### 2. 富文本块创建

```rust
fn create_rich_text(mut commands: Commands, asset_server: Res<AssetServer>) {
    let root_entity = commands.spawn((
        TextLayout::new_with_justify(Justify::Center),
        TextFont {
            font: asset_server.load("fonts/FiraMono.ttf"),
            font_size: 20.0,
            ..default()
        },
        TextColor::WHITE,
        // 根文本内容
    )).id();

    // 添加不同样式的文本片段
    let span1 = commands.spawn((
        TextSpan::new("加粗文本"),
        TextFont {
            font: asset_server.load("fonts/FiraMono-Bold.ttf"),
            font_size: 24.0,
            ..default()
        },
        TextColor::from(Color::srgb(1.0, 0.5, 0.0)),
    )).id();

    let span2 = commands.spawn((
        TextSpan::new("斜体文本"),
        TextFont {
            font: asset_server.load("fonts/FiraMono-Italic.ttf"),
            font_size: 18.0,
            ..default()
        },
        TextColor::from(Color::srgb(0.5, 0.5, 1.0)),
    )).id();

    // 建立父子关系
    commands.entity(root_entity).add_children(&[span1, span2]);
}
```

### 3. 文本边界和布局

```rust
fn setup_bounded_text(mut commands: Commands) {
    commands.spawn((
        TextLayout::new(Justify::Justified, LineBreak::WordBoundary),
        TextBounds::new(300.0, 200.0), // 限制宽度和高度
        TextFont::from_font_size(16.0),
        TextColor::BLACK,
        // 长文本内容
    ));
}
```

### 4. 字体加载和管理

```rust
fn load_fonts(mut commands: Commands, asset_server: Res<AssetServer>) {
    // 加载自定义字体
    let custom_font: Handle<Font> = asset_server.load("fonts/MyCustomFont.ttf");

    commands.spawn((
        TextLayout::default(),
        TextFont {
            font: custom_font,
            font_size: 32.0,
            font_smoothing: FontSmoothing::None, // 像素风格
            line_height: LineHeight::Px(40.0),  // 固定行高
        },
        TextColor::WHITE,
    ));
}
```

### 5. 文本访问和修改

```rust
fn modify_text(
    mut text_writer: TextWriter<Text2d>, // 或 TextWriter<Text> 用于UI
    text_query: Query<Entity, With<Text2d>>,
) {
    for entity in text_query.iter() {
        // 修改根文本
        if let Some(mut text) = text_writer.get_text(entity, 0) {
            *text = "新的文本内容".to_string();
        }

        // 修改字体样式
        if let Some(mut font) = text_writer.get_font(entity, 0) {
            font.font_size = 28.0;
        }

        // 修改文本颜色
        if let Some(mut color) = text_writer.get_color(entity, 0) {
            *color = TextColor::from(Color::srgb(1.0, 0.0, 0.0));
        }
    }
}
```

### 6. 文本测量

```rust
fn measure_text(
    mut text_pipeline: ResMut<TextPipeline>,
    fonts: Res<Assets<Font>>,
    text_reader: TextReader<Text2d>,
    mut font_system: ResMut<CosmicFontSystem>,
    text_query: Query<(Entity, &TextLayout, &mut ComputedTextBlock), With<Text2d>>,
) {
    for (entity, layout, mut computed) in text_query.iter_mut() {
        let text_spans = text_reader.iter(entity);

        match text_pipeline.create_text_measure(
            entity,
            &fonts,
            text_spans,
            1.0, // scale_factor
            layout,
            &mut computed,
            &mut font_system,
        ) {
            Ok(measure_info) => {
                println!("文本最小尺寸: {:?}", measure_info.min);
                println!("文本最大尺寸: {:?}", measure_info.max);
            }
            Err(e) => {
                eprintln!("文本测量失败: {:?}", e);
            }
        }
    }
}
```

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_ui 集成

```rust
use bevy::prelude::*;
use bevy_ui::prelude::*;

fn setup_ui_text(mut commands: Commands) {
    commands.spawn((
        Node {
            width: Val::Px(300.0),
            height: Val::Px(100.0),
            justify_content: JustifyContent::Center,
            align_items: AlignItems::Center,
            ..default()
        },
        BackgroundColor(Color::srgb(0.2, 0.2, 0.2)),
    )).with_children(|parent| {
        parent.spawn((
            Text::new("UI 文本示例"),
            TextFont::from_font_size(24.0),
            TextColor::WHITE,
            TextLayout::new_with_justify(Justify::Center),
        ));
    });
}
```

### 2. 与 bevy_sprite 集成 (2D 文本)

```rust
use bevy::prelude::*;
use bevy_sprite::prelude::*;

fn setup_2d_text(mut commands: Commands) {
    // 2D 相机
    commands.spawn(Camera2d);

    // 2D 文本
    commands.spawn((
        Text2d::new("2D 世界文本"),
        TextFont::from_font_size(48.0),
        TextColor::WHITE,
        TextLayout::new_with_justify(Justify::Center),
        Transform::from_translation(Vec3::new(0.0, 0.0, 1.0)),
    ));
}
```

### 3. 与资源系统集成

```rust
fn text_asset_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut font_events: EventReader<AssetEvent<Font>>,
    fonts: Res<Assets<Font>>,
) {
    for event in font_events.read() {
        match event {
            AssetEvent::Added { id } => {
                println!("字体加载完成: {:?}", id);
                if let Some(font) = fonts.get(*id) {
                    // 使用加载的字体
                    commands.spawn((
                        Text2d::new("字体加载成功！"),
                        TextFont {
                            font: Handle::Weak(*id),
                            font_size: 32.0,
                            ..default()
                        },
                        TextColor::GREEN,
                    ));
                }
            }
            AssetEvent::LoadedWithDependencies { id } => {
                println!("字体依赖加载完成: {:?}", id);
            }
            _ => {}
        }
    }
}
```

### 4. 与动画系统集成

```rust
use bevy::prelude::*;
use bevy_animation::prelude::*;

#[derive(Component)]
struct AnimatedText;

fn animate_text_system(
    time: Res<Time>,
    mut query: Query<&mut TextColor, With<AnimatedText>>,
) {
    for mut color in query.iter_mut() {
        let hue = (time.elapsed_secs() * 90.0) % 360.0;
        color.0 = Color::hsl(hue, 1.0, 0.5);
    }
}

fn setup_animated_text(mut commands: Commands) {
    commands.spawn((
        Text2d::new("彩虹文本"),
        TextFont::from_font_size(36.0),
        TextColor::WHITE,
        AnimatedText,
    ));
}
```

## 常见使用场景

### 1. 游戏 UI 文本

```rust
// 分数显示
fn setup_score_ui(mut commands: Commands) {
    commands.spawn((
        Text::new("分数: 0"),
        TextFont::from_font_size(32.0),
        TextColor::WHITE,
        Node {
            position_type: PositionType::Absolute,
            top: Val::Px(10.0),
            right: Val::Px(10.0),
            ..default()
        },
    ));
}

// 更新分数
fn update_score_system(
    score: Res<GameScore>,
    mut text_writer: TextWriter<Text>,
    score_query: Query<Entity, With<ScoreText>>,
) {
    if score.is_changed() {
        for entity in score_query.iter() {
            if let Some(mut text) = text_writer.get_text(entity, 0) {
                *text = format!("分数: {}", score.value);
            }
        }
    }
}
```

### 2. 对话系统

```rust
#[derive(Component)]
struct DialogueText;

fn setup_dialogue_system(mut commands: Commands) {
    commands.spawn((
        Text::new(""),
        TextFont::from_font_size(24.0),
        TextColor::WHITE,
        TextBounds::new_horizontal(400.0),
        TextLayout::new(Justify::Left, LineBreak::WordBoundary),
        DialogueText,
        Node {
            position_type: PositionType::Absolute,
            bottom: Val::Px(50.0),
            left: Val::Px(50.0),
            width: Val::Px(400.0),
            height: Val::Px(150.0),
            ..default()
        },
        BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.8)),
    ));
}

fn typewriter_effect_system(
    time: Res<Time>,
    mut dialogue_state: ResMut<DialogueState>,
    mut text_writer: TextWriter<Text>,
    dialogue_query: Query<Entity, With<DialogueText>>,
) {
    if dialogue_state.is_typing {
        dialogue_state.timer.tick(time.delta());

        if dialogue_state.timer.just_finished() {
            for entity in dialogue_query.iter() {
                if let Some(mut text) = text_writer.get_text(entity, 0) {
                    if dialogue_state.current_char < dialogue_state.full_text.len() {
                        dialogue_state.current_char += 1;
                        *text = dialogue_state.full_text[..dialogue_state.current_char].to_string();
                    } else {
                        dialogue_state.is_typing = false;
                    }
                }
            }
        }
    }
}
```

### 3. 本地化文本

```rust
#[derive(Resource)]
struct LocalizationData {
    texts: HashMap<String, HashMap<String, String>>, // key -> lang -> text
    current_language: String,
}

fn localized_text_system(
    localization: Res<LocalizationData>,
    mut text_writer: TextWriter<Text>,
    localized_query: Query<(Entity, &LocalizedTextKey)>,
) {
    if localization.is_changed() {
        for (entity, key) in localized_query.iter() {
            if let Some(localized_texts) = localization.texts.get(&key.0) {
                if let Some(text) = localized_texts.get(&localization.current_language) {
                    if let Some(mut text_content) = text_writer.get_text(entity, 0) {
                        *text_content = text.clone();
                    }
                }
            }
        }
    }
}
```

### 4. 文本效果和特效

```rust
// 浮动伤害数字
#[derive(Component)]
struct FloatingDamage {
    timer: Timer,
    start_pos: Vec3,
}

fn floating_damage_system(
    time: Res<Time>,
    mut commands: Commands,
    mut query: Query<(Entity, &mut FloatingDamage, &mut Transform, &mut TextColor), With<Text2d>>,
) {
    for (entity, mut damage, mut transform, mut color) in query.iter_mut() {
        damage.timer.tick(time.delta());

        let progress = damage.timer.fraction();

        // 向上漂浮
        transform.translation.y = damage.start_pos.y + progress * 100.0;

        // 逐渐淡出
        color.0.set_alpha(1.0 - progress);

        if damage.timer.finished() {
            commands.entity(entity).despawn();
        }
    }
}

fn spawn_floating_damage(
    mut commands: Commands,
    damage_events: EventReader<DamageEvent>,
) {
    for event in damage_events.read() {
        commands.spawn((
            Text2d::new(format!("-{}", event.amount)),
            TextFont::from_font_size(24.0),
            TextColor::from(Color::srgb(1.0, 0.2, 0.2)),
            Transform::from_translation(event.position),
            FloatingDamage {
                timer: Timer::from_seconds(1.0, TimerMode::Once),
                start_pos: event.position,
            },
        ));
    }
}
```

### 5. 性能优化建议

```rust
// 文本池化，避免频繁创建销毁
#[derive(Resource)]
struct TextPool {
    available: Vec<Entity>,
    in_use: HashSet<Entity>,
}

impl TextPool {
    fn get_text_entity(&mut self, commands: &mut Commands) -> Entity {
        if let Some(entity) = self.available.pop() {
            self.in_use.insert(entity);
            entity
        } else {
            let entity = commands.spawn((
                Text2d::new(""),
                TextFont::from_font_size(20.0),
                TextColor::WHITE,
            )).id();
            self.in_use.insert(entity);
            entity
        }
    }

    fn return_text_entity(&mut self, entity: Entity, text_writer: &mut TextWriter<Text2d>) {
        if self.in_use.remove(&entity) {
            // 清空文本内容
            if let Some(mut text) = text_writer.get_text(entity, 0) {
                text.clear();
            }
            self.available.push(entity);
        }
    }
}
```

这份文档涵盖了 `bevy_text` 模块的主要功能、API 使用方法以及常见的应用场景。该模块为 Bevy 引擎提供了强大而灵活的文本渲染能力，支持从简单的静态文本到复杂的富文本和动态文本效果。