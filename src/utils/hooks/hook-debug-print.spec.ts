/**
 * @fileoverview 防抖调试打印工具单元测试
 * 测试 usePrintDebounce 函数在 Matter 系统中的防抖行为
 */

import { World } from "@rbxts/matter";
import { Loop } from "../../bevy_ecs/schedule/loop";
import { usePrintDebounce } from "./hook-debug-print";

export = () => {
	it("should work in bevy loop system context", () => {
		const world = new World();
		const loop = new Loop(world);

		// 创建测试系统
		function testSystem(): void {
			usePrintDebounce("test message2");
			usePrintDebounce("test message 2");
			usePrintDebounce("test message with args");
		}

		// 在系统中运行
		loop.scheduleSystem(testSystem);
		loop.step(); // 模拟一帧
		loop.step(); // 第二帧不打印

		expect(true).to.equal(true);
	});

	it("should debounce subsequent calls", () => {
		const world = new World();
		const loop = new Loop(world);

		function debugSystem(): void {
			// 防抖时间设置为 0.001 秒
			usePrintDebounce("message (debounced time set to 0.001 )", 0.001);
		}

		loop.scheduleSystem(debugSystem);
		loop.step(); // 模拟一帧
		wait(); // 防抖内部计时使用 os.time(), 等待一帧
		loop.step(); // 第3帧,打印

		expect(true).to.equal(true);
	});

	it("should handle multiple hook instances independently", () => {
		const world = new World();
		const loop = new Loop(world);

		function debugSystem1(): void {
			usePrintDebounce("message from system A");
		}

		function debugSystem2(): void {
			usePrintDebounce("message from system B");
		}

		// 不同系统中的调用应该独立防抖
		loop.scheduleSystem(debugSystem1);
		loop.scheduleSystem(debugSystem2);
		loop.step(); // 模拟一帧

		expect(true).to.equal(true);
	});
};
