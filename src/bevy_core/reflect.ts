/**
 * 类型反射工具模块
 *
 * 使用 Flamework 用户宏获取 TypeScript 类型的运行时反射信息
 * @see https://flamework.fireboltofdeath.dev/docs/modding/guides/user-macros
 */

import { Modding } from "@flamework/core";

/**
 * 类型描述符接口，用于存储类型的完整元信息
 * @template T - 关联的 TypeScript 类型
 */
export interface TypeDescriptor<T=never> {
	/** 泛型标识符，用于区分泛型类型的具体实例 */
	genericId?: string;
	/** 类型的唯一标识符 */
	id: string;
	/** 类型的文本表示 */
	text: string;
}

/**
 * 参数描述符类型别名，等同于 TypeDescriptor
 */
export type ParameterDescriptor = TypeDescriptor;

/**
 * 函数信息接口，包含函数参数类型和调用位置信息
 */
export type FunctionInfo = {
	/** 函数参数的类型描述符数组 */
	Parameters: ParameterDescriptor[];
	/** 调用者的唯一标识符 */
	CallerUuid: string;
};

/**
 * 获取指定类型的类型描述符（宏函数）
 *
 * 此函数在编译时由 Flamework 宏系统自动替换参数，实现类型到运行时反射的转换
 *
 * @template T - 要获取描述符的类型
 * @param id - 类型的唯一标识符（由宏自动注入）
 * @param text - 类型的文本表示（由宏自动注入）
 * @returns 类型描述符对象，如果类型为 never 则返回 undefined
 *
 * @example
 * ```typescript
 * // TypeScript 代码
 * getTypeDescriptor<number>()
 * // 编译后的 Luau 代码
 * getTypeDescriptor("$p:number", "number")
 *
 * // TypeScript 代码（泛型类型）
 * interface Foo<T>{}
 * getTypeDescriptor<Foo<number>>()
 * // 编译后的 Luau 代码
 * getTypeDescriptor("@package:path@Foo", "Foo<number>")
 * ```
 *
 * @metadata macro
 */
export function ___getTypeDescriptor<T>(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T, "text">): ParameterDescriptor | undefined {
	return getTypeDescriptor(id, text);
}


/**
 * 创建类型描述符对象的工厂函数
 * @param id - 类型的唯一标识符
 * @param text - 类型的文本表示
 * @param genericId - 泛型标识符（可选）
 * @returns 类型描述符对象，如果 id 为 undefined 或 "$p:never" 则返回 undefined
 */
export function getTypeDescriptor(
	id?: string,
	text?: string,
	genericId?: string,
): ParameterDescriptor | undefined {
	if (id === undefined || id === "$p:never") {
		return undefined;
	}

	return {
		genericId: genericId!,
		id,
		text: text!,
	};
}



/**
 * 获取泛型类型的完整描述符（宏函数）
 *
 * 用于提取泛型类型的外层容器类型和内层元素类型信息
 *
 * @template Outer - 外层容器类型（如 Array）
 * @template Inner - 内层元素类型（如 number）
 * @param typeDescriptor - 可选的已有类型描述符，如果提供则为其添加泛型 ID
 * @param innerTypeId - 内层类型的 ID（由宏自动注入）
 * @param innerTypeText - 内层类型的文本表示（由宏自动注入）
 * @param outerTypeId - 外层类型的 ID（由宏自动注入）
 * @param outerTypeText - 外层类型的文本表示（由宏自动注入）
 * @returns 包含外层和内层类型信息的 TypeDescriptor 对象
 *
 * @example
 * ```typescript
 * // 获取 Array<number> 的类型描述符
 * getGenericTypeDescriptor<Array, number>()
 * ```
 *
 * @metadata macro
 */
export function getGenericTypeDescriptor<Outer, Inner = any>(
	typeDescriptor?: TypeDescriptor,
	innerTypeId?: Modding.Generic<Inner, "id">,
	innerTypeText?: Modding.Generic<Inner, "text">,
	outerTypeId?: Modding.Generic<Outer, "id">,
	outerTypeText?: Modding.Generic<Outer, "text">,
): TypeDescriptor {
	if (typeDescriptor) {
		assert(typeDescriptor.genericId === undefined, `${typeDescriptor} should be undefined before set`);
		return {
			...typeDescriptor,
			genericId: outerTypeId!,
		};
	}
	return {
		genericId: outerTypeId!,
		id: innerTypeId!,
		text: innerTypeText!,
	};
}


/**
 * 获取函数的参数类型信息和调用位置（宏函数）
 *
 * 通过宏系统自动提取函数参数的类型描述符和调用位置的唯一标识符
 *
 * @template A - 第一个参数的类型
 * @template B - 第二个参数的类型
 * @template C - 第三个参数的类型
 * @template D - 第四个参数的类型
 * @template E - 第五个参数的类型
 * @template F - 第六个参数的类型
 * @template G - 第七个参数的类型
 * @template H - 第八个参数的类型
 * @template I - 第九个参数的类型
 * @param func - 要分析的函数
 * @param id_a - 参数 A 的 ID（由宏自动注入）
 * @param text_a - 参数 A 的文本表示（由宏自动注入）
 * @param id_b - 参数 B 的 ID（由宏自动注入）
 * @param text_b - 参数 B 的文本表示（由宏自动注入）
 * @param id_c - 参数 C 的 ID（由宏自动注入）
 * @param text_c - 参数 C 的文本表示（由宏自动注入）
 * @param id_d - 参数 D 的 ID（由宏自动注入）
 * @param text_d - 参数 D 的文本表示（由宏自动注入）
 * @param id_e - 参数 E 的 ID（由宏自动注入）
 * @param text_e - 参数 E 的文本表示（由宏自动注入）
 * @param id_f - 参数 F 的 ID（由宏自动注入）
 * @param text_f - 参数 F 的文本表示（由宏自动注入）
 * @param id_g - 参数 G 的 ID（由宏自动注入）
 * @param text_g - 参数 G 的文本表示（由宏自动注入）
 * @param id_h - 参数 H 的 ID（由宏自动注入）
 * @param text_h - 参数 H 的文本表示（由宏自动注入）
 * @param id_i - 参数 I 的 ID（由宏自动注入）
 * @param text_i - 参数 I 的文本表示（由宏自动注入）
 * @param uuid - 调用位置的唯一标识符（由宏自动注入）
 * @returns 包含参数类型描述符数组和调用者 UUID 的 FunctionInfo 对象
 *
 * @example
 * ```typescript
 * function myFunc(a: number, b: string) {}
 * const info = ___getFunctionInfo(myFunc)
 * // info.Parameters 包含 number 和 string 的类型描述符
 * // info.CallerUuid 包含调用位置的唯一标识
 * ```
 *
 * @metadata macro
 */
export function ___getFunctionInfo<
	A = never,
	B = never,
	C = never,
	D = never,
	E = never,
	F = never,
	G = never,
	H = never,
	I = never,
>(
	func: (arg: A, arg2: B, arg3: C, arg4: D, arg5: E) => void,
	id_a?: Modding.Generic<A, "id">,
	text_a?: Modding.Generic<A, "text">,
	id_b?: Modding.Generic<B, "id">,
	text_b?: Modding.Generic<B, "text">,
	id_c?: Modding.Generic<C, "id">,
	text_c?: Modding.Generic<C, "text">,
	id_d?: Modding.Generic<D, "id">,
	text_d?: Modding.Generic<D, "text">,
	id_e?: Modding.Generic<E, "id">,
	text_e?: Modding.Generic<E, "text">,
	id_f?: Modding.Generic<F, "id">,
	text_f?: Modding.Generic<F, "text">,
	id_g?: Modding.Generic<G, "id">,
	text_g?: Modding.Generic<G, "text">,
	id_h?: Modding.Generic<H, "id">,
	text_h?: Modding.Generic<H, "text">,
	id_i?: Modding.Generic<I, "id">,
	text_i?: Modding.Generic<I, "text">,
	uuid?: Modding.Caller<"uuid">,
): FunctionInfo {
	const a = getTypeDescriptor(id_a, text_a);
	const b = getTypeDescriptor(id_b, text_b);
	const c = getTypeDescriptor(id_c, text_c);
	const d = getTypeDescriptor(id_d, text_d);
	const e = getTypeDescriptor(id_e, text_e);
	const f = getTypeDescriptor(id_f, text_f);
	const g = getTypeDescriptor(id_g, text_g);
	const h = getTypeDescriptor(id_h, text_h);
	const i = getTypeDescriptor(id_i, text_i);

	return {
		CallerUuid: uuid!,
		Parameters: [a!, b!, c!, d!, e!, f!, g!, h!, i!],
	};
}
