/**
 * Bevy 插件设计理念示例
 * 对比传统 TypeScript 类设计和 Bevy 插件设计
 */

import { World } from "@rbxts/matter";
import { Plugin, App } from "./src/bevy_app";
import { Resource } from "./src/bevy_ecs";

// ============================================
// 1. 传统 TypeScript 面向对象设计
// ============================================

/**
 * 传统的音频管理器类
 * 问题：
 * - 需要手动管理生命周期
 * - 难以与其他系统集成
 * - 紧耦合，测试困难
 * - 全局单例模式带来的问题
 */
class TraditionalAudioManager {
	private static instance: TraditionalAudioManager;
	private sounds: Map<string, Sound> = new Map();
	private volume = 1.0;

	private constructor() {
		// 私有构造函数，确保单例
	}

	static getInstance(): TraditionalAudioManager {
		if (!this.instance) {
			this.instance = new TraditionalAudioManager();
		}
		return this.instance;
	}

	loadSound(name: string, sound: Sound): void {
		this.sounds.set(name, sound);
	}

	playSound(name: string): void {
		const sound = this.sounds.get(name);
		if (sound) {
			// 播放声音
			print(`Playing sound: ${name} at volume ${this.volume}`);
		}
	}

	setVolume(volume: number): void {
		this.volume = math.clamp(volume, 0, 1);
	}
}

// 使用传统方式
const audioManager = TraditionalAudioManager.getInstance();
audioManager.loadSound("explosion", {} as Sound);
audioManager.playSound("explosion");

// ============================================
// 2. Bevy 插件设计模式
// ============================================

/**
 * 音频配置资源
 * 资源是全局共享的数据，可被所有系统访问
 * 特点：
 * - 纯数据，无行为
 * - 自动管理生命周期
 * - 类型安全访问
 */
class AudioConfig implements Resource {
	masterVolume = 1.0;
	soundVolume = 0.8;
	musicVolume = 0.6;
	muted = false;
}

/**
 * 音频资产资源
 * 存储所有加载的音频资源
 */
class AudioAssets implements Resource {
	sounds = new Map<string, Sound>();
	music = new Map<string, Sound>();

	/**
	 * 方法可以存在于资源中
	 * 但通常只是纯粹的数据操作，不涉及复杂逻辑
	 */
	getSound(name: string): Sound | undefined {
		return this.sounds.get(name);
	}
}

/**
 * 音频事件
 * 用于系统间通信
 */
class PlaySoundEvent {
	constructor(
		public readonly soundName: string,
		public readonly volume?: number,
		public readonly loop?: boolean,
	) {}
}

/**
 * 音频插件
 * 特点：
 * - 模块化：每个功能都是独立的插件
 * - 组合式：通过添加插件来扩展功能
 * - 解耦：插件之间通过资源和事件通信
 * - 可测试：每个系统都是纯函数
 */
class AudioPlugin implements Plugin {
	name(): string {
		return "AudioPlugin";
	}

	isUnique(): boolean {
		return true;
	}

	build(app: App): void {
		// 1. 注册资源 - 提供全局状态
		app.insertResource(AudioConfig, new AudioConfig());
		app.insertResource(AudioAssets, new AudioAssets());

		// 2. 添加系统 - 提供行为逻辑
		app.addSystems("Update",
			AudioPlugin.audioPlaybackSystem,
			AudioPlugin.volumeControlSystem,
		);

		// 3. 添加启动系统 - 初始化
		app.addSystems("Startup", AudioPlugin.loadAudioAssetsSystem);
	}

	/**
	 * 系统函数 - 纯函数，接收 World 和 Context
	 * 特点：
	 * - 无状态（状态在资源中）
	 * - 可并行执行
	 * - 易于测试
	 */
	static loadAudioAssetsSystem(world: World, context: Context): void {
		const assets = context.resources.getResource<AudioAssets>();
		if (!assets) return;

		// 加载音频资源
		assets.sounds.set("explosion", {} as Sound);
		assets.sounds.set("jump", {} as Sound);
		assets.music.set("bgm", {} as Sound);

		print("Audio assets loaded");
	}

	static audioPlaybackSystem(world: World, context: Context): void {
		const config = context.resources.getResource<AudioConfig>();
		const assets = context.resources.getResource<AudioAssets>();
		const eventReader = context.events.createReader<PlaySoundEvent>();

		if (!config || !assets) return;

		// 处理播放事件
		const events = eventReader.read();
		for (const event of events) {
			const sound = assets.getSound(event.soundName);
			if (sound && !config.muted) {
				const volume = (event.volume ?? 1.0) * config.soundVolume * config.masterVolume;
				// 实际播放声音
				print(`Playing: ${event.soundName} at volume ${volume}`);
			}
		}
	}

	static volumeControlSystem(world: World, context: Context): void {
		const config = context.resources.getResource<AudioConfig>();
		if (!config) return;

		// 可以在这里响应输入或其他事件来调整音量
		// 例如：检查按键输入，调整 config.masterVolume
	}
}

/**
 * 提供便利的 API 给外部使用
 * 这不是必需的，但可以让插件更易用
 */
export class AudioAPI {
	/**
	 * 播放声音
	 * 注意：这不是直接播放，而是发送事件
	 * 实际播放在系统中处理
	 */
	static playSound(app: App, soundName: string, volume?: number): void {
		const context = app.getContext();
		context.sendEvent(PlaySoundEvent, new PlaySoundEvent(soundName, volume));
	}

	/**
	 * 设置主音量
	 * 直接修改资源
	 */
	static setMasterVolume(app: App, volume: number): void {
		const context = app.getContext();
		const config = context.resources.getResource<AudioConfig>();
		if (config) {
			config.masterVolume = math.clamp(volume, 0, 1);
		}
	}

	/**
	 * 静音切换
	 */
	static toggleMute(app: App): void {
		const context = app.getContext();
		const config = context.resources.getResource<AudioConfig>();
		if (config) {
			config.muted = !config.muted;
		}
	}
}

// ============================================
// 3. 使用对比
// ============================================

// 传统方式使用
function traditionalUsage(): void {
	// 紧耦合，直接依赖具体实现
	const audio = TraditionalAudioManager.getInstance();
	audio.loadSound("boom", {} as Sound);
	audio.playSound("boom");
	audio.setVolume(0.5);

	// 问题：
	// - 难以测试（需要 mock 单例）
	// - 难以扩展（需要修改类）
	// - 状态管理复杂
}

// Bevy 方式使用
function bevyUsage(app: App): void {
	// 1. 添加插件
	app.addPlugin(new AudioPlugin());

	// 2. 通过 API 使用（可选的便利层）
	AudioAPI.playSound(app, "explosion");
	AudioAPI.setMasterVolume(app, 0.5);

	// 3. 或者直接通过资源/事件
	const context = app.getContext();

	// 直接访问资源
	const config = context.resources.getResource<AudioConfig>();
	if (config) {
		config.soundVolume = 0.7;
	}

	// 发送事件
	context.sendEvent(PlaySoundEvent, new PlaySoundEvent("jump", 0.8));

	// 优点：
	// - 解耦（通过资源和事件）
	// - 可测试（每个系统独立）
	// - 可扩展（添加新插件）
	// - 并行友好（系统可并行执行）
}

// ============================================
// 4. 核心理念对比
// ============================================

/**
 * 传统 OOP 设计：
 * - 数据和行为封装在类中
 * - 通过继承和多态扩展
 * - 对象管理自己的生命周期
 * - 通过方法调用交互
 *
 * Bevy ECS 设计：
 * - 数据（资源/组件）与行为（系统）分离
 * - 通过组合插件扩展功能
 * - 框架管理生命周期
 * - 通过事件和资源交互
 *
 * 为什么 Bevy 方式更适合游戏开发：
 * 1. 性能：系统可以并行执行，缓存友好
 * 2. 灵活性：运行时添加/移除功能
 * 3. 可维护性：关注点分离，易于理解
 * 4. 可测试性：纯函数系统，易于单元测试
 * 5. 热重载：可以重载单个系统而不影响状态
 */

// ============================================
// 5. 实际案例：多个插件协作
// ============================================

/**
 * 输入插件 - 处理用户输入
 */
class InputPlugin implements Plugin {
	name(): string { return "InputPlugin"; }
	isUnique(): boolean { return true; }

	build(app: App): void {
		// 注册输入状态资源
		app.insertResource(InputState, new InputState());
		// 添加输入处理系统
		app.addSystems("PreUpdate", InputPlugin.updateInputSystem);
	}

	static updateInputSystem(world: World, context: Context): void {
		// 更新输入状态...
	}
}

class InputState implements Resource {
	keysPressed = new Set<string>();
	mousePosition = { x: 0, y: 0 };
}

/**
 * UI 音效插件 - 扩展音频功能
 * 展示插件如何协作
 */
class UIAudioPlugin implements Plugin {
	name(): string { return "UIAudioPlugin"; }
	isUnique(): boolean { return true; }

	build(app: App): void {
		// 依赖 AudioPlugin 和 InputPlugin
		app.addSystems("Update", UIAudioPlugin.playUISound);
	}

	static playUISound(world: World, context: Context): void {
		// 读取输入状态
		const input = context.resources.getResource<InputState>();
		if (!input) return;

		// 如果点击了按钮，播放音效
		if (input.keysPressed.has("MouseButton1")) {
			// 通过事件与音频系统通信
			context.events.send(PlaySoundEvent,
				new PlaySoundEvent("ui_click", 0.5)
			);
		}
	}
}

// 组合使用
function setupGame(app: App): void {
	// 插件可以自由组合
	app.addPlugin(new AudioPlugin());    // 基础音频
	app.addPlugin(new InputPlugin());    // 输入处理
	app.addPlugin(new UIAudioPlugin());  // UI音效（依赖前两个）

	// 每个插件独立工作，通过资源和事件协作
	// 添加/移除插件不会破坏其他功能
}

type Sound = {}; // 仅用于示例

/**
 * 总结：
 *
 * Bevy 插件模式的核心是"组合优于继承"：
 * - 资源：提供共享数据和简单方法
 * - 系统：提供业务逻辑（纯函数）
 * - 事件：提供异步通信
 * - 插件：组合以上元素成为功能模块
 *
 * 这种设计让代码更加：
 * - 模块化（每个功能独立）
 * - 可测试（系统是纯函数）
 * - 可扩展（添加新插件）
 * - 高性能（并行执行）
 */