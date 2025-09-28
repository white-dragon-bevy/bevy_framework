/**
 * @fileoverview 组件序列化和反序列化函数定义
 */

import { AnyComponent, Entity, World } from "@rbxts/matter";

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
 * @param ctx - 序列化上下文
 * @param component - 组件
 * @returns 序列化数据
 */
export function jsonSerialize<C extends AnyComponent>(
	ctx: SerializeContext,
	component: C,
): Uint8Array {
	const json = game.GetService("HttpService").JSONEncode(component);
	const encoder = new TextEncoder();
	return encoder.encode(json);
}

/**
 * 默认的 JSON 反序列化函数
 * @param ctx - 反序列化上下文
 * @param data - 序列化数据
 * @returns 组件
 */
export function jsonDeserialize<C extends AnyComponent>(
	ctx: DeserializeContext,
	data: Uint8Array,
): C {
	const decoder = new TextDecoder();
	const json = decoder.decode(data);
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

		// 合并所有缓冲区
		const result = new Uint8Array(totalSize);
		let offset = 0;

		for (const buffer of buffers) {
			// 写入长度
			const view = new DataView(result.buffer);
			view.setUint32(offset, buffer.size(), true);
			offset += 4;

			// 写入数据
			result.set(buffer, offset);
			offset += buffer.size();
		}

		return result;
	};
}

/**
 * 创建批量组件反序列化函数
 * @param components - 组件函数数组
 * @returns 批量反序列化函数
 */
export function createBatchDeserialize(
	components: Array<ComponentFns>,
): ComponentDeserializeFn<AnyComponent[]> {
	return (ctx: DeserializeContext, data: Uint8Array): AnyComponent[] => {
		const result: AnyComponent[] = [];
		let offset = 0;
		const view = new DataView(data.buffer);

		// 反序列化每个组件
		for (let index = 0; index < components.size(); index++) {
			if (offset >= data.size()) {
				break;
			}

			// 读取长度
			const length = view.getUint32(offset, true);
			offset += 4;

			// 读取数据
			const componentData = data.slice(offset, offset + length);
			offset += length;

			// 反序列化
			const fns = components[index];
			const component = fns.deserialize(ctx, componentData);
			result.push(component);
		}

		return result;
	};
}