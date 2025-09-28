/**
 * Simple query test to debug the issue
 */

import { component } from "@rbxts/matter";
import { World } from "../bevy-world";

const TestA = component<{ value: number }>("SimpleTest_A");
const TestB = component<{ data: string }>("SimpleTest_B");

export = () => {
	describe("Simple Query Test", () => {
		it("basic spawn and query", () => {
			const world = new World();

			const e1 = world.spawn(TestA({ value: 1 }), TestB({ data: "both" }));
			const e2 = world.spawn(TestA({ value: 2 }));
			const e3 = world.spawn(TestB({ data: "only b" }));

			print("Entity 1:", e1);
			print("Entity 2:", e2);
			print("Entity 3:", e3);

			print("\n--- Testing world.get() ---");
			print("e1 has TestA?", world.get(e1, TestA) !== undefined);
			print("e1 has TestB?", world.get(e1, TestB) !== undefined);
			print("e2 has TestA?", world.get(e2, TestA) !== undefined);
			print("e2 has TestB?", world.get(e2, TestB) !== undefined);
			print("e3 has TestA?", world.get(e3, TestA) !== undefined);
			print("e3 has TestB?", world.get(e3, TestB) !== undefined);

			print("\n--- Testing queryWith().collect() ---");
			const allA = world.queryWith(TestA).collect();
			print("Query TestA, count:", allA.size());
			for (const [entity] of allA) {
				print("  Entity:", entity);
			}

			print("\n--- Testing queryWith().with().collect() ---");
			const bothAB = world.queryWith(TestA).with(TestB).collect();
			print("Query TestA + TestB, count:", bothAB.size());
			for (const [entity] of bothAB) {
				print("  Entity:", entity);
				print("    Has TestA?", world.get(entity, TestA) !== undefined);
				print("    Has TestB?", world.get(entity, TestB) !== undefined);
			}

			print("\n--- Expectations ---");
			print("allA.size() should be 2, actual:", allA.size());
			print("bothAB.size() should be 1, actual:", bothAB.size());
			if (bothAB.size() > 0) {
				print("bothAB[0][0] should be", e1, ", actual:", bothAB[0][0]);
			}

			expect(allA.size()).to.equal(2);
			expect(bothAB.size()).to.equal(1);
			expect(bothAB[0][0]).to.equal(e1);
		});
	});
};