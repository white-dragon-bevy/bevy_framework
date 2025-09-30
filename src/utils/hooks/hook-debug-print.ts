/**
 * @fileoverview Matter Hook 防抖调试打印工具
 * 提供基于 Matter Hooks 的防抖打印功能，避免日志刷屏
 */

import { useHookState } from "@rbxts/matter";

/**
 * 默认防抖时间（秒）
 * 在此时间内相同的消息不会重复打印
 */
const DEBOUNCE_TIME = 30;

/**
 * 防抖打印存储类型
 * 用于记录上次打印时间，实现防抖功能
 */
type DebugPrintStorage = {
	/**
	 * 上次打印的时间戳（os.clock()）
	 */
	lastPrintTime?: number;
};

/**
 * 清理过期的防抖存储
 * 在防抖时间的两倍时间后，存储数据将被清理
 * @param storage - 防抖存储对象
 * @returns 如果存储仍在防抖时间内返回 true，否则返回 false
 */
function cleanup(storage: DebugPrintStorage): boolean {
	return os.clock() < storage.lastPrintTime! + DEBOUNCE_TIME * 2;
}

/**
 * 防抖打印函数，用于避免在短时间内重复打印相同的调试信息
 * 在指定的防抖时间内，同一个 discriminator 的消息只会打印一次
 *
 * 注意：此函数必须在 Matter 系统中使用，利用 Matter Hooks 机制实现防抖
 * 如果在非系统环境中调用，将直接打印消息（用于测试）
 *
 * @param message - 要打印的消息内容
 * @param debounceTime - 防抖时间（秒），默认为 30 秒
 * @param discriminator - 唯一标识符，由 Matter Hook 系统自动提供
 * @returns 无返回值
 * @example
 * ```typescript
 * // 在 Matter 系统中使用
 * function playerMonitorSystem(world: World): void {
 *   for (const [entityId] of world.query(Player)) {
 *     // 每 10 秒最多打印一次
 *     usePrintDebounce(`Player entity: ${entityId}`, 10);
 *   }
 * }
 *
 * // 使用默认 30 秒防抖时间
 * function debugSystem(world: World): void {
 *   usePrintDebounce("System is running");
 * }
 * ```
 */
export function usePrintDebounce(message: string, debounceTime: number = DEBOUNCE_TIME, discriminator?: unknown): void {
	// 尝试使用 Hook，如果失败则直接打印（用于测试环境）
	let storage: DebugPrintStorage | undefined;

	try {
		storage = useHookState<DebugPrintStorage>(discriminator, cleanup);
	} catch (e) {
		// 不在系统上下文中，直接打印（用于测试）
		print(`[debug] ${message}`);
		return;
	}

	if (storage.lastPrintTime === undefined) {
		storage.lastPrintTime = 0;
	}

	const currentTime = os.clock();

	// 检查是否超过防抖时间
	if (currentTime - storage.lastPrintTime >= debounceTime) {
		storage.lastPrintTime = currentTime;
		print(`[debug] ${message}`);
	}
}

