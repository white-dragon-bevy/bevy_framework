import { AccumulatedMouseMotion, AccumulatedMouseWheel, MouseButton, MousePosition } from "../mouse";

export = () => {
	describe("MouseButton 枚举", () => {
		it("应该包含所有标准鼠标按钮", () => {
			expect(MouseButton.Left).to.equal("MouseButton1");
			expect(MouseButton.Right).to.equal("MouseButton2");
			expect(MouseButton.Middle).to.equal("MouseButton3");
			expect(MouseButton.X1).to.equal("MouseButton4");
			expect(MouseButton.X2).to.equal("MouseButton5");
		});
	});

	describe("AccumulatedMouseMotion", () => {
		let motion: AccumulatedMouseMotion;

		beforeEach(() => {
			motion = new AccumulatedMouseMotion();
		});

		it("should accumulate mouse movement", () => {
			motion.accumulate(10, 20);
			motion.accumulate(5, -10);

			const [deltaX, deltaY] = motion.peek();
			expect(deltaX).to.equal(15);
			expect(deltaY).to.equal(10);
		});

		it("should consume accumulated data", () => {
			motion.accumulate(10, 20);

			const result = motion.consume();
			expect(result).to.be.ok();
			const [deltaX, deltaY] = result!;
			expect(deltaX).to.equal(10);
			expect(deltaY).to.equal(20);

			// After consuming, should return undefined
			expect(motion.consume()).to.equal(undefined);
		});

		it("should track hasData state", () => {
			expect(motion.hasData()).to.equal(false);

			motion.accumulate(1, 1);
			expect(motion.hasData()).to.equal(true);

			motion.consume();
			expect(motion.hasData()).to.equal(false);
		});

		it("should clear accumulated data", () => {
			motion.accumulate(10, 20);
			motion.clear();

			expect(motion.hasData()).to.equal(false);
			expect(motion.getDeltaX()).to.equal(0);
			expect(motion.getDeltaY()).to.equal(0);
		});

		it("should provide individual delta getters", () => {
			motion.accumulate(15, -25);

			expect(motion.getDeltaX()).to.equal(15);
			expect(motion.getDeltaY()).to.equal(-25);
		});
	});

	describe("AccumulatedMouseWheel", () => {
		let wheel: AccumulatedMouseWheel;

		beforeEach(() => {
			wheel = new AccumulatedMouseWheel();
		});

		it("should accumulate wheel movement", () => {
			wheel.accumulate(1);
			wheel.accumulate(2);
			wheel.accumulate(-1);

			expect(wheel.peek()).to.equal(2);
		});

		it("should consume accumulated data", () => {
			wheel.accumulate(3);

			const result = wheel.consume();
			expect(result).to.equal(3);

			// After consuming, should return undefined
			expect(wheel.consume()).to.equal(undefined);
		});

		it("should track hasData state", () => {
			expect(wheel.hasData()).to.equal(false);

			wheel.accumulate(1);
			expect(wheel.hasData()).to.equal(true);

			wheel.consume();
			expect(wheel.hasData()).to.equal(false);
		});

		it("should clear accumulated data", () => {
			wheel.accumulate(5);
			wheel.clear();

			expect(wheel.hasData()).to.equal(false);
			expect(wheel.peek()).to.equal(0);
		});
	});

	describe("MousePosition", () => {
		let position: MousePosition;

		beforeEach(() => {
			position = new MousePosition();
		});

		it("should track current position", () => {
			const newPos = new Vector2(100, 200);
			position.update(newPos);

			const current = position.getPosition();
			expect(current.X).to.equal(100);
			expect(current.Y).to.equal(200);
		});

		it("should track last position after update", () => {
			const pos1 = new Vector2(100, 200);
			const pos2 = new Vector2(150, 250);

			position.update(pos1);
			position.update(pos2);

			const last = position.getLastPosition();
			expect(last.X).to.equal(100);
			expect(last.Y).to.equal(200);

			const current = position.getPosition();
			expect(current.X).to.equal(150);
			expect(current.Y).to.equal(250);
		});

		it("should calculate delta between positions", () => {
			const pos1 = new Vector2(100, 200);
			const pos2 = new Vector2(150, 180);

			position.update(pos1);
			position.update(pos2);

			const delta = position.getDelta();
			expect(delta.X).to.equal(50);
			expect(delta.Y).to.equal(-20);
		});

		it("should handle first update correctly", () => {
			const firstPos = new Vector2(100, 200);
			position.update(firstPos);

			// On first update, last position should be same as current
			const delta = position.getDelta();
			expect(delta.X).to.equal(0);
			expect(delta.Y).to.equal(0);
		});

		it("should reset position tracking", () => {
			const pos1 = new Vector2(100, 200);
			const pos2 = new Vector2(150, 250);

			position.update(pos1);
			position.update(pos2);
			position.reset();

			// After reset, delta should be zero
			const delta = position.getDelta();
			expect(delta.X).to.equal(0);
			expect(delta.Y).to.equal(0);
		});
	});
};