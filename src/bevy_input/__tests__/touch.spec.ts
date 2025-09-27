/**
 * 触摸输入模块单元测试
 */

import { World } from "@rbxts/matter";
import { MessageRegistry } from "../../bevy_ecs/message";
import { Touch, TouchInput, TouchPhase, Touches, touchScreenInputSystem } from "../touch";
import * as ResourceStorage from "../resource-storage";

export = () => {
	describe("TouchPhase 枚举", () => {
		it("应该包含所有阶段", () => {
			expect(TouchPhase.Started).to.be.ok();
			expect(TouchPhase.Moved).to.be.ok();
			expect(TouchPhase.Ended).to.be.ok();
			expect(TouchPhase.Canceled).to.be.ok();
		});
	});

	describe("TouchInput 事件", () => {
		it("应该创建完整的触摸输入事件", () => {
			const position = new Vector2(100, 200);
			const force = { type: "Normalized" as const, value: 0.8 };
			const input = new TouchInput(TouchPhase.Started, position, 1, force, 0);

			expect(input.phase).to.equal(TouchPhase.Started);
			expect(input.position).to.equal(position);
			expect(input.id).to.equal(1);
			expect(input.force).to.equal(force);
			expect(input.window).to.equal(0);
		});

		it("应该创建不带可选参数的事件", () => {
			const position = new Vector2(100, 200);
			const input = new TouchInput(TouchPhase.Moved, position, 2);

			expect(input.phase).to.equal(TouchPhase.Moved);
			expect(input.position).to.equal(position);
			expect(input.id).to.equal(2);
			expect(input.force).to.equal(undefined);
			expect(input.window).to.equal(undefined);
		});
	});

	describe("Touch 类", () => {
		it("应该创建触摸对象", () => {
			const startPos = new Vector2(100, 100);
			const currentPos = new Vector2(150, 150);
			const touch = new Touch(1, startPos, currentPos);

			expect(touch.id).to.equal(1);
			expect(touch.startPosition).to.equal(startPos);
			expect(touch.position).to.equal(currentPos);
		});

		it("应该使用默认值初始化 previousPosition", () => {
			const startPos = new Vector2(100, 100);
			const currentPos = new Vector2(150, 150);
			const touch = new Touch(1, startPos, currentPos);

			expect(touch.previousPosition).to.equal(startPos);
		});

		it("delta 应该返回正确的增量", () => {
			const touch = new Touch(1, new Vector2(100, 100), new Vector2(150, 150));

			touch.previousPosition = new Vector2(140, 140);

			const delta = touch.delta();

			expect(delta.X).to.equal(10);
			expect(delta.Y).to.equal(10);
		});

		it("distance 应该返回正确的距离", () => {
			const touch = new Touch(1, new Vector2(100, 100), new Vector2(150, 150));

			const distance = touch.distance();

			expect(distance.X).to.equal(50);
			expect(distance.Y).to.equal(50);
		});

		it("fromTouchInput 应该创建 Touch", () => {
			const position = new Vector2(100, 200);
			const force = { type: "Normalized" as const, value: 0.8 };
			const input = new TouchInput(TouchPhase.Started, position, 3, force);

			const touch = Touch.fromTouchInput(input);

			expect(touch.id).to.equal(3);
			expect(touch.startPosition).to.equal(position);
			expect(touch.position).to.equal(position);
			expect(touch.force).to.equal(force);
		});

		it("应该正确处理力度信息", () => {
			const position = new Vector2(100, 100);
			const startForce = { type: "Normalized" as const, value: 0.5 };
			const currentForce = { type: "Normalized" as const, value: 0.8 };
			const touch = new Touch(1, position, position, startForce, undefined, undefined, currentForce);

			expect(touch.startForce).to.equal(startForce);
			expect(touch.force).to.equal(currentForce);
		});
	});

	describe("Touches 资源", () => {
		let touches: Touches;

		beforeEach(() => {
			touches = new Touches();
		});

		it("应该创建空的 Touches 资源", () => {
			expect(touches.anyJustPressed()).to.equal(false);
			expect(touches.anyJustReleased()).to.equal(false);
			expect(touches.anyJustCanceled()).to.equal(false);
		});

		describe("processTouchEvent - Started 阶段", () => {
			it("应该处理触摸开始事件", () => {
				const position = new Vector2(100, 100);
				const input = new TouchInput(TouchPhase.Started, position, 1);

				touches.processTouchEvent(input);

				expect(touches.getPressed(1)).to.be.ok();
				expect(touches.justPressed(1)).to.equal(true);
				expect(touches.anyJustPressed()).to.equal(true);
			});
		});

		describe("processTouchEvent - Moved 阶段", () => {
			it("应该更新触摸位置", () => {
				const startPos = new Vector2(100, 100);
				const movedPos = new Vector2(150, 150);

				touches.processTouchEvent(new TouchInput(TouchPhase.Started, startPos, 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Moved, movedPos, 1));

				const touch = touches.getPressed(1);

				expect(touch).to.be.ok();

				if (touch) {
					expect(touch.position).to.equal(movedPos);
					expect(touch.startPosition).to.equal(startPos);
				}
			});

			it("应该忽略不存在的触摸移动", () => {
				const position = new Vector2(100, 100);

				expect(() => {
					touches.processTouchEvent(new TouchInput(TouchPhase.Moved, position, 999));
				}).never.to.throw();
			});
		});

		describe("processTouchEvent - Ended 阶段", () => {
			it("应该处理触摸结束事件", () => {
				const position = new Vector2(100, 100);

				touches.processTouchEvent(new TouchInput(TouchPhase.Started, position, 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Ended, position, 1));

				expect(touches.getPressed(1)).to.equal(undefined);
				expect(touches.justReleased(1)).to.equal(true);
				expect(touches.anyJustReleased()).to.equal(true);
			});

			it("应该处理未按下的触摸结束", () => {
				const position = new Vector2(100, 100);

				touches.processTouchEvent(new TouchInput(TouchPhase.Ended, position, 1));

				expect(touches.justReleased(1)).to.equal(true);
			});
		});

		describe("processTouchEvent - Canceled 阶段", () => {
			it("应该处理触摸取消事件", () => {
				const position = new Vector2(100, 100);

				touches.processTouchEvent(new TouchInput(TouchPhase.Started, position, 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Canceled, position, 1));

				expect(touches.getPressed(1)).to.equal(undefined);
				expect(touches.justCanceled(1)).to.equal(true);
				expect(touches.anyJustCanceled()).to.equal(true);
			});

			it("应该处理未按下的触摸取消", () => {
				const position = new Vector2(100, 100);

				touches.processTouchEvent(new TouchInput(TouchPhase.Canceled, position, 1));

				expect(touches.justCanceled(1)).to.equal(true);
			});
		});

		describe("release 方法", () => {
			it("应该释放触摸", () => {
				const position = new Vector2(100, 100);

				touches.processTouchEvent(new TouchInput(TouchPhase.Started, position, 1));
				touches.release(1);

				expect(touches.getPressed(1)).to.equal(undefined);
				expect(touches.justReleased(1)).to.equal(true);
			});

			it("应该忽略不存在的触摸", () => {
				expect(() => {
					touches.release(999);
				}).never.to.throw();
			});
		});

		describe("releaseAll 方法", () => {
			it("应该释放所有触摸", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(200, 200), 2));

				touches.releaseAll();

				expect(touches.getPressed(1)).to.equal(undefined);
				expect(touches.getPressed(2)).to.equal(undefined);
				expect(touches.getReleased(1)).to.be.ok();
				expect(touches.getReleased(2)).to.be.ok();
			});
		});

		describe("clearJustPressed 方法", () => {
			it("应该清除 just pressed 状态", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

				expect(touches.clearJustPressed(1)).to.equal(true);
				expect(touches.justPressed(1)).to.equal(false);
				expect(touches.getPressed(1)).to.be.ok();
			});

			it("应该返回 false 如果未 just pressed", () => {
				expect(touches.clearJustPressed(999)).to.equal(false);
			});
		});

		describe("clearJustReleased 方法", () => {
			it("应该清除 just released 状态", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Ended, new Vector2(100, 100), 1));

				expect(touches.clearJustReleased(1)).to.equal(true);
				expect(touches.justReleased(1)).to.equal(false);
			});
		});

		describe("clearJustCanceled 方法", () => {
			it("应该清除 just canceled 状态", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Canceled, new Vector2(100, 100), 1));

				expect(touches.clearJustCanceled(1)).to.equal(true);
				expect(touches.justCanceled(1)).to.equal(false);
			});
		});

		describe("firstPressedPosition 方法", () => {
			it("应该返回第一个触摸的位置", () => {
				const pos1 = new Vector2(100, 100);
				const pos2 = new Vector2(200, 200);

				touches.processTouchEvent(new TouchInput(TouchPhase.Started, pos1, 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, pos2, 2));

				const firstPos = touches.firstPressedPosition();

				expect(firstPos).to.be.ok();
			});

			it("应该返回 undefined 如果没有触摸", () => {
				expect(touches.firstPressedPosition()).to.equal(undefined);
			});
		});

		describe("迭代器方法", () => {
			it("iter 应该迭代所有按下的触摸", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(200, 200), 2));

				let count = 0;

				const iterator = touches.iter();
				let result = iterator.next();
				while (!result.done) {
					count++;
					result = iterator.next();
				}

				expect(count).to.equal(2);
			});

			it("iterJustPressed 应该迭代刚按下的触摸", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

				let count = 0;

				const iterator = touches.iterJustPressed();
				let result = iterator.next();
				while (!result.done) {
					count++;
					result = iterator.next();
				}

				expect(count).to.equal(1);
			});

			it("iterJustReleased 应该迭代刚释放的触摸", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Ended, new Vector2(100, 100), 1));

				let count = 0;

				const iterator = touches.iterJustReleased();
				let result = iterator.next();
				while (!result.done) {
					count++;
					result = iterator.next();
				}

				expect(count).to.equal(1);
			});

			it("iterJustCanceled 应该迭代刚取消的触摸", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));
				touches.processTouchEvent(new TouchInput(TouchPhase.Canceled, new Vector2(100, 100), 1));

				let count = 0;

				const iterator = touches.iterJustCanceled();
				let result = iterator.next();
				while (!result.done) {
					count++;
					result = iterator.next();
				}

				expect(count).to.equal(1);
			});
		});

		describe("clear 方法", () => {
			it("应该清除 just 状态但保留 pressed", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

				touches.clear();

				expect(touches.getPressed(1)).to.be.ok();
				expect(touches.justPressed(1)).to.equal(false);
			});
		});

		describe("resetAll 方法", () => {
			it("应该清除所有状态", () => {
				touches.processTouchEvent(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

				touches.resetAll();

				expect(touches.getPressed(1)).to.equal(undefined);
				expect(touches.anyJustPressed()).to.equal(false);
			});
		});
	});

	describe("touchScreenInputSystem 系统", () => {
		let world: World;
		let messageRegistry: MessageRegistry;

		beforeEach(() => {
			world = new World();
			messageRegistry = new MessageRegistry(world);

			// 初始化资源
			const touchesResource = new Touches();
			ResourceStorage.setTouches(world, touchesResource);
		});

		it("应该处理触摸事件", () => {
			const touchWriter = messageRegistry.createWriter<TouchInput>();

			touchWriter.write(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

			const touchReader = messageRegistry.createReader<TouchInput>();

			touchScreenInputSystem(world, touchReader);

			const touchesResource = ResourceStorage.getTouches(world);

			expect(touchesResource).to.be.ok();

			if (touchesResource) {
				expect(touchesResource.justPressed(1)).to.equal(true);
			}
		});

		it("应该清除上一帧的 just 状态", () => {
			const touchWriter = messageRegistry.createWriter<TouchInput>();

			touchWriter.write(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

			const touchReader1 = messageRegistry.createReader<TouchInput>();
			touchScreenInputSystem(world, touchReader1);

			messageRegistry.updateAll();

			const touchReader2 = messageRegistry.createReader<TouchInput>();
			touchScreenInputSystem(world, touchReader2);

			const touchesResource = ResourceStorage.getTouches(world);

			if (touchesResource) {
				expect(touchesResource.justPressed(1)).to.equal(false);
				expect(touchesResource.getPressed(1)).to.be.ok();
			}
		});

		it("应该更新 previous 字段", () => {
			const touchWriter = messageRegistry.createWriter<TouchInput>();

			touchWriter.write(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

			const touchReader1 = messageRegistry.createReader<TouchInput>();
			touchScreenInputSystem(world, touchReader1);

			messageRegistry.updateAll();

			touchWriter.write(new TouchInput(TouchPhase.Moved, new Vector2(150, 150), 1));

			const touchReader2 = messageRegistry.createReader<TouchInput>();
			touchScreenInputSystem(world, touchReader2);

			const touchesResource = ResourceStorage.getTouches(world);

			if (touchesResource) {
				const touch = touchesResource.getPressed(1);

				if (touch) {
					expect(touch.position.X).to.equal(150);
					expect(touch.position.Y).to.equal(150);
					expect(touch.previousPosition.X).to.equal(100);
					expect(touch.previousPosition.Y).to.equal(100);
				}
			}
		});

		it("应该在资源不存在时安全返回", () => {
			const emptyWorld = new World();
			const touchWriter = messageRegistry.createWriter<TouchInput>();

			touchWriter.write(new TouchInput(TouchPhase.Started, new Vector2(100, 100), 1));

			const touchReader = messageRegistry.createReader<TouchInput>();

			expect(() => {
				touchScreenInputSystem(emptyWorld, touchReader);
			}).never.to.throw();
		});
	});
};