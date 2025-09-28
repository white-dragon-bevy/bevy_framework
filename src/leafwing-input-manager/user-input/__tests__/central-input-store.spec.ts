/**
 * Unit tests for CentralInputStore
 */

import { CentralInputStore } from "../central-input-store";

export = () => {
	let store: CentralInputStore;

	beforeEach(() => {
		store = new CentralInputStore();
	});

	describe("CentralInputStore", () => {
		describe("buttonlike inputs", () => {
			it("should store and retrieve button values", () => {
				const key = "test_button";
				const value = { pressed: true, value: 1.0 };

				store.updateButtonlike(key, value);

				expect(store.pressed(key)).to.equal(true);
				expect(store.buttonValue(key)).to.equal(1.0);

				const retrievedValue = store.getButtonValue(key);
				expect(retrievedValue).to.be.ok();
				expect(retrievedValue!.pressed).to.equal(true);
				expect(retrievedValue!.value).to.equal(1.0);
			});

			it("should return default values for unset buttons", () => {
				const key = "unset_button";

				expect(store.pressed(key)).to.equal(undefined);
				expect(store.buttonValue(key)).to.equal(0);
				expect(store.getButtonValue(key)).to.equal(undefined);
			});

			it("should update button state correctly", () => {
				const key = "toggle_button";

				// Initially pressed
				store.updateButtonlike(key, { pressed: true, value: 0.8 });
				expect(store.pressed(key)).to.equal(true);
				expect(store.buttonValue(key)).to.equal(0.8);

				// Then released
				store.updateButtonlike(key, { pressed: false, value: 0 });
				expect(store.pressed(key)).to.equal(false);
				expect(store.buttonValue(key)).to.equal(0);
			});
		});

		describe("axislike inputs", () => {
			it("should store and retrieve axis values", () => {
				const key = "test_axis";
				const value = 0.75;

				store.updateAxislike(key, value);

				expect(store.axisValue(key)).to.equal(value);
				expect(store.getAxisValue(key)).to.equal(value);
			});

			it("should return default values for unset axes", () => {
				const key = "unset_axis";

				expect(store.axisValue(key)).to.equal(0);
				expect(store.getAxisValue(key)).to.equal(undefined);
			});

			it("should handle negative axis values", () => {
				const key = "negative_axis";
				const value = -0.5;

				store.updateAxislike(key, value);

				expect(store.axisValue(key)).to.equal(value);
			});
		});

		describe("dual-axislike inputs", () => {
			it("should store and retrieve dual axis values", () => {
				const key = "test_dual_axis";
				const value = new Vector2(0.5, -0.3);

				store.updateDualAxislike(key, value);

				const retrieved = store.dualAxisValue(key);
				const epsilon = 0.0001;
				expect(math.abs(retrieved.X - 0.5)).to.be.near(0, epsilon);
				expect(math.abs(retrieved.Y - (-0.3))).to.be.near(0, epsilon);

				const directRetrieved = store.getDualAxisValue(key);
				expect(directRetrieved).to.be.ok();
				expect(math.abs(directRetrieved!.X - 0.5)).to.be.near(0, epsilon);
				expect(math.abs(directRetrieved!.Y - (-0.3))).to.be.near(0, epsilon);
			});

			it("should return zero vector for unset dual axes", () => {
				const key = "unset_dual_axis";

				const retrieved = store.dualAxisValue(key);
				expect(retrieved.X).to.equal(0);
				expect(retrieved.Y).to.equal(0);
				expect(retrieved).to.equal(Vector2.zero);

				expect(store.getDualAxisValue(key)).to.equal(undefined);
			});
		});

		describe("triple-axislike inputs", () => {
			it("should store and retrieve triple axis values", () => {
				const key = "test_triple_axis";
				const value = new Vector3(0.5, -0.3, 0.8);

				store.updateTripleAxislike(key, value);

				const retrieved = store.tripleAxisValue(key);
				const epsilon = 0.0001;
				expect(math.abs(retrieved.X - 0.5)).to.be.near(0, epsilon);
				expect(math.abs(retrieved.Y - (-0.3))).to.be.near(0, epsilon);
				expect(math.abs(retrieved.Z - 0.8)).to.be.near(0, epsilon);

				const directRetrieved = store.getTripleAxisValue(key);
				expect(directRetrieved).to.be.ok();
				expect(math.abs(directRetrieved!.X - 0.5)).to.be.near(0, epsilon);
				expect(math.abs(directRetrieved!.Y - (-0.3))).to.be.near(0, epsilon);
				expect(math.abs(directRetrieved!.Z - 0.8)).to.be.near(0, epsilon);
			});

			it("should return zero vector for unset triple axes", () => {
				const key = "unset_triple_axis";

				const retrieved = store.tripleAxisValue(key);
				expect(retrieved.X).to.equal(0);
				expect(retrieved.Y).to.equal(0);
				expect(retrieved.Z).to.equal(0);
				expect(retrieved).to.equal(Vector3.zero);

				expect(store.getTripleAxisValue(key)).to.equal(undefined);
			});
		});

		describe("clear functionality", () => {
			it("should clear all stored values", () => {
				// Add various inputs
				store.updateButtonlike("button1", { pressed: true, value: 1 });
				store.updateAxislike("axis1", 0.5);
				store.updateDualAxislike("dual1", new Vector2(1, 1));
				store.updateTripleAxislike("triple1", new Vector3(1, 1, 1));

				// Verify they exist
				expect(store.size()).to.equal(4);

				// Clear the store
				store.clear();

				// Verify all are cleared
				expect(store.size()).to.equal(0);
				expect(store.pressed("button1")).to.equal(undefined);
				expect(store.axisValue("axis1")).to.equal(0);
				expect(store.dualAxisValue("dual1")).to.equal(Vector2.zero);
				expect(store.tripleAxisValue("triple1")).to.equal(Vector3.zero);
			});
		});

		describe("size tracking", () => {
			it("should correctly track the number of stored inputs", () => {
				expect(store.size()).to.equal(0);

				store.updateButtonlike("button1", { pressed: true, value: 1 });
				expect(store.size()).to.equal(1);

				store.updateAxislike("axis1", 0.5);
				expect(store.size()).to.equal(2);

				store.updateDualAxislike("dual1", new Vector2(1, 0));
				expect(store.size()).to.equal(3);

				store.updateTripleAxislike("triple1", new Vector3(1, 1, 1));
				expect(store.size()).to.equal(4);

				// Update existing value shouldn't change size
				store.updateButtonlike("button1", { pressed: false, value: 0 });
				expect(store.size()).to.equal(4);

				store.clear();
				expect(store.size()).to.equal(0);
			});
		});

		describe("keyboard input methods", () => {
			it("should update keyboard key states", () => {
				store.updateKeyboardKey(Enum.KeyCode.Space, true);

				const key = "keyboard_Space";
				expect(store.pressed(key)).to.equal(true);
				expect(store.buttonValue(key)).to.equal(1);

				store.updateKeyboardKey(Enum.KeyCode.Space, false);
				expect(store.pressed(key)).to.equal(false);
				expect(store.buttonValue(key)).to.equal(0);
			});
		});

		describe("mouse input methods", () => {
			it("should update mouse button states", () => {
				store.updateMouseButton(Enum.UserInputType.MouseButton1, true);

				const key = "mouse_MouseButton1";
				expect(store.pressed(key)).to.equal(true);
				expect(store.buttonValue(key)).to.equal(1);

				store.updateMouseButton(Enum.UserInputType.MouseButton1, false);
				expect(store.pressed(key)).to.equal(false);
				expect(store.buttonValue(key)).to.equal(0);
			});

			it("should update mouse movement", () => {
				const delta = new Vector2(10, -5);
				store.updateMouseMove(delta);

				const retrieved = store.dualAxisValue("mouse_move");
				expect(retrieved.X).to.equal(10);
				expect(retrieved.Y).to.equal(-5);
			});

			it("should update mouse wheel", () => {
				const delta = 3;
				store.updateMouseWheel(delta);

				expect(store.axisValue("mouse_wheel")).to.equal(3);
			});
		});

		describe("gamepad input methods", () => {
			it("should update gamepad button states", () => {
				store.updateGamepadButton(Enum.KeyCode.ButtonA, true);

				const key = "gamepad_ButtonA";
				expect(store.pressed(key)).to.equal(true);
				expect(store.buttonValue(key)).to.equal(1);

				store.updateGamepadButton(Enum.KeyCode.ButtonA, false);
				expect(store.pressed(key)).to.equal(false);
				expect(store.buttonValue(key)).to.equal(0);
			});

			it("should update left gamepad stick", () => {
				const position = new Vector3(0.5, -0.3, 0);
				store.updateGamepadStickLeft(position);

				const retrieved = store.dualAxisValue("gamepad_stick_left");
				const epsilon = 0.0001;
				expect(math.abs(retrieved.X - 0.5)).to.be.near(0, epsilon);
				expect(math.abs(retrieved.Y - (-0.3))).to.be.near(0, epsilon);
			});

			it("should update right gamepad stick", () => {
				const position = new Vector3(-0.8, 0.2, 0);
				store.updateGamepadStickRight(position);

				const retrieved = store.dualAxisValue("gamepad_stick_right");
				const epsilon = 0.0001;
				expect(math.abs(retrieved.X - (-0.8))).to.be.near(0, epsilon);
				expect(math.abs(retrieved.Y - 0.2)).to.be.near(0, epsilon);
			});
		});

		describe("gamepad configuration", () => {
			it("should set and get gamepad configuration", () => {
				const config = store.getGamepadConfig();
				expect(config.deadZone).to.equal(0.1);
				expect(config.sensitivity).to.equal(1.0);

				store.setGamepadConfig({
					deadZone: 0.15,
					sensitivity: 1.5,
				});

				const updatedConfig = store.getGamepadConfig();
				expect(updatedConfig.deadZone).to.equal(0.15);
				expect(updatedConfig.sensitivity).to.equal(1.5);
			});

			it("should allow partial config updates", () => {
				store.setGamepadConfig({ deadZone: 0.2 });

				const config = store.getGamepadConfig();
				expect(config.deadZone).to.equal(0.2);
				expect(config.sensitivity).to.equal(1.0); // Unchanged

				store.setGamepadConfig({ sensitivity: 0.8 });

				const config2 = store.getGamepadConfig();
				expect(config2.deadZone).to.equal(0.2); // Unchanged
				expect(config2.sensitivity).to.equal(0.8);
			});
		});
	});
};