/**
 * @fileoverview Query system for Bevy ECS - Provides Bevy-style query filters
 * Extends Matter's query system with With, Without, Changed, Added filters
 */

import { Component } from "@rbxts/matter";
import { World } from "./bevy-world";

import type { AnyEntity } from "@rbxts/matter";

/**
 * Component constructor type - matches Matter's ComponentCtor
 */
export type ComponentCtor = () => Component<object>;

/**
 * Query filter interface - all filters must implement this
 */
export interface QueryFilter {
	/**
	 * Check if an entity matches this filter
	 * @param world - The world to query
	 * @param entity - The entity to check
	 * @returns True if the entity passes the filter
	 */
	matches(world: World, entity: AnyEntity): boolean;

	/** Component constructor (for debugging) */
	readonly component?: ComponentCtor;
}

/**
 * With<T> filter - matches entities that have the specified component
 * @template T - The component type to check for
 */
export class With<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;

	/**
	 * Create a new With filter
	 * @param component - The component constructor to check for
	 */
	constructor(component: ComponentCtor) {
		this.component = component;
	}

	matches(world: World, entity: AnyEntity): boolean {
		return world.get(entity, this.component) ? true : false;
	}
}

/**
 * Without<T> filter - matches entities that do NOT have the specified component
 * @template T - The component type to check for absence
 */
export class Without<T extends object> implements QueryFilter {
	readonly component: ComponentCtor;

	/**
	 * Create a new Without filter
	 * @param component - The component constructor to check for absence
	 */
	constructor(component: ComponentCtor) {
		this.component = component;
	}

	matches(world: World, entity: AnyEntity): boolean {
		return world.get(entity, this.component) ? false : true;
	}
}

/**
 * Or filter - matches entities that pass at least one of the provided filters
 * @template F - Array of filter types
 */
export class Or<F extends QueryFilter[]> implements QueryFilter {
	/**
	 * Create a new Or filter
	 * @param filters - Array of filters to combine with OR logic
	 */
	constructor(private readonly filters: F) {}

	matches(world: World, entity: AnyEntity): boolean {
		for (const filter of this.filters) {
			if (filter.matches(world, entity)) {
				return true;
			}
		}
		return false;
	}
}

/**
 * And filter - matches entities that pass all of the provided filters
 * @template F - Array of filter types
 */
export class And<F extends QueryFilter[]> implements QueryFilter {
	/**
	 * Create a new And filter
	 * @param filters - Array of filters to combine with AND logic
	 */
	constructor(private readonly filters: F) {}

	matches(world: World, entity: AnyEntity): boolean {
		for (const filter of this.filters) {
			if (!filter.matches(world, entity)) {
				return false;
			}
		}
		return true;
	}
}

/**
 * Query builder for constructing complex queries with filters
 * @template T - Component tuple type
 */
export class QueryBuilder<T extends ComponentCtor[]> {
	private readonly filters: QueryFilter[] = [];

	/**
	 * Create a new query builder
	 * @param world - The world to query
	 * @param components - The components to query for
	 */
	constructor(
		private readonly world: World,
		private readonly components: T,
	) {}

	/**
	 * Add a With filter to the query
	 * @param component - Component that must be present
	 * @returns This query builder for chaining
	 */
	with<U extends object>(component: ComponentCtor): QueryBuilder<T> {
		this.filters.push(new With<U>(component));
		return this;
	}

	/**
	 * Add a Without filter to the query
	 * @param component - Component that must be absent
	 * @returns This query builder for chaining
	 */
	without<U extends object>(component: ComponentCtor): QueryBuilder<T> {
		this.filters.push(new Without<U>(component));
		return this;
	}

	/**
	 * Add an Or filter to the query
	 * @param filters - Filters to combine with OR logic
	 * @returns This query builder for chaining
	 */
	or(...filters: QueryFilter[]): QueryBuilder<T> {
		this.filters.push(new Or(filters));
		return this;
	}

	/**
	 * Add an And filter to the query
	 * @param filters - Filters to combine with AND logic
	 * @returns This query builder for chaining
	 */
	and(...filters: QueryFilter[]): QueryBuilder<T> {
		this.filters.push(new And(filters));
		return this;
	}

	/**
	 * Execute the query and return an iterator
	 * @returns Iterator over matching entities and components
	 */
	*iter(): Generator<[number, ...InferComponentTypes<T>]> {
		// Collect all results first since we can't properly wrap Matter's iterator
		const results = this.collect();
		for (const result of results) {
			yield result;
		}
	}

	/**
	 * Get all results as an array
	 * @returns Array of matching entities and components
	 */
	collect(): Array<[number, ...InferComponentTypes<T>]> {
		const results: Array<[number, ...InferComponentTypes<T>]> = [];

		// Use Matter's native query for base components
		const baseQuery = this.world.query(...this.components);

		// roblox-ts for-of only captures first 2 values from Lua multi-return
		// We have to work around this by using the query differently
		// Instead of wrapping, we'll iterate and manually pack values

		for (const result of baseQuery) {
			// result is a LuaTuple, but for-of only captured first value (entity)
			// and possibly second value (first component)
			// We can't access the rest through result indexing

			// Workaround: use the entity to query components directly
			const entity = result[0];

			// Apply additional filters BEFORE retrieving components
			let passesFilters = true;
			for (const filter of this.filters) {
				if (!filter.matches(this.world, entity)) {
					passesFilters = false;
					break;
				}
			}

			if (passesFilters) {
				// Build result by querying components again
				const componentData: defined[] = [entity];
				for (const component of this.components) {
					const componentValue = this.world.get(entity, component);
					componentData.push(componentValue as defined);
				}
				results.push(componentData as never);
			}
		}

		return results;
	}

	/**
	 * Count the number of matching entities
	 * @returns Number of entities that match the query
	 */
	count(): number {
		let totalCount = 0;
		for (const _ of this.iter()) {
			totalCount++;
		}
		return totalCount;
	}

	/**
	 * Check if any entities match the query
	 * @returns True if at least one entity matches
	 */
	any(): boolean {
		for (const _ of this.iter()) {
			return true;
		}
		return false;
	}

	/**
	 * Get the first matching entity
	 * @returns First matching entity and components, or undefined
	 */
	first(): [number, ...InferComponentTypes<T>] | undefined {
		for (const result of this.iter()) {
			return result;
		}
		return undefined;
	}
}

/**
 * Helper type to infer component value types from component constructors
 */
type InferComponentTypes<T> = T extends [infer First, ...infer Rest]
	? First extends ComponentCtor
		? Rest extends ComponentCtor[]
			? [ReturnType<First>, ...InferComponentTypes<Rest>]
			: [ReturnType<First>]
		: []
	: [];