/**
 * Name - 实体名称组件
 * 对应 Rust bevy_ecs/src/name.rs
 *
 * 用于标识实体的组件，存储名称的哈希以实现更快的比较
 * 每次更新名称时都会重新计算哈希
 */

import { component, World, Entity } from "@rbxts/matter";

/**
 * 简单的哈希函数
 * 用于替代 Rust 的 FixedHasher
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.size(); i++) {
		const char = str.byte(i)[0];
		hash = ((hash << 5) - hash + char) | 0;
	}
	return hash >>> 0; // 确保是无符号整数
}

/**
 * Name 组件类
 * 对应 Rust Name struct (name.rs:50-53)
 *
 * 用于标识实体。存储哈希以实现更快的比较。
 * 每次更新名称时都会急切地重新计算哈希。
 *
 * Name 不应被视为实体的全局唯一标识符，
 * 因为多个实体可以具有相同的名称。
 * 应该使用 Entity ID 作为默认的唯一标识符。
 */
export class Name {
	/** 名称的哈希值（用于快速比较） */
	private hash: number;
	/** 实际的名称字符串 */
	private name: string;

	/**
	 * 创建新的 Name
	 * 对应 Rust Name::new (name.rs:65-70)
	 */
	constructor(name: string) {
		this.name = name;
		this.hash = hashString(name);
	}

	/**
	 * 创建新的 Name 实例
	 * 对应 Rust Name::new
	 */
	static create(name: string): Name {
		return new Name(name);
	}

	/**
	 * 设置实体的名称
	 * 对应 Rust Name::set (name.rs:75-78)
	 * 内部哈希将被重新计算
	 */
	set(name: string): void {
		this.name = name;
		this.hash = hashString(name);
	}

	/**
	 * 就地修改实体的名称
	 * 对应 Rust Name::mutate (name.rs:85-88)
	 */
	mutate(f: (name: string) => string): void {
		this.name = f(this.name);
		this.hash = hashString(this.name);
	}

	/**
	 * 获取实体的名称
	 * 对应 Rust Name::as_str (name.rs:92-94)
	 */
	asStr(): string {
		return this.name;
	}

	/**
	 * 获取名称（便捷方法）
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * 获取哈希值
	 */
	getHash(): number {
		return this.hash;
	}

	/**
	 * 比较两个 Name 是否相等
	 * 首先比较哈希，然后比较字符串
	 */
	equals(other: Name): boolean {
		return this.hash === other.hash && this.name === other.name;
	}

	/**
	 * 转换为字符串
	 * 对应 Rust Display trait (name.rs:101-106)
	 */
	toString(): string {
		return this.name;
	}

	/**
	 * 调试输出
	 * 对应 Rust Debug trait (name.rs:108-113)
	 */
	toDebugString(): string {
		return `Name("${this.name}")`;
	}

	/**
	 * 克隆 Name
	 */
	clone(): Name {
		return new Name(this.name);
	}

	/**
	 * 默认值
	 * 对应 Rust Default trait (name.rs:55-59)
	 */
	static default(): Name {
		return new Name("");
	}
}

/**
 * 创建 Name 组件（用于 Matter ECS）
 * 这个组件存储实体的名称数据
 */
export const NameComponent = component<{ name: Name }>("Name");

/**
 * 辅助函数：为实体添加名称
 */
export function withName(world: World, entity: Entity, name: string): void {
	world.insert(entity, NameComponent({ name: new Name(name) }));
}

/**
 * 辅助函数：获取实体的名称
 */
export function getEntityName(world: World, entity: Entity): string | undefined {
	const nameData = world.get(entity, NameComponent);
	if (nameData && "name" in nameData) {
		return nameData.name.getName();
	}
	return undefined;
}

/**
 * 辅助函数：获取实体的名称或 ID
 * 类似于 Rust 的 NameOrEntity
 */
export function getNameOrEntity(world: World, entity: Entity): string {
	const name = getEntityName(world, entity);
	return name !== undefined ? name : `Entity(${entity})`;
}