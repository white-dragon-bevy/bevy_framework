# Bevy Core Pipeline 模块文档

## 概述

`bevy_core_pipeline` 是 Bevy 引擎的核心渲染管道模块，提供了完整的 2D 和 3D 渲染流水线实现。该模块包含了从前置通道（prepass）到后处理的完整渲染流程，支持延迟渲染、色调映射、上采样等高级渲染技术。

## 主要功能

- **2D 渲染流水线**：支持不透明、半透明和 alpha 遮罩材质
- **3D 渲染流水线**：支持复杂的 3D 场景渲染，包括延迟渲染
- **前置通道（Prepass）**：生成深度、法线和运动矢量纹理
- **延迟渲染**：高效处理大量光源的场景
- **后处理效果**：色调映射、上采样、抗锯齿等
- **Skybox 支持**：天空盒渲染
- **透明度支持**：顺序无关透明度（OIT）

---

## 核心结构体和枚举

### 1. CorePipelinePlugin

主插件结构体，负责初始化整个核心渲染管道。

```rust
#[derive(Default)]
pub struct CorePipelinePlugin;
```

**功能**：
- 初始化 2D 和 3D 渲染管道
- 注册嵌入式着色器资源
- 配置渲染应用的系统和资源

### 2. 2D 渲染相关结构

#### Core2d 渲染图
```rust
#[derive(Debug, Hash, PartialEq, Eq, Clone, RenderSubGraph)]
pub struct Core2d;
```

#### 2D 渲染节点
```rust
#[derive(Debug, Hash, PartialEq, Eq, Clone, RenderLabel)]
pub enum Node2d {
    MsaaWriteback,
    StartMainPass,
    MainOpaquePass,
    MainTransparentPass,
    EndMainPass,
    // ... 更多节点
}
```

#### 2D 渲染阶段项

**Opaque2d** - 不透明 2D 对象
```rust
pub struct Opaque2d {
    pub batch_set_key: BatchSetKey2d,
    pub bin_key: Opaque2dBinKey,
    pub representative_entity: (Entity, MainEntity),
    pub batch_range: Range<u32>,
    pub extra_index: PhaseItemExtraIndex,
}
```

**Transparent2d** - 透明 2D 对象
```rust
pub struct Transparent2d {
    pub sort_key: FloatOrd,
    pub entity: (Entity, MainEntity),
    pub pipeline: CachedRenderPipelineId,
    // ... 其他字段
}
```

### 3. 3D 渲染相关结构

#### Core3d 渲染图
```rust
#[derive(Debug, Hash, PartialEq, Eq, Clone, RenderSubGraph)]
pub struct Core3d;
```

#### 3D 渲染节点
```rust
#[derive(Debug, Hash, PartialEq, Eq, Clone, RenderLabel)]
pub enum Node3d {
    EarlyPrepass,
    LatePrepass,
    StartMainPass,
    MainOpaquePass,
    MainTransmissivePass,
    MainTransparentPass,
    // ... 更多节点包括后处理
}
```

#### 3D 渲染阶段项

**Opaque3d** - 不透明 3D 对象
```rust
pub struct Opaque3d {
    pub batch_set_key: Opaque3dBatchSetKey,
    pub bin_key: Opaque3dBinKey,
    pub representative_entity: (Entity, MainEntity),
    pub batch_range: Range<u32>,
    pub extra_index: PhaseItemExtraIndex,
}
```

**Transparent3d** - 透明 3D 对象
```rust
pub struct Transparent3d {
    pub distance: f32,
    pub pipeline: CachedRenderPipelineId,
    pub entity: (Entity, MainEntity),
    // ... 其他字段
}
```

### 4. 前置通道（Prepass）组件

#### 深度前置通道
```rust
#[derive(Component, Default, Reflect, Clone)]
pub struct DepthPrepass;
```

#### 法线前置通道
```rust
#[derive(Component, Default, Reflect, Clone)]
pub struct NormalPrepass;
```

#### 运动矢量前置通道
```rust
#[derive(Component, Default, Reflect, Clone)]
pub struct MotionVectorPrepass;
```

#### 延迟前置通道
```rust
#[derive(Component, Default, Reflect)]
pub struct DeferredPrepass;
```

#### 前置通道纹理容器
```rust
#[derive(Component)]
pub struct ViewPrepassTextures {
    pub depth: Option<ColorAttachment>,
    pub normal: Option<ColorAttachment>,
    pub motion_vectors: Option<ColorAttachment>,
    pub deferred: Option<ColorAttachment>,
    pub deferred_lighting_pass_id: Option<ColorAttachment>,
    pub size: Extent3d,
}
```

### 5. 色调映射相关结构

#### 色调映射枚举
```rust
#[derive(Component, Debug, Hash, Clone, Copy, Reflect, Default, ExtractComponent, PartialEq, Eq)]
pub enum Tonemapping {
    None,
    Reinhard,
    ReinhardLuminance,
    AcesFitted,
    AgX,
    SomewhatBoringDisplayTransform,
    #[default]
    TonyMcMapface,
    BlenderFilmic,
}
```

#### 去带化抖动
```rust
#[derive(Component, Debug, Hash, Clone, Copy, Reflect, Default, ExtractComponent, PartialEq, Eq)]
pub enum DebandDither {
    #[default]
    Disabled,
    Enabled,
}
```

#### 色调映射 LUT 资源
```rust
#[derive(Resource, Clone, ExtractResource)]
pub struct TonemappingLuts {
    pub blender_filmic: Handle<Image>,
    pub agx: Handle<Image>,
    pub tony_mc_mapface: Handle<Image>,
}
```

### 6. Skybox 相关结构

```rust
#[derive(Component, Clone, Reflect)]
pub struct Skybox {
    pub image: Handle<Image>,
    pub brightness: f32,
    pub rotation: Quat,
}
```

---

## 主要 API 使用示例

### 1. 基本 2D 渲染设置

```rust
use bevy::prelude::*;
use bevy_core_pipeline::core_2d::Core2d;

fn setup_2d_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d::default(),
        Camera::default(),
    ));
}
```

### 2. 3D 渲染设置

```rust
use bevy::prelude::*;
use bevy_core_pipeline::{
    core_3d::Core3d,
    prepass::{DepthPrepass, NormalPrepass},
    tonemapping::Tonemapping,
};

fn setup_3d_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        // 启用深度和法线前置通道
        DepthPrepass,
        NormalPrepass,
        // 配置色调映射
        Tonemapping::TonyMcMapface,
    ));
}
```

### 3. 延迟渲染设置

```rust
use bevy_core_pipeline::{
    prepass::{DepthPrepass, DeferredPrepass},
    deferred::{Opaque3dDeferred, AlphaMask3dDeferred},
};

fn setup_deferred_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        // 延迟渲染需要深度前置通道
        DepthPrepass,
        DeferredPrepass,
    ));
}
```

### 4. Skybox 设置

```rust
use bevy_core_pipeline::skybox::Skybox;

fn setup_skybox(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        Skybox {
            image: asset_server.load("skybox.hdr"),
            brightness: 1000.0,
            rotation: Quat::from_rotation_y(0.25),
        },
    ));
}
```

### 5. 自定义后处理管道

```rust
use bevy_core_pipeline::{
    tonemapping::{Tonemapping, DebandDither},
    upscaling::UpscalingNode,
};

fn setup_postprocessing_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        Tonemapping::AgX,
        DebandDither::Enabled,
    ));
}
```

### 6. 访问前置通道纹理

```rust
use bevy_core_pipeline::prepass::ViewPrepassTextures;

fn use_prepass_textures(
    query: Query<&ViewPrepassTextures>,
) {
    for prepass_textures in query.iter() {
        if let Some(depth_view) = prepass_textures.depth_view() {
            // 使用深度纹理
        }
        if let Some(normal_view) = prepass_textures.normal_view() {
            // 使用法线纹理
        }
    }
}
```

---

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_render 的集成

`bevy_core_pipeline` 是建立在 `bevy_render` 基础之上的：

- **RenderGraph 集成**：使用 `bevy_render` 的渲染图系统组织渲染流程
- **RenderPhase 集成**：利用渲染阶段系统进行批处理和排序
- **Pipeline 系统**：使用专用渲染管道系统实现特定功能

```rust
// 添加到渲染图
render_app
    .add_render_sub_graph(Core3d)
    .add_render_graph_node::<ViewNodeRunner<MainOpaquePass3dNode>>(
        Core3d,
        Node3d::MainOpaquePass,
    );
```

### 2. 与 bevy_camera 的集成

- **相机组件**：扩展 `Camera2d` 和 `Camera3d` 组件
- **渲染图绑定**：自动为相机分配合适的渲染图
- **组件要求**：使用 Bevy 的组件要求系统自动添加必需组件

```rust
app.register_required_components_with::<Camera3d, CameraRenderGraph>(|| {
    CameraRenderGraph::new(Core3d)
});
```

### 3. 与 bevy_pbr 的集成

- **材质系统**：支持 PBR 材质的渲染
- **光照计算**：在延迟渲染中处理光照
- **着色器互操作性**：共享着色器实用工具

### 4. 与 bevy_sprite 的集成

- **2D 渲染**：处理精灵渲染
- **批处理**：优化 2D 对象的渲染性能

---

## 常见使用场景

### 1. 高性能 2D 游戏

```rust
// 基本 2D 设置
fn setup_2d_game(mut commands: Commands) {
    commands.spawn((
        Camera2d::default(),
        Camera::default(),
        // 禁用色调映射以获得更好的 2D 性能
        Tonemapping::None,
    ));
}
```

### 2. 复杂 3D 场景

```rust
// 启用所有前置通道以支持高级效果
fn setup_complex_3d_scene(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        DepthPrepass,
        NormalPrepass,
        MotionVectorPrepass,
        Tonemapping::TonyMcMapface,
        DebandDither::Enabled,
    ));
}
```

### 3. 大量光源场景（延迟渲染）

```rust
// 延迟渲染适合处理大量光源
fn setup_many_lights_scene(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        DepthPrepass,
        DeferredPrepass,
        Tonemapping::AgX,
    ));
}
```

### 4. VR/AR 应用

```rust
// 针对 VR 优化的设置
fn setup_vr_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        // 通常 VR 需要较少的后处理以减少延迟
        Tonemapping::None,
        DebandDither::Disabled,
    ));
}
```

### 5. 电影级渲染

```rust
// 高质量渲染设置
fn setup_cinematic_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        DepthPrepass,
        NormalPrepass,
        MotionVectorPrepass,
        Tonemapping::BlenderFilmic,
        DebandDither::Enabled,
    ));
}
```

### 6. 移动设备优化

```rust
// 移动设备的性能优化设置
fn setup_mobile_camera(mut commands: Commands) {
    commands.spawn((
        Camera3d::default(),
        Camera::default(),
        // 只启用必要的前置通道
        DepthPrepass,
        // 使用性能友好的色调映射
        Tonemapping::Reinhard,
        DebandDither::Disabled,
    ));
}
```

---

## 高级功能

### 1. 自定义渲染阶段

可以通过扩展现有的渲染阶段来添加自定义渲染逻辑：

```rust
// 添加自定义 3D 渲染阶段
#[derive(PartialEq, Eq, Hash)]
pub struct CustomOpaque3d {
    pub distance: f32,
    pub pipeline: CachedRenderPipelineId,
    pub entity: Entity,
    pub draw_function: DrawFunctionId,
}
```

### 2. 渲染管道特化

利用管道特化系统创建针对特定场景优化的渲染管道：

```rust
#[derive(PartialEq, Eq, Hash, Clone, Copy)]
pub struct CustomPipelineKey {
    pub feature_flags: u32,
    pub texture_format: TextureFormat,
}

impl SpecializedRenderPipeline for CustomPipeline {
    type Key = CustomPipelineKey;

    fn specialize(&self, key: Self::Key) -> RenderPipelineDescriptor {
        // 根据 key 创建特化的管道
    }
}
```

### 3. 自定义后处理效果

可以在现有的后处理管道中插入自定义效果：

```rust
// 在色调映射之前添加自定义后处理
render_app
    .add_render_graph_node::<ViewNodeRunner<CustomPostProcessNode>>(
        Core3d,
        CustomNode::PostProcess,
    )
    .add_render_graph_edges(
        Core3d,
        (Node3d::EndMainPass, CustomNode::PostProcess, Node3d::Tonemapping),
    );
```

---

## 性能优化建议

### 1. 选择合适的前置通道

- **深度前置通道**：总是启用，成本较低
- **法线前置通道**：仅在需要时启用（如屏幕空间反射）
- **运动矢量前置通道**：仅在需要运动模糊或TAA时启用

### 2. 色调映射选择

- **性能优先**：`Tonemapping::None` 或 `Tonemapping::Reinhard`
- **质量优先**：`Tonemapping::TonyMcMapface` 或 `Tonemapping::AgX`
- **移动设备**：避免使用需要 LUT 的色调映射

### 3. 批处理优化

- 使用相同材质和网格的对象可以更好地批处理
- 避免频繁更改渲染状态

### 4. 延迟渲染使用建议

- 适合大量光源的场景（>10个动态光源）
- 不适合主要是透明对象的场景
- 与 MSAA 不兼容，会自动禁用

---

## 故障排除

### 1. 常见问题

**问题：延迟渲染不工作**
- 解决：确保同时启用了 `DepthPrepass` 和 `DeferredPrepass`

**问题：色调映射效果不正确**
- 解决：检查是否启用了 `tonemapping_luts` 功能（对于某些色调映射方法）

**问题：前置通道纹理为空**
- 解决：确保相机上添加了相应的前置通道组件

### 2. 调试建议

- 使用 `bevy_inspector_egui` 查看渲染组件状态
- 检查渲染图的执行顺序
- 验证管道特化键是否正确

### 3. 平台兼容性

- WebGL 2 平台限制了某些功能（如深度纹理采样）
- 移动设备可能需要降低精度设置
- 某些色调映射方法需要额外的功能标志

---

## 结论

`bevy_core_pipeline` 是 Bevy 引擎渲染系统的核心，提供了灵活而强大的渲染管道架构。通过理解其组件结构和使用模式，开发者可以构建从简单 2D 游戏到复杂 3D 应用的各种项目。模块的设计充分考虑了性能和可扩展性，允许根据具体需求进行定制和优化。

正确使用这个模块的关键在于：
1. 选择合适的渲染管道配置
2. 根据目标平台调整设置
3. 理解各种前置通道和后处理效果的成本
4. 合理利用批处理和管道特化优化性能

通过遵循本文档中的指导和最佳实践，开发者可以充分发挥 Bevy 渲染系统的潜力，创建高性能和视觉效果出色的应用程序。