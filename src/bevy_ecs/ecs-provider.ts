import { World } from "./bevy-world";
import { Context } from "./context";

export function createWorldAndContext():[World,Context]{
    const world = new World();
    const context = new Context(world);

    return [world,context];
}