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

			const allA = world.queryWith(TestA).collect();
			const bothAB = world.queryWith(TestA).with(TestB).collect();

			expect(allA.size()).to.equal(2);
			expect(bothAB.size()).to.equal(1);
			expect(bothAB[0][0]).to.equal(e1);
		});
	});
};