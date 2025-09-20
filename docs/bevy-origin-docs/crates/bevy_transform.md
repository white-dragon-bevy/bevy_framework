# Bevy Transform 模块详细文档

## 模块概述

`bevy_transform` 是 Bevy 引擎中负责处理实体变换（Transform）的核心模块。它提供了完整的 2D 和 3D 变换系统，包括位置、旋转和缩放的处理，以及层次化变换传播机制。该模块是 Bevy 中所有需要空间定位和移动的实体的基础。

### 主要功能

- **局部变换**：通过 `Transform` 组件定义实体相对于父级的变换
- **全局变换**：通过 `GlobalTransform` 组件表示实体在世界空间中的最终变换
- **层次化传播**：自动从父级向子级传播变换
- **高性能计算**：支持并行和串行的变换传播算法
- **便捷构建方法**：提供多种创建和操作变换的便捷方法

## 核心结构体和枚举

### 1. Transform

`Transform` 是描述实体位置的核心组件，表示相对于父级的局部变换。

```rust
pub struct Transform {
    pub translation: Vec3,  // 位置（3D向量）
    pub rotation: Quat,     // 旋转（四元数）
    pub scale: Vec3,        // 缩放（3D向量）
}
```

#### 重要常量

```rust
Transform::IDENTITY  // 单位变换：无位移、无旋转、缩放为1
```

#### 主要构造方法

```rust
// 从坐标创建
Transform::from_xyz(x: f32, y: f32, z: f32)

// 从位置向量创建
Transform::from_translation(translation: Vec3)

// 从旋转创建
Transform::from_rotation(rotation: Quat)

// 从缩放创建
Transform::from_scale(scale: Vec3)

// 从矩阵创建
Transform::from_matrix(world_from_local: Mat4)

// 从等距变换创建
Transform::from_isometry(iso: Isometry3d)
```

#### 变换操作方法

```rust
// 旋转操作
transform.rotate(rotation: Quat)
transform.rotate_x(angle: f32)
transform.rotate_y(angle: f32)
transform.rotate_z(angle: f32)
transform.rotate_axis(axis: Dir3, angle: f32)

// 局部旋转操作
transform.rotate_local(rotation: Quat)
transform.rotate_local_x(angle: f32)
transform.rotate_local_y(angle: f32)
transform.rotate_local_z(angle: f32)
transform.rotate_local_axis(axis: Dir3, angle: f32)

// 围绕点旋转
transform.rotate_around(point: Vec3, rotation: Quat)
transform.translate_around(point: Vec3, rotation: Quat)

// 朝向目标
transform.look_at(target: Vec3, up: impl TryInto<Dir3>)
transform.look_to(direction: impl TryInto<Dir3>, up: impl TryInto<Dir3>)
```

#### 方向向量获取

```rust
// 局部坐标轴方向
transform.local_x()  // 局部 X 轴
transform.local_y()  // 局部 Y 轴
transform.local_z()  // 局部 Z 轴

// 常用方向别名
transform.right()    // 等同于 local_x()
transform.left()     // 等同于 -local_x()
transform.up()       // 等同于 local_y()
transform.down()     // 等同于 -local_y()
transform.forward()  // 等同于 -local_z()
transform.back()     // 等同于 local_z()
```

### 2. GlobalTransform

`GlobalTransform` 表示实体在世界空间中的最终变换，由系统自动计算和维护。

```rust
pub struct GlobalTransform(Affine3A);  // 内部使用仿射变换矩阵
```

#### 重要特性

- **只读性**：不能直接修改，只能通过修改 `Transform` 间接影响
- **自动计算**：由变换传播系统自动更新
- **高效存储**：使用仿射变换矩阵进行内部存储

#### 主要方法

```rust
// 创建方法
GlobalTransform::IDENTITY
GlobalTransform::from_xyz(x: f32, y: f32, z: f32)
GlobalTransform::from_translation(translation: Vec3)
GlobalTransform::from_rotation(rotation: Quat)
GlobalTransform::from_scale(scale: Vec3)

// 获取分量
global_transform.translation()      // 获取位置
global_transform.rotation()         // 获取旋转
global_transform.scale()           // 获取缩放
global_transform.to_scale_rotation_translation()  // 一次获取所有分量

// 矩阵操作
global_transform.to_matrix()       // 转换为 Mat4
global_transform.affine()          // 获取仿射变换矩阵

// 坐标变换
global_transform.transform_point(point: Vec3)  // 变换点坐标

// 重新父级化
global_transform.reparented_to(parent: &GlobalTransform) -> Transform
```

### 3. TransformTreeChanged

用于优化变换传播的标记组件，通过变更检测系统标记需要更新的变换树分支。

```rust
#[derive(Clone, Copy, Default, PartialEq, Debug)]
pub struct TransformTreeChanged;
```

### 4. TransformPlugin

提供变换系统的核心插件。

```rust
#[derive(Default)]
pub struct TransformPlugin;
```

#### 系统调度

```rust
pub enum TransformSystems {
    Propagate,  // 变换传播系统集
}
```

该插件注册以下系统链：
1. `mark_dirty_trees` - 标记变更的变换树
2. `propagate_parent_transforms` - 传播父级变换
3. `sync_simple_transforms` - 同步简单变换

## 主要API使用示例

### 1. 基础变换操作

```rust
use bevy::prelude::*;

fn spawn_entities(mut commands: Commands) {
    // 创建基本实体
    commands.spawn(Transform::from_xyz(1.0, 2.0, 3.0));

    // 创建带旋转的实体
    commands.spawn(
        Transform::from_translation(Vec3::new(0.0, 0.0, 0.0))
            .with_rotation(Quat::from_rotation_y(std::f32::consts::PI / 4.0))
            .with_scale(Vec3::splat(2.0))
    );

    // 使用链式方法
    commands.spawn(
        Transform::from_xyz(5.0, 0.0, 0.0)
            .looking_at(Vec3::ZERO, Vec3::Y)
    );
}
```

### 2. 动态变换操作

```rust
use bevy::prelude::*;

fn rotate_system(mut query: Query<&mut Transform, With<RotatingComponent>>, time: Res<Time>) {
    for mut transform in query.iter_mut() {
        // 绕 Y 轴旋转
        transform.rotate_y(time.delta_seconds());

        // 绕局部轴旋转
        transform.rotate_local_axis(Dir3::X, time.delta_seconds() * 0.5);

        // 朝向原点
        transform.look_at(Vec3::ZERO, Vec3::Y);
    }
}

fn movement_system(
    mut query: Query<&mut Transform, With<MovingComponent>>,
    time: Res<Time>,
) {
    for mut transform in query.iter_mut() {
        // 向前移动
        let forward = transform.forward();
        transform.translation += forward * 5.0 * time.delta_seconds();

        // 获取各个方向向量
        let right = transform.right();
        let up = transform.up();

        // 复合移动
        transform.translation += right * 2.0 * time.delta_seconds();
    }
}
```

### 3. 层次化变换

```rust
use bevy::prelude::*;

fn create_hierarchy(mut commands: Commands) {
    // 创建父实体
    let parent = commands.spawn(Transform::from_xyz(0.0, 0.0, 0.0)).id();

    // 创建子实体
    let child = commands.spawn(Transform::from_xyz(1.0, 0.0, 0.0)).id();

    // 建立父子关系
    commands.entity(parent).add_child(child);

    // 或者使用 with_children 方法
    commands.spawn(Transform::from_xyz(5.0, 0.0, 0.0))
        .with_children(|parent| {
            parent.spawn(Transform::from_xyz(1.0, 0.0, 0.0));
            parent.spawn(Transform::from_xyz(-1.0, 0.0, 0.0));
        });
}
```

### 4. 保持全局变换的重新父级化

```rust
use bevy::prelude::*;
use bevy_transform::commands::BuildChildrenTransformExt;

fn reparent_system(
    mut commands: Commands,
    query: Query<(Entity, &GlobalTransform), With<NeedsReparenting>>,
    parents: Query<Entity, With<NewParent>>,
) {
    for (entity, _global_transform) in query.iter() {
        if let Ok(new_parent) = parents.get_single() {
            // 保持全局变换不变的重新父级化
            commands.entity(entity).set_parent_in_place(new_parent);
        }
    }
}

fn remove_parent_system(
    mut commands: Commands,
    query: Query<Entity, With<ShouldBeOrphan>>,
) {
    for entity in query.iter() {
        // 移除父级，但保持全局位置
        commands.entity(entity).remove_parent_in_place();
    }
}
```

### 5. 使用 TransformHelper 计算变换

```rust
use bevy::prelude::*;
use bevy_transform::helper::TransformHelper;

fn compute_transform_system(
    transform_helper: TransformHelper,
    query: Query<Entity, With<NeedsGlobalTransform>>,
) {
    for entity in query.iter() {
        match transform_helper.compute_global_transform(entity) {
            Ok(global_transform) => {
                println!("实体 {:?} 的全局变换: {:?}", entity, global_transform);
            }
            Err(error) => {
                eprintln!("计算变换失败: {:?}", error);
            }
        }
    }
}
```

### 6. 变换点坐标

```rust
use bevy::prelude::*;

fn transform_points_system(
    query: Query<(&Transform, &GlobalTransform)>,
) {
    for (local_transform, global_transform) in query.iter() {
        let local_point = Vec3::new(1.0, 0.0, 0.0);

        // 使用局部变换变换点
        let transformed_local = local_transform.transform_point(local_point);

        // 使用全局变换变换点到世界空间
        let world_point = global_transform.transform_point(local_point);

        println!("局部变换后: {:?}, 世界空间: {:?}", transformed_local, world_point);
    }
}
```

## 与其他Bevy模块的集成方式

### 1. 与渲染系统集成

```rust
use bevy::prelude::*;

// 变换自动应用于所有渲染组件
fn setup_renderable_entity(mut commands: Commands) {
    commands.spawn((
        // 3D 网格
        PbrBundle {
            transform: Transform::from_xyz(0.0, 1.0, 0.0),
            ..default()
        },
    ));

    commands.spawn((
        // 2D 精灵
        SpriteBundle {
            transform: Transform::from_xyz(100.0, 200.0, 0.0),
            ..default()
        },
    ));
}
```

### 2. 与物理系统集成

```rust
use bevy::prelude::*;

// 变换会影响物理体的位置
fn setup_physics_entity(mut commands: Commands) {
    commands.spawn((
        Transform::from_xyz(0.0, 10.0, 0.0),
        // 假设的物理组件
        // RigidBody::Dynamic,
        // Collider::Ball(1.0),
    ));
}
```

### 3. 与音频系统集成

```rust
use bevy::prelude::*;

// 3D 音频使用变换进行空间定位
fn setup_spatial_audio(mut commands: Commands) {
    commands.spawn((
        Transform::from_xyz(5.0, 0.0, 0.0),
        // SpatialAudioSource::new(audio_handle),
    ));
}
```

### 4. 与相机系统集成

```rust
use bevy::prelude::*;

fn setup_camera(mut commands: Commands) {
    commands.spawn(Camera3dBundle {
        transform: Transform::from_xyz(0.0, 5.0, 10.0)
            .looking_at(Vec3::ZERO, Vec3::Y),
        ..default()
    });
}

fn camera_follow_system(
    mut camera_query: Query<&mut Transform, (With<Camera>, Without<Player>)>,
    player_query: Query<&Transform, (With<Player>, Without<Camera>)>,
) {
    if let (Ok(mut camera_transform), Ok(player_transform)) =
        (camera_query.get_single_mut(), player_query.get_single()) {

        // 相机跟随玩家
        let target_position = player_transform.translation + Vec3::new(0.0, 5.0, 10.0);
        camera_transform.translation = target_position;
        camera_transform.look_at(player_transform.translation, Vec3::Y);
    }
}
```

## 常见使用场景

### 1. 游戏对象移动

```rust
use bevy::prelude::*;

#[derive(Component)]
struct Player {
    speed: f32,
}

fn player_movement_system(
    mut query: Query<(&mut Transform, &Player)>,
    input: Res<Input<KeyCode>>,
    time: Res<Time>,
) {
    for (mut transform, player) in query.iter_mut() {
        let mut direction = Vec3::ZERO;

        if input.pressed(KeyCode::W) {
            direction += transform.forward();
        }
        if input.pressed(KeyCode::S) {
            direction += transform.back();
        }
        if input.pressed(KeyCode::A) {
            direction += transform.left();
        }
        if input.pressed(KeyCode::D) {
            direction += transform.right();
        }

        if direction.length() > 0.0 {
            direction = direction.normalize();
            transform.translation += direction * player.speed * time.delta_seconds();
        }
    }
}
```

### 2. 轨道相机

```rust
use bevy::prelude::*;

#[derive(Component)]
struct OrbitCamera {
    target: Vec3,
    distance: f32,
    angle_x: f32,
    angle_y: f32,
}

fn orbit_camera_system(
    mut query: Query<(&mut Transform, &mut OrbitCamera)>,
    input: Res<Input<KeyCode>>,
    time: Res<Time>,
) {
    for (mut transform, mut orbit_cam) in query.iter_mut() {
        // 处理输入
        if input.pressed(KeyCode::Left) {
            orbit_cam.angle_y -= time.delta_seconds();
        }
        if input.pressed(KeyCode::Right) {
            orbit_cam.angle_y += time.delta_seconds();
        }
        if input.pressed(KeyCode::Up) {
            orbit_cam.angle_x -= time.delta_seconds();
        }
        if input.pressed(KeyCode::Down) {
            orbit_cam.angle_x += time.delta_seconds();
        }

        // 计算新位置
        let rotation_y = Quat::from_rotation_y(orbit_cam.angle_y);
        let rotation_x = Quat::from_rotation_x(orbit_cam.angle_x);
        let rotation = rotation_y * rotation_x;

        let position = orbit_cam.target + rotation * Vec3::new(0.0, 0.0, orbit_cam.distance);

        transform.translation = position;
        transform.look_at(orbit_cam.target, Vec3::Y);
    }
}
```

### 3. 动画系统

```rust
use bevy::prelude::*;

#[derive(Component)]
struct FloatingAnimation {
    original_y: f32,
    amplitude: f32,
    frequency: f32,
    time: f32,
}

fn floating_animation_system(
    mut query: Query<(&mut Transform, &mut FloatingAnimation)>,
    time: Res<Time>,
) {
    for (mut transform, mut anim) in query.iter_mut() {
        anim.time += time.delta_seconds();

        let offset = (anim.time * anim.frequency).sin() * anim.amplitude;
        transform.translation.y = anim.original_y + offset;
    }
}

#[derive(Component)]
struct RotatingAnimation {
    axis: Vec3,
    speed: f32,
}

fn rotating_animation_system(
    mut query: Query<(&mut Transform, &RotatingAnimation)>,
    time: Res<Time>,
) {
    for (mut transform, anim) in query.iter_mut() {
        let rotation = Quat::from_axis_angle(anim.axis, anim.speed * time.delta_seconds());
        transform.rotate(rotation);
    }
}
```

### 4. 层次化角色模型

```rust
use bevy::prelude::*;

fn setup_character(mut commands: Commands) {
    // 角色根节点
    let character_root = commands.spawn((
        Transform::from_xyz(0.0, 0.0, 0.0),
        // CharacterController,
    )).id();

    // 躯干
    let torso = commands.spawn(Transform::from_xyz(0.0, 1.0, 0.0)).id();
    commands.entity(character_root).add_child(torso);

    // 头部
    let head = commands.spawn(Transform::from_xyz(0.0, 0.5, 0.0)).id();
    commands.entity(torso).add_child(head);

    // 左臂
    let left_arm = commands.spawn(Transform::from_xyz(-0.5, 0.0, 0.0)).id();
    commands.entity(torso).add_child(left_arm);

    // 右臂
    let right_arm = commands.spawn(Transform::from_xyz(0.5, 0.0, 0.0)).id();
    commands.entity(torso).add_child(right_arm);
}

fn character_animation_system(
    mut arm_query: Query<&mut Transform, With<Arm>>,
    time: Res<Time>,
) {
    for mut transform in arm_query.iter_mut() {
        // 摆臂动画
        let swing_angle = (time.elapsed_seconds() * 2.0).sin() * 0.5;
        transform.rotation = Quat::from_rotation_z(swing_angle);
    }
}
```

### 5. 粒子系统基础

```rust
use bevy::prelude::*;

#[derive(Component)]
struct Particle {
    velocity: Vec3,
    lifetime: f32,
    max_lifetime: f32,
}

fn particle_system(
    mut commands: Commands,
    mut query: Query<(Entity, &mut Transform, &mut Particle)>,
    time: Res<Time>,
) {
    for (entity, mut transform, mut particle) in query.iter_mut() {
        // 更新位置
        transform.translation += particle.velocity * time.delta_seconds();

        // 更新生命周期
        particle.lifetime -= time.delta_seconds();

        // 移除过期粒子
        if particle.lifetime <= 0.0 {
            commands.entity(entity).despawn();
        }

        // 应用重力
        particle.velocity.y -= 9.8 * time.delta_seconds();

        // 可选：根据生命周期调整缩放
        let life_ratio = particle.lifetime / particle.max_lifetime;
        transform.scale = Vec3::splat(life_ratio);
    }
}
```

## 性能优化建议

### 1. 静态场景优化

对于不会改变的实体，系统会自动跳过变换传播，提升性能。

### 2. 批量操作

```rust
use bevy::prelude::*;

fn batch_transform_update(mut query: Query<&mut Transform, With<BatchUpdate>>) {
    // 使用 par_iter_mut 进行并行处理
    query.par_iter_mut().for_each(|mut transform| {
        // 批量更新逻辑
        transform.translation.y += 1.0;
    });
}
```

### 3. 选择性更新

```rust
use bevy::prelude::*;

fn selective_update(
    mut query: Query<&mut Transform, (With<NeedsUpdate>, Changed<SomeComponent>)>
) {
    // 只处理真正需要更新的实体
    for mut transform in query.iter_mut() {
        // 更新逻辑
    }
}
```

## 注意事项

1. **不要直接修改 GlobalTransform**：它由系统自动管理
2. **层次结构一致性**：确保父子关系正确维护
3. **变换传播延迟**：GlobalTransform 在下一帧才会更新
4. **浮点精度**：长时间运行可能导致精度损失，需要定期标准化
5. **性能考量**：深层次结构会影响变换传播性能

通过合理使用这些API和模式，你可以构建复杂的3D场景、角色动画系统和交互式应用程序。