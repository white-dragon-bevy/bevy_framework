import { TypeDescriptor } from "./reflect";

/**
 * TypeMap - 基于 TypeDescriptor 的高性能映射表
 *
 * ## 功能概述
 *
 * TypeMap 是一个特殊的映射数据结构，专门用于存储以 TypeDescriptor 为键的数据。
 * 它提供了两种访问模式：结构化访问和扁平化访问，以满足不同场景的性能需求。
 *
 * ## 存储结构
 *
 * ### 双重存储机制
 * - **三层 Map 结构**: `id -> text -> genericId -> value`
 *   - 支持层级查询和部分匹配
 *   - 适用于复杂的类型查询场景
 *
 * - **扁平化 Map**: `"id|text|genericId" -> value`
 *   - 提供 O(1) 的直接访问性能
 *   - 支持快速迭代和批量操作
 *
 * ### TypeDescriptor 结构
 * ```typescript
 * interface TypeDescriptor {
 *   id: string;           // 必填：类型标识符
 *   text?: string;        // 可选：文本描述
 *   genericId?: string;   // 可选：泛型标识符
 * }
 * ```
 *
 * ## 访问模式
 *
 * ### 1. 扁平化访问（高性能）
 * ```typescript
 * // 单参数调用，直接使用 flatId
 * map.get("MyType||")                    // 获取
 * map.has("MyType|description|")         // 检查
 * map.set(value, "MyType|description|T") // 设置
 * map.delete("MyType|description|T")     // 删除
 * ```
 *
 * ### 2. 结构化访问（灵活）
 * ```typescript
 * // 多参数调用
 * map.get("MyType", "description", "T")
 * map.set(value, "MyType", "description", "T")
 *
 * // TypeDescriptor 对象调用
 * map.get({ id: "MyType", text: "description", genericId: "T" })
 * map.set(value, { id: "MyType", text: "description", genericId: "T" })
 * ```
 *
 * ## 性能特点
 *
 * - **扁平化访问**: O(1) 时间复杂度，适用于频繁的单点查询
 * - **结构化访问**: 支持部分匹配和层级遍历
 * - **双重同步**: 所有操作自动同步两种存储结构
 * - **内存优化**: 避免重复存储，共享相同的值引用
 *
 * ## 使用场景
 *
 * - ECS 系统中的组件类型注册
 * - 资源管理器中的资源类型映射
 * - 插件系统中的类型依赖管理
 * - 任何需要基于复合键进行高效查询的场景
 *
 * ## 注意事项
 *
 * - flatId 格式: `"id|text|genericId"`，缺失部分用空字符串填充
 * - 所有操作都会自动维护两个存储结构的一致性
 * - 迭代操作基于扁平化 Map，性能更优
 */
export class TypeMap<T> {
	private map: Map<string, Map<string, Map<string, T>>>;
	private flatMap: Map<string, T>;

	constructor() {
		this.map = new Map();
		this.flatMap = new Map();
	}

	/**
	 * 获取或创建指定路径的 Map，用于层级存储
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @returns 泛型 ID 到值的映射表
	 */
	private getOrCreatePath(id: string, text: string): Map<string, T> {
		// 处理 undefined/nil 值
		const normalizedId = id ?? "";
		const normalizedText = text ?? "";

		let idMap = this.map.get(normalizedId);

		if (idMap === undefined) {
			idMap = new Map();
			this.map.set(normalizedId, idMap);
		}

		let textMap = idMap.get(normalizedText);

		if (textMap === undefined) {
			textMap = new Map();
			idMap.set(normalizedText, textMap);
		}

		return textMap;
	}

	/**
	 * 生成扁平化键的辅助方法
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符
	 * @returns 格式为 "id|text|genericId" 的扁平化键
	 */
	private getFlatKey(id: string, text: string, genericId: string): string {
		return `${id}|${text}|${genericId}`;
	}

	/**
	 * 从参数创建 TypeDescriptor 对象
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符
	 * @returns TypeDescriptor 对象
	 */
	private createTypeDescriptor(id: string, text: string, genericId: string): TypeDescriptor {
		return {
			id,
			text: text,
			genericId: genericId === '' ? undefined : genericId
		};
	}

	/**
	 * 从扁平化键解析回 TypeDescriptor 对象
	 * @param flatKey - 格式为 "id|text|genericId" 的扁平化键
	 * @returns 解析后的 TypeDescriptor 对象
	 */
	public parseTypeDescriptor(flatKey: string): TypeDescriptor {
		const parts = flatKey.split('|');
		return {
			id: parts[0],
			text: parts[1],
			genericId: parts[2] === '' ? undefined : parts[2]
		};
	}

	/**
	 * 获取指定类型的值（扁平化访问）
	 * @param flatId - 扁平化键，格式为 "id|text|genericId"
	 * @returns 存储的值，如果不存在则返回 undefined
	 */
	public get(flatId: string): T | undefined;
	/**
	 * 获取指定类型的值（结构化访问）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @returns 存储的值，如果不存在则返回 undefined
	 */
	public get(id: string, text: string|undefined): T | undefined;
	/**
	 * 获取指定类型的值（完整结构化访问）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符
	 * @returns 存储的值，如果不存在则返回 undefined
	 */
	public get(id: string, text: string|undefined, genericId: string|undefined): T | undefined;
	/**
	 * 获取指定类型的值（TypeDescriptor 对象访问）
	 * @param typeDescriptor - 类型描述符对象
	 * @returns 存储的值，如果不存在则返回 undefined
	 */
	public get(typeDescriptor: TypeDescriptor): T | undefined;
	public get(
		idOrTypeDescriptor: (string) | TypeDescriptor,
		text?: string,
		genericId?: string
	): T | undefined {
		if (typeOf(idOrTypeDescriptor)  === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			return this.map.get(id)?.get(text)?.get(genericId);
		}
		assert(idOrTypeDescriptor!==undefined, "idOrTypeDescriptor is undefined");

		// 如果只有一个参数，直接从 flatMap 获取
		if (text === undefined && genericId === undefined) {
			return this.flatMap.get(idOrTypeDescriptor as string);
		}

		if (text === undefined) text = '';
		if (genericId === undefined) genericId = '';
		return this.map.get(idOrTypeDescriptor as string)?.get(text)?.get(genericId);
	}

	/**
	 * 检查指定类型是否存在（扁平化访问）
	 * @param flatId - 扁平化键，格式为 "id|text|genericId"
	 * @returns 如果存在返回 true，否则返回 false
	 */
	public has(flatId: string): boolean;
	/**
	 * 检查指定类型是否存在（结构化访问）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @returns 如果存在返回 true，否则返回 false
	 */
	public has(id: string, text: string): boolean;
	/**
	 * 检查指定类型是否存在（完整结构化访问）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符
	 * @returns 如果存在返回 true，否则返回 false
	 */
	public has(id: string, text: string, genericId: string): boolean;
	/**
	 * 检查指定类型是否存在（TypeDescriptor 对象访问）
	 * @param typeDescriptor - 类型描述符对象
	 * @returns 如果存在返回 true，否则返回 false
	 */
	public has(typeDescriptor: TypeDescriptor): boolean;
	public has(
		idOrTypeDescriptor: (string) | TypeDescriptor,
		text?: string,
		genericId?: string
	): boolean {
		if (typeOf(idOrTypeDescriptor) === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			return this.map.has(id) && this.map.get(id)!.has(text) && this.map.get(id)!.get(text)!.has(genericId);
		}
		assert(idOrTypeDescriptor!==undefined, "idOrTypeDescriptor is undefined");

		// 如果只有一个参数，直接从 flatMap 检查
		if (text === undefined && genericId === undefined) {
			return this.flatMap.has(idOrTypeDescriptor as string);
		}

		if (text === undefined) text = '';
		if (genericId === undefined) genericId = '';
		return this.map.has(idOrTypeDescriptor as string) &&
			   this.map.get(idOrTypeDescriptor as string)!.has(text) &&
			   this.map.get(idOrTypeDescriptor as string)!.get(text)!.has(genericId);
	}

	/**
	 * 设置指定类型的值（扁平化访问）
	 * @param value - 要存储的值
	 * @param flatId - 扁平化键，格式为 "id|text|genericId"
	 */
	public set(value: T, flatId: string): void;
	/**
	 * 设置指定类型的值（结构化访问）
	 * @param value - 要存储的值
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符（可选）
	 */
	public set(value: T, id: string, text: string, genericId?: string|undefined): void;
	/**
	 * 设置指定类型的值（TypeDescriptor 对象访问）
	 * @param value - 要存储的值
	 * @param typeDescriptor - 类型描述符对象
	 */
	public set(value: T, typeDescriptor: TypeDescriptor): void;
	public set(
		value: T,
		idOrTypeDescriptor: (string) | TypeDescriptor,
		textOrValue?: string | T,
		genericIdOrUndefined?: string,
	): void {
		if (typeOf(idOrTypeDescriptor)  === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			this.getOrCreatePath(id, text).set(genericId, value);
			// 同步更新扁平化 Map
			const flatKey = this.getFlatKey(id, text, genericId);
			this.flatMap.set(flatKey, value);
		} else  {
			assert(idOrTypeDescriptor!==undefined, "idOrTypeDescriptor is undefined");

			// 如果只有两个参数（value 和 flatId），直接操作 flatMap 和原始 map
			if (textOrValue === undefined && genericIdOrUndefined === undefined) {
				const flatId = idOrTypeDescriptor as string;
				this.flatMap.set(flatId, value);
				// 解析 flatId 并同步到原始 map
				const typeDescriptor = this.parseTypeDescriptor(flatId);
				const { id, text = '', genericId = '' } = typeDescriptor;
				this.getOrCreatePath(id, text).set(genericId, value);
				return;
			}

			const genericId = genericIdOrUndefined || '';
			const text = textOrValue as string || '';
			this.getOrCreatePath(idOrTypeDescriptor as string, text).set(genericId, value);
			// 同步更新扁平化 Map
			const flatKey = this.getFlatKey(idOrTypeDescriptor as string, text, genericId);
			this.flatMap.set(flatKey, value);
		}
	}

	/**
	 * 删除指定类型的值（扁平化访问）
	 * @param flatId - 扁平化键，格式为 "id|text|genericId"
	 * @returns 如果删除成功返回 true，否则返回 false
	 */
	public delete(flatId: string): boolean;
	/**
	 * 删除指定类型的值（结构化访问）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @returns 如果删除成功返回 true，否则返回 false
	 */
	public delete(id: string|undefined, text: string|undefined): boolean;
	/**
	 * 删除指定类型的值（完整结构化访问，可选参数）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符
	 * @returns 如果删除成功返回 true，否则返回 false
	 */
	public delete(id: string|undefined, text: string|undefined, genericId: string|undefined): boolean;
	/**
	 * 删除指定类型的值（完整结构化访问）
	 * @param id - 类型标识符
	 * @param text - 文本描述
	 * @param genericId - 泛型标识符
	 * @returns 如果删除成功返回 true，否则返回 false
	 */
	public delete(id: string, text: string, genericId: string): boolean;
	/**
	 * 删除指定类型的值（TypeDescriptor 对象访问）
	 * @param typeDescriptor - 类型描述符对象
	 * @returns 如果删除成功返回 true，否则返回 false
	 */
	public delete(typeDescriptor: TypeDescriptor): boolean;
	public delete(
		idOrTypeDescriptor: (string|undefined) | TypeDescriptor,
		text?: string,
		genericId?: string
	): boolean {
		if (typeOf(idOrTypeDescriptor) === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			const result = this.map.get(id)?.get(text)?.delete(genericId) ?? false;
			if (result) {
				// 同步删除扁平化 Map 中的条目
				const flatKey = this.getFlatKey(id, text, genericId);
				this.flatMap.delete(flatKey);
			}
			return result;
		}
		assert(idOrTypeDescriptor!==undefined, "idOrTypeDescriptor is undefined");

		// 如果只有一个参数，直接从 flatMap 删除，同时需要从原始 map 中删除
		if (text === undefined && genericId === undefined) {
			const flatId = idOrTypeDescriptor as string;
			const hasKey = this.flatMap.has(flatId);
			if (hasKey) {
				this.flatMap.delete(flatId);
				// 解析 flatId 并从原始 map 中删除
				const typeDescriptor = this.parseTypeDescriptor(flatId);
				const { id, text = '', genericId = '' } = typeDescriptor;
				this.map.get(id)?.get(text)?.delete(genericId);
			}
			return hasKey;
		}

		if (text === undefined) text = '';
		if (genericId === undefined) genericId = '';
		const result = this.map.get(idOrTypeDescriptor as string)?.get(text)?.delete(genericId) ?? false;
		if (result) {
			// 同步删除扁平化 Map 中的条目
			const flatKey = this.getFlatKey(idOrTypeDescriptor as string, text, genericId);
			this.flatMap.delete(flatKey);
		}
		return result;
	}

	/**
	 * 清空整个 TypeMap，删除所有存储的数据
	 */
	public clear(): void {
		this.map.clear();
		this.flatMap.clear();
	}

	/**
	 * 遍历所有存储的值，对每个值执行回调函数
	 * @param callback - 回调函数，接收值、TypeDescriptor 和 TypeMap 实例
	 */
	public forEach(callback: (value: T, key: TypeDescriptor, map: TypeMap<T>) => void): void {
		this.map.forEach((textMap, id) => {
			textMap.forEach((genericMap, text) => {
				genericMap.forEach((value, genericId) => {
					const typeDescriptor: TypeDescriptor = {
						id,
						text: text,
						genericId: genericId === '' ? undefined : genericId
					};
					callback(value, typeDescriptor, this);
				});
			});
		});
	}

	/**
	 * 获取所有条目的扁平化 Map
	 * @returns 包含所有扁平化键值对的 Map
	 */
	public entries(): Map<string, T> {
		return this.flatMap;
	}

	/**
	 * 获取所有存储的值
	 * @returns 包含所有值的数组
	 */
	public values(): T[] {
		const values: T[] = [];
		for (const [_, value] of this.flatMap) {
			(values as defined[]).push(value as defined);
		}
		return values;
	}

	/**
	 * 获取所有扁平化键
	 * @returns 包含所有扁平化键的数组
	 */
	public keys(): string[] {
		const keys: string[] = [];
		for (const [flatKey, _] of this.flatMap) {
			keys.push(flatKey);
		}
		return keys;
	}
}
