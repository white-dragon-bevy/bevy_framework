/**
 * @fileoverview Simple Replication 插件
 *
 * 提供简单的客户端-服务器状态同步功能
 */

import { BasePlugin, App, BuiltinSchedules } from "../bevy_app";
import { RunService } from "@rbxts/services";
import { World, AnyEntity, AnyComponent } from "@rbxts/matter";
import {
	ComponentCtor,
	SimpleReplicationConfig,
	SimpleContext,
	SimpleState,
} from "./types";
import { serverReplicationSystem } from "./server-replication";
import { clientReceiveSystem, createClientReceiveSystem } from "./client-receive";
import { INetworkAdapter, DefaultNetworkAdapter } from "./network";

/**
 * 简单复制插件
 * 提供基础的网络状态同步功能
 */
export class SimpleReplicationPlugin extends BasePlugin {
	private config: SimpleReplicationConfig;
	private networkAdapter: INetworkAdapter;
	private replicatedComponents: {
		toAllPlayers: Set<ComponentCtor>;
		toSelfOnly: Set<ComponentCtor>;
	};

	/**
	 * 创建简单复制插件
	 * @param networkAdapter - 网络适配器实例（可选，默认使用 DefaultNetworkAdapter）
	 * @param config - 插件配置
	 * @param replicatedComponents - 需要复制的组件配置
	 */
	constructor(
		networkAdapter?: INetworkAdapter,
		config?: Partial<SimpleReplicationConfig>,
		replicatedComponents?: {
			toAllPlayers?: Set<ComponentCtor>;
			toSelfOnly?: Set<ComponentCtor>;
		},
	) {
		super();

		this.networkAdapter = networkAdapter ?? new DefaultNetworkAdapter();

		this.config = {
			debugEnabled: false,
			debugSignal: false,
			updateRate: 30,
			maxPacketSize: 4096,
			...config,
		};

		this.replicatedComponents = {
			toAllPlayers: replicatedComponents?.toAllPlayers ?? new Set<ComponentCtor>(),
			toSelfOnly: replicatedComponents?.toSelfOnly ?? new Set<ComponentCtor>(),
		};
	}

	/**
	 * 添加需要复制到所有玩家的组件
	 * @param component - 组件构造器
	 * @returns 插件自身，支持链式调用
	 */
	addReplicatedToAll(component: ComponentCtor): this {
		this.replicatedComponents.toAllPlayers.add(component);
		return this;
	}

	/**
	 * 添加只复制到自己的组件
	 * @param component - 组件构造器
	 * @returns 插件自身，支持链式调用
	 */
	addReplicatedToSelf(component: ComponentCtor): this {
		this.replicatedComponents.toSelfOnly.add(component);
		return this;
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	build(app: App): void {
		// 创建简化的上下文
		const context = this.createContext(app);

		// 创建简化的状态
		const state = this.createState();

		// 将上下文、状态和网络适配器存储为资源
		app.insertResource(context);
		app.insertResource(state);
		app.insertResource(this.networkAdapter);

		// 根据运行环境添加相应的系统
		if (RunService.IsServer()) {
			this.setupServer(app, context, state);
		} else {
			this.setupClient(app, context, state);
		}
	}

	/**
	 * 创建上下文对象
	 * @param app - 应用实例
	 * @returns 上下文对象
	 */
	private createContext(app: App): SimpleContext {
		// 获取或创建组件映射
		const components = this.getComponentsMap(app);

		return {
			IsEcsServer: RunService.IsServer(),
			IsClient: RunService.IsClient(),
			Replicated: {
				ToAllPlayers: this.replicatedComponents.toAllPlayers,
				ToSelfOnly: this.replicatedComponents.toSelfOnly,
			},
			Components: components,
			getComponent: <T extends object = object>(componentName: string) => {
				const component = components[componentName];
				if (!component) {
					error(`Component ${componentName} not found`);
				}
				return (data?: T) => {
					// ComponentCtor 是无参数的，数据通过其他方式处理
					return component() as AnyComponent;
				};
			},
		};
	}

	/**
	 * 创建状态对象
	 * @returns 状态对象
	 */
	private createState(): SimpleState {
		return {
			debugEnabled: this.config.debugEnabled ?? false,
			debugSignal: this.config.debugSignal ?? false,
			entityIdMap: new Map<string, AnyEntity>(),
		};
	}

	/**
	 * 获取组件映射
	 * @param app - 应用实例
	 * @returns 组件映射
	 */
	private getComponentsMap(app: App): Record<string, ComponentCtor> {
		// 这里应该从应用中获取已注册的组件
		// 暂时返回空对象，实际使用时需要注册组件
		const components: Record<string, ComponentCtor> = {};

		// 如果应用有组件注册表，从中获取
		const world = app.getWorld();
		if (world !== undefined) {
			// 这里需要实现组件注册逻辑
			// 例如: components = app.getRegisteredComponents();
		}

		return components;
	}

	/**
	 * 设置服务器端系统
	 * @param app - 应用实例
	 * @param context - 上下文
	 * @param state - 状态
	 */
	private setupServer(app: App, context: SimpleContext, state: SimpleState): void {
		// 创建包装的系统函数
		const wrappedSystem = (world: World): void => {
			serverReplicationSystem(world, state, context, this.networkAdapter);
		};

		// 添加服务器复制系统到 POST_UPDATE 阶段
		app.addSystems(BuiltinSchedules.POST_UPDATE, wrappedSystem);

		if (this.config.debugEnabled) {
			print("[SimpleReplication] Server systems initialized");
		}
	}

	/**
	 * 设置客户端系统
	 * @param app - 应用实例
	 * @param context - 上下文
	 * @param state - 状态
	 */
	private setupClient(app: App, context: SimpleContext, state: SimpleState): void {
		// 创建包装的系统函数
		const wrappedSystem = (world: World): void => {
			clientReceiveSystem(world, state, context, this.networkAdapter);
		};

		// 添加客户端接收系统到 PRE_UPDATE 阶段
		app.addSystems(BuiltinSchedules.PRE_UPDATE, wrappedSystem);

		if (this.config.debugEnabled) {
			print("[SimpleReplication] Client systems initialized");
		}
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	name(): string {
		return "SimpleReplicationPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	isUnique(): boolean {
		return true;
	}
}

/**
 * 创建简单复制插件的便捷函数
 * @param networkAdapter - 网络适配器实例（可选）
 * @param config - 插件配置
 * @param replicatedComponents - 需要复制的组件
 * @returns 插件实例
 */
export function createSimpleReplicationPlugin(
	networkAdapter?: INetworkAdapter,
	config?: Partial<SimpleReplicationConfig>,
	replicatedComponents?: {
		toAllPlayers?: Set<ComponentCtor>;
		toSelfOnly?: Set<ComponentCtor>;
	},
): SimpleReplicationPlugin {
	return new SimpleReplicationPlugin(networkAdapter, config, replicatedComponents);
}