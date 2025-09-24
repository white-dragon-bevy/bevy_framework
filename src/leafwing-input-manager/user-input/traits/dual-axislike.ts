import { UserInput } from "./user-input";
import { CentralInputStore } from "../central-input-store";
import { World } from "@rbxts/matter";

/**
 * A trait used for dual-axislike user inputs, which provide X and Y axis values
 */
export interface DualAxislike extends UserInput {
	/**
	 * Gets the current axis pair value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A Vector2 with X and Y values
	 */
	axisPair(inputStore: CentralInputStore, gamepad?: number): Vector2;

	/**
	 * Gets the current axis pair value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A Vector2 with X and Y values, or undefined if never set
	 */
	getAxisPair(inputStore: CentralInputStore, gamepad?: number): Vector2 | undefined;

	/**
	 * Gets only the X axis value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns The X axis value
	 */
	x(inputStore: CentralInputStore, gamepad?: number): number;

	/**
	 * Gets only the Y axis value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns The Y axis value
	 */
	y(inputStore: CentralInputStore, gamepad?: number): number;

	/**
	 * Sets the axis pair value
	 * @param world - The game world
	 * @param value - The Vector2 value to set
	 */
	setAxisPair(world: World, value: Vector2): void;
}