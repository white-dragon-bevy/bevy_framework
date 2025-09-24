/**
 * Roblox 渲染组件定义
 * 提供基础的渲染相关组件
 */

import { component } from "@rbxts/matter";

/**
 * 可见性枚举
 * 控制实体的显示状态
 */
export enum VisibilityState {
	/** 可见 */
	Visible = "Visible",
	/** 隐藏 */
	Hidden = "Hidden",
	/** 继承父级可见性 */
	Inherited = "Inherited",
}

/**
 * 可见性组件
 * 控制实体是否在场景中显示
 */
export const Visibility = component<{
	/** 可见性状态 */
	state: VisibilityState;
}>("Visibility");

/**
 * 计算后的视图可见性组件
 * 表示实体最终的可见状态（考虑父级和其他因素后）
 */
export const ViewVisibility = component<{
	/** 是否可见 */
	visible: boolean;
}>("ViewVisibility");

/**
 * Roblox 实例组件
 * 关联 ECS 实体与 Roblox Part/Model
 */
export const RobloxInstance = component<{
	/** Roblox Part 或 Model 实例 */
	instance: BasePart | Model;
	/** 原始父容器（用于隐藏时缓存） */
	originalParent?: Instance;
	/** 隐藏容器（用于存放隐藏的对象） */
	hiddenContainer?: Folder;
}>("RobloxInstance");

/**
 * 渲染层级组件
 * 用于分层渲染（如 UI 层、世界层等）
 */
export const RenderLayers = component<{
	/** 层级掩码（位标志） */
	layers: number;
}>("RenderLayers");

/**
 * 默认渲染层级常量
 */
export const DefaultRenderLayers = {
	/** 默认层（所有对象） */
	Default: 0b0001,
	/** UI 层 */
	UI: 0b0010,
	/** 世界层 */
	World: 0b0100,
	/** 特效层 */
	Effects: 0b1000,
} as const;

/**
 * 检查实体是否在指定层级
 * @param entityLayers - 实体的层级掩码
 * @param checkLayers - 要检查的层级掩码
 * @returns 是否在指定层级
 */
export function isInRenderLayer(entityLayers: number, checkLayers: number): boolean {
	return (entityLayers & checkLayers) !== 0;
}

/**
 * 创建默认可见的 Visibility 组件
 */
export function createDefaultVisibility() {
	return Visibility({
		state: VisibilityState.Visible,
	});
}

/**
 * 创建默认的 ViewVisibility 组件
 */
export function createDefaultViewVisibility() {
	return ViewVisibility({
		visible: true,
	});
}