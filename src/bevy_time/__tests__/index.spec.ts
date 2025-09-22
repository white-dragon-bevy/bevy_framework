/**
 * bevy_time 测试套件入口
 */

import fixedSpec from "./fixed.spec";
import integrationSpec from "./integration.spec";

export = () => {
	describe("bevy_time", () => {
		// 导入各个测试模块
		fixedSpec();
		integrationSpec();
	});
};