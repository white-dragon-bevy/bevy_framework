/**
 * states.spec.ts - States 单元测试
 */

import { EnumStates, createStates } from "../states";

export = () => {
	describe("EnumStates", () => {
		it("should create enum states correctly", () => {
			const state = new EnumStates("menu");
			expect(state.getStateId()).to.equal("menu");
		});

		it("should compare states correctly", () => {
			const state1 = new EnumStates("menu");
			const state2 = new EnumStates("menu");
			const state3 = new EnumStates("game");

			expect(state1.equals(state2)).to.equal(true);
			expect(state1.equals(state3)).to.equal(false);
		});

		it("should clone states correctly", () => {
			const original = new EnumStates("menu");
			const cloned = original.clone();

			expect(cloned.getStateId()).to.equal(original.getStateId());
			expect(cloned.equals(original)).to.equal(true);
		});
	});

	describe("createStates", () => {
		it("should create state map correctly", () => {
			const GameState = createStates({
				MENU: "menu",
				PLAYING: "playing",
				PAUSED: "paused",
			});

			expect(GameState.MENU.getStateId()).to.equal("menu");
			expect(GameState.PLAYING.getStateId()).to.equal("playing");
			expect(GameState.PAUSED.getStateId()).to.equal("paused");
		});

		it("should handle numeric values", () => {
			const GameState = createStates({
				MENU: 0,
				PLAYING: 1,
				PAUSED: 2,
			});

			expect(GameState.MENU.getStateId()).to.equal(0);
			expect(GameState.PLAYING.getStateId()).to.equal(1);
			expect(GameState.PAUSED.getStateId()).to.equal(2);
		});

		it("should create independent state instances", () => {
			const GameState = createStates({
				MENU: "menu",
				PLAYING: "playing",
			});

			expect(GameState.MENU.equals(GameState.PLAYING)).to.equal(false);
		});
	});
};
