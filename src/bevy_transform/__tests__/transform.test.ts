/**
 * Transform 组件单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { World } from "@rbxts/matter";
import {
	Transform,
	GlobalTransform,
	createTransform,
	createGlobalTransform,
	transformFromPosition,
	transformFromLookAt,
	withScale,
	withPosition,
	computeGlobalTransform,
	transformPoint,
	getForward,
	getRight,
	getUp,
} from "../components";

export = () => {
	describe("Transform Component", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		afterEach(() => {
			world.clear();
		});

		it("should create default transform", () => {
			const transform = createTransform();
			expect(transform.cframe).to.equal(CFrame.identity);
			expect(transform.scale).to.equal(Vector3.one);
		});

		it("should create transform from position", () => {
			const position = new Vector3(10, 20, 30);
			const transform = transformFromPosition(position);

			expect(transform.cframe.Position).to.equal(position);
			expect(transform.scale).to.equal(Vector3.one);
		});

		it("should create transform from look at", () => {
			const position = new Vector3(0, 0, 0);
			const target = new Vector3(0, 0, -10);
			const transform = transformFromLookAt(position, target);

			expect(transform.cframe.Position).to.equal(position);
			// 检查是否朝向目标
			const forward = transform.cframe.LookVector;
			const expectedDirection = target.sub(position).Unit;
			expect(forward.X).to.be.near(expectedDirection.X, 0.001);
			expect(forward.Y).to.be.near(expectedDirection.Y, 0.001);
			expect(forward.Z).to.be.near(expectedDirection.Z, 0.001);
		});

		it("should apply scale to transform", () => {
			const transform = createTransform();
			const newScale = new Vector3(2, 3, 4);
			const scaled = withScale(transform, newScale);

			expect(scaled.scale).to.equal(newScale);
			expect(scaled.cframe).to.equal(transform.cframe);
		});

		it("should apply position to transform", () => {
			const transform = createTransform();
			const newPosition = new Vector3(5, 10, 15);
			const moved = withPosition(transform, newPosition);

			expect(moved.cframe.Position).to.equal(newPosition);
			expect(moved.scale).to.equal(transform.scale);
		});

		it("should insert transform component to entity", () => {
			const entity = world.spawn();
			const transform = createTransform();
			world.insert(entity, Transform(transform));

			const retrieved = world.get(entity, Transform);
			expect(retrieved).to.be.ok();
			expect(retrieved!.cframe).to.equal(transform.cframe);
			expect(retrieved!.scale).to.equal(transform.scale);
		});
	});

	describe("GlobalTransform Component", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		afterEach(() => {
			world.clear();
		});

		it("should create default global transform", () => {
			const globalTransform = createGlobalTransform();
			expect(globalTransform.cframe).to.equal(CFrame.identity);
			expect(globalTransform.scale).to.equal(Vector3.one);
		});

		it("should compute global transform without parent", () => {
			const localTransform = transformFromPosition(new Vector3(10, 20, 30));
			const globalTransform = computeGlobalTransform(localTransform);

			expect(globalTransform.cframe).to.equal(localTransform.cframe);
			expect(globalTransform.scale).to.equal(localTransform.scale);
		});

		it("should compute global transform with parent", () => {
			const parentTransform = {
				cframe: new CFrame(new Vector3(10, 0, 0)),
				scale: new Vector3(2, 2, 2),
			};
			const localTransform = {
				cframe: new CFrame(new Vector3(5, 0, 0)),
				scale: new Vector3(1, 1, 1),
			};

			const globalTransform = computeGlobalTransform(localTransform, parentTransform);

			// 全局位置应该是父级位置 + 父级旋转后的局部位置
			const expectedPosition = parentTransform.cframe.mul(localTransform.cframe).Position;
			expect(globalTransform.cframe.Position.X).to.be.near(expectedPosition.X, 0.001);
			expect(globalTransform.cframe.Position.Y).to.be.near(expectedPosition.Y, 0.001);
			expect(globalTransform.cframe.Position.Z).to.be.near(expectedPosition.Z, 0.001);

			// 全局缩放应该是父级缩放 * 局部缩放
			expect(globalTransform.scale).to.equal(new Vector3(2, 2, 2));
		});

		it("should transform point from local to world space", () => {
			const globalTransform = {
				cframe: new CFrame(new Vector3(10, 0, 0)),
				scale: new Vector3(2, 2, 2),
			};
			const localPoint = new Vector3(1, 0, 0);

			const worldPoint = transformPoint(globalTransform, localPoint);

			// 点应该先被缩放，然后被变换
			expect(worldPoint.X).to.be.near(12, 0.001); // 10 + (1 * 2)
			expect(worldPoint.Y).to.be.near(0, 0.001);
			expect(worldPoint.Z).to.be.near(0, 0.001);
		});

		it("should get forward, right, and up vectors", () => {
			const globalTransform = createGlobalTransform();

			const forward = getForward(globalTransform);
			const right = getRight(globalTransform);
			const up = getUp(globalTransform);

			// 默认方向
			expect(forward).to.equal(new Vector3(0, 0, 1)); // -Z 轴
			expect(right).to.equal(new Vector3(1, 0, 0)); // X 轴
			expect(up).to.equal(new Vector3(0, 1, 0)); // Y 轴
		});
	});
};