/**
 * Test for STARTUP schedule execution
 * Ensures STARTUP systems only run once
 */

import { App } from "../app";
import { BuiltinSchedules } from "../main-schedule";

export = () => {
	it("should only run STARTUP schedule once", () => {
		const app = App.create();
		let startupCount = 0;

		// Add a STARTUP system
		app.addSystems(BuiltinSchedules.STARTUP, () => {
			startupCount++;
		});

		// Run multiple updates
		app.update();
		app.update();
		app.update();

		// STARTUP should only run once
		expect(startupCount).to.equal(1);
	});

	it("should run STARTUP before UPDATE", () => {
		const app = App.create();
		const executionOrder: string[] = [];

		// Add systems to different schedules
		app.addSystems(BuiltinSchedules.STARTUP, () => {
			executionOrder.push("STARTUP");
		});

		app.addSystems(BuiltinSchedules.UPDATE, () => {
			executionOrder.push("UPDATE");
		});

		// Run update
		app.update();

		// Check execution order
		expect(executionOrder.size()).to.equal(2);
		expect(executionOrder[0]).to.equal("STARTUP");
		expect(executionOrder[1]).to.equal("UPDATE");

		// Run another update
		app.update();

		// STARTUP should not run again
		expect(executionOrder.size()).to.equal(3);
		expect(executionOrder[2]).to.equal("UPDATE");
	});

	it("should run startup schedules in correct order", () => {
		const app = App.create();
		const executionOrder: string[] = [];

		// Add systems to startup schedules
		app.addSystems(BuiltinSchedules.PRE_STARTUP, () => {
			executionOrder.push("PRE_STARTUP");
		});

		app.addSystems(BuiltinSchedules.STARTUP, () => {
			executionOrder.push("STARTUP");
		});

		app.addSystems(BuiltinSchedules.POST_STARTUP, () => {
			executionOrder.push("POST_STARTUP");
		});

		// Run update
		app.update();

		// Check execution order
		expect(executionOrder.size()).to.equal(3);
		expect(executionOrder[0]).to.equal("PRE_STARTUP");
		expect(executionOrder[1]).to.equal("STARTUP");
		expect(executionOrder[2]).to.equal("POST_STARTUP");
	});
};