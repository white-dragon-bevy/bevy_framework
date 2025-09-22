/**
 * @fileoverview ButtonInput 单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { ButtonInput, ButtonState } from "../src/button-input";

export = () => {
	describe("ButtonInput", () => {
		let input: ButtonInput<string>;

		beforeEach(() => {
			input = new ButtonInput<string>();
		});

		describe("press", () => {
			it("should add button to pressed set", () => {
				expect(input.isPressed("A")).to.equal(false);
				input.press("A");
				expect(input.isPressed("A")).to.equal(true);
			});

			it("should add button to justPressed on first press", () => {
				expect(input.justPressed("A")).to.equal(false);
				input.press("A");
				expect(input.justPressed("A")).to.equal(true);
			});

			it("should not add to justPressed on repeated press", () => {
				input.press("A");
				input.clear(); // 清除 justPressed
				input.press("A"); // 再次按下（已经在 pressed 中）
				expect(input.justPressed("A")).to.equal(false);
			});
		});

		describe("release", () => {
			it("should remove button from pressed set", () => {
				input.press("A");
				expect(input.isPressed("A")).to.equal(true);
				input.release("A");
				expect(input.isPressed("A")).to.equal(false);
			});

			it("should add button to justReleased if was pressed", () => {
				input.press("A");
				input.release("A");
				expect(input.justReleased("A")).to.equal(true);
			});

			it("should not add to justReleased if was not pressed", () => {
				input.release("A");
				expect(input.justReleased("A")).to.equal(false);
			});
		});

		describe("releaseAll", () => {
			it("should release all pressed buttons", () => {
				input.press("A");
				input.press("B");
				input.press("C");
				expect(input.isPressed("A")).to.equal(true);
				expect(input.isPressed("B")).to.equal(true);
				expect(input.isPressed("C")).to.equal(true);

				input.releaseAll();
				expect(input.isPressed("A")).to.equal(false);
				expect(input.isPressed("B")).to.equal(false);
				expect(input.isPressed("C")).to.equal(false);
			});

			it("should add all pressed buttons to justReleased", () => {
				input.press("A");
				input.press("B");
				input.releaseAll();
				expect(input.justReleased("A")).to.equal(true);
				expect(input.justReleased("B")).to.equal(true);
			});
		});

		describe("clear", () => {
			it("should clear justPressed and justReleased", () => {
				input.press("A");
				input.release("A");
				expect(input.justPressed("A")).to.equal(true);
				expect(input.justReleased("A")).to.equal(true);

				input.clear();
				expect(input.justPressed("A")).to.equal(false);
				expect(input.justReleased("A")).to.equal(false);
			});

			it("should not clear pressed state", () => {
				input.press("A");
				input.clear();
				expect(input.isPressed("A")).to.equal(true);
			});
		});

		describe("reset", () => {
			it("should clear all states for specific button", () => {
				input.press("A");
				input.press("B");
				input.reset("A");

				expect(input.isPressed("A")).to.equal(false);
				expect(input.justPressed("A")).to.equal(false);
				expect(input.isPressed("B")).to.equal(true);
			});
		});

		describe("resetAll", () => {
			it("should clear all states for all buttons", () => {
				input.press("A");
				input.press("B");
				input.resetAll();

				expect(input.isPressed("A")).to.equal(false);
				expect(input.isPressed("B")).to.equal(false);
				expect(input.justPressed("A")).to.equal(false);
				expect(input.justPressed("B")).to.equal(false);
			});
		});

		describe("anyPressed", () => {
			it("should return true if any button is pressed", () => {
				input.press("A");
				expect(input.anyPressed(["A", "B", "C"])).to.equal(true);
				expect(input.anyPressed(["B", "C"])).to.equal(false);
			});
		});

		describe("allPressed", () => {
			it("should return true only if all buttons are pressed", () => {
				input.press("A");
				input.press("B");
				expect(input.allPressed(["A", "B"])).to.equal(true);
				expect(input.allPressed(["A", "B", "C"])).to.equal(false);
			});
		});

		describe("anyJustPressed", () => {
			it("should return true if any button was just pressed", () => {
				input.press("A");
				expect(input.anyJustPressed(["A", "B"])).to.equal(true);
				expect(input.anyJustPressed(["B", "C"])).to.equal(false);
			});
		});

		describe("allJustPressed", () => {
			it("should return true only if all buttons were just pressed", () => {
				input.press("A");
				input.press("B");
				expect(input.allJustPressed(["A", "B"])).to.equal(true);
				expect(input.allJustPressed(["A", "B", "C"])).to.equal(false);
			});
		});

		describe("clearJustPressed", () => {
			it("should clear justPressed state and return true if was pressed", () => {
				input.press("A");
				expect(input.clearJustPressed("A")).to.equal(true);
				expect(input.justPressed("A")).to.equal(false);
			});

			it("should return false if was not just pressed", () => {
				expect(input.clearJustPressed("A")).to.equal(false);
			});
		});

		describe("getPressed", () => {
			it("should return array of pressed buttons", () => {
				input.press("A");
				input.press("B");
				const pressed = input.getPressed();
				expect(pressed.size()).to.equal(2);
				expect(pressed.includes("A")).to.equal(true);
				expect(pressed.includes("B")).to.equal(true);
			});
		});

		describe("getJustPressed", () => {
			it("should return array of just pressed buttons", () => {
				input.press("A");
				input.press("B");
				const justPressed = input.getJustPressed();
				expect(justPressed.size()).to.equal(2);
				expect(justPressed.includes("A")).to.equal(true);
				expect(justPressed.includes("B")).to.equal(true);
			});
		});

		describe("getJustReleased", () => {
			it("should return array of just released buttons", () => {
				input.press("A");
				input.press("B");
				input.release("A");
				input.release("B");
				const justReleased = input.getJustReleased();
				expect(justReleased.size()).to.equal(2);
				expect(justReleased.includes("A")).to.equal(true);
				expect(justReleased.includes("B")).to.equal(true);
			});
		});
	});

	describe("ButtonState", () => {
		it("should have Pressed and Released states", () => {
			expect(ButtonState.Pressed).to.be.ok();
			expect(ButtonState.Released).to.be.ok();
			expect(ButtonState.Pressed).to.never.equal(ButtonState.Released);
		});
	});
};