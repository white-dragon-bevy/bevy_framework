# Bevy Picking 交互系统详细文档

## 1. 模块概述和主要功能

`bevy_picking` 是 Bevy 游戏引擎中用于处理"拾取"交互的核心模块，它允许指针（鼠标、触摸等）与场景中的实体进行交互，支持悬停、点击和拖放等操作。

### 核心功能特性：

- **多种输入设备支持**：支持鼠标、触摸、手写笔或自定义虚拟指针
- **多种交互事件**：提供悬停、点击、拖拽等丰富的交互事件
- **模块化设计**：可混合使用多个拾取后端（如物理射线检测、UI 拾取等）
- **事件冒泡机制**：支持沿实体层次结构的事件冒泡
- **多窗口和多摄像机支持**：正确处理多窗口、多摄像机、视口和渲染层
- **观察者模式**：使用 Bevy 的观察者系统来处理事件，提供简洁的 API

### 架构流水线：

1. **指针阶段**：收集输入并更新指针状态
2. **后端阶段**：执行命中测试，产生 `PointerHits` 事件
3. **悬停阶段**：确定每个指针正在悬停的实体
4. **事件阶段**：生成高级指针事件（悬停、点击、拖拽等）

## 2. 核心结构体和枚举说明

### 2.1 指针相关结构体

#### `PointerId`
```rust
pub enum PointerId {
    Mouse,              // 鼠标指针
    Touch(u64),         // 触摸输入（编号）
    Custom(Uuid),       // 自定义指针
}
```

标识唯一的指针实体，支持鼠标、触摸和自定义指针类型。

#### `PointerLocation`
```rust
pub struct PointerLocation {
    pub location: Option<Location>,
}
```

追踪指针当前位置的组件。

#### `Location`
```rust
pub struct Location {
    pub target: NormalizedRenderTarget,  // 渲染目标（通常是窗口）
    pub position: Vec2,                  // 指针在目标上的位置
}
```

指针的位置信息，包括渲染目标和位置坐标。

#### `PointerPress`
```rust
pub struct PointerPress {
    primary: bool,      // 主按钮状态
    secondary: bool,    // 次按钮状态
    middle: bool,       // 中键状态
}
```

追踪指针按钮状态的组件。

### 2.2 交互事件结构体

#### `Pointer<E>`
所有指针事件的包装器：
```rust
pub struct Pointer<E: Debug + Clone + Reflect> {
    pub entity: Entity,           // 事件目标实体
    pub pointer_id: PointerId,    // 触发事件的指针
    pub pointer_location: Location, // 指针位置
    pub event: E,                 // 具体事件数据
}
```

#### 具体事件类型：

- **`Over`**: 指针进入实体边界时触发
- **`Out`**: 指针离开实体边界时触发
- **`Press`**: 指针按钮按下时触发
- **`Release`**: 指针按钮释放时触发
- **`Click`**: 完整的点击操作（按下+释放）
- **`Move`**: 指针在实体上移动时触发
- **`DragStart`**: 开始拖拽时触发
- **`Drag`**: 拖拽过程中触发
- **`DragEnd`**: 拖拽结束时触发
- **`DragEnter`**: 拖拽对象进入目标实体时触发
- **`DragOver`**: 拖拽对象在目标实体上方时触发
- **`DragLeave`**: 拖拽对象离开目标实体时触发
- **`DragDrop`**: 拖拽对象放置到目标实体时触发
- **`Scroll`**: 鼠标滚轮事件
- **`Cancel`**: 指针取消事件

### 2.3 拾取控制组件

#### `Pickable`
```rust
pub struct Pickable {
    pub should_block_lower: bool,  // 是否阻挡下层实体被拾取
    pub is_hoverable: bool,        // 实体是否可悬停
}
```

控制实体拾取行为的可选组件：
- `should_block_lower: true` - 阻挡下层实体
- `is_hoverable: false` - 实体不可悬停
- `Pickable::IGNORE` - 完全忽略该实体

### 2.4 悬停状态组件

#### `PickingInteraction`
```rust
pub enum PickingInteraction {
    Pressed = 2,    // 被按下
    Hovered = 1,    // 被悬停
    None = 0,       // 无交互
}
```

聚合所有指针与实体的交互状态。

#### `Hovered` 和 `DirectlyHovered`
```rust
pub struct Hovered(pub bool);         // 包含子实体的悬停状态
pub struct DirectlyHovered(pub bool); // 仅直接悬停状态
```

用于变化检测的悬停状态组件。

### 2.5 后端相关结构体

#### `PointerHits`
```rust
pub struct PointerHits {
    pub pointer: PointerId,           // 关联的指针
    pub picks: Vec<(Entity, HitData)>, // 命中的实体和数据
    pub order: f32,                   // 拾取层级顺序
}
```

拾取后端产生的命中测试结果。

#### `HitData`
```rust
pub struct HitData {
    pub camera: Entity,           // 用于检测的摄像机实体
    pub depth: f32,              // 命中深度
    pub position: Option<Vec3>,   // 命中位置（世界空间）
    pub normal: Option<Vec3>,     // 命中法向量
}
```

成功的指针命中测试数据。

## 3. 主要API使用示例

### 3.1 基础事件监听

使用观察者模式监听点击事件：
```rust
use bevy_picking::prelude::*;

fn setup(mut commands: Commands) {
    commands.spawn(MyComponent)
        .observe(|event: On<Pointer<Click>>| {
            println!("实体被点击了！指针ID: {:?}", event.pointer_id);
            // 停止事件冒泡
            event.propagate(false);
        });
}
```

### 3.2 多种事件处理

为实体添加多种交互行为：
```rust
fn setup_interactive_entity(mut commands: Commands) {
    commands.spawn(Transform::default())
        // 拖拽时旋转实体
        .observe(|drag: On<Pointer<Drag>>, mut transforms: Query<&mut Transform>| {
            let mut transform = transforms.get_mut(drag.entity).unwrap();
            transform.rotate_local_y(drag.delta.x / 50.0);
        })
        // 点击时销毁实体
        .observe(|click: On<Pointer<Click>>, mut commands: Commands| {
            println!("实体 {} 爆炸了！", click.entity);
            commands.entity(click.entity).despawn();
        })
        // 悬停时发送消息
        .observe(|over: On<Pointer<Over>>, mut events: MessageWriter<MyMessage>| {
            events.write(MyMessage);
        });
}
```

### 3.3 拾取行为控制

控制实体的拾取行为：
```rust
fn spawn_entities(mut commands: Commands) {
    // 默认行为：可悬停，阻挡下层
    commands.spawn((
        MyMeshBundle::default(),
        Pickable::default(),
    ));

    // 不阻挡下层实体
    commands.spawn((
        MyMeshBundle::default(),
        Pickable {
            should_block_lower: false,
            is_hoverable: true,
        },
    ));

    // 完全忽略
    commands.spawn((
        MyMeshBundle::default(),
        Pickable::IGNORE,
    ));
}
```

### 3.4 悬停状态检测

使用变化检测监听悬停状态：
```rust
fn hover_system(
    hovered_query: Query<Entity, (With<Hovered>, Changed<Hovered>)>,
    hover_state: Query<&Hovered>,
) {
    for entity in &hovered_query {
        let hovered = hover_state.get(entity).unwrap();
        if hovered.get() {
            println!("实体 {} 开始被悬停", entity);
        } else {
            println!("实体 {} 不再被悬停", entity);
        }
    }
}
```

### 3.5 自定义指针输入

创建自定义指针：
```rust
fn create_custom_pointer(mut commands: Commands) {
    let custom_id = PointerId::Custom(Uuid::new_v4());
    commands.spawn(custom_id);
}

fn send_custom_input(mut pointer_events: MessageWriter<PointerInput>) {
    let location = Location {
        target: NormalizedRenderTarget::Window(WindowRef::Primary),
        position: Vec2::new(100.0, 100.0),
    };

    pointer_events.write(PointerInput::new(
        PointerId::Custom(my_uuid),
        location,
        PointerAction::Press(PointerButton::Primary),
    ));
}
```

### 3.6 网格拾取后端使用

启用网格拾取功能：
```rust
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins((
            DefaultPickingPlugins,  // 包含基础拾取功能
            MeshPickingPlugin,      // 网格拾取后端
        ))
        .run();
}

// 为摄像机添加网格拾取支持（如果需要标记模式）
fn setup_camera(mut commands: Commands) {
    commands.spawn((
        Camera3dBundle::default(),
        MeshPickingCamera,  // 标记支持网格拾取
    ));
}
```

## 4. 与其他Bevy模块的集成方式

### 4.1 与 bevy_input 的集成

`bevy_picking` 通过 `PointerInputPlugin` 自动处理鼠标和触摸输入：

```rust
// 自动包含在 DefaultPickingPlugins 中
App::new()
    .add_plugins(DefaultPickingPlugins)
    .run();

// 或单独添加
App::new()
    .add_plugins((
        PointerInputPlugin,    // 处理输入
        PickingPlugin,         // 核心拾取功能
        InteractionPlugin,     // 交互事件
    ))
    .run();
```

### 4.2 与 bevy_camera 的集成

拾取系统自动使用摄像机信息进行射线投射：

```rust
fn setup_cameras(mut commands: Commands) {
    // 多摄像机支持
    commands.spawn((
        Camera3dBundle {
            camera: Camera {
                order: 0,  // 用于确定拾取优先级
                ..default()
            },
            ..default()
        },
        MeshPickingCamera,
    ));

    // UI 摄像机
    commands.spawn((
        Camera2dBundle {
            camera: Camera {
                order: 1,  // 更高优先级
                ..default()
            },
            ..default()
        },
    ));
}
```

### 4.3 与 bevy_window 的集成

支持多窗口拾取：

```rust
fn setup_windows(mut commands: Commands) {
    // 主窗口会自动支持拾取
    // 可以通过 PickingSettings 控制窗口拾取
    commands.insert_resource(PickingSettings {
        is_window_picking_enabled: true,
        ..default()
    });
}
```

### 4.4 与 bevy_mesh 的集成（可选功能）

启用网格拾取后端：

```rust
// Cargo.toml
[dependencies]
bevy_picking = { version = "0.17", features = ["bevy_mesh_picking_backend"] }

// 代码中
App::new()
    .add_plugins((
        DefaultPickingPlugins,
        MeshPickingPlugin,
    ))
    .run();
```

### 4.5 与渲染层的集成

支持渲染层过滤：

```rust
fn setup_layered_entities(mut commands: Commands) {
    // UI 层
    commands.spawn((
        MyUIBundle::default(),
        RenderLayers::layer(1),
    ));

    // 游戏世界层
    commands.spawn((
        MyMeshBundle::default(),
        RenderLayers::layer(0),
    ));
}

fn setup_camera_with_layers(mut commands: Commands) {
    commands.spawn((
        Camera3dBundle::default(),
        RenderLayers::from_layers(&[0, 1]), // 同时渲染两层
        MeshPickingCamera,
    ));
}
```

## 5. 常见使用场景

### 5.1 基础UI交互

```rust
fn setup_ui_button(mut commands: Commands) {
    commands.spawn((
        ButtonBundle {
            style: Style {
                width: Val::Px(200.0),
                height: Val::Px(50.0),
                ..default()
            },
            ..default()
        },
    ))
    .observe(|click: On<Pointer<Click>>| {
        println!("按钮被点击！");
    })
    .observe(|hover: On<Pointer<Over>>| {
        println!("鼠标悬停在按钮上");
    });
}
```

### 5.2 3D物体选择和操作

```rust
fn setup_3d_objects(mut commands: Commands) {
    commands.spawn((
        PbrBundle {
            mesh: meshes.add(Mesh::from(Sphere::new(1.0))),
            material: materials.add(Color::BLUE.into()),
            transform: Transform::from_xyz(0.0, 0.0, 0.0),
            ..default()
        },
        SelectableObject,
    ))
    .observe(|click: On<Pointer<Click>>, mut query: Query<&mut Handle<StandardMaterial>>| {
        // 选择高亮
        let mut material = query.get_mut(click.entity).unwrap();
        *material = selected_material.clone();
    })
    .observe(|drag: On<Pointer<Drag>>, mut transforms: Query<&mut Transform>| {
        // 拖拽移动
        let mut transform = transforms.get_mut(drag.entity).unwrap();
        let delta_world = camera.screen_to_world_2d(drag.delta);
        transform.translation += delta_world.extend(0.0);
    });
}
```

### 5.3 拖放系统

```rust
fn setup_drag_drop(mut commands: Commands) {
    // 拖拽源
    commands.spawn((
        DraggableBundle::default(),
        DragSource,
    ))
    .observe(|start: On<Pointer<DragStart>>| {
        println!("开始拖拽物品");
    });

    // 放置目标
    commands.spawn((
        DropTargetBundle::default(),
        DropTarget,
    ))
    .observe(|drop: On<Pointer<DragDrop>>| {
        println!("物品被放置到目标: {:?} -> {:?}", drop.dropped, drop.entity);
    })
    .observe(|enter: On<Pointer<DragEnter>>| {
        println!("拖拽物品进入放置区域");
    });
}
```

### 5.4 悬停信息提示

```rust
#[derive(Component)]
struct Tooltip {
    text: String,
}

fn setup_tooltip_system(mut commands: Commands) {
    commands.spawn((
        MyObjectBundle::default(),
        Tooltip { text: "这是一个可交互对象".to_string() },
    ))
    .observe(|over: On<Pointer<Over>>, query: Query<&Tooltip>| {
        let tooltip = query.get(over.entity).unwrap();
        // 显示提示信息
        show_tooltip(&tooltip.text, over.pointer_location.position);
    })
    .observe(|out: On<Pointer<Out>>| {
        // 隐藏提示信息
        hide_tooltip();
    });
}
```

### 5.5 多指触控支持

```rust
fn handle_multitouch(
    mut touch_events: MessageReader<PointerInput>,
    pointers: Query<&PointerId>,
) {
    for input in touch_events.read() {
        if input.pointer_id.is_touch() {
            match input.action {
                PointerAction::Press(_) => {
                    println!("触摸开始: {:?}", input.pointer_id);
                }
                PointerAction::Move { delta } => {
                    println!("触摸移动: {:?}, 偏移: {:?}", input.pointer_id, delta);
                }
                PointerAction::Release(_) => {
                    println!("触摸结束: {:?}", input.pointer_id);
                }
                _ => {}
            }
        }
    }
}
```

### 5.6 自定义拾取后端

```rust
// 简单的2D矩形拾取后端示例
fn custom_2d_picking_backend(
    ray_map: Res<RayMap>,
    rectangles: Query<(Entity, &Transform, &Sprite)>,
    mut pointer_hits: MessageWriter<PointerHits>,
) {
    for (&ray_id, &ray) in ray_map.iter() {
        let mut hits = Vec::new();

        for (entity, transform, sprite) in &rectangles {
            // 简化的2D碰撞检测
            if point_in_rectangle(ray.origin.truncate(), transform, sprite) {
                let hit_data = HitData::new(
                    ray_id.camera,
                    0.0, // 深度
                    Some(transform.translation),
                    Some(Vec3::Z),
                );
                hits.push((entity, hit_data));
            }
        }

        if !hits.is_empty() {
            pointer_hits.write(PointerHits::new(ray_id.pointer, hits, 0.0));
        }
    }
}
```

## 配置设置

### PickingSettings
```rust
App::new()
    .insert_resource(PickingSettings {
        is_enabled: true,                    // 启用拾取功能
        is_input_enabled: true,              // 启用输入收集
        is_hover_enabled: true,              // 启用悬停状态更新
        is_window_picking_enabled: true,     // 启用窗口拾取
    })
    .add_plugins(DefaultPickingPlugins)
    .run();
```

### PointerInputSettings
```rust
App::new()
    .insert_resource(PointerInputSettings {
        is_mouse_enabled: true,    // 启用鼠标输入
        is_touch_enabled: true,    // 启用触摸输入
    })
    .add_plugins(PointerInputPlugin)
    .run();
```

### MeshPickingSettings
```rust
App::new()
    .insert_resource(MeshPickingSettings {
        require_markers: false,                           // 是否需要标记组件
        ray_cast_visibility: RayCastVisibility::VisibleInView, // 射线投射可见性设置
    })
    .add_plugins(MeshPickingPlugin)
    .run();
```

## 注意事项

1. **性能考虑**：大量实体的拾取可能影响性能，考虑使用 `Pickable::IGNORE` 排除不需要交互的实体

2. **事件顺序**：事件按特定顺序触发，详见事件文档中的顺序说明

3. **坐标系统**：位置数据可能在不同的坐标空间中（屏幕空间、世界空间等）

4. **多后端兼容**：可以同时使用多个拾取后端，系统会自动合并和排序结果

5. **观察者vs消息读取器**：优先使用观察者模式，它提供更好的性能和更简洁的API

这个拾取系统为Bevy应用提供了强大而灵活的交互能力，支持从简单的按钮点击到复杂的多指触控和拖放操作。