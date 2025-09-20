# Bevy Animation 模块完整操作文档

## 目录
1. [模块概述](#模块概述)
2. [核心结构体和枚举](#核心结构体和枚举)
3. [主要API使用示例](#主要api使用示例)
4. [与其他Bevy模块的集成](#与其他bevy模块的集成)
5. [常见使用场景](#常见使用场景)
6. [高级功能](#高级功能)

## 模块概述

### 主要功能

Bevy Animation 模块是 Bevy 游戏引擎的动画系统核心，提供了完整的动画解决方案。主要功能包括：

- **动画播放**: 控制动画剪辑的播放、暂停、停止
- **动画混合**: 支持多个动画的权重混合
- **动画图谱**: 基于节点图的复杂动画组合
- **动画过渡**: 平滑的动画间过渡效果
- **关键帧动画**: 支持线性、立方和阶梯插值
- **骨骼动画**: 针对骨骼网格的专业动画支持
- **变形动画**: Morph weights 动画支持
- **动画事件**: 在动画播放过程中触发事件

### 模块架构

```
bevy_animation/
├── src/
│   ├── lib.rs                 # 主模块，动画播放器和剪辑
│   ├── animatable.rs          # 动画插值特征
│   ├── animation_curves.rs    # 动画曲线系统
│   ├── graph.rs               # 动画图谱
│   ├── transition.rs          # 动画过渡
│   ├── animation_event.rs     # 动画事件
│   ├── gltf_curves.rs         # GLTF曲线支持
│   └── util.rs                # 工具函数
└── macros/                    # 宏定义
```

## 核心结构体和枚举

### 1. AnimationClip（动画剪辑）

动画剪辑是动画系统的基础单元，包含一系列动画曲线和事件。

```rust
#[derive(Asset, Reflect, Clone, Debug, Default)]
pub struct AnimationClip {
    curves: AnimationCurves,    // 动画曲线映射
    events: AnimationEvents,    // 动画事件
    duration: f32,              // 动画持续时间
}
```

**主要方法**：
- `curves()` / `curves_mut()`: 获取所有动画曲线
- `curves_for_target()`: 获取特定目标的曲线
- `duration()` / `set_duration()`: 持续时间操作
- `add_curve_to_target()`: 添加曲线到目标
- `add_event()` / `add_event_to_target()`: 添加动画事件

### 2. AnimationPlayer（动画播放器）

控制动画播放的核心组件。

```rust
#[derive(Component, Default, Reflect)]
pub struct AnimationPlayer {
    active_animations: HashMap<AnimationNodeIndex, ActiveAnimation>,
}
```

**主要方法**：
- `start()`: 开始播放动画（重新开始）
- `play()`: 播放动画（如果未播放则开始）
- `stop()` / `stop_all()`: 停止动画
- `pause_all()` / `resume_all()`: 暂停/恢复所有动画
- `animation()` / `animation_mut()`: 获取特定动画状态

### 3. ActiveAnimation（活动动画）

表示当前正在播放的动画状态。

```rust
#[derive(Debug, Clone, Copy, Reflect)]
pub struct ActiveAnimation {
    weight: f32,              // 动画权重
    repeat: RepeatAnimation,  // 重复模式
    speed: f32,               // 播放速度
    elapsed: f32,             // 已播放时间
    seek_time: f32,           // 当前时间位置
    completions: u32,         // 完成次数
    paused: bool,             // 是否暂停
}
```

**主要方法**：
- `set_weight()`: 设置权重
- `pause()` / `resume()`: 暂停/恢复
- `set_repeat()` / `repeat()`: 设置重复模式
- `set_speed()`: 设置播放速度
- `seek_to()` / `rewind()`: 时间跳转

### 4. RepeatAnimation（重复模式）

```rust
#[derive(Reflect, Debug, PartialEq, Eq, Copy, Clone, Default)]
pub enum RepeatAnimation {
    #[default]
    Never,          // 播放一次
    Count(u32),     // 播放指定次数
    Forever,        // 无限循环
}
```

### 5. AnimationGraph（动画图谱）

高级动画组合系统，支持复杂的动画混合。

```rust
#[derive(Asset, Reflect, Clone, Debug)]
pub struct AnimationGraph {
    pub graph: AnimationDiGraph,                                    // 节点图
    pub root: NodeIndex,                                           // 根节点
    pub mask_groups: HashMap<AnimationTargetId, AnimationMask>,   // 掩码组
}
```

**节点类型**：
```rust
#[derive(Clone, Default, Reflect, Debug)]
pub enum AnimationNodeType {
    Clip(Handle<AnimationClip>), // 剪辑节点
    #[default]
    Blend,                       // 混合节点
    Add,                         // 加法混合节点
}
```

### 6. AnimationTarget（动画目标）

标识可被动画化的实体。

```rust
#[derive(Clone, Copy, Component, Reflect)]
pub struct AnimationTarget {
    pub id: AnimationTargetId,  // 目标ID
    pub player: Entity,         // 动画播放器实体
}
```

### 7. Animatable Trait（可动画化特征）

定义类型如何进行动画插值。

```rust
pub trait Animatable: Reflect + Sized + Send + Sync + 'static {
    fn interpolate(a: &Self, b: &Self, time: f32) -> Self;
    fn blend(inputs: impl Iterator<Item = BlendInput<Self>>) -> Self;
}
```

## 主要API使用示例

### 1. 基础动画播放

```rust
use bevy::prelude::*;
use bevy_animation::prelude::*;

fn setup_basic_animation(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    // 加载动画剪辑
    let animation_clip: Handle<AnimationClip> = asset_server.load("animations/walk.animclip.ron");

    // 创建动画图谱
    let (animation_graph, animation_node) = AnimationGraph::from_clip(animation_clip);
    let animation_graph_handle = asset_server.add(animation_graph);

    // 生成带动画的实体
    commands.spawn((
        // ... 其他组件（如Transform, Mesh等）
        AnimationPlayer::default(),
        AnimationGraphHandle(animation_graph_handle),
    ));
}

fn control_animation(
    mut players: Query<&mut AnimationPlayer>,
    input: Res<ButtonInput<KeyCode>>,
) {
    for mut player in &mut players {
        if input.just_pressed(KeyCode::Space) {
            // 开始播放动画节点0
            player.start(AnimationNodeIndex::new(0));
        }

        if input.just_pressed(KeyCode::KeyP) {
            // 暂停所有动画
            player.pause_all();
        }

        if input.just_pressed(KeyCode::KeyR) {
            // 恢复所有动画
            player.resume_all();
        }
    }
}
```

### 2. 动画权重控制

```rust
fn animate_with_weights(
    mut players: Query<&mut AnimationPlayer>,
    time: Res<Time>,
) {
    for mut player in &mut players {
        let node_index = AnimationNodeIndex::new(0);

        if let Some(animation) = player.animation_mut(node_index) {
            // 使用正弦波控制权重
            let weight = (time.elapsed_secs().sin() + 1.0) * 0.5;
            animation.set_weight(weight);

            // 控制播放速度
            let speed = 0.5 + weight;
            animation.set_speed(speed);
        }
    }
}
```

### 3. 创建自定义动画剪辑

```rust
use bevy_animation::animation_curves::*;
use bevy_math::curve::*;

fn create_custom_animation() -> AnimationClip {
    let mut clip = AnimationClip::default();

    // 创建位移动画曲线
    let translation_keyframes = [
        (0.0, Vec3::ZERO),
        (1.0, Vec3::new(5.0, 0.0, 0.0)),
        (2.0, Vec3::ZERO),
    ];

    let translation_curve = AnimatableKeyframeCurve::new(translation_keyframes)
        .expect("Failed to create translation curve");

    // 创建动画曲线
    let translation_animation = AnimatableCurve::new(
        animated_field!(Transform::translation),
        translation_curve,
    );

    // 创建旋转动画曲线
    let rotation_keyframes = [
        (0.0, Quat::IDENTITY),
        (1.0, Quat::from_rotation_y(std::f32::consts::PI)),
        (2.0, Quat::IDENTITY),
    ];

    let rotation_curve = AnimatableKeyframeCurve::new(rotation_keyframes)
        .expect("Failed to create rotation curve");

    let rotation_animation = AnimatableCurve::new(
        animated_field!(Transform::rotation),
        rotation_curve,
    );

    // 添加曲线到动画剪辑
    let target_id = AnimationTargetId::from_iter(["root", "bone"]);
    clip.add_curve_to_target(target_id, translation_animation);
    clip.add_curve_to_target(target_id, rotation_animation);

    // 添加动画事件
    clip.add_event(1.0, MyAnimationEvent);

    clip
}

#[derive(AnimationEvent, Reflect, Clone)]
struct MyAnimationEvent;
```

### 4. 动画图谱构建

```rust
fn create_animation_graph(
    walk_clip: Handle<AnimationClip>,
    run_clip: Handle<AnimationClip>,
    idle_clip: Handle<AnimationClip>,
) -> AnimationGraph {
    let mut graph = AnimationGraph::new();

    // 添加剪辑节点
    let walk_node = graph.add_clip(walk_clip, 1.0, graph.root);
    let run_node = graph.add_clip(run_clip, 1.0, graph.root);
    let idle_node = graph.add_clip(idle_clip, 1.0, graph.root);

    // 创建混合节点
    let locomotion_blend = graph.add_blend(0.5, graph.root);

    // 重新组织图结构
    graph.remove_edge(graph.root, walk_node);
    graph.remove_edge(graph.root, run_node);

    graph.add_edge(locomotion_blend, walk_node);
    graph.add_edge(locomotion_blend, run_node);

    // 设置掩码组（可选）
    graph.add_target_to_mask_group(
        AnimationTargetId::from_iter(["character", "left_arm"]),
        0
    );

    graph
}
```

### 5. 动画过渡

```rust
use bevy_animation::transition::*;

fn setup_animation_transitions(mut commands: Commands) {
    commands.spawn((
        AnimationPlayer::default(),
        AnimationTransitions::new(),
        // ... 其他组件
    ));
}

fn handle_animation_transitions(
    mut query: Query<(&mut AnimationPlayer, &mut AnimationTransitions)>,
    input: Res<ButtonInput<KeyCode>>,
) {
    for (mut player, mut transitions) in &mut query {
        if input.just_pressed(KeyCode::Digit1) {
            // 过渡到走路动画，持续0.3秒
            transitions.play(
                &mut player,
                AnimationNodeIndex::new(0), // 走路动画
                Duration::from_millis(300),
            );
        }

        if input.just_pressed(KeyCode::Digit2) {
            // 过渡到跑步动画，持续0.5秒
            transitions.play(
                &mut player,
                AnimationNodeIndex::new(1), // 跑步动画
                Duration::from_millis(500),
            );
        }
    }
}
```

### 6. 变形权重动画

```rust
use bevy_animation::animation_curves::WeightsCurve;
use bevy_mesh::morph::MorphWeights;

fn create_morph_animation() -> AnimationClip {
    let mut clip = AnimationClip::default();

    // 创建变形权重曲线
    let times = [0.0, 1.0, 2.0];
    let weights = [
        0.0, 0.0, 0.0,  // t=0: 所有权重为0
        1.0, 0.5, 0.0,  // t=1: 第一个权重1.0，第二个0.5
        0.0, 0.0, 1.0,  // t=2: 第三个权重1.0
    ];

    let weights_curve = WeightsCurve::Linear(
        WideLinearKeyframeCurve::new(times, weights)
            .expect("Failed to create weights curve")
    );

    let target_id = AnimationTargetId::from_iter(["character", "face"]);
    clip.add_curve_to_target(target_id, VariableCurve::new(weights_curve));

    clip
}
```

## 与其他Bevy模块的集成

### 1. 与Transform系统集成

```rust
// 动画系统会自动更新Transform组件
// 动画播放顺序：AnimationSystems -> TransformSystems::Propagate
```

### 2. 与Asset系统集成

```rust
fn load_animations(
    asset_server: Res<AssetServer>,
    mut animation_graphs: ResMut<Assets<AnimationGraph>>,
    mut animation_clips: ResMut<Assets<AnimationClip>>,
) {
    // 从文件加载
    let clip: Handle<AnimationClip> = asset_server.load("animations/walk.animclip.ron");
    let graph: Handle<AnimationGraph> = asset_server.load("animations/character.animgraph.ron");

    // 程序化创建
    let custom_clip = create_custom_animation();
    let clip_handle = animation_clips.add(custom_clip);

    let custom_graph = AnimationGraph::from_clip(clip_handle).0;
    let graph_handle = animation_graphs.add(custom_graph);
}
```

### 3. 与Mesh系统集成

```rust
// 对于骨骼网格动画
fn setup_skeletal_animation(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    commands.spawn((
        Mesh3d(asset_server.load("models/character.gltf#Mesh0")),
        MeshMaterial3d(asset_server.load("models/character.gltf#Material0")),
        Transform::default(),
        // 动画组件
        AnimationPlayer::default(),
        AnimationGraphHandle(asset_server.load("models/character.gltf#AnimationGraph")),
    ));
}
```

### 4. 与事件系统集成

```rust
#[derive(AnimationEvent, Reflect, Clone)]
struct FootstepEvent {
    intensity: f32,
}

fn setup_animation_events(mut commands: Commands) {
    commands.observe(handle_footstep_event);
}

fn handle_footstep_event(
    trigger: Trigger<FootstepEvent>,
    mut commands: Commands,
) {
    println!("Footstep with intensity: {}", trigger.event().intensity);
    // 播放脚步声音、生成粒子效果等
}
```

## 常见使用场景

### 1. 角色移动动画

```rust
#[derive(Component)]
struct CharacterController {
    walk_speed: f32,
    run_speed: f32,
}

fn character_animation_system(
    mut query: Query<(
        &CharacterController,
        &mut AnimationPlayer,
        &mut AnimationTransitions,
        &Transform,
    )>,
    input: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
) {
    for (controller, mut player, mut transitions, transform) in &mut query {
        let mut movement = Vec3::ZERO;

        // 输入检测
        if input.pressed(KeyCode::KeyW) { movement.z -= 1.0; }
        if input.pressed(KeyCode::KeyS) { movement.z += 1.0; }
        if input.pressed(KeyCode::KeyA) { movement.x -= 1.0; }
        if input.pressed(KeyCode::KeyD) { movement.x += 1.0; }

        let is_running = input.pressed(KeyCode::ShiftLeft);
        let movement_length = movement.length();

        // 根据移动状态选择动画
        if movement_length > 0.1 {
            let target_animation = if is_running {
                AnimationNodeIndex::new(1) // 跑步动画
            } else {
                AnimationNodeIndex::new(0) // 走路动画
            };

            // 检查是否需要切换动画
            if transitions.get_main_animation() != Some(target_animation) {
                transitions.play(
                    &mut player,
                    target_animation,
                    Duration::from_millis(200),
                );
            }

            // 根据速度调整播放速率
            let speed_multiplier = if is_running {
                movement_length * controller.run_speed
            } else {
                movement_length * controller.walk_speed
            };

            if let Some(animation) = player.animation_mut(target_animation) {
                animation.set_speed(speed_multiplier);
            }
        } else {
            // 切换到待机动画
            let idle_animation = AnimationNodeIndex::new(2);
            if transitions.get_main_animation() != Some(idle_animation) {
                transitions.play(
                    &mut player,
                    idle_animation,
                    Duration::from_millis(300),
                );
            }
        }
    }
}
```

### 2. UI动画

```rust
use bevy_ui::prelude::*;

#[derive(Component)]
struct UIFadeAnimation {
    target_alpha: f32,
    duration: f32,
}

fn setup_ui_animation(mut commands: Commands) {
    let ui_animation = create_ui_fade_animation();

    commands.spawn((
        Node {
            position_type: PositionType::Absolute,
            left: Val::Px(100.0),
            top: Val::Px(100.0),
            width: Val::Px(200.0),
            height: Val::Px(100.0),
            ..default()
        },
        BackgroundColor(Color::srgba(1.0, 1.0, 1.0, 0.0)),
        AnimationPlayer::default(),
        // 添加UI动画
        UIFadeAnimation {
            target_alpha: 1.0,
            duration: 2.0,
        },
    ));
}

fn create_ui_fade_animation() -> AnimationClip {
    let mut clip = AnimationClip::default();

    // 创建透明度动画
    let alpha_keyframes = [
        (0.0, 0.0),
        (1.0, 1.0),
    ];

    let alpha_curve = AnimatableKeyframeCurve::new(alpha_keyframes)
        .expect("Failed to create alpha curve");

    // 注意：这里需要自定义AnimatableProperty来动画化BackgroundColor的alpha
    let alpha_animation = AnimatableCurve::new(
        UIAlphaProperty,
        alpha_curve,
    );

    let target_id = AnimationTargetId::from_iter(["ui_element"]);
    clip.add_curve_to_target(target_id, alpha_animation);

    clip
}

// 自定义属性动画器
#[derive(Clone)]
struct UIAlphaProperty;

impl AnimatableProperty for UIAlphaProperty {
    type Property = f32;

    fn get_mut<'a>(
        &self,
        entity: &'a mut AnimationEntityMut,
    ) -> Result<&'a mut Self::Property, AnimationEvaluationError> {
        // 这里需要实现如何从实体获取并修改alpha值
        // 实际实现会更复杂，需要处理BackgroundColor组件
        todo!("实现UI alpha属性访问")
    }

    fn evaluator_id(&self) -> EvaluatorId<'_> {
        EvaluatorId::Type(TypeId::of::<Self>())
    }
}
```

### 3. 物理属性动画

```rust
#[derive(Component)]
struct AnimatedScale {
    base_scale: Vec3,
    amplitude: f32,
    frequency: f32,
}

fn create_scale_pulse_animation() -> AnimationClip {
    let mut clip = AnimationClip::default();

    // 创建缩放脉冲动画
    let scale_keyframes = [
        (0.0, Vec3::ONE),
        (0.5, Vec3::splat(1.2)),
        (1.0, Vec3::ONE),
    ];

    let scale_curve = AnimatableKeyframeCurve::new(scale_keyframes)
        .expect("Failed to create scale curve");

    let scale_animation = AnimatableCurve::new(
        animated_field!(Transform::scale),
        scale_curve,
    );

    let target_id = AnimationTargetId::from_iter(["pulsing_object"]);
    clip.add_curve_to_target(target_id, scale_animation);

    // 设置循环播放
    clip.set_duration(1.0);

    clip
}

fn setup_pulsing_object(
    mut commands: Commands,
    mut animation_clips: ResMut<Assets<AnimationClip>>,
    mut animation_graphs: ResMut<Assets<AnimationGraph>>,
) {
    let pulse_clip = create_scale_pulse_animation();
    let clip_handle = animation_clips.add(pulse_clip);

    let (pulse_graph, pulse_node) = AnimationGraph::from_clip(clip_handle);
    let graph_handle = animation_graphs.add(pulse_graph);

    commands.spawn((
        Transform::default(),
        AnimationPlayer::default(),
        AnimationGraphHandle(graph_handle),
        AnimatedScale {
            base_scale: Vec3::ONE,
            amplitude: 0.2,
            frequency: 2.0,
        },
    ));

    // 启动动画并设置循环
    commands.add(move |world: &mut World| {
        let mut query = world.query::<&mut AnimationPlayer>();
        for mut player in query.iter_mut(world) {
            let mut active = player.start(pulse_node);
            active.set_repeat(RepeatAnimation::Forever);
        }
    });
}
```

## 高级功能

### 1. 动画混合权重控制

```rust
fn advanced_animation_blending(
    mut players: Query<&mut AnimationPlayer>,
    input: Res<ButtonInput<KeyCode>>,
    time: Res<Time>,
) {
    for mut player in &mut players {
        let walk_node = AnimationNodeIndex::new(0);
        let run_node = AnimationNodeIndex::new(1);
        let idle_node = AnimationNodeIndex::new(2);

        // 获取输入强度
        let movement_input = if input.pressed(KeyCode::KeyW) { 1.0 } else { 0.0 };
        let sprint_input = if input.pressed(KeyCode::ShiftLeft) { 1.0 } else { 0.0 };

        // 计算混合权重
        let idle_weight = (1.0 - movement_input).max(0.0);
        let walk_weight = movement_input * (1.0 - sprint_input);
        let run_weight = movement_input * sprint_input;

        // 应用权重
        if let Some(animation) = player.animation_mut(idle_node) {
            animation.set_weight(idle_weight);
        }
        if let Some(animation) = player.animation_mut(walk_node) {
            animation.set_weight(walk_weight);
        }
        if let Some(animation) = player.animation_mut(run_node) {
            animation.set_weight(run_weight);
        }

        // 确保所有相关动画都在播放
        if idle_weight > 0.0 { player.play(idle_node); }
        if walk_weight > 0.0 { player.play(walk_node); }
        if run_weight > 0.0 { player.play(run_node); }
    }
}
```

### 2. 动画掩码使用

```rust
fn setup_masked_animations(
    mut animation_graphs: ResMut<Assets<AnimationGraph>>,
    clip_handles: Res<AnimationClipHandles>,
) {
    let mut graph = AnimationGraph::new();

    // 添加全身动画
    let full_body_node = graph.add_clip(clip_handles.walk.clone(), 1.0, graph.root);

    // 添加上半身动画（只影响上半身）
    let upper_body_node = graph.add_clip(clip_handles.wave.clone(), 1.0, graph.root);

    // 设置掩码组
    // 下半身骨骼属于掩码组0
    graph.add_target_to_mask_group(
        AnimationTargetId::from_iter(["character", "hips", "left_leg"]),
        0
    );
    graph.add_target_to_mask_group(
        AnimationTargetId::from_iter(["character", "hips", "right_leg"]),
        0
    );

    // 上半身动画节点掩码掉下半身（掩码组0）
    if let Some(upper_body_anim) = graph.get_mut(upper_body_node) {
        upper_body_anim.add_mask_group(0);
    }

    // 这样上半身动画只会影响上半身，下半身继续播放走路动画
}

#[derive(Resource)]
struct AnimationClipHandles {
    walk: Handle<AnimationClip>,
    wave: Handle<AnimationClip>,
    // ... 其他动画
}
```

### 3. 程序化动画生成

```rust
use bevy_math::curve::FunctionCurve;

fn create_procedural_orbit_animation(radius: f32, period: f32) -> AnimationClip {
    let mut clip = AnimationClip::default();

    // 创建圆形轨道函数
    let orbit_curve = FunctionCurve::new(
        Interval::new(0.0, period).unwrap(),
        move |t: f32| {
            let angle = t * 2.0 * std::f32::consts::PI / period;
            Vec3::new(
                radius * angle.cos(),
                0.0,
                radius * angle.sin(),
            )
        },
    );

    let orbit_animation = AnimatableCurve::new(
        animated_field!(Transform::translation),
        orbit_curve,
    );

    let target_id = AnimationTargetId::from_iter(["orbiting_object"]);
    clip.add_curve_to_target(target_id, orbit_animation);

    clip.set_duration(period);

    clip
}

fn setup_orbiting_objects(
    mut commands: Commands,
    mut animation_clips: ResMut<Assets<AnimationClip>>,
    mut animation_graphs: ResMut<Assets<AnimationGraph>>,
) {
    for i in 0..5 {
        let radius = 2.0 + i as f32 * 0.5;
        let period = 3.0 + i as f32 * 0.3;

        let orbit_clip = create_procedural_orbit_animation(radius, period);
        let clip_handle = animation_clips.add(orbit_clip);

        let (orbit_graph, orbit_node) = AnimationGraph::from_clip(clip_handle);
        let graph_handle = animation_graphs.add(orbit_graph);

        commands.spawn((
            Transform::default(),
            AnimationPlayer::default(),
            AnimationGraphHandle(graph_handle),
        ));

        // 设置循环播放
        commands.add(move |world: &mut World| {
            let mut query = world.query::<&mut AnimationPlayer>();
            for mut player in query.iter_mut(world) {
                let mut active = player.start(orbit_node);
                active.set_repeat(RepeatAnimation::Forever);
            }
        });
    }
}
```

### 4. 动画事件的高级使用

```rust
#[derive(AnimationEvent, Reflect, Clone)]
struct ComplexAnimationEvent {
    event_type: String,
    parameters: HashMap<String, f32>,
    target_entities: Vec<Entity>,
}

fn setup_complex_animation_events(
    mut commands: Commands,
    mut animation_clips: ResMut<Assets<AnimationClip>>,
) {
    let mut clip = AnimationClip::default();

    // 添加复杂事件
    clip.add_event_fn(0.5, |commands, entity, time, weight| {
        // 在动画中途触发粒子效果
        commands.trigger_with(
            ComplexAnimationEvent {
                event_type: "particle_burst".to_string(),
                parameters: {
                    let mut params = HashMap::new();
                    params.insert("intensity".to_string(), weight);
                    params.insert("time".to_string(), time);
                    params
                },
                target_entities: vec![entity],
            },
            AnimationEventTrigger {
                animation_player: entity,
            },
        );
    });

    // 添加目标特定事件
    let foot_target = AnimationTargetId::from_iter(["character", "left_foot"]);
    clip.add_event_fn_to_target(foot_target, 0.2, |commands, entity, time, weight| {
        // 脚步着地事件
        commands.trigger_with(
            ComplexAnimationEvent {
                event_type: "footstep".to_string(),
                parameters: HashMap::from([
                    ("ground_impact".to_string(), weight),
                    ("step_time".to_string(), time),
                ]),
                target_entities: vec![entity],
            },
            AnimationEventTrigger {
                animation_player: entity,
            },
        );
    });

    animation_clips.add(clip);
}

fn handle_complex_animation_events(
    trigger: Trigger<ComplexAnimationEvent>,
    mut commands: Commands,
    // ... 其他系统参数
) {
    let event = trigger.event();

    match event.event_type.as_str() {
        "particle_burst" => {
            let intensity = event.parameters.get("intensity").unwrap_or(&1.0);
            // 生成粒子效果
            println!("Generating particle burst with intensity: {}", intensity);
        },
        "footstep" => {
            let impact = event.parameters.get("ground_impact").unwrap_or(&1.0);
            // 播放脚步声和地面特效
            println!("Footstep with ground impact: {}", impact);
        },
        _ => {
            println!("Unknown animation event: {}", event.event_type);
        }
    }
}
```

## 性能优化建议

### 1. 动画预加载和缓存

```rust
#[derive(Resource)]
struct AnimationCache {
    clips: HashMap<String, Handle<AnimationClip>>,
    graphs: HashMap<String, Handle<AnimationGraph>>,
}

fn preload_animations(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
) {
    let cache = AnimationCache {
        clips: HashMap::from([
            ("walk".to_string(), asset_server.load("animations/walk.animclip.ron")),
            ("run".to_string(), asset_server.load("animations/run.animclip.ron")),
            ("idle".to_string(), asset_server.load("animations/idle.animclip.ron")),
        ]),
        graphs: HashMap::from([
            ("character".to_string(), asset_server.load("animations/character.animgraph.ron")),
        ]),
    };

    commands.insert_resource(cache);
}
```

### 2. 动画LOD（细节层次）

```rust
#[derive(Component)]
struct AnimationLOD {
    current_level: u32,
    distance_thresholds: Vec<f32>,
}

fn animation_lod_system(
    mut query: Query<(&mut AnimationPlayer, &mut AnimationLOD, &Transform)>,
    camera_query: Query<&Transform, (With<Camera>, Without<AnimationLOD>)>,
) {
    let camera_transform = camera_query.single();

    for (mut player, mut lod, transform) in &mut query {
        let distance = camera_transform.translation.distance(transform.translation);

        // 根据距离确定LOD级别
        let new_level = lod.distance_thresholds
            .iter()
            .position(|&threshold| distance < threshold)
            .unwrap_or(lod.distance_thresholds.len() - 1) as u32;

        if new_level != lod.current_level {
            lod.current_level = new_level;

            // 根据LOD级别调整动画质量
            for (_, animation) in player.playing_animations_mut() {
                match new_level {
                    0 => animation.set_speed(1.0), // 全质量
                    1 => animation.set_speed(0.8), // 降低更新频率
                    2 => animation.set_speed(0.5), // 更低质量
                    _ => {
                        // 最远距离：暂停动画
                        animation.pause();
                    }
                }
            }
        }
    }
}
```

这份文档涵盖了 Bevy Animation 模块的核心功能、API使用方法和高级技巧。通过这些示例和说明，您可以在项目中有效地使用 Bevy 的动画系统来创建丰富的动画效果。