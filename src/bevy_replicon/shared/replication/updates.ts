/**
 * @fileoverview 更新消息结构
 *
 * 管理当前 tick 的实体更新数据。
 * 数据手动序列化并以范围形式存储在 SerializedData 中。
 *
 * 参考 Rust 实现:
 * bevy-origin-packages/bevy_replicon/src/server/replication_messages/updates.rs
 */

import { Entity } from "@rbxts/matter";
import type { Range } from "./serialized-data";
import { createRange, rangeLength, SerializedData } from "./serialized-data";
import type { Uint8Array } from "./types";
import { UpdateMessageFlags, addFlag, getLastFlag, getSetFlags, hasFlag } from "./update-message-flags";
import { compactEntitySerializer } from "./compact-entity";

/**
 * 组件移除范围
 *
 * 存储实体及其移除的组件FnsIds在缓冲区中的范围。
 */
export interface RemovalRanges {
	/** 实体数据在缓冲区中的范围 */
	readonly entity: Range;
	/** 移除的组件ID数量 */
	readonly idsLength: number;
	/** FnsId 数组在缓冲区中的范围 */
	readonly fnIds: Range;
}

/**
 * 组件变更范围
 *
 * 存储实体及其变更组件在缓冲区中的范围。
 * 自动合并相邻的组件范围以优化内存使用。
 */
export class ChangeRanges {
	/** 实体数据在缓冲区中的范围 */
	public readonly entity: Range;

	/** 组件数量 */
	public componentsLength: number;

	/** 组件数据范围列表 */
	public components: Array<Range>;

	/**
	 * 构造函数
	 * @param entity - 实体数据范围
	 */
	constructor(entity: Range) {
		this.entity = entity;
		this.componentsLength = 0;
		this.components = [];
	}

	/**
	 * 添加组件范围 (自动合并相邻范围)
	 * @param component - 组件数据范围
	 */
	public addComponent(component: Range): void {
		this.componentsLength += 1;

		const lastComponent = this.components[this.components.size() - 1];

		// 如果与上一个范围相邻,则合并
		if (lastComponent !== undefined && lastComponent.end === component.start) {
			this.components[this.components.size() - 1] = createRange(lastComponent.start, component.end);
		} else {
			this.components.push(component);
		}
	}

	/**
	 * 扩展另一个 ChangeRanges
	 * @param other - 另一个 ChangeRanges
	 */
	public extend(other: ChangeRanges): void {
		for (const component of other.components) {
			this.addComponent(component);
		}
	}

	/**
	 * 计算组件数据总大小
	 * @returns 字节数
	 */
	public componentsSize(): number {
		let size = 0;
		for (const component of this.components) {
			size += rangeLength(component);
		}
		return size;
	}
}

/**
 * 更新消息
 *
 * 包含当前 tick 的实体更新数据。
 * 数据序列化后存储在 SerializedData 中,通过范围引用。
 *
 * ## 数据段顺序
 * 1. MAPPINGS: 客户端预生成实体映射
 * 2. DESPAWNS: 实体销毁
 * 3. REMOVALS: 组件移除
 * 4. CHANGES: 组件变更
 *
 * 映射段必须最先处理,确保后续实体引用正确。
 */
export class Updates {
	/**
	 * 映射段: 客户端预生成实体映射
	 * 格式: 连续的实体对 [(server, client), ...]
	 */
	private mappings: Range;

	/** 映射对数量 */
	private mappingsLength: number;

	/**
	 * 销毁段: 当前 tick 销毁的实体
	 * 可能包含多个范围(因为不同客户端看到的实体不同)
	 */
	private despawns: Array<Range>;

	/** 销毁的实体数量 */
	private despawnsLength: number;

	/**
	 * 移除段: 当前 tick 移除的组件
	 * 每个条目包含实体和其移除的组件ID列表
	 */
	private removals: Array<RemovalRanges>;

	/**
	 * 变更段: 当前 tick 插入或变更的组件
	 * 每个条目包含实体和其变更的组件列表
	 */
	private changes: Array<ChangeRanges>;

	/**
	 * 指示是否已添加变更实体
	 * 用于 startEntityChanges/addChangedEntity 配对
	 */
	private changedEntityAdded: boolean;

	/**
	 * 中间缓冲区,复用 changes 中的组件数组
	 * 减少内存分配
	 */
	private buffer: Array<Array<Range>>;

	/**
	 * 构造函数
	 */
	constructor() {
		this.mappings = createRange(0, 0);
		this.mappingsLength = 0;
		this.despawns = [];
		this.despawnsLength = 0;
		this.removals = [];
		this.changes = [];
		this.changedEntityAdded = false;
		this.buffer = [];
	}

	/**
	 * 设置映射段
	 * @param range - 映射数据在缓冲区中的范围
	 * @param length - 映射对数量
	 */
	public setMappings(range: Range, length: number): void {
		this.mappings = range;
		this.mappingsLength = length;
	}

	/**
	 * 获取映射段范围
	 * @returns 映射数据范围
	 */
	public getMappingsRange(): Range {
		return this.mappings;
	}

	/**
	 * 获取映射对数量
	 * @returns 映射数量
	 */
	public getMappingsLength(): number {
		return this.mappingsLength;
	}

	/**
	 * 添加销毁的实体 (自动合并相邻范围)
	 * @param entity - 实体在缓冲区中的范围
	 */
	public addDespawn(entity: Range): void {
		this.despawnsLength += 1;

		const lastDespawn = this.despawns[this.despawns.size() - 1];

		// 如果与上一个范围相邻,则合并
		if (lastDespawn !== undefined && lastDespawn.end === entity.start) {
			this.despawns[this.despawns.size() - 1] = createRange(lastDespawn.start, entity.end);
		} else {
			this.despawns.push(entity);
		}
	}

	/**
	 * 添加组件移除
	 * @param entity - 实体在缓冲区中的范围
	 * @param idsLength - 移除的组件ID数量
	 * @param fnIds - FnsId 数组在缓冲区中的范围
	 */
	public addRemovals(entity: Range, idsLength: number, fnIds: Range): void {
		this.removals.push({
			entity,
			idsLength,
			fnIds,
		});
	}

	/**
	 * 开始记录实体变更
	 * 在开始处理新实体之前调用
	 */
	public startEntityChanges(): void {
		this.changedEntityAdded = false;
	}

	/**
	 * 检查是否已添加变更实体
	 * @returns 是否已添加
	 */
	public changedEntityWasAdded(): boolean {
		return this.changedEntityAdded;
	}

	/**
	 * 添加变更的实体
	 * @param entity - 实体在缓冲区中的范围
	 */
	public addChangedEntity(entity: Range): void {
		const components = this.buffer.pop() ?? [];
		const changeRanges = new ChangeRanges(entity);
		changeRanges.components = components;
		this.changes.push(changeRanges);
		this.changedEntityAdded = true;
	}

	/**
	 * 添加插入的组件到最后添加的实体
	 * @param component - 组件在缓冲区中的范围
	 */
	public addInsertedComponent(component: Range): void {
		const lastChange = this.changes[this.changes.size() - 1];
		assert(lastChange !== undefined, "Entity should be written before adding components");
		lastChange.addComponent(component);
	}

	/**
	 * 检查是否为空(无任何更新)
	 * @returns 是否为空
	 */
	public isEmpty(): boolean {
		return (
			rangeLength(this.mappings) === 0 &&
			this.despawns.size() === 0 &&
			this.removals.size() === 0 &&
			this.changes.size() === 0
		);
	}

	/**
	 * 获取消息标志位
	 * @returns 标志位
	 */
	public getFlags(): number {
		let flags = UpdateMessageFlags.NONE;

		if (rangeLength(this.mappings) > 0) {
			flags = addFlag(flags, UpdateMessageFlags.MAPPINGS);
		}

		if (this.despawns.size() > 0) {
			flags = addFlag(flags, UpdateMessageFlags.DESPAWNS);
		}

		if (this.removals.size() > 0) {
			flags = addFlag(flags, UpdateMessageFlags.REMOVALS);
		}

		if (this.changes.size() > 0) {
			flags = addFlag(flags, UpdateMessageFlags.CHANGES);
		}

		return flags;
	}

	/**
	 * 序列化为消息
	 *
	 * 消息格式:
	 * 1. 标志位 (u8)
	 * 2. Tick (varint)
	 * 3. [可选] MAPPINGS 段:
	 *    - 映射数量 (varint, 如果不是最后一个段)
	 *    - 映射数据 (连续的实体对)
	 *
	 * @param serializedData - 序列化数据缓冲区
	 * @param serverTickRange - 服务器 tick 在缓冲区中的范围
	 * @returns 序列化后的消息数据
	 */
	public serialize(serializedData: SerializedData, serverTickRange: Range): Uint8Array {
		const flags = this.getFlags();
		const lastFlag = getLastFlag(flags);
		const setFlags = getSetFlags(flags);

		// 计算消息大小
		let messageSize = 1 + rangeLength(serverTickRange); // 标志位 + tick

		for (const flag of setFlags) {
			if (flag === UpdateMessageFlags.MAPPINGS) {
				// MAPPINGS 段
				if (flag !== lastFlag) {
					// 需要写入长度
					messageSize += this.calculateVarintSize(this.mappingsLength);
				}
				messageSize += rangeLength(this.mappings);
			} else if (flag === UpdateMessageFlags.DESPAWNS) {
				// DESPAWNS 段
				if (flag !== lastFlag) {
					messageSize += this.calculateVarintSize(this.despawnsLength);
				}
				for (const range of this.despawns) {
					messageSize += rangeLength(range);
				}
			} else if (flag === UpdateMessageFlags.REMOVALS) {
				// REMOVALS 段
				if (flag !== lastFlag) {
					messageSize += this.calculateVarintSize(this.removals.size());
				}
				for (const removal of this.removals) {
					messageSize += rangeLength(removal.entity);
					messageSize += this.calculateVarintSize(removal.idsLength);
					messageSize += rangeLength(removal.fnIds);
				}
			} else if (flag === UpdateMessageFlags.CHANGES) {
				// CHANGES 段 (总是最后,不需要长度)
				for (const change of this.changes) {
					messageSize += rangeLength(change.entity);
					messageSize += this.calculateVarintSize(change.componentsLength);
					for (const component of change.components) {
						messageSize += rangeLength(component);
					}
				}
			}
		}

		// 创建消息缓冲区
		const message: Array<number> = [];

		// 1. 写入标志位
		message.push(flags & 0xff);

		// 2. 写入 tick
		const tickData = serializedData.getRange(serverTickRange);
		for (let index = 0; index < tickData.size(); index++) {
			message.push(tickData[index]);
		}

		// 3. 写入各个数据段
		for (const flag of setFlags) {
			if (flag === UpdateMessageFlags.MAPPINGS) {
				// 写入 MAPPINGS 段
				if (flag !== lastFlag) {
					// 写入长度
					this.writeVarint(message, this.mappingsLength);
				}

				// 写入数据
				const mappingsData = serializedData.getRange(this.mappings);
				for (let index = 0; index < mappingsData.size(); index++) {
					message.push(mappingsData[index]);
				}
			} else if (flag === UpdateMessageFlags.DESPAWNS) {
				// 写入 DESPAWNS 段
				if (flag !== lastFlag) {
					this.writeVarint(message, this.despawnsLength);
				}

				for (const range of this.despawns) {
					const despawnData = serializedData.getRange(range);
					for (let index = 0; index < despawnData.size(); index++) {
						message.push(despawnData[index]);
					}
				}
			} else if (flag === UpdateMessageFlags.REMOVALS) {
				// 写入 REMOVALS 段
				if (flag !== lastFlag) {
					this.writeVarint(message, this.removals.size());
				}

				for (const removal of this.removals) {
					// 写入实体
					const entityData = serializedData.getRange(removal.entity);
					for (let index = 0; index < entityData.size(); index++) {
						message.push(entityData[index]);
					}

					// 写入ID数量
					this.writeVarint(message, removal.idsLength);

					// 写入FnsIds
					const fnIdsData = serializedData.getRange(removal.fnIds);
					for (let index = 0; index < fnIdsData.size(); index++) {
						message.push(fnIdsData[index]);
					}
				}
			} else if (flag === UpdateMessageFlags.CHANGES) {
				// 写入 CHANGES 段 (总是最后,不需要长度)
				for (const change of this.changes) {
					// 写入实体
					const entityData = serializedData.getRange(change.entity);
					for (let index = 0; index < entityData.size(); index++) {
						message.push(entityData[index]);
					}

					// 写入组件数量
					this.writeVarint(message, change.componentsLength);

					// 写入组件数据
					for (const component of change.components) {
						const componentData = serializedData.getRange(component);
						for (let index = 0; index < componentData.size(); index++) {
							message.push(componentData[index]);
						}
					}
				}
			}
		}

		return message;
	}

	/**
	 * 从消息反序列化
	 * @param messageData - 消息数据
	 * @returns 反序列化结果
	 */
	public static deserialize(messageData: Uint8Array): {
		readonly flags: number;
		readonly tick: number;
		readonly mappings: Array<[Entity, Entity]>;
		readonly despawns: Array<Entity>;
		readonly removals: Array<{ readonly entity: Entity; readonly fnIds: Array<number> }>;
		readonly changes: Array<{ readonly entity: Entity; readonly components: Array<Uint8Array> }>;
	} {
		let offset = 0;

		// 1. 读取标志位
		const flags = messageData[offset];
		offset += 1;

		// 2. 读取 tick
		const [tick, tickBytesRead] = SerializedData.readTickAt(messageData, offset);
		offset += tickBytesRead;

		// 3. 读取各个数据段
		const mappings: Array<[Entity, Entity]> = [];
		const despawns: Array<Entity> = [];
		const removals: Array<{ readonly entity: Entity; readonly fnIds: Array<number> }> = [];
		const changes: Array<{ readonly entity: Entity; readonly components: Array<Uint8Array> }> = [];

		const lastFlag = getLastFlag(flags);
		const setFlags = getSetFlags(flags);

		for (const flag of setFlags) {
			if (flag === UpdateMessageFlags.MAPPINGS) {
				// 读取 MAPPINGS 段
				if (flag !== lastFlag) {
					// 跳过长度前缀（已由CompactEntitySerializer内部处理）
					const [mappingsLen, mappingsLenBytes] = SerializedData.readU32At(messageData, offset);
					offset += mappingsLenBytes;
				}

				// 映射数据使用 CompactEntitySerializer 批量序列化格式
				// 格式: [count, server1, client1, server2, client2, ...]
				const [deserializedMappings, bytesRead] = compactEntitySerializer.deserializeMappings(messageData, offset);

				for (const mapping of deserializedMappings) {
					mappings.push(mapping);
				}

				offset += bytesRead;
			} else if (flag === UpdateMessageFlags.DESPAWNS) {
				// 读取 DESPAWNS 段
				let despawnsCount: number;

				if (flag !== lastFlag) {
					const [count, countBytesRead] = SerializedData.readU32At(messageData, offset);
					despawnsCount = count;
					offset += countBytesRead;
				} else {
					// 最后一个段,计算实体数量
					despawnsCount = 0;
					let tempOffset = offset;

					while (tempOffset < messageData.size()) {
						const [entity, entityBytes] = SerializedData.readEntityAt(messageData, tempOffset);
						tempOffset += entityBytes;
						despawnsCount += 1;
					}
				}

				// 读取销毁的实体
				for (let index = 0; index < despawnsCount; index++) {
					const [entity, entityBytes] = SerializedData.readEntityAt(messageData, offset);
					offset += entityBytes;
					despawns.push(entity);
				}
			} else if (flag === UpdateMessageFlags.REMOVALS) {
				// 读取 REMOVALS 段
				let removalsCount: number;

				if (flag !== lastFlag) {
					const [count, countBytesRead] = SerializedData.readU32At(messageData, offset);
					removalsCount = count;
					offset += countBytesRead;
				} else {
					// 最后一个段,解析所有剩余数据
					removalsCount = 0;
					let tempOffset = offset;

					while (tempOffset < messageData.size()) {
						// 跳过实体
						const [entity, entityBytes] = SerializedData.readEntityAt(messageData, tempOffset);
						tempOffset += entityBytes;

						// 读取ID数量
						const [idsLen, idsLenBytes] = SerializedData.readU32At(messageData, tempOffset);
						tempOffset += idsLenBytes;

						// 跳过FnsIds
						for (let fnIdIndex = 0; fnIdIndex < idsLen; fnIdIndex++) {
							const [fnId, fnIdBytes] = SerializedData.readU32At(messageData, tempOffset);
							tempOffset += fnIdBytes;
						}

						removalsCount += 1;
					}
				}

				// 读取移除数据
				for (let index = 0; index < removalsCount; index++) {
					// 读取实体
					const [entity, entityBytes] = SerializedData.readEntityAt(messageData, offset);
					offset += entityBytes;

					// 读取ID数量
					const [idsLen, idsLenBytes] = SerializedData.readU32At(messageData, offset);
					offset += idsLenBytes;

					// 读取FnsIds
					const fnIds: Array<number> = [];
					for (let fnIdIndex = 0; fnIdIndex < idsLen; fnIdIndex++) {
						const [fnId, fnIdBytes] = SerializedData.readU32At(messageData, offset);
						offset += fnIdBytes;
						fnIds.push(fnId);
					}

					removals.push({ entity, fnIds });
				}
			} else if (flag === UpdateMessageFlags.CHANGES) {
				// 读取 CHANGES 段 (总是最后)
				while (offset < messageData.size()) {
					// 读取实体
					const [entity, entityBytes] = SerializedData.readEntityAt(messageData, offset);
					offset += entityBytes;

					// 读取组件数量
					const [componentsLen, componentsLenBytes] = SerializedData.readU32At(messageData, offset);
					offset += componentsLenBytes;

					// 读取组件数据
					const components: Array<Uint8Array> = [];
					for (let compIndex = 0; compIndex < componentsLen; compIndex++) {
						// 读取FnsId
						const componentStartOffset = offset;
						const [fnId, fnIdBytes] = SerializedData.readU32At(messageData, offset);
						offset += fnIdBytes;

						// 读取组件大小
						const [componentSize, componentSizeBytes] = SerializedData.readU32At(messageData, offset);
						offset += componentSizeBytes;

						// 读取组件原始数据
						const componentData: Array<number> = [];
						for (let dataIndex = 0; dataIndex < componentSize; dataIndex++) {
							componentData.push(messageData[offset]);
							offset += 1;
						}

						// 组件数据包含 fnId + size + data
						const fullComponentData: Array<number> = [];
						for (let index = componentStartOffset; index < offset; index++) {
							fullComponentData.push(messageData[index]);
						}

						components.push(fullComponentData);
					}

					changes.push({ entity, components });
				}
			}
		}

		return {
			flags,
			tick,
			mappings,
			despawns,
			removals,
			changes,
		};
	}

	/**
	 * 清空所有数据(保留内存)
	 */
	public clear(): void {
		this.mappings = createRange(0, 0);
		this.mappingsLength = 0;
		this.despawns.clear();
		this.despawnsLength = 0;
		this.removals.clear();

		// 将组件范围数组回收到缓冲池
		for (const change of this.changes) {
			change.components.clear();
			this.buffer.push(change.components);
		}

		this.changes.clear();
	}

	/**
	 * 计算 varint 编码大小
	 * @param value - 要编码的值
	 * @returns 字节数
	 */
	private calculateVarintSize(value: number): number {
		let size = 0;
		let remaining = value;

		while (remaining >= 0x80) {
			size += 1;
			remaining = remaining >>> 7;
		}

		size += 1; // 最后一个字节
		return size;
	}

	/**
	 * 写入 varint
	 * @param buffer - 目标缓冲区
	 * @param value - 要写入的值
	 */
	private writeVarint(buffer: Array<number>, value: number): void {
		let remaining = value;

		while (remaining >= 0x80) {
			buffer.push((remaining & 0x7f) | 0x80);
			remaining = remaining >>> 7;
		}

		buffer.push(remaining & 0x7f);
	}
}

/**
 * 从 ClientEntityMap 收集映射
 *
 * 遍历所有客户端连接的 ClientEntityMap,收集待发送的映射。
 *
 * @param mappingsArray - 映射数组 (来自各个客户端)
 * @returns 合并后的映射数组
 */
export function collectMappingsFromClients(
	mappingsArray: ReadonlyArray<ReadonlyArray<readonly [Entity, Entity]>>,
): Array<[Entity, Entity]> {
	const allMappings: Array<[Entity, Entity]> = [];

	for (const clientMappings of mappingsArray) {
		for (const mapping of clientMappings) {
			allMappings.push([mapping[0], mapping[1]]);
		}
	}

	return allMappings;
}

/**
 * 序列化映射到缓冲区
 * @param serializedData - 序列化数据缓冲区
 * @param mappings - 映射数组
 * @returns [范围, 映射数量]
 */
export function serializeMappings(
	serializedData: SerializedData,
	mappings: ReadonlyArray<readonly [Entity, Entity]>,
): [Range, number] {
	const range = serializedData.writeMappings(mappings);
	return [range, mappings.size()];
}