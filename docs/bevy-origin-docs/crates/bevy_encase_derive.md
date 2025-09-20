# Bevy Encase Derive 模块文档

## 模块概述

`bevy_encase_derive` 是 Bevy 引擎中的一个过程宏模块，专门用于提供 `ShaderType` 派生宏的实现。该模块是 Bevy 渲染系统中的关键组件，用于简化 GPU 数据结构的定义和管理。

### 主要功能

- **自动化数据布局**: 为 Rust 结构体自动生成符合 WGSL（WebGPU Shading Language）标准的内存布局
- **统一缓冲区支持**: 生成符合 `std140` 对齐要求的数据结构
- **存储缓冲区支持**: 生成符合 `std430` 对齐要求的数据结构
- **跨平台兼容**: 确保在不同 GPU 架构上的数据布局一致性

### 核心依赖

- `encase_derive_impl`: 提供底层的派生宏实现
- `bevy_macro_utils`: 提供 Bevy 特定的宏工具
- `syn`: 用于 Rust 语法树解析

## 核心结构体和枚举

### ShaderType 派生宏

`ShaderType` 是该模块提供的主要派生宏，用于标记可以在着色器中使用的数据类型。

```rust
#[derive(ShaderType)]
pub struct MyUniform {
    pub value: f32,
    pub color: Vec4,
    pub transform: Mat4,
}
```

### 支持的数据类型

该派生宏支持以下 Rust 数据类型到 WGSL 类型的映射：

| Rust 类型 | WGSL 类型 | 用途 |
|-----------|-----------|------|
| `f32` | `f32` | 32位浮点数 |
| `u32` | `u32` | 32位无符号整数 |
| `i32` | `i32` | 32位有符号整数 |
| `Vec2` | `vec2<f32>` | 2D 向量 |
| `Vec3` | `vec3<f32>` | 3D 向量 |
| `Vec4` | `vec4<f32>` | 4D 向量 |
| `Mat3` | `mat3x3<f32>` | 3x3 矩阵 |
| `Mat4` | `mat4x4<f32>` | 4x4 矩阵 |
| `UVec2` | `vec2<u32>` | 无符号整数 2D 向量 |
| `UVec3` | `vec3<u32>` | 无符号整数 3D 向量 |
| `UVec4` | `vec4<u32>` | 无符号整数 4D 向量 |

## 主要 API 使用示例

### 1. 基础 Uniform 缓冲区

```rust
use bevy::{
    prelude::*,
    render::render_resource::{ShaderType, UniformBuffer},
};

#[derive(ShaderType, Clone)]
pub struct GlobalsUniform {
    /// 自启动以来的时间（秒）
    pub time: f32,
    /// 上一帧的增量时间（秒）
    pub delta_time: f32,
    /// 自应用启动以来的帧数
    pub frame_count: u32,
    /// WebGL2 结构体必须 16 字节对齐的填充
    #[cfg(all(feature = "webgl", target_arch = "wasm32", not(feature = "webgpu")))]
    _wasm_padding: f32,
}

// 使用 UniformBuffer 包装
#[derive(Resource, Default)]
pub struct GlobalsBuffer {
    pub buffer: UniformBuffer<GlobalsUniform>,
}
```

### 2. 材质 Uniform 数据

```rust
use bevy::{
    prelude::*,
    render::render_resource::ShaderType,
};

#[derive(ShaderType, Clone, Default)]
pub struct ColorMaterialUniform {
    /// 材质颜色
    pub color: Vec4,
    /// UV 变换矩阵
    pub uv_transform: Mat3,
    /// 材质标志位
    pub flags: u32,
    /// Alpha 裁剪阈值
    pub alpha_cutoff: f32,
}

// 在材质中使用
#[derive(Asset, TypePath, AsBindGroup, Clone)]
pub struct ColorMaterial {
    #[uniform(0)]
    pub uniform: ColorMaterialUniform,
    #[texture(1)]
    #[sampler(2)]
    pub texture: Option<Handle<Image>>,
}
```

### 3. GPU 预处理数据结构

```rust
use bevy::{
    prelude::*,
    render::render_resource::ShaderType,
};
use bytemuck::{Pod, Zeroable};

#[derive(Clone, Copy, ShaderType, Pod, Zeroable)]
#[repr(C)]
pub struct PreprocessWorkItem {
    /// 调度的工作组数量
    pub dispatch_x: u32,
    pub dispatch_y: u32,
    pub dispatch_z: u32,
    /// 实际工作项数量
    pub work_item_count: u32,
    /// 硬件对齐填充
    pub padding: UVec4,
}
```

### 4. 复杂数据结构

```rust
use bevy::{
    prelude::*,
    render::render_resource::ShaderType,
};

#[derive(ShaderType, Component, Clone)]
pub struct LightData {
    /// 光源位置
    pub position: Vec3,
    /// 光源类型（点光源=0，方向光=1，聚光灯=2）
    pub light_type: u32,
    /// 光源颜色和强度
    pub color: Vec3,
    /// 光源范围
    pub range: f32,
    /// 光源方向（用于方向光和聚光灯）
    pub direction: Vec3,
    /// 聚光灯内锥角余弦值
    pub inner_cone_cos: f32,
    /// 聚光灯外锥角余弦值
    pub outer_cone_cos: f32,
    /// 填充字节以满足对齐要求
    pub _padding: [f32; 3],
}

#[derive(ShaderType, Resource)]
pub struct LightingUniform {
    /// 环境光颜色
    pub ambient_color: Vec3,
    /// 光源数量
    pub light_count: u32,
    /// 光源数据数组（最多支持 256 个光源）
    pub lights: [LightData; 256],
}
```

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_render 集成

```rust
use bevy::{
    app::{App, Plugin},
    render::{
        render_resource::{ShaderType, UniformBuffer},
        RenderApp, RenderSystems,
    },
};

pub struct MyRenderPlugin;

impl Plugin for MyRenderPlugin {
    fn build(&self, app: &mut App) {
        if let Some(render_app) = app.get_sub_app_mut(RenderApp) {
            render_app
                .init_resource::<MyUniformBuffer>()
                .add_systems(
                    Render,
                    update_my_uniform.in_set(RenderSystems::PrepareResources),
                );
        }
    }
}

#[derive(Resource, Default)]
pub struct MyUniformBuffer {
    pub buffer: UniformBuffer<MyUniform>,
}

#[derive(ShaderType, Clone)]
pub struct MyUniform {
    pub data: Vec4,
}
```

### 2. 与材质系统集成

```rust
use bevy::{
    prelude::*,
    render::render_resource::{AsBindGroup, ShaderType},
};

#[derive(Asset, TypePath, AsBindGroup, Clone)]
pub struct CustomMaterial {
    /// 使用 ShaderType 的 uniform 数据
    #[uniform(0)]
    pub properties: CustomMaterialUniform,

    /// 纹理绑定
    #[texture(1)]
    #[sampler(2)]
    pub base_texture: Option<Handle<Image>>,
}

#[derive(ShaderType, Clone, Default)]
pub struct CustomMaterialUniform {
    pub base_color: Vec4,
    pub metallic: f32,
    pub roughness: f32,
    pub emission: Vec3,
    pub alpha_cutoff: f32,
}
```

### 3. 与组件系统集成

```rust
use bevy::{
    prelude::*,
    render::{
        extract_component::{ExtractComponent, UniformComponentPlugin},
        render_resource::ShaderType,
    },
};

// 标记为可提取的组件
#[derive(Component, ShaderType, ExtractComponent, Clone)]
pub struct InstanceData {
    pub transform: Mat4,
    pub color: Vec4,
    pub scale: Vec3,
    pub _padding: f32,
}

// 注册插件以自动处理组件到 uniform 的转换
app.add_plugins(UniformComponentPlugin::<InstanceData>::default());
```

## 常见使用场景

### 1. 全局渲染参数

适用于需要在所有着色器中访问的全局数据，如时间、帧计数、相机参数等。

```rust
#[derive(ShaderType, Resource, Clone)]
pub struct RenderGlobals {
    pub time: f32,
    pub delta_time: f32,
    pub frame_count: u32,
    pub screen_size: Vec2,
    pub camera_position: Vec3,
    pub view_matrix: Mat4,
    pub projection_matrix: Mat4,
}
```

### 2. 材质属性

用于定义材质的渲染属性，如颜色、纹理坐标变换、材质参数等。

```rust
#[derive(ShaderType, Clone)]
pub struct PBRMaterialUniform {
    pub base_color_factor: Vec4,
    pub emissive_factor: Vec3,
    pub metallic_factor: f32,
    pub roughness_factor: f32,
    pub normal_scale: f32,
    pub occlusion_strength: f32,
    pub alpha_cutoff: f32,
    pub flags: u32,
}
```

### 3. 光照数据

用于传递光源信息到着色器进行光照计算。

```rust
#[derive(ShaderType, Clone)]
pub struct DirectionalLight {
    pub direction: Vec3,
    pub illuminance: f32,
    pub color: Vec3,
    pub shadows_enabled: u32,
    pub shadow_depth_bias: f32,
    pub shadow_normal_bias: f32,
}

#[derive(ShaderType, Resource)]
pub struct LightingData {
    pub directional_lights: [DirectionalLight; 16],
    pub directional_light_count: u32,
    pub ambient_color: Vec3,
}
```

### 4. 后处理效果参数

用于传递后处理效果的参数到计算着色器或片段着色器。

```rust
#[derive(ShaderType, Component, Clone)]
pub struct BloomSettings {
    pub threshold: f32,
    pub knee: f32,
    pub intensity: f32,
    pub radius: f32,
    pub iterations: u32,
    pub _padding: [f32; 3],
}

#[derive(ShaderType, Component, Clone)]
pub struct TonemappingSettings {
    pub exposure: f32,
    pub gamma: f32,
    pub mode: u32, // 0=None, 1=Linear, 2=Reinhard, 3=ACES, etc.
    pub _padding: f32,
}
```

### 5. 实例化渲染数据

用于批量渲染多个相似对象的实例数据。

```rust
#[derive(ShaderType, Clone, Copy)]
pub struct InstanceTransform {
    pub model_matrix: Mat4,
    pub inverse_transpose_model: Mat4,
    pub flags: u32,
    pub _padding: [f32; 3],
}

// 用于存储实例数组
#[derive(ShaderType)]
pub struct InstanceBuffer {
    pub instances: Vec<InstanceTransform>,
}
```

## 最佳实践

### 1. 内存对齐

- 确保结构体字段按照 GPU 内存对齐要求排列
- 使用填充字段 `_padding` 来满足对齐要求
- 考虑 WebGL2 的 16 字节对齐限制

### 2. 性能优化

- 将频繁更新的数据和静态数据分离到不同的 uniform 缓冲区
- 使用合适的缓冲区类型（Uniform vs Storage）
- 避免在 uniform 缓冲区中使用过大的数组

### 3. 跨平台兼容性

- 使用条件编译处理不同平台的差异
- 测试在不同 GPU 架构上的表现
- 注意浮点数精度差异

### 4. 调试技巧

- 使用 `debug_assert!` 验证数据完整性
- 实现 `Debug` trait 便于调试
- 使用 GPU 调试工具验证数据传输

## 注意事项

1. **内存布局**: `ShaderType` 派生的结构体必须遵循 GPU 内存布局规则
2. **大小限制**: Uniform 缓冲区通常限制在 16KB 以内
3. **更新频率**: 避免每帧都更新大型 uniform 缓冲区
4. **平台差异**: 不同平台可能有不同的对齐要求
5. **版本兼容**: 确保与目标 WGSL 版本兼容

通过合理使用 `bevy_encase_derive` 模块，可以大大简化 GPU 数据管理的复杂性，提高渲染系统的开发效率和维护性。