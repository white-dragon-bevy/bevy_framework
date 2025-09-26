/**
 * @fileoverview 触摸输入功能
 *
 * 提供触摸输入事件和触摸输入处理系统
 */

import { World } from "@rbxts/matter";
import { UserInputService } from "@rbxts/services";
import { Event, EventManager } from "../../../src/bevy_ecs/events";
import { WorldExtensions } from "../../bevy_ecs/world-extensions";

/**
 * 触摸阶段
 */
export enum TouchPhase {
	/** 触摸开始 */
	Started = "Started",
	/** 触摸移动 */
	Moved = "Moved",
	/** 触摸结束 */
	Ended = "Ended",
	/** 触摸取消 */
	Canceled = "Canceled",
}

/**
 * 触摸力度描述
 */
export interface ForceTouch {
	/** 触摸力度（0-1范围，1.0 代表平均触摸力度） */
	force: number;
	/** 最大可能的触摸力度 */
	maxPossibleForce: number;
	/** 触控笔的高度角（弧度） */
	altitudeAngle?: number;
}

/**
 * 触摸输入事件
 *
 * ## 逻辑
 *
 * 每当用户触摸屏幕时，会生成一个带有唯一手指标识符的 TouchPhase.Started 事件。
 * 当手指抬起时，会生成具有相同手指 id 的 TouchPhase.Ended 事件。
 *
 * 在 TouchPhase.Started 事件发出后，当手指移动或触摸压力变化时，
 * 可能会有零个或多个 TouchPhase.Moved 事件。
 *
 * 手指 id 在 TouchPhase.Ended 事件后可能会被系统重用。
 * 用户应该假设收到的具有相同 id 的新 TouchPhase.Started 事件
 * 与旧手指无关，是一个新的手指。
 *
 * 当系统取消跟踪此触摸时（如窗口失去焦点），会发出 TouchPhase.Canceled 事件。
 */
export class TouchInput implements Event {
	constructor(
		/** 触摸阶段 */
		public readonly phase: TouchPhase,
		/** 手指在触摸屏上的位置 */
		public readonly position: Vector2,
		/** 注册触摸的窗口实体 */
		public readonly window: number = 0,
		/** 触摸力度（如果平台支持） */
		public readonly force: ForceTouch | undefined = undefined,
		/** 手指的唯一标识符 */
		public readonly id: number = 0,
		/** 事件时间戳 */
		public readonly timestamp?: number,
	) {}
}

/**
 * 单个触摸的状态
 */
export class Touch {
	constructor(
		/** 触摸的唯一标识符 */
		public readonly id: number,
		/** 触摸开始位置 */
		public readonly startPosition: Vector2,
		/** 上一帧的位置 */
		public readonly previousPosition: Vector2,
		/** 当前位置 */
		public readonly position: Vector2,
		/** 触摸力度 */
		public readonly force: ForceTouch | undefined = undefined,
	) {}
}

/**
 * 触摸输入状态的集合
 *
 * ## 更新
 *
 * 触摸状态会自动由 touch_screen_input_system 更新
 */
export class Touches {
	/** 当前活跃的触摸点 */
	private pressedTouches = new Map<number, Touch>();
	/** 本帧刚刚按下的触摸点 */
	private justPressed = new Map<number, Touch>();
	/** 本帧刚刚释放的触摸点 */
	private justReleased = new Map<number, Touch>();
	/** 本帧刚刚取消的触摸点 */
	private justCanceled = new Map<number, Touch>();

	/**
	 * 获取所有活跃的触摸点迭代器
	 */
	public iterPressed(): Touch[] {
		const touches: Touch[] = [];
		for (const [_, touch] of this.pressedTouches) {
			touches.push(touch);
		}
		return touches;
	}

	/**
	 * 获取刚刚按下的触摸点迭代器
	 */
	public iterJustPressed(): Touch[] {
		const touches: Touch[] = [];
		for (const [_, touch] of this.justPressed) {
			touches.push(touch);
		}
		return touches;
	}

	/**
	 * 获取刚刚释放的触摸点迭代器
	 */
	public iterJustReleased(): Touch[] {
		const touches: Touch[] = [];
		for (const [_, touch] of this.justReleased) {
			touches.push(touch);
		}
		return touches;
	}

	/**
	 * 获取刚刚取消的触摸点迭代器
	 */
	public iterJustCanceled(): Touch[] {
		const touches: Touch[] = [];
		for (const [_, touch] of this.justCanceled) {
			touches.push(touch);
		}
		return touches;
	}

	/**
	 * 根据 id 获取触摸点
	 */
	public getPressed(id: number): Touch | undefined {
		return this.pressedTouches.get(id);
	}

	/**
	 * 检查是否有任何触摸点刚刚被按下
	 */
	public anyJustPressed(): boolean {
		return this.justPressed.size() > 0;
	}

	/**
	 * 检查是否存在指定 id 的触摸点刚刚被按下
	 */
	public justPressed(id: number): boolean {
		return this.justPressed.has(id);
	}

	/**
	 * 检查是否存在指定 id 的触摸点刚刚被释放
	 */
	public justReleased(id: number): boolean {
		return this.justReleased.has(id);
	}

	/**
	 * 检查是否存在指定 id 的触摸点刚刚被取消
	 */
	public justCanceled(id: number): boolean {
		return this.justCanceled.has(id);
	}

	/**
	 * 获取第一个触摸点的位置（如果存在）
	 */
	public firstTouchPosition(): Vector2 | undefined {
		const touches = this.iterPressed();
		if (touches.size() > 0) {
			return touches[0].position;
		}
		return undefined;
	}

	/**
	 * 清除帧相关的状态
	 */
	public clear(): void {
		this.justPressed.clear();
		this.justReleased.clear();
		this.justCanceled.clear();
	}

	/**
	 * 处理触摸输入事件（内部使用）
	 */
	public processTouch(event: TouchInput): void {
		switch (event.phase) {
			case TouchPhase.Started: {
				const touch = new Touch(
					event.id,
					event.position,
					event.position,
					event.position,
					event.force,
				);
				this.pressedTouches.set(event.id, touch);
				this.justPressed.set(event.id, touch);
				break;
			}
			case TouchPhase.Moved: {
				const existingTouch = this.pressedTouches.get(event.id);
				if (existingTouch) {
					const touch = new Touch(
						event.id,
						existingTouch.startPosition,
						existingTouch.position,
						event.position,
						event.force,
					);
					this.pressedTouches.set(event.id, touch);
				}
				break;
			}
			case TouchPhase.Ended: {
				const touch = this.pressedTouches.get(event.id);
				if (touch) {
					this.pressedTouches.delete(event.id);
					this.justReleased.set(event.id, touch);
				}
				break;
			}
			case TouchPhase.Canceled: {
				const touch = this.pressedTouches.get(event.id);
				if (touch) {
					this.pressedTouches.delete(event.id);
					this.justCanceled.set(event.id, touch);
				}
				break;
			}
		}
	}

	/**
	 * 释放所有触摸点（用于窗口失去焦点）
	 */
	public releaseAll(): void {
		for (const [id, touch] of this.pressedTouches) {
			this.justReleased.set(id, touch);
		}
		this.pressedTouches.clear();
	}

	/**
	 * 取消所有触摸点
	 */
	public cancelAll(): void {
		for (const [id, touch] of this.pressedTouches) {
			this.justCanceled.set(id, touch);
		}
		this.pressedTouches.clear();
	}
}

/**
 * 触摸屏输入处理系统
 *
 * 读取 TouchInput 事件并更新 Touches 资源
 *
 * @param world - ECS 世界
 */
export function touchScreenInputSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 获取或创建触摸资源
	let touches = extensions.getResource<Touches>();
	if (!touches) {
		touches = new Touches();
		extensions.insertResource(Touches, touches);
	}

	// 清除帧相关状态
	touches.clear();

	// 处理触摸输入事件
	const reader = eventManager.createReader(TouchInput);
	const events = reader.read();

	for (const event of events) {
		touches.processTouch(event);
	}

	reader.cleanup();
}

/**
 * 设置 Roblox 触摸输入监听
 *
 * 将 Roblox 触摸事件转换为 Bevy 事件
 *
 * @param world - ECS 世界
 */
export function setupRobloxTouchInput(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		warn("EventManager not found, cannot setup touch input");
		return;
	}

	// 跟踪活跃的触摸点
	const activeTouches = new Map<Instance, number>();
	let nextTouchId = 0;

	// 监听触摸开始
	UserInputService.TouchStarted.Connect((touch, gameProcessed) => {
		if (gameProcessed) return;

		// 为这个触摸分配一个唯一 ID
		const touchId = nextTouchId++;
		activeTouches.set(touch, touchId);

		const position = new Vector2(touch.Position.X, touch.Position.Y);
		eventManager.send(TouchInput, new TouchInput(TouchPhase.Started, position, 0, undefined, touchId));
	});

	// 监听触摸移动
	UserInputService.TouchMoved.Connect((touch, gameProcessed) => {
		if (gameProcessed) return;

		const touchId = activeTouches.get(touch);
		if (touchId !== undefined) {
			const position = new Vector2(touch.Position.X, touch.Position.Y);
			eventManager.send(TouchInput, new TouchInput(TouchPhase.Moved, position, 0, undefined, touchId));
		}
	});

	// 监听触摸结束
	UserInputService.TouchEnded.Connect((touch, gameProcessed) => {
		if (gameProcessed) return;

		const touchId = activeTouches.get(touch);
		if (touchId !== undefined) {
			const position = new Vector2(touch.Position.X, touch.Position.Y);
			eventManager.send(TouchInput, new TouchInput(TouchPhase.Ended, position, 0, undefined, touchId));
			activeTouches.delete(touch);
		}
	});

	// 监听触摸长按（可选，用于模拟取消）
	UserInputService.TouchLongPress.Connect((touchPositions, state, gameProcessed) => {
		if (gameProcessed) return;

		// 长按可以作为取消的一种情况
		if (state === Enum.UserInputState.End) {
			for (const [touch, touchId] of activeTouches) {
				const position = new Vector2(touch.Position.X, touch.Position.Y);
				eventManager.send(TouchInput, new TouchInput(TouchPhase.Canceled, position, 0, undefined, touchId));
			}
			activeTouches.clear();
		}
	});

	// 监听窗口失去焦点时取消所有触摸
	UserInputService.WindowFocusReleased.Connect(() => {
		for (const [touch, touchId] of activeTouches) {
			const position = new Vector2(touch.Position.X, touch.Position.Y);
			eventManager.send(TouchInput, new TouchInput(TouchPhase.Canceled, position, 0, undefined, touchId));
		}
		activeTouches.clear();
	});
}