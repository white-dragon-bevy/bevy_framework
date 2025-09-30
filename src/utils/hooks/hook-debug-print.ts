import { useHookState } from "@rbxts/matter"

const DEBOUNCE_TIME = 30

 function cleanup(storage: {lastPrintTime?: number}){
	return os.clock() < storage.lastPrintTime! + DEBOUNCE_TIME*2
 }


 type DebugPrintStorage = {
	lastPrintTime?: number
 }
/**
 * 防抖打印
 * 每次打印后10秒内不再打印
 * @param message - 要打印的消息
 * @param debounceTime - 防抖时间, 默认 10秒
 * @param discriminator - 唯一标识符 (matter 自动附件)
 */
export function usePrintDebounce(message: string,debounceTime:number = DEBOUNCE_TIME,discriminator?:unknown): void {
	// 尝试使用 Hook，如果失败则直接打印（用于测试环境）
	let storage: DebugPrintStorage | undefined;

	try {
		storage = useHookState<DebugPrintStorage>(discriminator, cleanup);
	} catch (e) {
		// 不在系统上下文中，直接打印（用于测试）
		print(`[debug] ${message}`);
		return;
	}

	if(storage.lastPrintTime ===undefined){
		storage.lastPrintTime = 0
	}

	const currentTime = os.clock();

	// 检查是否超过防抖时间（10秒）
	if (currentTime - storage.lastPrintTime >= debounceTime) {
		storage.lastPrintTime = currentTime;
	}
}

