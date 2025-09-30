/**
 * @fileoverview Mutations 消息结构
 *
 * 管理组件的初始化数据(mutations)。
 * 数据手动序列化并以范围形式存储在 SerializedData 中。
 *
 * Mutations 用于将组件的初始状态发送给客户端,与 Updates 不同:
 * - Mutations: 完整的组件数据(初始化)
 * - Updates: 增量变更(持续同步)
 *
 * 参考 Rust 实现:
 * bevy-origin-packages/bevy_replicon/src/server/replication_messages/mutations.rs
 */

import { Entity } from "@rbxts/matter";
import type { Range } from "./serialized-data";
import { createRange, rangeLength, SerializedData } from "./serialized-data";
import type { Uint8Array } from "./types";

/**
 * 实体 Mutations 数据
 *
 * 存储单个实体的组件 mutations 信息
 */
export interface EntityMutations {
	/** 实体ID */
	readonly entity: Entity;

	/** 实体数据在缓冲区中的范围 */
	readonly entityRange: Range;

	/** 组件数量 */
	readonly componentsLength: number;

	/** 组件数据范围列表 */
	readonly components: Array<Range>;
}

/**
 * Mutations 消息
 *
 * 包含当前 tick 的组件初始化数据。
 * 数据序列化后存储在 SerializedData 中,通过范围引用。
 *
 * ## 消息格式
 * ```
 * [UpdateTick: varint][ServerTick: varint][EntityCount: varint]
 * [Entity1: varint][ComponentCount: varint][Component1Data]...
 * [Entity2: varint]...
 * ```
 *
 * ## 与 Updates 的区别
 * - Mutations 包含完整的组件数据(初始化)
 * - Updates 包含组件的变更(增量更新)
 * - Mutations 在实体首次复制时发送
 * - Updates 在组件变更时发送
 */
export class Mutations {
	/**
	 * 实体 mutations 列表
	 * 存储所有需要发送的实体及其组件数据
	 */
	private entities: Array<EntityMutations>;

	/**
	 * 指示是否已添加实体
	 * 用于 startEntity/addEntity 配对
	 */
	private entityAdded: boolean;

	/**
	 * 中间缓冲区,复用组件数组
	 * 减少内存分配
	 */
	private buffer: Array<Array<Range>>;

	/**
	 * 构造函数
	 */
	constructor() {
		this.entities = [];
		this.entityAdded = false;
		this.buffer = [];
	}

	/**
	 * 开始记录实体 mutations
	 * 在开始处理新实体之前调用
	 */
	public startEntity(): void {
		this.entityAdded = false;
	}

	/**
	 * 检查是否已添加实体
	 * @returns 是否已添加
	 */
	public entityWasAdded(): boolean {
		return this.entityAdded;
	}

	/**
	 * 添加实体及其范围
	 * @param entity - 实体ID
	 * @param entityRange - 实体在缓冲区中的范围
	 */
	public addEntity(entity: Entity, entityRange: Range): void {
		const components = this.buffer.pop() ?? [];
		const mutation: EntityMutations = {
			entity,
			entityRange,
			componentsLength: 0,
			components,
		};
		this.entities.push(mutation);
		this.entityAdded = true;
	}

	/**
	 * 添加组件到最后添加的实体
	 * @param component - 组件在缓冲区中的范围
	 */
	public addComponent(component: Range): void {
		const lastMutation = this.entities[this.entities.size() - 1];
		assert(lastMutation !== undefined, "Entity should be written before adding components");

		// 增加组件计数
		const updatedMutation: EntityMutations = {
			entity: lastMutation.entity,
			entityRange: lastMutation.entityRange,
			componentsLength: lastMutation.componentsLength + 1,
			components: lastMutation.components,
		};

		// 添加组件范围 (自动合并相邻范围)
		const lastComponent = updatedMutation.components[updatedMutation.components.size() - 1];

		if (lastComponent !== undefined && lastComponent.end === component.start) {
			// 合并相邻范围
			updatedMutation.components[updatedMutation.components.size() - 1] = createRange(
				lastComponent.start,
				component.end,
			);
		} else {
			updatedMutation.components.push(component);
		}

		// 更新列表
		this.entities[this.entities.size() - 1] = updatedMutation;
	}

	/**
	 * 检查是否为空(无任何 mutations)
	 * @returns 是否为空
	 */
	public isEmpty(): boolean {
		return this.entities.size() === 0;
	}

	/**
	 * 获取实体数量
	 * @returns 实体数量
	 */
	public getEntitiesCount(): number {
		return this.entities.size();
	}

	/**
	 * 获取所有实体 mutations
	 * @returns 实体 mutations 列表
	 */
	public getEntities(): ReadonlyArray<EntityMutations> {
		return this.entities;
	}

	/**
	 * 序列化为消息
	 *
	 * 消息格式:
	 * 1. UpdateTick (varint)
	 * 2. ServerTick (varint)
	 * 3. EntityCount (varint)
	 * 4. 每个实体:
	 *    - Entity (varint)
	 *    - ComponentsSize (varint) - 组件数据总字节数
	 *    - Component1Data (包含 FnsId + Size + Data)
	 *    - Component2Data
	 *    - ...
	 *
	 * @param serializedData - 序列化数据缓冲区
	 * @param updateTickRange - UpdateTick 在缓冲区中的范围
	 * @param serverTickRange - ServerTick 在缓冲区中的范围
	 * @returns 序列化后的消息数据
	 */
	public serialize(
		serializedData: SerializedData,
		updateTickRange: Range,
		serverTickRange: Range,
	): Uint8Array {
		// 计算消息大小
		let messageSize =
			rangeLength(updateTickRange) + rangeLength(serverTickRange) + this.calculateVarintSize(this.entities.size());

		for (const mutation of this.entities) {
			messageSize += rangeLength(mutation.entityRange);

			// 计算组件数据总大小
			let componentsSize = 0;
			for (const component of mutation.components) {
				componentsSize += rangeLength(component);
			}

			messageSize += this.calculateVarintSize(componentsSize);
			messageSize += componentsSize;
		}

		// 创建消息缓冲区
		const message: Array<number> = [];

		// 1. 写入 UpdateTick
		const updateTickData = serializedData.getRange(updateTickRange);
		for (let index = 0; index < updateTickData.size(); index++) {
			message.push(updateTickData[index]);
		}

		// 2. 写入 ServerTick
		const serverTickData = serializedData.getRange(serverTickRange);
		for (let index = 0; index < serverTickData.size(); index++) {
			message.push(serverTickData[index]);
		}

		// 3. 写入实体数量
		this.writeVarint(message, this.entities.size());

		// 4. 写入每个实体及其组件
		for (const mutation of this.entities) {
			// 写入实体
			const entityData = serializedData.getRange(mutation.entityRange);
			for (let index = 0; index < entityData.size(); index++) {
				message.push(entityData[index]);
			}

			// 计算组件数据总大小
			let componentsSize = 0;
			for (const component of mutation.components) {
				componentsSize += rangeLength(component);
			}

			// 写入组件数据总大小
			this.writeVarint(message, componentsSize);

			// 写入组件数据
			for (const component of mutation.components) {
				const componentData = serializedData.getRange(component);
				for (let index = 0; index < componentData.size(); index++) {
					message.push(componentData[index]);
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
		readonly updateTick: number;
		readonly serverTick: number;
		readonly entities: Array<{ readonly entity: Entity; readonly components: Array<Uint8Array> }>;
	} {
		let offset = 0;

		// 1. 读取 UpdateTick
		const [updateTick, updateTickBytesRead] = SerializedData.readTickAt(messageData, offset);
		offset += updateTickBytesRead;

		// 2. 读取 ServerTick
		const [serverTick, serverTickBytesRead] = SerializedData.readTickAt(messageData, offset);
		offset += serverTickBytesRead;

		// 3. 读取实体数量
		const [entitiesCount, entitiesCountBytesRead] = SerializedData.readU32At(messageData, offset);
		offset += entitiesCountBytesRead;

		// 4. 读取每个实体及其组件
		const entities: Array<{ readonly entity: Entity; readonly components: Array<Uint8Array> }> = [];

		for (let entityIndex = 0; entityIndex < entitiesCount; entityIndex++) {
			// 读取实体
			const [entity, entityBytesRead] = SerializedData.readEntityAt(messageData, offset);
			offset += entityBytesRead;

			// 读取组件数据总大小
			const [componentsSize, componentsSizeBytesRead] = SerializedData.readU32At(messageData, offset);
			offset += componentsSizeBytesRead;

			// 读取组件数据
			const componentsEndOffset = offset + componentsSize;
			const components: Array<Uint8Array> = [];

			while (offset < componentsEndOffset) {
				// 读取 FnsId
				const componentStartOffset = offset;
				const [fnId, fnIdBytesRead] = SerializedData.readU32At(messageData, offset);
				offset += fnIdBytesRead;

				// 读取组件大小
				const [componentSize, componentSizeBytesRead] = SerializedData.readU32At(messageData, offset);
				offset += componentSizeBytesRead;

				// 读取组件原始数据
				const componentDataOffset = offset;
				offset += componentSize;

				// 组件数据包含 fnId + size + data
				const fullComponentData: Array<number> = [];
				for (let index = componentStartOffset; index < offset; index++) {
					fullComponentData.push(messageData[index]);
				}

				components.push(fullComponentData);
			}

			entities.push({ entity, components });
		}

		return {
			updateTick,
			serverTick,
			entities,
		};
	}

	/**
	 * 清空所有数据(保留内存)
	 */
	public clear(): void {
		// 将组件范围数组回收到缓冲池
		for (const mutation of this.entities) {
			mutation.components.clear();
			this.buffer.push(mutation.components);
		}

		this.entities.clear();
		this.entityAdded = false;
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