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
    let componentId = typeMap.get(descriptor)
    if(componentId===undefined){
        componentId = componentIdCounter++
        typeMap.set(componentId,descriptor)
    }
    return componentId
}

/**
 * 获取组件或者资源的ComponentId
 * @param id id
 * @param text 
 * @returns ComponentId
 */
/**
 * 重载1：通过 TypeDescriptor 获取 ComponentId
 */
export function getComponentId(descriptor: TypeDescriptor): ComponentId;
/**
 * 重载2：通过 id, text, genericId 获取 ComponentId
 */
export function getComponentId(id: string, text: string, genericId?: string): ComponentId;
/**
 * 实现
 */
export function getComponentId(
    idOrTypeDescriptor: string | TypeDescriptor,
    text?: string,
    genericId?: string
): ComponentId {
    let componentId: ComponentId | undefined;
    // 通过字符串id, text, genericId
    componentId = typeMap.get(idOrTypeDescriptor as string, text, genericId);
    if (componentId === undefined) {
        componentId = componentIdCounter++;
        typeMap.set(componentId, idOrTypeDescriptor as string, text!, genericId);
    }
    return componentId;
}
   