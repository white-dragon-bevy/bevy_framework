/**
 * 输入资源存储管理
 * 为 World 提供类型安全的资源存储
 */

import { World } from "@rbxts/matter";
import { ButtonInput } from "./button-input";
import { AccumulatedMouseMotion, AccumulatedMouseWheel, MousePosition } from "./mouse";
import type { Key } from "./keyboard";
import type { Touches } from "./touch";
import type { GamepadManager } from "./gamepad";
import type { GestureManager } from "./gestures";

/**
 * 输入资源存储接口
 */
interface InputResourceStorage {
	gamepad?: GamepadManager;
	gestures?: GestureManager;
	key?: ButtonInput<Key>;
	keyboard?: ButtonInput<Enum.KeyCode>;
	mouse?: ButtonInput<Enum.UserInputType>;
	mouseMotion?: AccumulatedMouseMotion;
	mousePosition?: MousePosition;
	mouseWheel?: AccumulatedMouseWheel;
	touches?: Touches;
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
 * 设置按键输入资源（逻辑键）
 * @param world - World 实例
 * @param keyInputValue - 按键输入资源
 */
export function setKeyInput(world: World, keyInputValue: ButtonInput<Key>): void {
	const storage = getOrCreateStorage(world);
	storage.key = keyInputValue;
}

/**
 * 获取按键输入资源（逻辑键）
 * @param world - World 实例
 * @returns 按键输入资源
 */
export function getKeyInput(world: World): ButtonInput<Key> | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.key;
}

/**
 * 设置触摸输入资源
 * @param world - World 实例
 * @param touches - 触摸输入资源
 */
export function setTouches(world: World, touches: Touches): void {
	const storage = getOrCreateStorage(world);
	storage.touches = touches;
}

/**
 * 获取触摸输入资源
 * @param world - World 实例
 * @returns 触摸输入资源
 */
export function getTouches(world: World): Touches | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.touches;
}

/**
 * 设置游戏手柄管理器
 * @param world - World 实例
 * @param gamepadManager - 游戏手柄管理器
 */
export function setGamepadManager(world: World, gamepadManager: GamepadManager): void {
	const storage = getOrCreateStorage(world);
	storage.gamepad = gamepadManager;
}

/**
 * 获取游戏手柄管理器
 * @param world - World 实例
 * @returns 游戏手柄管理器
 */
export function getGamepadManager(world: World): GamepadManager | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.gamepad;
}

/**
 * 设置手势管理器
 * @param world - World 实例
 * @param gestureManager - 手势管理器
 */
export function setGestureManager(world: World, gestureManager: GestureManager): void {
	const storage = getOrCreateStorage(world);
	storage.gestures = gestureManager;
}

/**
 * 获取手势管理器
 * @param world - World 实例
 * @returns 手势管理器
 */
export function getGestureManager(world: World): GestureManager | undefined {
	const storage = worldStorageMap.get(world);
	return storage?.gestures;
}

/**
 * 清理 World 的所有输入资源
 * @param world - World 实例
 */
export function clearInputResources(world: World): void {
	worldStorageMap.delete(world);
}