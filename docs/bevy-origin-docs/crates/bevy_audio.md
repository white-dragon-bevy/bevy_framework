# Bevy Audio 模块详细文档

## 概述

`bevy_audio` 是 Bevy 游戏引擎的音频支持模块，提供了完整的音频播放、控制和空间音频功能。该模块基于 `rodio` 音频库，支持多种音频格式（WAV、OGG、FLAC、MP3）的播放和实时控制。

### 主要功能

- **音频播放**: 支持多种音频格式的播放
- **音量控制**: 线性和分贝两种音量调节方式
- **播放控制**: 播放、暂停、停止、循环等
- **空间音频**: 3D 空间定位音效
- **音频混合**: 同时播放多个音频源
- **实时控制**: 运行时动态调整音频参数

## 核心结构体和枚举

### 1. AudioPlugin

音频插件，为 Bevy 应用添加音频支持。

```rust
#[derive(Default)]
pub struct AudioPlugin {
    /// 全局音量设置
    pub global_volume: GlobalVolume,
    /// 空间音频的默认缩放因子
    pub default_spatial_scale: SpatialScale,
}
```

**使用示例**:
```rust
use bevy::prelude::*;
use bevy_audio::{AudioPlugin, GlobalVolume, SpatialScale, Volume};

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(AudioPlugin {
            global_volume: GlobalVolume::new(Volume::Linear(0.8)),
            default_spatial_scale: SpatialScale::new(10.0),
        }))
        .run();
}
```

### 2. AudioPlayer

用于播放音频的组件。

```rust
#[derive(Component, Reflect)]
#[require(PlaybackSettings)]
pub struct AudioPlayer<Source = AudioSource>(pub Handle<Source>)
```

**功能说明**:
- 包含音频资源的句柄
- 自动要求 `PlaybackSettings` 组件
- 支持泛型音频源类型

**使用示例**:
```rust
use bevy::prelude::*;
use bevy_audio::{AudioPlayer, AudioSource, PlaybackSettings};

fn play_audio(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    commands.spawn((
        AudioPlayer::new(asset_server.load("sounds/background.ogg")),
        PlaybackSettings::LOOP,
    ));
}
```

### 3. PlaybackSettings

播放配置组件，定义音频的播放行为。

```rust
#[derive(Component, Clone, Copy, Debug, Reflect)]
pub struct PlaybackSettings {
    pub mode: PlaybackMode,           // 播放模式
    pub volume: Volume,               // 音量
    pub speed: f32,                   // 播放速度
    pub paused: bool,                 // 是否暂停
    pub muted: bool,                  // 是否静音
    pub spatial: bool,                // 是否启用空间音频
    pub spatial_scale: Option<SpatialScale>, // 空间缩放
    pub start_position: Option<Duration>,    // 开始位置
    pub duration: Option<Duration>,          // 播放时长
}
```

**预设配置**:
```rust
// 播放一次
PlaybackSettings::ONCE

// 循环播放
PlaybackSettings::LOOP

// 播放后销毁实体
PlaybackSettings::DESPAWN

// 播放后移除音频组件
PlaybackSettings::REMOVE
```

**使用示例**:
```rust
// 自定义播放设置
let settings = PlaybackSettings::LOOP
    .with_volume(Volume::Linear(0.5))
    .with_speed(1.2)
    .with_spatial(true)
    .paused()
    .muted();

commands.spawn((
    AudioPlayer::new(audio_handle),
    settings,
));
```

### 4. PlaybackMode

播放模式枚举。

```rust
#[derive(Debug, Clone, Copy, Reflect)]
pub enum PlaybackMode {
    Once,      // 播放一次
    Loop,      // 循环播放
    Despawn,   // 播放后销毁实体
    Remove,    // 播放后移除音频组件
}
```

### 5. Volume

音量表示，支持线性和分贝两种模式。

```rust
#[derive(Clone, Copy, Debug, Reflect)]
pub enum Volume {
    Linear(f32),    // 线性音量 (0.0 到 1.0+)
    Decibels(f32),  // 分贝音量 (负无穷到正无穷)
}
```

**实用方法**:
```rust
let volume = Volume::Linear(1.0);

// 转换
let linear = volume.to_linear();      // 转为线性
let db = volume.to_decibels();        // 转为分贝

// 调节音量
let increased = volume.increase_by_percentage(50.0);  // 增加50%
let decreased = volume.decrease_by_percentage(25.0);  // 减少25%
let scaled = volume.scale_to_factor(1.5);             // 缩放1.5倍

// 淡入淡出
let target = Volume::Linear(0.0);
let faded = volume.fade_towards(target, 0.5);  // 向目标音量渐变50%

// 运算
let result = Volume::Linear(0.5) * Volume::Linear(0.8);  // 音量相乘
let result = Volume::Decibels(6.0) + Volume::Decibels(3.0);  // 分贝相加
```

### 6. AudioSink 和 SpatialAudioSink

运行时音频控制组件，用于控制正在播放的音频。

```rust
#[derive(Component)]
pub struct AudioSink {
    // 内部 rodio::Sink
}

#[derive(Component)]
pub struct SpatialAudioSink {
    // 内部 rodio::SpatialSink
}
```

**AudioSinkPlayback Trait 方法**:
```rust
// 音量控制
fn volume(&self) -> Volume;
fn set_volume(&mut self, volume: Volume);

// 播放控制
fn play(&self);                    // 恢复播放
fn pause(&self);                   // 暂停
fn stop(&self);                    // 停止
fn toggle_playback(&self);         // 切换播放/暂停

// 速度控制
fn speed(&self) -> f32;
fn set_speed(&self, speed: f32);

// 静音控制
fn is_muted(&self) -> bool;
fn mute(&mut self);
fn unmute(&mut self);
fn toggle_mute(&mut self);

// 状态查询
fn is_paused(&self) -> bool;
fn empty(&self) -> bool;          // 是否播放完毕
fn position(&self) -> Duration;   // 当前播放位置

// 定位
fn try_seek(&self, pos: Duration) -> Result<(), SeekError>;
```

**使用示例**:
```rust
fn control_audio(
    mut query: Query<&mut AudioSink>,
    input: Res<ButtonInput<KeyCode>>,
) {
    for mut sink in &mut query {
        if input.just_pressed(KeyCode::Space) {
            sink.toggle_playback();
        }
        if input.just_pressed(KeyCode::KeyM) {
            sink.toggle_mute();
        }
        if input.pressed(KeyCode::ArrowUp) {
            let current = sink.volume();
            sink.set_volume(current.increase_by_percentage(5.0));
        }
        if input.pressed(KeyCode::ArrowDown) {
            let current = sink.volume();
            sink.set_volume(current.decrease_by_percentage(5.0));
        }
    }
}
```

### 7. SpatialListener

空间音频监听器组件。

```rust
#[derive(Component, Clone, Debug, Reflect)]
#[require(Transform)]
pub struct SpatialListener {
    pub left_ear_offset: Vec3,   // 左耳相对位置
    pub right_ear_offset: Vec3,  // 右耳相对位置
}
```

**使用示例**:
```rust
// 设置空间音频监听器（通常是摄像机或玩家）
commands.spawn((
    Camera3dBundle::default(),
    SpatialListener::new(4.0), // 4.0 单位的耳间距
    Transform::from_xyz(0.0, 0.0, 0.0),
));

// 播放空间音频
commands.spawn((
    AudioPlayer::new(asset_server.load("sounds/footstep.ogg")),
    PlaybackSettings::ONCE.with_spatial(true),
    Transform::from_xyz(10.0, 0.0, 0.0), // 音源位置
));
```

### 8. AudioSource

标准音频资源类型。

```rust
#[derive(Asset, Debug, Clone, TypePath)]
pub struct AudioSource {
    pub bytes: Arc<[u8]>,  // 音频数据
}
```

**支持的音频格式** (通过 Cargo features 启用):
- `wav`: WAV 格式
- `ogg`/`vorbis`: OGG Vorbis 格式 (默认启用)
- `mp3`: MP3 格式
- `flac`: FLAC 格式

### 9. Pitch

程序生成的正弦波音频源。

```rust
#[derive(Asset, Debug, Clone, TypePath)]
pub struct Pitch {
    pub frequency: f32,           // 频率 (Hz)
    pub duration: Duration,       // 持续时间
}
```

**使用示例**:
```rust
use bevy_audio::Pitch;
use std::time::Duration;

fn play_tone(mut commands: Commands) {
    // 播放 440Hz (A4 音符) 持续 1 秒
    let tone = Pitch::new(440.0, Duration::from_secs(1));

    commands.spawn((
        AudioPlayer(Handle::weak_from_u128(tone_handle)),
        PlaybackSettings::ONCE,
    ));
}
```

## 主要 API 使用示例

### 1. 基础音频播放

```rust
use bevy::prelude::*;
use bevy_audio::{AudioPlugin, AudioPlayer, PlaybackSettings};

fn main() {
    App::new()
        .add_plugins((DefaultPlugins, AudioPlugin::default()))
        .add_systems(Startup, setup_audio)
        .run();
}

fn setup_audio(asset_server: Res<AssetServer>, mut commands: Commands) {
    // 播放背景音乐
    commands.spawn((
        AudioPlayer::new(asset_server.load("music/background.ogg")),
        PlaybackSettings::LOOP.with_volume(Volume::Linear(0.3)),
    ));

    // 播放音效
    commands.spawn((
        AudioPlayer::new(asset_server.load("sounds/click.wav")),
        PlaybackSettings::ONCE,
    ));
}
```

### 2. 音频控制系统

```rust
use bevy::prelude::*;
use bevy_audio::{AudioSink, AudioSinkPlayback, Volume};

fn audio_control_system(
    mut audio_query: Query<&mut AudioSink>,
    keyboard: Res<ButtonInput<KeyCode>>,
) {
    for mut sink in &mut audio_query {
        // 空格键暂停/恢复
        if keyboard.just_pressed(KeyCode::Space) {
            sink.toggle_playback();
        }

        // M 键静音/取消静音
        if keyboard.just_pressed(KeyCode::KeyM) {
            sink.toggle_mute();
        }

        // 上下键调节音量
        if keyboard.pressed(KeyCode::ArrowUp) {
            let volume = sink.volume().increase_by_percentage(5.0);
            sink.set_volume(volume);
        }
        if keyboard.pressed(KeyCode::ArrowDown) {
            let volume = sink.volume().decrease_by_percentage(5.0);
            sink.set_volume(volume);
        }

        // 左右键调节播放速度
        if keyboard.pressed(KeyCode::ArrowLeft) {
            let speed = (sink.speed() - 0.1).max(0.1);
            sink.set_speed(speed);
        }
        if keyboard.pressed(KeyCode::ArrowRight) {
            let speed = (sink.speed() + 0.1).min(3.0);
            sink.set_speed(speed);
        }
    }
}
```

### 3. 空间音频实现

```rust
use bevy::prelude::*;
use bevy_audio::{AudioPlayer, PlaybackSettings, SpatialListener};

fn setup_spatial_audio(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    // 设置监听器（玩家/摄像机）
    commands.spawn((
        Camera3dBundle {
            transform: Transform::from_xyz(0.0, 5.0, 10.0),
            ..default()
        },
        SpatialListener::new(2.0), // 2.0 单位耳间距
    ));

    // 播放空间音效
    commands.spawn((
        AudioPlayer::new(asset_server.load("sounds/ambient.ogg")),
        PlaybackSettings::LOOP
            .with_spatial(true)
            .with_volume(Volume::Linear(0.5)),
        Transform::from_xyz(-5.0, 0.0, 0.0),
    ));
}

// 更新音源位置
fn update_audio_emitter_position(
    mut audio_query: Query<&mut Transform, (With<AudioPlayer>, Without<Camera>)>,
    time: Res<Time>,
) {
    for mut transform in &mut audio_query {
        // 让音源绕圆运动
        let angle = time.elapsed_seconds();
        transform.translation.x = angle.cos() * 5.0;
        transform.translation.z = angle.sin() * 5.0;
    }
}
```

### 4. 动态音频生成

```rust
use bevy::prelude::*;
use bevy_audio::{AudioPlayer, Pitch, PlaybackSettings};
use std::time::Duration;

fn play_musical_notes(
    mut commands: Commands,
    mut assets: ResMut<Assets<Pitch>>,
) {
    // 播放音阶
    let notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // C大调音阶

    for (i, &frequency) in notes.iter().enumerate() {
        let pitch = assets.add(Pitch::new(frequency, Duration::from_millis(500)));

        commands.spawn((
            AudioPlayer(pitch),
            PlaybackSettings::ONCE
                .with_volume(Volume::Linear(0.5))
                .with_start_position(Duration::from_millis(i as u64 * 600)),
        ));
    }
}
```

### 5. 音频淡入淡出

```rust
use bevy::prelude::*;
use bevy_audio::{AudioSink, AudioSinkPlayback, Volume};

#[derive(Component)]
struct FadeIn {
    duration: f32,
    elapsed: f32,
    target_volume: Volume,
}

fn audio_fade_system(
    mut commands: Commands,
    mut fade_query: Query<(Entity, &mut AudioSink, &mut FadeIn)>,
    time: Res<Time>,
) {
    for (entity, mut sink, mut fade) in &mut fade_query {
        fade.elapsed += time.delta_seconds();
        let progress = (fade.elapsed / fade.duration).min(1.0);

        // 计算当前音量
        let current_volume = Volume::Linear(0.0).fade_towards(fade.target_volume, progress);
        sink.set_volume(current_volume);

        // 淡入完成
        if progress >= 1.0 {
            commands.entity(entity).remove::<FadeIn>();
        }
    }
}

// 添加淡入效果
fn add_fade_in(
    mut commands: Commands,
    audio_query: Query<Entity, Added<AudioSink>>,
) {
    for entity in &audio_query {
        commands.entity(entity).insert(FadeIn {
            duration: 2.0,
            elapsed: 0.0,
            target_volume: Volume::Linear(1.0),
        });
    }
}
```

## 与其他 Bevy 模块的集成

### 1. 与 Asset 系统集成

```rust
use bevy::prelude::*;
use bevy_audio::{AudioSource, AudioPlayer};

fn load_audio_assets(
    asset_server: Res<AssetServer>,
    mut audio_assets: ResMut<Assets<AudioSource>>,
) {
    // 通过 AssetServer 加载
    let handle = asset_server.load("sounds/explosion.wav");

    // 检查加载状态
    match asset_server.load_state(&handle) {
        bevy::asset::LoadState::Loaded => {
            // 音频已加载，可以播放
        },
        bevy::asset::LoadState::Loading => {
            // 仍在加载中
        },
        bevy::asset::LoadState::Failed => {
            // 加载失败
        },
        _ => {}
    }
}
```

### 2. 与 Transform 系统集成

```rust
use bevy::prelude::*;
use bevy_audio::{SpatialAudioSink, AudioPlayer};

// 空间音频自动跟随 Transform 变化
fn sync_audio_with_transform(
    spatial_audio_query: Query<(&Transform, &SpatialAudioSink), Changed<Transform>>,
) {
    for (transform, sink) in &spatial_audio_query {
        sink.set_emitter_position(transform.translation);
    }
}
```

### 3. 与 ECS 事件系统集成

```rust
use bevy::prelude::*;
use bevy_audio::{AudioPlayer, PlaybackSettings};

#[derive(Event)]
struct PlaySoundEvent {
    sound_path: String,
    volume: f32,
}

fn play_sound_events(
    mut events: EventReader<PlaySoundEvent>,
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    for event in events.read() {
        commands.spawn((
            AudioPlayer::new(asset_server.load(&event.sound_path)),
            PlaybackSettings::ONCE.with_volume(Volume::Linear(event.volume)),
        ));
    }
}
```

## 常见使用场景

### 1. 游戏背景音乐

```rust
fn setup_background_music(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    commands.spawn((
        AudioPlayer::new(asset_server.load("music/main_theme.ogg")),
        PlaybackSettings::LOOP
            .with_volume(Volume::Linear(0.3))
            .with_speed(1.0),
    ));
}
```

### 2. UI 音效

```rust
use bevy_ui::Interaction;

fn button_sound_system(
    query: Query<&Interaction, (Changed<Interaction>, With<Button>)>,
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    for interaction in &query {
        match *interaction {
            Interaction::Pressed => {
                commands.spawn((
                    AudioPlayer::new(asset_server.load("sounds/button_click.wav")),
                    PlaybackSettings::ONCE.with_volume(Volume::Linear(0.5)),
                ));
            },
            Interaction::Hovered => {
                commands.spawn((
                    AudioPlayer::new(asset_server.load("sounds/button_hover.wav")),
                    PlaybackSettings::ONCE.with_volume(Volume::Linear(0.3)),
                ));
            },
            _ => {}
        }
    }
}
```

### 3. 环境音效

```rust
fn setup_ambient_sounds(
    asset_server: Res<AssetServer>,
    mut commands: Commands,
) {
    // 风声
    commands.spawn((
        AudioPlayer::new(asset_server.load("ambient/wind.ogg")),
        PlaybackSettings::LOOP
            .with_volume(Volume::Linear(0.2))
            .with_spatial(true),
        Transform::from_xyz(0.0, 10.0, 0.0),
    ));

    // 水声
    commands.spawn((
        AudioPlayer::new(asset_server.load("ambient/water.ogg")),
        PlaybackSettings::LOOP
            .with_volume(Volume::Linear(0.4))
            .with_spatial(true),
        Transform::from_xyz(20.0, 0.0, 0.0),
    ));
}
```

### 4. 动态音效系统

```rust
#[derive(Component)]
struct FootstepAudio {
    timer: Timer,
}

fn player_footstep_system(
    mut player_query: Query<(&Transform, &mut FootstepAudio), With<Player>>,
    input: Res<ButtonInput<KeyCode>>,
    asset_server: Res<AssetServer>,
    mut commands: Commands,
    time: Res<Time>,
) {
    for (transform, mut footstep) in &mut player_query {
        let is_moving = input.any_pressed([KeyCode::KeyW, KeyCode::KeyA, KeyCode::KeyS, KeyCode::KeyD]);

        if is_moving {
            footstep.timer.tick(time.delta());

            if footstep.timer.just_finished() {
                commands.spawn((
                    AudioPlayer::new(asset_server.load("sounds/footstep.wav")),
                    PlaybackSettings::ONCE
                        .with_volume(Volume::Linear(0.3))
                        .with_spatial(true),
                    *transform,
                ));
            }
        }
    }
}
```

### 5. 音频管理器

```rust
#[derive(Resource)]
struct AudioManager {
    master_volume: Volume,
    music_volume: Volume,
    sfx_volume: Volume,
}

impl Default for AudioManager {
    fn default() -> Self {
        Self {
            master_volume: Volume::Linear(1.0),
            music_volume: Volume::Linear(0.5),
            sfx_volume: Volume::Linear(0.8),
        }
    }
}

fn update_audio_volumes(
    audio_manager: Res<AudioManager>,
    mut music_query: Query<&mut AudioSink, With<BackgroundMusic>>,
    mut sfx_query: Query<&mut AudioSink, (With<SoundEffect>, Without<BackgroundMusic>)>,
) {
    if audio_manager.is_changed() {
        // 更新背景音乐音量
        for mut sink in &mut music_query {
            let final_volume = audio_manager.master_volume * audio_manager.music_volume;
            sink.set_volume(final_volume);
        }

        // 更新音效音量
        for mut sink in &mut sfx_query {
            let final_volume = audio_manager.master_volume * audio_manager.sfx_volume;
            sink.set_volume(final_volume);
        }
    }
}

#[derive(Component)]
struct BackgroundMusic;

#[derive(Component)]
struct SoundEffect;
```

## 性能优化建议

### 1. 资源管理
- 预加载常用音频资源
- 及时清理不需要的音频组件
- 使用音频池复用 AudioPlayer 组件

### 2. 空间音频优化
- 合理设置空间音频的数量上限
- 根据距离动态调整音频的播放状态
- 使用合适的空间缩放因子

### 3. 内存优化
- 对于短音效，考虑使用较低的音质
- 对于背景音乐，可以使用流式播放
- 及时释放已完成播放的音频资源

这份文档涵盖了 bevy_audio 模块的核心功能和用法。该模块为 Bevy 游戏引擎提供了完整的音频解决方案，支持从简单的音效播放到复杂的空间音频系统。通过合理使用这些 API，您可以为游戏添加丰富的音频体验。