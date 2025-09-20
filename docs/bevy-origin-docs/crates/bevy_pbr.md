# Bevy PBR 模块详细文档

## 概述

Bevy PBR（Physically Based Rendering，基于物理的渲染）模块是 Bevy 引擎中负责 3D 渲染的核心模块。它实现了现代游戏引擎标准的 PBR 渲染管线，提供了从基础材质系统到高级光照效果的完整解决方案。

### 主要功能

- **PBR 材质系统**：提供标准材质和自定义材质支持
- **光照系统**：支持方向光、点光源、聚光灯等多种光源类型
- **阴影渲染**：实现实时阴影映射
- **后处理效果**：包括雾效、环境光遮蔽等
- **光探测器**：支持环境贴图和辐射体积
- **高级渲染特性**：视差映射、各向异性、透明度处理等

## 核心架构

### 1. 模块结构

```
bevy_pbr/
├── src/
│   ├── lib.rs                    # 模块入口点
│   ├── components.rs            # 渲染组件
│   ├── material.rs              # 材质trait和系统
│   ├── pbr_material.rs          # 标准PBR材质
│   ├── extended_material.rs     # 扩展材质
│   ├── mesh_material.rs         # 网格材质组件
│   ├── fog.rs                   # 雾效系统
│   ├── cluster.rs               # 光源聚类
│   ├── light_probe/             # 光探测器
│   ├── render/                  # 渲染相关
│   ├── deferred/                # 延迟渲染
│   ├── prepass/                 # 预渲染通道
│   ├── ssao/                    # 环境光遮蔽
│   ├── ssr/                     # 屏幕空间反射
│   └── volumetric_fog/          # 体积雾
```

### 2. 核心组件

#### PbrPlugin

```rust
pub struct PbrPlugin {
    pub prepass_enabled: bool,
    pub add_default_deferred_lighting_plugin: bool,
    pub use_gpu_instance_buffer_builder: bool,
    pub debug_flags: RenderDebugFlags,
}
```

`PbrPlugin` 是整个 PBR 渲染系统的入口插件，负责初始化所有相关系统和资源。

**主要职责：**
- 加载渲染着色器库
- 初始化材质系统
- 设置渲染管线
- 配置光照聚类
- 注册渲染节点

## 材质系统

### 1. Material Trait

```rust
pub trait Material: Asset + AsBindGroup + Clone + Sized {
    fn vertex_shader() -> ShaderRef { ShaderRef::Default }
    fn fragment_shader() -> ShaderRef { ShaderRef::Default }
    fn alpha_mode(&self) -> AlphaMode { AlphaMode::Opaque }
    fn opaque_render_method(&self) -> OpaqueRendererMethod { OpaqueRendererMethod::Forward }
    fn depth_bias(&self) -> f32 { 0.0 }
    fn reads_view_transmission_texture(&self) -> bool { false }
    // ... 更多方法
}
```

Material trait 定义了材质系统的核心接口，所有材质类型都必须实现此 trait。

### 2. StandardMaterial

`StandardMaterial` 是 Bevy 提供的标准 PBR 材质，支持完整的 PBR 工作流。

#### 主要属性

```rust
pub struct StandardMaterial {
    // 基础属性
    pub base_color: Color,                    // 基础颜色
    pub base_color_texture: Option<Handle<Image>>,

    // 发光属性
    pub emissive: LinearRgba,                 // 发光颜色
    pub emissive_texture: Option<Handle<Image>>,
    pub emissive_exposure_weight: f32,        // 曝光权重

    // 物理属性
    pub perceptual_roughness: f32,            // 粗糙度 (0.0-1.0)
    pub metallic: f32,                        // 金属度 (0.0-1.0)
    pub reflectance: f32,                     // 反射率

    // 传输属性
    pub diffuse_transmission: f32,            // 漫反射透射
    pub specular_transmission: f32,           // 镜面透射
    pub thickness: f32,                       // 厚度
    pub ior: f32,                            // 折射率

    // 高级特性
    pub clearcoat: f32,                      // 清漆层
    pub anisotropy_strength: f32,            // 各向异性强度
    pub anisotropy_rotation: f32,            // 各向异性旋转

    // 表面属性
    pub normal_map_texture: Option<Handle<Image>>,  // 法线贴图
    pub occlusion_texture: Option<Handle<Image>>,   // 遮蔽贴图
    pub depth_map: Option<Handle<Image>>,           // 深度贴图（视差映射）

    // 渲染控制
    pub double_sided: bool,                  // 双面渲染
    pub cull_mode: Option<Face>,            // 裁剪模式
    pub unlit: bool,                        // 禁用光照
    pub alpha_mode: AlphaMode,              // 透明模式
    pub depth_bias: f32,                    // 深度偏移
}
```

#### 透明度处理

```rust
pub enum AlphaMode {
    Opaque,                    // 不透明
    Mask(f32),                // 阈值掩码
    Blend,                    // 混合
    Premultiplied,            // 预乘混合
    Add,                      // 加法混合
    Multiply,                 // 乘法混合
    AlphaToCoverage,          // Alpha转覆盖率
}
```

### 3. MeshMaterial3d 组件

```rust
#[derive(Component, Clone, Debug, Deref, DerefMut, Reflect)]
pub struct MeshMaterial3d<M: Material>(pub Handle<M>);
```

`MeshMaterial3d` 是连接网格和材质的组件，每个 3D 网格实体都需要此组件来指定使用的材质。

#### 使用示例

```rust
fn setup_material_system(
    mut commands: Commands,
    mut materials: ResMut<Assets<StandardMaterial>>,
    asset_server: Res<AssetServer>,
) {
    // 创建基础材质
    let material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.8, 0.2, 0.2),
        perceptual_roughness: 0.4,
        metallic: 0.0,
        ..default()
    });

    // 创建带纹理的材质
    let textured_material = materials.add(StandardMaterial {
        base_color_texture: Some(asset_server.load("textures/stone.png")),
        normal_map_texture: Some(asset_server.load("textures/stone_normal.png")),
        metallic_roughness_texture: Some(asset_server.load("textures/stone_mr.png")),
        ..default()
    });

    // 使用材质
    commands.spawn((
        Mesh3d(meshes.add(Sphere::new(1.0))),
        MeshMaterial3d(material),
        Transform::from_xyz(0.0, 0.0, 0.0),
    ));
}
```

## 光照系统

### 1. 光源类型

Bevy PBR 支持多种光源类型：

#### 方向光 (DirectionalLight)
```rust
#[derive(Component)]
pub struct DirectionalLight {
    pub color: Color,
    pub illuminance: f32,
    pub shadows_enabled: bool,
    pub shadow_depth_bias: f32,
    pub shadow_normal_bias: f32,
}
```

#### 点光源 (PointLight)
```rust
#[derive(Component)]
pub struct PointLight {
    pub color: Color,
    pub intensity: f32,
    pub range: f32,
    pub radius: f32,
    pub shadows_enabled: bool,
    pub shadow_depth_bias: f32,
    pub shadow_normal_bias: f32,
}
```

#### 聚光灯 (SpotLight)
```rust
#[derive(Component)]
pub struct SpotLight {
    pub color: Color,
    pub intensity: f32,
    pub range: f32,
    pub radius: f32,
    pub inner_angle: f32,
    pub outer_angle: f32,
    pub shadows_enabled: bool,
}
```

#### 环境光 (AmbientLight)
```rust
#[derive(Resource)]
pub struct AmbientLight {
    pub color: Color,
    pub brightness: f32,
}
```

### 2. 光照聚类

Bevy 使用聚类前向渲染技术优化多光源场景的性能：

```rust
#[derive(Resource)]
pub struct ClusterConfig {
    pub dimensions: UVec3,           // 聚类网格尺寸
    pub z_slices: ClusterZSlices,    // Z方向分片策略
    pub dynamic_resizing: bool,      // 动态调整大小
}
```

## 高级渲染特性

### 1. 雾效系统

#### DistanceFog 组件

```rust
#[derive(Component)]
pub struct DistanceFog {
    pub color: Color,                          // 雾的颜色
    pub directional_light_color: Color,        // 方向光颜色调制
    pub directional_light_exponent: f32,       // 方向光指数
    pub falloff: FogFalloff,                   // 衰减模式
}
```

#### 雾效衰减模式

```rust
pub enum FogFalloff {
    Linear { start: f32, end: f32 },           // 线性衰减
    Exponential { density: f32 },              // 指数衰减
    ExponentialSquared { density: f32 },       // 平方指数衰减
    Atmospheric {                              // 大气散射
        extinction: Vec3,
        inscattering: Vec3,
    },
}
```

#### 使用示例

```rust
fn setup_fog(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        DistanceFog {
            color: Color::srgba(0.35, 0.48, 0.66, 1.0),
            directional_light_color: Color::srgba(1.0, 0.95, 0.85, 0.5),
            directional_light_exponent: 8.0,
            falloff: FogFalloff::from_visibility(15.0),
        },
    ));
}
```

### 2. 光探测器

#### 环境贴图

```rust
#[derive(Component)]
pub struct EnvironmentMapLight {
    pub diffuse_map: Handle<Image>,     // 漫反射环境贴图
    pub specular_map: Handle<Image>,    // 镜面反射环境贴图
    pub intensity: f32,                 // 强度
    pub rotation: Quat,                 // 旋转
}
```

#### 辐射体积

```rust
#[derive(Component)]
pub struct IrradianceVolume {
    pub voxels: Handle<Image>,          // 3D 体素纹理
    pub intensity: f32,                 // 强度
}
```

### 3. 视差映射

StandardMaterial 支持视差映射，可以在不增加几何复杂度的情况下增加表面细节：

```rust
pub struct StandardMaterial {
    pub depth_map: Option<Handle<Image>>,           // 深度贴图
    pub parallax_depth_scale: f32,                  // 视差深度缩放
    pub parallax_mapping_method: ParallaxMappingMethod,
    pub max_parallax_layer_count: f32,              // 最大视差层数
    // ...
}

pub enum ParallaxMappingMethod {
    Occlusion,                         // 遮蔽映射
    Relief { max_steps: u32 },         // 浮雕映射
}
```

### 4. 屏幕空间环境光遮蔽 (SSAO)

```rust
#[derive(Resource)]
pub struct ScreenSpaceAmbientOcclusionSettings {
    pub quality_level: SsaoQualityLevel,
    pub radius: f32,
    pub bias: f32,
    pub intensity: f32,
    pub samples: u32,
}
```

## 渲染管线

### 1. 渲染方法

Bevy PBR 支持多种渲染方法：

```rust
pub enum OpaqueRendererMethod {
    Forward,      // 前向渲染
    Deferred,     // 延迟渲染
    Auto,         // 自动选择
}
```

#### 前向渲染 vs 延迟渲染

**前向渲染**：
- 适合光源数量较少的场景
- 支持透明物体
- 支持 MSAA
- 内存带宽占用较低

**延迟渲染**：
- 适合大量光源的场景
- 不支持透明物体（需要单独处理）
- 不支持 MSAA
- 内存带宽占用较高

### 2. 预渲染通道

```rust
pub struct PrepassSettings {
    pub depth_prepass: bool,           // 深度预渲染
    pub normal_prepass: bool,          // 法线预渲染
    pub motion_vector_prepass: bool,   // 运动矢量预渲染
    pub deferred_prepass: bool,        // 延迟预渲染
}
```

### 3. 渲染阶段

```rust
pub enum RenderPhaseType {
    Opaque,          // 不透明物体
    AlphaMask,       // Alpha 遮罩
    Transmissive,    // 透射物体
    Transparent,     // 透明物体
}
```

## 常见使用场景

### 1. 基础 PBR 场景设置

```rust
use bevy::prelude::*;
use bevy_pbr::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_systems(Startup, setup)
        .run();
}

fn setup(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 创建相机
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(3.0, 3.0, 3.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));

    // 创建光源
    commands.spawn((
        DirectionalLight {
            color: Color::WHITE,
            illuminance: 10000.0,
            shadows_enabled: true,
            ..default()
        },
        Transform::from_rotation(Quat::from_euler(EulerRot::ZYX, 0.0, 1.0, -0.5)),
    ));

    // 创建材质
    let material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.8, 0.2, 0.2),
        perceptual_roughness: 0.4,
        metallic: 0.0,
        ..default()
    });

    // 创建网格物体
    commands.spawn((
        Mesh3d(meshes.add(Sphere::new(1.0))),
        MeshMaterial3d(material),
        Transform::from_xyz(0.0, 1.0, 0.0),
    ));
}
```

### 2. 多材质场景

```rust
fn setup_multi_material_scene(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    let sphere = meshes.add(Sphere::new(0.5));

    // 金属材质
    let metallic_material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.7, 0.7, 0.7),
        metallic: 1.0,
        perceptual_roughness: 0.1,
        ..default()
    });

    // 塑料材质
    let plastic_material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.2, 0.8, 0.2),
        metallic: 0.0,
        perceptual_roughness: 0.8,
        ..default()
    });

    // 发光材质
    let emissive_material = materials.add(StandardMaterial {
        base_color: Color::BLACK,
        emissive: LinearRgba::rgb(0.0, 0.0, 1.0) * 2.0,
        ..default()
    });

    // 创建球体
    commands.spawn((
        Mesh3d(sphere.clone()),
        MeshMaterial3d(metallic_material),
        Transform::from_xyz(-2.0, 0.0, 0.0),
    ));

    commands.spawn((
        Mesh3d(sphere.clone()),
        MeshMaterial3d(plastic_material),
        Transform::from_xyz(0.0, 0.0, 0.0),
    ));

    commands.spawn((
        Mesh3d(sphere),
        MeshMaterial3d(emissive_material),
        Transform::from_xyz(2.0, 0.0, 0.0),
    ));
}
```

### 3. 透明材质

```rust
fn setup_transparency(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // 半透明材质
    let transparent_material = materials.add(StandardMaterial {
        base_color: Color::srgba(0.2, 0.7, 1.0, 0.5),
        alpha_mode: AlphaMode::Blend,
        ..default()
    });

    // Alpha 遮罩材质
    let cutout_material = materials.add(StandardMaterial {
        base_color: Color::srgba(1.0, 0.0, 0.0, 0.8),
        alpha_mode: AlphaMode::Mask(0.5),
        ..default()
    });

    commands.spawn((
        Mesh3d(meshes.add(Cube::new(1.0))),
        MeshMaterial3d(transparent_material),
        Transform::from_xyz(-1.0, 0.0, 0.0),
    ));

    commands.spawn((
        Mesh3d(meshes.add(Cube::new(1.0))),
        MeshMaterial3d(cutout_material),
        Transform::from_xyz(1.0, 0.0, 0.0),
    ));
}
```

### 4. 自定义材质

```rust
use bevy::render::render_resource::*;

#[derive(Asset, TypePath, AsBindGroup, Debug, Clone)]
pub struct CustomMaterial {
    #[uniform(0)]
    color: LinearRgba,
    #[texture(1)]
    #[sampler(2)]
    color_texture: Option<Handle<Image>>,
    alpha_mode: AlphaMode,
}

impl Material for CustomMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/custom_material.wgsl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        self.alpha_mode
    }
}

// 使用自定义材质
fn setup_custom_material(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<CustomMaterial>>,
) {
    let custom_material = materials.add(CustomMaterial {
        color: LinearRgba::BLUE,
        color_texture: None,
        alpha_mode: AlphaMode::Opaque,
    });

    commands.spawn((
        Mesh3d(meshes.add(Sphere::new(1.0))),
        MeshMaterial3d(custom_material),
        Transform::from_xyz(0.0, 0.0, 0.0),
    ));
}
```

### 5. 环境光照设置

```rust
fn setup_environment_lighting(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 环境贴图
    commands.spawn((
        Camera3d::default(),
        EnvironmentMapLight {
            diffuse_map: asset_server.load("environment_maps/pisa_diffuse_rgb9e5_zstd.ktx2"),
            specular_map: asset_server.load("environment_maps/pisa_specular_rgb9e5_zstd.ktx2"),
            intensity: 250.0,
            rotation: Quat::from_rotation_y(0.0),
        },
    ));

    // 全局环境光
    commands.insert_resource(AmbientLight {
        color: Color::WHITE,
        brightness: 0.02,
    });
}
```

## 性能优化建议

### 1. 材质实例化

- 尽量重用材质实例
- 使用材质变体而不是完全不同的材质
- 利用 GPU 实例化渲染相同材质的多个对象

### 2. 光源优化

- 合理控制光源数量
- 使用光源聚类配置优化多光源场景
- 禁用不必要光源的阴影

### 3. 纹理优化

- 使用适当的纹理格式和分辨率
- 启用纹理压缩
- 利用纹理图集减少绘制调用

### 4. 渲染管线选择

- 少量光源使用前向渲染
- 大量光源使用延迟渲染
- 根据场景特点选择预渲染通道

## 与其他 Bevy 模块的集成

### 1. bevy_render

- 提供底层渲染抽象
- 管理渲染资源和管线
- 处理渲染调度

### 2. bevy_mesh

- 提供网格几何数据
- 定义顶点布局
- 管理网格资源

### 3. bevy_image

- 提供纹理资源管理
- 支持多种图像格式
- 处理纹理压缩

### 4. bevy_transform

- 提供空间变换组件
- 管理对象层次结构
- 计算世界变换矩阵

### 5. bevy_camera

- 定义相机组件和系统
- 管理视图和投影矩阵
- 处理视锥体裁剪

## 总结

Bevy PBR 模块提供了功能强大且易于使用的 3D 渲染系统。通过标准材质系统、灵活的光照模型和现代渲染技术，开发者可以创建高质量的 3D 图形应用。模块的设计注重性能和可扩展性，支持从简单场景到复杂渲染效果的各种需求。

主要优势：
- **完整的 PBR 工作流**：支持业界标准的材质属性
- **灵活的材质系统**：易于创建自定义材质
- **高性能渲染**：使用现代渲染技术优化性能
- **丰富的特性**：支持透明度、光探测器、后处理等
- **良好的集成性**：与 Bevy 生态系统无缝集成

对于希望迁移到 roblox-ts 和 @rbxts/matter 的开发者，可以参考这些概念和 API 设计，在新平台上实现相似的渲染功能。