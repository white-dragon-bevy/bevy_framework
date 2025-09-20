# Bevy Color 颜色系统文档

## 1. 模块概述

`bevy_color` 是 Bevy 游戏引擎的颜色处理核心模块，提供了多种颜色空间的表示和转换功能。该模块设计为 `no_std` 兼容，支持多种颜色格式之间的无损转换，并提供了丰富的颜色操作API。

### 主要功能

- **多颜色空间支持**：支持10种不同的颜色空间表示
- **无损转换**：提供各颜色空间之间的精确转换
- **颜色操作**：支持混合、亮度调整、色相操作等
- **调色板系统**：内置基础、CSS和Tailwind调色板
- **渐变功能**：支持颜色渐变和插值
- **感知均匀性**：优先支持感知均匀的颜色空间如Oklab

### 设计理念

该模块基于现代色彩科学设计，特别重视：
- **渲染准确性**：线性RGB用于物理准确的光照计算
- **感知一致性**：Oklab/Oklch用于感知均匀的颜色操作
- **用户友好性**：HSL/HSV用于直观的艺术创作
- **标准兼容性**：sRGB用于与图像文件和设计工具的兼容

## 2. 核心颜色空间

### 2.1 RGB 系列

#### Srgba - 标准RGB（伽马校正）
```rust
pub struct Srgba {
    pub red: f32,     // [0.0, 1.0]
    pub green: f32,   // [0.0, 1.0]
    pub blue: f32,    // [0.0, 1.0]
    pub alpha: f32,   // [0.0, 1.0]
}
```

**特点**：
- 包含伽马校正的标准RGB
- 适用于图像文件、用户界面
- 人眼感知友好，但不适合光照计算

**常用方法**：
```rust
// 构造函数
let color = Srgba::new(1.0, 0.5, 0.2, 1.0);
let color = Srgba::rgb(1.0, 0.5, 0.2); // alpha = 1.0

// 预定义颜色
let red = Srgba::RED;
let white = Srgba::WHITE;
let transparent = Srgba::NONE;
```

#### LinearRgba - 线性RGB（无伽马校正）
```rust
pub struct LinearRgba {
    pub red: f32,     // [0.0, 1.0]
    pub green: f32,   // [0.0, 1.0]
    pub blue: f32,    // [0.0, 1.0]
    pub alpha: f32,   // [0.0, 1.0]
}
```

**特点**：
- 用于GPU渲染和光照计算
- 物理准确但感知非均匀
- 支持Pod和Zeroable traits用于GPU缓冲区

### 2.2 圆柱坐标系列

#### Hsla - 色相-饱和度-亮度
```rust
pub struct Hsla {
    pub hue: f32,         // [0.0, 360.0] 度
    pub saturation: f32,  // [0.0, 1.0]
    pub lightness: f32,   // [0.0, 1.0]
    pub alpha: f32,       // [0.0, 1.0]
}
```

**特点**：
- 直观的艺术创作色彩空间
- 易于调整色相、饱和度和亮度
- 适合创建颜色渐变和调色板

**使用示例**：
```rust
// 创建HSL颜色
let orange = Hsla::new(30.0, 1.0, 0.5, 1.0);
let orange = Hsla::hsl(30.0, 1.0, 0.5); // alpha = 1.0

// 调整属性
let desaturated = orange.with_saturation(0.3);
let darker = orange.with_lightness(0.3);

// 生成分散色彩序列（用于调试）
let debug_color = Hsla::sequential_dispersed(entity_id);
```

#### Hsva - 色相-饱和度-明度
```rust
pub struct Hsva {
    pub hue: f32,         // [0.0, 360.0]
    pub saturation: f32,  // [0.0, 1.0]
    pub value: f32,       // [0.0, 1.0]
    pub alpha: f32,       // [0.0, 1.0]
}
```

**特点**：
- 与HSL类似但使用明度(Value)而非亮度
- 更接近人类对"亮度"的直观感受

#### Hwba - 色相-白度-黑度
```rust
pub struct Hwba {
    pub hue: f32,       // [0.0, 360.0]
    pub whiteness: f32, // [0.0, 1.0]
    pub blackness: f32, // [0.0, 1.0]
    pub alpha: f32,     // [0.0, 1.0]
}
```

**特点**：
- 通过添加白色或黑色来调整颜色
- 直观的亮化和暗化操作

### 2.3 感知均匀空间

#### Oklaba - Oklab颜色空间
```rust
pub struct Oklaba {
    pub lightness: f32,  // [0.0, 1.0]
    pub a: f32,          // [-1.0, 1.0] 绿-红轴
    pub b: f32,          // [-1.0, 1.0] 蓝-黄轴
    pub alpha: f32,      // [0.0, 1.0]
}
```

**特点**：
- 感知均匀的颜色空间
- 适合颜色校正和图像处理
- 现代色彩科学推荐

#### Oklcha - Oklab圆柱坐标
```rust
pub struct Oklcha {
    pub lightness: f32,  // [0.0, 1.0]
    pub chroma: f32,     // [0.0, 1.0]
    pub hue: f32,        // [0.0, 360.0]
    pub alpha: f32,      // [0.0, 1.0]
}
```

**特点**：
- Oklab的圆柱坐标表示
- 结合感知均匀性和直观操作
- Bevy中颜色操作的默认中间格式

### 2.4 其他专业空间

#### Laba / Lcha - CIE Lab 色彩空间
```rust
pub struct Laba {
    pub lightness: f32,  // [0.0, 1.0]
    pub a: f32,          // [-1.0, 1.0]
    pub b: f32,          // [-1.0, 1.0]
    pub alpha: f32,      // [0.0, 1.0]
}
```

#### Xyza - CIE XYZ 色彩空间
```rust
pub struct Xyza {
    pub x: f32,    // [0.0, 1.0]
    pub y: f32,    // [0.0, 1.0]
    pub z: f32,    // [0.0, 1.0]
    pub alpha: f32 // [0.0, 1.0]
}
```

## 3. Color枚举 - 统一颜色接口

```rust
pub enum Color {
    Srgba(Srgba),
    LinearRgba(LinearRgba),
    Hsla(Hsla),
    Hsva(Hsva),
    Hwba(Hwba),
    Laba(Laba),
    Lcha(Lcha),
    Oklaba(Oklaba),
    Oklcha(Oklcha),
    Xyza(Xyza),
}
```

### 特点
- 可以存储任意颜色空间的颜色
- 提供统一的API接口
- 自动处理颜色空间转换
- 支持所有颜色操作

### 使用示例
```rust
use bevy_color::{Color, Srgba, Hsla};

// 创建不同格式的颜色
let red_srgb = Color::srgba(1.0, 0.0, 0.0, 1.0);
let red_hsl = Color::hsla(0.0, 1.0, 0.5, 1.0);

// 便捷构造方法
let blue = Color::srgb(0.0, 0.0, 1.0);
let green = Color::linear_rgb(0.0, 1.0, 0.0);
let yellow = Color::hsl(60.0, 1.0, 0.5);

// 转换到特定格式
let linear_color = red_srgb.to_linear();
let srgb_color = red_srgb.to_srgba();
```

## 4. 颜色操作Traits

### 4.1 Mix - 颜色混合
```rust
pub trait Mix: Sized {
    fn mix(&self, other: &Self, factor: f32) -> Self;
    fn mix_assign(&mut self, other: Self, factor: f32);
}
```

**使用示例**：
```rust
let red = Srgba::RED;
let blue = Srgba::BLUE;
let purple = red.mix(&blue, 0.5); // 50%混合
```

### 4.2 Luminance - 亮度操作
```rust
pub trait Luminance: Sized {
    fn luminance(&self) -> f32;
    fn with_luminance(&self, value: f32) -> Self;
    fn darker(&self, amount: f32) -> Self;
    fn lighter(&self, amount: f32) -> Self;
}
```

**使用示例**：
```rust
let color = Srgba::rgb(0.8, 0.2, 0.2);
let brightness = color.luminance();
let darker_color = color.darker(0.2);
let lighter_color = color.lighter(0.3);
```

### 4.3 Alpha - 透明度操作
```rust
pub trait Alpha: Sized {
    fn alpha(&self) -> f32;
    fn with_alpha(&self, alpha: f32) -> Self;
}
```

### 4.4 色相操作
```rust
pub trait Hue: Sized {
    fn hue(&self) -> f32;
    fn with_hue(&self, hue: f32) -> Self;
    fn shift_hue(&self, amount: f32) -> Self;
}

pub trait Saturation: Sized {
    fn saturation(&self) -> f32;
    fn with_saturation(&self, saturation: f32) -> Self;
}
```

### 4.5 颜色差异计算
```rust
pub trait EuclideanDistance: Sized {
    fn distance_squared(&self, other: &Self) -> f32;
    fn distance(&self, other: &Self) -> f32;
}
```

## 5. 颜色渐变系统

### ColorCurve - 颜色曲线
```rust
use bevy_color::{Srgba, ColorCurve};

// 创建颜色渐变
let gradient = ColorCurve::new(vec![
    Srgba::RED,
    Srgba::YELLOW,
    Srgba::GREEN,
    Srgba::BLUE
]).unwrap();

// 采样渐变
let color_at_quarter = gradient.sample(0.75);
```

### 渐变类型
- **EvenCore**：等距分布的颜色点
- **支持任意Mix类型**：所有颜色空间都可用于渐变

## 6. 调色板系统

### 6.1 基础调色板 (basic)
```rust
use bevy_color::palettes::basic::*;

let red = RED;      // 纯红色
let blue = BLUE;    // 纯蓝色
let white = WHITE;  // 纯白色
let black = BLACK;  // 纯黑色
```

### 6.2 CSS调色板 (css)
```rust
use bevy_color::palettes::css::*;

let crimson = CRIMSON;
let coral = CORAL;
let gold = GOLD;
let silver = SILVER;
```

包含所有CSS命名颜色（约140种）。

### 6.3 Tailwind调色板 (tailwind)
```rust
use bevy_color::palettes::tailwind::*;

let red_500 = RED_500;
let blue_400 = BLUE_400;
let gray_100 = GRAY_100;
```

包含Tailwind CSS的完整颜色系统。

## 7. 与Bevy引擎集成

### 7.1 组件系统集成
```rust
use bevy::prelude::*;
use bevy_color::{Color, Srgba};

#[derive(Component)]
struct Tint(Color);

fn setup(mut commands: Commands) {
    commands.spawn((
        // 其他组件...
        Tint(Color::srgb(1.0, 0.5, 0.2)),
    ));
}
```

### 7.2 材质系统集成
```rust
// PBR材质
let material = StandardMaterial {
    base_color: Color::srgb(0.8, 0.2, 0.2),
    emissive: LinearRgba::rgb(0.1, 0.0, 0.0),
    ..default()
};

// Sprite材质
let sprite = Sprite {
    color: Color::hsla(240.0, 0.8, 0.6, 0.9),
    ..default()
};
```

### 7.3 UI系统集成
```rust
fn setup_ui(mut commands: Commands) {
    commands.spawn(NodeBundle {
        style: Style {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            ..default()
        },
        background_color: Color::srgba(0.2, 0.2, 0.2, 0.8).into(),
        ..default()
    });
}
```

### 7.4 光照系统集成
```rust
// 点光源
commands.spawn(PointLightBundle {
    point_light: PointLight {
        color: Color::srgb(1.0, 0.8, 0.6),
        intensity: 1000.0,
        ..default()
    },
    ..default()
});

// 环境光
commands.insert_resource(AmbientLight {
    color: Color::srgb(0.3, 0.3, 0.4),
    brightness: 0.1,
});
```

## 8. 常见使用场景

### 8.1 动态颜色动画
```rust
use bevy::prelude::*;
use bevy_color::{Color, Hsla, Mix};

#[derive(Component)]
struct ColorAnimation {
    start_color: Color,
    end_color: Color,
    duration: f32,
    timer: f32,
}

fn animate_colors(
    time: Res<Time>,
    mut query: Query<(&mut ColorAnimation, &mut Sprite)>
) {
    for (mut anim, mut sprite) in query.iter_mut() {
        anim.timer += time.delta_seconds();
        let t = (anim.timer / anim.duration).clamp(0.0, 1.0);

        sprite.color = anim.start_color.mix(&anim.end_color, t);
    }
}
```

### 8.2 基于ID的颜色生成
```rust
use bevy_color::Hsla;

fn generate_player_color(player_id: u32) -> Color {
    // 生成确定性但视觉上分散的颜色
    Hsla::sequential_dispersed(player_id).into()
}

fn setup_players(mut commands: Commands) {
    for id in 0..4 {
        commands.spawn((
            Player { id },
            Sprite {
                color: generate_player_color(id),
                ..default()
            }
        ));
    }
}
```

### 8.3 健康条颜色渐变
```rust
use bevy_color::{Srgba, Mix};

fn health_color(health_percent: f32) -> Color {
    let red = Srgba::rgb(1.0, 0.0, 0.0);
    let yellow = Srgba::rgb(1.0, 1.0, 0.0);
    let green = Srgba::rgb(0.0, 1.0, 0.0);

    if health_percent > 0.5 {
        let t = (health_percent - 0.5) * 2.0;
        yellow.mix(&green, t).into()
    } else {
        let t = health_percent * 2.0;
        red.mix(&yellow, t).into()
    }
}
```

### 8.4 昼夜循环
```rust
use bevy_color::{Color, Hsla};

fn day_night_cycle(time_of_day: f32) -> Color {
    // time_of_day: 0.0 = 午夜, 0.5 = 正午
    let hue = 240.0; // 蓝色基调
    let saturation = 0.8;
    let lightness = (time_of_day * 2.0 - 1.0).abs(); // V形曲线

    Color::hsla(hue, saturation, lightness, 1.0)
}
```

### 8.5 团队识别系统
```rust
use bevy_color::palettes::tailwind::*;

#[derive(Component)]
enum Team {
    Red,
    Blue,
    Green,
    Yellow,
}

impl Team {
    fn color(&self) -> Color {
        match self {
            Team::Red => RED_500.into(),
            Team::Blue => BLUE_500.into(),
            Team::Green => GREEN_500.into(),
            Team::Yellow => YELLOW_500.into(),
        }
    }

    fn secondary_color(&self) -> Color {
        match self {
            Team::Red => RED_300.into(),
            Team::Blue => BLUE_300.into(),
            Team::Green => GREEN_300.into(),
            Team::Yellow => YELLOW_300.into(),
        }
    }
}
```

### 8.6 粒子系统颜色
```rust
use bevy_color::{LinearRgba, ColorCurve};

fn setup_fire_particles() -> ColorCurve<LinearRgba> {
    ColorCurve::new(vec![
        LinearRgba::rgb(1.0, 1.0, 0.8),  // 白热
        LinearRgba::rgb(1.0, 0.8, 0.2),  // 黄色
        LinearRgba::rgb(1.0, 0.4, 0.1),  // 橙色
        LinearRgba::rgb(0.8, 0.1, 0.0),  // 红色
        LinearRgba::rgb(0.2, 0.0, 0.0),  // 深红
    ]).unwrap()
}
```

## 9. 性能优化建议

### 9.1 颜色空间选择
- **GPU渲染**：使用`LinearRgba`以避免重复转换
- **UI设计**：使用`Srgba`保持设计一致性
- **颜色操作**：使用`Oklcha`获得感知均匀性
- **艺术创作**：使用`Hsla`便于调整

### 9.2 避免不必要转换
```rust
// ❌ 不推荐：重复转换
let color1: Hsla = srgb_color.into();
let color2: Oklcha = color1.into();

// ✅ 推荐：直接转换
let color2: Oklcha = srgb_color.into();
```

### 9.3 批量操作
```rust
// 对于大量颜色操作，考虑保持在同一颜色空间
let mut hsla_colors: Vec<Hsla> = rgb_colors
    .into_iter()
    .map(|c| c.into())
    .collect();

// 在HSL空间进行所有操作
for color in &mut hsla_colors {
    *color = color.with_saturation(0.8);
}
```

## 10. 扩展和自定义

### 10.1 实现自定义颜色空间
```rust
use bevy_color::{StandardColor, Alpha, Mix, Luminance};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MyColorSpace {
    pub component1: f32,
    pub component2: f32,
    pub component3: f32,
    pub alpha: f32,
}

impl StandardColor for MyColorSpace {}

// 实现必要的转换traits
impl From<Srgba> for MyColorSpace { /* ... */ }
impl Into<Srgba> for MyColorSpace { /* ... */ }
// 实现其他标准转换...

impl Alpha for MyColorSpace {
    fn alpha(&self) -> f32 { self.alpha }
    fn with_alpha(&self, alpha: f32) -> Self {
        Self { alpha, ..*self }
    }
}
```

### 10.2 自定义调色板
```rust
pub mod my_palette {
    use bevy_color::Srgba;

    pub const BRAND_PRIMARY: Srgba = Srgba::rgb(0.2, 0.4, 0.8);
    pub const BRAND_SECONDARY: Srgba = Srgba::rgb(0.8, 0.4, 0.2);
    pub const BRAND_ACCENT: Srgba = Srgba::rgb(0.4, 0.8, 0.2);
}
```

## 总结

`bevy_color` 提供了一个功能完整且高性能的颜色处理系统，支持现代色彩科学的最佳实践。通过提供多种颜色空间、丰富的操作API和seamless的集成，它使得在Bevy应用中处理颜色变得简单而强大。

关键优势：
- **现代色彩科学**：基于Oklab等感知均匀空间
- **类型安全**：强类型系统防止错误
- **高性能**：no_std兼容，最小化转换开销
- **易用性**：直观的API和丰富的预设
- **可扩展性**：支持自定义颜色空间和操作

这个系统为创建视觉上吸引人且技术上准确的游戏和应用提供了坚实的基础。