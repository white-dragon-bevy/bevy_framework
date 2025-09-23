import { ButtonInput } from "../button-input";

enum TestInput {
	Input1 = "Input1",
	Input2 = "Input2",
	Input3 = "Input3",
}

export = () => {
	describe("ButtonInput", () => {
		let buttonInput: ButtonInput<TestInput>;

		beforeEach(() => {
			buttonInput = new ButtonInput<TestInput>();
		});

		describe("press", () => {
			it("should register a press", () => {
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);

				buttonInput.press(TestInput.Input1);

				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(true);
			});

			it("should not register duplicate presses", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.clear();
				buttonInput.press(TestInput.Input1);

				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(true);
			});
		});

		describe("release", () => {
			it("should register a release", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.clear();

				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(false);

				buttonInput.release(TestInput.Input1);

				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(true);
			});

			it("should not register release if not pressed", () => {
				buttonInput.release(TestInput.Input1);

				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(false);
			});
		});

		describe("anyPressed", () => {
			it("should return true if any input is pressed", () => {
				expect(buttonInput.anyPressed([TestInput.Input1, TestInput.Input2])).to.equal(false);

				buttonInput.press(TestInput.Input1);

				expect(buttonInput.anyPressed([TestInput.Input1, TestInput.Input2])).to.equal(true);
				expect(buttonInput.anyPressed([TestInput.Input2, TestInput.Input3])).to.equal(false);
			});
		});

		describe("allPressed", () => {
			it("should return true only if all inputs are pressed", () => {
				buttonInput.press(TestInput.Input1);

				expect(buttonInput.allPressed([TestInput.Input1])).to.equal(true);
				expect(buttonInput.allPressed([TestInput.Input1, TestInput.Input2])).to.equal(false);

				buttonInput.press(TestInput.Input2);

				expect(buttonInput.allPressed([TestInput.Input1, TestInput.Input2])).to.equal(true);
			});

			it("should return true for empty array", () => {
				expect(buttonInput.allPressed([])).to.equal(true);
			});
		});

		describe("releaseAll", () => {
			it("should release all pressed inputs", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);
				buttonInput.clear();

				buttonInput.releaseAll();

				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.isPressed(TestInput.Input2)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justReleased(TestInput.Input2)).to.equal(true);
			});
		});

		describe("anyJustPressed", () => {
			it("should return true if any input just pressed", () => {
				buttonInput.press(TestInput.Input1);

				expect(buttonInput.anyJustPressed([TestInput.Input1, TestInput.Input2])).to.equal(true);
				expect(buttonInput.anyJustPressed([TestInput.Input2, TestInput.Input3])).to.equal(false);
			});
		});

		describe("allJustPressed", () => {
			it("should return true only if all inputs just pressed", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);

				expect(buttonInput.allJustPressed([TestInput.Input1])).to.equal(true);
				expect(buttonInput.allJustPressed([TestInput.Input1, TestInput.Input2])).to.equal(true);
				expect(buttonInput.allJustPressed([TestInput.Input1, TestInput.Input2, TestInput.Input3])).to.equal(
					false,
				);
			});
		});

		describe("clearJustPressed", () => {
			it("should clear just pressed state and return true", () => {
				buttonInput.press(TestInput.Input1);

				expect(buttonInput.clearJustPressed(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(true);
			});

			it("should return false if not just pressed", () => {
				expect(buttonInput.clearJustPressed(TestInput.Input1)).to.equal(false);
			});
		});

		describe("anyJustReleased", () => {
			it("should return true if any input just released", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.release(TestInput.Input1);

				expect(buttonInput.anyJustReleased([TestInput.Input1, TestInput.Input2])).to.equal(true);
				expect(buttonInput.anyJustReleased([TestInput.Input2, TestInput.Input3])).to.equal(false);
			});
		});

		describe("allJustReleased", () => {
			it("should return true only if all inputs just released", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);
				buttonInput.release(TestInput.Input1);
				buttonInput.release(TestInput.Input2);

				expect(buttonInput.allJustReleased([TestInput.Input1])).to.equal(true);
				expect(buttonInput.allJustReleased([TestInput.Input1, TestInput.Input2])).to.equal(true);
				expect(buttonInput.allJustReleased([TestInput.Input1, TestInput.Input2, TestInput.Input3])).to.equal(
					false,
				);
			});
		});

		describe("clearJustReleased", () => {
			it("should clear just released state and return true", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.release(TestInput.Input1);

				expect(buttonInput.clearJustReleased(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(false);
			});

			it("should return false if not just released", () => {
				expect(buttonInput.clearJustReleased(TestInput.Input1)).to.equal(false);
			});
		});

		describe("reset", () => {
			it("should reset all states for specific input", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);

				buttonInput.reset(TestInput.Input1);

				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(false);

				expect(buttonInput.isPressed(TestInput.Input2)).to.equal(true);
			});
		});

		describe("resetAll", () => {
			it("should reset all states for all inputs", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);
				buttonInput.release(TestInput.Input2);

				buttonInput.resetAll();

				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input2)).to.equal(false);
			});
		});

		describe("clear", () => {
			it("should clear just states but keep pressed state", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.release(TestInput.Input2);

				buttonInput.clear();

				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input2)).to.equal(false);
			});
		});

		describe("getPressed", () => {
			it("should return array of pressed inputs", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);

				const pressed = buttonInput.getPressed();

				expect(pressed.size()).to.equal(2);
				expect(pressed.includes(TestInput.Input1)).to.equal(true);
				expect(pressed.includes(TestInput.Input2)).to.equal(true);
			});
		});

		describe("getJustPressed", () => {
			it("should return array of just pressed inputs", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);

				const justPressed = buttonInput.getJustPressed();

				expect(justPressed.size()).to.equal(2);
				expect(justPressed.includes(TestInput.Input1)).to.equal(true);
				expect(justPressed.includes(TestInput.Input2)).to.equal(true);
			});
		});

		describe("getJustReleased", () => {
			it("should return array of just released inputs", () => {
				buttonInput.press(TestInput.Input1);
				buttonInput.press(TestInput.Input2);
				buttonInput.release(TestInput.Input1);
				buttonInput.release(TestInput.Input2);

				const justReleased = buttonInput.getJustReleased();

				expect(justReleased.size()).to.equal(2);
				expect(justReleased.includes(TestInput.Input1)).to.equal(true);
				expect(justReleased.includes(TestInput.Input2)).to.equal(true);
			});
		});

		describe("typical input flow", () => {
			it("should handle press -> clear -> release cycle", () => {
				// Frame 1: Press
				buttonInput.press(TestInput.Input1);
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(true);

				// Frame 2: Clear (simulating frame end)
				buttonInput.clear();
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(true);
				expect(buttonInput.justPressed(TestInput.Input1)).to.equal(false);

				// Frame 3: Release
				buttonInput.release(TestInput.Input1);
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(true);

				// Frame 4: Clear
				buttonInput.clear();
				expect(buttonInput.isPressed(TestInput.Input1)).to.equal(false);
				expect(buttonInput.justReleased(TestInput.Input1)).to.equal(false);
			});
		});
	});
};