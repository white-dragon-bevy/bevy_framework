/**
 * @fileoverview Simple Replication - 简单网络同步插件
 *
 * 提供开发时的简单同步功能，用于基础的客户端-服务器状态同步
 *
 * @example
 * ```typescript
 * import { App } from "bevy_app";
 * import { SimpleReplicationPlugin } from "simple_replication";
 *
 * const app = App.create()
 *   .addPlugin(new SimpleReplicationPlugin({
 *     debugEnabled: true
 *   }))
 *   .run();
 * ```
 */

// 导出类型定义
export * from "./types";

// 导出网络接口和适配器
export {
	INetworkAdapter,
	ClientReplication,
	ServerReplication,
	DefaultNetworkAdapter,
	MockNetworkAdapter,
	Replication,
} from "./network";

// 导出系统
export { serverReplicationSystem, serverReplicationSystemConfig } from "./server-replication";
export { clientReceiveSystem, createClientReceiveSystem } from "./client-receive";

// 导出插件
export { SimpleReplicationPlugin, createSimpleReplicationPlugin } from "./plugin";