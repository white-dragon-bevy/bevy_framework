/**
 * @fileoverview 服务器 Tick 资源
 *
 * 管理服务器的复制 tick
 */

import { Resource } from "../../bevy_ecs";

/**
 * 服务器 Tick 资源
 * 用于跟踪服务器的复制时间线
 */
export class ServerTick implements Resource {
	readonly __brand = "Resource" as const;

	/** 当前 tick */
	private tick = 0;
	/** 开始时间 */
	private readonly startTime: number;
	/** Tick 间隔（毫秒） */
	private readonly tickInterval: number;
	/** 上次 tick 时间 */
	private lastTickTime: number;

	constructor(tickInterval: number = 50) {
		this.tickInterval = tickInterval;
		this.startTime = os.clock() * 1000;
		this.lastTickTime = this.startTime;
	}

	/**
	 * 获取当前 tick
	 * @returns 当前 tick
	 */
	public get(): number {
		return this.tick;
	}

	/**
	 * 增加 tick
	 * @returns 新的 tick 值
	 */
	public increment(): number {
		this.tick++;
		this.lastTickTime = os.clock() * 1000;
		return this.tick;
	}

	/**
	 * 设置 tick
	 * @param tick - 新的 tick 值
	 */
	public set(tick: number): void {
		this.tick = tick;
		this.lastTickTime = os.clock() * 1000;
	}

	/**
	 * 重置 tick
	 */
	public reset(): void {
		this.tick = 0;
		this.lastTickTime = os.clock() * 1000;
	}

	/**
	 * 检查是否应该增加 tick
	 * @returns 是否应该增加
	 */
	public shouldIncrement(): boolean {
		const currentTime = os.clock() * 1000;
		return currentTime - this.lastTickTime >= this.tickInterval;
	}

	/**
	 * 获取自动增加 tick（如果需要）
	 * @returns 当前 tick（可能已增加）
	 */
	public getAndUpdate(): number {
		if (this.shouldIncrement()) {
			this.increment();
		}
		return this.tick;
	}

	/**
	 * 获取运行时间（毫秒）
	 * @returns 运行时间
	 */
	public getElapsedTime(): number {
		return os.clock() * 1000 - this.startTime;
	}

	/**
	 * 获取 tick 间隔
	 * @returns tick 间隔（毫秒）
	 */
	public getTickInterval(): number {
		return this.tickInterval;
	}

	/**
	 * 获取 tick 频率（Hz）
	 * @returns tick 频率
	 */
	public getTickRate(): number {
		return 1000 / this.tickInterval;
	}

	/**
	 * 获取上次 tick 时间
	 * @returns 上次 tick 时间（毫秒）
	 */
	public getLastTickTime(): number {
		return this.lastTickTime;
	}
}

/**
 * 服务器更新 Tick
 * 客户端用于跟踪最后接收的服务器 tick
 */
export class ServerUpdateTick implements Resource {
	readonly __brand = "Resource" as const;

	/** 最后接收的服务器 tick */
	private tick = 0;
	/** 接收时间 */
	private receivedTime = 0;

	/**
	 * 获取 tick
	 * @returns 最后接收的服务器 tick
	 */
	public get(): number {
		return this.tick;
	}

	/**
	 * 更新 tick
	 * @param tick - 新的服务器 tick
	 */
	public set(tick: number): void {
		this.tick = tick;
		this.receivedTime = os.clock() * 1000;
	}

	/**
	 * 获取接收时间
	 * @returns 接收时间（毫秒）
	 */
	public getReceivedTime(): number {
		return this.receivedTime;
	}

	/**
	 * 获取延迟（毫秒）
	 * @returns 延迟
	 */
	public getLatency(): number {
		return os.clock() * 1000 - this.receivedTime;
	}

	/**
	 * 重置
	 */
	public reset(): void {
		this.tick = 0;
		this.receivedTime = 0;
	}
}