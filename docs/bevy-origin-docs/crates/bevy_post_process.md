# Bevy Post Process 后处理系统文档

## 1. 模块概述和主要功能

`bevy_post_process` 是 Bevy 引擎中的后处理效果模块，提供了多种高质量的视觉后处理效果。该模块包含以下核心功能：

### 主要特性
- **Bloom（泛光）**: 模拟真实相机和人眼在明亮场景中产生的光晕效果
- **Motion Blur（运动模糊）**: 基于每像素运动向量的运动模糊效果
- **Depth of Field（景深）**: 模拟相机镜头的焦点效果，实现景深模糊
- **Auto Exposure（自动曝光）**: 自动调整相机曝光以适应不同光照条件
- **Chromatic Aberration（色差）**: 模拟镜头的色彩分离效果
- **Effect Stack（效果栈）**: 组合多种后处理效果的管理系统
- **MSAA Writeback（多重采样写回）**: MSAA渲染管线的写回支持

### 渲染管线集成
该模块深度集成到 Bevy 的渲染图中，支持 2D 和 3D 渲染管线，并与现有的渲染系统协同工作。

## 2. 核心结构体和枚举说明

### 2.1 Bloom 泛光效果

#### `Bloom` 组件
```rust
#[derive(Component, Reflect, Clone)]
pub struct Bloom {
    pub intensity: f32,                          // 泛光强度 (0.0-1.0)
    pub low_frequency_boost: f32,                // 低频增强 (0.0-1.0)
    pub low_frequency_boost_curvature: f32,      // 低频增强曲率 (0.0-1.0)
    pub high_pass_frequency: f32,                // 高通频率 (0.0-1.0)
    pub prefilter: BloomPrefilter,               // 预过滤设置
    pub composite_mode: BloomCompositeMode,      // 混合模式
    pub max_mip_dimension: u32,                  // 最大mip尺寸
    pub scale: Vec2,                             // 缩放比例
}
```

#### `BloomCompositeMode` 混合模式
```rust
pub enum BloomCompositeMode {
    EnergyConserving,  // 能量守恒模式（物理正确）
    Additive,          // 加法混合模式（艺术效果）
}
```

#### 预设配置
- `Bloom::NATURAL`: 默认自然泛光效果
- `Bloom::ANAMORPHIC`: 模拟变形镜头的水平拉伸泛光
- `Bloom::OLD_SCHOOL`: 复古游戏风格泛光
- `Bloom::SCREEN_BLUR`: 全屏模糊效果

### 2.2 Motion Blur 运动模糊

#### `MotionBlur` 组件
```rust
#[derive(Component, Clone)]
pub struct MotionBlur {
    pub shutter_angle: f32,  // 快门角度 (0.0-1.0+)
    pub samples: u32,        // 采样质量 (0-无限制)
}
```

- `shutter_angle`: 控制运动模糊强度，0.5 对应 180° 快门角度（电影标准）
- `samples`: 每像素采样次数，影响质量和性能

### 2.3 Depth of Field 景深

#### `DepthOfField` 组件
```rust
#[derive(Component, Clone, Copy)]
pub struct DepthOfField {
    pub mode: DepthOfFieldMode,                    // 景深模式
    pub focal_distance: f32,                       // 焦距 (米)
    pub sensor_height: f32,                        // 传感器高度 (米)
    pub aperture_f_stops: f32,                     // 光圈值
    pub max_circle_of_confusion_diameter: f32,     // 最大弥散圆直径 (像素)
    pub max_depth: f32,                            // 最大深度
}
```

#### `DepthOfFieldMode` 景深模式
```rust
pub enum DepthOfFieldMode {
    Bokeh,     // 散景模式（更真实，不支持 WebGPU）
    Gaussian,  // 高斯模糊模式（性能更好，支持 WebGPU）
}
```

### 2.4 Auto Exposure 自动曝光

#### `AutoExposure` 组件
```rust
#[derive(Component, Clone)]
pub struct AutoExposure {
    pub range: RangeInclusive<f32>,              // 曝光值范围
    pub filter: RangeInclusive<f32>,             // 直方图过滤范围
    pub speed_brighten: f32,                     // 变亮适应速度 (EV/秒)
    pub speed_darken: f32,                       // 变暗适应速度 (EV/秒)
    pub exponential_transition_distance: f32,    // 指数过渡距离
    pub metering_mask: Handle<Image>,             // 测光遮罩
    pub compensation_curve: Handle<AutoExposureCompensationCurve>, // 补偿曲线
}
```

### 2.5 Chromatic Aberration 色差

#### `ChromaticAberration` 组件
```rust
#[derive(Component, Clone)]
pub struct ChromaticAberration {
    pub color_lut: Option<Handle<Image>>, // 颜色查找表
    pub intensity: f32,                   // 效果强度
    pub max_samples: u32,                 // 最大采样数
}
```

## 3. 主要API使用示例

### 3.1 基础 Bloom 设置

```rust
use bevy::prelude::*;
use bevy_post_process::bloom::Bloom;

fn setup_bloom_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        // 使用默认自然泛光
        Bloom::default(),
    ));
}

// 使用预设配置
fn setup_anamorphic_bloom(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom::ANAMORPHIC,
    ));
}

// 自定义泛光配置
fn setup_custom_bloom(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom {
            intensity: 0.3,
            low_frequency_boost: 0.8,
            composite_mode: BloomCompositeMode::Additive,
            ..Bloom::default()
        },
    ));
}
```

### 3.2 Motion Blur 运动模糊

```rust
use bevy_post_process::motion_blur::MotionBlur;

fn setup_motion_blur_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        MotionBlur {
            shutter_angle: 0.5,  // 180° 快门角度
            samples: 4,          // 中等质量
        },
    ));
}

// 高质量运动模糊
fn setup_high_quality_motion_blur(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        MotionBlur {
            shutter_angle: 0.75, // 270° 快门角度
            samples: 8,          // 高质量采样
        },
    ));
}
```

### 3.3 Depth of Field 景深效果

```rust
use bevy_post_process::dof::{DepthOfField, DepthOfFieldMode};

fn setup_depth_of_field_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        DepthOfField {
            mode: DepthOfFieldMode::Bokeh,
            focal_distance: 5.0,    // 5米焦距
            aperture_f_stops: 2.8,  // f/2.8 光圈
            sensor_height: 0.024,   // 24mm 传感器
            ..DepthOfField::default()
        },
    ));
}

// 从物理相机参数创建景深
fn setup_physical_dof(mut commands: Commands) {
    let physical_camera = PhysicalCameraParameters {
        aperture_f_stops: 1.4,
        sensor_height: 0.036, // 35mm
        ..default()
    };

    commands.spawn((
        Camera3d::default(),
        DepthOfField::from_physical_camera(&physical_camera),
    ));
}
```

### 3.4 Auto Exposure 自动曝光

```rust
use bevy_post_process::auto_exposure::AutoExposure;

fn setup_auto_exposure_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        AutoExposure {
            range: -4.0..=6.0,      // 曝光范围
            filter: 0.15..=0.85,    // 忽略最暗和最亮的部分
            speed_brighten: 2.0,    // 适应速度
            speed_darken: 1.0,
            ..AutoExposure::default()
        },
    ));
}
```

### 3.5 Chromatic Aberration 色差

```rust
use bevy_post_process::effect_stack::ChromaticAberration;

fn setup_chromatic_aberration_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        ChromaticAberration {
            intensity: 0.05,     // 轻微色差
            max_samples: 16,     // 高质量
            color_lut: None,     // 使用默认RGB梯度
        },
    ));
}
```

### 3.6 组合多种效果

```rust
fn setup_full_post_process_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        // HDR 渲染（多数效果需要）
        Hdr,
        // 泛光效果
        Bloom::NATURAL,
        // 运动模糊
        MotionBlur {
            shutter_angle: 0.5,
            samples: 3,
        },
        // 景深
        DepthOfField {
            focal_distance: 10.0,
            aperture_f_stops: 4.0,
            ..DepthOfField::default()
        },
        // 自动曝光
        AutoExposure::default(),
        // 色差
        ChromaticAberration {
            intensity: 0.02,
            ..ChromaticAberration::default()
        },
    ));
}
```

### 3.7 运行时动态调整

```rust
fn adjust_bloom_intensity(
    mut bloom_query: Query<&mut Bloom>,
    keyboard: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
) {
    for mut bloom in bloom_query.iter_mut() {
        if keyboard.pressed(KeyCode::ArrowUp) {
            bloom.intensity = (bloom.intensity + time.delta_secs()).min(2.0);
        }
        if keyboard.pressed(KeyCode::ArrowDown) {
            bloom.intensity = (bloom.intensity - time.delta_secs()).max(0.0);
        }
    }
}

fn adjust_depth_of_field_focus(
    mut dof_query: Query<&mut DepthOfField>,
    keyboard: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
) {
    for mut dof in dof_query.iter_mut() {
        if keyboard.pressed(KeyCode::KeyW) {
            dof.focal_distance += time.delta_secs() * 5.0;
        }
        if keyboard.pressed(KeyCode::KeyS) {
            dof.focal_distance = (dof.focal_distance - time.delta_secs() * 5.0).max(0.1);
        }
    }
}
```

## 4. 与其他Bevy模块的集成方式

### 4.1 渲染管线集成

```rust
use bevy_post_process::PostProcessPlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(PostProcessPlugin) // 添加后处理插件
        .run();
}
```

### 4.2 相机系统集成

后处理效果通过组件系统与相机深度集成：

```rust
// 相机组件自动包含必需的依赖
use bevy_core_pipeline::prepass::{DepthPrepass, MotionVectorPrepass};

#[require(DepthPrepass, MotionVectorPrepass)] // 运动模糊需要
pub struct MotionBlur { ... }

#[require(Hdr)] // 泛光和自动曝光需要HDR
pub struct Bloom { ... }
```

### 4.3 渲染图节点

每个效果在渲染图中都有特定的位置：

```
StartMainPassPostProcessing
├─ MsaaWriteback
├─ MotionBlur
├─ Bloom
├─ DepthOfField
├─ PostProcessing (Chromatic Aberration)
├─ AutoExposure
└─ Tonemapping
```

### 4.4 资源系统集成

```rust
// 加载自定义色差查找表
fn load_custom_chromatic_aberration_lut(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    let custom_lut: Handle<Image> = asset_server.load("textures/chromatic_aberration_lut.png");

    commands.spawn((
        Camera3d::default(),
        ChromaticAberration {
            color_lut: Some(custom_lut),
            ..ChromaticAberration::default()
        },
    ));
}

// 加载自动曝光补偿曲线
fn load_auto_exposure_curve(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    let compensation_curve: Handle<AutoExposureCompensationCurve> =
        asset_server.load("curves/exposure_compensation.ron");

    commands.spawn((
        Camera3d::default(),
        AutoExposure {
            compensation_curve,
            ..AutoExposure::default()
        },
    ));
}
```

## 5. 常见使用场景

### 5.1 游戏场景类型

#### 科幻/赛博朋克场景
```rust
fn setup_cyberpunk_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom {
            intensity: 0.4,
            composite_mode: BloomCompositeMode::Additive,
            ..Bloom::default()
        },
        ChromaticAberration {
            intensity: 0.08,
            ..ChromaticAberration::default()
        },
        MotionBlur {
            shutter_angle: 0.3,
            samples: 6,
        },
    ));
}
```

#### 恐怖游戏场景
```rust
fn setup_horror_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        ChromaticAberration {
            intensity: 0.15, // 强烈色差营造不安感
            ..ChromaticAberration::default()
        },
        DepthOfField {
            mode: DepthOfFieldMode::Gaussian,
            focal_distance: 3.0,
            aperture_f_stops: 1.4, // 浅景深
            ..DepthOfField::default()
        },
    ));
}
```

#### 竞速游戏
```rust
fn setup_racing_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        MotionBlur {
            shutter_angle: 0.8, // 强烈运动模糊
            samples: 8,
        },
        Bloom::ANAMORPHIC, // 变形镜头效果
    ));
}
```

#### 电影化视觉
```rust
fn setup_cinematic_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        DepthOfField {
            mode: DepthOfFieldMode::Bokeh,
            focal_distance: 8.0,
            aperture_f_stops: 2.8,
            ..DepthOfField::default()
        },
        AutoExposure {
            speed_brighten: 1.5,
            speed_darken: 0.8,
            ..AutoExposure::default()
        },
        Bloom::NATURAL,
    ));
}
```

### 5.2 性能配置场景

#### 高性能配置（移动设备）
```rust
fn setup_performance_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom {
            intensity: 0.2,
            max_mip_dimension: 256, // 降低分辨率
            composite_mode: BloomCompositeMode::EnergyConserving,
            ..Bloom::default()
        },
        DepthOfField {
            mode: DepthOfFieldMode::Gaussian, // 使用更快的高斯模式
            max_circle_of_confusion_diameter: 32.0, // 降低质量
            ..DepthOfField::default()
        },
    ));
}
```

#### 高质量配置（PC/主机）
```rust
fn setup_quality_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom {
            intensity: 0.25,
            max_mip_dimension: 1024, // 高分辨率
            ..Bloom::default()
        },
        DepthOfField {
            mode: DepthOfFieldMode::Bokeh, // 使用更真实的散景模式
            max_circle_of_confusion_diameter: 128.0, // 高质量
            ..DepthOfField::default()
        },
        MotionBlur {
            shutter_angle: 0.5,
            samples: 12, // 高采样数
        },
        AutoExposure::default(),
    ));
}
```

### 5.3 艺术风格场景

#### 梦幻风格
```rust
fn setup_dreamy_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom::SCREEN_BLUR, // 全屏模糊效果
        DepthOfField {
            focal_distance: 5.0,
            aperture_f_stops: 1.0, // 极浅景深
            ..DepthOfField::default()
        },
    ));
}
```

#### 复古游戏风格
```rust
fn setup_retro_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Bloom::OLD_SCHOOL,
        ChromaticAberration {
            intensity: 0.03,
            max_samples: 4, // 降低质量模拟老式显示器
            ..ChromaticAberration::default()
        },
    ));
}
```

## 6. 平台兼容性和限制

### 6.1 平台支持

| 效果 | 原生平台 | WebGPU | WebGL2 | 备注 |
|------|----------|--------|--------|------|
| Bloom | ✅ | ✅ | ❌ | WebGL2 不支持 |
| Motion Blur | ✅ | ✅ | ✅ | 需要运动向量预通道 |
| Depth of Field (Gaussian) | ✅ | ✅ | ✅ | |
| Depth of Field (Bokeh) | ✅ | ❌ | ❌ | 需要多重渲染目标 |
| Auto Exposure | ✅ | ✅ | ❌ | 需要计算着色器 |
| Chromatic Aberration | ✅ | ✅ | ✅ | |

### 6.2 性能考虑

- **GPU 内存**: 后处理效果会增加 GPU 内存使用
- **填充率**: 全屏效果对填充率要求较高
- **计算资源**: 自动曝光需要计算着色器支持
- **多重采样**: 某些效果与 MSAA 配合使用时性能影响更大

### 6.3 使用建议

1. **渐进式启用**: 从单一效果开始，逐步添加其他效果
2. **性能测试**: 在目标平台上测试性能表现
3. **用户设置**: 提供效果质量设置选项
4. **平台检测**: 根据平台能力动态启用/禁用效果

通过合理使用这些后处理效果，可以显著提升 Bevy 应用的视觉质量和艺术表现力。