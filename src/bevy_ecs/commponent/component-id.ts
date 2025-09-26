/**
 * 缓存 TypeDescriptor, 用于获取 ComponentId
 * ComponentId 自增
 */

import { TypeDescriptor } from "../../bevy_core"

const scriptComponentIdMap: Map<string, Map<string, ComponentId>> = new Map();
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
    return getComponentId(descriptor.id, descriptor.text)
}

export function getComponentId(id:string, text:string):ComponentId{
    let componentIdMap = scriptComponentIdMap.get(id)
    if(componentIdMap===undefined){
        componentIdMap = new Map();
        scriptComponentIdMap.set(id, componentIdMap);
    }
    let componentId = componentIdMap.get(text)
    if(componentId===undefined){
        componentId = componentIdCounter++
        componentIdMap.set(text, componentId)
    }
    return componentId
}
