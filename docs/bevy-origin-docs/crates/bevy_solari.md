# Bevy Solari 光线追踪照明系统

## 概述

Bevy Solari 是 Bevy 引擎的实验性光线追踪照明模块，提供高质量的实时和非实时光线追踪渲染功能。该模块利用现代 GPU 的硬件光线追踪加速结构，实现了直接照明和间接照明的物理准确计算。

## 主要功能

### 1. 实时光线追踪照明 (Realtime Raytracing)
- **ReSTIR DI/GI**: 实现了 ReSTIR (Reservoir-based Spatio-temporal Importance Resampling) 算法用于直接照明和全局照明
- **世界缓存系统**: 提供高效的场景几何查询和更新机制
- **光源预采样**: 优化大量光源场景的性能
- **DLSS 支持**: 可选的 NVIDIA DLSS 集成以提升性能

### 2. 路径追踪 (Pathtracing)
- **离线高质量渲染**: 用于生成参考图像和质量验证
- **累积渲染**: 支持多帧累积以减少噪点

### 3. 场景管理 (Scene Management)
- **BLAS 构建**: 自动构建和管理底层加速结构 (Bottom Level Acceleration Structure)
- **材质绑定**: 统一的材质和纹理绑定系统
- **光源管理**: 支持自发光网格和方向光源

## 核心结构体和枚举

### 插件组
```rust
pub struct SolariPlugins;
```
主要的插件组，包含所有必要的光线追踪功能。

**必需的 WGPU 特性**:
- `EXPERIMENTAL_RAY_TRACING_ACCELERATION_STRUCTURE`
- `EXPERIMENTAL_RAY_QUERY`
- `BUFFER_BINDING_ARRAY`
- `TEXTURE_BINDING_ARRAY`
- `SAMPLED_TEXTURE_AND_STORAGE_BUFFER_ARRAY_NON_UNIFORM_INDEXING`
- `PARTIALLY_BOUND_BINDING_ARRAY`

### 实时照明组件
```rust
#[derive(Component)]
pub struct SolariLighting {
    pub reset: bool,
}
```
**功能**:
- 为 3D 相机启用 Solari 光线追踪照明系统
- `reset`: 设置为 true 时删除保存的时间历史（过去帧）

**必需组件**:
- `Hdr`: 高动态范围渲染
- `DeferredPrepass`: 延迟渲染预处理
- `DepthPrepass`: 深度预处理
- `MotionVectorPrepass`: 运动矢量预处理

### 光线追踪网格组件
```rust
#[derive(Component)]
pub struct RaytracingMesh3d(pub Handle<Mesh>);
```
**功能**:
- 标记网格用于光线追踪
- 自动关联 `MeshMaterial3d<StandardMaterial>` 和 `Transform`

**网格要求**:
- 必须启用 `Mesh::enable_raytracing`
- 顶点属性: `{POSITION, NORMAL, UV_0, TANGENT}`
- 拓扑结构: `PrimitiveTopology::TriangleList`
- 索引类型: `Indices::U32`

### 路径追踪组件
```rust
#[derive(Component)]
pub struct Pathtracer {
    pub reset: bool,
}
```
**功能**:
- 启用非实时路径追踪
- 用于生成参考图像和质量验证

## 主要 API 使用示例

### 1. 基本设置

```rust
use bevy::prelude::*;
use bevy_solari::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(RenderPlugin {
            render_creation: RenderCreation::Automatic(WgpuSettings {
                required_features: SolariPlugins::required_wgpu_features(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins(SolariPlugins)
        .add_systems(Startup, setup)
        .run();
}

fn setup(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 创建支持光线追踪的相机
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 0.0, 5.0),
        SolariLighting::default(),
        CameraMainTextureUsages::default()
            .with(TextureUsages::STORAGE_BINDING),
        Msaa::Off,
    ));

    // 创建光线追踪网格
    let mut cube_mesh = Mesh::from(Cuboid::new(1.0, 1.0, 1.0));
    cube_mesh.enable_raytracing(); // 启用光线追踪
    let cube_handle = meshes.add(cube_mesh);

    commands.spawn((
        RaytracingMesh3d(cube_handle),
        MeshMaterial3d(materials.add(StandardMaterial {
            base_color: Color::srgb(0.8, 0.7, 0.6),
            metallic: 0.0,
            perceptual_roughness: 0.5,
            ..default()
        })),
        Transform::from_xyz(0.0, 0.0, 0.0),
    ));
}
```

### 2. 自发光材质

```rust
fn setup_emissive_lighting(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 创建自发光立方体作为光源
    let mut light_mesh = Mesh::from(Cuboid::new(0.5, 0.5, 0.1));
    light_mesh.enable_raytracing();

    commands.spawn((
        RaytracingMesh3d(meshes.add(light_mesh)),
        MeshMaterial3d(materials.add(StandardMaterial {
            base_color: Color::WHITE,
            emissive: LinearRgba::rgb(5.0, 5.0, 5.0), // 高强度自发光
            ..default()
        })),
        Transform::from_xyz(0.0, 2.0, 0.0),
    ));
}
```

### 3. 方向光设置

```rust
fn setup_directional_light(mut commands: Commands) {
    commands.spawn((
        DirectionalLight {
            color: Color::srgb(1.0, 0.95, 0.8),
            illuminance: 10000.0,
            shadows_enabled: false, // Solari 替代传统阴影
            ..default()
        },
        Transform::from_rotation(Quat::from_euler(
            EulerRot::ZYX,
            0.0,
            -std::f32::consts::FRAC_PI_4,
            -std::f32::consts::FRAC_PI_6
        )),
    ));
}
```

### 4. 路径追踪设置

```rust
use bevy_solari::pathtracer::PathtracingPlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(SolariPlugins)
        .add_plugins(PathtracingPlugin) // 添加路径追踪插件
        .add_systems(Startup, setup_pathtracer)
        .run();
}

fn setup_pathtracer(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 0.0, 5.0),
        Pathtracer::default(), // 使用路径追踪而非实时光线追踪
    ));
}
```

### 5. 时间历史重置

```rust
fn reset_temporal_history(
    mut query: Query<&mut SolariLighting>,
    keyboard: Res<ButtonInput<KeyCode>>,
) {
    if keyboard.just_pressed(KeyCode::Space) {
        for mut lighting in &mut query {
            lighting.reset = true; // 清除时间历史，防止重影
        }
    }
}
```

## 与其他 Bevy 模块的集成

### 1. 与 PBR 系统集成
- **材质兼容性**: 完全支持 `StandardMaterial`
- **纹理支持**: 支持基础颜色、法线贴图、自发光和金属度粗糙度纹理
- **延迟渲染**: 要求使用延迟渲染管线

### 2. 与渲染管线集成
- **渲染图节点**: 自动插入到 3D 渲染管线中
- **预处理阶段**: 在主渲染过程之后执行
- **资源绑定**: 统一管理所有光线追踪资源

### 3. 与相机系统集成
- **HDR 要求**: 必须启用 HDR 渲染
- **MSAA 禁用**: 需要关闭多重采样抗锯齿
- **纹理使用**: 需要 `STORAGE_BINDING` 纹理使用标志

### 4. 与抗锯齿集成
- **DLSS 支持**: 可选的 NVIDIA DLSS 集成
- **特性标志**: 通过 "dlss" 和 "force_disable_dlss" 特性控制

## 常见使用场景

### 1. 实时全局照明
**适用于**: 需要高质量照明的实时应用
```rust
// 基本实时 GI 设置
commands.spawn((
    Camera3d::default(),
    SolariLighting::default(),
    // 必需的相机配置
    CameraMainTextureUsages::default().with(TextureUsages::STORAGE_BINDING),
    Msaa::Off,
    Hdr,
));
```

### 2. 建筑可视化
**适用于**: 室内外建筑渲染
```rust
fn setup_architectural_scene(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 天空盒光照
    commands.spawn((
        DirectionalLight {
            illuminance: 50000.0, // 模拟日光
            color: Color::srgb(1.0, 0.95, 0.8),
            shadows_enabled: false,
            ..default()
        },
        Transform::from_rotation(Quat::from_euler(EulerRot::ZYX, 0.0, -0.5, -0.3)),
    ));

    // 室内照明
    let light_mesh = meshes.add(Mesh::from(Cuboid::new(2.0, 0.1, 1.0)));
    commands.spawn((
        RaytracingMesh3d(light_mesh),
        MeshMaterial3d(materials.add(StandardMaterial {
            emissive: LinearRgba::rgb(10.0, 8.0, 6.0), // 暖白光
            ..default()
        })),
        Transform::from_xyz(0.0, 3.0, 0.0),
    ));
}
```

### 3. 产品展示
**适用于**: 产品渲染和展示
```rust
fn setup_product_showcase(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 产品材质 - 金属表面
    let product_material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.9, 0.9, 0.9),
        metallic: 1.0,
        perceptual_roughness: 0.1,
        ..default()
    });

    // 环境光照设置
    commands.spawn((
        DirectionalLight {
            illuminance: 30000.0,
            color: Color::WHITE,
            shadows_enabled: false,
            ..default()
        },
        Transform::from_rotation(Quat::from_euler(EulerRot::ZYX, 0.0, -0.8, -0.4)),
    ));
}
```

### 4. 质量验证
**适用于**: 参考图像生成和算法验证
```rust
fn setup_reference_rendering(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.0, 0.0, 5.0),
        Pathtracer::default(), // 使用路径追踪获得准确结果
    ));
}
```

## 性能优化建议

### 1. 硬件要求
- **GPU**: 支持硬件光线追踪的现代 GPU (RTX 20 系列以上 / RDNA2 以上)
- **显存**: 至少 8GB 推荐，复杂场景需要更多
- **驱动**: 最新的图形驱动程序

### 2. 场景优化
- **网格复杂度**: 控制单个网格的三角形数量，避免过度细分
- **材质数量**: 限制同时使用的不同材质数量
- **光源数量**: 合理控制场景中的光源数量

### 3. 渲染设置
- **分辨率**: 考虑使用 DLSS 以较低分辨率渲染后放大
- **时间累积**: 允许多帧累积以提高质量
- **预设质量**: 根据目标平台调整质量预设

### 4. 调试和优化
- **性能监控**: 使用 Bevy 的诊断系统监控帧时间
- **热点分析**: 关注 BLAS 构建和绑定准备的耗时
- **内存使用**: 监控 GPU 内存使用情况

## 注意事项

### 1. 兼容性
- **实验性功能**: Solari 是实验性模块，API 可能会发生变化
- **GPU 支持**: 需要支持硬件光线追踪的 GPU
- **平台限制**: 主要支持 Windows 和 Linux，macOS 支持有限

### 2. 限制
- **网格格式**: 严格的网格格式要求
- **材质类型**: 目前仅支持 StandardMaterial
- **抗锯齿**: 与传统 MSAA 不兼容

### 3. 调试
- **日志级别**: 设置适当的日志级别以获取调试信息
- **特性检查**: 确保 GPU 支持所需的 WGPU 特性
- **渐进式集成**: 建议逐步集成功能以便排查问题

这份文档涵盖了 Bevy Solari 的主要功能、API 和使用方法。该模块为 Bevy 引擎提供了前沿的光线追踪照明技术，适用于需要高质量渲染的应用场景。