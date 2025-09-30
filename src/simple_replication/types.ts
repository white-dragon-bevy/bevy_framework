/**
 * @fileoverview Simple Replication 类型定义
 *
 * 定义简单复制系统所需的类型接口
 */

import { AnyComponent, AnyEntity } from "@rbxts/matter";

/**
 * 组件构造器类型
 */
export type ComponentCtor = () => AnyComponent;

/**
 * 组件名称类型
 */
export type ComponentName = string;

/**
 * 变更日志类型 - 用于跟踪组件数据变化
 */
export type Changelog = Map<string, Map<ComponentName, { data: AnyComponent }>>;

/**
 * 简单复制配置
 */
export interface SimpleReplicationConfig {
	/** 是否启用调试模式 */
	debugEnabled?: boolean;

	/** 是否启用调试信号 */
	debugSignal?: boolean;

	/** 更新速率 (每秒更新次数) */
	updateRate?: number;

	/** 最大包大小 */
	maxPacketSize?: number;

	/** 强制运行模式（主要用于测试） */
	forceMode?: "server" | "client";
}

/**
 * Context 接口简化版
 * 用于系统间传递上下文信息
 */
export interface SimpleContext {
	/** 是否为服务器 */
	readonly IsEcsServer: boolean;

	/** 是否为客户端 */
	readonly IsClient: boolean;

	/** 复制配置 */
	readonly Replicated: {
		/** 复制到所有玩家的组件 */
		ToAllPlayers: Set<ComponentCtor>;

		/** 只复制到自己的组件 */
		ToSelfOnly: Set<ComponentCtor>;
	};

	/** 组件映射 */
	Components: Record<string, ComponentCtor>;

	/**
	 * 获取组件构造器
	 * @param componentName - 组件名称
	 * @returns 组件构造器
	 */
	getComponent: <T extends object = object>(componentName: string) => (data?: T) => AnyComponent;
}

/**
 * State 接口简化版
 * 用于存储系统状态
 */
export interface SimpleState {
	/** 是否启用调试 */
	debugEnabled: boolean;

	/** 是否启用调试信号 */
	debugSignal: boolean;

	/** 实体ID映射表，用于客户端和服务端实体同步 */
	entityIdMap: Map<string, AnyEntity>;

	/** 其他状态数据 */
	[key: string]: unknown;
}

/**
 * 客户端组件
 * 用于标识客户端玩家
 */
export interface ClientComponent extends AnyComponent {
	/** 玩家实例 */
	player: Player;

	/** 是否已加载 */
	loaded: boolean;
}

/**
 * 组件记录
 * 用于追踪组件变化
 */
export interface ComponentRecord<T extends AnyComponent = AnyComponent> {
	/** 旧值 */
	old?: T;

	/** 新值 */
	new?: T;
}

/**
 * 复制数据包
 * 用于网络传输的数据格式
 */
export interface ReplicationPacket {
	/** 时间戳 */
	timestamp: number;

	/** 实体数据 */
	entities: Changelog;

	/** 帧数 */
	frame?: number;
}