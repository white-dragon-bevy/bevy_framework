/**
 * @fileoverview 复制框架的系统函数
 */

import { World } from "@rbxts/matter";
import { AppContext } from "../bevy_app";
import { ReplicationManager } from "./replication";
import { RobloxNetworkAdapter } from "./roblox-network";

/**
 * 处理出站消息系统
 * 发送队列中的网络消息
 * @param world - Matter世界实例
 * @param context - 应用上下文
 */
export function processOutgoingMessagesSystem(world: World, context: AppContext): void {
	// TODO: 待完善资源管理系统后实现
	// 需要:
	// 1. 从 AppContext 获取 ReplicationManager 和 RobloxNetworkAdapter
	// 2. 发送队列中的所有网络消息
}