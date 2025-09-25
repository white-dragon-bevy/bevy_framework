// Choose which example to run
const exampleFolder: string = "app"; // Change to "state" for the other example
const exampleName: string = "empty_defaults"; // Change to "computed_states" for the other example

export function bootstrap() {

	// 然后运行原有的示例
	const folder = script.FindFirstChild(exampleFolder);
	assert(folder, "can't find exampleFolder :" + exampleFolder);
	const exampleScript = folder.FindFirstChild(exampleName) as ModuleScript;
	assert(exampleScript, "can't find exampleScript :" + exampleName);

	require(exampleScript)
}
