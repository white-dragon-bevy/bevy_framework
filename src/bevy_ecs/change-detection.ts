/**
 * @fileoverview Change detection system for Bevy ECS
 * Tracks component changes and additions for reactive programming
 */

import { Component } from "@rbxts/matter";
import type { AnyEntity } from "@rbxts/matter";
import type { ComponentCtor } from "./query";
import { World } from "./bevy-world";
import { QueryFilter } from "./query";

/**
 * Type representing a tick counter for change tracking
 */
export type Tick = number;

/**
 * Change tracker that monitors component modifications and additions
 */
export class ChangeTracker {
	private currentTick: Tick = 0;
	private readonly componentChanges = new Map<number, Map<ComponentCtor, Tick>>();
	private readonly componentAdded = new Map<number, Map<ComponentCtor, Tick>>();
	private readonly entitySpawnTick = new Map<number, Tick>();

	/**
	 * Increment the global tick counter
	 * Should be called once per frame/update cycle
	 */
	incrementTick(): void {
		this.currentTick++;
	}

	/**
	 * Get the current tick value
	 * @returns Current tick
	 */
	getCurrentTick(): Tick {
		return this.currentTick;
	}

	/**
	 * Mark a component as changed on an entity
	 * @param entity - The entity whose component changed
	 * @param component - The component that changed
	 */
	markChanged(entity: number, component: ComponentCtor): void {
		let entityChanges = this.componentChanges.get(entity);
		if (!entityChanges) {
			entityChanges = new Map();
			this.componentChanges.set(entity, entityChanges);
		}
		entityChanges.set(component, this.currentTick);
	}

	/**
	 * Mark a component as added to an entity
	 * @param entity - The entity that received the component
	 * @param component - The component that was added
	 */
	markAdded(entity: number, component: ComponentCtor): void {
		let entityAdded = this.componentAdded.get(entity);
		if (!entityAdded) {
			entityAdded = new Map();
			this.componentAdded.set(entity, entityAdded);
		}
		entityAdded.set(component, this.currentTick);

		// Also mark as changed
		this.markChanged(entity, component);
	}

	/**
	 * Mark an entity as spawned
	 * @param entity - The entity that was spawned
	 */
	markSpawned(entity: number): void {
		this.entitySpawnTick.set(entity, this.currentTick);
	}

	/**
	 * Check if a component has changed since a given tick
	 * @param entity - The entity to check
	 * @param component - The component to check
	 * @param sinceTick - Check if changed after this tick
	 * @returns True if the component changed after sinceTick
	 */
	hasChanged(entity: number, component: ComponentCtor, sinceTick: Tick): boolean {
		const changeTick = this.componentChanges.get(entity)?.get(component);
		return changeTick !== undefined && changeTick > sinceTick;
	}

	/**
	 * Check if a component was added since a given tick
	 * @param entity - The entity to check
	 * @param component - The component to check
	 * @param sinceTick - Check if added after this tick
	 * @returns True if the component was added after sinceTick
	 */
	wasAdded(entity: number, component: ComponentCtor, sinceTick: Tick): boolean {
		const addedTick = this.componentAdded.get(entity)?.get(component);
		return addedTick !== undefined && addedTick > sinceTick;
	}

	/**
	 * Check if an entity was spawned since a given tick
	 * @param entity - The entity to check
	 * @param sinceTick - Check if spawned after this tick
	 * @returns True if the entity was spawned after sinceTick
	 */
	wasSpawned(entity: number, sinceTick: Tick): boolean {
		const spawnTick = this.entitySpawnTick.get(entity);
		return spawnTick !== undefined && spawnTick > sinceTick;
	}

	/**
	 * Clean up tracking data for a despawned entity
	 * @param entity - The entity that was despawned
	 */
	cleanupEntity(entity: number): void {
		this.componentChanges.delete(entity);
		this.componentAdded.delete(entity);
		this.entitySpawnTick.delete(entity);
	}

	/**
	 * Clear all tracking data older than the specified tick
	 * @param beforeTick - Clear data older than this tick
	 */
	clearOldData(beforeTick: Tick): void {
		// Clear old component changes
		for (const [entity, changes] of this.componentChanges) {
			for (const [component, tick] of changes) {
				if (tick < beforeTick) {
					changes.delete(component);
				}
			}
			if (changes.size() === 0) {
				this.componentChanges.delete(entity);
			}
		}

		// Clear old component additions
		for (const [entity, additions] of this.componentAdded) {
			for (const [component, tick] of additions) {
				if (tick < beforeTick) {
					additions.delete(component);
				}
			}
			if (additions.size() === 0) {
				this.componentAdded.delete(entity);
			}
		}

		// Clear old spawn data
		for (const [entity, tick] of this.entitySpawnTick) {
			if (tick < beforeTick) {
				this.entitySpawnTick.delete(entity);
			}
		}
	}
}

/**
 * Changed<T> filter - matches entities where the component has changed recently
 * @template T - The component type to check for changes
 */
export class Changed<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;
	private readonly tracker: ChangeTracker;
	private lastCheckTick: Tick = -1;

	/**
	 * Create a new Changed filter
	 * @param component - The component to check for changes
	 * @param tracker - The change tracker to use
	 */
	constructor(component: ComponentCtor, tracker: ChangeTracker) {
		this.component = component;
		this.tracker = tracker;
	}

	matches(world: World, entity: AnyEntity): boolean {
		// Check if entity exists first
		if (!world.contains(entity)) {
			return false;
		}

		// Entity must have the component
		if (!world.get(entity, this.component)) {
			return false;
		}

		// Check if changed since last check
		const changed = this.tracker.hasChanged(entity as number, this.component, this.lastCheckTick);

		return changed;
	}

	/**
	 * Update the last check tick (call this after processing results)
	 */
	updateLastCheckTick(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}

	/**
	 * Reset the last check tick to the current tick
	 */
	reset(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}
}

/**
 * Added<T> filter - matches entities where the component was recently added
 * @template T - The component type to check for additions
 */
export class Added<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;
	private readonly tracker: ChangeTracker;
	private lastCheckTick: Tick = -1;

	/**
	 * Create a new Added filter
	 * @param component - The component to check for additions
	 * @param tracker - The change tracker to use
	 */
	constructor(component: ComponentCtor, tracker: ChangeTracker) {
		this.component = component;
		this.tracker = tracker;
	}

	matches(world: World, entity: AnyEntity): boolean {
		// Check if entity exists first
		if (!world.contains(entity)) {
			return false;
		}

		// Entity must have the component
		if (!world.get(entity, this.component)) {
			return false;
		}

		// Check if added since last check
		const added = this.tracker.wasAdded(entity as number, this.component, this.lastCheckTick);

		return added;
	}

	/**
	 * Update the last check tick (call this after processing results)
	 */
	updateLastCheckTick(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}

	/**
	 * Reset the last check tick to the current tick
	 */
	reset(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}
}

/**
 * Spawned filter - matches entities that were recently spawned
 */
export class Spawned implements QueryFilter {
	private lastCheckTick: Tick = 0;

	/**
	 * Create a new Spawned filter
	 * @param tracker - The change tracker to use
	 */
	constructor(private readonly tracker: ChangeTracker) {}

	matches(_world: World, entity: number): boolean {
		return this.tracker.wasSpawned(entity, this.lastCheckTick);
	}

	/**
	 * Update the last check tick (call this after processing results)
	 */
	updateLastCheckTick(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}

	/**
	 * Reset the last check tick to the current tick
	 */
	reset(): void {
		this.lastCheckTick = this.tracker.getCurrentTick();
	}
}