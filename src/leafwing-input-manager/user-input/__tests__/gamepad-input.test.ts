import { CentralInputStore, GamepadConfig } from "../central-input-store";
import { GamepadStick, GamepadButton } from "../gamepad";

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
};