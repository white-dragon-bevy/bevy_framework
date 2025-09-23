/**
 * 鼠标输入相关功能
 * 包含鼠标移动累积器和鼠标按钮枚举
 */

import { UserInputService } from "@rbxts/services";

/**
 * 鼠标按钮枚举
 * 对应 Roblox 的鼠标按钮类型
 */
export enum MouseButton {
	Left = "MouseButton1",
	Right = "MouseButton2",
	Middle = "MouseButton3",
	X1 = "MouseButton4",
	X2 = "MouseButton5",
}

/**
 * 累积的鼠标移动数据
 * 用于精确的鼠标移动输入处理
 */
export class AccumulatedMouseMotion {
	/** 累积的 X 轴移动量 */
	private deltaX: number;
	/** 累积的 Y 轴移动量 */
	private deltaY: number;
	/** 是否有新的移动数据 */
	private hasNewData: boolean;

	constructor() {
		this.deltaX = 0;
		this.deltaY = 0;
		this.hasNewData = false;
	}

	/**
	 * 添加鼠标移动增量
	 * @param deltaX - X 轴移动量
	 * @param deltaY - Y 轴移动量
	 */
	public accumulate(deltaX: number, deltaY: number): void {
		this.deltaX += deltaX;
		this.deltaY += deltaY;
		this.hasNewData = true;
	}

	/**
	 * 获取并清空累积的移动数据
	 * @returns 包含 x 和 y 移动量的元组，如果没有新数据返回 undefined
	 */
	public consume(): [number, number] | undefined {
		if (!this.hasNewData) {
			return undefined;
		}

		const resultX = this.deltaX;
		const resultY = this.deltaY;

		this.deltaX = 0;
		this.deltaY = 0;
		this.hasNewData = false;

		return [resultX, resultY];
	}

	/**
	 * 获取累积的移动数据但不清空
	 * @returns 包含 x 和 y 移动量的元组
	 */
	public peek(): [number, number] {
		return [this.deltaX, this.deltaY];
	}

	/**
	 * 清空累积的移动数据
	 */
	public clear(): void {
		this.deltaX = 0;
		this.deltaY = 0;
		this.hasNewData = false;
	}

	/**
	 * 检查是否有未消费的移动数据
	 * @returns 如果有新数据返回 true
	 */
	public hasData(): boolean {
		return this.hasNewData;
	}

	/**
	 * 获取累积的 X 轴移动量
	 * @returns X 轴移动量
	 */
	public getDeltaX(): number {
		return this.deltaX;
	}

	/**
	 * 获取累积的 Y 轴移动量
	 * @returns Y 轴移动量
	 */
	public getDeltaY(): number {
		return this.deltaY;
	}
}

/**
 * 鼠标滚轮累积器
 * 用于处理鼠标滚轮输入
 */
export class AccumulatedMouseWheel {
	/** 累积的滚轮值 */
	private wheelDelta: number;
	/** 是否有新的滚轮数据 */
	private hasNewData: boolean;

	constructor() {
		this.wheelDelta = 0;
		this.hasNewData = false;
	}

	/**
	 * 添加滚轮增量
	 * @param delta - 滚轮移动量
	 */
	public accumulate(delta: number): void {
		this.wheelDelta += delta;
		this.hasNewData = true;
	}

	/**
	 * 获取并清空累积的滚轮数据
	 * @returns 滚轮移动量，如果没有新数据返回 undefined
	 */
	public consume(): number | undefined {
		if (!this.hasNewData) {
			return undefined;
		}

		const result = this.wheelDelta;
		this.wheelDelta = 0;
		this.hasNewData = false;

		return result;
	}

	/**
	 * 获取累积的滚轮数据但不清空
	 * @returns 滚轮移动量
	 */
	public peek(): number {
		return this.wheelDelta;
	}

	/**
	 * 清空累积的滚轮数据
	 */
	public clear(): void {
		this.wheelDelta = 0;
		this.hasNewData = false;
	}

	/**
	 * 检查是否有未消费的滚轮数据
	 * @returns 如果有新数据返回 true
	 */
	public hasData(): boolean {
		return this.hasNewData;
	}
}

/**
 * 鼠标位置跟踪器
 * 跟踪鼠标的当前位置和上一帧位置
 */
export class MousePosition {
	/** 当前鼠标位置 */
	private currentPosition: Vector2;
	/** 上一帧鼠标位置 */
	private lastPosition: Vector2;
	/** 是否已初始化 */
	private initialized: boolean;

	constructor() {
		const mouse = UserInputService.GetMouseLocation();
		this.currentPosition = new Vector2(mouse.X, mouse.Y);
		this.lastPosition = new Vector2(mouse.X, mouse.Y);
		this.initialized = false;
	}

	/**
	 * 更新鼠标位置
	 * @param position - 新的鼠标位置
	 */
	public update(position: Vector2): void {
		if (this.initialized) {
			this.lastPosition = this.currentPosition;
		} else {
			this.lastPosition = position;
			this.initialized = true;
		}
		this.currentPosition = position;
	}

	/**
	 * 获取当前鼠标位置
	 * @returns 当前鼠标位置
	 */
	public getPosition(): Vector2 {
		return this.currentPosition;
	}

	/**
	 * 获取上一帧鼠标位置
	 * @returns 上一帧鼠标位置
	 */
	public getLastPosition(): Vector2 {
		return this.lastPosition;
	}

	/**
	 * 获取鼠标移动增量
	 * @returns 鼠标移动增量
	 */
	public getDelta(): Vector2 {
		return this.currentPosition.sub(this.lastPosition);
	}

	/**
	 * 重置鼠标位置跟踪
	 */
	public reset(): void {
		const mouse = UserInputService.GetMouseLocation();
		const position = new Vector2(mouse.X, mouse.Y);
		this.currentPosition = position;
		this.lastPosition = position;
		this.initialized = false;
	}
}