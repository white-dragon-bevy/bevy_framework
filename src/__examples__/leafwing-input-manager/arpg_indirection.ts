/**
 * ARPG Indirection Example - 双层动作系统
 *
 * 在某些游戏类型（如暗黑破坏神式的 ARPG）中，常见的做法是使用两层动作系统。
 * 第一层对应"技能槽位"（Slot），
 * 第二层对应玩家可以选择绑定到槽位的"技能"（Ability）。
 *
 * 本示例展示如何通过在两个不同的 ActionState 组件之间复制 ActionData 来实现该模式。
 *
 * 对应 Rust bevy 示例：
 * bevy-origin-packages/leafwing-input-manager/examples/arpg_indirection.rs
 */

import { App } from "../../bevy_app/app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	createInputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	MouseButton,
	Actionlike,
	InputManagerExtension,
} from "../../leafwing-input-manager";

// =====================================
// 第一层：技能槽位 (Slot)
// =====================================

/**
 * 技能槽位枚举 - 对应玩家的动作条上的通用"槽位"
 * 类似 ARPG 中的快捷键栏
 */
enum Slot {
	Primary,
	Secondary,
	Ability1,
	Ability2,
	Ability3,
	Ability4,
}

/**
 * 技能槽位的 Actionlike 实现
 */
class SlotActionlike implements Actionlike {
	constructor(public readonly action: Slot) {}

	hash(): string {
		return `Slot:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return Slot[this.action];
	}
}

/**
 * 获取所有槽位变体的迭代器
 * 类似 Rust 中的 Slot::variants()
 */
function getAllSlots(): Array<Slot> {
	return [Slot.Primary, Slot.Secondary, Slot.Ability1, Slot.Ability2, Slot.Ability3, Slot.Ability4];
}

// =====================================
// 第二层：实际技能 (Ability)
// =====================================

/**
 * 技能枚举 - 角色可以使用的实际技能
 * 技能列表通常比槽位列表长
 */
enum Ability {
	Slash,
	Shoot,
	LightningBolt,
	Fireball,
	Dash,
	Heal,
	FrozenOrb,
	PolymorphSheep,
}

/**
 * 技能的 Actionlike 实现
 */
class AbilityActionlike implements Actionlike {
	constructor(public readonly action: Ability) {}

	hash(): string {
		return `Ability:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return Ability[this.action];
	}
}

// =====================================
// 类型扩展声明
// =====================================

declare module "../../bevy_app/context" {
	interface AppContext {
		slotInput: InputManagerExtension<SlotActionlike>;
		abilityInput: InputManagerExtension<AbilityActionlike>;
	}
}

// =====================================
// 组件定义
// =====================================

/**
 * 玩家标记组件
 */
const Player = component<{
	name: string;
}>("Player");

/**
 * 技能槽位映射组件
 * 存储特定玩家的技能与槽位的对应关系
 */
const AbilitySlotMap = component<{
	map: Map<Slot, Ability>;
}>("AbilitySlotMap");

// =====================================
// 插件实例
// =====================================

let slotPlugin: ReturnType<typeof createInputManagerPlugin<SlotActionlike>>;
let abilityPlugin: ReturnType<typeof createInputManagerPlugin<AbilityActionlike>>;

// =====================================
// 系统函数
// =====================================

/**
 * 生成玩家实体并设置输入映射和技能绑定
 * 对应 Rust: spawn_player
 */
function spawnPlayer(world: BevyWorld, context: Context): void {
	print("========================================");
	print("Spawning player with ARPG indirection system");

	// 创建技能槽位映射
	const abilitySlotMapData = new Map<Slot, Ability>();
	abilitySlotMapData.set(Slot.Primary, Ability.Slash);
	abilitySlotMapData.set(Slot.Secondary, Ability.Shoot);
	abilitySlotMapData.set(Slot.Ability1, Ability.FrozenOrb);
	// 有些槽位可以为空！
	abilitySlotMapData.set(Slot.Ability3, Ability.Dash);
	abilitySlotMapData.set(Slot.Ability4, Ability.PolymorphSheep);

	// 创建槽位输入映射
	const slotInputMap = new InputMap<SlotActionlike>()
		.insert(new SlotActionlike(Slot.Ability1), KeyCode.Q)
		.insert(new SlotActionlike(Slot.Ability2), KeyCode.W)
		.insert(new SlotActionlike(Slot.Ability3), KeyCode.E)
		.insert(new SlotActionlike(Slot.Ability4), KeyCode.R)
		.insert(new SlotActionlike(Slot.Primary), MouseButton.left())
		.insert(new SlotActionlike(Slot.Secondary), MouseButton.right());

	// 创建槽位动作状态
	const slotActionState = new ActionState<SlotActionlike>();
	for (const slot of getAllSlots()) {
		slotActionState.registerAction(new SlotActionlike(slot));
	}

	// 创建技能动作状态
	// 注意：我们不需要 InputMap<Ability> 组件，
	// 因为技能从不直接从输入触发，而是通过槽位间接触发
	const abilityActionState = new ActionState<AbilityActionlike>();
	for (const abilityIndex of $range(0, 7)) {
		abilityActionState.registerAction(new AbilityActionlike(abilityIndex as Ability));
	}

	// 使用槽位插件创建实体（带槽位输入组件）
	const entity = slotPlugin.extension!.spawnWithInput(world, slotInputMap, slotActionState);

	// 手动添加技能 ActionState 组件
	const abilityComponents = abilityPlugin.extension!.getComponents();
	world.insert(entity as any, abilityComponents.component({
		actionState: abilityActionState,
		enabled: true,
	}));

	// 添加其他游戏组件
	world.insert(entity as any, Player({ name: "Player1" }));
	world.insert(entity as any, AbilitySlotMap({ map: abilitySlotMapData }));

	print(`Player spawned with entity ID: ${entity}`);
	print("========================================");
	print("ARPG Indirection Example");
	print("Controls:");
	print("  Q/W/E/R - Ability slots 1-4");
	print("  Left Mouse - Primary slot");
	print("  Right Mouse - Secondary slot");
	print("========================================");
}

/**
 * 将槽位的 ActionState 复制到技能的 ActionState
 * 对应 Rust: copy_action_state
 *
 * 这是核心系统，负责同步两个动作状态层
 */
function copyActionState(world: BevyWorld, context: Context): void {
	const slotComponents = slotPlugin.extension!.getComponents();
	const abilityComponents = abilityPlugin.extension!.getComponents();

	// 遍历所有具有技能槽位映射的实体
	for (const [entityId, abilitySlotMap] of world.query(AbilitySlotMap)) {
		// 获取槽位和技能的 ActionState 包装器
		const slotData = world.get(entityId, slotComponents.component);
		const abilityData = world.get(entityId, abilityComponents.component);

		if (!slotData || !abilityData) {
			continue;
		}

		// 提取实际的 ActionState 实例
		const slotActionState = (slotData as unknown as { actionState: ActionState<SlotActionlike> }).actionState;
		const abilityActionState = (
			abilityData as unknown as { actionState: ActionState<AbilityActionlike> }
		).actionState;

		if (!slotActionState || !abilityActionState) {
			continue;
		}

		// 获取映射表
		const mapData = (abilitySlotMap as unknown as { map: Map<Slot, Ability> }).map;

		// 获取槽位的所有动作数据
		const slotActionDataMap = slotActionState.getActionDataMap();

		// 遍历所有槽位，复制 ActionData 到对应的技能
		for (const slot of getAllSlots()) {
			const matchingAbility = mapData.get(slot);

			if (matchingAbility !== undefined) {
				// 获取槽位的 ActionData
				const slotActionlike = new SlotActionlike(slot);
				const slotActionData = slotActionDataMap.get(slotActionlike.hash());

				if (slotActionData) {
					// 复制 ActionData 到技能，包括按键按下/释放的时长等信息
					const abilityActionlike = new AbilityActionlike(matchingAbility);
					abilityActionState.updateFromActionData(abilityActionlike, slotActionData);
				}
			}
		}
	}
}

/**
 * 报告使用的技能
 * 对应 Rust: report_abilities_used
 */
function reportAbilitiesUsed(world: BevyWorld, context: Context): void {
	// 遍历所有具有技能 ActionState 的实体
	for (const [entityId, inputData] of abilityPlugin.extension!.queryInputEntities(world)) {
		const abilityActionState = inputData.actionState;

		if (!abilityActionState || !inputData.enabled) {
			continue;
		}

		// 检查每个技能是否刚刚被按下
		for (const abilityIndex of $range(0, 7)) {
			const abilityActionlike = new AbilityActionlike(abilityIndex as Ability);

			if (abilityActionState.justPressed(abilityActionlike)) {
				const ability = abilityActionlike.action;
				print(`[Player] Used ability: ${Ability[ability]}`);
			}
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

/**
 * 创建并配置应用程序
 */
export function createApp() {
	const app = new App();

	// 添加默认插件组
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 创建并添加槽位输入管理插件
	slotPlugin = createInputManagerPlugin<SlotActionlike>({
		actionTypeName: "Slot",
	});

	// 创建并添加技能输入管理插件
	abilityPlugin = createInputManagerPlugin<AbilityActionlike>({
		actionTypeName: "Ability",
	});

	// 添加插件
	const typedApp = app.addPlugin(slotPlugin).addPlugin(abilityPlugin);

	// 添加系统
	typedApp.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);

	// copy_action_state 需要在 ManualControl 系统之后运行
	// 在我们的架构中，输入处理在 UPDATE 阶段进行
	typedApp.addSystems(MainScheduleLabel.UPDATE, copyActionState);
	typedApp.addSystems(MainScheduleLabel.UPDATE, reportAbilitiesUsed);

	return typedApp;
}

// =====================================
// 入口点
// =====================================

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting ARPG Indirection Example");
	const app = createApp();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting ARPG Indirection Example");
	const app = createApp();
	app.run();
}
