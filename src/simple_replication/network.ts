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
	 * @param player - 目标玩家实例
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fire: (player: Player, value: unknown) => void;

	/**
	 * 向所有玩家广播数据
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fireAll: (value: unknown) => void;

	/**
	 * 向除了指定玩家外的所有玩家发送数据
	 * @param except - 要排除的玩家实例
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fireExcept: (except: Player, value: unknown) => void;

	/**
	 * 向指定的玩家列表发送数据
	 * @param list - 目标玩家数组
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fireList: (list: Player[], value: unknown) => void;

	/**
	 * 获取可以被 useEvent 监听的事件源
	 * 用于客户端通过 Matter Hooks 监听服务器发送的数据
	 * @returns RemoteEvent 实例，测试环境下返回 undefined
	 */
	getEventSource(): RemoteEvent | undefined;

	/**
	 * 获取待处理的数据（仅用于测试环境）
	 * 测试模式下返回模拟的网络数据队列
	 * @returns 待处理的数据数组，生产环境下为 undefined
	 */
	getPendingData?(): Array<unknown>;
}

/**
 * 客户端复制接口
 * 用于客户端接收服务器的复制数据
 * 提供事件监听机制
 */
export interface ClientReplication {
	/**
	 * 监听服务器发送的复制数据
	 * @param callback - 接收数据的回调函数，参数为服务器发送的数据
	 * @returns 返回取消监听的清理函数
	 */
	on: (callback: (value: unknown) => void) => () => void;
}

/**
 * 服务器复制接口
 * 用于服务器向客户端发送复制数据
 * 支持单播、广播和多播等多种发送模式
 */
export interface ServerReplication {
	/**
	 * 向特定玩家发送数据（单播）
	 * @param player - 目标玩家实例
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fire: (player: Player, value: unknown) => void;

	/**
	 * 向所有玩家广播数据
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fireAll: (value: unknown) => void;

	/**
	 * 向除了指定玩家外的所有玩家发送数据
	 * @param except - 要排除的玩家实例
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fireExcept: (except: Player, value: unknown) => void;

	/**
	 * 向指定的玩家列表发送数据（多播）
	 * @param list - 目标玩家数组
	 * @param value - 要发送的复制数据
	 * @returns 无返回值
	 */
	fireList: (list: Player[], value: unknown) => void;
}

/**
 * 默认的网络适配器实现
 * 使用 RemoteEvent 进行通信的基础实现
 * 可以作为自定义网络适配器的参考示例
 */
export class DefaultNetworkAdapter implements INetworkAdapter {
	private remoteEvent?: RemoteEvent;

	/**
	 * 构造默认网络适配器
	 * 在实际使用中需要配置 RemoteEvent 实例
	 * 可以通过继承此类并覆盖构造函数来提供自定义的 RemoteEvent
	 * @example
	 * ```typescript
	 * const ReplicatedStorage = game.GetService("ReplicatedStorage");
	 * const adapter = new DefaultNetworkAdapter();
	 * // 需要手动设置 remoteEvent 或继承并初始化
	 * ```
	 */
	constructor() {
		// 在实际使用中，这里会创建或获取 RemoteEvent
		// 例如：
		// const ReplicatedStorage = game.GetService("ReplicatedStorage");
		// this.remoteEvent = ReplicatedStorage.FindFirstChild("ReplicationEvent") as RemoteEvent;
	}

	/**
	 * 向特定玩家发送数据
	 * @param player - 目标玩家
	 * @param value - 要发送的数据
	 * @returns 无返回值
	 */
	fire = (player: Player, value: unknown): void => {
		// 实现向特定玩家发送数据
		if (this.remoteEvent) {
			this.remoteEvent.FireClient(player, value);
		}
	};

	/**
	 * 向所有玩家发送数据
	 * @param value - 要发送的数据
	 * @returns 无返回值
	 */
	fireAll = (value: unknown): void => {
		// 实现向所有玩家发送数据
		if (this.remoteEvent) {
			this.remoteEvent.FireAllClients(value);
		}
	};

	/**
	 * 向除特定玩家外的所有玩家发送数据
	 * @param except - 排除的玩家
	 * @param value - 要发送的数据
	 * @returns 无返回值
	 */
	fireExcept = (except: Player, value: unknown): void => {
		// 实现向除特定玩家外的所有玩家发送数据
		const Players = game.GetService("Players");
		for (const player of Players.GetPlayers()) {
			if (player !== except) {
				this.fire(player, value);
			}
		}
	};

	/**
	 * 向玩家列表发送数据
	 * @param list - 玩家列表
	 * @param value - 要发送的数据
	 * @returns 无返回值
	 */
	fireList = (list: Player[], value: unknown): void => {
		// 实现向玩家列表发送数据
		for (const player of list) {
			this.fire(player, value);
		}
	};

	/**
	 * 获取事件源供客户端使用
	 * 返回的 RemoteEvent 可用于 Matter Hooks 的 useEvent
	 * @returns RemoteEvent 实例，如果未初始化则返回 undefined
	 */
	getEventSource(): RemoteEvent | undefined {
		// 返回 RemoteEvent 以便 useEvent 使用
		return this.remoteEvent;
	}
}

/**
 * 模拟网络适配器（用于单元测试）
 * 提供测试环境下的网络模拟功能，记录发送的消息并支持模拟接收
 * 主要用于单元测试验证网络行为
 */
export class MockNetworkAdapter implements INetworkAdapter {
	/** 发送的消息记录数组，用于测试验证发送行为 */
	public sentMessages: Array<{ type: string; player?: Player; value: unknown }> = [];

	/** 待处理的数据队列，用于模拟接收到的数据 */
	private pendingData: Array<defined> = [];

	/**
	 * 向特定玩家发送数据（测试模式）
	 * 记录发送操作而不实际发送
	 * @param player - 目标玩家实例
	 * @param value - 要发送的测试数据
	 * @returns 无返回值
	 */
	fire = (player: Player, value: unknown): void => {
		this.sentMessages.push({ type: "fire", player, value });
	};

	/**
	 * 向所有玩家发送数据（测试模式）
	 * 记录广播操作而不实际发送
	 * @param value - 要发送的测试数据
	 * @returns 无返回值
	 */
	fireAll = (value: unknown): void => {
		this.sentMessages.push({ type: "fireAll", value });
	};

	/**
	 * 向除特定玩家外的所有玩家发送数据（测试模式）
	 * 记录排除发送操作而不实际发送
	 * @param except - 要排除的玩家实例
	 * @param value - 要发送的测试数据
	 * @returns 无返回值
	 */
	fireExcept = (except: Player, value: unknown): void => {
		this.sentMessages.push({ type: "fireExcept", player: except, value });
	};

	/**
	 * 向玩家列表发送数据（测试模式）
	 * 记录多播操作而不实际发送
	 * @param list - 目标玩家数组
	 * @param value - 要发送的测试数据
	 * @returns 无返回值
	 */
	fireList = (list: Player[], value: unknown): void => {
		this.sentMessages.push({ type: "fireList", value });
	};

	/**
	 * 获取事件源（测试模式）
	 * 测试环境不使用真实的 RemoteEvent
	 * @returns 始终返回 undefined
	 */
	getEventSource(): RemoteEvent | undefined {
		// 模拟环境不返回真实的 RemoteEvent
		return undefined;
	}

	/**
	 * 获取待处理的数据（测试专用）
	 * 返回所有待处理的数据并清空队列
	 * @returns 待处理的数据数组
	 */
	getPendingData(): Array<unknown> {
		const data = [...this.pendingData] as Array<unknown>;
		this.pendingData = [];
		return data;
	};

	/**
	 * 模拟接收数据（测试专用）
	 * 将数据添加到待处理队列中
	 * @param value - 要模拟接收的数据
	 * @returns 无返回值
	 */
	simulateReceive(value: unknown): void {
		if (value !== undefined) {
			this.pendingData.push(value as defined);
		}
	}

	/**
	 * 清空已发送的消息记录（测试专用）
	 * 用于测试用例之间的清理
	 * @returns 无返回值
	 */
	clearMessages(): void {
		this.sentMessages.clear();
	}
}

/**
 * 默认的复制网络接口实例
 * 提供向后兼容的全局网络适配器实例
 * 在实际项目中应该使用自定义的网络适配器替代
 * @deprecated 建议通过依赖注入传递网络适配器而非使用全局实例
 */
export const Replication = new DefaultNetworkAdapter() as INetworkAdapter;