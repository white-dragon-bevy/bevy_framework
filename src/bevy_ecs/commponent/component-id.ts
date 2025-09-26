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
export function getComponentId<T>(descriptor:TypeDescriptor):ComponentId{
    let componentIdMap = scriptComponentIdMap.get(descriptor.id)
    if(!componentIdMap){
        componentIdMap = new Map();
        scriptComponentIdMap.set(descriptor.id, componentIdMap);
    }
    let componentId = componentIdMap.get(descriptor.text)
    if(!componentId){
        componentId = componentIdCounter++
        componentIdMap.set(descriptor.text, componentId)
    }
    return componentId
}