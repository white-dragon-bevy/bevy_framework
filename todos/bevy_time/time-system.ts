import { World } from "@rbxts/matter";
import { FixedTime, RealTime, Time, VirtualTime } from "./time";

/**
 * Time plugin resources
 */
export interface TimeResources {
	time: Time;
	realTime: RealTime;
	virtualTime: VirtualTime;
	fixedTime: FixedTime;
}

/**
 * Initialize time resources in the world
 * @param world - The Matter world
 * @returns The time resources
 */
export function initTimeResources(world: World): TimeResources {
	const resources: TimeResources = {
		time: new Time(),
		realTime: new RealTime(),
		virtualTime: new VirtualTime(),
		fixedTime: new FixedTime(),
	};

	// Store resources in world (using a simple resource storage pattern)
	(world as any).__timeResources = resources;

	return resources;
}

/**
 * Get time resources from the world
 * @param world - The Matter world
 * @returns The time resources
 */
export function getTimeResources(world: World): TimeResources | undefined {
	return (world as any).__timeResources as TimeResources | undefined;
}

/**
 * Update time system
 * @param world - The Matter world
 * @param currentTime - Optional current time from os.clock()
 */
export function updateTimeSystem(world: World, currentTime?: number): void {
	const resources = getTimeResources(world);
	if (!resources) {
		return;
	}

	const now = currentTime ?? os.clock();

	// Always update real time
	resources.realTime.update(now);

	// Update virtual time (can be paused/scaled)
	resources.virtualTime.update(now);

	// Update main time reference (defaults to virtual time)
	resources.time.update(now);
}

/**
 * Update fixed time system
 * @param world - The Matter world
 * @param deltaTime - Delta time to accumulate
 * @returns Whether a fixed update should run
 */
export function updateFixedTimeSystem(world: World, deltaTime: number): boolean {
	const resources = getTimeResources(world);
	if (!resources) {
		return false;
	}

	return resources.fixedTime.accumulate(deltaTime);
}

/**
 * Time system that updates all time resources
 * @param world - The Matter world
 */
export function timeSystem(world: World): void {
	updateTimeSystem(world);
}

/**
 * Fixed time system that checks for fixed updates
 * @param world - The Matter world
 * @returns A function that returns whether to run fixed update
 */
export function fixedTimeSystem(world: World): () => boolean {
	return () => {
		const resources = getTimeResources(world);
		if (!resources) {
			return false;
		}

		const deltaTime = resources.virtualTime.deltaTime;
		return updateFixedTimeSystem(world, deltaTime);
	};
}

/**
 * Run a fixed update schedule
 * @param world - The Matter world
 * @param fixedUpdateFn - The fixed update function to run
 */
export function runFixedUpdate(world: World, fixedUpdateFn: () => void): void {
	const resources = getTimeResources(world);
	if (!resources) {
		return;
	}

	const deltaTime = resources.virtualTime.deltaTime;
	let maxIterations = 4; // Prevent spiral of death

	while (resources.fixedTime.accumulate(deltaTime) && maxIterations > 0) {
		// Temporarily set main time to fixed time
		const savedTime = resources.time;
		resources.time = resources.fixedTime as any;

		// Run fixed update
		fixedUpdateFn();

		// Restore main time
		resources.time = savedTime;

		maxIterations--;
	}
}
