/**
 * @fileoverview 客户端预测系统
 *
 * 实现客户端预测、回滚和重新模拟功能
 */

import { AnyComponent, Entity, World } from "@rbxts/matter";
import { Resource } from "../../src/bevy_ecs";
import { ClientId, NetworkRole, NetworkTime, PredictionRollback } from "./types";
import { ReplicationManager } from "./replication";

/**
 * 预测帧信息
 */
interface PredictionFrame {
	/** 帧号 */
	readonly frame: number;
	/** 时间戳 */
	readonly timestamp: number;
	/** 输入数据 */
	readonly input: unknown;
	/** 实体状态快照 */
	readonly entityStates: Map<Entity, Map<string, AnyComponent>>;
}

/**
 * 客户端预测管理器
 * 管理客户端预测、回滚和重新模拟
 */
export class ClientPredictionManager implements Resource {
	readonly __brand = "Resource" as const;

	/** 预测历史缓冲区 */
	private predictionHistory: Array<PredictionFrame>;

	/** 最大历史帧数 */
	private readonly maxHistoryFrames: number;

	/** 当前预测帧号 */
	private currentFrame: number;

	/** 最后确认的帧号 */
	private lastConfirmedFrame: number;

	/** 预测实体集合 */
	private predictedEntities: Set<Entity>;

	/** 是否启用预测 */
	private enabled: boolean;

	/** 回滚回调函数 */
	private rollbackCallbacks: Array<(rollback: PredictionRollback) => void>;

	/** 输入缓冲区 */
	private inputBuffer: Array<{ frame: number; input: unknown }>;

	/** 预测误差阈值 */
	private readonly errorThreshold: number;

	constructor(maxHistory: number = 120, errorThreshold: number = 0.01) {
		this.predictionHistory = [];
		this.maxHistoryFrames = maxHistory;
		this.currentFrame = 0;
		this.lastConfirmedFrame = 0;
		this.predictedEntities = new Set();
		this.enabled = true;
		this.rollbackCallbacks = [];
		this.inputBuffer = [];
		this.errorThreshold = errorThreshold;
	}

	/**
	 * 启用或禁用预测
	 * @param enabled - 是否启用
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * 检查预测是否启用
	 * @returns 是否启用
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * 添加预测实体
	 * @param entity - 要预测的实体
	 */
	addPredictedEntity(entity: Entity): void {
		this.predictedEntities.add(entity);
	}

	/**
	 * 移除预测实体
	 * @param entity - 要移除的实体
	 */
	removePredictedEntity(entity: Entity): void {
		this.predictedEntities.delete(entity);
	}

	/**
	 * 检查实体是否被预测
	 * @param entity - 实体
	 * @returns 是否被预测
	 */
	isEntityPredicted(entity: Entity): boolean {
		return this.predictedEntities.has(entity);
	}

	/**
	 * 记录输入
	 * @param input - 输入数据
	 */
	recordInput(input: unknown): void {
		this.inputBuffer.push({
			frame: this.currentFrame,
			input: input,
		});

		// 限制输入缓冲区大小
		if (this.inputBuffer.size() > this.maxHistoryFrames) {
			this.inputBuffer.shift();
		}
	}

	/**
	 * 保存预测快照
	 * @param world - Matter世界实例
	 * @param input - 当前输入
	 */
	savePredictionSnapshot(world: World, input: unknown): void {
		if (!this.enabled) {
			return;
		}

		const entityStates = new Map<Entity, Map<string, AnyComponent>>();

		// 保存所有预测实体的状态
		for (const entity of this.predictedEntities) {
			const components = world.get(entity);
			if (components) {
				const componentMap = new Map<string, AnyComponent>();
				for (const component of components) {
					const componentName = tostring(getmetatable(component));
					componentMap.set(componentName, this.cloneComponent(component));
				}
				entityStates.set(entity, componentMap);
			}
		}

		// 创建预测帧
		const frame: PredictionFrame = {
			frame: this.currentFrame,
			timestamp: os.clock(),
			input: input,
			entityStates: entityStates,
		};

		this.predictionHistory.push(frame);

		// 限制历史大小
		if (this.predictionHistory.size() > this.maxHistoryFrames) {
			this.predictionHistory.shift();
		}

		this.currentFrame++;
	}

	/**
	 * 处理服务器确认
	 * @param world - Matter世界实例
	 * @param confirmedFrame - 确认的帧号
	 * @param serverState - 服务器状态
	 */
	handleServerConfirmation(
		world: World,
		confirmedFrame: number,
		serverState: Map<Entity, Map<string, AnyComponent>>,
	): void {
		if (!this.enabled || confirmedFrame <= this.lastConfirmedFrame) {
			return;
		}

		// 查找对应的预测帧
		const predictedFrame = this.predictionHistory.find((frame) => frame.frame === confirmedFrame);
		if (!predictedFrame) {
			return;
		}

		// 检查预测误差
		const needsRollback = this.checkPredictionError(predictedFrame.entityStates, serverState);

		if (needsRollback) {
			// 执行回滚
			this.performRollback(world, confirmedFrame, serverState);
		}

		this.lastConfirmedFrame = confirmedFrame;

		// 清理旧的历史
		this.cleanupHistory(confirmedFrame);
	}

	/**
	 * 检查预测误差
	 * @param predictedState - 预测状态
	 * @param serverState - 服务器状态
	 * @returns 是否需要回滚
	 */
	private checkPredictionError(
		predictedState: Map<Entity, Map<string, AnyComponent>>,
		serverState: Map<Entity, Map<string, AnyComponent>>,
	): boolean {
		for (const [entity, serverComponents] of serverState) {
			const predictedComponents = predictedState.get(entity);
			if (!predictedComponents) {
				return true; // 实体不存在，需要回滚
			}

			for (const [componentName, serverComponent] of serverComponents) {
				const predictedComponent = predictedComponents.get(componentName);
				if (!predictedComponent) {
					return true; // 组件不存在，需要回滚
				}

				// 比较组件值
				if (this.componentsDiffer(predictedComponent, serverComponent)) {
					return true; // 组件值不同，需要回滚
				}
			}
		}

		return false;
	}

	/**
	 * 执行回滚
	 * @param world - Matter世界实例
	 * @param targetFrame - 目标帧号
	 * @param serverState - 服务器状态
	 */
	private performRollback(
		world: World,
		targetFrame: number,
		serverState: Map<Entity, Map<string, AnyComponent>>,
	): void {
		// 应用服务器状态
		for (const [entity, components] of serverState) {
			for (const [componentName, component] of components) {
				// 更新组件到服务器状态
				world.insert(entity, component);
			}
		}

		// 触发回滚回调
		for (const callback of this.rollbackCallbacks) {
			for (const [entity, components] of serverState) {
				callback({
					entity: entity,
					state: components,
					frame: targetFrame,
				});
			}
		}

		// 重新模拟从确认帧到当前帧的所有输入
		this.resimulate(world, targetFrame);
	}

	/**
	 * 重新模拟
	 * @param world - Matter世界实例
	 * @param fromFrame - 起始帧号
	 */
	private resimulate(world: World, fromFrame: number): void {
		// 获取需要重新模拟的输入
		const inputsToResimulate = this.inputBuffer.filter((input) => input.frame > fromFrame);

		// 按帧号排序
		inputsToResimulate.sort((a, b) => a.frame < b.frame);

		// 重新应用每个输入
		for (const { input } of inputsToResimulate) {
			// 这里需要调用游戏的输入处理逻辑
			// 具体实现取决于游戏的输入系统
			this.applyInput(world, input);
		}
	}

	/**
	 * 应用输入（需要游戏特定实现）
	 * @param world - Matter世界实例
	 * @param input - 输入数据
	 */
	private applyInput(world: World, input: unknown): void {
		// 这是一个占位函数，实际游戏需要实现具体的输入处理逻辑
		// 例如：移动、跳跃、攻击等
		warn("applyInput needs game-specific implementation");
	}

	/**
	 * 清理历史
	 * @param confirmedFrame - 确认的帧号
	 */
	private cleanupHistory(confirmedFrame: number): void {
		// 移除已确认的历史帧
		this.predictionHistory = this.predictionHistory.filter((frame) => frame.frame > confirmedFrame);

		// 清理输入缓冲区
		this.inputBuffer = this.inputBuffer.filter((input) => input.frame > confirmedFrame);
	}

	/**
	 * 克隆组件
	 * @param component - 要克隆的组件
	 * @returns 克隆的组件
	 */
	private cloneComponent(component: AnyComponent): AnyComponent {
		// 简单的深拷贝实现
		// 实际使用中可能需要更复杂的克隆逻辑
		const cloned: Record<string, unknown> = {};
		for (const [key, value] of pairs(component as unknown as Record<string, unknown>)) {
			if (typeIs(value, "table")) {
				// 递归克隆表
				cloned[key] = this.deepClone(value);
			} else {
				cloned[key] = value;
			}
		}
		return cloned as AnyComponent;
	}

	/**
	 * 深拷贝
	 * @param value - 要拷贝的值
	 * @returns 拷贝的值
	 */
	private deepClone<T>(value: T): T {
		if (!typeIs(value, "table")) {
			return value;
		}

		const cloned: Record<string, unknown> = {};
		for (const [key, val] of pairs(value as unknown as Record<string, unknown>)) {
			if (typeIs(val, "table")) {
				cloned[key] = this.deepClone(val);
			} else {
				cloned[key] = val;
			}
		}
		return cloned as T;
	}

	/**
	 * 比较两个组件是否不同
	 * @param a - 组件A
	 * @param b - 组件B
	 * @returns 是否不同
	 */
	private componentsDiffer(a: AnyComponent, b: AnyComponent): boolean {
		// 简单的值比较
		// 实际使用中可能需要更复杂的比较逻辑
		for (const [key, valueA] of pairs(a as unknown as Record<string, unknown>)) {
			const valueB = (b as unknown as Record<string, unknown>)[key];

			if (typeIs(valueA, "number") && typeIs(valueB, "number")) {
				// 数值比较，使用误差阈值
				if (math.abs(valueA - valueB) > this.errorThreshold) {
					return true;
				}
			} else if (valueA !== valueB) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 注册回滚回调
	 * @param callback - 回调函数
	 */
	onRollback(callback: (rollback: PredictionRollback) => void): void {
		this.rollbackCallbacks.push(callback);
	}

	/**
	 * 获取当前帧号
	 * @returns 当前帧号
	 */
	getCurrentFrame(): number {
		return this.currentFrame;
	}

	/**
	 * 获取最后确认的帧号
	 * @returns 最后确认的帧号
	 */
	getLastConfirmedFrame(): number {
		return this.lastConfirmedFrame;
	}

	/**
	 * 获取预测延迟（帧数）
	 * @returns 预测延迟
	 */
	getPredictionLatency(): number {
		return this.currentFrame - this.lastConfirmedFrame;
	}

	/**
	 * 清理资源
	 */
	cleanup(): void {
		this.predictionHistory = [];
		this.inputBuffer = [];
		this.predictedEntities.clear();
		this.rollbackCallbacks = [];
		this.currentFrame = 0;
		this.lastConfirmedFrame = 0;
	}
}

/**
 * 客户端预测系统
 * 处理客户端预测逻辑
 * @param world - Matter世界实例
 * @param context - 应用上下文
 */
export function clientPredictionSystem(world: World, appContext: import("../../src/bevy_app").AppContext): void {
	// TODO: 待完善资源管理系统后实现
	// 需要:
	// 1. 从 AppContext 获取 ClientPredictionManager 和 ReplicationManager
	// 2. 处理客户端预测逻辑
	// 3. 保存预测快照和处理回滚
}

/**
 * 捕获客户端输入（游戏特定实现）
 * @returns 输入数据
 */
function captureClientInput(): unknown {
	// 这是一个占位函数，实际游戏需要实现具体的输入捕获逻辑
	return {
		// movement: Vector3.zero,
		// actions: [],
		// timestamp: os.clock(),
	};
}