import { RunService } from "@rbxts/services";

export enum RobloxContext {
	Server = 1,
	Client = 2,
}
/**
 * 脚本的域是否符合要求
 * @param robloxContext
 */
export function isMatchRobloxContext(robloxContext: RobloxContext | undefined) {
	if (robloxContext === undefined) {
		return true;
	}

	if (RunService.IsServer()) {
		return robloxContext === RobloxContext.Server;
	} else {
		return robloxContext === RobloxContext.Client;
	}
}
