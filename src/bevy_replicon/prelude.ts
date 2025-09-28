/**
 * @fileoverview Bevy Replicon 预设模块
 *
 * 包含最常用的导出，方便快速导入
 */

// 核心插件
export { RepliconPlugin, RepliconServerPlugin, RepliconClientPlugin } from "./plugin";

// 核心类型
export {
	ClientId,
	createClientId,
	NetworkRole,
	ReplicationStrategy,
	Replicated,
	EntityAuthority,
	AuthorityLevel,
	NetworkMessage,
	NetworkEventId,
} from "./types";

// 核心管理器
export { ReplicationManager } from "./replication";
export { ClientPredictionManager } from "./client-prediction";
export { RobloxNetworkAdapter } from "./roblox-network";

// 核心系统
export { replicationSystem } from "./replication";
export { clientPredictionSystem } from "./client-prediction";