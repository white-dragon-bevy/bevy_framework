/**
 * @fileoverview Simple Replication 类型定义
 *
 * 定义简单复制系统所需的类型接口
 */

import { AnyComponent, AnyEntity } from "@rbxts/matter";

/**
 * 组件构造器类型
 * 用于创建 Matter 组件实例的无参数函数
 */
export type ComponentCtor = () => AnyComponent;

/**
 * 组件名称类型
 * 用于标识组件的字符串键
 */
export type ComponentName = string;

/**
 * 变更日志类型
 * 记录实体和组件的变化，用于网络同步
 * 外层 Map 键为实体 ID 字符串，值为组件变化映射
 * 内层 Map 键为组件名称，值为包含组件数据的对象
 */
export type Changelog = Map<string, Map<ComponentName, { data: AnyComponent }>>;

/**
 * 简单复制配置接口
 * 定义复制系统的行为参数
 */
export interface SimpleReplicationConfig {
	/** 是否启用调试模式，启用后会输出详细的同步日志 */
	debugEnabled?: boolean;

	/** 是否启用调试信号，用于信号级别的调试 */
	debugSignal?: boolean;

	/** 更新速率，表示每秒更新次数，默认为 30 */
	updateRate?: number;

	/** 最大包大小，以字节为单位，默认为 4096 */
	maxPacketSize?: number;

	/** 强制运行模式，主要用于测试环境，可强制为服务器或客户端模式 */
	forceMode?: "server" | "client";
}

/**
 * 简单上下文接口
 * 用于在系统间传递共享的上下文信息和配置
 * 包含运行环境、复制配置、组件映射等核心数据
 */
export interface SimpleContext {
	/** 是否为 ECS 服务器模式 */
	readonly IsEcsServer: boolean;

	/** 是否为客户端模式 */
	readonly IsClient: boolean;

	/** 复制配置，定义哪些组件需要同步以及同步范围 */
	readonly Replicated: {
		/** 需要复制到所有玩家的组件集合 */
		ToAllPlayers: Set<ComponentCtor>;

		/** 只复制到组件所属玩家自己的组件集合 */
		ToSelfOnly: Set<ComponentCtor>;
	};

	/** 组件名称到构造器的映射表 */
	Components: Record<string, ComponentCtor>;

	/**
	 * 根据组件名称获取组件构造器
	 * @param componentName - 组件名称字符串
	 * @returns 返回一个函数，该函数可选地接受数据参数并返回组件实例
	 */
	getComponent: <T extends object = object>(componentName: string) => (data?: T) => AnyComponent;
}

/**
 * 简单状态接口
 * 用于存储系统运行时的状态数据
 * 包括调试标志、实体映射等动态数据
 */
export interface SimpleState {
	/** 是否启用调试模式 */
	debugEnabled: boolean;

	/** 是否启用调试信号 */
	debugSignal: boolean;

	/** 实体 ID 映射表，用于客户端和服务端实体 ID 的对应关系 */
	entityIdMap: Map<string, AnyEntity>;

	/** 其他扩展状态数据的索引签名 */
	[key: string]: unknown;
}

/**
 * 客户端组件接口
 * 用于标识和跟踪连接到服务器的客户端玩家
 * 每个客户端实体都应该有这个组件
 */
export interface ClientComponent extends AnyComponent {
	/** 对应的 Roblox 玩家实例 */
	player: Player;

	/** 玩家是否已完成加载，用于判断是否可以开始同步数据 */
	loaded: boolean;
}

/**
 * 组件记录接口
 * 用于追踪组件的变化状态
 * 包含变化前后的值，用于 Matter 的查询系统
 * @template T - 组件类型，默认为 AnyComponent
 */
export interface ComponentRecord<T extends AnyComponent = AnyComponent> {
	/** 组件的旧值，如果是新添加的组件则为 undefined */
	old?: T;

	/** 组件的新值，如果是被移除的组件则为 undefined */
	new?: T;
}

/**
 * 复制数据包接口
 * 定义通过网络传输的数据包格式
 * 包含时间戳、实体数据和可选的帧数信息
 */
export interface ReplicationPacket {
	/** 数据包创建时的时间戳，用于延迟计算和数据排序 */
	timestamp: number;

	/** 实体变更数据，包含所有需要同步的实体和组件信息 */
	entities: Changelog;

	/** 可选的帧数，用于帧同步或调试 */
	frame?: number;
}