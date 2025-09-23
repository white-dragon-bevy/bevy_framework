/**
 * 输入资源存储管理
 * 为 World 提供类型安全的资源存储
 */

import { World } from "@rbxts/matter";
import { ButtonInput } from "./button-input";
import { AccumulatedMouseMotion, AccumulatedMouseWheel, MousePosition } from "./mouse";

/**
 * 输入资源存储接口
 */
interface InputResourceStorage {
	keyboard?: ButtonInput<Enum.KeyCode>;
	mouse?: ButtonInput<Enum.UserInputType>;
	mouseMotion?: AccumulatedMouseMotion;
	mouseWheel?: AccumulatedMouseWheel;
	mousePosition?: MousePosition;
}

// 用于存储输入资源的 WeakMap
const worldStorageMap = new WeakMap<World, InputResourceStorage>();

/**
 * 获取或创建 World 的资源存储
 * @param world - World 实例
 * @returns 资源存储对象
 */
function getOrCreateStorage(world: World): InputResourceStorage {
	let storage = worldStorageMap.get(world);
	if (!storage) {
		storage = {};
		worldStorageMap.set(world, storage);
	}
	return storage;
}

/**
 * 设置键盘输入资源
 * @param world - World 实例
 * @param keyboard - 键盘输入资源
 */
export function setKeyboardInput(world: World, keyboard: ButtonInput<Enum.KeyCode>): void {
	const storage = getOrCreateStorage(world);
	storage.keyboard = keyboard;
}

/**
 * 获取键盘输入资源
 * @param world - World 实例
 * @returns 键盘输入资源
 */
export function getKeyboardInput(world: World): ButtonInput<Enum.KeyCode> | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.keyboard;
}

/**
 * 设置鼠标输入资源
 * @param world - World 实例
 * @param mouse - 鼠标输入资源
 */
export function setMouseInput(world: World, mouse: ButtonInput<Enum.UserInputType>): void {
	const storage = getOrCreateStorage(world);
	storage.mouse = mouse;
}

/**
 * 获取鼠标输入资源
 * @param world - World 实例
 * @returns 鼠标输入资源
 */
export function getMouseInput(world: World): ButtonInput<Enum.UserInputType> | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.mouse;
}

/**
 * 设置鼠标移动累积器
 * @param world - World 实例
 * @param mouseMotion - 鼠标移动累积器
 */
export function setMouseMotion(world: World, mouseMotion: AccumulatedMouseMotion): void {
	const storage = getOrCreateStorage(world);
	storage.mouseMotion = mouseMotion;
}

/**
 * 获取鼠标移动累积器
 * @param world - World 实例
 * @returns 鼠标移动累积器
 */
export function getMouseMotion(world: World): AccumulatedMouseMotion | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.mouseMotion;
}

/**
 * 设置鼠标滚轮累积器
 * @param world - World 实例
 * @param mouseWheel - 鼠标滚轮累积器
 */
export function setMouseWheel(world: World, mouseWheel: AccumulatedMouseWheel): void {
	const storage = getOrCreateStorage(world);
	storage.mouseWheel = mouseWheel;
}

/**
 * 获取鼠标滚轮累积器
 * @param world - World 实例
 * @returns 鼠标滚轮累积器
 */
export function getMouseWheel(world: World): AccumulatedMouseWheel | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.mouseWheel;
}

/**
 * 设置鼠标位置跟踪器
 * @param world - World 实例
 * @param mousePosition - 鼠标位置跟踪器
 */
export function setMousePosition(world: World, mousePosition: MousePosition): void {
	const storage = getOrCreateStorage(world);
	storage.mousePosition = mousePosition;
}

/**
 * 获取鼠标位置跟踪器
 * @param world - World 实例
 * @returns 鼠标位置跟踪器
 */
export function getMousePosition(world: World): MousePosition | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.mousePosition;
}

/**
 * 清理 World 的所有输入资源
 * @param world - World 实例
 */
export function clearInputResources(world: World): void {
	worldStorageMap.delete(world);
}