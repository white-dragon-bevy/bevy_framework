/**
 * commands.ts - Commands 扩展方法
 * 对应 Rust bevy_state/src/commands.rs
 *
 * 提供通过命令系统修改状态的接口，支持延迟状态转换
 */

import { Modding } from "@flamework/core";
import { World } from "../bevy_ecs/bevy-world";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { getTypeDescriptor } from "../bevy_core";
import { FreelyMutableState, NextState, State } from "./resources";
import { States } from "./states";

/**
 * 自定义命令类型：设置状态
 */
interface SetStateCommand extends Record<string, unknown> {
	readonly type: "set_state";
	readonly execute: (world: World) => void;
}

/**
 * 自定义命令类型：插入状态
 */
interface InsertStateCommand extends Record<string, unknown> {
	readonly type: "insert_state";
	readonly execute: (world: World) => void;
}

/**
 * 自定义命令类型：移除状态
 */
interface RemoveStateCommand extends Record<string, unknown> {
	readonly type: "remove_state";
	readonly execute: (world: World) => void;
}

/**
 * 设置下一个状态
 *
 * **用途**: 对应 Rust CommandsStatesExt::set_state，通过 NextState<S> 资源请求状态转换
 *
 * **注意**: 此方法是宏文件，所有 Modding.* 类型参数不需要主动提供
 *
 * @metadata macro
 * @param commands - 命令缓冲区实例
 * @param state - 目标状态实例
 * @param id - 状态类型的唯一标识符（由宏自动提供）
 * @param text - 状态类型的文本描述（由宏自动提供）
 */
export function setState<S extends FreelyMutableState>(
	commands: CommandBuffer,
	state: S,
	id?: Modding.Generic<S, "id">,
	text?: Modding.Generic<S, "text">,
): void {
	// 创建命令闭包
	const command: SetStateCommand = {
		type: "set_state",
		execute: (world: World) => {
			// 获取类型描述符
			const typeDescriptor = getTypeDescriptor(id, text);
			assert(
				typeDescriptor,
				`Failed to get TypeDescriptor for state: ${tostring(text)}`,
			);

			// 获取 NextState<S> 资源
			const nextState = world.resources.getResourceByTypeDescriptor<NextState<S>>(typeDescriptor);

			if (nextState !== undefined) {
				// 获取当前待处理状态（用于调试日志）
				const pending = nextState.pending();

				if (pending !== undefined && !pending.equals(state)) {
					print(
						`[bevy_state] Overwriting next state ${tostring(pending.getStateId())} with ${tostring(state.getStateId())}`,
					);
				}

				// 设置下一个状态
				nextState.set(state);
			} else {
				print(
					`[bevy_state] Warning: NextState for ${tostring(text)} not found. State transition will not occur.`,
				);
			}
		},
	};

	// 将命令添加到队列
	commands.queue(command);
}

/**
 * 直接插入状态资源
 *
 * **用途**: 对应 Rust CommandsStatesExt::insert_state，立即插入状态而不经过转换系统
 *
 * **警告**: 此方法跳过正常的状态转换逻辑，可能导致状态不一致
 *
 * **注意**: 此方法是宏文件，所有 Modding.* 类型参数不需要主动提供
 *
 * @metadata macro
 * @param commands - 命令缓冲区实例
 * @param state - 要插入的状态实例
 * @param id - 状态类型的唯一标识符（由宏自动提供）
 * @param text - 状态类型的文本描述（由宏自动提供）
 */
export function insertState<S extends States>(
	commands: CommandBuffer,
	state: S,
	id?: Modding.Generic<S, "id">,
	text?: Modding.Generic<S, "text">,
): void {
	// 创建命令闭包
	const command: InsertStateCommand = {
		type: "insert_state",
		execute: (world: World) => {
			// 创建 State<S> 资源
			const stateResource = State.create(state, id, text);

			// 直接插入资源到 World
			world.resources.insertResourceByTypeDescriptor(stateResource, stateResource.typeDescriptor);
		},
	};

	// 将命令添加到队列
	commands.queue(command);
}

/**
 * 移除状态资源
 *
 * **用途**: 对应 Rust CommandsStatesExt::remove_state，移除 State<S> 和 NextState<S> 资源
 *
 * **警告**: 移除状态后，依赖该状态的系统将无法正常工作
 *
 * **注意**: 此方法是宏文件，所有 Modding.* 类型参数不需要主动提供
 *
 * @metadata macro
 * @param commands - 命令缓冲区实例
 * @param id - 状态类型的唯一标识符（由宏自动提供）
 * @param text - 状态类型的文本描述（由宏自动提供）
 */
export function removeState<S extends States>(
	commands: CommandBuffer,
	id?: Modding.Generic<S, "id">,
	text?: Modding.Generic<S, "text">,
): void {
	// 创建命令闭包
	const command: RemoveStateCommand = {
		type: "remove_state",
		execute: (world: World) => {
			// 获取类型描述符
			const typeDescriptor = getTypeDescriptor(id, text);
			assert(
				typeDescriptor,
				`Failed to get TypeDescriptor for state: ${tostring(text)}`,
			);

			// 移除 State<S> 资源
			world.resources.removeResourceByTypeDescriptor(typeDescriptor);

			// 移除 NextState<S> 资源
			// NextState 的类型描述符需要包装原状态类型描述符
			const nextStateTypeDescriptor = getTypeDescriptor(id, text);

			if (nextStateTypeDescriptor !== undefined) {
				world.resources.removeResourceByTypeDescriptor(nextStateTypeDescriptor);
			}
		},
	};

	// 将命令添加到队列
	commands.queue(command);
}

/**
 * CommandBuffer 状态扩展方法的辅助包装类
 *
 * **设计说明**:
 * - roblox-ts 不支持 prototype 扩展，因此使用独立函数
 * - 用户应通过以下方式调用：
 *   - setState(commands, state)
 *   - insertState(commands, state)
 *   - removeState<StateType>(commands)
 *
 * **使用示例**:
 * ```typescript
 * import { setState } from "bevy_state";
 *
 * function mySystem(world: World, context: Context) {
 *     const commands = world.commands;
 *     const newState = new GameState("playing");
 *     setState(commands, newState);
 * }
 * ```
 */
