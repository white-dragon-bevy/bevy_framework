/**
 * @fileoverview 通用按键输入状态管理器
 *
 * 提供了一个通用的按键状态追踪系统，可用于键盘、鼠标和游戏手柄按钮。
 * 追踪三种状态：持续按下(pressed)、刚刚按下(just_pressed)、刚刚释放(just_released)
 */

/**
 * 按键的按压状态
 */
export enum ButtonState {
	/** 按键被按下 */
	Pressed = "Pressed",
	/** 按键被释放 */
	Released = "Released",
}

/**
 * 通用按键输入状态管理器
 *
 * 用于追踪任何类型按键的状态，包括键盘按键、鼠标按钮和游戏手柄按钮。
 * 维护三个状态集合：
 * - pressed: 当前被按下的按键
 * - justPressed: 本帧刚刚按下的按键
 * - justReleased: 本帧刚刚释放的按键
 *
 * @template T - 按键类型（如 KeyCode、MouseButton 等）
 *
 * @example
 * ```typescript
 * const keyboard = new ButtonInput<KeyCode>();
 * keyboard.press(KeyCode.Space);
 * if (keyboard.justPressed(KeyCode.Space)) {
 *   // 处理跳跃
 * }
 * ```
 */
export class ButtonInput<T> {
	/** 当前被按下的所有按键 */
	private pressed = new Set<T>();
	/** 本帧刚刚按下的按键 */
	private justPressed = new Set<T>();

	/**
	 * 记录按键按下事件
	 * @param input - 被按下的按键
	 */
	public press(input: T): void {
		// 只有当按键之前未被按下时，才添加到 justPressed
		if (!this.pressed.has(input)) {
			this.justPressed.add(input);
		}
		this.pressed.add(input);
	}

	/**
	 * 记录按键释放事件
	 * @param input - 被释放的按键
	 */
	public release(input: T): void {
		// 只有当按键之前被按下时，才添加到 justReleased
		if (this.pressed.has(input)) {
			this.justReleased.add(input);
		}
		this.pressed.delete(input);
	}

	/**
	 * 释放所有当前按下的按键
	 */
	public releaseAll(): void {
		// 将所有 pressed 的按键移动到 justReleased
		for (const input of this.pressed) {
			this.justReleased.add(input);
		}
		this.pressed.clear();
	}

	/**
	 * 检查按键是否当前被按下
	 * @param input - 要检查的按键
	 * @returns 按键是否被按下
	 */
	public isPressed(input: T): boolean {
		return this.pressed.has(input);
	}

	/**
	 * 检查按键是否在本帧刚刚被按下
	 * @param input - 要检查的按键
	 * @returns 按键是否刚刚被按下
	 */
	public justPressed(input: T): boolean {
		return this.justPressed.has(input);
	}

	/**
	 * 检查按键是否在本帧刚刚被释放
	 * @param input - 要检查的按键
	 * @returns 按键是否刚刚被释放
	 */
	public justReleased(input: T): boolean {
		return this.justReleased.has(input);
	}

	/**
	 * 检查是否有任意一个按键被按下
	 * @param inputs - 要检查的按键数组
	 * @returns 是否有任意按键被按下
	 */
	public anyPressed(inputs: readonly T[]): boolean {
		return inputs.some((input) => this.isPressed(input));
	}

	/**
	 * 检查是否所有按键都被按下
	 * @param inputs - 要检查的按键数组
	 * @returns 是否所有按键都被按下
	 */
	public allPressed(inputs: readonly T[]): boolean {
		return inputs.every((input) => this.isPressed(input));
	}

	/**
	 * 检查是否有任意一个按键刚刚被按下
	 * @param inputs - 要检查的按键数组
	 * @returns 是否有任意按键刚刚被按下
	 */
	public anyJustPressed(inputs: readonly T[]): boolean {
		return inputs.some((input) => this.justPressed(input));
	}

	/**
	 * 检查是否所有按键都刚刚被按下
	 * @param inputs - 要检查的按键数组
	 * @returns 是否所有按键都刚刚被按下
	 */
	public allJustPressed(inputs: readonly T[]): boolean {
		return inputs.every((input) => this.justPressed(input));
	}

	/**
	 * 检查是否有任意一个按键刚刚被释放
	 * @param inputs - 要检查的按键数组
	 * @returns 是否有任意按键刚刚被释放
	 */
	public anyJustReleased(inputs: readonly T[]): boolean {
		return inputs.some((input) => this.justReleased(input));
	}

	/**
	 * 检查是否所有按键都刚刚被释放
	 * @param inputs - 要检查的按键数组
	 * @returns 是否所有按键都刚刚被释放
	 */
	public allJustReleased(inputs: readonly T[]): boolean {
		return inputs.every((input) => this.justReleased(input));
	}

	/**
	 * 清除按键的 justPressed 状态并返回该按键是否刚刚被按下
	 * @param input - 要清除状态的按键
	 * @returns 按键是否刚刚被按下
	 */
	public clearJustPressed(input: T): boolean {
		return this.justPressed.delete(input);
	}

	/**
	 * 清除按键的 justReleased 状态并返回该按键是否刚刚被释放
	 * @param input - 要清除状态的按键
	 * @returns 按键是否刚刚被释放
	 */
	public clearJustReleased(input: T): boolean {
		return this.justReleased.delete(input);
	}

	/**
	 * 重置特定按键的所有状态
	 * @param input - 要重置的按键
	 */
	public reset(input: T): void {
		this.pressed.delete(input);
		this.justPressed.delete(input);
		this.justReleased.delete(input);
	}

	/**
	 * 重置所有按键的所有状态
	 */
	public resetAll(): void {
		this.pressed.clear();
		this.justPressed.clear();
		this.justReleased.clear();
	}

	/**
	 * 清除帧相关的状态（justPressed 和 justReleased）
	 * 通常在每帧开始时调用
	 */
	public clear(): void {
		this.justPressed.clear();
		this.justReleased.clear();
	}

	/**
	 * 获取所有当前被按下的按键
	 * @returns 被按下的按键数组
	 */
	public getPressed(): T[] {
		return [...this.pressed];
	}

	/**
	 * 获取所有刚刚被按下的按键
	 * @returns 刚刚被按下的按键数组
	 */
	public getJustPressed(): T[] {
		return [...this.justPressed];
	}

	/**
	 * 获取所有刚刚被释放的按键
	 * @returns 刚刚被释放的按键数组
	 */
	public getJustReleased(): T[] {
		return [...this.justReleased];
	}
}
