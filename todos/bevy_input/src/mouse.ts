/**
 * @fileoverview 鼠标输入功能
 *
 * 提供鼠标输入事件、按钮枚举和鼠标输入处理系统
 */

import { World } from "@rbxts/matter";
import { UserInputService } from "@rbxts/services";
import { ButtonInput, ButtonState } from "./button-input";
import { Event, EventManager } from "../../../src/bevy_ecs/events";
import { WorldExtensions } from "../../bevy_ecs/world-extensions";

/**
 * 鼠标按钮
 */
export enum MouseButton {
	/** 左键 */
	Left = "Left",
	/** 右键 */
	Right = "Right",
	/** 中键 */
	Middle = "Middle",
	/** 后退键 */
	Back = "Back",
	/** 前进键 */
	Forward = "Forward",
	/** 其他鼠标按钮 */
	Other = "Other",
}

/**
 * 鼠标按钮输入事件
 *
 * 这是从 Roblox UserInputService 转换而来的事件。
 * 被 mouse_button_input_system 读取以更新 ButtonInput<MouseButton> 资源。
 */
export class MouseButtonInput implements Event {
	constructor(
		/** 鼠标按钮 */
		public readonly button: MouseButton,
		/** 按钮状态 */
		public readonly state: ButtonState,
		/** 接收输入的窗口实体 */
		public readonly window: number = 0,
		/** 事件时间戳 */
		public readonly timestamp?: number,
	) {}
}

/**
 * 鼠标移动事件
 *
 * 报告鼠标指针的物理移动。
 * 这表示原始的、未过滤的物理运动。
 */
export class MouseMotion implements Event {
	constructor(
		/** 鼠标移动的增量 */
		public readonly delta: Vector2,
		/** 事件时间戳 */
		public readonly timestamp?: number,
	) {}
}

/**
 * 鼠标滚轮事件
 */
export class MouseWheel implements Event {
	constructor(
		/** 水平滚动量 */
		public readonly x: number,
		/** 垂直滚动量 */
		public readonly y: number,
		/** 滚动单位 */
		public readonly unit: MouseScrollUnit = MouseScrollUnit.Line,
		/** 接收输入的窗口实体 */
		public readonly window: number = 0,
		/** 事件时间戳 */
		public readonly timestamp?: number,
	) {}
}

/**
 * 鼠标滚动单位
 */
export enum MouseScrollUnit {
	/** 行滚动 */
	Line = "Line",
	/** 像素滚动 */
	Pixel = "Pixel",
}

/**
 * 累积的鼠标移动
 *
 * 跟踪每帧鼠标移动了多少。
 * 该资源每帧重置为零。
 */
export class AccumulatedMouseMotion {
	/** 累积的鼠标移动增量 */
	public delta = new Vector2(0, 0);

	/**
	 * 重置累积值
	 */
	public reset(): void {
		this.delta = new Vector2(0, 0);
	}

	/**
	 * 添加移动增量
	 */
	public accumulate(delta: Vector2): void {
		this.delta = this.delta.add(delta);
	}
}

/**
 * 累积的鼠标滚动
 *
 * 跟踪每帧鼠标滚动了多少。
 * 该资源每帧重置为零。
 */
export class AccumulatedMouseScroll {
	/** 累积的滚动量 */
	public delta = new Vector2(0, 0);

	/**
	 * 重置累积值
	 */
	public reset(): void {
		this.delta = new Vector2(0, 0);
	}

	/**
	 * 添加滚动增量
	 */
	public accumulate(x: number, y: number): void {
		this.delta = new Vector2(this.delta.X + x, this.delta.Y + y);
	}
}

/**
 * 将 Roblox UserInputType 映射到 MouseButton
 */
function robloxInputTypeToMouseButton(inputType: Enum.UserInputType): MouseButton | undefined {
	switch (inputType) {
		case Enum.UserInputType.MouseButton1:
			return MouseButton.Left;
		case Enum.UserInputType.MouseButton2:
			return MouseButton.Right;
		case Enum.UserInputType.MouseButton3:
			return MouseButton.Middle;
		default:
			return undefined;
	}
}

/**
 * 鼠标按钮输入处理系统
 *
 * 读取 MouseButtonInput 事件，更新 ButtonInput<MouseButton> 资源
 *
 * @param world - ECS 世界
 */
export function mouseButtonInputSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 获取或创建鼠标按钮输入资源
	let mouseButtonInput = extensions.getResource<ButtonInput<MouseButton>>();
	if (!mouseButtonInput) {
		mouseButtonInput = new ButtonInput<MouseButton>();
		extensions.insertResource(ButtonInput<MouseButton>, mouseButtonInput);
	}

	// 清除帧相关状态
	mouseButtonInput.clear();

	// 处理鼠标按钮输入事件
	const reader = eventManager.createReader<MouseButtonInput>();
	const events = reader.read();

	for (const event of events) {
		if (event.state === ButtonState.Pressed) {
			mouseButtonInput.press(event.button);
		} else {
			mouseButtonInput.release(event.button);
		}
	}

	reader.cleanup();
}

/**
 * 累积鼠标移动系统
 *
 * 累积本帧所有的鼠标移动事件
 *
 * @param world - ECS 世界
 */
export function accumulateMouseMotionSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 获取或创建累积鼠标移动资源
	let accumulatedMotion = extensions.getResource<AccumulatedMouseMotion>();
	if (!accumulatedMotion) {
		accumulatedMotion = new AccumulatedMouseMotion();
		extensions.insertResource(AccumulatedMouseMotion, accumulatedMotion);
	}

	// 重置累积值
	accumulatedMotion.reset();

	// 累积所有鼠标移动事件
	const reader = eventManager.createReader<MouseMotion>();
	const events = reader.read();

	for (const event of events) {
		accumulatedMotion.accumulate(event.delta);
	}

	reader.cleanup();
}

/**
 * 累积鼠标滚动系统
 *
 * 累积本帧所有的鼠标滚轮事件
 *
 * @param world - ECS 世界
 */
export function accumulateMouseScrollSystem(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		return;
	}

	// 获取或创建累积鼠标滚动资源
	let accumulatedScroll = extensions.getResource<AccumulatedMouseScroll>();
	if (!accumulatedScroll) {
		accumulatedScroll = new AccumulatedMouseScroll();
		extensions.insertResource(AccumulatedMouseScroll, accumulatedScroll);
	}

	// 重置累积值
	accumulatedScroll.reset();

	// 累积所有鼠标滚轮事件
	const reader = eventManager.createReader<MouseWheel>();
	const events = reader.read();

	for (const event of events) {
		accumulatedScroll.accumulate(event.x, event.y);
	}

	reader.cleanup();
}

/**
 * 设置 Roblox 鼠标输入监听
 *
 * 将 Roblox UserInputService 事件转换为 Bevy 事件
 *
 * @param world - ECS 世界
 */
export function setupRobloxMouseInput(world: World): void {
	const extensions = WorldExtensions.get(world);
	const eventManager = extensions.getResource<EventManager>();

	if (!eventManager) {
		warn("EventManager not found, cannot setup mouse input");
		return;
	}

	// 监听鼠标按钮输入
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		const button = robloxInputTypeToMouseButton(input.UserInputType);
		if (button) {
			eventManager.send(MouseButtonInput, new MouseButtonInput(button, ButtonState.Pressed));
		}
	});

	UserInputService.InputEnded.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		const button = robloxInputTypeToMouseButton(input.UserInputType);
		if (button) {
			eventManager.send(MouseButtonInput, new MouseButtonInput(button, ButtonState.Released));
		}
	});

	// 监听鼠标移动
	UserInputService.InputChanged.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		if (input.UserInputType === Enum.UserInputType.MouseMovement) {
			const delta = input.Delta;
			eventManager.send(MouseMotion, new MouseMotion(new Vector2(delta.X, delta.Y)));
		}

		// 监听鼠标滚轮
		if (input.UserInputType === Enum.UserInputType.MouseWheel) {
			const scrollAmount = input.Position.Z;
			eventManager.send(MouseWheel, new MouseWheel(0, scrollAmount, MouseScrollUnit.Line));
		}
	});
}