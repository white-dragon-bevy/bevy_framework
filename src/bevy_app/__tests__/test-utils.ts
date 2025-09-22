/**
 * 测试工具函数
 * 提供更好的测试系统管理
 */

/**
 * 创建带有明确依赖的测试系统链
 */
export function createSystemChain(
	baseName: string,
	systems: Array<() => void>,
): Array<{ name: string; system: () => void; dependencies?: string[] }> {
	const result: Array<{ name: string; system: () => void; dependencies?: string[] }> = [];

	for (let i = 0; i < systems.size(); i++) {
		const name = `${baseName}_${i}`;
		const dependencies = i > 0 ? [`${baseName}_${i - 1}`] : undefined;

		result.push({
			name,
			system: systems[i],
			dependencies,
		});
	}

	return result;
}

/**
 * 创建带唯一名称的系统
 */
let systemIdCounter = 0;
export function createNamedSystem(name: string, fn: () => void): { name: string; system: () => void } {
	systemIdCounter++;
	return {
		name: `${name}_${systemIdCounter}`,
		system: fn,
	};
}

/**
 * 创建有序的系统组 (自动添加 before/after 依赖)
 */
export function createOrderedSystems(baseName: string, systems: Array<() => void>) {
	const builders = [];

	for (let i = 0; i < systems.size(); i++) {
		const name = `${baseName}_${i}`;
		const builder = {
			name,
			system: systems[i],
			after: i > 0 ? [`${baseName}_${i - 1}`] : undefined,
		};

		builders.push(builder);
	}

	return builders;
}

/**
 * 测试环境管理器
 */
export class TestEnvironment {
	private static cleanupFunctions: Array<() => void> = [];

	/**
	 * 注册清理函数
	 */
	static registerCleanup(fn: () => void): void {
		this.cleanupFunctions.push(fn);
	}

	/**
	 * 执行所有清理
	 */
	static cleanup(): void {
		for (const fn of this.cleanupFunctions) {
			fn();
		}
		this.cleanupFunctions = [];
		systemIdCounter = 0; // 重置系统计数器
	}
}

/**
 * 创建并行系统组 (无依赖关系，用于测试)
 */
export function createParallelSystems(baseName: string, count: number, systemFn: (index: number) => void) {
	const systems = [];

	for (let i = 0; i < count; i++) {
		const name = `${baseName}_parallel_${i}`;
		systems.push({
			name,
			system: () => systemFn(i),
		});
	}

	return systems;
}

/**
 * 创建有条件的系统
 */
export function createConditionalSystem(name: string, condition: () => boolean, systemFn: () => void) {
	return {
		name,
		system: systemFn,
		runCondition: condition,
	};
}
