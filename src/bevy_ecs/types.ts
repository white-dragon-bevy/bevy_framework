/**
 * @fileoverview Bevy ECS 类型定义
 * 提供核心类型别名和类型导出
 */

import { World } from "./bevy-world";
import { Context } from "./context";
import { BevySystemStruct } from "./schedule/loop";



/**
 * BevyWorld 类型导出
 * 用于管理 ECS 实体和组件的扩展 World 类
 */
export { World as BevyWorld } from "./bevy-world";

/**
 * Bevy 系统函数的参数类型
 * 系统函数接收的参数元组：[World实例, 应用程序上下文]
 */
export type BevySystemParameters = [World, Context];

/**
 * Bevy 系统类型
 * 定义了系统函数的完整结构，包括执行逻辑和元数据
 * 系统是 ECS 架构中处理游戏逻辑的基本单元
 */
export type BevySystem = BevySystemStruct<BevySystemParameters>;
