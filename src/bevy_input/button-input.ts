/**
 * ButtonInput 状态管理器
 * 基于 Bevy 的 ButtonInput 设计，提供三态输入管理
 */

/**
 * 按钮输入状态管理器
 * 管理任意类型输入的 pressed、just_pressed、just_released 三种状态
 * @template T - 输入类型（如 Enum.KeyCode、Enum.UserInputType 等）
 */
export class ButtonInput<T extends defined> {
	/** 当前按下的输入集合 */
	private pressedSet: Set<T>;
	/** 本帧刚按下的输入集合 */
	private justPressedSet: Set<T>;
	/** 本帧刚释放的输入集合 */
	private justReleasedSet: Set<T>;

	constructor() {
		this.pressedSet = new Set();
		this.justPressedSet = new Set();
		this.justReleasedSet = new Set();
	}

	/**
	 * 注册按下事件
	 * @param input - 要按下的输入
	 */
	public press(input: T): void {
		if (!this.pressedSet.has(input)) {
			this.pressedSet.add(input);
			this.justPressedSet.add(input);
		}
	}

	/**
	 * 检查输入是否正在按下
	 * @param input - 要检查的输入
	 * @returns 如果输入正在按下返回 true
	 */
	public isPressed(input: T): boolean {
		return this.pressedSet.has(input);
	}

	/**
	 * 检查任意输入是否正在按下
	 * @param inputs - 要检查的输入数组
	 * @returns 如果任意输入正在按下返回 true
	 */
	public anyPressed(inputs: Array<T>): boolean {
		for (const input of inputs) {
			if (this.isPressed(input)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 检查所有输入是否都在按下
	 * @param inputs - 要检查的输入数组
	 * @returns 如果所有输入都在按下返回 true
	 */
	public allPressed(inputs: Array<T>): boolean {
		for (const input of inputs) {
			if (!this.isPressed(input)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 注册释放事件
	 * @param input - 要释放的输入
	 */
	public release(input: T): void {
		if (this.pressedSet.has(input)) {
			this.pressedSet.delete(input);
			this.justReleasedSet.add(input);
		}
	}

	/**
	 * 释放所有当前按下的输入
	 */
	public releaseAll(): void {
		for (const input of this.pressedSet) {
			this.justReleasedSet.add(input);
		}
		this.pressedSet.clear();
	}

	/**
	 * 检查输入是否在本帧刚按下
	 * @param input - 要检查的输入
	 * @returns 如果输入刚按下返回 true
	 */
	public justPressed(input: T): boolean {
		return this.justPressedSet.has(input);
	}

	/**
	 * 检查任意输入是否在本帧刚按下
	 * @param inputs - 要检查的输入数组
	 * @returns 如果任意输入刚按下返回 true
	 */
	public anyJustPressed(inputs: Array<T>): boolean {
		for (const input of inputs) {
			if (this.justPressed(input)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 检查所有输入是否都在本帧刚按下
	 * @param inputs - 要检查的输入数组
	 * @returns 如果所有输入都刚按下返回 true
	 */
	public allJustPressed(inputs: Array<T>): boolean {
		for (const input of inputs) {
			if (!this.justPressed(input)) {
				return false;
			}
		}
		return inputs.size() > 0;
	}

	/**
	 * 清除输入的 just_pressed 状态并返回是否刚按下
	 * @param input - 要清除的输入
	 * @returns 如果输入刚按下返回 true
	 */
	public clearJustPressed(input: T): boolean {
		return this.justPressedSet.delete(input);
	}

	/**
	 * 检查输入是否在本帧刚释放
	 * @param input - 要检查的输入
	 * @returns 如果输入刚释放返回 true
	 */
	public justReleased(input: T): boolean {
		return this.justReleasedSet.has(input);
	}

	/**
	 * 检查任意输入是否在本帧刚释放
	 * @param inputs - 要检查的输入数组
	 * @returns 如果任意输入刚释放返回 true
	 */
	public anyJustReleased(inputs: Array<T>): boolean {
		for (const input of inputs) {
			if (this.justReleased(input)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 检查所有输入是否都在本帧刚释放
	 * @param inputs - 要检查的输入数组
	 * @returns 如果所有输入都刚释放返回 true
	 */
	public allJustReleased(inputs: Array<T>): boolean {
		for (const input of inputs) {
			if (!this.justReleased(input)) {
				return false;
			}
		}
		return inputs.size() > 0;
	}

	/**
	 * 清除输入的 just_released 状态并返回是否刚释放
	 * @param input - 要清除的输入
	 * @returns 如果输入刚释放返回 true
	 */
	public clearJustReleased(input: T): boolean {
		return this.justReleasedSet.delete(input);
	}

	/**
	 * 重置特定输入的所有状态
	 * @param input - 要重置的输入
	 */
	public reset(input: T): void {
		this.pressedSet.delete(input);
		this.justPressedSet.delete(input);
		this.justReleasedSet.delete(input);
	}

	/**
	 * 重置所有输入的状态
	 */
	public resetAll(): void {
		this.pressedSet.clear();
		this.justPressedSet.clear();
		this.justReleasedSet.clear();
	}

	/**
	 * 清除 just_pressed 和 just_released 状态
	 * 通常在每帧开始时调用
	 */
	public clear(): void {
		this.justPressedSet.clear();
		this.justReleasedSet.clear();
	}

	/**
	 * 获取所有正在按下的输入
	 * @returns 正在按下的输入数组
	 */
	public getPressed(): Array<T> {
		const result: Array<T> = [];
		for (const input of this.pressedSet) {
			result.push(input);
		}
		return result;
	}

	/**
	 * 获取所有刚按下的输入
	 * @returns 刚按下的输入数组
	 */
	public getJustPressed(): Array<T> {
		const result: Array<T> = [];
		for (const input of this.justPressedSet) {
			result.push(input);
		}
		return result;
	}

	/**
	 * 获取所有刚释放的输入
	 * @returns 刚释放的输入数组
	 */
	public getJustReleased(): Array<T> {
		const result: Array<T> = [];
		for (const input of this.justReleasedSet) {
			result.push(input);
		}
		return result;
	}
}