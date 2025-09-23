/**
 * @fileoverview 系统构建器 - 提供便捷的系统配置 API
 */

import { SystemConfigs, extendSystemFunction, extendSystemArray } from "./system-configs";
import type { SystemFunction } from "./types";

/**
 * 创建可配置的系统
 * 为系统函数添加链式配置方法
 *
 * @param system - 系统函数
 * @returns 带有配置方法的系统配置
 *
 * @example
 * const mySystem = system((world) => {
 *   // 系统逻辑
 * });
 *
 * app.addSystems(Update, mySystem.after(otherSystem).runIf(condition));
 */
export function system(systemFn: SystemFunction): SystemConfigs {
	return extendSystemFunction(systemFn);
}

/**
 * 创建可配置的系统数组
 * 为系统数组添加链式配置方法
 *
 * @param systems - 系统函数数组
 * @returns 带有配置方法的系统配置
 *
 * @example
 * const systems = systemArray([system_a, system_b, system_c]);
 *
 * app.addSystems(Update, systems.chain());
 */
export function systemArray(systems: SystemFunction[]): SystemConfigs {
	return extendSystemArray(systems);
}

/**
 * 创建系统链
 * 系统将按顺序依次执行
 *
 * @param systems - 系统函数数组
 * @returns 配置好的系统链
 *
 * @example
 * app.addSystems(Update, chain(system_a, system_b, system_c));
 */
export function chain(...systems: SystemFunction[]): SystemConfigs {
	return new SystemConfigs(systems).chain();
}

/**
 * 创建条件系统
 * 只在条件满足时运行系统
 *
 * @param systemFn - 系统函数
 * @param condition - 运行条件
 * @returns 配置好的条件系统
 *
 * @example
 * app.addSystems(Update, when(mySystem, () => shouldRun));
 */
export function when(systemFn: SystemFunction, condition: (world: any) => boolean): SystemConfigs {
	return new SystemConfigs(systemFn).runIf(condition);
}

/**
 * 创建在某个系统之后运行的系统
 *
 * @param systemFn - 系统函数
 * @param target - 目标系统或系统集
 * @returns 配置好的系统
 *
 * @example
 * app.addSystems(Update, after(mySystem, otherSystem));
 */
export function after(systemFn: SystemFunction, target: SystemFunction | string): SystemConfigs {
	return new SystemConfigs(systemFn).after(target);
}

/**
 * 创建在某个系统之前运行的系统
 *
 * @param systemFn - 系统函数
 * @param target - 目标系统或系统集
 * @returns 配置好的系统
 *
 * @example
 * app.addSystems(Update, before(mySystem, otherSystem));
 */
export function before(systemFn: SystemFunction, target: SystemFunction | string): SystemConfigs {
	return new SystemConfigs(systemFn).before(target);
}

/**
 * 创建属于某个系统集的系统
 *
 * @param systemFn - 系统函数
 * @param set - 系统集名称
 * @returns 配置好的系统
 *
 * @example
 * app.addSystems(Update, inSet(mySystem, "MySystemSet"));
 */
export function inSet(systemFn: SystemFunction, set: string): SystemConfigs {
	return new SystemConfigs(systemFn).inSet(set);
}