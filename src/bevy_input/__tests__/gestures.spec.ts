/**
 * 手势输入测试
 * Gesture input tests
 */

import {
	DEFAULT_GESTURE_CONFIG,
	DoubleTapGesture,
	GestureManager,
	GestureState,
	LongPressGesture,
	PanGesture,
	PinchGesture,
	RotationGesture,
} from "../gestures";
import { MessageWriter, Message } from "../../bevy_ecs/message";

// 创建模拟的 MessageWriter
function createMockWriter<T extends Message>(): MessageWriter<T> {
	return {
		write: () => {},
		send: () => {},
		writeBatch: () => {},
		writeDefault: () => {},
		getMessages: () => [],
		clear: () => {},
		isEmpty: () => true,
		len: () => 0,
	} as unknown as MessageWriter<T>;
}

export = () => {
	describe("GestureState", () => {
		it("should have correct enum values", () => {
			expect(GestureState.Started).to.be.ok();
			expect(GestureState.Changed).to.be.ok();
			expect(GestureState.Ended).to.be.ok();
			expect(GestureState.Canceled).to.be.ok();
		});
	});

	describe("PinchGesture", () => {
		it("should create pinch gesture with correct properties", () => {
			const positions = [new Vector2(100, 100), new Vector2(200, 200)];
			const gesture = new PinchGesture(GestureState.Started, 0.1, 0.5, 1.1, positions);

			expect(gesture.state).to.equal(GestureState.Started);
			expect(gesture.delta).to.equal(0.1);
			expect(gesture.velocity).to.equal(0.5);
			expect(gesture.scale).to.equal(1.1);
			expect(gesture.positions.size()).to.equal(2);
		});
	});

	describe("RotationGesture", () => {
		it("should create rotation gesture with correct properties", () => {
			const positions = [new Vector2(100, 100), new Vector2(200, 200)];
			const gesture = new RotationGesture(GestureState.Changed, 0.1, 0.2, 1.5, positions);

			expect(gesture.state).to.equal(GestureState.Changed);
			expect(gesture.delta).to.equal(0.1);
			expect(gesture.velocity).to.equal(0.2);
			expect(gesture.rotation).to.equal(1.5);
			expect(gesture.positions.size()).to.equal(2);
		});
	});

	describe("DoubleTapGesture", () => {
		it("should create double tap gesture with correct properties", () => {
			const position = new Vector2(150, 150);
			const gesture = new DoubleTapGesture(position, 0.25);

			expect(gesture.position).to.equal(position);
			expect(gesture.interval).to.equal(0.25);
		});
	});

	describe("PanGesture", () => {
		it("should create pan gesture with correct properties", () => {
			const positions = [new Vector2(100, 100)];
			const delta = new Vector2(10, 5);
			const velocity = new Vector2(50, 25);
			const total = new Vector2(100, 50);
			const gesture = new PanGesture(GestureState.Changed, delta, velocity, total, positions);

			expect(gesture.state).to.equal(GestureState.Changed);
			expect(gesture.delta).to.equal(delta);
			expect(gesture.velocity).to.equal(velocity);
			expect(gesture.totalTranslation).to.equal(total);
			expect(gesture.positions.size()).to.equal(1);
		});
	});

	describe("LongPressGesture", () => {
		it("should create long press gesture with correct properties", () => {
			const position = new Vector2(150, 150);
			const positions = [position];
			const gesture = new LongPressGesture(GestureState.Started, position, 1.5, positions);

			expect(gesture.state).to.equal(GestureState.Started);
			expect(gesture.position).to.equal(position);
			expect(gesture.duration).to.equal(1.5);
			expect(gesture.positions.size()).to.equal(1);
		});
	});

	describe("DEFAULT_GESTURE_CONFIG", () => {
		it("should have correct default values", () => {
			expect(DEFAULT_GESTURE_CONFIG.doubleTapMaxInterval).to.equal(0.3);
			expect(DEFAULT_GESTURE_CONFIG.doubleTapMaxDistance).to.equal(50);
			expect(DEFAULT_GESTURE_CONFIG.enablePinch).to.equal(true);
			expect(DEFAULT_GESTURE_CONFIG.enableRotation).to.equal(true);
			expect(DEFAULT_GESTURE_CONFIG.enablePan).to.equal(true);
			expect(DEFAULT_GESTURE_CONFIG.enableDoubleTap).to.equal(true);
			expect(DEFAULT_GESTURE_CONFIG.enableLongPress).to.equal(true);
		});
	});

	describe("GestureManager", () => {
		it("should create with default config", () => {
			const manager = new GestureManager();
			const config = manager.getConfig();

			expect(config.doubleTapMaxInterval).to.equal(0.3);
			expect(config.enablePinch).to.equal(true);
		});

		it("should create with custom config", () => {
			const customConfig = {
				...DEFAULT_GESTURE_CONFIG,
				doubleTapMaxInterval: 0.5,
				enablePinch: false,
			};
			const manager = new GestureManager(customConfig);
			const config = manager.getConfig();

			expect(config.doubleTapMaxInterval).to.equal(0.5);
			expect(config.enablePinch).to.equal(false);
		});

		it("should cleanup without errors", () => {
			const manager = new GestureManager();

			expect(() => {
				manager.cleanup();
			}).never.to.throw();
		});

		// ✅ 内存泄漏防止测试
		it("should prevent duplicate connection setup", () => {
			const manager = new GestureManager();
			const pinchWriter = createMockWriter<PinchGesture>();
			const rotationWriter = createMockWriter<RotationGesture>();
			const doubleTapWriter = createMockWriter<DoubleTapGesture>();
			const panWriter = createMockWriter<PanGesture>();
			const longPressWriter = createMockWriter<LongPressGesture>();

			// 第一次调用 setupHandlers
			manager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);

			// 第二次调用应该清理旧连接并设置新连接
			expect(() => {
				manager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);
			}).never.to.throw();

			// 清理测试
			manager.cleanup();
		});

		// ✅ 清理功能测试
		it("should reset setup flag after cleanup", () => {
			const manager = new GestureManager();
			const pinchWriter = createMockWriter<PinchGesture>();
			const rotationWriter = createMockWriter<RotationGesture>();
			const doubleTapWriter = createMockWriter<DoubleTapGesture>();
			const panWriter = createMockWriter<PanGesture>();
			const longPressWriter = createMockWriter<LongPressGesture>();

			// 设置一次
			manager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);

			// 清理
			manager.cleanup();

			// 清理后应该能再次设置而不显示警告
			expect(() => {
				manager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);
			}).never.to.throw();

			// 再次清理
			manager.cleanup();
		});

		// ✅ 析构函数测试
		it("should cleanup on destructor call", () => {
			const manager = new GestureManager();
			const pinchWriter = createMockWriter<PinchGesture>();
			const rotationWriter = createMockWriter<RotationGesture>();
			const doubleTapWriter = createMockWriter<DoubleTapGesture>();
			const panWriter = createMockWriter<PanGesture>();
			const longPressWriter = createMockWriter<LongPressGesture>();

			// 设置一些连接
			manager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);

			// 调用析构函数
			expect(() => {
				manager.destructor();
			}).never.to.throw();

			// 析构后应该能再次设置
			expect(() => {
				manager.setupHandlers(pinchWriter, rotationWriter, doubleTapWriter, panWriter, longPressWriter);
			}).never.to.throw();

			// 最终清理
			manager.cleanup();
		});
	});
};
