/**
 * @fileoverview 网络通信接口定义
 *
 * 定义网络适配器接口，支持依赖注入和单元测试
 */

/**
 * 网络适配器接口
 * 抽象网络通信层，支持不同的网络实现（Zap、RemoteEvent等）
 */
export interface INetworkAdapter {
	/**
	 * 向特定玩家发送数据
	 * @param player - 目标玩家
	 * @param value - 要发送的数据
	 */
	fire: (player: Player, value: unknown) => void;

	/**
	 * 向所有玩家发送数据
	 * @param value - 要发送的数据
	 */
	fireAll: (value: unknown) => void;

	/**
	 * 向除了特定玩家外的所有玩家发送数据
	 * @param except - 排除的玩家
	 * @param value - 要发送的数据
	 */
	fireExcept: (except: Player, value: unknown) => void;

	/**
	 * 向玩家列表发送数据
	 * @param list - 玩家列表
	 * @param value - 要发送的数据
	 */
	fireList: (list: Player[], value: unknown) => void;

	/**
	 * 获取可以被 useEvent 监听的事件源
	 * @returns RemoteEvent 或其他可被 useEvent 监听的对象
	 */
	getEventSource(): RemoteEvent | undefined;

	/**
	 * 获取待处理的数据（用于测试）
	 * @returns 待处理的数据数组
	 */
	getPendingData?(): Array<unknown>;
}

/**
 * 客户端复制接口
 * 用于客户端接收服务器的复制数据
 */
export interface ClientReplication {
	/**
	 * 监听服务器发送的复制数据
	 * @param callback - 接收数据的回调函数
	 * @returns 取消监听的函数
	 */
	on: (callback: (value: unknown) => void) => () => void;
}

/**
 * 服务器复制接口
 * 用于服务器向客户端发送复制数据
 */
export interface ServerReplication {
	/**
	 * 向特定玩家发送数据
	 * @param player - 目标玩家
	 * @param value - 要发送的数据
	 */
	fire: (player: Player, value: unknown) => void;

	/**
	 * 向所有玩家发送数据
	 * @param value - 要发送的数据
	 */
	fireAll: (value: unknown) => void;

	/**
	 * 向除了特定玩家外的所有玩家发送数据
	 * @param except - 排除的玩家
	 * @param value - 要发送的数据
	 */
	fireExcept: (except: Player, value: unknown) => void;

	/**
	 * 向玩家列表发送数据
	 * @param list - 玩家列表
	 * @param value - 要发送的数据
	 */
	fireList: (list: Player[], value: unknown) => void;
}

/**
 * 默认的网络适配器实现
 * 使用 RemoteEvent 进行通信（仅作为示例）
 */
export class DefaultNetworkAdapter implements INetworkAdapter {
	private remoteEvent?: RemoteEvent;

	constructor() {
		// 在实际使用中，这里会创建或获取 RemoteEvent
		// 例如：
		// const ReplicatedStorage = game.GetService("ReplicatedStorage");
		// this.remoteEvent = ReplicatedStorage.FindFirstChild("ReplicationEvent") as RemoteEvent;
	}

	fire = (player: Player, value: unknown): void => {
		// 实现向特定玩家发送数据
		if (this.remoteEvent) {
			this.remoteEvent.FireClient(player, value);
		}
	};

	fireAll = (value: unknown): void => {
		// 实现向所有玩家发送数据
		if (this.remoteEvent) {
			this.remoteEvent.FireAllClients(value);
		}
	};

	fireExcept = (except: Player, value: unknown): void => {
		// 实现向除特定玩家外的所有玩家发送数据
		const Players = game.GetService("Players");
		for (const player of Players.GetPlayers()) {
			if (player !== except) {
				this.fire(player, value);
			}
		}
	};

	fireList = (list: Player[], value: unknown): void => {
		// 实现向玩家列表发送数据
		for (const player of list) {
			this.fire(player, value);
		}
	};

	getEventSource(): RemoteEvent | undefined {
		// 返回 RemoteEvent 以便 useEvent 使用
		return this.remoteEvent;
	};
}

/**
 * 模拟网络适配器（用于单元测试）
 */
export class MockNetworkAdapter implements INetworkAdapter {
	public sentMessages: Array<{ type: string; player?: Player; value: unknown }> = [];
	private pendingData: Array<defined> = [];

	fire = (player: Player, value: unknown): void => {
		this.sentMessages.push({ type: "fire", player, value });
	};

	fireAll = (value: unknown): void => {
		this.sentMessages.push({ type: "fireAll", value });
	};

	fireExcept = (except: Player, value: unknown): void => {
		this.sentMessages.push({ type: "fireExcept", player: except, value });
	};

	fireList = (list: Player[], value: unknown): void => {
		this.sentMessages.push({ type: "fireList", value });
	};

	getEventSource(): RemoteEvent | undefined {
		// 模拟环境不返回真实的 RemoteEvent
		return undefined;
	};

	getPendingData(): Array<unknown> {
		const data = [...this.pendingData] as Array<unknown>;
		this.pendingData = [];
		return data;
	};

	/**
	 * 模拟接收数据（用于测试）
	 * @param value - 要模拟接收的数据
	 */
	simulateReceive(value: unknown): void {
		if (value !== undefined) {
			this.pendingData.push(value as defined);
		}
	}

	clearMessages(): void {
		this.sentMessages.clear();
	}
}

// 创建默认的网络接口实例（保持向后兼容）
// 实际项目中这些会从 network.luau 导入
export const Replication = new DefaultNetworkAdapter() as INetworkAdapter;