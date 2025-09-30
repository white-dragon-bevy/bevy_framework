/**
 * @fileoverview Bevy Replicon 插件系统
 *
 * 提供网络复制功能的插件集成
 */

import { BasePlugin, App, BuiltinSchedules } from "../../src/bevy_app";
import { RunService } from "@rbxts/services";
import {
	NetworkRole,
	ReplicationConfig,
	ReplicationStrategy,
	ServerConfig,
	ClientConfig,
} from "./types";
import { ReplicationManager, replicationSystem } from "./replication";
import { ClientPredictionManager, clientPredictionSystem } from "./client-prediction";
import { RobloxNetworkAdapter } from "./roblox-network";
import { processOutgoingMessagesSystem } from "./systems";
import { ServerMessages } from "./shared/backend/server-messages";
import { ClientMessages } from "./shared/backend/client-messages";
import { RepliconChannels } from "./shared/backend/channels";
import { RemoteEventRegistry } from "./shared/event";
import { replicateIntoUpdateSystem } from "./server/replicate-into-update";
import { applyReplicationSystem } from "./client/apply-replication";
import { ServerTick, ServerUpdateTick } from "./server/server-tick";
import { ClientVisibility } from "./server/client-visibility";
import { ReplicationRegistry } from "./shared/replication/registry";
import { ServerEntityMap } from "./shared/replication/server-entity-map";

/**
 * Replicon 服务器插件
 * 提供服务器端网络复制功能
 */
export class RepliconServerPlugin extends BasePlugin {
	private config: ServerConfig;
	private replicationConfig: ReplicationConfig;

	constructor(config?: Partial<ServerConfig>, replicationConfig?: Partial<ReplicationConfig>) {
		super();
		this.config = {
			__brand: "Resource",
			port: 7447,
			maxClients: 100,
			heartbeatInterval: 1,
			timeout: 10,
			...config,
		};

		this.replicationConfig = {
			strategy: ReplicationStrategy.Full,
			updateRate: 30,
			compression: false,
			maxPacketSize: 4096,
			reliable: true,
			...replicationConfig,
		};
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	build(app: App): void {
		if (!RunService.IsServer()) {
			warn("RepliconServerPlugin should only be used on server");
			return;
		}

		// 创建资源实例
		const replicationManager = new ReplicationManager(NetworkRole.Server, this.replicationConfig);
		const networkAdapter = new RobloxNetworkAdapter();
		const serverMessages = new ServerMessages();
		const repliconChannels = new RepliconChannels();
		const eventRegistry = new RemoteEventRegistry();
		const serverTick = new ServerTick();
		const clientVisibility = new ClientVisibility();
		const replicationRegistry = new ReplicationRegistry();

		// 设置通道数量
		serverMessages.setupServerChannels(repliconChannels.getServerChannelCount());
		serverMessages.setupClientChannels(repliconChannels.getClientChannelCount());

		// 注册资源到应用
		app.insertResource(serverMessages);
		app.insertResource(repliconChannels);
		app.insertResource(replicationManager);
		app.insertResource(networkAdapter);
		app.insertResource(this.config);
		app.insertResource(eventRegistry);
		app.insertResource(serverTick);
		app.insertResource(clientVisibility);
		app.insertResource(replicationRegistry);

		// 初始化网络适配器
		networkAdapter.initialize(NetworkRole.Server);

		// 设置消息处理器
		this.setupServerMessageHandlers(networkAdapter, replicationManager);

		// 添加系统
		app.addSystems(BuiltinSchedules.PRE_UPDATE, replicationSystem);
		app.addSystems(BuiltinSchedules.POST_UPDATE, replicateIntoUpdateSystem);

		// 添加清理处理
		app.addSystems(BuiltinSchedules.POST_UPDATE, processOutgoingMessagesSystem);
	}

	/**
	 * 设置服务器消息处理器
	 * @param networkAdapter - 网络适配器
	 * @param replicationManager - 复制管理器
	 */
	private setupServerMessageHandlers(
		networkAdapter: RobloxNetworkAdapter,
		replicationManager: ReplicationManager,
	): void {
		// 处理客户端连接
		networkAdapter.registerHandler("ClientConnected", (message) => {
			const data = message.data as { clientId: import("./types").ClientId };
			replicationManager.addClient(data.clientId);
		});

		// 处理客户端断开
		networkAdapter.registerHandler("ClientDisconnected", (message) => {
			const data = message.data as { clientId: import("./types").ClientId };
			replicationManager.removeClient(data.clientId);
		});
	}


	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	name(): string {
		return "RepliconServerPlugin";
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
 * Replicon 客户端插件
 * 提供客户端网络复制和预测功能
 */
export class RepliconClientPlugin extends BasePlugin {
	private config: ClientConfig;
	private replicationConfig: ReplicationConfig;
	private enablePrediction: boolean;

	constructor(
		config?: Partial<ClientConfig>,
		replicationConfig?: Partial<ReplicationConfig>,
		enablePrediction: boolean = true,
	) {
		super();
		this.config = {
			__brand: "Resource",
			serverAddress: "localhost:7447",
			autoReconnect: true,
			reconnectDelay: 5,
			maxReconnectAttempts: 3,
			...config,
		};

		this.replicationConfig = {
			strategy: ReplicationStrategy.Full,
			updateRate: 30,
			compression: false,
			maxPacketSize: 4096,
			reliable: true,
			...replicationConfig,
		};

		this.enablePrediction = enablePrediction;
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	build(app: App): void {
		if (!RunService.IsClient()) {
			warn("RepliconClientPlugin should only be used on client");
			return;
		}

		// 创建资源实例
		const replicationManager = new ReplicationManager(NetworkRole.Client, this.replicationConfig);
		const networkAdapter = new RobloxNetworkAdapter();
		const predictionManager = new ClientPredictionManager();
		const clientMessages = new ClientMessages();
		const repliconChannels = new RepliconChannels();
		const eventRegistry = new RemoteEventRegistry();
		const serverUpdateTick = new ServerUpdateTick();
		const serverEntityMap = new ServerEntityMap();
		const replicationRegistry = new ReplicationRegistry();

		// 设置通道数量
		clientMessages.setupServerChannels(repliconChannels.getServerChannelCount());
		clientMessages.setupClientChannels(repliconChannels.getClientChannelCount());

		// 注册资源到应用
		app.insertResource(clientMessages);
		app.insertResource(repliconChannels);
		app.insertResource(replicationManager);
		app.insertResource(networkAdapter);
		app.insertResource(this.config);
		app.insertResource(predictionManager);
		app.insertResource(eventRegistry);
		app.insertResource(serverUpdateTick);
		app.insertResource(serverEntityMap);
		app.insertResource(replicationRegistry);

		// 初始化网络适配器
		networkAdapter.initialize(NetworkRole.Client);

		// 设置消息处理器
		this.setupClientMessageHandlers(networkAdapter, replicationManager, predictionManager);

		// 添加系统
		app.addSystems(BuiltinSchedules.PRE_UPDATE, applyReplicationSystem);
		app.addSystems(BuiltinSchedules.PRE_UPDATE, replicationSystem);

		if (this.enablePrediction) {
			predictionManager.setEnabled(true);
			app.addSystems(BuiltinSchedules.UPDATE, clientPredictionSystem);
		}

		// 添加处理出站消息的系统
		app.addSystems(BuiltinSchedules.POST_UPDATE, processOutgoingMessagesSystem);
	}

	/**
	 * 设置客户端消息处理器
	 * @param networkAdapter - 网络适配器
	 * @param replicationManager - 复制管理器
	 * @param predictionManager - 预测管理器
	 */
	private setupClientMessageHandlers(
		networkAdapter: RobloxNetworkAdapter,
		replicationManager: ReplicationManager,
		predictionManager: ClientPredictionManager,
	): void {
		// 处理服务器更新
		networkAdapter.registerHandler("EntityUpdate", (message) => {
			// TODO: 处理实体更新
		});

		// 处理服务器确认
		networkAdapter.registerHandler("FrameConfirmation", (message) => {
			const data = message.data as {
				frame: number;
				state: Map<import("@rbxts/matter").Entity, Map<string, import("@rbxts/matter").AnyComponent>>;
			};
			// TODO: 获取世界实例并处理确认
			// predictionManager.handleServerConfirmation(world, data.frame, data.state);
		});
	}


	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	name(): string {
		return "RepliconClientPlugin";
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
 * Replicon 插件
 * 自动根据运行环境选择合适的插件
 */
export class RepliconPlugin extends BasePlugin {
	private serverConfig?: Partial<ServerConfig>;
	private clientConfig?: Partial<ClientConfig>;
	private replicationConfig: Partial<ReplicationConfig>;
	private enablePrediction: boolean;

	constructor(options?: {
		serverConfig?: Partial<ServerConfig>;
		clientConfig?: Partial<ClientConfig>;
		replicationConfig?: Partial<ReplicationConfig>;
		enablePrediction?: boolean;
	}) {
		super();
		this.serverConfig = options?.serverConfig;
		this.clientConfig = options?.clientConfig;
		this.replicationConfig = options?.replicationConfig || {};
		this.enablePrediction = options?.enablePrediction ?? true;
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	build(app: App): void {
		if (RunService.IsServer()) {
			const serverPlugin = new RepliconServerPlugin(this.serverConfig, this.replicationConfig);
			serverPlugin.build(app);
		} else {
			const clientPlugin = new RepliconClientPlugin(
				this.clientConfig,
				this.replicationConfig,
				this.enablePrediction,
			);
			clientPlugin.build(app);
		}
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	name(): string {
		return "RepliconPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	isUnique(): boolean {
		return true;
	}
}