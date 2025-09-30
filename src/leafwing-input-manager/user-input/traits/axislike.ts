import { UserInput } from "./user-input";
import { CentralInputStore } from "../central-input-store";
import { World } from "@rbxts/matter";

/**
 * A trait used for axislike user inputs, which provide a continuous value
 */
export interface Axislike extends UserInput {
	/**
	 * Gets the current value of the axis
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A value typically between -1.0 and 1.0
	 */
	value(inputStore: CentralInputStore, gamepad?: number): number;

	/**
	 * Gets the current value of the axis
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A value typically between -1.0 and 1.0, or undefined if never set
	 */
	getValue(inputStore: CentralInputStore, gamepad?: number): number | undefined;

	/**
	 * Sets the value of the axis
	 * @param world - The game world
	 * @param value - The value to set (typically -1.0 to 1.0)
	 */
	setValue(world: World, value: number): void;
}
