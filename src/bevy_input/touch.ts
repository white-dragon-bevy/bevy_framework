/**
 * 触摸输入功能模块
 * Touch input functionality
 *
 * 基于 Bevy 的触摸输入系统设计
 * Based on Bevy's touch input system design
 */

import { World } from "../bevy_ecs";
import { MessageReader as EventReader } from "../bevy_ecs/message";
import { getTouches as getResourceTouches } from "./resource-storage";

/**
 * 触摸输入的阶段
 * A phase of a TouchInput
 *
 * 用于描述当前活动的触摸输入阶段
 * Used to describe the phase of the touch input that is currently active
 */
export enum TouchPhase {
	/**
	 * 手指开始触摸触摸屏
	 * A finger started to touch the touchscreen
	 */
	Started,

	/**
	 * 手指在触摸屏上移动
	 * A finger moved over the touchscreen
	 */
	Moved,

	/**
	 * 手指停止触摸触摸屏
	 * A finger stopped touching the touchscreen
	 */
	Ended,

	/**
	 * 系统取消了对手指的跟踪
	 * The system canceled the tracking of the finger
	 *
	 * 当窗口失去焦点时发生,或在 Roblox 中由于其他原因导致触摸中断
	 * Occurs when the window loses focus, or touch is interrupted for other reasons in Roblox
	 */
	Canceled,
}

/**
 * 触摸力度描述
 * A force description of a Touch input
 */
export type ForceTouch =
	| {
			/**
			 * 校准模式 - 力度值经过校准,不同设备有相似的压力对应
			 * Calibrated mode - force is calibrated across devices
			 */
			readonly type: "Calibrated";
			/**
			 * 触摸力度,1.0 表示平均触摸力度
			 * Force of touch, 1.0 represents average touch force
			 */
			readonly force: number;
			/**
			 * 最大可能力度
			 * Maximum possible force
			 */
			readonly maxPossibleForce: number;
			/**
			 * 触控笔高度角(弧度)
			 * Altitude angle of stylus in radians
			 */
			readonly altitudeAngle?: number;
	  }
	| {
			/**
			 * 归一化模式 - 力度值为 0-1 范围的标准化值
			 * Normalized mode - force is normalized to 0-1 range
			 */
			readonly type: "Normalized";
			/**
			 * 归一化的力度值 (0-1)
			 * Normalized force value (0-1)
			 */
			readonly value: number;
	  };

/**
 * 触摸输入事件
 * A touch input event
 *
 * ## 逻辑说明 Logic
 *
 * 每次用户触摸屏幕时,会生成一个带有唯一手指标识符的 TouchPhase.Started 事件
 * Every time the user touches the screen, a TouchPhase.Started event with a unique finger ID is generated
 *
 * 手指抬起时,会生成相同手指 ID 的 TouchPhase.Ended 事件
 * When the finger is lifted, a TouchPhase.Ended event with the same ID is generated
 *
 * TouchPhase.Started 之后,手指移动或压力变化时可能产生零到多个 TouchPhase.Moved 事件
 * After TouchPhase.Started, zero or more TouchPhase.Moved events may occur when finger moves or pressure changes
 *
 * 手指 ID 在 TouchPhase.Ended 后可能被系统重用
 * Finger ID may be reused by the system after TouchPhase.Ended
 *
 * 当系统取消跟踪时(如窗口失去焦点),会发出 TouchPhase.Canceled 事件
 * TouchPhase.Canceled is emitted when system cancels tracking (e.g., window loses focus)
 */
export class TouchInput {
	/**
	 * 触摸输入的阶段
	 * Phase of the touch input
	 */
	public readonly phase: TouchPhase;

	/**
	 * 手指在触摸屏上的位置
	 * Position of the finger on the touchscreen
	 */
	public readonly position: Vector2;

	/**
	 * 触摸的唯一标识符
	 * Unique identifier of the finger
	 */
	public readonly id: number;

	/**
	 * 描述屏幕被按压的力度
	 * Describes how hard the screen was pressed
	 *
	 * 如果平台不支持压力感应则为 undefined
	 * May be undefined if platform does not support pressure sensitivity
	 */
	public readonly force?: ForceTouch;

	/**
	 * 窗口实体 (在 Roblox 中通常不使用)
	 * Window entity (typically unused in Roblox)
	 */
	public readonly window?: number;

	constructor(phase: TouchPhase, position: Vector2, id: number, force?: ForceTouch, window?: number) {
		this.phase = phase;
		this.position = position;
		this.id = id;
		this.force = force;
		this.window = window;
	}
}

/**
 * 单个触摸输入
 * A touch input
 *
 * ## 用途 Usage
 *
 * 用于存储触摸输入的位置和力度,以及手指的 ID
 * Used to store position and force of a touch input and the finger ID
 *
 * 触摸输入的数据来自 TouchInput 事件,并存储在 Touches 资源中
 * Touch input data comes from TouchInput events and is stored in Touches resource
 */
export class Touch {
	/**
	 * 触摸输入的 ID
	 * ID of the touch input
	 */
	public readonly id: number;

	/**
	 * 触摸输入的起始位置
	 * Starting position of the touch input
	 */
	public readonly startPosition: Vector2;

	/**
	 * 触摸输入的起始力度
	 * Starting force of the touch input
	 */
	public readonly startForce?: ForceTouch;

	/**
	 * 触摸输入的前一帧位置
	 * Previous position of the touch input
	 */
	public previousPosition: Vector2;

	/**
	 * 触摸输入的前一帧力度
	 * Previous force of the touch input
	 */
	public previousForce?: ForceTouch;

	/**
	 * 触摸输入的当前位置
	 * Current position of the touch input
	 */
	public position: Vector2;

	/**
	 * 触摸输入的当前力度
	 * Current force of the touch input
	 */
	public force?: ForceTouch;

	constructor(
		id: number,
		startPosition: Vector2,
		position: Vector2,
		startForce?: ForceTouch,
		previousPosition?: Vector2,
		previousForce?: ForceTouch,
		force?: ForceTouch,
	) {
		this.id = id;
		this.startPosition = startPosition;
		this.startForce = startForce;
		this.previousPosition = previousPosition ?? startPosition;
		this.previousForce = previousForce ?? startForce;
		this.position = position;
		this.force = force ?? startForce;
	}

	/**
	 * 当前位置与前一帧位置的增量
	 * Delta between current position and previous position
	 * @returns 位置增量
	 */
	public delta(): Vector2 {
		return this.position.sub(this.previousPosition);
	}

	/**
	 * 起始位置与当前位置的距离
	 * Distance between start position and current position
	 * @returns 距离向量
	 */
	public distance(): Vector2 {
		return this.position.sub(this.startPosition);
	}

	/**
	 * 从 TouchInput 创建 Touch
	 * Create Touch from TouchInput
	 * @param input - 触摸输入事件
	 * @returns 新的 Touch 实例
	 */
	public static fromTouchInput(input: TouchInput): Touch {
		return new Touch(input.id, input.position, input.position, input.force);
	}
}

/**
 * Touch 集合
 * A collection of Touches
 *
 * ## 用途 Usage
 *
 * 用于创建一个 Bevy 资源,存储触摸屏上的触摸数据,可以在系统中访问
 * Used to create a Bevy resource that stores touch data and can be accessed in systems
 *
 * ## 更新 Updating
 *
 * 资源在 touchScreenInputSystem 中更新
 * Resource is updated in touchScreenInputSystem
 */
export class Touches {
	/**
	 * 当前正在按下的所有触摸
	 * Collection of every Touch that is currently being pressed
	 */
	private readonly pressed: Map<number, Touch>;

	/**
	 * 刚刚按下的所有触摸
	 * Collection of every Touch that just got pressed
	 */
	private readonly justPressedMap: Map<number, Touch>;

	/**
	 * 刚刚释放的所有触摸
	 * Collection of every Touch that just got released
	 */
	private readonly justReleasedMap: Map<number, Touch>;

	/**
	 * 刚刚取消的所有触摸
	 * Collection of every Touch that just got canceled
	 */
	private readonly justCanceledMap: Map<number, Touch>;

	constructor() {
		this.pressed = new Map();
		this.justPressedMap = new Map();
		this.justReleasedMap = new Map();
		this.justCanceledMap = new Map();
	}

	/**
	 * 获取所有正在按下的触摸的迭代器
	 * Iterator visiting every pressed Touch in arbitrary order
	 * @returns 触摸迭代器
	 */
	public *iter(): IterableIterator<Touch> {
		for (const [_, touch] of this.pressed) {
			yield touch;
		}
	}

	/**
	 * 获取指定 ID 的正在按下的触摸
	 * Get Touch corresponding to ID if it is being pressed
	 * @param id - 触摸 ID
	 * @returns 触摸对象,如果不存在则返回 undefined
	 */
	public getPressed(id: number): Touch | undefined {
		return this.pressed.get(id);
	}

	/**
	 * 检查是否有任何触摸刚按下
	 * Check if any touch was just pressed
	 * @returns 如果有触摸刚按下返回 true
	 */
	public anyJustPressed(): boolean {
		return this.justPressedMap.size() > 0;
	}

	/**
	 * 注册一个触摸的释放
	 * Register a release for a given touch input
	 * @param id - 触摸 ID
	 */
	public release(id: number): void {
		const touch = this.pressed.get(id);

		if (touch !== undefined) {
			this.pressed.delete(id);
			this.justReleasedMap.set(id, touch);
		}
	}

	/**
	 * 释放所有当前按下的触摸
	 * Release all currently pressed touches
	 */
	public releaseAll(): void {
		for (const [id, touch] of this.pressed) {
			this.justReleasedMap.set(id, touch);
		}
		this.pressed.clear();
	}

	/**
	 * 检查指定 ID 的触摸是否刚按下
	 * Check if touch with ID was just pressed
	 * @param id - 触摸 ID
	 * @returns 如果刚按下返回 true
	 */
	public justPressed(id: number): boolean {
		return this.justPressedMap.has(id);
	}

	/**
	 * 清除指定触摸的 just_pressed 状态
	 * Clear just_pressed state for touch and return if it was just pressed
	 * @param id - 触摸 ID
	 * @returns 如果触摸刚按下返回 true
	 */
	public clearJustPressed(id: number): boolean {
		return this.justPressedMap.delete(id);
	}

	/**
	 * 获取所有刚按下触摸的迭代器
	 * Iterator visiting every just pressed Touch in arbitrary order
	 * @returns 触摸迭代器
	 */
	public *iterJustPressed(): IterableIterator<Touch> {
		for (const [_, touch] of this.justPressedMap) {
			yield touch;
		}
	}

	/**
	 * 获取指定 ID 的刚释放的触摸
	 * Get Touch corresponding to ID if it was just released
	 * @param id - 触摸 ID
	 * @returns 触摸对象,如果不存在则返回 undefined
	 */
	public getReleased(id: number): Touch | undefined {
		return this.justReleasedMap.get(id);
	}

	/**
	 * 检查是否有任何触摸刚释放
	 * Check if any touch was just released
	 * @returns 如果有触摸刚释放返回 true
	 */
	public anyJustReleased(): boolean {
		return this.justReleasedMap.size() > 0;
	}

	/**
	 * 检查指定 ID 的触摸是否刚释放
	 * Check if touch with ID was just released
	 * @param id - 触摸 ID
	 * @returns 如果刚释放返回 true
	 */
	public justReleased(id: number): boolean {
		return this.justReleasedMap.has(id);
	}

	/**
	 * 清除指定触摸的 just_released 状态
	 * Clear just_released state for touch and return if it was just released
	 * @param id - 触摸 ID
	 * @returns 如果触摸刚释放返回 true
	 */
	public clearJustReleased(id: number): boolean {
		return this.justReleasedMap.delete(id);
	}

	/**
	 * 获取所有刚释放触摸的迭代器
	 * Iterator visiting every just released Touch in arbitrary order
	 * @returns 触摸迭代器
	 */
	public *iterJustReleased(): IterableIterator<Touch> {
		for (const [_, touch] of this.justReleasedMap) {
			yield touch;
		}
	}

	/**
	 * 检查是否有任何触摸刚取消
	 * Check if any touch was just canceled
	 * @returns 如果有触摸刚取消返回 true
	 */
	public anyJustCanceled(): boolean {
		return this.justCanceledMap.size() > 0;
	}

	/**
	 * 检查指定 ID 的触摸是否刚取消
	 * Check if touch with ID was just canceled
	 * @param id - 触摸 ID
	 * @returns 如果刚取消返回 true
	 */
	public justCanceled(id: number): boolean {
		return this.justCanceledMap.has(id);
	}

	/**
	 * 清除指定触摸的 just_canceled 状态
	 * Clear just_canceled state for touch and return if it was just canceled
	 * @param id - 触摸 ID
	 * @returns 如果触摸刚取消返回 true
	 */
	public clearJustCanceled(id: number): boolean {
		return this.justCanceledMap.delete(id);
	}

	/**
	 * 获取所有刚取消触摸的迭代器
	 * Iterator visiting every just canceled Touch in arbitrary order
	 * @returns 触摸迭代器
	 */
	public *iterJustCanceled(): IterableIterator<Touch> {
		for (const [_, touch] of this.justCanceledMap) {
			yield touch;
		}
	}

	/**
	 * 获取第一个当前按下的触摸的位置
	 * Get position of first currently pressed touch if any
	 * @returns 触摸位置,如果没有触摸返回 undefined
	 */
	public firstPressedPosition(): Vector2 | undefined {
		// 先在 pressed 中查找,如果没找到再查找 justPressed
		// 触摸可能在同一帧内开始和结束
		for (const [_, touch] of this.pressed) {
			return touch.position;
		}

		for (const [_, touch] of this.justPressedMap) {
			return touch.position;
		}

		return undefined;
	}

	/**
	 * 清除所有触摸的 just_pressed、just_released 和 just_canceled 数据
	 * Clear just_pressed, just_released, and just_canceled data for all touches
	 *
	 * 另见 resetAll 进行完全重置
	 * See also resetAll for a full reset
	 */
	public clear(): void {
		this.justPressedMap.clear();
		this.justReleasedMap.clear();
		this.justCanceledMap.clear();
	}

	/**
	 * 清除所有触摸的所有数据
	 * Clear all data for all touches
	 *
	 * 另见 clear 仅清除刚按下、释放或取消的触摸
	 * See also clear for clearing only just pressed, released or canceled touches
	 */
	public resetAll(): void {
		this.pressed.clear();
		this.justPressedMap.clear();
		this.justReleasedMap.clear();
		this.justCanceledMap.clear();
	}

	/**
	 * 处理 TouchInput 事件,更新 pressed、just_pressed、just_released 和 just_canceled 集合
	 * Process TouchInput event by updating pressed, just_pressed, just_released, and just_canceled collections
	 * @param touchEvent - 触摸事件
	 */
	public processTouchEvent(touchEvent: TouchInput): void {
		if (touchEvent.phase === TouchPhase.Started) {
			const touch = Touch.fromTouchInput(touchEvent);
			this.pressed.set(touchEvent.id, touch);
			this.justPressedMap.set(touchEvent.id, touch);
		} else if (touchEvent.phase === TouchPhase.Moved) {
			const existingTouch = this.pressed.get(touchEvent.id);

			if (existingTouch !== undefined) {
				// 注意: 这里不更新 previous_force / previous_position 字段
				// 它们应该每帧更新一次,而不是每个事件更新一次
				// NOTE: This does not update previous_force / previous_position
				// They should be updated once per frame, not once per event
				existingTouch.position = touchEvent.position;
				existingTouch.force = touchEvent.force;
			}
		} else if (touchEvent.phase === TouchPhase.Ended) {
			// 如果触摸刚释放,添加相关事件
			// 事件位置信息在 pressed 中,所以优先使用它
			const pressedTouch = this.pressed.get(touchEvent.id);

			if (pressedTouch !== undefined) {
				this.pressed.delete(touchEvent.id);
				this.justReleasedMap.set(touchEvent.id, pressedTouch);
			} else {
				this.justReleasedMap.set(touchEvent.id, Touch.fromTouchInput(touchEvent));
			}
		} else if (touchEvent.phase === TouchPhase.Canceled) {
			// 如果触摸刚取消,添加相关事件
			// 事件位置信息在 pressed 中,所以优先使用它
			const pressedTouch = this.pressed.get(touchEvent.id);

			if (pressedTouch !== undefined) {
				this.pressed.delete(touchEvent.id);
				this.justCanceledMap.set(touchEvent.id, pressedTouch);
			} else {
				this.justCanceledMap.set(touchEvent.id, Touch.fromTouchInput(touchEvent));
			}
		}
	}
}

/**
 * 更新 Touches 资源的系统函数
 * System that updates Touches resource with latest TouchInput events
 *
 * 这不会清除 pressed 集合,因为即使触摸输入在单帧内没有移动,
 * 它仍然应该被标记为按下状态
 * This does not clear pressed collection because a touch input
 * should still be marked as pressed even if it doesn't move
 *
 * ## 差异 Differences
 *
 * TouchInput 事件和 Touches 资源的主要区别在于
 * 后者提供了便捷函数如 justPressed 和 justReleased
 * Main difference between TouchInput event and Touches resource is that
 * the latter has convenient functions like justPressed and justReleased
 *
 * @param world - World 实例
 * @param touchEvents - 触摸事件读取器
 */
export function touchScreenInputSystem(world: World, touchEvents: EventReader<TouchInput>): void {
	// 从 resource storage 获取 Touches
	const touches = getResourceTouches(world);

	if (touches === undefined) {
		return;
	}

	// 清除上一帧的 just 状态
	touches.clear();

	// 处理事件
	if (!touchEvents.isEmpty()) {
		// 更新所有按下触摸的 previous 字段
		const iterator = touches.iter();
		let result = iterator.next();
		while (!result.done) {
			const touch = result.value;
			touch.previousPosition = touch.position;
			touch.previousForce = touch.force;
			result = iterator.next();
		}

		// 处理所有触摸事件
		for (const touchEvent of touchEvents.read()) {
			touches.processTouchEvent(touchEvent);
		}
	}
}

// 导出资源存储函数
export { getTouches, setTouches } from "./resource-storage";