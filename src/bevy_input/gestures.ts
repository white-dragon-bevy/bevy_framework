/**
 * 手势输入功能模块
 * Gesture input functionality
 *
 * 基于 Bevy 的手势输入系统设计,适配 Roblox 平台
 * Based on Bevy's gesture input system design, adapted for Roblox platform
 */

import { UserInputService } from "@rbxts/services";
import { MessageWriter  } from "../bevy_ecs/message";

/**
 * 手势状态枚举
 * Gesture state enum
 */
export enum GestureState {
	/**
	 * 手势开始
	 * Gesture began
	 */
	Started,

	/**
	 * 手势变化中
	 * Gesture changed
	 */
	Changed,

	/**
	 * 手势结束
	 * Gesture ended
	 */
	Ended,

	/**
	 * 手势取消
	 * Gesture canceled
	 */
	Canceled,
}

/**
 * 双指捏合手势
 * Two-finger pinch gesture, often used for magnifications
 *
 * 正值表示放大(缩放),负值表示缩小(缩小)
 * Positive delta values indicate magnification (zooming in) and
 * negative delta values indicate shrinking (zooming out)
 *
 * ## 平台特定 Platform-specific
 *
 * - 在 Roblox 中通过 UserInputService.TouchPinch 事件提供
 * - Available in Roblox through UserInputService.TouchPinch event
 */
export class PinchGesture {
	/**
	 * 手势状态
	 * Gesture state
	 */
	public readonly state: GestureState;

	/**
	 * 缩放增量
	 * Scale delta (positive = zoom in, negative = zoom out)
	 */
	public readonly delta: number;

	/**
	 * 缩放速度
	 * Scale velocity
	 */
	public readonly velocity: number;

	/**
	 * 当前缩放比例
	 * Current scale value
	 */
	public readonly scale: number;

	/**
	 * 触摸点位置
	 * Touch positions
	 */
	public readonly positions: ReadonlyArray<Vector2>;

	constructor(
		state: GestureState,
		delta: number,
		velocity: number,
		scale: number,
		positions: ReadonlyArray<Vector2>,
	) {
		this.state = state;
		this.delta = delta;
		this.velocity = velocity;
		this.scale = scale;
		this.positions = positions;
	}
}

/**
 * 双指旋转手势
 * Two-finger rotation gesture
 *
 * 正值表示逆时针旋转,负值表示顺时针旋转
 * Positive delta values indicate rotation counterclockwise and
 * negative delta values indicate rotation clockwise
 *
 * ## 平台特定 Platform-specific
 *
 * - 在 Roblox 中通过 UserInputService.TouchRotate 事件提供
 * - Available in Roblox through UserInputService.TouchRotate event
 */
export class RotationGesture {
	/**
	 * 手势状态
	 * Gesture state
	 */
	public readonly state: GestureState;

	/**
	 * 旋转角度增量(弧度)
	 * Rotation delta in radians (positive = counterclockwise, negative = clockwise)
	 */
	public readonly delta: number;

	/**
	 * 旋转速度
	 * Rotation velocity
	 */
	public readonly velocity: number;

	/**
	 * 当前旋转角度(弧度)
	 * Current rotation value in radians
	 */
	public readonly rotation: number;

	/**
	 * 触摸点位置
	 * Touch positions
	 */
	public readonly positions: ReadonlyArray<Vector2>;

	constructor(
		state: GestureState,
		delta: number,
		velocity: number,
		rotation: number,
		positions: ReadonlyArray<Vector2>,
	) {
		this.state = state;
		this.delta = delta;
		this.velocity = velocity;
		this.rotation = rotation;
		this.positions = positions;
	}
}

/**
 * 双击手势
 * Double tap gesture
 *
 * ## 平台特定 Platform-specific
 *
 * - 在 Roblox 中通过检测 UserInputService.TouchTap 的时间间隔实现
 * - Implemented in Roblox by detecting time interval between UserInputService.TouchTap events
 */
export class DoubleTapGesture {
	/**
	 * 双击位置
	 * Position of the double tap
	 */
	public readonly position: Vector2;

	/**
	 * 两次点击之间的时间间隔(秒)
	 * Time interval between taps in seconds
	 */
	public readonly interval: number;

	constructor(position: Vector2, interval: number) {
		this.position = position;
		this.interval = interval;
	}
}

/**
 * 平移手势
 * Pan gesture
 *
 * ## 平台特定 Platform-specific
 *
 * - 在 Roblox 中通过 UserInputService.TouchPan 事件提供
 * - Available in Roblox through UserInputService.TouchPan event
 */
export class PanGesture {
	/**
	 * 手势状态
	 * Gesture state
	 */
	public readonly state: GestureState;

	/**
	 * 移动增量
	 * Translation delta
	 */
	public readonly delta: Vector2;

	/**
	 * 移动速度
	 * Translation velocity
	 */
	public readonly velocity: Vector2;

	/**
	 * 总移动量
	 * Total translation
	 */
	public readonly totalTranslation: Vector2;

	/**
	 * 触摸点位置
	 * Touch positions
	 */
	public readonly positions: ReadonlyArray<Vector2>;

	constructor(
		state: GestureState,
		delta: Vector2,
		velocity: Vector2,
		totalTranslation: Vector2,
		positions: ReadonlyArray<Vector2>,
	) {
		this.state = state;
		this.delta = delta;
		this.velocity = velocity;
		this.totalTranslation = totalTranslation;
		this.positions = positions;
	}
}

/**
 * 长按手势
 * Long press gesture
 *
 * ## 平台特定 Platform-specific
 *
 * - 在 Roblox 中通过 UserInputService.TouchLongPress 事件提供
 * - Available in Roblox through UserInputService.TouchLongPress event
 */
export class LongPressGesture {
	/**
	 * 手势状态
	 * Gesture state
	 */
	public readonly state: GestureState;

	/**
	 * 长按位置
	 * Position of the long press
	 */
	public readonly position: Vector2;

	/**
	 * 长按持续时间(秒)
	 * Duration of the long press in seconds
	 */
	public readonly duration: number;

	/**
	 * 触摸点位置
	 * Touch positions
	 */
	public readonly positions: ReadonlyArray<Vector2>;

	constructor(state: GestureState, position: Vector2, duration: number, positions: ReadonlyArray<Vector2>) {
		this.state = state;
		this.position = position;
		this.duration = duration;
		this.positions = positions;
	}
}

/**
 * 将 Roblox 手势状态映射到 GestureState
 * Map Roblox gesture state to GestureState
 * @param state - Roblox 手势状态
 * @returns GestureState 枚举值
 */
function mapRobloxGestureState(state: Enum.UserInputState): GestureState {
	if (state === Enum.UserInputState.Begin) {
		return GestureState.Started;
	} else if (state === Enum.UserInputState.Change) {
		return GestureState.Changed;
	} else if (state === Enum.UserInputState.End) {
		return GestureState.Ended;
	} else if (state === Enum.UserInputState.Cancel) {
		return GestureState.Canceled;
	}

	return GestureState.Canceled;
}

/**
 * 手势输入管理器配置
 * Gesture input manager configuration
 */
export interface GestureManagerConfig {
	/**
	 * 双击最大时间间隔(秒)
	 * Maximum time interval for double tap in seconds
	 */
	readonly doubleTapMaxInterval: number;

	/**
	 * 双击最大距离(像素)
	 * Maximum distance for double tap in pixels
	 */
	readonly doubleTapMaxDistance: number;

	/**
	 * 启用捏合手势
	 * Enable pinch gesture
	 */
	readonly enablePinch: boolean;

	/**
	 * 启用旋转手势
	 * Enable rotation gesture
	 */
	readonly enableRotation: boolean;

	/**
	 * 启用平移手势
	 * Enable pan gesture
	 */
	readonly enablePan: boolean;

	/**
	 * 启用双击手势
	 * Enable double tap gesture
	 */
	readonly enableDoubleTap: boolean;

	/**
	 * 启用长按手势
	 * Enable long press gesture
	 */
	readonly enableLongPress: boolean;
}

/**
 * 默认手势管理器配置
 * Default gesture manager configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureManagerConfig = {
	doubleTapMaxInterval: 0.3,
	doubleTapMaxDistance: 50,
	enablePinch: true,
	enableRotation: true,
	enablePan: true,
	enableDoubleTap: true,
	enableLongPress: true,
};

/**
 * 手势输入管理器
 * Gesture input manager
 *
 * 管理 Roblox 手势事件的连接和状态
 * Manages Roblox gesture event connections and state
 */
export class GestureManager {
	private readonly config: GestureManagerConfig;
	private readonly connections: Array<RBXScriptConnection> = [];

	// 双击检测状态
	private lastTapTime?: number;
	private lastTapPosition?: Vector2;

	// 上一帧的手势状态(用于计算增量)
	private lastPinchScale?: number;
	private lastRotation?: number;
	private lastPanTranslation?: Vector2;

	constructor(config: GestureManagerConfig = DEFAULT_GESTURE_CONFIG) {
		this.config = config;
	}

	/**
	 * 设置手势事件处理器
	 * Setup gesture event handlers
	 * @param pinchWriter - 捏合手势事件写入器
	 * @param rotationWriter - 旋转手势事件写入器
	 * @param doubleTapWriter - 双击手势事件写入器
	 * @param panWriter - 平移手势事件写入器
	 * @param longPressWriter - 长按手势事件写入器
	 */
	public setupHandlers(
		pinchWriter: MessageWriter<PinchGesture>,
		rotationWriter: MessageWriter<RotationGesture>,
		doubleTapWriter: MessageWriter<DoubleTapGesture>,
		panWriter: MessageWriter<PanGesture>,
		longPressWriter: MessageWriter<LongPressGesture>,
	): void {
		// 捏合手势
		if (this.config.enablePinch) {
			const pinchConnection = UserInputService.TouchPinch.Connect(
				(touchPositions, scale, velocity, state, gameProcessedEvent) => {
					if (gameProcessedEvent) {
						return;
					}

					const gestureState = mapRobloxGestureState(state);
					const positions = touchPositions.map((pos) => new Vector2(pos.X, pos.Y));

					// 计算增量
					let delta = 0;

					if (this.lastPinchScale !== undefined && gestureState === GestureState.Changed) {
						delta = scale - this.lastPinchScale;
					}

					this.lastPinchScale = scale;

					if (gestureState === GestureState.Ended || gestureState === GestureState.Canceled) {
						this.lastPinchScale = undefined;
					}

					pinchWriter.send(new PinchGesture(gestureState, delta, velocity, scale, positions));
				},
			);
			this.connections.push(pinchConnection);
		}

		// 旋转手势
		if (this.config.enableRotation) {
			const rotateConnection = UserInputService.TouchRotate.Connect(
				(touchPositions, rotation, velocity, state, gameProcessedEvent) => {
					if (gameProcessedEvent) {
						return;
					}

					const gestureState = mapRobloxGestureState(state);
					const positions = touchPositions.map((pos) => new Vector2(pos.X, pos.Y));

					// 计算增量
					let delta = 0;

					if (this.lastRotation !== undefined && gestureState === GestureState.Changed) {
						delta = rotation - this.lastRotation;
					}

					this.lastRotation = rotation;

					if (gestureState === GestureState.Ended || gestureState === GestureState.Canceled) {
						this.lastRotation = undefined;
					}

					rotationWriter.send(new RotationGesture(gestureState, delta, velocity, rotation, positions));
				},
			);
			this.connections.push(rotateConnection);
		}

		// 平移手势
		if (this.config.enablePan) {
			const panConnection = UserInputService.TouchPan.Connect(
				(touchPositions, totalTranslation, velocity, state, gameProcessedEvent) => {
					if (gameProcessedEvent) {
						return;
					}

					const gestureState = mapRobloxGestureState(state);
					const positions = touchPositions.map((pos) => new Vector2(pos.X, pos.Y));
					const translation = new Vector2(totalTranslation.X, totalTranslation.Y);
					const velocityVec = new Vector2(velocity.X, velocity.Y);

					// 计算增量
					let delta = new Vector2(0, 0);

					if (this.lastPanTranslation !== undefined && gestureState === GestureState.Changed) {
						delta = translation.sub(this.lastPanTranslation);
					}

					this.lastPanTranslation = translation;

					if (gestureState === GestureState.Ended || gestureState === GestureState.Canceled) {
						this.lastPanTranslation = undefined;
					}

					panWriter.send(new PanGesture(gestureState, delta, velocityVec, translation, positions));
				},
			);
			this.connections.push(panConnection);
		}

		// 双击手势(通过 TouchTap 事件检测)
		if (this.config.enableDoubleTap) {
			const tapConnection = UserInputService.TouchTap.Connect((touchPositions, gameProcessedEvent) => {
				if (gameProcessedEvent || touchPositions.size() === 0) {
					return;
				}

				const currentTime = os.clock();
				const currentPosition = new Vector2(touchPositions[0].X, touchPositions[0].Y);

				if (this.lastTapTime !== undefined && this.lastTapPosition !== undefined) {
					const timeDelta = currentTime - this.lastTapTime;
					const distance = currentPosition.sub(this.lastTapPosition).Magnitude;

					if (
						timeDelta <= this.config.doubleTapMaxInterval &&
						distance <= this.config.doubleTapMaxDistance
					) {
						// 检测到双击
						doubleTapWriter.send(new DoubleTapGesture(currentPosition, timeDelta));
						this.lastTapTime = undefined;
						this.lastTapPosition = undefined;

						return;
					}
				}

				// 记录这次点击
				this.lastTapTime = currentTime;
				this.lastTapPosition = currentPosition;
			});
			this.connections.push(tapConnection);
		}

		// 长按手势
		if (this.config.enableLongPress) {
			const longPressConnection = UserInputService.TouchLongPress.Connect(
				(touchPositions, state, gameProcessedEvent) => {
					if (gameProcessedEvent || touchPositions.size() === 0) {
						return;
					}

					const gestureState = mapRobloxGestureState(state);
					const positions = touchPositions.map((pos) => new Vector2(pos.X, pos.Y));
					const position = positions[0];

					// Roblox 不提供长按持续时间,这里设置为 0
					// 如果需要,可以在应用层自行计算
					const duration = 0;

					longPressWriter.send(new LongPressGesture(gestureState, position, duration, positions));
				},
			);
			this.connections.push(longPressConnection);
		}
	}

	/**
	 * 清理所有事件连接
	 * Cleanup all event connections
	 */
	public cleanup(): void {
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections.clear();

		// 重置状态
		this.lastTapTime = undefined;
		this.lastTapPosition = undefined;
		this.lastPinchScale = undefined;
		this.lastRotation = undefined;
		this.lastPanTranslation = undefined;
	}

	/**
	 * 获取配置
	 * Get configuration
	 * @returns 手势管理器配置
	 */
	public getConfig(): GestureManagerConfig {
		return this.config;
	}
}
