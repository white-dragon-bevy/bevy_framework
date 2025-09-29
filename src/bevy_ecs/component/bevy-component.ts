import { Modding } from "@flamework/core";
import type { Component } from "./component";
import  { newComponent } from "./component";
import { getTypeDescriptor } from "../../bevy_core";

/**
 * 
 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro 
 * 
 * @param name 
 * @param defaultData 
 */
export function bevyComponent<T extends object>(
	defaultData?: T | (() => T),
	id?: Modding.Generic<T, "id">,
	text?: Modding.Generic<T, "text">,
):ReturnType<typeof newComponent<T>>{

    const typeDescriptor = getTypeDescriptor(id,text)

    return newComponent<T>(typeDescriptor?.text,defaultData)
}
