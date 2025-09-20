# Bevy Shader 模块文档

## 模块概述

`bevy_shader` 是 Bevy 引擎中负责着色器资产管理和处理的核心模块。该模块提供了着色器的加载、编译、缓存和导入功能，支持多种着色器格式，包括 WGSL、GLSL、SPIR-V 和 WESL。

### 主要功能

1. **多格式支持**：支持 WGSL、GLSL、SPIR-V 和 WESL 着色器格式
2. **着色器缓存**：提供高效的着色器编译缓存机制
3. **导入系统**：支持着色器模块的导入和依赖管理
4. **预处理功能**：支持着色器预处理指令和宏定义
5. **运行时验证**：可选的着色器运行时验证功能

## 核心结构体和枚举

### 1. Shader

```rust
#[derive(Asset, TypePath, Debug, Clone)]
pub struct Shader {
    pub path: String,
    pub source: Source,
    pub import_path: ShaderImport,
    pub imports: Vec<ShaderImport>,
    pub additional_imports: Vec<naga_oil::compose::ImportDefinition>,
    pub shader_defs: Vec<ShaderDefVal>,
    pub file_dependencies: Vec<Handle<Shader>>,
    pub validate_shader: ValidateShader,
}
```

**主要字段说明**：
- `path`: 着色器文件路径
- `source`: 着色器源码，支持多种格式
- `import_path`: 着色器的导入路径
- `imports`: 该着色器依赖的其他着色器列表
- `shader_defs`: 着色器宏定义列表
- `validate_shader`: 着色器验证配置

### 2. Source 枚举

```rust
#[derive(Debug, Clone)]
pub enum Source {
    Wgsl(Cow<'static, str>),
    Wesl(Cow<'static, str>),
    Glsl(Cow<'static, str>, naga::ShaderStage),
    SpirV(Cow<'static, [u8]>),
}
```

支持的着色器格式：
- **WGSL**: WebGPU 着色语言
- **WESL**: Bevy 扩展的 WGSL
- **GLSL**: OpenGL 着色语言
- **SPIR-V**: 二进制着色器格式

### 3. ShaderDefVal 枚举

```rust
#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq, Eq, Debug, Hash)]
pub enum ShaderDefVal {
    Bool(String, bool),
    Int(String, i32),
    UInt(String, u32),
}
```

用于定义着色器编译时的宏定义，支持布尔值、整数和无符号整数类型。

### 4. ValidateShader 枚举

```rust
#[derive(Clone, Debug, Default)]
pub enum ValidateShader {
    #[default]
    Disabled,
    Enabled,
}
```

控制着色器运行时验证：
- `Disabled`: 不进行运行时检查（默认）
- `Enabled`: 启用运行时安全检查

### 5. ShaderImport 枚举

```rust
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub enum ShaderImport {
    AssetPath(String),
    Custom(String),
}
```

表示着色器导入方式：
- `AssetPath`: 通过资产路径导入
- `Custom`: 自定义导入路径

### 6. ShaderRef 枚举

```rust
#[derive(Default)]
pub enum ShaderRef {
    #[default]
    Default,
    Handle(Handle<Shader>),
    Path(AssetPath<'static>),
}
```

着色器引用方式：
- `Default`: 使用默认着色器
- `Handle`: 通过句柄引用
- `Path`: 通过路径引用

### 7. ShaderCache

```rust
pub struct ShaderCache<ShaderModule, RenderDevice> {
    data: HashMap<AssetId<Shader>, ShaderData<ShaderModule>>,
    load_module: fn(&RenderDevice, ShaderCacheSource, &ValidateShader) -> Result<ShaderModule, PipelineCacheError>,
    #[cfg(feature = "shader_format_wesl")]
    asset_paths: HashMap<wesl::syntax::ModulePath, AssetId<Shader>>,
    shaders: HashMap<AssetId<Shader>, Shader>,
    import_path_shaders: HashMap<ShaderImport, AssetId<Shader>>,
    waiting_on_import: HashMap<ShaderImport, Vec<AssetId<Shader>>>,
    pub composer: naga_oil::compose::Composer,
}
```

着色器缓存系统，负责管理已编译的着色器模块和依赖关系。

## 主要 API 使用示例

### 1. 创建 WGSL 着色器

```rust
use bevy_shader::Shader;

// 从字符串创建 WGSL 着色器
let shader = Shader::from_wgsl(
    r#"
    @vertex
    fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
    "#,
    "my_vertex_shader.wgsl"
);

// 带宏定义的 WGSL 着色器
use bevy_shader::ShaderDefVal;

let shader_defs = vec![
    ShaderDefVal::Bool("ENABLE_LIGHTING".to_string(), true),
    ShaderDefVal::Int("MAX_LIGHTS".to_string(), 16),
];

let shader = Shader::from_wgsl_with_defs(
    shader_source,
    "lighting_shader.wgsl",
    shader_defs
);
```

### 2. 创建 GLSL 着色器

```rust
use naga::ShaderStage;

// 顶点着色器
let vertex_shader = Shader::from_glsl(
    r#"
    #version 450
    layout(location = 0) in vec3 position;

    void main() {
        gl_Position = vec4(position, 1.0);
    }
    "#,
    ShaderStage::Vertex,
    "vertex.vert"
);

// 片段着色器
let fragment_shader = Shader::from_glsl(
    r#"
    #version 450
    layout(location = 0) out vec4 fragColor;

    void main() {
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
    "#,
    ShaderStage::Fragment,
    "fragment.frag"
);
```

### 3. 设置自定义导入路径

```rust
let mut shader = Shader::from_wgsl(source, "shader.wgsl");

// 设置自定义导入路径
shader.set_import_path("my_custom_module");

// 或者使用链式调用
let shader = Shader::from_wgsl(source, "shader.wgsl")
    .with_import_path("my_custom_module");
```

### 4. 使用着色器加载器

```rust
use bevy_shader::{ShaderLoader, ShaderSettings, ShaderDefVal};

// 配置着色器设置
let settings = ShaderSettings {
    shader_defs: vec![
        ShaderDefVal::Bool("DEBUG_MODE".to_string(), true),
        ShaderDefVal::UInt("TEXTURE_SIZE".to_string(), 512),
    ],
};

// 着色器加载器会根据文件扩展名自动选择格式
// .wgsl -> WGSL
// .vert/.frag/.comp -> GLSL
// .spv -> SPIR-V
// .wesl -> WESL
```

### 5. 着色器引用

```rust
use bevy_shader::ShaderRef;
use bevy_asset::AssetPath;

// 使用默认着色器
let shader_ref = ShaderRef::Default;

// 通过路径引用
let shader_ref = ShaderRef::from("shaders/my_shader.wgsl");
let shader_ref = ShaderRef::Path(AssetPath::from("shaders/my_shader.wgsl"));

// 通过句柄引用
let shader_ref = ShaderRef::Handle(shader_handle);
```

### 6. 着色器缓存操作

```rust
use bevy_shader::ShaderCache;

// 设置着色器到缓存
let pipelines_to_recompile = shader_cache.set_shader(shader_id, shader);

// 从缓存中移除着色器
let affected_pipelines = shader_cache.remove(shader_id);

// 获取处理过的着色器模块
let shader_defs = vec![
    ShaderDefVal::Bool("FEATURE_A".to_string(), true),
];
let module = shader_cache.get(render_device, shader_id, &shader_defs)?;
```

## 与其他 Bevy 模块的集成方式

### 1. 与 bevy_asset 集成

```rust
use bevy_asset::{Asset, AssetServer, Handle};
use bevy_shader::Shader;

// 着色器作为资产类型
impl Asset for Shader {
    type Loader = ShaderLoader;
}

// 通过资产服务器加载着色器
fn load_shaders(asset_server: Res<AssetServer>) {
    let shader_handle: Handle<Shader> = asset_server.load("shaders/my_shader.wgsl");
}
```

### 2. 与 bevy_render 集成

着色器模块与渲染系统紧密集成，为渲染管线提供着色器编译和缓存服务：

```rust
// 在渲染管线中使用着色器
fn setup_render_pipeline(
    shader_cache: Res<ShaderCache>,
    shaders: Res<Assets<Shader>>,
) {
    // 获取编译后的着色器模块
    let vertex_module = shader_cache.get(device, vertex_shader_id, &shader_defs)?;
    let fragment_module = shader_cache.get(device, fragment_shader_id, &shader_defs)?;

    // 创建渲染管线
    // ...
}
```

### 3. 与 bevy_reflect 集成

支持运行时反射和序列化：

```rust
use bevy_reflect::{TypePath, Reflect};

// Shader 实现了 TypePath，支持类型注册
// ShaderDefVal 支持序列化和反序列化
```

## 常见使用场景

### 1. 基础着色器加载

最常见的使用场景是加载和使用基础着色器：

```rust
use bevy::prelude::*;
use bevy_shader::Shader;

fn setup_material_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 加载顶点和片段着色器
    let vertex_shader: Handle<Shader> = asset_server.load("shaders/vertex.wgsl");
    let fragment_shader: Handle<Shader> = asset_server.load("shaders/fragment.wgsl");

    // 使用着色器创建材质
    // ...
}
```

### 2. 条件编译着色器

使用宏定义进行条件编译：

```rust
use bevy_shader::{Shader, ShaderDefVal};

fn create_configurable_shader() -> Shader {
    let shader_source = r#"
    #ifdef ENABLE_SHADOWS
        fn calculate_shadows() -> f32 {
            // 阴影计算
            return 1.0;
        }
    #endif

    @fragment
    fn fs_main() -> @location(0) vec4<f32> {
        var color = vec3<f32>(1.0);

        #ifdef ENABLE_SHADOWS
            color *= calculate_shadows();
        #endif

        return vec4<f32>(color, 1.0);
    }
    "#;

    let shader_defs = vec![
        ShaderDefVal::Bool("ENABLE_SHADOWS".to_string(), true),
        ShaderDefVal::Int("SHADOW_CASCADE_COUNT".to_string(), 4),
    ];

    Shader::from_wgsl_with_defs(shader_source, "configurable.wgsl", shader_defs)
}
```

### 3. 着色器模块化和导入

创建可重用的着色器模块：

```rust
// 创建通用的着色器模块
let lighting_module = Shader::from_wgsl(
    r#"
    fn calculate_lighting(normal: vec3<f32>, light_dir: vec3<f32>) -> f32 {
        return max(dot(normal, light_dir), 0.0);
    }
    "#,
    "lighting.wgsl"
).with_import_path("lighting");

// 在其他着色器中导入
let main_shader = Shader::from_wgsl(
    r#"
    #import lighting

    @fragment
    fn fs_main(@location(0) normal: vec3<f32>) -> @location(0) vec4<f32> {
        let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0));
        let lighting = calculate_lighting(normal, light_dir);
        return vec4<f32>(vec3<f32>(lighting), 1.0);
    }
    "#,
    "main.wgsl"
);
```

### 4. 运行时着色器验证

在开发和调试阶段启用着色器验证：

```rust
use bevy_shader::ValidateShader;

let mut shader = Shader::from_wgsl(untrusted_source, "user_shader.wgsl");

// 为不受信任的着色器启用验证
shader.validate_shader = ValidateShader::Enabled;
```

### 5. 自定义着色器加载器设置

```rust
use bevy_shader::{ShaderSettings, ShaderDefVal};

#[derive(Resource)]
struct MaterialSettings {
    enable_pbr: bool,
    max_lights: u32,
}

fn create_shader_settings(material_settings: Res<MaterialSettings>) -> ShaderSettings {
    ShaderSettings {
        shader_defs: vec![
            ShaderDefVal::Bool("ENABLE_PBR".to_string(), material_settings.enable_pbr),
            ShaderDefVal::UInt("MAX_LIGHTS".to_string(), material_settings.max_lights),
        ],
    }
}
```

### 6. 着色器热重载

结合 Bevy 的资产系统实现着色器热重载：

```rust
use bevy::asset::ChangeWatcher;

fn setup_shader_hot_reload(mut commands: Commands) {
    // 启用资产变化监听
    commands.insert_resource(AssetServer::new_with_watch_for_changes());
}

fn handle_shader_reload(
    mut events: EventReader<AssetEvent<Shader>>,
    mut shader_cache: ResMut<ShaderCache>,
) {
    for event in events.read() {
        match event {
            AssetEvent::Modified { id } => {
                // 着色器被修改，清理缓存
                let pipelines_to_recompile = shader_cache.clear(*id);
                // 重新编译受影响的渲染管线
                // ...
            }
            _ => {}
        }
    }
}
```

## 最佳实践

### 1. 性能优化

- 使用着色器缓存避免重复编译
- 合理使用宏定义进行条件编译
- 预编译常用的着色器变体

### 2. 模块化设计

- 将通用功能提取为独立的着色器模块
- 使用清晰的导入路径命名
- 避免循环导入

### 3. 错误处理

- 在生产环境中禁用着色器验证以提高性能
- 在开发环境中启用验证以捕获错误
- 使用有意义的着色器文件路径和命名

### 4. 资源管理

- 正确管理着色器句柄的生命周期
- 及时清理不再使用的着色器缓存
- 监控着色器编译的内存使用

这份文档涵盖了 `bevy_shader` 模块的主要功能和使用方法。该模块是 Bevy 渲染系统的基础组件，为整个引擎提供了强大而灵活的着色器管理能力。