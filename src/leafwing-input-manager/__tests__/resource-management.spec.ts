/**
 * Tests for InputInstanceManagerResource management via extension system
 */

import { World } from "@rbxts/matter";
import { App } from "../../bevy_app";
import { InputManagerPlugin } from "../plugin/input-manager-plugin";
import { InputControlKind } from "../input-control-kind";
import { Actionlike } from "../actionlike";
import { getInputInstanceManager } from "../plugin/context-helpers";

// Test action enum
class TestAction implements Actionlike {
	static readonly Jump = new TestAction("Jump", InputControlKind.Button);
	static readonly Move = new TestAction("Move", InputControlKind.Axis);

	constructor(
		private readonly name: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `TestAction_${this.name}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && other.name === this.name;
	}

	toString(): string {
		return this.name;
	}

	getActionHash() {
		return this.hash() as any;
	}
}

export = () => {
	describe("InputInstanceManagerResource Management", () => {
		let app: App;

		beforeEach(() => {
			app = new App();
		});

		afterEach(() => {
			app.cleanup();
		});

		it("should store InputInstanceManagerResource in extension system", () => {
			// Add input manager plugin
			const plugin = new InputManagerPlugin<TestAction>({
				actionType: TestAction as any,
			});
			app.addPlugin(plugin);

			// Get context
			const context = app.getContext();

			// Should be able to get instance manager from extension
			const instanceManager = getInputInstanceManager(context, TestAction as any);
			expect(instanceManager).to.be.ok();
			expect(instanceManager!.getActionType()).to.equal("TestAction");
		});

		it("should retrieve InputInstanceManagerResource consistently", () => {
			// Add input manager plugin
			const plugin = new InputManagerPlugin<TestAction>({
				actionType: TestAction as any,
			});
			app.addPlugin(plugin);

			const context = app.getContext();

			// Get instance manager multiple times
			const manager1 = getInputInstanceManager(context, TestAction as any);
			const manager2 = getInputInstanceManager(context, TestAction as any);

			// Should return the same instance
			expect(manager1).to.be.ok();
			expect(manager2).to.be.ok();
			expect(manager1).to.equal(manager2);
		});

		it("should support multiple action types with separate managers", () => {
			// Define second action type
			class MenuAction implements Actionlike {
				static readonly Select = new MenuAction("Select", InputControlKind.Button);
				static readonly Cancel = new MenuAction("Cancel", InputControlKind.Button);

				constructor(
					private readonly name: string,
					private readonly controlKind: InputControlKind,
				) {}

				getInputControlKind(): InputControlKind {
					return this.controlKind;
				}

				hash(): string {
					return `MenuAction_${this.name}`;
				}

				equals(other: Actionlike): boolean {
					return other instanceof MenuAction && other.name === this.name;
				}

				toString(): string {
					return this.name;
				}

				getActionHash() {
					return this.hash() as any;
				}
			}

			// Add plugins for both action types
			app.addPlugin(new InputManagerPlugin<TestAction>({
				actionType: TestAction as any,
			}));
			app.addPlugin(new InputManagerPlugin<MenuAction>({
				actionType: MenuAction as any,
			}));

			const context = app.getContext();

			// Get managers for both types
			const testManager = getInputInstanceManager(context, TestAction as any);
			const menuManager = getInputInstanceManager(context, MenuAction as any);

			// Both should exist
			expect(testManager).to.be.ok();
			expect(menuManager).to.be.ok();

			// Should be different instances
			expect(testManager).never.to.equal(menuManager);

			// Should have correct action types
			expect(testManager!.getActionType()).to.equal("TestAction");
			expect(menuManager!.getActionType()).to.equal("MenuAction");
		});

		it("should allow plugin to retrieve its own instance manager", () => {
			// Add input manager plugin
			const plugin = new InputManagerPlugin<TestAction>({
				actionType: TestAction as any,
			});
			app.addPlugin(plugin);

			// Get instance manager through context helper
			const context = app.getContext();
			const instanceManager = getInputInstanceManager(context, TestAction as any);
			expect(instanceManager).to.be.ok();
			expect(instanceManager!.getActionType()).to.equal("TestAction");

			// Plugin should also be able to get its instance manager after build
			const pluginInstanceManager = plugin.getInstanceManager();
			expect(pluginInstanceManager).to.be.ok();
			expect(pluginInstanceManager!.getActionType()).to.equal("TestAction");
			// Should be the same instance
			expect(pluginInstanceManager).to.equal(instanceManager);
		});

		it("should maintain instance manager through app updates", () => {
			// Add input manager plugin
			const plugin = new InputManagerPlugin<TestAction>({
				actionType: TestAction as any,
			});
			app.addPlugin(plugin);

			const context = app.getContext();

			// Get instance manager before update
			const managerBefore = getInputInstanceManager(context, TestAction as any);
			expect(managerBefore).to.be.ok();

			// Run some updates
			app.update();
			app.update();
			app.update();

			// Get instance manager after updates
			const managerAfter = getInputInstanceManager(context, TestAction as any);
			expect(managerAfter).to.be.ok();

			// Should be the same instance
			expect(managerBefore).to.equal(managerAfter);
		});
	});
};