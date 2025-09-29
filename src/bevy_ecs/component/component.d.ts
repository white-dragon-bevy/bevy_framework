import { Modding } from "@flamework/core";
import { None } from "./immutable";

export type AnyComponent = Component<object>;
export type ComponentCtor = () => AnyComponent;

export type ComponentBundle = Array<AnyComponent>;

type Id<T> = T;

type PatchOverride<Base, Overrides> = Id<{
	[K in keyof Base | keyof Overrides]: K extends keyof Overrides
		? Overrides[K]
		: K extends keyof Base
		? Base[K]
		: never;
}>;

type OptionalKeys<T> = { [K in keyof T]: T[K] | None };
type RemoveNoneKeys<T extends object> = { [K in keyof T]: T[K] extends None ? "a" : K };

export type Component<T extends object> = { readonly [K in keyof T]: T[K] } & {
	patch<U extends OptionalKeys<Partial<T>>>(data: U): Component<ExcludeMembers<PatchOverride<T, U>, None>>;
};

export type GenericOfComponent<T> = T extends Component<infer A> ? A : never;

export type DynamicBundle = Array<ComponentCtor>;

export type InferComponents<A extends DynamicBundle> = { [K in keyof A]: ReturnType<A[K]> };

type InferComponents2<A extends DynamicBundle> = A extends []
	? A
	: A extends [infer F, ...infer B]
	? F extends ComponentCtor
		? B extends DynamicBundle
			? [ReturnType<F>, ...InferComponents2<B>]
			: never
		: never
	: never;

export function newComponent<T extends object>(
	name?: string,
	defaultData?: T | (() => T),
): {
	(data?: T): Component<T>;
};

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
): {
	(data?: T): Component<T>;
};
