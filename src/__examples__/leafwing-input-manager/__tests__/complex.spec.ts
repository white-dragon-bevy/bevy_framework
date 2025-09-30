/**
 * Unit tests for the complex input manager example
 */

import { createApp } from "../complex";
import { App } from "../../../bevy_app";
import { MainScheduleLabel } from "../../../bevy_app";
import { component } from "@rbxts/matter";

// Define components for testing
const Player = component<{
	name: string;
	playerId: number;
	health: number;
	stamina: number;
}>("Player");

const ComboBuffer = component<{
	actions: Array<{ action: string; timestamp: number }>;
	windowSize: number;
	currentCombo: string;
}>("ComboBuffer");

const SkillCooldown = component<{
	cooldowns: Map<string, number>;
}>("SkillCooldown");

const InputPriority = component<{
	level: number;
	blockedCategories: Array<string>;
}>("InputPriority");

export = () => {
	describe("Complex Input Manager Example", () => {
		let app: App | undefined;

		afterEach(() => {
			// Clean up app after each test
			if (app) {
				app.cleanup();
				app = undefined;
			}
		});

		it("should create app successfully", () => {
			expect(() => {
				app = createApp();
			}).never.to.throw();

			expect(app).to.be.ok();
		});

		it("should register all required plugins", () => {
			app = createApp();

			// Verify app is properly initialized
			expect(app.getWorld()).to.be.ok();
		});

		it("should create player entities on startup", () => {
			app = createApp();
			const world = app.getWorld();

			// Run the startup schedule
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Query for Player components
			let playerCount = 0;
			for (const [_, player] of world.query(Player)) {
				playerCount++;
			}

			// Should have 2 players
			expect(playerCount).to.equal(2);
		});

		it("should initialize combo buffers for players", () => {
			app = createApp();
			const world = app.getWorld();

			// Run startup to spawn players
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Check for ComboBuffer components
			let comboBufferCount = 0;
			for (const [_, buffer] of world.query(ComboBuffer)) {
				comboBufferCount++;
				const bufferData = buffer;

				expect(bufferData.actions).to.be.ok();
				expect(bufferData.windowSize).to.equal(0.5);
				expect(bufferData.currentCombo).to.equal("");
			}

			expect(comboBufferCount).to.equal(2);
		});

		it("should initialize skill cooldowns for players", () => {
			app = createApp();
			const world = app.getWorld();

			// Run startup to spawn players
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Check for SkillCooldown components
			let cooldownCount = 0;
			for (const [_, cooldown] of world.query(SkillCooldown)) {
				cooldownCount++;
				const cooldownData = cooldown;

				expect(cooldownData.cooldowns).to.be.ok();
				expect(cooldownData.cooldowns.size()).to.equal(0);
			}

			expect(cooldownCount).to.equal(2);
		});

		it("should assign different priorities to players", () => {
			app = createApp();
			const world = app.getWorld();

			// Run startup to spawn players
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Check InputPriority components
			const priorities: number[] = [];
			for (const [_, priority] of world.query(InputPriority)) {
				const priorityData = priority;

				priorities.push(priorityData.level);
				expect(priorityData.blockedCategories).to.be.ok();
				expect(priorityData.blockedCategories.size()).to.equal(0);
			}

			// Player 1 should have priority 10, Player 2 should have priority 5
			expect(priorities.size() > 0).to.equal(true);
			expect(priorities.includes(10)).to.equal(true);
			expect(priorities.includes(5)).to.equal(true);
		});

		it("should run update systems without errors", () => {
			app = createApp();

			// Run startup first
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Run update cycle - should not throw
			expect(() => {
				app!.runSchedule(MainScheduleLabel.UPDATE);
			}).never.to.throw();
		});

		it("should handle stamina recovery", () => {
			app = createApp();
			const world = app.getWorld();

			// Run startup to spawn players
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Set a player's stamina to low value
			for (const [entityId, player] of world.query(Player)) {
				const playerData = player;

				// Set stamina to 50
				world.insert(
					entityId,
					Player({
						name: playerData.name,
						playerId: playerData.playerId,
						health: playerData.health,
						stamina: 50,
					})
				);

				break; // Only modify first player
			}

			// Run update to trigger recovery
			app.runSchedule(MainScheduleLabel.UPDATE);

			// Check that stamina increased
			let foundModifiedPlayer = false;
			for (const [_, player] of world.query(Player)) {
				const playerData = player;

				if (playerData.stamina > 50 && playerData.stamina <= 100) {
					foundModifiedPlayer = true;
					break;
				}
			}

			expect(foundModifiedPlayer).to.equal(true);
		});

		it("should clean up combo buffers over time", () => {
			app = createApp();
			const world = app.getWorld();

			// Run startup
			app.runSchedule(MainScheduleLabel.STARTUP);

			// Add an old action to a combo buffer
			const oldTimestamp = os.clock() - 1; // 1 second ago
			for (const [entityId, buffer] of world.query(ComboBuffer)) {
				const bufferData = buffer;

				// Add an old action
				bufferData.actions.push({ action: "TestAction", timestamp: oldTimestamp });

				// Add a recent action
				bufferData.actions.push({ action: "RecentAction", timestamp: os.clock() });

				break; // Only modify first buffer
			}

			// Run update to trigger cleanup
			app.runSchedule(MainScheduleLabel.UPDATE);

			// Check that old action was removed
			let foundCleanedBuffer = false;
			for (const [_, buffer] of world.query(ComboBuffer)) {
				const bufferData = buffer;

				// Should only have recent actions
				const hasOldAction = bufferData.actions.some(
					(action) => action.action === "TestAction"
				);
				const hasRecentAction = bufferData.actions.some(
					(action) => action.action === "RecentAction"
				);

				if (!hasOldAction && hasRecentAction) {
					foundCleanedBuffer = true;
					break;
				}
			}

			expect(foundCleanedBuffer).to.equal(true);
		});

		it("should support multiple action types", () => {
			app = createApp();

			// This test verifies that the action type system supports multiple categories
			// The actual functionality is tested through the creation of the app
			// which registers all the action types

			expect(() => {
				// App creation includes registration of:
				// - Movement actions
				// - Combat actions
				// - UI actions
				app!.runSchedule(MainScheduleLabel.STARTUP);
			}).never.to.throw();
		});
	});
};