/**
 * @fileoverview 复制注册表
 *
 * 管理组件的复制规则和序列化/反序列化函数
 */

import { AnyComponent, Component, Entity, World } from "@rbxts/matter";
import { Resource } from "../../../bevy_ecs";
import { ComponentFns, ComponentSerializeFn, ComponentDeserializeFn } from "./component-fns";
import { ReplicationRule, ComponentRule } from "./rules";
import type { Uint8Array } from "./types";
import { createUint8Array } from "./types";

/**
 * 组件信息
 */
export interface ComponentInfo {
	/** 组件名称 */
	readonly name: string;
	/** 组件 ID */
	readonly id: number;
	/** 序列化函数 */
	readonly serialize: ComponentSerializeFn;
	/** 反序列化函数 */
	readonly deserialize: ComponentDeserializeFn;
	/** 复制规则 */
	readonly rules: ReplicationRule[];
}

/**
 * 复制注册表资源
 * 管理所有可复制组件的注册信息
 */
export class ReplicationRegistry implements Resource {
	readonly __brand = "Resource" as const;

	/** 组件注册信息 - 按组件名称索引 */
	private componentsByName: Map<string, ComponentInfo> = new Map();
	/** 组件注册信息 - 按组件 ID 索引 */
	private componentsById: Map<number, ComponentInfo> = new Map();
	/** 下一个可用的组件 ID */
	private nextComponentId = 0;

	/**
	 * 注册组件
	 * @param name - 组件名称
	 * @param fns - 组件函数
	 * @param rules - 复制规则
	 * @returns 组件 ID
	 */
	public registerComponent<C extends AnyComponent>(
		name: string,
		fns: ComponentFns<C>,
		rules: ReplicationRule[] = [],
	): number {
		// 检查是否已注册
		const existing = this.componentsByName.get(name);
		if (existing) {
			warn(`Component ${name} already registered with ID ${existing.id}`);
			return existing.id;
		}

		// 分配组件 ID
		const componentId = this.nextComponentId++;

		// 创建组件信息
		const info: ComponentInfo = {
			name,
			id: componentId,
			serialize: fns.serialize as ComponentSerializeFn,
			deserialize: fns.deserialize as ComponentDeserializeFn,
			rules,
		};

		// 注册组件
		this.componentsByName.set(name, info);
		this.componentsById.set(componentId, info);

		return componentId;
	}

	/**
	 * 获取组件信息（按名称）
	 * @param name - 组件名称
	 * @returns 组件信息
	 */
	public getComponentByName(name: string): ComponentInfo | undefined {
		return this.componentsByName.get(name);
	}

	/**
	 * 获取组件信息（按 ID）
	 * @param id - 组件 ID
	 * @returns 组件信息
	 */
	public getComponentById(id: number): ComponentInfo | undefined {
		return this.componentsById.get(id);
	}

	/**
	 * 获取组件 ID
	 * @param name - 组件名称
	 * @returns 组件 ID
	 */
	public getComponentId(name: string): number | undefined {
		const info = this.componentsByName.get(name);
		return info?.id;
	}

	/**
	 * 获取组件名称
	 * @param id - 组件 ID
	 * @returns 组件名称
	 */
	public getComponentName(id: number): string | undefined {
		const info = this.componentsById.get(id);
		return info?.name;
	}

	/**
	 * 检查组件是否已注册
	 * @param name - 组件名称
	 * @returns 是否已注册
	 */
	public isComponentRegistered(name: string): boolean {
		return this.componentsByName.has(name);
	}

	/**
	 * 获取所有已注册的组件
	 * @returns 组件信息数组
	 */
	public getAllComponents(): ComponentInfo[] {
		const components: ComponentInfo[] = [];
		for (const [_, info] of this.componentsByName) {
			components.push(info);
		}
		return components;
	}

	/**
	 * 获取已注册的组件数量
	 * @returns 组件数量
	 */
	public getComponentCount(): number {
		return this.componentsByName.size();
	}

	/**
	 * 清空注册表
	 */
	public clear(): void {
		this.componentsByName.clear();
		this.componentsById.clear();
		this.nextComponentId = 0;
	}
}

/**
 * 创建默认的组件函数
 * TODO: 使用 Roblox buffer API 替代 TextEncoder/TextDecoder
 * @returns 组件函数
 */
export function createDefaultComponentFns<C extends AnyComponent>(): ComponentFns<C> {
	return {
		serialize: (ctx, component) => {
			// 默认序列化：将组件转换为 JSON
			const json = game.GetService("HttpService").JSONEncode(component);
			// TODO: 实现基于 Roblox buffer 的序列化
			// const encoder = new TextEncoder();
			// return encoder.encode(json);
			const bytes = createUint8Array(json.size());
			for (let index = 0; index < json.size(); index++) {
				bytes[index] = string.byte(json, index + 1)[0];
			}
			return bytes;
		},
		deserialize: (ctx, data) => {
			// 默认反序列化：从 JSON 恢复组件
			// TODO: 实现基于 Roblox buffer 的反序列化
			// const decoder = new TextDecoder();
			// const json = decoder.decode(data);
			let json = "";
			for (let index = 0; index < data.size(); index++) {
				json += string.char(data[index]);
			}
			return game.GetService("HttpService").JSONDecode(json) as C;
		},
	};
}

/**
 * 复制上下文
 * 提供复制过程中的共享状态
 */
export interface ReplicationContext {
	/** World 实例 */
	readonly world: World;
	/** 复制注册表 */
	readonly registry: ReplicationRegistry;
	/** 当前 tick */
	readonly tick: number;
	/** 是否为服务器 */
	readonly isServer: boolean;
}

/**
 * 创建复制上下文
 * @param world - World 实例
 * @param registry - 复制注册表
 * @param tick - 当前 tick
 * @param isServer - 是否为服务器
 * @returns 复制上下文
 */
export function createReplicationContext(
	world: World,
	registry: ReplicationRegistry,
	tick: number,
	isServer: boolean,
): ReplicationContext {
	return {
		world,
		registry,
		tick,
		isServer,
	};
}