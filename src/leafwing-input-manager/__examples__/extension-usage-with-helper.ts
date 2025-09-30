/**
 * InputManagerPlugin 扩展使用示例 - 使用辅助函数方案
 * 展示如何使用辅助函数获得完整的类型提示
 */

import { App, MainScheduleLabel } from "../../bevy_app";
import { InputManagerPlugin } from "../plugin/input-manager-plugin";
import { Actionlike } from "../actionlike";
import { InputMap } from "../input-map/input-map";
import type { AppContext } from "../../bevy_app/context";
import type { InputManagerExtension } from "../plugin/extensions";
import type { BevyWorld } from "../../bevy_ecs/types";
import { KeyCode } from "../user-input/keyboard";

// =============================================================================
// 1. 定义 Action 类型
// =============================================================================

export class PlayerAction implements Actionlike {
	static readonly Jump = new PlayerAction("Jump");
	static readonly Attack = new PlayerAction("Attack");

	private constructor(private readonly value: string) {}

	hash(): string {
		return `PlayerAction:${this.value}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return this.value;
	}
}

// =============================================================================
// 2. 辅助函数 - 类型安全地获取扩展
// =============================================================================

/**
 * 获取输入管理器扩展
 * 提供完整的类型提示和自动补全
 *
 * @param context - App 上下文
 * @param namespace - 扩展命名空间
 * @returns 输入管理器扩展
 *
 * @example
 * ```typescript
 * const playerInput = getInputExtension<PlayerAction>(context, "playerInput");
 * playerInput.spawnWithInput(world, inputMap);  // ← 完整的类型提示
 * ```
 */
export function getInputExtension<A extends Actionlike>(
	context: AppContext,
	namespace: string,
): InputManagerExtension<A> {
	return (context as unknown as Record<string, unknown>)[namespace] as InputManagerExtension<A>;
}

// =============================================================================
// 3. 在系统中使用 - 完整类型提示
// =============================================================================

/**
 * 玩家移动系统
 * 使用辅助函数获得完整的类型提示
 */
function playerMovementSystem(world: BevyWorld, context: AppContext): void {
	// ✅ 使用辅助函数,获得完整的类型提示!
	const playerInput = getInputExtension<PlayerAction>(context, "playerInput");
	//    ^^^^^^^^^^^ 类型: InputManagerExtension<PlayerAction>
	//                ^^^^^^^^^^^^^^^^^^^ IDE 显示所有方法

	// 查询所有玩家实体
	for (const [entityId, data] of playerInput.queryInputEntities(world)) {
		//                          ^^^^^^^^^^^^^^^^^^^ 完整的类型提示和自动补全
		if (data.actionState?.pressed(PlayerAction.Jump)) {
			print(`Player ${entityId} is jumping!`);
		}
	}

	// 创建新实体
	const inputMap = new InputMap<PlayerAction>().insert(
		PlayerAction.Jump,
		new KeyCode(Enum.KeyCode.Space),
	);
	const playerId = playerInput.spawnWithInput(world, inputMap);
	//               ^^^^^^^^^^^ 完整的类型提示

	// 获取实体数据
	const inputData = playerInput.getEntityInputData(world, playerId);
	//                ^^^^^^^^^^^ 完整的类型提示

	// 其他方法也都有完整的类型提示
	playerInput.addInputToEntity(world, playerId, inputMap);
	playerInput.removeInputFromEntity(world, playerId);
}

// =============================================================================
// 4. 更好的实践:在模块级别声明常量
// =============================================================================

// 在模块顶部声明扩展命名空间常量
const PLAYER_INPUT_NS = "playerInput";
const ENEMY_INPUT_NS = "enemyInput";

/**
 * 改进的系统实现
 */
function improvedPlayerSystem(world: BevyWorld, context: AppContext): void {
	// 使用常量,避免硬编码字符串
	const playerInput = getInputExtension<PlayerAction>(context, PLAYER_INPUT_NS);

	// 完整的类型提示和自动补全
	for (const [entityId, data] of playerInput.queryInputEntities(world)) {
		if (data.actionState?.pressed(PlayerAction.Jump)) {
			print(`Player jumping!`);
		}
	}
}

// =============================================================================
// 5. 主函数
// =============================================================================

export function main(): void {
	const app = new App();

	// 注册插件
	app.addPlugin(
		new InputManagerPlugin<PlayerAction, typeof PLAYER_INPUT_NS>(
			{ actionTypeName: "PlayerAction" },
			PLAYER_INPUT_NS,
		),
	);

	// 添加系统
	app.addSystems(MainScheduleLabel.UPDATE, [
		playerMovementSystem as any,
		improvedPlayerSystem as any,
	]);

	app.run();
}