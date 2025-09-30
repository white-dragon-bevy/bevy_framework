/**
 * @fileoverview Simple Replication 插件
 *
 * 提供简单的客户端-服务器状态同步功能
 */

import { BasePlugin, App, BuiltinSchedules } from "../bevy_app";
import { RunService } from "@rbxts/services";
import { World, AnyEntity, AnyComponent, component } from "@rbxts/matter";
import {
	ComponentCtor,
	SimpleReplicationConfig,
	SimpleContext,
	SimpleState,
} from "./types";
import { serverReplicationSystem } from "./server-replication";
import { clientReceiveSystem, createClientReceiveSystem } from "./client-receive";
import { INetworkAdapter, DefaultNetworkAdapter } from "./network";
import { TypeDescriptor } from "../bevy_core/reflect";

/**
 * 简单复制插件
 * 提供基础的网络状态同步功能，支持服务器到客户端的实体和组件复制
 * 可配置复制范围（全局或玩家专属），支持自定义网络适配器
 */
export class SimpleReplicationPlugin extends BasePlugin {
	private config: SimpleReplicationConfig;
	private networkAdapter: INetworkAdapter;
	private replicatedComponents: {
		toAllPlayers: Set<ComponentCtor>;
		toSelfOnly: Set<ComponentCtor>;
	};

	/**
	 * 创建简单复制插件实例
	 * @param networkAdapter - 网络适配器实例，用于网络通信，默认使用 DefaultNetworkAdapter
	 * @param config - 插件配置对象，包含调试、更新速率等选项
	 * @param replicatedComponents - 需要复制的组件配置，指定哪些组件需要同步
	 * @param replicatedComponents.toAllPlayers - 需要复制到所有玩家的组件集合
	 * @param replicatedComponents.toSelfOnly - 只复制到组件所属玩家的组件集合
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
	 * 标记的组件将在任何实体上变化时同步到所有连接的客户端
	 * @param component - 组件构造器，指定要全局复制的组件类型
	 * @returns 返回插件自身，支持链式调用
	 */
	addReplicatedToAll(component: ComponentCtor): this {
		this.replicatedComponents.toAllPlayers.add(component);
		return this;
	}

	/**
	 * 添加只复制到玩家自己的组件
	 * 标记的组件只会同步到组件所属的玩家客户端
	 * 适用于玩家私有数据（如背包、技能等）
	 * @param component - 组件构造器，指定要专属复制的组件类型
	 * @returns 返回插件自身，支持链式调用
	 */
	addReplicatedToSelf(component: ComponentCtor): this {
		this.replicatedComponents.toSelfOnly.add(component);
		return this;
	}

	/**
	 * 构建插件（框架回调）
	 * 初始化复制系统，创建上下文和状态资源
	 * 根据运行环境（服务器/客户端）配置相应的系统
	 * @param app - 应用实例，用于注册资源和系统
	 * @returns 无返回值
	 */
	build(app: App): void {
		// 创建简化的上下文
		const context = this.createContext(app);

		// 创建简化的状态
		const state = this.createState();

		// 将上下文、状态和网络适配器存储为资源
		app.insertResource(context);
		app.insertResource(state);

		// 使用 TypeDescriptor 存储网络适配器
		const adapterDescriptor: TypeDescriptor = {
			id: "SimpleReplicationPlugin.NetworkAdapter",
			text: "NetworkAdapter",
		};
		app.insertResourceByTypeDescriptor(this.networkAdapter, adapterDescriptor);

		// 根据运行环境添加相应的系统
		const isServer = this.config.forceMode
			? this.config.forceMode === "server"
			: RunService.IsServer();

		if (isServer) {
			this.setupServer(app, context, state);
		} else {
			this.setupClient(app, context, state);
		}
	}

	/**
	 * 创建上下文对象（私有方法）
	 * 生成包含复制配置和组件映射的上下文
	 * 用于在系统间共享配置和组件信息
	 * @param app - 应用实例，用于访问应用配置
	 * @returns 初始化好的上下文对象，包含运行环境和组件映射
	 */
	private createContext(app: App): SimpleContext {
		// 获取或创建组件映射
		const components = this.getComponentsMap(app);

		const isServer = this.config.forceMode
			? this.config.forceMode === "server"
			: RunService.IsServer();

		return {
			IsEcsServer: isServer,
			IsClient: !isServer,
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
	 * 创建状态对象（私有方法）
	 * 初始化调试标志和实体映射等运行时状态
	 * @returns 初始化好的状态对象，包含调试配置和实体 ID 映射
	 */
	private createState(): SimpleState {
		return {
			debugEnabled: this.config.debugEnabled ?? false,
			debugSignal: this.config.debugSignal ?? false,
			entityIdMap: new Map<string, AnyEntity>(),
		};
	}

	/**
	 * 获取组件映射（私有方法）
	 * 创建组件名称到构造器的映射表
	 * 包括内置的 Client 组件和所有需要复制的组件
	 * @param app - 应用实例（当前未使用，保留以备扩展）
	 * @returns 组件名称到构造器的映射对象
	 */
	private getComponentsMap(app: App): Record<string, ComponentCtor> {
		// 创建默认的客户端组件
		const ClientComponent = component<{
			player: Player;
			loaded: boolean;
		}>("Client");

		const components: Record<string, ComponentCtor> = {
			Client: ClientComponent as any,
		};

		// 添加需要复制的组件到映射
		for (const comp of this.replicatedComponents.toAllPlayers) {
			// 使用组件的调试名称作为键
			const compWithName = comp as unknown as { debugName?: string };
			const name = compWithName.debugName || tostring(comp);
			components[name] = comp;
		}

		for (const comp of this.replicatedComponents.toSelfOnly) {
			const compWithName = comp as unknown as { debugName?: string };
			const name = compWithName.debugName || tostring(comp);
			components[name] = comp;
		}

		return components;
	}

	/**
	 * 设置服务器端系统（私有方法）
	 * 配置并添加服务器复制系统到调度中
	 * 系统将在 POST_UPDATE 阶段执行，确保捕获所有组件变化
	 * @param app - 应用实例，用于添加系统
	 * @param context - 上下文对象，传递给复制系统
	 * @param state - 状态对象，传递给复制系统
	 * @returns 无返回值
	 */
	private setupServer(app: App, context: SimpleContext, state: SimpleState): void {
		// 创建包装的系统函数
		const wrappedSystem = (world: World): void => {
			serverReplicationSystem(world, state, context, this.networkAdapter);
		};

		// 添加服务器复制系统到 POST_UPDATE 阶段
		app.addSystems(BuiltinSchedules.POST_UPDATE, wrappedSystem);

		if (this.config.debugEnabled) {
		}
	}

	/**
	 * 设置客户端系统（私有方法）
	 * 配置并添加客户端接收系统到调度中
	 * 系统将在 PRE_UPDATE 阶段执行，在游戏逻辑之前应用服务器数据
	 * @param app - 应用实例，用于添加系统
	 * @param context - 上下文对象，传递给接收系统
	 * @param state - 状态对象，传递给接收系统
	 * @returns 无返回值
	 */
	private setupClient(app: App, context: SimpleContext, state: SimpleState): void {
		// 创建包装的系统函数
		const wrappedSystem = (world: World): void => {
			clientReceiveSystem(world, state, context, this.networkAdapter);
		};

		// 添加客户端接收系统到 PRE_UPDATE 阶段
		app.addSystems(BuiltinSchedules.PRE_UPDATE, wrappedSystem);

		if (this.config.debugEnabled) {
		}
	}

	/**
	 * 获取插件名称（框架回调）
	 * 用于插件识别和调试
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "SimpleReplicationPlugin";
	}

	/**
	 * 插件是否唯一（框架回调）
	 * 返回 true 表示应用中只能有一个此插件实例
	 * @returns 返回 true，表示插件唯一
	 */
	isUnique(): boolean {
		return true;
	}
}

/**
 * 创建简单复制插件的工厂函数
 * 提供更简洁的插件创建方式，等同于直接使用构造函数
 * @param networkAdapter - 网络适配器实例，可选，默认使用 DefaultNetworkAdapter
 * @param config - 插件配置对象，可选，包含调试和性能选项
 * @param replicatedComponents - 需要复制的组件配置，可选
 * @param replicatedComponents.toAllPlayers - 需要复制到所有玩家的组件集合
 * @param replicatedComponents.toSelfOnly - 只复制到玩家自己的组件集合
 * @returns 初始化好的 SimpleReplicationPlugin 实例
 * @example
 * ```typescript
 * const plugin = createSimpleReplicationPlugin(
 *   customNetworkAdapter,
 *   { debugEnabled: true },
 *   { toAllPlayers: new Set([PositionComponent]) }
 * );
 * ```
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