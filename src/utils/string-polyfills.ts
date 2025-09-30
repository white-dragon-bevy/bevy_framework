/**
 * @fileoverview String polyfill utilities for roblox-ts
 * 提供字符串格式化和数字格式化工具函数
 *
 * 实现了与 JavaScript 标准库类似的字符串和数字处理方法，
 * 并针对 Lua/Roblox 环境进行了适配优化。
 */

/**
 * 在字符串末尾填充字符直到达到指定长度
 * 如果字符串已经达到或超过目标长度，则返回原字符串
 * @param str - 要填充的字符串
 * @param targetLength - 目标长度（字符数）
 * @param padString - 用于填充的字符串，默认为空格
 * @returns 填充后的字符串
 * @example
 * ```typescript
 * padEnd("hello", 10, "*");  // "hello*****"
 * padEnd("world", 8);         // "world   "
 * padEnd("test", 3);          // "test"
 * ```
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
 * 如果字符串已经达到或超过目标长度，则返回原字符串
 * @param str - 要填充的字符串
 * @param targetLength - 目标长度（字符数）
 * @param padString - 用于填充的字符串，默认为空格
 * @returns 填充后的字符串
 * @example
 * ```typescript
 * padStart("42", 5, "0");     // "00042"
 * padStart("test", 8);        // "    test"
 * padStart("long text", 4);   // "long text"
 * ```
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
 * 使用四舍五入方式处理多余的小数位
 * @param value - 要格式化的数字
 * @param fractionDigits - 小数位数，必须在 0-100 之间
 * @returns 格式化后的字符串
 * @example
 * ```typescript
 * numberToFixed(3.14159, 2);   // "3.14"
 * numberToFixed(10, 3);        // "10.000"
 * numberToFixed(1.5, 0);       // "2"
 * ```
 */
export function numberToFixed(value: number, fractionDigits: number): string {
	if (fractionDigits < 0 || fractionDigits > 100) {
		error("fractionDigits must be between 0 and 100");
	}

	// 使用 string.format 格式化数字
	return string.format(`%.${fractionDigits}f`, value);
}

/**
 * 检查数字是否为 NaN (Not a Number)
 * 使用 NaN 唯一不等于自身的特性进行判断
 * @param value - 要检查的值
 * @returns 如果是 NaN 返回 true，否则返回 false
 * @example
 * ```typescript
 * isNaNPolyfill(0 / 0);  // true
 * isNaNPolyfill(123);    // false
 * isNaNPolyfill("abc");  // false
 * ```
 */
export function isNaNPolyfill(value: unknown): boolean {
	// NaN 是唯一不等于自身的值
	return typeIs(value, "number") && value !== value;
}

/**
 * 检查数字是否为有限值（不是无穷大也不是 NaN）
 * @param value - 要检查的值
 * @returns 如果是有限数字返回 true，否则返回 false
 * @example
 * ```typescript
 * isFinite(123);         // true
 * isFinite(math.huge);   // false
 * isFinite(-math.huge);  // false
 * isFinite(0 / 0);       // false
 * ```
 */
export function isFinite(value: unknown): boolean {
	if (!typeIs(value, "number")) {
		return false;
	}
	return value !== math.huge && value !== -math.huge && value === value;
}
