/**
 * @fileoverview 复制标记组件
 *
 * 标记需要进行网络复制的实体
 */

import { Component } from "@rbxts/matter";

/**
 * 复制标记组件
 * 添加到需要进行网络复制的实体上
 *
 * 在服务器上：手动添加此组件来标记要复制的实体
 * 在客户端上：自动添加到新复制的实体
 */
export interface Replicated extends Component {
	/** 复制 ID - 用于在客户端和服务器之间映射实体 */
	readonly replicationId: number;
	/** 创建时的 tick */
	readonly createdTick: number;
	/** 最后更新的 tick */
	lastUpdatedTick?: number;
}

/**
 * 创建复制标记
 * @param replicationId - 复制 ID
 * @param tick - 当前 tick
 * @returns 复制标记组件
 */
export function createReplicated(replicationId: number, tick: number): Replicated {
	return {
		replicationId,
		createdTick: tick,
		lastUpdatedTick: tick,
	};
}

/**
 * 更新复制标记
 * @param replicated - 现有的复制标记
 * @param tick - 当前 tick
 * @returns 更新后的复制标记
 */
export function updateReplicated(replicated: Replicated, tick: number): Replicated {
	return {
		...replicated,
		lastUpdatedTick: tick,
	};
}

/**
 * 检查实体是否需要复制
 * @param replicated - 复制标记
 * @param lastSentTick - 最后发送的 tick
 * @returns 是否需要复制
 */
export function needsReplication(replicated: Replicated, lastSentTick: number): boolean {
	const lastUpdate = replicated.lastUpdatedTick ?? replicated.createdTick;
	return lastUpdate > lastSentTick;
}