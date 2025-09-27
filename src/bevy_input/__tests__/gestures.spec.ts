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
	});
};
