/**
 * 游戏手柄输入功能
 * 基于 Bevy 的 gamepad 模块设计
 */

import type { Message } from "../bevy_ecs/message";
import { ButtonInput } from "./button-input";
import { ButtonState } from "./mouse-events";
import { applyDeadzoneAndScaling } from "./gamepad-linear-scaling";

/**
 * 游戏手柄按钮枚举
 * 对应标准游戏手柄的按钮布局
 */
export enum GamepadButton {
	/** 下方动作按钮 (PS: Cross, Xbox: A) */
	South = "ButtonA",
	/** 右侧动作按钮 (PS: Circle, Xbox: B) */
	East = "ButtonB",
	/** 上方动作按钮 (PS: Triangle, Xbox: Y) */
	North = "ButtonY",
	/** 左侧动作按钮 (PS: Square, Xbox: X) */
	West = "ButtonX",

	/** 左肩按钮 (L1/LB) */
	LeftShoulder = "ButtonL1",
	/** 右肩按钮 (R1/RB) */
	RightShoulder = "ButtonR1",
	/** 左扳机按钮 (L2/LT) */
	LeftTrigger = "ButtonL2",
	/** 右扳机按钮 (R2/RT) */
	RightTrigger = "ButtonR2",

	/** 选择按钮 (Select/Back/Share) */
	Select = "ButtonSelect",
	/** 开始按钮 (Start/Options) */
	Start = "ButtonStart",
	/** 模式按钮 (PS/Xbox/Home) */
	Mode = "ButtonMode",

	/** 左摇杆按钮 (L3) */
	LeftThumb = "ButtonL3",
	/** 右摇杆按钮 (R3) */
	RightThumb = "ButtonR3",

	/** 十字键上 */
	DPadUp = "DPadUp",
	/** 十字键下 */
	DPadDown = "DPadDown",
	/** 十字键左 */
	DPadLeft = "DPadLeft",
	/** 十字键右 */
	DPadRight = "DPadRight",
}

/**
 * 游戏手柄轴枚举
 * 对应游戏手柄的模拟摇杆和扳机
 */
export enum GamepadAxis {
	/** 左摇杆 X 轴 */
	LeftStickX = "LeftThumbstickX",
	/** 左摇杆 Y 轴 */
	LeftStickY = "LeftThumbstickY",
	/** 右摇杆 X 轴 */
	RightStickX = "RightThumbstickX",
	/** 右摇杆 Y 轴 */
	RightStickY = "RightThumbstickY",
	/** 左扳机轴 */
	LeftTriggerAxis = "LeftTrigger",
	/** 右扳机轴 */
	RightTriggerAxis = "RightTrigger",
}

/**
 * 游戏手柄连接状态
 */
export enum GamepadConnection {
	/** 已连接 */
	Connected = "Connected",
	/** 已断开 */
	Disconnected = "Disconnected",
}

/**
 * 游戏手柄标识符
 * 在 Roblox 中对应 Enum.UserInputType
 */
export type GamepadId = Enum.UserInputType;

/**
 * 游戏手柄连接事件
 * 当游戏手柄连接或断开时触发
 */
export class GamepadConnectionEvent implements Message {
	readonly timestamp?: number;

	/**
	 * 创建游戏手柄连接事件
	 * @param gamepad - 游戏手柄 ID
	 * @param connection - 连接状态
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly connection: GamepadConnection,
	) {}

	/**
	 * 检查是否为连接事件
	 * @returns 如果是连接事件返回 true
	 */
	public connected(): boolean {
		return this.connection === GamepadConnection.Connected;
	}

	/**
	 * 检查是否为断开事件
	 * @returns 如果是断开事件返回 true
	 */
	public disconnected(): boolean {
		return this.connection === GamepadConnection.Disconnected;
	}
}

/**
 * 原始游戏手柄按钮变化事件
 * 未经过 GamepadSettings 过滤的原始输入
 */
export class RawGamepadButtonChangedEvent implements Message {
	readonly timestamp?: number;

	/**
	 * 创建原始按钮变化事件
	 * @param gamepad - 游戏手柄 ID
	 * @param button - 按钮类型
	 * @param value - 按钮值 (0.0-1.0)
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly button: GamepadButton,
		public readonly value: number,
	) {}
}

/**
 * 原始游戏手柄轴变化事件
 * 未经过 GamepadSettings 过滤的原始输入
 */
export class RawGamepadAxisChangedEvent implements Message {
	readonly timestamp?: number;

	/**
	 * 创建原始轴变化事件
	 * @param gamepad - 游戏手柄 ID
	 * @param axis - 轴类型
	 * @param value - 轴值 (-1.0 到 1.0)
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly axis: GamepadAxis,
		public readonly value: number,
	) {}
}

/**
 * 游戏手柄按钮状态变化事件
 * 数字状态变化（按下/释放）
 */
export class GamepadButtonStateChangedEvent implements Message {
	readonly timestamp?: number;

	/**
	 * 创建按钮状态变化事件
	 * @param gamepad - 游戏手柄 ID
	 * @param button - 按钮类型
	 * @param state - 按钮状态
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly button: GamepadButton,
		public readonly state: ButtonState,
	) {}
}

/**
 * 游戏手柄按钮变化事件
 * 模拟状态变化（包含按压程度）
 */
export class GamepadButtonChangedEvent implements Message {
	readonly timestamp?: number;

	/**
	 * 创建按钮变化事件
	 * @param gamepad - 游戏手柄 ID
	 * @param button - 按钮类型
	 * @param state - 按钮状态
	 * @param value - 按钮值 (0.0-1.0)
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly button: GamepadButton,
		public readonly state: ButtonState,
		public readonly value: number,
	) {}
}

/**
 * 游戏手柄轴变化事件
 * 模拟轴状态变化
 */
export class GamepadAxisChangedEvent implements Message {
	readonly timestamp?: number;

	/**
	 * 创建轴变化事件
	 * @param gamepad - 游戏手柄 ID
	 * @param axis - 轴类型
	 * @param value - 轴值 (经过死区和灵敏度调整)
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly axis: GamepadAxis,
		public readonly value: number,
	) {}
}

/**
 * 游戏手柄事件联合类型
 * 用于需要按照帧内相对顺序处理事件的情况
 */
export type GamepadEvent =
	| { type: "connection"; event: GamepadConnectionEvent }
	| { type: "button"; event: GamepadButtonChangedEvent }
	| { type: "axis"; event: GamepadAxisChangedEvent };

/**
 * 原始游戏手柄事件联合类型
 */
export type RawGamepadEvent =
	| { type: "connection"; event: GamepadConnectionEvent }
	| { type: "button"; event: RawGamepadButtonChangedEvent }
	| { type: "axis"; event: RawGamepadAxisChangedEvent };

/**
 * 游戏手柄震动请求
 * 用于触发手柄震动反馈
 */
export class GamepadRumbleRequest implements Message {
	readonly timestamp?: number;

	/**
	 * 创建震动请求
	 * @param gamepad - 游戏手柄 ID
	 * @param intensity - 震动强度 (0.0-1.0)
	 * @param duration - 震动持续时间（秒）
	 */
	constructor(
		public readonly gamepad: GamepadId,
		public readonly intensity: number,
		public readonly duration: number,
	) {}
}

/**
 * 按钮设置
 * 用于配置按钮的按下和释放阈值
 */
export class ButtonSettings {
	/**
	 * 创建按钮设置
	 * @param pressThreshold - 按下阈值 (0.0-1.0)
	 * @param releaseThreshold - 释放阈值 (0.0-1.0)
	 */
	constructor(
		public pressThreshold: number = 0.75,
		public releaseThreshold: number = 0.65,
	) {
		if (pressThreshold < 0 || pressThreshold > 1) {
			error(`Invalid press_threshold ${pressThreshold}, expected [0.0..=1.0]`);
		}

		if (releaseThreshold < 0 || releaseThreshold > 1) {
			error(`Invalid release_threshold ${releaseThreshold}, expected [0.0..=1.0]`);
		}

		if (releaseThreshold > pressThreshold) {
			error(
				`Invalid parameter values release_threshold ${releaseThreshold} press_threshold ${pressThreshold}, expected release_threshold <= press_threshold`,
			);
		}
	}

	/**
	 * 检查值是否达到按下阈值
	 * @param value - 按钮值
	 * @returns 如果达到按下阈值返回 true
	 */
	public isPressed(value: number): boolean {
		return value >= this.pressThreshold;
	}

	/**
	 * 检查值是否低于释放阈值
	 * @param value - 按钮值
	 * @returns 如果低于释放阈值返回 true
	 */
	public isReleased(value: number): boolean {
		return value <= this.releaseThreshold;
	}
}

/**
 * 轴设置
 * 用于配置摇杆轴的死区、活动区和灵敏度
 */
export class AxisSettings {
	/**
	 * 创建轴设置
	 * @param deadzoneLowerBound - 死区下界
	 * @param deadzoneUpperBound - 死区上界
	 * @param livezoneLowerBound - 活动区下界
	 * @param livezoneUpperBound - 活动区上界
	 * @param threshold - 变化阈值
	 */
	constructor(
		public deadzoneLowerBound: number = -0.1,
		public deadzoneUpperBound: number = 0.1,
		public livezoneLowerBound: number = -0.95,
		public livezoneUpperBound: number = 0.95,
		public threshold: number = 0.01,
	) {
		if (deadzoneLowerBound < -1 || deadzoneLowerBound > 0) {
			error(`Invalid deadzone_lowerbound ${deadzoneLowerBound}, expected [-1.0..=0.0]`);
		}

		if (deadzoneUpperBound < 0 || deadzoneUpperBound > 1) {
			error(`Invalid deadzone_upperbound ${deadzoneUpperBound}, expected [0.0..=1.0]`);
		}

		if (livezoneLowerBound < -1 || livezoneLowerBound > 0) {
			error(`Invalid livezone_lowerbound ${livezoneLowerBound}, expected [-1.0..=0.0]`);
		}

		if (livezoneUpperBound < 0 || livezoneUpperBound > 1) {
			error(`Invalid livezone_upperbound ${livezoneUpperBound}, expected [0.0..=1.0]`);
		}

		if (threshold < 0 || threshold > 2) {
			error(`Invalid threshold ${threshold}, expected [0.0..=2.0]`);
		}

		if (livezoneLowerBound >= deadzoneLowerBound) {
			error(
				`Invalid parameter values livezone_lowerbound ${livezoneLowerBound} deadzone_lowerbound ${deadzoneLowerBound}, expected livezone_lowerbound < deadzone_lowerbound`,
			);
		}

		if (deadzoneUpperBound > livezoneUpperBound) {
			error(
				`Invalid parameter values livezone_upperbound ${livezoneUpperBound} deadzone_upperbound ${deadzoneUpperBound}, expected deadzone_upperbound <= livezone_upperbound`,
			);
		}
	}

	/**
	 * 过滤轴值（应用死区和线性缩放）
	 * @param newValue - 新值
	 * @param oldValue - 旧值（可选）
	 * @returns 过滤后的值，如果不应触发事件则返回 undefined
	 */
	public filter(newValue: number, oldValue?: number): number | undefined {
		// 检查变化是否超过阈值
		if (oldValue !== undefined) {
			const delta = math.abs(newValue - oldValue);

			if (delta <= this.threshold) {
				return undefined;
			}
		}

		// 应用死区和线性缩放
		return applyDeadzoneAndScaling(newValue, {
			deadzoneLowerbound: this.deadzoneLowerBound,
			deadzoneUpperbound: this.deadzoneUpperBound,
			livezoneLowerbound: this.livezoneLowerBound,
			livezoneUpperbound: this.livezoneUpperBound,
		});
	}
}

/**
 * 按钮轴设置
 * 用于将按钮作为轴使用时的配置（例如扳机）
 */
export class ButtonAxisSettings {
	/**
	 * 创建按钮轴设置
	 * @param threshold - 变化阈值
	 */
	constructor(public threshold: number = 0.01) {
		if (threshold < 0 || threshold > 2) {
			error(`Invalid threshold ${threshold}, expected [0.0..=2.0]`);
		}
	}

	/**
	 * 过滤按钮轴值
	 * @param newValue - 新值
	 * @param oldValue - 旧值（可选）
	 * @returns 过滤后的值，如果不应触发事件则返回 undefined
	 */
	public filter(newValue: number, oldValue?: number): number | undefined {
		if (oldValue !== undefined) {
			const delta = math.abs(newValue - oldValue);

			if (delta <= this.threshold) {
				return undefined;
			}
		}

		return newValue;
	}
}

/**
 * 游戏手柄设置
 * 存储所有游戏手柄按钮和轴的配置
 */
export class GamepadSettings {
	/** 默认按钮设置 */
	public defaultButtonSettings: ButtonSettings;
	/** 默认轴设置 */
	public defaultAxisSettings: AxisSettings;
	/** 默认按钮轴设置 */
	public defaultButtonAxisSettings: ButtonAxisSettings;
	/** 特定按钮的自定义设置 */
	public buttonSettings: Map<GamepadButton, ButtonSettings>;
	/** 特定轴的自定义设置 */
	public axisSettings: Map<GamepadAxis, AxisSettings>;
	/** 特定按钮轴的自定义设置 */
	public buttonAxisSettings: Map<GamepadButton, ButtonAxisSettings>;

	constructor() {
		this.defaultButtonSettings = new ButtonSettings();
		this.defaultAxisSettings = new AxisSettings();
		this.defaultButtonAxisSettings = new ButtonAxisSettings();
		this.buttonSettings = new Map();
		this.axisSettings = new Map();
		this.buttonAxisSettings = new Map();
	}

	/**
	 * 获取按钮设置
	 * @param button - 按钮类型
	 * @returns 按钮设置
	 */
	public getButtonSettings(button: GamepadButton): ButtonSettings {
		return this.buttonSettings.get(button) ?? this.defaultButtonSettings;
	}

	/**
	 * 获取轴设置
	 * @param axis - 轴类型
	 * @returns 轴设置
	 */
	public getAxisSettings(axis: GamepadAxis): AxisSettings {
		return this.axisSettings.get(axis) ?? this.defaultAxisSettings;
	}

	/**
	 * 获取按钮轴设置
	 * @param button - 按钮类型
	 * @returns 按钮轴设置
	 */
	public getButtonAxisSettings(button: GamepadButton): ButtonAxisSettings {
		return this.buttonAxisSettings.get(button) ?? this.defaultButtonAxisSettings;
	}
}

/**
 * 游戏手柄状态
 * 存储单个游戏手柄的完整状态
 */
export class GamepadState {
	/** 游戏手柄 ID */
	public readonly id: GamepadId;
	/** 按钮输入状态 */
	public readonly buttons: ButtonInput<GamepadButton>;
	/** 轴值存储 */
	public readonly axes: Map<GamepadAxis, number>;
	/** 按钮模拟值存储 */
	public readonly buttonValues: Map<GamepadButton, number>;
	/** 游戏手柄名称 */
	public name: string;

	/**
	 * 创建游戏手柄状态
	 * @param id - 游戏手柄 ID
	 * @param name - 游戏手柄名称
	 */
	constructor(id: GamepadId, name: string = "Unknown Gamepad") {
		this.id = id;
		this.name = name;
		this.buttons = new ButtonInput<GamepadButton>();
		this.axes = new Map();
		this.buttonValues = new Map();
	}

	/**
	 * 获取轴值
	 * @param axis - 轴类型
	 * @returns 轴值，如果未设置返回 0
	 */
	public getAxis(axis: GamepadAxis): number {
		return this.axes.get(axis) ?? 0;
	}

	/**
	 * 设置轴值
	 * @param axis - 轴类型
	 * @param value - 轴值
	 */
	public setAxis(axis: GamepadAxis, value: number): void {
		this.axes.set(axis, value);
	}

	/**
	 * 获取按钮模拟值
	 * @param button - 按钮类型
	 * @returns 按钮值，如果未设置返回 0
	 */
	public getButtonValue(button: GamepadButton): number {
		return this.buttonValues.get(button) ?? 0;
	}

	/**
	 * 设置按钮模拟值
	 * @param button - 按钮类型
	 * @param value - 按钮值
	 */
	public setButtonValue(button: GamepadButton, value: number): void {
		this.buttonValues.set(button, value);
	}

	/**
	 * 获取左摇杆向量
	 * @returns 左摇杆 X 和 Y 轴组成的 Vector2
	 */
	public leftStick(): Vector2 {
		return new Vector2(this.getAxis(GamepadAxis.LeftStickX), this.getAxis(GamepadAxis.LeftStickY));
	}

	/**
	 * 获取右摇杆向量
	 * @returns 右摇杆 X 和 Y 轴组成的 Vector2
	 */
	public rightStick(): Vector2 {
		return new Vector2(this.getAxis(GamepadAxis.RightStickX), this.getAxis(GamepadAxis.RightStickY));
	}

	/**
	 * 获取十字键向量
	 * @returns 十字键方向组成的 Vector2
	 */
	public dpad(): Vector2 {
		const rightValue = this.getButtonValue(GamepadButton.DPadRight);
		const leftValue = this.getButtonValue(GamepadButton.DPadLeft);
		const upValue = this.getButtonValue(GamepadButton.DPadUp);
		const downValue = this.getButtonValue(GamepadButton.DPadDown);

		return new Vector2(rightValue - leftValue, upValue - downValue);
	}

	/**
	 * 检查按钮是否按下
	 * @param button - 按钮类型
	 * @returns 如果按下返回 true
	 */
	public pressed(button: GamepadButton): boolean {
		return this.buttons.isPressed(button);
	}

	/**
	 * 检查按钮是否刚按下
	 * @param button - 按钮类型
	 * @returns 如果刚按下返回 true
	 */
	public justPressed(button: GamepadButton): boolean {
		return this.buttons.justPressed(button);
	}

	/**
	 * 检查按钮是否刚释放
	 * @param button - 按钮类型
	 * @returns 如果刚释放返回 true
	 */
	public justReleased(button: GamepadButton): boolean {
		return this.buttons.justReleased(button);
	}

	/**
	 * 清除本帧的输入状态
	 */
	public clear(): void {
		this.buttons.clear();
	}
}

/**
 * 游戏手柄管理器
 * 管理所有连接的游戏手柄
 */
export class GamepadManager {
	/** 所有游戏手柄状态 */
	private gamepads: Map<GamepadId, GamepadState>;
	/** 游戏手柄设置 */
	public settings: GamepadSettings;

	constructor() {
		this.gamepads = new Map();
		this.settings = new GamepadSettings();
	}

	/**
	 * 添加游戏手柄
	 * @param id - 游戏手柄 ID
	 * @param name - 游戏手柄名称
	 */
	public add(id: GamepadId, name?: string): void {
		if (!this.gamepads.has(id)) {
			this.gamepads.set(id, new GamepadState(id, name));
		}
	}

	/**
	 * 移除游戏手柄
	 * @param id - 游戏手柄 ID
	 */
	public remove(id: GamepadId): void {
		this.gamepads.delete(id);
	}

	/**
	 * 获取游戏手柄状态
	 * @param id - 游戏手柄 ID
	 * @returns 游戏手柄状态，如果不存在返回 undefined
	 */
	public get(id: GamepadId): GamepadState | undefined {
		return this.gamepads.get(id);
	}

	/**
	 * 获取所有游戏手柄
	 * @returns 游戏手柄状态数组
	 */
	public getAll(): Array<GamepadState> {
		const result: Array<GamepadState> = [];

		for (const [, gamepad] of this.gamepads) {
			result.push(gamepad);
		}

		return result;
	}

	/**
	 * 检查游戏手柄是否已连接
	 * @param id - 游戏手柄 ID
	 * @returns 如果已连接返回 true
	 */
	public has(id: GamepadId): boolean {
		return this.gamepads.has(id);
	}

	/**
	 * 清除所有游戏手柄的本帧输入状态
	 */
	public clearAll(): void {
		for (const [, gamepad] of this.gamepads) {
			gamepad.clear();
		}
	}
}