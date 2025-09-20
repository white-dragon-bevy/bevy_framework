# Bevy Gizmos 模块详细文档

## 模块概述

`bevy_gizmos` 是 Bevy 引擎中提供立即模式绘制 API 的模块，主要用于视觉调试和开发工具。该模块允许开发者在游戏世界中绘制各种几何图形，如线条、圆形、箭头、网格等，用于调试游戏逻辑、显示碰撞盒、路径可视化等。

### 主要功能

1. **立即模式绘制**：每帧都需要重新调用绘制函数，适合动态调试
2. **2D/3D 支持**：同时支持 2D 和 3D 图形绘制
3. **多种图形**：线条、圆形、矩形、箭头、网格、基本几何体等
4. **配置系统**：灵活的配置组系统，支持不同场景的样式设置
5. **渲染集成**：与 Bevy 的渲染管道深度集成

### 核心概念

- **Gizmos**：主要的绘制接口，作为系统参数使用
- **GizmoConfig**：控制 gizmo 的外观和行为的配置
- **GizmoConfigGroup**：允许为不同用途创建独立的配置组
- **GizmoBuffer**：存储顶点数据的缓冲区

## 核心结构体和枚举

### 1. Gizmos&lt;Config, Clear&gt;

主要的绘制接口，作为系统参数使用。

```rust
pub struct Gizmos<'w, 's, Config = DefaultGizmoConfigGroup, Clear = ()>
where
    Config: GizmoConfigGroup,
    Clear: 'static + Send + Sync,
{
    buffer: Deferred<'s, GizmoBuffer<Config, Clear>>,
    pub config: &'w GizmoConfig,
    pub config_ext: &'w Config,
}
```

**特点：**
- 泛型参数 `Config` 允许使用不同的配置组
- `Clear` 参数用于控制清除上下文
- 提供对当前配置的访问

### 2. GizmoConfig

控制 gizmo 外观和行为的主要配置结构体。

```rust
pub struct GizmoConfig {
    /// 是否启用 gizmo 绘制
    pub enabled: bool,
    /// 线条相关设置
    pub line: GizmoLineConfig,
    /// 深度偏移，控制 gizmo 相对于其他几何体的渲染顺序
    pub depth_bias: f32,
    /// 渲染层设置
    pub render_layers: RenderLayers,
}
```

### 3. GizmoLineConfig

专门配置线条样式的结构体。

```rust
pub struct GizmoLineConfig {
    /// 线宽（像素）
    pub width: f32,
    /// 是否应用透视
    pub perspective: bool,
    /// 线条样式
    pub style: GizmoLineStyle,
    /// 线条连接方式
    pub joints: GizmoLineJoint,
}
```

### 4. GizmoLineStyle 枚举

定义线条的视觉样式。

```rust
pub enum GizmoLineStyle {
    /// 实线
    Solid,
    /// 点线
    Dotted,
    /// 虚线，可配置间隙和线段比例
    Dashed {
        gap_scale: f32,
        line_scale: f32,
    },
}
```

### 5. GizmoLineJoint 枚举

定义线条连接处的样式。

```rust
pub enum GizmoLineJoint {
    /// 不绘制连接
    None,
    /// 尖角连接
    Miter,
    /// 圆角连接，参数为分辨率
    Round(u32),
    /// 斜角连接
    Bevel,
}
```

### 6. GizmoConfigGroup trait

用于创建配置组的 trait。

```rust
pub trait GizmoConfigGroup: Reflect + TypePath + Default {}
```

### 7. DefaultGizmoConfigGroup

默认的配置组。

```rust
#[derive(Default, Reflect, GizmoConfigGroup)]
pub struct DefaultGizmoConfigGroup;
```

## 主要 API 使用示例

### 基本线条绘制

```rust
use bevy::prelude::*;
use bevy_gizmos::prelude::*;

fn draw_lines(mut gizmos: Gizmos) {
    // 3D 线条
    gizmos.line(Vec3::ZERO, Vec3::X, Color::RED);

    // 2D 线条
    gizmos.line_2d(Vec2::ZERO, Vec2::X, Color::GREEN);

    // 渐变线条
    gizmos.line_gradient(
        Vec3::ZERO,
        Vec3::Y,
        Color::BLUE,
        Color::YELLOW
    );

    // 射线（从起点沿向量方向）
    gizmos.ray(Vec3::ZERO, Vec3::Z, Color::PURPLE);
}
```

### 多段线绘制

```rust
fn draw_polylines(mut gizmos: Gizmos) {
    // 连续线段
    let points = vec![
        Vec3::ZERO,
        Vec3::X,
        Vec3::X + Vec3::Y,
        Vec3::Y
    ];
    gizmos.linestrip(points, Color::ORANGE);

    // 渐变多段线
    let gradient_points = vec![
        (Vec3::ZERO, Color::RED),
        (Vec3::X, Color::GREEN),
        (Vec3::Y, Color::BLUE),
    ];
    gizmos.linestrip_gradient(gradient_points);
}
```

### 基本几何图形

```rust
fn draw_shapes(mut gizmos: Gizmos) {
    // 矩形
    gizmos.rect(
        Isometry3d::IDENTITY,
        Vec2::new(2.0, 1.0),
        Color::CYAN
    );

    // 2D 矩形
    gizmos.rect_2d(
        Isometry2d::IDENTITY,
        Vec2::ONE,
        Color::MAGENTA
    );

    // 立方体
    gizmos.cuboid(Transform::IDENTITY, Color::WHITE);
}
```

### 圆形和椭圆

```rust
fn draw_circles(mut gizmos: Gizmos) {
    // 圆形（默认32段）
    gizmos.circle(
        Isometry3d::IDENTITY,
        1.0,
        Color::RED
    );

    // 高分辨率圆形
    gizmos.circle(Isometry3d::IDENTITY, 2.0, Color::GREEN)
        .resolution(64);

    // 椭圆
    gizmos.ellipse(
        Isometry3d::IDENTITY,
        Vec2::new(2.0, 1.0),
        Color::BLUE
    );

    // 2D 圆形
    gizmos.circle_2d(Vec2::ZERO, 1.0, Color::YELLOW);
}
```

### 圆弧绘制

```rust
use std::f32::consts::FRAC_PI_4;

fn draw_arcs(mut gizmos: Gizmos) {
    // 2D 圆弧
    gizmos.arc_2d(
        Isometry2d::IDENTITY,
        FRAC_PI_4,  // 弧度
        1.0,        // 半径
        Color::ORANGE
    );

    // 3D 圆弧
    gizmos.arc_3d(
        FRAC_PI_4,
        1.0,
        Vec3::ZERO,
        Quat::IDENTITY,
        Color::PURPLE
    );
}
```

### 箭头绘制

```rust
fn draw_arrows(mut gizmos: Gizmos) {
    // 基本箭头
    gizmos.arrow(Vec3::ZERO, Vec3::X, Color::RED);

    // 自定义箭头尖端长度
    gizmos.arrow(Vec3::ZERO, Vec3::Y, Color::GREEN)
        .with_tip_length(0.5);

    // 双向箭头
    gizmos.arrow(Vec3::ZERO, Vec3::Z, Color::BLUE)
        .with_double_end();

    // 2D 箭头
    gizmos.arrow_2d(Vec2::ZERO, Vec2::X, Color::YELLOW);
}
```

### 网格绘制

```rust
fn draw_grids(mut gizmos: Gizmos) {
    // 2D 网格
    gizmos.grid_2d(
        Isometry2d::IDENTITY,
        UVec2::new(10, 10),  // 网格数量
        Vec2::splat(1.0),    // 网格大小
        Color::GRAY
    );

    // 3D 网格
    gizmos.grid_3d(
        Isometry3d::IDENTITY,
        UVec3::new(10, 1, 10),
        Vec3::splat(1.0),
        Color::DARK_GRAY
    );
}
```

### 基本几何体绘制

```rust
fn draw_primitives(mut gizmos: Gizmos) {
    // 球体线框
    gizmos.primitive_3d(
        &Sphere { radius: 1.0 },
        Isometry3d::IDENTITY,
        Color::RED
    );

    // 立方体线框
    gizmos.primitive_3d(
        &Cuboid::new(2.0, 1.0, 1.0),
        Isometry3d::IDENTITY,
        Color::GREEN
    );

    // 圆柱体线框
    gizmos.primitive_3d(
        &Cylinder { radius: 1.0, half_height: 2.0 },
        Isometry3d::IDENTITY,
        Color::BLUE
    );
}
```

## 配置系统详解

### 创建自定义配置组

```rust
#[derive(Default, Reflect, GizmoConfigGroup)]
struct MyGizmoGroup;

fn setup_custom_gizmos(app: &mut App) {
    app.init_gizmo_group::<MyGizmoGroup>();
}

fn use_custom_gizmos(mut gizmos: Gizmos<MyGizmoGroup>) {
    gizmos.line(Vec3::ZERO, Vec3::X, Color::RED);
}
```

### 配置 Gizmo 样式

```rust
fn configure_gizmos(mut config_store: ResMut<GizmoConfigStore>) {
    let (config, _) = config_store.config_mut::<DefaultGizmoConfigGroup>();

    // 设置线宽
    config.line.width = 3.0;

    // 设置虚线样式
    config.line.style = GizmoLineStyle::Dashed {
        gap_scale: 2.0,
        line_scale: 1.0,
    };

    // 设置圆角连接
    config.line.joints = GizmoLineJoint::Round(8);

    // 启用透视
    config.line.perspective = true;

    // 设置深度偏移
    config.depth_bias = -0.001;
}
```

### 运行时切换配置

```rust
fn toggle_gizmos(
    mut config_store: ResMut<GizmoConfigStore>,
    input: Res<Input<KeyCode>>,
) {
    if input.just_pressed(KeyCode::G) {
        let (config, _) = config_store.config_mut::<DefaultGizmoConfigGroup>();
        config.enabled = !config.enabled;
    }
}
```

## 与其他 Bevy 模块的集成

### 1. 与渲染系统集成

`bevy_gizmos` 深度集成了 Bevy 的渲染管道：

- **2D 渲染**：通过 `pipeline_2d.rs` 与 `bevy_sprite_render` 集成
- **3D 渲染**：通过 `pipeline_3d.rs` 与 `bevy_pbr` 集成
- **渲染层**：支持通过 `RenderLayers` 控制可见性

### 2. 与相机系统集成

```rust
fn setup_cameras(mut commands: Commands) {
    // 3D 相机
    commands.spawn(Camera3dBundle::default());

    // 2D 相机，只渲染特定层
    commands.spawn(Camera2dBundle {
        camera: Camera {
            order: 1,
            ..default()
        },
        ..default()
    });
}
```

### 3. 与变换系统集成

```rust
fn debug_transforms(
    query: Query<&Transform, With<DebugMarker>>,
    mut gizmos: Gizmos,
) {
    for transform in &query {
        // 显示坐标轴
        gizmos.axes(transform.compute_matrix(), 1.0);

        // 显示位置
        gizmos.sphere(transform.translation, 0.1, Color::RED);
    }
}
```

### 4. 与物理系统集成

```rust
fn debug_colliders(
    query: Query<(&Transform, &Collider)>,
    mut gizmos: Gizmos,
) {
    for (transform, collider) in &query {
        match collider {
            Collider::Ball(radius) => {
                gizmos.sphere(transform.translation, *radius, Color::GREEN);
            },
            Collider::Cuboid(half_extents) => {
                gizmos.cuboid(*transform, Color::GREEN);
            },
            // 其他碰撞体类型...
        }
    }
}
```

## 高级使用场景

### 1. 性能优化

```rust
fn optimized_gizmo_system(
    mut gizmos: Gizmos,
    debug_enabled: Res<DebugEnabled>,
) {
    // 早期退出减少性能开销
    if !debug_enabled.0 {
        return;
    }

    // 绘制 gizmos...
}
```

### 2. 分层调试

```rust
#[derive(Default, Reflect, GizmoConfigGroup)]
struct PhysicsGizmos;

#[derive(Default, Reflect, GizmoConfigGroup)]
struct AIGizmos;

fn setup_debug_layers(mut app: App) {
    app.init_gizmo_group::<PhysicsGizmos>()
       .init_gizmo_group::<AIGizmos>();
}

fn draw_physics_debug(mut gizmos: Gizmos<PhysicsGizmos>) {
    // 物理相关的调试绘制
}

fn draw_ai_debug(mut gizmos: Gizmos<AIGizmos>) {
    // AI 相关的调试绘制
}
```

### 3. 动态配置

```rust
fn dynamic_gizmo_config(
    mut config_store: ResMut<GizmoConfigStore>,
    time: Res<Time>,
) {
    let (config, _) = config_store.config_mut::<DefaultGizmoConfigGroup>();

    // 动态调整线宽
    config.line.width = 2.0 + (time.elapsed_seconds().sin() + 1.0);

    // 动态切换样式
    if (time.elapsed_seconds() as u32) % 4 < 2 {
        config.line.style = GizmoLineStyle::Solid;
    } else {
        config.line.style = GizmoLineStyle::Dashed {
            gap_scale: 1.0,
            line_scale: 1.0,
        };
    }
}
```

### 4. 调试 UI 集成

```rust
fn debug_ui(
    mut contexts: EguiContexts,
    mut config_store: ResMut<GizmoConfigStore>,
) {
    egui::Window::new("Gizmo Settings").show(contexts.ctx_mut(), |ui| {
        let (config, _) = config_store.config_mut::<DefaultGizmoConfigGroup>();

        ui.checkbox(&mut config.enabled, "Enable Gizmos");
        ui.add(egui::Slider::new(&mut config.line.width, 1.0..=10.0).text("Line Width"));

        egui::ComboBox::from_label("Line Style")
            .selected_text(format!("{:?}", config.line.style))
            .show_ui(ui, |ui| {
                ui.selectable_value(&mut config.line.style, GizmoLineStyle::Solid, "Solid");
                ui.selectable_value(&mut config.line.style, GizmoLineStyle::Dotted, "Dotted");
                // 更多选项...
            });
    });
}
```

## 常见使用场景

### 1. 碰撞检测调试

```rust
fn debug_collisions(
    query: Query<(&Transform, &Collider, Option<&CollisionEvents>)>,
    mut gizmos: Gizmos,
) {
    for (transform, collider, events) in &query {
        let color = if events.is_some() && !events.unwrap().is_empty() {
            Color::RED // 有碰撞
        } else {
            Color::GREEN // 无碰撞
        };

        // 根据碰撞体类型绘制轮廓
        match collider {
            Collider::Ball(radius) => {
                gizmos.sphere(transform.translation, *radius, color);
            },
            Collider::Cuboid(half_extents) => {
                gizmos.cuboid(*transform, color);
            },
        }
    }
}
```

### 2. 路径可视化

```rust
fn visualize_paths(
    query: Query<&Path>,
    mut gizmos: Gizmos,
) {
    for path in &query {
        if path.points.len() > 1 {
            // 绘制路径线
            gizmos.linestrip(path.points.clone(), Color::BLUE);

            // 绘制路径点
            for point in &path.points {
                gizmos.sphere(*point, 0.1, Color::RED);
            }
        }
    }
}
```

### 3. 视野范围显示

```rust
fn debug_vision_ranges(
    query: Query<(&Transform, &VisionRange)>,
    mut gizmos: Gizmos,
) {
    for (transform, vision) in &query {
        // 绘制视野圆形
        gizmos.circle(
            Isometry3d::from_translation(transform.translation),
            vision.range,
            Color::YELLOW.with_a(0.3)
        );

        // 绘制视野方向
        let forward = transform.forward();
        gizmos.ray(
            transform.translation,
            forward * vision.range,
            Color::ORANGE
        );
    }
}
```

### 4. 网格和坐标系

```rust
fn debug_coordinate_system(mut gizmos: Gizmos) {
    // 绘制世界坐标轴
    gizmos.line(Vec3::ZERO, Vec3::X, Color::RED);   // X轴 - 红色
    gizmos.line(Vec3::ZERO, Vec3::Y, Color::GREEN); // Y轴 - 绿色
    gizmos.line(Vec3::ZERO, Vec3::Z, Color::BLUE);  // Z轴 - 蓝色

    // 绘制参考网格
    gizmos.grid_3d(
        Isometry3d::IDENTITY,
        UVec3::new(20, 1, 20),
        Vec3::splat(1.0),
        Color::GRAY.with_a(0.5)
    );
}
```

### 5. 性能和状态监控

```rust
fn debug_performance_zones(
    query: Query<(&Transform, &PerformanceZone)>,
    mut gizmos: Gizmos,
) {
    for (transform, zone) in &query {
        let color = match zone.load {
            LoadLevel::Low => Color::GREEN,
            LoadLevel::Medium => Color::YELLOW,
            LoadLevel::High => Color::RED,
        };

        gizmos.cuboid(*transform, color.with_a(0.3));
    }
}
```

## 最佳实践

### 1. 性能考虑

- 仅在调试模式下启用 gizmos
- 使用配置组分离不同类型的调试信息
- 避免在每帧绘制大量复杂图形
- 利用 LOD（细节层次）技术调整分辨率

### 2. 代码组织

```rust
// 推荐的模块组织方式
mod debug {
    use super::*;

    pub struct DebugPlugin;

    impl Plugin for DebugPlugin {
        fn build(&self, app: &mut App) {
            app.init_gizmo_group::<PhysicsDebug>()
               .init_gizmo_group::<AIDebug>()
               .add_systems(Update, (
                   debug_physics,
                   debug_ai,
                   debug_ui,
               ).run_if(in_state(GameState::Debug)));
        }
    }
}
```

### 3. 可配置性

```rust
#[derive(Resource)]
pub struct DebugSettings {
    pub show_physics: bool,
    pub show_ai: bool,
    pub show_pathfinding: bool,
    pub line_width: f32,
}

fn update_debug_configs(
    settings: Res<DebugSettings>,
    mut config_store: ResMut<GizmoConfigStore>,
) {
    if settings.is_changed() {
        let (physics_config, _) = config_store.config_mut::<PhysicsDebug>();
        physics_config.enabled = settings.show_physics;
        physics_config.line.width = settings.line_width;

        let (ai_config, _) = config_store.config_mut::<AIDebug>();
        ai_config.enabled = settings.show_ai;
        ai_config.line.width = settings.line_width;
    }
}
```

## 总结

`bevy_gizmos` 模块为 Bevy 引擎提供了强大而灵活的调试绘制能力。通过立即模式的 API 设计，开发者可以轻松地在游戏世界中绘制各种图形用于调试和可视化。配置系统允许精细控制不同场景下的绘制样式，而与渲染管道的深度集成确保了良好的性能和视觉效果。

合理使用 `bevy_gizmos` 可以显著提高开发效率，特别是在调试物理系统、AI 行为、路径规划等复杂逻辑时。建议在开发过程中充分利用这个工具，但在发布版本中适当禁用以避免性能开销。