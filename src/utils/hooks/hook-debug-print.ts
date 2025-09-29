import { useHookState } from "@rbxts/matter"

const DEBOUNCE_TIME = 10

 function cleanup(storage: {lastPrintTime?: number}){
	return os.clock() < storage.lastPrintTime! + DEBOUNCE_TIME*2
 }


 type DebugPrintStorage = {
	lastPrintTime?: number
 }
/**
 * 防抖调试打印钩子
 * 每次打印后10秒内不再打印
 * @param message - 要打印的消息
 * @param debounceTime - 防抖时间, 默认 10秒
 * @param discriminator - 唯一标识符 (matter 自动附件)
 */
export function usePrintDebounce(message: string,debounceTime:number = DEBOUNCE_TIME,discriminator?:unknown): void {


	const storage = useHookState<DebugPrintStorage>(discriminator, cleanup)

	if(storage.lastPrintTime ===undefined){
		storage.lastPrintTime = 0
	}

	const currentTime = os.clock();

	// 检查是否超过防抖时间（10秒）
	if (currentTime - storage.lastPrintTime >= debounceTime) {
		print(`[debug debounce] ${message}`);
		storage.lastPrintTime = currentTime;
	}
}

