# Bevy Camera 模块详细文档

## 模块概述

`bevy_camera` 是 Bevy 引擎的核心摄像机系统，提供了完整的摄像机抽象和渲染管道支持。该模块负责定义摄像机的属性、投影方式、视口配置以及可见性检测等功能。

### 主要功能
- 摄像机组件定义和配置
- 透视投影和正交投影支持
- 自定义投影系统
- 视口和渲染目标管理
- 视锥体剔除和可见性检测
- 2D/3D 摄像机预设
- 清除颜色配置
- 曝光设置

## 核心结构体和枚举

### 1. Camera - 摄像机核心组件

```rust
#[derive(Component, Debug, Reflect, Clone)]
pub struct Camera {
    pub viewport: Option<Viewport>,
    pub order: isize,
    pub is_active: bool,
    pub computed: ComputedCameraValues,
    pub target: RenderTarget,
    pub output_mode: CameraOutputMode,
    pub msaa_writeback: bool,
    pub clear_color: ClearColorConfig,
    pub sub_camera_view: Option<SubCameraView>,
}
```

**功能说明：**
- `viewport`: 可选的视口配置，定义摄像机在渲染目标中的渲染区域
- `order`: 摄像机渲染顺序，数值越高越后渲染（在上层）
- `is_active`: 是否激活该摄像机
- `computed`: 计算得出的摄像机值，如投影矩阵等
- `target`: 渲染目标（窗口、纹理等）
- `output_mode`: 输出模式配置
- `msaa_writeback`: MSAA 写回配置
- `clear_color`: 清除颜色配置
- `sub_camera_view`: 子摄像机视图配置（用于多显示器等场景）

### 2. Projection - 投影系统

```rust
#[derive(Component, Debug, Clone, Reflect, From)]
pub enum Projection {
    Perspective(PerspectiveProjection),
    Orthographic(OrthographicProjection),
    Custom(CustomProjection),
}
```

#### 2.1 PerspectiveProjection - 透视投影

```rust
pub struct PerspectiveProjection {
    pub fov: f32,           // 垂直视野角（弧度）
    pub aspect_ratio: f32,  // 宽高比
    pub near: f32,          // 近平面距离
    pub far: f32,           // 远平面距离
}
```

**默认值：**
- `fov`: π/4 (45度)
- `aspect_ratio`: 1.0
- `near`: 0.1
- `far`: 1000.0

#### 2.2 OrthographicProjection - 正交投影

```rust
pub struct OrthographicProjection {
    pub near: f32,
    pub far: f32,
    pub viewport_origin: Vec2,
    pub scaling_mode: ScalingMode,
    pub scale: f32,
    pub area: Rect,
}
```

### 3. ScalingMode - 缩放模式

```rust
pub enum ScalingMode {
    WindowSize,                                    // 匹配窗口大小
    Fixed { width: f32, height: f32 },            // 固定尺寸
    AutoMin { min_width: f32, min_height: f32 },  // 自动最小尺寸
    AutoMax { max_width: f32, max_height: f32 },  // 自动最大尺寸
    FixedVertical { viewport_height: f32 },       // 固定高度
    FixedHorizontal { viewport_width: f32 },      // 固定宽度
}
```

### 4. 摄像机类型组件

#### 4.1 Camera2d - 2D摄像机

```rust
#[derive(Component, Default, Reflect, Clone)]
pub struct Camera2d;
```

自动配置正交投影，适用于2D渲染。

#### 4.2 Camera3d - 3D摄像机

```rust
pub struct Camera3d {
    pub depth_load_op: Camera3dDepthLoadOp,
    pub depth_texture_usages: Camera3dDepthTextureUsage,
    pub screen_space_specular_transmission_steps: usize,
    pub screen_space_specular_transmission_quality: ScreenSpaceTransmissionQuality,
}
```

### 5. 视口和渲染目标

#### 5.1 Viewport - 视口配置

```rust
pub struct Viewport {
    pub physical_position: UVec2,  // 物理位置
    pub physical_size: UVec2,      // 物理尺寸
    pub depth: Range<f32>,         // 深度范围
}
```

#### 5.2 RenderTarget - 渲染目标

```rust
pub enum RenderTarget {
    Window(WindowRef),                      // 窗口
    Image(ImageRenderTarget),               // 图像纹理
    TextureView(ManualTextureViewHandle),   // 纹理视图
    None { size: UVec2 },                   // 无颜色目标
}
```

### 6. 可见性系统

#### 6.1 Visibility - 可见性枚举

```rust
pub enum Visibility {
    Inherited,  // 继承父级可见性
    Hidden,     // 隐藏
    Visible,    // 可见
}
```

#### 6.2 Frustum - 视锥体

```rust
pub struct Frustum {
    pub half_spaces: [HalfSpace; 6],
}
```

用于视锥体剔除，提高渲染性能。

## 主要API使用示例

### 1. 创建基本的3D摄像机

```rust
use bevy::prelude::*;
use bevy_camera::*;

fn setup_camera(mut commands: Commands) {
    // 创建3D摄像机
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 5.0, 10.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));
}
```

### 2. 创建自定义视口的摄像机

```rust
fn setup_split_screen_cameras(mut commands: Commands) {
    // 左侧摄像机
    commands.spawn((
        Camera3d::default(),
        Camera {
            viewport: Some(Viewport {
                physical_position: UVec2::new(0, 0),
                physical_size: UVec2::new(400, 600),
                depth: 0.0..1.0,
            }),
            order: 1,
            ..default()
        },
        Transform::from_xyz(-2.0, 2.0, 5.0),
    ));

    // 右侧摄像机
    commands.spawn((
        Camera3d::default(),
        Camera {
            viewport: Some(Viewport {
                physical_position: UVec2::new(400, 0),
                physical_size: UVec2::new(400, 600),
                depth: 0.0..1.0,
            }),
            order: 2,
            ..default()
        },
        Transform::from_xyz(2.0, 2.0, 5.0),
    ));
}
```

### 3. 配置正交投影摄像机

```rust
fn setup_orthographic_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d::default(),
        Projection::Orthographic(OrthographicProjection {
            scaling_mode: ScalingMode::FixedVertical { viewport_height: 10.0 },
            scale: 0.5,
            ..OrthographicProjection::default_2d()
        }),
    ));
}
```

### 4. 世界坐标与屏幕坐标转换

```rust
fn coordinate_conversion_system(
    cameras: Query<(&Camera, &GlobalTransform)>,
    windows: Query<&Window>,
) {
    let (camera, camera_transform) = cameras.single();
    let window = windows.single();

    // 世界坐标转屏幕坐标
    let world_pos = Vec3::new(1.0, 2.0, 3.0);
    if let Ok(screen_pos) = camera.world_to_viewport(camera_transform, world_pos) {
        println!("屏幕坐标: {:?}", screen_pos);
    }

    // 屏幕坐标转世界射线
    if let Some(cursor_pos) = window.cursor_position() {
        if let Ok(ray) = camera.viewport_to_world(camera_transform, cursor_pos) {
            println!("射线: {:?}", ray);
        }
    }
}
```

### 5. 自定义清除颜色

```rust
fn setup_camera_with_clear_color(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera {
            clear_color: ClearColorConfig::Custom(Color::srgb(0.1, 0.2, 0.3)),
            ..default()
        },
    ));
}
```

### 6. 渲染到纹理

```rust
fn setup_render_to_texture(
    mut commands: Commands,
    mut images: ResMut<Assets<Image>>,
) {
    // 创建渲染目标纹理
    let size = Extent3d {
        width: 512,
        height: 512,
        depth_or_array_layers: 1,
    };

    let mut image = Image {
        texture_descriptor: TextureDescriptor {
            label: None,
            size,
            dimension: TextureDimension::D2,
            format: TextureFormat::Bgra8UnormSrgb,
            mip_level_count: 1,
            sample_count: 1,
            usage: TextureUsages::TEXTURE_BINDING
                | TextureUsages::COPY_DST
                | TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        },
        ..default()
    };
    image.resize(size);

    let image_handle = images.add(image);

    // 创建渲染到纹理的摄像机
    commands.spawn((
        Camera3d::default(),
        Camera {
            target: RenderTarget::Image(image_handle.into()),
            ..default()
        },
    ));
}
```

## 与其他Bevy模块的集成方式

### 1. 与Transform系统集成

摄像机使用 `Transform` 和 `GlobalTransform` 组件来定义位置、旋转和缩放：

```rust
// 摄像机变换系统
fn move_camera_system(
    mut cameras: Query<&mut Transform, With<Camera3d>>,
    time: Res<Time>,
) {
    for mut transform in cameras.iter_mut() {
        transform.translation.x = time.elapsed_seconds().sin() * 5.0;
    }
}
```

### 2. 与Window系统集成

摄像机可以渲染到特定窗口：

```rust
use bevy_window::WindowRef;

fn setup_multi_window_cameras(mut commands: Commands) {
    // 主窗口摄像机
    commands.spawn((
        Camera3d::default(),
        Camera {
            target: RenderTarget::Window(WindowRef::Primary),
            ..default()
        },
    ));
}
```

### 3. 与Asset系统集成

渲染到纹理资源：

```rust
fn render_to_image_asset(
    mut commands: Commands,
    images: Res<Assets<Image>>,
    image_handle: Res<MyImageHandle>,
) {
    commands.spawn((
        Camera3d::default(),
        Camera {
            target: RenderTarget::Image(image_handle.0.clone().into()),
            ..default()
        },
    ));
}
```

### 4. 与渲染管道集成

摄像机系统在以下调度中运行：

- `PostUpdate::VisibilityPropagate`: 可见性传播
- `PostUpdate::CheckVisibility`: 可见性检查
- `PostUpdate::UpdateFrusta`: 视锥体更新

## 常见使用场景

### 1. 多摄像机渲染

```rust
fn setup_multiple_cameras(mut commands: Commands) {
    // 主摄像机 - 3D场景
    commands.spawn((
        Camera3d::default(),
        Camera {
            order: 0,
            clear_color: ClearColorConfig::Custom(Color::srgb(0.1, 0.1, 0.1)),
            ..default()
        },
        Transform::from_xyz(0.0, 5.0, 10.0),
    ));

    // UI摄像机 - 覆盖在3D场景上
    commands.spawn((
        Camera2d::default(),
        Camera {
            order: 1,
            clear_color: ClearColorConfig::None,
            ..default()
        },
    ));
}
```

### 2. 小地图摄像机

```rust
fn setup_minimap_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera {
            viewport: Some(Viewport {
                physical_position: UVec2::new(10, 10),
                physical_size: UVec2::new(200, 200),
                depth: 0.0..1.0,
            }),
            order: 10,
            ..default()
        },
        Transform::from_xyz(0.0, 50.0, 0.0).looking_down(),
    ));
}
```

### 3. 第一人称摄像机

```rust
fn setup_first_person_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Projection::Perspective(PerspectiveProjection {
            fov: 70.0_f32.to_radians(),
            ..default()
        }),
        Transform::from_xyz(0.0, 1.8, 0.0), // 人眼高度
    ));
}
```

### 4. 监控摄像机系统

```rust
fn setup_security_cameras(mut commands: Commands) {
    let positions = [
        Vec3::new(-10.0, 5.0, -10.0),
        Vec3::new(10.0, 5.0, -10.0),
        Vec3::new(-10.0, 5.0, 10.0),
        Vec3::new(10.0, 5.0, 10.0),
    ];

    for (i, pos) in positions.iter().enumerate() {
        commands.spawn((
            Camera3d::default(),
            Camera {
                viewport: Some(Viewport {
                    physical_position: UVec2::new(
                        (i % 2) as u32 * 320,
                        (i / 2) as u32 * 240,
                    ),
                    physical_size: UVec2::new(320, 240),
                    depth: 0.0..1.0,
                }),
                order: i as isize,
                ..default()
            },
            Transform::from_translation(*pos).looking_at(Vec3::ZERO, Vec3::Y),
        ));
    }
}
```

### 5. 动态摄像机切换

```rust
#[derive(Component)]
struct CameraController {
    active_camera: usize,
    cameras: Vec<Entity>,
}

fn switch_camera_system(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut cameras: Query<&mut Camera>,
    mut controller: Query<&mut CameraController>,
) {
    if keyboard.just_pressed(KeyCode::Tab) {
        let mut controller = controller.single_mut();

        // 禁用当前摄像机
        if let Ok(mut camera) = cameras.get_mut(controller.cameras[controller.active_camera]) {
            camera.is_active = false;
        }

        // 切换到下一个摄像机
        controller.active_camera = (controller.active_camera + 1) % controller.cameras.len();

        // 启用新摄像机
        if let Ok(mut camera) = cameras.get_mut(controller.cameras[controller.active_camera]) {
            camera.is_active = true;
        }
    }
}
```

## 最佳实践

### 1. 性能优化
- 使用适当的视锥体剔除配置
- 合理设置摄像机渲染顺序
- 避免不必要的摄像机激活

### 2. 内存管理
- 及时清理不使用的渲染目标纹理
- 复用摄像机组件而非频繁创建销毁

### 3. 可维护性
- 使用组件查询而非直接访问摄像机
- 将摄像机配置参数化
- 使用系统集合理组织摄像机相关系统

这个 `bevy_camera` 模块为 Bevy 引擎提供了强大而灵活的摄像机系统，支持各种复杂的渲染场景和需求。通过合理使用这些API，可以实现丰富的视觉效果和用户体验。