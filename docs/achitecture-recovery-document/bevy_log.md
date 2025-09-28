# Bevy Log 架构恢复文档

## 1. 模块概述

`bevy_log` 是 Bevy 引擎的日志系统核心模块，提供了跨平台的日志记录功能，基于 Rust 的 `tracing` 生态系统构建。该模块负责配置和初始化全局日志收集器（subscriber），并为不同平台（桌面、Web、Android、iOS）提供适配层。

### 1.1 核心职责

- **统一日志接口**：重导出 `tracing` 宏（`trace!`, `debug!`, `info!`, `warn!`, `error!`）
- **平台适配**：为不同目标平台提供专用的日志后端
- **插件化配置**：通过 `LogPlugin` 集成到 Bevy 应用生命周期
- **灵活过滤**：支持基于环境变量和代码的日志级别过滤
- **扩展性**：允许用户添加自定义 tracing layers
- **性能分析集成**：可选支持 Tracy 和 Chrome Tracing

## 2. 文件结构与职责

```
bevy-origin/crates/bevy_log/
├── Cargo.toml                    # 依赖配置和特性门控
├── README.md                     # 模块说明文档
└── src/
    ├── lib.rs                    # 主模块，LogPlugin 实现
    ├── android_tracing.rs        # Android 平台日志层实现
    └── once.rs                   # 单次日志宏定义
```

### 2.1 各文件详细职责

#### `lib.rs` (416 行)
- **LogPlugin 定义**：主插件结构体，包含日志配置选项
- **全局初始化**：设置 tracing subscriber 和 log 桥接
- **平台分支**：根据编译目标选择合适的日志层
- **层组合逻辑**：将多个 tracing layers 组合成完整的订阅者
- **错误处理**：处理重复初始化和环境变量解析错误
- **宏重导出**：统一导出所有日志宏

#### `android_tracing.rs` (100 行)
- **AndroidLayer 实现**：自定义 tracing Layer 用于 Android 平台
- **日志格式化**：将 tracing 事件转换为 Android 日志格式
- **优先级映射**：将 tracing::Level 映射到 Android LogPriority
- **Span 扩展**：存储和记录 span 数据到 Android 日志
- **FFI 调用**：安全封装 `android_log_sys::__android_log_write`

#### `once.rs` (50 行)
- **单次宏定义**：提供 `*_once!` 变体宏（trace_once, debug_once 等）
- **防重复日志**：利用 `bevy_utils::once!` 确保每个调用点只记录一次
- **系统友好**：专为每帧执行的系统设计，避免日志泛滥

## 3. 核心抽象与数据结构

### 3.1 LogPlugin 结构体

```rust
pub struct LogPlugin {
    /// EnvFilter 格式的过滤字符串
    pub filter: String,

    /// 全局最低日志级别
    pub level: Level,

    /// 自定义层构造函数（在插件初始化时调用一次）
    pub custom_layer: fn(app: &mut App) -> Option<BoxedLayer>,

    /// 格式化层覆盖函数（替换默认的 fmt layer）
    pub fmt_layer: fn(app: &mut App) -> Option<BoxedFmtLayer>,
}
```

**设计要点**：
- 使用函数指针而非闭包，避免生命周期复杂性
- `custom_layer` 用于添加额外层（如自定义分析器）
- `fmt_layer` 用于完全替换默认格式化器
- 所有字段都有合理的默认值

### 3.2 类型别名系统

```rust
// 基础层类型（可附加到 Registry）
pub type BoxedLayer = Box<dyn Layer<Registry> + Send + Sync + 'static>;

// 预格式化订阅者（包含 EnvFilter 和可选自定义层）
#[cfg(feature = "trace")]
type PreFmtSubscriber = Layered<
    tracing_error::ErrorLayer<BaseSubscriber>,
    BaseSubscriber
>;

#[cfg(not(feature = "trace"))]
type PreFmtSubscriber = Layered<
    EnvFilter,
    Layered<Option<Box<dyn Layer<Registry> + Send + Sync>>, Registry>
>;

// 格式化层类型（可附加到 PreFmtSubscriber）
pub type BoxedFmtLayer = Box<dyn Layer<PreFmtSubscriber> + Send + Sync + 'static>;
```

**类型层次结构**：
1. `Registry`：最底层，tracing-subscriber 的核心注册表
2. `BaseSubscriber`：Registry + 可选自定义层 + EnvFilter
3. `PreFmtSubscriber`：BaseSubscriber + 可选 ErrorLayer（feature gated）
4. `FinalSubscriber`：PreFmtSubscriber + 格式化层 + 平台层

### 3.3 AndroidLayer 结构体

```rust
#[derive(Default)]
pub(crate) struct AndroidLayer;

struct StringRecorder(String, bool);
// String: 累积的日志消息
// bool: 是否已记录第一个字段
```

**访问者模式**：
- 实现 `Visit` trait 来收集 tracing 字段
- 特殊处理 "message" 字段（作为主消息）
- 其他字段格式化为 "key = value;" 形式

## 4. 初始化流程详解

### 4.1 插件构建时序图

```
App::new()
  └─> add_plugins(DefaultPlugins)
      └─> LogPlugin::build(app)
          ├─> [1] 设置 panic hook (feature: trace)
          ├─> [2] 创建 Registry 订阅者
          ├─> [3] 添加用户自定义层 (custom_layer)
          ├─> [4] 构建 EnvFilter
          │   ├─> 尝试从 RUST_LOG 环境变量读取
          │   └─> 失败则使用 level + filter 配置
          ├─> [5] 添加 ErrorLayer (feature: trace)
          ├─> [6] 平台特定层选择
          │   ├─> Desktop: fmt + chrome + tracy
          │   ├─> WASM: WASMLayer
          │   ├─> Android: AndroidLayer
          │   └─> iOS: OsLogger
          ├─> [7] 初始化 LogTracer (桥接 log crate)
          └─> [8] 设置全局默认订阅者
```

### 4.2 EnvFilter 构建逻辑

```rust
let default_filter = format!("{},{}", self.level, self.filter);
// 例如: "INFO,wgpu=error,naga=warn"

let filter_layer = EnvFilter::try_from_default_env()
    .or_else(|from_env_error| {
        // 解析环境变量失败时打印错误
        eprintln!("LogPlugin failed to parse filter from env: {parse_err}");
        // 降级到宽松解析模式
        Ok(EnvFilter::builder().parse_lossy(&default_filter))
    })
    .unwrap();
```

**优先级**：
1. `RUST_LOG` 环境变量（最高优先级）
2. `LogPlugin::filter` + `LogPlugin::level` 配置
3. 默认值：`DEFAULT_FILTER = "wgpu=error,naga=warn"` + `Level::INFO`

### 4.3 平台特定初始化

#### 桌面平台 (非 WASM/Android/iOS)

```rust
// 1. 格式化层
let fmt_layer = (self.fmt_layer)(app).unwrap_or_else(|| {
    Box::new(
        tracing_subscriber::fmt::Layer::default()
            .with_writer(std::io::stderr)
    )
});

// 2. Tracy 层 (feature: tracing-tracy)
#[cfg(feature = "tracing-tracy")]
let tracy_layer = tracing_tracy::TracyLayer::default();

// 3. Chrome 层 (feature: tracing-chrome)
#[cfg(feature = "tracing-chrome")]
let chrome_layer = {
    let (layer, guard) = ChromeLayerBuilder::new()
        .file(env::var("TRACE_CHROME").unwrap_or_default())
        .build();
    app.insert_resource(FlushGuard(SyncCell::new(guard)));
    layer
};

// 4. 组合所有层
subscriber.with(fmt_layer)
    .with(chrome_layer)  // 可选
    .with(tracy_layer)   // 可选
```

#### WASM 平台

```rust
subscriber.with(tracing_wasm::WASMLayer::new(
    tracing_wasm::WASMLayerConfig::default()
))
```

#### Android 平台

```rust
subscriber.with(android_tracing::AndroidLayer::default())
```

#### iOS 平台

```rust
subscriber.with(tracing_oslog::OsLogger::default())
```

## 5. 日志层（Layer）架构

### 5.1 层的类型与职责

| 层类型 | 职责 | 平台 | 特性标志 |
|--------|------|------|----------|
| `EnvFilter` | 过滤日志事件 | 所有 | 无 |
| `ErrorLayer` | 捕获 span 跟踪用于错误报告 | 所有 | `trace` |
| `fmt::Layer` | 格式化输出到 stderr | 桌面 | 无 |
| `ChromeLayer` | 导出到 Chrome Tracing 格式 | 桌面 | `tracing-chrome` |
| `TracyLayer` | 集成 Tracy 性能分析器 | 桌面 | `tracing-tracy` |
| `WASMLayer` | 输出到浏览器控制台 | WASM | 无 |
| `AndroidLayer` | 输出到 Android logcat | Android | 无 |
| `OsLogger` | 输出到 iOS 系统日志 | iOS | 无 |

### 5.2 层的组合模式

tracing-subscriber 使用 **洋葱模型**（Layered type）组合多个层：

```rust
type ComplexSubscriber =
    Layered<LayerA,          // 最外层
    Layered<LayerB,
    Layered<LayerC,
    Registry>>>              // 最内层

// 等价于函数组合
Registry
    .with(LayerC)
    .with(LayerB)
    .with(LayerA)
```

**执行顺序**：
- 事件传播：从外到内（LayerA → LayerB → LayerC → Registry）
- 每层可以观察、修改或过滤事件

### 5.3 AndroidLayer 详细实现

#### 生命周期钩子

```rust
impl<S: Subscriber + for<'a> LookupSpan<'a>> Layer<S> for AndroidLayer {
    // 新 span 创建时调用
    fn on_new_span(&self, attrs: &Attributes<'_>, id: &Id, ctx: Context<'_, S>) {
        let mut recorder = StringRecorder::new();
        attrs.record(&mut recorder);  // 收集 span 字段

        // 将记录器存储到 span 扩展中
        ctx.span(id)
            .unwrap()
            .extensions_mut()
            .insert::<StringRecorder>(recorder);
    }

    // span 记录新字段时调用
    fn on_record(&self, id: &Id, values: &Record<'_>, ctx: Context<'_, S>) {
        // 从扩展中取出记录器并更新
        let recorder = ctx.span(id)
            .unwrap()
            .extensions_mut()
            .get_mut::<StringRecorder>()
            .unwrap();
        values.record(recorder);
    }

    // 日志事件发生时调用
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        let mut recorder = StringRecorder::new();
        event.record(&mut recorder);

        let priority = match *event.metadata().level() {
            Level::TRACE => LogPriority::VERBOSE,
            Level::DEBUG => LogPriority::DEBUG,
            Level::INFO => LogPriority::INFO,
            Level::WARN => LogPriority::WARN,
            Level::ERROR => LogPriority::ERROR,
        };

        unsafe {
            android_log_sys::__android_log_write(
                priority as c_int,
                sanitize(event.metadata().name()).as_ptr(),
                sanitize(&recorder.0).as_ptr(),
            );
        }
    }
}
```

#### 字段收集策略

```rust
impl Visit for StringRecorder {
    fn record_debug(&mut self, field: &Field, value: &dyn Debug) {
        if field.name() == "message" {
            // 消息字段放在最前面
            if !self.0.is_empty() {
                self.0 = format!("{:?}\n{}", value, self.0)
            } else {
                self.0 = format!("{:?}", value)
            }
        } else {
            // 其他字段追加到后面
            if self.1 {
                write!(self.0, " ").unwrap();
            } else {
                self.1 = true;
            }
            write!(self.0, "{} = {:?};", field.name(), value).unwrap();
        }
    }
}
```

**输出格式示例**：
```
"Player spawned" player_id = 42; health = 100;
```

## 6. 平台适配机制

### 6.1 条件编译策略

```rust
// Cargo.toml 中定义平台特定依赖
[target.'cfg(target_os = "android")'.dependencies]
android_log-sys = "0.3.0"

[target.'cfg(target_arch = "wasm32")'.dependencies]
tracing-wasm = "0.2.1"

[target.'cfg(target_os = "ios")'.dependencies]
tracing-oslog = "0.3"
```

```rust
// lib.rs 中使用条件编译
#[cfg(target_os = "android")]
mod android_tracing;

#[cfg(all(
    not(target_arch = "wasm32"),
    not(target_os = "android"),
    not(target_os = "ios")
))]
{
    // 桌面平台代码
}

#[cfg(target_arch = "wasm32")]
{
    // WASM 平台代码
}
```

### 6.2 平台差异处理

| 特性 | 桌面 | WASM | Android | iOS |
|------|------|------|---------|-----|
| 输出目标 | stderr | console | logcat | os_log |
| 颜色支持 | ✅ (NO_COLOR) | ❌ | ❌ | ❌ |
| Span 支持 | ✅ | ✅ | 部分 | ✅ |
| 文件追踪 | ✅ | ❌ | ❌ | ❌ |
| 性能分析 | ✅ | ❌ | ❌ | ❌ |

### 6.3 NO_COLOR 约定

```rust
// tracing_subscriber::fmt::Layer::default()
// 会自动读取 NO_COLOR 环境变量
// 符合 https://no-color.org/ 标准

std::env::set_var("NO_COLOR", "1");
// 禁用 ANSI 转义码
```

## 7. 关键设计模式

### 7.1 插件模式 (Plugin Pattern)

```rust
impl Plugin for LogPlugin {
    fn build(&self, app: &mut App) {
        // 初始化全局状态（日志订阅者）
        // 只执行一次，不参与每帧更新
    }
}
```

**特点**：
- 一次性初始化：不添加系统到调度器
- 全局副作用：设置进程级的 tracing subscriber
- 不可重复：多次添加会导致 panic

### 7.2 构建器模式 (Builder Pattern)

```rust
App::new()
    .add_plugins(DefaultPlugins.set(LogPlugin {
        level: Level::DEBUG,
        filter: "wgpu=error".to_string(),
        custom_layer: |app| {
            Some(Box::new(MyCustomLayer::new(app)))
        },
        fmt_layer: |app| {
            Some(Box::new(
                fmt::Layer::default()
                    .without_time()
                    .with_target(false)
            ))
        },
    }))
```

### 7.3 访问者模式 (Visitor Pattern)

```rust
// tracing 使用访问者模式遍历字段
pub trait Visit {
    fn record_debug(&mut self, field: &Field, value: &dyn Debug) {
        // 处理每个字段
    }
}

// AndroidLayer 通过访问者收集所有字段
let mut recorder = StringRecorder::new();
event.record(&mut recorder);  // 触发 record_debug 多次调用
```

### 7.4 类型状态模式 (Typestate Pattern)

```rust
// 通过类型系统确保层的正确组合
type Step1 = Registry;
type Step2 = Layered<CustomLayer, Step1>;
type Step3 = Layered<EnvFilter, Step2>;
type Step4 = Layered<FmtLayer, Step3>;

// 编译期保证层的顺序和兼容性
```

### 7.5 资源管理模式 (RAII)

```rust
#[derive(Resource)]
pub(crate) struct FlushGuard(SyncCell<tracing_chrome::FlushGuard>);

// FlushGuard 存储在 App 的 World 中
// 当 App Drop 时自动调用 FlushGuard::drop
// 触发 Chrome trace 文件写入
app.insert_resource(FlushGuard(guard));
```

## 8. 依赖关系分析

### 8.1 内部依赖

```toml
bevy_app     # Plugin trait, App
bevy_utils   # once! 宏
bevy_platform # SyncCell（线程安全的 Cell）
bevy_ecs     # Resource trait（用于 FlushGuard）
```

**依赖图**：
```
bevy_log
  ├─> bevy_app ──> bevy_ecs
  ├─> bevy_utils
  ├─> bevy_platform
  └─> bevy_ecs (间接通过 bevy_app)
```

### 8.2 外部依赖（核心）

```toml
# 核心 tracing 生态
tracing = "0.1"                    # 日志宏和核心类型
tracing-subscriber = "0.3.20"      # 订阅者和层实现
  features = ["registry", "env-filter"]
tracing-log = "0.2.0"              # 桥接旧的 log crate

# 可选性能分析
tracing-chrome = "0.7.0"           # Chrome Tracing 导出
tracing-tracy = "0.11.4"           # Tracy 集成
tracy-client = "0.18.0"            # Tracy 客户端
tracing-error = "0.2.0"            # 错误跟踪增强

# 平台特定
android_log-sys = "0.3.0"          # Android (仅 Android)
tracing-wasm = "0.2.1"             # WASM (仅 WASM)
tracing-oslog = "0.3"              # iOS (仅 iOS)
```

### 8.3 特性标志（Features）

```toml
[features]
trace = ["tracing-error"]          # 启用 ErrorLayer 和 SpanTrace
trace_tracy_memory = ["tracy-client"]  # Tracy 内存分析

# 使用示例
# cargo build --features trace
# cargo build --features tracing-chrome,trace_tracy_memory
```

## 9. 高级功能

### 9.1 Tracy 内存分析

```rust
#[cfg(feature = "trace_tracy_memory")]
#[global_allocator]
static GLOBAL: tracy_client::ProfiledAllocator<std::alloc::System> =
    tracy_client::ProfiledAllocator::new(std::alloc::System, 100);
```

**功能**：
- 替换全局分配器
- 跟踪所有内存分配/释放
- Tracy 可视化内存使用情况

### 9.2 panic hook 集成

```rust
#[cfg(feature = "trace")]
{
    let old_handler = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |infos| {
        // 打印完整的 span 跟踪栈
        eprintln!("{}", tracing_error::SpanTrace::capture());
        old_handler(infos);
    }));
}
```

**效果**：
- panic 时自动打印 tracing span 堆栈
- 帮助定位异步代码中的错误

### 9.3 单次日志宏

```rust
// 每帧执行的系统
fn my_system() {
    // 只在第一次执行时打印，后续忽略
    info_once!("System initialized");

    // 等价于
    once!(info!("System initialized"));
}
```

**实现原理**：
```rust
// bevy_utils::once! 使用原子标志
static FLAG: AtomicBool = AtomicBool::new(false);
if !FLAG.swap(true, Ordering::Relaxed) {
    // 只执行一次
}
```

### 9.4 Chrome Tracing 自定义名称

```rust
let chrome_layer = ChromeLayerBuilder::new()
    .name_fn(Box::new(|event_or_span| match event_or_span {
        EventOrSpan::Event(event) =>
            event.metadata().name().into(),
        EventOrSpan::Span(span) => {
            // 包含 span 字段到名称中
            if let Some(fields) = span.extensions()
                .get::<FormattedFields<DefaultFields>>()
            {
                format!("{}: {}", span.metadata().name(), fields)
            } else {
                span.metadata().name().into()
            }
        }
    }))
    .build();
```

## 10. 错误处理与边界情况

### 10.1 重复初始化检测

```rust
let logger_already_set = LogTracer::init().is_err();
let subscriber_already_set =
    tracing::subscriber::set_global_default(finished_subscriber).is_err();

match (logger_already_set, subscriber_already_set) {
    (true, true) => error!("Could not set global logger and tracing subscriber..."),
    (true, false) => error!("Could not set global logger..."),
    (false, true) => error!("Could not set global tracing subscriber..."),
    (false, false) => (), // 成功
}
```

**原因**：
- 全局 subscriber 只能设置一次
- 多个 LogPlugin 实例会冲突
- 用户自定义 subscriber 会冲突

### 10.2 环境变量解析失败

```rust
EnvFilter::try_from_default_env()
    .or_else(|from_env_error| {
        // 提取并打印具体的解析错误
        from_env_error.source()
            .and_then(|s| s.downcast_ref::<ParseError>())
            .map(|parse_err| {
                eprintln!("LogPlugin failed to parse filter: {parse_err}");
            });

        // 降级到宽松解析
        Ok(EnvFilter::builder().parse_lossy(&default_filter))
    })
```

**策略**：
- 打印警告但不中断启动
- 使用 `parse_lossy` 忽略无效的过滤规则

### 10.3 Android FFI 安全

```rust
fn sanitize(string: &str) -> CString {
    let bytes: Vec<u8> = string
        .as_bytes()
        .iter()
        .copied()
        .filter(|byte| *byte != 0)  // 移除 null 字节
        .collect();
    CString::new(bytes).unwrap()
}

unsafe {
    android_log_sys::__android_log_write(
        priority as c_int,
        sanitize(meta.name()).as_ptr(),  // 保证 null 终止
        sanitize(&recorder.0).as_ptr(),
    );
}
```

**保证**：
- 字符串不包含内部 null 字节
- C 字符串正确 null 终止
- 优先级在 c_int 范围内

## 11. 性能考虑

### 11.1 编译时过滤

```toml
# Cargo.toml
[dependencies]
log = { version = "0.4", features = [
    "max_level_debug",           # 开发构建最高 DEBUG
    "release_max_level_warn"     # 发布构建最高 WARN
]}
```

**效果**：
- 低于阈值的日志宏变成空操作
- 完全优化掉，零运行时开销

### 11.2 运行时过滤开销

```rust
// EnvFilter 需要在运行时匹配每个事件
// 复杂的过滤规则会增加开销
let filter = "wgpu=error,bevy_render=info,bevy_ecs::system::commands=trace";

// 建议：只在开发时使用详细过滤
// 生产环境使用简单规则或编译时过滤
```

### 11.3 Tracy 过滤

```rust
#[cfg(feature = "tracing-tracy")]
let fmt_layer = fmt_layer.with_filter(
    FilterFn::new(|meta| {
        // 排除 Tracy 的内部事件，避免递归
        meta.fields().field("tracy.frame_mark").is_none()
    })
);
```

## 12. 迁移到 TypeScript/Roblox 的注意事项

### 12.1 不可直接移植的部分

1. **全局 subscriber 机制**
   - Rust 使用全局静态变量和 `OnceCell`
   - TypeScript 需要使用单例模式或模块级变量

2. **tracing 生态系统**
   - 没有等价的 TypeScript tracing 库
   - 需要自行设计日志层抽象

3. **条件编译**
   - TypeScript 无编译时条件编译
   - 需要运行时平台检测

4. **FFI 调用**
   - Roblox 无法直接调用 C API
   - Android/iOS 日志需要通过 Roblox 原生接口

### 12.2 可移植的概念

1. **插件模式**
```typescript
export class LogPlugin implements Plugin {
	public constructor(
		private readonly filter: string,
		private readonly level: LogLevel,
	) {}

	public build(app: App): void {
		// 初始化日志系统
		Logger.initialize(this.filter, this.level);
	}
}
```

2. **层模式**
```typescript
interface LogLayer {
	onEvent(event: LogEvent): void;
	onSpanCreated(span: Span): void;
}

class Logger {
	private readonly layers: Array<LogLayer> = [];

	public addLayer(layer: LogLayer): void {
		this.layers.push(layer);
	}
}
```

3. **平台适配**
```typescript
function getPlatformLogger(): LogLayer {
	if (RunService.IsStudio()) {
		return new StudioLogger();
	} else if (RunService.IsServer()) {
		return new ServerLogger();
	} else {
		return new ClientLogger();
	}
}
```

4. **单次日志**
```typescript
// 使用 Map 存储调用点标记
const onceFlags = new Map<string, boolean>();

export function infoOnce(message: string, callSite: string): void {
	if (!onceFlags.get(callSite)) {
		onceFlags.set(callSite, true);
		info(message);
	}
}
```

### 12.3 Roblox 特定实现建议

1. **使用 Roblox 输出服务**
```typescript
class RobloxConsoleLayer implements LogLayer {
	public onEvent(event: LogEvent): void {
		const message = this.formatEvent(event);

		switch (event.level) {
			case LogLevel.Error:
				warn(message); // Roblox 的 warn 显示为橙色
				break;
			case LogLevel.Info:
				print(message);
				break;
			// ...
		}
	}
}
```

2. **集成 TestEZ 报告**
```typescript
class TestEZLayer implements LogLayer {
	public onEvent(event: LogEvent): void {
		if (event.level === LogLevel.Error) {
			// 集成到测试失败报告
			getfenv(0).TESTEZ_REPORTER?.recordFailure(event.message);
		}
	}
}
```

3. **性能分析集成**
```typescript
class ProfilerLayer implements LogLayer {
	public onSpanCreated(span: Span): void {
		debug.profilebegin(span.name);
	}

	public onSpanClosed(span: Span): void {
		debug.profileend();
	}
}
```

## 13. 总结

### 13.1 核心优势

1. **跨平台抽象**：统一的日志接口，平台差异透明处理
2. **零配置默认**：开箱即用，同时支持深度定制
3. **生态系统集成**：利用 Rust tracing 生态的成熟工具
4. **性能优化**：支持编译时和运行时过滤
5. **可扩展架构**：层模式允许无限扩展

### 13.2 设计精髓

- **单一职责**：每个层只处理一种输出或转换
- **组合优于继承**：通过层组合实现复杂功能
- **延迟初始化**：插件模式避免过早设置全局状态
- **配置分离**：环境变量、插件配置、代码三级配置
- **渐进增强**：基础功能无依赖，高级功能通过 feature 启用

### 13.3 关键学习点

1. **全局状态管理**：如何安全地初始化全局单例
2. **平台抽象**：使用条件编译和 trait 统一接口
3. **类型驱动设计**：类型系统确保正确的层组合
4. **错误容忍**：解析失败时降级而非崩溃
5. **性能权衡**：运行时灵活性 vs 编译时优化

### 13.4 TypeScript 迁移路线图

1. **阶段一**：实现基础日志宏和单例 Logger
2. **阶段二**：设计 LogLayer 接口和组合系统
3. **阶段三**：实现 Roblox 特定层（Studio/Server/Client）
4. **阶段四**：添加过滤系统（简化版 EnvFilter）
5. **阶段五**：集成到 App 插件系统

通过理解 `bevy_log` 的设计哲学，我们可以在 TypeScript/Roblox 环境中构建一个功能相当但更适应平台特性的日志系统。