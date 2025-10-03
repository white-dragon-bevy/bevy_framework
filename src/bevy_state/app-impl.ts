/**
 * app-impl.ts - App 状态方法实现（导出函数版本）
 * 对应 Rust bevy_state/src/app.rs
 *
 * 由于 roblox-ts 不支持 prototype 扩展，这里提供独立函数版本
 */

import { Modding } from "@flamework/core";
import { getTypeDescriptor } from "../bevy_core";
import { App } from "../bevy_app/app";
import { States } from "./states";
import { FreelyMutableState, State } from "./resources";
import { ComputedStates } from "./computed-states";
import { SubStates } from "./sub-states";
import { StatesPlugin, ComputedStatesPlugin, SubStatesPlugin } from "./plugin";

/**
 * 初始化状态，使用默认值
 * 对应 Rust App::init_state
 *
 * @param app - App 实例
 * @param defaultState - 默认状态工厂函数
 * @param id - 状态类型标识符（由宏自动提供）
 * @param text - 状态类型文本描述（由宏自动提供）
 * @returns App 实例，支持链式调用
 */
export function initState<S extends FreelyMutableState>(
	app: App,
	defaultState: () => S,
	id?: Modding.Generic<S, "id">,
	text?: Modding.Generic<S, "text">,
): App {
	const typeDescriptor = getTypeDescriptor(id, text);
	assert(
		typeDescriptor,
		"Failed to get TypeDescriptor for state: type descriptor is required for state initialization",
	);

	const resourceManager = app.world().world.resources;
	const existingState = resourceManager.getResourceByTypeDescriptor<State<S>>(typeDescriptor);

	if (existingState) {
		const stateName = typeDescriptor.text;
		warn(`State ${stateName} is already initialized.`);
		return app;
	}

	const plugin = StatesPlugin.create(
		{
			defaultState,
			initOnStartup: true,
		},
		id,
		text,
	);

	app.addPlugin(plugin);
	return app;
}

/**
 * 插入状态，使用指定初始值
 * 对应 Rust App::insert_state
 *
 * @param app - App 实例
 * @param state - 初始状态实例
 * @param id - 状态类型标识符（由宏自动提供）
 * @param text - 状态类型文本描述（由宏自动提供）
 * @returns App 实例，支持链式调用
 */
export function insertState<S extends FreelyMutableState>(
	app: App,
	state: S,
	id?: Modding.Generic<S, "id">,
	text?: Modding.Generic<S, "text">,
): App {
	const typeDescriptor = getTypeDescriptor(id, text);
	assert(
		typeDescriptor,
		"Failed to get TypeDescriptor for state: type descriptor is required for state insertion",
	);

	const resourceManager = app.world().world.resources;
	const existingState = resourceManager.getResourceByTypeDescriptor<State<S>>(typeDescriptor);

	if (existingState) {
		const stateResource = State.create(state, id, text);
		resourceManager.insertResourceByTypeDescriptor(stateResource, typeDescriptor);
		return app;
	}

	const plugin = StatesPlugin.create(
		{
			defaultState: () => state,
			initOnStartup: true,
		},
		id,
		text,
	);

	app.addPlugin(plugin);
	return app;
}

/**
 * 添加计算状态
 * 对应 Rust App::add_computed_state
 *
 * @param app - App 实例
 * @param sourceType - 源状态类型构造函数
 * @param computedType - 计算状态类型构造函数
 * @param sid - 源状态类型标识符（由宏自动提供）
 * @param stext - 源状态类型文本描述（由宏自动提供）
 * @param cid - 计算状态类型标识符（由宏自动提供）
 * @param ctext - 计算状态类型文本描述（由宏自动提供）
 * @returns App 实例，支持链式调用
 */
export function addComputedState<TSource extends States, TComputed extends ComputedStates<TSource>>(
	app: App,
	sourceType: new () => TSource,
	computedType: new () => TComputed,
	sid?: Modding.Generic<TSource, "id">,
	stext?: Modding.Generic<TSource, "text">,
	cid?: Modding.Generic<TComputed, "id">,
	ctext?: Modding.Generic<TComputed, "text">,
): App {
	const computedTypeDescriptor = getTypeDescriptor(cid, ctext);
	assert(
		computedTypeDescriptor,
		"Failed to get TypeDescriptor for computed state: type descriptor is required for computed state registration",
	);

	const resourceManager = app.world().world.resources;
	const existingComputedState = resourceManager.getResourceByTypeDescriptor<State<TComputed>>(computedTypeDescriptor);

	if (existingComputedState) {
		const computedStateName = computedTypeDescriptor.text;
		warn(`Computed state ${computedStateName} is already initialized.`);
		return app;
	}

	const plugin = new (ComputedStatesPlugin as unknown as new (
		sourceType: new () => TSource,
		computedType: new () => TComputed,
	) => ComputedStatesPlugin<TSource, TComputed>)(sourceType, computedType);

	app.addPlugin(plugin);
	return app;
}

/**
 * 添加子状态
 * 对应 Rust App::add_sub_state
 *
 * @param app - App 实例
 * @param subStateClass - 子状态类构造函数
 * @param pid - 父状态类型标识符（由宏自动提供）
 * @param ptext - 父状态类型文本描述（由宏自动提供）
 * @param sid - 子状态类型标识符（由宏自动提供）
 * @param stext - 子状态类型文本描述（由宏自动提供）
 * @returns App 实例，支持链式调用
 */
export function addSubState<TParent extends States, TSub extends SubStates<TParent>>(
	app: App,
	subStateClass: new () => TSub,
	pid?: Modding.Generic<TParent, "id">,
	ptext?: Modding.Generic<TParent, "text">,
	sid?: Modding.Generic<TSub, "id">,
	stext?: Modding.Generic<TSub, "text">,
): App {
	const subTypeDescriptor = getTypeDescriptor(sid, stext);
	assert(
		subTypeDescriptor,
		"Failed to get TypeDescriptor for sub state: type descriptor is required for sub state registration",
	);

	const resourceManager = app.world().world.resources;
	const stateTypeDescriptor = getTypeDescriptor(sid ? `State_${sid}` : undefined, stext ? `State<${stext}>` : undefined);
	const existingSubState = stateTypeDescriptor
		? resourceManager.getResourceByTypeDescriptor<State<TSub>>(stateTypeDescriptor)
		: undefined;

	if (existingSubState) {
		const subStateName = subTypeDescriptor.text;
		warn(`Sub state ${subStateName} is already initialized.`);
		return app;
	}

	const plugin = SubStatesPlugin.create(subStateClass, pid, ptext, sid, stext);
	app.addPlugin(plugin);
	return app;
}
