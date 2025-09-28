import { AppContext } from "../bevy_app";
import { World } from "./bevy-world";
import { BevySystemStruct } from "./schedule/loop";

export type Context = AppContext;

// 导出 BevyWorld 类
export { World as BevyWorld } from "./bevy-world";

export type BevySystemParameters = [World, Context];
export type BevySystem = BevySystemStruct<BevySystemParameters>;
