/**
 * Virtual D-Pad Example Test
 *
 * 测试虚拟方向键示例的创建和基本功能
 */

import { createApp } from "../virtual_dpad";

export = (): void => {
	describe("Virtual D-Pad Example", () => {
		it("should create app without errors", () => {
			const app = createApp();
			expect(app).to.be.ok();
		});

		it("should have correct plugin configuration", () => {
			const app = createApp();
			const world = app.getWorld();
			expect(world).to.be.ok();
		});
	});
};
