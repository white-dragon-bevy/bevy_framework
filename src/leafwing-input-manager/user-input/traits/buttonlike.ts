import { UserInput } from "./user-input";
import { CentralInputStore } from "../central-input-store";
import { World } from "@rbxts/matter";

/**
 * Represents the state and value of a button
 */
export interface ButtonValue {
	pressed: boolean;
	value: number;
}

/**
 * A trait used for buttonlike user inputs, which can be pressed or released
 * with a value for how much they are pressed
 */
export interface Buttonlike extends UserInput {
	/**
	 * Checks if the input is currently active
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns True if pressed, false otherwise
	 */
	pressed(inputStore: CentralInputStore, gamepad?: number): boolean;

	/**
	 * Checks if the input is currently active
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns True if pressed, undefined if never pressed
	 */
	getPressed(inputStore: CentralInputStore, gamepad?: number): boolean | undefined;

	/**
	 * Checks if the input is currently inactive
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns True if released, false otherwise
	 */
	released(inputStore: CentralInputStore, gamepad?: number): boolean;

	/**
	 * Gets the current value of the button as a number
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A value between 0.0 and 1.0
	 */
	value(inputStore: CentralInputStore, gamepad?: number): number;

	/**
	 * Gets the current value of the button as a number
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A value between 0.0 and 1.0, or undefined if never pressed
	 */
	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined;

	/**
	 * Simulates a press of the buttonlike input
	 * @param world - The game world
	 */
	press(world: World): void;

	/**
	 * Simulates a release of the buttonlike input
	 * @param world - The game world
	 */
	release(world: World): void;

	/**
	 * Sets the value of the buttonlike input
	 * @param world - The game world
	 * @param value - The value to set (0.0 to 1.0)
	 */
	setValue(world: World, value: number): void;
}