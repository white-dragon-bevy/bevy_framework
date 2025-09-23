import { BevyWorld } from "./bevy-world";
import { CommandBuffer } from "./command-buffer";
import { ResourceManager } from "./resource";
import { BevySystemStruct } from "./schedule/loop";

export type Context = {
	deltaTime: number;
	resources: ResourceManager;
	commands: CommandBuffer;
};

// 导出 BevyWorld 类
export { BevyWorld } from "./bevy-world";

export type BevySystemParameters = [BevyWorld, Context];
export type BevySystem = BevySystemStruct<BevySystemParameters>;
