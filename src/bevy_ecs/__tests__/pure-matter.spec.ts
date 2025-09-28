/**
 * Test pure Matter World vs BevyWorld
 */

import { component, World as MatterWorld } from "@rbxts/matter";
import { World as BevyWorld } from "../bevy-world";

const TestA = component<{ value: number }>("PureMatter_A");
const TestB = component<{ data: string }>("PureMatter_B");

export = () => {
	describe("Pure Matter vs BevyWorld", () => {
		it("Matter World test", () => {
			const world = new MatterWorld();

			const e1 = world.spawn(TestA({ value: 1 }), TestB({ data: "both" }));
			const e2 = world.spawn(TestA({ value: 2 }));

			const e2_hasB = world.get(e2, TestB);
			print("Matter World - e2 has TestB?", e2_hasB !== undefined, "value:", e2_hasB);

			expect(e2_hasB).to.equal(undefined);
		});

		it("BevyWorld test", () => {
			const world = new BevyWorld();

			const e1 = world.spawn(TestA({ value: 1 }), TestB({ data: "both" }));
			const e2 = world.spawn(TestA({ value: 2 }));

			const e2_hasB = world.get(e2, TestB);
			print("BevyWorld - e2 has TestB?", e2_hasB !== undefined, "value:", e2_hasB);

			expect(e2_hasB).to.equal(undefined);
		});
	});
};