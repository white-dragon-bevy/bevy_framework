# Bevy Image 模块文档

## 模块概述

`bevy_image` 是 Bevy 引擎的图像处理核心模块，负责图像资源的加载、处理、纹理图集管理和 GPU 纹理操作。该模块提供了完整的图像处理管道，支持多种图像格式，并提供了高效的纹理图集构建功能。

### 主要功能

- **图像资源管理**: 作为 Bevy 资源系统中的核心图像类型
- **多格式支持**: 支持 PNG、JPEG、DDS、KTX2、BASIS、HDR、EXR 等多种图像格式
- **纹理图集**: 提供静态和动态纹理图集构建功能
- **采样器配置**: 灵活的纹理采样参数设置
- **GPU 集成**: 与 wgpu 紧密集成，支持现代图形 API

### 依赖关系

该模块依赖以下 Bevy 核心模块：
- `bevy_app`: 插件系统集成
- `bevy_asset`: 资源管理系统
- `bevy_ecs`: 实体组件系统
- `bevy_math`: 数学类型支持
- `bevy_color`: 颜色处理
- `bevy_utils`: 实用工具

## 核心结构体和枚举

### Image - 核心图像结构体

`Image` 是模块的核心结构体，表示一个 GPU 纹理资源。

```rust
pub struct Image {
    /// 原始像素数据，如果是存储纹理则可能为 None
    pub data: Option<Vec<u8>>,
    /// 纹理数据布局顺序控制
    pub data_order: TextureDataOrder,
    /// GPU 纹理描述符，定义数据布局和格式
    pub texture_descriptor: TextureDescriptor<Option<&'static str>, &'static [TextureFormat]>,
    /// 渲染时使用的图像采样器
    pub sampler: ImageSampler,
    /// 资源使用标志
    pub asset_usage: RenderAssetUsages,
}
```

#### 关键方法

```rust
impl Image {
    /// 从原始数据创建新图像
    pub fn new(
        size: Extent3d,
        dimension: TextureDimension,
        data: Vec<u8>,
        format: TextureFormat,
        asset_usage: RenderAssetUsages,
    ) -> Self

    /// 创建默认的 1x1 白色纹理
    pub fn default() -> Self

    /// 创建透明纹理
    pub fn transparent() -> Self

    /// 从颜色创建纯色纹理
    pub fn from_color(color: impl Into<Color>, size: Extent3d, asset_usage: RenderAssetUsages) -> Self

    /// 获取图像尺寸
    pub fn size(&self) -> UVec2

    /// 获取图像宽度
    pub fn width(&self) -> u32

    /// 获取图像高度
    pub fn height(&self) -> u32

    /// 获取图像深度
    pub fn depth(&self) -> u32

    /// 获取纹理格式
    pub fn texture_descriptor(&self) -> &TextureDescriptor<Option<&'static str>, &'static [TextureFormat]>

    /// 调整图像大小
    pub fn resize(&mut self, size: Extent3d)

    /// 转换到指定格式
    pub fn convert(&self, new_format: TextureFormat) -> Option<Self>
}
```

### ImageFormat - 支持的图像格式

```rust
pub enum ImageFormat {
    #[cfg(feature = "basis-universal")]
    Basis,
    #[cfg(feature = "bmp")]
    Bmp,
    #[cfg(feature = "dds")]
    Dds,
    #[cfg(feature = "ff")]
    Farbfeld,
    #[cfg(feature = "gif")]
    Gif,
    #[cfg(feature = "exr")]
    OpenExr,
    #[cfg(feature = "hdr")]
    Hdr,
    #[cfg(feature = "ico")]
    Ico,
    #[cfg(feature = "jpeg")]
    Jpeg,
    #[cfg(feature = "ktx2")]
    Ktx2,
    #[cfg(feature = "png")]
    Png,
    #[cfg(feature = "pnm")]
    Pnm,
    #[cfg(feature = "qoi")]
    Qoi,
    #[cfg(feature = "tga")]
    Tga,
    #[cfg(feature = "tiff")]
    Tiff,
    #[cfg(feature = "webp")]
    WebP,
}
```

#### 格式工具方法

```rust
impl ImageFormat {
    /// 获取格式对应的文件扩展名
    pub const fn to_file_extensions(&self) -> &'static [&'static str]

    /// 从文件扩展名推断格式
    pub fn from_extension(extension: &str) -> Option<Self>

    /// 从 MIME 类型推断格式
    pub fn from_mime_type(mime_type: &str) -> Option<Self>
}
```

### ImageSampler - 纹理采样器

```rust
pub enum ImageSampler {
    /// 使用默认采样器
    Default,
    /// 使用自定义采样器描述符
    Descriptor(ImageSamplerDescriptor),
}
```

### ImageSamplerDescriptor - 采样器描述符

```rust
pub struct ImageSamplerDescriptor {
    pub label: Option<String>,
    /// U 方向（X轴）边界处理模式
    pub address_mode_u: ImageAddressMode,
    /// V 方向（Y轴）边界处理模式
    pub address_mode_v: ImageAddressMode,
    /// W 方向（Z轴）边界处理模式
    pub address_mode_w: ImageAddressMode,
    /// 放大时的过滤模式
    pub mag_filter: ImageFilterMode,
    /// 缩小时的过滤模式
    pub min_filter: ImageFilterMode,
    /// Mipmap 过滤模式
    pub mipmap_filter: ImageFilterMode,
    /// 最小细节层级
    pub lod_min_clamp: f32,
    /// 最大细节层级
    pub lod_max_clamp: f32,
    /// 比较功能（用于阴影贴图）
    pub compare: Option<ImageCompareFunction>,
    /// 各向异性过滤级别
    pub anisotropy_clamp: u16,
    /// 边界颜色
    pub border_color: Option<ImageSamplerBorderColor>,
}
```

#### 预设采样器

```rust
impl ImageSamplerDescriptor {
    /// 线性过滤采样器
    pub fn linear() -> Self

    /// 最近邻过滤采样器
    pub fn nearest() -> Self
}
```

### TextureAtlas - 纹理图集

纹理图集系统允许将多个小纹理打包到一个大纹理中，提高渲染效率。

```rust
pub struct TextureAtlas {
    /// 纹理图集布局句柄
    pub layout: Handle<TextureAtlasLayout>,
    /// 在图集中的索引
    pub index: usize,
}
```

### TextureAtlasLayout - 图集布局

```rust
pub struct TextureAtlasLayout {
    /// 图集总尺寸
    pub size: UVec2,
    /// 各个纹理区域的矩形位置
    pub textures: Vec<URect>,
}
```

#### 布局操作方法

```rust
impl TextureAtlasLayout {
    /// 创建空布局
    pub fn new_empty(dimensions: UVec2) -> Self

    /// 从网格创建布局
    pub fn from_grid(
        texture_size: UVec2,
        columns: u32,
        rows: u32,
        padding: Option<UVec2>,
        offset: Option<UVec2>,
    ) -> Self

    /// 添加纹理区域
    pub fn add_texture(&mut self, rect: URect) -> usize

    /// 获取指定索引的纹理矩形
    pub fn texture_rect(&self, index: usize) -> Option<URect>

    /// 获取 UV 坐标
    pub fn uv_rect(&self, index: usize) -> Option<Rect>
}
```

### TextureAtlasBuilder - 图集构建器

用于将多个独立纹理打包成一个纹理图集。

```rust
pub struct TextureAtlasBuilder<'a> {
    textures_to_place: Vec<(Option<AssetId<Image>>, &'a Image)>,
    initial_size: UVec2,
    max_size: UVec2,
    format: TextureFormat,
    auto_format_conversion: bool,
    padding: UVec2,
}
```

#### 构建器方法

```rust
impl<'a> TextureAtlasBuilder<'a> {
    /// 创建新的构建器
    pub fn default() -> Self

    /// 设置初始尺寸
    pub fn initial_size(mut self, size: UVec2) -> Self

    /// 设置最大尺寸
    pub fn max_size(mut self, size: UVec2) -> Self

    /// 设置纹理格式
    pub fn format(mut self, format: TextureFormat) -> Self

    /// 设置填充大小
    pub fn padding(mut self, padding: UVec2) -> Self

    /// 添加纹理
    pub fn add_texture(
        mut self,
        texture_id: Option<AssetId<Image>>,
        texture: &'a Image,
    ) -> Self

    /// 构建图集
    pub fn build(self) -> Result<(TextureAtlasLayout, Image, TextureAtlasSources), TextureAtlasBuilderError>
}
```

### DynamicTextureAtlasBuilder - 动态图集构建器

支持运行时动态添加纹理到图集的构建器。

```rust
pub struct DynamicTextureAtlasBuilder {
    atlas_allocator: AtlasAllocator,
    padding: u32,
}
```

#### 动态构建方法

```rust
impl DynamicTextureAtlasBuilder {
    /// 创建新的动态构建器
    pub fn new(size: UVec2, padding: u32) -> Self

    /// 添加纹理到图集
    pub fn add_texture(
        &mut self,
        atlas_layout: &mut TextureAtlasLayout,
        atlas_image: &mut Image,
        texture: &Image,
    ) -> Result<usize, DynamicTextureAtlasBuilderError>
}
```

## 主要API使用示例

### 1. 基本图像创建和操作

```rust
use bevy_image::{Image, ImageSampler, ImageSamplerDescriptor};
use bevy_asset::RenderAssetUsages;
use bevy_color::Color;
use wgpu_types::{Extent3d, TextureFormat, TextureDimension};

// 创建纯色图像
let red_image = Image::from_color(
    Color::RED,
    Extent3d {
        width: 256,
        height: 256,
        depth_or_array_layers: 1,
    },
    RenderAssetUsages::RENDER_WORLD,
);

// 创建带自定义采样器的图像
let mut image = Image::new(
    Extent3d {
        width: 512,
        height: 512,
        depth_or_array_layers: 1,
    },
    TextureDimension::D2,
    vec![255; 512 * 512 * 4], // RGBA 数据
    TextureFormat::Rgba8UnormSrgb,
    RenderAssetUsages::RENDER_WORLD,
);

// 设置线性采样
image.sampler = ImageSampler::linear();

// 调整图像大小
image.resize(Extent3d {
    width: 1024,
    height: 1024,
    depth_or_array_layers: 1,
});
```

### 2. 纹理图集构建

```rust
use bevy_image::{TextureAtlasBuilder, TextureAtlasLayout, Image};
use bevy_math::UVec2;
use wgpu_types::TextureFormat;

// 创建图集构建器
let mut builder = TextureAtlasBuilder::default()
    .initial_size(UVec2::new(512, 512))
    .max_size(UVec2::new(2048, 2048))
    .format(TextureFormat::Rgba8UnormSrgb)
    .padding(UVec2::new(2, 2));

// 添加纹理（假设已有图像）
// builder = builder.add_texture(Some(texture_id), &image1);
// builder = builder.add_texture(Some(texture_id2), &image2);

// 构建图集
// let (atlas_layout, atlas_image, atlas_sources) = builder.build()?;
```

### 3. 网格式纹理图集创建

```rust
use bevy_image::TextureAtlasLayout;
use bevy_math::UVec2;

// 创建 4x4 网格图集布局
let atlas_layout = TextureAtlasLayout::from_grid(
    UVec2::new(64, 64),  // 每个精灵的尺寸
    4,                   // 列数
    4,                   // 行数
    Some(UVec2::new(2, 2)), // 填充
    Some(UVec2::new(0, 0)), // 偏移
);

// 获取特定索引的纹理区域
if let Some(rect) = atlas_layout.texture_rect(5) {
    println!("纹理 5 的位置: {:?}", rect);
}

// 获取 UV 坐标
if let Some(uv_rect) = atlas_layout.uv_rect(5) {
    println!("纹理 5 的 UV 坐标: {:?}", uv_rect);
}
```

### 4. 动态纹理图集

```rust
use bevy_image::{DynamicTextureAtlasBuilder, TextureAtlasLayout, Image};
use bevy_math::UVec2;
use bevy_asset::RenderAssetUsages;

// 创建动态图集构建器
let mut dynamic_builder = DynamicTextureAtlasBuilder::new(
    UVec2::new(1024, 1024), // 图集尺寸
    2,                      // 填充
);

// 创建图集布局和图像
let mut atlas_layout = TextureAtlasLayout::new_empty(UVec2::new(1024, 1024));
let mut atlas_image = Image::default();

// 动态添加纹理
// let index = dynamic_builder.add_texture(
//     &mut atlas_layout,
//     &mut atlas_image,
//     &new_texture,
// )?;
```

### 5. 自定义采样器配置

```rust
use bevy_image::{ImageSamplerDescriptor, ImageAddressMode, ImageFilterMode};

// 创建重复平铺采样器
let repeat_sampler = ImageSamplerDescriptor {
    address_mode_u: ImageAddressMode::Repeat,
    address_mode_v: ImageAddressMode::Repeat,
    mag_filter: ImageFilterMode::Linear,
    min_filter: ImageFilterMode::Linear,
    ..Default::default()
};

// 创建边缘夹紧采样器
let clamp_sampler = ImageSamplerDescriptor {
    address_mode_u: ImageAddressMode::ClampToEdge,
    address_mode_v: ImageAddressMode::ClampToEdge,
    mag_filter: ImageFilterMode::Nearest,
    min_filter: ImageFilterMode::Nearest,
    ..Default::default()
};
```

## 与其他Bevy模块的集成方式

### 1. 与资源系统集成

```rust
use bevy_app::{App, Plugin};
use bevy_asset::{Assets, Handle};
use bevy_image::{Image, ImagePlugin};

struct MyPlugin;

impl Plugin for MyPlugin {
    fn build(&self, app: &mut App) {
        // 添加图像插件
        app.add_plugins(ImagePlugin::default_linear());

        // 图像插件会自动：
        // - 注册 Image 资源类型
        // - 添加图像加载器
        // - 设置默认纹理
    }
}

// 在系统中使用图像资源
fn use_image_system(
    images: Res<Assets<Image>>,
    image_handle: Res<Handle<Image>>,
) {
    if let Some(image) = images.get(&image_handle) {
        println!("图像尺寸: {}x{}", image.width(), image.height());
    }
}
```

### 2. 与渲染系统集成

```rust
use bevy_ecs::prelude::*;
use bevy_image::Image;
use bevy_asset::Handle;

#[derive(Component)]
struct SpriteComponent {
    texture: Handle<Image>,
}

// 精灵渲染系统
fn sprite_render_system(
    query: Query<&SpriteComponent>,
    images: Res<Assets<Image>>,
) {
    for sprite in query.iter() {
        if let Some(image) = images.get(&sprite.texture) {
            // 执行渲染逻辑
        }
    }
}
```

### 3. 与材质系统集成

```rust
use bevy_image::Image;
use bevy_asset::Handle;

// 材质定义
struct MyMaterial {
    diffuse_texture: Handle<Image>,
    normal_texture: Handle<Image>,
    roughness_texture: Handle<Image>,
}

impl MyMaterial {
    fn new(
        diffuse: Handle<Image>,
        normal: Handle<Image>,
        roughness: Handle<Image>,
    ) -> Self {
        Self {
            diffuse_texture: diffuse,
            normal_texture: normal,
            roughness_texture: roughness,
        }
    }
}
```

## 常见使用场景

### 1. 2D精灵动画

```rust
use bevy_image::{TextureAtlasLayout, TextureAtlas};
use bevy_asset::Handle;
use bevy_ecs::prelude::*;

#[derive(Component)]
struct AnimatedSprite {
    atlas: Handle<TextureAtlasLayout>,
    current_frame: usize,
    frame_count: usize,
    timer: f32,
    frame_duration: f32,
}

impl AnimatedSprite {
    fn new(atlas: Handle<TextureAtlasLayout>, frame_count: usize) -> Self {
        Self {
            atlas,
            current_frame: 0,
            frame_count,
            timer: 0.0,
            frame_duration: 0.1, // 每帧0.1秒
        }
    }
}

fn animate_sprites_system(
    time: Res<Time>,
    mut query: Query<(&mut AnimatedSprite, &mut TextureAtlas)>,
) {
    for (mut animated, mut atlas) in query.iter_mut() {
        animated.timer += time.delta_seconds();

        if animated.timer >= animated.frame_duration {
            animated.timer = 0.0;
            animated.current_frame = (animated.current_frame + 1) % animated.frame_count;
            atlas.index = animated.current_frame;
        }
    }
}
```

### 2. 字体纹理图集

```rust
use bevy_image::{DynamicTextureAtlasBuilder, TextureAtlasLayout, Image};
use bevy_math::UVec2;
use std::collections::HashMap;

struct FontAtlas {
    atlas_image: Image,
    atlas_layout: TextureAtlasLayout,
    builder: DynamicTextureAtlasBuilder,
    glyph_indices: HashMap<char, usize>,
}

impl FontAtlas {
    fn new(size: UVec2) -> Self {
        Self {
            atlas_image: Image::default(),
            atlas_layout: TextureAtlasLayout::new_empty(size),
            builder: DynamicTextureAtlasBuilder::new(size, 1),
            glyph_indices: HashMap::new(),
        }
    }

    fn add_glyph(&mut self, character: char, glyph_image: &Image) -> Result<usize, Box<dyn std::error::Error>> {
        if let Some(&index) = self.glyph_indices.get(&character) {
            return Ok(index);
        }

        let index = self.builder.add_texture(
            &mut self.atlas_layout,
            &mut self.atlas_image,
            glyph_image,
        )?;

        self.glyph_indices.insert(character, index);
        Ok(index)
    }

    fn get_glyph_index(&self, character: char) -> Option<usize> {
        self.glyph_indices.get(&character).copied()
    }
}
```

### 3. 程序生成纹理

```rust
use bevy_image::Image;
use bevy_color::Color;
use bevy_asset::RenderAssetUsages;
use wgpu_types::{Extent3d, TextureFormat};

fn generate_checkerboard_texture(size: u32, checker_size: u32) -> Image {
    let mut data = Vec::with_capacity((size * size * 4) as usize);

    for y in 0..size {
        for x in 0..size {
            let checker_x = (x / checker_size) % 2;
            let checker_y = (y / checker_size) % 2;

            let color = if (checker_x + checker_y) % 2 == 0 {
                Color::WHITE
            } else {
                Color::BLACK
            };

            let [r, g, b, a] = color.to_srgba().to_u8_array();
            data.extend_from_slice(&[r, g, b, a]);
        }
    }

    Image::new(
        Extent3d {
            width: size,
            height: size,
            depth_or_array_layers: 1,
        },
        wgpu_types::TextureDimension::D2,
        data,
        TextureFormat::Rgba8UnormSrgb,
        RenderAssetUsages::RENDER_WORLD,
    )
}

fn generate_gradient_texture(width: u32, height: u32) -> Image {
    let mut data = Vec::with_capacity((width * height * 4) as usize);

    for y in 0..height {
        for x in 0..width {
            let u = x as f32 / width as f32;
            let v = y as f32 / height as f32;

            let r = (u * 255.0) as u8;
            let g = (v * 255.0) as u8;
            let b = ((u + v) * 0.5 * 255.0) as u8;
            let a = 255;

            data.extend_from_slice(&[r, g, b, a]);
        }
    }

    Image::new(
        Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
        wgpu_types::TextureDimension::D2,
        data,
        TextureFormat::Rgba8UnormSrgb,
        RenderAssetUsages::RENDER_WORLD,
    )
}
```

### 4. 图像后处理效果

```rust
use bevy_image::Image;
use bevy_color::Color;

trait ImageProcessor {
    fn process(&self, image: &mut Image);
}

struct GrayscaleProcessor;

impl ImageProcessor for GrayscaleProcessor {
    fn process(&self, image: &mut Image) {
        if let Some(data) = &mut image.data {
            // 假设是 RGBA8 格式
            for chunk in data.chunks_mut(4) {
                let r = chunk[0] as f32;
                let g = chunk[1] as f32;
                let b = chunk[2] as f32;

                // 使用加权平均计算灰度值
                let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;

                chunk[0] = gray;
                chunk[1] = gray;
                chunk[2] = gray;
                // chunk[3] (alpha) 保持不变
            }
        }
    }
}

struct BrightnessProcessor {
    factor: f32,
}

impl ImageProcessor for BrightnessProcessor {
    fn process(&self, image: &mut Image) {
        if let Some(data) = &mut image.data {
            for chunk in data.chunks_mut(4) {
                chunk[0] = ((chunk[0] as f32 * self.factor).min(255.0)) as u8;
                chunk[1] = ((chunk[1] as f32 * self.factor).min(255.0)) as u8;
                chunk[2] = ((chunk[2] as f32 * self.factor).min(255.0)) as u8;
            }
        }
    }
}

// 使用示例
fn apply_image_effects(mut image: Image) -> Image {
    let grayscale = GrayscaleProcessor;
    let brightness = BrightnessProcessor { factor: 1.2 };

    grayscale.process(&mut image);
    brightness.process(&mut image);

    image
}
```

### 5. 纹理压缩和优化

```rust
use bevy_image::{Image, CompressedImageFormats};
use wgpu_types::{TextureFormat, Features};

fn optimize_texture_for_platform(mut image: Image, gpu_features: Features) -> Image {
    let supported_formats = CompressedImageFormats::from_features(gpu_features);

    // 根据平台支持选择最佳压缩格式
    let target_format = if supported_formats.supports(TextureFormat::Bc1RgbaUnormSrgb) {
        // PC/Console 平台，使用 BC 压缩
        TextureFormat::Bc1RgbaUnormSrgb
    } else if supported_formats.supports(TextureFormat::Etc2Rgb8UnormSrgb) {
        // 移动平台，使用 ETC2 压缩
        TextureFormat::Etc2Rgb8UnormSrgb
    } else {
        // 回退到未压缩格式
        TextureFormat::Rgba8UnormSrgb
    };

    // 执行格式转换（这里需要实际的压缩实现）
    if let Some(converted) = image.convert(target_format) {
        converted
    } else {
        image
    }
}
```

## 特性和功能开关

bevy_image 模块使用 Cargo 特性来控制支持的图像格式和功能：

### 图像格式特性

- `png`: PNG 格式支持
- `jpeg`: JPEG 格式支持
- `bmp`: BMP 格式支持
- `tga`: TGA 格式支持
- `dds`: DDS 格式支持
- `ktx2`: KTX2 格式支持
- `basis-universal`: Basis Universal 压缩支持
- `webp`: WebP 格式支持
- `tiff`: TIFF 格式支持
- `exr`: OpenEXR HDR 格式支持
- `hdr`: Radiance HDR 格式支持

### 压缩和序列化特性

- `zstd_rust`: 纯 Rust zstd 压缩实现
- `zstd_c`: C 绑定 zstd 压缩实现
- `serialize`: 序列化支持
- `compressed_image_saver`: 压缩图像保存支持

### 使用示例

在 `Cargo.toml` 中启用特定格式：

```toml
[dependencies]
bevy_image = {
    version = "0.17",
    features = ["png", "jpeg", "ktx2", "basis-universal"]
}
```

## 性能优化建议

### 1. 纹理图集使用

- 将小纹理合并到图集中减少绘制调用
- 使用合适的图集尺寸避免浪费
- 为不同用途创建专门的图集

### 2. 格式选择

- 对于不需要透明的图像使用 RGB 格式
- 在支持的平台使用压缩格式
- HDR 内容使用适当的浮点格式

### 3. 采样器配置

- 根据使用场景选择合适的过滤模式
- 对像素艺术使用 Nearest 过滤
- 对照片纹理使用 Linear 过滤

### 4. 内存管理

- 及时释放不需要的图像数据
- 使用适当的 `RenderAssetUsages` 标志
- 考虑使用流式加载大纹理

这份文档涵盖了 bevy_image 模块的核心功能和使用方法。该模块是 Bevy 图形渲染管道的重要组成部分，为开发者提供了强大而灵活的图像处理能力。