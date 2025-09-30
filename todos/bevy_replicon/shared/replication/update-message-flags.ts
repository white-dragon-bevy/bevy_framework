/**
 * @fileoverview 更新消息标志位
 *
 * 定义更新消息中包含哪些数据段的标志位。
 * 使用位标志来高效地表示消息内容。
 *
 * 参考 Rust 实现:
 * bevy-origin-packages/bevy_replicon/src/shared/replication/update_message_flags.rs
 */

/**
 * 更新消息标志位枚举
 *
 * 使用位标志表示消息中包含的数据段。
 * 每个标志占用一个位,可以通过位运算组合多个标志。
 */
export enum UpdateMessageFlags {
	/** 无数据 */
	NONE = 0,

	/** 包含实体映射段 (MAPPINGS) */
	MAPPINGS = 1 << 0, // 0b0001

	/** 包含实体销毁段 (DESPAWNS) */
	DESPAWNS = 1 << 1, // 0b0010

	/** 包含组件移除段 (REMOVALS) */
	REMOVALS = 1 << 2, // 0b0100

	/** 包含组件变更段 (CHANGES) */
	CHANGES = 1 << 3, // 0b1000
}

/**
 * 检查标志位是否包含指定标志
 * @param flags - 标志位
 * @param flag - 要检查的标志
 * @returns 是否包含
 */
export function hasFlag(flags: number, flag: UpdateMessageFlags): boolean {
	return (flags & flag) !== 0;
}

/**
 * 添加标志位
 * @param flags - 当前标志位
 * @param flag - 要添加的标志
 * @returns 新的标志位
 */
export function addFlag(flags: number, flag: UpdateMessageFlags): number {
	return flags | flag;
}

/**
 * 移除标志位
 * @param flags - 当前标志位
 * @param flag - 要移除的标志
 * @returns 新的标志位
 */
export function removeFlag(flags: number, flag: UpdateMessageFlags): number {
	return flags & ~flag;
}

/**
 * 获取所有设置的标志
 * @param flags - 标志位
 * @returns 标志数组
 */
export function getSetFlags(flags: number): Array<UpdateMessageFlags> {
	const result: Array<UpdateMessageFlags> = [];

	if (hasFlag(flags, UpdateMessageFlags.MAPPINGS)) {
		result.push(UpdateMessageFlags.MAPPINGS);
	}

	if (hasFlag(flags, UpdateMessageFlags.DESPAWNS)) {
		result.push(UpdateMessageFlags.DESPAWNS);
	}

	if (hasFlag(flags, UpdateMessageFlags.REMOVALS)) {
		result.push(UpdateMessageFlags.REMOVALS);
	}

	if (hasFlag(flags, UpdateMessageFlags.CHANGES)) {
		result.push(UpdateMessageFlags.CHANGES);
	}

	return result;
}

/**
 * 获取最后一个设置的标志
 * @param flags - 标志位
 * @returns 最后一个标志,如果没有则返回 undefined
 */
export function getLastFlag(flags: number): UpdateMessageFlags | undefined {
	const setFlags = getSetFlags(flags);
	return setFlags.size() > 0 ? setFlags[setFlags.size() - 1] : undefined;
}

/**
 * 标志位转字符串(用于调试)
 * @param flags - 标志位
 * @returns 字符串表示
 */
export function flagsToString(flags: number): string {
	if (flags === UpdateMessageFlags.NONE) {
		return "NONE";
	}

	const parts: Array<string> = [];

	if (hasFlag(flags, UpdateMessageFlags.MAPPINGS)) {
		parts.push("MAPPINGS");
	}

	if (hasFlag(flags, UpdateMessageFlags.DESPAWNS)) {
		parts.push("DESPAWNS");
	}

	if (hasFlag(flags, UpdateMessageFlags.REMOVALS)) {
		parts.push("REMOVALS");
	}

	if (hasFlag(flags, UpdateMessageFlags.CHANGES)) {
		parts.push("CHANGES");
	}

	return parts.join(" | ");
}