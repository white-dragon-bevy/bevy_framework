/**
 * 测试辅助工具模块
 * 提供测试环境配置和工具函数
 */

import { App } from "../app";

/**
 * 测试配置
 */
export const TestConfig = {
	/** 是否禁用模糊执行顺序警告 */
	suppressAmbiguityWarnings: true,

	/** 是否禁用资源命令警告 */
	suppressResourceWarnings: true,

	/** 测试超时时间（毫秒） */
	testTimeout: 5000,
} as const;

/**
 * 测试环境设置（简化版）
 */
export class TestEnvironment {
	private static isTestMode = false;
	private static cleanupFns: Array<() => void> = [];

	/**
	 * 设置测试环境
	 */
	static setup(options?: { suppressWarnings?: boolean; suppressPatterns?: string[] }): void {
		this.isTestMode = true;
		// 实际的警告抑制通过各模块的配置选项实现
	}

	/**
	 * 清理测试环境
	 */
	static teardown(): void {
		this.isTestMode = false;
		// 执行所有清理函数
		for (const fn of this.cleanupFns) {
			fn();
		}
		this.cleanupFns = [];
		// 重置系统计数器
		resetSystemCounter();
	}

	/**
	 * 注册清理函数
	 */
	static registerCleanup(fn: () => void): void {
		this.cleanupFns.push(fn);
	}

	/**
	 * 检查是否在测试模式
	 */
	static isInTestMode(): boolean {
		return this.isTestMode;
	}
}

/**
 * 带警告抑制的测试执行器（简化版）
 */
export function runTestQuietly(testFn: () => void): void {
	TestEnvironment.setup({ suppressWarnings: true });
	try {
		testFn();
	} finally {
		TestEnvironment.teardown();
	}
}

/**
 * 创建带唯一名称的系统
 */
let systemCounter = 0;
export function createNamedSystem(name: string, fn: () => void): { name: string; system: () => void } {
	systemCounter++;
	return {
		name: `${name}_${systemCounter}`,
		system: fn,
	};
}

/**
 * 重置系统计数器（用于测试之间）
 */
export function resetSystemCounter(): void {
	systemCounter = 0;
}

/**
 * 创建测试用 App 实例
 */
export function createTestApp(): App {
	return App.create();
}
