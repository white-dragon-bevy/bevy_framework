/**
 * @fileoverview 组件序列化和反序列化函数定义
 */

import { AnyComponent, Entity, World } from "@rbxts/matter";
import type { Uint8Array } from "./types";
import { createUint8Array, sliceUint8Array } from "./types";
import { compactEntitySerializer } from "./compact-entity";

/**
 * 序列化上下文
 */
export interface SerializeContext {
	/** World 实例 */
	readonly world: World;
	/** 是否为服务器 */
	readonly isServer: boolean;
	/** 当前 tick */
	readonly tick: number;
}

/**
 * 反序列化上下文
 */
export interface DeserializeContext {
	/** World 实例 */
	readonly world: World;
	/** 是否为服务器 */
	readonly isServer: boolean;
	/** 当前 tick */
	readonly tick: number;
	/** 实体映射（服务器实体 -> 客户端实体） */
	readonly entityMap?: Map<Entity, Entity>;
}

/**
 * 组件序列化函数
 */
export type ComponentSerializeFn<C = AnyComponent> = (
	ctx: SerializeContext,
	component: C,
) => Uint8Array;

/**
 * 组件反序列化函数
 */
export type ComponentDeserializeFn<C = AnyComponent> = (
	ctx: DeserializeContext,
	data: Uint8Array,
) => C;

/**
 * 组件函数集合
 */
export interface ComponentFns<C extends AnyComponent = AnyComponent> {
	/** 序列化函数 */
	readonly serialize: ComponentSerializeFn<C>;
	/** 反序列化函数 */
	readonly deserialize: ComponentDeserializeFn<C>;
}

/**
 * 命令序列化函数
 * 用于处理插入、移除等命令
 */
export type CommandSerializeFn = (
	ctx: SerializeContext,
	entity: Entity,
	componentId: number,
) => Uint8Array | undefined;

/**
 * 命令反序列化函数
 */
export type CommandDeserializeFn = (
	ctx: DeserializeContext,
	entity: Entity,
	componentId: number,
	data: Uint8Array,
) => void;

/**
 * 命令函数集合
 */
export interface CommandFns {
	/** 序列化函数 */
	readonly serialize: CommandSerializeFn;
	/** 反序列化函数 */
	readonly deserialize: CommandDeserializeFn;
}

/**
 * 默认的 JSON 序列化函数
 * TODO: 使用 Roblox buffer API 替代 TextEncoder
 * @param ctx - 序列化上下文
 * @param component - 组件
 * @returns 序列化数据
 */
export function jsonSerialize<C extends AnyComponent>(
	ctx: SerializeContext,
	component: C,
): Uint8Array {
	const json = game.GetService("HttpService").JSONEncode(component);
	// TODO: 实现基于 Roblox buffer 的序列化
	// const encoder = new TextEncoder();
	// return encoder.encode(json);
	const bytes = createUint8Array(json.size());
	for (let index = 0; index < json.size(); index++) {
		bytes[index] = string.byte(json, index + 1)[0];
	}
	return bytes;
}

/**
 * 默认的 JSON 反序列化函数
 * TODO: 使用 Roblox buffer API 替代 TextDecoder
 * @param ctx - 反序列化上下文
 * @param data - 序列化数据
 * @returns 组件
 */
export function jsonDeserialize<C extends AnyComponent>(
	ctx: DeserializeContext,
	data: Uint8Array,
): C {
	// TODO: 实现基于 Roblox buffer 的反序列化
	// const decoder = new TextDecoder();
	// const json = decoder.decode(data);
	let json = "";
	for (let index = 0; index < data.size(); index++) {
		json += string.char(data[index]);
	}
	return game.GetService("HttpService").JSONDecode(json) as C;
}

/**
 * 创建映射实体的反序列化函数
 * @param deserialize - 基础反序列化函数
 * @returns 映射实体的反序列化函数
 */
export function createMappedDeserialize<C extends AnyComponent & { entity?: Entity }>(
	deserialize: ComponentDeserializeFn<C>,
): ComponentDeserializeFn<C> {
	return (ctx: DeserializeContext, data: Uint8Array): C => {
		const component = deserialize(ctx, data);

		// 映射组件中的实体字段
		if (component.entity !== undefined && ctx.entityMap) {
			const mappedEntity = ctx.entityMap.get(component.entity);
			if (mappedEntity !== undefined) {
				return {
					...component,
					entity: mappedEntity,
				};
			}
		}

		return component;
	};
}

/**
 * 创建批量组件序列化函数
 * @param components - 组件函数数组
 * @returns 批量序列化函数
 */
/**
 * 创建批量组件序列化函数
 * TODO: 使用 Roblox buffer API 替代 DataView
 * @param components - 组件函数数组
 * @returns 批量序列化函数
 */
export function createBatchSerialize(
	components: Array<ComponentFns>,
): ComponentSerializeFn<AnyComponent[]> {
	return (ctx: SerializeContext, componentArray: AnyComponent[]): Uint8Array => {
		const buffers: Uint8Array[] = [];
		let totalSize = 0;

		// 序列化每个组件
		for (let index = 0; index < components.size(); index++) {
			const fns = components[index];
			const component = componentArray[index];
			if (component !== undefined) {
				const data = fns.serialize(ctx, component);
				buffers.push(data);
				totalSize += data.size() + 4; // 4 字节用于存储长度
			}
		}

		// TODO: 实现基于 Roblox buffer 的序列化
		// 合并所有缓冲区
		const result = createUint8Array(totalSize);
		let offset = 0;

		for (const buffer of buffers) {
			// 写入长度 (手动实现 setUint32)
			const length = buffer.size();
			result[offset] = length & 0xff;
			result[offset + 1] = (length >> 8) & 0xff;
			result[offset + 2] = (length >> 16) & 0xff;
			result[offset + 3] = (length >> 24) & 0xff;
			offset += 4;

			// 写入数据
			for (let index = 0; index < buffer.size(); index++) {
				result[offset + index] = buffer[index];
			}
			offset += buffer.size();
		}

		return result;
	};
}

/**
 * 创建批量组件反序列化函数
 * TODO: 使用 Roblox buffer API 替代 DataView
 * @param components - 组件函数数组
 * @returns 批量反序列化函数
 */
export function createBatchDeserialize(
	components: Array<ComponentFns>,
): ComponentDeserializeFn<AnyComponent[]> {
	return (ctx: DeserializeContext, data: Uint8Array): AnyComponent[] => {
		const result: AnyComponent[] = [];
		let offset = 0;

		// 反序列化每个组件
		for (let index = 0; index < components.size(); index++) {
			if (offset >= data.size()) {
				break;
			}

			// 读取长度 (手动实现 getUint32)
			const length =
				data[offset] |
				(data[offset + 1] << 8) |
				(data[offset + 2] << 16) |
				(data[offset + 3] << 24);
			offset += 4;

			// 读取数据
			const componentData = sliceUint8Array(data, offset, offset + length);
			offset += length;

			// 反序列化
			const fns = components[index];
			const component = fns.deserialize(ctx, componentData);
			result.push(component);
		}

		return result;
	};
}

/**
 * 优化的实体序列化函数
 *
 * 专门用于序列化包含 Entity 字段的组件，使用 CompactEntity 优化。
 * 相比 JSON 序列化，显著减少包含实体引用的组件的字节数。
 *
 * @param ctx - 序列化上下文
 * @param component - 包含实体字段的组件
 * @returns 序列化数据
 */
export function compactEntitySerialize<C extends AnyComponent & { entity?: Entity }>(
	ctx: SerializeContext,
	component: C,
): Uint8Array {
	// 创建一个拷贝，将实体字段进行紧凑序列化
	const compactComponent = { ...component };

	if (component.entity !== undefined) {
		// 将实体替换为紧凑序列化的字节数组
		const entityBytes = compactEntitySerializer.serialize(component.entity);
		(compactComponent as unknown as Record<string, unknown>).__compactEntity = entityBytes;
		delete (compactComponent as unknown as Record<string, unknown>).entity;
	}

	// 使用标准 JSON 序列化其余字段
	const json = game.GetService("HttpService").JSONEncode(compactComponent);
	const bytes = createUint8Array(json.size());
	for (let index = 0; index < json.size(); index++) {
		bytes[index] = string.byte(json, index + 1)[0];
	}
	return bytes;
}

/**
 * 优化的实体反序列化函数
 *
 * 与 compactEntitySerialize 配对使用，支持 CompactEntity 格式的实体字段。
 *
 * @param ctx - 反序列化上下文
 * @param data - 序列化数据
 * @returns 组件
 */
export function compactEntityDeserialize<C extends AnyComponent & { entity?: Entity }>(
	ctx: DeserializeContext,
	data: Uint8Array,
): C {
	// 反序列化 JSON 部分
	let json = "";
	for (let index = 0; index < data.size(); index++) {
		json += string.char(data[index]);
	}
	const component = game.GetService("HttpService").JSONDecode(json) as unknown as Record<string, unknown>;

	// 如果有紧凑实体数据，进行反序列化
	if (component.__compactEntity !== undefined) {
		const entityBytes = component.__compactEntity as Array<number>;
		const [entity] = compactEntitySerializer.deserialize(entityBytes, 0);
		component.entity = entity;
		delete component.__compactEntity;
	}

	return component as C;
}

/**
 * 创建支持实体映射的紧凑序列化函数
 *
 * 在 compactEntitySerialize 基础上添加实体映射支持。
 * 适用于包含对其他实体引用的组件。
 *
 * @param baseSerialization - 基础序列化函数
 * @returns 支持实体映射的序列化函数
 */
export function createMappedCompactSerialize<C extends AnyComponent & { entity?: Entity }>(
	baseSerialization?: ComponentSerializeFn<C>
): ComponentSerializeFn<C> {
	const actualSerialize = baseSerialization ?? compactEntitySerialize;

	return (ctx: SerializeContext, component: C): Uint8Array => {
		return actualSerialize(ctx, component);
	};
}

/**
 * 创建支持实体映射的紧凑反序列化函数
 *
 * 在 compactEntityDeserialize 基础上添加实体映射支持。
 * 自动将服务器实体ID映射为客户端实体ID。
 *
 * @param baseDeserialization - 基础反序列化函数
 * @returns 支持实体映射的反序列化函数
 */
export function createMappedCompactDeserialize<C extends AnyComponent & { entity?: Entity }>(
	baseDeserialization?: ComponentDeserializeFn<C>
): ComponentDeserializeFn<C> {
	const actualDeserialize = baseDeserialization ?? compactEntityDeserialize;

	return (ctx: DeserializeContext, data: Uint8Array): C => {
		const component = actualDeserialize(ctx, data);

		// 映射组件中的实体字段
		if (component.entity !== undefined && ctx.entityMap) {
			const mappedEntity = ctx.entityMap.get(component.entity);
			if (mappedEntity !== undefined) {
				return {
					...component,
					entity: mappedEntity,
				};
			}
		}

		return component;
	};
}

/**
 * 创建多实体字段的紧凑序列化函数
 *
 * 支持组件中包含多个实体字段的情况，如数组或对象中的多个实体引用。
 *
 * @param entityFieldPaths - 实体字段路径数组，如 ["entity", "target.entity", "entities"]
 * @returns 多实体序列化函数
 */
export function createMultiEntityCompactSerialize<C extends AnyComponent>(
	entityFieldPaths: ReadonlyArray<string>
): ComponentSerializeFn<C> {
	return (ctx: SerializeContext, component: C): Uint8Array => {
		const compactComponent = { ...component } as unknown as Record<string, unknown>;

		// 处理每个实体字段路径
		for (const fieldPath of entityFieldPaths) {
			const fieldValue = getNestedField(component, fieldPath);
			if (fieldValue !== undefined) {
				if (typeIs(fieldValue, "number")) {
					// 单个实体
					const entityBytes = compactEntitySerializer.serialize(fieldValue as Entity);
					setNestedField(compactComponent, `__compact_${fieldPath}`, entityBytes);
					deleteNestedField(compactComponent, fieldPath);
				} else if (typeIs(fieldValue, "table") && (fieldValue as unknown as { size?: unknown }).size !== undefined) {
					// 实体数组（使用 Lua 表检查）
					const entityArray = fieldValue as Array<Entity>;
					const compactBytes = compactEntitySerializer.serializeEntityArray(entityArray);
					setNestedField(compactComponent, `__compact_${fieldPath}`, compactBytes);
					deleteNestedField(compactComponent, fieldPath);
				}
			}
		}

		// 序列化修改后的组件
		const json = game.GetService("HttpService").JSONEncode(compactComponent);
		const bytes = createUint8Array(json.size());
		for (let index = 0; index < json.size(); index++) {
			bytes[index] = string.byte(json, index + 1)[0];
		}
		return bytes;
	};
}

/**
 * 创建多实体字段的紧凑反序列化函数
 *
 * 与 createMultiEntityCompactSerialize 配对使用。
 *
 * @param entityFieldPaths - 实体字段路径数组
 * @returns 多实体反序列化函数
 */
export function createMultiEntityCompactDeserialize<C extends AnyComponent>(
	entityFieldPaths: ReadonlyArray<string>
): ComponentDeserializeFn<C> {
	return (ctx: DeserializeContext, data: Uint8Array): C => {
		// 反序列化 JSON 部分
		let json = "";
		for (let index = 0; index < data.size(); index++) {
			json += string.char(data[index]);
		}
		const component = game.GetService("HttpService").JSONDecode(json) as unknown as Record<string, unknown>;

		// 恢复每个实体字段
		for (const fieldPath of entityFieldPaths) {
			const compactFieldName = `__compact_${fieldPath}`;
			const compactData = getNestedField(component, compactFieldName);

			if (compactData !== undefined) {
				if (typeIs(compactData, "table") && (compactData as unknown as { size?: () => number }).size !== undefined && (compactData as unknown as { size: () => number }).size() > 0) {
					// 检查是否为实体数组
					const compactArray = compactData as Array<number>;
					const firstByte = compactArray[0];
					if (typeIs(firstByte, "number")) {
						// 可能是实体数组
						try {
							const [entities] = compactEntitySerializer.deserializeEntityArray(compactArray);

							// 应用实体映射
							const mappedEntities: Array<Entity> = [];
							for (const entity of entities) {
								const mappedEntity = ctx.entityMap?.get(entity) ?? entity;
								mappedEntities.push(mappedEntity);
							}

							setNestedField(component, fieldPath, mappedEntities);
						} catch {
							// 如果解析失败，可能是单个实体
							const [entity] = compactEntitySerializer.deserialize(compactArray);
							const mappedEntity = ctx.entityMap?.get(entity) ?? entity;
							setNestedField(component, fieldPath, mappedEntity);
						}
					}
				}
				deleteNestedField(component, compactFieldName);
			}
		}

		return component as C;
	};
}

/**
 * 辅助函数：获取嵌套字段值
 */
function getNestedField(obj: unknown, path: string): unknown {
	const parts = path.split(".");
	let current = obj as Record<string, unknown>;
	for (const part of parts) {
		if (current === undefined) {
			return undefined;
		}
		current = current[part] as Record<string, unknown>;
	}
	return current;
}

/**
 * 辅助函数：设置嵌套字段值
 */
function setNestedField(obj: unknown, path: string, value: unknown): void {
	const parts = path.split(".");
	let current = obj as Record<string, unknown>;
	for (let index = 0; index < parts.size() - 1; index++) {
		const part = parts[index];
		if (current[part] === undefined) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	current[parts[parts.size() - 1]] = value;
}

/**
 * 辅助函数：删除嵌套字段
 */
function deleteNestedField(obj: unknown, path: string): void {
	const parts = path.split(".");
	let current = obj as Record<string, unknown>;
	for (let index = 0; index < parts.size() - 1; index++) {
		const part = parts[index];
		if (current[part] === undefined) {
			return;
		}
		current = current[part] as Record<string, unknown>;
	}
	delete current[parts[parts.size() - 1]];
}