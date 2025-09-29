/**
 * 简单的输入系统测试
 * 专注于测试 InputMap 和 ActionState 的基本功能
 */

import {
	InputMap,
	ActionState,
	Actionlike,
	InputControlKind,
	KeyCode,
} from "../../../leafwing-input-manager";

// 简单的动作定义
class SimpleAction implements Actionlike {
	static readonly Jump = new SimpleAction("Jump", InputControlKind.Button);
	static readonly name = "SimpleAction";

	constructor(
		private readonly actionName: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `SimpleAction_${this.actionName}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof SimpleAction && other.actionName === this.actionName;
	}

	toString(): string {
		return this.actionName;
	}
}

export = () => {
	describe("Simple Input Test", () => {
		it("should create InputMap correctly", () => {
			print("[TEST] 创建 InputMap");
			const inputMap = new InputMap<SimpleAction>();

			print("[TEST] 插入映射: Jump -> Space");
			inputMap.insert(SimpleAction.Jump, KeyCode.Space);

			print("[TEST] InputMap 创建成功");
			expect(inputMap).to.be.ok();
		});

		it("should create ActionState correctly", () => {
			print("[TEST] 创建 ActionState");
			const actionState = new ActionState<SimpleAction>();

			print("[TEST] 注册动作: Jump");
			actionState.registerAction(SimpleAction.Jump);

			print("[TEST] 检查初始状态");
			const initialPressed = actionState.pressed(SimpleAction.Jump);
			const initialJustPressed = actionState.justPressed(SimpleAction.Jump);

			print(`[TEST] 初始状态 - pressed: ${initialPressed}, justPressed: ${initialJustPressed}`);

			expect(actionState).to.be.ok();
			expect(initialPressed).to.equal(false);
			expect(initialJustPressed).to.equal(false);
		});

		it("should detect action by hash", () => {
			print("[TEST] 测试动作检测");
			const actionState = new ActionState<SimpleAction>();
			actionState.registerAction(SimpleAction.Jump);

			const jumpHash = SimpleAction.Jump.hash();
			print(`[TEST] Jump 动作哈希: ${jumpHash}`);

			const foundAction = actionState.getActionByHash(jumpHash);
			print(`[TEST] 通过哈希找到动作: ${foundAction !== undefined}`);

			expect(foundAction).to.be.ok();
			expect(foundAction!.equals(SimpleAction.Jump)).to.equal(true);
		});

		it("should examine ActionState internal structure", () => {
			print("[TEST] 检查 ActionState 内部结构");
			const actionState = new ActionState<SimpleAction>();
			actionState.registerAction(SimpleAction.Jump);

			const actionStateRecord = actionState as unknown as Record<string, unknown>;
			const keys = Object.keys(actionStateRecord);
			print(`[TEST] ActionState 属性: ${keys.join(", ")}`);

			// 检查每个属性的类型和值
			for (const key of keys) {
				const value = actionStateRecord[key];
				print(`[TEST] ${key}: ${typeOf(value)} = ${tostring(value)}`);
			}

			expect(keys.size() > 0).to.equal(true);
		});

		it("should examine InputMap internal structure", () => {
			print("[TEST] 检查 InputMap 内部结构");
			const inputMap = new InputMap<SimpleAction>();
			inputMap.insert(SimpleAction.Jump, KeyCode.Space);

			const inputMapRecord = inputMap as unknown as Record<string, unknown>;
			const keys = Object.keys(inputMapRecord);
			print(`[TEST] InputMap 属性: ${keys.join(", ")}`);

			// 检查每个属性的类型和值
			for (const key of keys) {
				const value = inputMapRecord[key];
				print(`[TEST] ${key}: ${typeOf(value)} = ${tostring(value)}`);
			}

			expect(keys.size() > 0).to.equal(true);
		});
	});
};