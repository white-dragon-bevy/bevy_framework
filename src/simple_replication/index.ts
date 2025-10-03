/**
 * @fileoverview Simple Replication - 简单网络同步插件
 *
 * 提供开发时的简单同步功能，用于基础的客户端-服务器状态同步
 * 基于 Matter ECS 和 Bevy App 框架构建
 *
 * ## 主要功能
 * - 自动同步实体和组件状态
 * - 支持全局复制和玩家专属复制
 * - 可自定义网络适配器
 * - 内置调试和测试支持
 *
 * ## 使用示例
 * @example
 * ```typescript
 * import { App } from "bevy_app";
 * import { SimpleReplicationPlugin } from "simple_replication";
 * import { component } from "@rbxts/matter";
 *
 * // 定义组件
 * const Position = component<{ x: number; y: number; z: number }>("Position");
 *
 * // 创建应用并添加复制插件
 * const app = App.create()
 *   .addPlugin(
 *     new SimpleReplicationPlugin(
 *       undefined, // 使用默认网络适配器
 *       { debugEnabled: true },
 *       { toAllPlayers: new Set([Position]) }
 *     )
 *   )
 *   .run();
 * ```
 */

// ============================================================================
// 类型定义导出
// ============================================================================
/**
 * 导出所有类型定义
 * 包括配置接口、上下文接口、状态接口等
 */
export * from "./types";

// ============================================================================
// 网络层导出
// ============================================================================
/**
 * 导出网络接口和适配器
 * - INetworkAdapter: 网络适配器接口
 * - ClientReplication: 客户端复制接口
 * - ServerReplication: 服务器复制接口
 * - DefaultNetworkAdapter: 默认网络适配器实现
 * - MockNetworkAdapter: 测试用网络适配器
 * - Replication: 默认网络实例（已废弃）
 */
export {
	INetworkAdapter,
	ClientReplication,
	ServerReplication,
	DefaultNetworkAdapter,
	MockNetworkAdapter,
	Replication,
} from "./network";

// ============================================================================
// 系统导出
// ============================================================================
/**
 * 导出服务器端复制系统
 * - serverReplicationSystem: 服务器复制系统函数
 * - serverReplicationSystemConfig: 服务器系统配置对象
 */
export { serverReplicationSystem, serverReplicationSystemConfig } from "./server-replication";

/**
 * 导出客户端接收系统
 * - clientReceiveSystem: 客户端接收系统函数
 * - createClientReceiveSystem: 客户端系统工厂函数
 */
export { clientReceiveSystem, createClientReceiveSystem } from "./client-receive";

// ============================================================================
// 插件导出
// ============================================================================
/**
 * 导出简单复制插件
 * - SimpleReplicationPlugin: 插件类
 * - createSimpleReplicationPlugin: 插件工厂函数
 */
export { SimpleReplicationPlugin, createSimpleReplicationPlugin } from "./simple-replication-plugin";