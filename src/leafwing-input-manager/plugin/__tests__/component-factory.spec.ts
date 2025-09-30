import { createActionComponents, clearComponentCache, getComponentCacheSize } from "../component-factory";
import { Actionlike } from "../../actionlike";

// Test action enum
enum TestAction {
	Jump,
	Attack,
	Move,
}

// Test Actionlike implementation
class TestActionlike implements Actionlike {
	constructor(public readonly action: TestAction) {}

	hash(): string {
		return `TestAction:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return TestAction[this.action];
	}
}

export = () => {
	beforeEach(() => {
		// Clear component cache before each test
		clearComponentCache();
	});

	afterEach(() => {
		// Cleanup is handled in beforeEach
	});

	describe("Component Factory", () => {
		it("should create component definitions", () => {
			const components = createActionComponents<TestActionlike>("TestAction");

			expect(components).to.be.ok();
			expect(components.actionTypeName).to.equal("TestAction");
			expect(components.component).to.be.ok();
			expect(components.spawn).to.be.a("function");
			expect(components.query).to.be.a("function");
			expect(components.get).to.be.a("function");
			expect(components.insert).to.be.a("function");
			expect(components.remove).to.be.a("function");
		});

		it("should cache component definitions", () => {
			expect(getComponentCacheSize()).to.equal(0);

			const components1 = createActionComponents<TestActionlike>("TestAction");
			expect(getComponentCacheSize()).to.equal(1);

			// Should return cached version
			const components2 = createActionComponents<TestActionlike>("TestAction");
			expect(getComponentCacheSize()).to.equal(1);
			expect(components1).to.equal(components2); // Same reference

			// Different action type should create new definition
			const components3 = createActionComponents<TestActionlike>("OtherAction");
			expect(getComponentCacheSize()).to.equal(2);
			expect(components3).never.to.equal(components1);
		});

		it("should have spawn method", () => {
			const components = createActionComponents<TestActionlike>("TestAction");
			expect(components.spawn).to.be.a("function");
		});

		it("should have query method", () => {
			const components = createActionComponents<TestActionlike>("TestAction");
			expect(components.query).to.be.a("function");
		});

		it("should have get method", () => {
			const components = createActionComponents<TestActionlike>("TestAction");
			expect(components.get).to.be.a("function");
		});

		it("should have insert method", () => {
			const components = createActionComponents<TestActionlike>("TestAction");
			expect(components.insert).to.be.a("function");
		});

		it("should have remove method", () => {
			const components = createActionComponents<TestActionlike>("TestAction");
			expect(components.remove).to.be.a("function");
		});

		it("should support multiple action types simultaneously", () => {
			// Create components for different action types
			const playerComponents = createActionComponents<TestActionlike>("PlayerAction");
			const enemyComponents = createActionComponents<TestActionlike>("EnemyAction");

			// They should be different definitions
			expect(playerComponents.actionTypeName).to.equal("PlayerAction");
			expect(enemyComponents.actionTypeName).to.equal("EnemyAction");
			expect(playerComponents.component).never.to.equal(enemyComponents.component);
		});
	});

	describe("Cache Management", () => {
		it("should clear cache", () => {
			// Create some cached components
			createActionComponents<TestActionlike>("Action1");
			createActionComponents<TestActionlike>("Action2");
			createActionComponents<TestActionlike>("Action3");

			expect(getComponentCacheSize()).to.equal(3);

			// Clear cache
			clearComponentCache();

			expect(getComponentCacheSize()).to.equal(0);
		});

		it("should handle cache size correctly", () => {
			expect(getComponentCacheSize()).to.equal(0);

			createActionComponents<TestActionlike>("Test1");
			expect(getComponentCacheSize()).to.equal(1);

			createActionComponents<TestActionlike>("Test2");
			expect(getComponentCacheSize()).to.equal(2);

			// Accessing existing should not increase size
			createActionComponents<TestActionlike>("Test1");
			expect(getComponentCacheSize()).to.equal(2);
		});
	});
};