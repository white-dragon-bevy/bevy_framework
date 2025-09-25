const exampleFolder: string = "state";
const exampleName: string = "computed_states";


export function bootstrap() {

	// 然后运行原有的示例
	const folder = script.FindFirstChild(exampleFolder);
	assert(folder, "can't find exampleFolder :" + exampleFolder);
	const exampleScript = folder.FindFirstChild(exampleName) as ModuleScript;
	assert(exampleScript, "can't find exampleScript :" + exampleName);

	require(exampleScript)
}
