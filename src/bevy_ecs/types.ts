import { World } from "@rbxts/matter";
import { CommandBuffer } from "./command-buffer";
import { ResourceManager } from "./resource";
import { BevySystemStruct } from "./Loop";

export type Context = {
	deltaTime: number;
	resources: ResourceManager;
	commands: CommandBuffer;
};

export type BevyWorld = World;

export type BevySystemParameters = [World, Context];
export type BevySystem = BevySystemStruct<BevySystemParameters>;
