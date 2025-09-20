# Bevy Light 模块详细操作文档

## 1. 模块概述和主要功能

`bevy_light` 是 Bevy 引擎的光照系统核心模块，提供了完整的 3D 光照解决方案。该模块实现了现代游戏引擎所需的各种光照技术，包括：

### 主要功能特性
- **多种光源类型**：支持环境光、方向光、点光源、聚光灯
- **阴影映射**：级联阴影映射（CSM）、立方体阴影映射
- **光照探针**：环境映射、辐照度体积
- **体积光照**：体积雾、光束效果
- **空间聚类**：光源聚类优化渲染性能
- **高级特性**：软阴影（PCSS）、光照纹理、太阳盘渲染

### 模块架构
```
bevy_light/
├── lib.rs                 # 主模块和插件定义
├── ambient_light.rs        # 环境光实现
├── directional_light.rs    # 方向光实现
├── point_light.rs          # 点光源实现
├── spot_light.rs           # 聚光灯实现
├── cascade.rs              # 级联阴影映射
├── probe.rs                # 光照探针
├── volumetric.rs           # 体积光照
└── cluster/               # 光源聚类系统
    ├── mod.rs
    ├── assign.rs
    └── test.rs
```

## 2. 核心结构体和枚举说明

### 2.1 环境光 (AmbientLight)

环境光为整个场景提供均匀的基础照明。

```rust
#[derive(Resource, Component, Clone, Debug, Reflect)]
pub struct AmbientLight {
    pub color: Color,                           // 光照颜色
    pub brightness: f32,                        // 亮度 (cd/m²)
    pub affects_lightmapped_meshes: bool,       // 是否影响光照贴图网格
}
```

**预设常量：**
- `AmbientLight::NONE`：无环境光（亮度为 0）
- 默认亮度：80.0 cd/m²

### 2.2 方向光 (DirectionalLight)

模拟太阳等远距离光源，光线平行且方向一致。

```rust
#[derive(Component, Debug, Clone, Reflect)]
pub struct DirectionalLight {
    pub color: Color,                                   // 光照颜色
    pub illuminance: f32,                              // 照度 (lux)
    pub shadows_enabled: bool,                         // 是否启用阴影
    pub affects_lightmapped_mesh_diffuse: bool,        // 是否影响光照贴图漫反射
    pub shadow_depth_bias: f32,                        // 阴影深度偏移
    pub shadow_normal_bias: f32,                       // 阴影法线偏移

    #[cfg(feature = "experimental_pbr_pcss")]
    pub soft_shadow_size: Option<f32>,                 // 软阴影尺寸
}
```

**照度参考值（lux）：**
- 月夜：0.0001-0.3
- 黎明/黄昏：3.4-400
- 室内照明：50-500
- 阴天：100-1000
- 日光：10,000-25,000
- 直射阳光：32,000-100,000

### 2.3 点光源 (PointLight)

从中心点向四周发射光线的光源。

```rust
#[derive(Component, Debug, Clone, Copy, Reflect)]
pub struct PointLight {
    pub color: Color,                                   // 光照颜色
    pub intensity: f32,                                // 光强 (lumens)
    pub range: f32,                                    // 照射范围
    pub radius: f32,                                   // 光源半径
    pub shadows_enabled: bool,                         // 是否启用阴影
    pub affects_lightmapped_mesh_diffuse: bool,        // 是否影响光照贴图漫反射
    pub shadow_depth_bias: f32,                        // 阴影深度偏移
    pub shadow_normal_bias: f32,                       // 阴影法线偏移
    pub shadow_map_near_z: f32,                        // 阴影贴图近平面

    #[cfg(feature = "experimental_pbr_pcss")]
    pub soft_shadows_enabled: bool,                    // 是否启用软阴影
}
```

**光强参考值（lumens）：**
- 200 lumens：25W 白炽灯
- 800 lumens：60W 白炽灯
- 1600 lumens：100W 白炽灯
- 4000 lumens：300W 白炽灯

### 2.4 聚光灯 (SpotLight)

锥形光束的定向光源。

```rust
#[derive(Component, Debug, Clone, Copy, Reflect)]
pub struct SpotLight {
    pub color: Color,                                   // 光照颜色
    pub intensity: f32,                                // 光强 (lumens)
    pub range: f32,                                    // 照射范围
    pub radius: f32,                                   // 光源半径
    pub shadows_enabled: bool,                         // 是否启用阴影
    pub affects_lightmapped_mesh_diffuse: bool,        // 是否影响光照贴图漫反射
    pub shadow_depth_bias: f32,                        // 阴影深度偏移
    pub shadow_normal_bias: f32,                       // 阴影法线偏移
    pub shadow_map_near_z: f32,                        // 阴影贴图近平面
    pub outer_angle: f32,                              // 外锥角
    pub inner_angle: f32,                              // 内锥角

    #[cfg(feature = "experimental_pbr_pcss")]
    pub soft_shadows_enabled: bool,                    // 是否启用软阴影
}
```

### 2.5 级联阴影配置 (CascadeShadowConfig)

控制方向光的级联阴影映射。

```rust
#[derive(Component, Clone, Debug, Reflect)]
pub struct CascadeShadowConfig {
    pub bounds: Vec<f32>,                              // 级联边界
    pub overlap_proportion: f32,                       // 重叠比例
    pub minimum_distance: f32,                         // 最小距离
}
```

### 2.6 光照探针 (LightProbe)

提供基于图像的照明（IBL）。

```rust
#[derive(Component, Debug, Clone, Copy, Default, Reflect)]
pub struct LightProbe;

#[derive(Clone, Component, Reflect)]
pub struct EnvironmentMapLight {
    pub diffuse_map: Handle<Image>,                    // 漫反射环境贴图
    pub specular_map: Handle<Image>,                   // 镜面反射环境贴图
    pub intensity: f32,                                // 强度
    pub rotation: Quat,                                // 旋转
    pub affects_lightmapped_mesh_diffuse: bool,        // 是否影响光照贴图漫反射
}

#[derive(Clone, Component, Reflect)]
pub struct IrradianceVolume {
    pub voxels: Handle<Image>,                         // 3D 体素纹理
    pub intensity: f32,                                // 强度
    pub affects_lightmapped_meshes: bool,              // 是否影响光照贴图
}
```

### 2.7 体积光照

```rust
#[derive(Clone, Copy, Component, Default, Debug, Reflect)]
pub struct VolumetricLight;  // 体积光标记组件

#[derive(Clone, Copy, Component, Debug, Reflect)]
pub struct VolumetricFog {
    pub ambient_color: Color,                          // 环境光颜色
    pub ambient_intensity: f32,                        // 环境光强度
    pub jitter: f32,                                   // 随机抖动
    pub step_count: u32,                               // 光线步进数
}

#[derive(Clone, Component, Debug, Reflect)]
pub struct FogVolume {
    pub fog_color: Color,                              // 雾颜色
    pub density_factor: f32,                           // 密度因子
    pub density_texture: Option<Handle<Image>>,        // 密度纹理
    pub density_texture_offset: Vec3,                  // 密度纹理偏移
    pub absorption: f32,                               // 吸收系数
    pub scattering: f32,                               // 散射系数
    pub scattering_asymmetry: f32,                     // 散射不对称性
    pub light_tint: Color,                             // 光照色调
    pub light_intensity: f32,                          // 光照强度
}
```

### 2.8 阴影过滤方法

```rust
#[derive(Debug, Component, Reflect, Clone, Copy, PartialEq, Eq, Default)]
pub enum ShadowFilteringMethod {
    Hardware2x2,        // 硬件 2x2 过滤
    #[default]
    Gaussian,           // 高斯过滤
    Temporal,           // 时间过滤
}
```

## 3. 主要 API 使用示例

### 3.1 基础环境光设置

```rust
use bevy::prelude::*;
use bevy_light::prelude::*;

fn setup_ambient_light(mut ambient_light: ResMut<AmbientLight>) {
    ambient_light.brightness = 100.0;  // 设置较亮的环境光
    ambient_light.color = Color::srgb(0.9, 0.9, 1.0);  // 微蓝色调
}

// 为特定相机覆盖环境光
fn setup_camera_ambient(mut commands: Commands) {
    commands.spawn((
        Camera3dBundle::default(),
        AmbientLight {
            brightness: 50.0,
            color: Color::srgb(1.0, 0.8, 0.6),  // 温暖色调
            affects_lightmapped_meshes: false,
        }
    ));
}
```

### 3.2 方向光（太阳光）设置

```rust
use bevy_light::light_consts;

fn setup_sun_light(mut commands: Commands) {
    commands.spawn((
        DirectionalLightBundle {
            directional_light: DirectionalLight {
                color: Color::srgb(1.0, 0.95, 0.8),  // 暖白色阳光
                illuminance: light_consts::lux::FULL_DAYLIGHT,  // 20,000 lux
                shadows_enabled: true,
                shadow_depth_bias: 0.02,
                shadow_normal_bias: 1.8,
                affects_lightmapped_mesh_diffuse: true,
                ..default()
            },
            transform: Transform::from_rotation(
                Quat::from_euler(EulerRot::XYZ, -45.0_f32.to_radians(), 30.0_f32.to_radians(), 0.0)
            ),
            ..default()
        },
        // 可选：太阳盘渲染
        SunDisk::EARTH,
        // 可选：体积光效果
        VolumetricLight,
    ));
}
```

### 3.3 点光源设置

```rust
fn setup_point_lights(mut commands: Commands) {
    // 室内台灯
    commands.spawn(PointLightBundle {
        point_light: PointLight {
            intensity: 800.0,  // 60W 白炽灯等效
            range: 10.0,
            radius: 0.2,  // 柔和阴影
            color: Color::srgb(1.0, 0.9, 0.7),  // 暖白光
            shadows_enabled: true,
            shadow_depth_bias: 0.08,
            shadow_normal_bias: 0.6,
            ..default()
        },
        transform: Transform::from_xyz(2.0, 3.0, 1.0),
        ..default()
    });

    // 彩色装饰光
    commands.spawn(PointLightBundle {
        point_light: PointLight {
            intensity: 200.0,
            range: 5.0,
            color: Color::srgb(0.2, 0.8, 1.0),  // 蓝光
            shadows_enabled: false,  // 装饰光通常不需要阴影
            ..default()
        },
        transform: Transform::from_xyz(-3.0, 1.5, -2.0),
        ..default()
    });
}
```

### 3.4 聚光灯设置

```rust
fn setup_spotlights(mut commands: Commands) {
    // 手电筒效果
    commands.spawn(SpotLightBundle {
        spot_light: SpotLight {
            intensity: 1000.0,
            range: 15.0,
            color: Color::WHITE,
            shadows_enabled: true,
            inner_angle: 0.2,  // 约 11.5 度
            outer_angle: 0.4,  // 约 23 度
            shadow_depth_bias: 0.02,
            shadow_normal_bias: 1.8,
            ..default()
        },
        transform: Transform::from_xyz(0.0, 4.0, 2.0)
            .looking_at(Vec3::new(0.0, 0.0, 0.0), Vec3::Y),
        ..default()
    });

    // 舞台聚光灯
    commands.spawn(SpotLightBundle {
        spot_light: SpotLight {
            intensity: 5000.0,
            range: 20.0,
            color: Color::srgb(1.0, 0.8, 0.6),
            shadows_enabled: true,
            inner_angle: 0.3,
            outer_angle: 0.6,
            ..default()
        },
        transform: Transform::from_xyz(0.0, 10.0, 5.0)
            .looking_at(Vec3::new(0.0, 0.0, 0.0), Vec3::Y),
        ..default()
    });
}
```

### 3.5 级联阴影配置

```rust
use bevy_light::{CascadeShadowConfigBuilder, DirectionalLightShadowMap};

fn setup_cascade_shadows(mut commands: Commands) {
    // 自定义级联阴影配置
    let cascade_config = CascadeShadowConfigBuilder {
        num_cascades: 4,           // 4 个级联
        minimum_distance: 0.1,     // 最小距离
        maximum_distance: 200.0,   // 最大距离
        first_cascade_far_bound: 15.0,  // 第一级联远边界
        overlap_proportion: 0.3,   // 30% 重叠
    }.into();

    commands.spawn((
        DirectionalLightBundle {
            directional_light: DirectionalLight {
                shadows_enabled: true,
                ..default()
            },
            ..default()
        },
        cascade_config,
    ));
}

fn configure_shadow_resolution(mut shadow_map: ResMut<DirectionalLightShadowMap>) {
    shadow_map.size = 4096;  // 高质量阴影贴图
}
```

### 3.6 环境映射和 IBL

```rust
fn setup_environment_lighting(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 环境映射光照
    commands.spawn((
        LightProbe,
        EnvironmentMapLight {
            diffuse_map: asset_server.load("environment/diffuse.ktx2"),
            specular_map: asset_server.load("environment/specular.ktx2"),
            intensity: 1.0,
            rotation: Quat::from_rotation_y(std::f32::consts::PI), // 旋转 180 度
            affects_lightmapped_mesh_diffuse: true,
        },
        Transform::from_scale(Vec3::splat(50.0)),  // 覆盖大范围
    ));

    // 运行时生成的环境映射
    commands.spawn((
        LightProbe,
        GeneratedEnvironmentMapLight {
            environment_map: asset_server.load("skybox.hdr"),
            intensity: 0.8,
            rotation: Quat::IDENTITY,
            affects_lightmapped_mesh_diffuse: true,
        },
    ));
}
```

### 3.7 体积雾和光束效果

```rust
fn setup_volumetric_fog(mut commands: Commands) {
    // 在相机上启用体积雾
    commands.spawn((
        Camera3dBundle::default(),
        VolumetricFog {
            ambient_color: Color::srgb(0.8, 0.9, 1.0),  // 蓝色环境光
            ambient_intensity: 0.05,
            step_count: 64,  // 高质量
            jitter: 0.4,     // TAA 配合使用
        },
    ));

    // 雾体积
    commands.spawn((
        FogVolume {
            fog_color: Color::WHITE,
            density_factor: 0.05,
            absorption: 0.2,
            scattering: 0.3,
            scattering_asymmetry: 0.8,  // 前向散射
            light_tint: Color::srgb(1.0, 0.9, 0.8),
            light_intensity: 1.2,
            ..default()
        },
        Transform::from_scale(Vec3::new(10.0, 5.0, 10.0)),
    ));
}
```

### 3.8 光照纹理效果

```rust
fn setup_light_textures(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 带纹理的方向光（窗户投影）
    commands.spawn((
        DirectionalLightBundle {
            directional_light: DirectionalLight {
                illuminance: 5000.0,
                shadows_enabled: true,
                ..default()
            },
            ..default()
        },
        DirectionalLightTexture {
            image: asset_server.load("textures/window_shadow.png"),
            tiled: false,  // 单一投影，不平铺
        },
    ));

    // 带纹理的聚光灯（投影图案）
    commands.spawn((
        SpotLightBundle {
            spot_light: SpotLight {
                intensity: 2000.0,
                range: 15.0,
                inner_angle: 0.3,
                outer_angle: 0.5,
                ..default()
            },
            ..default()
        },
        SpotLightTexture {
            image: asset_server.load("textures/gobo_pattern.png"),
        },
    ));
}
```

### 3.9 阴影控制组件

```rust
fn setup_shadow_control(mut commands: Commands) {
    // 不投射阴影的物体
    commands.spawn((
        PbrBundle {
            // ... mesh 和 material
            ..default()
        },
        NotShadowCaster,  // 这个物体不会投射阴影
    ));

    // 不接收阴影的物体
    commands.spawn((
        PbrBundle {
            // ... mesh 和 material
            ..default()
        },
        NotShadowReceiver,  // 这个物体不会接收阴影
    ));

    // 接收透射阴影的物体
    commands.spawn((
        PbrBundle {
            // ... 半透明 material
            ..default()
        },
        TransmittedShadowReceiver,  // 接收透射阴影
    ));
}
```

## 4. 与其他 Bevy 模块的集成方式

### 4.1 与 bevy_pbr 集成

```rust
use bevy::prelude::*;
use bevy::pbr::*;

fn setup_lit_scene(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    // PBR 材质与光照系统集成
    let material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.8, 0.2, 0.2),
        metallic: 0.1,
        perceptual_roughness: 0.3,
        reflectance: 0.5,
        // 其他 PBR 属性...
        ..default()
    });

    commands.spawn(PbrBundle {
        mesh: meshes.add(Sphere::new(1.0)),
        material,
        transform: Transform::from_xyz(0.0, 1.0, 0.0),
        ..default()
    });
}
```

### 4.2 与 bevy_camera 集成

```rust
fn setup_camera_with_lighting(mut commands: Commands) {
    commands.spawn((
        Camera3dBundle {
            transform: Transform::from_xyz(0.0, 5.0, 10.0)
                .looking_at(Vec3::ZERO, Vec3::Y),
            ..default()
        },
        // 相机特定的光照设置
        AmbientLight {
            brightness: 30.0,
            color: Color::srgb(0.9, 0.9, 1.0),
            affects_lightmapped_meshes: true,
        },
        // 体积雾设置
        VolumetricFog::default(),
        // 阴影过滤方法
        ShadowFilteringMethod::Temporal,
        // 环境映射
        AtmosphereEnvironmentMapLight::default(),
    ));
}
```

### 4.3 与 bevy_transform 集成

```rust
fn animate_lights(
    time: Res<Time>,
    mut lights: Query<&mut Transform, With<PointLight>>,
) {
    for mut transform in &mut lights {
        // 动态移动光源
        let t = time.elapsed_seconds();
        transform.translation.x = t.sin() * 3.0;
        transform.translation.z = t.cos() * 3.0;
    }
}

fn follow_target_spotlight(
    target: Query<&Transform, (With<Player>, Without<SpotLight>)>,
    mut spotlight: Query<&mut Transform, With<SpotLight>>,
) {
    if let (Ok(target_transform), Ok(mut light_transform)) =
        (target.get_single(), spotlight.get_single_mut()) {
        // 聚光灯跟随目标
        light_transform.look_at(target_transform.translation, Vec3::Y);
    }
}
```

### 4.4 与 bevy_asset 集成

```rust
fn load_light_assets(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 加载环境贴图
    let environment_map = asset_server.load("environments/sunset.hdr");

    // 加载光照纹理
    let gobo_texture = asset_server.load("textures/light_patterns/grid.png");

    // 加载密度纹理
    let fog_density = asset_server.load("textures/volumes/noise_3d.ktx2");

    commands.spawn((
        LightProbe,
        GeneratedEnvironmentMapLight {
            environment_map,
            intensity: 1.0,
            ..default()
        },
    ));
}
```

## 5. 常见使用场景

### 5.1 户外场景

```rust
fn setup_outdoor_scene(mut commands: Commands) {
    // 主太阳光
    commands.spawn((
        DirectionalLightBundle {
            directional_light: DirectionalLight {
                color: Color::srgb(1.0, 0.95, 0.8),
                illuminance: light_consts::lux::FULL_DAYLIGHT,
                shadows_enabled: true,
                ..default()
            },
            transform: Transform::from_rotation(
                Quat::from_euler(EulerRot::XYZ, -60.0_f32.to_radians(), 45.0_f32.to_radians(), 0.0)
            ),
            ..default()
        },
        SunDisk::EARTH,
        VolumetricLight,
    ));

    // 天空环境光
    commands.spawn((
        LightProbe,
        AtmosphereEnvironmentMapLight {
            intensity: 0.8,
            affects_lightmapped_mesh_diffuse: true,
            ..default()
        },
    ));

    // 环境光
    commands.insert_resource(AmbientLight {
        color: Color::srgb(0.7, 0.8, 1.0),  // 天空色调
        brightness: 200.0,
        affects_lightmapped_meshes: true,
    });
}
```

### 5.2 室内场景

```rust
fn setup_indoor_scene(mut commands: Commands) {
    // 窗户光线
    commands.spawn((
        DirectionalLightBundle {
            directional_light: DirectionalLight {
                color: Color::srgb(1.0, 0.98, 0.9),
                illuminance: light_consts::lux::OVERCAST_DAY,
                shadows_enabled: true,
                ..default()
            },
            transform: Transform::from_rotation(
                Quat::from_euler(EulerRot::XYZ, -30.0_f32.to_radians(), 0.0, 0.0)
            ),
            ..default()
        },
        DirectionalLightTexture {
            image: asset_server.load("textures/window_frame.png"),
            tiled: false,
        },
    ));

    // 室内照明
    for (x, z) in [(-2.0, -2.0), (2.0, -2.0), (-2.0, 2.0), (2.0, 2.0)] {
        commands.spawn(PointLightBundle {
            point_light: PointLight {
                intensity: light_consts::lumens::VERY_LARGE_CINEMA_LIGHT / 4.0,
                range: 8.0,
                color: Color::srgb(1.0, 0.9, 0.7),
                shadows_enabled: true,
                ..default()
            },
            transform: Transform::from_xyz(x, 2.5, z),
            ..default()
        });
    }

    // 低强度环境光
    commands.insert_resource(AmbientLight {
        color: Color::srgb(0.9, 0.9, 1.0),
        brightness: light_consts::lux::LIVING_ROOM,
        affects_lightmapped_meshes: true,
    });
}
```

### 5.3 夜间场景

```rust
fn setup_night_scene(mut commands: Commands) {
    // 月光
    commands.spawn(DirectionalLightBundle {
        directional_light: DirectionalLight {
            color: Color::srgb(0.7, 0.8, 1.0),  // 冷蓝色月光
            illuminance: light_consts::lux::FULL_MOON_NIGHT,
            shadows_enabled: true,
            ..default()
        },
        transform: Transform::from_rotation(
            Quat::from_euler(EulerRot::XYZ, -45.0_f32.to_radians(), 120.0_f32.to_radians(), 0.0)
        ),
        ..default()
    });

    // 街灯
    for i in 0..5 {
        commands.spawn(PointLightBundle {
            point_light: PointLight {
                intensity: 1000.0,
                range: 12.0,
                color: Color::srgb(1.0, 0.8, 0.5),  // 暖黄色街灯
                shadows_enabled: true,
                ..default()
            },
            transform: Transform::from_xyz(i as f32 * 8.0 - 16.0, 4.0, 0.0),
            ..default()
        });
    }

    // 极低环境光
    commands.insert_resource(AmbientLight {
        color: Color::srgb(0.2, 0.3, 0.5),
        brightness: light_consts::lux::MOONLESS_NIGHT * 100.0,
        affects_lightmapped_meshes: true,
    });
}
```

### 5.4 特效场景（魔法/科幻）

```rust
fn setup_magical_scene(mut commands: Commands) {
    // 魔法光球
    commands.spawn((
        PointLightBundle {
            point_light: PointLight {
                intensity: 2000.0,
                range: 15.0,
                color: Color::srgb(0.5, 0.2, 1.0),  // 紫色魔法光
                shadows_enabled: false,  // 魔法光通常不投阴影
                radius: 1.0,  // 大半径产生柔和效果
                ..default()
            },
            transform: Transform::from_xyz(0.0, 3.0, 0.0),
            ..default()
        },
        // 动画组件可以在其他系统中处理
    ));

    // 激光聚光灯
    commands.spawn(SpotLightBundle {
        spot_light: SpotLight {
            intensity: 5000.0,
            range: 25.0,
            color: Color::srgb(0.2, 1.0, 0.2),  // 绿色激光
            shadows_enabled: false,
            inner_angle: 0.05,  // 非常窄的光束
            outer_angle: 0.1,
            ..default()
        },
        transform: Transform::from_xyz(5.0, 8.0, 0.0)
            .looking_at(Vec3::new(0.0, 0.0, 0.0), Vec3::Y),
        ..default()
    });

    // 体积雾增强效果
    commands.spawn((
        Camera3dBundle::default(),
        VolumetricFog {
            ambient_color: Color::srgb(0.1, 0.1, 0.2),
            ambient_intensity: 0.02,
            step_count: 128,  // 高质量步进
            jitter: 0.6,
        },
    ));
}
```

### 5.5 性能优化场景

```rust
fn setup_optimized_scene(mut commands: Commands) {
    // 使用光源聚类配置
    commands.spawn((
        Camera3dBundle::default(),
        ClusterConfig::FixedZ {
            total: 2048,       // 减少总聚类数
            z_slices: 16,      // 减少 Z 分片
            z_config: ClusterZConfig {
                first_slice_depth: 3.0,
                far_z_mode: ClusterFarZMode::Constant(50.0),  // 固定远平面
            },
            dynamic_resizing: true,
        },
    ));

    // 限制阴影分辨率
    commands.insert_resource(DirectionalLightShadowMap { size: 1024 });
    commands.insert_resource(PointLightShadowMap { size: 512 });

    // 主要光源启用阴影
    commands.spawn(DirectionalLightBundle {
        directional_light: DirectionalLight {
            shadows_enabled: true,
            illuminance: light_consts::lux::FULL_DAYLIGHT,
            ..default()
        },
        ..default()
    });

    // 次要光源不启用阴影
    for i in 0..10 {
        commands.spawn(PointLightBundle {
            point_light: PointLight {
                intensity: 500.0,
                range: 5.0,
                shadows_enabled: false,  // 禁用阴影提高性能
                ..default()
            },
            transform: Transform::from_xyz(
                (i as f32 - 5.0) * 2.0,
                2.0,
                0.0,
            ),
            ..default()
        });
    }
}
```

## 6. 性能优化建议

### 6.1 光源管理
- 限制同时启用阴影的光源数量（建议不超过 2-3 个）
- 使用较小的阴影贴图分辨率进行测试
- 合理设置光源范围，避免不必要的大范围光照

### 6.2 聚类配置
- 根据场景复杂度调整聚类配置
- 使用 `ClusterFarZMode::Constant` 固定远平面距离
- 启用动态调整 (`dynamic_resizing: true`)

### 6.3 级联阴影优化
- 减少级联数量（WebGL 限制为 1 个）
- 调整级联距离以覆盖关键区域
- 使用合适的重叠比例 (0.1-0.3)

### 6.4 体积效果
- 降低体积雾步进数量以提高性能
- 使用较小的雾体积范围
- 配合 TAA 使用以减少噪点

这份文档涵盖了 `bevy_light` 模块的核心功能和使用方法。通过这些示例和说明，开发者可以快速上手并构建各种复杂的光照场景。