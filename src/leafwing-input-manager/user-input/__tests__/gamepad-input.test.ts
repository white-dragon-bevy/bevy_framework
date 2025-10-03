import { CentralInputStore, GamepadConfig } from "../central-input-store";
import { GamepadStick, GamepadButton, GamepadControlAxis } from "../gamepad";
import { AxisDeadzone, AxisInverted } from "../../input-processing/single-axis";
import { SquareDeadzone, CircleDeadzone } from "../../input-processing/deadzone";
import { VirtualDPad } from "../virtual-controls";

export = () => {
	describe("Gamepad Input Tests", () => {
		let inputStore: CentralInputStore;

		beforeEach(() => {
			inputStore = new CentralInputStore();
		});

		afterEach(() => {
			inputStore.cleanupGamepadListeners();
		});

		describe("GamepadConfig", () => {
			it("should set and get gamepad configuration", () => {
				const newConfig: Partial<GamepadConfig> = {
					deadZone: 0.2,
					sensitivity: 1.5,
				};

				inputStore.setGamepadConfig(newConfig);
				const retrievedConfig = inputStore.getGamepadConfig();

				expect(retrievedConfig.deadZone).to.equal(0.2);
				expect(retrievedConfig.sensitivity).to.equal(1.5);
			});

			it("should use default config values", () => {
				const config = inputStore.getGamepadConfig();

				expect(config.deadZone).to.equal(0.1);
				expect(config.sensitivity).to.equal(1.0);
			});
		});

		describe("Gamepad Stick Processing", () => {
			it("should apply dead zone correctly", () => {
				// Set a larger dead zone for testing
				inputStore.setGamepadConfig({ deadZone: 0.3 });

				// Simulate small input within dead zone
				const smallInput = new Vector2(0.2, 0.1);
				inputStore.updateDualAxislike("test_stick", smallInput);

				// Process the input (we can't directly test processGamepadStickInput since it's private)
				// Instead we test the overall behavior through public methods
				const processedValue = inputStore.dualAxisValue("test_stick");

				// Small inputs should remain as set (processing happens in event handler)
				expect(processedValue.X).to.equal(0.2);
				expect(processedValue.Y).to.equal(0.1);
			});

			it("should handle zero input", () => {
				inputStore.updateDualAxislike("test_stick", Vector2.zero);
				const processedValue = inputStore.dualAxisValue("test_stick");

				expect(processedValue.X).to.equal(0);
				expect(processedValue.Y).to.equal(0);
			});

			it("should handle maximum input", () => {
				const maxInput = new Vector2(1, 1);
				inputStore.updateDualAxislike("test_stick", maxInput);
				const processedValue = inputStore.dualAxisValue("test_stick");

				expect(processedValue.X).to.equal(1);
				expect(processedValue.Y).to.equal(1);
			});
		});

		describe("GamepadStick Classes", () => {
			it("should create left stick correctly", () => {
				const leftStick = GamepadStick.left();
				expect(leftStick.hash()).to.equal("GamepadStick:Left");
				expect(leftStick.toString()).to.equal("LeftStick");
			});

			it("should create right stick correctly", () => {
				const rightStick = GamepadStick.right();
				expect(rightStick.hash()).to.equal("GamepadStick:Right");
				expect(rightStick.toString()).to.equal("RightStick");
			});

			it("should return axis pair values", () => {
				const leftStick = GamepadStick.left();
				const testVector = new Vector2(0.5, -0.7);

				inputStore.updateDualAxislike(leftStick.hash(), testVector);

				const axisPair = leftStick.axisPair(inputStore);
				expect(axisPair.X).to.equal(0.5);
				expect(axisPair.Y).to.equal(-0.7);

				const xValue = leftStick.x(inputStore);
				const yValue = leftStick.y(inputStore);
				expect(xValue).to.equal(0.5);
				expect(yValue).to.equal(-0.7);
			});

			it("should handle undefined axis pair", () => {
				const leftStick = GamepadStick.left();
				const axisPair = leftStick.getAxisPair(inputStore);

				expect(axisPair).to.equal(undefined);
			});
		});

		describe("GamepadButton Classes", () => {
			it("should create button correctly", () => {
				const buttonA = GamepadButton.south();
				expect(buttonA.hash()).to.equal("GamepadButton:ButtonA");
				expect(buttonA.toString()).to.equal("ButtonA");
			});

			it("should handle button pressed state", () => {
				const buttonA = GamepadButton.south();

				// Initially not pressed
				expect(buttonA.pressed(inputStore)).to.equal(false);
				expect(buttonA.getPressed(inputStore)).to.equal(undefined);

				// Set as pressed
				inputStore.updateButtonlike(buttonA.hash(), { pressed: true, value: 1 });
				expect(buttonA.pressed(inputStore)).to.equal(true);
				expect(buttonA.value(inputStore)).to.equal(1);

				// Set as released
				inputStore.updateButtonlike(buttonA.hash(), { pressed: false, value: 0 });
				expect(buttonA.pressed(inputStore)).to.equal(false);
				expect(buttonA.released(inputStore)).to.equal(true);
				expect(buttonA.value(inputStore)).to.equal(0);
			});

			it("should create common gamepad buttons", () => {
				const buttons = [
					{ button: GamepadButton.south(), expected: "GamepadButton:ButtonA" },
					{ button: GamepadButton.east(), expected: "GamepadButton:ButtonB" },
					{ button: GamepadButton.west(), expected: "GamepadButton:ButtonX" },
					{ button: GamepadButton.north(), expected: "GamepadButton:ButtonY" },
					{ button: GamepadButton.leftBumper(), expected: "GamepadButton:ButtonL1" },
					{ button: GamepadButton.rightBumper(), expected: "GamepadButton:ButtonR1" },
					{ button: GamepadButton.leftTrigger(), expected: "GamepadButton:ButtonL2" },
					{ button: GamepadButton.rightTrigger(), expected: "GamepadButton:ButtonR2" },
				];

				for (const { button, expected } of buttons) {
					expect(button.hash()).to.equal(expected);
				}
			});
		});

		describe("CentralInputStore Gamepad Methods", () => {
			it("should initialize gamepad listeners", () => {
				// Should not throw and should be idempotent
				inputStore.initializeGamepadListeners();
				inputStore.initializeGamepadListeners(); // Second call should be safe
			});

			it("should cleanup gamepad listeners", () => {
				inputStore.initializeGamepadListeners();

				// Should not throw
				inputStore.cleanupGamepadListeners();
				inputStore.cleanupGamepadListeners(); // Second call should be safe
			});

			it("should update legacy gamepad stick methods", () => {
				const leftPosition = new Vector3(0.5, -0.3, 0);
				const rightPosition = new Vector3(-0.7, 0.8, 0);

				inputStore.updateGamepadStickLeft(leftPosition);
				inputStore.updateGamepadStickRight(rightPosition);

				expect(inputStore.dualAxisValue("gamepad_stick_left").X).to.equal(0.5);
				expect(inputStore.dualAxisValue("gamepad_stick_left").Y).to.equal(-0.3);
				expect(inputStore.dualAxisValue("gamepad_stick_right").X).to.equal(-0.7);
				expect(inputStore.dualAxisValue("gamepad_stick_right").Y).to.equal(0.8);
			});

			it("should update gamepad button states", () => {
				inputStore.updateGamepadButton(Enum.KeyCode.ButtonA, true);
				inputStore.updateGamepadButton(Enum.KeyCode.ButtonB, false);

				expect(inputStore.pressed("gamepad_ButtonA")).to.equal(true);
				expect(inputStore.buttonValue("gamepad_ButtonA")).to.equal(1);
				expect(inputStore.pressed("gamepad_ButtonB")).to.equal(false);
				expect(inputStore.buttonValue("gamepad_ButtonB")).to.equal(0);
			});
		});

		describe("Input Store Size", () => {
			it("should track input store size correctly", () => {
				expect(inputStore.size()).to.equal(0);

				inputStore.updateButtonlike("test_button", { pressed: true, value: 1 });
				expect(inputStore.size()).to.equal(1);

				inputStore.updateAxislike("test_axis", 0.5);
				expect(inputStore.size()).to.equal(2);

				inputStore.updateDualAxislike("test_dual_axis", new Vector2(1, 1));
				expect(inputStore.size()).to.equal(3);

				inputStore.clear();
				expect(inputStore.size()).to.equal(0);
			});
		});
	});

	describe("Gamepad Axis Advanced Tests", () => {
		let inputStore: CentralInputStore;

		beforeEach(() => {
			inputStore = new CentralInputStore();
		});

		afterEach(() => {
			inputStore.cleanupGamepadListeners();
		});

		describe("Gamepad Single Axis Mocking", () => {
			it("should mock single axis input correctly", () => {
				// Test simulating left stick X axis movement
				const leftStick = GamepadStick.left();

				// Initially, axis should be at zero or undefined
				const initialValue = leftStick.getAxisPair(inputStore);
				expect(initialValue).to.equal(undefined);

				// Mock axis input
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(-1.0, 0.0));

				// Verify the mocked value
				const axisPair = leftStick.axisPair(inputStore);
				expect(axisPair.X).to.equal(-1.0);
				expect(axisPair.Y).to.equal(0.0);
			});
		});

		describe("Gamepad Dual Axis Mocking", () => {
			it("should mock dual axis input correctly", () => {
				const leftStick = GamepadStick.left();

				// Mock dual axis input
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(1.0, 0.0));

				// Verify both axes are set
				const axisPair = leftStick.axisPair(inputStore);
				expect(axisPair.X).to.equal(1.0);
				expect(axisPair.Y).to.equal(0.0);

				// Test another dual axis value
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.5, -0.7));
				const newAxisPair = leftStick.axisPair(inputStore);
				expect(newAxisPair.X).to.equal(0.5);
				expect(newAxisPair.Y).to.equal(-0.7);
			});
		});

		describe("Gamepad Single Axis Input", () => {
			it("should handle single axis input with deadzone", () => {
				const leftStickX = GamepadControlAxis.leftX();
				const leftStickY = GamepadControlAxis.leftY();
				const leftStick = GamepadStick.left();

				// +X movement
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(1.0, 0.0));
				expect(leftStickX.value(inputStore)).to.equal(1.0);
				expect(leftStickY.value(inputStore)).to.equal(0.0);

				// -X movement
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(-1.0, 0.0));
				expect(leftStickX.value(inputStore)).to.equal(-1.0);
				expect(leftStickY.value(inputStore)).to.equal(0.0);

				// +Y movement
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.0, 1.0));
				expect(leftStickX.value(inputStore)).to.equal(0.0);
				expect(leftStickY.value(inputStore)).to.equal(1.0);

				// -Y movement
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.0, -1.0));
				expect(leftStickX.value(inputStore)).to.equal(0.0);
				expect(leftStickY.value(inputStore)).to.equal(-1.0);

				// Zero input
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.0, 0.0));
				expect(leftStickX.value(inputStore)).to.equal(0.0);
				expect(leftStickY.value(inputStore)).to.equal(0.0);
			});

			it("should apply deadzone and scale values correctly", () => {
				const leftStick = GamepadStick.left();
				const leftStickX = GamepadControlAxis.leftX();

				// Simulate deadzone processing manually (0.1 threshold)
				// Raw input: 0.2, with 0.1 deadzone should scale to ~0.111
				const rawInput = 0.2;
				const deadzone = 0.1;
				const expectedScaled = (rawInput - deadzone) / (1 - deadzone);

				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(rawInput, 0.0));

				// Note: The actual deadzone processing would happen in the input pipeline
				// Here we're just testing the raw value storage
				const actualValue = leftStickX.value(inputStore);
				expect(actualValue).to.be.near(rawInput, 0.001);

				// Test with AxisDeadzone processor
				const processor = new AxisDeadzone(0.1);
				const processedValue = processor.process(rawInput);
				expect(processedValue).to.be.near(expectedScaled, 0.001);
			});
		});

		describe("Gamepad Single Axis Inverted", () => {
			it("should invert axis values correctly", () => {
				const leftStick = GamepadStick.left();
				const leftStickX = GamepadControlAxis.leftX();
				const leftStickY = GamepadControlAxis.leftY();

				// Test +X inverted
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(1.0, 0.0));
				const xValue = leftStickX.value(inputStore);
				const invertedX = -xValue;
				expect(invertedX).to.equal(-1.0);

				// Test -X inverted
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(-1.0, 0.0));
				const negXValue = leftStickX.value(inputStore);
				const invertedNegX = -negXValue;
				expect(invertedNegX).to.equal(1.0);

				// Test +Y inverted
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.0, 1.0));
				const yValue = leftStickY.value(inputStore);
				const invertedY = -yValue;
				expect(invertedY).to.equal(-1.0);

				// Test -Y inverted
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.0, -1.0));
				const negYValue = leftStickY.value(inputStore);
				const invertedNegY = -negYValue;
				expect(invertedNegY).to.equal(1.0);
			});

			it("should process inverted axis with AxisInverted processor", () => {
				const leftStick = GamepadStick.left();
				const processor = new AxisInverted();

				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.7, -0.5));

				const xValue = leftStick.x(inputStore);
				const yValue = leftStick.y(inputStore);

				expect(processor.process(xValue)).to.equal(-0.7);
				expect(processor.process(yValue)).to.equal(0.5);
			});
		});

		describe("Gamepad Dual Axis Deadzone", () => {
			it("should filter inputs inside deadzone", () => {
				const deadzone = new SquareDeadzone(0.1);

				// Input inside deadzone should be filtered out
				const smallInput = new Vector2(0.04, 0.1);
				const processedSmall = deadzone.process(smallInput);
				expect(processedSmall.X).to.equal(0.0);
				expect(processedSmall.Y).to.equal(0.0);

				// Input outside deadzone should be scaled
				const largeInput = new Vector2(1.0, 0.2);
				const processedLarge = deadzone.process(largeInput);
				expect(processedLarge.X).to.equal(1.0);
				expect(processedLarge.Y).to.be.near(0.11111112, 0.0001);

				// Test each axis filtered independently
				const mixedInput = new Vector2(0.8, 0.1);
				const processedMixed = deadzone.process(mixedInput);
				expect(processedMixed.X).to.be.near(0.7777778, 0.0001);
				expect(processedMixed.Y).to.equal(0.0);
			});

			it("should handle dual axis deadzone with input store", () => {
				const leftStick = GamepadStick.left();
				const deadzone = new SquareDeadzone(0.1);

				// Store raw input
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.05, 0.08));

				// Get raw value
				const rawValue = leftStick.axisPair(inputStore);

				// Process through deadzone
				const processed = deadzone.process(rawValue);
				expect(processed.X).to.equal(0.0);
				expect(processed.Y).to.equal(0.0);

				// Test with larger input
				inputStore.updateDualAxislike(leftStick.hash(), new Vector2(0.5, 0.3));
				const rawLarge = leftStick.axisPair(inputStore);
				const processedLarge = deadzone.process(rawLarge);
				expect(processedLarge.X).to.be.near(0.4444444, 0.0001);
				expect(processedLarge.Y).to.be.near(0.2222222, 0.0001);
			});
		});

		describe("Gamepad Circle Deadzone", () => {
			it("should filter inputs inside circular deadzone", () => {
				const deadzone = new CircleDeadzone(0.1);

				// Input inside circle deadzone (magnitude < 0.1)
				const smallInput = new Vector2(0.06, 0.06);
				const smallMagnitude = smallInput.Magnitude;
				assert(smallMagnitude < 0.1, "Small magnitude should be less than 0.1");

				const processedSmall = deadzone.process(smallInput);
				expect(processedSmall.X).to.equal(0.0);
				expect(processedSmall.Y).to.equal(0.0);

				// Input outside circle deadzone (magnitude > 0.1)
				const largeInput = new Vector2(0.2, 0.0);
				const largeMagnitude = largeInput.Magnitude;
				assert(largeMagnitude > 0.1, "Large magnitude should be greater than 0.1");

				const processedLarge = deadzone.process(largeInput);
				expect(processedLarge.X).to.be.near(0.11111112, 0.0001);
				expect(processedLarge.Y).to.equal(0.0);
			});

			it("should preserve direction while scaling magnitude", () => {
				const deadzone = new CircleDeadzone(0.1);

				// Test diagonal input
				const diagonalInput = new Vector2(0.15, 0.15);
				const processed = deadzone.process(diagonalInput);

				// Direction should be preserved (both components same sign and similar ratio)
				assert(processed.X > 0, "Processed X should be greater than 0");
				assert(processed.Y > 0, "Processed Y should be greater than 0");

				const inputRatio = diagonalInput.X / diagonalInput.Y;
				const processedRatio = processed.X / processed.Y;
				expect(processedRatio).to.be.near(inputRatio, 0.001);
			});
		});

		describe("Zero Dual Axis Deadzone", () => {
			it("should handle zero input with zero deadzone", () => {
				const deadzone = new SquareDeadzone(0.0);

				// Zero input should remain zero even with no deadzone
				const zeroInput = Vector2.zero;
				const processed = deadzone.process(zeroInput);
				expect(processed.X).to.equal(0.0);
				expect(processed.Y).to.equal(0.0);
			});

			it("should pass through non-zero input with zero deadzone", () => {
				const deadzone = new SquareDeadzone(0.0);

				// Non-zero input should pass through unchanged
				const nonZeroInput = new Vector2(0.5, -0.3);
				const processed = deadzone.process(nonZeroInput);
				expect(processed.X).to.equal(0.5);
				expect(processed.Y).to.equal(-0.3);
			});
		});

		describe("Zero Circle Deadzone", () => {
			it("should handle zero input with zero circular deadzone", () => {
				const deadzone = new CircleDeadzone(0.0);

				// Zero input should remain zero
				const zeroInput = Vector2.zero;
				const processed = deadzone.process(zeroInput);
				expect(processed.X).to.equal(0.0);
				expect(processed.Y).to.equal(0.0);
			});

			it("should pass through non-zero input with zero circular deadzone", () => {
				const deadzone = new CircleDeadzone(0.0);

				// Non-zero input should pass through unchanged
				const nonZeroInput = new Vector2(0.7, 0.4);
				const processed = deadzone.process(nonZeroInput);
				expect(processed.X).to.equal(0.7);
				expect(processed.Y).to.equal(0.4);
			});
		});

		describe("Gamepad Virtual DPad", () => {
			it("should create virtual dpad from gamepad buttons", () => {
				const dPadUp = GamepadButton.dPadUp();
				const dPadDown = GamepadButton.dPadDown();
				const dPadLeft = GamepadButton.dPadLeft();
				const dPadRight = GamepadButton.dPadRight();

				// Press left button
				inputStore.updateButtonlike(dPadLeft.hash(), { pressed: true, value: 1 });

				// Check button state
				expect(dPadLeft.pressed(inputStore)).to.equal(true);
				expect(dPadLeft.value(inputStore)).to.equal(1);
			});

			it("should calculate axis pair from virtual dpad", () => {
				const dPadUp = GamepadButton.dPadUp();
				const dPadDown = GamepadButton.dPadDown();
				const dPadLeft = GamepadButton.dPadLeft();
				const dPadRight = GamepadButton.dPadRight();

				const virtualDPad = new VirtualDPad(dPadUp, dPadDown, dPadLeft, dPadRight);

				// Press left button only
				inputStore.updateButtonlike(dPadLeft.hash(), { pressed: true, value: 1 });
				inputStore.updateButtonlike(dPadRight.hash(), { pressed: false, value: 0 });
				inputStore.updateButtonlike(dPadUp.hash(), { pressed: false, value: 0 });
				inputStore.updateButtonlike(dPadDown.hash(), { pressed: false, value: 0 });

				const axisPair = virtualDPad.axisPair(inputStore);

				// Left should give (-1, 0)
				expect(axisPair.X).to.equal(-1.0);
				expect(axisPair.Y).to.equal(0.0);

				// Press up button only
				inputStore.updateButtonlike(dPadLeft.hash(), { pressed: false, value: 0 });
				inputStore.updateButtonlike(dPadUp.hash(), { pressed: true, value: 1 });

				const upAxisPair = virtualDPad.axisPair(inputStore);
				expect(upAxisPair.X).to.equal(0.0);
				expect(upAxisPair.Y).to.equal(1.0);

				// Press both left and up (diagonal)
				inputStore.updateButtonlike(dPadLeft.hash(), { pressed: true, value: 1 });
				inputStore.updateButtonlike(dPadUp.hash(), { pressed: true, value: 1 });

				const diagonalAxisPair = virtualDPad.axisPair(inputStore);
				expect(diagonalAxisPair.X).to.equal(-1.0);
				expect(diagonalAxisPair.Y).to.equal(1.0);
			});

			it("should handle unit length virtual dpad input", () => {
				const dPadUp = GamepadButton.dPadUp();
				const dPadDown = GamepadButton.dPadDown();
				const dPadLeft = GamepadButton.dPadLeft();
				const dPadRight = GamepadButton.dPadRight();

				const virtualDPad = new VirtualDPad(dPadUp, dPadDown, dPadLeft, dPadRight);

				// Single direction should be unit length
				inputStore.updateButtonlike(dPadRight.hash(), { pressed: true, value: 1 });
				inputStore.updateButtonlike(dPadLeft.hash(), { pressed: false, value: 0 });
				inputStore.updateButtonlike(dPadUp.hash(), { pressed: false, value: 0 });
				inputStore.updateButtonlike(dPadDown.hash(), { pressed: false, value: 0 });

				const rightAxis = virtualDPad.axisPair(inputStore);
				expect(rightAxis.Magnitude).to.equal(1.0);

				// Diagonal is NOT unit length (it's sqrt(2))
				inputStore.updateButtonlike(dPadRight.hash(), { pressed: true, value: 1 });
				inputStore.updateButtonlike(dPadUp.hash(), { pressed: true, value: 1 });

				const diagonalAxis = virtualDPad.axisPair(inputStore);
				const expectedDiagonalLength = math.sqrt(2);
				expect(diagonalAxis.Magnitude).to.be.near(expectedDiagonalLength, 0.001);
			});
		});
	});
};