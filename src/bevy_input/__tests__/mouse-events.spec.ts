/**
 * 鼠标消息系统测试
 */

import { MessageRegistry } from "../../bevy_ecs/message";
import { BevyWorld } from "../../bevy_ecs/bevy-world";
import {
	ButtonState,
	CursorMoved,
	MouseButtonInput,
	MouseMotion,
	MouseScrollUnit,
	MouseWheel,
} from "../mouse-events";

export = () => {
	let world: BevyWorld;
	let messageRegistry: MessageRegistry;

	beforeEach(() => {
		world = new BevyWorld();
		messageRegistry = new MessageRegistry(world);
	});

	afterEach(() => {
		messageRegistry.cleanup();
	});

	describe("MouseButtonInput", () => {
		it("应该能够发送和接收鼠标按钮消息", () => {
			const writer = messageRegistry.createWriter(MouseButtonInput);
			const reader = messageRegistry.createReader(MouseButtonInput);

			// 发送按下事件
			const pressEvent = new MouseButtonInput(Enum.UserInputType.MouseButton1, ButtonState.Pressed);
			writer.send(pressEvent);

			// 读取事件
			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].button).to.equal(Enum.UserInputType.MouseButton1);
			expect(events[0].state).to.equal(ButtonState.Pressed);

			// 发送释放事件
			const releaseEvent = new MouseButtonInput(Enum.UserInputType.MouseButton1, ButtonState.Released);
			writer.send(releaseEvent);

			// 读取第二个事件
			const events2 = reader.read();
			expect(events2.size()).to.equal(1);
			expect(events2[0].state).to.equal(ButtonState.Released);

			reader.cleanup();
		});
	});

	describe("MouseMotion", () => {
		it("应该能够发送和接收鼠标移动消息", () => {
			const writer = messageRegistry.createWriter(MouseMotion);
			const reader = messageRegistry.createReader(MouseMotion);

			// 发送移动事件
			const motionEvent = new MouseMotion(10.5, -20.3);
			writer.send(motionEvent);

			// 读取事件
			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].deltaX).to.equal(10.5);
			expect(events[0].deltaY).to.equal(-20.3);

			// 验证可以直接访问属性
			expect(events[0].deltaX).to.equal(10.5);
			expect(events[0].deltaY).to.equal(-20.3);

			reader.cleanup();
		});
	});

	describe("MouseWheel", () => {
		it("应该能够发送和接收鼠标滚轮消息", () => {
			const writer = messageRegistry.createWriter(MouseWheel);
			const reader = messageRegistry.createReader(MouseWheel);

			// 发送滚轮事件
			const wheelEvent = new MouseWheel(0, 3, MouseScrollUnit.Line);
			writer.send(wheelEvent);

			// 读取事件
			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].x).to.equal(0);
			expect(events[0].y).to.equal(3);
			expect(events[0].unit).to.equal(MouseScrollUnit.Line);

			// 验证可以直接访问属性
			expect(events[0].y).to.equal(3);

			reader.cleanup();
		});

		it("应该正确识别滚动方向", () => {
			const upEvent = new MouseWheel(0, 1);
			expect(upEvent.y > 0).to.equal(true); // 向上滚动

			const downEvent = new MouseWheel(0, -1);
			expect(downEvent.y < 0).to.equal(true); // 向下滚动

			const noScrollEvent = new MouseWheel(0, 0);
			expect(noScrollEvent.y === 0).to.equal(true); // 没有滚动
		});
	});

	describe("CursorMoved", () => {
		it("应该能够发送和接收光标移动消息", () => {
			const writer = messageRegistry.createWriter(CursorMoved);
			const reader = messageRegistry.createReader(CursorMoved);

			// 发送光标移动事件
			const position = new Vector2(100, 200);
			const delta = new Vector2(5, -10);
			const cursorEvent = new CursorMoved(position, delta);
			writer.send(cursorEvent);

			// 读取事件
			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].position.X).to.equal(100);
			expect(events[0].position.Y).to.equal(200);
			expect(events[0].delta?.X).to.equal(5);
			expect(events[0].delta?.Y).to.equal(-10);

			// 验证可以直接访问属性
			expect(events[0].position.X).to.equal(100);
			expect(events[0].position.Y).to.equal(200);

			reader.cleanup();
		});

		it("应该处理没有 delta 的情况", () => {
			const position = new Vector2(50, 75);
			const cursorEvent = new CursorMoved(position);

			expect(cursorEvent.position.X).to.equal(50);
			expect(cursorEvent.position.Y).to.equal(75);
			expect(cursorEvent.delta).to.equal(undefined);
		});
	});

	describe("多个读取器", () => {
		it("应该支持多个读取器独立读取消息", () => {
			const writer = messageRegistry.createWriter(MouseMotion);
			const reader1 = messageRegistry.createReader(MouseMotion);
			const reader2 = messageRegistry.createReader(MouseMotion);

			// 发送第一个事件
			writer.send(new MouseMotion(1, 1));

			// 两个读取器都应该能读到
			const events1 = reader1.read();
			const events2 = reader2.read();
			expect(events1.size()).to.equal(1);
			expect(events2.size()).to.equal(1);

			// 发送第二个事件
			writer.send(new MouseMotion(2, 2));

			// 两个读取器都应该只读到新事件
			const events1_2 = reader1.read();
			const events2_2 = reader2.read();
			expect(events1_2.size()).to.equal(1);
			expect(events2_2.size()).to.equal(1);
			expect(events1_2[0].deltaX).to.equal(2);
			expect(events2_2[0].deltaX).to.equal(2);

			reader1.cleanup();
			reader2.cleanup();
		});
	});
};