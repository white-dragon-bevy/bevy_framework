/**
 * 复杂的 Leafwing Input Manager 示例
 *
 * 展示高级功能：
 * 1. 多个动作类别（移动、战斗、UI）
 * 2. 组合键绑定
 * 3. 动作缓冲和连击系统
 * 4. 输入优先级和冲突处理
 * 5. 动态输入重映射
 * 6. 多玩家输入处理
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";
import { RunService, Players } from "@rbxts/services";

// 导入输入管理器相关类型
import {
	createInputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	MouseButton,
	Actionlike,
	spawnWithInput,
	queryInputEntities,
} from "../../leafwing-input-manager";

// =====================================
// 定义游戏动作类别
// =====================================

// 移动动作
enum MovementAction {
	MoveForward,
	MoveBackward,
	MoveLeft,
	MoveRight,
	Sprint,
	Crouch,
	Jump,
}

// 战斗动作
enum CombatAction {
	BasicAttack,
	HeavyAttack,
	Block,
	Parry,
	UseSkill1,
	UseSkill2,
	UseSkill3,
	UseSkill4,
	Ultimate,
}

// UI动作
enum UIAction {
	OpenInventory,
	OpenMap,
	OpenSettings,
	QuickSave,
	QuickLoad,
	ToggleDebug,
}

// 组合动作类型
type GameAction = MovementAction | CombatAction | UIAction;

// =====================================
// Actionlike 实现
// =====================================

class MovementActionlike implements Actionlike {
	constructor(public readonly action: MovementAction) {}

	hash(): string {
		return `Movement:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return MovementAction[this.action];
	}
}

class CombatActionlike implements Actionlike {
	constructor(public readonly action: CombatAction) {}

	hash(): string {
		return `Combat:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return CombatAction[this.action];
	}
}

class UIActionlike implements Actionlike {
	constructor(public readonly action: UIAction) {}

	hash(): string {
		return `UI:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return UIAction[this.action];
	}
}

// 通用动作包装器
class GameActionlike implements Actionlike {
	private readonly innerAction: Actionlike;
	private readonly category: string;

	constructor(action: GameAction) {
		if (typeIs(action, "number")) {
			// 判断属于哪个枚举
			if (action <= MovementAction.Jump) {
				this.innerAction = new MovementActionlike(action as MovementAction);
				this.category = "Movement";
			} else if (action <= MovementAction.Jump + 9) {
				this.innerAction = new CombatActionlike((action - MovementAction.Jump - 1) as CombatAction);
				this.category = "Combat";
			} else {
				this.innerAction = new UIActionlike((action - MovementAction.Jump - 10) as UIAction);
				this.category = "UI";
			}
		} else {
			error("Invalid action type");
		}
	}

	static movement(action: MovementAction): GameActionlike {
		const actionlike = new GameActionlike(0 as GameAction);
		(actionlike as any).innerAction = new MovementActionlike(action);
		(actionlike as any).category = "Movement";
		return actionlike;
	}

	static combat(action: CombatAction): GameActionlike {
		const actionlike = new GameActionlike(0 as GameAction);
		(actionlike as any).innerAction = new CombatActionlike(action);
		(actionlike as any).category = "Combat";
		return actionlike;
	}

	static ui(action: UIAction): GameActionlike {
		const actionlike = new GameActionlike(0 as GameAction);
		(actionlike as any).innerAction = new UIActionlike(action);
		(actionlike as any).category = "UI";
		return actionlike;
	}

	hash(): string {
		return this.innerAction.hash();
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return `${this.category}:${this.innerAction.toString()}`;
	}

	getCategory(): string {
		return this.category;
	}
}

// =====================================
// 游戏组件
// =====================================

const Player = component<{
	name: string;
	playerId: number;
	health: number;
	stamina: number;
}>("Player");

const ComboBuffer = component<{
	actions: Array<{ action: string; timestamp: number }>;
	windowSize: number;
	currentCombo: string;
}>("ComboBuffer");

const InputPriority = component<{
	level: number;
	blockedCategories: Array<string>;
}>("InputPriority");

const SkillCooldown = component<{
	cooldowns: Map<string, number>;
}>("SkillCooldown");

// =====================================
// 辅助函数
// =====================================

/**
 * 创建玩家的输入映射
 * @param playerId - 玩家ID，用于区分不同玩家的控制方案
 */
function createPlayerInputMap(playerId: number): InputMap<GameActionlike> {
	const inputMap = new InputMap<GameActionlike>();

	// 移动控制
	inputMap.insert(GameActionlike.movement(MovementAction.MoveForward), KeyCode.W);
	inputMap.insert(GameActionlike.movement(MovementAction.MoveBackward), KeyCode.S);
	inputMap.insert(GameActionlike.movement(MovementAction.MoveLeft), KeyCode.A);
	inputMap.insert(GameActionlike.movement(MovementAction.MoveRight), KeyCode.D);
	inputMap.insert(GameActionlike.movement(MovementAction.Jump), KeyCode.Space);
	inputMap.insert(GameActionlike.movement(MovementAction.Sprint), KeyCode.LeftShift);
	inputMap.insert(GameActionlike.movement(MovementAction.Crouch), KeyCode.LeftControl);

	// 战斗控制
	inputMap.insert(GameActionlike.combat(CombatAction.BasicAttack), MouseButton.left());
	inputMap.insert(GameActionlike.combat(CombatAction.HeavyAttack), MouseButton.right());
	inputMap.insert(GameActionlike.combat(CombatAction.Block), KeyCode.Q);
	inputMap.insert(GameActionlike.combat(CombatAction.Parry), KeyCode.F);

	// 技能键
	inputMap.insert(GameActionlike.combat(CombatAction.UseSkill1), KeyCode.One);
	inputMap.insert(GameActionlike.combat(CombatAction.UseSkill2), KeyCode.Two);
	inputMap.insert(GameActionlike.combat(CombatAction.UseSkill3), KeyCode.Three);
	inputMap.insert(GameActionlike.combat(CombatAction.UseSkill4), KeyCode.Four);
	inputMap.insert(GameActionlike.combat(CombatAction.Ultimate), KeyCode.R);

	// UI控制
	inputMap.insert(GameActionlike.ui(UIAction.OpenInventory), KeyCode.I);
	inputMap.insert(GameActionlike.ui(UIAction.OpenMap), KeyCode.M);
	inputMap.insert(GameActionlike.ui(UIAction.OpenSettings), KeyCode.Escape);
	inputMap.insert(GameActionlike.ui(UIAction.QuickSave), KeyCode.Five);
	inputMap.insert(GameActionlike.ui(UIAction.QuickLoad), KeyCode.Six);
	inputMap.insert(GameActionlike.ui(UIAction.ToggleDebug), KeyCode.Seven);

	// 玩家2的替代控制方案（如果是第二个玩家）
	if (playerId === 2) {
		inputMap.clear();
		// 使用方向键和小键盘
		inputMap.insert(GameActionlike.movement(MovementAction.MoveForward), KeyCode.Up);
		inputMap.insert(GameActionlike.movement(MovementAction.MoveBackward), KeyCode.Down);
		inputMap.insert(GameActionlike.movement(MovementAction.MoveLeft), KeyCode.Left);
		inputMap.insert(GameActionlike.movement(MovementAction.MoveRight), KeyCode.Right);
		inputMap.insert(GameActionlike.movement(MovementAction.Jump), KeyCode.RightControl);
		inputMap.insert(GameActionlike.combat(CombatAction.BasicAttack), KeyCode.Eight);
		inputMap.insert(GameActionlike.combat(CombatAction.HeavyAttack), KeyCode.Nine);
	}

	return inputMap;
}

/**
 * 检查连击组合
 * @param buffer - 动作缓冲区
 * @returns 识别出的连击名称，如果没有则返回undefined
 */
function checkCombo(buffer: Array<{ action: string; timestamp: number }>): string | undefined {
	const currentTime = os.clock();
	const comboWindow = 1.5; // 1.5秒窗口，给玩家更多时间输入

	// 清理过期的动作
	const validActions = buffer.filter((entry) => currentTime - entry.timestamp < comboWindow);

	// 调试：打印当前缓冲区内容
	if (validActions.size() > 0) {
		const actionNames = validActions.map((entry) => entry.action).join(" → ");
		print(`[Combo Buffer] ${actionNames} (${validActions.size()} actions)`);
	}

	// 检查特定的连击模式
	if (validActions.size() >= 3) {
		const recent = validActions.map((entry) => entry.action);

		// 三连击
		if (
			recent.size() >= 3 &&
			recent[recent.size() - 3] === "BasicAttack" &&
			recent[recent.size() - 2] === "BasicAttack" &&
			recent[recent.size() - 1] === "HeavyAttack"
		) {
			return "TripleStrike";
		}

		// 旋风斩
		if (
			recent.size() >= 4 &&
			recent[recent.size() - 4] === "BasicAttack" &&
			recent[recent.size() - 3] === "Jump" &&
			recent[recent.size() - 2] === "Sprint" &&
			recent[recent.size() - 1] === "HeavyAttack"
		) {
			return "WhirlwindSlash";
		}
	}

	return undefined;
}

/**
 * 检查技能冷却
 * @param cooldowns - 冷却时间映射
 * @param skillName - 技能名称
 * @returns 技能是否可用
 */
function isSkillReady(cooldowns: Map<string, number>, skillName: string): boolean {
	const cooldown = cooldowns.get(skillName);
	if (cooldown === undefined) return true;
	return os.clock() >= cooldown;
}

/**
 * 设置技能冷却
 * @param cooldowns - 冷却时间映射
 * @param skillName - 技能名称
 * @param duration - 冷却持续时间（秒）
 */
function setSkillCooldown(cooldowns: Map<string, number>, skillName: string, duration: number): void {
	cooldowns.set(skillName, os.clock() + duration);
}

// =====================================
// 系统定义
// =====================================

let inputPlugin: ReturnType<typeof createInputManagerPlugin<GameActionlike>>;

/**
 * 生成玩家实体
 */
function spawnPlayers(world: BevyWorld, context: Context): void {
	print("========================================");
	print("Complex Input Manager Example");
	print("========================================");

	// 生成两个玩家
	for (let playerId = 1; playerId <= 2; playerId++) {
		// 创建输入映射
		const inputMap = createPlayerInputMap(playerId);

		// 创建动作状态
		const actionState = new ActionState<GameActionlike>();

		// 注册所有动作
		// 移动动作
		for (let index = 0; index <= MovementAction.Jump; index++) {
			actionState.registerAction(GameActionlike.movement(index as MovementAction));
		}

		// 战斗动作
		for (let index = 0; index <= CombatAction.Ultimate; index++) {
			actionState.registerAction(GameActionlike.combat(index as CombatAction));
		}

		// UI动作
		for (let index = 0; index <= UIAction.ToggleDebug; index++) {
			actionState.registerAction(GameActionlike.ui(index as UIAction));
		}

		// 创建实体
		const entity = inputPlugin.extension!.spawnWithInput(world, inputMap, actionState);

		// 添加游戏组件
		world.insert(
			entity as any,
			Player({
				name: `Player${playerId}`,
				playerId: playerId,
				health: 100,
				stamina: 100,
			})
		);

		// 添加连击缓冲区
		world.insert(
			entity as any,
			ComboBuffer({
				actions: [],
				windowSize: 1.5, // 改为1.5秒，与checkCombo函数一致
				currentCombo: "",
			})
		);

		// 添加输入优先级
		world.insert(
			entity as any,
			InputPriority({
				level: playerId === 1 ? 10 : 5, // 玩家1有更高优先级
				blockedCategories: [],
			})
		);

		// 添加技能冷却
		world.insert(
			entity as any,
			SkillCooldown({
				cooldowns: new Map(),
			})
		);

		print(`Player ${playerId} spawned with entity ID: ${entity}`);
	}

	print("\n========================================");
	print("Controls (Player 1):");
	print("  Movement: WASD, Space (Jump), Shift (Sprint), Ctrl (Crouch)");
	print("  Combat: Left/Right Mouse, Q (Block), F (Parry)");
	print("  Skills: 1-4, R (Ultimate)");
	print("  UI: I (Inventory), M (Map), ESC (Settings), 5 (Save), 6 (Load), 7 (Debug)");
	print("\nControls (Player 2):");
	print("  Movement: Arrow Keys, Right Ctrl (Jump)");
	print("  Combat: 8 (Attack), 9 (Heavy)");
	print("\nCombo Examples:");
	print("  Triple Strike: Attack, Attack, Heavy Attack");
	print("  Whirlwind: Attack, Jump, Sprint, Heavy Attack");
	print("========================================\n");
}

/**
 * 处理移动输入
 */
function handleMovement(world: BevyWorld, context: Context): void {
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		const playerData = player as unknown as {
			name: string;
			playerId: number;
			health: number;
			stamina: number;
		};

		// 检查输入优先级
		const priority = world.get(entityId as any, InputPriority) as unknown as {
			level: number;
			blockedCategories: Array<string>;
		} | undefined;

		if (priority && priority.blockedCategories.includes("Movement")) {
			continue; // 移动被阻止
		}

		// 处理移动
		const moveActions = [
			{ action: MovementAction.MoveForward, name: "Forward" },
			{ action: MovementAction.MoveBackward, name: "Backward" },
			{ action: MovementAction.MoveLeft, name: "Left" },
			{ action: MovementAction.MoveRight, name: "Right" },
		];

		for (const moveInfo of moveActions) {
			const action = GameActionlike.movement(moveInfo.action);
			if (actionState.pressed(action)) {
				// 在实际游戏中，这里会更新玩家位置
				// print(`[${playerData.name}] Moving ${moveInfo.name}`);
			}
		}

		// 跳跃
		const jumpAction = GameActionlike.movement(MovementAction.Jump);
		if (actionState.justPressed(jumpAction)) {
			print(`[${playerData.name}] Jump!`);

			// 更新连击缓冲
			const comboBuffer = world.get(entityId as any, ComboBuffer) as unknown as {
				actions: Array<{ action: string; timestamp: number }>;
				windowSize: number;
				currentCombo: string;
			} | undefined;

			if (comboBuffer) {
				const newActions = [...comboBuffer.actions];
				newActions.push({ action: "Jump", timestamp: os.clock() });
				world.insert(
					entityId as any,
					ComboBuffer({
						actions: newActions,
						windowSize: comboBuffer.windowSize,
						currentCombo: comboBuffer.currentCombo,
					})
				);
			}
		}

		// 冲刺
		const sprintAction = GameActionlike.movement(MovementAction.Sprint);
		if (actionState.justPressed(sprintAction)) {
			// 更新连击缓冲（用于旋风斩等连击）
			const comboBuffer = world.get(entityId as any, ComboBuffer) as unknown as {
				actions: Array<{ action: string; timestamp: number }>;
				windowSize: number;
				currentCombo: string;
			} | undefined;

			if (comboBuffer) {
				const newActions = [...comboBuffer.actions];
				newActions.push({ action: "Sprint", timestamp: os.clock() });
				world.insert(
					entityId as any,
					ComboBuffer({
						actions: newActions,
						windowSize: comboBuffer.windowSize,
						currentCombo: comboBuffer.currentCombo,
					})
				);
			}

			print(`[${playerData.name}] Sprint activated!`);
		}

		if (actionState.pressed(sprintAction)) {
			// 消耗体力
			const dt = (context as unknown as { deltaTime: number }).deltaTime || 0.016;
			const newStamina = math.max(0, playerData.stamina - dt * 10);
			world.insert(
				entityId as any,
				Player({
					name: playerData.name,
					playerId: playerData.playerId,
					health: playerData.health,
					stamina: newStamina,
				})
			);

			if (newStamina > 0) {
				// print(`[${playerData.name}] Sprinting (Stamina: ${math.floor(newStamina)})`);
			}
		}
	}
}

/**
 * 处理战斗输入
 */
function handleCombat(world: BevyWorld, context: Context): void {
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		const playerData = player as unknown as {
			name: string;
			playerId: number;
			health: number;
			stamina: number;
		};

		const comboBuffer = world.get(entityId as any, ComboBuffer) as unknown as {
			actions: Array<{ action: string; timestamp: number }>;
			windowSize: number;
			currentCombo: string;
		} | undefined;

		const cooldowns = world.get(entityId as any, SkillCooldown) as unknown as {
			cooldowns: Map<string, number>;
		} | undefined;

		// 基础攻击
		const basicAttack = GameActionlike.combat(CombatAction.BasicAttack);
		if (actionState.justPressed(basicAttack)) {
			print(`[${playerData.name}] Basic Attack!`);

			if (comboBuffer) {
				const newActions = [...comboBuffer.actions];
				newActions.push({ action: "BasicAttack", timestamp: os.clock() });

				// 检查连击
				const combo = checkCombo(newActions);
				if (combo) {
					print(`[${playerData.name}] === COMBO: ${combo}! ===`);
					world.insert(
						entityId as any,
						ComboBuffer({
							actions: [], // 清空缓冲区
							windowSize: comboBuffer.windowSize,
							currentCombo: combo,
						})
					);
				} else {
					world.insert(
						entityId as any,
						ComboBuffer({
							actions: newActions,
							windowSize: comboBuffer.windowSize,
							currentCombo: comboBuffer.currentCombo,
						})
					);
				}
			}
		}

		// 重攻击
		const heavyAttack = GameActionlike.combat(CombatAction.HeavyAttack);
		if (actionState.justPressed(heavyAttack)) {
			print(`[${playerData.name}] Heavy Attack!`);

			if (comboBuffer) {
				const newActions = [...comboBuffer.actions];
				newActions.push({ action: "HeavyAttack", timestamp: os.clock() });

				const combo = checkCombo(newActions);
				if (combo) {
					print(`[${playerData.name}] === COMBO: ${combo}! ===`);
					world.insert(
						entityId as any,
						ComboBuffer({
							actions: [], // 清空缓冲区
							windowSize: comboBuffer.windowSize,
							currentCombo: combo,
						})
					);
				} else {
					world.insert(
						entityId as any,
						ComboBuffer({
							actions: newActions,
							windowSize: comboBuffer.windowSize,
							currentCombo: comboBuffer.currentCombo,
						})
					);
				}
			}
		}

		// 技能系统
		const skills = [
			{ action: CombatAction.UseSkill1, name: "Skill 1", cooldown: 2 },
			{ action: CombatAction.UseSkill2, name: "Skill 2", cooldown: 3 },
			{ action: CombatAction.UseSkill3, name: "Skill 3", cooldown: 5 },
			{ action: CombatAction.UseSkill4, name: "Skill 4", cooldown: 8 },
			{ action: CombatAction.Ultimate, name: "Ultimate", cooldown: 30 },
		];

		for (const skillInfo of skills) {
			const skillAction = GameActionlike.combat(skillInfo.action);
			if (actionState.justPressed(skillAction)) {
				if (cooldowns && isSkillReady(cooldowns.cooldowns, skillInfo.name)) {
					print(`[${playerData.name}] ${skillInfo.name} activated!`);
					setSkillCooldown(cooldowns.cooldowns, skillInfo.name, skillInfo.cooldown);
				} else if (cooldowns) {
					const remaining = (cooldowns.cooldowns.get(skillInfo.name) || 0) - os.clock();
					print(`[${playerData.name}] ${skillInfo.name} on cooldown (${math.ceil(remaining)}s)`);
				}
			}
		}

		// 格挡和招架
		const blockAction = GameActionlike.combat(CombatAction.Block);
		if (actionState.pressed(blockAction)) {
			// print(`[${playerData.name}] Blocking...`);
		}

		const parryAction = GameActionlike.combat(CombatAction.Parry);
		if (actionState.justPressed(parryAction)) {
			print(`[${playerData.name}] Parry attempt!`);
		}
	}
}

/**
 * 处理UI输入
 */
function handleUI(world: BevyWorld, context: Context): void {
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		const playerData = player as unknown as {
			name: string;
			playerId: number;
			health: number;
			stamina: number;
		};

		// UI动作
		const uiActions = [
			{ action: UIAction.OpenInventory, name: "Inventory" },
			{ action: UIAction.OpenMap, name: "Map" },
			{ action: UIAction.OpenSettings, name: "Settings" },
			{ action: UIAction.QuickSave, name: "Quick Save" },
			{ action: UIAction.QuickLoad, name: "Quick Load" },
			{ action: UIAction.ToggleDebug, name: "Debug Mode" },
		];

		for (const uiInfo of uiActions) {
			const uiAction = GameActionlike.ui(uiInfo.action);
			if (actionState.justPressed(uiAction)) {
				print(`[${playerData.name}] ${uiInfo.name} opened/toggled`);

				// 某些UI动作可能会阻止其他输入
				if (uiInfo.action === UIAction.OpenInventory || uiInfo.action === UIAction.OpenSettings) {
					const priority = world.get(entityId as any, InputPriority) as unknown as {
						level: number;
						blockedCategories: Array<string>;
					} | undefined;

					if (priority) {
						// 切换阻止状态
						if (priority.blockedCategories.includes("Movement")) {
							// 取消阻止
							const newCategories = priority.blockedCategories.filter(
								(cat) => cat !== "Movement" && cat !== "Combat"
							);
							world.insert(
								entityId as any,
								InputPriority({
									level: priority.level,
									blockedCategories: newCategories,
								})
							);
							print(`[${playerData.name}] Input unblocked`);
						} else {
							// 阻止移动和战斗输入
							world.insert(
								entityId as any,
								InputPriority({
									level: priority.level,
									blockedCategories: ["Movement", "Combat"],
								})
							);
							print(`[${playerData.name}] Movement and Combat blocked while in menu`);
						}
					}
				}
			}
		}
	}
}

/**
 * 恢复系统（体力恢复等）
 */
function recoverySystem(world: BevyWorld, context: Context): void {
	for (const [entityId, player] of world.query(Player)) {
		const playerData = player as unknown as {
			name: string;
			playerId: number;
			health: number;
			stamina: number;
		};

		// 恢复体力
		if (playerData.stamina < 100) {
			const dt = (context as unknown as { deltaTime: number }).deltaTime || 0.016;
		const newStamina = math.min(100, playerData.stamina + dt * 15);
			world.insert(
				entityId,
				Player({
					name: playerData.name,
					playerId: playerData.playerId,
					health: playerData.health,
					stamina: newStamina,
				})
			);
		}
	}
}

/**
 * 连击缓冲清理系统
 */
function cleanupComboBuffers(world: BevyWorld, context: Context): void {
	const currentTime = os.clock();

	for (const [entityId, comboBuffer] of world.query(ComboBuffer)) {
		const bufferData = comboBuffer as unknown as {
			actions: Array<{ action: string; timestamp: number }>;
			windowSize: number;
			currentCombo: string;
		};

		// 清理过期的动作
		const filteredActions = bufferData.actions.filter(
			(entry) => currentTime - entry.timestamp < bufferData.windowSize
		);

		// 判断是否需要更新
		const needsUpdate = filteredActions.size() !== bufferData.actions.size() ||
			(bufferData.currentCombo !== "" && filteredActions.size() === 0);

		if (needsUpdate) {
			// 创建新的组件数据
			world.insert(
				entityId,
				ComboBuffer({
					actions: filteredActions,
					windowSize: bufferData.windowSize,
					currentCombo: filteredActions.size() === 0 ? "" : bufferData.currentCombo,
				})
			);
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

export function createApp(): App {
	const app = new App();

	// 添加默认插件
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 创建输入管理器插件
	inputPlugin = createInputManagerPlugin<GameActionlike>({
		actionTypeName: "GameAction",
	});
	app.addPlugin(inputPlugin);

	// 添加启动系统
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayers);

	// 添加更新系统
	app.addSystems(
		MainScheduleLabel.UPDATE,
		handleMovement,
		handleCombat,
		handleUI,
		recoverySystem,
		cleanupComboBuffers
	);

	return app;
}

// =====================================
// 入口点
// =====================================

/**
 * 创建UI按钮
 */
function createUIButton(): void {
	const localPlayer = Players.LocalPlayer;
	if (!localPlayer) return;

	const playerGui = localPlayer.WaitForChild("PlayerGui") as PlayerGui;

	// 创建ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "TestButtonGui";
	screenGui.Parent = playerGui;

	// 创建TextButton
	const button = new Instance("TextButton");
	button.Name = "RedTestButton";
	button.Text = "点击测试";
	button.Size = new UDim2(0, 200, 0, 50);
	button.Position = new UDim2(0.5, -100, 0.1, 0);
	button.BackgroundColor3 = new Color3(1, 0, 0); // 红色背景
	button.TextColor3 = new Color3(1, 1, 1); // 白色文字
	button.TextScaled = true;
	button.Font = Enum.Font.SourceSansBold;
	button.Parent = screenGui;

	// 添加圆角
	const corner = new Instance("UICorner");
	corner.CornerRadius = new UDim(0, 8);
	corner.Parent = button;

	// 点击事件
	button.MouseButton1Click.Connect(() => {
		print("🔴 红色按钮被点击了！");
		print(`[${os.clock()}] Button clicked by ${localPlayer.Name}`);
	});

	// 鼠标悬停效果
	button.MouseEnter.Connect(() => {
		button.BackgroundColor3 = new Color3(0.8, 0, 0);
	});

	button.MouseLeave.Connect(() => {
		button.BackgroundColor3 = new Color3(1, 0, 0);
	});
}

if (RunService.IsServer()) {
	print("[Server] Starting Complex Input Manager Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Complex Input Manager Example");
	createUIButton(); // 在客户端创建UI按钮
	const app = createApp();
	app.run();
}