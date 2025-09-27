/**
 * Message 系统模块入口
 * 对应 Rust bevy_ecs/src/message/mod.rs
 *
 * 提供基于拉取的消息处理功能
 * 消息可以使用 MessageWriter 写入，使用 MessageReader 系统参数读取
 * 消息存储在 Messages<M> 资源中，需要定期轮询世界以获取新消息
 */

// 导出核心类型
export {
	Message,
	MessageId,
	MessageInstance,
	MessageSequence,
	MessageConstructor,
	WriteBatchIds,
	// 预定义消息类型
	EntitySpawnedMessage,
	EntityDespawnedMessage,
	ComponentAddedMessage,
	ComponentRemovedMessage,
} from "./types";

// 导出消息存储
export { Messages } from "./messages";

// 导出消息游标
export { MessageCursor } from "./message-cursor";

// 导出消息读写器
export { MessageWriter } from "./message-writer";
export { MessageReader } from "./message-reader";

// 导出消息注册表
export { MessageRegistry } from "./message-registry";

// 为了向后兼容，提供旧名称的类型导出（以后会删除）
// 这些是类型别名，不是实际的导出
import type { Message as MessageType } from "./types";
import type { MessageConstructor as MessageConstructorType } from "./types";
import type { MessageWriter as MessageWriterType } from "./message-writer";
import type { MessageReader as MessageReaderType } from "./message-reader";
import type { MessageRegistry as MessageRegistryType } from "./message-registry";

export type Event = MessageType;
export type EventConstructor<T extends MessageType = MessageType> = MessageConstructorType<T>;
export type EventWriter<T extends MessageType> = MessageWriterType<T>;
export type EventReader<T extends MessageType> = MessageReaderType<T>;
export type EventManager = MessageRegistryType;

// 重新导出旧的事件类型名称（以后会删除）
export { EntitySpawnedMessage as EntitySpawnedEvent } from "./types";
export { EntityDespawnedMessage as EntityDespawnedEvent } from "./types";
export { ComponentAddedMessage as ComponentAddedEvent } from "./types";
export { ComponentRemovedMessage as ComponentRemovedEvent } from "./types";