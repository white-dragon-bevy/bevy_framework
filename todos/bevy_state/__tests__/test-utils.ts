/**
 * 测试工具函数
 * 提供 testez 兼容的 mock 函数实现
 */

/**
 * Mock 函数接口
 */
export interface MockFunction<T extends (...args: any[]) => any> {
	fn: T;
	wasCalled: () => boolean;
	getCallCount: () => number;
	getLastArgs: () => Parameters<T> | undefined;
	getAllCalls: () => Array<Parameters<T>>;
	getLastCall: () => Parameters<T> | undefined;
	wasCalledWith: (...args: Parameters<T>) => boolean;
	reset: () => void;
}

/**
 * 创建一个 mock 函数用于测试
 * 替代 jest.fn() 的功能
 */
export function createMockFn<T extends (...args: any[]) => any>(
	returnValue?: ReturnType<T>,
): MockFunction<T> {
	let called = false;
	let callCount = 0;
	let lastArgs: Parameters<T> | undefined;
	const allCalls: Array<Parameters<T>> = [];

	const fn = ((...args: Parameters<T>): ReturnType<T> => {
		called = true;
		callCount++;
		lastArgs = args;
		allCalls.push(args);
		return returnValue as ReturnType<T>;
	}) as T;

	return {
		fn,
		wasCalled: () => called,
		getCallCount: () => callCount,
		getLastArgs: () => lastArgs,
		getAllCalls: () => allCalls,
		getLastCall: () => lastArgs,
		wasCalledWith: (...args: Parameters<T>) => {
			for (const call of allCalls) {
				let match = true;
				for (let i = 0; i < args.size(); i++) {
					if (call[i] !== args[i]) {
						match = false;
						break;
					}
				}
				if (match) return true;
			}
			return false;
		},
		reset: () => {
			called = false;
			callCount = 0;
			lastArgs = undefined;
			allCalls.clear();
		},
	};
}

/**
 * 创建一个简单的 spy 函数
 * 记录调用但不改变原函数行为
 */
export function createSpy<T extends (...args: any[]) => any>(
	originalFn: T,
): MockFunction<T> & { restore: () => void } {
	const mock = createMockFn<T>();
	const wrappedFn = ((...args: Parameters<T>): ReturnType<T> => {
		mock.fn(...args);
		return originalFn(...args);
	}) as T;

	return {
		...mock,
		fn: wrappedFn,
		restore: () => {
			// 恢复原函数
		},
	};
}