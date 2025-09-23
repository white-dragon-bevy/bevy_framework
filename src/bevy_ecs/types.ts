import { AppContext } from "../bevy_app";
import { BevyWorld } from "./bevy-world";
import { BevySystemStruct } from "./schedule/loop";

export type Context = AppContext;

// 导出 BevyWorld 类
export { BevyWorld } from "./bevy-world";

export type BevySystemParameters = [BevyWorld, Context];
export type BevySystem = BevySystemStruct<BevySystemParameters>;
