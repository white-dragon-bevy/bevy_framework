/**
 * 简单的输入调试测试
 */

import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { CentralInputStore } from "../user-input/central-input-store";
import { KeyCode } from "../user-input/keyboard";
import { InputControlKind } from "../input-control-kind";
import { Actionlike } from "../actionlike";

/**
 * 简单的测试动作
 */
class TestAction implements Actionlike {
	static readonly Jump = new TestAction("Jump", InputControlKind.Button);
	static readonly name = "TestAction";

	constructor(
		private readonly actionName: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `TestAction_${this.actionName}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && other.actionName === this.actionName;
	}

	toString(): string {
		return this.actionName;
	}
}

describe("Input Debug Tests", () => {
	it("应该能够创建基本的输入映射", () => {
		print("=== Input Debug Test ===");
		
		const inputMap = new InputMap<TestAction>();
		const actionState = new ActionState<TestAction>();
		const centralStore = new CentralInputStore();
		
		// 创建输入映射
		inputMap.insert(TestAction.Jump, KeyCode.Space);
		actionState.registerAction(TestAction.Jump);
		
		print(`KeyCode.Space hash: ${KeyCode.Space.hash()}`);
		print(`TestAction.Jump hash: ${TestAction.Jump.hash()}`);
		
		// 模拟输入
		centralStore.simulateKeyPress(Enum.KeyCode.Space, true);
		
		// 检查 CentralInputStore
		const spacePressed = centralStore.pressed(KeyCode.Space.hash());
		print(`Space pressed in store: ${spacePressed}`);
		expect(spacePressed).to.equal(true);
		
		// 处理输入映射
		const processedActions = inputMap.processActions(centralStore);
		print(`Processed actions count: ${processedActions.actionData.size()}`);
		
		// 检查处理结果
		const jumpData = processedActions.actionData.get(TestAction.Jump.hash());
		if (jumpData) {
			print(`✅ Jump action found: pressed=${jumpData.pressed}, justPressed=${jumpData.justPressed}`);
			expect(jumpData.pressed).to.equal(true);
		} else {
			print("❌ Jump action not found");
			// 列出所有找到的动作
			processedActions.actionData.forEach((data, hash) => {
				print(`Found action hash: ${hash}`);
			});
		}
		
		print("=== Test Complete ===");
	});
});

export = {};
