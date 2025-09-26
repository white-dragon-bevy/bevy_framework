/**
 * use flame user macros to get the reflection
 * https://flamework.fireboltofdeath.dev/docs/modding/guides/user-macros
 */

import { Modding } from "@flamework/core";


export type TypeDescriptor ={
    id:string,
    text:string
}

export type ParameterDescriptor = TypeDescriptor

export type FunctionInfo = {
    Parameters:ParameterDescriptor[],
    CallerUuid:string
}

/** 
 * 获取指定类型的唯一标识符
 * 
 * 调用该函数的代码行, 将在编译成lua后, 自动替换参数.
 * 
 * 举例说明:
 * 
 * ts: getTypeId<number>()
 * luau: getTypeId("$p:number", "number")
 * 
 * ts: interface Foo<T>{}; getTypeId<Foo<number>>()
 * luau: getTypeId("@white-dragon-bevy/bevy_framework:utils/reflect@Foo", "Foo<number>")
 * 
 * ts: interface Foo<T>{}; getTypeId<Foo<Foo<number>>>()
 * luau: getTypeId("@white-dragon-bevy/bevy_framework:utils/reflect@Foo", "Foo<Foo<number>>")
 * 
 * 这是个例子
 * 
 * @metadata macro 
 * */
export function ___getTypeDescriptor<T>(id?:Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">):ParameterDescriptor|undefined {
	return getTypeDescriptor(id,text)
}


export function getTypeDescriptor(
    id?: string,
    text?: string,
):ParameterDescriptor|undefined { 
    id = id!
    text = text!

    if(id===undefined || id==="$p:never"){
        return undefined
    }

    return {
        id,text
    }
 }



/** 
 * 获取指定 func 的信息.
 * 原理同上.
 * 调用此函数后, 将会返回 ParameterDescriptor 数组和 caller uuid
 * 这是个例子
 * @metadata macro 
 * */
export function ___getFunctionInfo<
    A=never,
    B=never,
    C=never,
    D=never,
    E=never,
    F=never,
    G=never,
    H=never,
    I=never,
>(
    func: (arg: A,arg2: B,arg3: C,arg4:D,arg5:E) => void,
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
	uuid?:Modding.Caller<"uuid">

):FunctionInfo {
    const a = getTypeDescriptor(id_a,text_a)
    const b = getTypeDescriptor(id_b,text_b)
    const c = getTypeDescriptor(id_c,text_c)
    const d = getTypeDescriptor(id_d,text_d)
    const e = getTypeDescriptor(id_e,text_e)
    const f = getTypeDescriptor(id_f,text_f)
    const g = getTypeDescriptor(id_g,text_g)
    const h = getTypeDescriptor(id_h,text_h)
    const i = getTypeDescriptor(id_i,text_i)
    
    return {
		Parameters:[a!,b!,c!,d!,e!,f!,g!,h!,i!],
		CallerUuid:uuid!
	}
}