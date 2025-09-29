/**
 * 缓存 TypeDescriptor, 用于获取 ComponentId
 * ComponentId 自增
 */

import { TypeDescriptor } from "../../bevy_core"
import { TypeMap } from "../../bevy_core/type-map";

const typeMap: TypeMap<ComponentId> = new TypeMap();
let componentIdCounter = 0;

/**
 * ComponentId , 用于标识组件或者资源的类型
 * 该命名哲学取自 bevy
 */
export type ComponentId = number

/**
 * 获取组件或者资源的ComponentId
 * @param descriptor - 组件或者资源的类型描述
 * @returns 组件或者资源的ComponentId
 */
export function getComponentIdByDescriptor<T>(descriptor:TypeDescriptor):ComponentId{
    assert(descriptor !== undefined, "descriptor is undefined in getComponentIdByDescriptor");
    assert(descriptor.id !== undefined, `descriptor.id is undefined. descriptor=${descriptor}`);

    // 如果有 genericId，使用它和原始 id 的组合作为唯一键
    const text = descriptor.text ?? "";

    if (descriptor.genericId) {
        const combinedId = `${descriptor.genericId}<${descriptor.id}>`;
        return getComponentId(combinedId, text);
    }
    return getComponentId(descriptor.id, text)
}

export function getComponentId(id:string, text:string):ComponentId{
    const normalizedText = text ?? "";
    let componentId = typeMap.get(id, normalizedText)
    if(componentId===undefined){
        componentId = componentIdCounter++
        typeMap.set(componentId, id, normalizedText)
    }
    return componentId
}
