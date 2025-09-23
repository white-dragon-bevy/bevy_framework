/**
 * @fileoverview String polyfill utilities for roblox-ts
 * 提供字符串格式化和数字格式化工具函数
 */

/**
 * 在字符串末尾填充字符直到达到指定长度
 * @param str - 要填充的字符串
 * @param targetLength - 目标长度
 * @param padString - 用于填充的字符串，默认为空格
 * @returns 填充后的字符串
 */
export function padEnd(str: string, targetLength: number, padString = " "): string {
	const length = str.size();
	if (length >= targetLength) {
		return str;
	}

	const padLength = targetLength - length;
	let pad = "";
	const padSize = padString.size();

	if (padSize === 0) {
		return str;
	}

	// 重复填充字符串
	const repeatCount = math.ceil(padLength / padSize);
	for (let index = 0; index < repeatCount; index++) {
		pad = pad + padString;
	}

	// 截取到需要的长度
	return str + pad.sub(1, padLength);
}

/**
 * 在字符串开头填充字符直到达到指定长度
 * @param str - 要填充的字符串
 * @param targetLength - 目标长度
 * @param padString - 用于填充的字符串，默认为空格
 * @returns 填充后的字符串
 */
export function padStart(str: string, targetLength: number, padString = " "): string {
	const length = str.size();
	if (length >= targetLength) {
		return str;
	}

	const padLength = targetLength - length;
	let pad = "";
	const padSize = padString.size();

	if (padSize === 0) {
		return str;
	}

	// 重复填充字符串
	const repeatCount = math.ceil(padLength / padSize);
	for (let index = 0; index < repeatCount; index++) {
		pad = pad + padString;
	}

	// 截取到需要的长度
	return pad.sub(1, padLength) + str;
}

/**
 * 将数字格式化为指定小数位数的字符串
 * @param value - 要格式化的数字
 * @param fractionDigits - 小数位数
 * @returns 格式化后的字符串
 */
export function numberToFixed(value: number, fractionDigits: number): string {
	if (fractionDigits < 0 || fractionDigits > 100) {
		error("fractionDigits must be between 0 and 100");
	}

	// 使用 string.format 格式化数字
	return string.format(`%.${fractionDigits}f`, value);
}

/**
 * 检查数字是否为 NaN
 * @param value - 要检查的值
 * @returns 如果是 NaN 返回 true，否则返回 false
 */
export function isNaNPolyfill(value: unknown): boolean {
	// NaN 是唯一不等于自身的值
	return typeIs(value, "number") && value !== value;
}

/**
 * 检查数字是否为有限值
 * @param value - 要检查的值
 * @returns 如果是有限数字返回 true，否则返回 false
 */
export function isFinite(value: unknown): boolean {
	if (!typeIs(value, "number")) {
		return false;
	}
	return value !== math.huge && value !== -math.huge && value === value;
}