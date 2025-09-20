# Bevy Remote Protocol (BRP) 详细文档

## 目录
1. [模块概述](#模块概述)
2. [核心结构体和枚举](#核心结构体和枚举)
3. [主要API使用示例](#主要api使用示例)
4. [与其他bevy模块的集成方式](#与其他bevy模块的集成方式)
5. [常见使用场景](#常见使用场景)
6. [错误处理](#错误处理)
7. [配置选项](#配置选项)

## 模块概述

Bevy Remote Protocol (BRP) 是 Bevy 引擎的远程控制协议实现，允许外部客户端通过网络连接检查和修改 Bevy 应用程序的实体组件系统 (ECS) 状态。

### 主要功能

- **远程ECS操作**: 支持远程获取、修改、添加、删除组件和实体
- **资源管理**: 远程访问和修改 Bevy 世界中的资源
- **实时监控**: 支持组件变化的实时监控 (watching)
- **JSON-RPC协议**: 基于 JSON-RPC 2.0 标准实现
- **HTTP传输**: 通过 HTTP 提供服务接口
- **类型安全**: 利用 Bevy 的反射系统确保类型安全

### 架构组件

- **核心插件**: `RemotePlugin` - 主要的 BRP 功能插件
- **HTTP传输**: `RemoteHttpPlugin` - HTTP 服务器插件
- **内置方法**: 提供丰富的预定义远程方法
- **自定义方法**: 支持扩展自定义远程方法

## 核心结构体和枚举

### 1. 插件结构体

#### `RemotePlugin`
```rust
pub struct RemotePlugin {
    methods: RwLock<Vec<(String, RemoteMethodHandler)>>,
}
```

主要的 BRP 插件，负责注册远程方法和处理请求。

**主要方法**:
- `with_method()` - 添加即时执行的远程方法
- `with_watching_method()` - 添加监控类型的远程方法

#### `RemoteHttpPlugin`
```rust
pub struct RemoteHttpPlugin {
    address: IpAddr,      // 服务器地址
    port: u16,            // 服务器端口
    headers: Headers,     // HTTP响应头
}
```

HTTP 传输层插件，提供 HTTP 服务器功能。

**配置方法**:
- `with_address()` - 设置服务器地址
- `with_port()` - 设置服务器端口
- `with_headers()` - 设置响应头
- `with_header()` - 添加单个响应头

### 2. 请求/响应结构体

#### `BrpRequest` - 客户端请求
```rust
pub struct BrpRequest {
    pub jsonrpc: String,        // JSON-RPC版本 ("2.0")
    pub method: String,         // 方法名
    pub id: Option<Value>,      // 请求ID (可选)
    pub params: Option<Value>,  // 参数 (可选)
}
```

#### `BrpResponse` - 服务器响应
```rust
pub struct BrpResponse {
    pub jsonrpc: &'static str,  // JSON-RPC版本
    pub id: Option<Value>,      // 对应的请求ID
    pub payload: BrpPayload,    // 响应载荷
}
```

#### `BrpPayload` - 响应载荷
```rust
pub enum BrpPayload {
    Result(Value),    // 成功结果
    Error(BrpError),  // 错误信息
}
```

### 3. 错误处理

#### `BrpError` - 错误结构体
```rust
pub struct BrpError {
    pub code: i16,              // 错误代码
    pub message: String,        // 错误消息
    pub data: Option<Value>,    // 附加错误数据
}
```

**常见错误代码**:
- `-32700`: JSON解析错误
- `-32600`: 无效请求对象
- `-32601`: 方法不存在
- `-32602`: 无效参数
- `-32603`: 内部错误
- `-23401`: 实体不存在
- `-23402`: 组件错误
- `-23403`: 组件不存在
- `-23404`: 无法自引用重新分配父级

### 4. 查询相关结构体

#### `BrpQuery` - 查询数据结构
```rust
pub struct BrpQuery {
    pub components: Vec<String>,      // 必需组件
    pub option: ComponentSelector,    // 可选组件选择器
    pub has: Vec<String>,            // 存在性检查组件
}
```

#### `ComponentSelector` - 组件选择器
```rust
pub enum ComponentSelector {
    All,                    // 选择所有组件
    Paths(Vec<String>),     // 指定组件路径列表
}
```

#### `BrpQueryFilter` - 查询过滤器
```rust
pub struct BrpQueryFilter {
    pub without: Vec<String>,   // 必须不包含的组件
    pub with: Vec<String>,      // 必须包含的组件
}
```

## 主要API使用示例

### 1. 基础设置

```rust
use bevy::prelude::*;
use bevy_remote::{RemotePlugin, http::RemoteHttpPlugin};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(RemotePlugin::default())  // 添加远程协议插件
        .add_plugins(RemoteHttpPlugin::default()) // 添加HTTP传输插件
        .run();
}
```

### 2. 自定义配置

```rust
use bevy_remote::http::Headers;

fn main() {
    let cors_headers = Headers::new()
        .insert("Access-Control-Allow-Origin", "*")
        .insert("Access-Control-Allow-Headers", "Content-Type");

    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(RemotePlugin::default())
        .add_plugins(
            RemoteHttpPlugin::default()
                .with_address("0.0.0.0")  // 绑定到所有接口
                .with_port(8080)          // 自定义端口
                .with_headers(cors_headers) // 添加CORS头
        )
        .run();
}
```

### 3. 添加自定义方法

```rust
use bevy_remote::BrpResult;
use serde_json::Value;

// 自定义处理函数
fn custom_handler(
    In(params): In<Option<Value>>,
    world: &mut World
) -> BrpResult {
    // 自定义逻辑
    Ok(serde_json::json!({"status": "success"}))
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(
            RemotePlugin::default()
                .with_method("custom.my_method", custom_handler)
        )
        .add_plugins(RemoteHttpPlugin::default())
        .run();
}
```

### 4. 客户端请求示例

#### 获取组件
```json
{
    "jsonrpc": "2.0",
    "method": "world.get_components",
    "id": 1,
    "params": {
        "entity": 4294967298,
        "components": [
            "bevy_transform::components::transform::Transform"
        ],
        "strict": false
    }
}
```

#### 查询实体
```json
{
    "jsonrpc": "2.0",
    "method": "world.query",
    "id": 2,
    "params": {
        "data": {
            "components": ["bevy_transform::components::transform::Transform"],
            "option": [],
            "has": []
        },
        "filter": {
            "with": [],
            "without": []
        },
        "strict": false
    }
}
```

#### 生成实体
```json
{
    "jsonrpc": "2.0",
    "method": "world.spawn_entity",
    "id": 3,
    "params": {
        "components": {
            "bevy_transform::components::transform::Transform": {
                "translation": [0.0, 0.0, 0.0],
                "rotation": [0.0, 0.0, 0.0, 1.0],
                "scale": [1.0, 1.0, 1.0]
            }
        }
    }
}
```

#### 监控组件变化
```json
{
    "jsonrpc": "2.0",
    "method": "world.get_components+watch",
    "id": 4,
    "params": {
        "entity": 4294967298,
        "components": [
            "bevy_transform::components::transform::Transform"
        ]
    }
}
```

### 5. Python 客户端示例

```python
import requests
import json

class BevyRemoteClient:
    def __init__(self, host="127.0.0.1", port=15702):
        self.base_url = f"http://{host}:{port}"
        self.request_id = 0

    def _send_request(self, method, params=None):
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "id": self.request_id
        }
        if params:
            request["params"] = params

        response = requests.post(self.base_url, json=request)
        return response.json()

    def get_components(self, entity_id, components, strict=False):
        """获取实体的组件"""
        params = {
            "entity": entity_id,
            "components": components,
            "strict": strict
        }
        return self._send_request("world.get_components", params)

    def query_entities(self, components=None, filters=None):
        """查询实体"""
        params = {
            "data": {
                "components": components or [],
                "option": [],
                "has": []
            },
            "filter": filters or {"with": [], "without": []},
            "strict": False
        }
        return self._send_request("world.query", params)

    def spawn_entity(self, components):
        """生成新实体"""
        params = {"components": components}
        return self._send_request("world.spawn_entity", params)

# 使用示例
client = BevyRemoteClient()

# 查询所有带Transform组件的实体
result = client.query_entities(
    components=["bevy_transform::components::transform::Transform"]
)
print("查询结果:", json.dumps(result, indent=2))

# 获取特定实体的Transform组件
transform_data = client.get_components(
    entity_id=4294967298,
    components=["bevy_transform::components::transform::Transform"]
)
print("Transform数据:", json.dumps(transform_data, indent=2))
```

## 与其他bevy模块的集成方式

### 1. 与反射系统集成

BRP 依赖 Bevy 的反射系统来序列化/反序列化组件和资源:

```rust
use bevy::prelude::*;

#[derive(Component, Reflect)]
#[reflect(Component)]  // 注册为可反射组件
struct MyComponent {
    value: f32,
    name: String,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .register_type::<MyComponent>()  // 注册类型到反射系统
        .add_plugins(RemotePlugin::default())
        .run();
}
```

### 2. 与ECS系统集成

BRP 在专用的调度中运行，不会干扰游戏逻辑:

```rust
use bevy_remote::{RemoteLast, RemoteSystems};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(RemotePlugin::default())
        .add_systems(Update, my_game_system)
        // BRP系统在RemoteLast调度中运行
        .add_systems(RemoteLast, my_debug_system.after(RemoteSystems::ProcessRequests))
        .run();
}
```

### 3. 与资源管理集成

```rust
#[derive(Resource, Reflect)]
#[reflect(Resource)]
struct GameSettings {
    difficulty: f32,
    volume: f32,
}

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .insert_resource(GameSettings { difficulty: 1.0, volume: 0.8 })
        .register_type::<GameSettings>()
        .add_plugins(RemotePlugin::default())
        .run();
}
```

### 4. 与事件系统集成

```rust
use bevy_remote::{RemoteMethods, BrpResult};

fn send_custom_event(
    In(params): In<Option<Value>>,
    mut events: EventWriter<MyEvent>
) -> BrpResult {
    // 解析参数并发送事件
    events.send(MyEvent { data: "remote".to_string() });
    Ok(Value::Null)
}

fn setup_remote_events(mut remote_methods: ResMut<RemoteMethods>, world: &mut World) {
    let system_id = world.register_system(send_custom_event);
    remote_methods.insert("events.send_my_event", system_id.into());
}
```

## 常见使用场景

### 1. 游戏调试和开发工具

```rust
// 调试用的相机控制
fn debug_camera_control(
    In(params): In<Option<Value>>,
    mut cameras: Query<&mut Transform, With<Camera3d>>
) -> BrpResult {
    #[derive(Deserialize)]
    struct CameraParams {
        position: [f32; 3],
        rotation: [f32; 4],
    }

    if let Some(params) = params {
        let camera_params: CameraParams = serde_json::from_value(params)
            .map_err(|e| BrpError::internal(e))?;

        for mut transform in cameras.iter_mut() {
            transform.translation = Vec3::from(camera_params.position);
            transform.rotation = Quat::from_array(camera_params.rotation);
        }
    }

    Ok(Value::Null)
}
```

### 2. 实时监控和分析

```rust
// 性能监控方法
fn get_performance_stats(
    In(_): In<Option<Value>>,
    diagnostics: Res<DiagnosticsStore>
) -> BrpResult {
    let mut stats = serde_json::Map::new();

    if let Some(fps) = diagnostics.get(&FrameTimeDiagnosticsPlugin::FPS) {
        if let Some(value) = fps.smoothed() {
            stats.insert("fps".to_string(), json!(value));
        }
    }

    Ok(Value::Object(stats))
}
```

### 3. 自动化测试

```python
# 自动化测试脚本
class BevyGameTester:
    def __init__(self, client):
        self.client = client

    def test_player_movement(self):
        """测试玩家移动功能"""
        # 获取玩家实体
        players = self.client.query_entities(
            components=["game::Player"],
            filters={"with": ["bevy_transform::components::transform::Transform"]}
        )

        if not players["result"]:
            raise AssertionError("未找到玩家实体")

        player_entity = players["result"][0]["entity"]

        # 模拟移动输入
        self.client._send_request("input.simulate_key", {
            "key": "W",
            "duration": 1.0
        })

        # 验证位置变化
        # ... 测试逻辑
```

### 4. 远程配置管理

```rust
fn update_game_config(
    In(params): In<Option<Value>>,
    mut config: ResMut<GameConfig>
) -> BrpResult {
    if let Some(params) = params {
        // 动态更新游戏配置
        if let Some(difficulty) = params.get("difficulty") {
            config.difficulty = difficulty.as_f64().unwrap_or(1.0) as f32;
        }

        if let Some(graphics_quality) = params.get("graphics_quality") {
            config.graphics_quality = graphics_quality.as_str()
                .unwrap_or("medium").to_string();
        }
    }

    Ok(json!({"status": "config_updated"}))
}
```

### 5. 关卡编辑器

```javascript
// Web-based 关卡编辑器
class LevelEditor {
    constructor() {
        this.client = new BevyRemoteClient();
    }

    async spawnObject(type, position, rotation) {
        const components = {
            [`game::${type}`]: {},
            "bevy_transform::components::transform::Transform": {
                translation: position,
                rotation: rotation,
                scale: [1.0, 1.0, 1.0]
            }
        };

        const result = await this.client.spawnEntity(components);
        return result.result.entity;
    }

    async deleteObject(entityId) {
        return await this.client._sendRequest("world.despawn_entity", {
            entity: entityId
        });
    }

    async moveObject(entityId, newPosition) {
        return await this.client._sendRequest("world.mutate_components", {
            entity: entityId,
            component: "bevy_transform::components::transform::Transform",
            path: "translation",
            value: newPosition
        });
    }
}
```

## 错误处理

### 1. 客户端错误处理

```python
def safe_request(client, method, params=None):
    try:
        response = client._send_request(method, params)

        if "error" in response:
            error = response["error"]
            print(f"BRP错误 {error['code']}: {error['message']}")
            return None

        return response.get("result")

    except requests.RequestException as e:
        print(f"网络错误: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON解析错误: {e}")
        return None
```

### 2. 服务端错误处理

```rust
fn robust_handler(
    In(params): In<Option<Value>>,
    world: &mut World
) -> BrpResult {
    // 参数验证
    let params = params.ok_or_else(|| BrpError {
        code: error_codes::INVALID_PARAMS,
        message: "参数不能为空".to_string(),
        data: None,
    })?;

    // 业务逻辑处理
    match process_business_logic(params, world) {
        Ok(result) => Ok(result),
        Err(e) => Err(BrpError::internal(format!("处理失败: {}", e)))
    }
}
```

## 配置选项

### 1. 网络配置

```rust
RemoteHttpPlugin::default()
    .with_address("0.0.0.0")      // 监听所有接口
    .with_port(8080)              // 自定义端口
```

### 2. CORS 配置

```rust
let cors_headers = Headers::new()
    .insert("Access-Control-Allow-Origin", "*")
    .insert("Access-Control-Allow-Methods", "POST, OPTIONS")
    .insert("Access-Control-Allow-Headers", "Content-Type")
    .insert("Access-Control-Max-Age", "86400");

RemoteHttpPlugin::default()
    .with_headers(cors_headers)
```

### 3. 安全配置

```rust
// 生产环境建议配置
RemoteHttpPlugin::default()
    .with_address("127.0.0.1")    // 仅本地访问
    .with_port(15702)             // 非标准端口
    .with_header("X-Frame-Options", "DENY")
```

### 4. 性能配置

```rust
// 在 Cargo.toml 中配置特性
[dependencies.bevy_remote]
features = ["http"]  // 启用HTTP传输
default-features = false  // 禁用默认特性以减少依赖
```

### 5. 调试配置

```rust
#[cfg(debug_assertions)]
{
    // 仅在调试模式下启用BRP
    app.add_plugins(RemotePlugin::default())
       .add_plugins(RemoteHttpPlugin::default());
}
```

## 总结

Bevy Remote Protocol 提供了强大而灵活的远程控制能力，支持：

- **完整的ECS操作**: 实体、组件、资源的完整生命周期管理
- **实时监控**: 支持组件变化的实时监听
- **类型安全**: 基于 Bevy 反射系统的类型安全保证
- **可扩展性**: 支持自定义方法和传输层
- **标准协议**: 基于 JSON-RPC 2.0 标准，易于集成

通过合理使用 BRP，可以构建强大的开发工具、监控系统、自动化测试和远程管理功能，大大提升 Bevy 应用的开发和运维效率。