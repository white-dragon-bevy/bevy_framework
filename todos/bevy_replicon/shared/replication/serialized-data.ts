/**
 * @fileoverview 序列化数据缓冲区系统
 *
 * 提供单一连续缓冲区来存储复制消息的序列化数据。
 * 数据以范围(Range)的形式组织,支持高效的写入和读取操作。
 *
 * 参考 Rust 实现:
 * bevy-origin-packages/bevy_replicon/src/server/replication_messages/serialized_data.rs
 */

import { Entity } from "@rbxts/matter";
import type { Uint8Array } from "./types";
import { createUint8Array } from "./types";
import { compactEntitySerializer } from "./compact-entity";

/**
 * 范围接口 (类似 Rust 的 Range<usize>)
 */
export interface Range {
	readonly start: number;
	readonly end: number;
}

/**
 * 创建范围对象
 * @param start - 起始索引(包含)
 * @param endIndex - 结束索引(不包含)
 * @returns Range 实例
 */
export function createRange(start: number, endIndex: number): Range {
	return { start, end: endIndex };
}

/**
 * 获取范围长度
 * @param range - 范围对象
 * @returns 范围长度
 */
export function rangeLength(range: Range): number {
	return range.end - range.start;
}

/**
 * 序列化数据缓冲区
 *
 * 单一连续缓冲区，用于存储消息的序列化数据。
 * 使用范围(Range)来标记不同的数据段，避免多次内存分配。
 *
 * ## 设计原理
 * - 所有数据写入同一个缓冲区
 * - 每次写入返回数据在缓冲区中的范围
 * - 消息可以通过范围引用数据而不需要拷贝
 * - 支持高效的批量写入
 *
 * @example
 * ```typescript
 * const buffer = new SerializedData();
 *
 * // 写入实体映射
 * const mappingsRange = buffer.writeMappings([[serverEntity, clientEntity]]);
 *
 * // 写入其他数据
 * const entityRange = buffer.writeEntity(entity);
 *
 * // 读取数据
 * const mappingsData = buffer.getRange(mappingsRange);
 * ```
 */
export class SerializedData {
	/** 内部缓冲区 */
	private buffer: Array<number>;

	/**
	 * 创建新的序列化数据缓冲区
	 */
	constructor() {
		this.buffer = [];
	}

	/**
	 * 获取缓冲区当前长度
	 * @returns 缓冲区字节数
	 */
	public getLength(): number {
		return this.buffer.size();
	}

	/**
	 * 清空缓冲区(保留已分配内存)
	 */
	public clear(): void {
		this.buffer.clear();
	}

	/**
	 * 获取指定范围的数据切片
	 * @param range - 数据范围
	 * @returns 数据切片
	 */
	public getRange(range: Range): Uint8Array {
		const result: Array<number> = [];
		for (let index = range.start; index < range.end && index < this.buffer.size(); index++) {
			result.push(this.buffer[index]);
		}
		return result;
	}

	/**
	 * 获取整个缓冲区的只读视图
	 * @returns 缓冲区数据
	 */
	public getBuffer(): ReadonlyArray<number> {
		return this.buffer;
	}

	/**
	 * 写入实体映射数组
	 *
	 * 使用 CompactEntity 序列化格式，显著减少带宽消耗。
	 * 格式: [count, server_entity1, client_entity1, ...]
	 * 每个实体使用变长编码，小数值仅需1字节。
	 *
	 * @param mappings - 映射数组 [服务器实体, 客户端实体]
	 * @returns 数据在缓冲区中的范围
	 */
	public writeMappings(mappings: ReadonlyArray<readonly [Entity, Entity]>): Range {
		const start = this.buffer.size();

		// 使用紧凑序列化
		const compactBytes = compactEntitySerializer.serializeMappings(mappings);
		for (let index = 0; index < compactBytes.size(); index++) {
			this.buffer.push(compactBytes[index]);
		}

		const endIndex = this.buffer.size();
		return createRange(start, endIndex);
	}

	/**
	 * 写入单个实体
	 *
	 * 使用 CompactEntity 变长编码，根据实体ID大小动态调整字节数：
	 * - 小实体 (< 128): 1字节
	 * - 中等实体 (< 16384): 2字节
	 * - 大实体: 3-4字节
	 *
	 * @param entity - 实体ID
	 * @returns 数据在缓冲区中的范围
	 */
	public writeEntity(entity: Entity): Range {
		const start = this.buffer.size();

		// 使用紧凑序列化
		const compactBytes = compactEntitySerializer.serialize(entity);
		for (let index = 0; index < compactBytes.size(); index++) {
			this.buffer.push(compactBytes[index]);
		}

		const endIndex = this.buffer.size();
		return createRange(start, endIndex);
	}

	/**
	 * 写入 tick 值
	 * @param tick - tick 值
	 * @returns 数据在缓冲区中的范围
	 */
	public writeTick(tick: number): Range {
		const start = this.buffer.size();
		this.writeU32Internal(tick);
		const endIndex = this.buffer.size();
		return createRange(start, endIndex);
	}

	/**
	 * 写入任意数据
	 * @param data - 数据数组
	 * @returns 数据在缓冲区中的范围
	 */
	public writeBytes(data: Uint8Array): Range {
		const start = this.buffer.size();
		for (let index = 0; index < data.size(); index++) {
			this.buffer.push(data[index]);
		}
		const endIndex = this.buffer.size();
		return createRange(start, endIndex);
	}

	/**
	 * 写入 u32 变长整数
	 * @param value - 32位无符号整数
	 * @returns 数据在缓冲区中的范围
	 */
	public writeU32(value: number): Range {
		const start = this.buffer.size();
		this.writeU32Internal(value);
		const endIndex = this.buffer.size();
		return createRange(start, endIndex);
	}

	/**
	 * 写入 FnsId 数组
	 * @param fnIds - FnsId 数组
	 * @returns 数据在缓冲区中的范围
	 */
	public writeFnIds(fnIds: ReadonlyArray<number>): Range {
		const start = this.buffer.size();

		for (const fnId of fnIds) {
			this.writeU32Internal(fnId);
		}

		const endIndex = this.buffer.size();
		return createRange(start, endIndex);
	}

	/**
	 * 内部方法: 写入实体 (不返回范围)
	 * 使用 CompactEntity 变长编码
	 * @param entity - 实体ID
	 */
	private writeEntityInternal(entity: Entity): void {
		// 使用紧凑序列化（已优化）
		const compactBytes = compactEntitySerializer.serialize(entity);
		for (let index = 0; index < compactBytes.size(); index++) {
			this.buffer.push(compactBytes[index]);
		}
	}

	/**
	 * 内部方法: 写入 u32 变长整数
	 * 使用 LEB128 变长编码
	 * @param value - 32位无符号整数
	 */
	private writeU32Internal(value: number): void {
		let remaining = value;
		while (remaining >= 0x80) {
			// 取低7位并设置继续标志
			this.buffer.push((remaining & 0x7f) | 0x80);
			remaining = remaining >>> 7;
		}
		// 写入最后一个字节
		this.buffer.push(remaining & 0x7f);
	}

	/**
	 * 内部方法: 写入 u64 变长整数
	 * @param value - 64位无符号整数(Lua number 最大精度)
	 */
	private writeU64Internal(value: number): void {
		// Lua number 可以精确表示 53 位整数
		// 使用变长编码减少字节数
		let remaining = value;
		while (remaining >= 0x80) {
			this.buffer.push((remaining & 0x7f) | 0x80);
			remaining = math.floor(remaining / 128);
		}
		this.buffer.push(remaining & 0x7f);
	}

	/**
	 * 读取实体映射数组
	 *
	 * 支持 CompactEntity 格式的映射数据读取。
	 * 数据格式包含映射数量，无需额外传入 count 参数。
	 *
	 * @param data - 序列化数据
	 * @returns 映射数组
	 */
	public static readMappings(data: Uint8Array): Array<[Entity, Entity]> {
		const [mappings] = compactEntitySerializer.deserializeMappings(data, 0);
		return mappings;
	}

	/**
	 * 读取实体映射数组（兼容旧格式）
	 *
	 * 为了向后兼容，保留基于 count 参数的读取方法。
	 * 逐步迁移后可以移除此方法。
	 *
	 * @param data - 序列化数据
	 * @param count - 映射对数量
	 * @returns 映射数组
	 * @deprecated 使用 readMappings(data) 替代
	 */
	public static readMappingsLegacy(data: Uint8Array, count: number): Array<[Entity, Entity]> {
		const result: Array<[Entity, Entity]> = [];
		let offset = 0;

		for (let index = 0; index < count; index++) {
			const [serverEntity, serverBytesRead] = SerializedData.readEntityAt(data, offset);
			offset += serverBytesRead;

			const [clientEntity, clientBytesRead] = SerializedData.readEntityAt(data, offset);
			offset += clientBytesRead;

			result.push([serverEntity, clientEntity]);
		}

		return result;
	}

	/**
	 * 从指定位置读取实体
	 *
	 * 使用 CompactEntity 变长解码，支持不同大小的实体ID。
	 *
	 * @param data - 序列化数据
	 * @param offset - 起始偏移
	 * @returns [实体ID, 读取字节数]
	 */
	public static readEntityAt(data: Uint8Array, offset: number): [Entity, number] {
		return compactEntitySerializer.deserialize(data, offset);
	}

	/**
	 * 从指定位置读取 u32 变长整数
	 * @param data - 序列化数据
	 * @param offset - 起始偏移
	 * @returns [值, 读取字节数]
	 */
	public static readU32At(data: Uint8Array, offset: number): [number, number] {
		let result = 0;
		let shift = 0;
		let bytesRead = 0;

		while (offset + bytesRead < data.size()) {
			const byte = data[offset + bytesRead];
			bytesRead += 1;

			result |= (byte & 0x7f) << shift;

			if ((byte & 0x80) === 0) {
				break;
			}

			shift += 7;
		}

		return [result, bytesRead];
	}

	/**
	 * 从指定位置读取 u64 变长整数
	 * @param data - 序列化数据
	 * @param offset - 起始偏移
	 * @returns [值, 读取字节数]
	 */
	public static readU64At(data: Uint8Array, offset: number): [number, number] {
		let result = 0;
		let shift = 0;
		let bytesRead = 0;

		while (offset + bytesRead < data.size()) {
			const byte = data[offset + bytesRead];
			bytesRead += 1;

			result += (byte & 0x7f) * math.pow(2, shift);

			if ((byte & 0x80) === 0) {
				break;
			}

			shift += 7;
		}

		return [result, bytesRead];
	}

	/**
	 * 从指定位置读取 tick 值
	 * @param data - 序列化数据
	 * @param offset - 起始偏移
	 * @returns [tick值, 读取字节数]
	 */
	public static readTickAt(data: Uint8Array, offset: number): [number, number] {
		return SerializedData.readU32At(data, offset);
	}

	/**
	 * 获取映射序列化的统计信息
	 *
	 * 用于监控 CompactEntity 优化效果。
	 *
	 * @param mappings - 实体映射数组
	 * @returns 详细统计信息
	 */
	public static getMappingStats(mappings: ReadonlyArray<readonly [Entity, Entity]>) {
		// 直接导入以避免循环依赖问题
		return compactEntitySerializer.getMappingsSerializedSize(mappings);
	}

	/**
	 * 预估映射序列化后的大小
	 *
	 * @param mappings - 实体映射数组
	 * @returns 序列化后的字节数
	 */
	public static estimateMappingSize(mappings: ReadonlyArray<readonly [Entity, Entity]>): number {
		return compactEntitySerializer.getMappingsSerializedSize(mappings);
	}
}