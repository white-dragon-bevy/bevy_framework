/**
 * @fileoverview Roblox 网络适配器
 *
 * 使用 Roblox RemoteEvent 和 UnreliableRemoteEvent 实现网络通信
 */

import { RunService, Players, ReplicatedStorage } from "@rbxts/services";
import { World } from "@rbxts/matter";
import { Resource } from "../bevy_ecs";
import { ClientId, createClientId, NetworkMessage, NetworkRole, NetworkStats, NetworkTime } from "./types";
import { ReplicationManager } from "./replication";

/**
 * Roblox 网络适配器
 * 处理 Roblox 平台的网络通信
 */
export class RobloxNetworkAdapter implements Resource {
	readonly __brand = "Resource" as const;

	/** 可靠传输的 RemoteEvent */
	private reliableRemote: RemoteEvent | undefined;

	/** 不可靠传输的 UnreliableRemoteEvent */
	private unreliableRemote: UnreliableRemoteEvent | undefined;

	/** 心跳 RemoteEvent */
	private heartbeatRemote: RemoteEvent | undefined;

	/** 网络统计信息 */
	private stats: NetworkStats;

	/** 网络时间同步 */
	private networkTime: NetworkTime;

	/** 是否已初始化 */
	private initialized: boolean;

	/** 消息处理回调 */
	private messageHandlers: Map<string, (message: NetworkMessage) => void>;

	/** 玩家到客户端ID的映射 */
	private playerToClientId: Map<Player, ClientId>;

	/** 客户端ID到玩家的映射 */
	private clientIdToPlayer: Map<ClientId, Player>;

	/** 下一个可用的客户端ID */
	private nextClientId: number;

	constructor() {
		this.initialized = false;
		this.messageHandlers = new Map();
		this.playerToClientId = new Map();
		this.clientIdToPlayer = new Map();
		this.nextClientId = 1;

		this.stats = {
			__brand: "Resource",
			bytesSent: 0,
			bytesReceived: 0,
			packetsSent: 0,
			packetsReceived: 0,
			averageLatency: 0,
			packetLoss: 0,
			connectedClients: 0,
		};

		this.networkTime = {
			__brand: "Resource",
			serverTime: 0,
			clientTime: 0,
			offset: 0,
			roundTripTime: 0,
		};
	}

	/**
	 * 初始化网络适配器
	 * @param role - 网络角色
	 */
	initialize(role: NetworkRole): void {
		if (this.initialized) {
			return;
		}

		const remoteFolder = this.getOrCreateRemoteFolder();

		// 创建或获取 RemoteEvents
		if (role === NetworkRole.Server || role === NetworkRole.ListenServer) {
			this.initializeServerRemotes(remoteFolder);
		} else {
			this.initializeClientRemotes(remoteFolder);
		}

		this.initialized = true;
	}

	/**
	 * 获取或创建 Remote 文件夹
	 * @returns Remote 文件夹
	 */
	private getOrCreateRemoteFolder(): Folder {
		let folder = ReplicatedStorage.FindFirstChild("RepliconRemotes") as Folder | undefined;
		if (!folder) {
			if (RunService.IsServer()) {
				folder = new Instance("Folder");
				folder.Name = "RepliconRemotes";
				folder.Parent = ReplicatedStorage;
			} else {
				// 客户端等待服务器创建
				folder = ReplicatedStorage.WaitForChild("RepliconRemotes") as Folder;
			}
		}
		return folder;
	}

	/**
	 * 初始化服务器端 RemoteEvents
	 * @param folder - Remote 文件夹
	 */
	private initializeServerRemotes(folder: Folder): void {
		// 创建可靠传输 RemoteEvent
		this.reliableRemote = new Instance("RemoteEvent");
		this.reliableRemote.Name = "ReliableChannel";
		this.reliableRemote.Parent = folder;

		// 创建不可靠传输 UnreliableRemoteEvent
		this.unreliableRemote = new Instance("UnreliableRemoteEvent");
		this.unreliableRemote.Name = "UnreliableChannel";
		this.unreliableRemote.Parent = folder;

		// 创建心跳 RemoteEvent
		this.heartbeatRemote = new Instance("RemoteEvent");
		this.heartbeatRemote.Name = "Heartbeat";
		this.heartbeatRemote.Parent = folder;

		// 设置服务器端事件监听
		this.reliableRemote.OnServerEvent.Connect((player: Player, data: unknown) => {
			this.handleServerReceive(player, data, true);
		});

		this.unreliableRemote.OnServerEvent.Connect((player: Player, data: unknown) => {
			this.handleServerReceive(player, data, false);
		});

		this.heartbeatRemote.OnServerEvent.Connect((player: Player, ...args: unknown[]) => {
			const timestamp = args[0] as number;
			this.handleHeartbeat(player, timestamp);
		});

		// 监听玩家连接和断开
		Players.PlayerAdded.Connect((player) => this.handlePlayerAdded(player));
		Players.PlayerRemoving.Connect((player) => this.handlePlayerRemoving(player));
	}

	/**
	 * 初始化客户端 RemoteEvents
	 * @param folder - Remote 文件夹
	 */
	private initializeClientRemotes(folder: Folder): void {
		// 等待服务器创建的 RemoteEvents
		this.reliableRemote = folder.WaitForChild("ReliableChannel") as RemoteEvent;
		this.unreliableRemote = folder.WaitForChild("UnreliableChannel") as UnreliableRemoteEvent;
		this.heartbeatRemote = folder.WaitForChild("Heartbeat") as RemoteEvent;

		// 设置客户端事件监听
		this.reliableRemote.OnClientEvent.Connect((data: unknown) => {
			this.handleClientReceive(data, true);
		});

		this.unreliableRemote.OnClientEvent.Connect((data: unknown) => {
			this.handleClientReceive(data, false);
		});

		// 启动心跳
		this.startClientHeartbeat();
	}

	/**
	 * 处理玩家加入
	 * @param player - 加入的玩家
	 */
	private handlePlayerAdded(player: Player): void {
		const clientId = createClientId(this.nextClientId++);
		this.playerToClientId.set(player, clientId);
		this.clientIdToPlayer.set(clientId, player);
		this.stats.connectedClients++;

		// 触发客户端连接事件
		const handler = this.messageHandlers.get("ClientConnected");
		if (handler) {
			handler({
				id: 0 as import("./types").NetworkEventId,
				sender: clientId,
				receiver: undefined,
				data: { player, clientId },
				reliable: true,
			});
		}
	}

	/**
	 * 处理玩家离开
	 * @param player - 离开的玩家
	 */
	private handlePlayerRemoving(player: Player): void {
		const clientId = this.playerToClientId.get(player);
		if (clientId) {
			this.playerToClientId.delete(player);
			this.clientIdToPlayer.delete(clientId);
			this.stats.connectedClients--;

			// 触发客户端断开事件
			const handler = this.messageHandlers.get("ClientDisconnected");
			if (handler) {
				handler({
					id: 0 as import("./types").NetworkEventId,
					sender: clientId,
					receiver: undefined,
					data: { player, clientId },
					reliable: true,
				});
			}
		}
	}

	/**
	 * 处理服务器接收消息
	 * @param player - 发送消息的玩家
	 * @param data - 消息数据
	 * @param reliable - 是否可靠传输
	 */
	private handleServerReceive(player: Player, data: unknown, reliable: boolean): void {
		const clientId = this.playerToClientId.get(player);
		if (!clientId) {
			warn(`Received message from unknown player: ${player.Name}`);
			return;
		}

		const dataString = tostring(data);
		this.stats.bytesReceived += dataString.size();
		this.stats.packetsReceived++;

		// 解析并处理消息
		const message = this.parseMessage(data, clientId, reliable);
		if (message) {
			this.processMessage(message);
		}
	}

	/**
	 * 处理客户端接收消息
	 * @param data - 消息数据
	 * @param reliable - 是否可靠传输
	 */
	private handleClientReceive(data: unknown, reliable: boolean): void {
		const dataString = tostring(data);
		this.stats.bytesReceived += dataString.size();
		this.stats.packetsReceived++;

		// 解析并处理消息
		const message = this.parseMessage(data, createClientId(0), reliable); // 0 = Server
		if (message) {
			this.processMessage(message);
		}
	}

	/**
	 * 处理心跳
	 * @param player - 发送心跳的玩家
	 * @param clientTimestamp - 客户端时间戳
	 */
	private handleHeartbeat(player: Player, clientTimestamp: number): void {
		const serverTimestamp = os.clock();

		// 发送心跳响应
		if (this.heartbeatRemote) {
			this.heartbeatRemote.FireClient(player, serverTimestamp, clientTimestamp);
		}
	}

	/**
	 * 启动客户端心跳
	 */
	private startClientHeartbeat(): void {
		task.spawn(() => {
			while (this.heartbeatRemote) {
				const clientTime = os.clock();
				this.heartbeatRemote.FireServer(clientTime);

				// 监听心跳响应
				const connection = this.heartbeatRemote.OnClientEvent.Once((serverTime: number, originalClientTime: number) => {
					const currentTime = os.clock();
					const rtt = currentTime - originalClientTime;
					const offset = serverTime - (originalClientTime + rtt / 2);

					this.networkTime.serverTime = serverTime;
					this.networkTime.clientTime = currentTime;
					this.networkTime.offset = offset;
					this.networkTime.roundTripTime = rtt;

					// 更新延迟统计
					this.stats.averageLatency = (this.stats.averageLatency * 0.9 + rtt * 0.1) * 1000; // 转换为毫秒
				});

				task.wait(1); // 每秒发送一次心跳
			}
		});
	}

	/**
	 * 解析消息
	 * @param data - 原始数据
	 * @param sender - 发送者ID
	 * @param reliable - 是否可靠传输
	 * @returns 解析后的消息
	 */
	private parseMessage(data: unknown, sender: ClientId, reliable: boolean): NetworkMessage | undefined {
		if (!typeIs(data, "table")) {
			warn("Invalid message format: not a table");
			return undefined;
		}

		const messageData = data as Record<string, unknown>;
		return {
			id: (messageData.id || 0) as import("./types").NetworkEventId,
			sender: sender,
			receiver: messageData.receiver as ClientId | undefined,
			data: messageData.data,
			reliable: reliable,
		};
	}

	/**
	 * 处理消息
	 * @param message - 网络消息
	 */
	private processMessage(message: NetworkMessage): void {
		// 查找并调用消息处理器
		const messageType = typeIs(message.data, "table") ? (message.data as { type?: string }).type : undefined;
		if (messageType) {
			const handler = this.messageHandlers.get(messageType);
			if (handler) {
				handler(message);
			}
		}

		// 通用消息处理
		const genericHandler = this.messageHandlers.get("*");
		if (genericHandler) {
			genericHandler(message);
		}
	}

	/**
	 * 发送消息
	 * @param message - 要发送的消息
	 */
	sendMessage(message: NetworkMessage): void {
		const remote = message.reliable ? this.reliableRemote : this.unreliableRemote;
		if (!remote) {
			warn("Network not initialized");
			return;
		}

		const data = {
			id: message.id,
			receiver: message.receiver,
			data: message.data,
		};

		const dataString = tostring(data);
		this.stats.bytesSent += dataString.size();
		this.stats.packetsSent++;

		if (RunService.IsServer()) {
			// 服务器发送
			if (message.receiver !== undefined) {
				// 发送到特定客户端
				const player = this.clientIdToPlayer.get(message.receiver);
				if (player) {
					if (message.reliable) {
						(remote as RemoteEvent).FireClient(player, data);
					} else {
						(remote as UnreliableRemoteEvent).FireClient(player, data);
					}
				}
			} else {
				// 广播到所有客户端
				if (message.reliable) {
					(remote as RemoteEvent).FireAllClients(data);
				} else {
					(remote as UnreliableRemoteEvent).FireAllClients(data);
				}
			}
		} else {
			// 客户端发送到服务器
			if (message.reliable) {
				(remote as RemoteEvent).FireServer(data);
			} else {
				(remote as UnreliableRemoteEvent).FireServer(data);
			}
		}
	}

	/**
	 * 注册消息处理器
	 * @param messageType - 消息类型
	 * @param handler - 处理函数
	 */
	registerHandler(messageType: string, handler: (message: NetworkMessage) => void): void {
		this.messageHandlers.set(messageType, handler);
	}

	/**
	 * 注销消息处理器
	 * @param messageType - 消息类型
	 */
	unregisterHandler(messageType: string): void {
		this.messageHandlers.delete(messageType);
	}

	/**
	 * 获取玩家的客户端ID
	 * @param player - 玩家
	 * @returns 客户端ID
	 */
	getClientId(player: Player): ClientId | undefined {
		return this.playerToClientId.get(player);
	}

	/**
	 * 获取客户端ID对应的玩家
	 * @param clientId - 客户端ID
	 * @returns 玩家
	 */
	getPlayer(clientId: ClientId): Player | undefined {
		return this.clientIdToPlayer.get(clientId);
	}

	/**
	 * 获取网络统计信息
	 * @returns 网络统计
	 */
	getStats(): Readonly<NetworkStats> {
		return this.stats;
	}

	/**
	 * 获取网络时间同步信息
	 * @returns 网络时间
	 */
	getNetworkTime(): Readonly<NetworkTime> {
		return this.networkTime;
	}

	/**
	 * 检查是否已初始化
	 * @returns 是否已初始化
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * 清理资源
	 */
	cleanup(): void {
		this.messageHandlers.clear();
		this.playerToClientId.clear();
		this.clientIdToPlayer.clear();

		if (this.reliableRemote) {
			this.reliableRemote.Destroy();
		}
		if (this.unreliableRemote) {
			this.unreliableRemote.Destroy();
		}
		if (this.heartbeatRemote) {
			this.heartbeatRemote.Destroy();
		}

		this.initialized = false;
	}
}