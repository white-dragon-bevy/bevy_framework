/**
 * Actionlike 派生测试
 * 测试各种类型的 Action 定义是否能正确实现 Actionlike 接口
 */

import { Actionlike } from "../actionlike";
import { InputControlKind } from "../input-control-kind";

/**
 * 空枚举类型 Action
 * 对应 Rust 的 UnitAction
 */
class UnitAction implements Actionlike {
	private constructor() {}

	hash(): string {
		return "UnitAction";
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof UnitAction;
	}

	toString(): string {
		return "UnitAction";
	}
}

/**
 * 单一值枚举类型 Action
 * 对应 Rust 的 OneAction
 */
class OneAction implements Actionlike {
	static readonly Jump = new OneAction("Jump");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof OneAction && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

/**
 * 简单枚举类型 Action
 * 对应 Rust 的 SimpleAction
 */
class SimpleAction implements Actionlike {
	static readonly Zero = new SimpleAction("Zero");
	static readonly One = new SimpleAction("One");
	static readonly Two = new SimpleAction("Two");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof SimpleAction && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

/**
 * 带未命名字段的枚举类型 Action
 * 对应 Rust 的 UnnamedFieldVariantsAction
 */
class UnnamedFieldVariantsAction implements Actionlike {
	static readonly Run = new UnnamedFieldVariantsAction("Run");

	static Jump(value: number): UnnamedFieldVariantsAction {
		return new UnnamedFieldVariantsAction("Jump", value);
	}

	private constructor(
		private readonly variant: string,
		private readonly fieldValue?: number,
	) {}

	hash(): string {
		if (this.fieldValue !== undefined) {
			return `${this.variant}(${this.fieldValue})`;
		}

		return this.variant;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof UnnamedFieldVariantsAction)) {
			return false;
		}

		return this.variant === other.variant && this.fieldValue === other.fieldValue;
	}

	toString(): string {
		return this.hash();
	}
}

/**
 * 带命名字段的枚举类型 Action
 * 对应 Rust 的 NamedFieldVariantsAction
 */
class NamedFieldVariantsAction implements Actionlike {
	static readonly Jump = new NamedFieldVariantsAction("Jump");

	static Run(x: number, y: number): NamedFieldVariantsAction {
		return new NamedFieldVariantsAction("Run", { x, y });
	}

	private constructor(
		private readonly variant: string,
		private readonly fields?: { x: number; y: number },
	) {}

	hash(): string {
		if (this.fields !== undefined) {
			return `${this.variant}(x:${this.fields.x},y:${this.fields.y})`;
		}

		return this.variant;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof NamedFieldVariantsAction)) {
			return false;
		}

		if (this.variant !== other.variant) {
			return false;
		}

		if (this.fields === undefined && other.fields === undefined) {
			return true;
		}

		if (this.fields === undefined || other.fields === undefined) {
			return false;
		}

		return this.fields.x === other.fields.x && this.fields.y === other.fields.y;
	}

	toString(): string {
		return this.hash();
	}
}

/**
 * 结构体类型 Action
 * 对应 Rust 的 StructAction
 */
class StructAction implements Actionlike {
	constructor(
		public readonly x: number,
		public readonly y: number,
	) {}

	hash(): string {
		return `StructAction(${this.x},${this.y})`;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof StructAction)) {
			return false;
		}

		return this.x === other.x && this.y === other.y;
	}

	toString(): string {
		return this.hash();
	}
}

/**
 * 元组类型 Action
 * 对应 Rust 的 TupleAction
 */
class TupleAction implements Actionlike {
	constructor(
		public readonly first: number,
		public readonly second: number,
	) {}

	hash(): string {
		return `TupleAction(${this.first},${this.second})`;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		if (!(other instanceof TupleAction)) {
			return false;
		}

		return this.first === other.first && this.second === other.second;
	}

	toString(): string {
		return this.hash();
	}
}

export = () => {
	describe("Actionlike Derive", () => {
		it("should compile with empty enum (UnitAction)", () => {
			// 这个测试主要是编译时检查
			// 如果编译通过,说明 UnitAction 正确实现了 Actionlike
			expect(true).to.equal(true);
		});

		it("should compile with single variant enum (OneAction)", () => {
			const action = OneAction.Jump;
			expect(action.hash()).to.equal("Jump");
			expect(action.getInputControlKind()).to.equal(InputControlKind.Button);
		});

		it("should compile with simple enum (SimpleAction)", () => {
			const action1 = SimpleAction.Zero;
			const action2 = SimpleAction.One;
			const action3 = SimpleAction.Two;

			expect(action1.hash()).to.equal("Zero");
			expect(action2.hash()).to.equal("One");
			expect(action3.hash()).to.equal("Two");
		});

		it("should compile with unnamed field variants (UnnamedFieldVariantsAction)", () => {
			const runAction = UnnamedFieldVariantsAction.Run;
			const jumpAction = UnnamedFieldVariantsAction.Jump(5);

			expect(runAction.hash()).to.equal("Run");
			expect(jumpAction.hash()).to.equal("Jump(5)");
		});

		it("should compile with named field variants (NamedFieldVariantsAction)", () => {
			const jumpAction = NamedFieldVariantsAction.Jump;
			const runAction = NamedFieldVariantsAction.Run(10, 20);

			expect(jumpAction.hash()).to.equal("Jump");
			expect(runAction.hash()).to.equal("Run(x:10,y:20)");
		});

		it("should compile with struct (StructAction)", () => {
			const action = new StructAction(5, 10);
			expect(action.hash()).to.equal("StructAction(5,10)");
			expect(action.x).to.equal(5);
			expect(action.y).to.equal(10);
		});

		it("should compile with tuple struct (TupleAction)", () => {
			const action = new TupleAction(3, 7);
			expect(action.hash()).to.equal("TupleAction(3,7)");
			expect(action.first).to.equal(3);
			expect(action.second).to.equal(7);
		});

		it("should correctly implement equals for simple enum", () => {
			const action1 = SimpleAction.One;
			const action2 = SimpleAction.One;
			const action3 = SimpleAction.Two;

			expect(action1.equals(action2)).to.equal(true);
			expect(action1.equals(action3)).to.equal(false);
		});

		it("should correctly implement equals for struct", () => {
			const action1 = new StructAction(5, 10);
			const action2 = new StructAction(5, 10);
			const action3 = new StructAction(5, 11);

			expect(action1.equals(action2)).to.equal(true);
			expect(action1.equals(action3)).to.equal(false);
		});

		it("should correctly implement equals for tuple", () => {
			const action1 = new TupleAction(3, 7);
			const action2 = new TupleAction(3, 7);
			const action3 = new TupleAction(4, 7);

			expect(action1.equals(action2)).to.equal(true);
			expect(action1.equals(action3)).to.equal(false);
		});
	});
};