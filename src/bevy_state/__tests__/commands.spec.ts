/**
 * commands.spec.ts - Commands 扩展方法单元测试
 * 测试通过命令系统修改状态的功能
 */

import { World } from "../../bevy_ecs/bevy-world";
import { insertState, removeState, setState } from "../commands";
import { NextState, State } from "../resources";
import { EnumStates } from "../states";

export = () => {
	describe("setState", () => {
		let world: World;
		let testState: EnumStates;

		beforeEach(() => {
			world = new World();
			testState = new EnumStates("menu");

			// 初始化 NextState<EnumStates> 资源
			const nextState = NextState.create<EnumStates>();
			world.resources.insertResourceByTypeDescriptor(nextState, nextState.typeDescriptor);
		});

		it("should queue setState command", () => {
			const newState = new EnumStates("game");

			// 命令应该被排队
			const initialCommandCount = world.commands.getCommandCount();
			setState(world.commands, newState);

			expect(world.commands.getCommandCount()).to.equal(initialCommandCount + 1);
		});

		it("should set next state when command is flushed", () => {
			const newState = new EnumStates("game");

			// 排队命令
			setState(world.commands, newState);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证 NextState 被更新
			const nextState = world.resources.getResourceByTypeDescriptor<NextState<EnumStates>>(
				NextState.create<EnumStates>().typeDescriptor,
			);

			expect(nextState).to.be.ok();
			expect(nextState!.isPending()).to.equal(true);
			expect(nextState!.pending()?.getStateId()).to.equal("game");
		});

		it("should set state using standalone function", () => {
			const newState = new EnumStates("game");

			// 使用独立函数
			setState(world.commands, newState);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证结果
			const nextState = world.resources.getResourceByTypeDescriptor<NextState<EnumStates>>(
				NextState.create<EnumStates>().typeDescriptor,
			);

			expect(nextState).to.be.ok();
			expect(nextState!.isPending()).to.equal(true);
			expect(nextState!.pending()?.getStateId()).to.equal("game");
		});

		it("should handle multiple setState commands sequentially", () => {
			const state1 = new EnumStates("game");
			const state2 = new EnumStates("pause");
			const state3 = new EnumStates("menu");

			// 排队多个命令
			setState(world.commands, state1);
			setState(world.commands, state2);
			setState(world.commands, state3);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 最后一个命令应该生效
			const nextState = world.resources.getResourceByTypeDescriptor<NextState<EnumStates>>(
				NextState.create<EnumStates>().typeDescriptor,
			);

			expect(nextState!.pending()?.getStateId()).to.equal("menu");
		});

		it("should handle missing NextState resource gracefully", () => {
			const newWorld = new World();
			const newState = new EnumStates("game");

			// 不初始化 NextState 资源
			setState(newWorld.commands, newState);

			// 执行命令应该不会崩溃
			expect(() => {
				newWorld.commands.flush(newWorld, newWorld.resources);
			}).never.to.throw();
		});
	});

	describe("insertState", () => {
		let world: World;
		let testState: EnumStates;

		beforeEach(() => {
			world = new World();
			testState = new EnumStates("menu");
		});

		it("should queue insertState command", () => {
			const initialCommandCount = world.commands.getCommandCount();
			insertState(world.commands, testState);

			expect(world.commands.getCommandCount()).to.equal(initialCommandCount + 1);
		});

		it("should insert state resource when command is flushed", () => {
			const newState = new EnumStates("game");

			// 排队命令
			insertState(world.commands, newState);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证 State<EnumStates> 被插入
			const stateResource = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(newState).typeDescriptor,
			);

			expect(stateResource).to.be.ok();
			expect(stateResource!.get().getStateId()).to.equal("game");
		});

		it("should insert state using standalone function", () => {
			const newState = new EnumStates("game");

			// 使用独立函数
			insertState(world.commands, newState);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证结果
			const stateResource = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(newState).typeDescriptor,
			);

			expect(stateResource).to.be.ok();
			expect(stateResource!.get().getStateId()).to.equal("game");
		});

		it("should overwrite existing state when inserting", () => {
			const oldState = new EnumStates("menu");
			const newState = new EnumStates("game");

			// 先插入旧状态
			insertState(world.commands, oldState);
			world.commands.flush(world, world.resources);

			// 再插入新状态
			insertState(world.commands, newState);
			world.commands.flush(world, world.resources);

			// 验证状态被覆盖
			const stateResource = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(newState).typeDescriptor,
			);

			expect(stateResource!.get().getStateId()).to.equal("game");
		});
	});

	describe("removeState", () => {
		let world: World;
		let testState: EnumStates;

		beforeEach(() => {
			world = new World();
			testState = new EnumStates("menu");

			// 初始化状态资源
			const stateResource = State.create(testState);
			world.resources.insertResourceByTypeDescriptor(stateResource, stateResource.typeDescriptor);

			const nextState = NextState.create<EnumStates>();
			world.resources.insertResourceByTypeDescriptor(nextState, nextState.typeDescriptor);
		});

		it("should queue removeState command", () => {
			const initialCommandCount = world.commands.getCommandCount();
			removeState<EnumStates>(world.commands);

			expect(world.commands.getCommandCount()).to.equal(initialCommandCount + 1);
		});

		it("should remove state resources when command is flushed", () => {
			// 验证初始状态存在
			const initialState = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(testState).typeDescriptor,
			);
			expect(initialState).to.be.ok();

			// 排队移除命令
			removeState<EnumStates>(world.commands);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证状态被移除
			const removedState = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(testState).typeDescriptor,
			);
			expect(removedState).to.equal(undefined);
		});

		it("should remove state using standalone function", () => {
			// 使用独立函数
			removeState<EnumStates>(world.commands);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证状态被移除
			const removedState = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(testState).typeDescriptor,
			);
			expect(removedState).to.equal(undefined);
		});

		it("should handle removing non-existent state gracefully", () => {
			const emptyWorld = new World();

			// 移除不存在的状态
			removeState<EnumStates>(emptyWorld.commands);

			// 执行命令应该不会崩溃
			expect(() => {
				emptyWorld.commands.flush(emptyWorld, emptyWorld.resources);
			}).never.to.throw();
		});
	});

	describe("Command execution order", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		it("should execute commands in queue order", () => {
			const state1 = new EnumStates("menu");
			const state2 = new EnumStates("game");
			const state3 = new EnumStates("pause");

			// 按顺序排队命令
			insertState(world.commands, state1);
			insertState(world.commands, state2);
			insertState(world.commands, state3);

			// 执行所有命令
			world.commands.flush(world, world.resources);

			// 最后插入的状态应该生效
			const finalState = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(state3).typeDescriptor,
			);
			expect(finalState!.get().getStateId()).to.equal("pause");
		});

		it("should clear commands after flush", () => {
			const testState = new EnumStates("menu");

			insertState(world.commands, testState);
			const commandCount = world.commands.getCommandCount();
			expect(commandCount > 0).to.equal(true);

			world.commands.flush(world, world.resources);
			expect(world.commands.getCommandCount()).to.equal(0);
		});

		it("should support mixed state commands", () => {
			const initialState = new EnumStates("menu");
			const nextState = new EnumStates("game");

			// 初始化 NextState 资源
			const nextStateResource = NextState.create<EnumStates>();
			world.resources.insertResourceByTypeDescriptor(nextStateResource, nextStateResource.typeDescriptor);

			// 混合命令：插入 State，然后设置 NextState
			insertState(world.commands, initialState);
			setState(world.commands, nextState);

			// 执行命令
			world.commands.flush(world, world.resources);

			// 验证两个操作都成功
			const stateResource = world.resources.getResourceByTypeDescriptor<State<EnumStates>>(
				State.create(initialState).typeDescriptor,
			);
			expect(stateResource!.get().getStateId()).to.equal("menu");

			const nextStateResult = world.resources.getResourceByTypeDescriptor<NextState<EnumStates>>(
				nextStateResource.typeDescriptor,
			);
			expect(nextStateResult!.pending()?.getStateId()).to.equal("game");
		});
	});
};
