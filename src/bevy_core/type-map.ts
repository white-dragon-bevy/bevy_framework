import { TypeDescriptor } from "./reflect";

/**
 * 使用 TypeDescriptor 作为键的映射表
 * 使用三层Map接口: id -> text -> genericId -> value
 * id 必填, text 和 genericId 是可选的
 * 
 * 为了支持 for...of 迭代，我们维护一个额外的扁平化 Map
 */
export class TypeMap<T> {
	private map = new Map<string, Map<string, Map<string, T>>>();
	// 扁平化的 Map，用于支持迭代，key 是 "id|text|genericId" 的组合，直接存储值
	private flatMap = new Map<string, T>();

	private getOrCreatePath(id: string, text: string): Map<string, T> {
		if (!this.map.has(id)) {
			this.map.set(id, new Map());
		}
		const textMap = this.map.get(id)!;
		if (!textMap.has(text)) {
			textMap.set(text, new Map());
		}
		return textMap.get(text)!;
	}

	// 生成扁平化键的辅助方法
	private getFlatKey(id: string, text: string, genericId: string): string {
		return `${id}|${text}|${genericId}`;
	}

	// 从参数创建 TypeDescriptor
	private createTypeDescriptor(id: string, text: string, genericId: string): TypeDescriptor {
		return {
			id,
			text: text,
			genericId: genericId === '' ? undefined : genericId
		};
	}

	// 从扁平化键解析回 TypeDescriptor
	private parseTypeDescriptor(flatKey: string): TypeDescriptor {
		const parts = flatKey.split('|');
		return {
			id: parts[0],
			text: parts[1],
			genericId: parts[2] === '' ? undefined : parts[2]
		};
	}

	// get 方法重载
	public get(id: string|undefined): T | undefined;
	public get(id: string|undefined, text: string|undefined): T | undefined;
	public get(id: string|undefined, text: string|undefined, genericId: string|undefined): T | undefined;
	public get(typeDescriptor: TypeDescriptor): T | undefined;
	public get(
		idOrTypeDescriptor: (string|undefined) | TypeDescriptor, 
		text?: string, 
		genericId?: string
	): T | undefined {
		if (typeOf(idOrTypeDescriptor)  === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			return this.map.get(id)?.get(text)?.get(genericId);
		}
		if (text === undefined) text = '';
		if (genericId === undefined) genericId = '';
		return this.map.get(idOrTypeDescriptor as string)?.get(text)?.get(genericId);
	}
	
	// has 方法重载
	public has(id:string|undefined): boolean;
	public has(id: string|undefined, text: string|undefined): boolean;
	public has(id: string|undefined, text: string|undefined, genericId: string): boolean;
	public has(typeDescriptor: TypeDescriptor): boolean;
	public has(
		idOrTypeDescriptor: (string|undefined) | TypeDescriptor, 
		text?: string, 
		genericId?: string
	): boolean {
		if (typeOf(idOrTypeDescriptor) === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			return this.map.has(id) && this.map.get(id)!.has(text) && this.map.get(id)!.get(text)!.has(genericId);
		}
		if (text === undefined) text = '';
		if (genericId === undefined) genericId = '';
		return this.map.has(idOrTypeDescriptor as string) && 
			   this.map.get(idOrTypeDescriptor as string)!.has(text) && 
			   this.map.get(idOrTypeDescriptor as string)!.get(text)!.has(genericId);
	}
	
	// set 方法重载
	public set(value: T,id: string|undefined, text?: string|undefined, genericId?: string|undefined): void;
	public set(value: T,typeDescriptor: TypeDescriptor): void;
	public set(
		value: T,
		idOrTypeDescriptor: (string|undefined) | TypeDescriptor, 
		textOrValue?: string | T, 
		genericIdOrUndefined?: string, 
	): void {
		if (typeOf(idOrTypeDescriptor)  === 'table') {
			const { id, text = '', genericId = '' } = idOrTypeDescriptor as TypeDescriptor;
			this.getOrCreatePath(id, text).set(genericId, textOrValue as T);
			// 同步更新扁平化 Map
			const flatKey = this.getFlatKey(id, text, genericId);
			this.flatMap.set(flatKey, textOrValue as T);
		} else  {
			const genericId = genericIdOrUndefined || '';
			const text = textOrValue as string || '';
			this.getOrCreatePath(idOrTypeDescriptor as string, text).set(genericId, value);
			// 同步更新扁平化 Map
			const flatKey = this.getFlatKey(idOrTypeDescriptor as string, text, genericId);
			this.flatMap.set(flatKey, value);
		}
	}
	
	// delete 方法重载
	public delete(id: string|undefined): boolean;
	public delete(id: string|undefined, text: string|undefined): boolean;
	public delete(id: string|undefined, text: string|undefined, genericId: string|undefined): boolean;
	public delete(id: string, text: string, genericId: string): boolean;
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
	
	// clear 方法 - 清空整个 TypeMap
	public clear(): void {
		this.map.clear();
		this.flatMap.clear();
	}
	
	// 迭代器支持 - 使用传统方式避免 roblox-ts 编译器 bug
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

	// 注意：移除了 Symbol.iterator 实现，因为它在 Luau 环境中不工作
	// 使用 getIterableEntries() 方法来获取可迭代的条目

	// 暴露扁平化 Map 的迭代器作为备用方案
	public getIterableEntries(): Array<[TypeDescriptor, T]> {
		const entries: Array<[TypeDescriptor, T]> = [];
		for (const [flatKey, value] of this.flatMap) {
			const typeDescriptor = this.parseTypeDescriptor(flatKey);
			entries.push([typeDescriptor, value]);
		}
		return entries;
	}
	
	// 获取所有条目 - 返回数组形式
	public entries(): Array<[TypeDescriptor, T]> {
		const entries: Array<[TypeDescriptor, T]> = [];
		for (const [flatKey, value] of this.flatMap) {
			const typeDescriptor = this.parseTypeDescriptor(flatKey);
			entries.push([typeDescriptor, value]);
		}
		return entries;
	}
	
	// 获取所有值 - 直接使用 flatMap 的 values
	public values(): T[] {
		const values: T[] = [];
		for (const [_, value] of this.flatMap) {
			(values as defined[]).push(value as defined);
		}
		return values;
	}
	
	// 获取所有键（扁平化键）- 直接使用 flatMap 的 keys
	public keys(): string[] {
		const keys: string[] = [];
		for (const [flatKey, _] of this.flatMap) {
			keys.push(flatKey);
		}
		return keys;
	}
}