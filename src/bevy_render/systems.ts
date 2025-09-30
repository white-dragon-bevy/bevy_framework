/**
 * Roblox 渲染系统实现
 * 负责可见性管理和 Transform 同步
 */

import {  AnyEntity } from "@rbxts/matter";
import { Workspace, ReplicatedStorage, RunService } from "@rbxts/services";
import { GlobalTransform } from "../bevy_transform";
import { RobloxInstance, Visibility, ViewVisibility, VisibilityState } from "./components";
import { Parent } from "../bevy_ecs/hierarchy";
import { World } from "../bevy_ecs/bevy-world";

/**
 * 获取或创建隐藏容器
 * 用于存放临时隐藏的 Roblox 实例，避免销毁和重新创建
 * 容器位于 ReplicatedStorage 中，名为 "HiddenRenderObjects"
 * @returns 隐藏容器 Folder 实例
 */
function getHiddenContainer(): Folder {
	let container = ReplicatedStorage.FindFirstChild("HiddenRenderObjects") as Folder | undefined;
	if (!container) {
		container = new Instance("Folder");
		container.Name = "HiddenRenderObjects";
		container.Parent = ReplicatedStorage;
	}
	return container;
}

/**
 * 可见性系统
 * 两步处理流程：
 * 1. 根据 Visibility 组件计算最终的 ViewVisibility（考虑父级继承）
 * 2. 将 ViewVisibility 应用到 RobloxInstance，控制实例的显示/隐藏
 * 隐藏的对象会移动到隐藏容器，显示时恢复到原始父级
 * @param world - ECS 世界实例
 */
export function visibilitySystem(world: World): void {
	const hiddenContainer = getHiddenContainer();

	// 第一步：计算 ViewVisibility
	for (const [entity, visibility] of world.query(Visibility)) {
		let isVisible = false;

		if (visibility.state === VisibilityState.Visible) {
			isVisible = true;
		} else if (visibility.state === VisibilityState.Inherited) {
			// 检查父级的可见性
			const parent = world.get(entity, Parent);
			if (parent) {
				const parentViewVisibility = world.get(parent.entity as AnyEntity, ViewVisibility);
				isVisible = parentViewVisibility?.visible ?? true;
			} else {
				// 没有父级，默认可见
				isVisible = true;
			}
		}

		// 更新或创建 ViewVisibility
		world.insert(entity as AnyEntity, ViewVisibility({ visible: isVisible }));
	}

	// 第二步：应用可见性到 Roblox 实例
	for (const [entity, robloxInstance, viewVisibility] of world.query(RobloxInstance, ViewVisibility)) {
		const instance = robloxInstance.instance;
		const isVisible = viewVisibility.visible;

		if (isVisible) {
			// 显示对象：恢复到原始父级或 Workspace
			if (instance.Parent === hiddenContainer) {
				instance.Parent = robloxInstance.originalParent ?? Workspace;
			}
		} else {
			// 隐藏对象：移到隐藏容器
			if (instance.Parent !== hiddenContainer) {
				// 记录原始父级
				const updatedRobloxInstance = {
					...robloxInstance,
					originalParent: instance.Parent ?? Workspace,
				};
				world.insert(entity as AnyEntity, RobloxInstance(updatedRobloxInstance));
				instance.Parent = hiddenContainer;
			}
		}
	}
}

/**
 * Roblox 同步系统
 * 将 GlobalTransform 组件的变换数据同步到 Roblox 实例
 * 支持 BasePart（直接设置 CFrame）和 Model（通过 PrimaryPart 或 Pivot）
 * 如果 BasePart 有 BaseSize 属性，会同步缩放到 Size
 * @param world - ECS 世界实例
 */
export function robloxSyncSystem(world: World): void {
	// 查询所有需要同步的实体
	for (const [entity, globalTransform, robloxInstance] of world.query(GlobalTransform, RobloxInstance)) {
		const instance = robloxInstance.instance;

		// 同步位置和旋转
		if (instance.IsA("BasePart")) {
			// 对于 BasePart，直接设置 CFrame
			instance.CFrame = globalTransform.cframe;

			// 同步缩放（如果支持）
			// 注意：Roblox 的 Size 和 Bevy 的 scale 概念不同
			// 这里可以选择性地应用缩放
			if (instance.Size) {
				const baseSize = instance.GetAttribute("BaseSize") as Vector3 | undefined;
				if (baseSize) {
					instance.Size = baseSize.mul(globalTransform.scale);
				}
			}
		} else if (instance.IsA("Model")) {
			// 对于 Model，设置 PrimaryPart 或使用 SetPrimaryPartCFrame
			const primaryPart = instance.PrimaryPart;
			if (primaryPart) {
				// 保存当前的相对位置
				const modelCFrame = instance.GetPivot();
				const offset = modelCFrame.ToObjectSpace(primaryPart.CFrame);

				// 应用新的变换
				primaryPart.CFrame = globalTransform.cframe.mul(offset);
			} else {
				// 使用 Pivot
				instance.PivotTo(globalTransform.cframe);
			}
		}
	}
}

/**
 * 清理已删除实体的系统
 * 检查 RobloxInstance 组件关联的 Roblox 实例是否仍然有效
 * 如果实例的 Parent 为 nil（已被销毁），则移除对应的组件
 * @param world - ECS 世界实例
 */
export function cleanupRemovedEntities(world: World): void {
	// 这个系统应该监听实体删除事件
	// 当前简化实现：检查所有 RobloxInstance 组件是否还有效
	for (const [entity, robloxInstance] of world.query(RobloxInstance)) {
		const instance = robloxInstance.instance;

		// 如果实例已经被销毁，移除组件
		if (!instance.Parent) {
			world.remove(entity as AnyEntity, RobloxInstance);
		}
	}
}

/**
 * 渲染系统集合
 * 按照正确的顺序执行所有渲染相关系统：
 * 1. visibilitySystem - 计算可见性
 * 2. robloxSyncSystem - 同步变换到 Roblox 实例
 * 3. cleanupRemovedEntities - 清理无效实体
 * @param world - ECS 世界实例
 */
export function renderSystemSet(world: World): void {
	// 1. 计算可见性
	visibilitySystem(world);

	// 2. 同步 Transform 到 Roblox
	robloxSyncSystem(world);

	// 3. 清理已删除的实体
	cleanupRemovedEntities(world);
}
