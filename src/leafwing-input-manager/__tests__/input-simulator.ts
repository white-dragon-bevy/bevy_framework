/**
 * 输入模拟器模块
 * 提供键盘、鼠标、手柄输入的模拟功能,用于测试
 */

import { CentralInputStore } from "../user-input/central-input-store";
import { App } from "../../bevy_app/app";

/**
 * 键盘输入模拟器
 * 用于模拟键盘按键输入
 */
export class KeyboardSimulator {
	private readonly inputStore: CentralInputStore;
	private readonly pressedKeys: Set<Enum.KeyCode> = new Set();

	/**
	 * 创建键盘模拟器
	 * @param inputStore - 中央输入存储实例
	 */
	constructor(inputStore: CentralInputStore) {
		this.inputStore = inputStore;
	}

	/**
	 * 从 App 创建键盘模拟器
	 * @param app - App 实例
	 * @returns 键盘模拟器实例
	 */
	static fromApp(app: App): KeyboardSimulator {
		const inputStore = app.getResource<CentralInputStore>();

		if (!inputStore) {
			error("CentralInputStore not found in app resources");
		}

		return new KeyboardSimulator(inputStore);
	}

	/**
	 * 模拟按键按下
	 * @param keyCode - 要按下的键码
	 */
	pressKey(keyCode: Enum.KeyCode): void {
		this.pressedKeys.add(keyCode);
		this.inputStore.simulateKeyPress(keyCode, true);
	}

	/**
	 * 模拟按键释放
	 * @param keyCode - 要释放的键码
	 */
	releaseKey(keyCode: Enum.KeyCode): void {
		this.pressedKeys.delete(keyCode);
		this.inputStore.simulateKeyPress(keyCode, false);
	}

	/**
	 * 模拟连续按键
	 * 按顺序按下所有键码,然后释放
	 * @param keyCodes - 键码序列
	 */
	typeKeys(...keyCodes: Array<Enum.KeyCode>): void {
		for (const keyCode of keyCodes) {
			this.pressKey(keyCode);
		}

		for (const keyCode of keyCodes) {
			this.releaseKey(keyCode);
		}
	}

	/**
	 * 模拟按住按键一段时间后释放
	 * @param keyCode - 键码
	 * @param duration - 按住时长(秒)
	 * @param tickCallback - 每帧回调函数,接收当前持续时间
	 */
	holdKey(keyCode: Enum.KeyCode, duration: number, tickCallback?: (elapsed: number) => void): void {
		this.pressKey(keyCode);
		let elapsed = 0;

		while (elapsed < duration) {
			const deltaTime = 1 / 60;
			elapsed += deltaTime;

			if (tickCallback) {
				tickCallback(elapsed);
			}
		}

		this.releaseKey(keyCode);
	}

	/**
	 * 释放所有按下的按键
	 */
	releaseAll(): void {
		for (const keyCode of this.pressedKeys) {
			this.inputStore.simulateKeyPress(keyCode, false);
		}

		this.pressedKeys.clear();
	}

	/**
	 * 检查按键是否处于按下状态
	 * @param keyCode - 要检查的键码
	 * @returns 是否按下
	 */
	isPressed(keyCode: Enum.KeyCode): boolean {
		return this.pressedKeys.has(keyCode);
	}

	/**
	 * 获取所有按下的按键
	 * @returns 按下的键码集合
	 */
	getPressedKeys(): ReadonlySet<Enum.KeyCode> {
		return this.pressedKeys;
	}
}

/**
 * 鼠标输入模拟器
 * 用于模拟鼠标按钮、移动、滚轮输入
 */
export class MouseSimulator {
	private readonly inputStore: CentralInputStore;
	private readonly world: import("../../bevy_ecs").BevyWorld;
	private readonly pressedButtons: Set<Enum.UserInputType> = new Set();
	private currentPosition: Vector2 = Vector2.zero;
	private currentScroll: number = 0;

	/**
	 * 创建鼠标模拟器
	 * @param inputStore - 中央输入存储实例
	 * @param world - Bevy World 实例
	 */
	constructor(inputStore: CentralInputStore, world: import("../../bevy_ecs").BevyWorld) {
		this.inputStore = inputStore;
		this.world = world;
	}

	/**
	 * 从 App 创建鼠标模拟器
	 * @param app - App 实例
	 * @returns 鼠标模拟器实例
	 */
	static fromApp(app: App): MouseSimulator {
		const inputStore = app.getResource<CentralInputStore>();

		if (!inputStore) {
			error("CentralInputStore not found in app resources");
		}

		return new MouseSimulator(inputStore, app.getWorld());
	}

	/**
	 * 模拟鼠标按钮按下
	 * @param button - 鼠标按钮类型
	 */
	pressButton(button: Enum.UserInputType): void {
		this.pressedButtons.add(button);
		this.inputStore.simulateMousePress(button, true);
	}

	/**
	 * 模拟鼠标按钮释放
	 * @param button - 鼠标按钮类型
	 */
	releaseButton(button: Enum.UserInputType): void {
		this.pressedButtons.delete(button);
		this.inputStore.simulateMousePress(button, false);
	}

	/**
	 * 模拟鼠标移动(相对移动)
	 * @param delta - 移动增量
	 */
	moveBy(delta: Vector2): void {
		this.currentPosition = this.currentPosition.add(delta);

		// 直接操作 bevy_input 的 AccumulatedMouseMotion 资源
		// 这样 syncFromBevyInput 就能正确读取到模拟的移动数据
		const mouseMotion = this.world.resources.getResource<import("../../bevy_input/mouse").AccumulatedMouseMotion>();
		if (mouseMotion) {
			mouseMotion.accumulate(delta.X, delta.Y);
		}
	}

	/**
	 * 模拟鼠标移动到指定位置(绝对位置)
	 * @param position - 目标位置
	 */
	moveTo(position: Vector2): void {
		const delta = position.sub(this.currentPosition);
		this.moveBy(delta);
	}

	/**
	 * 模拟滚轮滚动
	 * @param delta - 滚动增量,正值向上,负值向下
	 */
	scrollBy(delta: number): void {
		this.currentScroll += delta;
		this.inputStore.updateMouseWheel(delta);
	}

	/**
	 * 模拟滚轮二维滚动
	 * @param delta - 滚动增量向量 (X为水平, Y为垂直)
	 */
	scrollByVector(delta: Vector2): void {
		this.currentScroll += delta.Y;
		this.inputStore.updateMouseWheelVector(delta);
	}

	/**
	 * 模拟单轴滚轮滚动
	 * @param axis - 滚动轴 ("X" 或 "Y")
	 * @param value - 滚动值
	 */
	scrollAxis(axis: "X" | "Y", value: number): void {
		if (axis === "X") {
			this.scrollByVector(new Vector2(value, 0));
		} else {
			this.scrollByVector(new Vector2(0, value));
		}
	}

	/**
	 * 模拟左键点击
	 */
	clickLeft(): void {
		this.pressButton(Enum.UserInputType.MouseButton1);
		this.releaseButton(Enum.UserInputType.MouseButton1);
	}

	/**
	 * 模拟右键点击
	 */
	clickRight(): void {
		this.pressButton(Enum.UserInputType.MouseButton2);
		this.releaseButton(Enum.UserInputType.MouseButton2);
	}

	/**
	 * 模拟中键点击
	 */
	clickMiddle(): void {
		this.pressButton(Enum.UserInputType.MouseButton3);
		this.releaseButton(Enum.UserInputType.MouseButton3);
	}

	/**
	 * 释放所有鼠标按钮
	 */
	releaseAll(): void {
		for (const button of this.pressedButtons) {
			this.inputStore.simulateMousePress(button, false);
		}

		this.pressedButtons.clear();
	}

	/**
	 * 获取当前鼠标位置
	 * @returns 当前位置
	 */
	getPosition(): Vector2 {
		return this.currentPosition;
	}

	/**
	 * 获取当前滚轮位置
	 * @returns 当前滚轮累计值
	 */
	getScroll(): number {
		return this.currentScroll;
	}

	/**
	 * 重置鼠标状态
	 */
	reset(): void {
		this.releaseAll();
		this.currentPosition = Vector2.zero;
		this.currentScroll = 0;

		// 清除鼠标移动状态 - 清空 bevy_input 资源
		const mouseMotion = this.world.resources.getResource<import("../../bevy_input/mouse").AccumulatedMouseMotion>();
		if (mouseMotion) {
			mouseMotion.clear();
		}

		// 清除滚轮状态 - 清空 bevy_input 资源
		const mouseWheel = this.world.resources.getResource<import("../../bevy_input/mouse").AccumulatedMouseWheel>();
		if (mouseWheel) {
			mouseWheel.clear();
		}
	}
}

/**
 * 手柄输入模拟器
 * 用于模拟游戏手柄按钮和摇杆输入
 */
export class GamepadSimulator {
	private readonly inputStore: CentralInputStore;
	private readonly pressedButtons: Set<Enum.KeyCode> = new Set();
	private readonly axisValues: Map<Enum.KeyCode, number> = new Map();
	private leftStickPosition: Vector2 = Vector2.zero;
	private rightStickPosition: Vector2 = Vector2.zero;

	/**
	 * 创建手柄模拟器
	 * @param inputStore - 中央输入存储实例
	 */
	constructor(inputStore: CentralInputStore) {
		this.inputStore = inputStore;
		// Disable gamepad polling in tests to allow manual simulation
		this.inputStore.disableGamepadPolling();
	}

	/**
	 * 从 App 创建手柄模拟器
	 * @param app - App 实例
	 * @returns 手柄模拟器实例
	 */
	static fromApp(app: App): GamepadSimulator {
		const inputStore = app.getResource<CentralInputStore>();

		if (!inputStore) {
			error("CentralInputStore not found in app resources");
		}

		return new GamepadSimulator(inputStore);
	}

	/**
	 * 模拟手柄按钮按下
	 * @param button - 手柄按钮键码
	 */
	pressButton(button: Enum.KeyCode): void {
		this.pressedButtons.add(button);
		this.inputStore.updateGamepadButton(button, true);
	}

	/**
	 * 模拟手柄按钮释放
	 * @param button - 手柄按钮键码
	 */
	releaseButton(button: Enum.KeyCode): void {
		this.pressedButtons.delete(button);
		this.inputStore.updateGamepadButton(button, false);
	}

	/**
	 * 设置轴值
	 * @param axis - 轴键码
	 * @param value - 轴值(-1.0 到 1.0)
	 */
	setAxisValue(axis: Enum.KeyCode, value: number): void {
		const clampedValue = math.clamp(value, -1, 1);
		this.axisValues.set(axis, clampedValue);

		// 更新对应的摇杆位置
		if (axis === Enum.KeyCode.Thumbstick1) {
			this.setLeftStick(new Vector2(clampedValue, this.leftStickPosition.Y));
		} else if (axis === Enum.KeyCode.Thumbstick2) {
			this.setRightStick(new Vector2(clampedValue, this.rightStickPosition.Y));
		}

		// 处理扳机按钮 - 将轴值转换为按钮状态
		const isTriggerButton = axis === Enum.KeyCode.ButtonL2 || axis === Enum.KeyCode.ButtonR2;

		if (isTriggerButton) {
			const absoluteValue = math.abs(clampedValue);
			const pressThreshold = 0.1;
			const isPressed = absoluteValue > pressThreshold;
			const key = `gamepad_${axis.Name}`;

			this.inputStore.updateButtonlike(key, {
				pressed: isPressed,
				value: absoluteValue,
			});

			// 同步按钮状态记录
			if (isPressed) {
				this.pressedButtons.add(axis);
			} else {
				this.pressedButtons.delete(axis);
			}
		}
	}

	/**
	 * 设置左摇杆位置
	 * @param position - 摇杆位置(-1.0 到 1.0 的二维向量)
	 */
	setLeftStick(position: Vector2): void {
		const clampedX = math.clamp(position.X, -1, 1);
		const clampedY = math.clamp(position.Y, -1, 1);
		this.leftStickPosition = new Vector2(clampedX, clampedY);
		this.inputStore.updateGamepadStickLeft(new Vector3(clampedX, clampedY, 0));
	}

	/**
	 * 设置右摇杆位置
	 * @param position - 摇杆位置(-1.0 到 1.0 的二维向量)
	 */
	setRightStick(position: Vector2): void {
		const clampedX = math.clamp(position.X, -1, 1);
		const clampedY = math.clamp(position.Y, -1, 1);
		this.rightStickPosition = new Vector2(clampedX, clampedY);
		this.inputStore.updateGamepadStickRight(new Vector3(clampedX, clampedY, 0));
	}

	/**
	 * 模拟按住按钮
	 * @param button - 按钮键码
	 */
	holdButton(button: Enum.KeyCode): void {
		this.pressButton(button);
	}

	/**
	 * 释放所有按下的按钮
	 */
	releaseAll(): void {
		for (const button of this.pressedButtons) {
			this.inputStore.updateGamepadButton(button, false);
		}

		this.pressedButtons.clear();
		this.axisValues.clear();
	}

	/**
	 * 重置手柄状态
	 */
	reset(): void {
		this.releaseAll();
		this.leftStickPosition = Vector2.zero;
		this.rightStickPosition = Vector2.zero;
		this.inputStore.updateGamepadStickLeft(Vector3.zero);
		this.inputStore.updateGamepadStickRight(Vector3.zero);
	}

	/**
	 * 获取左摇杆位置
	 * @returns 左摇杆位置
	 */
	getLeftStick(): Vector2 {
		return this.leftStickPosition;
	}

	/**
	 * 获取右摇杆位置
	 * @returns 右摇杆位置
	 */
	getRightStick(): Vector2 {
		return this.rightStickPosition;
	}

	/**
	 * 检查按钮是否按下
	 * @param button - 按钮键码
	 * @returns 是否按下
	 */
	isPressed(button: Enum.KeyCode): boolean {
		return this.pressedButtons.has(button);
	}
}
