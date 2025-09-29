/**
 * @fileoverview 复制系统的类型定义
 *
 * 提供与浏览器 API 兼容的类型别名
 */

/**
 * Uint8Array 类型别名
 * TODO: 使用 Roblox buffer API 替代
 * 当前使用简单的数组实现
 */
export type Uint8Array = Array<number>;

/**
 * 创建 Uint8Array
 * @param size - 数组大小
 * @returns Uint8Array 实例
 */
export function createUint8Array(size: number): Uint8Array {
	const array: Array<number> = [];
	for (let index = 0; index < size; index++) {
		array.push(0);
	}
	return array;
}

/**
 * 从数组创建 Uint8Array
 * @param data - 源数组
 * @returns Uint8Array 实例
 */
export function fromArray(data: Array<number>): Uint8Array {
	return data;
}

/**
 * 切片 Uint8Array
 * @param data - 源数组
 * @param start - 开始索引
 * @param endIndex - 结束索引
 * @returns 切片后的数组
 */
export function sliceUint8Array(data: Uint8Array, start: number, endIndex: number): Uint8Array {
	const result: Array<number> = [];
	for (let index = start; index < endIndex && index < data.size(); index++) {
		result.push(data[index]);
	}
	return result;
}