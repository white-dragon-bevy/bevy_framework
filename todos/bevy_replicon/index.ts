/**
 * @fileoverview Bevy Replicon - 网络复制框架
 *
 * 提供完整的网络状态同步、客户端预测和服务器权威系统
 *
 * @example
 * ```typescript
 * import { App } from "bevy_app";
 * import { RepliconPlugin, Replicated } from "bevy_replicon";
 *
 * // 创建可复制的组件
 * interface Position extends Replicated {
 *   x: number;
 *   y: number;
 *   z: number;
 *   priority?: 1; // 复制优先级
 * }
 *
 * // 使用插件
 * const app = App.create()
 *   .addPlugin(new RepliconPlugin({
 *     enablePrediction: true,
 *     replicationConfig: {
 *       updateRate: 30,
 *       strategy: ReplicationStrategy.Delta,
 *     }
 *   }))
 *   .run();
 * ```
 */

// 导出类型定义
export * from "./types";

// 导出核心系统
export { ReplicationManager, replicationSystem } from "./replication";

// 导出客户端预测
export { ClientPredictionManager, clientPredictionSystem } from "./client-prediction";

// 导出网络适配器
export { RobloxNetworkAdapter } from "./roblox-network";

// 导出插件
export {
	RepliconPlugin,
	RepliconServerPlugin,
	RepliconClientPlugin,
} from "./plugin";

// 导出预设模块
export * as prelude from "./prelude";