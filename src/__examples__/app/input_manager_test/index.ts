/**
 * InputManagerPlugin 代码提示测试
 */

import { App } from "../../../bevy_app";
import { InputManagerPlugin } from "../../../leafwing-input-manager/plugin/input-manager-plugin";
import { Actionlike } from "../../../leafwing-input-manager/actionlike";

/**
 * 测试 Action
 */
class PlayerAction implements Actionlike {
	static readonly Jump = new PlayerAction("Jump");

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

/**
 * 测试代码提示
 */
function main(): void {
	const app = App.create().addPlugin(
		InputManagerPlugin.create<PlayerAction>(
			{  }
		),
	);

	// 测试:这里应该有代码提示
	//const ext = app.context.playerInput;
	//                      ^^^^^^^^^^^ 应该有智能提示

	// if (ext) {
	// 	ext.getComponents();
	// 	//  ^^^^^^^^^^^^^^ 应该有智能提示
	// }
}

main();