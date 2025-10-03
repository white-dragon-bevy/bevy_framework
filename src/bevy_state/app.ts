/**
 * app.ts - 状态系统与 App 的集成接口
 * 对应 Rust bevy_state/src/app.rs
 *
 * 提供将状态系统集成到 App 的扩展方法
 */

import { Modding } from "@flamework/core";
import { States } from "./states";
import { FreelyMutableState } from "./resources";
import { ComputedStates } from "./computed-states";
import { SubStates } from "./sub-states";

/**
 * App 状态扩展接口
 * 对应 Rust AppExtStates trait
 *
 * **用途**: 提供将状态系统集成到 App 的便捷方法
 */
export interface AppExtStates {
	/**
	 * 初始化状态，使用默认值
	 * 对应 Rust App::init_state
	 *
	 * **功能**:
	 * - 添加 State<S> 和 NextState<S> 资源
	 * - 启用 OnEnter、OnTransition、OnExit 调度
	 * - 在 StateTransition 调度中处理状态转换
	 *
	 * **注意**: 此方法是幂等的，重复调用相同类型不会产生效果
	 *
	 * @returns App 实例，支持链式调用
	 */
	initState<S extends FreelyMutableState>(defaultState: () => S): this;

	/**
	 * 插入状态，使用指定初始值
	 * 对应 Rust App::insert_state
	 *
	 * **功能**:
	 * - 添加 State<S> 和 NextState<S> 资源
	 * - 启用 OnEnter、OnTransition、OnExit 调度
	 * - 如果状态已存在，会覆盖之前的状态
	 *
	 * @param state - 初始状态实例
	 * @returns App 实例，支持链式调用
	 */
	insertState<S extends FreelyMutableState>(state: S): this;

	/**
	 * 添加计算状态
	 * 对应 Rust App::add_computed_state
	 *
	 * **功能**:
	 * - 注册计算状态的更新系统
	 * - 在 StateTransition 调度中自动更新计算状态
	 *
	 * **注意**: 此方法是幂等的，重复调用相同类型不会产生效果
	 *
	 * @param sourceType - 源状态类型构造函数
	 * @param computedType - 计算状态类型构造函数
	 * @returns App 实例，支持链式调用
	 */
	addComputedState<TSource extends States, TComputed extends ComputedStates<TSource>>(
		sourceType: new () => TSource,
		computedType: new () => TComputed,
	): this;

	/**
	 * 添加子状态
	 * 对应 Rust App::add_sub_state
	 *
	 * **功能**:
	 * - 注册子状态管理系统
	 * - 在父状态改变时自动创建/销毁子状态
	 * - 处理子状态转换逻辑
	 *
	 * **注意**: 此方法是幂等的，重复调用相同类型不会产生效果
	 *
	 * @param subStateClass - 子状态类构造函数
	 * @returns App 实例，支持链式调用
	 */
	addSubState<TParent extends States, TSub extends SubStates<TParent>>(subStateClass: new () => TSub): this;
}

/**
 * 为 App 类扩展状态管理方法
 *
 * **实现说明**:
 * - 所有方法通过插件系统实现，确保功能模块化和可重用
 * - 方法是幂等的：StatesPlugin 自身会检查状态是否已存在
 *
 * **使用示例**:
 * ```typescript
 * // 使用独立函数版本（推荐）
 * import { initState, insertState, addComputedState, addSubState } from "@rbxts/bevy_state";
 *
 * // 初始化状态（使用默认值）
 * initState(app, () => GameState.Menu);
 *
 * // 插入状态（指定初始值）
 * insertState(app, GameState.Loading);
 *
 * // 添加计算状态
 * addComputedState(app, BaseState, ComputedState);
 *
 * // 添加子状态
 * addSubState(app, SubStateClass);
 * ```
 */
declare module "../bevy_app/app" {
	interface App extends AppExtStates {
		/**
		 * 初始化状态，使用默认值
		 *
		 * **注意**: @claudecode, @cursor - 这是一个宏方法，Modding.* 类型参数由编译器自动提供
		 * @metadata macro
		 *
		 * @param defaultState - 默认状态工厂函数
		 * @param id - 状态类型标识符（由宏自动提供）
		 * @param text - 状态类型文本描述（由宏自动提供）
		 * @returns App 实例，支持链式调用
		 */
		initState<S extends FreelyMutableState>(
			defaultState: () => S,
			id?: Modding.Generic<S, "id">,
			text?: Modding.Generic<S, "text">,
		): this;

		/**
		 * 插入状态，使用指定初始值
		 *
		 * **注意**: @claudecode, @cursor - 这是一个宏方法，Modding.* 类型参数由编译器自动提供
		 * @metadata macro
		 *
		 * @param state - 初始状态实例
		 * @param id - 状态类型标识符（由宏自动提供）
		 * @param text - 状态类型文本描述（由宏自动提供）
		 * @returns App 实例，支持链式调用
		 */
		insertState<S extends FreelyMutableState>(
			state: S,
			id?: Modding.Generic<S, "id">,
			text?: Modding.Generic<S, "text">,
		): this;

		/**
		 * 添加计算状态
		 *
		 * **注意**: @claudecode, @cursor - 这是一个宏方法，Modding.* 类型参数由编译器自动提供
		 * @metadata macro
		 *
		 * @param sourceType - 源状态类型构造函数
		 * @param computedType - 计算状态类型构造函数
		 * @param sid - 源状态类型标识符（由宏自动提供）
		 * @param stext - 源状态类型文本描述（由宏自动提供）
		 * @param cid - 计算状态类型标识符（由宏自动提供）
		 * @param ctext - 计算状态类型文本描述（由宏自动提供）
		 * @returns App 实例，支持链式调用
		 */
		addComputedState<TSource extends States, TComputed extends ComputedStates<TSource>>(
			sourceType: new () => TSource,
			computedType: new () => TComputed,
			sid?: Modding.Generic<TSource, "id">,
			stext?: Modding.Generic<TSource, "text">,
			cid?: Modding.Generic<TComputed, "id">,
			ctext?: Modding.Generic<TComputed, "text">,
		): this;

		/**
		 * 添加子状态
		 *
		 * **注意**: @claudecode, @cursor - 这是一个宏方法，Modding.* 类型参数由编译器自动提供
		 * @metadata macro
		 *
		 * @param subStateClass - 子状态类构造函数
		 * @param pid - 父状态类型标识符（由宏自动提供）
		 * @param ptext - 父状态类型文本描述（由宏自动提供）
		 * @param sid - 子状态类型标识符（由宏自动提供）
		 * @param stext - 子状态类型文本描述（由宏自动提供）
		 * @returns App 实例，支持链式调用
		 */
		addSubState<TParent extends States, TSub extends SubStates<TParent>>(
			subStateClass: new () => TSub,
			pid?: Modding.Generic<TParent, "id">,
			ptext?: Modding.Generic<TParent, "text">,
			sid?: Modding.Generic<TSub, "id">,
			stext?: Modding.Generic<TSub, "text">,
		): this;
	}
}

// 重新导出独立函数实现
// 注意：insertState 与 commands.ts 中的命令函数同名，使用别名导出
export {
	initState as appInitState,
	insertState as appInsertState,
	addComputedState as appAddComputedState,
	addSubState as appAddSubState,
} from "./app-impl";
