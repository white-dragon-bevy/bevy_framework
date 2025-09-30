import { RunService } from "@rbxts/services";

// Choose which example to run
const exampleFolder: string = "roblox_rvo"; // Change to "input" or "state" for other examples
const exampleName: string = "debug-simple"; // Change to other example names

export function bootstrap() {
	print(`[Examples] Bootstrap called on ${RunService.IsClient() ? "CLIENT" : "SERVER"}`);

	// 然后运行原有的示例
	const folder = script.FindFirstChild(exampleFolder);
	assert(folder, "can't find exampleFolder :" + exampleFolder);
	const exampleScript = folder.FindFirstChild(exampleName) as ModuleScript;
	assert(exampleScript, "can't find exampleScript :" + exampleName);

	print(`[Examples] Loading example: ${exampleFolder}/${exampleName}`);
	require(exampleScript)
}
