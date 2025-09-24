import { UserInput } from "./user-input";
import { CentralInputStore } from "../central-input-store";
import { World } from "@rbxts/matter";

/**
 * A trait used for triple-axislike user inputs, which provide X, Y, and Z axis values
 */
export interface TripleAxislike extends UserInput {
	/**
	 * Gets the current axis triple value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A Vector3 with X, Y, and Z values
	 */
	axisTriple(inputStore: CentralInputStore, gamepad?: number): Vector3;

	/**
	 * Gets the current axis triple value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns A Vector3 with X, Y, and Z values, or undefined if never set
	 */
	getAxisTriple(inputStore: CentralInputStore, gamepad?: number): Vector3 | undefined;

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
	 * Gets only the Z axis value
	 * @param inputStore - The central input store
	 * @param gamepad - The gamepad entity (if applicable)
	 * @returns The Z axis value
	 */
	z(inputStore: CentralInputStore, gamepad?: number): number;

	/**
	 * Sets the axis triple value
	 * @param world - The game world
	 * @param value - The Vector3 value to set
	 */
	setAxisTriple(world: World, value: Vector3): void;
}